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
  Avatar,
  Alert,
} from '@mui/material';
import {
  Person as PersonIcon,
  AttachMoney as MoneyIcon,
  Schedule as ScheduleIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Close as CloseIcon,
  Settings as SettingsIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  AccessTime as AccessTimeIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTheme, useMediaQuery } from '@mui/material';
import { getAccessToken } from './api';
import Sidebar from './sidebar';

// Define fetchProviderData OUTSIDE the component
const fetchProviderData = async (accessToken, setProviderData, setTempProviderData, setAvailabilities, setTempAvailabilities) => {
  try {
    const [providerResponse, availabilityResponse] = await Promise.all([
      fetch('https://service.prestigedelta.com/provider', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }),
      fetch('https://service.prestigedelta.com/availability/', {
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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));

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
      const response = await fetch('https://service.prestigedelta.com/provider/', {
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
      const response = await fetch('https://service.prestigedelta.com/availability/', {
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
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Specialty"
          value={tempProviderData.specialty}
          onChange={(e) => setTempProviderData(prev => ({ ...prev, specialty: e.target.value }))}
          InputProps={{
            sx: {
              borderRadius: 2,
              '&.Mui-focused': {
                boxShadow: '0 0 0 2px rgba(25, 118, 210, 0.2)',
              },
              transition: 'all 0.2s ease-in-out',
            }
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: 'primary.main',
                borderWidth: '1px',
              }
            },
            '& .MuiInputLabel-root': {
              fontSize: '0.95rem',
              fontWeight: 500,
            }
          }}
        />
      </Grid>
      <Grid item xs={12}>
        <FormControl fullWidth>
          <InputLabel sx={{ fontSize: '0.95rem', fontWeight: 500 }}>Qualifications</InputLabel>
          <Select
            value={tempProviderData.qualifications}
            label="Qualifications"
            onChange={(e) => setTempProviderData(prev => ({ ...prev, qualifications: e.target.value }))}
            sx={{
              borderRadius: 2,
              '&.Mui-focused': {
                boxShadow: '0 0 0 2px rgba(25, 118, 210, 0.2)'
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: 'primary.main',
                borderWidth: '1px',
              },
              transition: 'all 0.2s ease-in-out',
            }}
            MenuProps={{
              PaperProps: {
                sx: {
                  borderRadius: 2,
                  boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
                  '& .MuiMenuItem-root': {
                    fontSize: '0.95rem',
                    paddingTop: 1,
                    paddingBottom: 1,
                    '&:hover': {
                      backgroundColor: 'rgba(25, 118, 210, 0.08)',
                    },
                    '&.Mui-selected': {
                      backgroundColor: 'rgba(25, 118, 210, 0.12)',
                    }
                  }
                }
              },
            }}
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
          InputProps={{
            sx: {
              borderRadius: 2,
              '&.Mui-focused': {
                boxShadow: '0 0 0 2px rgba(25, 118, 210, 0.2)',
              },
              transition: 'all 0.2s ease-in-out',
            }
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: 'primary.main',
                borderWidth: '1px',
              }
            },
            '& .MuiInputLabel-root': {
              fontSize: '0.95rem',
              fontWeight: 500,
            }
          }}
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
          InputProps={{
            sx: {
              borderRadius: 2,
              '&.Mui-focused': {
                boxShadow: '0 0 0 2px rgba(25, 118, 210, 0.2)',
              },
              transition: 'all 0.2s ease-in-out',
            }
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: 'primary.main',
                borderWidth: '1px',
              }
            },
            '& .MuiInputLabel-root': {
              fontSize: '0.95rem',
              fontWeight: 500,
            }
          }}
        />
      </Grid>
      <Grid item xs={12} sx={{ mt: 1, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSaveProviderData}
          startIcon={<SaveIcon />}
          sx={{
            py: 1.2,
            px: 3,
            borderRadius: '12px',
            boxShadow: '0 4px 14px 0 rgba(0,0,0,0.1)',
            transition: 'all 0.3s ease-in-out',
            fontWeight: 600,
            '&:hover': { 
              boxShadow: '0 6px 20px 0 rgba(0,0,0,0.15)',
              transform: 'translateY(-2px)',
            }
          }}
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
          sx={{
            py: 1.2,
            px: 3,
            borderRadius: '12px',
            transition: 'all 0.3s ease-in-out',
            fontWeight: 600,
            borderWidth: '1.5px',
            '&:hover': { 
              borderWidth: '1.5px',
              boxShadow: '0 4px 12px 0 rgba(0,0,0,0.08)',
              transform: 'translateY(-2px)',
            }
          }}
        >
          Cancel
        </Button>
      </Grid>
    </Grid>
  );

  // Render rate edit mode
  const renderRateEdit = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Rate per Hour"
          type="number"
          value={tempProviderData.rate_per_hour}
          onChange={(e) => setTempProviderData(prev => ({ ...prev, rate_per_hour: e.target.value }))}
          InputProps={{
            startAdornment: <InputAdornment position="start">{tempProviderData.rate_currency}</InputAdornment>,
            sx: {
              borderRadius: 2,
              '&.Mui-focused': {
                boxShadow: '0 0 0 2px rgba(25, 118, 210, 0.2)',
              },
              transition: 'all 0.2s ease-in-out',
            }
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: 'primary.main',
                borderWidth: '1px',
              }
            },
            '& .MuiInputLabel-root': {
              fontSize: '0.95rem',
              fontWeight: 500,
              marginLeft: '20px' // Offset for the currency adornment
            }
          }}
        />
      </Grid>
      <Grid item xs={12} sx={{ mt: 1, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSaveProviderData}
          startIcon={<SaveIcon />}
          sx={{
            py: 1.2,
            px: 3,
            borderRadius: '12px',
            boxShadow: '0 4px 14px 0 rgba(0,0,0,0.1)',
            transition: 'all 0.3s ease-in-out',
            fontWeight: 600,
            '&:hover': { 
              boxShadow: '0 6px 20px 0 rgba(0,0,0,0.15)',
              transform: 'translateY(-2px)',
            }
          }}
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
          sx={{
            py: 1.2,
            px: 3,
            borderRadius: '12px',
            transition: 'all 0.3s ease-in-out',
            fontWeight: 600,
            borderWidth: '1.5px',
            '&:hover': { 
              borderWidth: '1.5px',
              boxShadow: '0 4px 12px 0 rgba(0,0,0,0.08)',
              transform: 'translateY(-2px)',
            }
          }}
        >
          Cancel
        </Button>
      </Grid>
    </Grid>
  );

  // Render availability edit mode
  const renderAvailabilityEdit = () => (
    <Grid container spacing={2}>
      {tempAvailabilities.map((availability, index) => (
        <Grid container item spacing={2} key={index} sx={{ 
          mb: 2, 
          backgroundColor: theme.palette.background.paper,
          borderRadius: 2,
          p: 1.5,
          boxShadow: '0 2px 8px 0 rgba(0,0,0,0.05)',
          position: 'relative',
          '&:hover': {
            boxShadow: '0 4px 12px 0 rgba(0,0,0,0.1)',
          },
          transition: 'all 0.2s ease-in-out',
        }}>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth>
              <InputLabel sx={{ fontSize: '0.95rem', fontWeight: 500 }}>Day</InputLabel>
              <Select
                value={availability.day_of_week}
                label="Day"
                onChange={(e) => {
                  const updatedAvailabilities = [...tempAvailabilities];
                  updatedAvailabilities[index].day_of_week = e.target.value;
                  setTempAvailabilities(updatedAvailabilities);
                }}
                sx={{
                  borderRadius: 2,
                  '&.Mui-focused': {
                    boxShadow: '0 0 0 2px rgba(25, 118, 210, 0.2)'
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'primary.main',
                    borderWidth: '1px',
                  },
                  transition: 'all 0.2s ease-in-out',
                }}
                MenuProps={{
                  PaperProps: {
                    sx: {
                      borderRadius: 2,
                      boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
                      '& .MuiMenuItem-root': {
                        paddingTop: 1,
                        paddingBottom: 1,
                      }
                    }
                  },
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
          <Grid item xs={12} sm={3}>
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
              InputProps={{
                sx: {
                  borderRadius: 2,
                  '&.Mui-focused': {
                    boxShadow: '0 0 0 2px rgba(25, 118, 210, 0.2)',
                  },
                  transition: 'all 0.2s ease-in-out',
                }
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'primary.main',
                    borderWidth: '1px',
                  }
                },
                '& .MuiInputLabel-root': {
                  fontSize: '0.95rem',
                  fontWeight: 500,
                }
              }}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
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
              InputProps={{
                sx: {
                  borderRadius: 2,
                  '&.Mui-focused': {
                    boxShadow: '0 0 0 2px rgba(25, 118, 210, 0.2)',
                  },
                  transition: 'all 0.2s ease-in-out',
                }
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'primary.main',
                    borderWidth: '1px',
                  }
                },
                '& .MuiInputLabel-root': {
                  fontSize: '0.95rem',
                  fontWeight: 500,
                }
              }}
            />
          </Grid>
          <Grid item xs={12} sm={2} sx={{ display: 'flex', alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: { xs: 'flex-start', sm: 'flex-end' } }}>
            <IconButton
              color="error"
              onClick={() => {
                const filteredAvailabilities = tempAvailabilities.filter((_, i) => i !== index);
                setTempAvailabilities(filteredAvailabilities);
              }}
              sx={{
                '&:hover': {
                  backgroundColor: 'rgba(211, 47, 47, 0.1)',
                  transform: 'scale(1.1)',
                },
                transition: 'all 0.2s ease-in-out',
              }}
            >
              <DeleteIcon />
            </IconButton>
          </Grid>
        </Grid>
      ))}
      <Grid item xs={12} sx={{ mt: 2, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
        <Button
          variant="outlined"
          color="primary"
          onClick={() => setTempAvailabilities([
            ...tempAvailabilities,
            {
              day_of_week: DAYS[0],
              start_time: '09:00',
              end_time: '17:00'
            }
          ])}
          startIcon={<AddIcon />}
          sx={{
            py: 1.2,
            px: 3,
            borderRadius: '12px',
            transition: 'all 0.3s ease-in-out',
            fontWeight: 600,
            borderWidth: '1.5px',
            backgroundColor: 'rgba(25, 118, 210, 0.04)',
            '&:hover': { 
              borderWidth: '1.5px',
              backgroundColor: 'rgba(25, 118, 210, 0.08)',
              boxShadow: '0 4px 12px 0 rgba(0,0,0,0.08)',
              transform: 'translateY(-2px)',
            }
          }}
        >
          Add Availability
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSaveAvailabilities}
          startIcon={<SaveIcon />}
          sx={{
            py: 1.2,
            px: 3,
            borderRadius: '12px',
            boxShadow: '0 4px 14px 0 rgba(0,0,0,0.1)',
            transition: 'all 0.3s ease-in-out',
            fontWeight: 600,
            '&:hover': { 
              boxShadow: '0 6px 20px 0 rgba(0,0,0,0.15)',
              transform: 'translateY(-2px)',
            }
          }}
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
          sx={{
            py: 1.2,
            px: 3,
            borderRadius: '12px',
            transition: 'all 0.3s ease-in-out',
            fontWeight: 600,
            borderWidth: '1.5px',
            '&:hover': { 
              borderWidth: '1.5px',
              boxShadow: '0 4px 12px 0 rgba(0,0,0,0.08)',
              transform: 'translateY(-2px)',
            }
          }}
        >
          Cancel
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
          <Paper 
            elevation={0} 
            sx={{ 
              p: { xs: 2, sm: 3 }, 
              mb: 2, 
              borderRadius: 3,
              background: theme.palette.mode === 'dark' 
                ? `linear-gradient(145deg, ${alpha(theme.palette.background.paper, 0.9)} 70%, ${alpha(theme.palette.background.paper, 0.7)} 100%)`
                : `linear-gradient(145deg, ${theme.palette.background.paper} 70%, ${alpha(theme.palette.primary.lighter, 0.3)} 100%)`,
              boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.08)',
              border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
              backdropFilter: 'blur(6px)',
              transition: 'all 0.3s ease-in-out',
            }}
          >
            <Box 
              display="flex" 
              justifyContent="space-between" 
              alignItems="center" 
              sx={{ 
                mb: 3,
                pb: 2,
                borderBottom: `1px solid ${alpha(theme.palette.divider, 0.6)}`
              }}
            >
              <Box display="flex" alignItems="center" gap={1}>
                <PersonIcon sx={{ color: 'primary.main', fontSize: { xs: 20, sm: 24 } }} />
                <Typography 
                  variant="h6" 
                  sx={{ 
                    fontSize: { xs: '1.1rem', sm: '1.25rem' },
                    fontWeight: 700,
                    color: 'text.primary'
                  }}
                >
                  Provider Profile
                </Typography>
              </Box>
              {!editMode.profile && (
                <IconButton 
                  onClick={() => setEditMode(prev => ({ ...prev, profile: true }))}
                  sx={{
                    backgroundColor: alpha(theme.palette.primary.main, 0.08),
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.15),
                      transform: 'scale(1.05)',
                    },
                    transition: 'all 0.2s ease-in-out',
                  }}
                >
                  <EditIcon sx={{ fontSize: '1.2rem', color: 'primary.main' }} />
                </IconButton>
              )}
            </Box>
            {editMode.profile ? renderProfileEdit() : (
              <Grid container spacing={2.5}>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5, fontWeight: 500 }}>
                      Specialty
                    </Typography>
                    <Typography 
                      variant="body1" 
                      sx={{ 
                        fontWeight: 600, 
                        color: providerData.specialty ? 'text.primary' : 'text.disabled',
                        p: 1.5,
                        bgcolor: alpha(theme.palette.background.default, 0.7),
                        borderRadius: 1,
                        border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                      }}
                    >
                      {providerData.specialty || 'Not specified'}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5, fontWeight: 500 }}>
                      Qualifications
                    </Typography>
                    <Typography 
                      variant="body1" 
                      sx={{ 
                        fontWeight: 600, 
                        color: providerData.qualifications ? 'text.primary' : 'text.disabled',
                        p: 1.5,
                        bgcolor: alpha(theme.palette.background.default, 0.7),
                        borderRadius: 1,
                        border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                      }}
                    >
                      {providerData.qualifications || 'Not specified'}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5, fontWeight: 500 }}>
                      Date of Registration
                    </Typography>
                    <Typography 
                      variant="body1" 
                      sx={{ 
                        fontWeight: 600, 
                        color: providerData.date_of_registration ? 'text.primary' : 'text.disabled',
                        p: 1.5,
                        bgcolor: alpha(theme.palette.background.default, 0.7),
                        borderRadius: 1,
                        border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                      }}
                    >
                      {providerData.date_of_registration || 'Not specified'}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5, fontWeight: 500 }}>
                      Bio
                    </Typography>
                    <Typography 
                      variant="body1" 
                      sx={{ 
                        fontWeight: 600, 
                        color: providerData.bio ? 'text.primary' : 'text.disabled',
                        p: 1.5,
                        bgcolor: alpha(theme.palette.background.default, 0.7),
                        borderRadius: 1,
                        border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                        minHeight: '100px',
                      }}
                    >
                      {providerData.bio || 'No bio provided'}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            )}
          </Paper>
        );
      case 1:
        return (
          <Paper 
            elevation={0} 
            sx={{ 
              p: { xs: 2, sm: 3 }, 
              mb: 2, 
              borderRadius: 3,
              background: theme.palette.mode === 'dark' 
                ? `linear-gradient(145deg, ${alpha(theme.palette.background.paper, 0.9)} 70%, ${alpha(theme.palette.background.paper, 0.7)} 100%)`
                : `linear-gradient(145deg, ${theme.palette.background.paper} 70%, ${alpha(theme.palette.primary.lighter, 0.3)} 100%)`,
              boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.08)',
              border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
              backdropFilter: 'blur(6px)',
              transition: 'all 0.3s ease-in-out',
            }}
          >
            <Box 
              display="flex" 
              justifyContent="space-between" 
              alignItems="center" 
              sx={{ 
                mb: 3,
                pb: 2,
                borderBottom: `1px solid ${alpha(theme.palette.divider, 0.6)}`
              }}
            >
              <Box display="flex" alignItems="center" gap={1}>
                <MoneyIcon sx={{ color: 'primary.main', fontSize: { xs: 20, sm: 24 } }} />
                <Typography 
                  variant="h6" 
                  sx={{ 
                    fontSize: { xs: '1.1rem', sm: '1.25rem' },
                    fontWeight: 700,
                    color: 'text.primary'
                  }}
                >
                  Per Hour Compensation
                </Typography>
              </Box>
              {!editMode.rate && (
                <IconButton 
                  onClick={() => setEditMode(prev => ({ ...prev, rate: true }))}
                  sx={{
                    backgroundColor: alpha(theme.palette.primary.main, 0.08),
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.15),
                      transform: 'scale(1.05)',
                    },
                    transition: 'all 0.2s ease-in-out',
                  }}
                >
                  <EditIcon sx={{ fontSize: '1.2rem', color: 'primary.main' }} />
                </IconButton>
              )}
            </Box>
            {editMode.rate ? renderRateEdit() : (
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column',
                alignItems: 'center',
                borderRadius: 2,
                p: 4,
                backgroundColor: alpha(theme.palette.primary.lighter, 0.3),
                border: `1px solid ${alpha(theme.palette.primary.main, 0.15)}`,
              }}>
                <Typography 
                  variant="subtitle1" 
                  sx={{ 
                    fontWeight: 500, 
                    color: 'text.secondary',
                    mb: 1
                  }}
                >
                  Your Hourly Rate
                </Typography>
                <Typography 
                  variant="h3" 
                  sx={{ 
                    fontWeight: 700, 
                    color: 'primary.main',
                    textShadow: '0 2px 10px rgba(0,0,0,0.08)',
                  }}
                >
                  {providerData.rate_currency} {formatNumberWithCommas(providerData.rate_per_hour)}
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    mt: 1,
                    color: 'text.secondary',
                    textAlign: 'center',
                  }}
                >
                  This is the rate you'll receive for each hour of your consultation services.
                </Typography>
              </Box>
            )}
          </Paper>
        );
      case 2:
        return (
          <Paper 
            elevation={0} 
            sx={{ 
              p: { xs: 2, sm: 3 }, 
              mb: 2, 
              borderRadius: 3,
              background: theme.palette.mode === 'dark' 
                ? `linear-gradient(145deg, ${alpha(theme.palette.background.paper, 0.9)} 70%, ${alpha(theme.palette.background.paper, 0.7)} 100%)`
                : `linear-gradient(145deg, ${theme.palette.background.paper} 70%, ${alpha(theme.palette.primary.lighter, 0.3)} 100%)`,
              boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.08)',
              border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
              backdropFilter: 'blur(6px)',
              transition: 'all 0.3s ease-in-out',
            }}
          >
            <Box 
              display="flex" 
              justifyContent="space-between" 
              alignItems="center" 
              sx={{ 
                mb: 3,
                pb: 2,
                borderBottom: `1px solid ${alpha(theme.palette.divider, 0.6)}`
              }}
            >
              <Box display="flex" alignItems="center" gap={1}>
                <ScheduleIcon sx={{ color: 'primary.main', fontSize: { xs: 20, sm: 24 } }} />
                <Typography 
                  variant="h6" 
                  sx={{ 
                    fontSize: { xs: '1.1rem', sm: '1.25rem' },
                    fontWeight: 700,
                    color: 'text.primary'
                  }}
                >
                  Availability
                </Typography>
              </Box>
              {!editMode.availability && (
                <IconButton 
                  onClick={() => setEditMode(prev => ({ ...prev, availability: true }))}
                  sx={{
                    backgroundColor: alpha(theme.palette.primary.main, 0.08),
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.15),
                      transform: 'scale(1.05)',
                    },
                    transition: 'all 0.2s ease-in-out',
                  }}
                >
                  <EditIcon sx={{ fontSize: '1.2rem', color: 'primary.main' }} />
                </IconButton>
              )}
            </Box>
            {editMode.availability ? renderAvailabilityEdit() : (
              <Box>
                {availabilities.length > 0 ? (
                  <Grid container spacing={2}>
                    {availabilities.map((availability, index) => (
                      <Grid item xs={12} md={6} key={index}>
                        <Box 
                          sx={{ 
                            p: 2, 
                            borderRadius: 2,
                            backgroundColor: theme.palette.background.default,
                            border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 2,
                            transition: 'all 0.2s ease-in-out',
                            '&:hover': {
                              boxShadow: '0 4px 12px 0 rgba(0,0,0,0.05)',
                              borderColor: alpha(theme.palette.primary.main, 0.3),
                              transform: 'translateY(-2px)',
                            }
                          }}
                        >
                          <Box 
                            sx={{ 
                              borderRadius: '50%',
                              width: 40,
                              height: 40,
                              bgcolor: alpha(theme.palette.primary.main, 0.1),
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            <AccessTimeIcon sx={{ color: 'primary.main', fontSize: 22 }} />
                          </Box>
                          <Box>
                            <Typography variant="subtitle1" fontWeight={600} color="text.primary">
                              {availability.day_of_week}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {availability.start_time} - {availability.end_time}
                            </Typography>
                          </Box>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                ) : (
                  <Box 
                    sx={{ 
                      p: 3, 
                      textAlign: 'center',
                      borderRadius: 2,
                      backgroundColor: alpha(theme.palette.background.default, 0.7),
                      border: `1px dashed ${alpha(theme.palette.divider, 0.8)}`,
                    }}
                  >
                    <Typography color="text.secondary">
                      No availability set. Click the edit button to add your available hours.
                    </Typography>
                  </Box>
                )}
              </Box>
            )}
          </Paper>
        );
      default:
        return null;
    }
  };

  return (
    <Box 
      sx={{ 
        minHeight: '100vh', 
        background: theme.palette.mode === 'dark' 
          ? 'linear-gradient(135deg, #1f2937 0%, #111827 100%)' 
          : 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        display: 'flex',
      }}
    >
      <Sidebar
        onToggleSidebar={(minimized) => setIsSidebarMinimized(minimized)}
        onNavigate={(path) => navigate(path)}
        onLogout={handleLogout}
      />
      <Box
        sx={{ 
          ml: { 
            xs: 0, 
            md: isSidebarMinimized ? '76px' : '256px' 
          }, 
          flex: 1, 
          transition: 'margin-left 0.3s ease-in-out',
          py: { xs: 2, sm: 3, md: 4 },
          px: { xs: 2, sm: 3 },
          overflowX: 'hidden',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <Container 
          maxWidth="md" 
          sx={{ 
            width: '100%',
          }}
        >
          <Paper 
            elevation={0} 
            sx={{
              width: '100%',
              borderRadius: 4,
              p: { xs: 2, sm: 3, md: 4 },
              boxShadow: '0 10px 40px 0 rgba(31, 38, 135, 0.15)',
              background: alpha(theme.palette.background.paper, 0.9),
              backdropFilter: 'blur(10px)',
              minHeight: 600,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-start',
              overflow: 'hidden',
              border: `1px solid ${alpha(theme.palette.primary.main, 0.08)}`,
              transition: 'all 0.3s ease-in-out',
            }}
          >
            <Box 
              sx={{ 
                mb: 3, 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1.5,
                flexDirection: { xs: 'column', sm: 'row' },
                justifyContent: { xs: 'center', sm: 'flex-start' },
              }}
            >
              <Avatar 
                sx={{ 
                  width: { xs: 56, sm: 64 }, 
                  height: { xs: 56, sm: 64 },
                  bgcolor: alpha(theme.palette.primary.main, 0.15),
                  color: 'primary.main',
                  boxShadow: `0 0 0 3px ${alpha(theme.palette.background.paper, 0.9)}, 0 0 0 6px ${alpha(theme.palette.primary.main, 0.2)}`,
                }}
              >
                <SettingsIcon sx={{ fontSize: 30 }} />
              </Avatar>
              
              <Box 
                sx={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  alignItems: { xs: 'center', sm: 'flex-start' },
                }}
              >
                <Typography 
                  variant='h4' 
                  fontWeight={800} 
                  color="primary.main" 
                  sx={{ 
                    fontSize: { xs: '1.75rem', sm: '2rem', md: '2.25rem' },
                    letterSpacing: 0.5,
                    textAlign: { xs: 'center', sm: 'left' },
                    background: 'linear-gradient(90deg, #1976d2 30%, #64b5f6 90%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  Settings
                </Typography>
                <Typography 
                  variant="body1" 
                  color="text.secondary"
                  sx={{
                    textAlign: { xs: 'center', sm: 'left' },
                  }}
                >
                  Manage your profile, rates, and availability
                </Typography>
              </Box>
            </Box>
            
            <Box 
              sx={{ 
                borderRadius: 2,
                mb: 3,
                backgroundColor: alpha(theme.palette.background.default, 0.5),
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                overflow: 'hidden',
              }}
            >
              <Tabs
                value={activeSection}
                onChange={(e, newValue) => setActiveSection(newValue)}
                variant={isSmallScreen ? "fullWidth" : "standard"}
                centered={!isSmallScreen}
                TabIndicatorProps={{ 
                  style: { 
                    height: 4, 
                    borderRadius: 2, 
                    background: 'linear-gradient(90deg, #1976d2 0%, #64b5f6 100%)'
                  } 
                }}
                sx={{
                  backgroundColor: alpha(theme.palette.primary.main, 0.08),
                  padding: { xs: 0.5, sm: 1 },
                  '.MuiTab-root': {
                    fontWeight: 600,
                    fontSize: { xs: '0.85rem', sm: '0.95rem', md: '1rem' },
                    color: 'text.secondary',
                    transition: 'color 0.2s',
                    minHeight: { xs: 48, sm: 56 },
                    py: { xs: 1, sm: 1.5 },
                    '&.Mui-selected': { color: 'primary.main' },
                  },
                  '.MuiTabs-flexContainer': { 
                    gap: { xs: 0.5, sm: 1, md: 2 } 
                  },
                }}
              >
                <Tab 
                  icon={<PersonIcon sx={{ fontSize: { xs: 20, sm: 24 } }} />} 
                  label="Profile" 
                  iconPosition={isSmallScreen ? 'top' : 'start'}
                  sx={{ 
                    borderRadius: 2, 
                    ml: 0.5,
                    '&.Mui-selected': { backgroundColor: alpha(theme.palette.background.paper, 0.7) }
                  }}
                />
                <Tab 
                  icon={<MoneyIcon sx={{ fontSize: { xs: 20, sm: 24 } }} />} 
                  label="Compensation" 
                  iconPosition={isSmallScreen ? 'top' : 'start'}
                  sx={{ 
                    borderRadius: 2, 
                    '&.Mui-selected': { backgroundColor: alpha(theme.palette.background.paper, 0.7) }
                  }}
                />
                <Tab 
                  icon={<ScheduleIcon sx={{ fontSize: { xs: 20, sm: 24 } }} />} 
                  label="Availability" 
                  iconPosition={isSmallScreen ? 'top' : 'start'}
                  sx={{ 
                    borderRadius: 2, 
                    mr: 0.5,
                    '&.Mui-selected': { backgroundColor: alpha(theme.palette.background.paper, 0.7) }
                  }}
                />
              </Tabs>
            </Box>
            
            <Box sx={{ flex: 1, width: '100%', overflowY: 'auto', px: 0.5 }}>
              {renderActiveSection()}
            </Box>
          </Paper>
        </Container>
      </Box>
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleSnackbarClose} 
          severity="success" 
          variant="filled"
          sx={{
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            borderRadius: 2,
            alignItems: 'center',
            '& .MuiAlert-icon': {
              fontSize: 22
            },
            '& .MuiAlert-message': {
              fontSize: '0.95rem',
              fontWeight: 500
            }
          }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SettingPage;

// Helper function for alpha (if not available from theme directly in this context)
const alpha = (color, opacity) => {
  if (color.startsWith('#')) {
    const [r, g, b] = color.match(/\w\w/g).map((hex) => parseInt(hex, 16));
    return `rgba(${r},${g},${b},${opacity})`;
  }
  if (color.includes('.')) { // e.g. "success.main"
    return `rgba(0,0,0, ${opacity})`; // Placeholder, replace with actual color logic if needed
  }
  return color; // Fallback
};