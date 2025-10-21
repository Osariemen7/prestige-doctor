import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
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
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemAvatar,
  Divider,
  Paper
} from '@mui/material';
import {
  Description as DescriptionIcon,
  CheckCircle as CheckCircleIcon,
  Pending as PendingIcon,
  Search as SearchIcon,
  Add as AddIcon,
  Mic as MicIcon,
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
const MOBILE_SIDEBAR_WIDTH = '85vw';

const ReviewsHome = () => {
  const { publicId } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
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
  const lastFetchRef = useRef(0);

  const selectedReviewId = publicId || null;

  const activeReview = useMemo(() => {
    if (!workflowReviewId) return null;
    return reviews.find((item) => item.public_id === workflowReviewId) || null;
  }, [reviews, workflowReviewId]);

  const existingNote = useMemo(() => getExistingNote(activeReview), [activeReview]);
  const existingTranscript = useMemo(
    () => collectReviewTranscripts(activeReview),
    [activeReview]
  );

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    const token = await getAccessToken();
    
    if (!token) {
      navigate('/login');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('https://service.prestigedelta.com/provider-reviews/?hours=168', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setReviews(data || []);
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

  const filteredReviews = useMemo(() => {
    let filtered = reviews;

    if (filter === 'finalized') {
      filtered = filtered.filter(r => r.is_finalized);
    } else if (filter === 'pending') {
      filtered = filtered.filter(r => !r.is_finalized);
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
  }, [reviews, filter, searchTerm]);

  const handleReviewSelect = (reviewPublicId) => {
    navigate(`/reviews/${reviewPublicId}`);
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

    return review.is_finalized ? (
      <CheckCircleIcon sx={{ color: 'success.main', fontSize: 20, ml: 1 }} />
    ) : (
      <PendingIcon sx={{ color: 'warning.main', fontSize: 20, ml: 1 }} />
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
        </Stack>
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
                <ListItemButton
                  selected={selectedReviewId === review.public_id}
                  onClick={() => handleReviewSelect(review.public_id)}
                  sx={{
                    py: 2,
                    px: 2,
                    '&.Mui-selected': {
                      bgcolor: 'action.selected',
                      borderRight: '3px solid',
                      borderColor: 'primary.main'
                    }
                  }}
                >
                  <ListItemAvatar>
                    <Avatar sx={{ 
                      bgcolor: 'primary.main',
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
                      </Box>
                    }
                  />
                </ListItemButton>
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
          {selectedReviewId ? (
            <ReviewDetail embedded onUpdate={fetchReviews} />
          ) : (
            emptyState
          )}
        </Box>
      </Box>

      {/* Workflow Stepper */}
      {workflowStage > 0 && (
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
      )}

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
