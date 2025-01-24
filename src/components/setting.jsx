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
  Close as CloseIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { getAccessToken } from './api';
import Sidebar from './sidebar';

const SettingPage = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState(0);
  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const qualificationOptions = [
    { label: 'MBBS', value: 'MBBS' },
    { label: 'MD', value: 'MD' },
    { label: 'MBChB', value: 'MBChB' },
  ];

  // State for provider profile
  const [providerData, setProviderData] = useState({
    specialty: '',
    qualifications: '',
    date_of_registration: '',
    bio: '',
    rate_per_minute: '',
  });

  // State for editing
  const [editMode, setEditMode] = useState({
    profile: false,
    rate: false,
    availability: false
  });

  // Temporary state for editing
  const [tempProviderData, setTempProviderData] = useState({...providerData});
  const [tempAvailabilities, setTempAvailabilities] = useState([]);

  // State for availabilities
  const [availabilities, setAvailabilities] = useState([]);

    // State for success snackbar
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');


  // Fetch provider data on component mount
  useEffect(() => {
    const fetchProviderData = async () => {
      try {
        const accessToken = await getAccessToken();
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
          const providerData = await providerResponse.json();
          const firstProvider = providerData[0] || {};
          const updatedProviderData = {
            specialty: firstProvider.specialty || '',
            qualifications: firstProvider.qualifications || '',
            date_of_registration: firstProvider.date_of_registration || '',
            bio: firstProvider.bio || '',
            rate_per_minute: firstProvider.rate_per_minute || '',
          };
          setProviderData(updatedProviderData);
          setTempProviderData(updatedProviderData);
        }

        if (availabilityResponse.ok) {
          const availabilityData = await availabilityResponse.json();
          setAvailabilities(availabilityData || []);
          setTempAvailabilities(availabilityData || []);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchProviderData();
  }, []);

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
          rate_currency: 'NGN',
        }),
      });

      if (response.ok) {
        setProviderData(tempProviderData);
        setEditMode(prev => ({ ...prev, profile: false }));
         // Show success Snackbar
         setSnackbarMessage('Profile saved successfully!');
         setSnackbarOpen(true);
      } else {
        const errorData = await response.json();
        console.error('Save failed:', errorData);
      }
    } catch (error) {
      console.error('Error saving provider data:', error);
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
      }
    } catch (error) {
      console.error('Error saving availabilities:', error);
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
          label="Rate per Minute"
          type="number"
          value={tempProviderData.rate_per_minute}
          onChange={(e) => setTempProviderData(prev => ({ ...prev, rate_per_minute: e.target.value }))}
          InputProps={{
            startAdornment: <InputAdornment position="start">₦</InputAdornment>,
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

  // Render different sections based on active tab
  const renderActiveSection = () => {
    switch(activeSection) {
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
              <Typography variant="h6">Consultation Rate</Typography>
              {!editMode.rate && (
                <IconButton onClick={() => setEditMode(prev => ({ ...prev, rate: true }))}>
                  <EditIcon />
                </IconButton>
              )}
            </Box>
            {editMode.rate ? renderRateEdit() : (
              <Typography>Rate per Minute: ₦{providerData.rate_per_minute || 'Not set'}</Typography>
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
    <div className='dashboard-container'>
    <Sidebar navigate={navigate} handleLogout={handleLogout} />
    <div className='main-content'>
    <Container maxWidth="md" sx={{ mt: 4 }}>
    <Typography variant='h6'>Settings</Typography>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={activeSection} onChange={(e, newValue) => setActiveSection(newValue)} centered>
          <Tab icon={<PersonIcon />} label="Profile" />
          <Tab icon={<MoneyIcon />} label="Rate" />
          <Tab icon={<ScheduleIcon />} label="Availability" />
        </Tabs>
      </Box>
      {renderActiveSection()}
    </Container>
    </div>
        <Snackbar
            open={snackbarOpen}
            autoHideDuration={3000}
            onClose={handleSnackbarClose}
            message={snackbarMessage}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        />
    </div>
  );
};

export default SettingPage;