import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  CircularProgress,
  Alert,
  Chip,
  Tooltip,
  Paper,
  TextField,
  InputAdornment,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import AssignmentIcon from '@mui/icons-material/Assignment'; // Icon for the page title
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import ClearIcon from '@mui/icons-material/Clear';
import NoteAddIcon from '@mui/icons-material/NoteAdd';
import SearchOffIcon from '@mui/icons-material/SearchOff';
import { getAccessToken } from './api';
import Sidebar from './sidebar';
import AddPatientModalMui from './AddPatientModalMui';

// Helper function to format date
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch (error) {
    console.error("Error formatting date:", dateString, error);
    return 'Invalid Date';
  }
};

// Helper function to get status chip
const getStatusChip = (status) => {
  let color = 'default';
  let label = status || 'Unknown';
  switch (status?.toLowerCase()) {
    case 'worsening':
      color = 'error';
      break;
    case 'stable':
      color = 'success';
      break;
    case 'approved':
      color = 'primary';
      break;
    case 'pending':
      color = 'warning';
      break;
    case 'unknown':
      color = 'default';
      label = 'Unknown';
      break;
    default:
      color = 'info'; // For any other status not explicitly handled
      label = status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown';
      break;
  }
  return <Chip label={label} color={color} size="small" sx={{ fontWeight: 500 }} />;
};

const MyConsults = () => {
  const [consults, setConsults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSidebarMinimized, setIsSidebarMinimized] = useState(false);
  const [nextPageUrl, setNextPageUrl] = useState(null);
  const [prevPageUrl, setPrevPageUrl] = useState(null);  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10); // Default page size, adjust if needed
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredConsults, setFilteredConsults] = useState([]);
  const [reviewStatusFilter, setReviewStatusFilter] = useState('pending'); // Default to pending
  const [isAddPatientModalOpen, setIsAddPatientModalOpen] = useState(false);
  const [addPatientLoading, setAddPatientLoading] = useState(false);
  const navigate = useNavigate();

  // Sidebar navigation handler
  const handleNavigate = (path) => {
    navigate(path);
  };

  // Sidebar logout handler (customize as needed)
  const handleLogout = () => {
    // Clear tokens, redirect, etc. (implement as needed)
    navigate('/login');
  };

  // Define handleAddPatientAPI within the component scope
  const handleAddPatientAPI = async (patientData, callbackResetForm) => {
    setAddPatientLoading(true);
    console.log("Adding patient:", patientData);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    // alert('Patient added (simulated)!');
    // In a real app, you would make an API call here:
    // try {
    //   const response = await fetch('/api/patients', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify(patientData),
    //   });
    //   if (!response.ok) throw new Error('Failed to add patient');
    //   const newPatient = await response.json();
    //   // Optionally, refresh consults list or navigate
    //   // toast({ title: "Patient added successfully!", status: "success" }); 
    //   callbackResetForm(); // Reset the form in the modal
    //   setIsAddPatientModalOpen(false); // Close the modal
    // } catch (error) {
    //   console.error("Error adding patient:", error);
    //   // toast({ title: "Error adding patient", description: error.message, status: "error" });
    //   // Potentially, do not reset form or close modal if error is recoverable by user
    // }
    setAddPatientLoading(false);
    callbackResetForm(); // Example: reset form even on simulated success
    setIsAddPatientModalOpen(false); // Example: close modal
  };
  useEffect(() => {
    const fetchConsults = async (url = null) => {
      setLoading(true);
      try {
        const token = await getAccessToken();
        if (!token) throw new Error('Authentication required. Please log in again.');
        
        let endpoint;
        if (url) {
          endpoint = url;
        } else {
          // Build the endpoint with review_status parameter
          const baseUrl = 'https://health.prestigedelta.com/patient-consults/';
          const params = new URLSearchParams();
          params.set('page', currentPage.toString());
          if (reviewStatusFilter !== 'all') {
            params.set('review_status', reviewStatusFilter);
          }
          endpoint = `${baseUrl}?${params.toString()}`;
        }
        
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
        setConsults(Array.isArray(data.results) ? data.results : []);
        setNextPageUrl(data.next);
        setPrevPageUrl(data.previous);
        setTotalCount(data.count || 0);
        setPageSize(data.results && data.results.length > 0 ? data.results.length : pageSize);
      } catch (e) {
        console.error("Failed to fetch consultations:", e);
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchConsults();
    // eslint-disable-next-line
  }, [currentPage, reviewStatusFilter]);const handleViewDetails = (publicId, consult, pendingAIreviewId = null) => {
    navigate(`/consult-details/${consult.most_recent_review_public_id}`, {
      state: {
        patientFullName: consult.patient_name,
        patientId: consult.patient_id,
        collaborating_providers: consult.collaborating_providers,
        patient_profile_data: consult.patient_profile_data, // Add this line to include patient profile data
        pendingAIreviewId: pendingAIreviewId, // Pass the pending AI review ID
      },
    });
  };
  const handlePageChange = (direction) => {
    if (direction === 'next' && nextPageUrl) {
      setCurrentPage((prev) => prev + 1);
    } else if (direction === 'prev' && prevPageUrl) {
      setCurrentPage((prev) => Math.max(1, prev - 1));
    }
  };

  // Handle review status filter change
  const handleReviewStatusChange = (event, newFilter) => {
    if (newFilter !== null) {
      setReviewStatusFilter(newFilter);
      setCurrentPage(1); // Reset to first page when filter changes
    }
  };

  // Search functionality
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredConsults(consults);
    } else {
      const lowercasedFilter = searchTerm.toLowerCase();
      setFilteredConsults(
        consults.filter((consult) =>
          consult.patient_name?.toLowerCase().includes(lowercasedFilter) ||
          consult.most_recent_review_chief_complaint?.toLowerCase().includes(lowercasedFilter)
        )
      );
    }
  }, [searchTerm, consults]);

  // Loading and error states remain unchanged
  if (loading) {
    return (
      <div className="dashboard-container">
        <Sidebar
          onNavigate={handleNavigate}
          onLogout={handleLogout}
          onToggleSidebar={setIsSidebarMinimized}
        />
        <div className={`${isSidebarMinimized ? 'ml-16 md:ml-16' : 'ml-0 md:ml-64'} flex-1 transition-all duration-300`}>
          <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 64px)', p: 3 }}>
            <Box textAlign="center">
              <CircularProgress />
              <Typography sx={{ mt: 2 }}>Loading Consultations...</Typography>
            </Box>
          </Container>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-container">
        <Sidebar
          onNavigate={handleNavigate}
          onLogout={handleLogout}
          onToggleSidebar={setIsSidebarMinimized}
        />
        <div className={`${isSidebarMinimized ? 'ml-16 md:ml-16' : 'ml-0 md:ml-64'} flex-1 transition-all duration-300`}>
          <Container sx={{p: 3}}>
            <Alert severity="error" sx={{ mt: 3 }}>
              Failed to load consultations: {error}. Please try again later.
            </Alert>
          </Container>
        </div>
      </div>
    );
  }

  // Main content layout with sidebar
  return (
    <div className="dashboard-container flex h-screen overflow-hidden">
      <Sidebar
        onNavigate={handleNavigate}
        onLogout={handleLogout}
        onToggleSidebar={setIsSidebarMinimized}
      />
      <div className={`${isSidebarMinimized ? 'ml-16' : 'ml-64'} flex-1 transition-all duration-300 overflow-auto`}>
        <div className="min-h-full bg-gray-50 p-6">
          <Container maxWidth="xl" sx={{ 
            py: { xs: 2, md: 4 }, 
            px: { xs: 1, sm: 2, md: 3 },
            maxWidth: 'none !important',
            width: '100%'
          }}>
            <Box sx={{ 
              display: 'flex', 
              flexDirection: { xs: 'column', lg: 'row' },
              justifyContent: 'space-between', 
              alignItems: { xs: 'flex-start', lg: 'center' }, 
              mb: { xs: 2, md: 4 },
              gap: { xs: 2, lg: 0 }
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                <AssignmentIcon color="primary" sx={{ fontSize: { xs: 30, md: 40 }, mr: 1.5 }} />
                <Typography variant="h4" component="h1" sx={{ 
                  fontWeight: 'bold', 
                  color: 'primary.main',
                  fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' }
                }}>
                  My Consultations
                </Typography>
              </Box>
              {/* ACTIONS BOX - container for Search TextField and Add Patient Button */}
              <Box sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                alignItems: { xs: 'stretch', sm: 'center' },
                gap: 2,
                width: { xs: '100%', lg: 'auto' },
                maxWidth: { xs: '100%', sm: '500px', lg: '400px' },
                flexShrink: 0
              }}>
                <TextField
                  variant="outlined"
                  placeholder="Search by patient name or complaint"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  sx={{
                    flexGrow: { sm: 1 },
                    width: { xs: '100%', sm: 'auto' },
                    minWidth: 0, // Allow TextField to shrink
                    borderRadius: 2,
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon color="action" />
                      </InputAdornment>
                    ),
                    endAdornment: searchTerm && (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="clear search"
                          onClick={() => setSearchTerm('')}
                          edge="end"
                        >
                          <ClearIcon color="action" />
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                />
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setIsAddPatientModalOpen(true)}
                  sx={{
                    py: 1.5,
                    px: 3,
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 'medium',
                    width: { xs: '100%', sm: 'auto' },
                    flexShrink: 0,
                    whiteSpace: 'nowrap'
                  }}
                >
                  Add Patient
                </Button>
              </Box>
            </Box>

            {/* Review Status Filter */}
            <Box sx={{ 
              mb: 3, 
              display: 'flex', 
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: { xs: 'flex-start', sm: 'center' }, 
              gap: 2 
            }}>
              <Typography variant="body1" sx={{ 
                fontWeight: 'medium', 
                color: 'text.primary',
                flexShrink: 0
              }}>
                Filter by Status:
              </Typography>
              <ToggleButtonGroup
                value={reviewStatusFilter}
                exclusive
                onChange={handleReviewStatusChange}
                aria-label="review status filter"
                size="small"
                sx={{
                  '& .MuiToggleButton-root': {
                    borderRadius: '20px',
                    textTransform: 'none',
                    fontWeight: 'medium',
                    px: 2,
                    py: 0.5,
                    border: '1px solid',
                    borderColor: 'divider',
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    '&.Mui-selected': {
                      backgroundColor: 'primary.main',
                      color: 'primary.contrastText',
                      '&:hover': {
                        backgroundColor: 'primary.dark',
                      },
                    },
                  },
                }}
              >
                <ToggleButton value="pending" aria-label="pending reviews">
                  Pending
                </ToggleButton>
                <ToggleButton value="approved" aria-label="approved reviews">
                  Approved
                </ToggleButton>
                <ToggleButton value="all" aria-label="all reviews">
                  All
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>
            {filteredConsults.length === 0 && searchTerm.trim() === '' ? (
              <Paper elevation={3} sx={{ p: { xs: 3, md: 6 }, textAlign: 'center', mt: 4 }}>
                <AssignmentIcon sx={{ fontSize: 60, color: 'grey.400', mb: 2 }} />
                <Typography variant="h5" color="text.secondary" sx={{ mb: 1, fontWeight: 'medium' }}>
                  No Consultations Yet
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                  Start by adding a new patient to see their consultation details here.
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => navigate('/new-patient-form')}
                  sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 'medium', py: 1, px: 3 }}
                >
                  Add New Patient
                </Button>
              </Paper>
            ) : filteredConsults.length === 0 && searchTerm.trim() !== '' ? (
              <Paper elevation={3} sx={{ p: 3, textAlign: 'center', mt: 4 }}>
                <SearchIcon sx={{ fontSize: 60, color: 'grey.400', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                  No consultations found for "{searchTerm}".
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
                  Try a different search term or clear the search.
                </Typography>
                <Button
                  variant="outlined"
                  onClick={() => setSearchTerm('')}
                  sx={{ mt: 2, borderRadius: 2, textTransform: 'none' }}
                >
                  Clear Search
                </Button>
              </Paper>
            ) : (
              <>
                <Grid container spacing={{ xs: 2, md: 3 }}>                {filteredConsults.map((consult) => {
                    const hasMedicalHistory = Array.isArray(consult.medical_history) && consult.medical_history.length > 0;
                    
                    // Check if patient has AI-conducted review awaiting approval using new fields
                    const hasAIReviewAwaitingApproval = hasMedicalHistory && 
                      consult.most_recent_review_approval_status?.toLowerCase() !== 'approved' && 
                      consult.most_recent_conducted_by_ai === true;
                    
                    // Get pending AI review ID if there's one awaiting approval
                    const pendingAIreviewId = hasAIReviewAwaitingApproval ? consult.most_recent_review_id : null;

                    return (
                      <Grid item xs={12} sm={6} lg={4} key={consult.patient_id}>
                        <Card sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          height: '100%',
                          borderRadius: 3,
                          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                          transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                          '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: '0 8px 20px rgba(0,0,0,0.12)'
                          }
                        }}>
                          <CardContent sx={{ flexGrow: 1, p: { xs: 2, md: 2.5 } }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                              <Tooltip title={consult.patient_name || 'N/A'} placement="top-start">
                                <Typography variant="h6" component="div" noWrap sx={{ fontWeight: 600, color: 'text.primary', maxWidth: 'calc(100% - 80px)' }}>
                                  {consult.patient_name || 'N/A'}
                                </Typography>
                              </Tooltip>
                              {hasMedicalHistory ? getStatusChip(consult.most_recent_review_status) : getStatusChip('Awaiting Review')}
                            </Box>
                            
                            {/* Show Dr House review indicator if AI review is awaiting approval */}
                            {hasAIReviewAwaitingApproval && (
                              <Box sx={{ mb: 1.5 }}>
                                <Chip 
                                  label="Review by Dr House awaiting approval" 
                                  color="warning" 
                                  size="small" 
                                  sx={{ 
                                    fontWeight: 500,
                                    backgroundColor: '#fff3e0',
                                    color: '#e65100',
                                    border: '1px solid #ffb74d'
                                  }} 
                                />
                              </Box>
                            )}

                            {hasMedicalHistory ? (
                              <>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, fontStyle: 'italic' }}>
                                  ID: {consult.most_recent_review_id}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                                  <strong>Date:</strong> {formatDate(consult.most_recent_review_updated)}
                                </Typography>
                                <Tooltip title={consult.most_recent_review_chief_complaint || 'No chief complaint provided.'} placement="bottom-start">
                                  <Typography variant="body2" color="text.secondary" sx={{
                                    mb: 1,
                                    display: '-webkit-box',
                                    WebkitBoxOrient: 'vertical',
                                    WebkitLineClamp: 3, // Allow up to 3 lines
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    minHeight: '3.9em', // Approx 3 lines with 1.3em line-height
                                    lineHeight: '1.3em',
                                    color: 'text.secondary'
                                  }}>
                                    <strong>Complaint:</strong> {consult.most_recent_review_chief_complaint || 'No chief complaint provided.'}
                                  </Typography>
                                </Tooltip>
                              </>
                            ) : (
                              <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                                This patient is awaiting their first consultation.
                              </Typography>
                            )}
                          </CardContent>                          <CardActions sx={{ justifyContent: 'flex-end', p: { xs: 1.5, md: 2 }, borderTop: '1px solid #eee' }}>
                            <Button
                              variant="contained"
                              size="medium"
                              onClick={() => handleViewDetails(consult.most_recent_review_public_id, consult, pendingAIreviewId)}
                              sx={{ borderRadius: '999px', textTransform: 'none', px: 2.5 }}
                            >
                              View Details
                            </Button>
                          </CardActions>
                        </Card>
                      </Grid>
                    );
                  })}
                </Grid>
                {/* Pagination Controls */}
                {totalCount > pageSize && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mt: 4 }}>
                    <Button
                      variant="outlined"
                      onClick={() => handlePageChange('prev')}
                      disabled={!prevPageUrl || currentPage === 1}
                      sx={{ mr: 2 }}
                    >
                      Previous
                    </Button>
                    <Typography variant="body2" sx={{ mx: 2 }}>
                      {nextPageUrl === null
                        ? `Page ${currentPage} of ${currentPage}`
                        : `Page ${currentPage} of ${Math.ceil(totalCount / pageSize)}`}
                    </Typography>
                    <Button
                      variant="outlined"
                      onClick={() => handlePageChange('next')}
                      disabled={!nextPageUrl}
                      sx={{ ml: 2 }}
                    >
                      Next
                    </Button>
                  </Box>
                )}
              </>
            )}
          </Container>
        </div>
      </div>
      <AddPatientModalMui
        isOpen={isAddPatientModalOpen}
        onClose={() => setIsAddPatientModalOpen(false)}
        onAddPatient={handleAddPatientAPI} // Now correctly references the function
        isLoading={addPatientLoading}
      />
    </div>
  );
};

export default MyConsults;
