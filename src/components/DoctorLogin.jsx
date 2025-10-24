import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Paper,
  Typography,
  Snackbar,
  Alert,
  Container,
  Divider,
  Chip,
  Link,
  Fade,
  Grow
} from '@mui/material';
import { 
  Login as LoginIcon,
  MedicalServices as MedicalServicesIcon 
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import GoogleAuthButton from './GoogleAuthButton';
import GooglePhonePrompt from './GooglePhonePrompt';

const DoctorLogin = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'error' });
  const [showPhonePrompt, setShowPhonePrompt] = useState(false);
  const [pendingGoogleData, setPendingGoogleData] = useState(null);
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSnackbar({ ...snackbar, open: false });

    if (!formData.email || !formData.password) {
      setSnackbar({ open: true, message: 'Please fill in all fields.', severity: 'warning' });
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('https://service.prestigedelta.com/login/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          accept: 'application/json',
          'X-Organization-Domain': 'provider.prestigehealth.app'
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.non_field_errors && result.non_field_errors.length > 0) {
          setSnackbar({ open: true, message: result.non_field_errors[0], severity: 'error' });
        } else {
          setSnackbar({ open: true, message: result.detail || 'Invalid credentials.', severity: 'error' });
        }
      } else {
        setSnackbar({ open: true, message: 'Login successful! Redirecting...', severity: 'success' });
        localStorage.setItem('user-info', JSON.stringify(result));
        setTimeout(() => {
          navigate('/reviews');
        }, 1200);
      }
    } catch {
      setSnackbar({ open: true, message: 'A network error occurred.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };
  const handleGoogleSuccess = async (googleUserData) => {
    try {
      setLoading(true);
      
      const token = googleUserData.access_token || googleUserData.token || googleUserData.credential;
      
      if (!token) {
        setSnackbar({ open: true, message: 'No access token received from Google.', severity: 'error' });
        setLoading(false);
        return;
      }
      
      // Try to login first without phone number
      const response = await fetch('https://service.prestigedelta.com/auth/google/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          accept: 'application/json',
          'X-Organization-Domain': 'provider.prestigehealth.app'
        },
        body: JSON.stringify({ access_token: token, backend: 'google-oauth2', grant_type: 'convert_token', is_provider: true }),
      });

      const result = await response.json();

      if (response.ok) {
        // Check if user has phone number
        if (!result.user || !result.user.phone_number || result.user.phone_number.trim() === '') {
          // User exists but needs phone number
          setPendingGoogleData(googleUserData);
          setShowPhonePrompt(true);
        } else {
          // User has phone number, login successful
          setSnackbar({ open: true, message: 'Google login successful! Redirecting...', severity: 'success' });
          localStorage.setItem('user-info', JSON.stringify(result));
          setTimeout(() => {
            navigate('/reviews');
          }, 1200);
        }
      } else if (result.non_field_errors) {
        setSnackbar({ open: true, message: result.non_field_errors[0], severity: 'error' });
      } else {
        setSnackbar({ open: true, message: result.message || 'Google login failed.', severity: 'error' });
      }
    } catch {
      setSnackbar({ open: true, message: 'Network error occurred. Please try again.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneSubmit = async (phoneNumber) => {
    try {
      setLoading(true);
      const token = pendingGoogleData.access_token || pendingGoogleData.token || pendingGoogleData.credential;
      
      const response = await fetch('https://service.prestigedelta.com/auth/google/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          accept: 'application/json',
          'X-Organization-Domain': 'provider.prestigehealth.app'
        },
        body: JSON.stringify({ 
          access_token: token, 
          backend: 'google-oauth2', 
          grant_type: 'convert_token', 
          is_provider: true,
          phone_number: phoneNumber
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setSnackbar({ open: true, message: 'Login successful! Redirecting...', severity: 'success' });
        localStorage.setItem('user-info', JSON.stringify(result));
        setShowPhonePrompt(false);
        setTimeout(() => {
          navigate('/dashboard');
        }, 1200);
      } else {
        setSnackbar({ open: true, message: result.message || 'Login failed.', severity: 'error' });
      }
    } catch {
      setSnackbar({ open: true, message: 'Network error occurred. Please try again.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = (error) => {
    if (error && error.response && error.response.data && error.response.data.non_field_errors) {
      setSnackbar({ open: true, message: error.response.data.non_field_errors[0], severity: 'error' });
    } else if (typeof error === 'string') {
      setSnackbar({ open: true, message: error, severity: 'error' });
    } else {
      setSnackbar({ open: true, message: error.message || 'Google login failed. Please try again.', severity: 'error' });
    }
  };

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #2563EB 0%, #1e40af 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      p: 2
    }}>
      <Container maxWidth="xs">
        <Fade in={true} timeout={1000}>
          <Paper elevation={12} sx={{ 
            p: 4, 
            borderRadius: 3, 
            background: 'rgba(255,255,255,0.98)',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 16px 48px rgba(0,0,0,0.15)',
            textAlign: 'center'
          }}>
            <Box sx={{ mb: 3 }}>
              <MedicalServicesIcon sx={{ 
                fontSize: 48, 
                color: '#2563EB', 
                mb: 2,
                filter: 'drop-shadow(0 4px 8px rgba(37,99,235,0.3))'
              }} />
              <Typography variant="h4" fontWeight={700} sx={{ 
                mb: 1,
                background: 'linear-gradient(45deg, #2563EB, #1e40af)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                Doctor Login
              </Typography>
              <Typography variant="body1" sx={{ color: '#666', mb: 2 }}>
                Welcome back! Sign in to continue your consultations
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
              <GoogleAuthButton
                onAuthSuccess={handleGoogleSuccess}
                onAuthError={handleGoogleError}
                disabled={loading}
                text="Sign in with Google"
                sx={{
                  width: '100%',
                  minWidth: 320,
                  maxWidth: 400,
                  borderRadius: 2,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                  mb: 2,
                  background: '#fff',
                  border: '1px solid #e0e0e0',
                  transition: 'all 0.3s ease',
                  '&:hover': { 
                    boxShadow: '0 8px 24px rgba(0,0,0,0.15)', 
                    background: '#f8f9fa',
                    transform: 'translateY(-2px)'
                  }
                }}
              />
            </Box>

            <Divider sx={{ my: 3 }}>
              <Chip 
                label="or continue with email" 
                sx={{ 
                  bgcolor: '#f8f9fa',
                  color: '#666',
                  fontWeight: 500
                }}
              />
            </Divider>

            <Box component="form" onSubmit={handleSubmit} sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: 2.5 
            }}>
              <TextField
                name="email"
                label="Email Address"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                fullWidth
                size="small"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      boxShadow: '0 2px 8px rgba(37,99,235,0.1)'
                    }
                  }
                }}
              />
              <TextField
                name="password"
                label="Password"
                type="password"
                value={formData.password}
                onChange={handleInputChange}
                required
                fullWidth
                size="small"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      boxShadow: '0 2px 8px rgba(37,99,235,0.1)'
                    }
                  }
                }}
              />
              <Button 
                type="submit" 
                variant="contained" 
                disabled={loading} 
                fullWidth 
                size="large"
                sx={{
                  mt: 2,
                  py: 1.5,
                  borderRadius: 2,
                  background: 'linear-gradient(45deg, #2563EB, #1e40af)',
                  boxShadow: '0 4px 16px rgba(37,99,235,0.3)',
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    background: 'linear-gradient(45deg, #1d4ed8, #1e3a8a)',
                    boxShadow: '0 8px 24px rgba(37,99,235,0.4)',
                    transform: 'translateY(-2px)'
                  },
                  '&:disabled': {
                    background: '#ccc'
                  }
                }}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </Box>

            <Typography variant="body2" align="center" sx={{ color: '#666', mt: 3 }}>
              <Link
                onClick={() => navigate('/forgot-password')}
                sx={{ 
                  color: '#2563EB', 
                  cursor: 'pointer', 
                  fontWeight: 600, 
                  mr: 1,
                  textDecoration: 'none',
                  transition: 'color 0.3s ease',
                  '&:hover': {
                    color: '#1e40af'
                  }
                }}
              >
                Forgot Password?
              </Link>
            </Typography>
            <Typography variant="body2" align="center" sx={{ color: '#666', mt: 2 }}>
              Don't have an account?{' '}
              <Link
                onClick={() => navigate('/register')} 
                sx={{ 
                  color: '#2563EB', 
                  cursor: 'pointer',
                  fontWeight: 600,
                  textDecoration: 'none',
                  transition: 'color 0.3s ease',
                  '&:hover': {
                    color: '#1e40af'
                  }
                }}
              >
                Request Invitation
              </Link>
            </Typography>
          </Paper>
        </Fade>

        <GooglePhonePrompt
          open={showPhonePrompt}
          onClose={() => {
            setShowPhonePrompt(false);
            setPendingGoogleData(null);
          }}
          onSubmit={handlePhoneSubmit}
          googleUserData={pendingGoogleData}
          loading={loading}
        />

        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            severity={snackbar.severity}
            variant="filled"
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Container>
    </Box>
  );
};

export default DoctorLogin;
