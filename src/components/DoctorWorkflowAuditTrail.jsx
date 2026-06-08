import React, { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
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
  Sync as SyncIcon,
  WarningAmber as WarningIcon,
} from '@mui/icons-material';
import {
  getLocalWorkflowEvents,
  reconcileLocalWorkflowEvents,
} from '../services/doctorWorkflowApi';

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
    source: 'server',
  };
};

const normalizeLocalEvent = (event) => {
  const payload = event?.payload || {};
  return {
    id: event?.id,
    kind: event?.kind,
    title: formatLabel(payload.decision || event?.kind),
    detail: event?.message || event?.reason || payload.reason || '',
    createdAt: event?.created_at,
    actor: 'This browser',
    source: 'local',
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

const DoctorWorkflowAuditTrail = ({ review, onReconciled = null }) => {
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [syncError, setSyncError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const events = useMemo(() => {
    const serverEvents = getServerEvents(review);
    const localEvents = getLocalWorkflowEvents()
      .filter((event) => event.review_public_id === review?.public_id)
      .map(normalizeLocalEvent);

    return [...localEvents, ...serverEvents]
      .filter((event) => event.id || event.kind)
      .sort((a, b) => {
        const left = Date.parse(a.createdAt || '') || 0;
        const right = Date.parse(b.createdAt || '') || 0;
        return right - left;
      });
  }, [review, refreshKey]);

  if (!review?.public_id && events.length === 0) {
    return null;
  }

  const localCount = events.filter((event) => event.source === 'local').length;
  const handleReconcile = async () => {
    if (!review?.public_id || localCount === 0) return;
    setSyncing(true);
    setSyncMessage('');
    setSyncError('');

    try {
      const result = await reconcileLocalWorkflowEvents(review.public_id);
      const cleared = result?.local_events_cleared || 0;
      const remaining = result?.local_events_remaining || 0;
      setSyncMessage(
        cleared > 0
          ? `${cleared} pending workflow event${cleared === 1 ? '' : 's'} synced to backend.${remaining ? ` ${remaining} still need review.` : ''}`
          : 'Backend accepted the reconcile request, but no local events were cleared.'
      );
      setRefreshKey((value) => value + 1);
      if (typeof onReconciled === 'function') {
        onReconciled(result);
      }
    } catch (error) {
      setSyncError(error.message || 'Failed to reconcile pending workflow events');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Card variant="outlined" sx={{ mb: 3, borderColor: localCount ? 'warning.light' : 'divider' }}>
      <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <HistoryIcon color="primary" />
            <Box>
              <Typography variant="subtitle1" fontWeight="bold">
                Workflow Audit Trail
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Doctor decisions, patient follow-up requests, and realtime session handoffs.
              </Typography>
            </Box>
          </Box>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 0.75 }}>
            <Chip size="small" label={`${events.length} events`} variant="outlined" />
            {localCount > 0 && (
              <Chip size="small" label={`${localCount} pending backend`} color="warning" />
            )}
            {localCount > 0 && (
              <Button
                size="small"
                variant="outlined"
                startIcon={syncing ? <CircularProgress size={14} /> : <SyncIcon />}
                onClick={handleReconcile}
                disabled={syncing}
              >
                Sync Pending
              </Button>
            )}
          </Stack>
        </Box>

        {syncMessage && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {syncMessage}
          </Alert>
        )}
        {syncError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {syncError}
          </Alert>
        )}
        {localCount > 0 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Some workflow actions were captured locally because a backend endpoint was unavailable. Sync them once backend support is ready; failed sync attempts keep the local audit events visible.
          </Alert>
        )}

        {events.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No doctor workflow actions have been recorded for this review yet.
          </Typography>
        ) : (
          <Stack spacing={1.5}>
            {events.map((event, index) => (
              <Box key={event.id || `${event.kind}-${index}`}>
                {index > 0 && <Divider sx={{ mb: 1.5 }} />}
                <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'flex-start' }}>
                  <Box sx={{ color: event.source === 'local' ? 'warning.main' : 'primary.main', mt: 0.25 }}>
                    {getEventIcon(event.kind)}
                  </Box>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                      <Typography variant="body2" fontWeight="bold">
                        {event.title}
                      </Typography>
                      <Chip
                        size="small"
                        label={event.source === 'local' ? 'Pending backend sync' : 'Backend recorded'}
                        color={event.source === 'local' ? 'warning' : 'success'}
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
