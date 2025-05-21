import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Grid,
  Paper,
  AppBar,
  Toolbar,
  IconButton,
  Tabs,
  Tab,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  InputAdornment,
  Snackbar, // Import Snackbar for copy confirmation
  Alert as MuiAlert // Import Alert for copy confirmation
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Person as PersonIcon,
  Assignment as AssignmentIcon,
  Chat as ChatIcon,
  Science as ScienceIcon,
  ReceiptLong as ReceiptLongIcon,
  Assessment as AssessmentIcon,
  TrackChanges as TrackChangesIcon,
  Search as SearchIcon,
  SpeakerNotes as SpeakerNotesIcon,
  Close as CloseIcon,
  Lock as LockIcon,
  Share as ShareIcon, 
  ContentCopy as ContentCopyIcon,
  WhatsApp as WhatsAppIcon,
  Twitter as TwitterIcon,
  LinkedIn as LinkedInIcon,
  Reddit as RedditIcon,
  Check as CheckIcon, // Add CheckIcon for copy confirmation
} from '@mui/icons-material';
import { getAccessToken } from '../api';
import Sidebar from '../sidebar';

// Import sub-components (will be created in subsequent steps)
import CollaborationView from './CollaborationView'; // Ensure this import exists
import DoctorNoteDisplay from './DoctorNoteDisplay'; // Ensure this import exists
import TranscriptView from './TranscriptView';
import PatientProfileView from './PatientProfileView';
import HealthGoalView from './HealthGoalView';

const ConsultDetailPage = () => {
  const { publicId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const {
    patientFullName,
    patientId,
    collaborating_providers: navCollaboratingProviders,
    // patient_profile_data should be part of location.state
  } = location.state || {};

  // Add new state for medical reviews and pagination
  const [medicalReviews, setMedicalReviews] = useState([]);
  const [selectedReview, setSelectedReview] = useState(null);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [reviewsError, setReviewsError] = useState(null);
  const [nextPageUrl, setNextPageUrl] = useState(null);
  const [prevPageUrl, setPrevPageUrl] = useState(null);
  const [currentReviewPage, setCurrentReviewPage] = useState(1);
  const [totalReviewCount, setTotalReviewCount] = useState(0);

  // Initialize consultData with values from location.state if available
  const [consultData, setConsultData] = useState(() => {
    const initialState = {
      doctor_note: null,
      public_doctor_note: null,
      session_conversation: [],
      patient_data: null, // This will hold patient_profile_data
      collaborating_providers: navCollaboratingProviders || [],
      provider_id: null,
      id: publicId,
    };
    if (location.state) {
      initialState.doctor_note = location.state.doctor_note || null;
      initialState.public_doctor_note = location.state.public_doctor_note || null;
      initialState.session_conversation = location.state.session_conversation || [];
      // Correctly initialize patient_data from location.state.patient_profile_data
      initialState.patient_data = location.state.patient_profile_data || null;
      initialState.collaborating_providers = navCollaboratingProviders || location.state.collaborating_providers || [];
      initialState.provider_id = location.state.provider_id || null;
      initialState.id = publicId || location.state.id || null;
    }
    return initialState;
  });

  // When a selectedReview is set, update relevant parts of consultData
  useEffect(() => {
    if (selectedReview) {
      setConsultData(prevData => ({
        ...prevData, // Preserve existing data like patient_data, id
        doctor_note: selectedReview.doctor_note,
        public_doctor_note: selectedReview.public_doctor_note,
        session_conversation: selectedReview.session_conversation || [],
        collaborating_providers: (selectedReview.collaborating_providers && selectedReview.collaborating_providers.length > 0)
          ? selectedReview.collaborating_providers
          : prevData.collaborating_providers,
        provider_id: selectedReview.provider_id || prevData.provider_id,
        // patient_data should remain from the initial load or be explicitly updated if review has it
        // For now, assuming patient_data is primarily from the main consult (location.state)
      }));
    } else {
      // If selectedReview is cleared, revert to initial state from location.state or defaults
      if (location.state) {
        setConsultData(prevData => ({
          ...prevData, // Keep existing patient_data unless it needs to be reset
          doctor_note: location.state.doctor_note || null,
          public_doctor_note: location.state.public_doctor_note || null,
          session_conversation: location.state.session_conversation || [],
          collaborating_providers: navCollaboratingProviders || location.state.collaborating_providers || [],
          provider_id: location.state.provider_id || null,
          id: publicId || location.state.id || null,
          // Ensure patient_data is correctly sourced if not from selectedReview
          patient_data: location.state.patient_profile_data || prevData.patient_data || null,
        }));
      } else {
        // Fallback if no location.state (e.g. direct navigation)
        // In this case, patient_data might need to be fetched or will remain null
        setConsultData({
          doctor_note: null,
          public_doctor_note: null,
          session_conversation: [],
          patient_data: null, // Or fetch if necessary
          collaborating_providers: navCollaboratingProviders || [],
          provider_id: null,
          id: publicId,
        });
      }
    }
  }, [selectedReview, publicId, location.state, navCollaboratingProviders]);

  // This useEffect handles the case where location.state might update after initial render
  // or if selectedReview is not immediately available.
  useEffect(() => {
    if (navCollaboratingProviders && navCollaboratingProviders.length > 0) {
      setConsultData(prevData => ({
        ...prevData,
        collaborating_providers: navCollaboratingProviders,
      }));
    }
    // Ensure patient_data is also set from location.state if not already present
    if (location.state && location.state.patient_profile_data && !consultData.patient_data) {
        setConsultData(prevData => ({
            ...prevData,
            patient_data: location.state.patient_profile_data,
        }));
    }
  }, [navCollaboratingProviders, location.state, consultData.patient_data]);

  const [isSidebarMinimized, setIsSidebarMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [isTranscriptModalOpen, setIsTranscriptModalOpen] = useState(false);  const [shareDialogOpen, setShareDialogOpen] = useState(false); // For share dialog
  const [snackbarOpen, setSnackbarOpen] = useState(false); // For copy snackbar
  const [snackbarMessage, setSnackbarMessage] = useState(''); // For copy snackbar message

  // Fetch medical reviews from API
  useEffect(() => {
    const fetchMedicalReviews = async (url = null) => {
      if (!patientId) return;
      
      setLoadingReviews(true);
      setReviewsError(null);
      
      try {
        const token = await getAccessToken();
        if (!token) {
          throw new Error('Authentication required. Please log in again.');
        }
        
        const endpoint = url || `https://health.prestigedelta.com/patient-consults/${patientId}/medical_reviews/?page=${currentReviewPage}`;
        const response = await fetch(endpoint, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(`HTTP error! status: ${response.status}, body: ${errorBody}`);
        }
        
        const data = await response.json();
        
        // Handle paginated response
        setMedicalReviews(Array.isArray(data.results) ? data.results : []);
        setNextPageUrl(data.next);
        setPrevPageUrl(data.previous);
        setTotalReviewCount(data.count || 0);
        
        // Set the first review as the default selected review if we have reviews and no review is selected yet
        if (Array.isArray(data.results) && data.results.length > 0 && !selectedReview) {
          setSelectedReview(data.results[0]);
        }
      } catch (e) {
        console.error("Failed to fetch medical reviews:", e);
        setReviewsError(e.message);
      } finally {
        setLoadingReviews(false);
      }
    };
    
    fetchMedicalReviews();
    // eslint-disable-next-line
  }, [patientId, currentReviewPage]);

  const handlePageChange = (direction) => {
    if (direction === 'next' && nextPageUrl) {
      setCurrentReviewPage((prev) => prev + 1);
    } else if (direction === 'prev' && prevPageUrl) {
      setCurrentReviewPage((prev) => Math.max(1, prev - 1));
    }
  };

  // State for sharing functionality
  const [showShareModal, setShowShareModal] = useState(false);
  const [anonymizedNoteForShare, setAnonymizedNoteForShare] = useState(null);
  const [anonymizingNote, setAnonymizingNote] = useState(false);
  const [anonymizeError, setAnonymizeError] = useState(null);
  
  // Add states for copy feedback
  const [copySuccess, setCopySuccess] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  // Remove fetchConsultDetails and useEffect for fetching, since we are using navigation state props only

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    // No error state to clear
  };
  
  const openTranscriptModal = () => setIsTranscriptModalOpen(true);
  const closeTranscriptModal = () => setIsTranscriptModalOpen(false);
  const handleNavigate = (path) => navigate(path);
  const handleLogout = () => navigate('/login');
  const handleOpenShareModal = async () => {
    if (!publicId) return;
    setAnonymizingNote(true);
    setAnonymizeError(null);
    setAnonymizedNoteForShare(null); // Clear previous note
    setCopySuccess(false); // Reset copy success state
    
    try {
      // If we already have an anonymized note (public_doctor_note), use it
      if (consultData.public_doctor_note) {
        setAnonymizedNoteForShare(consultData.public_doctor_note);
        setShareUrl(window.location.origin + `/shared-note/${publicId}`);
        setShowShareModal(true);
        setAnonymizingNote(false);
        return;
      }
      
      // Otherwise, call the API to generate a new anonymized note
      const token = await getAccessToken();
      if (!token) {
        throw new Error("Authentication required to anonymize and share note.");
      }

      const response = await fetch(`https://health.prestigedelta.com/review-note/${publicId}/anonymize_doctor_note/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorBody = await response.text();
        let specificError = `Failed to anonymize note. Status: ${response.status}`;
        try {
            const parsedError = JSON.parse(errorBody);
            specificError = parsedError.detail || parsedError.message || specificError;
        } catch (parseErr) {
            // If errorBody is not JSON, append it directly
            specificError = `${specificError} - ${errorBody}`;
        }
        throw new Error(specificError);
      }

      const data = await response.json();
      if (data.public_doctor_note) {
        setAnonymizedNoteForShare(data.public_doctor_note);
        // Generate a shareable URL - adjust this based on your actual sharing mechanism
        setShareUrl(window.location.origin + `/shared-note/${publicId}`);
        setShowShareModal(true);
      } else {
        throw new Error("Anonymized note data is not in the expected format. Missing 'public_doctor_note' field.");
      }
    } catch (e) {
      console.error("Error anonymizing note:", e);
      setAnonymizeError(e.message);
      // Optionally open the modal even on error to show the error message
      setShowShareModal(true); 
    } finally {
      setAnonymizingNote(false);
    }
  };

  const handleCloseShareModal = () => {
    setShowShareModal(false);
    setCopySuccess(false); // Reset copy success state
    // Keep anonymizedNoteForShare if you want to show stale data on quick reopen, or clear it.
    // setAnonymizedNoteForShare(null); 
    // Keep anonymizeError so user can see it if modal is re-opened quickly, or clear it:
    // setAnonymizeError(null); 
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopySuccess(true);
      // Auto-hide success message after 3 seconds
      setTimeout(() => setCopySuccess(false), 3000);
    } catch (e) {
      console.error("Failed to copy link:", e);
      // You could set an error state here if you want to show an error message
    }
  };

  const renderAnonymizedNotePreview = (note) => {
    if (!note) return <Typography>No anonymized content to display.</Typography>;

    const renderSection = (title, content) => {
      if (content === null || typeof content === 'undefined') return null;
      return (
        <Box key={title} sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ textTransform: 'capitalize', mt: 1, mb: 0.5, borderBottom: '1px solid #eee', pb: 0.5 }}>{title.replace(/_/g, ' ')}</Typography>
          {typeof content === 'object' && !Array.isArray(content) ? (
            Object.entries(content).map(([key, value]) => (
              <Box key={key} sx={{ pl: 1, mb: 0.5 }}>
                <Typography variant="subtitle2" component="span" sx={{ fontWeight: 'bold', textTransform: 'capitalize' }}>{key.replace(/_/g, ' ')}: </Typography>
                {value !== null && typeof value === 'object' && !Array.isArray(value) ? 
                  Object.entries(value).map(([subKey, subValue]) => (
                     <Typography variant="body2" key={subKey} sx={{ display: 'block', pl:1 }}>
                       <Box component="span" sx={{textTransform: 'capitalize', fontWeight:'500'}}>{subKey.replace(/_/g, ' ')}:</Box> {String(subValue)}
                     </Typography>
                  ))
                : Array.isArray(value) && value.length > 0 ? (
                  value.map((item, index) => (
                    <Box key={index} sx={{ pl: 2, borderLeft: '2px solid #f0f0f0', ml:1, my: 0.5 }}>
                      {typeof item === 'object' && item !== null ? (
                        Object.entries(item).map(([itemKey, itemValue]) => (
                           <Typography variant="body2" key={itemKey} sx={{ display: 'block' }}>
                             <Box component="span" sx={{textTransform: 'capitalize', fontWeight:'500'}}>{itemKey.replace(/_/g, ' ')}:</Box> {String(itemValue)}
                           </Typography>
                        ))
                      ) : (
                        <Typography variant="body2" sx={{ display: 'block' }}>{String(item)}</Typography>
                      )}
                    </Box>
                  ))
                ) : (
                  <Typography variant="body2" component="span">{String(value)}</Typography>
                )}
              </Box>
            ))
          ) : Array.isArray(content) && content.length > 0 ? (
             content.map((item, index) => (
                <Box key={index} sx={{ pl: 2, borderLeft: '2px solid #f0f0f0', ml:1, my: 0.5 }}>
                  {typeof item === 'object' && item !== null ? (
                    Object.entries(item).map(([itemKey, itemValue]) => (
                       <Typography variant="body2" key={itemKey} sx={{ display: 'block' }}>
                         <Box component="span" sx={{textTransform: 'capitalize', fontWeight:'500'}}>{itemKey.replace(/_/g, ' ')}:</Box> {String(itemValue)}
                       </Typography>
                    ))
                  ) : (
                    <Typography variant="body2" sx={{ display: 'block' }}>{String(item)}</Typography>
                  )}
                </Box>
              ))
          ) : (
            <Typography variant="body2">{String(content)}</Typography>
          )}
        </Box>
      );
    }

    return (
      <>
        {renderSection('subjective', note.subjective)}
        {renderSection('objective', note.objective)}
        {renderSection('assessment', note.assessment)}
        {renderSection('plan', note.plan)}
        {note.prescription && Array.isArray(note.prescription) && note.prescription.length > 0 && renderSection('prescription', note.prescription)}
        {note.investigation && Array.isArray(note.investigation) && note.investigation.length > 0 && renderSection('investigation', note.investigation)}
        {note.next_review && renderSection('next_review', note.next_review)}
      </>
    );
  };


  // REMOVE loading, error states and related UI logic
  // Fallback for consultData if it's null after loading/error states are passed
  const {
    doctor_note,
    public_doctor_note,
    session_conversation,
    patient_data,
    collaborating_providers,
    provider_id
  } = consultData;

  // Determine which note to display
  const noteForDisplay = doctor_note || public_doctor_note;
  
  // Extract collaborating_providers from navigation state, selectedReview, or fallback to empty array
  // const collaboratingProviders =
  //   consultData.collaborating_providers && consultData.collaborating_providers.length > 0
  //     ? consultData.collaborating_providers
  //     : (selectedReview && selectedReview.collaborating_providers && selectedReview.collaborating_providers.length > 0
  //         ? selectedReview.collaborating_providers
  //         : []);

  // Extract medical history from the reviews, not from navigation state
  const effectiveMedicalHistory = medicalReviews || [];

  // Use patientFullName and patientId from navigation state
  const displayName = patientFullName || 'N/A';
  const displayPatientId = patientId || consultData?.id; // Use internal ID from navigation state or API

  return (
    <div className="dashboard-container" style={{ display: 'flex' }}>
      <Sidebar
        onNavigate={handleNavigate}
        onLogout={handleLogout}
        onToggleSidebar={setIsSidebarMinimized}
      />
      <Box 
        component="main" 
        sx={{ 
          flexGrow: 1, 
          p: 0, 
          marginLeft: {
            xs: 0, // Mobile screens - sidebar is overlay
            sm: 0, // Small tablets - sidebar is overlay
            md: 0, // Medium tablets - sidebar is overlay
            lg: isSidebarMinimized ? '64px' : '250px' // Large screens (desktops) - static sidebar
          },
          transition: 'margin-left 0.3s ease-in-out',
          backgroundColor: '#f4f6f8', // Light background for the page
          minHeight: '100vh',
          width: { xs: '100%', sm: 'auto' } // Full width on mobile
        }}
      >
        <AppBar position="static" color="default" elevation={1} sx={{ backgroundColor: 'white' }}>
          <Toolbar sx={{ flexWrap: 'wrap', p: { xs: 1, sm: 2 } }}>
            <IconButton edge="start" color="inherit" onClick={() => navigate(-1)} aria-label="back">
              <ArrowBackIcon />
            </IconButton>
            <Typography 
              variant="h6" 
              component="div" 
              sx={{ 
                flexGrow: 1, 
                color: 'primary.main', 
                fontWeight: 'bold',
                fontSize: { xs: '0.9rem', sm: '1.25rem' },
                ml: 1,
                // Handle long names on mobile
                whiteSpace: { xs: 'normal', sm: 'nowrap' },
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {/* Simplified text on mobile */}
              <Box sx={{ display: { xs: 'inline', sm: 'none' } }}>
                {displayName}
              </Box>
              <Box sx={{ display: { xs: 'none', sm: 'inline' } }}>
                Patient: {displayName} (ID: {displayPatientId})
              </Box>
            </Typography>
          </Toolbar>
        </AppBar>

        <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 3 }, px: { xs: 1, sm: 2, md: 3 } }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            indicatorColor="primary"
            textColor="primary"
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            aria-label="consultation detail tabs"
            sx={{
              mb: { xs: 1, sm: 3 },
              borderBottom: 1,
              borderColor: 'divider',
              ml: 0,
              pl: 0,
              width: '100%',
              maxWidth: '100%',
              minHeight: 48,
              '& .MuiTab-root': {
                minWidth: 0,
                px: { xs: 0.5, sm: 2 },
                py: { xs: 0.5, sm: 1.5 },
                fontSize: { xs: '0.7rem', sm: '0.875rem' },
                flex: 1,
                minHeight: 48,
                maxWidth: { xs: 48, sm: 160 },
              },
              '& .MuiTabs-flexContainer': {
                justifyContent: { xs: 'space-between', sm: 'flex-start' },
              },
            }}
          >
            <Tab icon={<AssignmentIcon />} iconPosition="start" label={<Box sx={{ display: { xs: 'none', sm: 'block' } }}>Doctor's Note</Box>} />
            <Tab icon={<ChatIcon />} iconPosition="start" label={<Box sx={{ display: { xs: 'none', sm: 'block' } }}>Medical Team</Box>} />
            <Tab icon={<PersonIcon />} iconPosition="start" label={<Box sx={{ display: { xs: 'none', sm: 'block' } }}>Patient Profile</Box>} />
            <Tab icon={<TrackChangesIcon />} iconPosition="start" label={<Box sx={{ display: { xs: 'none', sm: 'block' } }}>Health Goals</Box>} />
          </Tabs>

          {/* Tab Panels */}
          <Box>
            {activeTab === 0 && (
              <Paper elevation={2} sx={{ p: { xs: 1.5, sm: 2, md: 3 }, borderRadius: 2 }}>
                {/* Doctor Note Actions - Moved to the top */}
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'flex-end', 
                  mb: 3, 
                  gap: 2, 
                  alignItems: 'center',
                  flexWrap: 'wrap'
                }}>
                  <Button
                    variant="outlined"
                    startIcon={<SpeakerNotesIcon />}
                    onClick={openTranscriptModal}
                    sx={{ 
                      fontSize: { xs: '0.8rem', sm: '0.9rem' },
                      py: 1,
                      borderRadius: '8px',
                      borderColor: 'primary.main',
                      '&:hover': {
                        borderColor: 'primary.dark',
                        backgroundColor: 'rgba(25, 118, 210, 0.08)'
                      }
                    }}
                  >
                    <Box>View Transcript</Box>
                  </Button>
                  
                  <Button
                    variant="contained"
                    startIcon={<ShareIcon />}
                    onClick={handleOpenShareModal}
                    disabled={anonymizingNote}
                    sx={{ 
                      fontSize: { xs: '0.8rem', sm: '0.9rem' },
                      py: 1,
                      px: 2,
                      borderRadius: '8px',
                      background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                      boxShadow: '0 4px 10px rgba(33, 150, 243, 0.3)',
                      '&:hover': {
                        background: 'linear-gradient(45deg, #1976D2 30%, #0DA8E0 90%)',
                        boxShadow: '0 6px 12px rgba(33, 150, 243, 0.4)'
                      }
                    }}
                  >
                    {anonymizingNote ? 'Preparing Note...' : 'Share Doctor Note'}
                  </Button>
                </Box>
                
                <DoctorNoteDisplay 
                  initialNote={noteForDisplay}
                  medicalHistory={effectiveMedicalHistory}
                  currentConsultId={publicId}
                />
                
                {/* Add review selection dropdown and pagination controls */}
                <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box sx={{ 
                    display: 'flex', 
                    flexDirection: { xs: 'column', sm: 'row' }, 
                    alignItems: { sm: 'center' }, 
                    justifyContent: 'space-between', 
                    gap: 2 
                  }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
                      Medical History (Showing {medicalReviews.length} of {totalReviewCount} reviews)
                    </Typography>
                    
                    {loadingReviews ? (
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <CircularProgress size={20} sx={{ mr: 1 }} />
                        <Typography variant="body2">Loading reviews...</Typography>
                      </Box>
                    ) : reviewsError ? (
                      <Typography variant="body2" color="error">
                        Error: {reviewsError}
                      </Typography>
                    ) : (
                      <Box sx={{ 
                        display: 'flex', 
                        flexDirection: { xs: 'column', sm: 'row' }, 
                        alignItems: 'center', 
                        gap: 2 
                      }}>
                        {/* Review selector dropdown */}
                        <Box sx={{ minWidth: 200 }}>
                          <select 
                            value={selectedReview?.id || ''} 
                            onChange={(e) => {
                              const selectedId = Number(e.target.value);
                              const review = medicalReviews.find(r => r.id === selectedId);
                              if (review) {
                                setSelectedReview(review);
                              }
                            }}
                          >
                            {medicalReviews.map(review => (
                              <option key={review.id} value={review.id}>
                                {new Date(review.created).toLocaleDateString()} - {review.assessment_diagnosis || 'Consultation'}
                              </option>
                            ))}
                          </select>
                        </Box>

                        {/* Pagination controls */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Button 
                            variant="outlined" 
                            onClick={() => handlePageChange('prev')} 
                            disabled={!prevPageUrl}
                            size="small"
                            sx={{ 
                              minWidth: 0, 
                              borderRadius: 1, 
                              px: 2, 
                              py: 1, 
                              fontSize: '0.875rem',
                              color: prevPageUrl ? 'primary.main' : 'text.disabled',
                              borderColor: prevPageUrl ? 'primary.main' : 'divider',
                              '&:hover': {
                                borderColor: prevPageUrl ? 'primary.dark' : 'divider',
                              },
                            }}
                          >
                            <Typography variant="body2" sx={{ fontWeight: 'medium' }}>Previous</Typography>
                          </Button>
                          <Button 
                            variant="outlined" 
                            onClick={() => handlePageChange('next')} 
                            disabled={!nextPageUrl}
                            size="small"
                            sx={{ 
                              minWidth: 0, 
                              borderRadius: 1, 
                              px: 2, 
                              py: 1, 
                              fontSize: '0.875rem',
                              color: nextPageUrl ? 'primary.main' : 'text.disabled',
                              borderColor: nextPageUrl ? 'primary.main' : 'divider',
                              '&:hover': {
                                borderColor: nextPageUrl ? 'primary.dark' : 'divider',
                              },
                            }}
                          >
                            <Typography variant="body2" sx={{ fontWeight: 'medium' }}>Next</Typography>
                          </Button>
                        </Box>
                      </Box>
                    )}
                  </Box>
                </Box>
              </Paper>
            )}
            {activeTab === 1 && (
              <Paper elevation={2} sx={{ p: { xs: 1.5, sm: 2, md: 3 }, borderRadius: 2 }}>
                <CollaborationView 
                  publicId={publicId}
                  patientId={patientId || consultData.patient_id}
                  initialCollaboratingProviders={consultData.collaborating_providers || []}
                  onProviderSelect={(provider) => {
                    // Navigate to provider's profile or perform any action
                    console.log("Selected provider:", provider);
                  }}
                />
              </Paper>
            )}
            {activeTab === 2 && (
              <Paper elevation={2} sx={{ p: { xs: 1.5, sm: 2, md: 3 }, borderRadius: 2 }}>
                <PatientProfileView 
                  profile={patient_data}
                  patientId={patientId}
                  onEdit={() => {
                    // Handle edit action
                    console.log("Edit patient profile");
                  }}
                />
              </Paper>
            )}
            {activeTab === 3 && (
              <Paper elevation={2} sx={{ p: { xs: 1.5, sm: 2, md: 3 }, borderRadius: 2 }}>                <HealthGoalView 
                  patientId={patientId}
                  publicConsultId={publicId}
                  onGoalSelect={(goal) => {
                    // Handle goal selection
                    console.log("Selected goal:", goal);
                  }}
                />
              </Paper>
            )}
          </Box>
        </Container>

        {/* Transcript modal - simplified and always show the note content */}
        <Dialog
          open={isTranscriptModalOpen}
          onClose={closeTranscriptModal}
          maxWidth="md"
          fullWidth
          sx={{ '& .MuiDialog-paper': { borderRadius: 2 } }}
        >
          <DialogTitle onClose={closeTranscriptModal}>
            <Typography variant="h6" sx={{ fontWeight: 'medium' }}>
              Transcript and Doctor's Note
            </Typography>
          </DialogTitle>
          <DialogContent dividers sx={{ p: { xs: 2, sm: 3 } }}>
            {session_conversation && session_conversation.length > 0 ? (
              <Box sx={{ 
                maxHeight: '60vh',
                overflowY: 'auto'
              }}>
                {session_conversation.map((message, index) => (
                  <Box 
                    key={index} 
                    sx={{ 
                      mb: 2, 
                      p: 2, 
                      borderRadius: 1, 
                      backgroundColor: index % 2 === 0 ? '#f5f5f5' : 'white',
                      border: '1px solid #eee'
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="subtitle2" color="text.secondary">
                        {message.speaker ? message.speaker : 'User'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {message.time ? new Date(message.time).toLocaleString() : 'No timestamp'}
                      </Typography>
                    </Box>
                    <Typography variant="body1">
                      {message.content}
                    </Typography>
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No conversation transcript is available for this consultation.
              </Typography>
            )}
          </DialogContent>
          <DialogActions sx={{ p: { xs: 1, sm: 2 } }}>
            <Button 
              onClick={closeTranscriptModal} 
              color="primary" 
              variant="contained" 
              size="large"
              sx={{ borderRadius: 1, px: 3, py: 1.5 }}
            >
              Close
            </Button>
          </DialogActions>
        </Dialog>

        {/* Share modal - with enhanced sharing options */}
        <Dialog
          open={showShareModal}
          onClose={handleCloseShareModal}
          maxWidth="md"
          fullWidth
          sx={{ '& .MuiDialog-paper': { borderRadius: 2 } }}
        >
          <DialogTitle sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            pb: 1 
          }}>
            <Typography variant="h6" sx={{ fontWeight: 'medium' }}>
              Share Anonymized Note
            </Typography>
            <IconButton onClick={handleCloseShareModal} size="small">
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          
          <DialogContent dividers sx={{ p: { xs: 2, sm: 3 } }}>
            {anonymizingNote ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 3 }}>
                <CircularProgress size={40} sx={{ mr: 2 }} />
                <Typography variant="body1">Preparing anonymized note...</Typography>
              </Box>
            ) : anonymizeError ? (
              <Alert severity="error" sx={{ mb: 2 }}>
                {anonymizeError}
              </Alert>
            ) : anonymizedNoteForShare ? (
              <Box sx={{ 
                whiteSpace: 'pre-line', 
                wordBreak: 'break-word',
                maxHeight: '50vh',
                overflowY: 'auto',
                p: 1
              }}>
                {renderAnonymizedNotePreview(anonymizedNoteForShare)}
              </Box>
            ) : (
              <Typography variant="body1" color="text.secondary" align="center" sx={{ p: 3 }}>
                No anonymized note available to share.
              </Typography>
            )}
          </DialogContent>
          
          <DialogActions sx={{ 
            p: 3, 
            display: 'flex', 
            flexDirection: {xs: 'column', sm: 'row'}, 
            justifyContent: 'space-between', 
            alignItems: {xs: 'stretch', sm: 'center'},
            gap: 2
          }}>
            <Box sx={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              gap: 1.5, 
              justifyContent: {xs: 'center', sm: 'flex-start'},
              width: {xs: '100%', sm: 'auto'}
            }}>
              <Button 
                variant="outlined"
                startIcon={copySuccess ? <CheckIcon color="success" /> : <ContentCopyIcon />}
                onClick={handleCopyLink}
                disabled={!anonymizedNoteForShare || anonymizingNote}
                color={copySuccess ? "success" : "primary"}
                sx={{ 
                  borderRadius: '20px',
                  px: 2.5,
                  py: 1,
                  transition: 'all 0.3s ease',
                  borderWidth: copySuccess ? 2 : 1,
                  fontWeight: 'medium'
                }}
              >
                {copySuccess ? "Copied to clipboard!" : "Copy Case Link"}
              </Button>
                <Button 
                variant="outlined"
                startIcon={<WhatsAppIcon />}
                onClick={() => {
                  const text = `📋 Valuable medical insights to review! Access this anonymized clinical case: ${shareUrl}`;
                  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                }}
                disabled={!anonymizedNoteForShare || anonymizingNote}
                sx={{ 
                  borderRadius: '20px',
                  px: 2.5,
                  py: 1,
                  color: '#25D366',
                  borderColor: '#25D366',
                  '&:hover': {
                    borderColor: '#25D366',
                    backgroundColor: 'rgba(37, 211, 102, 0.08)',
                  }
                }}
              >
                <Box sx={{ display: { xs: 'none', md: 'block' } }}>WhatsApp</Box>
              </Button>
                <Button 
                variant="outlined"
                startIcon={<TwitterIcon />}
                onClick={() => {
                  const text = `📋 Sharing important medical insights from this clinical case. Healthcare professionals may find this valuable:`;
                  window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`, '_blank');
                }}
                disabled={!anonymizedNoteForShare || anonymizingNote}
                sx={{ 
                  borderRadius: '20px',
                  px: 2.5,
                  py: 1,
                  color: '#1DA1F2',
                  borderColor: '#1DA1F2',
                  '&:hover': {
                    borderColor: '#1DA1F2',
                    backgroundColor: 'rgba(29, 161, 242, 0.08)',
                  }
                }}
              >
                <Box sx={{ display: { xs: 'none', md: 'block' } }}>X</Box>
              </Button>
                <Button 
                variant="outlined"
                startIcon={<LinkedInIcon />}
                onClick={() => {
                  // LinkedIn doesn't support custom text in the share URL, but the URL will be shared
                  window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`, '_blank');
                }}
                disabled={!anonymizedNoteForShare || anonymizingNote}
                sx={{ 
                  borderRadius: '20px',
                  px: 2.5,
                  py: 1,
                  color: '#0A66C2',
                  borderColor: '#0A66C2',
                  '&:hover': {
                    borderColor: '#0A66C2',
                    backgroundColor: 'rgba(10, 102, 194, 0.08)',
                  }
                }}
              >
                <Box sx={{ display: { xs: 'none', md: 'block' } }}>LinkedIn</Box>
              </Button>
                <Button 
                variant="outlined"
                startIcon={<RedditIcon />}
                onClick={() => {
                  window.open(`https://www.reddit.com/submit?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent('Clinical Case Study: Interesting Medical Insights for Healthcare Professionals')}`, '_blank');
                }}
                disabled={!anonymizedNoteForShare || anonymizingNote}
                sx={{ 
                  borderRadius: '20px',
                  px: 2.5,
                  py: 1,
                  color: '#FF4500',
                  borderColor: '#FF4500',
                  '&:hover': {
                    borderColor: '#FF4500',
                    backgroundColor: 'rgba(255, 69, 0, 0.08)',
                  }
                }}
              >
                <Box sx={{ display: { xs: 'none', md: 'block' } }}>Reddit</Box>
              </Button>
            </Box>
            
            <Button 
              onClick={handleCloseShareModal} 
              variant="contained" 
              sx={{ 
                borderRadius: '20px',
                minWidth: {xs: '100%', sm: '120px'},
                py: 1.2
              }}
            >
              Close
            </Button>
          </DialogActions>
        </Dialog>
        
        {/* Snackbar for copy confirmation */}
        <Snackbar 
          open={copySuccess} 
          autoHideDuration={3000} 
          onClose={() => setCopySuccess(false)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <MuiAlert 
            elevation={6} 
            variant="filled" 
            severity="success" 
            sx={{ width: '100%' }}
          >
            Link copied to clipboard!
          </MuiAlert>
        </Snackbar>
      </Box>
    </div>
  );
};

export default ConsultDetailPage;
