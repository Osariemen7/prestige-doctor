import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
import {
  EventAvailable as AttendanceIcon,
  GppMaybe as SafetyIcon,
  Rule as ProtocolIcon,
  Timeline as CheckpointIcon,
} from '@mui/icons-material';
import { listDoctorCareTransitions } from '../services/doctorCareLoopApi';
import {
  findTransitionForReview,
  formatDoctorDateTime,
  formatDoctorLabel,
  getTransitionCheckpoint,
  getTransitionContextFromReview,
  getTransitionEvidenceGaps,
  getTransitionOutcome,
  getTransitionProtocol,
  getTransitionSafetyEscalation,
  getTransitionStateVersion,
} from '../utils/doctorCareLoopViewUtils';

const textValue = (value, empty = 'Not supplied by server') => {
  if (value === undefined || value === null || value === '') return empty;
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  return value?.label || value?.name || value?.title || value?.detail || value?.status || value?.state || value?.outcome || 'Structured server value';
};

const DoctorTransitionContext = ({ review, reviewPublicId }) => {
  const [transition, setTransition] = useState(() => getTransitionContextFromReview(review));
  const [loading, setLoading] = useState(!getTransitionContextFromReview(review));
  const [error, setError] = useState('');

  useEffect(() => {
    const embeddedContext = getTransitionContextFromReview(review);
    if (embeddedContext) {
      setTransition(embeddedContext);
      setLoading(false);
      setError('');
      return undefined;
    }

    if (!reviewPublicId) {
      setTransition(null);
      setLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    setLoading(true);
    setError('');
    listDoctorCareTransitions({ review_public_id: reviewPublicId }, { signal: controller.signal })
      .then((payload) => {
        if (controller.signal.aborted) return;
        const matched = findTransitionForReview(payload.results, reviewPublicId);
        setTransition(matched);
        if (!matched) {
          setError('No actor-scoped transition context was returned for this review.');
        }
      })
      .catch((requestError) => {
        if (controller.signal.aborted) return;
        setTransition(null);
        setError(requestError.message || 'Transition context is unavailable from the server.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [review, reviewPublicId]);

  if (loading) {
    return <Alert severity="info" sx={{ mb: 3 }}>Loading actor-scoped CareLoop context from the server…</Alert>;
  }

  if (!transition) {
    return error ? (
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2" fontWeight={600}>CareLoop transition context unavailable</Typography>
        <Typography variant="body2">{error}</Typography>
        <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
          Clinical queue and decision authority remain server-controlled; no transition state is inferred here.
        </Typography>
      </Alert>
    ) : null;
  }

  const protocol = getTransitionProtocol(transition);
  const evidenceGaps = getTransitionEvidenceGaps(transition);
  const safetyEscalation = getTransitionSafetyEscalation(transition);
  const transitionKind = String(transition.transition_kind || transition.kind || '').toLowerCase();
  const outcome = getTransitionOutcome(
    transition,
    transitionKind.includes('referral') ? 'referral' : transitionKind.includes('discharge') ? 'discharge' : 'other'
  );
  const checkpoint = getTransitionCheckpoint(transition);
  const stateVersion = getTransitionStateVersion(transition);
  const consent = transition.consent || transition.patient_consent || {};
  const nextAction = transition.next_action || {};

  return (
    <Card variant="outlined" sx={{ mb: 3 }}>
      <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1.5, flexWrap: 'wrap', mb: 2 }}>
          <Box>
            <Typography variant="h6" fontWeight={700}>CareLoop clinical context</Typography>
            <Typography variant="body2" color="text.secondary">
              Server projection for this doctor and review; it does not change clinical queue priority.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 0.75 }}>
            <Chip size="small" label={formatDoctorLabel(transitionKind || 'transition')} variant="outlined" />
            <Chip size="small" label={formatDoctorLabel(transition.status || transition.state)} color="info" variant="outlined" />
            {stateVersion && <Chip size="small" label={`State ${stateVersion}`} variant="outlined" />}
          </Stack>
        </Box>

        {error && <Alert severity="warning" sx={{ mb: 2 }}>{error}</Alert>}

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Stack direction="row" spacing={1} alignItems="flex-start">
              <ProtocolIcon color="primary" />
              <Box>
                <Typography variant="subtitle2" fontWeight={700}>Consented protocol</Typography>
                <Typography variant="body2">{textValue(protocol)}</Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  Consent: {textValue(consent.status || transition.consent_status || transition.patient_consent_status)}
                </Typography>
                {protocol?.version && (
                  <Typography variant="caption" color="text.secondary" display="block">
                    Version {protocol.version}
                  </Typography>
                )}
              </Box>
            </Stack>
          </Grid>

          <Grid item xs={12} md={6}>
            <Stack direction="row" spacing={1} alignItems="flex-start">
              <CheckpointIcon color="primary" />
              <Box>
                <Typography variant="subtitle2" fontWeight={700}>Clinically indicated checkpoint</Typography>
                <Typography variant="body2">{textValue(checkpoint || nextAction)}</Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  Due: {formatDoctorDateTime(checkpoint?.due_at || nextAction?.due_at || transition.due_at)}
                </Typography>
              </Box>
            </Stack>
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" fontWeight={700}>Evidence gaps</Typography>
            {evidenceGaps.length ? (
              <Box component="ul" sx={{ pl: 2.5, my: 0.75 }}>
                {evidenceGaps.map((gap, index) => <li key={`${gap}-${index}`}><Typography variant="body2">{gap}</Typography></li>)}
              </Box>
            ) : <Typography variant="body2" color="text.secondary">No evidence gaps returned by the server.</Typography>}
          </Grid>

          <Grid item xs={12} md={6}>
            <Stack direction="row" spacing={1} alignItems="flex-start">
              <SafetyIcon color={safetyEscalation ? 'error' : 'disabled'} />
              <Box>
                <Typography variant="subtitle2" fontWeight={700}>Safety escalation</Typography>
                <Typography variant="body2">
                  {safetyEscalation ? textValue(safetyEscalation) : 'No safety escalation returned by the server.'}
                </Typography>
                {safetyEscalation?.status && <Chip size="small" label={formatDoctorLabel(safetyEscalation.status)} color="warning" variant="outlined" sx={{ mt: 0.5 }} />}
              </Box>
            </Stack>
          </Grid>

          <Grid item xs={12}>
            <Divider sx={{ mb: 1.5 }} />
            <Typography variant="subtitle2" fontWeight={700}>
              {transitionKind.includes('referral') ? 'Referral attendance outcome' : transitionKind.includes('discharge') ? 'Discharge follow-up outcome' : 'Transition outcome'}
            </Typography>
            <Typography variant="body2">{textValue(outcome)}</Typography>
            {outcome?.recorded_at && (
              <Typography variant="caption" color="text.secondary">Recorded {formatDoctorDateTime(outcome.recorded_at)}</Typography>
            )}
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default DoctorTransitionContext;
