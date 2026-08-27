import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';

/** Branded full-screen loading state shown while the session is restored. */
const SplashScreen = ({ message = 'Preparing your workspace…' }) => (
  <Box
    role="status"
    aria-live="polite"
    sx={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 3,
      background: 'linear-gradient(180deg, #ffffff 0%, #f8f9fa 100%)',
    }}
  >
    <Box
      sx={{
        width: 72,
        height: 72,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
        color: 'white',
        boxShadow: '0 8px 24px rgba(37, 99, 235, 0.35)',
      }}
    >
      <LocalHospitalIcon sx={{ fontSize: 40 }} aria-hidden="true" />
    </Box>
    <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>
      PrestigeHealth Provider
    </Typography>
    <CircularProgress size={28} sx={{ color: 'primary.main' }} />
    <Typography variant="body2" color="text.secondary">
      {message}
    </Typography>
  </Box>
);

export default SplashScreen;
