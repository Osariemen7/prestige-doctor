import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Container,
  Grid,
  Paper,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  InputAdornment,
  Tabs,
  Tab,
  IconButton,
  Snackbar,
} from '@mui/material';
import {
  Person as PersonIcon,
  AttachMoney as MoneyIcon,
  Schedule as ScheduleIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Close as CloseIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { getAccessToken } from './api';
import Sidebar from './sidebar';

// Define fetchProviderData OUTSIDE the component
const fetchProviderData = async (accessToken, setProviderData, setTempProviderData, setAvailabilities, setTempAvailabilities) => {
  try {
    const [providerResponse, availabilityResponse] = await Promise.all([
      fetch('https://health.prestigedelta.com/provider', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }),
      fetch('https://health.prestigedelta.com/availability/', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      })
    ]);

    if (providerResponse.ok) {
      const responseData = await providerResponse.json();
      const providerList = Array.isArray(responseData) ? responseData : [responseData];
      const firstProvider = providerList[0] || {};
      const updatedProviderData = {
        specialty: firstProvider.specialty || '',
        qualifications: firstProvider.qualifications || '',
        date_of_registration: firstProvider.date_of_registration || '',
        bio: firstProvider.bio || '',
        rate_per_hour: firstProvider.rate_per_hour || '',
        rate_currency: firstProvider.rate_currency || 'NGN', // Get currency from API, default to NGN
      };
      setProviderData(updatedProviderData);
      setTempProviderData(updatedProviderData);
    } else {
      console.error('Failed to fetch provider data:', providerResponse.statusText);
    }

    if (availabilityResponse.ok) {
      const availabilityData = await availabilityResponse.json();
      setAvailabilities(availabilityData || []);
      setTempAvailabilities(availabilityData || []);
    } else {
      console.error('Failed to fetch availability data:', availabilityResponse.statusText);
    }
  } catch (error) {
    console.error('Error fetching data:', error);
  }
};


const SettingPage = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState(0);
  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const qualificationOptions = [
    { label: 'MBBS', value: 'MBBS' },
    { label: 'MD', value: 'MD' },
    { label: 'MBChB', value: 'MBChB' },
  ];
  const [isSidebarMinimized, setIsSidebarMinimized] = useState(false);

  // State for provider profile
  const [providerData, setProviderData] = useState({
    specialty: '',
    qualifications: '',
    date_of_registration: '',
    bio: '',
    rate_per_hour: '',
    rate_currency: 'NGN', // Default currency
  });

  // State for editing
  const [editMode, setEditMode] = useState({
    profile: false,
    rate: false,
    availability: false
  });

  // Temporary state for editing
  const [tempProviderData, setTempProviderData] = useState({ ...providerData });
  const [tempAvailabilities, setTempAvailabilities] = useState([]);

  // State for availabilities
  const [availabilities, setAvailabilities] = useState([]);

  // State for success snackbar
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');


  // Fetch provider data on component mount
  useEffect(() => {
    const fetchData = async () => { // Keep fetchData to get accessToken
      try {
        const accessToken = await getAccessToken();
        fetchProviderData(accessToken, setProviderData, setTempProviderData, setAvailabilities, setTempAvailabilities); // Call the moved function
      } catch (error) {
        console.error('Error getting access token:', error);
      }
    };

    fetchData();
  }, []); // Dependency array is now empty - no more warning

  // Function to handle snackbar close
  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  // Save provider data
  const handleSaveProviderData = async () => {
    try {
      const accessToken = await getAccessToken();
      const response = await fetch('https://health.prestigedelta.com/provider/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          ...tempProviderData,
          rate_currency: tempProviderData.rate_currency, // Use currency from state
        }),
      });

      if (response.ok) {
        setProviderData(tempProviderData);
        setEditMode(prev => ({ ...prev, profile: false, rate: false })); // Close both profile and rate edit mode if saving from rate edit too
        // Show success Snackbar
        setSnackbarMessage('Profile saved successfully!');
        setSnackbarOpen(true);
      } else {
        const errorData = await response.json();
        console.error('Save failed:', errorData);
        setSnackbarMessage(`Failed to save profile: ${errorData?.message || 'Unknown error'}`);
        setSnackbarOpen(true);
      }
    } catch (error) {
      console.error('Error saving provider data:', error);
      setSnackbarMessage('Error saving profile.');
      setSnackbarOpen(true);
    }
  };

  // Save availability data
  const handleSaveAvailabilities = async () => {
    try {
      const accessToken = await getAccessToken();

      // Transform availabilities to match expected format
      const formattedAvailabilities = tempAvailabilities.map(availability => ({
        day_of_week: availability.day_of_week,
        start_time: {
          hour: parseInt(availability.start_time.split(':')[0]),
          minute: parseInt(availability.start_time.split(':')[1])
        },
        end_time: {
          hour: parseInt(availability.end_time.split(':')[0]),
          minute: parseInt(availability.end_time.split(':')[1])
        }
      }));
      const formData = {
        availabilities: formattedAvailabilities,
      };
      const response = await fetch('https://health.prestigedelta.com/availability/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setAvailabilities(tempAvailabilities);
        setEditMode(prev => ({ ...prev, availability: false }));
        // Show success Snackbar
        setSnackbarMessage('Availabilities saved successfully!');
        setSnackbarOpen(true);
      } else {
        const errorData = await response.json();
        console.error('Save failed:', errorData);
        setSnackbarMessage(`Failed to save availabilities: ${errorData?.message || 'Unknown error'}`);
        setSnackbarOpen(true);
      }
    } catch (error) {
      console.error('Error saving availabilities:', error);
      setSnackbarMessage('Error saving availabilities.');
      setSnackbarOpen(true);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user-info');
    navigate('/');
  };
  // Render profile edit mode
  const renderProfileEdit = () => (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Specialty"
          value={tempProviderData.specialty}
          onChange={(e) => setTempProviderData(prev => ({ ...prev, specialty: e.target.value }))}
        />
      </Grid>
      <Grid item xs={12}>
        <FormControl fullWidth>
          <InputLabel>Qualifications</InputLabel>
          <Select
            value={tempProviderData.qualifications}
            label="Qualifications"
            onChange={(e) => setTempProviderData(prev => ({ ...prev, qualifications: e.target.value }))}
          >
            {qualificationOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          type="date"
          label="Date of Registration"
          value={tempProviderData.date_of_registration}
          onChange={(e) => setTempProviderData(prev => ({ ...prev, date_of_registration: e.target.value }))}
          InputLabelProps={{ shrink: true }}
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          multiline
          rows={4}
          label="Bio"
          value={tempProviderData.bio}
          onChange={(e) => setTempProviderData(prev => ({ ...prev, bio: e.target.value }))}
        />
      </Grid>
      <Grid item xs={12}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSaveProviderData}
          startIcon={<SaveIcon />}
        >
          Save
        </Button>
        <Button
          variant="outlined"
          color="secondary"
          onClick={() => {
            setTempProviderData(providerData);
            setEditMode(prev => ({ ...prev, profile: false }));
          }}
          startIcon={<CloseIcon />}
          sx={{ ml: 2 }}
        >
          Close
        </Button>
      </Grid>
    </Grid>
  );

  // Render rate edit mode
  const renderRateEdit = () => (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Rate per Hour"
          type="number"
          value={tempProviderData.rate_per_hour}
          onChange={(e) => setTempProviderData(prev => ({ ...prev, rate_per_hour: e.target.value }))}
          InputProps={{
            startAdornment: <InputAdornment position="start">{tempProviderData.rate_currency}</InputAdornment>, // Use currency from state
          }}
        />
      </Grid>
      <Grid item xs={12}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSaveProviderData}
          startIcon={<SaveIcon />}
        >
          Save
        </Button>
        <Button
          variant="outlined"
          color="secondary"
          onClick={() => {
            setTempProviderData(providerData);
            setEditMode(prev => ({ ...prev, rate: false }));
          }}
          startIcon={<CloseIcon />}
          sx={{ ml: 2 }}
        >
          Close
        </Button>
      </Grid>
    </Grid>
  );

  // Render availability edit mode
  const renderAvailabilityEdit = () => (
    <Grid container spacing={2}>
      {tempAvailabilities.map((availability, index) => (
        <Grid container item spacing={2} key={index} sx={{ mb: 2 }}>
          <Grid item xs={4}>
            <FormControl fullWidth>
              <InputLabel>Day</InputLabel>
              <Select
                value={availability.day_of_week}
                label="Day"
                onChange={(e) => {
                  const updatedAvailabilities = [...tempAvailabilities];
                  updatedAvailabilities[index].day_of_week = e.target.value;
                  setTempAvailabilities(updatedAvailabilities);
                }}
              >
                {DAYS.map((day) => (
                  <MenuItem key={day} value={day}>
                    {day}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={3}>
            <TextField
              fullWidth
              type="time"
              label="Start Time"
              value={availability.start_time}
              onChange={(e) => {
                const updatedAvailabilities = [...tempAvailabilities];
                updatedAvailabilities[index].start_time = e.target.value;
                setTempAvailabilities(updatedAvailabilities);
              }}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={3}>
            <TextField
              fullWidth
              type="time"
              label="End Time"
              value={availability.end_time}
              onChange={(e) => {
                const updatedAvailabilities = [...tempAvailabilities];
                updatedAvailabilities[index].end_time = e.target.value;
                setTempAvailabilities(updatedAvailabilities);
              }}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={2}>
            <Button
              variant="outlined"
              color="error"
              onClick={() => {
                const filteredAvailabilities = tempAvailabilities.filter((_, i) => i !== index);
                setTempAvailabilities(filteredAvailabilities);
              }}
            >
              Remove
            </Button>
          </Grid>
        </Grid>
      ))}
      <Grid item xs={12}>
        <Button
          variant="outlined"
          onClick={() => setTempAvailabilities([
            ...tempAvailabilities,
            {
              day_of_week: DAYS[0],
              start_time: '09:00',
              end_time: '17:00'
            }
          ])}
        >
          Add Availability
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSaveAvailabilities}
          startIcon={<SaveIcon />}
          sx={{ ml: 2 }}
        >
          Save
        </Button>
        <Button
          variant="outlined"
          color="secondary"
          onClick={() => {
            setTempAvailabilities(availabilities);
            setEditMode(prev => ({ ...prev, availability: false }));
          }}
          startIcon={<CloseIcon />}
          sx={{ ml: 2 }}
        >
          Close
        </Button>
      </Grid>
    </Grid>
  );

  // Function to format number with thousand separators
  const formatNumberWithCommas = (number) => {
    if (number === null || number === undefined) {
      return 'Not set';
    }
    return Number(number).toLocaleString();
  };

  // Render different sections based on active tab
  const renderActiveSection = () => {
    switch (activeSection) {
      case 0:
        return (
          <Paper elevation={3} sx={{ p: 3, mb: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">Provider Profile</Typography>
              {!editMode.profile && (
                <IconButton onClick={() => setEditMode(prev => ({ ...prev, profile: true }))}>
                  <EditIcon />
                </IconButton>
              )}
            </Box>
            {editMode.profile ? renderProfileEdit() : (
              <Grid container spacing={2}>
                <Grid item xs={12}><Typography>Specialty: {providerData.specialty || 'Not specified'}</Typography></Grid>
                <Grid item xs={12}><Typography>Qualifications: {providerData.qualifications || 'Not specified'}</Typography></Grid>
                <Grid item xs={12}><Typography>Date of Registration: {providerData.date_of_registration || 'Not specified'}</Typography></Grid>
                <Grid item xs={12}><Typography>Bio: {providerData.bio || 'No bio provided'}</Typography></Grid>
              </Grid>
            )}
          </Paper>
        );
      case 1:
        return (
          <Paper elevation={3} sx={{ p: 3, mb: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">Per hour compensation</Typography>
              {!editMode.rate && (
                <IconButton onClick={() => setEditMode(prev => ({ ...prev, rate: true }))}>
                  <EditIcon />
                </IconButton>
              )}
            </Box>
            {editMode.rate ? renderRateEdit() : (
              <Typography>Per hour compensation: {providerData.rate_currency} {formatNumberWithCommas(providerData.rate_per_hour)}</Typography>
            )}
          </Paper>
        );
      case 2:
        return (
          <Paper elevation={3} sx={{ p: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">Availability</Typography>
              {!editMode.availability && (
                <IconButton onClick={() => setEditMode(prev => ({ ...prev, availability: true }))}>
                  <EditIcon />
                </IconButton>
              )}
            </Box>
            {editMode.availability ? renderAvailabilityEdit() : (
              availabilities.map((availability, index) => (
                <Grid container spacing={2} key={index} sx={{ mb: 2 }}>
                  <Grid item xs={4}><Typography>Day: {availability.day_of_week}</Typography></Grid>
                  <Grid item xs={4}><Typography>Start Time: {availability.start_time}</Typography></Grid>
                  <Grid item xs={4}><Typography>End Time: {availability.end_time}</Typography></Grid>
                </Grid>
              ))
            )}
          </Paper>
        );
      default:
        return null;
    }
  };

  return (
    <div className="dashboard-container" style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' }}>
      <Sidebar
        onToggleSidebar={(minimized) => setIsSidebarMinimized(minimized)}
        onNavigate={(path) => navigate(path)}
        onLogout={handleLogout}
      />
      <div className={`${isSidebarMinimized ? 'ml-14 md:ml-76' : 'ml-0 md:ml-64'} flex-1 transition-all duration-300`}>
        <Container maxWidth="md" sx={{ mt: 8, mb: 8, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Paper elevation={6} sx={{
            width: '100%',
            borderRadius: 5,
            p: { xs: 2, md: 5 },
            boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
            background: 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(6px)',
            minHeight: 600,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
          }}>
            <Typography variant='h4' fontWeight={700} color="primary.main" sx={{ mb: 3, letterSpacing: 1 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <SettingsIcon sx={{ fontSize: 36, color: 'primary.main' }} /> Settings
              </span>
            </Typography>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
              <Tabs
                value={activeSection}
                onChange={(e, newValue) => setActiveSection(newValue)}
                centered
                TabIndicatorProps={{ style: { height: 4, borderRadius: 2, background: 'linear-gradient(90deg, #1976d2 0%, #64b5f6 100%)' } }}
                sx={{
                  '.MuiTab-root': {
                    fontWeight: 600,
                    fontSize: 18,
                    color: 'text.secondary',
                    transition: 'color 0.2s',
                    '&.Mui-selected': { color: 'primary.main' },
                  },
                  '.MuiTabs-flexContainer': { gap: 2 },
                }}
              >
                <Tab icon={<PersonIcon sx={{ fontSize: 28 }} />} label="Profile" />
                <Tab icon={<MoneyIcon sx={{ fontSize: 28 }} />} label="Compensation" />
                <Tab icon={<ScheduleIcon sx={{ fontSize: 28 }} />} label="Availability" />
              </Tabs>
            </Box>
            <Box sx={{ flex: 1, width: '100%' }}>{renderActiveSection()}</Box>
          </Paper>
        </Container>
      </div>
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={handleSnackbarClose}
        message={snackbarMessage}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        ContentProps={{
          sx: {
            background: 'linear-gradient(90deg, #1976d2 0%, #64b5f6 100%)',
            color: '#fff',
            fontWeight: 600,
            fontSize: 16,
            borderRadius: 2,
          }
        }}
      />
    </div>
  );
};

export default SettingPage;