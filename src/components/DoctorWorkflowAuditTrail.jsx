import React, { useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import {
  AssignmentTurnedIn as DecisionIcon,
  HelpOutline as InfoIcon,
  HistoryEdu as HistoryIcon,
  Mic as MicIcon,
  Send as SendIcon,
  WarningAmber as WarningIcon,
} from '@mui/icons-material';

const formatLabel = (value) => {
  if (!value) return 'Workflow event';
  return String(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const formatTime = (value) => {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getEventIcon = (kind) => {
  const normalized = String(kind || '').toLowerCase();
  if (normalized.includes('more_info') || normalized.includes('question')) return <InfoIcon fontSize="small" />;
  if (normalized.includes('follow_through') || normalized.includes('patient_summary')) return <SendIcon fontSize="small" />;
  if (normalized.includes('realtime') || normalized.includes('live')) return <MicIcon fontSize="small" />;
  if (normalized.includes('escalate') || normalized.includes('risk')) return <WarningIcon fontSize="small" />;
  return <DecisionIcon fontSize="small" />;
};

const normalizeServerEvent = (event, index) => {
  const payload = event?.payload || event?.metadata || {};
  const kind = event?.kind || event?.event_type || event?.action || event?.decision || event?.status;
  return {
    id: event?.id || event?.public_id || `server-${index}`,
    kind,
    title: event?.title || formatLabel(kind),
    detail:
      event?.detail ||
      event?.message ||
      event?.notes ||
      event?.reason ||
      payload.reason ||
      payload.decision ||
      '',
    createdAt: event?.created_at || event?.timestamp || event?.updated_at,
    actor: event?.actor_name || event?.doctor_name || event?.actor || event?.created_by || 'Backend',
  };
};

const getServerEvents = (review) => {
  const candidates = [
    review?.workflow_events,
    review?.workflow_audit,
    review?.audit_trail,
    review?.doctor_decisions,
    review?.decision_history,
    review?.patient_requests,
    review?.patient_follow_through,
    review?.follow_through_events,
    review?.realtime_sessions,
  ];

  return candidates
    .flatMap((candidate) => {
      if (!candidate) return [];
      return Array.isArray(candidate) ? candidate : [candidate];
    })
    .filter(Boolean)
    .map(normalizeServerEvent);
};

const DoctorWorkflowAuditTrail = ({ review }) => {
  const events = useMemo(
    () => getServerEvents(review)
      .filter((event) => event.id || event.kind)
      .sort((a, b) => {
        const left = Date.parse(a.createdAt || '') || 0;
        const right = Date.parse(b.createdAt || '') || 0;
        return right - left;
      }),
    [review]
  );

  if (!review?.public_id && events.length === 0) {
    return null;
  }

  return (
    <Card variant="outlined" sx={{ mb: 3 }}>
      <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <HistoryIcon color="primary" />
            <Box>
              <Typography variant="subtitle1" fontWeight="bold">
                Workflow Audit Trail
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Server-recorded doctor decisions, patient follow-up requests, and realtime session handoffs.
              </Typography>
            </Box>
          </Box>
          <Chip size="small" label={`${events.length} server events`} variant="outlined" />
        </Box>

        {events.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No server-recorded doctor workflow actions are available for this review.
          </Typography>
        ) : (
          <Stack spacing={1.5}>
            {events.map((event, index) => (
              <Box key={event.id || `${event.kind}-${index}`}>
                {index > 0 && <Divider sx={{ mb: 1.5 }} />}
                <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'flex-start' }}>
                  <Box sx={{ color: 'primary.main', mt: 0.25 }}>
                    {getEventIcon(event.kind)}
                  </Box>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                      <Typography variant="body2" fontWeight="bold">
                        {event.title}
                      </Typography>
                      <Chip
                        size="small"
                        label="Backend recorded"
                        color="success"
                        variant="outlined"
                        sx={{ height: 20, fontSize: '0.68rem' }}
                      />
                    </Box>
                    {event.detail && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                        {event.detail}
                      </Typography>
                    )}
                    <Typography variant="caption" color="text.secondary">
                      {event.actor}{event.createdAt ? ` - ${formatTime(event.createdAt)}` : ''}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            ))}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
};

export default DoctorWorkflowAuditTrail;
