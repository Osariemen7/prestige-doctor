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
  CheckCircle as CheckCircleIcon,
  Edit as EditIcon,
  Info as InfoIcon,
  LiveHelp as LiveHelpIcon,
  ReportProblem as ReportProblemIcon,
  SmartToy as SmartToyIcon,
} from '@mui/icons-material';
import {
  buildMoreInfoQuestions,
  getCaregiverContext,
  getDoctorApprovalReadiness,
  getEvidenceEntries,
  getGeneratedNote,
  getMissingInformation,
  getPatientStory,
  getRecommendedActions,
  getReviewOrigin,
  getReviewWorkflowStatus,
  getRiskFlags,
  getSourceLabel,
  getSubmitterLabel,
  getTriagePayload,
  getUrgencyConfig,
  hasUnacknowledgedEmergencyRisk,
  REVIEW_ORIGINS,
} from '../utils/aiReviewWorkflow';

const sectionText = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    return Object.entries(value)
      .filter(([, entry]) => entry !== null && entry !== undefined && String(entry).trim())
      .map(([key, entry]) => `${key.replace(/_/g, ' ')}: ${entry}`)
      .join('\n');
  }
  return String(value);
};

const compactText = (value, maxLength = 280) => {
  const text = sectionText(value).trim();
  if (!text) return 'Not provided';
  return text.length > maxLength ? `${text.slice(0, maxLength).trim()}...` : text;
};

const getOriginLabel = (origin) => {
  switch (origin) {
    case REVIEW_ORIGINS.AI_TRIAGE:
      return 'AI Triage';
    case REVIEW_ORIGINS.HYBRID:
      return 'Hybrid Review';
    case REVIEW_ORIGINS.LIVE_ENCOUNTER:
      return 'Live Encounter';
    case REVIEW_ORIGINS.IMPORTED:
      return 'Imported';
    default:
      return 'Manual';
  }
};

const AiTriageApprovalCockpit = ({
  review,
  patientData,
  busyAction = null,
  actionError = '',
  onApproveAsIs,
  onEditDraft,
  onRequestMoreInfo,
  onStartLiveClarification,
  onEscalate,
}) => {
  const triage = useMemo(() => getTriagePayload(review), [review]);
  const origin = useMemo(() => getReviewOrigin(review), [review]);
  const urgency = useMemo(() => getUrgencyConfig(review), [review]);
  const status = useMemo(() => getReviewWorkflowStatus(review), [review]);
  const riskFlags = useMemo(() => getRiskFlags(review), [review]);
  const missingInformation = useMemo(() => getMissingInformation(review), [review]);
  const evidenceEntries = useMemo(() => getEvidenceEntries(review).slice(0, 8), [review]);
  const recommendedActions = useMemo(() => getRecommendedActions(review).slice(0, 8), [review]);
  const generatedNote = useMemo(() => getGeneratedNote(review), [review]);
  const patientStory = useMemo(() => getPatientStory(review), [review]);
  const suggestedQuestions = useMemo(() => buildMoreInfoQuestions(review), [review]);
  const hasEmergencyRisk = useMemo(() => hasUnacknowledgedEmergencyRisk(review), [review]);
  const approvalReadiness = useMemo(() => getDoctorApprovalReadiness(review, patientData), [review, patientData]);
  const caregiverContext = useMemo(() => getCaregiverContext(review), [review]);

  const patientName = `${patientData?.first_name || review?.patient_first_name || ''} ${patientData?.last_name || review?.patient_last_name || ''}`.trim() || 'Patient';

  return (
    <Card sx={{ mb: 3, borderLeft: '4px solid', borderColor: `${urgency.color}.main` }} elevation={3}>
      <CardContent sx={{ p: { xs: 2, md: 3 } }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={2} flexWrap="wrap" sx={{ mb: 2 }}>
          <Box>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, mb: 1 }}>
              <Chip icon={<SmartToyIcon />} label={getOriginLabel(origin)} color="info" size="small" />
              <Chip label={urgency.label} color={urgency.color} size="small" />
              <Chip label={status.replace(/_/g, ' ')} variant="outlined" size="small" />
              <Chip label={getSubmitterLabel(review)} variant="outlined" size="small" />
              {caregiverContext.isCaregiverSubmitted && (
                <Chip
                  label={caregiverContext.patientPresent === true ? 'Patient present' : caregiverContext.patientPresent === false ? 'Patient absent' : 'Presence unknown'}
                  color={caregiverContext.patientPresent === true ? 'success' : 'warning'}
                  variant="outlined"
                  size="small"
                />
              )}
              {caregiverContext.isCaregiverSubmitted && (
                <Chip
                  label={caregiverContext.authorizedRecipient === true ? 'Authorized recipient' : caregiverContext.authorizedRecipient === false ? 'Unauthorized recipient' : 'Authorization unknown'}
                  color={caregiverContext.authorizedRecipient === true ? 'success' : caregiverContext.authorizedRecipient === false ? 'error' : 'warning'}
                  variant="outlined"
                  size="small"
                />
              )}
            </Stack>
            <Typography variant="h6" fontWeight={800}>
              AI Triage Approval Cockpit
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Review the generated case for {patientName}, verify source-labeled findings, then approve, edit, clarify, or escalate.
            </Typography>
          </Box>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <Button
              variant="contained"
              color="success"
              startIcon={<CheckCircleIcon />}
              onClick={onApproveAsIs}
              disabled={Boolean(busyAction) || !approvalReadiness.canApprove}
            >
              {busyAction === 'approve_as_is' ? 'Approving...' : 'Approve As-is'}
            </Button>
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={onEditDraft}
              disabled={Boolean(busyAction)}
            >
              Edit Draft
            </Button>
          </Stack>
        </Box>

        {busyAction && <LinearProgress sx={{ mb: 2 }} />}
        {actionError && <Alert severity="error" sx={{ mb: 2 }}>{actionError}</Alert>}
        {hasEmergencyRisk && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Emergency or severe risk is present. Escalate or document a live clarification before approving this review.
          </Alert>
        )}
        {approvalReadiness.blockers.filter((item) => item.id !== 'emergency_risk').map((item) => (
          <Alert key={item.id} severity={item.severity || 'warning'} sx={{ mb: 2 }}>
            {item.label}
          </Alert>
        ))}
        {approvalReadiness.warnings.length > 0 && (
          <Alert severity="info" sx={{ mb: 2 }}>
            <Stack spacing={0.5}>
              {approvalReadiness.warnings.slice(0, 3).map((item) => (
                <Typography key={item.id} variant="body2">{item.label}</Typography>
              ))}
            </Stack>
          </Alert>
        )}

        <Grid container spacing={2}>
          <Grid item xs={12} md={5}>
            <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1, border: '1px solid', borderColor: 'divider', height: '100%' }}>
              <Typography variant="subtitle2" fontWeight={800} gutterBottom>
                Patient / Caregiver Story
              </Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {compactText(patientStory, 800)}
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12} md={7}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1, border: '1px solid', borderColor: 'divider', height: '100%' }}>
                  <Typography variant="subtitle2" fontWeight={800} gutterBottom>
                    Risk Flags
                  </Typography>
                  {riskFlags.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">No red flags recorded.</Typography>
                  ) : (
                    <Stack spacing={1}>
                      {riskFlags.slice(0, 4).map((flag) => (
                        <Alert key={flag.id} severity={flag.severity === 'error' || flag.severity === 'emergency' ? 'error' : 'warning'} icon={<ReportProblemIcon />}>
                          <Typography variant="body2" fontWeight={700}>{flag.label}</Typography>
                          {flag.description && <Typography variant="caption">{flag.description}</Typography>}
                        </Alert>
                      ))}
                    </Stack>
                  )}
                </Box>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1, border: '1px solid', borderColor: 'divider', height: '100%' }}>
                  <Typography variant="subtitle2" fontWeight={800} gutterBottom>
                    Missing / Uncertain
                  </Typography>
                  {missingInformation.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">No required information gaps recorded.</Typography>
                  ) : (
                    <Stack spacing={1}>
                      {missingInformation.slice(0, 5).map((item) => (
                        <Box key={item.id}>
                          <Typography variant="body2" fontWeight={700}>{item.label}</Typography>
                          {item.reason && <Typography variant="caption" color="text.secondary">{item.reason}</Typography>}
                        </Box>
                      ))}
                    </Stack>
                  )}
                </Box>
              </Grid>
            </Grid>
          </Grid>

          <Grid item xs={12}>
            <Divider />
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" fontWeight={800} gutterBottom>
              Generated Clinical Draft
            </Typography>
            <Grid container spacing={1.5}>
              {[
                ['Subjective', generatedNote?.subjective || triage.subjective],
                ['Objective', generatedNote?.objective || triage.objective],
                ['Assessment', generatedNote?.assessment || triage.assessment],
                ['Plan', generatedNote?.plan || triage.plan],
              ].map(([label, value]) => (
                <Grid item xs={12} key={label}>
                  <Box sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={800}>
                      {label}
                    </Typography>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mt: 0.5 }}>
                      {compactText(value, 420)}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" fontWeight={800} gutterBottom>
              Evidence and Suggested Actions
            </Typography>
            <Stack spacing={1.5}>
              <Box sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={800}>
                  Evidence Anchors
                </Typography>
                {evidenceEntries.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Evidence map not provided by backend yet.
                  </Typography>
                ) : (
                  <Stack spacing={1} sx={{ mt: 1 }}>
                    {evidenceEntries.map((entry, index) => (
                      <Box key={entry.id || index}>
                        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                          <Chip size="small" label={entry.section || 'Evidence'} variant="outlined" />
                          <Chip size="small" label={getSourceLabel(entry)} />
                        </Stack>
                        <Typography variant="body2" sx={{ mt: 0.5 }}>
                          {compactText(entry.quote || entry.text || entry.value || entry.description, 180)}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                )}
              </Box>

              <Box sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={800}>
                  Proposed Next Actions
                </Typography>
                {recommendedActions.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    No draft orders or clinical actions proposed.
                  </Typography>
                ) : (
                  <Stack spacing={1} sx={{ mt: 1 }}>
                    {recommendedActions.map((action, index) => (
                      <Box key={action.id || index}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Chip size="small" label={String(action.type || 'action').replace(/_/g, ' ')} variant="outlined" />
                          <Typography variant="body2" fontWeight={700}>{action.label}</Typography>
                        </Stack>
                        {action.reason && (
                          <Typography variant="caption" color="text.secondary">{action.reason}</Typography>
                        )}
                      </Box>
                    ))}
                  </Stack>
                )}
              </Box>
            </Stack>
          </Grid>
        </Grid>

        <Divider sx={{ my: 2 }} />

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ xs: 'stretch', md: 'center' }}>
          <Button
            variant="outlined"
            startIcon={<InfoIcon />}
            onClick={() => onRequestMoreInfo?.(suggestedQuestions)}
            disabled={Boolean(busyAction)}
          >
            Request More Info
          </Button>
          <Button
            variant="outlined"
            startIcon={<LiveHelpIcon />}
            onClick={onStartLiveClarification}
            disabled={Boolean(busyAction)}
          >
            Start Live Clarification
          </Button>
          <Button
            variant="outlined"
            color="warning"
            startIcon={<ReportProblemIcon />}
            onClick={onEscalate}
            disabled={Boolean(busyAction)}
          >
            Escalate
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default AiTriageApprovalCockpit;
