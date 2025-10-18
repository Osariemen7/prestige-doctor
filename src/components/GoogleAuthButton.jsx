import { GoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import { Button, Box, Typography, CircularProgress } from '@mui/material';
import React, { useState } from 'react';

const GoogleAuthButton = ({
  onAuthSuccess,
  onAuthError,
  variant = 'outlined',
  fullWidth = true,
  text = 'Continue with Google',
  disabled = false
}) => {
  const [loading, setLoading] = useState(false);

  const isConfigured = process.env.REACT_APP_GOOGLE_CLIENT_ID &&
    process.env.REACT_APP_GOOGLE_CLIENT_ID !== 'your-actual-client-id-here' &&
    process.env.REACT_APP_GOOGLE_CLIENT_ID.includes('googleusercontent.com');

  if (!isConfigured) {
    return (
      <Box sx={{ width: '100%', mb: 2 }}>
        <Button disabled variant={variant} fullWidth={fullWidth}>
          <Typography variant="inherit">
            Google OAuth Not Configured
          </Typography>
        </Button>
        <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
          Please configure REACT_APP_GOOGLE_CLIENT_ID in your .env file
        </Typography>
      </Box>
    );
  }
  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true);
    try {
      // Pass the Google credential to the parent component
      // The parent will handle the backend API call
      const googleUserData = {
        credential: credentialResponse.credential,
        access_token: credentialResponse.credential, // Some backends expect this field name
        token: credentialResponse.credential // For backward compatibility
      };
      onAuthSuccess(googleUserData);
    } catch (error) {
      onAuthError(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      <GoogleLogin
        onSuccess={handleGoogleSuccess}
        onError={onAuthError}
        useOneTap
        theme="outline"
        shape="rectangular"
        text="continue_with"
        disabled={disabled}
      />
      {loading && (
        <Button
          variant={variant}
          fullWidth={fullWidth}
          disabled
          sx={{ mt: 2 }}
        >
          <CircularProgress size={20} sx={{ mr: 1 }} />
          Connecting...
        </Button>
      )}
    </Box>
  );
};

export default GoogleAuthButton;