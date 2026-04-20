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
import { useProcessingStatus } from '../contexts/ProcessingStatusContext';
import { getExistingNote, collectReviewTranscripts } from '../utils/reviewUtils';

const SIDEBAR_WIDTH = 360;
const PROVIDER_REVIEW_STREAM_URL = 'https://api.prestigedelta.com/provider-reviews/status-stream/?hours=168&limit=100';

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
  });

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
      const response = await fetch('https://api.prestigedelta.com/provider-reviews/?hours=168', {
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
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(r =>
        r.patient_first_name?.toLowerCase().includes(term) ||
        r.patient_last_name?.toLowerCase().includes(term) ||
        r.chief_complaint?.toLowerCase().includes(term)
      );
    }

    return filtered.sort((a, b) => new Date(b.created) - new Date(a.created));
  }, [effectiveReviews, filter, searchTerm]);

  const handleReviewSelect = (reviewPublicId) => {
    navigate(`/reviews/${reviewPublicId}${location.search || ''}`);
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  const handleEncounterSuccess = (encounter) => {
    setCurrentEncounter(encounter);
    setWorkflowReviewId(encounter.medical_review_public_id);
    setWorkflowStage(1);
    setShowCreateModal(false);
    setShowRecordingModal(true);
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
                          {review.conducted_by_ai && (
                            <Chip
                              label="AI Review"
                              size="small"
                              color="info"
                              variant="outlined"
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
        justifyContent: 'center',
        height: '100%',
        width: '100%',
        p: 3,
        textAlign: 'center',
        px: 2,
      }}
    >
      <DescriptionIcon sx={{ 
        fontSize: { xs: 64, sm: 100 }, 
        color: 'text.disabled', 
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
