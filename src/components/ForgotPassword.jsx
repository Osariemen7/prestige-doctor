import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, TextField, Typography, Box, CircularProgress } from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';

const theme = createTheme({
  // ...custom theme settings if needed...
});

const ForgotPassword = () => {
  const [step, setStep] = useState(1); // 1: send reset code, 2: enter OTP and new password
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [forgotPasswordMessage, setForgotPasswordMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const validatePassword = (pwd) => {
    // Must include lowercase, uppercase, number, special char and at least 8 characters
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    return regex.test(pwd);
  };

  const handleSendResetCode = async () => {
    setLoading(true);
    setForgotPasswordMessage('');
    try {
      const response = await fetch('https://health.prestigedelta.com/emailotp/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          accept: 'application/json'
        },
        body: JSON.stringify({ email })
      });
      const result = await response.json();
      if (response.status === 200) {
        setForgotPasswordMessage('Reset code sent. Check your email.');
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
    setLoading(true);
    setForgotPasswordMessage('');
    try {
      // Updated payload keys to match sample: {"otp": "<otp>", "new_password": "<newPassword>"}
      const response = await fetch('https://health.prestigedelta.com/resetpassword/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          accept: 'application/json'
        },
        body: JSON.stringify({ otp, new_password: newPassword })
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

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{
         display: 'flex',
         flexDirection: 'column',
         alignItems: 'center',
         justifyContent: 'center',
         minHeight: '100vh',
         p: 2
      }}>
        <Box sx={{
          width: '100%',
          maxWidth: 400,
          p: 4,
          border: '1px solid #ccc',
          borderRadius: 2
        }}>
          <Typography variant="h5" align="center" gutterBottom>
            Reset Password
          </Typography>

          {step === 1 && (
            <>
              <TextField 
                fullWidth 
                label="Email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                variant="outlined" 
                margin="normal" 
                type="email" 
              />
              {forgotPasswordMessage && (
                <Typography variant="body2" sx={{ mt: 1 }}
                  color={forgotPasswordMessage.includes('sent') ? 'success.main' : 'error.main'}>
                  {forgotPasswordMessage}
                </Typography>
              )}
              <Button 
                fullWidth 
                variant="contained" 
                color="primary" 
                sx={{ mt: 2 }} 
                onClick={handleSendResetCode}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Send Reset Code'}
              </Button>
            </>
          )}

          {step === 2 && (
            <>
              <TextField 
                fullWidth 
                label="OTP Code" 
                value={otp} 
                onChange={(e) => setOtp(e.target.value)}
                variant="outlined" 
                margin="normal" 
                type="text" 
              />
              <TextField 
                fullWidth 
                label="New Password" 
                value={newPassword} 
                onChange={(e) => setNewPassword(e.target.value)}
                variant="outlined" 
                margin="normal" 
                type="password" 
              />
              {forgotPasswordMessage && (
                <Typography variant="body2" sx={{ mt: 1 }}
                  color={forgotPasswordMessage.includes('successfully') ? 'success.main' : 'error.main'}>
                  {forgotPasswordMessage}
                </Typography>
              )}
              <Button 
                fullWidth 
                variant="contained" 
                color="primary" 
                sx={{ mt: 2 }} 
                onClick={handleResetPassword}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Reset Password'}
              </Button>
            </>
          )}

          <Button 
            fullWidth 
            variant="text" 
            sx={{ mt: 1 }} 
            onClick={() => navigate('/')}
          >
            Back to Sign In
          </Button>
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default ForgotPassword;
