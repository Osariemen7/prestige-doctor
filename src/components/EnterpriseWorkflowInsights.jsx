import React, { useMemo } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material';
import {
  Bolt as ProductivityIcon,
  CheckCircleOutline as CheckIcon,
  HealthAndSafety as SafetyIcon,
  Insights as InsightsIcon,
  Send as FollowThroughIcon,
  WarningAmber as WarningIcon,
} from '@mui/icons-material';
import {
  getAiGovernanceSignals,
  getMissingInformation,
  getFollowThroughAttention,
  getFollowThroughOperationalSignals,
  getFollowThroughProgress,
  getReviewOrigin,
  getRiskFlags,
  getUrgencyConfig,
  getWhatsAppFollowThroughAgentState,
  isAiTriageReview,
  REVIEW_ORIGINS,
} from '../utils/aiReviewWorkflow';
import { getLocalWorkflowEvents } from '../services/doctorWorkflowApi';

const isFinalized = (review) => Boolean(review?.is_finalized || ['approved', 'finalized'].includes(review?.review_status));

const formatPercent = (value) => `${Math.round(value || 0)}%`;

const getCreatedAt = (review) => {
  const raw = review?.created || review?.created_at || review?.requested_at || review?.updated_at;
  const parsed = Date.parse(raw || '');
  return Number.isNaN(parsed) ? null : parsed;
};

const metricCardSx = {
  height: '100%',
  borderRadius: 1,
  borderColor: 'divider',
};

const EnterpriseWorkflowInsights = ({ reviews = [], queueSummary = null, onFilter }) => {
  const metrics = useMemo(() => {
    const localEvents = getLocalWorkflowEvents();
    const now = Date.now();
    const collection = Array.isArray(reviews) ? reviews : [];

    const totals = collection.reduce((acc, review) => {
      const origin = getReviewOrigin(review);
      const riskFlags = getRiskFlags(review);
      const missing = getMissingInformation(review);
      const urgency = getUrgencyConfig(review);
      const followThrough = getFollowThroughProgress(review);
      const followThroughAttention = getFollowThroughAttention(review, { now });
      const followThroughSignals = getFollowThroughOperationalSignals(review, { attention: followThroughAttention });
      const whatsAppAgent = getWhatsAppFollowThroughAgentState(review, { now });
      const governance = getAiGovernanceSignals(review);
      const createdAt = getCreatedAt(review);

      acc.total += 1;
      if (isAiTriageReview(review)) acc.aiTriage += 1;
      if (origin === REVIEW_ORIGINS.HYBRID) acc.hybrid += 1;
      if (['urgent', 'emergency', 'critical'].includes(urgency.value) || riskFlags.length > 0) acc.riskQueue += 1;
      if (['emergency', 'critical'].includes(urgency.value) || riskFlags.some((flag) => ['emergency', 'critical', 'severe'].includes(String(flag.severity || '').toLowerCase()))) {
        acc.emergencyRisk += 1;
      }
      if (missing.length > 0 || review.review_status === 'needs_patient_info') acc.needsInfo += 1;
      if (isAiTriageReview(review) && !isFinalized(review) && missing.length === 0 && riskFlags.length === 0) acc.readyCleanAi += 1;
      if (isFinalized(review)) acc.finalized += 1;
      if (followThrough.sent) {
        acc.followThroughSent += 1;
        if (followThrough.totalTasks > 0) acc.followThroughTaskCases += 1;
        acc.followThroughTasks += followThrough.totalTasks;
        acc.completedFollowThroughTasks += followThrough.completedTasks;
      }
      if (['active', 'in_progress'].includes(followThrough.status)) acc.activeFollowThrough += 1;
      if (followThroughAttention.needsAttention) acc.followThroughAttention += 1;
      if (followThroughSignals.isSafetyEscalation) acc.whatsAppSafetyEscalations += 1;
      if (followThroughSignals.isCompletionBarrier) acc.whatsAppCompletionBarriers += 1;
      if (followThrough.status === 'completed') acc.completedFollowThroughCases += 1;
      if (whatsAppAgent.canMarkItemsComplete) acc.whatsAppAgentActive += 1;
      if (whatsAppAgent.activeTaskReadyForCompletion) acc.whatsAppAgentReady += 1;
      acc.whatsAppCompletions += whatsAppAgent.completedByWhatsAppCount;
      if (governance.qualityRisk === 'high') acc.highGovernanceRisk += 1;
      if (governance.qualityRisk === 'medium') acc.mediumGovernanceRisk += 1;
      if (governance.feedbackCaptured) acc.feedbackCaptured += 1;
      if (governance.acceptanceState === 'accepted') acc.aiAccepted += 1;
      if (governance.acceptanceState === 'corrected') acc.aiCorrected += 1;
      if (governance.editBurden.level === 'heavy' || governance.editBurden.level === 'moderate') acc.highEditBurden += 1;
      acc.sourceVerificationCount += governance.sourceVerificationCount;
      if (createdAt && !isFinalized(review)) acc.openAgeHours += Math.max(0, (now - createdAt) / 36e5);
      if (createdAt && !isFinalized(review)) acc.openAgeCases += 1;
      return acc;
    }, {
      total: 0,
      aiTriage: 0,
      hybrid: 0,
      riskQueue: 0,
      emergencyRisk: 0,
      needsInfo: 0,
      readyCleanAi: 0,
      finalized: 0,
      followThroughSent: 0,
      activeFollowThrough: 0,
      completedFollowThroughCases: 0,
      followThroughAttention: 0,
      whatsAppSafetyEscalations: 0,
      whatsAppCompletionBarriers: 0,
      followThroughTaskCases: 0,
      followThroughTasks: 0,
      completedFollowThroughTasks: 0,
      whatsAppAgentActive: 0,
      whatsAppAgentReady: 0,
      whatsAppCompletions: 0,
      highGovernanceRisk: 0,
      mediumGovernanceRisk: 0,
      feedbackCaptured: 0,
      aiAccepted: 0,
      aiCorrected: 0,
      highEditBurden: 0,
      sourceVerificationCount: 0,
      openAgeHours: 0,
      openAgeCases: 0,
    });

    const pendingLocalEvents = localEvents.filter((event) => collection.some((review) => review.public_id === event.review_public_id));
    const aiAssistRate = totals.total ? (totals.aiTriage / totals.total) * 100 : 0;
    const finalizationRate = totals.total ? (totals.finalized / totals.total) * 100 : 0;
    const followThroughRate = totals.finalized ? (totals.followThroughSent / totals.finalized) * 100 : 0;
    const taskCompletionRate = totals.followThroughTasks ? (totals.completedFollowThroughTasks / totals.followThroughTasks) * 100 : 0;
    const feedbackCaptureRate = totals.aiTriage ? (totals.feedbackCaptured / totals.aiTriage) * 100 : 0;
    const avgOpenAgeHours = totals.openAgeCases ? totals.openAgeHours / totals.openAgeCases : 0;

    return {
      ...totals,
      aiAssistRate,
      finalizationRate,
      followThroughRate,
      taskCompletionRate,
      feedbackCaptureRate,
      avgOpenAgeHours,
      pendingLocalEvents: pendingLocalEvents.length,
      queueSummary: queueSummary || {},
    };
  }, [reviews, queueSummary]);

  const priorityMessage = metrics.emergencyRisk > 0
    ? `${metrics.emergencyRisk} case${metrics.emergencyRisk === 1 ? '' : 's'} have emergency or severe risk signals.`
    : metrics.whatsAppSafetyEscalations > 0
      ? `${metrics.whatsAppSafetyEscalations} WhatsApp follow-through safety escalation${metrics.whatsAppSafetyEscalations === 1 ? '' : 's'} need clinical review.`
    : metrics.whatsAppCompletionBarriers > 0
      ? `${metrics.whatsAppCompletionBarriers} patient completion barrier${metrics.whatsAppCompletionBarriers === 1 ? '' : 's'} need outreach.`
    : metrics.highGovernanceRisk > 0
      ? `${metrics.highGovernanceRisk} AI review${metrics.highGovernanceRisk === 1 ? '' : 's'} have high governance risk from blockers, corrections, or heavy edits.`
    : metrics.needsInfo > 0
      ? `${metrics.needsInfo} case${metrics.needsInfo === 1 ? '' : 's'} need patient/caregiver clarification.`
      : metrics.readyCleanAi > 0
        ? `${metrics.readyCleanAi} AI triage review${metrics.readyCleanAi === 1 ? '' : 's'} look ready for fast doctor approval.`
        : metrics.followThroughAttention > 0
          ? `${metrics.followThroughAttention} patient follow-through plan${metrics.followThroughAttention === 1 ? '' : 's'} need outreach or escalation.`
          : metrics.activeFollowThrough > 0
          ? `${metrics.activeFollowThrough} patient follow-through plan${metrics.activeFollowThrough === 1 ? '' : 's'} need completion tracking.`
          : 'Queue is stable. Select a review to continue documentation or follow-through.';

  return (
    <Box sx={{ width: '100%', maxWidth: 1120, mx: 'auto', p: { xs: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', mb: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight="bold">
            Enterprise Workflow Command Center
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Safety pressure, AI review throughput, patient follow-through, and backend readiness from the current review queue.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 0.75 }}>
          <Chip icon={<InsightsIcon />} label={`${metrics.total} active reviews`} color="primary" variant="outlined" />
          {!!metrics.pendingLocalEvents && <Chip label={`${metrics.pendingLocalEvents} pending sync`} color="warning" />}
        </Stack>
      </Box>

      <Alert severity={metrics.emergencyRisk || metrics.whatsAppSafetyEscalations ? 'error' : metrics.whatsAppCompletionBarriers || metrics.needsInfo ? 'warning' : 'info'} sx={{ mb: 2 }}>
        {priorityMessage}
      </Alert>

      <Grid container spacing={2}>
        <Grid item xs={12} md={3}>
          <Card variant="outlined" sx={metricCardSx}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, mb: 1.5 }}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Safety Queue
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {metrics.riskQueue}
                  </Typography>
                </Box>
                <SafetyIcon color={metrics.emergencyRisk ? 'error' : 'warning'} />
              </Box>
              <Stack spacing={1}>
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">Emergency risk</Typography>
                    <Typography variant="body2" fontWeight="bold">{metrics.emergencyRisk}</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={metrics.total ? (metrics.emergencyRisk / metrics.total) * 100 : 0} color="error" />
                </Box>
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">Needs clarification</Typography>
                    <Typography variant="body2" fontWeight="bold">{metrics.needsInfo}</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={metrics.total ? (metrics.needsInfo / metrics.total) * 100 : 0} color="warning" />
                </Box>
              </Stack>
              <Divider sx={{ my: 2 }} />
              <Button size="small" startIcon={<WarningIcon />} onClick={() => onFilter?.('urgent')} disabled={!metrics.riskQueue}>
                Open Urgent Queue
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card variant="outlined" sx={metricCardSx}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, mb: 1.5 }}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    AI Productivity
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {formatPercent(metrics.aiAssistRate)}
                  </Typography>
                </Box>
                <ProductivityIcon color="primary" />
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                {metrics.aiTriage} AI triage and {metrics.hybrid} hybrid reviews in the active queue.
              </Typography>
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 0.75, mb: 2 }}>
                <Chip size="small" label={`${metrics.readyCleanAi} ready`} color={metrics.readyCleanAi ? 'success' : 'default'} variant="outlined" />
                <Chip size="small" label={`${formatPercent(metrics.finalizationRate)} finalized`} variant="outlined" />
                <Chip size="small" label={`${metrics.avgOpenAgeHours.toFixed(1)}h avg open`} variant="outlined" />
              </Stack>
              <Button size="small" startIcon={<CheckIcon />} onClick={() => onFilter?.('ready_to_approve')} disabled={!metrics.readyCleanAi}>
                Open Ready AI Reviews
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card variant="outlined" sx={metricCardSx}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, mb: 1.5 }}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Governance
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {metrics.highGovernanceRisk}
                  </Typography>
                </Box>
                <InsightsIcon color={metrics.highGovernanceRisk ? 'warning' : 'success'} />
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                Feedback capture is {formatPercent(metrics.feedbackCaptureRate)} across AI triage reviews.
              </Typography>
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 0.75, mb: 2 }}>
                <Chip size="small" label={`${metrics.mediumGovernanceRisk} watch`} color={metrics.mediumGovernanceRisk ? 'warning' : 'default'} variant="outlined" />
                <Chip size="small" label={`${metrics.aiAccepted} accepted`} color={metrics.aiAccepted ? 'success' : 'default'} variant="outlined" />
                <Chip size="small" label={`${metrics.aiCorrected} corrected`} color={metrics.aiCorrected ? 'warning' : 'default'} variant="outlined" />
                <Chip size="small" label={`${metrics.highEditBurden} edit burden`} color={metrics.highEditBurden ? 'warning' : 'default'} variant="outlined" />
                <Chip size="small" label={`${metrics.sourceVerificationCount} sources`} color={metrics.sourceVerificationCount ? 'warning' : 'default'} variant="outlined" />
              </Stack>
              <Button size="small" onClick={() => onFilter?.('quality_risk')} disabled={!metrics.highGovernanceRisk && !metrics.mediumGovernanceRisk}>
                Open Quality Risk
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card variant="outlined" sx={metricCardSx}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, mb: 1.5 }}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Patient Follow-through
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {formatPercent(metrics.followThroughRate)}
                  </Typography>
                </Box>
                <FollowThroughIcon color="success" />
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                {metrics.followThroughSent} finalized reviews have sent patient next steps. Task completion is {formatPercent(metrics.taskCompletionRate)}.
              </Typography>
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 0.75, mb: 2 }}>
                <Chip size="small" label={`${metrics.activeFollowThrough} active`} color={metrics.activeFollowThrough ? 'primary' : 'default'} variant="outlined" />
                <Chip size="small" label={`${metrics.followThroughAttention} needs follow-up`} color={metrics.followThroughAttention ? 'warning' : 'default'} variant="outlined" />
                <Chip size="small" label={`${metrics.whatsAppSafetyEscalations} safety`} color={metrics.whatsAppSafetyEscalations ? 'error' : 'default'} variant="outlined" />
                <Chip size="small" label={`${metrics.whatsAppCompletionBarriers} barriers`} color={metrics.whatsAppCompletionBarriers ? 'warning' : 'default'} variant="outlined" />
                <Chip size="small" label={`${metrics.whatsAppAgentActive} WhatsApp loops`} color={metrics.whatsAppAgentActive ? 'info' : 'default'} variant="outlined" />
                <Chip size="small" label={`${metrics.whatsAppAgentReady} completion-ready`} color={metrics.whatsAppAgentReady ? 'success' : 'default'} variant="outlined" />
                <Chip size="small" label={`${metrics.whatsAppCompletions} via WhatsApp`} color={metrics.whatsAppCompletions ? 'success' : 'default'} variant="outlined" />
                <Chip size="small" label={`${metrics.followThroughTasks} tasks`} variant="outlined" />
                <Chip size="small" label={`${metrics.completedFollowThroughTasks} completed`} color={metrics.completedFollowThroughTasks ? 'success' : 'default'} variant="outlined" />
              </Stack>
              <Button
                size="small"
                onClick={() => onFilter?.(
                  metrics.whatsAppSafetyEscalations
                    ? 'whatsapp_safety_escalation'
                    : metrics.whatsAppCompletionBarriers
                      ? 'whatsapp_completion_barrier'
                      : metrics.followThroughAttention ? 'follow_through_attention' : 'follow_through_active'
                )}
                disabled={!metrics.activeFollowThrough && !metrics.followThroughAttention}
              >
                {metrics.whatsAppSafetyEscalations
                  ? 'Open Safety Escalations'
                  : metrics.whatsAppCompletionBarriers
                    ? 'Open Completion Barriers'
                    : metrics.followThroughAttention ? 'Open Needs Follow-up' : 'Open Active Follow-through'}
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default EnterpriseWorkflowInsights;
