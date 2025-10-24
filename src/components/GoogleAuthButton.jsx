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
          Please configure REACT_APP_GOOGLE_CLIENT_ID in your .env file with a valid Google OAuth client ID from Google Cloud Console.
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
      console.error('Google auth error:', error);
      onAuthError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = (error) => {
    console.error('Google OAuth error:', error);
    
    // Handle specific FedCM errors
    if (error?.message?.includes('FedCM') || error?.message?.includes('NetworkError')) {
      onAuthError(new Error('Google sign-in failed due to network or browser settings. Please check your internet connection and ensure third-party cookies are enabled for this site.'));
    } else {
      onAuthError(error);
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      <GoogleLogin
        onSuccess={handleGoogleSuccess}
        onError={handleGoogleError}
        useOneTap
        theme="outline"
        shape="rectangular"
        text="continue_with"
        disabled={disabled}
        context="signin"
        flow="implicit"
        ux_mode="popup"
        auto_select={false}
        itp_support={true}
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