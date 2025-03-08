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
    // Reset selection and times after adding
    setSelectedDay('');
    setStartTime('');
    setEndTime('');
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
        background: 'linear-gradient(45deg, rgb(152, 202, 243) 30%, #BBDEFB 90%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
        overflowY: 'auto',
        
      }}
    >
      <Paper
        elevation={3}
        sx={{
          width: '100%',
          maxWidth: 600,
          p: 4,
          borderRadius: 2,
          bgcolor: 'rgba(255, 255, 255, 0.95)',
          marginTop: '17%'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <IconButton onClick={() => navigate(-1)} sx={{ color: '#2196F3' }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h5" sx={{ ml: 1, color: '#2196F3' }}>
            Set Your Available Days
          </Typography>
        </Box>

        <Box
          component="form"
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            justifyContent: 'center',
          }}
        >
          <FormControl fullWidth>
            <InputLabel id="day-select-label">Day of Week</InputLabel>
            <Select
              labelId="day-select-label"
              value={selectedDay}
              label="Day of Week"
              onChange={(e) => setSelectedDay(e.target.value)}
              sx={{ backgroundColor: 'rgba(255,255,255,0.8)' }}
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

          <TextField
            label="Start Time"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            InputLabelProps={{ shrink: true }}
            inputProps={{ step: 300 }}
            sx={{ backgroundColor: 'rgba(255,255,255,0.8)' }}
          />

          <TextField
            label="End Time"
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            InputLabelProps={{ shrink: true }}
            inputProps={{ step: 300 }}
            sx={{ backgroundColor: 'rgba(255,255,255,0.8)' }}
          />

          <Button
            variant="contained"
            onClick={handleAddAvailability}
            disabled={!selectedDay || !startTime || !endTime}
            sx={{
              bgcolor: '#2196F3',
              '&:hover': { bgcolor: '#1976D2' },
              py: 1.5,
            }}
          >
            Add Available Day
          </Button>
        </Box>

        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" sx={{ mb: 2, color: '#2196F3' }}>
            Selected Available Days
          </Typography>
          {availabilities.length === 0 ? (
            <Typography variant="body2">No days added yet.</Typography>
          ) : (
            <List>
              {availabilities.map((availability, index) => (
                <ListItem
                  key={index}
                  sx={{
                    border: '1px solid #ccc',
                    borderRadius: 1,
                    mb: 1,
                  }}
                >
                  <ListItemText
                    primary={availability.day_of_week}
                    secondary={`${formatTime(availability.start_time)} - ${formatTime(
                      availability.end_time
                    )}`}
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      onClick={() => handleRemoveAvailability(index)}
                      sx={{ color: 'red' }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}
        </Box>
        {message && (
          <Typography variant="body2" sx={{ mt: 2, color: 'red', textAlign: 'center' }}>
            {message}
          </Typography>
        )}
        <Button
          variant="contained"
          onClick={handleSubmit}
          fullWidth
          sx={{
            bgcolor: '#2196F3',
            '&:hover': { bgcolor: '#1976D2' },
            mt: 3,
            py: 1.5,
          }}
        >
          Submit
        </Button>
      </Paper>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        message={message || 'Submission Successful'}
      />
    </Box>
  );
};

export default AvailabilitySelector;
