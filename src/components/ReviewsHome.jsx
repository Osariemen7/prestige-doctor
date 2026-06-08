import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  Chip,
  Button,
  CircularProgress,
  Avatar,
  IconButton,
  TextField,
  InputAdornment,
  Stack,
  useMediaQuery,
  useTheme,
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  ListItemAvatar,
  Divider,
} from '@mui/material';
import {
  Description as DescriptionIcon,
  Search as SearchIcon,
  Add as AddIcon,
  ViewList as ViewListIcon, // Icon for reviews list button
  Close as CloseIcon
} from '@mui/icons-material';
import { getAccessToken } from '../api';
import CreateEncounterModal from './CreateEncounterModal';
import RecordingModal from './RecordingModal';
import WorkflowStepper from './WorkflowStepper';
import ReviewDetail from './ReviewDetail';
import EnterpriseWorkflowInsights from './EnterpriseWorkflowInsights';
import { useProcessingStatus } from '../contexts/ProcessingStatusContext';
import { getExistingNote, collectReviewTranscripts } from '../utils/reviewUtils';
import {
  getCaregiverContext,
  getAiGovernanceSignals,
  getDoctorQueuePriority,
  getFollowThroughAttention,
  getFollowThroughOperationalSignals,
  getFollowThroughProgress,
  getFollowThroughStatusConfig,
  getMissingInformation,
  getReviewOrigin,
  getRiskFlags,
  getUrgencyConfig,
  getWhatsAppFollowThroughAgentState,
  isAiTriageReview,
  REVIEW_ORIGINS,
  sortReviewsForDoctorQueue,
} from '../utils/aiReviewWorkflow';

const SIDEBAR_WIDTH = 360;
const BACKEND_BASE_URL = process.env.REACT_APP_BACKEND_BASE_URL || 'https://api.prestigedelta.com';
const buildBackendUrl = (path) => `${BACKEND_BASE_URL.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
const PROVIDER_REVIEWS_URL = buildBackendUrl('/provider-reviews/?hours=168');
const PROVIDER_REVIEW_STREAM_URL = buildBackendUrl('/provider-reviews/status-stream/?hours=168&limit=100');

const formatStatusLabel = (value) => {
  if (!value) return 'Unknown';
  return String(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const formatQueueDateTime = (value) => {
  if (!value) return null;

  const parsedValue = new Date(value);
  if (Number.isNaN(parsedValue.getTime())) {
    return String(value);
  }

  return parsedValue.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const getQueueCompletionIntent = (completion) => String(
  completion?.completion_intent ||
  completion?.intent ||
  completion?.metadata?.completion_intent ||
  completion?.metadata?.intent ||
  ''
).toLowerCase();

const getQueueCompletionTimestamp = (completion) => (
  completion?.completed_at ||
  completion?.confirmed_at ||
  completion?.created_at ||
  completion?.updated_at ||
  null
);

const getQueueCompletionDisplay = (completion) => {
  const intent = getQueueCompletionIntent(completion);
  const completed = completion?.completed ?? completion?.is_completed ?? completion?.metadata?.completed;
  if (
    intent.includes('safety_escalation') ||
    completion?.should_escalate === true ||
    completion?.metadata?.should_escalate === true
  ) {
    return { verb: 'reported safety concern', color: 'error.main' };
  }
  if (
    completed === false ||
    intent.includes('unable_to_complete') ||
    intent.includes('barrier') ||
    intent.includes('not_done')
  ) {
    return { verb: 'reported barrier', color: 'warning.main' };
  }
  return { verb: 'completed', color: 'success.main' };
};

const getLiveVisitStateConfig = (review) => {
  const readiness = review?.live_visit_readiness;
  const callbackStatus = review?.callback_status;

  switch (readiness) {
    case 'awaiting_patient_booking':
      return { label: 'Awaiting Patient Booking', color: 'info', variant: 'outlined' };
    case 'callback_scheduled':
      return callbackStatus === 'payment_pending'
        ? { label: 'Callback Pending Payment', color: 'warning', variant: 'outlined' }
        : { label: 'Callback Scheduled', color: 'success', variant: 'outlined' };
    case 'follow_up_planned':
      return { label: 'Follow-up Planned', color: 'info', variant: 'outlined' };
    case 'review_completed':
      return { label: 'Review Completed', color: 'success', variant: 'outlined' };
    case 'closed':
      return { label: 'Closed', color: 'default', variant: 'outlined' };
    case 'ready_for_review':
      return { label: 'Ready for Review', color: 'warning', variant: 'outlined' };
    default:
      if (review?.live_visit_entry_count || review?.has_live_visual_captures) {
        return { label: 'Live Visit', color: 'info', variant: 'outlined' };
      }
      return null;
  }
};

const getReviewStatusConfig = (review) => {
  const status = review?.review_status || (review?.is_finalized ? 'finalized' : 'pending');

  switch (status) {
    case 'pending':
      return {
        label: 'Pending',
        shortLabel: 'Pending',
        color: 'warning',
        accentColor: 'warning.main',
      };
    case 'in_review':
      return {
        label: 'In Review',
        shortLabel: 'In Review',
        color: 'info',
        accentColor: 'info.main',
      };
    case 'approved':
      return {
        label: 'Approved',
        shortLabel: 'Approved',
        color: 'success',
        accentColor: 'success.main',
      };
    case 'finalized':
      return {
        label: 'Finalized',
        shortLabel: 'Finalized',
        color: 'success',
        accentColor: 'success.main',
      };
    case 'rejected':
      return {
        label: 'Rejected',
        shortLabel: 'Rejected',
        color: 'error',
        accentColor: 'error.main',
      };
    case 'cancelled':
      return {
        label: 'Cancelled',
        shortLabel: 'Cancelled',
        color: 'default',
        accentColor: 'text.disabled',
      };
    default:
      return {
        label: formatStatusLabel(status),
        shortLabel: formatStatusLabel(status),
        color: 'default',
        accentColor: 'divider',
      };
  }
};

const buildMockLiveQueueReview = (review) => ({
  ...review,
  has_live_visual_captures: true,
  live_visual_capture_count: Math.max(review.live_visual_capture_count || 0, 1),
  live_transcript_count: Math.max(review.live_transcript_count || 0, 1),
  live_tool_activity_count: Math.max(review.live_tool_activity_count || 0, 2),
  live_visit_entry_count: Math.max(review.live_visit_entry_count || 0, 4),
   requires_doctor_action: review.requires_doctor_action ?? true,
   live_visit_readiness: review.live_visit_readiness || 'ready_for_review',
   callback_status: review.callback_status || 'none',
  mock_live_visit_preview: true,
});

const applyMockLiveQueueSignals = (reviews, enabled) => {
  if (!enabled || !Array.isArray(reviews) || reviews.length === 0) {
    return reviews;
  }

  let injected = false;

  return reviews.map((review) => {
    if (injected) {
      return review;
    }

    if (!review?.conducted_by_ai || review?.has_live_visual_captures) {
      return review;
    }

    injected = true;
    return buildMockLiveQueueReview(review);
  });
};

const buildQueueSummaryFromReviews = (reviews, baseSummary = null) => {
  const computedSummary = {
    pending_count: 0,
    in_review_count: 0,
    approved_count: 0,
    closed_count: 0,
    live_visual_capture_count: 0,
    live_visit_ready_count: 0,
    scheduled_callback_count: 0,
    requested_callback_count: 0,
    ai_triage_count: 0,
    urgent_count: 0,
    needs_info_count: 0,
    follow_through_sent_count: 0,
    follow_through_active_count: 0,
    follow_through_completed_count: 0,
    follow_through_attention_count: 0,
    whatsapp_safety_escalation_count: 0,
    whatsapp_completion_barrier_count: 0,
    caregiver_review_count: 0,
    caregiver_authorization_warning_count: 0,
    follow_through_task_count: 0,
    follow_through_completed_task_count: 0,
    follow_through_completion_rate: 0,
    whatsapp_agent_active_count: 0,
    whatsapp_agent_completion_ready_count: 0,
    whatsapp_agent_completion_count: 0,
    high_governance_risk_count: 0,
    governance_watch_count: 0,
    ai_feedback_captured_count: 0,
    ai_corrected_count: 0,
  };

  if (!Array.isArray(reviews) || reviews.length === 0) {
    return baseSummary ? { ...computedSummary, ...baseSummary } : null;
  }

  reviews.forEach((review) => {
    const status = review?.review_status || (review?.is_finalized ? 'finalized' : 'pending');

    if (status === 'pending') {
      computedSummary.pending_count += 1;
    } else if (status === 'in_review') {
      computedSummary.in_review_count += 1;
    } else if (status === 'approved' || status === 'finalized') {
      computedSummary.approved_count += 1;
    } else if (status === 'cancelled' || status === 'rejected') {
      computedSummary.closed_count += 1;
    }

    computedSummary.live_visual_capture_count += review?.live_visual_capture_count || 0;

    if (['ready_for_review', 'follow_up_planned', 'callback_scheduled'].includes(review?.live_visit_readiness)) {
      computedSummary.live_visit_ready_count += 1;
    }

    if (['payment_pending', 'scheduled'].includes(review?.callback_status)) {
      computedSummary.scheduled_callback_count += 1;
    }

    if (review?.callback_status === 'booking_requested') {
      computedSummary.requested_callback_count += 1;
    }

    if (isAiTriageReview(review)) {
      computedSummary.ai_triage_count += 1;
    }

    const urgency = getUrgencyConfig(review);
    const caregiverContext = getCaregiverContext(review);
    if (urgency.value === 'urgent' || urgency.value === 'emergency' || urgency.value === 'critical') {
      computedSummary.urgent_count += 1;
    }

    if (caregiverContext.isCaregiverSubmitted) {
      computedSummary.caregiver_review_count += 1;
    }
    if (caregiverContext.authorizationBlocked || caregiverContext.authorizationUnknown || caregiverContext.needsRelationship) {
      computedSummary.caregiver_authorization_warning_count += 1;
    }

    if (getMissingInformation(review).length > 0) {
      computedSummary.needs_info_count += 1;
    }

    const followThrough = getFollowThroughProgress(review);
    const followThroughAttention = getFollowThroughAttention(review);
    const followThroughSignals = getFollowThroughOperationalSignals(review, { attention: followThroughAttention });
    const whatsAppAgent = getWhatsAppFollowThroughAgentState(review);
    const governance = getAiGovernanceSignals(review);
    if (followThrough.sent) {
      computedSummary.follow_through_sent_count += 1;
      computedSummary.follow_through_task_count += followThrough.totalTasks;
      computedSummary.follow_through_completed_task_count += followThrough.completedTasks;
    }
    if (['active', 'in_progress'].includes(followThrough.status)) {
      computedSummary.follow_through_active_count += 1;
    }
    if (followThrough.status === 'completed') {
      computedSummary.follow_through_completed_count += 1;
    }
    if (followThroughAttention.needsAttention) {
      computedSummary.follow_through_attention_count += 1;
    }
    if (followThroughSignals.isSafetyEscalation) {
      computedSummary.whatsapp_safety_escalation_count += 1;
    }
    if (followThroughSignals.isCompletionBarrier) {
      computedSummary.whatsapp_completion_barrier_count += 1;
    }
    if (whatsAppAgent.canMarkItemsComplete) {
      computedSummary.whatsapp_agent_active_count += 1;
    }
    if (whatsAppAgent.activeTaskReadyForCompletion) {
      computedSummary.whatsapp_agent_completion_ready_count += 1;
    }
    computedSummary.whatsapp_agent_completion_count += whatsAppAgent.completedByWhatsAppCount;
    if (governance.qualityRisk === 'high') {
      computedSummary.high_governance_risk_count += 1;
    }
    if (governance.qualityRisk === 'medium') {
      computedSummary.governance_watch_count += 1;
    }
    if (governance.feedbackCaptured) {
      computedSummary.ai_feedback_captured_count += 1;
    }
    if (governance.acceptanceState === 'corrected') {
      computedSummary.ai_corrected_count += 1;
    }
  });

  computedSummary.follow_through_completion_rate = computedSummary.follow_through_task_count
    ? Math.round((computedSummary.follow_through_completed_task_count / computedSummary.follow_through_task_count) * 100)
    : 0;

  return {
    ...(baseSummary || {}),
    ...computedSummary,
  };
};

const ReviewsHome = () => {
  const { publicId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { getStatus } = useProcessingStatus();
  
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRecordingModal, setShowRecordingModal] = useState(false);
  const [currentEncounter, setCurrentEncounter] = useState(null);
  const [workflowReviewId, setWorkflowReviewId] = useState(null);
  const [workflowStage, setWorkflowStage] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [queueSummary, setQueueSummary] = useState(null);
  const lastFetchRef = useRef(0);
  const streamFallbackRef = useRef(false);
  const mockLiveVisitPreviewEnabled = useMemo(() => {
    if (typeof window === 'undefined') {
      return false;
    }

    return window.location.hostname === 'localhost'
      && new URLSearchParams(location.search).get('mockLiveVisit') === '1';
  }, [location.search]);

  const selectedReviewId = publicId || null;
  const effectiveReviews = useMemo(
    () => applyMockLiveQueueSignals(reviews, mockLiveVisitPreviewEnabled),
    [reviews, mockLiveVisitPreviewEnabled]
  );
  const effectiveQueueSummary = useMemo(() => {
    if (!queueSummary && !mockLiveVisitPreviewEnabled) {
      return null;
    }

    return buildQueueSummaryFromReviews(effectiveReviews, queueSummary);
  }, [effectiveReviews, queueSummary, mockLiveVisitPreviewEnabled]);

  const activeReview = useMemo(() => {
    if (!workflowReviewId) return null;
    return effectiveReviews.find((item) => item.public_id === workflowReviewId) || null;
  }, [effectiveReviews, workflowReviewId]);

  const existingNote = useMemo(() => getExistingNote(activeReview), [activeReview]);
  const existingTranscript = useMemo(
    () => collectReviewTranscripts(activeReview),
    [activeReview]
  );

  const fetchReviews = useCallback(async ({ showLoading = true } = {}) => {
    if (showLoading) {
      setLoading(true);
    }
    const token = await getAccessToken();
    
    if (!token) {
      navigate('/login');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(PROVIDER_REVIEWS_URL, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const nextReviews = Array.isArray(data)
          ? data
          : Array.isArray(data?.results)
            ? data.results
            : [];
        setReviews(nextReviews);
        lastFetchRef.current = Date.now();
      } else {
        console.error('Failed to fetch reviews');
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  useEffect(() => {
    let isActive = true;
    let reconnectTimer = null;
    let fallbackPollTimer = null;
    let abortController = null;
    const decoder = new TextDecoder();
    let buffer = '';

    const startFallbackPolling = () => {
      if (!isActive || fallbackPollTimer) {
        return;
      }

      fetchReviews({ showLoading: false });
      fallbackPollTimer = window.setInterval(() => {
        if (!isActive) {
          return;
        }
        fetchReviews({ showLoading: false });
      }, 30000);
    };

    const scheduleReconnect = () => {
      if (!isActive || streamFallbackRef.current) return;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      reconnectTimer = window.setTimeout(() => {
        connectStatusStream();
      }, 2000);
    };

    const handleStatusEvent = (payload) => {
      if (!payload || typeof payload !== 'object') {
        return;
      }

      setQueueSummary(payload.summary || null);

      if (Array.isArray(payload.results)) {
        setReviews(payload.results);
        lastFetchRef.current = Date.now();
        setLoading(false);
        return;
      }

      if (Date.now() - lastFetchRef.current > 1000) {
        fetchReviews({ showLoading: false });
      }
    };

    const handleEventChunk = (rawEvent) => {
      if (!rawEvent.trim()) {
        return;
      }

      let eventType = 'message';
      const dataLines = [];

      rawEvent.split(/\r?\n/).forEach((line) => {
        if (line.startsWith('event:')) {
          eventType = line.slice(6).trim();
        } else if (line.startsWith('data:')) {
          dataLines.push(line.slice(5).trim());
        }
      });

      if (!dataLines.length) {
        return;
      }

      try {
        const payload = JSON.parse(dataLines.join('\n'));

        if (eventType === 'status') {
          handleStatusEvent(payload);
        } else if (eventType === 'complete') {
          scheduleReconnect();
        }
      } catch (error) {
        console.error('Failed to parse provider review status stream event:', error);
      }
    };

    const connectStatusStream = async () => {
      const token = await getAccessToken();
      if (!token || !isActive) {
        return;
      }

      abortController = new AbortController();

      try {
        const response = await fetch(PROVIDER_REVIEW_STREAM_URL, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          signal: abortController.signal,
        });

        if (response.status === 404 || response.status === 406) {
          streamFallbackRef.current = true;
          console.warn('Provider review status stream unavailable; falling back to periodic queue refresh.');
          startFallbackPolling();
          return;
        }

        if (!response.ok || !response.body) {
          throw new Error(`Unexpected stream response: ${response.status}`);
        }

        const reader = response.body.getReader();

        while (isActive) {
          const { value, done } = await reader.read();
          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const rawEvents = buffer.split(/\r?\n\r?\n/);
          buffer = rawEvents.pop() || '';
          rawEvents.forEach(handleEventChunk);
        }
      } catch (error) {
        if (!isActive || error.name === 'AbortError') {
          return;
        }
        console.error('Provider review status stream disconnected:', error);
      }

      scheduleReconnect();
    };

    connectStatusStream();

    return () => {
      isActive = false;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      if (fallbackPollTimer) {
        clearInterval(fallbackPollTimer);
      }
      if (abortController) {
        abortController.abort();
      }
    };
  }, [fetchReviews]);

  const filteredReviews = useMemo(() => {
    let filtered = effectiveReviews;

    if (filter === 'finalized') {
      filtered = filtered.filter((review) => review.is_finalized || ['approved', 'finalized'].includes(review.review_status));
    } else if (filter === 'pending') {
      filtered = filtered.filter((review) => (review.review_status || 'pending') === 'pending');
    } else if (filter === 'in_review') {
      filtered = filtered.filter((review) => review.review_status === 'in_review');
    } else if (filter === 'ai_triage') {
      filtered = filtered.filter((review) => isAiTriageReview(review));
    } else if (filter === 'urgent') {
      filtered = filtered.filter((review) => {
        const urgency = getUrgencyConfig(review);
        return ['urgent', 'emergency', 'critical'].includes(urgency.value) || getRiskFlags(review).length > 0;
      });
    } else if (filter === 'needs_info') {
      filtered = filtered.filter((review) => getMissingInformation(review).length > 0 || review.review_status === 'needs_patient_info');
    } else if (filter === 'caregiver') {
      filtered = filtered.filter((review) => getCaregiverContext(review).isCaregiverSubmitted);
    } else if (filter === 'caregiver_auth') {
      filtered = filtered.filter((review) => {
        const caregiverContext = getCaregiverContext(review);
        return caregiverContext.authorizationBlocked || caregiverContext.authorizationUnknown || caregiverContext.needsRelationship;
      });
    } else if (filter === 'ready_to_approve') {
      filtered = filtered.filter((review) => {
        const status = review.review_status || (review.is_finalized ? 'finalized' : 'pending');
        return isAiTriageReview(review)
          && !review.is_finalized
          && !['needs_patient_info', 'escalated', 'rejected', 'closed'].includes(status)
          && getRiskFlags(review).length === 0;
      });
    } else if (filter === 'follow_through_active') {
      filtered = filtered.filter((review) => ['active', 'in_progress'].includes(getFollowThroughProgress(review).status));
    } else if (filter === 'follow_through_attention') {
      filtered = filtered.filter((review) => getFollowThroughAttention(review).needsAttention);
    } else if (filter === 'whatsapp_safety_escalation') {
      filtered = filtered.filter((review) => getFollowThroughOperationalSignals(review).isSafetyEscalation);
    } else if (filter === 'whatsapp_completion_barrier') {
      filtered = filtered.filter((review) => getFollowThroughOperationalSignals(review).isCompletionBarrier);
    } else if (filter === 'follow_through_completed') {
      filtered = filtered.filter((review) => getFollowThroughProgress(review).status === 'completed');
    } else if (filter === 'whatsapp_followup') {
      filtered = filtered.filter((review) => getWhatsAppFollowThroughAgentState(review).canMarkItemsComplete);
    } else if (filter === 'quality_risk') {
      filtered = filtered.filter((review) => ['high', 'medium'].includes(getAiGovernanceSignals(review).qualityRisk));
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(r =>
        r.patient_first_name?.toLowerCase().includes(term) ||
        r.patient_last_name?.toLowerCase().includes(term) ||
        r.chief_complaint?.toLowerCase().includes(term)
      );
    }

    return sortReviewsForDoctorQueue(filtered);
  }, [effectiveReviews, filter, searchTerm]);

  const handleReviewSelect = (reviewPublicId) => {
    navigate(`/reviews/${reviewPublicId}${location.search || ''}`);
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  const handleEncounterSuccess = async (encounter) => {
    setCurrentEncounter(encounter);
    setWorkflowReviewId(encounter.medical_review_public_id);
    setShowCreateModal(false);
    
    // 1. Refetch the reviews list from the server so the new review is in our local state
    await fetchReviews({ showLoading: true });
    
    // 2. Smoothly transition the clinician directly to the newly created review detail screen
    // and automatically boot up the world-class AI Live Copilot
    navigate(`/reviews/${encounter.medical_review_public_id}?startCopilot=1`);
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  const handleWorkflowEvent = (event) => {
    if (event === 'completed') {
      setWorkflowStage(2);
    } else if (event === 'error') {
      setWorkflowStage(0);
    }
  };

  const resetWorkflow = () => {
    setCurrentEncounter(null);
    setWorkflowReviewId(null);
    setWorkflowStage(0);
  };

  const getStatusBadge = (review) => {
    const processingStatus = getStatus(review.public_id);
    const statusConfig = getReviewStatusConfig(review);
    
    if (processingStatus) {
      return (
        <Chip
          size="small"
          icon={<CircularProgress size={12} color="inherit" />}
          label={processingStatus === 'uploading' ? 'Uploading' : 'Processing'}
          color="info"
          sx={{ ml: 1 }}
        />
      );
    }

    return (
      <Chip
        size="small"
        label={statusConfig.shortLabel}
        color={statusConfig.color}
        variant={statusConfig.color === 'default' ? 'outlined' : 'filled'}
        sx={{
          ml: 1,
          height: 24,
          '& .MuiChip-label': {
            px: 1,
            fontSize: '0.7rem',
            fontWeight: 600,
          },
        }}
      />
    );
  };

  const sidebar = (
    <Box
      sx={{
        width: isMobile ? '100%' : SIDEBAR_WIDTH,
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
        borderRight: isMobile ? 'none' : '1px solid',
        borderColor: 'divider',
        overflow: 'hidden',
        maxWidth: '100%',
      }}
    >
      {/* Sidebar Header */}
      <Box sx={{ 
        p: 2,
        borderBottom: '1px solid', 
        borderColor: 'divider',
        flexShrink: 0
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold', fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
            Documentation
          </Typography>
          {isMobile && (
            <IconButton onClick={() => setSidebarOpen(false)} size="small">
              <CloseIcon />
            </IconButton>
          )}
        </Box>

        {/* New Encounter Button */}
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setShowCreateModal(true)}
          fullWidth
          sx={{ 
            mb: 2,
            py: 1.5,
            fontSize: '0.9rem',
          }}
        >
          Review New Patient
        </Button>

        {/* Search */}
        <TextField
          fullWidth
          size="small"
          placeholder="Search patients..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 2 }}
        />

        {/* Filters */}
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
          <Chip
            label="All"
            onClick={() => setFilter('all')}
            color={filter === 'all' ? 'primary' : 'default'}
            size="small"
            sx={{ fontSize: '0.8rem' }}
          />
          <Chip
            label="Finalized"
            onClick={() => setFilter('finalized')}
            color={filter === 'finalized' ? 'primary' : 'default'}
            size="small"
            sx={{ fontSize: '0.8rem' }}
          />
          <Chip
            label="Pending"
            onClick={() => setFilter('pending')}
            color={filter === 'pending' ? 'primary' : 'default'}
            size="small"
            sx={{ fontSize: '0.8rem' }}
          />
          <Chip
            label="In Review"
            onClick={() => setFilter('in_review')}
            color={filter === 'in_review' ? 'primary' : 'default'}
            size="small"
            sx={{ fontSize: '0.8rem' }}
          />
          <Chip
            label="AI Triage"
            onClick={() => setFilter('ai_triage')}
            color={filter === 'ai_triage' ? 'primary' : 'default'}
            size="small"
            sx={{ fontSize: '0.8rem' }}
          />
          <Chip
            label="Urgent"
            onClick={() => setFilter('urgent')}
            color={filter === 'urgent' ? 'primary' : 'default'}
            size="small"
            sx={{ fontSize: '0.8rem' }}
          />
          <Chip
            label="Needs Info"
            onClick={() => setFilter('needs_info')}
            color={filter === 'needs_info' ? 'primary' : 'default'}
            size="small"
            sx={{ fontSize: '0.8rem' }}
          />
          <Chip
            label="Caregiver"
            onClick={() => setFilter('caregiver')}
            color={filter === 'caregiver' ? 'primary' : 'default'}
            size="small"
            sx={{ fontSize: '0.8rem' }}
          />
          <Chip
            label="Caregiver Auth"
            onClick={() => setFilter('caregiver_auth')}
            color={filter === 'caregiver_auth' ? 'primary' : 'default'}
            size="small"
            sx={{ fontSize: '0.8rem' }}
          />
          <Chip
            label="Ready"
            onClick={() => setFilter('ready_to_approve')}
            color={filter === 'ready_to_approve' ? 'primary' : 'default'}
            size="small"
            sx={{ fontSize: '0.8rem' }}
          />
          <Chip
            label="Follow-through"
            onClick={() => setFilter('follow_through_active')}
            color={filter === 'follow_through_active' ? 'primary' : 'default'}
            size="small"
            sx={{ fontSize: '0.8rem' }}
          />
          <Chip
            label="Needs Follow-up"
            onClick={() => setFilter('follow_through_attention')}
            color={filter === 'follow_through_attention' ? 'primary' : 'default'}
            size="small"
            sx={{ fontSize: '0.8rem' }}
          />
          <Chip
            label="WhatsApp Safety"
            onClick={() => setFilter('whatsapp_safety_escalation')}
            color={filter === 'whatsapp_safety_escalation' ? 'primary' : 'default'}
            size="small"
            sx={{ fontSize: '0.8rem' }}
          />
          <Chip
            label="Completion Barriers"
            onClick={() => setFilter('whatsapp_completion_barrier')}
            color={filter === 'whatsapp_completion_barrier' ? 'primary' : 'default'}
            size="small"
            sx={{ fontSize: '0.8rem' }}
          />
          <Chip
            label="Completed Tasks"
            onClick={() => setFilter('follow_through_completed')}
            color={filter === 'follow_through_completed' ? 'primary' : 'default'}
            size="small"
            sx={{ fontSize: '0.8rem' }}
          />
          <Chip
            label="WhatsApp AI"
            onClick={() => setFilter('whatsapp_followup')}
            color={filter === 'whatsapp_followup' ? 'primary' : 'default'}
            size="small"
            sx={{ fontSize: '0.8rem' }}
          />
          <Chip
            label="Quality Risk"
            onClick={() => setFilter('quality_risk')}
            color={filter === 'quality_risk' ? 'primary' : 'default'}
            size="small"
            sx={{ fontSize: '0.8rem' }}
          />
        </Stack>

        {effectiveQueueSummary && (
          <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap', gap: 0.5 }}>
            <Chip
              label={`Pending ${effectiveQueueSummary.pending_count || 0}`}
              size="small"
              color="warning"
              variant="outlined"
              sx={{ fontSize: '0.75rem' }}
            />
            <Chip
              label={`In Review ${effectiveQueueSummary.in_review_count || 0}`}
              size="small"
              color="info"
              variant="outlined"
              sx={{ fontSize: '0.75rem' }}
            />
            <Chip
              label={`Approved ${effectiveQueueSummary.approved_count || 0}`}
              size="small"
              color="success"
              variant="outlined"
              sx={{ fontSize: '0.75rem' }}
            />
            {!!effectiveQueueSummary.ai_triage_count && (
              <Chip
                label={`AI Triage ${effectiveQueueSummary.ai_triage_count}`}
                size="small"
                color="info"
                variant="outlined"
                sx={{ fontSize: '0.75rem' }}
              />
            )}
            {!!effectiveQueueSummary.urgent_count && (
              <Chip
                label={`Urgent ${effectiveQueueSummary.urgent_count}`}
                size="small"
                color="warning"
                variant="outlined"
                sx={{ fontSize: '0.75rem' }}
              />
            )}
            {!!effectiveQueueSummary.needs_info_count && (
              <Chip
                label={`Needs Info ${effectiveQueueSummary.needs_info_count}`}
                size="small"
                color="secondary"
                variant="outlined"
                sx={{ fontSize: '0.75rem' }}
              />
            )}
            {!!effectiveQueueSummary.caregiver_review_count && (
              <Chip
                label={`Caregiver ${effectiveQueueSummary.caregiver_review_count}`}
                size="small"
                color="secondary"
                variant="outlined"
                sx={{ fontSize: '0.75rem' }}
              />
            )}
            {!!effectiveQueueSummary.caregiver_authorization_warning_count && (
              <Chip
                label={`Caregiver Auth ${effectiveQueueSummary.caregiver_authorization_warning_count}`}
                size="small"
                color="warning"
                variant="outlined"
                sx={{ fontSize: '0.75rem' }}
              />
            )}
            {!!effectiveQueueSummary.follow_through_active_count && (
              <Chip
                label={`Follow-through ${effectiveQueueSummary.follow_through_active_count}`}
                size="small"
                color="primary"
                variant="outlined"
                sx={{ fontSize: '0.75rem' }}
              />
            )}
            {!!effectiveQueueSummary.follow_through_attention_count && (
              <Chip
                label={`Needs Follow-up ${effectiveQueueSummary.follow_through_attention_count}`}
                size="small"
                color="warning"
                variant="outlined"
                sx={{ fontSize: '0.75rem' }}
              />
            )}
            {!!effectiveQueueSummary.whatsapp_safety_escalation_count && (
              <Chip
                label={`WhatsApp Safety ${effectiveQueueSummary.whatsapp_safety_escalation_count}`}
                size="small"
                color="error"
                variant="outlined"
                sx={{ fontSize: '0.75rem' }}
              />
            )}
            {!!effectiveQueueSummary.whatsapp_completion_barrier_count && (
              <Chip
                label={`Completion Barriers ${effectiveQueueSummary.whatsapp_completion_barrier_count}`}
                size="small"
                color="warning"
                variant="outlined"
                sx={{ fontSize: '0.75rem' }}
              />
            )}
            {!!effectiveQueueSummary.follow_through_completed_count && (
              <Chip
                label={`Completed Tasks ${effectiveQueueSummary.follow_through_completed_count}`}
                size="small"
                color="success"
                variant="outlined"
                sx={{ fontSize: '0.75rem' }}
              />
            )}
            {!!effectiveQueueSummary.whatsapp_agent_active_count && (
              <Chip
                label={`WhatsApp AI ${effectiveQueueSummary.whatsapp_agent_active_count}`}
                size="small"
                color="info"
                variant="outlined"
                sx={{ fontSize: '0.75rem' }}
              />
            )}
            {!!effectiveQueueSummary.whatsapp_agent_completion_ready_count && (
              <Chip
                label={`Completion Ready ${effectiveQueueSummary.whatsapp_agent_completion_ready_count}`}
                size="small"
                color="success"
                variant="outlined"
                sx={{ fontSize: '0.75rem' }}
              />
            )}
            {!!effectiveQueueSummary.whatsapp_agent_completion_count && (
              <Chip
                label={`WhatsApp Done ${effectiveQueueSummary.whatsapp_agent_completion_count}`}
                size="small"
                color="success"
                variant="outlined"
                sx={{ fontSize: '0.75rem' }}
              />
            )}
            {!!effectiveQueueSummary.high_governance_risk_count && (
              <Chip
                label={`Quality Risk ${effectiveQueueSummary.high_governance_risk_count}`}
                size="small"
                color="error"
                variant="outlined"
                sx={{ fontSize: '0.75rem' }}
              />
            )}
            {!!effectiveQueueSummary.governance_watch_count && (
              <Chip
                label={`Governance Watch ${effectiveQueueSummary.governance_watch_count}`}
                size="small"
                color="warning"
                variant="outlined"
                sx={{ fontSize: '0.75rem' }}
              />
            )}
            {!!effectiveQueueSummary.ai_feedback_captured_count && (
              <Chip
                label={`AI Feedback ${effectiveQueueSummary.ai_feedback_captured_count}`}
                size="small"
                color="info"
                variant="outlined"
                sx={{ fontSize: '0.75rem' }}
              />
            )}
            {!!effectiveQueueSummary.ai_corrected_count && (
              <Chip
                label={`AI Corrected ${effectiveQueueSummary.ai_corrected_count}`}
                size="small"
                color="warning"
                variant="outlined"
                sx={{ fontSize: '0.75rem' }}
              />
            )}
            {!!effectiveQueueSummary.closed_count && (
              <Chip
                label={`Closed ${effectiveQueueSummary.closed_count}`}
                size="small"
                color="default"
                variant="outlined"
                sx={{ fontSize: '0.75rem' }}
              />
            )}
            {!!effectiveQueueSummary.live_visual_capture_count && (
              <Chip
                label={`Live Captures ${effectiveQueueSummary.live_visual_capture_count}`}
                size="small"
                color="info"
                variant="outlined"
                sx={{ fontSize: '0.75rem' }}
              />
            )}
            {!!effectiveQueueSummary.live_visit_ready_count && (
              <Chip
                label={`Ready ${effectiveQueueSummary.live_visit_ready_count}`}
                size="small"
                color="warning"
                variant="outlined"
                sx={{ fontSize: '0.75rem' }}
              />
            )}
            {!!effectiveQueueSummary.scheduled_callback_count && (
              <Chip
                label={`Callbacks ${effectiveQueueSummary.scheduled_callback_count}`}
                size="small"
                color="success"
                variant="outlined"
                sx={{ fontSize: '0.75rem' }}
              />
            )}
            {!!effectiveQueueSummary.requested_callback_count && (
              <Chip
                label={`Requests ${effectiveQueueSummary.requested_callback_count}`}
                size="small"
                color="info"
                variant="outlined"
                sx={{ fontSize: '0.75rem' }}
              />
            )}
            {mockLiveVisitPreviewEnabled && (
              <Chip
                label="Mock Live Preview"
                size="small"
                color="warning"
                variant="outlined"
                sx={{ fontSize: '0.75rem' }}
              />
            )}
          </Stack>
        )}
      </Box>

      {/* Reviews List */}
      <Box sx={{ flex: 1, overflow: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
            <CircularProgress />
          </Box>
        ) : filteredReviews.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <DescriptionIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography variant="body2" color="text.secondary">
              {searchTerm ? 'No reviews match your search' : 'No reviews yet'}
            </Typography>
          </Box>
        ) : (
          <List sx={{ py: 0 }}>
            {filteredReviews.map((review, index) => (
              <React.Fragment key={review.public_id}>
                {(() => {
                  const statusConfig = getReviewStatusConfig(review);
                  const liveVisitState = getLiveVisitStateConfig(review);
                  const origin = getReviewOrigin(review);
                  const caregiverContext = getCaregiverContext(review);
                  const urgency = getUrgencyConfig(review);
                  const riskFlags = getRiskFlags(review);
                  const missingInformation = getMissingInformation(review);
                  const followThrough = getFollowThroughProgress(review);
                  const followThroughAttention = getFollowThroughAttention(review);
                  const followThroughConfig = getFollowThroughStatusConfig(followThrough);
                  const whatsAppAgent = getWhatsAppFollowThroughAgentState(review);
                  const governance = getAiGovernanceSignals(review);
                  const queuePriority = getDoctorQueuePriority(review);
                  const latestCompletionActor = followThrough.latestCompletion?.actor_name
                    || (followThrough.latestCompletion?.actor_role ? formatStatusLabel(followThrough.latestCompletion.actor_role) : 'Patient');
                  const latestCompletionDisplay = getQueueCompletionDisplay(followThrough.latestCompletion);
                  const latestCompletionTimestamp = getQueueCompletionTimestamp(followThrough.latestCompletion);
                  return (
                <ListItemButton
                  selected={selectedReviewId === review.public_id}
                  onClick={() => handleReviewSelect(review.public_id)}
                  sx={{
                    py: 2,
                    px: 2,
                    borderLeft: '4px solid',
                    borderLeftColor: statusConfig.accentColor,
                    '&.Mui-selected': {
                      bgcolor: 'action.selected',
                      borderRight: '3px solid',
                      borderColor: 'primary.main'
                    }
                  }}
                >
                  <ListItemAvatar>
                    <Avatar sx={{ 
                      bgcolor: statusConfig.accentColor,
                      width: 40,
                      height: 40,
                    }}>
                      {(review.patient_first_name?.[0] || 'P').toUpperCase()}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography 
                          variant="subtitle2" 
                          noWrap 
                          sx={{ 
                            fontSize: '0.95rem',
                            pr: 1 
                          }}
                        >
                          {review.patient_first_name || review.patient_last_name
                            ? `${review.patient_first_name || ''} ${review.patient_last_name || ''}`.trim()
                            : 'Unknown Patient'}
                        </Typography>
                        {getStatusBadge(review)}
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography 
                          variant="caption" 
                          color="text.secondary" 
                          noWrap 
                          display="block"
                          sx={{ fontSize: '0.8rem' }}
                        >
                          {review.chief_complaint || 'No chief complaint'}
                        </Typography>
                        <Typography 
                          variant="caption" 
                          color="text.secondary"
                          sx={{ fontSize: '0.75rem' }}
                        >
                          {new Date(review.created).toLocaleDateString()}
                        </Typography>
                        <Stack direction="row" spacing={0.5} sx={{ mt: 0.75, flexWrap: 'wrap', gap: 0.5 }}>
                          <Chip
                            label={queuePriority.label}
                            size="small"
                            color={queuePriority.color}
                            variant={queuePriority.rank <= 4 ? 'filled' : 'outlined'}
                            sx={{ height: 22, fontSize: '0.7rem' }}
                          />
                          {review.conducted_by_ai && (
                            <Chip
                              label="AI Review"
                              size="small"
                              color="info"
                              variant="outlined"
                              sx={{ height: 22, fontSize: '0.7rem' }}
                            />
                          )}
                          {origin === REVIEW_ORIGINS.AI_TRIAGE && (
                            <Chip
                              label="AI Triage"
                              size="small"
                              color="info"
                              sx={{ height: 22, fontSize: '0.7rem' }}
                            />
                          )}
                          {origin === REVIEW_ORIGINS.HYBRID && (
                            <Chip
                              label="Hybrid"
                              size="small"
                              color="secondary"
                              sx={{ height: 22, fontSize: '0.7rem' }}
                            />
                          )}
                          {caregiverContext.isCaregiverSubmitted && (
                            <Chip
                              label={caregiverContext.relationship ? `Caregiver: ${formatStatusLabel(caregiverContext.relationship)}` : 'Caregiver'}
                              size="small"
                              color={caregiverContext.needsRelationship ? 'warning' : 'secondary'}
                              variant="outlined"
                              sx={{ height: 22, fontSize: '0.7rem' }}
                            />
                          )}
                          {caregiverContext.isCaregiverSubmitted && caregiverContext.authorizedRecipient !== true && (
                            <Chip
                              label={caregiverContext.authorizedRecipient === false ? 'Unauthorized' : 'Auth unknown'}
                              size="small"
                              color={caregiverContext.authorizedRecipient === false ? 'error' : 'warning'}
                              variant="outlined"
                              sx={{ height: 22, fontSize: '0.7rem' }}
                            />
                          )}
                          {['urgent', 'emergency', 'critical'].includes(urgency.value) && (
                            <Chip
                              label={urgency.label}
                              size="small"
                              color={urgency.color}
                              sx={{ height: 22, fontSize: '0.7rem' }}
                            />
                          )}
                          {riskFlags.length > 0 && (
                            <Chip
                              label={`${riskFlags.length} Risk ${riskFlags.length === 1 ? 'Flag' : 'Flags'}`}
                              size="small"
                              color="warning"
                              variant="outlined"
                              sx={{ height: 22, fontSize: '0.7rem' }}
                            />
                          )}
                          {missingInformation.length > 0 && (
                            <Chip
                              label={`${missingInformation.length} Missing`}
                              size="small"
                              color="secondary"
                              variant="outlined"
                              sx={{ height: 22, fontSize: '0.7rem' }}
                            />
                          )}
                          {followThrough.sent && (
                            <Chip
                              label={followThrough.totalTasks
                                ? `${followThroughAttention.needsAttention ? followThroughAttention.shortLabel : followThroughConfig.shortLabel} ${followThrough.completedTasks}/${followThrough.totalTasks}`
                                : followThroughAttention.needsAttention ? followThroughAttention.shortLabel : followThroughConfig.shortLabel}
                              size="small"
                              color={followThroughAttention.needsAttention ? followThroughAttention.color : followThroughConfig.color}
                              variant={followThroughAttention.needsAttention ? followThroughAttention.variant : followThroughConfig.variant}
                              sx={{ height: 22, fontSize: '0.7rem' }}
                            />
                          )}
                          {whatsAppAgent.canMarkItemsComplete && (
                            <Chip
                              label={whatsAppAgent.activeTaskReadyForCompletion ? 'WhatsApp ready' : 'WhatsApp loop'}
                              size="small"
                              color={whatsAppAgent.activeTaskReadyForCompletion ? 'success' : 'info'}
                              variant="outlined"
                              sx={{ height: 22, fontSize: '0.7rem' }}
                            />
                          )}
                          {isAiTriageReview(review) && governance.qualityRisk !== 'low' && (
                            <Chip
                              label={governance.shortLabel}
                              size="small"
                              color={governance.color}
                              variant={governance.variant}
                              sx={{ height: 22, fontSize: '0.7rem' }}
                            />
                          )}
                          {liveVisitState && (
                            <Chip
                              label={liveVisitState.label}
                              size="small"
                              color={liveVisitState.color}
                              variant={liveVisitState.variant}
                              sx={{ height: 22, fontSize: '0.7rem' }}
                            />
                          )}
                          {review.has_live_visual_captures && (
                            <Chip
                              label={`${review.live_visual_capture_count || 1} Live ${review.live_visual_capture_count === 1 ? 'Capture' : 'Captures'}`}
                              size="small"
                              color="info"
                              sx={{ height: 22, fontSize: '0.7rem' }}
                            />
                          )}
                          {review.mock_live_visit_preview && (
                            <Chip
                              label="Mock Preview"
                              size="small"
                              color="warning"
                              variant="outlined"
                              sx={{ height: 22, fontSize: '0.7rem' }}
                            />
                          )}
                        </Stack>
                        {queuePriority.reasons.length > 0 && (
                          <Typography
                            variant="caption"
                            color={queuePriority.rank <= 3 ? 'warning.main' : 'text.secondary'}
                            display="block"
                            sx={{ mt: 0.65, fontSize: '0.72rem' }}
                          >
                            {queuePriority.reasons[0]}
                          </Typography>
                        )}
                        {followThrough.latestCompletion && latestCompletionTimestamp && (
                          <Typography
                            variant="caption"
                            color={latestCompletionDisplay.color}
                            display="block"
                            sx={{ mt: 0.75, fontSize: '0.72rem' }}
                          >
                            {`${latestCompletionActor} ${latestCompletionDisplay.verb} ${formatQueueDateTime(latestCompletionTimestamp)}`}
                          </Typography>
                        )}
                        {followThroughAttention.needsAttention && (
                          <Typography
                            variant="caption"
                            color={followThroughAttention.color === 'error' ? 'error.main' : 'warning.main'}
                            display="block"
                            sx={{ mt: 0.75, fontSize: '0.72rem' }}
                          >
                            {followThroughAttention.reasons[0] || followThroughAttention.nextAction}
                          </Typography>
                        )}
                        {whatsAppAgent.nextTask && followThrough.sent && (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            display="block"
                            sx={{ mt: 0.75, fontSize: '0.72rem' }}
                          >
                            {`WhatsApp next: ${whatsAppAgent.nextTask.title}`}
                          </Typography>
                        )}
                        {isAiTriageReview(review) && governance.reasons.length > 0 && (
                          <Typography
                            variant="caption"
                            color={governance.qualityRisk === 'high' ? 'error.main' : 'warning.main'}
                            display="block"
                            sx={{ mt: 0.75, fontSize: '0.72rem' }}
                          >
                            {governance.reasons[0]}
                          </Typography>
                        )}
                        {!!(review.live_transcript_count || review.live_tool_activity_count) && (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            display="block"
                            sx={{ mt: 0.75, fontSize: '0.72rem' }}
                          >
                            {`${review.live_transcript_count || 0} transcript ${review.live_transcript_count === 1 ? 'entry' : 'entries'} · ${review.live_tool_activity_count || 0} tool ${review.live_tool_activity_count === 1 ? 'update' : 'updates'}`}
                          </Typography>
                        )}
                        {(review.callback_appointment?.start_time || review.follow_up || review.callback_booking_request?.requested_at) && (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            display="block"
                            sx={{ mt: 0.5, fontSize: '0.72rem' }}
                          >
                            {review.callback_appointment?.start_time
                              ? `Callback ${formatQueueDateTime(review.callback_appointment.start_time)} · ${formatStatusLabel(review.callback_status)}`
                              : review.callback_booking_request?.requested_at
                                ? `Booking Request ${formatQueueDateTime(review.callback_booking_request.requested_at)} · ${formatStatusLabel(review.callback_status)}`
                                : `Follow-up ${formatQueueDateTime(review.follow_up)}`}
                          </Typography>
                        )}
                      </Box>
                    }
                    secondaryTypographyProps={{
                      component: 'div'
                    }}
                  />
                </ListItemButton>
                  );
                })()}
                {index < filteredReviews.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        )}
      </Box>
    </Box>
  );

  const emptyState = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        minHeight: '100%',
        width: '100%',
        p: { xs: 2, md: 3 },
        textAlign: 'center',
      }}
    >
      <EnterpriseWorkflowInsights
        reviews={effectiveReviews}
        queueSummary={effectiveQueueSummary}
        onFilter={(nextFilter) => {
          setFilter(nextFilter);
          if (isMobile) {
            setSidebarOpen(true);
          }
        }}
      />
      <DescriptionIcon sx={{ 
        fontSize: { xs: 64, sm: 100 }, 
        color: 'text.disabled', 
        mt: 2,
        mb: 2
      }} />
      <Typography 
        variant={isMobile ? "h6" : "h5"} 
        gutterBottom 
        fontWeight="bold"
      >
        Select a Review
      </Typography>
      <Typography 
        variant="body2" 
        color="text.secondary" 
        sx={{ 
          mb: 3,
          maxWidth: 400,
          fontSize: { xs: '0.875rem', sm: '1rem' }
        }}
      >
        Choose a review from the {isMobile ? 'list' : 'sidebar'} to view patient details, SOAP notes, prescriptions, and more.
      </Typography>
      <Button
        variant="contained"
        size={isMobile ? "medium" : "large"}
        startIcon={<AddIcon />}
        onClick={() => setShowCreateModal(true)}
        sx={{ 
          px: 3,
        }}
      >
        Review New Patient
      </Button>
    </Box>
  );

  return (
    <Box sx={{ 
      display: 'flex', 
      height: '100vh', 
      overflow: 'hidden',
      width: '100%',
      maxWidth: '100vw',
      position: 'relative',
    }}>
      {/* Sidebar - Desktop */}
      {!isMobile && sidebar}

      {/* Sidebar - Mobile Drawer */}
      {isMobile && (
        <Drawer
          anchor="left"
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            '& .MuiDrawer-paper': {
              width: '85vw',
              maxWidth: 360,
            },
          }}
        >
          {sidebar}
        </Drawer>
      )}

      {/* Main Content Area */}
      <Box sx={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        overflow: 'hidden',
        width: '100%',
        maxWidth: '100%',
      }}>
        {/* Mobile Header - Shows review title and list button */}
        {isMobile && (
          <Box
            sx={{
              position: 'fixed',
              top: 0,
              left: 80,
              right: 0,
              zIndex: 1200,
              p: 2,
              bgcolor: 'background.paper',
              borderBottom: '1px solid',
              borderColor: 'divider',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton 
                onClick={() => setSidebarOpen(true)} 
                edge="start"
                size="medium"
                sx={{
                  bgcolor: 'primary.main',
                  color: 'white',
                  '&:hover': {
                    bgcolor: 'primary.dark',
                  },
                }}
              >
                <ViewListIcon />
              </IconButton>
              <Typography variant="h6" sx={{ fontWeight: 'bold', fontSize: '1.1rem' }} noWrap>
                {selectedReviewId ? 'Review Details' : 'Documentation'}
              </Typography>
            </Box>
          </Box>
        )}

        {/* Content */}
        <Box sx={{ 
          flex: 1, 
          overflow: 'auto', 
          bgcolor: 'background.default',
          pt: { xs: '72px', md: 0 },
          width: '100%',
          maxWidth: '100%',
          overflowX: 'hidden',
        }}>
          {/* Workflow Stepper */}
          {workflowStage > 0 && (
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'center', 
              p: 2,
              bgcolor: 'background.paper',
              borderBottom: '1px solid',
              borderColor: 'divider',
            }}>
              <WorkflowStepper
                stage={workflowStage}
                reviewId={workflowReviewId}
                onClose={resetWorkflow}
                onNavigate={() => {
                  if (workflowReviewId) {
                    handleReviewSelect(workflowReviewId);
                  }
                  resetWorkflow();
                }}
              />
            </Box>
          )}

          {selectedReviewId ? (
            <ReviewDetail embedded onUpdate={fetchReviews} />
          ) : (
            emptyState
          )}
        </Box>
      </Box>

      {/* Modals */}
      <CreateEncounterModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleEncounterSuccess}
      />

      <RecordingModal
        open={showRecordingModal}
        onClose={() => setShowRecordingModal(false)}
        encounterId={currentEncounter?.public_id || null}
        encounterData={currentEncounter}
        reviewId={workflowReviewId}
        onWorkflowEvent={handleWorkflowEvent}
        onComplete={() => {
          fetchReviews();
          if (workflowReviewId) {
            handleReviewSelect(workflowReviewId);
          }
          resetWorkflow();
        }}
        existingNote={existingNote}
        existingTranscript={existingTranscript}
      />
    </Box>
  );
};

export default ReviewsHome;
