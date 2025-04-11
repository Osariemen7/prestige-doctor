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
  Select,
  MenuItem,
} from '@mui/material';
import { ArrowLeft } from 'lucide-react';

const ProviderPage = () => {
  const [clinicName, setClinicName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [qualifications, setQualifications] = useState(null);
  const [provider, setProvider] = useState('');
  const [referral_code, setReferal] = useState('');
  const [dateOfRegistration, setDateOfRegistration] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [bio, setBio] = useState('');
  const [message, setMessage] = useState('');
  const [amount, setAmount] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState('NGN');
  const navigate = useNavigate();

  const qualificationOptions = [
    { label: 'MBBS', value: 'MBBS' },
    { label: 'MD', value: 'MD' },
    { label: 'MBChB', value: 'MBChB' },
    { label: 'BDS', value: 'BDS' },
    { label: 'BPharm', value: 'BPharm' },
    { label: 'HND', value: 'HND' },
    { label: 'OND', value: 'OND' },
    { label: 'BSc', value: 'BSc' },
    { label: 'RN', value: 'RN' },
    { label: 'RPH', value: 'RPH' },
    { label: 'pharmD', value: 'pharmD' },

  ];

 const providerType = [
    {value:'doctor', label:'Doctor'},
    {value:'dentist', label:'Dentist'},
    {value:'pharmacist', label: 'Pharmacist'},
    {value:'lab_scientist', label:'Lab Scientist'},
    {value:'radiographer', label:'Radiographer'},
    {value:'nurse', label:'Nurse'},
]

const currencies = {
  NGN: '₦',
  USD: '$',
  GBP: '£'
};

const getRefreshToken = async () => {
  try {
    const userInfo = localStorage.getItem('user-info'); // Use localStorage for web storage
    const parsedUserInfo = userInfo ? JSON.parse(userInfo) : null;
    if (parsedUserInfo) {
      console.log('Access Token:', parsedUserInfo.access);
      return parsedUserInfo.refresh; // Return the access token
      
    } else {
      console.log('No user information found in storage.');
      return null;
    }
  } catch (error) {
    console.error('Error fetching token:', error);
    return null;
  }
  
};

   const getAccessToken = async () => {
    let refresh = await getRefreshToken()
    let term = {refresh}
    let rep = await fetch ('https://health.prestigedelta.com/tokenrefresh/',{
        method: 'POST',
        headers:{
          'Content-Type': 'application/json',
          'accept' : 'application/json'
     },
     body:JSON.stringify(term)
    });
    rep = await rep.json();
    if (rep.status === 400) {
      
    }
    if (rep) {
      console.log('Access Token:', rep.access);
      
      return rep.access // Return the access token
      
      
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
    
    const formData = {
      clinic_name: clinicName,
      specialty: specialty,
      qualifications: qualifications?.value,
      date_of_registration: dateOfRegistration,
      provider_type: provider?.value,
      bio: bio,
      rate_per_hour: amount,
      rate_currency: selectedCurrency,
      referral_code: referral_code,
    };
    const accessToken = await getAccessToken();
    try {
      const response = await fetch('https://health.prestigedelta.com/provider/', {
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
        background: 'linear-gradient(135deg, #E3F2FD 0%, #90CAF9 100%)',
        p: 4,
        overflowY: 'auto',
      }}
    >
      <Paper
        elevation={6}
        sx={{
          width: '100%',
          maxWidth: 500,
          p: 2,
          bgcolor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          borderRadius: 3,
          boxShadow: '0 8px 32px rgba(33, 150, 243, 0.1)',
          position: 'relative',
          marginTop: '29%',
          marginBottom: '5%'
        }}
      >
        <IconButton
          onClick={() => navigate('/register')}
          sx={{
            position: 'absolute',
            top: 20,
            left: 20,
            color: '#1976D2',
            bgcolor: 'rgba(33, 150, 243, 0.1)',
            '&:hover': {
              bgcolor: 'rgba(33, 150, 243, 0.2)',
            },
          }}
        >
          <ArrowLeft size={20} />
        </IconButton>

        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography variant="h4" component="h1" 
            sx={{ 
              color: '#1976D2', 
              fontWeight: 700,
              textShadow: '0 2px 4px rgba(0,0,0,0.1)',
              mb: 1
            }}>
            Create Profile
          </Typography>
          <Typography variant="body1" sx={{ color: '#607D8B' }}>
            Set up your professional healthcare profile
          </Typography>
        </Box>

        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {[
            { name: 'clinicName', label: 'Clinic Name', value: clinicName, onChange: (e) => setClinicName(e.target.value) },
            { name: 'specialty', label: 'Specialty (e.g. Cardiologist)', value: specialty, onChange: (e) => setSpecialty(e.target.value), required: true },
            { name: 'bio', label: 'Bio', value: bio, onChange: (e) => setBio(e.target.value), multiline: true, rows: 4 },
          ].map((field) => (
            <TextField
              key={field.name}
              {...field}
              variant="outlined"
              fullWidth
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'rgba(255,255,255,0.8)',
                  '&:hover': {
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#2196F3',
                    }
                  },
                  '&.Mui-focused': {
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#1976D2',
                      borderWidth: 2
                    }
                  }
                }
              }}
            />
          ))}

          {[
            { options: providerType, value: provider, onChange: (_, newValue) => setProvider(newValue), label: 'Select Profession' },
            { options: qualificationOptions, value: qualifications, onChange: (_, newValue) => setQualifications(newValue), label: 'Select Qualification' }
          ].map((field, index) => (
            <Autocomplete
              key={index}
              {...field}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={field.label}
                  variant="outlined"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: 'rgba(255,255,255,0.8)',
                    }
                  }}
                />
              )}
            />
          ))}

          <TextField
            label="Date of Professional Registration"
            type="date"
            value={dateOfRegistration}
            onChange={handleDateChange}
            InputLabelProps={{ shrink: true }}
            variant="outlined"
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'rgba(255,255,255,0.8)',
              }
            }}
          />

          <FormControl fullWidth>
            <TextField
              label="Amount to be paid per hour"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Select
                      value={selectedCurrency}
                      onChange={(e) => setSelectedCurrency(e.target.value)}
                      variant="standard"
                      sx={{ 
                        minWidth: '60px',
                        '&:before, &:after': { display: 'none' },
                        '& .MuiSelect-select': { 
                          py: 0,
                          border: 'none',
                          backgroundColor: 'transparent' 
                        }
                      }}
                    >
                      <MenuItem value="NGN">₦</MenuItem>
                      <MenuItem value="USD">$</MenuItem>
                      <MenuItem value="GBP">£</MenuItem>
                    </Select>
                  </InputAdornment>
                )
              }}
              variant="outlined"
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'rgba(255,255,255,0.8)',
                  '&:hover': {
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#2196F3',
                    }
                  }
                }
              }}
            />
          </FormControl>

          <FormControl fullWidth>
            <TextField
              label="Referral Code"
              type="text"
              value={referral_code}
              onChange={(e) => setReferal(e.target.value)}
              required
              variant="outlined"
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'rgba(255,255,255,0.8)',
                  '&:hover': {
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#2196F3',
                    }
                  }
                }
              }}
            />
          </FormControl>

          {message && (
            <Typography variant="body2" sx={{ color: '#f44336', textAlign: 'center', mt: 1 }}>
              {message}
            </Typography>
          )}

          <Button
            type="submit"
            variant="contained"
            sx={{
              bgcolor: '#1976D2',
              color: 'white',
              py: 1.5,
              mt: 2,
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
            Create Profile
          </Button>
        </Box>
      </Paper>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        message={message || 'Profile updated successfully'}
        sx={{
          '& .MuiSnackbarContent-root': {
            bgcolor: message?.includes('error') ? '#f44336' : '#43a047',
          }
        }}
      />
    </Box>
  );
};

export default ProviderPage;
