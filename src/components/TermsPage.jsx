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
    heading: 'About these terms',
    body: [
      'These terms govern your use of the PrestigeHealth Provider Dashboard, the web application made available to clinicians and practice staff ("the dashboard"). They are a provider-facing supplement to the general PrestigeHealth terms that apply to users of the patient app; where those general terms exist they continue to apply to their own audience.',
      'By signing in to the dashboard you accept these terms on behalf of yourself and, where applicable, confirm you are authorised to act for your practice.',
    ],
  },
  {
    heading: 'Your account',
    body: [
      'Access is limited to verified clinicians and authorised practice staff. You are responsible for keeping your credentials confidential, for all activity carried out under your account, and for promptly reporting any suspected unauthorised access to us.',
    ],
  },
  {
    heading: 'Patient information and confidentiality',
    body: [
      'Patient information shown in the dashboard is confidential. You may view, record and process it solely to deliver care to the relevant patient and for related operational purposes legitimately required by your practice.',
      'You agree not to copy, share or repurpose patient information outside these purposes, and to comply with all applicable data-protection and medical-records obligations that govern your work.',
    ],
  },
  {
    heading: 'Service availability',
    body: [
      'We aim to keep the dashboard available and reliable, but the service is provided on an "as is" basis without a warranty of uninterrupted operation. Scheduled maintenance or events beyond our control may temporarily affect availability.',
    ],
  },
  {
    heading: 'Changes',
    body: [
      'We may update these terms from time to time. Material changes will be communicated through the dashboard. Continuing to use the dashboard after an update constitutes acceptance of the revised terms.',
    ],
  },
];

const TermsPage = () => (
  <Container maxWidth="md" sx={{ py: { xs: 4, md: 8 }, px: { xs: 2, sm: 3 } }}>
    <Paper elevation={1} sx={{ p: { xs: 3, md: 6 }, borderRadius: 3 }}>
      <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
        Terms of use
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
          {section.body.map((paragraph) => (
            <Typography key={paragraph.slice(0, 32)} variant="body1" color="text.secondary" paragraph>
              {paragraph}
            </Typography>
          ))}
        </Box>
      ))}
      <Divider sx={{ my: 3 }} />
      <Typography variant="body2" color="text.secondary">
        Questions about these terms? Contact{' '}
        <Link href="mailto:support@prestigedelta.com">support@prestigedelta.com</Link>. See also our{' '}
        <Link component={RouterLink} to="/privacy">Privacy notice</Link> and the{' '}
        <Link href="https://prestigedelta.com" target="_blank" rel="noopener noreferrer">
          patient-app policies on prestigedelta.com
        </Link>
        .
      </Typography>
    </Paper>
  </Container>
);

export default TermsPage;
