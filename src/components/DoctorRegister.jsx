import React, { useState, useEffect } from 'react';
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
  Card,
  CardContent,
  Avatar,
  CircularProgress,
  Fade,
  Grow
} from '@mui/material';
import { 
  PersonAdd as PersonAddIcon, 
  MedicalServices as MedicalServicesIcon,
  Stars as StarsIcon,
  Lock as LockIcon,
  Email as EmailIcon
} from '@mui/icons-material';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import GoogleAuthButton from './GoogleAuthButton';
import GooglePhonePrompt from './GooglePhonePrompt';

const DoctorRegister = () => {
  const [formData, setFormData] = useState({
    phone_number: '',
    email: '',
    password: '',
    last_name: '',
    first_name: '',
    middle_name: '',
  });
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'error' });
  const [showPhonePrompt, setShowPhonePrompt] = useState(false);
  const [pendingGoogleData, setPendingGoogleData] = useState(null);
  const [referrerDetails, setReferrerDetails] = useState(null);
  const [loadingReferrer, setLoadingReferrer] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { referral_code } = useParams();

  useEffect(() => {
    if (location.state?.googleData) {
      setFormData(prev => ({
        ...prev,
        ...location.state.prefilledData
      }));
    }
  }, [location.state]);

  // Fetch referrer details if referral_code is present
  useEffect(() => {
    const fetchReferrerDetails = async () => {
      if (referral_code) {
        setLoadingReferrer(true);
        try {
          const response = await fetch(`https://service.prestigedelta.com/waitlist/by-referral-code/?referral_code=${referral_code}`);
          if (response.ok) {
            const data = await response.json();
            setReferrerDetails(data);
          }
        } catch (error) {
          console.error('Error fetching referrer details:', error);
        } finally {
          setLoadingReferrer(false);
        }
      }
    };

    fetchReferrerDetails();
  }, [referral_code]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSnackbar({ ...snackbar, open: false });
    if (!formData.email || !formData.password || !formData.first_name || !formData.last_name || !formData.phone_number) {
      setSnackbar({ open: true, message: 'Please fill in all required fields.', severity: 'warning' });
      setLoading(false);
      return;
    }
    const item = {
      ...formData,
      confirm_password: formData.password,
      is_provider: true, // Ensure provider flag is set
      ...(referral_code ? { invite_code: referral_code } : {})
    };
    try {
      const response = await fetch('https://service.prestigedelta.com/register/', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          accept: 'application/json',
          'X-Organization-Domain': 'provider.prestigehealth.app'
        },
        body: JSON.stringify(item),
      });
      const result = await response.json();
      if (!response.ok) {
        if (result.non_field_errors && result.non_field_errors.length > 0) {
          setSnackbar({ open: true, message: result.non_field_errors[0], severity: 'error' });
        } else {
          setSnackbar({ open: true, message: Object.values(result).flat().join(' ') || 'An error occurred during registration.', severity: 'error' });
        }
      } else {
        setSnackbar({ open: true, message: 'Registration successful! Redirecting...', severity: 'success' });
        localStorage.setItem('user-info', JSON.stringify(result));
        setTimeout(() => { navigate('/reviews'); }, 1200);
      }
    } catch {
      setSnackbar({ open: true, message: 'A network error occurred.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (googleUserData) => {
    // Store Google data and show phone number prompt
    setPendingGoogleData(googleUserData);
    setShowPhonePrompt(true);
  };

  const handlePhoneSubmit = async (phoneNumber) => {
    try {
      setLoading(true);
      const token = pendingGoogleData.access_token || pendingGoogleData.token || pendingGoogleData.credential;
      if (!token) {
        setSnackbar({ open: true, message: 'No access token received from Google.', severity: 'error' });
        setLoading(false);
        return;
      }
      const googleSignupPayload = {
        access_token: token,
        backend: 'google-oauth2',
        grant_type: 'convert_token',
        is_provider: true,
        phone_number: phoneNumber,
        ...(referral_code ? { invite_code: referral_code } : {})
      };
      const response = await fetch('https://service.prestigedelta.com/auth/google/', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          accept: 'application/json',
          'X-Organization-Domain': 'provider.prestigehealth.app'
        },
        body: JSON.stringify(googleSignupPayload),
      });
      const result = await response.json();
      if (response.ok) {
        setSnackbar({ open: true, message: 'Google signup successful! Redirecting...', severity: 'success' });
        localStorage.setItem('user-info', JSON.stringify(result));
        setShowPhonePrompt(false);
        setTimeout(() => { navigate('/reviews'); }, 1200);
      } else if (result.non_field_errors) {
        setSnackbar({ open: true, message: result.non_field_errors[0], severity: 'error' });
      } else {
        setSnackbar({ open: true, message: result.message || 'Google signup failed.', severity: 'error' });
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
      setSnackbar({ open: true, message: error.message || 'Google signup failed. Please try again.', severity: 'error' });
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
      <Container maxWidth="sm">
        {/* No Referral Code - Invite Only Message */}
        {!referral_code && (
          <Fade in={true} timeout={1000}>
            <Card sx={{ 
              mb: 3, 
              borderRadius: 3, 
              boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
              background: 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(10px)'
            }}>
              <CardContent sx={{ textAlign: 'center', p: 4 }}>
                <LockIcon sx={{ 
                  fontSize: 60, 
                  color: '#f59e0b', 
                  mb: 2,
                  filter: 'drop-shadow(0 4px 8px rgba(245,158,11,0.3))'
                }} />
                <Typography variant="h5" sx={{ mb: 2, color: '#333', fontWeight: 700 }}>
                  Registration by Invitation Only
                </Typography>
                <Typography variant="body1" sx={{ color: '#666', mb: 3, lineHeight: 1.6 }}>
                  Our medical platform is currently available by invitation only. 
                  Please ask a colleague who is already using our platform to send you an invitation link.
                </Typography>
                <Box sx={{ 
                  p: 3, 
                  bgcolor: '#fef3c7', 
                  borderRadius: 2, 
                  border: '1px solid #f59e0b',
                  mb: 3
                }}>
                  <Typography variant="body2" sx={{ color: '#92400e', fontWeight: 600, mb: 1 }}>
                    💡 How to get an invitation:
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#92400e', textAlign: 'left' }}>
                    • Ask a colleague who uses our platform to share their referral link<br/>
                    • They can find their referral link in the "Invite Colleague" section<br/>
                    • Your colleague earns NGN 10,000 when you reach 10 subscribing patients!
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                  <Button 
                    variant="outlined" 
                    onClick={() => navigate('/login')}
                    sx={{
                      borderColor: '#2563EB',
                      color: '#2563EB',
                      borderRadius: 2,
                      px: 3,
                      '&:hover': {
                        borderColor: '#1e40af',
                        color: '#1e40af',
                        background: 'rgba(37,99,235,0.05)'
                      }
                    }}
                  >
                    Back to Login
                  </Button>
                  <Button 
                    variant="contained"
                    startIcon={<EmailIcon />}
                    onClick={() => window.location.href = 'mailto:support@prestigedelta.com?subject=Invitation Request&body=Hello, I would like to request an invitation to join the Prestige medical platform.'}
                    sx={{
                      background: 'linear-gradient(45deg, #2563EB, #1e40af)',
                      borderRadius: 2,
                      px: 3,
                      '&:hover': {
                        background: 'linear-gradient(45deg, #1d4ed8, #1e3a8a)',
                      }
                    }}
                  >
                    Contact Support
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Fade>
        )}

        {/* Referrer Welcome Card */}
        {referral_code && (
          <Fade in={true} timeout={1000}>
            <Card sx={{ 
              mb: 3, 
              borderRadius: 3, 
              boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
              background: 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(10px)'
            }}>
              <CardContent sx={{ textAlign: 'center', p: 3 }}>
                {loadingReferrer ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 2 }}>
                    <CircularProgress size={24} sx={{ mr: 2 }} />
                    <Typography>Loading referrer details...</Typography>
                  </Box>
                ) : referrerDetails ? (
                  <Grow in={true} timeout={1200}>
                    <Box>
                      <Avatar sx={{ 
                        width: 60, 
                        height: 60, 
                        mx: 'auto', 
                        mb: 2, 
                        bgcolor: '#2563EB',
                        fontSize: '1.5rem'
                      }}>
                        {referrerDetails.first_name?.[0]}{referrerDetails.last_name?.[0]}
                      </Avatar>
                      <Typography variant="h6" sx={{ mb: 1, color: '#333' }}>
                        🎉 You've been invited by Dr. {referrerDetails.first_name} {referrerDetails.last_name}!
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#666', mb: 2 }}>
                        Join our exclusive medical professionals community and practice on your terms with your own patient base, generating recurring revenue through your clinic.
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                        <StarsIcon sx={{ color: '#FFD700', fontSize: 20 }} />
                        <Typography variant="body2" sx={{ color: '#2563EB', fontWeight: 600 }}>
                          Build Your Practice, Own Your Revenue
                        </Typography>
                        <StarsIcon sx={{ color: '#FFD700', fontSize: 20 }} />
                      </Box>
                    </Box>
                  </Grow>
                ) : (
                  <Box>
                    <PersonAddIcon sx={{ fontSize: 40, color: '#2563EB', mb: 1 }} />
                    <Typography variant="h6" sx={{ color: '#333' }}>
                      Welcome! You've been invited to join our medical community.
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Fade>
        )}

        {/* Main Registration Card - Only show if there's a referral code */}
        {referral_code && (
          <Fade in={true} timeout={1200}>
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
                  Doctor Registration
                </Typography>
                <Typography variant="body1" sx={{ color: '#666', mb: 2 }}>
                  Become a better doctor and improve the quality of your patient care with your own AI assistant.
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
                <GoogleAuthButton
                  onAuthSuccess={handleGoogleSuccess}
                  onAuthError={handleGoogleError}
                  disabled={loading}
                  text="Sign up with Google"
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
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    name="first_name"
                    label="First Name"
                    value={formData.first_name}
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
                    name="last_name"
                    label="Last Name"
                    value={formData.last_name}
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
                </Box>
                
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
                  name="phone_number"
                  label="Phone Number"
                  value={formData.phone_number}
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
                  {loading ? 'Creating Account...' : 'Create Doctor Account'}
                </Button>
              </Box>

              <Typography variant="body2" align="center" sx={{ color: '#666', mt: 3 }}>
                Already have an account?{' '}
                <Link 
                  onClick={() => navigate('/login')} 
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
                  Sign In
                </Link>
              </Typography>

              <Box sx={{ 
                mt: 3, 
                p: 2, 
                bgcolor: '#f0f4ff', 
                borderRadius: 2, 
                border: '1px solid #e3f2fd' 
              }}>
                <Typography variant="body2" sx={{ color: '#2563EB', textAlign: 'center' }}>
                  � Welcome to our exclusive medical professionals community! Start building your practice and patient base today.
                </Typography>
              </Box>
            </Paper>
          </Fade>
        )}

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

export default DoctorRegister;
