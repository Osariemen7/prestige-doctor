import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Button, 
  TextField, 
  Typography, 
  Box, 
  CircularProgress, 
  Paper, 
  Container,
  Divider,
  InputAdornment,
  IconButton,
  Fade,
  Card,
  CardContent,
  Tabs,
  Tab
} from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import LockResetIcon from '@mui/icons-material/LockReset';
import PhoneIcon from '@mui/icons-material/Phone';
import KeyIcon from '@mui/icons-material/Key';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EmailIcon from '@mui/icons-material/Email';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
      light: '#4791db',
      dark: '#115293',
    },
    secondary: {
      main: '#f50057',
      light: '#ff4081',
      dark: '#c51162',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 500,
    },
    body1: {
      fontSize: '1rem',
    },
  },
  shape: {
    borderRadius: 8,
  },
  shadows: [
    'none',
    '0px 2px 1px -1px rgba(0,0,0,0.2),0px 1px 1px 0px rgba(0,0,0,0.14),0px 1px 3px 0px rgba(0,0,0,0.12)',
    '0px 3px 5px -1px rgba(0,0,0,0.2),0px 6px 10px 0px rgba(0,0,0,0.14),0px 1px 18px 0px rgba(0,0,0,0.12)',
  ],
});

const ForgotPassword = () => {
  const [step, setStep] = useState(1); // 1: send reset code, 2: enter OTP and new password
  const [authMethod, setAuthMethod] = useState('phone'); // 'phone' or 'email'
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [forgotPasswordMessage, setForgotPasswordMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();

  const validatePassword = (pwd) => {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    return regex.test(pwd);
  };

  const validatePhoneNumber = (phone) => {
    const regex = /^\+\d{10,15}$/;
    return regex.test(phone);
  };

  const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const handleSendResetCode = async () => {
    if (authMethod === 'phone') {
      if (!validatePhoneNumber(phoneNumber)) {
        setForgotPasswordMessage('Please enter a valid international phone number (e.g., +2347065675107)');
        return;
      }
    } else {
      if (!validateEmail(email)) {
        setForgotPasswordMessage('Please enter a valid email address');
        return;
      }
    }

    setLoading(true);
    setForgotPasswordMessage('');
    try {
      const payload = authMethod === 'phone' 
        ? { phone_number: phoneNumber }
        : { email };

      const response = await fetch('https://service.prestigedelta.com/emailotp/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          accept: 'application/json'
        },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (response.status === 200) {
        setForgotPasswordMessage(authMethod === 'phone' 
          ? 'Reset code sent. Check the email associated with this phone number.'
          : 'Reset code sent. Check your email.');
        setStep(2);
      } else {
        setForgotPasswordMessage(result.message || 'Failed to send reset code. Please try again.');
      }
    } catch (error) {
      console.error(error);
      setForgotPasswordMessage('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (otp.length !== 6) {
      setForgotPasswordMessage('OTP must be a 6-digit code.');
      return;
    }
    if (!validatePassword(newPassword)) {
      setForgotPasswordMessage('Password must be at least 8 characters and include lowercase, uppercase, number and special character.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setForgotPasswordMessage('Passwords do not match.');
      return;
    }
    setLoading(true);
    setForgotPasswordMessage('');
    try {
      const payload = {
        otp_code: otp,
        new_password: newPassword,
        confirm_password: confirmPassword
      };
      
      if (authMethod === 'phone') {
        payload.phone_number = phoneNumber;
      } else {
        payload.email = email;
      }
      
      const response = await fetch('https://service.prestigedelta.com/resetpassword/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          accept: 'application/json'
        },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (response.status === 200) {
        setForgotPasswordMessage(result.message || 'Password reset successfully.');
        setTimeout(() => navigate('/'), 2000);
      } else {
        setForgotPasswordMessage(result.message || 'Failed to reset password. Please try again.');
      }
    } catch (error) {
      console.error(error);
      setForgotPasswordMessage('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleMethodChange = (event, newValue) => {
    setAuthMethod(newValue);
    setForgotPasswordMessage('');
  };

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundImage: 'linear-gradient(120deg, #e0f7fa 0%, #bbdefb 100%)',
        padding: { xs: 2, sm: 4 }
      }}>
        <Container maxWidth="sm">
          <Fade in={true} timeout={800}>
            <Card elevation={5} sx={{ borderRadius: 3, overflow: 'hidden' }}>
              <Box sx={{ 
                backgroundColor: 'primary.main', 
                py: 2, 
                px: 3, 
                display: 'flex', 
                alignItems: 'center',
                color: 'white'
              }}>
                <LockResetIcon sx={{ fontSize: 32, mr: 2 }} />
                <Typography variant="h5" component="h1" sx={{ fontWeight: 'bold' }}>
                  Reset Your Password
                </Typography>
              </Box>
              
              <CardContent sx={{ p: 4 }}>
                {step === 1 && (
                  <Fade in={true} timeout={500}>
                    <Box>
                      <Tabs
                        value={authMethod}
                        onChange={handleMethodChange}
                        variant="fullWidth"
                        indicatorColor="primary"
                        textColor="primary"
                        sx={{ mb: 3 }}
                      >
                        <Tab value="phone" label="Phone" icon={<PhoneIcon />} iconPosition="start" />
                        <Tab value="email" label="Email" icon={<EmailIcon />} iconPosition="start" />
                      </Tabs>

                      <Typography variant="body1" paragraph sx={{ mb: 3, color: 'text.secondary' }}>
                        {authMethod === 'phone' 
                          ? 'Please enter your phone number in international format and we\'ll send a reset code to the associated email address.'
                          : 'Please enter your email address and we\'ll send a reset code to it.'}
                      </Typography>
                      
                      {authMethod === 'phone' ? (
                        <TextField 
                          fullWidth 
                          label="Phone Number" 
                          value={phoneNumber} 
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          variant="outlined" 
                          margin="normal" 
                          type="tel" 
                          placeholder="+2347065675107"
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <PhoneIcon color="primary" />
                              </InputAdornment>
                            ),
                          }}
                          helperText="Enter your phone number in international format (e.g., +2347065675107)"
                          sx={{ mb: 2 }}
                        />
                      ) : (
                        <TextField 
                          fullWidth 
                          label="Email" 
                          value={email} 
                          onChange={(e) => setEmail(e.target.value)}
                          variant="outlined" 
                          margin="normal" 
                          type="email" 
                          placeholder="example@email.com"
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <EmailIcon color="primary" />
                              </InputAdornment>
                            ),
                          }}
                          helperText="Enter your registered email address"
                          sx={{ mb: 2 }}
                        />
                      )}
                      
                      {forgotPasswordMessage && (
                        <Box sx={{ 
                          p: 2, 
                          mb: 2, 
                          borderRadius: 1,
                          backgroundColor: forgotPasswordMessage.includes('sent') ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)',
                          border: forgotPasswordMessage.includes('sent') ? '1px solid rgba(76, 175, 80, 0.3)' : '1px solid rgba(244, 67, 54, 0.3)',
                        }}>
                          <Typography 
                            variant="body2"
                            color={forgotPasswordMessage.includes('sent') ? 'success.main' : 'error.main'}
                          >
                            {forgotPasswordMessage}
                          </Typography>
                        </Box>
                      )}
                      
                      <Button 
                        fullWidth 
                        variant="contained" 
                        color="primary" 
                        size="large"
                        sx={{ 
                          mt: 2,
                          py: 1.5,
                          borderRadius: 2,
                          fontWeight: 'bold'
                        }} 
                        onClick={handleSendResetCode}
                        disabled={loading}
                      >
                        {loading ? <CircularProgress size={24} color="inherit" /> : 'Send Reset Code'}
                      </Button>
                    </Box>
                  </Fade>
                )}

                {step === 2 && (
                  <Fade in={true} timeout={500}>
                    <Box>
                      <Typography variant="body1" paragraph sx={{ mb: 3, color: 'text.secondary' }}>
                        Enter the OTP sent to your email and create a new password.
                      </Typography>
                      
                      <TextField 
                        fullWidth 
                        label="OTP Code" 
                        value={otp} 
                        onChange={(e) => setOtp(e.target.value)}
                        variant="outlined" 
                        margin="normal" 
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <EmailIcon color="primary" />
                            </InputAdornment>
                          ),
                        }}
                        sx={{ mb: 2 }}
                      />
                      
                      <TextField 
                        fullWidth 
                        label="New Password" 
                        value={newPassword} 
                        onChange={(e) => setNewPassword(e.target.value)}
                        variant="outlined" 
                        margin="normal" 
                        type={showPassword ? "text" : "password"}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <KeyIcon color="primary" />
                            </InputAdornment>
                          ),
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton
                                onClick={() => setShowPassword(!showPassword)}
                                edge="end"
                              >
                                {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                              </IconButton>
                            </InputAdornment>
                          )
                        }}
                        helperText="Password must be at least 8 characters with lowercase, uppercase, number and special character"
                        sx={{ mb: 2 }}
                      />
                      
                      <TextField 
                        fullWidth 
                        label="Confirm Password" 
                        value={confirmPassword} 
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        variant="outlined" 
                        margin="normal" 
                        type={showConfirmPassword ? "text" : "password"}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <KeyIcon color="primary" />
                            </InputAdornment>
                          ),
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                edge="end"
                              >
                                {showConfirmPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                              </IconButton>
                            </InputAdornment>
                          )
                        }}
                        helperText="Re-enter your password to confirm"
                        sx={{ mb: 2 }}
                      />
                      
                      {forgotPasswordMessage && (
                        <Box sx={{ 
                          p: 2, 
                          mb: 2, 
                          borderRadius: 1,
                          backgroundColor: forgotPasswordMessage.includes('successfully') ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)',
                          border: forgotPasswordMessage.includes('successfully') ? '1px solid rgba(76, 175, 80, 0.3)' : '1px solid rgba(244, 67, 54, 0.3)',
                        }}>
                          <Typography 
                            variant="body2"
                            color={forgotPasswordMessage.includes('successfully') ? 'success.main' : 'error.main'}
                          >
                            {forgotPasswordMessage}
                          </Typography>
                        </Box>
                      )}
                      
                      <Button 
                        fullWidth 
                        variant="contained" 
                        color="primary" 
                        size="large"
                        sx={{ 
                          mt: 2,
                          py: 1.5,
                          borderRadius: 2,
                          fontWeight: 'bold'
                        }} 
                        onClick={handleResetPassword}
                        disabled={loading}
                      >
                        {loading ? <CircularProgress size={24} color="inherit" /> : 'Reset Password'}
                      </Button>
                      
                      <Button 
                        variant="outlined" 
                        color="primary" 
                        sx={{ mt: 2 }}
                        startIcon={<ArrowBackIcon />}
                        onClick={() => setStep(1)}
                      >
                        Back to {authMethod === 'phone' ? 'Phone Number' : 'Email'}
                      </Button>
                    </Box>
                  </Fade>
                )}

                <Divider sx={{ my: 3 }} />
                
                <Button 
                  fullWidth 
                  variant="text" 
                  color="primary"
                  sx={{ mt: 1 }} 
                  onClick={() => navigate('/')}
                  startIcon={<ArrowBackIcon />}
                >
                  Back to Sign In
                </Button>
              </CardContent>
            </Card>
          </Fade>
        </Container>
      </Box>
    </ThemeProvider>
  );
};

export default ForgotPassword;
