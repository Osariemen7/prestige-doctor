import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
  Container,
  Divider,
  TextField,
  Grid,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  IconButton,
  Rating,
  MenuItem,
  Stack,
  Autocomplete
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  Call as CallIcon,
  CheckCircle as CheckCircleIcon,
  Edit as EditIcon,
  HelpOutline as HelpOutlineIcon,
  Add as AddIcon,
  Mic as MicIcon,
  Warning as WarningIcon,
  Autorenew as AutorenewIcon,
  ContentCopy as ContentCopyIcon,
  CloudUpload as CloudUploadIcon,
  SmartToy as SmartToyIcon,
  Delete as DeleteIcon,
  Schedule as ScheduleIcon,
  PhotoCamera as PhotoCameraIcon,
  VideoCall as VideoCallIcon,
  PlaylistAddCheck as ActionsIcon
} from '@mui/icons-material';
import { getAccessToken } from '../api';
import { useTheme, useMediaQuery } from '@mui/material';
import CreateEncounterModal from './CreateEncounterModal';
import RecordingModal from './RecordingModal';
import AiConsultationChat from './AiConsultationChat';
import BookAppointmentModal from './BookAppointmentModal';
import LiveCopilotDashboard from './LiveCopilotDashboard';
import AiTriageApprovalCockpit from './AiTriageApprovalCockpit';
import DoctorWorkflowAuditTrail from './DoctorWorkflowAuditTrail';
import PatientFollowThroughPanel from './PatientFollowThroughPanel';
import { useProcessingStatus } from '../contexts/ProcessingStatusContext';
import { getExistingNote, collectReviewTranscripts } from '../utils/reviewUtils';
import {
  buildMoreInfoQuestions,
  getCaregiverContext,
  getAiGovernanceSignals,
  getDoctorApprovalReadiness,
  filterEvidenceForSoapField,
  getEvidenceConfidenceLabel,
  getEvidenceEntries,
  getGeneratedNote,
  getPatientStory,
  getReviewOrigin,
  getRiskFlags,
  getSourceLabel,
  getUrgencyConfig,
  isAiTriageReview,
  summarizeEvidenceSources,
} from '../utils/aiReviewWorkflow';
import {
  requestPatientInformation,
  submitDoctorDecision,
} from '../services/doctorWorkflowApi';
import {
  approveAllCopilotDraftActions,
  buildCopilotDraftSyncPayload,
  getPendingCopilotDraftActions,
  isCopilotActionDoctorApproved,
  isCopilotDraftPendingApproval,
} from '../utils/liveCopilotWorkflow';

const convertToInternationalFormat = (phoneNumber) => {
  if (!phoneNumber || typeof phoneNumber !== 'string') {
    return phoneNumber;
  }

  const trimmed = phoneNumber.trim();

  // If already in international format (+234...), return as is
  if (trimmed.startsWith('+')) {
    return trimmed;
  }

  // Convert Nigerian national format (080..., 081..., 090..., 070..., etc.) to international format
  const nigerianRegex = /^0([789]\d{9})$/;
  const match = trimmed.match(nigerianRegex);

  if (match) {
    return `+234${match[1]}`;
  }

  // Return original if no conversion needed
  return trimmed;
};

const formatDisplayLabel = (value) => {
  if (!value) return 'Unknown';
  return String(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const clinicalScoreFields = [
  { key: 'safety_score', label: 'Safety' },
  { key: 'diagnostic_quality_score', label: 'Diagnosis' },
  { key: 'management_quality_score', label: 'Plan' },
  { key: 'patient_communication_score', label: 'Communication' },
  { key: 'local_feasibility_score', label: 'Feasibility' },
];

const clinicalCorrectionSeverityOptions = [
  { value: '', label: 'Not set' },
  { value: 'none', label: 'None' },
  { value: 'minor', label: 'Minor' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'major', label: 'Major' },
  { value: 'critical', label: 'Critical' },
];

const clinicalCorrectionCategories = [
  { value: 'diagnosis_correction', label: 'Diagnosis' },
  { value: 'missed_red_flag', label: 'Red flag' },
  { value: 'unsafe_management', label: 'Safety' },
  { value: 'medication_or_prescription', label: 'Medication' },
  { value: 'investigation_or_referral', label: 'Tests/referral' },
  { value: 'follow_up_or_safety_net', label: 'Follow-up' },
  { value: 'local_feasibility', label: 'Feasibility' },
  { value: 'patient_communication', label: 'Communication' },
  { value: 'documentation_quality', label: 'Documentation' },
  { value: 'prognosis_correction', label: 'Prognosis' },
];

const emptyClinicalFeedback = {
  accepted_ai_diagnosis: '',
  accepted_ai_plan: '',
  correction_categories: [],
  correction_severity: '',
  safety_score: null,
  diagnostic_quality_score: null,
  management_quality_score: null,
  patient_communication_score: null,
  local_feasibility_score: null,
  edit_reason: '',
};

const outcomeBooleanOptions = [
  { value: '', label: 'Not sure' },
  { value: 'true', label: 'Yes' },
  { value: 'false', label: 'No' },
];

const outcomeActionOptions = [
  { value: 'reviewed', label: 'Reviewed' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'revised', label: 'Revised' },
  { value: 'escalated', label: 'Escalated' },
];

const soapQuickTemplates = {
  subjective: [
    {
      label: 'Focused HPI',
      value: 'Chief concern:\nOnset:\nDuration:\nCharacter:\nAssociated symptoms:\nRed flags endorsed/denied:\nPatient goal:',
    },
    {
      label: 'Medication and allergy history',
      value: 'Current medications:\nRecent changes:\nAdherence:\nAllergies/adverse reactions:',
    },
    {
      label: 'Follow-up update',
      value: 'Since last review:\nSymptoms now:\nCompleted patient tasks:\nBarriers:\nSafety-net symptoms:',
    },
  ],
  objective: [
    {
      label: 'Vitals and general exam',
      value: 'Vitals:\nGeneral appearance:\nHydration:\nRespiratory effort:\nPain score:',
    },
    {
      label: 'Remote objective review',
      value: 'Observed over video/audio:\nPatient-reported measurements:\nUploaded media reviewed:\nLimitations:',
    },
    {
      label: 'AI triage evidence check',
      value: 'AI-suggested objective findings reviewed:\nSource-labeled evidence verified:\nFindings needing confirmation:',
    },
  ],
  assessment: [
    {
      label: 'Problem list',
      value: '1.\nMost likely diagnosis:\nDifferentials:\nClinical uncertainty:\nRisk level:',
    },
    {
      label: 'AI triage review',
      value: 'AI triage reviewed.\nUseful evidence:\nCorrections made:\nUnresolved risks:\nDoctor assessment:',
    },
    {
      label: 'Red flag screen',
      value: 'Red flags present:\nRed flags absent:\nEscalation threshold:\nReasoning:',
    },
  ],
  plan: [
    {
      label: 'Treatment plan',
      value: 'Medications:\nInvestigations:\nPatient education:\nSafety-net advice:\nFollow-up:',
    },
    {
      label: 'WhatsApp follow-through',
      value: 'Patient task:\nWhatsApp completion phrase:\nBarrier plan:\nEscalation triggers:\nReview date:',
    },
    {
      label: 'Referral or escalation',
      value: 'Referral destination:\nReason:\nUrgency:\nInformation sent:\nPatient instructions:',
    },
  ],
};

const prescriptionQuickOptions = [
  {
    label: 'Paracetamol / Acetaminophen',
    medication_name: 'Paracetamol',
    route: 'oral',
    interval: 6,
    instructions: 'Confirm age/weight-appropriate dose, liver disease risk, alcohol use, and total daily acetaminophen exposure.',
    is_otc: true,
  },
  {
    label: 'Ibuprofen',
    medication_name: 'Ibuprofen',
    route: 'oral',
    interval: 8,
    instructions: 'Confirm no NSAID allergy, pregnancy risk, kidney disease, peptic ulcer disease, anticoagulant use, or uncontrolled hypertension.',
    is_otc: true,
  },
  {
    label: 'Amoxicillin',
    medication_name: 'Amoxicillin',
    route: 'oral',
    interval: 8,
    instructions: 'Verify indication, allergy history, local antimicrobial guidance, renal function, and planned duration before signing.',
  },
  {
    label: 'Cetirizine',
    medication_name: 'Cetirizine',
    route: 'oral',
    interval: 24,
    instructions: 'Confirm sedation risk, renal considerations, and patient counselling for drowsiness where relevant.',
    is_otc: true,
  },
  {
    label: 'ORS',
    medication_name: 'Oral rehydration solution',
    route: 'oral',
    interval: 0,
    instructions: 'Counsel on frequent small sips, dehydration warning signs, and when to seek urgent care.',
    is_otc: true,
  },
  {
    label: 'Amlodipine',
    medication_name: 'Amlodipine',
    route: 'oral',
    interval: 24,
    instructions: 'Confirm BP readings, edema history, pregnancy considerations, interactions, and follow-up BP monitoring plan.',
  },
  {
    label: 'Metformin',
    medication_name: 'Metformin',
    route: 'oral',
    interval: 12,
    instructions: 'Confirm renal function, GI tolerance, acute illness status, and diabetes follow-up plan.',
  },
];

const dosageQuickOptions = [
  'Per age/weight protocol',
  'Per renal-adjusted protocol',
  'Per hospital guideline',
  'As directed',
  'Start low and titrate per response',
];

const routeQuickOptions = [
  'oral',
  'intravenous',
  'intramuscular',
  'subcutaneous',
  'topical',
  'inhalation',
  'sublingual',
  'rectal',
  'vaginal',
  'ophthalmic',
  'otic',
];

const prescriptionIntervalQuickOptions = [
  { label: 'As needed / PRN', value: 0 },
  { label: 'Every 4 hours', value: 4 },
  { label: 'Every 6 hours', value: 6 },
  { label: 'Every 8 hours', value: 8 },
  { label: 'Every 12 hours', value: 12 },
  { label: 'Once daily', value: 24 },
];

const investigationQuickOptions = [
  {
    label: 'Full blood count / CBC',
    test_type: 'Full blood count',
    reason: 'Assess infection, anemia, platelet count, or inflammatory pattern.',
    instructions: 'Review alongside symptoms, vitals, and clinical context.',
  },
  {
    label: 'Urea, electrolytes, creatinine',
    test_type: 'Urea, electrolytes, creatinine',
    reason: 'Assess hydration status, renal function, and electrolyte disturbance.',
    instructions: 'Use for medication safety checks where renal dosing may matter.',
  },
  {
    label: 'Liver function tests',
    test_type: 'Liver function tests',
    reason: 'Assess hepatobiliary disease or medication safety concerns.',
    instructions: 'Interpret with alcohol use, hepatitis risk, pregnancy status, and medication history.',
  },
  {
    label: 'Urinalysis',
    test_type: 'Urinalysis',
    reason: 'Screen for UTI, protein, glucose, ketones, blood, or hydration clues.',
    instructions: 'Use clean-catch sample where possible and correlate with symptoms.',
  },
  {
    label: 'Malaria test',
    test_type: 'Malaria rapid test or microscopy',
    reason: 'Evaluate fever or malaria-compatible symptoms in an endemic context.',
    instructions: 'Escalate if danger signs, severe anemia, altered mental status, or persistent vomiting.',
  },
  {
    label: 'Pregnancy test',
    test_type: 'Pregnancy test',
    reason: 'Clarify pregnancy status before medication, imaging, or abdominal/pelvic assessment.',
    instructions: 'Confirm consent and privacy-sensitive handling.',
  },
  {
    label: 'ECG',
    test_type: 'ECG',
    reason: 'Assess chest pain, palpitations, syncope, dyspnea, electrolyte risk, or medication effect.',
    instructions: 'Escalate urgently if ischemic symptoms, unstable vitals, or concerning tracing.',
  },
  {
    label: 'Chest X-ray',
    test_type: 'Chest X-ray',
    reason: 'Evaluate respiratory symptoms, chest pain, suspected pneumonia, heart failure, or TB concern.',
    instructions: 'Confirm pregnancy status where relevant and correlate with oxygen saturation and exam.',
  },
  {
    label: 'HbA1c / fasting glucose',
    test_type: 'HbA1c / fasting glucose',
    reason: 'Assess glycemic control or screen for diabetes risk.',
    instructions: 'Plan follow-up for abnormal values and medication review.',
  },
];

const investigationIntervalQuickOptions = [
  { label: 'One time', value: 0 },
  { label: 'Repeat tomorrow', value: 1 },
  { label: 'Repeat in 3 days', value: 3 },
  { label: 'Repeat in 1 week', value: 7 },
  { label: 'Repeat in 2 weeks', value: 14 },
  { label: 'Repeat in 1 month', value: 30 },
];

const otherActionQuickOptions = [
  {
    label: 'Safety-net counselling',
    action_type: 'counselling',
    name: 'Safety-net counselling',
    notes: 'Explain warning signs, what to do if symptoms worsen, and when to seek urgent care.',
  },
  {
    label: 'Medication adherence check',
    action_type: 'counselling',
    name: 'Medication adherence check',
    notes: 'Confirm understanding, dosing schedule, side effects, affordability, and barriers.',
  },
  {
    label: 'WhatsApp symptom diary',
    action_type: 'counselling',
    name: 'WhatsApp symptom diary',
    notes: 'Ask patient to report symptom trend and completion status through the AI WhatsApp agent.',
  },
  {
    label: 'BP log review',
    action_type: 'counselling',
    name: 'BP log review',
    notes: 'Patient to send home BP readings with date, time, and symptoms.',
  },
  {
    label: 'Wound/photo review',
    action_type: 'procedure',
    name: 'Wound/photo review',
    notes: 'Review uploaded photo, compare with prior image, and document signs of infection or healing.',
  },
  {
    label: 'Specialist referral',
    action_type: 'referral',
    name: 'Specialist referral',
    notes: 'State destination, urgency, reason for referral, and information sent with the patient.',
  },
  {
    label: 'Emergency escalation',
    action_type: 'referral',
    name: 'Emergency escalation',
    notes: 'Document red flag, destination, transport advice, and who was informed.',
  },
];

const getQuickOptionLabel = (option) => {
  if (!option) return '';
  if (typeof option === 'string') return option;
  return option.label || option.name || option.medication_name || option.test_type || String(option.value ?? '');
};

const parseQuickNumber = (value) => {
  if (typeof value === 'number') return value;
  const textValue = String(value || '').toLowerCase();
  if (textValue.includes('prn') || textValue.includes('as needed') || textValue.includes('one time')) return 0;
  const match = textValue.match(/\d+/);
  return match ? parseInt(match[0], 10) : null;
};

const getQuickNumberValue = (value, options, unitLabel) => {
  const numericValue = parseQuickNumber(value);
  if (numericValue === null) return '';
  const matchedOption = options.find((option) => option.value === numericValue);
  if (matchedOption) return matchedOption;
  return numericValue > 0 ? `${numericValue} ${unitLabel}` : '';
};

const getSoapSectionObject = (sectionValue, fallbackKey = 'summary') => {
  if (sectionValue && typeof sectionValue === 'object' && !Array.isArray(sectionValue)) {
    return sectionValue;
  }
  if (sectionValue) {
    return { [fallbackKey]: sectionValue };
  }
  return {};
};

const toBooleanOrNull = (value) => {
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  return null;
};

const toSelectBooleanValue = (value) => {
  if (value === true) return 'true';
  if (value === false) return 'false';
  return '';
};

const getEntryTimestampValue = (entry) => {
  const rawValue = entry?.time || entry?.at;
  const parsedValue = rawValue ? Date.parse(rawValue) : NaN;
  return Number.isNaN(parsedValue) ? 0 : parsedValue;
};

const formatEntryTimestamp = (value) => {
  if (!value) {
    return 'Time unavailable';
  }

  const parsedValue = new Date(value);
  if (Number.isNaN(parsedValue.getTime())) {
    return String(value);
  }

  return parsedValue.toLocaleString();
};

const formatScheduledMoment = (value) => {
  if (!value) {
    return 'Not scheduled';
  }

  const parsedValue = new Date(value);
  if (Number.isNaN(parsedValue.getTime())) {
    return String(value);
  }

  return parsedValue.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

const getCallbackStatusConfig = (status) => {
  switch (status) {
    case 'booking_requested':
      return { label: 'Awaiting Patient Booking', severity: 'info', chipColor: 'info' };
    case 'payment_pending':
      return { label: 'Callback Awaiting Payment', severity: 'warning', chipColor: 'warning' };
    case 'scheduled':
      return { label: 'Callback Scheduled', severity: 'success', chipColor: 'success' };
    case 'completed':
      return { label: 'Callback Completed', severity: 'success', chipColor: 'success' };
    case 'cancelled':
      return { label: 'Callback Cancelled', severity: 'error', chipColor: 'error' };
    case 'missed':
      return { label: 'Callback Missed', severity: 'error', chipColor: 'error' };
    case 'planned':
      return { label: 'Follow-up Planned', severity: 'info', chipColor: 'info' };
    case 'ai_follow_up':
      return { label: 'AI Follow-up Planned', severity: 'info', chipColor: 'info' };
    default:
      return { label: null, severity: 'info', chipColor: 'default' };
  }
};

const getLiveVisitReadinessConfig = (readiness, callbackStatus) => {
  switch (readiness) {
    case 'awaiting_patient_booking':
      return { label: 'Awaiting Patient Booking', severity: 'info', chipColor: 'info' };
    case 'callback_scheduled':
      return callbackStatus === 'payment_pending'
        ? { label: 'Callback Awaiting Payment', severity: 'warning', chipColor: 'warning' }
        : { label: 'Callback Scheduled', severity: 'success', chipColor: 'success' };
    case 'follow_up_planned':
      return { label: 'Follow-up Planned', severity: 'info', chipColor: 'info' };
    case 'review_completed':
      return { label: 'Review Completed', severity: 'success', chipColor: 'success' };
    case 'closed':
      return { label: 'Closed', severity: 'info', chipColor: 'default' };
    case 'ready_for_review':
      return { label: 'Ready for Review', severity: 'warning', chipColor: 'warning' };
    default:
      return { label: null, severity: 'info', chipColor: 'default' };
  }
};

const getEvidenceExcerpt = (entry, maxLength = 180) => {
  const raw = entry?.quote || entry?.text || entry?.value || entry?.description || entry?.finding || entry?.claim || '';
  if (!raw) return '';
  const text = typeof raw === 'object' ? JSON.stringify(raw) : String(raw);
  return text.length > maxLength ? `${text.slice(0, maxLength).trim()}...` : text;
};

const buildMockLiveVisitEntries = () => {
  const now = Date.now();

  return [
    {
      id: 'mock-transcript-1',
      source: 'live_visit',
      kind: 'transcript',
      time: new Date(now - 1000 * 60 * 12).toISOString(),
      content: 'Patient describes intermittent abdominal pain that worsens after meals and shared prior imaging during the live session.',
    },
    {
      id: 'mock-tool-1',
      source: 'live_visit',
      kind: 'tool_activity',
      time: new Date(now - 1000 * 60 * 8).toISOString(),
      title: 'Clinical summary refreshed',
      stage: 'completed',
      message: 'AI updated the rolling summary after reviewing symptom timeline and medication history.',
    },
    {
      id: 'mock-capture-1',
      source: 'live_visit',
      kind: 'visual_capture',
      time: new Date(now - 1000 * 60 * 6).toISOString(),
      asset_url: '/images/doctor-ai-platform.png',
      label: 'Abdominal scan snapshot',
      purpose: 'supporting_document',
      note: 'Mock preview artifact for localhost verification of the live visual capture gallery.',
      upload_status: 'shared',
      sent_to_model: true,
      mime_type: 'image/png',
    },
    {
      id: 'mock-tool-2',
      source: 'live_visit',
      kind: 'tool_activity',
      time: new Date(now - 1000 * 60 * 4).toISOString(),
      title: 'Urgency review',
      stage: 'pending',
      message: 'Clinician review still required before finalizing the recommendation.',
    },
  ];
};

const ReviewDetail = ({ embedded = false, onUpdate = null }) => {
  const { publicId: urlPublicId } = useParams();
  const publicId = urlPublicId;
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { getStatus, processingStatuses, startEncounterPolling } = useProcessingStatus();
  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showFinalizeDialog, setShowFinalizeDialog] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRecordingModal, setShowRecordingModal] = useState(false);
  const [showCopilotDashboard, setShowCopilotDashboard] = useState(false);
  const [showLegacyFallback, setShowLegacyFallback] = useState(false);
  const [currentEncounter, setCurrentEncounter] = useState(null);
  const [creatingEncounter, setCreatingEncounter] = useState(false);
  const [patientData, setPatientData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: ''
  });
  const [editingNote, setEditingNote] = useState(false);
  const [editedNote, setEditedNote] = useState(null);
  const [clinicalFeedback, setClinicalFeedback] = useState(emptyClinicalFeedback);
  const [outcomeFeedback, setOutcomeFeedback] = useState({});
  const [savingOutcomeId, setSavingOutcomeId] = useState(null);
  const [decisionBusyAction, setDecisionBusyAction] = useState(null);
  const [decisionError, setDecisionError] = useState('');
  const [showMoreInfoDialog, setShowMoreInfoDialog] = useState(false);
  const [moreInfoQuestions, setMoreInfoQuestions] = useState([]);
  const [liveCopilotMode, setLiveCopilotMode] = useState('live_encounter');
  const [chatRefreshTrigger, setChatRefreshTrigger] = useState(0);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [bookingPreset, setBookingPreset] = useState({
    initialReason: '',
    initialChannel: 'audio',
    title: 'Schedule Appointment',
    description: null,
  });
  const previousStatusRef = useRef(null);
  const lastFetchRef = useRef(0);

  useEffect(() => {
    setClinicalFeedback(emptyClinicalFeedback);
    setOutcomeFeedback({});
    setDecisionBusyAction(null);
    setDecisionError('');
    setShowMoreInfoDialog(false);
    setMoreInfoQuestions([]);
    setLiveCopilotMode('live_encounter');
  }, [publicId]);

  const existingNote = useMemo(() => getExistingNote(review), [review]);
  const existingTranscript = useMemo(() => collectReviewTranscripts(review), [review]);
  const sourceEvidenceEntries = useMemo(() => getEvidenceEntries(review), [review]);
  const approvalReadiness = useMemo(() => getDoctorApprovalReadiness(review, patientData), [review, patientData]);
  const caregiverContext = useMemo(() => getCaregiverContext(review), [review]);
  const aiGovernanceSignals = useMemo(() => getAiGovernanceSignals(review, {
    patient: patientData,
    feedback: clinicalFeedback,
    notePayload: editingNote && editedNote ? editedNote : review?.doctor_note,
  }), [review, patientData, clinicalFeedback, editingNote, editedNote]);
  const [copySuccess, setCopySuccess] = useState(false);
  const currentProcessingStatus = getStatus(publicId);
  const getClinicalTrainingFeedbackPayload = useCallback((context = {}) => {
    const feedback = { ...clinicalFeedback };
    if (context.decision === 'approve_as_is') {
      clinicalScoreFields.forEach(({ key }) => {
        if (!Number.isInteger(feedback[key])) {
          feedback[key] = 5;
        }
      });
      if (!feedback.accepted_ai_diagnosis) {
        feedback.accepted_ai_diagnosis = 'true';
      }
      if (!feedback.accepted_ai_plan) {
        feedback.accepted_ai_plan = 'true';
      }
    }

    const payload = {};

    clinicalScoreFields.forEach(({ key }) => {
      const value = feedback[key];
      if (Number.isInteger(value) && value >= 1 && value <= 5) {
        payload[key] = value;
      }
    });

    const acceptedDiagnosis = toBooleanOrNull(feedback.accepted_ai_diagnosis);
    const acceptedPlan = toBooleanOrNull(feedback.accepted_ai_plan);
    if (acceptedDiagnosis !== null) {
      payload.accepted_ai_diagnosis = acceptedDiagnosis;
    }
    if (acceptedPlan !== null) {
      payload.accepted_ai_plan = acceptedPlan;
    }

    const editReason = feedback.edit_reason?.trim();
    if (editReason) {
      payload.edit_reason = editReason;
    }

    const correctionCategories = Array.isArray(feedback.correction_categories)
      ? feedback.correction_categories.filter(Boolean)
      : [];
    if (correctionCategories.length > 0) {
      payload.correction_categories = correctionCategories;
    }

    if (feedback.correction_severity) {
      payload.correction_severity = feedback.correction_severity;
    }

    if (context.decision) {
      payload.workflow_decision = context.decision;
    }

    return Object.keys(payload).length > 0 ? payload : null;
  }, [clinicalFeedback]);

  const updateOutcomeFeedback = (outcomeId, patch) => {
    setOutcomeFeedback((prev) => ({
      ...prev,
      [outcomeId]: {
        ...(prev[outcomeId] || {}),
        ...patch,
      },
    }));
  };

  const getOutcomeFieldValue = (outcome, field, fallback = '') => {
    const local = outcomeFeedback[outcome.id] || {};
    if (Object.prototype.hasOwnProperty.call(local, field)) {
      return local[field];
    }
    const latest = outcome.latest_adjudication || {};
    if (field in latest && latest[field] !== null && latest[field] !== undefined) {
      return latest[field];
    }
    return fallback;
  };

  const handleSaveOutcomeAdjudication = async (outcome) => {
    if (!outcome?.id) return;
    setSavingOutcomeId(outcome.id);
    try {
      const token = await getAccessToken();
      const payload = {
        outcome_event_id: outcome.id,
        action: getOutcomeFieldValue(outcome, 'action', 'reviewed') || 'reviewed',
        outcome_matches_expected: toBooleanOrNull(getOutcomeFieldValue(outcome, 'outcome_matches_expected')),
        diagnosis_still_correct: toBooleanOrNull(getOutcomeFieldValue(outcome, 'diagnosis_still_correct')),
        plan_still_appropriate: toBooleanOrNull(getOutcomeFieldValue(outcome, 'plan_still_appropriate')),
        preventable_event: toBooleanOrNull(getOutcomeFieldValue(outcome, 'preventable_event')),
        prognosis_accuracy_score: getOutcomeFieldValue(outcome, 'prognosis_accuracy_score') || null,
        management_outcome_score: getOutcomeFieldValue(outcome, 'management_outcome_score') || null,
        outcome_severity: getOutcomeFieldValue(outcome, 'outcome_severity', outcome.severity || '') || '',
        clinician_notes: getOutcomeFieldValue(outcome, 'clinician_notes', '') || '',
        next_steps: getOutcomeFieldValue(outcome, 'next_steps', '') || '',
        metadata: {
          surface: 'doctor_review_detail',
          review_public_id: review?.public_id,
        },
      };

      const response = await fetch('https://api.prestigedelta.com/clinician-outcome-adjudications/', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.detail || data.error || 'Failed to save outcome review');
      }
      await fetchReviewDetail();
    } catch (error) {
      console.error('Failed to save outcome adjudication:', error);
      alert(error.message || 'Failed to save outcome review');
    } finally {
      setSavingOutcomeId(null);
    }
  };

  const parseNotePayload = (note) => {
    if (!note) return {};
    if (typeof note === 'string') {
      try {
        return JSON.parse(note);
      } catch {
        return {};
      }
    }
    return JSON.parse(JSON.stringify(note));
  };

  const getDecisionNotePayload = () => {
    if (editingNote && editedNote) {
      return parseNotePayload(editedNote);
    }
    return parseNotePayload(review?.doctor_note || getGeneratedNote(review));
  };

  const currentNoteForDraftApproval = useMemo(() => {
    if (editingNote && editedNote) {
      return parseNotePayload(editedNote);
    }
    return parseNotePayload(review?.doctor_note || getGeneratedNote(review));
  }, [editingNote, editedNote, review]);

  const pendingCopilotDraftActions = useMemo(
    () => getPendingCopilotDraftActions(currentNoteForDraftApproval),
    [currentNoteForDraftApproval]
  );

  const blockPendingCopilotDraftActions = (actionLabel = 'continue') => {
    const pendingActions = getPendingCopilotDraftActions(getDecisionNotePayload());
    if (pendingActions.length === 0) return false;
    const message = `Approve ${pendingActions.length} realtime draft clinical ${pendingActions.length === 1 ? 'action' : 'actions'} in the doctor note before you ${actionLabel}.`;
    setDecisionError(message);
    alert(message);
    return true;
  };

  const buildDoctorDecisionPayload = (decision, extras = {}) => {
    const clinicalTrainingFeedback = getClinicalTrainingFeedbackPayload({ decision });
    const origin = getReviewOrigin(review);
    const urgency = getUrgencyConfig(review);
    const {
      metadata: extraMetadata = {},
      note_payload: extraNotePayload,
      patient_summary: extraPatientSummary,
      send_summary: extraSendSummary,
      ...restExtras
    } = extras;
    const notePayload = extraNotePayload || getDecisionNotePayload();
    const governanceSignals = getAiGovernanceSignals(review, {
      patient: patientData,
      feedback: clinicalTrainingFeedback || clinicalFeedback,
      decision,
      notePayload,
    });
    const pendingDraftActions = getPendingCopilotDraftActions(notePayload);
    const approvalMetadata = {
      quality_risk: governanceSignals.qualityRisk,
      acceptance_state: governanceSignals.acceptanceState,
      governance_reasons: governanceSignals.reasons,
      approval_blocker_count: governanceSignals.approvalBlockerCount,
      approval_warning_count: governanceSignals.approvalWarningCount,
      evidence_anchor_count: governanceSignals.evidenceAnchorCount,
      source_verification_count: governanceSignals.sourceVerificationCount,
      edit_burden_level: governanceSignals.editBurden.level,
      edit_burden_percent: governanceSignals.editBurden.percentChanged,
      pending_copilot_draft_count: pendingDraftActions.length,
      pending_copilot_draft_actions: pendingDraftActions.map((item) => ({
        section: item.section,
        kind: item.kind,
        label: item.label,
      })),
    };

    return {
      ...restExtras,
      decision,
      note_payload: notePayload,
      patient_summary: extraPatientSummary || review?.patient_summary || review?.summary || '',
      patient: {
        first_name: patientData.first_name,
        last_name: patientData.last_name,
        phone: convertToInternationalFormat(patientData.phone),
        email: patientData.email,
      },
      send_summary: extraSendSummary ?? false,
      metadata: {
        surface: 'doctor_review_detail',
        review_public_id: publicId,
        origin,
        urgency_level: urgency.value,
        ai_governance: approvalMetadata,
        ...extraMetadata,
      },
      approval_metadata: approvalMetadata,
      doctor_edit_diff: governanceSignals.editBurden,
      ...(clinicalTrainingFeedback
        ? {
            clinical_training_feedback: {
              ...clinicalTrainingFeedback,
              governance_signals: approvalMetadata,
            },
            doctor_feedback: clinicalTrainingFeedback,
          }
        : {}),
    };
  };

  const handleDoctorDecision = async (decision, extras = {}) => {
    if (!publicId) return null;
    setDecisionBusyAction(decision);
    setDecisionError('');

    try {
      const payload = buildDoctorDecisionPayload(decision, extras);
      const result = await submitDoctorDecision(publicId, payload);

      if (result?.local_fallback) {
        alert(result.message || 'Workflow action captured locally while backend support is pending.');
      } else if (result?.legacy_fallback) {
        alert(result.message || 'Review saved through legacy workflow.');
      } else {
        alert(result?.message || 'Doctor decision saved successfully.');
      }

      await fetchReviewDetail();
      if (onUpdate) {
        onUpdate();
      }
      return result;
    } catch (error) {
      console.error('Doctor decision failed:', error);
      const message = error.message || 'Doctor decision failed';
      setDecisionError(message);
      alert(message);
      return null;
    } finally {
      setDecisionBusyAction(null);
    }
  };

  const handleApproveCopilotDraftActions = () => {
    const notePayload = getDecisionNotePayload();
    const pendingActions = getPendingCopilotDraftActions(notePayload);
    if (pendingActions.length === 0) {
      setDecisionError('');
      return;
    }

    const approvedNote = approveAllCopilotDraftActions(notePayload, {
      approved_by: 'doctor_review_detail',
      approval_note: 'Doctor approved realtime draft clinical actions in review detail.',
    });
    setEditedNote(approvedNote);
    setEditingNote(true);
    setDecisionError(`${pendingActions.length} realtime draft ${pendingActions.length === 1 ? 'action is' : 'actions are'} marked doctor-approved. Review and save the note before patient follow-through.`);
  };

  const handleApproveAiTriageAsIs = () => {
    if (blockPendingCopilotDraftActions('approve this review')) return;
    handleDoctorDecision('approve_as_is');
  };

  const handleEditAiTriageDraft = () => {
    const generatedNote = getGeneratedNote(review);
    const note = parseNotePayload(review?.doctor_note || generatedNote);
    setEditedNote(note);
    setEditingNote(true);
    setDecisionError('Draft opened for editing below. Save your changes, then finalize or approve.');
  };

  const handleOpenMoreInfoDialog = (questions = null) => {
    const nextQuestions = Array.isArray(questions) && questions.length > 0
      ? questions
      : buildMoreInfoQuestions(review);
    setMoreInfoQuestions(nextQuestions.map((item) => ({
      question: item.question || item.label || '',
      reason: item.reason || '',
    })));
    setShowMoreInfoDialog(true);
  };

  const handleSubmitMoreInfoRequest = async () => {
    const questions = moreInfoQuestions
      .map((item) => ({
        question: item.question.trim(),
        reason: item.reason.trim(),
      }))
      .filter((item) => item.question);

    if (questions.length === 0) {
      setDecisionError('Add at least one question to send.');
      return;
    }

    setDecisionBusyAction('request_more_info');
    setDecisionError('');
    try {
      const result = await requestPatientInformation(publicId, {
        questions,
        delivery_channel: 'chat',
        patient: {
          first_name: patientData.first_name,
          last_name: patientData.last_name,
          phone: convertToInternationalFormat(patientData.phone),
          email: patientData.email,
        },
      });
      await handleDoctorDecision('request_more_info', {
        questions,
        delivery_channel: 'chat',
        metadata: { request_result: result?.local_fallback ? 'local_fallback' : 'sent' },
      });
      setShowMoreInfoDialog(false);
    } catch (error) {
      console.error('More info request failed:', error);
      const message = error.message || 'Failed to request patient information';
      setDecisionError(message);
      alert(message);
    } finally {
      setDecisionBusyAction(null);
    }
  };

  const handleStartLiveClarification = async () => {
    setLiveCopilotMode('triage_clarification');
    await handleDoctorDecision('convert_to_live_encounter', {
      metadata: { requested_mode: 'triage_clarification' },
    });
    setShowCopilotDashboard(true);
  };

  const handleEscalateAiTriage = () => {
    handleDoctorDecision('escalate', {
      metadata: {
        escalation_source: 'ai_triage_cockpit',
      },
    });
  };

  const liveVisitEntries = useMemo(() => {
    const conversation = Array.isArray(review?.session_conversation)
      ? review.session_conversation
      : [];

    return [...conversation]
      .filter(
        (entry) =>
          entry &&
          typeof entry === 'object' &&
          entry.source === 'live_visit'
      )
      .sort((left, right) => getEntryTimestampValue(left) - getEntryTimestampValue(right));
  }, [review]);
  const mockLiveVisitPreviewEnabled = useMemo(() => {
    if (typeof window === 'undefined') {
      return false;
    }

    return window.location.hostname === 'localhost'
      && new URLSearchParams(location.search).get('mockLiveVisit') === '1';
  }, [location.search]);
  const mockLiveVisitEntries = useMemo(
    () => (mockLiveVisitPreviewEnabled ? buildMockLiveVisitEntries() : []),
    [mockLiveVisitPreviewEnabled]
  );
  const effectiveLiveVisitEntries = useMemo(
    () => (liveVisitEntries.length > 0 ? liveVisitEntries : mockLiveVisitEntries),
    [liveVisitEntries, mockLiveVisitEntries]
  );
  const usingMockLiveVisitPreview = mockLiveVisitPreviewEnabled && liveVisitEntries.length === 0 && mockLiveVisitEntries.length > 0;
  const liveVisualCaptures = useMemo(
    () => effectiveLiveVisitEntries.filter((entry) => entry.kind === 'visual_capture' && entry.asset_url),
    [effectiveLiveVisitEntries]
  );
  const liveToolActivity = useMemo(
    () => effectiveLiveVisitEntries.filter((entry) => entry.kind === 'tool_activity'),
    [effectiveLiveVisitEntries]
  );
  const liveTranscriptCount = useMemo(
    () => effectiveLiveVisitEntries.filter((entry) => entry.kind === 'transcript').length,
    [effectiveLiveVisitEntries]
  );
  const recentLiveActivity = useMemo(
    () => [...effectiveLiveVisitEntries.filter((entry) => entry.kind === 'tool_activity' || entry.kind === 'visual_capture')].reverse().slice(0, 5),
    [effectiveLiveVisitEntries]
  );
  const liveVisualCaptureCount = useMemo(
    () => Math.max(review?.live_visual_capture_count || 0, liveVisualCaptures.length),
    [review, liveVisualCaptures.length]
  );
  const callbackStatus = review?.callback_status || 'none';
  const callbackAppointment = review?.callback_appointment || null;
  const callbackBookingRequest = review?.callback_booking_request || null;
  const callbackStatusConfig = useMemo(
    () => getCallbackStatusConfig(callbackStatus),
    [callbackStatus]
  );
  const liveVisitReadiness = review?.live_visit_readiness || (effectiveLiveVisitEntries.length > 0 ? 'ready_for_review' : 'not_started');
  const liveVisitReadinessConfig = useMemo(
    () => getLiveVisitReadinessConfig(liveVisitReadiness, callbackStatus),
    [liveVisitReadiness, callbackStatus]
  );
  const callbackSummaryText = useMemo(() => {
    if (callbackStatus === 'booking_requested' && callbackBookingRequest) {
      return `A patient booking request for a ${formatDisplayLabel(callbackBookingRequest.channel)} follow-up was sent on ${formatScheduledMoment(callbackBookingRequest.requested_at)}. The patient should choose the time themselves from the doctor detail page or reply in chat for help.`;
    }

    if (callbackStatus === 'payment_pending' && callbackAppointment) {
      return `A ${formatDisplayLabel(callbackAppointment.channel)} callback was booked for ${formatScheduledMoment(callbackAppointment.start_time)}. Payment is still pending before that time becomes confirmed.`;
    }

    if (callbackStatus === 'scheduled' && callbackAppointment) {
      return `A ${formatDisplayLabel(callbackAppointment.channel)} callback is scheduled for ${formatScheduledMoment(callbackAppointment.start_time)}.`;
    }

    if (callbackStatus === 'completed' && callbackAppointment) {
      return `The latest linked callback was completed on ${formatScheduledMoment(callbackAppointment.start_time)}.`;
    }

    if (callbackStatus === 'cancelled' && callbackAppointment) {
      return `The latest linked callback was cancelled after being booked for ${formatScheduledMoment(callbackAppointment.start_time)}.`;
    }

    if (callbackStatus === 'missed' && callbackAppointment) {
      return `The latest linked callback was missed after being booked for ${formatScheduledMoment(callbackAppointment.start_time)}.`;
    }

    if (callbackStatus === 'planned' && review?.follow_up) {
      return `Doctor follow-up is planned for ${formatScheduledMoment(review.follow_up)}, but there is no linked callback appointment on this review yet.`;
    }

    if (callbackStatus === 'ai_follow_up' && review?.follow_up_at) {
      return `An AI follow-up reminder is scheduled for ${formatScheduledMoment(review.follow_up_at)}.`;
    }

    if (liveVisitReadiness === 'ready_for_review') {
      return 'Live visit transcripts, tool activity, or captures are available and this case is ready for doctor action.';
    }

    return null;
  }, [
    callbackBookingRequest,
    callbackAppointment,
    callbackStatus,
    liveVisitReadiness,
    review?.follow_up,
    review?.follow_up_at,
  ]);
  const openBookingModal = useCallback((preset = {}) => {
    const patientName = `${patientData.first_name || ''} ${patientData.last_name || ''}`.trim() || 'this patient';

    setBookingPreset({
      initialReason: preset.initialReason || '',
      initialChannel: preset.initialChannel || 'audio',
      title: preset.title || 'Request Patient Booking',
      description: preset.description || `Send ${patientName} a booking link so they can choose a convenient time themselves.`,
    });
    setIsBookingModalOpen(true);
  }, [patientData.first_name, patientData.last_name]);
  const followUpRecommendations = useMemo(() => {
    if (!review || (!review.patient_summary && effectiveLiveVisitEntries.length === 0)) {
      return [];
    }

    const complaint = review.chief_complaint || 'recent live visit concerns';
    const contextBits = [];
    if (liveVisualCaptureCount > 0) {
      contextBits.push(`${liveVisualCaptureCount} visual ${liveVisualCaptureCount === 1 ? 'capture' : 'captures'} available for review`);
    }
    if (liveTranscriptCount > 0) {
      contextBits.push(`${liveTranscriptCount} transcript ${liveTranscriptCount === 1 ? 'entry' : 'entries'}`);
    }
    if (liveToolActivity.length > 0) {
      contextBits.push(`${liveToolActivity.length} tool ${liveToolActivity.length === 1 ? 'update' : 'updates'}`);
    }
    const contextSuffix = contextBits.length ? ` Context: ${contextBits.join(', ')}.` : '';

    const actions = [
      {
        key: 'audio-callback',
        icon: <CallIcon />,
        title: 'Request Audio Callback Booking',
        description: review.is_finalized
          ? 'Ask the patient to choose a time for a clinician audio callback if they still need direct review after this live visit.'
          : 'Ask the patient to choose a time for an audio callback if the live visit needs clinician clarification before closure.',
        severity: 'warning',
        channel: 'audio',
        reason: `Audio follow-up requested after live visit review for ${complaint}.${contextSuffix}`,
      },
    ];

    if (liveVisualCaptureCount > 0) {
      actions.unshift({
        key: 'video-follow-up',
        icon: <VideoCallIcon />,
        title: 'Request Video Follow-up Booking',
        description: 'Ask the patient to choose a time for a video follow-up when the clinician needs to inspect findings beyond the stored captures.',
        severity: 'info',
        channel: 'video',
        reason: `Video follow-up requested to review live visit visual findings for ${complaint}.${contextSuffix}`,
      });
    }

    return actions;
  }, [
    review,
    effectiveLiveVisitEntries.length,
    liveToolActivity.length,
    liveTranscriptCount,
    liveVisualCaptureCount,
  ]);

  const handleCopyNote = async () => {
    if (!review.doctor_note) return;

    try {
      // Get patient name and encounter date
      const patientName = (review.patient_first_name || review.patient_last_name) 
        ? `${review.patient_first_name || ''} ${review.patient_last_name || ''}`.trim() 
        : 'Patient Name Not Specified';
      
      const encounter = review.in_person_encounters && review.in_person_encounters.length > 0 
        ? review.in_person_encounters[0] 
        : null;
      const encounterDate = encounter?.encounter_date 
        ? new Date(encounter.encounter_date).toLocaleDateString() 
        : new Date().toLocaleDateString();

      // Format the EMR-friendly SOAP note
      let soapText = `PATIENT: ${patientName}\n`;
      soapText += `DATE: ${encounterDate}\n`;
      soapText += `CHIEF COMPLAINT: ${review.chief_complaint || 'Not specified'}\n\n`;

      // Helper function to format SOAP section content
      const formatSOAPContent = (content) => {
        if (!content) return 'Not provided';
        if (typeof content === 'string') return content;
        if (typeof content === 'object' && content !== null) {
          const entries = Object.entries(content);
          if (entries.length === 0) return 'Not provided';
          return entries
            .filter(([key, value]) => value && value.trim())
            .map(([key, value]) => {
              // Convert key from snake_case to Title Case
              const titleCaseKey = key
                .replace(/_/g, ' ')
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join(' ');
              return `${titleCaseKey}: ${String(value).trim()}`;
            })
            .join('\n\n');
        }
        return 'Not provided';
      };

      soapText += 'SUBJECTIVE:\n';
      soapText += formatSOAPContent(review.doctor_note.subjective);
      soapText += '\n\nOBJECTIVE:\n';
      soapText += formatSOAPContent(review.doctor_note.objective);
      soapText += '\n\nASSESSMENT:\n';
      soapText += formatSOAPContent(review.doctor_note.assessment);
      soapText += '\n\nPLAN:\n';
      soapText += formatSOAPContent(review.doctor_note.plan);

      // Add prescriptions if available
      if (review.doctor_note.prescription && Array.isArray(review.doctor_note.prescription) && review.doctor_note.prescription.length > 0) {
        const prescriptions = review.doctor_note.prescription
          .filter(p => p && typeof p === 'object')
          .map(p => {
            const medName = p.medication_name || p.name || 'Unknown Medication';
            const dosage = p.dosage || 'N/A';
            const instructions = p.instructions || 'N/A';
            return `• ${medName} - ${dosage}\n  Instructions: ${instructions}`;
          })
          .join('\n\n');
        if (prescriptions.trim()) {
          soapText += `\n\nPRESCRIPTIONS:\n${prescriptions}`;
        }
      }

      // Add investigations if available
      if (review.doctor_note.investigation && Array.isArray(review.doctor_note.investigation) && review.doctor_note.investigation.length > 0) {
        const investigations = review.doctor_note.investigation
          .filter(i => i && typeof i === 'object')
          .map(i => {
            const testName = i.test_type || i.name || 'Unknown Test';
            const reason = i.reason || 'Not specified';
            const instructions = i.instructions ? `\n  Instructions: ${i.instructions}` : '';
            return `• ${testName}\n  Reason: ${reason}${instructions}`;
          })
          .join('\n\n');
        if (investigations.trim()) {
          soapText += `\n\nINVESTIGATIONS:\n${investigations}`;
        }
      }

      // Add other clinical actions if available
      if (review.doctor_note.other_actions && Array.isArray(review.doctor_note.other_actions) && review.doctor_note.other_actions.length > 0) {
        const otherActions = review.doctor_note.other_actions
          .filter(a => a && typeof a === 'object')
          .map(a => {
            const actionType = (a.action_type || 'action').toUpperCase();
            const actionName = a.name || 'Unknown Action';
            const notes = a.notes ? `\n  Notes: ${a.notes}` : '';
            return `• [${actionType}] ${actionName}${notes}`;
          })
          .join('\n\n');
        if (otherActions.trim()) {
          soapText += `\n\nOTHER CLINICAL ACTIONS (COUNSELLING, PROCEDURES, REFERRALS):\n${otherActions}`;
        }
      }

      await navigator.clipboard.writeText(soapText);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000); // Hide success message after 2 seconds
    } catch (error) {
      console.error('Failed to copy note:', error);
      alert('Failed to copy note to clipboard');
    }
  };

  useEffect(() => {
    fetchReviewDetail();
  }, [publicId]);

  // Auto-open copilot if query param is set
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('startCopilot') === '1' && review && !review.is_finalized) {
      setShowCopilotDashboard(true);
      // Clean up the URL search params so it doesn't open again on page refresh
      const nextSearch = new URLSearchParams(location.search);
      nextSearch.delete('startCopilot');
      const searchString = nextSearch.toString();
      navigate({
        pathname: location.pathname,
        search: searchString ? `?${searchString}` : ''
      }, { replace: true });
    }
  }, [location.search, review, navigate, location.pathname]);

  // Auto-refetch when processing completes
  useEffect(() => {
    const currentStatus = getStatus(publicId);
    const previousStatus = previousStatusRef.current;
    let timer;

    if (previousStatus && !currentStatus && review) {
      const now = Date.now();
      if (now - lastFetchRef.current >= 3000) {
        timer = setTimeout(() => {
          fetchReviewDetail();
        }, 1000);
      }
    }

    previousStatusRef.current = currentStatus;

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [processingStatuses, publicId, review, getStatus]);

  // Reset previous status tracker when changing reviews
  useEffect(() => {
    previousStatusRef.current = getStatus(publicId);
  }, [publicId, getStatus]);

  // Start polling if there's an active processing status
  useEffect(() => {
    if (!review || !publicId) return;

    const encounter = review.in_person_encounters?.[0];
    if (!encounter) return;

    const encounterId = encounter.public_id;
    const currentStatus = getStatus(publicId);

    // Only start polling if actively processing or queued; skip if already failed
    if (currentStatus === 'processing' || currentStatus === 'queued') {
      startEncounterPolling({
        reviewId: publicId,
        encounterId,
        initialState: currentStatus,
        onStatus: () => {}, // No specific status handling needed here
        onComplete: () => {
          // Refetch review data when processing completes
          // This will be called after polling completes
          setLoading(true);
        },
        onError: (message) => {
          console.error('Polling error:', message);
        }
      });
    }
  }, [publicId, getStatus, startEncounterPolling, review]);

  const attemptFallbackEncounterFetch = async (token) => {
    try {
      // 1. Try to fetch specific encounter directly if publicId matches an encounter ID
      const directEncounterRes = await fetch(`https://api.prestigedelta.com/in-person-encounters/${publicId}/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (directEncounterRes.ok) {
        const match = await directEncounterRes.json();
        console.log('Found matching encounter directly:', match);
        const draftReview = {
          id: match.medical_review_id,
          public_id: match.medical_review_public_id || publicId,
          patient_first_name: match.patient_first_name,
          patient_last_name: match.patient_last_name,
          patient_phone_number: match.patient_phone || match.patient_phone_number || '',
          patient_email: match.patient_email || '',
          chief_complaint: match.metadata?.chief_complaint || '',
          doctor_note: null,
          is_finalized: false,
          in_person_encounters: [match]
        };
        setReview(draftReview);
        setPatientData({
          first_name: draftReview.patient_first_name || '',
          last_name: draftReview.patient_last_name || '',
          phone: draftReview.patient_phone_number || '',
          email: draftReview.patient_email || ''
        });
        if (onUpdate) onUpdate();
        return true;
      }
    } catch (e) {
      console.warn('Direct encounter check failed:', e);
    }

    try {
      // 2. Fallback to list search
      const response = await fetch('https://api.prestigedelta.com/in-person-encounters/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const encountersData = await response.json();
        const list = Array.isArray(encountersData)
          ? encountersData
          : Array.isArray(encountersData?.results)
            ? encountersData.results
            : [];
        const match = list.find(enc => enc.medical_review_public_id === publicId || enc.public_id === publicId);
        if (match) {
          console.log('Found matching encounter in list search:', match);
          const draftReview = {
            id: match.medical_review_id,
            public_id: match.medical_review_public_id || publicId,
            patient_first_name: match.patient_first_name,
            patient_last_name: match.patient_last_name,
            patient_phone_number: match.patient_phone || match.patient_phone_number || '',
            patient_email: match.patient_email || '',
            chief_complaint: match.metadata?.chief_complaint || '',
            doctor_note: null,
            is_finalized: false,
            in_person_encounters: [match]
          };
          setReview(draftReview);
          setPatientData({
            first_name: draftReview.patient_first_name || '',
            last_name: draftReview.patient_last_name || '',
            phone: draftReview.patient_phone_number || '',
            email: draftReview.patient_email || ''
          });
          if (onUpdate) onUpdate();
          return true;
        }
      }
    } catch (e) {
      console.error('Error during list fallback encounter fetch:', e);
    }
    return false;
  };

  const fetchReviewDetail = async () => {
    setLoading(true);
    const token = await getAccessToken();
    
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const response = await fetch(`https://api.prestigedelta.com/provider-reviews/${publicId}/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setReview(data);
        lastFetchRef.current = Date.now();
        setChatRefreshTrigger(prev => prev + 1);
        
        // Pre-fill patient data from review level, fallback to encounter level
        setPatientData({
          first_name: data.patient_first_name || (data.in_person_encounters && data.in_person_encounters.length > 0 ? data.in_person_encounters[0].patient_first_name : '') || '',
          last_name: data.patient_last_name || (data.in_person_encounters && data.in_person_encounters.length > 0 ? data.in_person_encounters[0].patient_last_name : '') || '',
          phone: data.patient_phone_number || (data.in_person_encounters && data.in_person_encounters.length > 0 ? data.in_person_encounters[0].patient_phone_number : '') || '',
          email: data.patient_email || (data.in_person_encounters && data.in_person_encounters.length > 0 ? data.in_person_encounters[0].patient_email : '') || ''
        });
        
        if (onUpdate) {
          onUpdate();
        }
      } else {
        console.warn('Failed to fetch review directly, trying fallback encounter check');
        const fallbackSuccess = await attemptFallbackEncounterFetch(token);
        if (!fallbackSuccess && !embedded) {
          navigate('/reviews');
        }
      }
    } catch (error) {
      console.error('Error fetching review directly, trying fallback encounter check:', error);
      const fallbackSuccess = await attemptFallbackEncounterFetch(token);
      if (!fallbackSuccess && !embedded) {
        navigate('/reviews');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFinalizeEncounter = async () => {
    if (!review || !review.in_person_encounters || review.in_person_encounters.length === 0) {
      alert('No review found to finalize');
      return;
    }
    if (blockPendingCopilotDraftActions('finalize this encounter')) return;

    setSaving(true);
    const token = await getAccessToken();

    try {
      // Convert phone number to international format if needed
      const convertedPhone = convertToInternationalFormat(patientData.phone);
      const notePayload = getDecisionNotePayload();
      
      const finalizePayload = {
        note_payload: notePayload,
        create_patient: true,
        send_summary: false,
        patient_first_name: patientData.first_name,
        patient_last_name: patientData.last_name,
        patient_phone_number: convertedPhone,
        patient_email: patientData.email,
        run_finalize_workflow: true
      };
      const clinicalTrainingFeedback = getClinicalTrainingFeedbackPayload();
      if (clinicalTrainingFeedback) {
        finalizePayload.clinical_training_feedback = clinicalTrainingFeedback;
      }

      const response = await fetch(
        `https://api.prestigedelta.com/medical-reviews/${publicId}/finalize/`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(finalizePayload)
        }
      );

      if (response.ok) {
        alert('Review finalized successfully!');
        setShowFinalizeDialog(false);
        fetchReviewDetail(); // Refresh to show updated status
      } else {
        const error = await response.json();
        alert(`Failed to finalize: ${JSON.stringify(error)}`);
      }
    } catch (error) {
      console.error('Error finalizing encounter:', error);
      alert('An error occurred while finalizing');
    } finally {
      setSaving(false);
    }
  };

  const handleSyncCopilotOrders = async (orders) => {
    if (orders?.liveArtifactsSaved) {
      if (orders.review) {
        setReview(orders.review);
      } else {
        await fetchReviewDetail();
      }
      if (onUpdate) {
        onUpdate();
      }
      return;
    }

    const { prescriptions, investigations, otherActions, soapNote } = orders;
    const draftOrders = buildCopilotDraftSyncPayload({
      prescriptions,
      investigations,
      otherActions,
      soapNote,
      mode: orders?.source_mode || orders?.mode || 'live_encounter',
      reviewOrigin: orders?.review_origin || getReviewOrigin(review),
      selectedOnly: false,
    });
    const draftPrescriptions = draftOrders.prescriptions || [];
    const draftInvestigations = draftOrders.investigations || [];
    const draftOtherActions = draftOrders.otherActions || [];
    
    // Check if we are currently editing the note
    if (editingNote) {
      setEditedNote(prev => {
        const currentPrescriptions = prev?.prescription || [];
        const currentInvestigations = prev?.investigation || [];
        const currentOtherActions = prev?.other_actions || [];

        const newPrescriptions = draftPrescriptions.filter(
          np => !currentPrescriptions.some(cp => cp.medication_name && cp.medication_name.toLowerCase() === np.medication_name.toLowerCase())
        );
        const newInvestigations = draftInvestigations.filter(
          ni => !currentInvestigations.some(ci => ci.test_type && ci.test_type.toLowerCase() === ni.test_type.toLowerCase())
        );
        const newOtherActions = draftOtherActions.filter(
          na => !currentOtherActions.some(ca => ca.name && ca.name.toLowerCase() === na.name.toLowerCase())
        );

        return {
          ...prev,
          subjective: soapNote?.subjective || prev?.subjective || '',
          objective: soapNote?.objective || prev?.objective || '',
          assessment: soapNote?.assessment || prev?.assessment || '',
          plan: soapNote?.plan || prev?.plan || '',
          prescription: [...currentPrescriptions, ...newPrescriptions],
          investigation: [...currentInvestigations, ...newInvestigations],
          other_actions: [...currentOtherActions, ...newOtherActions]
        };
      });
      alert('Copilot documentation and draft recommendations were merged into your note. Please review and approve before saving.');
    } else {
      // Not in edit mode: load the current note, merge, and save immediately to backend!
      const rawNote = typeof review.doctor_note === 'string'
        ? JSON.parse(review.doctor_note)
        : review.doctor_note;
      const currentNote = rawNote ? JSON.parse(JSON.stringify(rawNote)) : {};
      
      const currentPrescriptions = currentNote.prescription || [];
      const currentInvestigations = currentNote.investigation || [];
      const currentOtherActions = currentNote.other_actions || [];

      const newPrescriptions = draftPrescriptions.filter(
        np => !currentPrescriptions.some(cp => cp.medication_name && cp.medication_name.toLowerCase() === np.medication_name.toLowerCase())
      );
      const newInvestigations = draftInvestigations.filter(
        ni => !currentInvestigations.some(ci => ci.test_type && ci.test_type.toLowerCase() === ni.test_type.toLowerCase())
      );
      const newOtherActions = draftOtherActions.filter(
        na => !currentOtherActions.some(ca => ca.name && ca.name.toLowerCase() === na.name.toLowerCase())
      );

      const mergedNote = {
        ...currentNote,
        subjective: soapNote?.subjective || currentNote?.subjective || '',
        objective: soapNote?.objective || currentNote?.objective || '',
        assessment: soapNote?.assessment || currentNote?.assessment || '',
        plan: soapNote?.plan || currentNote?.plan || '',
        prescription: [...currentPrescriptions, ...newPrescriptions],
        investigation: [...currentInvestigations, ...newInvestigations],
        other_actions: [...currentOtherActions, ...newOtherActions]
      };

      setSaving(true);
      try {
        const token = await getAccessToken();
        const response = await fetch(
          `https://api.prestigedelta.com/medical-reviews/${publicId}/save-note/`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              note_payload: mergedNote
            })
          }
        );

        if (response.ok) {
          setReview(prev => ({
            ...prev,
            doctor_note: mergedNote,
            note_payload: mergedNote
          }));
          alert('Copilot documentation and draft recommendations were saved for doctor review.');
        } else {
          const error = await response.json().catch(() => ({}));
          alert(`Failed to save synced draft recommendations: ${error.detail || JSON.stringify(error) || 'Please try again.'}`);
        }
      } catch (error) {
        console.error('Error saving synced note:', error);
        alert('An error occurred while saving the synced draft recommendations');
      } finally {
        setSaving(false);
      }
    }
  };

  const handleSaveNote = async () => {
    if (!review || !editedNote) return;

    setSaving(true);
    try {
      const token = await getAccessToken();
      const clinicalTrainingFeedback = getClinicalTrainingFeedbackPayload();

      const response = await fetch(
        `https://api.prestigedelta.com/medical-reviews/${publicId}/save-note/`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            note_payload: editedNote,
            ...(clinicalTrainingFeedback
              ? { clinical_training_feedback: clinicalTrainingFeedback }
              : {})
          })
        }
      );

      if (response.ok) {
        // Update the review state with the edited note payload
        setReview(prev => ({
          ...prev,
          doctor_note: editedNote,
          note_payload: editedNote
        }));

        // Exit edit mode
        setEditingNote(false);
        setEditedNote(null);
      } else {
        const error = await response.json().catch(() => ({}));
        alert(`Failed to save note: ${error.detail || JSON.stringify(error) || 'Please try again.'}`);
      }
    } catch (error) {
      console.error('Error saving note:', error);
      alert('An error occurred while saving the note');
    } finally {
      setSaving(false);
    }
  };

  const handleFinalize = async () => {
    if (!review) return;

    const notePayload = getDecisionNotePayload();
    if (!review.doctor_note && Object.keys(notePayload).length === 0) {
      alert('Please ensure the review has been documented before finalizing');
      return;
    }
    if (blockPendingCopilotDraftActions('finalize this review')) return;

    setSaving(true);
    try {
      const token = await getAccessToken();

      // Convert phone number to international format if needed
      const convertedPhone = convertToInternationalFormat(patientData.phone);

      const finalizePayload = {
        note_payload: notePayload,
        send_summary: true,
        create_patient: true,
        patient_first_name: patientData.first_name || '',
        patient_last_name: patientData.last_name || '',
        patient_phone_number: convertedPhone || '',
        patient_email: patientData.email || '',
        run_finalize_workflow: true
      };
      const clinicalTrainingFeedback = getClinicalTrainingFeedbackPayload();
      if (clinicalTrainingFeedback) {
        finalizePayload.clinical_training_feedback = clinicalTrainingFeedback;
      }

      const response = await fetch(
        `https://api.prestigedelta.com/medical-reviews/${publicId}/finalize/`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(finalizePayload)
        }
      );

      if (response.ok) {
        await response.json();
        alert('Review finalized successfully!');
        fetchReviewDetail(); // Refresh to show updated status
      } else {
        const error = await response.json();
        alert(`Failed to finalize review: ${JSON.stringify(error)}`);
      }
    } catch (error) {
      console.error('Error finalizing review:', error);
      alert('An error occurred while finalizing the review');
    } finally {
      setSaving(false);
    }
  };

  const handleEditNote = () => {
    console.log('handleEditNote called');
    setEditingNote(true);
    // doctor_note may be a JSON string (legacy) or already an object (new API behaviour)
    const rawNote = typeof review.doctor_note === 'string'
      ? JSON.parse(review.doctor_note)
      : review.doctor_note;
    const initialNote = rawNote ? JSON.parse(JSON.stringify(rawNote)) : {};
    // Ensure prescriptions and investigations arrays exist
    if (!initialNote.prescription) initialNote.prescription = [];
    if (!initialNote.investigation) initialNote.investigation = [];
    if (!initialNote.other_actions) initialNote.other_actions = [];
    setEditedNote(initialNote);
    console.log('editedNote initialized:', initialNote);
  };

  const handleCancelEdit = () => {
    setEditingNote(false);
    setEditedNote(null);
  };

  // Optimized change handlers to prevent performance issues
  const updatePrescriptionField = useCallback((index, field, value) => {
    setEditedNote(prev => {
      const updatedPrescriptions = [...(prev?.prescription || [])];
      if (updatedPrescriptions[index]) {
        updatedPrescriptions[index] = { ...updatedPrescriptions[index], [field]: value };
      }
      return {
        ...prev,
        prescription: updatedPrescriptions
      };
    });
  }, []);

  const updateInvestigationField = useCallback((index, field, value) => {
    setEditedNote(prev => {
      const updatedInvestigations = [...(prev?.investigation || [])];
      if (updatedInvestigations[index]) {
        updatedInvestigations[index] = { ...updatedInvestigations[index], [field]: value };
      }
      return {
        ...prev,
        investigation: updatedInvestigations
      };
    });
  }, []);

  const applyPrescriptionQuickOption = useCallback((index, option) => {
    if (!option) return;

    if (typeof option === 'string') {
      updatePrescriptionField(index, 'medication_name', option);
      return;
    }

    setEditedNote(prev => {
      const updatedPrescriptions = [...(prev?.prescription || [])];
      if (!updatedPrescriptions[index]) return prev;

      const currentPrescription = updatedPrescriptions[index];
      updatedPrescriptions[index] = {
        ...currentPrescription,
        medication_name: option.medication_name || option.label || currentPrescription.medication_name || '',
        dosage: currentPrescription.dosage || option.dosage || '',
        route: option.route || currentPrescription.route || 'oral',
        interval: option.interval ?? currentPrescription.interval ?? 0,
        instructions: currentPrescription.instructions || option.instructions || '',
        is_otc: typeof option.is_otc === 'boolean' ? option.is_otc : currentPrescription.is_otc,
      };

      return {
        ...prev,
        prescription: updatedPrescriptions
      };
    });
  }, [updatePrescriptionField]);

  const applyInvestigationQuickOption = useCallback((index, option) => {
    if (!option) return;

    if (typeof option === 'string') {
      updateInvestigationField(index, 'test_type', option);
      return;
    }

    setEditedNote(prev => {
      const updatedInvestigations = [...(prev?.investigation || [])];
      if (!updatedInvestigations[index]) return prev;

      const currentInvestigation = updatedInvestigations[index];
      updatedInvestigations[index] = {
        ...currentInvestigation,
        test_type: option.test_type || option.label || currentInvestigation.test_type || '',
        reason: currentInvestigation.reason || option.reason || '',
        instructions: currentInvestigation.instructions || option.instructions || '',
        interval: option.interval ?? currentInvestigation.interval ?? 0,
      };

      return {
        ...prev,
        investigation: updatedInvestigations
      };
    });
  }, [updateInvestigationField]);

  const addPrescription = useCallback(() => {
    const newPrescription = {
      medication_name: '',
      dosage: '',
      route: 'oral',
      interval: 8,
      end_date: '',
      instructions: '',
      is_otc: false
    };
    setEditedNote(prev => ({
      ...prev,
      prescription: [...(prev?.prescription || []), newPrescription]
    }));
  }, []);

  const addInvestigation = useCallback(() => {
    const newInvestigation = {
      test_type: '',
      reason: '',
      instructions: '',
      interval: 0,
      scheduled_time: ''
    };
    setEditedNote(prev => ({
      ...prev,
      investigation: [...(prev?.investigation || []), newInvestigation]
    }));
  }, []);

  const deletePrescription = useCallback((index) => {
    setEditedNote(prev => ({
      ...prev,
      prescription: (prev?.prescription || []).filter((_, i) => i !== index)
    }));
  }, []);

  const deleteInvestigation = useCallback((index) => {
    setEditedNote(prev => ({
      ...prev,
      investigation: (prev?.investigation || []).filter((_, i) => i !== index)
    }));
  }, []);

  const updateOtherActionField = useCallback((index, field, value) => {
    setEditedNote(prev => {
      const updatedActions = [...(prev?.other_actions || [])];
      if (updatedActions[index]) {
        updatedActions[index] = { ...updatedActions[index], [field]: value };
      }
      return {
        ...prev,
        other_actions: updatedActions
      };
    });
  }, []);

  const applyOtherActionQuickOption = useCallback((index, option) => {
    if (!option) return;

    if (typeof option === 'string') {
      updateOtherActionField(index, 'name', option);
      return;
    }

    setEditedNote(prev => {
      const updatedActions = [...(prev?.other_actions || [])];
      if (!updatedActions[index]) return prev;

      const currentAction = updatedActions[index];
      updatedActions[index] = {
        ...currentAction,
        action_type: option.action_type || currentAction.action_type || 'counselling',
        name: option.name || option.label || currentAction.name || '',
        notes: currentAction.notes || option.notes || '',
      };

      return {
        ...prev,
        other_actions: updatedActions
      };
    });
  }, [updateOtherActionField]);

  const appendSoapTemplate = useCallback((sectionKey, fieldKey, option) => {
    const templateText = typeof option === 'string' ? option : option?.value;
    if (!templateText) return;

    setEditedNote(prev => {
      const currentSection = getSoapSectionObject(prev?.[sectionKey], fieldKey);
      const currentValue = currentSection[fieldKey];
      const currentText = typeof currentValue === 'object'
        ? JSON.stringify(currentValue, null, 2)
        : (currentValue || '');
      const nextValue = currentText ? `${currentText}\n\n${templateText}` : templateText;

      return {
        ...prev,
        [sectionKey]: {
          ...currentSection,
          [fieldKey]: nextValue,
        }
      };
    });
  }, []);

  const addOtherAction = useCallback(() => {
    const newAction = {
      action_type: 'counselling',
      name: '',
      notes: '',
      scheduled_time: ''
    };
    setEditedNote(prev => ({
      ...prev,
      other_actions: [...(prev?.other_actions || []), newAction]
    }));
  }, []);

  const deleteOtherAction = useCallback((index) => {
    setEditedNote(prev => ({
      ...prev,
      other_actions: (prev?.other_actions || []).filter((_, i) => i !== index)
    }));
  }, []);

  const handleEncounterSuccess = (encounter) => {
    setCurrentEncounter(encounter);
    // Don't navigate, just store the encounter
  };

  const handleRecordClick = async () => {
    // If we already have an encounter from the current session, open modal
    if (currentEncounter) {
      setShowRecordingModal(true);
      return;
    }

    // If the review already has encounters, use the first one
    if (hasEncounter) {
      setCurrentEncounter(encounter);
      setShowRecordingModal(true);
      return;
    }

    // Otherwise, create a new encounter for this existing review
    setCreatingEncounter(true);
    const token = await getAccessToken();

    try {
      const response = await fetch('https://api.prestigedelta.com/in-person-encounters/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          medical_review_id: review.id // Use the review's ID
        })
      });

      if (response.ok) {
        const newEncounter = await response.json();
        setCurrentEncounter(newEncounter);
        // Open recording modal immediately after creating
        setShowRecordingModal(true);
      } else {
        const errorData = await response.json();
        alert(`Failed to create encounter: ${errorData.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error creating encounter:', error);
      alert('An error occurred while creating the encounter');
    } finally {
      setCreatingEncounter(false);
    }
  };

  const applyClinicalFeedbackPreset = (preset) => {
    setClinicalFeedback((prev) => {
      if (preset === 'accepted') {
        return {
          ...prev,
          accepted_ai_diagnosis: 'true',
          accepted_ai_plan: 'true',
          safety_score: prev.safety_score || 5,
          diagnostic_quality_score: prev.diagnostic_quality_score || 5,
          management_quality_score: prev.management_quality_score || 5,
          patient_communication_score: prev.patient_communication_score || 5,
          local_feasibility_score: prev.local_feasibility_score || 5,
          correction_categories: [],
          correction_severity: 'none',
        };
      }

      return {
        ...prev,
        accepted_ai_diagnosis: prev.accepted_ai_diagnosis || 'false',
        accepted_ai_plan: prev.accepted_ai_plan || 'false',
        safety_score: prev.safety_score || 3,
        diagnostic_quality_score: prev.diagnostic_quality_score || 3,
        management_quality_score: prev.management_quality_score || 3,
        correction_severity: prev.correction_severity || 'moderate',
      };
    });
  };

  const toggleClinicalCorrectionCategory = (category) => {
    setClinicalFeedback((prev) => {
      const selected = Array.isArray(prev.correction_categories) ? prev.correction_categories : [];
      const next = selected.includes(category)
        ? selected.filter((value) => value !== category)
        : [...selected, category];
      return {
        ...prev,
        correction_categories: next,
        correction_severity: next.length > 0 && !prev.correction_severity ? 'moderate' : prev.correction_severity,
      };
    });
  };

  const renderClinicalFeedbackPanel = () => {
    if (!review?.conducted_by_ai || review?.is_finalized) {
      return null;
    }

    const training = review?.clinical_training || {};

    return (
      <Card variant="outlined" sx={{ mb: 3, borderColor: 'divider' }}>
        <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
            <Typography variant="subtitle1" fontWeight="bold">
              AI Review Feedback
            </Typography>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 0.75 }}>
              <Chip
                size="small"
                variant="outlined"
                color={training.has_model_draft ? 'success' : 'default'}
                label={training.has_model_draft ? 'Draft captured' : 'Awaiting draft'}
              />
              <Chip
                size="small"
                color={aiGovernanceSignals.color}
                variant={aiGovernanceSignals.variant}
                label={aiGovernanceSignals.shortLabel}
              />
              <Chip
                size="small"
                variant="outlined"
                color={aiGovernanceSignals.editBurden.color}
                label={`${aiGovernanceSignals.editBurden.percentChanged}% edits`}
              />
            </Stack>
          </Box>
          {aiGovernanceSignals.reasons.length > 0 && (
            <Alert severity={aiGovernanceSignals.qualityRisk === 'high' ? 'warning' : 'info'} sx={{ mb: 2 }}>
              <Typography variant="body2">
                {aiGovernanceSignals.reasons.slice(0, 2).join(' - ')}
              </Typography>
            </Alert>
          )}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 2 }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<CheckCircleIcon />}
              onClick={() => applyClinicalFeedbackPreset('accepted')}
            >
              AI Note Accepted
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<AutorenewIcon />}
              onClick={() => applyClinicalFeedbackPreset('corrected')}
            >
              I Made Corrections
            </Button>
          </Stack>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                size="small"
                label="Accepted diagnosis"
                value={clinicalFeedback.accepted_ai_diagnosis}
                onChange={(event) => {
                  setClinicalFeedback((prev) => ({
                    ...prev,
                    accepted_ai_diagnosis: event.target.value,
                  }));
                }}
              >
                {outcomeBooleanOptions.map((option) => (
                  <MenuItem key={option.value || 'blank'} value={option.value}>{option.label}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                size="small"
                label="Accepted plan"
                value={clinicalFeedback.accepted_ai_plan}
                onChange={(event) => {
                  setClinicalFeedback((prev) => ({
                    ...prev,
                    accepted_ai_plan: event.target.value,
                  }));
                }}
              >
                {outcomeBooleanOptions.map((option) => (
                  <MenuItem key={option.value || 'blank'} value={option.value}>{option.label}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                size="small"
                label="Correction severity"
                value={clinicalFeedback.correction_severity}
                onChange={(event) => {
                  setClinicalFeedback((prev) => ({
                    ...prev,
                    correction_severity: event.target.value,
                  }));
                }}
              >
                {clinicalCorrectionSeverityOptions.map((option) => (
                  <MenuItem key={option.value || 'blank'} value={option.value}>{option.label}</MenuItem>
                ))}
              </TextField>
            </Grid>
            {clinicalScoreFields.map(({ key, label }) => (
              <Grid item xs={12} sm={6} md={4} key={key}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    {label}
                  </Typography>
                  <Rating
                    size="small"
                    value={clinicalFeedback[key] || 0}
                    onChange={(_, value) => {
                      setClinicalFeedback((prev) => ({
                        ...prev,
                        [key]: value || null,
                      }));
                    }}
                  />
                </Box>
              </Grid>
            ))}
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Correction type
              </Typography>
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                {clinicalCorrectionCategories.map((category) => {
                  const selected = Array.isArray(clinicalFeedback.correction_categories)
                    && clinicalFeedback.correction_categories.includes(category.value);
                  return (
                    <Chip
                      key={category.value}
                      label={category.label}
                      color={selected ? 'primary' : 'default'}
                      variant={selected ? 'filled' : 'outlined'}
                      onClick={() => toggleClinicalCorrectionCategory(category.value)}
                      sx={{ mb: 1 }}
                    />
                  );
                })}
              </Stack>
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Correction note"
                fullWidth
                multiline
                minRows={2}
                value={clinicalFeedback.edit_reason}
                onChange={(event) => {
                  setClinicalFeedback((prev) => ({
                    ...prev,
                    edit_reason: event.target.value,
                  }));
                }}
                size="small"
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    );
  };

  const renderOutcomeAdjudicationPanel = () => {
    const outcomes = review?.clinical_training?.recent_outcomes || [];
    if (!Array.isArray(outcomes) || outcomes.length === 0) {
      return null;
    }

    return (
      <Card variant="outlined" sx={{ mb: 3, borderColor: 'divider' }}>
        <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
            <Typography variant="subtitle1" fontWeight="bold">
              Outcome Follow-up Review
            </Typography>
            <Chip
              size="small"
              variant="outlined"
              color={review?.clinical_training?.outcome_adjudication_count ? 'success' : 'default'}
              label={`${review?.clinical_training?.outcome_adjudication_count || 0} reviewed`}
            />
          </Box>

          {outcomes.map((outcome) => {
            const latest = outcome.latest_adjudication || {};
            const payload = outcome.payload || {};
            return (
              <Box key={outcome.id} sx={{ borderTop: '1px solid', borderColor: 'divider', pt: 2, mt: 2, '&:first-of-type': { mt: 0 } }}>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', mb: 1 }}>
                  <Chip size="small" label={formatDisplayLabel(outcome.event_type)} />
                  <Chip size="small" label={formatDisplayLabel(outcome.status)} variant="outlined" />
                  {outcome.severity && <Chip size="small" color={outcome.severity === 'severe' || outcome.severity === 'emergency' ? 'warning' : 'default'} label={formatDisplayLabel(outcome.severity)} />}
                  {payload?.reporter_role && <Chip size="small" variant="outlined" label={formatDisplayLabel(payload.reporter_role)} />}
                </Box>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {outcome.notes || payload?.symptoms?.join?.(', ') || 'No follow-up note recorded.'}
                </Typography>

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      select
                      fullWidth
                      size="small"
                      label="Outcome expected"
                      value={toSelectBooleanValue(getOutcomeFieldValue(outcome, 'outcome_matches_expected'))}
                      onChange={(event) => updateOutcomeFeedback(outcome.id, { outcome_matches_expected: event.target.value })}
                    >
                      {outcomeBooleanOptions.map((option) => (
                        <MenuItem key={option.value || 'blank'} value={option.value}>{option.label}</MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      select
                      fullWidth
                      size="small"
                      label="Diagnosis held"
                      value={toSelectBooleanValue(getOutcomeFieldValue(outcome, 'diagnosis_still_correct'))}
                      onChange={(event) => updateOutcomeFeedback(outcome.id, { diagnosis_still_correct: event.target.value })}
                    >
                      {outcomeBooleanOptions.map((option) => (
                        <MenuItem key={option.value || 'blank'} value={option.value}>{option.label}</MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      select
                      fullWidth
                      size="small"
                      label="Plan held"
                      value={toSelectBooleanValue(getOutcomeFieldValue(outcome, 'plan_still_appropriate'))}
                      onChange={(event) => updateOutcomeFeedback(outcome.id, { plan_still_appropriate: event.target.value })}
                    >
                      {outcomeBooleanOptions.map((option) => (
                        <MenuItem key={option.value || 'blank'} value={option.value}>{option.label}</MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      select
                      fullWidth
                      size="small"
                      label="Action"
                      value={getOutcomeFieldValue(outcome, 'action', latest.action || 'reviewed') || 'reviewed'}
                      onChange={(event) => updateOutcomeFeedback(outcome.id, { action: event.target.value })}
                    >
                      {outcomeActionOptions.map((option) => (
                        <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                      ))}
                    </TextField>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">Prognosis accuracy</Typography>
                    <Rating
                      size="small"
                      value={Number(getOutcomeFieldValue(outcome, 'prognosis_accuracy_score')) || 0}
                      onChange={(_, value) => updateOutcomeFeedback(outcome.id, { prognosis_accuracy_score: value || null })}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">Management outcome</Typography>
                    <Rating
                      size="small"
                      value={Number(getOutcomeFieldValue(outcome, 'management_outcome_score')) || 0}
                      onChange={(_, value) => updateOutcomeFeedback(outcome.id, { management_outcome_score: value || null })}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      select
                      fullWidth
                      size="small"
                      label="Preventable"
                      value={toSelectBooleanValue(getOutcomeFieldValue(outcome, 'preventable_event'))}
                      onChange={(event) => updateOutcomeFeedback(outcome.id, { preventable_event: event.target.value })}
                    >
                      {outcomeBooleanOptions.map((option) => (
                        <MenuItem key={option.value || 'blank'} value={option.value}>{option.label}</MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Outcome severity"
                      value={getOutcomeFieldValue(outcome, 'outcome_severity', outcome.severity || '') || ''}
                      onChange={(event) => updateOutcomeFeedback(outcome.id, { outcome_severity: event.target.value })}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      multiline
                      minRows={2}
                      size="small"
                      label="Clinician interpretation"
                      value={getOutcomeFieldValue(outcome, 'clinician_notes', '') || ''}
                      onChange={(event) => updateOutcomeFeedback(outcome.id, { clinician_notes: event.target.value })}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      multiline
                      minRows={2}
                      size="small"
                      label="Next steps"
                      value={getOutcomeFieldValue(outcome, 'next_steps', '') || ''}
                      onChange={(event) => updateOutcomeFeedback(outcome.id, { next_steps: event.target.value })}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => handleSaveOutcomeAdjudication(outcome)}
                      disabled={savingOutcomeId === outcome.id}
                    >
                      {savingOutcomeId === outcome.id ? 'Saving...' : 'Save Outcome Review'}
                    </Button>
                  </Grid>
                </Grid>
              </Box>
            );
          })}
        </CardContent>
      </Card>
    );
  };

  const renderEvidenceSourceStrip = (entries, options = {}) => {
    const evidenceEntries = entries || [];
    const summary = summarizeEvidenceSources(evidenceEntries);
    if (!summary.count) return null;

    const compactView = Boolean(options.compact);
    const excerptCount = compactView ? 1 : 2;

    return (
      <Box
        sx={{
          p: compactView ? 1 : 1.5,
          mb: compactView ? 1.5 : 2,
          bgcolor: summary.needsVerification ? 'warning.lighter' : 'action.hover',
          border: '1px solid',
          borderColor: summary.needsVerification ? 'warning.light' : 'divider',
          borderRadius: 1,
        }}
      >
        <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', gap: 0.75 }}>
          {summary.sources.slice(0, 4).map((source) => (
            <Chip
              key={source.key}
              size="small"
              label={source.count > 1 ? `${source.label} (${source.count})` : source.label}
              color={source.color || 'default'}
              variant={source.variant || 'outlined'}
            />
          ))}
          {summary.confidenceLabel && (
            <Chip
              size="small"
              label={summary.confidenceLabel}
              color={summary.needsVerification ? 'warning' : 'success'}
              variant={summary.needsVerification ? 'outlined' : 'filled'}
            />
          )}
        </Stack>

        {summary.needsVerification && (
          <Typography variant="caption" sx={{ display: 'block', mt: 0.75, color: 'warning.dark' }}>
            Verify patient/caregiver-reported or AI-inferred objective findings before signing.
          </Typography>
        )}

        {evidenceEntries.slice(0, excerptCount).map((entry, index) => {
          const excerpt = getEvidenceExcerpt(entry, compactView ? 120 : 180);
          if (!excerpt) return null;
          const confidenceLabel = getEvidenceConfidenceLabel(entry);
          return (
            <Typography key={entry.id || index} variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
              {getSourceLabel(entry)}{confidenceLabel ? ` - ${confidenceLabel}` : ''}: {excerpt}
            </Typography>
          );
        })}
      </Box>
    );
  };

  const renderSOAPSection = (title, content, sectionKey, isEditing = false) => {
    if (!content && !isEditing) return null;

    const displayContent = isEditing ? (content || {}) : content;
    const displayEntries = displayContent && typeof displayContent === 'object' && !Array.isArray(displayContent)
      ? Object.entries(displayContent)
      : [['summary', displayContent]];
    const sectionEvidence = filterEvidenceForSoapField(sourceEvidenceEntries, sectionKey);
    const templateOptions = soapQuickTemplates[sectionKey] || [];

    return (
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" fontWeight="bold" gutterBottom color="primary">
          {title}
        </Typography>
        <Card elevation={2} sx={{ borderLeft: '4px solid', borderColor: 'primary.main' }}>
          <CardContent sx={{ p: { xs: 2, md: 3 } }}>
            {renderEvidenceSourceStrip(sectionEvidence)}
            {!sectionEvidence.length && isAiTriageReview(review) && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                No source map attached for this section. Verify the draft before final approval.
              </Typography>
            )}

            {displayEntries.map(([key, value]) => {
              const editedSection = isEditing ? getSoapSectionObject(editedNote?.[sectionKey], key) : {};
              const editedValue = isEditing ? (editedSection[key] ?? value) : value;
              const fieldEvidence = filterEvidenceForSoapField(sourceEvidenceEntries, sectionKey, key);
              return (
                <Box key={key} sx={{ mb: 2, '&:last-child': { mb: 0 } }}>
                  <Typography variant="subtitle2" fontWeight="bold" color="primary" gutterBottom sx={{ textTransform: 'capitalize' }}>
                    {key.replace(/_/g, ' ')}
                  </Typography>
                  {renderEvidenceSourceStrip(fieldEvidence, { compact: true })}
                  {isEditing ? (
                    <>
                      <Autocomplete
                        value={null}
                        options={templateOptions}
                        getOptionLabel={getQuickOptionLabel}
                        onChange={(event, selectedOption) => appendSoapTemplate(sectionKey, key, selectedOption)}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Insert quick template"
                            placeholder="Search snippets"
                            size="small"
                          />
                        )}
                        selectOnFocus
                        handleHomeEndKeys
                        blurOnSelect
                        sx={{ pl: 2, mb: 1 }}
                      />
                      <TextField
                        fullWidth
                        multiline
                        minRows={3}
                        value={typeof editedValue === 'object' ? JSON.stringify(editedValue, null, 2) : (editedValue || '')}
                        onChange={(e) => {
                          const newValue = e.target.value;
                          setEditedNote(prev => {
                            const currentSection = getSoapSectionObject(prev?.[sectionKey], key);
                            return {
                              ...prev,
                              [sectionKey]: {
                                ...currentSection,
                                [key]: newValue
                              }
                            };
                          });
                        }}
                        variant="outlined"
                        size="small"
                        sx={{ pl: 2 }}
                      />
                    </>
                ) : (
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                    {typeof editedValue === 'object' ? JSON.stringify(editedValue, null, 2) : (editedValue || 'Not provided')}
                  </Typography>
                )}
              </Box>
            );
          })}
        </CardContent>
      </Card>
    </Box>
  );
};

  const renderPrescriptions = (prescriptions, isEditing = false) => {
    if (!prescriptions || prescriptions.length === 0) {
      if (isEditing) {
        return (
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom color="primary">
                💊 Prescriptions
              </Typography>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={addPrescription}
                size="small"
              >
                Add Prescription
              </Button>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
              No prescriptions added yet. Click "Add Prescription" to add one.
            </Typography>
          </Box>
        );
      }
      return null;
    }

    return (
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" fontWeight="bold" gutterBottom color="primary">
            💊 Prescriptions
          </Typography>
          {isEditing && (
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={addPrescription}
              size="small"
            >
              Add Prescription
            </Button>
          )}
        </Box>
        <Grid container spacing={2}>
          {prescriptions.map((prescription, index) => (
            <Grid item xs={12} md={6} key={index}>
              <Card elevation={2} sx={{ height: '100%', borderLeft: '4px solid', borderColor: 'success.main' }}>
                <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    {isEditing ? (
                      <Autocomplete
                        freeSolo
                        options={prescriptionQuickOptions}
                        getOptionLabel={getQuickOptionLabel}
                        inputValue={prescription.medication_name || ''}
                        onInputChange={(event, newValue, reason) => {
                          if (reason === 'input' || reason === 'clear') {
                            updatePrescriptionField(index, 'medication_name', newValue);
                          }
                        }}
                        onChange={(event, selectedOption) => {
                          if (!selectedOption) {
                            updatePrescriptionField(index, 'medication_name', '');
                            return;
                          }
                          applyPrescriptionQuickOption(index, selectedOption);
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Medication"
                            placeholder="Type or pick"
                            size="small"
                          />
                        )}
                        selectOnFocus
                        handleHomeEndKeys
                        sx={{ minWidth: { xs: 0, sm: 220 }, flex: 1, mr: 1 }}
                      />
                    ) : (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Typography variant="subtitle1" fontWeight="bold" color="success.dark" gutterBottom>
                          {prescription.medication_name}
                        </Typography>
                        {isCopilotDraftPendingApproval(prescription) && (
                          <Chip label="Needs approval" size="small" color="warning" variant="outlined" sx={{ height: 22, fontWeight: 700 }} />
                        )}
                        {isCopilotActionDoctorApproved(prescription) && (
                          <Chip label="Doctor approved" size="small" color="success" variant="outlined" sx={{ height: 22, fontWeight: 700 }} />
                        )}
                      </Box>
                    )}
                    {isEditing && (
                      <IconButton
                        size="small"
                        onClick={() => deletePrescription(index)}
                        color="error"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Box>
                  <Divider sx={{ my: 1 }} />
                  <Grid container spacing={1}>
                    <Grid item xs={12} sm={6}>
                      {isEditing ? (
                        <Autocomplete
                          freeSolo
                          options={dosageQuickOptions}
                          inputValue={prescription.dosage || ''}
                          onInputChange={(event, newValue, reason) => {
                            if (reason === 'input' || reason === 'clear') {
                              updatePrescriptionField(index, 'dosage', newValue);
                            }
                          }}
                          onChange={(event, selectedOption) => {
                            updatePrescriptionField(index, 'dosage', getQuickOptionLabel(selectedOption));
                          }}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="Dosage"
                              size="small"
                              fullWidth
                            />
                          )}
                          selectOnFocus
                          handleHomeEndKeys
                          fullWidth
                        />
                      ) : (
                        <Typography variant="body2" sx={{ mb: 0.5 }}>
                          <strong>Dosage:</strong> {prescription.dosage}
                        </Typography>
                      )}
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      {isEditing ? (
                        <Autocomplete
                          freeSolo
                          options={routeQuickOptions}
                          inputValue={prescription.route || 'oral'}
                          onInputChange={(event, newValue, reason) => {
                            if (reason === 'input' || reason === 'clear') {
                              updatePrescriptionField(index, 'route', newValue);
                            }
                          }}
                          onChange={(event, selectedOption) => {
                            updatePrescriptionField(index, 'route', getQuickOptionLabel(selectedOption) || 'oral');
                          }}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="Route"
                              size="small"
                              fullWidth
                            />
                          )}
                          selectOnFocus
                          handleHomeEndKeys
                          fullWidth
                        />
                      ) : (
                        <Typography variant="body2" sx={{ mb: 0.5 }}>
                          <strong>Route:</strong> {prescription.route}
                        </Typography>
                      )}
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      {isEditing ? (
                        <Autocomplete
                          freeSolo
                          options={prescriptionIntervalQuickOptions}
                          getOptionLabel={getQuickOptionLabel}
                          value={getQuickNumberValue(prescription.interval, prescriptionIntervalQuickOptions, 'hours')}
                          onChange={(event, selectedOption) => {
                            if (!selectedOption) {
                              updatePrescriptionField(index, 'interval', 0);
                              return;
                            }
                            const selectedValue = typeof selectedOption === 'object'
                              ? selectedOption.value
                              : parseQuickNumber(selectedOption);
                            updatePrescriptionField(index, 'interval', selectedValue ?? 0);
                          }}
                          onInputChange={(event, newValue, reason) => {
                            if (reason === 'clear') {
                              updatePrescriptionField(index, 'interval', 0);
                              return;
                            }
                            if (reason === 'input') {
                              const parsedValue = parseQuickNumber(newValue);
                              if (parsedValue !== null) {
                                updatePrescriptionField(index, 'interval', parsedValue);
                              }
                            }
                          }}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="Interval"
                              size="small"
                              fullWidth
                            />
                          )}
                          selectOnFocus
                          handleHomeEndKeys
                          fullWidth
                        />
                      ) : (
                        <Typography variant="body2" sx={{ mb: 0.5 }}>
                          <strong>Interval:</strong> Every {prescription.interval} hours
                        </Typography>
                      )}
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      {isEditing ? (
                        <TextField
                          label="End Date"
                          type="date"
                          value={prescription.end_date || ''}
                          onChange={(e) => updatePrescriptionField(index, 'end_date', e.target.value)}
                          size="small"
                          fullWidth
                          InputLabelProps={{ shrink: true }}
                        />
                      ) : (
                        <Typography variant="body2" sx={{ mb: 0.5 }}>
                          <strong>End Date:</strong> {prescription.end_date}
                        </Typography>
                      )}
                    </Grid>
                    <Grid item xs={12}>
                      {isEditing ? (
                        <TextField
                          label="Instructions"
                          value={prescription.instructions || ''}
                          onChange={(e) => updatePrescriptionField(index, 'instructions', e.target.value)}
                          size="small"
                          fullWidth
                          multiline
                          rows={2}
                        />
                      ) : (
                        <Typography variant="body2" sx={{ mt: 1, p: 1, bgcolor: 'grey.100', borderRadius: 1 }}>
                          <strong>Instructions:</strong> {prescription.instructions}
                        </Typography>
                      )}
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  };

  const renderInvestigations = (investigations, isEditing = false) => {
    if (!investigations || investigations.length === 0) {
      if (isEditing) {
        return (
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom color="primary">
                🔬 Investigations
              </Typography>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={addInvestigation}
                size="small"
              >
                Add Investigation
              </Button>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
              No investigations added yet. Click "Add Investigation" to add one.
            </Typography>
          </Box>
        );
      }
      return null;
    }

    return (
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" fontWeight="bold" gutterBottom color="primary">
            🔬 Investigations
          </Typography>
          {isEditing && (
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={addInvestigation}
              size="small"
            >
              Add Investigation
            </Button>
          )}
        </Box>
        <Grid container spacing={2}>
          {investigations.map((investigation, index) => (
            <Grid item xs={12} md={6} key={index}>
              <Card elevation={2} sx={{ height: '100%', borderLeft: '4px solid', borderColor: 'info.main' }}>
                <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    {isEditing ? (
                      <Autocomplete
                        freeSolo
                        options={investigationQuickOptions}
                        getOptionLabel={getQuickOptionLabel}
                        inputValue={investigation.test_type || ''}
                        onInputChange={(event, newValue, reason) => {
                          if (reason === 'input' || reason === 'clear') {
                            updateInvestigationField(index, 'test_type', newValue);
                          }
                        }}
                        onChange={(event, selectedOption) => {
                          if (!selectedOption) {
                            updateInvestigationField(index, 'test_type', '');
                            return;
                          }
                          applyInvestigationQuickOption(index, selectedOption);
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Test"
                            placeholder="Type or pick"
                            size="small"
                          />
                        )}
                        selectOnFocus
                        handleHomeEndKeys
                        sx={{ minWidth: { xs: 0, sm: 220 }, flex: 1, mr: 1 }}
                      />
                    ) : (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Typography variant="subtitle1" fontWeight="bold" color="info.dark" gutterBottom>
                          {investigation.test_type}
                        </Typography>
                        {isCopilotDraftPendingApproval(investigation) && (
                          <Chip label="Needs approval" size="small" color="warning" variant="outlined" sx={{ height: 22, fontWeight: 700 }} />
                        )}
                        {isCopilotActionDoctorApproved(investigation) && (
                          <Chip label="Doctor approved" size="small" color="success" variant="outlined" sx={{ height: 22, fontWeight: 700 }} />
                        )}
                      </Box>
                    )}
                    {isEditing && (
                      <IconButton
                        size="small"
                        onClick={() => deleteInvestigation(index)}
                        color="error"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Box>
                  <Divider sx={{ my: 1 }} />
                  <Grid container spacing={1}>
                    <Grid item xs={12}>
                      {isEditing ? (
                        <TextField
                          label="Reason"
                          value={investigation.reason || ''}
                          onChange={(e) => updateInvestigationField(index, 'reason', e.target.value)}
                          size="small"
                          fullWidth
                          multiline
                          rows={2}
                        />
                      ) : (
                        <Typography variant="body2" sx={{ mb: 0.5 }}>
                          <strong>Reason:</strong> {investigation.reason}
                        </Typography>
                      )}
                    </Grid>
                    <Grid item xs={12}>
                      {isEditing ? (
                        <TextField
                          label="Instructions"
                          value={investigation.instructions || ''}
                          onChange={(e) => updateInvestigationField(index, 'instructions', e.target.value)}
                          size="small"
                          fullWidth
                          multiline
                          rows={2}
                        />
                      ) : (
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <strong>Instructions:</strong> {investigation.instructions}
                        </Typography>
                      )}
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      {isEditing ? (
                        <Autocomplete
                          freeSolo
                          options={investigationIntervalQuickOptions}
                          getOptionLabel={getQuickOptionLabel}
                          value={getQuickNumberValue(investigation.interval, investigationIntervalQuickOptions, 'days')}
                          onChange={(event, selectedOption) => {
                            if (!selectedOption) {
                              updateInvestigationField(index, 'interval', 0);
                              return;
                            }
                            const selectedValue = typeof selectedOption === 'object'
                              ? selectedOption.value
                              : parseQuickNumber(selectedOption);
                            updateInvestigationField(index, 'interval', selectedValue ?? 0);
                          }}
                          onInputChange={(event, newValue, reason) => {
                            if (reason === 'clear') {
                              updateInvestigationField(index, 'interval', 0);
                              return;
                            }
                            if (reason === 'input') {
                              const parsedValue = parseQuickNumber(newValue);
                              if (parsedValue !== null) {
                                updateInvestigationField(index, 'interval', parsedValue);
                              }
                            }
                          }}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="Repeat"
                              size="small"
                              fullWidth
                            />
                          )}
                          selectOnFocus
                          handleHomeEndKeys
                          fullWidth
                        />
                      ) : null}
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      {isEditing ? (
                        <TextField
                          label="Scheduled Time"
                          type="datetime-local"
                          value={investigation.scheduled_time || ''}
                          onChange={(e) => updateInvestigationField(index, 'scheduled_time', e.target.value)}
                          size="small"
                          fullWidth
                          InputLabelProps={{ shrink: true }}
                        />
                      ) : (
                        investigation.scheduled_time && (
                          <Typography variant="body2" sx={{ p: 1, bgcolor: 'grey.100', borderRadius: 1 }}>
                            <strong>Scheduled:</strong> {new Date(investigation.scheduled_time).toLocaleString()}
                          </Typography>
                        )
                      )}
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  };

  const renderOtherActions = (otherActions, isEditing = false) => {
    if (!otherActions || otherActions.length === 0) {
      if (isEditing) {
        return (
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom color="secondary.main" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ActionsIcon /> Other Clinical Actions
              </Typography>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={addOtherAction}
                size="small"
                color="secondary"
              >
                Add Action
              </Button>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
              No other actions (counselling, procedures, referrals) added yet. Click "Add Action" to add one.
            </Typography>
          </Box>
        );
      }
      return null;
    }

    return (
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" fontWeight="bold" gutterBottom color="secondary.main" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ActionsIcon /> Other Clinical Actions
          </Typography>
          {isEditing && (
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={addOtherAction}
              size="small"
              color="secondary"
            >
              Add Action
            </Button>
          )}
        </Box>
        <Grid container spacing={2}>
          {otherActions.map((action, index) => {
            let label = 'Action';
            if (action.action_type === 'counselling') label = 'Counselling';
            else if (action.action_type === 'procedure' || action.action_type === 'procedures') label = 'Procedure';
            else if (action.action_type === 'referral') label = 'Referral';

            return (
              <Grid item xs={12} md={6} key={index}>
                <Card 
                  elevation={2} 
                  sx={{ 
                    height: '100%', 
                    borderLeft: '4px solid', 
                    borderColor: action.action_type === 'counselling' 
                      ? '#ec4899' 
                      : action.action_type === 'procedure' || action.action_type === 'procedures'
                      ? '#8b5cf6' 
                      : action.action_type === 'referral'
                      ? '#fbbf24'
                      : 'grey.400'
                  }}
                >
                  <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      {isEditing ? (
                        <Box sx={{ display: 'flex', gap: 1, flex: 1, mr: 1 }}>
                          <TextField
                            select
                            label="Type"
                            value={action.action_type || 'counselling'}
                            onChange={(e) => updateOtherActionField(index, 'action_type', e.target.value)}
                            size="small"
                            sx={{ minWidth: 120 }}
                            SelectProps={{ native: true }}
                          >
                            <option value="counselling">Counselling</option>
                            <option value="procedure">Procedure</option>
                            <option value="referral">Referral</option>
                          </TextField>
                          <Autocomplete
                            freeSolo
                            options={otherActionQuickOptions}
                            getOptionLabel={getQuickOptionLabel}
                            inputValue={action.name || ''}
                            onInputChange={(event, newValue, reason) => {
                              if (reason === 'input' || reason === 'clear') {
                                updateOtherActionField(index, 'name', newValue);
                              }
                            }}
                            onChange={(event, selectedOption) => {
                              if (!selectedOption) {
                                updateOtherActionField(index, 'name', '');
                                return;
                              }
                              applyOtherActionQuickOption(index, selectedOption);
                            }}
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                label="Action"
                                placeholder="Type or pick"
                                size="small"
                              />
                            )}
                            selectOnFocus
                            handleHomeEndKeys
                            fullWidth
                          />
                        </Box>
                      ) : (
                        <Box display="flex" alignItems="center" gap={1}>
                          <Chip 
                            label={label} 
                            size="small" 
                            sx={{ 
                              height: 20, 
                              fontSize: '0.7rem', 
                              fontWeight: '700',
                              bgcolor: action.action_type === 'counselling' 
                                ? 'rgba(236, 72, 153, 0.12)' 
                                : action.action_type === 'procedure' || action.action_type === 'procedures'
                                ? 'rgba(139, 92, 246, 0.12)' 
                                : 'rgba(245, 158, 11, 0.12)',
                              color: action.action_type === 'counselling' 
                                ? '#ec4899' 
                                : action.action_type === 'procedure' || action.action_type === 'procedures'
                                ? '#8b5cf6' 
                                : '#d97706',
                              border: `1px solid ${action.action_type === 'counselling' ? 'rgba(236, 72, 153, 0.2)' : action.action_type === 'procedure' || action.action_type === 'procedures' ? 'rgba(139, 92, 246, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`
                            }} 
                          />
                          <Typography variant="subtitle1" fontWeight="bold" sx={{ color: 'text.primary' }}>
                            {action.name}
                          </Typography>
                          {isCopilotDraftPendingApproval(action) && (
                            <Chip label="Needs approval" size="small" color="warning" variant="outlined" sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700 }} />
                          )}
                          {isCopilotActionDoctorApproved(action) && (
                            <Chip label="Doctor approved" size="small" color="success" variant="outlined" sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700 }} />
                          )}
                        </Box>
                      )}
                      {isEditing && (
                        <IconButton
                          size="small"
                          onClick={() => deleteOtherAction(index)}
                          color="error"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      )}
                    </Box>
                    <Divider sx={{ my: 1 }} />
                    <Grid container spacing={1}>
                      <Grid item xs={12}>
                        {isEditing ? (
                          <TextField
                            label="Notes / Description"
                            value={action.notes || ''}
                            onChange={(e) => updateOtherActionField(index, 'notes', e.target.value)}
                            size="small"
                            fullWidth
                            multiline
                            rows={2}
                          />
                        ) : (
                          action.notes && (
                            <Typography variant="body2" sx={{ mb: 0.5 }}>
                              <strong>Notes:</strong> {action.notes}
                            </Typography>
                          )
                        )}
                      </Grid>
                      <Grid item xs={12}>
                        {isEditing ? (
                          <TextField
                            label="Scheduled Time"
                            type="datetime-local"
                            value={action.scheduled_time || ''}
                            onChange={(e) => updateOtherActionField(index, 'scheduled_time', e.target.value)}
                            size="small"
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                          />
                        ) : (
                          action.scheduled_time && (
                            <Typography variant="body2" sx={{ p: 1, bgcolor: 'grey.100', borderRadius: 1, mt: 1 }}>
                              <strong>Scheduled:</strong> {new Date(action.scheduled_time).toLocaleString()}
                            </Typography>
                          )
                        )}
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      </Box>
    );
  };

  const renderDoctorDecisionBar = () => {
    if (!review || !isAiTriageReview(review) || review.is_finalized) {
      return null;
    }

    const activeAction = Boolean(decisionBusyAction);
    const hasPendingCopilotDrafts = pendingCopilotDraftActions.length > 0;
    const primaryBlocker = approvalReadiness.blockers[0];
    const primaryWarning = hasPendingCopilotDrafts
      ? {
          label: `${pendingCopilotDraftActions.length} realtime draft clinical ${pendingCopilotDraftActions.length === 1 ? 'action needs' : 'actions need'} doctor approval.`,
        }
      : approvalReadiness.warnings[0];
    const statusLabel = hasPendingCopilotDrafts
      ? 'Draft actions need approval'
      : approvalReadiness.canApprove ? 'Ready for doctor decision' : 'Needs validation';
    const statusColor = approvalReadiness.canApprove && !hasPendingCopilotDrafts ? 'success' : 'warning';

    return (
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: (themeValue) => themeValue.zIndex.appBar - 1,
          mb: 3,
          p: { xs: 1.25, md: 1.5 },
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: approvalReadiness.canApprove && !hasPendingCopilotDrafts ? 'success.light' : 'warning.light',
          borderRadius: 1,
          boxShadow: '0 8px 24px rgba(15, 23, 42, 0.12)',
        }}
      >
        <Stack
          direction={{ xs: 'column', lg: 'row' }}
          spacing={1.25}
          alignItems={{ xs: 'stretch', lg: 'center' }}
          justifyContent="space-between"
        >
          <Box sx={{ minWidth: 0 }}>
            <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', gap: 0.75, mb: 0.75 }}>
              <Chip size="small" label={statusLabel} color={statusColor} variant={approvalReadiness.canApprove && !hasPendingCopilotDrafts ? 'filled' : 'outlined'} />
              <Chip size="small" label={`${approvalReadiness.evidenceEntries.length} source anchors`} variant="outlined" />
              {hasPendingCopilotDrafts && (
                <Chip size="small" label={`${pendingCopilotDraftActions.length} drafts pending`} color="warning" variant="outlined" />
              )}
              <Chip
                size="small"
                label={`${approvalReadiness.missingInformation.length} missing`}
                color={approvalReadiness.missingInformation.length ? 'warning' : 'default'}
                variant="outlined"
              />
              <Chip
                size="small"
                label={`${approvalReadiness.riskFlags.length} risk flags`}
                color={approvalReadiness.riskFlags.length ? 'warning' : 'default'}
                variant="outlined"
              />
              <Chip
                size="small"
                label={`Quality ${aiGovernanceSignals.shortLabel}`}
                color={aiGovernanceSignals.color}
                variant={aiGovernanceSignals.variant}
              />
              <Chip
                size="small"
                label={`${aiGovernanceSignals.editBurden.percentChanged}% edits`}
                color={aiGovernanceSignals.editBurden.color}
                variant="outlined"
              />
            </Stack>
            {(primaryBlocker || primaryWarning) && (
              <Typography variant="caption" color={primaryBlocker ? 'warning.dark' : 'text.secondary'}>
                {primaryBlocker?.label || primaryWarning?.label}
              </Typography>
            )}
          </Box>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ flexShrink: 0 }}>
            <Button
              variant="contained"
              color="success"
              size="small"
              startIcon={decisionBusyAction === 'approve_as_is' ? <CircularProgress size={16} color="inherit" /> : <CheckCircleIcon />}
              onClick={handleApproveAiTriageAsIs}
              disabled={activeAction || !approvalReadiness.canApprove || hasPendingCopilotDrafts}
            >
              Approve
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<EditIcon />}
              onClick={handleEditAiTriageDraft}
              disabled={activeAction}
            >
              Edit
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<HelpOutlineIcon />}
              onClick={() => handleOpenMoreInfoDialog()}
              disabled={activeAction}
            >
              Ask Patient
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<SmartToyIcon />}
              onClick={handleStartLiveClarification}
              disabled={activeAction}
            >
              Start Live
            </Button>
            <Button
              variant="outlined"
              color="warning"
              size="small"
              startIcon={<WarningIcon />}
              onClick={handleEscalateAiTriage}
              disabled={activeAction}
            >
              Escalate
            </Button>
          </Stack>
        </Stack>
      </Box>
    );
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!review) {
    return (
      <Container>
        <Typography>Review not found</Typography>
      </Container>
    );
  }

  const hasEncounter = review?.in_person_encounters && review.in_person_encounters.length > 0;
  const encounter = hasEncounter ? review.in_person_encounters[0] : null;

  const content = (
    <>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        {!embedded && (
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/reviews')}
            sx={{ mb: 2 }}
          >
            Back to Reviews
          </Button>
        )}
        
        <Box display="flex" flexDirection={isMobile ? 'column' : 'row'} justifyContent="space-between" alignItems={isMobile ? 'flex-start' : 'center'} gap={2}>
          <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
            <Typography variant={isMobile ? "h5" : "h4"} fontWeight="bold">
              Medical Review
            </Typography>
            <Chip
              icon={review.is_finalized ? <CheckCircleIcon /> : null}
              label={review.is_finalized ? 'Finalized' : 'Pending'}
              color={review.is_finalized ? 'success' : 'warning'}
            />
            {!hasEncounter && (
              <Chip
                icon={<WarningIcon />}
                label="No Encounter"
                color="error"
                variant="outlined"
              />
            )}
            {review.conducted_by_ai && (
              <Chip
                icon={<SmartToyIcon />}
                label="AI Generated"
                color="info"
                variant="outlined"
              />
            )}
            {isAiTriageReview(review) && (
              <Chip
                icon={<SmartToyIcon />}
                label={getReviewOrigin(review) === 'hybrid' ? 'Hybrid Workflow' : 'AI Triage'}
                color="info"
                variant="outlined"
              />
            )}
            {(() => {
              const urgency = getUrgencyConfig(review);
              if (!['urgent', 'emergency', 'critical'].includes(urgency.value)) {
                return null;
              }
              return (
                <Chip
                  icon={<WarningIcon />}
                  label={urgency.label}
                  color={urgency.color}
                  variant="outlined"
                />
              );
            })()}
            {liveVisualCaptureCount > 0 && (
              <Chip
                icon={<PhotoCameraIcon />}
                label={`${liveVisualCaptureCount} Live ${liveVisualCaptureCount === 1 ? 'Capture' : 'Captures'}`}
                color="info"
                variant="outlined"
              />
            )}
            {liveVisitReadinessConfig.label && (effectiveLiveVisitEntries.length > 0 || callbackStatus !== 'none') && (
              <Chip
                icon={<ScheduleIcon />}
                label={liveVisitReadinessConfig.label}
                color={liveVisitReadinessConfig.chipColor}
                variant="outlined"
              />
            )}
          </Box>
          <Box display="flex" gap={1}>
            <Button
              variant="contained"
              startIcon={<SmartToyIcon />}
              onClick={() => setShowCopilotDashboard(true)}
              size="small"
              sx={{
                background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)',
                boxShadow: '0 4px 14px rgba(79, 70, 229, 0.4)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #4338ca 0%, #2563eb 100%)',
                  boxShadow: '0 6px 20px rgba(79, 70, 229, 0.6)'
                },
                textTransform: 'none',
                fontWeight: 'bold',
                borderRadius: 2
              }}
            >
              AI Live Copilot
            </Button>
            <Button
              variant="outlined"
              startIcon={<ScheduleIcon />}
              onClick={() => openBookingModal({
                initialChannel: callbackBookingRequest?.channel || callbackAppointment?.channel || 'audio',
                initialReason: callbackBookingRequest?.reason || callbackAppointment?.reason || '',
                title: callbackStatus === 'booking_requested'
                  ? 'Re-send Booking Request'
                  : 'Request Patient Booking',
                description: callbackStatus === 'booking_requested'
                  ? 'Re-send the self-booking link if the patient still needs it or you want to change the preferred channel.'
                  : callbackStatus === 'payment_pending' || callbackStatus === 'scheduled'
                    ? 'Ask the patient to choose a new time themselves if the current callback should be changed.'
                    : 'Send the patient a booking link so they can choose a convenient time themselves.',
              })}
              size="small"
            >
              {callbackStatus === 'booking_requested' ? 'Re-send Booking Request' : 'Request Patient Booking'}
            </Button>
            {review.is_finalized && (
              <Button
                variant="outlined"
                startIcon={<ContentCopyIcon />}
                onClick={handleCopyNote}
                size="small"
              >
                {copySuccess ? 'Copied!' : 'Copy Note'}
              </Button>
            )}
          </Box>
        </Box>
      </Box>

      {/* Processing Status Banner */}
      {(() => {
        const currentStatus = currentProcessingStatus;
        if (currentStatus === 'uploading') {
          return (
            <Alert 
              severity="info" 
              icon={<CloudUploadIcon />}
              sx={{ mb: 3, animation: 'pulse 2s infinite' }}
            >
              <Typography variant="subtitle1" fontWeight="bold">
                Uploading audio...
              </Typography>
              <Typography variant="body2">
                We are securely uploading the recording prior to processing the documentation.
              </Typography>
            </Alert>
          );
        }
        if (currentStatus === 'processing') {
          return (
            <Alert 
              severity="warning" 
              icon={<AutorenewIcon />}
              sx={{ mb: 3, animation: 'pulse 2s infinite' }}
            >
              <Typography variant="subtitle1" fontWeight="bold">
                Processing Documentation...
              </Typography>
              <Typography variant="body2">
                AI is analyzing the audio and generating documentation. This typically takes 60-90 seconds.
              </Typography>
            </Alert>
          );
        }
        return null;
      })()}

      {renderDoctorDecisionBar()}

      {isAiTriageReview(review) && !review.is_finalized && (
        <AiTriageApprovalCockpit
          review={review}
          patientData={patientData}
          busyAction={decisionBusyAction}
          actionError={decisionError}
          onApproveAsIs={handleApproveAiTriageAsIs}
          onEditDraft={handleEditAiTriageDraft}
          onRequestMoreInfo={handleOpenMoreInfoDialog}
          onStartLiveClarification={handleStartLiveClarification}
          onEscalate={handleEscalateAiTriage}
        />
      )}

      {(isAiTriageReview(review) || !review.is_finalized || Array.isArray(review.workflow_events)) && (
        <DoctorWorkflowAuditTrail review={review} />
      )}

      <PatientFollowThroughPanel
        review={review}
        patientData={patientData}
        onRefresh={fetchReviewDetail}
      />

      {/* Workflow Status Card */}
      {!review.is_finalized && (
        <Card sx={{ 
          mb: 3, 
          background: (hasEncounter || currentEncounter) 
            ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' 
            : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' 
        }}>
          <CardContent>
            <Typography variant="h6" color="white" gutterBottom fontWeight="bold">
              {(hasEncounter || currentEncounter) ? 'Review Workflow' : 
               review.conducted_by_ai ? 'AI Review - Ready for Finalization' : 'Complete These Steps'}
            </Typography>
            <Typography variant="body2" color="white" sx={{ mb: 2, opacity: 0.9 }}>
              {currentEncounter 
                ? (review.doctor_note 
                    ? `Encounter ID: ${currentEncounter.public_id.substring(0, 8)}... - Documentation ready. Record a new encounter or finalize the current one.`
                    : `Encounter ID: ${currentEncounter.public_id.substring(0, 8)}... - Now record the consultation`)
                : hasEncounter 
                  ? (review.doctor_note ? 'This review has an encounter. You can now save it.' : 'This review has an encounter but no documentation. Record a new encounter to create documentation.')
                  : review.conducted_by_ai 
                    ? 'This review was generated by AI. Review the documentation and finalize when ready.'
                    : 'Create and process an encounter before saving this review'}
            </Typography>
            {(currentProcessingStatus === 'uploading' || currentProcessingStatus === 'processing') && (
              <Chip
                icon={currentProcessingStatus === 'uploading' ? <CloudUploadIcon /> : <AutorenewIcon />}
                label={currentProcessingStatus === 'uploading' ? 'Uploading audio...' : 'Processing documentation...'}
                color={currentProcessingStatus === 'uploading' ? 'info' : 'warning'}
                size="small"
                sx={{
                  mb: 2,
                  bgcolor: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  '& .MuiChip-icon': { color: 'white' }
                }}
              />
            )}
            <Grid container spacing={2} sx={{ mb: 1 }}>
              <Grid item xs={12} sm={review.doctor_note ? 6 : 12}>
                <Button
                  variant="contained"
                  startIcon={<SmartToyIcon />}
                  onClick={() => setShowCopilotDashboard(true)}
                  fullWidth
                  sx={{ 
                    background: 'linear-gradient(135deg, #ffffff 0%, #f3f4f6 100%)',
                    color: '#4f46e5',
                    fontWeight: 'bold',
                    textTransform: 'none',
                    py: 1.2,
                    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.1)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #f9fafb 0%, #e5e7eb 100%)',
                      boxShadow: '0 6px 18px rgba(0, 0, 0, 0.15)'
                    }
                  }}
                >
                  Start Real-Time AI Copilot (Recommended)
                </Button>
              </Grid>
              {review.doctor_note && (
                <Grid item xs={12} sm={6}>
                  <Button
                    variant="contained"
                    startIcon={<CheckCircleIcon />}
                    onClick={handleFinalize}
                    disabled={saving}
                    fullWidth
                    sx={{ 
                      bgcolor: 'success.main',
                      color: 'white',
                      fontWeight: 'bold',
                      textTransform: 'none',
                      py: 1.2,
                      '&:hover': { bgcolor: 'success.dark' },
                      '&:disabled': { bgcolor: 'rgba(255,255,255,0.3)', color: 'rgba(255,255,255,0.7)' }
                    }}
                  >
                    {saving ? 'Finalizing...' : 'Finalize & Save Review'}
                  </Button>
                </Grid>
              )}
            </Grid>

            <Box display="flex" mt={1.5}>
              <Button
                variant="text"
                color="inherit"
                size="small"
                onClick={() => setShowLegacyFallback(!showLegacyFallback)}
                sx={{ 
                  color: 'rgba(255,255,255,0.85)', 
                  textTransform: 'none',
                  fontSize: '0.8rem',
                  '&:hover': { color: 'white', bgcolor: 'rgba(255,255,255,0.1)' }
                }}
                startIcon={<MicIcon sx={{ transform: showLegacyFallback ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />}
              >
                {showLegacyFallback ? 'Hide Offline / Dictation Fallbacks' : 'Show Offline / Dictation Fallbacks (Record Audio)'}
              </Button>
            </Box>

            {showLegacyFallback && (
              <Box sx={{ mt: 2, pt: 2, borderTop: '1px dashed rgba(255,255,255,0.2)' }}>
                <Typography variant="caption" color="white" sx={{ display: 'block', mb: 2, opacity: 0.85, lineHeight: 1.4 }}>
                  <strong>Offline Mode:</strong> Allows you to create an encounter file and record audio locally on your device (or upload an existing audio file) when hospital internet is unstable or if you prefer post-visit dictation.
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={() => setShowCreateModal(true)}
                      disabled={hasEncounter || currentEncounter}
                      fullWidth
                      sx={{ 
                        bgcolor: (hasEncounter || currentEncounter) ? 'rgba(255,255,255,0.2)' : 'white',
                        color: (hasEncounter || currentEncounter) ? 'white' : 'primary.main',
                        '&:hover': { bgcolor: (hasEncounter || currentEncounter) ? 'rgba(255,255,255,0.3)' : 'grey.100' }
                      }}
                    >
                      {(hasEncounter || currentEncounter) ? '✓ Encounter File Created' : '1. Create Encounter File'}
                    </Button>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Button
                      variant="contained"
                      startIcon={creatingEncounter ? <CircularProgress size={20} color="inherit" /> : <MicIcon />}
                      onClick={handleRecordClick}
                      disabled={creatingEncounter || review.is_finalized || currentProcessingStatus === 'uploading' || currentProcessingStatus === 'processing'}
                      fullWidth
                      sx={{ 
                        bgcolor: (currentEncounter || hasEncounter) ? 'white' : 'rgba(255,255,255,0.2)',
                        color: (currentEncounter || hasEncounter) ? 'primary.main' : 'white',
                        '&:hover': { bgcolor: (currentEncounter || hasEncounter) ? 'grey.100' : 'rgba(255,255,255,0.3)' },
                        '&:disabled': { opacity: 0.5 }
                      }}
                    >
                      {creatingEncounter ? 'Creating...' : 
                       review.in_person_encounters && review.in_person_encounters.length > 0 ? '2. Record / Upload New Audio' : '2. Record / Upload Audio'}
                    </Button>
                  </Grid>
                </Grid>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {/* Patient Info */}
      <Card sx={{ mb: 3 }} elevation={3}>
        <CardContent sx={{ p: { xs: 2, md: 3 } }}>
          <Typography variant="h6" fontWeight="bold" gutterBottom color="primary">
            Patient Information
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                <strong>Name:</strong> {(review.patient_first_name || review.patient_last_name) ? `${review.patient_first_name || ''} ${review.patient_last_name || ''}`.trim() : 'Not specified'}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                <strong>Doctor:</strong> {review.doctor_name}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                <strong>Phone:</strong> {review.patient_phone_number || 'Not specified'}
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary">
                <strong>Chief Complaint:</strong> {review.chief_complaint || 'Not specified'}
              </Typography>
            </Grid>
            {encounter && (
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary">
                  <strong>Encounter Date:</strong> {new Date(encounter.encounter_date).toLocaleString()}
                </Typography>
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>

      {(review.patient_summary || effectiveLiveVisitEntries.length > 0) && (
        <Card sx={{ mb: 3 }} elevation={3}>
          <CardContent sx={{ p: { xs: 2, md: 3 } }}>
            <Box
              display="flex"
              flexDirection={isMobile ? 'column' : 'row'}
              justifyContent="space-between"
              alignItems={isMobile ? 'flex-start' : 'center'}
              gap={1.5}
              sx={{ mb: 2 }}
            >
              <Typography variant="h6" fontWeight="bold" color="primary">
                Live Visit Context
              </Typography>
              <Box display="flex" gap={1} flexWrap="wrap">
                {liveTranscriptCount > 0 && (
                  <Chip
                    label={`${liveTranscriptCount} Transcript ${liveTranscriptCount === 1 ? 'Entry' : 'Entries'}`}
                    size="small"
                    variant="outlined"
                  />
                )}
                {liveToolActivity.length > 0 && (
                  <Chip
                    label={`${liveToolActivity.length} Tool ${liveToolActivity.length === 1 ? 'Update' : 'Updates'}`}
                    size="small"
                    variant="outlined"
                  />
                )}
                {liveVisualCaptures.length > 0 && (
                  <Chip
                    icon={<PhotoCameraIcon />}
                    label={`${liveVisualCaptures.length} Visual ${liveVisualCaptures.length === 1 ? 'Capture' : 'Captures'}`}
                    size="small"
                    color="info"
                    variant="outlined"
                  />
                )}
              </Box>
            </Box>
            <Divider sx={{ mb: 2 }} />

            {usingMockLiveVisitPreview && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 0.5 }}>
                  Mock Live Visit Preview
                </Typography>
                <Typography variant="body2">
                  Showing localhost-only seeded live-visit artifacts because this review does not currently have production visual captures.
                </Typography>
              </Alert>
            )}

            {(liveVisitReadinessConfig.label || callbackSummaryText) && (
              <Alert
                severity={callbackStatusConfig.label ? callbackStatusConfig.severity : liveVisitReadinessConfig.severity}
                sx={{ mb: 2 }}
              >
                <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: callbackSummaryText ? 0.5 : 0 }}>
                  {callbackStatusConfig.label || liveVisitReadinessConfig.label}
                </Typography>
                {callbackSummaryText && (
                  <Typography variant="body2">
                    {callbackSummaryText}
                  </Typography>
                )}
                {callbackAppointment && (
                  <Box display="flex" gap={1} flexWrap="wrap" sx={{ mt: 1.5 }}>
                    {callbackAppointment.channel && (
                      <Chip
                        label={formatDisplayLabel(callbackAppointment.channel)}
                        size="small"
                        variant="outlined"
                      />
                    )}
                    {callbackAppointment.status && (
                      <Chip
                        label={formatDisplayLabel(callbackAppointment.status)}
                        size="small"
                        variant="outlined"
                      />
                    )}
                    {callbackAppointment.payment_status && (
                      <Chip
                        label={`Payment ${formatDisplayLabel(callbackAppointment.payment_status)}`}
                        size="small"
                        variant="outlined"
                      />
                    )}
                  </Box>
                )}
                            {callbackBookingRequest && !callbackAppointment && (
                              <Box display="flex" gap={1} flexWrap="wrap" sx={{ mt: 1.5 }}>
                                {callbackBookingRequest.channel && (
                                  <Chip
                                    label={`Preferred ${formatDisplayLabel(callbackBookingRequest.channel)}`}
                                    size="small"
                                    variant="outlined"
                                  />
                                )}
                                {callbackBookingRequest.delivery_mode && (
                                  <Chip
                                    label={`Sent via ${formatDisplayLabel(callbackBookingRequest.delivery_mode)}`}
                                    size="small"
                                    variant="outlined"
                                  />
                                )}
                              </Box>
                            )}
              </Alert>
            )}

            {review.patient_summary && (
              <Alert severity="info" sx={{ mb: liveVisualCaptures.length > 0 || recentLiveActivity.length > 0 ? 2 : 0 }}>
                <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 0.5 }}>
                  Patient Summary
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {review.patient_summary}
                </Typography>
              </Alert>
            )}

            {liveVisualCaptures.length > 0 && (
              <Box sx={{ mb: recentLiveActivity.length > 0 ? 3 : 0 }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Visual Captures
                </Typography>
                <Grid container spacing={2}>
                  {liveVisualCaptures.map((capture, index) => {
                    const captureTime = capture.time || capture.at;
                    const captureStatus = capture.upload_status || capture.status || 'saved';
                    return (
                      <Grid item xs={12} md={6} key={capture.id || capture.asset_url || index}>
                        <Card variant="outlined" sx={{ height: '100%' }}>
                          <Box
                            sx={{
                              height: 220,
                              bgcolor: 'grey.100',
                              overflow: 'hidden',
                            }}
                          >
                            <Box
                              component="img"
                              src={capture.asset_url}
                              alt={capture.label || 'Live visual capture'}
                              sx={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                display: 'block',
                              }}
                            />
                          </Box>
                          <CardContent>
                            <Box display="flex" gap={1} flexWrap="wrap" sx={{ mb: 1.5 }}>
                              {capture.purpose && (
                                <Chip
                                  label={formatDisplayLabel(capture.purpose)}
                                  size="small"
                                  variant="outlined"
                                />
                              )}
                              <Chip
                                label={formatDisplayLabel(captureStatus)}
                                size="small"
                                color={captureStatus === 'shared' ? 'success' : 'default'}
                              />
                              {capture.sent_to_model && (
                                <Chip
                                  label="Shared With Model"
                                  size="small"
                                  color="info"
                                  variant="outlined"
                                />
                              )}
                            </Box>
                            <Typography variant="subtitle2" fontWeight="bold">
                              {capture.label || 'Visual exam capture'}
                            </Typography>
                            {capture.note && (
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ mt: 1, mb: 1.5, whiteSpace: 'pre-wrap' }}
                              >
                                {capture.note}
                              </Typography>
                            )}
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
                              Captured {formatEntryTimestamp(captureTime)}
                            </Typography>
                            <Button
                              variant="outlined"
                              size="small"
                              href={capture.asset_url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Open Image
                            </Button>
                          </CardContent>
                        </Card>
                      </Grid>
                    );
                  })}
                </Grid>
              </Box>
            )}

            {recentLiveActivity.length > 0 && (
              <Box>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Recent Live Session Activity
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {recentLiveActivity.map((entry, index) => {
                    const timestamp = entry.time || entry.at;
                    const title = entry.kind === 'visual_capture'
                      ? (entry.label || 'Visual capture')
                      : (entry.title || formatDisplayLabel(entry.name) || 'Tool activity');
                    const detail = entry.message || entry.content || entry.note || 'No additional detail provided.';
                    const badgeLabel = entry.kind === 'visual_capture'
                      ? 'Visual'
                      : formatDisplayLabel(entry.stage || entry.level || 'info');

                    return (
                      <Card key={entry.id || `${entry.kind}-${index}`} variant="outlined">
                        <CardContent sx={{ '&:last-child': { pb: 2 } }}>
                          <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={2}>
                            <Box>
                              <Typography variant="subtitle2" fontWeight="bold">
                                {title}
                              </Typography>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}
                              >
                                {detail}
                              </Typography>
                            </Box>
                            <Chip label={badgeLabel} size="small" variant="outlined" />
                          </Box>
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                            {formatEntryTimestamp(timestamp)}
                          </Typography>
                        </CardContent>
                      </Card>
                    );
                  })}
                </Box>
              </Box>
            )}

            {followUpRecommendations.length > 0 && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Follow-up Actions
                </Typography>
                <Alert severity={review.is_finalized ? 'info' : 'warning'} sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    {callbackStatus === 'payment_pending' || callbackStatus === 'scheduled'
                      ? 'A linked callback appointment is already on record. Send a new booking request only if the patient should choose a different time themselves.'
                      : callbackStatus === 'booking_requested'
                        ? 'A booking request has already been sent. Re-send it only if the patient still needs the link or you want to change the preferred channel.'
                        : 'Use the live summary and artifacts above to decide whether the patient should self-book a follow-up after this review.'}
                  </Typography>
                </Alert>
                <Grid container spacing={2}>
                  {followUpRecommendations.map((action) => (
                    <Grid item xs={12} md={6} key={action.key}>
                      <Card variant="outlined" sx={{ height: '100%' }}>
                        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, height: '100%' }}>
                          <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={1}>
                            <Typography variant="subtitle2" fontWeight="bold">
                              {action.title}
                            </Typography>
                            <Chip label={formatDisplayLabel(action.channel)} size="small" color={action.severity} variant="outlined" />
                          </Box>
                          <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
                            {action.description}
                          </Typography>
                          <Button
                            variant="outlined"
                            startIcon={action.icon}
                            onClick={() => openBookingModal({
                              initialChannel: action.channel,
                              initialReason: action.reason,
                              title: action.title,
                              description: action.description,
                            })}
                          >
                            {action.title}
                          </Button>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {/* Doctor's Note */}
      {review.doctor_note && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h5" fontWeight="bold" color="primary">
              Doctor's Note
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {pendingCopilotDraftActions.length > 0 && !review.is_finalized && (
                <Button
                  variant="contained"
                  color="warning"
                  startIcon={<CheckCircleIcon />}
                  onClick={handleApproveCopilotDraftActions}
                  size="small"
                >
                  Approve {pendingCopilotDraftActions.length} Draft{pendingCopilotDraftActions.length === 1 ? '' : 's'}
                </Button>
              )}
              {!editingNote ? (
                <>
                  <Button
                    variant="outlined"
                    startIcon={<ContentCopyIcon />}
                    onClick={handleCopyNote}
                    size="small"
                    color={copySuccess ? "success" : "primary"}
                  >
                    {copySuccess ? 'Copied!' : 'Copy Note'}
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={handleEditNote}
                    size="small"
                    disabled={review.is_finalized}
                  >
                    Edit Note
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={handleSaveNote}
                    size="small"
                  >
                    Save
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={handleCancelEdit}
                    size="small"
                  >
                    Cancel
                  </Button>
                </>
              )}
            </Box>
          </Box>
          {pendingCopilotDraftActions.length > 0 && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="body2" fontWeight="bold">
                Realtime draft clinical actions require doctor approval before finalization or patient follow-through.
              </Typography>
              <Typography variant="caption" sx={{ display: 'block' }}>
                Pending: {pendingCopilotDraftActions.slice(0, 5).map((item) => item.label).join(', ')}
                {pendingCopilotDraftActions.length > 5 ? `, +${pendingCopilotDraftActions.length - 5} more` : ''}
              </Typography>
            </Alert>
          )}
          {renderClinicalFeedbackPanel()}
          {renderOutcomeAdjudicationPanel()}
          {renderSOAPSection('Subjective', review.doctor_note.subjective, 'subjective', editingNote)}
          {renderSOAPSection('Objective', review.doctor_note.objective, 'objective', editingNote)}
          {renderSOAPSection('Assessment', review.doctor_note.assessment, 'assessment', editingNote)}
          {renderSOAPSection('Plan', review.doctor_note.plan, 'plan', editingNote)}
          {renderPrescriptions(editingNote ? (editedNote?.prescription || []) : (review.doctor_note?.prescription || []), editingNote)}
          {renderInvestigations(editingNote ? (editedNote?.investigation || []) : (review.doctor_note?.investigation || []), editingNote)}
          {renderOtherActions(editingNote ? (editedNote?.other_actions || []) : (review.doctor_note?.other_actions || []), editingNote)}
        </Box>
      )}

      {/* No Content Warning */}
      {!review.doctor_note && (
        <Card sx={{ mb: 3, bgcolor: 'warning.lighter' }}>
          <CardContent>
            <Box display="flex" gap={2} alignItems="center">
              <WarningIcon color="warning" fontSize="large" />
              <Box>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  No Documentation Available
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  This review doesn't have any medical documentation yet. Please process an encounter to generate notes.
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Finalize Dialog */}
      <Dialog open={showFinalizeDialog} onClose={() => setShowFinalizeDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Finalize Encounter</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              Please confirm or update patient information before finalizing.
            </Typography>
            {(review.patient_summary || liveVisualCaptures.length > 0) && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                {liveVisualCaptures.length > 0
                  ? `This live visit includes ${liveVisualCaptures.length} visual ${liveVisualCaptures.length === 1 ? 'capture' : 'captures'}. `
                  : ''}
                Review the live visit summary and artifacts on this page before completing finalization.
              </Typography>
            )}
          </Alert>
          
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="First Name"
                fullWidth
                value={patientData.first_name}
                onChange={(e) => setPatientData({ ...patientData, first_name: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Last Name"
                fullWidth
                value={patientData.last_name}
                onChange={(e) => setPatientData({ ...patientData, last_name: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Phone Number"
                fullWidth
                value={patientData.phone}
                onChange={(e) => setPatientData({ ...patientData, phone: e.target.value })}
                onBlur={(e) => {
                  const converted = convertToInternationalFormat(e.target.value);
                  if (converted !== e.target.value) {
                    setPatientData({ ...patientData, phone: converted });
                  }
                }}
                placeholder="+2347012345678 or 08012345678"
                helperText="Enter in national format (080...) or international format (+234...) - will be converted automatically"
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Email (Optional)"
                fullWidth
                type="email"
                value={patientData.email}
                onChange={(e) => setPatientData({ ...patientData, email: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowFinalizeDialog(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleFinalizeEncounter}
            variant="contained"
            disabled={saving || !patientData.first_name || !patientData.last_name || !patientData.phone}
            startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
          >
            {saving ? 'Finalizing...' : 'Finalize'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Request More Information Dialog */}
      <Dialog open={showMoreInfoDialog} onClose={() => setShowMoreInfoDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Request More Information</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              Send targeted clarification questions back to the patient or caregiver before approving this AI triage review.
            </Typography>
          </Alert>
          <Stack spacing={2}>
            {moreInfoQuestions.map((item, index) => (
              <Box key={`more-info-${index}`} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={7}>
                    <TextField
                      label="Question"
                      fullWidth
                      multiline
                      minRows={2}
                      value={item.question}
                      onChange={(event) => {
                        setMoreInfoQuestions((prev) => prev.map((question, questionIndex) => (
                          questionIndex === index ? { ...question, question: event.target.value } : question
                        )));
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={5}>
                    <TextField
                      label="Reason"
                      fullWidth
                      multiline
                      minRows={2}
                      value={item.reason}
                      onChange={(event) => {
                        setMoreInfoQuestions((prev) => prev.map((question, questionIndex) => (
                          questionIndex === index ? { ...question, reason: event.target.value } : question
                        )));
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Button
                      color="error"
                      size="small"
                      onClick={() => {
                        setMoreInfoQuestions((prev) => prev.filter((_, questionIndex) => questionIndex !== index));
                      }}
                    >
                      Remove Question
                    </Button>
                  </Grid>
                </Grid>
              </Box>
            ))}
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => {
                setMoreInfoQuestions((prev) => [
                  ...prev,
                  { question: '', reason: '' },
                ]);
              }}
            >
              Add Question
            </Button>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowMoreInfoDialog(false)} disabled={decisionBusyAction === 'request_more_info'}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmitMoreInfoRequest}
            disabled={decisionBusyAction === 'request_more_info'}
          >
            {decisionBusyAction === 'request_more_info' ? 'Sending...' : 'Send Questions'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Book Appointment Modal */}
      <BookAppointmentModal
        open={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        patientId={review?.patient || review?.patient_id}
        reviewId={review?.id}
        reviewPublicId={publicId}
        patientName={`${patientData.first_name || ''} ${patientData.last_name || ''}`.trim() || 'Patient'}
        initialReason={bookingPreset.initialReason}
        initialChannel={bookingPreset.initialChannel}
        title={bookingPreset.title}
        description={bookingPreset.description}
        onSuccess={(data) => {
          console.log('Patient booking request sent:', data);
          fetchReviewDetail();
          if (onUpdate) {
            onUpdate();
          }
        }}
      />

      {/* Create Encounter Modal */}
      <CreateEncounterModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        medicalReviewId={review?.id}
        onSuccess={handleEncounterSuccess}
      />

      {/* Recording Modal */}
      <RecordingModal
        open={showRecordingModal}
        onClose={() => setShowRecordingModal(false)}
        encounterId={currentEncounter?.public_id || encounter?.public_id}
        encounterData={currentEncounter || encounter}
        patientPrefill={patientData}
        reviewId={publicId}
        onComplete={fetchReviewDetail}
        existingNote={existingNote}
        existingTranscript={existingTranscript}
      />

      {/* AI Consultation Chat */}
      <AiConsultationChat
        key={chatRefreshTrigger}
        reviewPublicId={publicId}
        enabled={true}
        requireExistingThread={true}
        patientId={review?.patient || review?.patient_id}
      />

      {/* Live Copilot Dashboard Overlay */}
      <LiveCopilotDashboard
        open={showCopilotDashboard}
        onClose={() => setShowCopilotDashboard(false)}
        patientName={(review?.patient_first_name || review?.patient_last_name) ? `${review.patient_first_name || ''} ${review.patient_last_name || ''}`.trim() : 'Jane Doe'}
        chiefComplaint={review?.chief_complaint || 'General consultation'}
        continuityBrief={review?.patient_summary || review?.post_call_continuity_capsule || review?.live_call_brief || 'No prior visit summaries in EMR.'}
        patientAge={review?.patient_age || review?.age || 'Unspecified'}
        publicId={publicId}
        patientId={review?.patient || review?.patient_id}
        mode={liveCopilotMode}
        reviewOrigin={getReviewOrigin(review)}
        triageContext={{
          urgency: getUrgencyConfig(review),
          missingInformation: buildMoreInfoQuestions(review),
          riskFlags: getRiskFlags(review),
          evidenceEntries: sourceEvidenceEntries,
          approvalReadiness,
          generatedNote: getGeneratedNote(review),
          patientStory: getPatientStory(review),
          submitter: {
            submitted_by: review?.submitted_by || review?.source_channel || '',
            caregiver_relationship: review?.caregiver_relationship || '',
            caregiver_name: caregiverContext.caregiverName || '',
            patient_present: caregiverContext.patientPresent,
            patient_identity_confirmed: caregiverContext.patientIdentityConfirmed,
            authorized_recipient: caregiverContext.authorizedRecipient,
          },
        }}
        onSync={handleSyncCopilotOrders}
      />
    </>
  );

  if (embedded) {
    return (
      <Box sx={{ py: { xs: 2, md: 4 }, px: { xs: 2, md: 3 } }}>
        {content}
      </Box>
    );
  }

  return (
    <>
      <Container 
        maxWidth="lg" 
        sx={{ 
          py: { xs: 2, md: 4 }, 
          px: { xs: 1, sm: 2, md: 3 },
          maxWidth: '100%',
          width: '100%',
        }}
      >
        {content}
      </Container>




    </>
  );
};

export default ReviewDetail;
