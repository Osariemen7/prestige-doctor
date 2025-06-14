import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Paper,
  Typography,
  IconButton,
  TextField,
  FormControl,
  InputAdornment,
  Autocomplete,
  Snackbar,
} from '@mui/material';
import { ArrowLeft } from 'lucide-react';

const ProviderPage = () => {
  const [clinicName, setClinicName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [qualifications, setQualifications] = useState(null);
  const [dateOfRegistration, setDateOfRegistration] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [bio, setBio] = useState('');
  const [message, setMessage] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [amount, setAmount] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const navigate = useNavigate();

  const qualificationOptions = [
    { label: 'MBBS', value: 'MBBS' },
    { label: 'MD', value: 'MD' },
    { label: 'MBChB', value: 'MBChB' },
  ];

  const getAccessToken = async () => {
    try {
      const userInfo = localStorage.getItem('user-info');
      const parsedUserInfo = userInfo ? JSON.parse(userInfo) : null;
      if (parsedUserInfo) {
        setAccessToken(parsedUserInfo.access);
        console.log('Access Token:', parsedUserInfo.access);
      } else {
        console.log('No user information found in storage.');
      }
    } catch (error) {
      console.error('Error fetching token:', error);
    }
  };

  useEffect(() => {
    getAccessToken();
  }, []);

  const handleDateChange = (event) => {
    setDateOfRegistration(event.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const providerType = 'doctor';
    const formData = {
      clinic_name: clinicName,
      specialty: specialty,
      qualifications: qualifications?.value,
      date_of_registration: dateOfRegistration,
      provider_type: providerType,
      bio: bio,
      rate_per_minute: amount,
      rate_currency: 'NGN',
    };

    try {
      const response = await fetch('https://service.prestigedelta.com/provider/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          accept: 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(formData),
      });
      const result = await response.json();
      if (response.status !== 200) {
        setMessage(result.message || 'An error occurred');
        setSnackbarOpen(true);
      } else {
        navigate('/available');
      }
    } catch (error) {
      console.error(error);
      setMessage('An error occurred during updating');
      setSnackbarOpen(true);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(45deg, rgb(152, 202, 243) 30%, #BBDEFB 90%)',
        p: 2,
        overflowY: 'auto',
      }}
    >
      <Paper
        elevation={3}
        sx={{
          position: 'relative',
          width: '100%',
          maxWidth: 500,
          p: 4,
          bgcolor: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(10px)',
          borderRadius: 2,
        }}
      >
        <IconButton
          onClick={() => navigate('/register')}
          sx={{
            position: 'absolute',
            top: 26,
            left: 16,
            color: '#2196F3',
          }}
        >
          <ArrowLeft size={20} />
        </IconButton>

        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Typography variant="h5" component="h1" sx={{ color: '#2196F3', fontWeight: 'bold' }}>
            Create Profile
          </Typography>
        </Box>

        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            name="clinicName"
            label="Clinic Name"
            variant="outlined"
            value={clinicName}
            onChange={(e) => setClinicName(e.target.value)}
            InputProps={{ sx: { backgroundColor: 'rgba(255,255,255,0.5)' } }}
          />
          <TextField
            name="specialty"
            label="Specialty (e.g. Cardiologist)"
            variant="outlined"
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
            required
            InputProps={{ sx: { backgroundColor: 'rgba(255,255,255,0.5)' } }}
          />
          <Autocomplete
            options={qualificationOptions}
            value={qualifications}
            onChange={(event, newValue) => setQualifications(newValue)}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Select Qualification"
                variant="outlined"
                InputProps={{
                  ...params.InputProps,
                  sx: { backgroundColor: 'rgba(255,255,255,0.5)' },
                }}
              />
            )}
          />
          <TextField
            label="Date of Registration"
            type="date"
            value={dateOfRegistration}
            onChange={handleDateChange}
            InputLabelProps={{ shrink: true }}
            variant="outlined"
            InputProps={{ sx: { backgroundColor: 'rgba(255,255,255,0.5)' } }}
          />
          <TextField
            label="Bio"
            multiline
            rows={4}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            variant="outlined"
            InputProps={{ sx: { backgroundColor: 'rgba(255,255,255,0.5)' } }}
          />
          <FormControl fullWidth>
            <TextField
              label="Amount to be paid per minute"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              InputProps={{
                startAdornment: <InputAdornment position="start">₦</InputAdornment>,
                sx: { backgroundColor: 'rgba(255,255,255,0.5)' },
              }}
              variant="outlined"
            />
          </FormControl>
          {message && (
            <Typography variant="body2" sx={{ color: 'red', textAlign: 'center' }}>
              {message}
            </Typography>
          )}
          <Button
            type="submit"
            variant="contained"
            sx={{
              bgcolor: '#2196F3',
              '&:hover': { bgcolor: '#1976D2' },
              mt: 2,
            }}
          >
            Submit
          </Button>
        </Box>
      </Paper>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        message={message || 'Profile updated successfully'}
      />
    </Box>
  );
};

export default ProviderPage;
