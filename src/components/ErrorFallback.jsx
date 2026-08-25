import React from 'react';
import { Box, Button, Typography, Paper } from '@mui/material';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';

/**
 * Friendly top-level crash fallback. Offers a reload plus human support
 * channels; never exposes raw error details to clinicians.
 */
const ErrorFallback = ({ resetErrorBoundary }) => (
  <Box
    sx={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      p: 2,
      bgcolor: 'background.default',
    }}
  >
    <Paper elevation={3} sx={{ maxWidth: 480, p: 4, textAlign: 'center', borderRadius: 3 }}>
      <ReportProblemOutlinedIcon color="warning" sx={{ fontSize: 56, mb: 2 }} aria-hidden="true" />
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 700 }}>
        Something went wrong
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        An unexpected error interrupted your session. Your patient data is safe.
        Please try reloading the app.
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 2 }}>
        <Button
          variant="contained"
          onClick={() => window.location.reload()}
          size="large"
        >
          Reload app
        </Button>
        <Button component="a" href="mailto:support@prestigedelta.com" variant="outlined">
          Contact support (support@prestigedelta.com)
        </Button>
        <Button component="a" href="/reviews" variant="text">
          Back to reviews
        </Button>
      </Box>
    </Paper>
  </Box>
);

export default ErrorFallback;
