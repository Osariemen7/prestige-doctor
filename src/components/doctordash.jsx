import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Alert,
  ThemeProvider,
  createTheme,
  Grid,
  useMediaQuery,
} from '@mui/material';
import { getAccessToken } from './api';
import Sidebar from './sidebar'; // Updated component name casing if needed
import { useNavigate } from 'react-router-dom';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1565C0', // A refined blue shade
    },
    secondary: {
      main: '#ffffff',
    },
    background: {
      default: '#f5f5f5', // Light grey background for contrast
      paper: '#ffffff',
    },
  },
  typography: {
    h4: {
      fontWeight: 600,
      marginBottom: '16px',
      fontSize: '2rem',
    },
    h6: {
      fontWeight: 500,
      marginBottom: '12px',
      fontSize: '1.25rem',
    },
    body1: {
      fontSize: '1rem',
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          marginBottom: '24px',
          boxShadow: '0 2px 8px rgba(21, 101, 192, 0.15)',
          borderRadius: '8px',
        },
      },
    },
    MuiListItem: {
      styleOverrides: {
        root: {
          padding: '12px 16px',
        },
      },
    },
  },
});

const DocDash = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const accessToken = await getAccessToken();
        if (!accessToken) {
          setError('Authentication token is missing.');
          setLoading(false);
          return;
        }
        const response = await fetch('https://health.prestigedelta.com/doctorsubscribers/', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const jsonData = await response.json();
        if (jsonData && jsonData.length > 0) {
          setData(jsonData[0]); // Use the first element of the returned array
        } else {
          setData({});
        }
      } catch (e) {
        console.error('Could not fetch doctor subscriber data:', e);
        setError('Failed to load doctor subscriber data.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const formatPhoneNumber = (phoneNumber) => {
    if (!phoneNumber) return 'N/A';
    return phoneNumber.replace('+234', '0');
  };

  const handleLogout = () => {
    localStorage.removeItem('user-info');
    navigate('/');
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!data) {
    return (
      <Box p={3}>
        <Alert severity="warning">No doctor data available.</Alert>
      </Box>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <div className='dashboard-container'>
        <Sidebar navigate={navigate} handleLogout={handleLogout} />
        <div className='main-content'>
          <Box
            bgcolor="background.default"
            minHeight="100vh"
            p={isMobile ? 2 : 4}
            overflowY="auto"
          >
            <Typography variant="h4" component="h1" gutterBottom color="primary" align="center">
              Doctor's Dashboard
            </Typography>

            <Grid container spacing={isMobile ? 2 : 3} justifyContent="center">
              <Grid item xs={12} md={8} lg={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" component="h2" mb={2}>
                      Summary
                    </Typography>
                    <Box display="flex" flexDirection="column" gap={1}>
                      <Typography variant="body1">
                        <strong>Total Consultations:</strong> {data.total_consultations}
                      </Typography>
                      <Typography variant="body1">
                        <strong>Current Earnings:</strong> ₦{data.current_earnings}
                      </Typography>
                      <Typography variant="body1">
                        <strong>Projected Earnings:</strong> ₦{data.projected_earnings}
                      </Typography>
                      <Typography variant="body1">
                        <strong>Number of Patients Consulted:</strong> {data.num_patients_consulted}
                      </Typography>
                      <Typography variant="body1">
                        <strong>Consultation Rate:</strong> {data.consultation_rate}
                      </Typography>
                      
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={8} lg={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" component="h2" mb={2}>
                      Consulting Patients
                    </Typography>
                    <List>
                      {data.consulting_patients && data.consulting_patients.length > 0 ? (
                        data.consulting_patients.map((patient, index) => (
                          <ListItem key={index} divider>
                            <ListItemText
                              primary={`${patient.user__first_name} ${patient.user__last_name}`}
                              secondary={`Phone: ${formatPhoneNumber(patient.user__phone_number)}`}
                            />
                          </ListItem>
                        ))
                      ) : (
                        <ListItem>
                          <ListItemText primary="No consulting patients at the moment." />
                        </ListItem>
                      )}
                    </List>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={8} lg={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" component="h2" mb={2}>
                      Non-Consulting Patients
                    </Typography>
                    <List>
                      {data.non_consulting_patients && data.non_consulting_patients.length > 0 ? (
                        data.non_consulting_patients.map((patient, index) => (
                          <ListItem key={index} divider>
                            <ListItemText
                              primary={`${patient.user__first_name} ${patient.user__last_name}`}
                              secondary={`Phone: ${formatPhoneNumber(patient.user__phone_number) || 'N/A'}`}
                            />
                          </ListItem>
                        ))
                      ) : (
                        <ListItem>
                          <ListItemText primary="No non-consulting patients." />
                        </ListItem>
                      )}
                    </List>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        </div>
      </div>
    </ThemeProvider>
  );
};

export default DocDash;
