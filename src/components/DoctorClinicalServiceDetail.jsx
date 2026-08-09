import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Call as CallIcon,
  CheckCircle as CheckCircleIcon,
  Lock as LockIcon,
  Schedule as ScheduleIcon,
  Send as SendIcon,
  Verified as VerifiedIcon,
  WarningAmber as WarningIcon,
} from '@mui/icons-material';
import {
  claimClinicalProposal,
  completeClinicalServiceCall,
  getClinicalProposal,
  getClinicalServiceJoin,
  getDoctorClinicalServiceOrder,
  scheduleClinicalService,
  submitClinicalProposalDecision,
} from '../services/doctorCareLoopApi';
import {
  formatDoctorDateTime,
  formatDoctorLabel,
  getAllowedActionKeys,
  getOrderAuthorityAction,
  getOrderDraft,
  getOrderDraftHash,
  getOrderPatientLabel,
  getOrderProposalHash,
  getOrderProposalId,
  getOrderServerState,
  getOrderStateVersion,
  getServerAction,
  getTransitionEvidenceGaps,
  hasServerAction,
} from '../utils/doctorCareLoopViewUtils';

const stringifyDraft = (draft) => {
  if (!draft) return '';
  if (typeof draft === 'string') return draft;
  try {
    return JSON.stringify(draft, null, 2);
  } catch {
    return '';
  }
};

const parseDraft = (value) => {
  if (!value.trim()) return null;
  try {
    return JSON.parse(value);
  } catch {
    throw new Error('The unsent draft must be valid JSON before it can be submitted for clinician approval.');
  }
};

const listValues = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (value === undefined || value === null || value === '') return [];
  return [value];
};

const displayValue = (value) => {
  if (value === undefined || value === null || value === '') return 'Not supplied by server';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  return value.label || value.title || value.name || value.detail || value.status || value.state || 'Structured server value';
};

const DoctorClinicalServiceDetail = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [proposal, setProposal] = useState(null);
  const [draftText, setDraftText] = useState('');
  const [question, setQuestion] = useState('');
  const [decisionReason, setDecisionReason] = useState('');
  const [startTime, setStartTime] = useState('');
  const [attendanceEvidence, setAttendanceEvidence] = useState('');
  const [joinProjection, setJoinProjection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadDetail = useCallback(async () => {
    if (!orderId) {
      setError('Clinical-service order identifier is required.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const nextOrder = await getDoctorClinicalServiceOrder(orderId);
      const proposalId = getOrderProposalId(nextOrder);
      let nextProposal = null;
      if (proposalId) {
        nextProposal = await getClinicalProposal(proposalId);
      }
      setOrder(nextOrder);
      setProposal(nextProposal);
      setDraftText(stringifyDraft(getOrderDraft(nextOrder, nextProposal)));
      setJoinProjection(null);
    } catch (requestError) {
      setOrder(null);
      setProposal(null);
      setError(requestError.message || 'Clinical-service detail is unavailable from the server.');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const allowedActions = useMemo(() => getAllowedActionKeys(proposal?.allowed_actions), [proposal]);
  const authorityAction = getOrderAuthorityAction(order);
  const authorityActionAvailable = Boolean(authorityAction);
  const proposalHash = getOrderProposalHash(order, proposal);
  const draftHash = getOrderDraftHash(order, proposal);
  const liveService = ['audio', 'video'].includes(String(order?.modality || '').toLowerCase());
  const claimActions = Array.isArray(proposal?.clinician_work?.claim_actions)
    ? proposal.clinician_work.claim_actions
    : [];
  const claimAvailable = authorityActionAvailable
    && (claimActions.includes('claim') || authorityAction?.claim_endpoint)
    && proposal?.review_claim?.claimed_by_current_doctor !== true;
  const scheduleActionAvailable = hasServerAction(order, 'schedule', 'schedule_appointment');
  const completeActionAvailable = hasServerAction(order, 'complete_call', 'complete_live_call') || Boolean(joinProjection?.available);

  const runMutation = async (key, operation, successMessage) => {
    setBusyAction(key);
    setError('');
    setNotice('');
    try {
      const result = await operation();
      setNotice(successMessage(result));
      await loadDetail();
      return result;
    } catch (requestError) {
      setError(requestError.message || 'The server did not confirm this clinical-service action.');
      return null;
    } finally {
      setBusyAction('');
    }
  };

  const handleClaim = () => runMutation(
    'claim',
    () => claimClinicalProposal(getOrderProposalId(order), { action: 'claim' }),
    () => 'Clinical proposal claim confirmed by the server. The existing clinical decision route is now available if the server permits it.'
  );

  const handleDecision = (decision) => {
    if (!authorityActionAvailable) {
      setError('The server has not issued open_existing_claim_and_decision for this order. Approval is blocked.');
      return;
    }
    if (!allowedActions.includes(decision)) {
      setError('The server has not issued this decision action for the current proposal.');
      return;
    }
    if (!proposalHash) {
      setError('The exact server proposal hash is missing. Approval is blocked until the proposal is refetched.');
      return;
    }
    if (['approve_as_written', 'edit_and_approve'].includes(decision) && !draftHash) {
      setError('The exact server AI draft hash is missing. Approval is blocked until the draft is refetched.');
      return;
    }

    let editedProposal;
    if (decision === 'edit_and_approve') {
      try {
        editedProposal = parseDraft(draftText);
      } catch (draftError) {
        setError(draftError.message);
        return;
      }
    }

    const questions = decision === 'request_more_information' && question.trim()
      ? [{ question: question.trim(), reason: decisionReason.trim() }]
      : [];

    return runMutation(
      decision,
      () => submitClinicalProposalDecision(getOrderProposalId(order), {
        proposalHash,
        aiDraftHash: draftHash,
        decision,
        editedProposal,
        reason: decisionReason.trim(),
        questions,
      }),
      (result) => result?.decision_id
        ? `Server confirmed the ${formatDoctorLabel(decision).toLowerCase()} decision.`
        : 'The server returned a decision response. Refresh the proposal to verify its current state.'
    );
  };

  const handleSchedule = () => {
    if (!scheduleActionAvailable) {
      setError('The server has not issued a schedule action for this order.');
      return;
    }
    if (!startTime) {
      setError('Choose a start time before requesting server scheduling.');
      return;
    }
    return runMutation(
      'schedule',
      () => scheduleClinicalService(orderId, { start_time: new Date(startTime).toISOString() }),
      () => 'Appointment scheduling confirmed by the server. Refreshing the server projection.'
    );
  };

  const handleCheckJoin = async () => {
    setBusyAction('join');
    setError('');
    setNotice('');
    try {
      const result = await getClinicalServiceJoin(orderId);
      setJoinProjection(result);
      if (result.available && result.server_action) {
        setNotice('The server returned a join action for the scheduled appointment. The call has not been marked complete.');
      } else {
        setNotice(`Server join is not available: ${result.reason || 'the appointment is not ready'}.`);
      }
    } catch (requestError) {
      setJoinProjection(null);
      setError(requestError.message || 'The server did not return join availability.');
    } finally {
      setBusyAction('');
    }
  };

  const handleOpenCallStack = () => {
    const action = joinProjection?.server_action;
    if (!joinProjection?.available || !action?.channel_name) {
      setError('Open the existing call stack only after the server returns an available join action.');
      return;
    }
    navigate(`/voice?channel=${encodeURIComponent(action.channel_name)}`, {
      state: {
        item: {
          channel_name: action.channel_name,
          channel: action.channel,
          order_id: orderId,
          appointment_id: joinProjection.appointment_id,
        },
      },
    });
  };

  const handleCompleteCall = () => {
    if (!completeActionAvailable) {
      setError('The server has not issued a verifiable call-completion action.');
      return;
    }
    if (!attendanceEvidence.trim()) {
      setError('Record server-verifiable attendance evidence before completing the call.');
      return;
    }
    return runMutation(
      'complete_call',
      () => completeClinicalServiceCall(orderId, {
        attendance_evidence: attendanceEvidence.trim(),
        appointment_id: joinProjection?.appointment_id || order?.appointment_id,
      }),
      (result) => result?.status === 'completed'
        ? 'Call completion confirmed by the server.'
        : 'The server recorded the call completion request. Refresh the projection to verify the resulting state.'
    );
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress aria-label="Loading clinical-service detail" /></Box>;
  }

  if (!order) {
    return (
      <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 980, mx: 'auto' }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/clinical-services')} sx={{ mb: 2 }}>Back to clinical services</Button>
        <Alert severity="info">
          <Typography variant="body2" fontWeight={700}>Clinical-service detail unavailable</Typography>
          <Typography variant="body2">{error || 'The server returned no order projection.'}</Typography>
          <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>No local order or approval state is used.</Typography>
        </Alert>
      </Box>
    );
  }

  const orderState = getOrderServerState(order);
  const proposalId = getOrderProposalId(order);
  const stateVersion = getOrderStateVersion(order);
  const missingInformation = [
    ...listValues(proposal?.missing_information?.questions || proposal?.missing_information || proposal?.exception_packet?.missing_evidence),
    ...getTransitionEvidenceGaps(order),
  ].filter((value, index, values) => values.findIndex((candidate) => displayValue(candidate) === displayValue(value)) === index);
  const sourceEvidence = listValues(proposal?.evidence || proposal?.clinical_documentation?.source_provenance);
  const documentation = proposal?.clinical_documentation || {};
  const execution = proposal?.execution_state || {};
  const serverAction = getServerAction(order, 'schedule', 'schedule_appointment', 'join', 'join_appointment', 'open_existing_call_stack')
    || order?.server_action
    || order?.schedule_action
    || order?.join_action;
  const authorityActionKey = typeof authorityAction === 'string'
    ? authorityAction
    : authorityAction?.key || authorityAction?.action_key || authorityAction?.action || 'open_existing_claim_and_decision';
  const claimEndpoint = proposal?.clinician_work?.claim_endpoint || authorityAction?.claim_endpoint;
  const decisionEndpoint = proposal?.authority_checkpoint?.decision_endpoint || authorityAction?.decision_endpoint;
  const decisionAuthorityReady = authorityActionAvailable && Boolean(proposalId && proposalHash);

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1180, mx: 'auto', width: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', mb: 3 }}>
        <Box>
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/clinical-services')} sx={{ mb: 1 }}>Back to clinical services</Button>
          <Typography variant="h4" fontWeight={800}>{order.sku || 'Clinician service'}</Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
            {getOrderPatientLabel(order, proposal)} · {formatDoctorLabel(order.modality || order.service_class)}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ flexWrap: 'wrap', gap: 0.75 }}>
          <Chip label={formatDoctorLabel(orderState)} color={orderState === 'completed' ? 'success' : 'default'} variant="outlined" />
          <Chip label={`Due ${formatDoctorDateTime(order.due_at)}`} variant="outlined" />
          {stateVersion && <Chip label={`State ${stateVersion}`} variant="outlined" />}
        </Stack>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {notice && <Alert severity="info" sx={{ mb: 2 }}>{notice}</Alert>}

      <Grid container spacing={2}>
        <Grid item xs={12} md={7}>
          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} gutterBottom>Clinical authority</Typography>
              <Alert severity="info" icon={<LockIcon />} sx={{ mb: 2 }}>
                Every claim and decision below uses the existing server clinical authority routes. Commercial attributes are intentionally absent from this doctor view.
              </Alert>
              <Stack spacing={1}>
                <Typography variant="body2"><strong>Proposal:</strong> {proposalId || 'Not linked by server'}</Typography>
                <Typography variant="body2"><strong>Authority action:</strong> {formatDoctorLabel(authorityActionKey)}</Typography>
                <Typography variant="body2"><strong>Claim route:</strong> {claimEndpoint || 'Not supplied by server'}</Typography>
                <Typography variant="body2"><strong>Decision route:</strong> {decisionEndpoint || 'Not supplied by server'}</Typography>
                <Typography variant="body2"><strong>Clinical authority:</strong> {order.clinical_authority || 'Server-controlled clinician claim and decision route'}</Typography>
              </Stack>
              {!authorityActionAvailable && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  The server has not issued the open_existing_claim_and_decision action for this order; claim and approval remain unavailable.
                </Alert>
              )}
              {claimAvailable && (
                <Button
                  variant="contained"
                  startIcon={busyAction === 'claim' ? <CircularProgress size={16} color="inherit" /> : <LockIcon />}
                  onClick={handleClaim}
                  disabled={Boolean(busyAction)}
                  sx={{ mt: 2 }}
                >
                  Claim proposal via server
                </Button>
              )}
              {proposal?.review_claim?.claimed_by_current_doctor && (
                <Chip icon={<VerifiedIcon />} label="Claim confirmed for this doctor" color="success" sx={{ mt: 2 }} />
              )}
            </CardContent>
          </Card>

          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} gutterBottom>Exact proposal and draft hashes</Typography>
              <Stack spacing={1}>
                <Typography variant="body2" sx={{ wordBreak: 'break-all' }}><strong>Proposal hash:</strong> {proposalHash || 'Not supplied by server'}</Typography>
                <Typography variant="body2" sx={{ wordBreak: 'break-all' }}><strong>AI draft hash:</strong> {draftHash || 'Not supplied by server'}</Typography>
                <Typography variant="caption" color="text.secondary">Approval is blocked if the exact server proposal hash is missing or stale.</Typography>
              </Stack>
            </CardContent>
          </Card>

          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} gutterBottom>AI-prepared note</Typography>
              <Alert severity="warning" sx={{ mb: 2 }}>
                Unsent draft input is local to this page only. It is not an approved clinical record until the server decision response is received.
              </Alert>
              <TextField
                label="Unsent draft input"
                value={draftText}
                onChange={(event) => setDraftText(event.target.value)}
                multiline
                minRows={10}
                fullWidth
                disabled={!allowedActions.includes('edit_and_approve') || Boolean(busyAction)}
                helperText={allowedActions.includes('edit_and_approve') ? 'Edit the structured draft, then choose Edit and approve.' : 'The server has not issued edit_and_approve for this proposal.'}
              />
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" fontWeight={700}>Approved patient note state</Typography>
                <Typography variant="body2">{documentation.state || 'Not supplied by server'}</Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  Signed: {documentation.signed ? `Yes${documentation.signed_at ? ` · ${formatDoctorDateTime(documentation.signed_at)}` : ''}` : 'No'}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ wordBreak: 'break-all' }}>
                  Signed content hash: {execution.signed_content_hash || 'Not supplied by server'}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={5}>
          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} gutterBottom>Server decision actions</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                Only actions in the server-issued allowed action list are enabled.
              </Typography>
              <Stack spacing={1}>
                {['approve_as_written', 'edit_and_approve', 'request_more_information', 'convert_to_live_encounter', 'escalate', 'reject'].map((action) => (
                  <Button
                    key={action}
                    variant={action === 'approve_as_written' ? 'contained' : 'outlined'}
                    color={action === 'escalate' || action === 'reject' ? 'warning' : 'primary'}
                    startIcon={busyAction === action ? <CircularProgress size={16} color="inherit" /> : action === 'escalate' ? <WarningIcon /> : <CheckCircleIcon />}
                    onClick={() => handleDecision(action)}
                    disabled={Boolean(busyAction) || !decisionAuthorityReady || !allowedActions.includes(action)}
                    sx={{ justifyContent: 'flex-start' }}
                  >
                    {formatDoctorLabel(action)}{allowedActions.includes(action) ? '' : ' (not issued)'}
                  </Button>
                ))}
              </Stack>
              {allowedActions.includes('request_more_information') && (
                <>
                  <TextField label="Question to send (optional)" value={question} onChange={(event) => setQuestion(event.target.value)} fullWidth multiline minRows={2} sx={{ mt: 2 }} disabled={Boolean(busyAction)} />
                  <TextField label="Decision reason (optional)" value={decisionReason} onChange={(event) => setDecisionReason(event.target.value)} fullWidth multiline minRows={2} sx={{ mt: 1.5 }} disabled={Boolean(busyAction)} />
                </>
              )}
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" fontWeight={700}>Evidence from server</Typography>
              {sourceEvidence.length ? sourceEvidence.map((item, index) => (
                <Typography variant="body2" key={`evidence-${index}`} sx={{ mt: 0.75 }}>
                  {displayValue(item?.label || item?.evidence_type || item)}{item?.value ? `: ${displayValue(item.value)}` : ''}
                </Typography>
              )) : <Typography variant="body2" color="text.secondary">No source evidence returned.</Typography>}
              <Typography variant="subtitle2" fontWeight={700} sx={{ mt: 2 }}>Missing information</Typography>
              {missingInformation.length ? missingInformation.map((item, index) => <Typography variant="body2" key={`missing-${index}`} sx={{ mt: 0.75 }}>{displayValue(item)}</Typography>) : <Typography variant="body2" color="text.secondary">No missing information returned.</Typography>}
            </CardContent>
          </Card>

          {liveService && (
            <Card variant="outlined" sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="h6" fontWeight={700} gutterBottom>Server schedule and join</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  A modality alone does not create an appointment. Schedule and join availability are read from server actions.
                </Typography>
                {serverAction?.type && <Typography variant="caption" display="block" sx={{ mb: 1 }}>Server action: {serverAction.type}</Typography>}
                {scheduleActionAvailable ? (
                  <Stack spacing={1.5}>
                    <TextField label="Appointment start" type="datetime-local" value={startTime} onChange={(event) => setStartTime(event.target.value)} InputLabelProps={{ shrink: true }} disabled={Boolean(busyAction)} fullWidth />
                    <Button variant="outlined" startIcon={busyAction === 'schedule' ? <CircularProgress size={16} /> : <ScheduleIcon />} onClick={handleSchedule} disabled={Boolean(busyAction)}>Schedule through server</Button>
                  </Stack>
                ) : (
                  <Alert severity="info" sx={{ mb: 1.5 }}>The server has not issued a schedule action for this order.</Alert>
                )}
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 1.5 }}>
                  <Button variant="outlined" startIcon={busyAction === 'join' ? <CircularProgress size={16} /> : <CallIcon />} onClick={handleCheckJoin} disabled={Boolean(busyAction)}>Check server join</Button>
                  {joinProjection?.available && <Button variant="contained" startIcon={<CallIcon />} onClick={handleOpenCallStack} disabled={Boolean(busyAction)}>Open existing call stack</Button>}
                </Stack>
                {joinProjection && <Typography variant="caption" display="block" sx={{ mt: 1 }}>Join state: {joinProjection.available ? 'available from server' : joinProjection.reason || 'not available'}</Typography>}
                <Divider sx={{ my: 2 }} />
                <TextField label="Attendance evidence for server completion" value={attendanceEvidence} onChange={(event) => setAttendanceEvidence(event.target.value)} fullWidth multiline minRows={2} disabled={Boolean(busyAction)} helperText="Required before the doctor can post call completion." />
                <Button variant="outlined" color="success" startIcon={busyAction === 'complete_call' ? <CircularProgress size={16} /> : <SendIcon />} onClick={handleCompleteCall} disabled={Boolean(busyAction) || !completeActionAvailable} sx={{ mt: 1.5 }}>Post server call completion</Button>
              </CardContent>
            </Card>
          )}

          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle2" fontWeight={700}>Next clinical checkpoint</Typography>
              <Typography variant="body2" sx={{ mt: 0.75 }}>{displayValue(proposal?.execution_state?.next_checkpoint || order.next_action)}</Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>Due: {formatDoctorDateTime(proposal?.execution_state?.due_at || order.due_at)}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DoctorClinicalServiceDetail;
