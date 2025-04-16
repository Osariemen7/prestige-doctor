import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  CircularProgress,
  Alert,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  useTheme,
  useMediaQuery,
  Snackbar // Import Snackbar
} from '@mui/material';
import {
  MdLocalHospital,
  MdAttachMoney,
  MdPeople,
  MdTrendingUp
} from 'react-icons/md';
import { getAccessToken } from './api';
import Sidebar from './sidebar'; // Import Sidebar
import { useNavigate } from 'react-router-dom';
import {
  CardHeader,
  Avatar,
  Chip,
  Button,
  IconButton, // Import IconButton
} from "@mui/material";
import { CalendarDays, GraduationCap, Stethoscope, Building2 } from "lucide-react";
import CloseIcon from '@mui/icons-material/Close'; // Import CloseIcon

const DocDash = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const [isSidebarMinimized, setIsSidebarMinimized] = useState(false);
  const [doctorData, setDoctorData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
   const [buttonVisible, setButtonVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');

  const handleLogout = () => {
    localStorage.removeItem('user-info');
    navigate('/');
  };

  const handleSnackbarClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbarOpen(false);
  };

  const handleSubmit = async () => {
    setButtonVisible(true);
    const subscription_type = 'monthly';
    const subscriptionData = { subscription_type };

    const token = await getAccessToken();

    try {
      const response = await fetch(`https://health.prestigedelta.com/providersub/${doctorData[0].id}/subscribe/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(subscriptionData),
      });

      if (response.ok) {
        setSnackbarMessage('Subscription successful! Your subscription is now active.');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
      } else {
        const errorResult = await response.json();
        setMessage(errorResult.message);
        setSnackbarMessage(errorResult.message || 'Failed to subscribe.'); // Use error message from response if available
        setSnackbarSeverity('error');
        setSnackbarOpen(true); // Open snackbar even on error to show the message
        throw new Error('Failed to subscribe.');
      }
    } catch (error) {
      setSnackbarMessage(error.message);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setButtonVisible(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      const accessToken = await getAccessToken();
      try {
        const response = await fetch('https://health.prestigedelta.com/doctorsubscribers/', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'content-type': 'application/json',
          },
        });

        if (!response.ok) throw new Error('Failed to fetch data');

        const jsonData = await response.json();
        setData(jsonData[0] || {});
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const fetchDat = async () => {
      const accessToken = await getAccessToken();
      if (!accessToken) return;

      try {
        const response = await fetch("https://health.prestigedelta.com/provider/", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            accept: "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        });
        if (response.status === 401) {
          navigate("/login");
        } else {
          const result = await response.json();
          setDoctorData(result);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDat();
  }, [navigate]);

  console.log(doctorData)
  const formatPhoneNumber = (phone) => {
    if (!phone) return 'N/A';
    return phone.replace('+234', '0');
  };

  if (loading || isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
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

  const StatCard = ({ title, value, icon: Icon }) => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box display="flex" alignItems="center">
          <Box
            sx={{
              backgroundColor: ' #dae7ff',
              borderRadius: '50%',
              p: 1,
              mr: 2
            }}
          >
            <Icon size={24} color={theme.palette.primary.main} />
          </Box>
          <Box>
            <Typography color="textSecondary" variant="subtitle2">
              {title}
            </Typography>
            <Typography variant="h5" component="div">
              {value}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  const PatientTable = ({ title, patients }) => (
    <Card sx={{ mt: 2, height: '100%' }}>
      <CardContent>
        <Typography variant="h6" gutterBottom sx={{ color: 'primary.main' }}>
          {title}
        </Typography>
        <TableContainer component={Paper} sx={{ maxHeight: 400, overflow: 'auto' }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>First Name</TableCell>
                <TableCell>Last Name</TableCell>
                <TableCell>Phone Number</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {patients?.length > 0 ? (
                patients.map((patient, index) => (
                  <TableRow key={index}>
                    <TableCell>{patient.user__first_name || 'N/A'}</TableCell>
                    <TableCell>{patient.user__last_name || 'N/A'}</TableCell>
                    <TableCell>{formatPhoneNumber(patient.user__phone_number)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} align="center">
                    No patients available
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );

  return (
    <div className='dashboard-container'>
    <Sidebar
      onToggleSidebar={(minimized) => setIsSidebarMinimized(minimized)}
      onNavigate={(path) => navigate(path)}
      onLogout={handleLogout}
    />
    <div className={`${isSidebarMinimized ? 'ml-14 md:ml-76' : 'ml-0 md:ml-64'} flex-1 transition-all duration-300`}>
    <Box sx={{
      p: isMobile ? 2 : 4,
      backgroundColor: 'rgb(248, 248, 248)',
      minHeight: '100vh'
    }}>
      <Typography
        variant="h5"
        component="h1"
        gutterBottom
        align="left"
        color="primary"
        sx={{ mb: 0 }}
      >
        Dashboard Overview
      </Typography>
      <Typography
        variant="body1"
        component="p"
        gutterBottom
        align="left"
        sx={{ mb: 4 }}>
      Monitor your healthcare practice performance
      </Typography>
      <Card
          sx={{
            backdropFilter: "blur(10px)",
            backgroundColor: "rgba(255, 255, 255, 0.8)",
            boxShadow: "0px 4px 12px rgba(0,0,0,0.1)",
            border: 0,
          }}
        >
          <CardHeader
            sx={{ p: 2 }}
            avatar={
              <Avatar
                src={doctorData[0].profile_picture || ""}
                sx={{ width: 96, height: 96 }}
              >
                {!doctorData[0].profile_picture && "DR."}
              </Avatar>
            }
            title={
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>

                <Typography variant="h5" sx={{ fontWeight: "bold", color: "#333" }}>
                  .{" "}
                  {doctorData[0].bio
                    ? doctorData[0].bio.split(" ").slice(1).join(" ")
                    : ""}
                </Typography>
                <Typography variant="subtitle1" sx={{ color: "#0EA5E9" }}>
                  {doctorData[0].specialty}
                </Typography>
              </Box>
            }
          />
          <CardContent sx={{ p: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <GraduationCap size={20} color="#0EA5E9" />
                  <Box>
                    <Typography variant="body2" color="textSecondary">
                      Qualifications
                    </Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: "medium" }}>
                      {doctorData[0].qualifications}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 2 }}>
                  <CalendarDays size={20} color="#0EA5E9" />
                  <Box>
                    <Typography variant="body2" color="textSecondary">
                      Registered Since
                    </Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: "medium" }}>
                      {new Date(doctorData[0].date_of_registration).toLocaleDateString()}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Stethoscope size={20} color="#0EA5E9" />
                  <Box>
                    <Typography variant="body2" color="textSecondary">
                      GPT Sessions
                    </Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: "medium" }}>
                      {doctorData[0].gpt_session_count}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 2 }}>
                  <Building2 size={20} color="#0EA5E9" />
                  <Box>
                    <Typography variant="body2" color="textSecondary">
                      Organization
                    </Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: "medium" }}>
                      {doctorData[0].organization}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      {/* Stats Grid */}
      <Grid container spacing={3} sx={{ mb: 4,mt: 2 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Consultations"
            value={data?.total_consultations || 0}
            icon={MdLocalHospital}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Current Earnings"
            value={`$${data?.current_earnings || 0}`}
            icon={MdAttachMoney}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Patients Consulted"
            value={data?.num_patients_consulted || 0}
            icon={MdPeople}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Consultation Rate"
            value={`${(data?.consultation_rate || 0).toFixed(2)}%`}
            icon={MdTrendingUp}
          />
        </Grid>
      </Grid>

      {/* Patient Tables */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <PatientTable
            title="Consulting Patients"
            patients={data?.consulting_patients}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <PatientTable
            title="Non-Consulting Patients"
            patients={data?.non_consulting_patients}
          />
        </Grid>
      </Grid>
    </Box>
    </div>
     {/* Snackbar */}
     <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        message={snackbarMessage}
        severity={snackbarSeverity}
        action={
          <React.Fragment>
            <IconButton
              aria-label="close"
              color="inherit"
              sx={{ p: 0.5 }}
              onClick={handleSnackbarClose}
            >
              <CloseIcon />
            </IconButton>
          </React.Fragment>
        }
      />
    </div>
  );
};

export default DocDash;