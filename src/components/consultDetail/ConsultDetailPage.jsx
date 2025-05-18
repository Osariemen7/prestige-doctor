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
  InputAdornment
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
  Lock as LockIcon, // Add LockIcon
  Share as ShareIcon, 
  ContentCopy as ContentCopyIcon,
  WhatsApp as WhatsAppIcon,
  Twitter as TwitterIcon,
  LinkedIn as LinkedInIcon,
  Reddit as RedditIcon
} from '@mui/icons-material';
import { getAccessToken } from '../api'; // Assuming api.js is in the parent directory
import Sidebar from '../sidebar'; // Assuming Sidebar is in the parent directory

// Import sub-components (will be created in subsequent steps)
import DoctorNoteDisplay from './DoctorNoteDisplay';
import TranscriptView from './TranscriptView';
import CollaborationView from './CollaborationView';
import PatientProfileView from './PatientProfileView';
import HealthGoalView from './HealthGoalView';
import MetricsActionsView from './MetricsActionsView';

const ConsultDetailPage = () => {
  const { publicId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { patientFullName, patientId } = location.state || {};

  const [consultData, setConsultData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSidebarMinimized, setIsSidebarMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [isTranscriptModalOpen, setIsTranscriptModalOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false); // Added for auth status

  // State for sharing functionality
  const [showShareModal, setShowShareModal] = useState(false);
  const [anonymizedNoteForShare, setAnonymizedNoteForShare] = useState(null);
  const [anonymizingNote, setAnonymizingNote] = useState(false);
  const [anonymizeError, setAnonymizeError] = useState(null);

  const fetchConsultDetails = useCallback(async (isBackground = false) => {
    if (!isBackground) {
      setLoading(true);
    }
    setError(null);
    let localToken = null;
    try {
      localToken = await getAccessToken(); // Should return null/undefined if no token, not throw

      const headers = { 'Content-Type': 'application/json' };
      if (localToken) {
        headers['Authorization'] = `Bearer ${localToken}`;
      }

      const response = await fetch(`https://health.prestigedelta.com/review-note/${publicId}/`, { headers });

      if (!response.ok) {
        const errorBody = await response.text();
        if (!localToken && (response.status === 401 || response.status === 403)) {
          setError(`Public access to this note is restricted or requires authentication. Status: ${response.status}`);
          setIsAuthenticated(false);
          setConsultData(null); // Clear potentially stale data
          return; // Stop further processing
        }
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorBody}`);
      }
      const data = await response.json();
      setConsultData(data);
      setIsAuthenticated(!!localToken); // Set auth status based on token presence for this successful fetch
    } catch (e) {
      console.error("Failed to fetch consultation details:", e);
      // Preserve specific auth error, otherwise set general error
      if (!error && !(e.message.startsWith("Public access to this note is restricted") || e.message.startsWith("HTTP error!"))) {
        setError(e.message);
      } else if (!error) {
        setError(e.message);
      }
      // If an error occurred, isAuthenticated reflects the state *before* this failed fetch attempt if localToken was found.
      // If localToken was null, it remains false.
      // Consider resetting consultData if error is severe
      // setConsultData(null); // Or keep stale data? For now, keep.
    } finally {
      if (!isBackground) {
        setLoading(false);
      }
    }
  }, [publicId]);

  useEffect(() => {
    fetchConsultDetails();
  }, [fetchConsultDetails]);

  const handleMessageSent = useCallback(() => {
    // Fetch details in the background without setting loading state
    fetchConsultDetails(true); 
  }, [fetchConsultDetails]);

  const handleNavigate = (path) => navigate(path);
  const handleLogout = () => navigate('/login');
  const handleTabChange = (event, newValue) => setActiveTab(newValue);
  const openTranscriptModal = () => setIsTranscriptModalOpen(true);
  const closeTranscriptModal = () => setIsTranscriptModalOpen(false);

  const handleOpenShareModal = async () => {
    if (!publicId || !isAuthenticated) return;
    setAnonymizingNote(true);
    setAnonymizeError(null);
    setAnonymizedNoteForShare(null); // Clear previous note
    try {
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
    // Keep anonymizedNoteForShare if you want to show stale data on quick reopen, or clear it.
    // setAnonymizedNoteForShare(null); 
    // Keep anonymizeError so user can see it if modal is re-opened quickly, or clear it:
    // setAnonymizeError(null); 
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


  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading Consultation Details...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Container sx={{ py: 4 }}>
        <Alert severity="error">
          Failed to load consultation details: {error}.
          <Button onClick={fetchConsultDetails} sx={{ ml: 2 }} variant="outlined">Retry</Button>
        </Alert>
      </Container>
    );
  }

  if (!consultData && !loading && !error) { // Added !loading && !error to avoid showing this during initial load or on error
    return (
      <Container sx={{ py: 4 }}>
        <Alert severity="info">No consultation data found or public access is restricted.</Alert>
      </Container>
    );
  }

  // Fallback for consultData if it's null after loading/error states are passed
  const {
    doctor_note,
    public_doctor_note,
    session_conversation,
    collaboration_messages,
    patient_data
  } = consultData || {};

  // Determine which note to display
  const noteForDisplay = (isAuthenticated && doctor_note) ? doctor_note : public_doctor_note;
  
  // Extract medical history, conditionally based on auth
  const medical_history_data = patient_data?.medical_history?.medical_history || [];
  const effectiveMedicalHistory = isAuthenticated ? medical_history_data : [];

  // Use patientFullName from navigation state, fallback to API data if needed
  const displayName = patientFullName || (patient_data?.profile?.demographics ? `${patient_data.profile.demographics.first_name} ${patient_data.profile.demographics.last_name}` : 'N/A');
  const displayPatientId = patientId || consultData.id; // Use internal ID from navigation state or API

  return (
    <div className="dashboard-container" style={{ display: 'flex' }}>
      {isAuthenticated ? (
        <Sidebar
          onNavigate={handleNavigate}
          onLogout={handleLogout}
          onToggleSidebar={setIsSidebarMinimized}
        />
      ) : (
        // Render nothing for the sidebar area or a minimal placeholder if needed
        // This effectively removes the sidebar for unauthenticated users.
        // The login/signup buttons will be in the AppBar.
        null 
      )}
      <Box 
        component="main" 
        sx={{ 
          flexGrow: 1, 
          p: 0, 
          marginLeft: isAuthenticated ? { 
            xs: 0, 
            sm: isSidebarMinimized ? '64px' : '250px' 
          } : 0, // No margin if sidebar is not there
          transition: 'margin-left 0.3s ease-in-out',
          backgroundColor: '#f4f6f8', // Light background for the page
          minHeight: '100vh',
          width: { xs: '100%', sm: 'auto' } // Full width on mobile
        }}
      >        <AppBar position="static" color="default" elevation={1} sx={{ backgroundColor: 'white' }}>
          <Toolbar sx={{ flexWrap: 'wrap', p: { xs: 1, sm: 2 } }}>
            {isAuthenticated && (
            <IconButton edge="start" color="inherit" onClick={() => navigate(-1)} aria-label="back">
              <ArrowBackIcon />
            </IconButton>
            )}
            <Typography 
              variant="h6" 
              component="div" 
              sx={{ 
                flexGrow: 1, 
                color: 'primary.main', 
                fontWeight: 'bold',
                fontSize: { xs: '0.9rem', sm: '1.25rem' },
                ml: isAuthenticated ? 1 : 0, // Adjust margin if back button is not present
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
                Consultation: {displayName} (ID: {displayPatientId})
              </Box>
            </Typography>
            {isAuthenticated ? (
              <>
                <Button
                  variant="outlined"
                  startIcon={<SpeakerNotesIcon />}
                  onClick={openTranscriptModal}
                  sx={{ 
                    mr: { xs: 1, sm: 1 }, 
                    ml: { xs: 1, sm: 0 },
                    fontSize: { xs: '0.7rem', sm: '0.875rem' },
                    py: { xs: 0.5 },
                    whiteSpace: 'nowrap'
                  }}
                >
                  <Box sx={{ display: { xs: 'none', sm: 'inline' } }}>View Transcript</Box>
                  <Box sx={{ display: { xs: 'inline', sm: 'none' } }}>Transcript</Box>
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<ShareIcon />}
                  onClick={handleOpenShareModal}
                  disabled={anonymizingNote}
                  sx={{ 
                    mr: { xs: 0, sm: 2 },
                    fontSize: { xs: '0.7rem', sm: '0.875rem' },
                    py: { xs: 0.5 },
                    whiteSpace: 'nowrap'
                  }}
                >
                  <Box sx={{ display: { xs: 'none', sm: 'inline' } }}>{anonymizingNote ? 'Preparing...' : 'Share Note'}</Box>
                  <Box sx={{ display: { xs: 'inline', sm: 'none' } }}>Share</Box>
                </Button>
              </>
            ) : (
              <Box>
                <Button color="primary" variant="outlined" onClick={() => navigate('/login')} sx={{ mr: 1, fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>Login</Button>
                <Button color="primary" variant="contained" onClick={() => navigate('/register')} sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>Sign Up</Button>
              </Box>
            )}
          </Toolbar>
        </AppBar>

        <Container maxWidth="xl" sx={{ py: 3 }}>
          <Paper elevation={3} sx={{ borderRadius: 2, overflow: 'hidden' }}>            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              indicatorColor="primary"
              textColor="primary"
              variant="scrollable"
              scrollButtons="auto"
              allowScrollButtonsMobile
              aria-label="consultation detail tabs"
              sx={{ 
                borderBottom: 1, 
                borderColor: 'divider', 
                backgroundColor: 'background.paper',
                '& .MuiTab-root': { 
                  minHeight: { xs: 48, sm: 'auto' },
                  fontSize: { xs: '0.7rem', sm: '0.875rem' },
                  padding: { xs: '6px 12px', sm: '12px 16px' },
                  minWidth: { xs: 'auto', sm: 90 }
                }
              }}
            >
              {/* Display only icons on mobile, text+icons on larger screens */}
              <Tab 
                label={<Box sx={{ display: { xs: 'none', sm: 'block' } }}>Doctor's Note</Box>} 
                icon={<AssignmentIcon sx={{ fontSize: { xs: '1.2rem', sm: '1.5rem' } }} />} 
                iconPosition="start"
              />
              <Tab 
                label={<Box sx={{ display: { xs: 'none', sm: 'block' } }}>Medical Team</Box>} 
                icon={<ChatIcon sx={{ fontSize: { xs: '1.2rem', sm: '1.5rem' } }} />} 
                iconPosition="start"
              />
              <Tab 
                label={<Box sx={{ display: { xs: 'none', sm: 'block' } }}>Patient Profile</Box>} 
                icon={<PersonIcon sx={{ fontSize: { xs: '1.2rem', sm: '1.5rem' } }} />} 
                iconPosition="start"
              />
              <Tab 
                label={<Box sx={{ display: { xs: 'none', sm: 'block' } }}>Health Goals</Box>} 
                icon={<TrackChangesIcon sx={{ fontSize: { xs: '1.2rem', sm: '1.5rem' } }} />} 
                iconPosition="start"
              />
              <Tab 
                label={<Box sx={{ display: { xs: 'none', sm: 'block' } }}>Metrics & Actions</Box>} 
                icon={<AssessmentIcon sx={{ fontSize: { xs: '1.2rem', sm: '1.5rem' } }} />} 
                iconPosition="start"
              />
            </Tabs>            <Box sx={{ p: { xs: 2, md: 3 }, backgroundColor: 'white' }}>
              {activeTab === 0 && (
                consultData ? (
                  <DoctorNoteDisplay 
                    initialNote={noteForDisplay} 
                    medicalHistory={Array.isArray(effectiveMedicalHistory) ? effectiveMedicalHistory : []}
                    currentConsultId={consultData.id} // Assuming consultData.id is public
                  />
                ) : (
                  !loading && !error && <Alert severity="info">Doctor's note is currently unavailable.</Alert>
                )
              )}
              {activeTab === 1 && ( // Collaboration
                !isAuthenticated ? <AuthWall navigate={navigate} /> :
                (consultData && <CollaborationView messages={collaboration_messages || []} publicId={publicId} onMessageSent={handleMessageSent} />)
              )}
              {activeTab === 2 && ( // Patient Profile
                !isAuthenticated ? <AuthWall navigate={navigate} /> :
                (consultData?.patient_data?.profile && <PatientProfileView profile={patient_data.profile} />)
              )}
              {activeTab === 3 && ( // Health Goals
                !isAuthenticated ? <AuthWall navigate={navigate} /> :
                (consultData?.patient_data?.goals_with_details && <HealthGoalView goals={patient_data.goals_with_details} />)
              )}
              {activeTab === 4 && ( // Metrics & Actions
                !isAuthenticated ? <AuthWall navigate={navigate} /> :
                (consultData?.patient_data?.metrics_and_actions && <MetricsActionsView data={patient_data.metrics_and_actions} isSidebarMinimized={isSidebarMinimized} />)
              )}
            </Box>
          </Paper>
        </Container>        {/* Transcript Modal */}
        <Dialog 
          open={isTranscriptModalOpen} 
          onClose={closeTranscriptModal} 
          fullWidth 
          maxWidth="md"
          sx={{
            '& .MuiDialog-paper': {
              margin: { xs: '16px', sm: '32px' },
              width: { xs: 'calc(100% - 32px)', sm: 'auto' },
              maxHeight: { xs: 'calc(100% - 32px)', sm: 'calc(100% - 64px)' }
            }
          }}
        >
          <DialogTitle sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            p: { xs: 2, sm: 3 },
            fontSize: { xs: '1.1rem', sm: '1.25rem' }
          }}>
            Session Transcript
            <IconButton onClick={closeTranscriptModal} size="small">
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent dividers sx={{ p: { xs: 1.5, sm: 2.5 } }}>
            {isAuthenticated && session_conversation && session_conversation.length > 0 ? (
              <TranscriptView transcript={session_conversation} />
            ) : (
              <Typography sx={{ textAlign: 'center', py: 2, fontSize: { xs: '0.9rem', sm: '1rem' } }}>
                {!isAuthenticated ? "Transcript is available for authenticated users only. Please log in." : "No transcript available for this session."}
              </Typography>
            )}
          </DialogContent>
          <DialogActions sx={{ p: { xs: 1.5, sm: 2 } }}>
            <Button 
              onClick={closeTranscriptModal} 
              variant="outlined" 
              sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
            >
              Close
            </Button>
          </DialogActions>
        </Dialog>
      </Box>

      {/* Share Note Modal */}
      <Dialog 
        open={showShareModal} 
        onClose={handleCloseShareModal} 
        fullWidth 
        maxWidth="md"
        sx={{
          '& .MuiDialog-paper': {
            margin: { xs: '16px', sm: '32px' },
            width: { xs: 'calc(100% - 32px)', sm: 'auto' },
            maxHeight: { xs: 'calc(100% - 32px)', sm: 'calc(100% - 64px)' }
          }
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          Share Anonymized Note
          <IconButton onClick={handleCloseShareModal} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {anonymizingNote && (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', my: 3 }}>
              <CircularProgress size={24} sx={{mr: 1}} />
              <Typography>Anonymizing note...</Typography>
            </Box>
          )}
          {anonymizeError && !anonymizingNote && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {anonymizeError}
            </Alert>
          )}
          {!anonymizingNote && anonymizedNoteForShare && renderAnonymizedNotePreview(anonymizedNoteForShare)}
        </DialogContent>
        <DialogActions sx={{ p: 2, display: 'flex', flexDirection: {xs: 'column', sm: 'row'}, justifyContent: 'space-between', flexWrap:'wrap' }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: {xs: 2, sm: 0}, justifyContent: {xs: 'center', sm: 'flex-start'} }}>
            <Button 
              onClick={() => navigator.clipboard.writeText(window.location.href).then(() => alert('URL copied to clipboard!')).catch(err => alert('Failed to copy URL: ' + err))}
              startIcon={<ContentCopyIcon />}
              size="small"
              disabled={!anonymizedNoteForShare || anonymizingNote || !!anonymizeError}
            >
              Copy URL
            </Button>
            <Button 
              onClick={() => window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent('Check out this anonymized medical note: ' + window.location.href)}`, '_blank')}
              startIcon={<WhatsAppIcon />}
              size="small"
              disabled={!anonymizedNoteForShare || anonymizingNote || !!anonymizeError}
            >
              WhatsApp
            </Button>
            <Button 
              onClick={() => window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}&text=Check%20out%20this%20anonymized%20medical%20note:`, '_blank')}
              startIcon={<TwitterIcon />}
              size="small"
              disabled={!anonymizedNoteForShare || anonymizingNote || !!anonymizeError}
            >
              X
            </Button>
            <Button 
              onClick={() => window.open(`https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(window.location.href)}&title=Anonymized%20Medical%20Note&summary=Check%20out%20this%20anonymized%20medical%20note.`, '_blank')}
              startIcon={<LinkedInIcon />}
              size="small"
              disabled={!anonymizedNoteForShare || anonymizingNote || !!anonymizeError}
            >
              LinkedIn
            </Button>
            <Button 
              onClick={() => window.open(`https://www.reddit.com/submit?url=${encodeURIComponent(window.location.href)}&title=Anonymized%20Medical%20Note`, '_blank')}
              startIcon={<RedditIcon />}
              size="small"
              disabled={!anonymizedNoteForShare || anonymizingNote || !!anonymizeError}
            >
              Reddit
            </Button>
          </Box>
          <Button onClick={handleCloseShareModal} variant="outlined" size="small">Close</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

// Helper component for authentication wall
const AuthWall = ({ navigate }) => (
  <Box sx={{ 
    textAlign: 'center', 
    p: 3, 
    display: 'flex', 
    flexDirection: 'column', 
    alignItems: 'center', 
    justifyContent: 'center', 
    minHeight: '300px' // Ensure it takes some space
  }}>
    <LockIcon sx={{ fontSize: 40, mb: 2, color: 'text.secondary' }} />
    <Typography variant="h6" gutterBottom>Authentication Required</Typography>
    <Typography variant="body1" sx={{ mb: 3, color: 'text.secondary', maxWidth: '400px' }}>
      To access this feature and more detailed information, please log in or create an account.
    </Typography>
    <Box>
      <Button variant="contained" onClick={() => navigate('/login')} sx={{ mr: 1 }}>Login</Button>
      <Button variant="outlined" onClick={() => navigate('/register')}>Sign Up</Button>
    </Box>
  </Box>
);

export default ConsultDetailPage;
