import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Paper,
  Typography,
  IconButton,
  Snackbar,
  Alert,
  Container,
  CircularProgress,
  Fade,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  InputAdornment,
  Divider,
  Chip,
  Card,
  CardContent,
  Grid,
  useTheme,
  useMediaQuery,
  Stepper,
  Step,
  StepLabel,
  Link
} from '@mui/material';
import { ArrowLeft, Eye, EyeOff, CheckCircle, User, Mail, Phone, ShieldCheck, ArrowRight } from 'lucide-react';
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
  const [countryCode, setCountryCode] = useState('+234');
  const [message, setMessage] = useState('');
  const [messageSeverity, setMessageSeverity] = useState('error');
  const [loading, setLoading] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      if (!formData.email || !formData.password || !formData.first_name || !formData.last_name || !formData.phone_number) {
        setMessage('Please fill in all required fields.');
        setMessageSeverity('warning');
        setSnackbarOpen(true);
        setLoading(false);
        return;
      }

      const rawPhoneNumber = formData.phone_number.startsWith('0')
        ? formData.phone_number.slice(1)
        : formData.phone_number;

      if (!/^\d+$/.test(rawPhoneNumber)) {
        setMessage('Please enter a valid phone number (digits only).');
        setMessageSeverity('warning');
        setSnackbarOpen(true);
        setLoading(false);
        return;
      }

      const formattedPhoneNumber = countryCode + rawPhoneNumber;

      const item = {
        ...formData,
        phone_number: formattedPhoneNumber,
        confirm_password: formData.password,
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

      if (!response.ok) {
        const errorMsg = Object.values(result).flat().join(' ') || 'An error occurred during registration.';
        setMessage(errorMsg);
        setMessageSeverity('error');
      } else {
        setMessage('Registration successful! Redirecting to profile setup...');
        setMessageSeverity('success');
        localStorage.setItem('user-info', JSON.stringify(result));
        setTimeout(() => {
          navigate('/provider');
        }, 2000);
      }
    } catch (error) {
      console.error('Registration Error:', error);
      setMessage('A network error occurred. Please try again.');
      setMessageSeverity('error');
    } finally {
      setLoading(false);
      setSnackbarOpen(true);
    }
  };

  const nameFields = [
    { name: 'first_name', label: 'First Name', required: true, icon: <User size={20} /> },
    { name: 'middle_name', label: 'Middle Name (Optional)', required: false, icon: <User size={20} /> },
    { name: 'last_name', label: 'Last Name', required: true, icon: <User size={20} /> },
  ];

  const contactFields = [
    { name: 'email', label: 'Email Address', type: 'email', required: true, icon: <Mail size={20} /> },
  ];

  const passwordField = { name: 'password', label: 'Password', type: 'password', required: true, icon: <ShieldCheck size={20} /> };

  // Benefits list
  const benefits = [
    "Set your own consultation rates & hours",
    "Earn 75% of direct patient fees",
    "Own all patient relationships",
    "Get a dedicated success manager",
    "Zero setup fees or monthly charges"
  ];

  return (
    <Container maxWidth={false} disableGutters
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0A2463 0%, #1E3A8A 100%)',
        p: { xs: 2, sm: 3, md: 4 },
        boxSizing: 'border-box',
        pt: { xs: 4, sm: 6 }, // Top padding to ensure content starts below the top of the screen
        pb: { xs: 6, sm: 8 }, // Bottom padding
        position: 'relative',
        overflow: 'auto',
        height: 'auto',
      }}
    >
      {/* Decorative elements */}
      <Box
        sx={{
          position: 'absolute',
          top: '10%',
          left: '5%',
          width: '300px',
          height: '300px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(67, 97, 238, 0.3) 0%, rgba(76, 201, 240, 0.1) 70%)',
          filter: 'blur(40px)',
          zIndex: 0,
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: '15%',
          right: '10%',
          width: '250px',
          height: '250px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(76, 201, 240, 0.3) 0%, rgba(67, 97, 238, 0.1) 70%)',
          filter: 'blur(50px)',
          zIndex: 0,
        }}
      />

      <Grid container spacing={0} sx={{ 
        maxWidth: 1100, 
        zIndex: 1,
        borderRadius: 3,
        overflow: 'visible', // Changed from 'hidden' to 'visible'
        boxShadow: '0 24px 80px rgba(0, 0, 0, 0.25)',
        my: 4, // Add margin top and bottom
      }}>
        {/* Left side - Value proposition for larger screens */}
        {!isMobile && (
          <Grid item xs={12} md={5} 
            sx={{ 
              background: 'linear-gradient(135deg, #4361EE 0%, #4CC9F0 100%)',
              p: 5,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <Box
              component="img"
              src="/Group.png"
              alt="Doctor using device"
              sx={{
                position: 'absolute',
                bottom: '-10%',
                right: '-10%',
                width: '70%',
                opacity: 0.9,
                filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.2))',
              }}
            />
            <Box sx={{ position: 'relative', zIndex: 2 }}>
              <Typography variant="h4" sx={{ color: 'white', fontWeight: 800, mb: 3 }}>
                Join Thousands of Successful Doctors
              </Typography>
              <Typography variant="h6" sx={{ color: 'white', fontWeight: 400, mb: 4, opacity: 0.9, lineHeight: 1.6 }}>
                Prestige Health helps doctors build profitable practices on their own terms.
              </Typography>
              
              <Box sx={{ mt: 4 }}>
                <Typography variant="h6" sx={{ color: 'white', fontWeight: 600, mb: 2 }}>
                  Why Doctors Choose Us:
                </Typography>
                {benefits.map((benefit, index) => (
                  <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <CheckCircle size={20} color="white" />
                    <Typography variant="body1" sx={{ color: 'white', ml: 2 }}>
                      {benefit}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          </Grid>
        )}

        {/* Right side - Registration form */}
        <Grid item xs={12} md={7} sx={{ 
          bgcolor: 'white',
          maxHeight: { xs: 'none', md: '100vh' }, // Remove height constraint on mobile
          overflow: 'auto' // Allow scrolling within the form container
        }}>
          <Fade in timeout={800}>
            <Box
              sx={{
                p: { xs: 3, sm: 4, md: 5 },
                width: '100%',
                maxWidth: '100%',
                boxSizing: 'border-box',
              }}
            >
              <IconButton
                onClick={() => navigate('/')}
                aria-label="Go back"
                sx={{
                  color: '#1E3A8A',
                  bgcolor: 'rgba(30, 58, 138, 0.1)',
                  '&:hover': {
                    bgcolor: 'rgba(30, 58, 138, 0.2)',
                  },
                  mb: 3
                }}
              >
                <ArrowLeft size={20} />
              </IconButton>

              <Box sx={{ mb: 4 }}>
                <Typography
                  variant="h4"
                  component="h1"
                  sx={{
                    color: '#1E3A8A',
                    fontWeight: 800,
                    mb: 1,
                  }}
                >
                  Create Your Doctor Account
                </Typography>
                
                <Typography
                  variant="subtitle1"
                  sx={{
                    color: 'text.secondary',
                    mb: 3,
                  }}
                >
                  Join our platform of trusted medical professionals
                </Typography>

                {/* Mobile only benefits */}
                {isMobile && (
                  <Card sx={{ mb: 4, bgcolor: '#F0F9FF', border: '1px solid #DBEAFE' }}>
                    <CardContent>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1E3A8A', mb: 2 }}>
                        Benefits of joining:
                      </Typography>
                      {benefits.slice(0, 3).map((benefit, index) => (
                        <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <CheckCircle size={16} color="#4361EE" />
                          <Typography variant="body2" sx={{ ml: 1 }}>
                            {benefit}
                          </Typography>
                        </Box>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Progress stepper */}
                <Stepper activeStep={0} alternativeLabel sx={{ mb: 4 }}>
                  <Step>
                    <StepLabel>Account</StepLabel>
                  </Step>
                  <Step>
                    <StepLabel>Profile</StepLabel>
                  </Step>
                  <Step>
                    <StepLabel>Practice</StepLabel>
                  </Step>
                </Stepper>
              </Box>

              <Box
                component="form"
                onSubmit={handleSubmit}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2.5
                }}
              >
                <Card sx={{ mb: 2, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', borderRadius: 2 }}>
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1E3A8A', mb: 2 }}>
                      Personal Information
                    </Typography>
                    
                    {nameFields.map((field) => (
                      <TextField
                        key={field.name}
                        name={field.name}
                        label={field.label}
                        type={field.type || 'text'}
                        variant="outlined"
                        value={formData[field.name]}
                        onChange={handleInputChange}
                        required={field.required}
                        fullWidth
                        margin="normal"
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start" sx={{ color: '#4361EE' }}>
                              {field.icon}
                            </InputAdornment>
                          ),
                          sx: { borderRadius: 2 }
                        }}
                      />
                    ))}
                  </CardContent>
                </Card>

                <Card sx={{ mb: 2, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', borderRadius: 2 }}>
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1E3A8A', mb: 2 }}>
                      Contact Information
                    </Typography>
                    
                    {contactFields.map((field) => (
                      <TextField
                        key={field.name}
                        name={field.name}
                        label={field.label}
                        type={field.type || 'text'}
                        variant="outlined"
                        value={formData[field.name]}
                        onChange={handleInputChange}
                        required={field.required}
                        fullWidth
                        margin="normal"
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start" sx={{ color: '#4361EE' }}>
                              {field.icon}
                            </InputAdornment>
                          ),
                          sx: { borderRadius: 2 }
                        }}
                      />
                    ))}

                    <Box sx={{ display: 'flex', gap: 1.5, mt: 2 }}>
                      <FormControl sx={{ width: '35%' }}>
                        <InputLabel id="country-code-label">Code</InputLabel>
                        <Select
                          labelId="country-code-label"
                          value={countryCode}
                          label="Code"
                          onChange={(e) => setCountryCode(e.target.value)}
                          sx={{ borderRadius: 2 }}
                          startAdornment={
                            <InputAdornment position="start" sx={{ color: '#4361EE' }}>
                              <Phone size={20} />
                            </InputAdornment>
                          }
                        >
                          <MenuItem value="+234">+234 (NG)</MenuItem>
                          <MenuItem value="+44">+44 (UK)</MenuItem>
                          <MenuItem value="+1">+1 (US/CA)</MenuItem>
                          <MenuItem value="+27">+27 (ZA)</MenuItem>
                          <MenuItem value="+233">+233 (GH)</MenuItem>
                        </Select>
                      </FormControl>
                      <TextField
                        name="phone_number"
                        label="Phone Number"
                        type="tel"
                        variant="outlined"
                        value={formData.phone_number}
                        onChange={handleInputChange}
                        required
                        fullWidth
                        placeholder="e.g., 8012345678"
                        InputProps={{
                          sx: { borderRadius: 2 }
                        }}
                      />
                    </Box>
                  </CardContent>
                </Card>

                <Card sx={{ mb: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', borderRadius: 2 }}>
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1E3A8A', mb: 2 }}>
                      Security
                    </Typography>
                    
                    <TextField
                      name={passwordField.name}
                      label={passwordField.label}
                      type={showPassword ? 'text' : 'password'}
                      variant="outlined"
                      value={formData[passwordField.name]}
                      onChange={handleInputChange}
                      required={passwordField.required}
                      fullWidth
                      margin="normal"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start" sx={{ color: '#4361EE' }}>
                            {passwordField.icon}
                          </InputAdornment>
                        ),
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              aria-label="toggle password visibility"
                              onClick={() => setShowPassword(!showPassword)}
                              onMouseDown={(e) => e.preventDefault()}
                              edge="end"
                              sx={{ color: '#4361EE' }}
                            >
                              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </IconButton>
                          </InputAdornment>
                        ),
                        sx: { borderRadius: 2 }
                      }}
                    />
                    
                    <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.secondary' }}>
                      Password should be at least 8 characters with a mix of letters, numbers & symbols
                    </Typography>
                  </CardContent>
                </Card>

                <Button
                  type="submit"
                  variant="contained"
                  disabled={loading}
                  fullWidth
                  sx={{
                    py: 1.8,
                    bgcolor: '#1E3A8A',
                    fontSize: '1rem',
                    fontWeight: 600,
                    borderRadius: 2,
                    textTransform: 'none',
                    boxShadow: '0 4px 12px rgba(30, 58, 138, 0.25)',
                    '&:hover': {
                      bgcolor: '#172A54',
                      boxShadow: '0 6px 16px rgba(30, 58, 138, 0.35)',
                    },
                    '&.Mui-disabled': {
                      bgcolor: '#E2E8F0',
                      color: '#94A3B8'
                    },
                  }}
                  endIcon={loading ? <CircularProgress size={20} color="inherit" /> : <ArrowRight />}
                >
                  {loading ? 'Creating Account...' : 'Continue to Professional Profile'}
                </Button>

                <Typography
                  variant="caption"
                  align="center"
                  sx={{
                    display: 'block',
                    mt: 2,
                    color: 'text.secondary',
                  }}
                >
                  By clicking "Continue", you agree to our <Link href="#" sx={{ color: '#4361EE' }}>Terms of Service</Link> and <Link href="#" sx={{ color: '#4361EE' }}>Privacy Policy</Link>
                </Typography>

                <Divider sx={{ my: 3 }}>
                  <Chip label="or" sx={{ bgcolor: '#F8FAFC', color: '#64748B' }} />
                </Divider>

                <Typography
                  variant="body2"
                  sx={{
                    textAlign: 'center',
                    color: 'text.secondary',
                  }}
                >
                  Already have an account?{' '}
                  <Button
                    onClick={() => navigate('/')}
                    sx={{
                      color: '#4361EE',
                      textTransform: 'none',
                      fontWeight: 600,
                      p: 0.2,
                      '&:hover': {
                        bgcolor: 'rgba(67, 97, 238, 0.05)',
                        textDecoration: 'underline',
                      },
                    }}
                  >
                    Sign in here
                  </Button>
                </Typography>
              </Box>
            </Box>
          </Fade>
        </Grid>
      </Grid>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity={messageSeverity}
          variant="filled"
          sx={{ width: '100%', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)' }}
        >
          {message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default RegistrationPage;
