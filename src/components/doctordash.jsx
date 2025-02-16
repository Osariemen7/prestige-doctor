import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  CircularProgress,
  Alert,
  ThemeProvider,
  createTheme,
  useMediaQuery,
  Divider,
} from '@mui/material';
import { getAccessToken } from './api';
import Sidebar from './sidebar';
import { useNavigate } from 'react-router-dom';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1565C0', // Primary blue
    },
    secondary: {
      main: '#ffffff', // White for text on blue headers
    },
    background: {
      default: '#e3f2fd', // Soft blue background for full-screen layout
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
    subtitle1: {
      fontWeight: 600,
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
          setData(jsonData[0]);
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
        <Alert severity="warning">No doctor subscriber data available.</Alert>
      </Box>
    );
  }

  // Helper component to render a patient table
  const PatientTable = ({ title, patients }) => (
    <Card>
      <CardContent sx={{ p: 0 }}>
        {/* Header for Patient Table */}
        <Box
          sx={{
            backgroundColor: theme.palette.primary.main,
            color: theme.palette.secondary.main,
            px: 2,
            py: 1,
            borderTopLeftRadius: '8px',
            borderTopRightRadius: '8px',
          }}
        >
          <Typography variant="h6">{title}</Typography>
        </Box>
        <Box sx={{ p: 2 }}>
          {/* Table column headers */}
          <Grid container spacing={1} sx={{ fontWeight: 'bold', mb: 1 }}>
            <Grid item xs={4}>
              <Typography variant="subtitle1">First Name</Typography>
            </Grid>
            <Grid item xs={4}>
              <Typography variant="subtitle1">Last Name</Typography>
            </Grid>
            <Grid item xs={4}>
              <Typography variant="subtitle1">Phone Number</Typography>
            </Grid>
          </Grid>
          <Divider sx={{ mb: 1 }} />
          {/* Data rows with dividers */}
          {patients && patients.length > 0 ? (
            patients.map((patient, index) => (
              <React.Fragment key={index}>
                <Grid container spacing={1} sx={{ py: 1 }}>
                  <Grid item xs={4}>
                    <Typography variant="body1">{patient.user__first_name}</Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="body1">{patient.user__last_name}</Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="body1">
                      {formatPhoneNumber(patient.user__phone_number)}
                    </Typography>
                  </Grid>
                </Grid>
                {index !== patients.length - 1 && <Divider />}
              </React.Fragment>
            ))
          ) : (
            <Typography variant="body1">No data available.</Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <ThemeProvider theme={theme}>
      <div className="dashboard-container">
        <Sidebar handleLogout={handleLogout} />
        <div className="main-content">
          <Box
            bgcolor="background.default"
            minHeight="100vh"
            p={isMobile ? 2 : 4}
            overflowY="auto"
          >
            <Typography
              variant="h4"
              component="h1"
              gutterBottom
              color="primary"
              align="center"
            >
              Doctor's Dashboard
            </Typography>

            {/* Summary Card */}
            <Card>
              <CardContent sx={{ p: 0 }}>
                {/* Summary Header */}
                <Box
                  sx={{
                    backgroundColor: theme.palette.primary.main,
                    color: theme.palette.secondary.main,
                    px: 2,
                    py: 1,
                    borderTopLeftRadius: '8px',
                    borderTopRightRadius: '8px',
                  }}
                >
                  <Typography variant="h6">Summary</Typography>
                </Box>
                {/* Summary Data */}
                <Box sx={{ p: 2 }}>
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
                </Box>
              </CardContent>
            </Card>

            {/* Patient Tables - arranged side by side on larger screens */}
            <Grid container spacing={isMobile ? 2 : 3}>
              <Grid item xs={12} md={6}>
                <PatientTable
                  title="Consulting Patients"
                  patients={data.consulting_patients}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <PatientTable
                  title="Non-Consulting Patients"
                  patients={data.non_consulting_patients}
                />
              </Grid>
            </Grid>
          </Box>
        </div>
      </div>
    </ThemeProvider>
  );
};

export default DocDash;
