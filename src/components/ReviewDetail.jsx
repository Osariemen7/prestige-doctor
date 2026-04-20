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
  IconButton
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  Call as CallIcon,
  CheckCircle as CheckCircleIcon,
  Add as AddIcon,
  Mic as MicIcon,
  Warning as WarningIcon,
  Autorenew as AutorenewIcon,
  Edit as EditIcon,
  ContentCopy as ContentCopyIcon,
  CloudUpload as CloudUploadIcon,
  SmartToy as SmartToyIcon,
  Delete as DeleteIcon,
  Schedule as ScheduleIcon,
  PhotoCamera as PhotoCameraIcon,
  VideoCall as VideoCallIcon
} from '@mui/icons-material';
import { getAccessToken } from '../api';
import { useTheme, useMediaQuery } from '@mui/material';
import CreateEncounterModal from './CreateEncounterModal';
import RecordingModal from './RecordingModal';
import AiConsultationChat from './AiConsultationChat';
import BookAppointmentModal from './BookAppointmentModal';
import { useProcessingStatus } from '../contexts/ProcessingStatusContext';
import { getExistingNote, collectReviewTranscripts } from '../utils/reviewUtils';

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

  const existingNote = useMemo(() => getExistingNote(review), [review]);
  const existingTranscript = useMemo(() => collectReviewTranscripts(review), [review]);
  const [copySuccess, setCopySuccess] = useState(false);
  const currentProcessingStatus = getStatus(publicId);
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
        console.error('Failed to fetch review');
        if (!embedded) {
          navigate('/reviews');
        }
      }
    } catch (error) {
      console.error('Error fetching review:', error);
      if (!embedded) {
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

    setSaving(true);
    const token = await getAccessToken();

    try {
      // Convert phone number to international format if needed
      const convertedPhone = convertToInternationalFormat(patientData.phone);
      
      const finalizePayload = {
        note_payload: review.doctor_note || {},
        create_patient: true,
        send_summary: false,
        patient_first_name: patientData.first_name,
        patient_last_name: patientData.last_name,
        patient_phone_number: convertedPhone,
        patient_email: patientData.email,
        run_finalize_workflow: true
      };

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

  const handleSaveNote = async () => {
    if (!review || !editedNote) return;

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
            note_payload: editedNote
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

    if (!review.doctor_note) {
      alert('Please ensure the review has been documented before finalizing');
      return;
    }

    setSaving(true);
    try {
      const token = await getAccessToken();

      // Convert phone number to international format if needed
      const convertedPhone = convertToInternationalFormat(patientData.phone);

      const finalizePayload = {
        note_payload: review.doctor_note,
        send_summary: true,
        create_patient: true,
        patient_first_name: patientData.first_name || '',
        patient_last_name: patientData.last_name || '',
        patient_phone_number: convertedPhone || '',
        patient_email: patientData.email || '',
        run_finalize_workflow: true
      };

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

  const renderSOAPSection = (title, content, sectionKey, isEditing = false) => {
    if (!content && !isEditing) return null;

    const displayContent = isEditing ? (content || {}) : content;

    return (
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" fontWeight="bold" gutterBottom color="primary">
          {title}
        </Typography>
        <Card elevation={2} sx={{ borderLeft: '4px solid', borderColor: 'primary.main' }}>
          <CardContent sx={{ p: { xs: 2, md: 3 } }}>
            {Object.entries(displayContent).map(([key, value]) => {
              const editedValue = isEditing ? (editedNote?.[sectionKey]?.[key] ?? value) : value;
              return (
                <Box key={key} sx={{ mb: 2, '&:last-child': { mb: 0 } }}>
                  <Typography variant="subtitle2" fontWeight="bold" color="primary" gutterBottom sx={{ textTransform: 'capitalize' }}>
                    {key.replace(/_/g, ' ')}
                  </Typography>
                  {isEditing ? (
                    <TextField
                      fullWidth
                      multiline
                      minRows={3}
                      value={typeof editedValue === 'object' ? JSON.stringify(editedValue, null, 2) : (editedValue || '')}
                      onChange={(e) => {
                        const newValue = e.target.value;
                        setEditedNote(prev => ({
                          ...prev,
                          [sectionKey]: {
                            ...prev?.[sectionKey],
                            [key]: newValue
                          }
                        }));
                      }}
                      variant="outlined"
                      size="small"
                      sx={{ pl: 2 }}
                    />
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
                      <TextField
                        label="Medication Name"
                        value={prescription.medication_name || ''}
                        onChange={(e) => updatePrescriptionField(index, 'medication_name', e.target.value)}
                        size="small"
                        sx={{ minWidth: 150 }}
                      />
                    ) : (
                      <Typography variant="subtitle1" fontWeight="bold" color="success.dark" gutterBottom>
                        {prescription.medication_name}
                      </Typography>
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
                        <TextField
                          label="Dosage"
                          value={prescription.dosage || ''}
                          onChange={(e) => updatePrescriptionField(index, 'dosage', e.target.value)}
                          size="small"
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
                        <TextField
                          select
                          label="Route"
                          value={prescription.route || 'oral'}
                          onChange={(e) => updatePrescriptionField(index, 'route', e.target.value)}
                          size="small"
                          fullWidth
                          SelectProps={{ native: true }}
                        >
                          <option value="oral">Oral</option>
                          <option value="intravenous">Intravenous</option>
                          <option value="intramuscular">Intramuscular</option>
                          <option value="subcutaneous">Subcutaneous</option>
                          <option value="topical">Topical</option>
                          <option value="inhalation">Inhalation</option>
                          <option value="rectal">Rectal</option>
                          <option value="vaginal">Vaginal</option>
                        </TextField>
                      ) : (
                        <Typography variant="body2" sx={{ mb: 0.5 }}>
                          <strong>Route:</strong> {prescription.route}
                        </Typography>
                      )}
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      {isEditing ? (
                        <TextField
                          label="Interval (hours)"
                          type="number"
                          value={prescription.interval || 8}
                          onChange={(e) => updatePrescriptionField(index, 'interval', parseInt(e.target.value) || 0)}
                          size="small"
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
                      <TextField
                        label="Test Type"
                        value={investigation.test_type || ''}
                        onChange={(e) => updateInvestigationField(index, 'test_type', e.target.value)}
                        size="small"
                        sx={{ minWidth: 150 }}
                      />
                    ) : (
                      <Typography variant="subtitle1" fontWeight="bold" color="info.dark" gutterBottom>
                        {investigation.test_type}
                      </Typography>
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
                        <TextField
                          label="Interval (days)"
                          type="number"
                          value={investigation.interval || 0}
                          onChange={(e) => updateInvestigationField(index, 'interval', parseInt(e.target.value) || 0)}
                          size="small"
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
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
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
                  {(hasEncounter || currentEncounter) ? '✓ Created' : '1. Create'}
                </Button>
              </Grid>
              <Grid item xs={12} sm={4}>
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
                   review.in_person_encounters && review.in_person_encounters.length > 0 ? '2. Record New Encounter' : '2. Record'}
                </Button>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Button
                  variant="contained"
                  startIcon={<CheckCircleIcon />}
                  onClick={handleFinalize}
                  disabled={saving || !review.doctor_note || currentProcessingStatus === 'uploading' || currentProcessingStatus === 'processing'}
                  fullWidth
                  sx={{ 
                    bgcolor: 'success.main',
                    color: 'white',
                    '&:hover': { bgcolor: 'success.dark' },
                    '&:disabled': { bgcolor: 'grey.400' }
                  }}
                >
                  {saving ? 'Finalizing...' : '3. Finalize'}
                </Button>
              </Grid>
            </Grid>
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
            {!editingNote ? (
              <Box sx={{ display: 'flex', gap: 1 }}>
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
              </Box>
            ) : (
              <Box sx={{ display: 'flex', gap: 1 }}>
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
              </Box>
            )}
          </Box>
          {renderSOAPSection('Subjective', review.doctor_note.subjective, 'subjective', editingNote)}
          {renderSOAPSection('Objective', review.doctor_note.objective, 'objective', editingNote)}
          {renderSOAPSection('Assessment', review.doctor_note.assessment, 'assessment', editingNote)}
          {renderSOAPSection('Plan', review.doctor_note.plan, 'plan', editingNote)}
          {renderPrescriptions(editingNote ? (editedNote?.prescription || []) : (review.doctor_note?.prescription || []), editingNote)}
          {renderInvestigations(editingNote ? (editedNote?.investigation || []) : (review.doctor_note?.investigation || []), editingNote)}
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
