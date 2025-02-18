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
  useMediaQuery
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

const DocDash = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const [isSidebarMinimized, setIsSidebarMinimized] = useState(false);


  const handleLogout = () => {
    localStorage.removeItem('user-info');
    navigate('/');
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

  const formatPhoneNumber = (phone) => {
    if (!phone) return 'N/A';
    return phone.replace('+234', '0');
  };

  if (loading) {
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

      {/* Stats Grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
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
            value={`₦${data?.current_earnings || 0}`}
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
            value={`${data?.consultation_rate || 0}%`}
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

    </div>
  );
};

export default DocDash;