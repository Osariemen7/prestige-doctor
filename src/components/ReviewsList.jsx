import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  CircularProgress,
  Container,
  Grid,
  Avatar,
  IconButton,
  TextField,
  InputAdornment,
  Stack,
  useMediaQuery,
  useTheme
} from '@mui/material';
import {
  Description as DescriptionIcon,
  CheckCircle as CheckCircleIcon,
  Pending as PendingIcon,
  Search as SearchIcon,
  Add as AddIcon,
  Mic as MicIcon,
  PlayArrow as PlayArrowIcon,
  CloudUpload as CloudUploadIcon,
  Autorenew as AutorenewIcon
} from '@mui/icons-material';
import { getAccessToken } from '../api';
import CreateEncounterModal from './CreateEncounterModal';
import RecordingModal from './RecordingModal';
import WorkflowStepper from './WorkflowStepper';
import { useProcessingStatus } from '../contexts/ProcessingStatusContext';
import { getExistingNote, collectReviewTranscripts } from '../utils/reviewUtils';

const ReviewsList = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, finalized, pending
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRecordingModal, setShowRecordingModal] = useState(false);
  const [currentEncounter, setCurrentEncounter] = useState(null);
  const [workflowReviewId, setWorkflowReviewId] = useState(null);
  const [workflowStage, setWorkflowStage] = useState(0);
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { getStatus, processingStatuses } = useProcessingStatus();
  const activeReview = useMemo(() => {
    if (!workflowReviewId) {
      return null;
    }
    return reviews.find((item) => item.public_id === workflowReviewId) || null;
  }, [reviews, workflowReviewId]);

  const existingNote = useMemo(() => getExistingNote(activeReview), [activeReview]);
  const existingTranscript = useMemo(
    () => collectReviewTranscripts(activeReview),
    [activeReview]
  );

  useEffect(() => {
    fetchReviews();
  }, []);

  // Auto-refetch when processing statuses change
  useEffect(() => {
    // Check if any processing just completed (status changed to null)
    const hasActiveProcessing = Object.values(processingStatuses).some(status => status !== null);
    
    if (!hasActiveProcessing && reviews.length > 0) {
      // All processing complete, refetch after a short delay
      const timer = setTimeout(() => {
        fetchReviews();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [processingStatuses, reviews.length]);

  const fetchReviews = async () => {
    setLoading(true);
    const token = await getAccessToken();
    
    if (!token) {
      navigate('/login');
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
      } else {
        console.error('Failed to fetch reviews');
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (isFinalized) => {
    return isFinalized ? 'success' : 'warning';
  };

  const getStatusIcon = (isFinalized) => {
    return isFinalized ? <CheckCircleIcon /> : <PendingIcon />;
  };

  const getStatusLabel = (isFinalized) => {
    return isFinalized ? 'Finalized' : 'Pending';
  };

  const getProcessingStatusChip = (reviewId) => {
    const status = getStatus(reviewId);
    
    if (status === 'uploading') {
      return (
        <Chip
          icon={<CloudUploadIcon />}
          label="Uploading..."
          color="info"
          size="small"
          sx={{ animation: 'pulse 2s infinite' }}
        />
      );
    }
    
    if (status === 'processing') {
      return (
        <Chip
          icon={<AutorenewIcon />}
          label="Processing..."
          color="warning"
          size="small"
          sx={{ animation: 'pulse 2s infinite' }}
        />
      );
    }
    
    return null;
  };

  const filteredReviews = reviews.filter(review => {
    const matchesFilter = filter === 'all' || 
      (filter === 'finalized' && review.is_finalized) ||
      (filter === 'pending' && !review.is_finalized);
    
    const matchesSearch = !searchTerm || 
      review.patient_full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.chief_complaint?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  const handleReviewClick = (publicId) => {
    navigate(`/review/${publicId}`);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  useEffect(() => {
    if (!workflowReviewId) return;
    const status = getStatus(workflowReviewId);
    if (status === 'uploading') {
      setWorkflowStage((prev) => (prev < 2 ? 2 : prev));
    } else if (status === 'processing') {
      setWorkflowStage((prev) => (prev < 3 ? 3 : prev));
    } else if (!status && workflowStage >= 2) {
      setWorkflowStage((prev) => (prev < 4 ? 4 : prev));
    }
  }, [processingStatuses, workflowReviewId, getStatus, workflowStage]);

  const resetWorkflow = () => {
    setCurrentEncounter(null);
    setWorkflowReviewId(null);
    setWorkflowStage(0);
  };

  const workflowIsActive = useMemo(() => Boolean(currentEncounter || workflowReviewId), [currentEncounter, workflowReviewId]);

  const handleWorkflowEvent = (event) => {
    if (event === 'uploading') {
      setWorkflowStage(2);
    } else if (event === 'processing') {
      setWorkflowStage((prev) => (prev < 3 ? 3 : prev));
    } else if (event === 'completed') {
      setWorkflowStage(4);
    } else if (event === 'error') {
      setWorkflowStage((prev) => (prev > 1 ? prev : 1));
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, md: 4 }, px: { xs: 2, md: 3 } }}>
      {/* Header Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant={isMobile ? "h5" : "h4"} fontWeight="bold" gutterBottom>
          Medical Reviews
        </Typography>
        <Typography variant="body1" color="text.secondary" gutterBottom>
          Review and finalize patient encounters
        </Typography>
      </Box>

      {/* Action Buttons */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom fontWeight="bold">
            Start New Review
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Follow the guided steps to capture and document a patient encounter.
          </Typography>
          <WorkflowStepper stage={workflowStage} />
          <Stack direction={isMobile ? 'column' : 'row'} spacing={2} sx={{ flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setShowCreateModal(true);
                setWorkflowStage(0);
              }}
              disabled={workflowIsActive}
              sx={{ flex: isMobile ? '1 1 100%' : '1 1 auto' }}
            >
              {workflowIsActive ? 'Encounter In Progress' : '1. Create Encounter'}
            </Button>
            <Button
              variant="contained"
              startIcon={<MicIcon />}
              onClick={() => setShowRecordingModal(true)}
              disabled={!currentEncounter}
              sx={{ flex: isMobile ? '1 1 100%' : '1 1 auto' }}
            >
              2. Record / Upload Audio
            </Button>
            <Button
              variant="contained"
              startIcon={<PlayArrowIcon />}
              disabled={workflowStage < 3}
              onClick={() => workflowReviewId && navigate(`/review/${workflowReviewId}`)}
              sx={{ flex: isMobile ? '1 1 100%' : '1 1 auto' }}
            >
              3. Review & Finalize
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* Filters and Search */}
      <Box sx={{ mb: 3, display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 2 }}>
        <TextField
          placeholder="Search by patient or complaint..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ flexGrow: 1, minWidth: isMobile ? '100%' : 250 }}
          size={isMobile ? "small" : "medium"}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            )
          }}
        />
        
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
          <Button
            variant={filter === 'all' ? 'contained' : 'outlined'}
            onClick={() => setFilter('all')}
            size={isMobile ? "small" : "medium"}
          >
            All ({reviews.length})
          </Button>
          <Button
            variant={filter === 'pending' ? 'contained' : 'outlined'}
            onClick={() => setFilter('pending')}
            color="warning"
            size={isMobile ? "small" : "medium"}
          >
            Pending ({reviews.filter(r => !r.is_finalized).length})
          </Button>
          <Button
            variant={filter === 'finalized' ? 'contained' : 'outlined'}
            onClick={() => setFilter('finalized')}
            color="success"
            size={isMobile ? "small" : "medium"}
          >
            Finalized ({reviews.filter(r => r.is_finalized).length})
          </Button>
        </Stack>
      </Box>

      {/* Reviews List */}
      {filteredReviews.length === 0 ? (
        <Card elevation={2}>
          <CardContent>
            <Box textAlign="center" py={6}>
              <DescriptionIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2, opacity: 0.5 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No reviews found
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 3 }}>
                {filter !== 'all' 
                  ? 'Try adjusting your filters'
                  : 'Start by creating a new encounter'}
              </Typography>
              {filter === 'all' && (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setShowCreateModal(true)}
                  size="large"
                >
                  Create Your First Encounter
                </Button>
              )}
            </Box>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {filteredReviews.map((review) => {
            const hasEncounter = review.in_person_encounters && review.in_person_encounters.length > 0;
            const encounter = hasEncounter ? review.in_person_encounters[0] : null;
            
            return (
              <Grid item xs={12} key={review.id}>
                <Card 
                  elevation={3}
                  sx={{ 
                    cursor: 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                      boxShadow: 6,
                      transform: 'translateY(-4px)'
                    },
                    borderLeft: review.is_finalized ? '4px solid #4caf50' : '4px solid #ff9800'
                  }}
                  onClick={() => handleReviewClick(review.public_id)}
                >
                  <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                    <Box display="flex" flexDirection={isMobile ? 'column' : 'row'} gap={2}>
                      {/* Avatar Section */}
                      <Box display="flex" alignItems="flex-start" gap={2} flex={1}>
                        <Avatar 
                          sx={{ 
                            bgcolor: review.is_finalized ? 'success.main' : 'warning.main',
                            width: { xs: 48, md: 56 }, 
                            height: { xs: 48, md: 56 }
                          }}
                        >
                          <DescriptionIcon />
                        </Avatar>
                        
                        {/* Info Section */}
                        <Box flex={1}>
                          <Box display="flex" alignItems="center" gap={1} mb={1} flexWrap="wrap">
                            <Typography variant={isMobile ? "subtitle1" : "h6"} fontWeight="bold">
                              {review.patient_full_name || 'Unknown Patient'}
                            </Typography>
                            <Chip
                              icon={getStatusIcon(review.is_finalized)}
                              label={getStatusLabel(review.is_finalized)}
                              color={getStatusColor(review.is_finalized)}
                              size="small"
                            />
                            {!hasEncounter && (
                              <Chip
                                label="No Encounter"
                                color="error"
                                size="small"
                                variant="outlined"
                              />
                            )}
                            {getProcessingStatusChip(review.public_id)}
                          </Box>
                          
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            <strong>Chief Complaint:</strong> {review.chief_complaint || 'Not specified'}
                          </Typography>
                          
                          {encounter && (
                            <>
                              <Typography variant="body2" color="text.secondary" gutterBottom>
                                <strong>Encounter Date:</strong> {formatDate(encounter.encounter_date)}
                              </Typography>
                              
                              {encounter.status && (
                                <Chip
                                  label={`Status: ${encounter.status}`}
                                  size="small"
                                  variant="outlined"
                                  sx={{ mt: 0.5 }}
                                />
                              )}
                            </>
                          )}
                          
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                            Created: {formatDate(review.created)}
                          </Typography>
                        </Box>
                      </Box>
                      
                      {/* Action Button */}
                      <Box 
                        display="flex" 
                        alignItems="center" 
                        sx={{ 
                          minWidth: { xs: '100%', md: 'auto' },
                          mt: { xs: 2, md: 0 }
                        }}
                      >
                        <Button
                          variant={review.is_finalized ? 'outlined' : 'contained'}
                          color={review.is_finalized ? 'success' : 'primary'}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReviewClick(review.public_id);
                          }}
                          fullWidth={isMobile}
                          size={isMobile ? "medium" : "large"}
                        >
                          {review.is_finalized ? 'View Details' : 'Complete Review'}
                        </Button>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Create Encounter Modal */}
      <CreateEncounterModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={(encounter) => {
          setCurrentEncounter(encounter);
          setWorkflowReviewId(encounter.medical_review_public_id);
          setWorkflowStage(1);
          setShowRecordingModal(true);
          fetchReviews();
        }}
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
            navigate(`/review/${workflowReviewId}`);
          }
          resetWorkflow();
        }}
        existingNote={existingNote}
        existingTranscript={existingTranscript}
      />
    </Container>
  );
};

export default ReviewsList;
