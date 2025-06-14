import React, { useState } from 'react';
import { Box, Button, TextField, Paper, Typography, IconButton, Snackbar } from '@mui/material';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './RegistrationPage.css';

const RegistrationPage = () => {
  const [formData, setFormData] = useState({
    phone_number: '',
    email: '',
    password: '',
    last_name: '',
    first_name: '',
    middle_name: '',
  });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSnackbarOpen(true);
    setLoading(true);
    try {
      const formattedPhoneNumber = formData.phone_number.replace(/^0/, '+234');
      const item = {
        ...formData,
        phone_number: formattedPhoneNumber,
      };
      const response = await fetch('https://service.prestigedelta.com/register/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify(item),
      });

      const result = await response.json();
      if (response.status !== 201) {
        setMessage(result.phone_number || result.email || result.password || 'An error occurred');
      } else {
        setMessage('Registration successful');
        localStorage.setItem('user-info', JSON.stringify(result));
        navigate('/provider');
      }
    } catch (error) {
      console.log(error);
      setMessage('An error occurred during registration');
    } finally {
      setLoading(false);
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
          maxWidth: 400,
          p: 4,
          bgcolor: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(10px)',
          borderRadius: 2,
        }}
      >
        <IconButton
          onClick={() => window.history.back()}
          sx={{
            position: 'absolute',
            top: 24,
            left: 16,
            color: '#2196F3',
          }}
        >
          <ArrowLeft size={20} />
        </IconButton>

        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Typography variant="h5" component="h1" sx={{ color: '#2196F3', fontWeight: 'bold' }}>
            Register
          </Typography>
          <Typography variant="body2" sx={{ color: '#555', mt: 1 }}>
            Create your account
          </Typography>
        </Box>

        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            name="first_name"
            label="First Name"
            variant="outlined"
            value={formData.first_name}
            onChange={handleInputChange}
            required
            InputProps={{
              sx: { backgroundColor: 'rgba(255,255,255,0.5)' },
            }}
          />
          <TextField
            name="middle_name"
            label="Middle Name"
            variant="outlined"
            value={formData.middle_name}
            onChange={handleInputChange}
            InputProps={{
              sx: { backgroundColor: 'rgba(255,255,255,0.5)' },
            }}
          />
          <TextField
            name="last_name"
            label="Last Name"
            variant="outlined"
            value={formData.last_name}
            onChange={handleInputChange}
            required
            InputProps={{
              sx: { backgroundColor: 'rgba(255,255,255,0.5)' },
            }}
          />
          <TextField
            name="email"
            label="Email"
            type="email"
            variant="outlined"
            value={formData.email}
            onChange={handleInputChange}
            required
            InputProps={{
              sx: { backgroundColor: 'rgba(255,255,255,0.5)' },
            }}
          />
          <TextField
            name="phone_number"
            label="Phone Number"
            type="tel"
            variant="outlined"
            value={formData.phone_number}
            onChange={handleInputChange}
            required
            InputProps={{
              sx: { backgroundColor: 'rgba(255,255,255,0.5)' },
            }}
          />
          <TextField
            name="password"
            label="Password"
            type={showPassword ? 'text' : 'password'}
            variant="outlined"
            value={formData.password}
            onChange={handleInputChange}
            required
            InputProps={{
              sx: { backgroundColor: 'rgba(255,255,255,0.5)' },
              endAdornment: (
                <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </IconButton>
              ),
            }}
          />
          <Button
            type="submit"
            variant="contained"
            sx={{
              bgcolor: '#2196F3',
              '&:hover': { bgcolor: '#1976D2' },
              mt: 2,
            }}
            disabled={loading}
          >
            {loading ? 'Registering...' : 'Register'}
          </Button>
        </Box>

        <Typography variant="body2" sx={{ textAlign: 'center', mt: 2, color: '#555' }}>
          Already have an account?{' '}
          <a href="/login" style={{ color: '#2196F3', textDecoration: 'none' }}>
            Sign in
          </a>
        </Typography>
      </Paper>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        message={message || "Registration Successful - Welcome! Your account has been created."}
      />
    </Box>
  );
};

export default RegistrationPage;
