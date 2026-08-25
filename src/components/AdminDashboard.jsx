import React from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  Avatar,
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

/**
 * Placeholder surface. The former version displayed fabricated platform
 * financial figures; no admin analytics API exists yet, so this page now
 * shows an explicit demo notice instead of invented numbers.
 */
const AdminDashboard = () => (
  <Container maxWidth="sm" sx={{ py: 8 }}>
    <Paper elevation={2} sx={{ p: 5, textAlign: 'center', borderRadius: 3 }}>
      <Avatar
        sx={{
          width: 64,
          height: 64,
          mx: 'auto',
          mb: 2,
          bgcolor: 'primary.main',
        }}
      >
        <InfoOutlinedIcon fontSize="large" aria-hidden="true" />
      </Avatar>
      <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
        Demo preview
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        This area is a design placeholder. Platform-level analytics for
        administrators are not available in the provider app yet, and no live
        metrics are shown here.
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        If you believe you should be seeing administrative data, please contact{' '}
        <Box component="span" sx={{ whiteSpace: 'nowrap' }}>
          support@prestigedelta.com
        </Box>
        .
      </Typography>
      <Button variant="contained" href="/provider-dashboard" sx={{ mt: 1 }}>
        Go to your business dashboard
      </Button>
    </Paper>
  </Container>
);

export default AdminDashboard;
