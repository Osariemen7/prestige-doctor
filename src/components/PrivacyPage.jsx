import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Typography,
  Link,
  Divider,
} from '@mui/material';

const SECTIONS = [
  {
    heading: 'Scope of this notice',
    body: [
      'This privacy notice covers the PrestigeHealth Provider Dashboard used by clinicians and practice staff. It is a provider-facing supplement to the PrestigeHealth privacy policy that applies to patients using the mobile app, available at prestigedelta.com.',
    ],
  },
  {
    heading: 'Information processed in the dashboard',
    body: [
      'Account information you provide when registering (name, professional details, contact details, authentication credentials).',
      'Clinical and administrative patient information that your practice records through the dashboard — reviews, investigations, messages, voice visit transcripts and related care documentation — processed on behalf of your practice to deliver care.',
    ],
  },
  {
    heading: 'How information is used',
    body: [
      'Dashboard data is used solely to operate the service: authenticating users, displaying and recording care activity, coordinating follow-up between clinicians and patients, and maintaining security. We do not sell personal information and do not use patient clinical data for advertising.',
    ],
  },
  {
    heading: 'Security',
    body: [
      'Data is transmitted over encrypted connections and protected by access controls tied to individual clinician accounts. Sessions use short-lived access tokens refreshed via a secure endpoint; sign-in sessions expire when the refresh token lapses. No clinical API response is cached by the app\'s offline storage.',
    ],
  },
  {
    heading: 'Retention and deletion',
    body: [
      'Patient records are retained in line with your practice\'s clinical-record obligations and PrestigeHealth retention schedules. You may request account closure, correction of your account details, or deletion requests concerning patient records through your practice administrator or by contacting us.',
    ],
  },
  {
    heading: 'Your responsibilities',
    body: [
      'As a clinician user you act as part of the care team for the patients you manage. Please keep your credentials private, sign out on shared devices, and limit dashboard use to legitimate care delivery.',
    ],
  },
];

const PrivacyPage = () => (
  <Container maxWidth="md" sx={{ py: { xs: 4, md: 8 }, px: { xs: 2, sm: 3 } }}>
    <Paper elevation={1} sx={{ p: { xs: 3, md: 6 }, borderRadius: 3 }}>
      <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
        Privacy notice
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" paragraph>
        PrestigeHealth Provider Dashboard — provider-facing supplement
      </Typography>
      <Divider sx={{ my: 3 }} />
      {SECTIONS.map((section) => (
        <Box key={section.heading} sx={{ mb: 4 }}>
          <Typography variant="h6" component="h2" gutterBottom sx={{ fontWeight: 700 }}>
            {section.heading}
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            {Array.isArray(section.body) ? section.body.join(' ') : section.body}
          </Typography>
        </Box>
      ))}
      <Divider sx={{ my: 3 }} />
      <Typography variant="body2" color="text.secondary">
        Privacy questions or data requests? Contact{' '}
        <Link href="mailto:support@prestigedelta.com">support@prestigedelta.com</Link>. See also our{' '}
        <Link component={RouterLink} to="/terms">Terms of use</Link> and the{' '}
        <Link href="https://prestigedelta.com" target="_blank" rel="noopener noreferrer">
          patient privacy policy on prestigedelta.com
        </Link>
        .
      </Typography>
    </Paper>
  </Container>
);

export default PrivacyPage;
