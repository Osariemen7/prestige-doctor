import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  IconButton,
  Snackbar,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';

const AvailabilitySelector = () => {
  const allDaysOfWeek = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];

  const [availabilities, setAvailabilities] = useState([]);
  const [selectedDay, setSelectedDay] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [message, setMessage] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const navigate = useNavigate();

  // Filter out days already selected
  const availableDays = allDaysOfWeek.filter(
    (day) => !availabilities.some((availability) => availability.day_of_week === day)
  );

  const getRefreshToken = async () => {
    try {
      const userInfo = localStorage.getItem('user-info');
      const parsedUserInfo = userInfo ? JSON.parse(userInfo) : null;
      if (parsedUserInfo) return parsedUserInfo.refresh;
      console.log('No user information found in storage.');
      return null;
    } catch (error) {
      console.error('Error fetching token:', error);
      return null;
    }
  };

  const getAccessToken = async () => {
    const refresh = await getRefreshToken();
    const term = { refresh };
    let rep = await fetch('https://health.prestigedelta.com/tokenrefresh/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify(term),
    });
    rep = await rep.json();
    if (rep) return rep.access;
  };

  const handleSubmit = async () => {
    const token = await getAccessToken();
    const formData = { availabilities };

    try {
      const response = await fetch('https://health.prestigedelta.com/availability/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });
      const result = await response.json();
      if (response.status !== 200) {
        setMessage(result.message || 'An error occurred');
        setSnackbarOpen(true);
      } else {
        setMessage('Registration successful!');
        setSnackbarOpen(true);
        
        // Delay navigation by 2 seconds
        setTimeout(() => {
          navigate('/');
        }, 2000);
      }
    } catch (error) {
      console.error(error);
      setMessage('An error occurred during updating');
      setSnackbarOpen(true);
    }
  };

  const handleAddAvailability = () => {
    if (!selectedDay || !startTime || !endTime) return;

    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);

    const newAvailability = {
      day_of_week: selectedDay,
      start_time: { hour: startHour, minute: startMinute },
      end_time: { hour: endHour, minute: endMinute },
    };

    setAvailabilities([...availabilities, newAvailability]);
    // Autofill next selection with previous times
    setSelectedDay('');
    setStartTime(startTime); // Keep previous start time
    setEndTime(endTime);     // Keep previous end time
  };

  const handleRemoveAvailability = (index) => {
    setAvailabilities(availabilities.filter((_, i) => i !== index));
  };

  const formatTime = (time) =>
    `${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #E3F2FD 0%, #90CAF9 100%)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        p: 2,
        overflowY: 'auto',
      }}
    >
      <Paper
        elevation={6}
        sx={{
          width: '100%',
          maxWidth: 600,
          p: 4,
          bgcolor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          borderRadius: 3,
          boxShadow: '0 8px 32px rgba(33, 150, 243, 0.1)',
          my: 4,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
          <IconButton 
            onClick={() => navigate(-1)} 
            sx={{ 
              color: '#1976D2',
              bgcolor: 'rgba(33, 150, 243, 0.1)',
              mr: 2,
              '&:hover': {
                bgcolor: 'rgba(33, 150, 243, 0.2)',
              },
            }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Box>
            <Typography variant="h5" sx={{ color: '#1976D2', fontWeight: 700 }}>
              Set Your Availability
            </Typography>
            <Typography variant="body2" sx={{ color: '#607D8B', mt: 0.5 }}>
              Choose the days and times you're available for consultations
            </Typography>
          </Box>
        </Box>

        <Box sx={{ mb: 4 }}>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel id="day-select-label">Day of Week</InputLabel>
            <Select
              labelId="day-select-label"
              value={selectedDay}
              label="Day of Week"
              onChange={(e) => setSelectedDay(e.target.value)}
              sx={{
                bgcolor: 'rgba(255, 255, 255, 0.8)',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(25, 118, 210, 0.2)',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#2196F3',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#1976D2',
                }
              }}
            >
              <MenuItem value="">
                <em>Select a day</em>
              </MenuItem>
              {availableDays.map((day) => (
                <MenuItem key={day} value={day}>
                  {day}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <TextField
              label="Start Time"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{
                flex: 1,
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'rgba(255, 255, 255, 0.8)',
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#2196F3',
                  },
                }
              }}
            />
            <TextField
              label="End Time"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{
                flex: 1,
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'rgba(255, 255, 255, 0.8)',
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#2196F3',
                  },
                }
              }}
            />
          </Box>

          <Button
            variant="outlined"
            onClick={handleAddAvailability}
            disabled={!selectedDay || !startTime || !endTime}
            fullWidth
            sx={{
              color: '#1976D2',
              borderColor: '#1976D2',
              py: 1.2,
              '&:hover': {
                borderColor: '#1565C0',
                bgcolor: 'rgba(25, 118, 210, 0.04)',
              },
              '&.Mui-disabled': {
                borderColor: '#90CAF9',
                color: '#90CAF9',
              }
            }}
          >
            Add Available Time Slot
          </Button>
        </Box>

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ color: '#1976D2', mb: 2, fontWeight: 600 }}>
            Selected Time Slots
          </Typography>
          {availabilities.length === 0 ? (
            <Paper 
              variant="outlined" 
              sx={{ 
                p: 3, 
                textAlign: 'center',
                borderColor: 'rgba(25, 118, 210, 0.2)',
                bgcolor: 'rgba(25, 118, 210, 0.02)'
              }}
            >
              <Typography variant="body2" sx={{ color: '#607D8B' }}>
                No time slots added yet.
              </Typography>
            </Paper>
          ) : (
            <List sx={{ bgcolor: 'rgba(255, 255, 255, 0.5)' }}>
              {availabilities.map((availability, index) => (
                <ListItem
                  key={index}
                  sx={{
                    mb: 1,
                    borderRadius: 1,
                    border: '1px solid rgba(25, 118, 210, 0.2)',
                    bgcolor: 'rgba(255, 255, 255, 0.8)',
                    '&:hover': {
                      bgcolor: 'rgba(25, 118, 210, 0.02)',
                    }
                  }}
                >
                  <ListItemText
                    primary={availability.day_of_week}
                    secondary={`${formatTime(availability.start_time)} - ${formatTime(
                      availability.end_time
                    )}`}
                    primaryTypographyProps={{ fontWeight: 600, color: '#1976D2' }}
                    secondaryTypographyProps={{ color: '#607D8B' }}
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      onClick={() => handleRemoveAvailability(index)}
                      sx={{ 
                        color: '#f44336',
                        '&:hover': {
                          bgcolor: 'rgba(244, 67, 54, 0.04)',
                        }
                      }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}
        </Box>

        <Button
          variant="contained"
          onClick={handleSubmit}
          fullWidth
          sx={{
            bgcolor: '#1976D2',
            color: 'white',
            py: 1.5,
            fontSize: '1.1rem',
            fontWeight: 600,
            textTransform: 'none',
            boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)',
            '&:hover': {
              bgcolor: '#1565C0',
              boxShadow: '0 6px 16px rgba(25, 118, 210, 0.4)',
            },
          }}
        >
          Save Availability
        </Button>

        <Snackbar
          open={snackbarOpen}
          autoHideDuration={3000}
          onClose={() => setSnackbarOpen(false)}
          sx={{
            '& .MuiSnackbarContent-root': {
              bgcolor: message?.includes('error') ? '#f44336' : '#43a047',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            }
          }}
          message={message}
        />
      </Paper>
    </Box>
  );
};

export default AvailabilitySelector;
