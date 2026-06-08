import React, { useMemo, useState } from 'react';
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
  Assignment as TaskIcon,
  CheckCircleOutline as CheckIcon,
  EventAvailable as FollowUpIcon,
  Medication as MedicationIcon,
  Science as InvestigationIcon,
  Send as SendIcon,
} from '@mui/icons-material';
import {
  buildWhatsAppCompletionCommand,
  buildPatientHandoffPlan,
  getCaregiverContext,
  getFollowThroughAttention,
  getFollowThroughProgress,
  getFollowThroughRecommendedAction,
  getGeneratedNote,
  getReviewWorkflowStatus,
  getWhatsAppFollowThroughAgentState,
  hasUnacknowledgedEmergencyRisk,
  REVIEW_STATUS,
} from '../utils/aiReviewWorkflow';
import { sendPatientFollowThrough } from '../services/doctorWorkflowApi';
import {
  filterPatientFacingApprovedActions,
  getPendingCopilotDraftActions,
} from '../utils/liveCopilotWorkflow';

const parseNote = (review) => {
  const source = review?.doctor_note || review?.note_payload || getGeneratedNote(review);
  if (!source) return {};
  if (typeof source === 'string') {
    try {
      return JSON.parse(source);
    } catch {
      return {};
    }
  }
  return source && typeof source === 'object' ? source : {};
};

const getHandoffPreview = (review) => (
  review?.patient_follow_through_preview ||
  review?.patient_handoff_preview ||
  {}
);

const textValue = (value) => {
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

const formatLabel = (value) => {
  if (!value) return '';
  return String(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const getTaskStatus = (task) => {
  const raw = String(task?.status || task?.patient_status || task?.completion_status || 'pending').toLowerCase();
  if (['done', 'completed', 'taken', 'attended', 'confirmed'].includes(raw)) {
    return { value: 'completed', label: 'Completed', color: 'success' };
  }
  if (['sent', 'scheduled', 'booked', 'in_progress', 'active'].includes(raw)) {
    return { value: raw, label: formatLabel(raw), color: 'info' };
  }
  if (['missed', 'overdue', 'failed', 'cancelled'].includes(raw)) {
    return { value: raw, label: formatLabel(raw), color: 'warning' };
  }
  return { value: raw || 'pending', label: formatLabel(raw || 'pending'), color: 'default' };
};

const getProgressStatusConfig = (status, completedCount, totalCount) => {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'completed' || (totalCount > 0 && completedCount >= totalCount)) {
    return { label: 'All completed', color: 'success' };
  }
  if (normalized === 'in_progress' || completedCount > 0) {
    return { label: 'In progress', color: 'info' };
  }
  if (normalized === 'active') {
    return { label: 'Active follow-through', color: 'primary' };
  }
  if (normalized === 'sent') {
    return { label: 'Sent to patient', color: 'success' };
  }
  return { label: status ? formatLabel(status) : 'Not sent', color: 'default' };
};

const formatMoment = (value) => {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleString();
};

const getCompletionRecord = (value) => {
  if (!value || typeof value !== 'object') return null;
  if (value.latest_completion) return value.latest_completion;
  if (value.completion) return value.completion;
  if (value.completed_event) return value.completed_event;
  if (value.completed_at || value.confirmed_at || value.confirmation_note) return value;
  return null;
};

const getCompletionChannelLabel = (completion) => {
  const channel = String(
    completion?.source_channel ||
    completion?.channel ||
    completion?.completed_via ||
    completion?.metadata?.source_channel ||
    ''
  ).toLowerCase();
  const actorRole = String(completion?.actor_role || completion?.metadata?.actor_role || '').toLowerCase();

  if (channel.includes('whatsapp')) {
    return actorRole.includes('agent') || actorRole.includes('ai') ? 'WhatsApp AI agent' : 'WhatsApp';
  }
  if (channel.includes('chat')) return 'AI chat';
  if (channel.includes('patient_app') || channel.includes('app')) return 'Patient app';
  if (actorRole.includes('caregiver')) return 'Caregiver';
  if (actorRole.includes('patient')) return 'Patient';
  if (actorRole.includes('agent') || actorRole.includes('ai')) return 'AI agent';
  return '';
};

const getCompletionIntent = (completion) => String(
  completion?.completion_intent ||
  completion?.intent ||
  completion?.metadata?.completion_intent ||
  completion?.metadata?.intent ||
  ''
).toLowerCase();

const getCompletionSeverity = (completion) => {
  const intent = getCompletionIntent(completion);
  const completed = completion?.completed ?? completion?.is_completed ?? completion?.metadata?.completed;
  if (
    intent.includes('safety_escalation') ||
    completion?.should_escalate === true ||
    completion?.metadata?.should_escalate === true
  ) {
    return 'error';
  }
  if (
    completed === false ||
    intent.includes('unable_to_complete') ||
    intent.includes('barrier') ||
    intent.includes('not_done')
  ) {
    return 'warning';
  }
  return 'success';
};

const getCompletionVerb = (completion) => {
  const severity = getCompletionSeverity(completion);
  if (severity === 'error') return 'reported a safety concern for';
  if (severity === 'warning') return 'reported a barrier for';
  return 'confirmed';
};

const buildTasks = (review, note) => {
  const prescriptions = filterPatientFacingApprovedActions(note.prescription || note.prescriptions).map((item, index) => ({
    id: item.id || item.public_id || `rx-${index}`,
    type: 'medication',
    title: item.medication_name || item.name || 'Medication',
    detail: [item.dosage, item.route, item.interval ? `Every ${item.interval} hours` : '', item.instructions]
      .filter(Boolean)
      .join(' - '),
    raw: item,
  }));

  const investigations = filterPatientFacingApprovedActions(note.investigation || note.investigations).map((item, index) => ({
    id: item.id || item.public_id || `lab-${index}`,
    type: 'investigation',
    title: item.test_type || item.name || 'Investigation',
    detail: [item.reason, item.instructions].filter(Boolean).join(' - '),
    raw: item,
  }));

  const actions = filterPatientFacingApprovedActions(note.other_actions || note.actions || note.recommended_actions).map((item, index) => ({
    id: item.id || item.public_id || `action-${index}`,
    type: item.action_type || item.type || 'task',
    title: item.name || item.label || item.title || 'Patient task',
    detail: item.notes || item.reason || item.instructions || '',
    raw: item,
  }));

  const followUpAt = note.next_review || review?.follow_up || review?.follow_up_at || review?.next_review;
  const followUps = followUpAt
    ? [{
        id: 'follow-up',
        type: 'follow_up',
        title: 'Follow-up review',
        detail: `Recommended for ${new Date(followUpAt).toLocaleString([], {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}`,
        raw: { scheduled_time: followUpAt },
      }]
    : [];

  const handoffPreview = getHandoffPreview(review);
  const backendTasks = filterPatientFacingApprovedActions(
    review?.patient_follow_through?.tasks ||
    handoffPreview?.tasks ||
    review?.follow_through_tasks ||
    review?.patient_tasks ||
    review?.care_plan_tasks
  ).map((item, index) => ({
    id: item.id || item.public_id || `backend-${index}`,
    type: item.type || item.task_type || 'task',
    title: item.title || item.name || item.label || item.instructions || 'Patient task',
    detail: item.detail || item.description || item.reason || item.notes || '',
    raw: item,
  }));

  return [...backendTasks, ...prescriptions, ...investigations, ...actions, ...followUps]
    .filter((task, index, list) => task.title && list.findIndex((candidate) => (
      `${candidate.type}-${candidate.title}`.toLowerCase() === `${task.type}-${task.title}`.toLowerCase()
    )) === index);
};

const taskIcon = (type) => {
  const normalized = String(type || '').toLowerCase();
  if (normalized.includes('medication') || normalized.includes('prescription')) return <MedicationIcon fontSize="small" />;
  if (normalized.includes('investigation') || normalized.includes('lab') || normalized.includes('test')) return <InvestigationIcon fontSize="small" />;
  if (normalized.includes('follow')) return <FollowUpIcon fontSize="small" />;
  return <TaskIcon fontSize="small" />;
};

const PatientFollowThroughPanel = ({ review, patientData, onRefresh }) => {
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const note = useMemo(() => parseNote(review), [review]);
  const pendingCopilotDraftActions = useMemo(() => getPendingCopilotDraftActions(note), [note]);
  const tasks = useMemo(() => buildTasks(review, note), [review, note]);
  const handoffPreview = useMemo(() => getHandoffPreview(review), [review]);
  const followThroughProgress = useMemo(() => getFollowThroughProgress(review), [review]);
  const followThroughAttention = useMemo(() => getFollowThroughAttention(review), [review]);
  const followThroughRecommendedAction = useMemo(
    () => getFollowThroughRecommendedAction(review, { attention: followThroughAttention }),
    [review, followThroughAttention]
  );
  const caregiverContext = useMemo(() => getCaregiverContext(review), [review]);
  const patientSummary = useMemo(() => (
    review?.patient_follow_through?.patient_summary ||
    handoffPreview?.patient_summary ||
    review?.patient_summary ||
    review?.approved_patient_summary ||
    note.patient_summary ||
    textValue(note.plan?.patient_education) ||
    textValue(note.plan?.management) ||
    ''
  ), [review, note, handoffPreview]);
  const whatsAppAgentState = useMemo(
    () => getWhatsAppFollowThroughAgentState(review, { tasks }),
    [review, tasks]
  );
  const whatsAppCompletionCommand = useMemo(
    () => buildWhatsAppCompletionCommand(review, { tasks, agentState: whatsAppAgentState }),
    [review, tasks, whatsAppAgentState]
  );
  const patientHandoffPlan = useMemo(
    () => buildPatientHandoffPlan(review, { note, tasks, patientSummary }),
    [review, note, tasks, patientSummary]
  );

  const localCompletedCount = tasks.filter((task) => getTaskStatus(task.raw).value === 'completed').length;
  const totalCount = Math.max(followThroughProgress.totalTasks || 0, tasks.length);
  const completedCount = Math.max(followThroughProgress.completedTasks || 0, localCompletedCount);
  const remainingCount = Math.max(
    followThroughProgress.remainingTasks ?? (totalCount - completedCount),
    totalCount - completedCount,
    0
  );
  const progressStatus = review?.patient_follow_through?.progress_status || review?.patient_follow_through?.status;
  const progressConfig = getProgressStatusConfig(progressStatus || followThroughProgress.status, completedCount, totalCount);
  const completionPercentage = followThroughProgress.completionPercentage || (totalCount ? Math.round((completedCount / totalCount) * 100) : 0);
  const latestCompletion = followThroughProgress.latestCompletion || review?.patient_follow_through?.latest_completion;
  const latestCompletionSource = getCompletionChannelLabel(latestCompletion);
  const nextAgentTask = whatsAppAgentState.nextTask;
  const sentAt = review?.patient_follow_through?.sent_at || review?.patient_summary_sent_at || review?.summary_sent_at;
  const patientName = `${patientData?.first_name || review?.patient_first_name || ''} ${patientData?.last_name || review?.patient_last_name || ''}`.trim() || 'the patient';
  const status = getReviewWorkflowStatus(review);
  const isDoctorApproved = Boolean(review?.is_finalized || status === REVIEW_STATUS.APPROVED || status === REVIEW_STATUS.FINALIZED);
  const hasEmergencyRisk = hasUnacknowledgedEmergencyRisk(review);

  const handleSendPlan = async () => {
    if (!review?.public_id) return;
    if (pendingCopilotDraftActions.length > 0) {
      setMessage('');
      setError('Approve realtime draft clinical actions in the doctor note before sending patient follow-through.');
      return;
    }

    setSending(true);
    setMessage('');
    setError('');

    try {
      const payload = {
        patient: {
          first_name: patientData?.first_name || review?.patient_first_name || '',
          last_name: patientData?.last_name || review?.patient_last_name || '',
          phone: patientData?.phone || review?.patient_phone_number || '',
          email: patientData?.email || review?.patient_email || '',
        },
        recipient: {
          role: caregiverContext.isCaregiverSubmitted && caregiverContext.authorizedRecipient === true ? 'authorized_caregiver' : 'patient',
          caregiver_name: caregiverContext.caregiverName || '',
          caregiver_relationship: caregiverContext.relationship || '',
          patient_present: caregiverContext.patientPresent,
          patient_identity_confirmed: caregiverContext.patientIdentityConfirmed,
          authorization_status: caregiverContext.authorizedRecipient === true
            ? 'authorized'
            : caregiverContext.authorizedRecipient === false
              ? 'not_authorized'
              : caregiverContext.isCaregiverSubmitted ? 'unknown' : 'patient',
        },
        patient_summary: patientSummary,
        patient_handoff: {
          patient_summary: patientHandoffPlan.patientSummary,
          safety_net: patientHandoffPlan.safetyNet,
          teach_back_prompts: patientHandoffPlan.teachBackPrompts,
          escalation_triggers: patientHandoffPlan.escalationTriggers,
          adherence_supports: patientHandoffPlan.adherenceSupports,
          whatsapp_agent_goals: patientHandoffPlan.whatsappAgentGoals,
        },
        tasks: tasks.map((task) => ({
          type: task.type,
          title: task.title,
          detail: task.detail,
          status: getTaskStatus(task.raw).value,
          source_id: task.raw?.id || task.raw?.public_id || null,
          checklist_item_id: task.raw?.checklist_item_id || task.raw?.checklistItemId || task.raw?.public_id || task.raw?.id || null,
          task_public_id: task.raw?.task_public_id || task.raw?.taskThreadPublicId || task.raw?.workflow_task_public_id || null,
          is_next_in_line: Boolean(task.raw?.is_next_in_line || task.raw?.next_in_line),
          responsible_party_role: task.raw?.responsible_party_role || task.raw?.responsible_role || 'patient',
          completion_channel: getCompletionChannelLabel(getCompletionRecord(task.raw)),
        })),
        delivery_channels: followThroughRecommendedAction.deliveryChannels,
        workflow_action: {
          id: followThroughRecommendedAction.id,
          label: followThroughRecommendedAction.label,
          intent: followThroughRecommendedAction.intent,
          severity: followThroughRecommendedAction.severity,
          next_step: followThroughRecommendedAction.nextStep,
          should_send_patient_message: followThroughRecommendedAction.shouldSendPatientMessage,
          payload: followThroughRecommendedAction.payload,
        },
        completion_tracking: {
          enabled: true,
          allowed_channels: ['whatsapp_ai_agent', 'patient_app', 'chat'],
          patient_or_caregiver_can_confirm_items: true,
          whatsapp_agent_can_mark_items_complete: true,
          active_checklist_item_id: whatsAppAgentState.activeChecklistItemId,
          active_task_public_id: whatsAppAgentState.activeTaskThreadId,
          active_task_title: nextAgentTask?.title || '',
          auto_promote_next_task_after_completion: true,
          agent_completion_command: whatsAppCompletionCommand,
          excluded_realtime_draft_action_count: pendingCopilotDraftActions.length,
          teach_back_required: patientHandoffPlan.teachBackPrompts.length > 0,
          safety_net_trigger_count: patientHandoffPlan.escalationTriggers.length,
          attention_status: followThroughAttention.status,
          nudge_reason: followThroughAttention.reasons[0] || '',
          provider_recommended_action: followThroughRecommendedAction,
        },
        agent_follow_up: {
          enabled: true,
          channel: 'whatsapp_ai_agent',
          active_task_ready_for_completion: whatsAppAgentState.activeTaskReadyForCompletion,
          active_checklist_item_id: whatsAppAgentState.activeChecklistItemId,
          active_task_public_id: whatsAppAgentState.activeTaskThreadId,
          active_task_title: nextAgentTask?.title || '',
          pending_task_count: whatsAppAgentState.pendingTaskCount,
          completed_by_whatsapp_count: whatsAppAgentState.completedByWhatsAppCount,
          can_mark_items_complete_by_conversation: true,
          should_promote_next_task_after_completion: true,
          completion_command: whatsAppCompletionCommand,
          teach_back_prompts: patientHandoffPlan.teachBackPrompts,
          safety_net_triggers: patientHandoffPlan.escalationTriggers,
          adherence_supports: patientHandoffPlan.adherenceSupports,
          goals: patientHandoffPlan.whatsappAgentGoals,
          completion_intent_source: 'patient_or_authorized_caregiver_whatsapp_message',
          provider_recommended_action: followThroughRecommendedAction,
          escalation_rules: {
            worsening_symptoms: 'escalate_to_doctor_queue',
            missed_or_overdue_task: 'send_nudge_then_flag_provider',
            caregiver_not_authorized: 'do_not_send_patient_instructions',
          },
        },
        require_doctor_approval: true,
        metadata: {
          surface: 'doctor_review_detail',
          review_public_id: review.public_id,
          completion_loop: 'whatsapp_ai_agent',
          allowed_completion_channels: ['whatsapp_ai_agent', 'patient_app', 'chat'],
          excluded_realtime_draft_action_count: pendingCopilotDraftActions.length,
          pending_realtime_draft_actions: pendingCopilotDraftActions.map((item) => ({
            section: item.section,
            kind: item.kind,
            label: item.label,
          })),
          follow_through_attention: {
            status: followThroughAttention.status,
            needs_attention: followThroughAttention.needsAttention,
            reasons: followThroughAttention.reasons,
            next_action: followThroughAttention.nextAction,
            recommended_action: followThroughRecommendedAction,
          },
          whatsapp_agent_follow_up: {
            next_task_id: whatsAppAgentState.nextTaskId,
            next_task_title: nextAgentTask?.title || '',
            active_task_ready_for_completion: whatsAppAgentState.activeTaskReadyForCompletion,
            next_action: whatsAppAgentState.nextAction,
            should_promote_next_task_after_completion: whatsAppAgentState.shouldPromoteNextTaskAfterCompletion,
            completion_command_ready: whatsAppCompletionCommand.canRecord,
            completion_command_blockers: whatsAppCompletionCommand.blockers,
            provider_recommended_action_id: followThroughRecommendedAction.id,
            safety_net_count: patientHandoffPlan.counts.safetyNet,
            teach_back_prompt_count: patientHandoffPlan.counts.teachBackPrompts,
          },
          caregiver_context: {
            is_caregiver_submitted: caregiverContext.isCaregiverSubmitted,
            caregiver_name: caregiverContext.caregiverName || '',
            caregiver_relationship: caregiverContext.relationship || '',
            patient_present: caregiverContext.patientPresent,
            patient_identity_confirmed: caregiverContext.patientIdentityConfirmed,
            authorized_recipient: caregiverContext.authorizedRecipient,
          },
        },
      };

      const result = await sendPatientFollowThrough(review.public_id, payload);
      setMessage(result?.message || (
        followThroughRecommendedAction.shouldSendPatientMessage
          ? `Patient follow-through plan queued for ${patientName}.`
          : `${followThroughRecommendedAction.label} recorded for provider follow-up.`
      ));
      if (typeof onRefresh === 'function' && !result?.local_fallback) {
        await onRefresh();
      }
    } catch (sendError) {
      console.error('Failed to send patient follow-through plan:', sendError);
      setError(sendError.message || 'Failed to send patient follow-through plan');
    } finally {
      setSending(false);
    }
  };

  if (!review || (!patientSummary && tasks.length === 0 && pendingCopilotDraftActions.length === 0 && !sentAt)) {
    return null;
  }

  return (
    <Card variant="outlined" sx={{ mb: 3, borderColor: sentAt ? 'success.light' : 'divider' }}>
      <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1.5, flexWrap: 'wrap', mb: 2 }}>
          <Box>
            <Typography variant="subtitle1" fontWeight="bold">
              Patient Follow-through
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Convert the doctor-approved review into patient next steps, reminders, and completion tracking.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 0.75 }}>
            <Chip size="small" label={`${tasks.length} tasks`} variant="outlined" />
            {pendingCopilotDraftActions.length > 0 && (
              <Chip size="small" label={`${pendingCopilotDraftActions.length} drafts pending`} color="warning" variant="outlined" />
            )}
            {tasks.length > 0 && (
              <Chip size="small" label={`${completedCount}/${totalCount} completed`} color={completedCount === totalCount ? 'success' : 'default'} variant="outlined" />
            )}
            <Chip size="small" label="WhatsApp AI loop" color="info" variant="outlined" />
            <Chip
              size="small"
              label={`${patientHandoffPlan.counts.safetyNet} safety-net`}
              color={patientHandoffPlan.counts.safetyNet ? 'warning' : 'default'}
              variant="outlined"
            />
            <Chip
              size="small"
              label={`${patientHandoffPlan.counts.teachBackPrompts} teach-back`}
              color={patientHandoffPlan.counts.teachBackPrompts ? 'info' : 'default'}
              variant="outlined"
            />
            {nextAgentTask && (
              <Chip
                size="small"
                label={whatsAppAgentState.activeTaskReadyForCompletion ? 'Next WhatsApp task ready' : 'Next WhatsApp task'}
                color={whatsAppAgentState.activeTaskReadyForCompletion ? 'success' : 'info'}
                variant="outlined"
              />
            )}
            <Chip size="small" label={progressConfig.label} color={progressConfig.color} variant={progressConfig.color === 'default' ? 'outlined' : 'filled'} />
            {sentAt && <Chip size="small" icon={<CheckIcon />} label="Sent to patient" color="success" />}
            {followThroughAttention.needsAttention && (
              <Chip
                size="small"
                label={followThroughAttention.shortLabel}
                color={followThroughAttention.color}
                variant={followThroughAttention.variant}
              />
            )}
            {caregiverContext.isCaregiverSubmitted && (
              <Chip
                size="small"
                label={caregiverContext.relationship ? `Caregiver: ${formatLabel(caregiverContext.relationship)}` : 'Caregiver'}
                color="secondary"
                variant="outlined"
              />
            )}
          </Stack>
        </Box>

        {sending && <LinearProgress sx={{ mb: 2 }} />}
        {tasks.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
              <Typography variant="caption" color="text.secondary">
                Follow-through progress{remainingCount > 0 ? ` - ${remainingCount} remaining` : ''}
              </Typography>
              <Typography variant="caption" fontWeight="bold">
                {completionPercentage}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={Math.max(0, Math.min(100, completionPercentage))}
              color={completionPercentage >= 100 ? 'success' : 'primary'}
            />
          </Box>
        )}
        {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {pendingCopilotDraftActions.length > 0 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2" fontWeight="bold">
              Realtime draft actions need doctor approval before WhatsApp follow-through
            </Typography>
            <Typography variant="caption" sx={{ display: 'block' }}>
              Pending: {pendingCopilotDraftActions.slice(0, 4).map((item) => item.label).join(', ')}
              {pendingCopilotDraftActions.length > 4 ? `, +${pendingCopilotDraftActions.length - 4} more` : ''}
            </Typography>
          </Alert>
        )}
        {latestCompletion && (
          <Alert severity={getCompletionSeverity(latestCompletion)} sx={{ mb: 2 }}>
            <Typography variant="body2" fontWeight="bold">
              Latest follow-through update: {latestCompletion.checklist_item_description || latestCompletion.task_title || 'Follow-through item'}
            </Typography>
            <Typography variant="caption">
              {latestCompletion.actor_name || formatLabel(latestCompletion.actor_role) || 'Patient'} {getCompletionVerb(latestCompletion)} this step
              {latestCompletion.completed_at || latestCompletion.confirmed_at ? ` on ${formatMoment(latestCompletion.completed_at || latestCompletion.confirmed_at)}` : ''}.
              {latestCompletionSource ? ` Source: ${latestCompletionSource}.` : ''}
              {latestCompletion.note ? ` Note: ${latestCompletion.note}` : ''}
            </Typography>
          </Alert>
        )}
        {nextAgentTask && (
          <Alert severity={sentAt && !whatsAppAgentState.activeTaskReadyForCompletion ? 'warning' : 'info'} sx={{ mb: 2 }}>
            <Typography variant="body2" fontWeight="bold">
              WhatsApp AI next task: {nextAgentTask.title}
            </Typography>
            <Typography variant="caption" sx={{ display: 'block' }}>
              {nextAgentTask.detail || whatsAppAgentState.nextAction}
            </Typography>
            {sentAt && !whatsAppAgentState.activeTaskReadyForCompletion && (
              <Typography variant="caption" sx={{ display: 'block' }}>
                Backend checklist identifiers are still needed before conversational completion can reconcile automatically.
              </Typography>
            )}
            {whatsAppCompletionCommand.blockers.length > 0 && (
              <Typography variant="caption" sx={{ display: 'block' }}>
                Completion blocker: {whatsAppCompletionCommand.blockers[0].label}
              </Typography>
            )}
          </Alert>
        )}
        {followThroughAttention.needsAttention && (
          <Alert severity={followThroughAttention.severity} sx={{ mb: 2 }}>
            <Typography variant="body2" fontWeight="bold">
              {followThroughAttention.label}
            </Typography>
            <Typography variant="caption" sx={{ display: 'block' }}>
              {followThroughAttention.reasons.join(' · ') || followThroughAttention.nextAction}
            </Typography>
            <Typography variant="caption" sx={{ display: 'block' }}>
              {followThroughAttention.nextAction}
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', fontWeight: 700 }}>
              Recommended: {followThroughRecommendedAction.label}. {followThroughRecommendedAction.nextStep}
            </Typography>
          </Alert>
        )}
        {patientHandoffPlan.safetyNet.length > 0 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2" fontWeight="bold" sx={{ mb: 0.5 }}>
              Safety-net triggers for WhatsApp AI
            </Typography>
            <Stack spacing={0.5}>
              {patientHandoffPlan.safetyNet.slice(0, 3).map((item) => (
                <Typography key={item.id} variant="caption" sx={{ display: 'block' }}>
                  {item.label}{item.detail ? ` - ${item.detail}` : ''}
                </Typography>
              ))}
            </Stack>
          </Alert>
        )}
        {patientHandoffPlan.teachBackPrompts.length > 0 && (
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2" fontWeight="bold" sx={{ mb: 0.5 }}>
              Teach-back prompts
            </Typography>
            <Stack spacing={0.5}>
              {patientHandoffPlan.teachBackPrompts.slice(0, 3).map((item) => (
                <Typography key={item.id} variant="caption" sx={{ display: 'block' }}>
                  {item.label}
                </Typography>
              ))}
            </Stack>
          </Alert>
        )}
        {!isDoctorApproved && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            This plan is a preview. Send it only after the doctor approves or finalizes the review.
          </Alert>
        )}
        {hasEmergencyRisk && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Emergency or severe risk is still present. Escalate or document resolution before sending patient next steps.
          </Alert>
        )}
        {caregiverContext.authorizationBlocked && (
          <Alert severity="error" sx={{ mb: 2 }}>
            This caregiver is marked as not authorized for patient-facing instructions. Confirm consent or send directly to the patient.
          </Alert>
        )}
        {caregiverContext.isCaregiverSubmitted && caregiverContext.authorizationUnknown && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Caregiver authorization is unknown. Confirm the recipient before sending patient-facing instructions.
          </Alert>
        )}
        {caregiverContext.isCaregiverSubmitted && caregiverContext.needsPatientPresenceCheck && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Patient presence was not confirmed during caregiver triage. Consider asking one verification question before sending next steps.
          </Alert>
        )}
        {!sentAt && handoffPreview?.send_disabled_reason && (
          <Alert severity={handoffPreview.ready_to_send ? 'info' : 'warning'} sx={{ mb: 2 }}>
            {handoffPreview.send_disabled_reason}
          </Alert>
        )}

        {patientSummary && (
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 0.5 }}>
              Patient-facing summary
            </Typography>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
              {patientSummary}
            </Typography>
          </Alert>
        )}

        {tasks.length > 0 && (
          <Grid container spacing={1.5} sx={{ mb: 2 }}>
            {tasks.slice(0, 8).map((task) => {
              const status = getTaskStatus(task.raw);
              const completion = getCompletionRecord(task.raw);
              const completionSource = getCompletionChannelLabel(completion);
              return (
                <Grid item xs={12} md={6} key={task.id}>
                  <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.5, height: '100%' }}>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                      <Box sx={{ color: 'primary.main', mt: 0.25 }}>{taskIcon(task.type)}</Box>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, alignItems: 'flex-start' }}>
                          <Typography variant="body2" fontWeight="bold">
                            {task.title}
                          </Typography>
                          <Chip size="small" label={status.label} color={status.color} variant="outlined" sx={{ height: 20, fontSize: '0.68rem' }} />
                        </Box>
                        {task.detail && (
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            {task.detail}
                          </Typography>
                        )}
                        <Typography variant="caption" color="text.secondary">
                          {formatLabel(task.type)}
                        </Typography>
                        {completion && (
                          <Typography variant="caption" color="success.dark" sx={{ display: 'block', mt: 0.5 }}>
                            Completed{completion.completed_at || completion.confirmed_at ? ` ${formatMoment(completion.completed_at || completion.confirmed_at)}` : ''}
                            {completionSource ? ` via ${completionSource}` : ''}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </Box>
                </Grid>
              );
            })}
          </Grid>
        )}

        <Divider sx={{ mb: 2 }} />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
          <Typography variant="body2" color="text.secondary">
            {sentAt
              ? `Last sent ${formatMoment(sentAt)}${remainingCount > 0 ? ` - ${remainingCount} remaining` : ''}`
              : 'Send only after the doctor has reviewed the content and the plan is safe for the patient.'}
          </Typography>
          <Button
            variant="contained"
            startIcon={<SendIcon />}
            onClick={handleSendPlan}
            disabled={sending || pendingCopilotDraftActions.length > 0 || hasEmergencyRisk || caregiverContext.authorizationBlocked || !isDoctorApproved || (!patientSummary && tasks.length === 0)}
          >
            {followThroughAttention.needsAttention ? followThroughRecommendedAction.buttonLabel : sentAt ? 'Re-send Next Steps' : followThroughRecommendedAction.buttonLabel}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

export default PatientFollowThroughPanel;
