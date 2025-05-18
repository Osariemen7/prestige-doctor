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
  Paper
} from '@mui/material';
import AssignmentIcon from '@mui/icons-material/Assignment'; // Icon for the page title
import { getAccessToken } from './api';
import Sidebar from './sidebar';

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

  useEffect(() => {
    const fetchConsults = async () => {
      setLoading(true);
      try {
        const token = await getAccessToken();
        if (!token) throw new Error('Authentication required. Please log in again.');
        const response = await fetch('https://health.prestigedelta.com/medicalreview/', {
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
        // Sort consults by creation date, newest first
        const sortedData = data.sort((a, b) => new Date(b.created) - new Date(a.created));
        setConsults(sortedData);
      } catch (e) {
        console.error("Failed to fetch consultations:", e);
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchConsults();
  }, []);

  const handleViewDetails = (consultId) => {
    // Navigate to the detail page. The route might be different based on your app structure.
    // Using consult.public_id if available and preferred for URLs, otherwise consult.id
    const selectedConsult = consults.find(c => c.id === consultId);
    if (selectedConsult) {
      const navigationId = selectedConsult.public_id || consultId;
      navigate(`/consult-details/${navigationId}`, { 
        state: { 
          patientFullName: selectedConsult.patient_full_name,
          patientId: selectedConsult.id // Internal patient/consult ID
        } 
      });
    } else {
      console.error("Consult not found for ID:", consultId);
      // Optionally, show an error to the user
    }
  };

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
    <div className="dashboard-container">
      <Sidebar
        onNavigate={handleNavigate}
        onLogout={handleLogout}
        onToggleSidebar={setIsSidebarMinimized}
      />
      <div className={`${isSidebarMinimized ? 'ml-16 md:ml-16' : 'ml-0 md:ml-64'} flex-1 transition-all duration-300`}>
        <div className="min-h-screen bg-gray-50 p-6">
          <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 }, px: { xs: 2, md: 3 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: { xs: 2, md: 4 } }}>
              <AssignmentIcon color="primary" sx={{ fontSize: { xs: 30, md: 40 }, mr: 1.5 }} />
              <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                My Consultations
              </Typography>
            </Box>
            {consults.length === 0 ? (
              <Paper elevation={3} sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="h6" color="text.secondary">No consultations found.</Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
                  There are currently no consultations to display.
                </Typography>
              </Paper>
            ) : (
              <Grid container spacing={{ xs: 2, md: 3 }}>
                {consults.map((consult) => (
                  <Grid item xs={12} sm={6} lg={4} key={consult.id}>
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
                          <Tooltip title={consult.patient_full_name || 'N/A'} placement="top-start">
                            <Typography variant="h6" component="div" noWrap sx={{ fontWeight: 600, color: 'text.primary', maxWidth: 'calc(100% - 80px)' }}>
                              {consult.patient_full_name || 'N/A'}
                            </Typography>
                          </Tooltip>
                          {getStatusChip(consult.status)}
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, fontStyle: 'italic' }}>
                          ID: {consult.public_id || consult.id}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                          <strong>Date:</strong> {formatDate(consult.created)}
                        </Typography>
                        <Tooltip title={consult.chief_complaint || 'No chief complaint provided.'} placement="bottom-start">
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
                            <strong>Complaint:</strong> {consult.chief_complaint || 'No chief complaint provided.'}
                          </Typography>
                        </Tooltip>
                      </CardContent>
                      <CardActions sx={{ justifyContent: 'flex-end', p: { xs: 1.5, md: 2 }, borderTop: '1px solid #eee' }}>
                        <Button
                          variant="contained"
                          size="medium"
                          onClick={() => handleViewDetails(consult.id)}
                          sx={{ borderRadius: '999px', textTransform: 'none', px: 2.5 }}
                        >
                          View Details
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Container>
        </div>
      </div>
    </div>
  );
};

export default MyConsults;
