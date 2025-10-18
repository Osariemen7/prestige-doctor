import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  Alert
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  CheckCircle as CheckCircleIcon,
  Add as AddIcon,
  Mic as MicIcon,
  Upload as UploadIcon,
  PlayArrow as PlayArrowIcon,
  Warning as WarningIcon,
  CloudUpload as CloudUploadIcon,
  Autorenew as AutorenewIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { getAccessToken } from '../api';
import { useTheme, useMediaQuery } from '@mui/material';
import CreateEncounterModal from './CreateEncounterModal';
import RecordingModal from './RecordingModal';
import { useProcessingStatus } from '../contexts/ProcessingStatusContext';
import { getExistingNote, collectReviewTranscripts } from '../utils/reviewUtils';

const ReviewDetail = () => {
  const { publicId } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { getStatus, processingStatuses } = useProcessingStatus();
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
  const previousStatusRef = useRef(null);

  const existingNote = useMemo(() => getExistingNote(review), [review]);
  const existingTranscript = useMemo(() => collectReviewTranscripts(review), [review]);

  useEffect(() => {
    fetchReviewDetail();
  }, [publicId]);

  // Auto-refetch when processing completes
  useEffect(() => {
    const currentStatus = getStatus(publicId);
    const previousStatus = previousStatusRef.current;
    let timer;

    if (previousStatus && !currentStatus && review) {
      timer = setTimeout(() => {
        fetchReviewDetail();
      }, 1000);
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

  const fetchReviewDetail = async () => {
    setLoading(true);
    const token = await getAccessToken();
    
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const response = await fetch(`https://service.prestigedelta.com/provider-reviews/${publicId}/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setReview(data);
        
        // Pre-fill patient data if available from encounters
        if (data.in_person_encounters && data.in_person_encounters.length > 0) {
          const encounter = data.in_person_encounters[0];
          setPatientData({
            first_name: encounter.patient_first_name || '',
            last_name: encounter.patient_last_name || '',
            phone: encounter.patient_phone || '',
            email: encounter.patient_email || ''
          });
        }
      } else {
        console.error('Failed to fetch review');
        navigate('/reviews');
      }
    } catch (error) {
      console.error('Error fetching review:', error);
      navigate('/reviews');
    } finally {
      setLoading(false);
    }
  };

  const handleFinalizeEncounter = async () => {
    if (!review || !review.in_person_encounters || review.in_person_encounters.length === 0) {
      alert('No encounter found to finalize');
      return;
    }

    setSaving(true);
    const token = await getAccessToken();
    const encounter = review.in_person_encounters[0];

    try {
      const finalizePayload = {
        note_payload: review.doctor_note || {},
        create_patient: true,
        send_summary: false,
        patient_first_name: patientData.first_name,
        patient_last_name: patientData.last_name,
        patient_phone: patientData.phone,
        patient_email: patientData.email,
        patient_summary: review.patient_summary || ''
      };

      const response = await fetch(
        `https://service.prestigedelta.com/in-person-encounters/${encounter.public_id}/finalize/`,
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
        alert('Encounter finalized successfully!');
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
    const token = await getAccessToken();

    try {
      // Find the encounter to update
      const encounter = review.in_person_encounters && review.in_person_encounters.length > 0
        ? review.in_person_encounters[0]
        : null;

      if (!encounter) {
        alert('No encounter found to update');
        return;
      }

      const updatePayload = {
        note_payload: editedNote,
        create_patient: false,
        send_summary: false
      };

      const response = await fetch(
        `https://service.prestigedelta.com/in-person-encounters/${encounter.public_id}/finalize/`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updatePayload)
        }
      );

      if (response.ok) {
        setEditingNote(false);
        setEditedNote(null);
        fetchReviewDetail(); // Refresh to show updated note
      } else {
        const error = await response.json();
        alert(`Failed to save note: ${JSON.stringify(error)}`);
      }
    } catch (error) {
      console.error('Error saving note:', error);
      alert('An error occurred while saving the note');
    } finally {
      setSaving(false);
    }
  };

  const handleEditNote = () => {
    setEditingNote(true);
    setEditedNote(review.doctor_note ? { ...review.doctor_note } : {});
  };

  const handleCancelEdit = () => {
    setEditingNote(false);
    setEditedNote(null);
  };

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
      const response = await fetch('https://service.prestigedelta.com/in-person-encounters/', {
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
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', color: 'text.secondary', pl: 2 }}>
                      {typeof value === 'object' ? JSON.stringify(value, null, 2) : value}
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

  const renderPrescriptions = (prescriptions) => {
    if (!prescriptions || prescriptions.length === 0) return null;

    return (
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" fontWeight="bold" gutterBottom color="primary">
          💊 Prescriptions
        </Typography>
        <Grid container spacing={2}>
          {prescriptions.map((prescription, index) => (
            <Grid item xs={12} md={6} key={index}>
              <Card elevation={2} sx={{ height: '100%', borderLeft: '4px solid', borderColor: 'success.main' }}>
                <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                  <Typography variant="subtitle1" fontWeight="bold" color="success.dark" gutterBottom>
                    {prescription.medication_name}
                  </Typography>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    <strong>Dosage:</strong> {prescription.dosage}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    <strong>Route:</strong> {prescription.route}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    <strong>Interval:</strong> Every {prescription.interval} hours
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>End Date:</strong> {prescription.end_date}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1, p: 1, bgcolor: 'grey.100', borderRadius: 1 }}>
                    <strong>Instructions:</strong> {prescription.instructions}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  };

  const renderInvestigations = (investigations) => {
    if (!investigations || investigations.length === 0) return null;

    return (
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" fontWeight="bold" gutterBottom color="primary">
          🔬 Investigations
        </Typography>
        <Grid container spacing={2}>
          {investigations.map((investigation, index) => (
            <Grid item xs={12} md={6} key={index}>
              <Card elevation={2} sx={{ height: '100%', borderLeft: '4px solid', borderColor: 'info.main' }}>
                <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                  <Typography variant="subtitle1" fontWeight="bold" color="info.dark" gutterBottom>
                    {investigation.test_type}
                  </Typography>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    <strong>Reason:</strong> {investigation.reason}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Instructions:</strong> {investigation.instructions}
                  </Typography>
                  {investigation.scheduled_time && (
                    <Typography variant="body2" sx={{ p: 1, bgcolor: 'grey.100', borderRadius: 1 }}>
                      <strong>Scheduled:</strong> {new Date(investigation.scheduled_time).toLocaleString()}
                    </Typography>
                  )}
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

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, md: 4 }, px: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/reviews')}
          sx={{ mb: 2 }}
        >
          Back to Reviews
        </Button>
        
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
          </Box>
          
          {!review.is_finalized && (
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={() => setShowFinalizeDialog(true)}
              size={isMobile ? "medium" : "large"}
              disabled={!hasEncounter}
              fullWidth={isMobile}
            >
              Save Encounter
            </Button>
          )}
        </Box>
      </Box>

      {/* Processing Status Banner */}
      {(() => {
        const currentStatus = getStatus(publicId);
        if (currentStatus === 'uploading') {
          return (
            <Alert 
              severity="info" 
              icon={<CloudUploadIcon />}
              sx={{ mb: 3, animation: 'pulse 2s infinite' }}
            >
              <Typography variant="subtitle1" fontWeight="bold">
                Uploading Audio...
              </Typography>
              <Typography variant="body2">
                Your recording is being uploaded. This may take a moment.
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
        <Card sx={{ mb: 3, background: (hasEncounter || currentEncounter) ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
          <CardContent>
            <Typography variant="h6" color="white" gutterBottom fontWeight="bold">
              {(hasEncounter || currentEncounter) ? 'Review Workflow' : 'Complete These Steps'}
            </Typography>
            <Typography variant="body2" color="white" sx={{ mb: 2, opacity: 0.9 }}>
              {currentEncounter 
                ? `Encounter ID: ${currentEncounter.public_id.substring(0, 8)}... - Now record the consultation`
                : hasEncounter 
                  ? 'This review has an encounter. You can now save it.' 
                  : 'Create and process an encounter before saving this review'}
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
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
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  variant="contained"
                  startIcon={creatingEncounter ? <CircularProgress size={20} color="inherit" /> : <MicIcon />}
                  onClick={handleRecordClick}
                  disabled={creatingEncounter}
                  fullWidth
                  sx={{ 
                    bgcolor: (currentEncounter || hasEncounter) ? 'white' : 'rgba(255,255,255,0.2)',
                    color: (currentEncounter || hasEncounter) ? 'primary.main' : 'white',
                    '&:hover': { bgcolor: (currentEncounter || hasEncounter) ? 'grey.100' : 'rgba(255,255,255,0.3)' }
                  }}
                >
                  {creatingEncounter ? 'Creating...' : '2. Record'}
                </Button>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  variant="contained"
                  startIcon={<UploadIcon />}
                  disabled
                  fullWidth
                  sx={{ 
                    bgcolor: 'rgba(255,255,255,0.2)',
                    color: 'white',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' }
                  }}
                >
                  3. Upload
                </Button>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  variant="contained"
                  startIcon={<PlayArrowIcon />}
                  onClick={() => {
                    const encounterId = currentEncounter?.public_id || encounter?.public_id;
                    if (encounterId) navigate(`/process/${encounterId}`);
                  }}
                  disabled={!hasEncounter && !currentEncounter}
                  fullWidth
                  sx={{ 
                    bgcolor: 'rgba(255,255,255,0.2)',
                    color: 'white',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' }
                  }}
                >
                  4. Process
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
                <strong>Name:</strong> {review.patient_full_name || 'Not specified'}
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
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                <strong>Status:</strong> {review.review_status || 'Unknown'}
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

      {/* Doctor's Note */}
      {review.doctor_note && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h5" fontWeight="bold" color="primary">
              Doctor's Note
            </Typography>
            {!editingNote ? (
              <Button
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={handleEditNote}
                size="small"
              >
                Edit Note
              </Button>
            ) : (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={handleSaveNote}
                  disabled={saving}
                  size="small"
                >
                  {saving ? 'Saving...' : 'Save'}
                </Button>
                <Button
                  variant="outlined"
                  onClick={handleCancelEdit}
                  disabled={saving}
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
          {renderPrescriptions(review.doctor_note.prescription)}
          {renderInvestigations(review.doctor_note.investigation)}
        </Box>
      )}

      {/* Patient Summary */}
      {review.patient_summary && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" fontWeight="bold" gutterBottom color="primary">
            📋 Patient Summary
          </Typography>
          <Card elevation={2} sx={{ borderLeft: '4px solid', borderColor: 'secondary.main' }}>
            <CardContent sx={{ p: { xs: 2, md: 3 }, bgcolor: 'grey.50' }}>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>
                {review.patient_summary}
              </Typography>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* No Content Warning */}
      {!review.doctor_note && !review.patient_summary && (
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
            Please confirm or update patient information before finalizing.
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
                placeholder="+2347012345678"
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
        reviewId={publicId}
        onComplete={fetchReviewDetail}
        existingNote={existingNote}
        existingTranscript={existingTranscript}
      />
    </Container>
  );
};

export default ReviewDetail;
