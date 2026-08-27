import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  FormControlLabel,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Call as CallIcon,
  CheckCircle as CheckCircleIcon,
  EditNote as EditNoteIcon,
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
  getOrderDraftHash,
  getOrderPatientLabel,
  getOrderProposalHash,
  getOrderProposalId,
  getOrderServerState,
  getOrderStateVersion,
  getTransitionEvidenceGaps,
  hasServerAction,
} from '../utils/doctorCareLoopViewUtils';
import {
  asClinicalList,
  displayClinicalValue,
  formatClinicalFieldLabel,
  getClinicalAttestationRequirements,
  getClinicalDecisionCategoryOptions,
  getClinicalDiff,
  getClinicalEditContract,
  getClinicalEvidenceRows,
  getClinicalReviewRisk,
  setClinicalPath,
} from '../utils/clinicalProposalViewUtils';

const listValues = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (value === undefined || value === null || value === '') return [];
  return [value];
};

const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

const renderServerValue = (value, key = '') => {
  if (Array.isArray(value)) {
    if (!value.length) return <Typography variant="body2" color="text.secondary">Not supplied by server</Typography>;
    return (
      <Stack spacing={0.5} sx={{ pl: 1 }}>
        {value.map((item, index) => (
          <Box key={`${key}-${index}`} sx={{ borderLeft: '2px solid', borderColor: 'divider', pl: 1 }}>
            {renderServerValue(item, `${key}-${index}`)}
          </Box>
        ))}
      </Stack>
    );
  }
  if (isRecord(value)) {
    const entries = Object.entries(value).filter(([, item]) => item !== null && item !== undefined && item !== '');
    if (!entries.length) return <Typography variant="body2" color="text.secondary">Not supplied by server</Typography>;
    return (
      <Stack spacing={0.75}>
        {entries.map(([field, item]) => (
          <Box key={`${key}-${field}`}>
            <Typography variant="caption" color="text.secondary" display="block">{formatClinicalFieldLabel(field)}</Typography>
            {renderServerValue(item, `${key}-${field}`)}
          </Box>
        ))}
      </Stack>
    );
  }
  return <Typography variant="body2">{displayClinicalValue(value)}</Typography>;
};

const sourceLabel = (item) => item?.provenance?.source || item?.source || item?.source_type || 'Server record';
const captureLabel = (item) => item?.provenance?.capture_channel || item?.capture_channel || item?.channel || 'Not supplied';
const verificationLabel = (item) => item?.verified === true ? 'Verified by server' : 'Not verified by server';

const DoctorClinicalServiceDetail = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [proposal, setProposal] = useState(null);
  const [editDocument, setEditDocument] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [attestations, setAttestations] = useState({
    documentation_reviewed: false,
    allergies_and_interactions_reviewed: false,
  });
  const [question, setQuestion] = useState('');
  const [decisionReason, setDecisionReason] = useState('');
  const [decisionCategory, setDecisionCategory] = useState('routine_review');
  const [reviewStartedAt, setReviewStartedAt] = useState('');
  const [startTime, setStartTime] = useState('');
  const [attendanceEvidence, setAttendanceEvidence] = useState('');
  const [joinProjection, setJoinProjection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadDetail = useCallback(async ({ resetReviewStart = false } = {}) => {
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
      if (proposalId) nextProposal = await getClinicalProposal(proposalId);
      const nextEditDocument = getClinicalEditContract(nextProposal?.clinical_documentation);
      setOrder(nextOrder);
      setProposal(nextProposal);
      setEditDocument(nextEditDocument);
      setEditMode(false);
      setAttestations({ documentation_reviewed: false, allergies_and_interactions_reviewed: false });
      setJoinProjection(null);
      setReviewStartedAt((previous) => resetReviewStart
        ? (nextProposal?.clinician_work?.started_at || new Date().toISOString())
        : (previous || nextProposal?.clinician_work?.started_at || new Date().toISOString()));
    } catch (requestError) {
      setOrder(null);
      setProposal(null);
      setEditDocument(null);
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
  const allAttestationsComplete = Object.values(attestations).every(Boolean);
  const documentation = proposal?.clinical_documentation || {};
  const risk = useMemo(() => getClinicalReviewRisk(proposal), [proposal]);
  const evidenceRows = useMemo(() => getClinicalEvidenceRows(proposal), [proposal]);
  const editDiff = useMemo(() => getClinicalDiff(documentation.edit_contract, editDocument), [documentation.edit_contract, editDocument]);
  const attestationRequirements = useMemo(() => getClinicalAttestationRequirements(), []);
  const categoryOptions = useMemo(() => getClinicalDecisionCategoryOptions(), []);

  const runMutation = async (key, operation, successMessage) => {
    setBusyAction(key);
    setError('');
    setNotice('');
    try {
      const result = await operation();
      setNotice(successMessage(result));
      await loadDetail({ resetReviewStart: key === 'claim' });
      return result;
    } catch (requestError) {
      if (requestError.status === 409) {
        setError('This proposal changed while it was open. The server has been refetched; review the current note and hashes before deciding again.');
        await loadDetail({ resetReviewStart: true });
      } else if (requestError.status === 429) {
        const retryAfter = requestError.retryAfter ? ` Retry after ${requestError.retryAfter}.` : '';
        setError(`The server is rate-limiting this action.${retryAfter}`);
      } else {
        setError(requestError.message || 'The server did not confirm this clinical-service action.');
      }
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
    if (['approve_as_written', 'edit_and_approve'].includes(decision) && !allAttestationsComplete) {
      setError('Complete both required clinical attestations before approving the server-prepared note.');
      return;
    }
    if (decision === 'edit_and_approve' && (!editMode || !editDocument)) {
      setError('Open Edit draft fields and review the structured changes before choosing Edit and approve.');
      return;
    }
    if (decision === 'request_more_information' && !question.trim()) {
      setError('Add the information request that should be returned to the patient or care team.');
      return;
    }
    if (['reject', 'escalate'].includes(decision) && !decisionReason.trim()) {
      setError('Add a reason so the next clinician can act on this decision.');
      return;
    }

    const editedProposal = decision === 'edit_and_approve' ? editDocument : undefined;
    const questions = decision === 'request_more_information'
      ? [{ question: question.trim(), reason: decisionReason.trim() }]
      : [];
    const decisionAt = new Date().toISOString();

    return runMutation(
      decision,
      () => submitClinicalProposalDecision(getOrderProposalId(order), {
        proposalHash,
        aiDraftHash: draftHash,
        decision,
        editedProposal,
        reason: decisionReason.trim(),
        questions,
        clinicalAttestations: ['approve_as_written', 'edit_and_approve'].includes(decision) ? attestations : undefined,
        reviewStartedAt: reviewStartedAt || new Date().toISOString(),
        decisionAt,
        decisionCategory,
      }),
      (result) => result?.decision_id
        ? `Server confirmed the ${formatDoctorLabel(decision).toLowerCase()} decision.`
        : 'The server returned a decision response. Refresh the proposal to verify its current state.'
    );
  };

  const handleEditField = (path, value) => {
    setEditDocument((current) => setClinicalPath(current, path, value));
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

  const renderSection = (sectionKey, title) => {
    const serverSection = documentation.sections?.[sectionKey] || {};
    const section = editMode ? editDocument?.[sectionKey] : serverSection;
    const entries = isRecord(section) ? Object.entries(section) : [];
    return (
      <Card variant="outlined" key={sectionKey} sx={{ mb: 1.5 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={800}>{title}</Typography>
          {!entries.length && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>Not supplied by server.</Typography>}
          <Stack spacing={1.25} sx={{ mt: entries.length ? 1 : 0 }}>
            {entries.map(([field, value]) => (
              editMode && (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value === null) ? (
                <TextField
                  key={`${sectionKey}.${field}`}
                  label={formatClinicalFieldLabel(field)}
                  value={value ?? ''}
                  onChange={(event) => handleEditField(`${sectionKey}.${field}`, event.target.value)}
                  fullWidth
                  multiline
                  minRows={2}
                  disabled={Boolean(busyAction)}
                />
              ) : (
                <Box key={`${sectionKey}.${field}`}>
                  <Typography variant="caption" color="text.secondary" display="block">{formatClinicalFieldLabel(field)}</Typography>
                  {renderServerValue(value, `${sectionKey}.${field}`)}
                </Box>
              )
            ))}
          </Stack>
        </CardContent>
      </Card>
    );
  };

  const renderAction = (item, index, kind) => {
    const regimen = item?.patient_specific_regimen;
    return (
      <Card variant="outlined" key={`${kind}-${index}`} sx={{ mb: 1 }}>
        <CardContent sx={{ '&:last-child': { pb: 2 } }}>
          <Typography variant="subtitle2" fontWeight={800}>{displayClinicalValue(item?.medication_name || item?.test_type || item?.title || item?.action_type || `${formatClinicalFieldLabel(kind)} ${index + 1}`)}</Typography>
          {kind === 'medication' && regimen && (
            <Stack spacing={0.5} sx={{ mt: 0.75 }}>
              <Typography variant="body2"><strong>Regimen:</strong> {displayClinicalValue(regimen.dose_amount)} {displayClinicalValue(regimen.dose_unit)} · {displayClinicalValue(regimen.route)} · {displayClinicalValue(regimen.frequency_text || regimen.interval_hours)} · {displayClinicalValue(regimen.duration_days)} days</Typography>
              <Typography variant="body2"><strong>Instructions:</strong> {displayClinicalValue(regimen.patient_instructions)}</Typography>
              <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                <Chip size="small" label={`Allergies: ${regimen.allergies_reviewed === true ? 'reviewed' : 'not confirmed'}`} color={regimen.allergies_reviewed === true ? 'success' : 'warning'} />
                <Chip size="small" label={`Interactions: ${regimen.interactions_reviewed === true ? 'reviewed' : 'not confirmed'}`} color={regimen.interactions_reviewed === true ? 'success' : 'warning'} />
              </Stack>
            </Stack>
          )}
          {kind === 'investigation' && (
            <Stack spacing={0.5} sx={{ mt: 0.75 }}>
              <Typography variant="body2"><strong>Reason:</strong> {displayClinicalValue(item?.reason)}</Typography>
              <Typography variant="body2"><strong>Timing/urgency:</strong> {displayClinicalValue(item?.timing)} · {displayClinicalValue(item?.urgency)}</Typography>
              <Typography variant="body2"><strong>Instructions:</strong> {displayClinicalValue(item?.instructions)}</Typography>
              <Typography variant="body2"><strong>Result review:</strong> {item?.result_review?.medical_interpretation_required === true ? 'Assigned clinician interpretation required' : 'Server did not mark interpretation requirement'}</Typography>
            </Stack>
          )}
          {kind === 'referral' && <Typography variant="body2" sx={{ mt: 0.75 }}>{displayClinicalValue(item)}</Typography>}
        </CardContent>
      </Card>
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
  ].filter((value, index, values) => values.findIndex((candidate) => displayClinicalValue(candidate) === displayClinicalValue(value)) === index);
  const currentCare = proposal?.current_care || {};
  const differential = asClinicalList(proposal?.exception_packet?.ranked_differential || documentation.sections?.assessment?.ranked_differential || documentation.edit_contract?.differential);
  const confidence = proposal?.exception_packet?.confidence_band || documentation.sections?.assessment?.confidence;
  const workingImpression = proposal?.exception_packet?.working_impression || documentation.sections?.assessment?.primary_impression;
  const prescriptions = asClinicalList(documentation.prescriptions);
  const investigations = asClinicalList(documentation.investigations);
  const referrals = asClinicalList(documentation.other_actions?.referral);
  const authorityActionKey = typeof authorityAction === 'string'
    ? authorityAction
    : authorityAction?.key || authorityAction?.action_key || authorityAction?.action || 'open_existing_claim_and_decision';
  const claimEndpoint = proposal?.clinician_work?.claim_endpoint || authorityAction?.claim_endpoint;
  const decisionEndpoint = proposal?.authority_checkpoint?.decision_endpoint || authorityAction?.decision_endpoint;
  const decisionAuthorityReady = authorityActionAvailable && Boolean(proposalId && proposalHash);

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1240, mx: 'auto', width: '100%' }}>
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
      {risk.highRisk && <Alert severity="warning" icon={<WarningIcon />} sx={{ mb: 2 }}><strong>Server safety priority: {formatDoctorLabel(risk.priority)}.</strong> Resolve the must-not-miss and evidence callouts before choosing the appropriate clinician decision.</Alert>}
      {risk.mustNotMiss.length > 0 && <Alert severity="warning" sx={{ mb: 2 }}><strong>Must-not-miss returned by server:</strong> {risk.mustNotMiss.map((item) => displayClinicalValue(item)).join(' · ')}</Alert>}
      {(risk.missingEvidence.length > 0 || risk.missingSections.length > 0) && <Alert severity="warning" sx={{ mb: 2 }}><strong>Missing evidence or sections:</strong> {[...risk.missingEvidence, ...risk.missingSections].map((item) => displayClinicalValue(item)).join(' · ')}</Alert>}

      <Grid container spacing={2}>
        <Grid item xs={12} md={8}>
          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} gutterBottom>Clinical authority</Typography>
              <Alert severity="info" icon={<LockIcon />} sx={{ mb: 2 }}>Every claim and decision below uses the existing server clinical authority routes. Commercial attributes are intentionally absent from this doctor view.</Alert>
              <Stack spacing={1}>
                <Typography variant="body2"><strong>Proposal:</strong> {proposalId || 'Not linked by server'}</Typography>
                <Typography variant="body2"><strong>Authority action:</strong> {formatDoctorLabel(authorityActionKey)}</Typography>
                <Typography variant="body2"><strong>Claim route:</strong> {claimEndpoint || 'Not supplied by server'}</Typography>
                <Typography variant="body2"><strong>Decision route:</strong> {decisionEndpoint || 'Not supplied by server'}</Typography>
                <Typography variant="body2"><strong>Clinical authority:</strong> {order.clinical_authority || 'Server-controlled clinician claim and decision route'}</Typography>
              </Stack>
              {!authorityActionAvailable && <Alert severity="info" sx={{ mt: 2 }}>The server has not issued the open_existing_claim_and_decision action for this order; claim and approval remain unavailable.</Alert>}
              {claimAvailable && <Button variant="contained" startIcon={busyAction === 'claim' ? <CircularProgress size={16} color="inherit" /> : <LockIcon />} onClick={handleClaim} disabled={Boolean(busyAction)} sx={{ mt: 2 }}>Claim proposal via server</Button>}
              {proposal?.review_claim?.claimed_by_current_doctor && <Chip icon={<VerifiedIcon />} label="Claim confirmed for this doctor" color="success" sx={{ mt: 2 }} />}
            </CardContent>
          </Card>

          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} gutterBottom>Review session and exact hashes</Typography>
              <Grid container spacing={1.5}>
                <Grid item xs={12} sm={6}><Typography variant="body2"><strong>Review started:</strong> {formatDoctorDateTime(reviewStartedAt)}</Typography></Grid>
                <Grid item xs={12} sm={6}><Typography variant="body2"><strong>Server active session:</strong> {formatDoctorDateTime(proposal?.clinician_work?.started_at)}</Typography></Grid>
                <Grid item xs={12}><Typography variant="body2" sx={{ wordBreak: 'break-all' }}><strong>Proposal hash:</strong> {proposalHash || 'Not supplied by server'}</Typography></Grid>
                <Grid item xs={12}><Typography variant="body2" sx={{ wordBreak: 'break-all' }}><strong>AI draft hash:</strong> {draftHash || 'Not supplied by server'}</Typography></Grid>
              </Grid>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>Approval binds to the exact server proposal and AI draft. A 409 response requires a fresh read and a new clinician review.</Typography>
            </CardContent>
          </Card>

          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 1 }}>
              <Typography variant="h6" fontWeight={800}>Doctor-ready structured note</Typography>
              {documentation.editor_capabilities?.can_edit && editDocument && <Button variant={editMode ? 'contained' : 'outlined'} startIcon={<EditNoteIcon />} onClick={() => setEditMode((current) => !current)} disabled={Boolean(busyAction)}>{editMode ? 'Finish field review' : 'Edit draft fields'}</Button>}
            </Box>
            <Alert severity="info" sx={{ mb: 1.5 }}>Structured SOAP, actions, source provenance, and safety details below are rendered from the server projection. The original AI payload is never the primary editing surface.</Alert>
            {documentation.state === 'unavailable' && <Alert severity="warning" sx={{ mb: 1.5 }}>This proposal is not a hash-covered documentation.v2 packet. Approval is fail-closed; request information or escalate through the server instead.</Alert>}
            {['subjective', 'objective', 'assessment', 'plan'].map((key) => renderSection(key, formatClinicalFieldLabel(key)))}
            {editMode && editDiff.length > 0 && <Card variant="outlined" sx={{ mb: 1.5, borderColor: 'warning.main' }}><CardContent><Typography variant="subtitle1" fontWeight={800}>Unsent changes ({editDiff.length})</Typography><Typography variant="caption" color="text.secondary">Only these field paths will be sent if you choose Edit and approve. The server remains authoritative.</Typography><Stack spacing={0.5} sx={{ mt: 1 }}>{editDiff.map((diff) => <Typography variant="body2" key={`${diff.path}-${diff.change}`}>{diff.change}: {diff.path}</Typography>)}</Stack></CardContent></Card>}
            {editMode && editDiff.length === 0 && <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>No local field changes yet.</Typography>}
          </Box>

          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} gutterBottom>Medication, investigation and referral details</Typography>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mt: 1 }}>Current medicines and adherence</Typography>
              {currentCare.medicines?.length ? renderServerValue(currentCare.medicines, 'current-medicines') : <Typography variant="body2" color="text.secondary">Not supplied by server</Typography>}
              <Typography variant="body2" sx={{ mt: 0.75 }}><strong>Adherence:</strong> {displayClinicalValue(currentCare.adherence)}</Typography>
              <Typography variant="body2" sx={{ mt: 0.75 }}><strong>Allergies:</strong> {displayClinicalValue(documentation.sections?.subjective?.allergies || documentation.edit_contract?.subjective?.allergies)}</Typography>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mt: 2 }}>Prescriptions</Typography>
              {prescriptions.length ? prescriptions.map((item, index) => renderAction(item, index, 'medication')) : <Typography variant="body2" color="text.secondary">No prescription action returned by server.</Typography>}
              <Typography variant="subtitle2" fontWeight={700} sx={{ mt: 2 }}>Investigations and tests</Typography>
              {investigations.length ? investigations.map((item, index) => renderAction(item, index, 'investigation')) : <Typography variant="body2" color="text.secondary">No investigation action returned by server.</Typography>}
              <Typography variant="subtitle2" fontWeight={700} sx={{ mt: 2 }}>Referrals and fulfilment</Typography>
              {referrals.length ? referrals.map((item, index) => renderAction(item, index, 'referral')) : <Typography variant="body2" color="text.secondary">No referral action returned by server.</Typography>}
              <Typography variant="subtitle2" fontWeight={700} sx={{ mt: 2 }}>Safety net and next review</Typography>
              {renderServerValue(documentation.edit_contract?.safety_net || documentation.sections?.plan?.safety_net, 'safety-net')}
              {renderServerValue(documentation.edit_contract?.next_review || proposal?.execution_state?.next_checkpoint, 'next-review')}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} gutterBottom>Server decision actions</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>Only actions in the server-issued allowed action list are enabled. Approval never bypasses clinician authority.</Typography>
              <FormControl fullWidth size="small" sx={{ mb: 1.5 }}><InputLabel id="decision-category-label">Decision category</InputLabel><Select labelId="decision-category-label" label="Decision category" value={decisionCategory} onChange={(event) => setDecisionCategory(event.target.value)} disabled={Boolean(busyAction)}>{categoryOptions.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}</Select></FormControl>
              {attestationRequirements.map((requirement) => <FormControlLabel key={requirement.key} control={<Checkbox checked={Boolean(attestations[requirement.key])} onChange={(event) => setAttestations((current) => ({ ...current, [requirement.key]: event.target.checked }))} disabled={Boolean(busyAction)} />} label={<Typography variant="body2">{requirement.label}</Typography>} sx={{ alignItems: 'flex-start', mb: 0.5 }} />)}
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>Both attestations are required only for approve-as-written and edit-and-approve. They are sent to the backend as clinical_attestations.</Typography>
              <Stack spacing={1}>
                {['approve_as_written', 'edit_and_approve', 'request_more_information', 'convert_to_live_encounter', 'escalate', 'reject'].map((action) => {
                  const approvalAction = ['approve_as_written', 'edit_and_approve'].includes(action);
                  const editNeedsMode = action === 'edit_and_approve' && !editMode;
                  return <Button key={action} variant={action === 'approve_as_written' ? 'contained' : 'outlined'} color={action === 'escalate' || action === 'reject' ? 'warning' : 'primary'} startIcon={busyAction === action ? <CircularProgress size={16} color="inherit" /> : action === 'escalate' ? <WarningIcon /> : <CheckCircleIcon />} onClick={() => handleDecision(action)} disabled={Boolean(busyAction) || !decisionAuthorityReady || !allowedActions.includes(action) || (approvalAction && !allAttestationsComplete) || editNeedsMode} sx={{ justifyContent: 'flex-start' }}>{formatDoctorLabel(action)}{allowedActions.includes(action) ? '' : ' (not issued)'}</Button>;
                })}
              </Stack>
              {!allAttestationsComplete && <Typography variant="caption" color="warning.main" display="block" sx={{ mt: 1 }}>Complete both attestations to enable either approval action.</Typography>}
              {allowedActions.includes('edit_and_approve') && !editMode && <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>Choose Edit draft fields first to unlock focused editing and visible diffs.</Typography>}
              {allowedActions.includes('request_more_information') && <TextField label="Question to send" value={question} onChange={(event) => setQuestion(event.target.value)} fullWidth multiline minRows={2} sx={{ mt: 2 }} disabled={Boolean(busyAction)} helperText="Required for a request-more-information decision." />}
              <TextField label="Decision reason" value={decisionReason} onChange={(event) => setDecisionReason(event.target.value)} fullWidth multiline minRows={2} sx={{ mt: 1.5 }} disabled={Boolean(busyAction)} helperText="Required for reject or escalate; optional for other decisions." />
            </CardContent>
          </Card>

          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} gutterBottom>Evidence and verification</Typography>
              {evidenceRows.length ? evidenceRows.map((item, index) => <Box key={`evidence-${index}`} sx={{ mb: 1.25 }}><Typography variant="body2" fontWeight={700}>{displayClinicalValue(item?.label || item?.evidence_type || item)}</Typography>{item?.value !== undefined && <Typography variant="body2">{displayClinicalValue(item.value)}</Typography>}<Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}><Chip size="small" label={verificationLabel(item)} color={item?.verified === true ? 'success' : 'warning'} /><Chip size="small" label={`Source: ${sourceLabel(item)}`} variant="outlined" /><Chip size="small" label={`Channel: ${captureLabel(item)}`} variant="outlined" /></Stack>{item?.provenance?.limitation && <Typography variant="caption" color="warning.main" display="block" sx={{ mt: 0.5 }}>Limitation: {item.provenance.limitation}</Typography>}</Box>) : <Typography variant="body2" color="text.secondary">No source evidence returned.</Typography>}
              <Divider sx={{ my: 1.5 }} />
              <Typography variant="subtitle2" fontWeight={700}>Remote-exam and source limits</Typography>
              <Chip size="small" label="Remote-exam/source limits: server-provided" variant="outlined" sx={{ mt: 0.5, mb: 0.5 }} />
              <Typography variant="body2" sx={{ mt: 0.5 }}>{displayClinicalValue(documentation.sections?.objective?.remote_assessment_limitations || documentation.sections?.objective?.examination_summary)}</Typography>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mt: 2 }}>Differential and confidence</Typography>
              <Typography variant="body2" sx={{ mt: 0.5 }}><strong>Working impression:</strong> {displayClinicalValue(workingImpression)}</Typography>
              <Typography variant="body2" sx={{ mt: 0.5 }}><strong>Confidence:</strong> {displayClinicalValue(confidence)}</Typography>
              {differential.length ? <Typography variant="body2" sx={{ mt: 0.5 }}><strong>Ranked differential:</strong> {differential.map((item) => displayClinicalValue(item)).join(' · ')}</Typography> : <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>No ranked differential returned by server.</Typography>}
              <Typography variant="subtitle2" fontWeight={700} sx={{ mt: 2 }}>Missing information</Typography>
              {missingInformation.length ? missingInformation.map((item, index) => <Typography variant="body2" key={`missing-${index}`} sx={{ mt: 0.75 }}>{displayClinicalValue(item)}</Typography>) : <Typography variant="body2" color="text.secondary">No missing information returned.</Typography>}
            </CardContent>
          </Card>

          {liveService && <Card variant="outlined" sx={{ mb: 2 }}><CardContent><Typography variant="h6" fontWeight={700} gutterBottom>Server schedule and join</Typography><Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>A modality alone does not create an appointment. Schedule and join availability are read from server actions.</Typography>{scheduleActionAvailable ? <Stack spacing={1.5}><TextField label="Appointment start" type="datetime-local" value={startTime} onChange={(event) => setStartTime(event.target.value)} InputLabelProps={{ shrink: true }} disabled={Boolean(busyAction)} fullWidth /><Button variant="outlined" startIcon={busyAction === 'schedule' ? <CircularProgress size={16} /> : <ScheduleIcon />} onClick={handleSchedule} disabled={Boolean(busyAction)}>Schedule through server</Button></Stack> : <Alert severity="info" sx={{ mb: 1.5 }}>The server has not issued a schedule action for this order.</Alert>}<Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 1.5 }}><Button variant="outlined" startIcon={busyAction === 'join' ? <CircularProgress size={16} /> : <CallIcon />} onClick={handleCheckJoin} disabled={Boolean(busyAction)}>Check server join</Button>{joinProjection?.available && <Button variant="contained" startIcon={<CallIcon />} onClick={handleOpenCallStack} disabled={Boolean(busyAction)}>Open existing call stack</Button>}</Stack>{joinProjection && <Typography variant="caption" display="block" sx={{ mt: 1 }}>Join state: {joinProjection.available ? 'available from server' : joinProjection.reason || 'not available'}</Typography>}<Divider sx={{ my: 2 }} /><TextField label="Attendance evidence for server completion" value={attendanceEvidence} onChange={(event) => setAttendanceEvidence(event.target.value)} fullWidth multiline minRows={2} disabled={Boolean(busyAction)} helperText="Required before the doctor can post call completion." /><Button variant="outlined" color="success" startIcon={busyAction === 'complete_call' ? <CircularProgress size={16} /> : <SendIcon />} onClick={handleCompleteCall} disabled={Boolean(busyAction) || !completeActionAvailable} sx={{ mt: 1.5 }}>Post server call completion</Button></CardContent></Card>}

          <Card variant="outlined"><CardContent><Typography variant="subtitle2" fontWeight={700}>Next clinical checkpoint</Typography><Typography variant="body2" sx={{ mt: 0.75 }}>{displayClinicalValue(proposal?.execution_state?.next_checkpoint || order.next_action)}</Typography><Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>Due: {formatDoctorDateTime(proposal?.execution_state?.due_at || order.due_at)}</Typography></CardContent></Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DoctorClinicalServiceDetail;
