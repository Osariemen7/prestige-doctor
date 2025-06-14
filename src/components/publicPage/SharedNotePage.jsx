import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Container,
  Paper,
  Box,
  Grid,
  CircularProgress,
  Alert,
  List,
  ListItem,
  Divider,
  Chip,
  Icon,
  IconButton,
  Link,
  Tooltip,
  CssBaseline
} from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import {
  Subject as SubjectIcon,
  Visibility as VisibilityIcon,
  Assessment as AssessmentIcon,
  PlaylistAddCheck as PlaylistAddCheckIcon,
  Event as EventIcon,
  LocalHospital as LocalHospitalIcon,
  Science as ScienceIcon,
  FileCopy as FileCopyIcon,
  CheckCircle as CheckCircleIcon,
  Login as LoginIcon,
  PersonAdd as PersonAddIcon,
  InfoOutlined as InfoOutlinedIcon,
  VerifiedUser as VerifiedUserIcon,
  ContentCopy as ContentCopyIcon, // Added for the new copy button
} from '@mui/icons-material';

// Theme definition (incorporating elements from your mui.js)
const sharedNoteTheme = createTheme({
  palette: {
    primary: {
      main: '#2563eb', // From your theme
      light: '#3b82f6',
      dark: '#1d4ed8',
      contrastText: '#ffffff',
    },
    secondary: { // Changed from green to dark blue (primary.dark)
      main: '#1d4ed8', // Was '#059669' (green), now primary.dark
      light: '#2563eb', // Was '#10b981', now primary.main
      dark: '#163a7c',  // Was '#047857', now a darker shade of primary.dark
      contrastText: '#ffffff',
    },
    background: {
      default: '#f9fafb', // Light grey background from your theme
      paper: '#ffffff',
    },
    text: {
      primary: '#1f2937', // Darker text for readability
      secondary: '#4b5563',
    },
    grey: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      700: '#374151',
    },
    error: { main: '#ef4444' },
    warning: { main: '#f97316' },
    info: { main: '#3b82f6' },
    success: { main: '#22c55e' },
  },
  typography: {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"' ,
    h1: { fontSize: '2.75rem', fontWeight: 700, lineHeight: 1.2, color: '#111827' },
    h2: { fontSize: '2rem', fontWeight: 700, lineHeight: 1.25, color: '#111827' },
    h3: { fontSize: '1.75rem', fontWeight: 600, lineHeight: 1.3, color: '#111827' },
    h4: { fontSize: '1.5rem', fontWeight: 600, lineHeight: 1.35, color: '#1f2937' },
    h5: { fontSize: '1.25rem', fontWeight: 600, lineHeight: 1.4, color: '#1f2937' }, // Used in SectionCard
    h6: { fontSize: '1.125rem', fontWeight: 600, lineHeight: 1.4, color: '#1f2937' }, // Used for item titles
    subtitle1: { fontSize: '1rem', fontWeight: 400, color: '#4b5563' },
    subtitle2: { fontSize: '0.875rem', fontWeight: 500, color: '#374151' }, // Used in InfoItem label
    body1: { fontSize: '1rem', fontWeight: 400, color: '#374151', lineHeight: 1.6 }, // Used in InfoItem value
    body2: { fontSize: '0.875rem', fontWeight: 400, color: '#4b5563' },
    caption: { fontSize: '0.75rem', fontWeight: 400, color: '#6b7280' },
    button: { textTransform: 'none', fontWeight: 600, fontSize: '0.9375rem' }, // Consistent button styling
  },
  shape: {
    borderRadius: 12, // More rounded corners from your theme (was 8)
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none', // Ensure no accidental background images
        },
        elevation1: { boxShadow: '0px 1px 3px rgba(0,0,0,0.05), 0px 1px 2px rgba(0,0,0,0.03)' },
        elevation3: { boxShadow: '0px 4px 12px rgba(0,0,0,0.08), 0px 2px 6px rgba(0,0,0,0.05)' }, // Softer shadow for SectionCard
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '8px', // Slightly less rounded than global shape for distinctiveness
          padding: '10px 20px',
        },
        containedPrimary: {
          '&:hover': {
            backgroundColor: '#1d4ed8', // Darken primary on hover
          },
        },
        outlinedPrimary: {
          borderColor: '#93c5fd', // Lighter border for outlined primary
          '&:hover': {
            borderColor: '#2563eb',
            backgroundColor: '#eff6ff', // Light primary background on hover
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#ffffff',
          boxShadow: '0px 2px 4px -1px rgba(0,0,0,0.06), 0px 4px 5px 0px rgba(0,0,0,0.04)', // Subtle shadow
          color: '#1f2937',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
        }
      }
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
        }
      }
    }
  },
});

// Helper function to format date strings
const formatDate = (dateString, includeTime = true) => {
  if (!dateString) return 'N/A';
  try {
    const options = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    if (includeTime) {
      options.hour = '2-digit';
      options.minute = '2-digit';
    }
    return new Date(dateString).toLocaleString('en-US', options);
  } catch (error) {
    console.error("Error formatting date:", dateString, error);
    return 'Invalid Date';
  }
};

const SectionCard = ({ title, icon, children }) => (
  <Paper elevation={3} sx={{ mb: {xs: 2.5, sm:3.5}, borderRadius: '16px', overflow: 'hidden', border: '1px solid', borderColor: 'grey.200' }}>
    <Box 
      sx={{ 
        p: {xs: 1.5, sm: 2}, 
        display: 'flex', 
        alignItems: 'center',
        backgroundColor: 'grey.100', // Lighter, less dominant header
        borderBottom: '1px solid', 
        borderColor: 'grey.200',
      }}
    >
      {icon && <Icon component={icon} sx={{ mr: 1.5, fontSize: '1.75rem', color: 'primary.main' }} />}
      <Typography variant="h5" component="h2" sx={{ fontWeight: '600', color: 'text.primary' }}>
        {title}
      </Typography>
    </Box>
    <Box sx={{ p: { xs: 2, sm: 2.5 }, backgroundColor: 'background.paper' }}>
      {children}
    </Box>
  </Paper>
);

const InfoItem = ({ label, value, chip, chipColor }) => (
  <Box sx={{ mb: 2, lineHeight: 1.7 }}>
    <Typography variant="subtitle2" sx={{ fontWeight: '600', color: 'text.secondary', mb: 0.25 }}>
      {label}:
    </Typography>
    {chip && value ? (
      <Chip label={value} color={chipColor || 'default'} size="small" sx={{ mt: 0.5, fontSize: '0.875rem' }} />
    ) : (
      <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', pl: 0, color: 'text.primary' }}>
        {value || <span style={{ color: sharedNoteTheme.palette.text.secondary, fontStyle: 'italic' }}>N/A</span>}
      </Typography>
    )}
  </Box>
);

const SharedNotePageInternal = () => {
  const { publicId } = useParams();
  const navigate = useNavigate();
  const [noteData, setNoteData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [copyEmrSuccess, setCopyEmrSuccess] = useState(false); // For EMR copy success

  useEffect(() => {
    const fetchNote = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`https://service.prestigedelta.com/review-note/${publicId}/`);
        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(`Failed to fetch note: ${response.status} ${response.statusText}. ${errorBody}`);
        }
        const data = await response.json();
        setNoteData(data);
      } catch (err) {
        setError(err.message);
        console.error("Error fetching shared note:", err);
      } finally {
        setLoading(false);
      }
    };

    if (publicId) {
      fetchNote();
    }
  }, [publicId]);

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2500);
    }).catch(err => {
      console.error('Failed to copy URL: ', err);
      // Optionally, show an error to the user that copy failed
    });
  };
  
  const handleLogin = () => navigate('/login'); 
  const handleSignUp = () => navigate('/register');

  const generateEmrFriendlyText = () => {
    if (!noteData || !noteData.public_doctor_note) return '';

    const { subjective, objective, assessment, plan, next_review, prescription, investigation } = noteData.public_doctor_note;
    let text = `SHARED CLINICAL NOTE - Public ID: ${publicId}\\n`;
    text += `Shared Date: ${formatDate(noteData.shared_at || new Date().toISOString(), false)}\\n\\n`;

    if (subjective) {
      text += "SUBJECTIVE:\\n";
      if (subjective.chief_complaint) text += `  Chief Complaint: ${subjective.chief_complaint}\\n`;
      if (subjective.history_of_present_illness) text += `  History of Present Illness: ${subjective.history_of_present_illness}\\n`;
      text += "\\n";
    }
    if (objective) {
      text += "OBJECTIVE:\\n";
      if (objective.examination_findings) text += `  Examination Findings: ${objective.examination_findings}\\n`;
      if (objective.investigations) text += `  Investigations Summary: ${objective.investigations}\\n`;
      text += "\\n";
    }
    if (assessment) {
      text += "ASSESSMENT:\\n";
      if (assessment.primary_diagnosis) text += `  Primary Diagnosis: ${assessment.primary_diagnosis}\\n`;
      if (assessment.differential_diagnosis) text += `  Differential Diagnosis: ${assessment.differential_diagnosis}\\n`;
      if (assessment.diagnosis_reasoning) text += `  Diagnosis Reasoning: ${assessment.diagnosis_reasoning}\\n`;
      if (assessment.status) text += `  Status: ${assessment.status}\\n`;
      text += "\\n";
    }
    if (plan) {
      text += "PLAN:\\n";
      if (plan.management) text += `  Management: ${plan.management}\\n`;
      if (plan.lifestyle_advice) text += `  Lifestyle Advice: ${plan.lifestyle_advice}\\n`;
      if (plan.follow_up) text += `  Follow-Up: ${plan.follow_up}\\n`;
      if (plan.patient_education) text += `  Patient Education: ${plan.patient_education}\\n`;
      if (plan.treatment_goal) text += `  Treatment Goal: ${plan.treatment_goal}\\n`;
      if (plan.plan_reasoning) text += `  Plan Reasoning: ${plan.plan_reasoning}\\n`;
      text += "\\n";
    }
    if (next_review) {
      text += `NEXT REVIEW: ${formatDate(next_review)}\\n\\n`;
    }
    if (prescription && prescription.length > 0) {
      text += "PRESCRIPTIONS:\\n";
      prescription.forEach(p => {
        text += `  - ${p.medication_name} ${p.dosage || ''}\\n`;
        if (p.route) text += `    Route: ${p.route}\\n`;
        if (p.interval) text += `    Interval: Every ${p.interval} hours\\n`;
        if (p.start_date) text += `    Start Date: ${formatDate(p.start_date, false)}\\n`;
        if (p.end_date) text += `    End Date: ${formatDate(p.end_date, false)}\\n`;
        if (p.instructions) text += `    Instructions: ${p.instructions}\\n`;
      });
      text += "\\n";
    }
    if (investigation && investigation.length > 0) {
      text += "INVESTIGATIONS ORDERED:\\n";
      investigation.forEach(inv => {
        text += `  - ${inv.test_type || 'N/A'}\\n`;
        if (inv.reason) text += `    Reason: ${inv.reason}\\n`;
        if (inv.scheduled_time) text += `    Scheduled Time: ${formatDate(inv.scheduled_time)}\\n`;
        if (inv.additional_instructions) text += `    Additional Instructions: ${inv.additional_instructions}\\n`;
      });
      text += "\\n";
    }
    return text;
  };

  const handleCopyNoteForEmr = () => {
    const noteText = generateEmrFriendlyText();
    if (noteText) {
      navigator.clipboard.writeText(noteText).then(() => {
        setCopyEmrSuccess(true);
        setTimeout(() => setCopyEmrSuccess(false), 2500);
      }).catch(err => {
        console.error('Failed to copy note text: ', err);
        // Optionally, show an error to the user
      });
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: 'background.default' }}>
        <CircularProgress size={50} />
        <Typography sx={{ml: 2, color: 'text.secondary'}}>Loading Clinical Note...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', p: {xs:2, sm:3}, backgroundColor: 'background.default' }}>
        <Paper elevation={3} sx={{p: {xs: 2, sm:4}, textAlign: 'center', maxWidth: '600px', width:'100%'}}>
          <Alert severity="error" icon={<InfoOutlinedIcon fontSize="inherit" />} sx={{ mb: 2.5, justifyContent:'center' }}>
            <Typography variant="h6" component="div" sx={{fontWeight: 600}}>Error Loading Note</Typography>
          </Alert>
          <Typography color="text.secondary" sx={{mb: 2.5}}>{error}</Typography>
          <Button variant="contained" onClick={() => window.location.reload()} size="large">
            Try Again
          </Button>
        </Paper>
      </Box>
    );
  }

  if (!noteData || !noteData.public_doctor_note) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', p:3, backgroundColor: 'background.default' }}>
         <Paper elevation={3} sx={{p: {xs: 2, sm:4}, textAlign: 'center', maxWidth: '600px', width:'100%'}}>
          <Alert severity="warning" icon={<InfoOutlinedIcon fontSize="inherit" />} sx={{ mb: 2, justifyContent:'center'}}>
            <Typography variant="h6" component="div" sx={{fontWeight: 600}}>Note Not Found</Typography>
          </Alert>
          <Typography color="text.secondary">No clinical note data was found for this link, or it may have been removed.</Typography>
        </Paper>
      </Box>
    );
  }

  const { subjective, objective, assessment, plan, next_review, prescription, investigation } = noteData.public_doctor_note;
  const noteIsPopulated = 
    (subjective && Object.keys(subjective).some(k => subjective[k])) ||
    (objective && Object.keys(objective).some(k => objective[k])) ||
    (assessment && Object.keys(assessment).some(k => assessment[k])) ||
    (plan && Object.keys(plan).some(k => plan[k])) ||
    next_review ||
    (prescription && prescription.length > 0) ||
    (investigation && investigation.length > 0);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: 'background.default' }}>
      <CssBaseline /> 
      <AppBar position="sticky">
        <Container maxWidth="lg">
          <Toolbar disableGutters>
            <VerifiedUserIcon sx={{ color: 'primary.main', fontSize: '2.5rem', mr: 1.5 }} />
            <Typography variant="h5" component="div" sx={{ flexGrow: 1, fontWeight: 'bold', cursor: 'pointer' }} onClick={() => navigate('/')}>
              Prestige<span style={{color: sharedNoteTheme.palette.secondary.main}}>Health</span> <Typography component="span" variant="subtitle1" sx={{fontWeight: 400, color: 'text.secondary'}}>Shared Note</Typography>
            </Typography>
            <Button 
              color="primary" 
              variant="outlined" 
              startIcon={<LoginIcon />} 
              onClick={handleLogin} 
              sx={{ mr: 1.5 }}
            >
              Login
            </Button>
            <Button 
              color="secondary" // This will now use the new dark blue secondary color
              variant="contained" 
              startIcon={<PersonAddIcon />} 
              onClick={handleSignUp}
            >
              Sign Up
            </Button>
          </Toolbar>
        </Container>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: {xs: 3, sm: 5}, mb: 5, flexGrow: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: {xs: 3, sm: 4}, flexDirection: {xs: 'column', sm: 'row'} }}>
          <Box sx={{mb: {xs:2, sm:0}}}>
            <Typography variant="h2" component="h1" gutterBottom>
              Clinical Consultation Note
            </Typography>
            <Typography variant="subtitle1" sx={{ color: 'text.secondary', mb: 0.5 }}>
              This clinical note was securely shared on {formatDate(noteData.shared_at || new Date().toISOString(), false)}.
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary'}}>
              Public ID: {publicId}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: {xs: 'column', sm: 'row'}, gap: 1.5, alignItems: {xs: 'flex-start', sm: 'center'} }}>
            <Tooltip title={copyEmrSuccess ? "Note Copied!" : "Copy Note for EMR"} placement="top">
              <Button 
                variant="contained" // Changed to contained for better visibility
                color="primary" 
                onClick={handleCopyNoteForEmr} 
                startIcon={copyEmrSuccess ? <CheckCircleIcon /> : <ContentCopyIcon />} 
                size="medium"
                sx={{alignSelf: {xs: 'flex-start', sm: 'center'}}}
              >
                {copyEmrSuccess ? "Copied Note" : "Copy for EMR"}
              </Button>
            </Tooltip>
            <Tooltip title={copySuccess ? "Link Copied!" : "Copy Share Link"} placement="top">
              <Button 
                variant="outlined" 
                onClick={handleCopyToClipboard} 
                startIcon={copySuccess ? <CheckCircleIcon /> : <FileCopyIcon />} 
                size="medium"
                sx={{alignSelf: {xs: 'flex-start', sm: 'center'}}}
              >
                {copySuccess ? "Copied" : "Copy Link"}
              </Button>
            </Tooltip>
          </Box>
        </Box>

        {!noteIsPopulated && (
           <Paper elevation={2} sx={{ p: {xs:2, sm:4}, textAlign: 'center', mt: 3, backgroundColor: 'grey.100', border: '1px dashed', borderColor: 'grey.300' }}>
            <InfoOutlinedIcon sx={{fontSize: '3rem', color: 'text.secondary', mb: 1.5}}/>
            <Typography variant="h5" sx={{mb:1, color: 'text.primary'}}>Note Content Not Available</Typography>
            <Typography sx={{color: 'text.secondary', maxWidth: '600px', mx: 'auto'}}>The content for this shared clinical note is currently empty or has not been fully populated. Please check back later or contact the sender if you believe this is an error.</Typography>
          </Paper>
        )}

        {noteIsPopulated && (
          <Grid container spacing={{xs: 2.5, sm: 3.5}}>
            {(subjective?.chief_complaint || subjective?.history_of_present_illness) && (
            <Grid item xs={12} md={6}>
                <SectionCard title="Subjective" icon={SubjectIcon}>
                  {subjective.chief_complaint && <InfoItem label="Chief Complaint" value={subjective.chief_complaint} />}
                  {subjective.history_of_present_illness && <InfoItem label="History of Present Illness" value={subjective.history_of_present_illness} />}
                </SectionCard>
            </Grid>
            )}
            
            {(objective?.examination_findings || objective?.investigations) && (
            <Grid item xs={12} md={6}>
                <SectionCard title="Objective" icon={VisibilityIcon}>
                  {objective.examination_findings && <InfoItem label="Examination Findings" value={objective.examination_findings} />}
                  {objective.investigations && <InfoItem label="Investigations Summary" value={objective.investigations} />}
                </SectionCard>
            </Grid>
            )}

            {(assessment?.primary_diagnosis || assessment?.differential_diagnosis || assessment?.diagnosis_reasoning || assessment?.status) && (
            <Grid item xs={12} md={6}>
                <SectionCard title="Assessment" icon={AssessmentIcon}>
                  {assessment.primary_diagnosis && <InfoItem label="Primary Diagnosis" value={assessment.primary_diagnosis} />}
                  {assessment.differential_diagnosis && <InfoItem label="Differential Diagnosis" value={assessment.differential_diagnosis} />}
                  {assessment.diagnosis_reasoning && <InfoItem label="Diagnosis Reasoning" value={assessment.diagnosis_reasoning} />}
                  {assessment.status && (
                    <InfoItem label="Status" value={assessment.status} chip chipColor={
                      assessment.status.toLowerCase() === 'worsening' ? 'error' :
                      assessment.status.toLowerCase() === 'improving' ? 'success' :
                      assessment.status.toLowerCase() === 'stable' ? 'info' : 'default'
                    } />
                  )}
                </SectionCard>
            </Grid>
            )}

            {(plan?.management || plan?.lifestyle_advice || plan?.follow_up || plan?.patient_education || plan?.treatment_goal || plan?.plan_reasoning) && (
            <Grid item xs={12} md={6}>
                <SectionCard title="Plan" icon={PlaylistAddCheckIcon}>
                  {plan.management && <InfoItem label="Management" value={plan.management} />}
                  {plan.lifestyle_advice && <InfoItem label="Lifestyle Advice" value={plan.lifestyle_advice} />}
                  {plan.follow_up && <InfoItem label="Follow-Up" value={plan.follow_up} />}
                  {plan.patient_education && <InfoItem label="Patient Education" value={plan.patient_education} />}
                  {plan.treatment_goal && <InfoItem label="Treatment Goal" value={plan.treatment_goal} />}
                  {plan.plan_reasoning && <InfoItem label="Plan Reasoning" value={plan.plan_reasoning} />}
                </SectionCard>
            </Grid>
            )}
          </Grid>
        )}

        {next_review && noteIsPopulated && (
          <SectionCard title="Next Review" icon={EventIcon}>
            <Typography variant="h6" sx={{color: 'primary.dark', fontWeight: 500}}>
              {formatDate(next_review)}
            </Typography>
          </SectionCard>
        )}

        {prescription && prescription.length > 0 && noteIsPopulated && (
          <SectionCard title={`Prescriptions (${prescription.length})`} icon={LocalHospitalIcon}>
            <List disablePadding>
              {prescription.map((p, index) => (
                <React.Fragment key={index}>
                  <ListItem sx={{ display: 'block', py: 2, px: 0, borderBottom: index < prescription.length - 1 ? '1px solid ' + sharedNoteTheme.palette.grey[200] : 'none' }}>
                    <Typography variant="h6" component="div" sx={{ fontWeight: '600', color: 'text.primary', mb: 1 }}>
                      {p.medication_name} {p.dosage}
                    </Typography>
                    <Grid container spacing={{xs:1, sm:2}}>
                        <Grid item xs={12} sm={6} md={3}><InfoItem label="Route" value={p.route} /></Grid>
                        <Grid item xs={12} sm={6} md={3}><InfoItem label="Interval" value={p.interval ? `Every ${p.interval} hours` : 'N/A'} /></Grid>
                        <Grid item xs={12} sm={6} md={3}><InfoItem label="Start Date" value={formatDate(p.start_date, false)} /></Grid>
                        <Grid item xs={12} sm={6} md={3}><InfoItem label="End Date" value={formatDate(p.end_date, false)} /></Grid>
                    </Grid>
                    {p.instructions && <InfoItem label="Instructions" value={p.instructions} />}
                  </ListItem>
                </React.Fragment>
              ))}
            </List>
          </SectionCard>
        )}

        {investigation && investigation.length > 0 && noteIsPopulated && (
          <SectionCard title={`Investigations Ordered (${investigation.length})`} icon={ScienceIcon}>
            <List disablePadding>
              {investigation.map((inv, index) => (
                <React.Fragment key={index}>
                  <ListItem sx={{ display: 'block', py: 2, px: 0, borderBottom: index < investigation.length - 1 ? '1px solid ' + sharedNoteTheme.palette.grey[200] : 'none' }}>
                     <Typography variant="h6" component="div" sx={{ fontWeight: '600', color: 'text.primary', mb: 1 }}>
                      {inv.test_type || 'N/A'}
                    </Typography>
                    {inv.reason && <InfoItem label="Reason" value={inv.reason} />}
                    {inv.scheduled_time && <InfoItem label="Scheduled Time" value={formatDate(inv.scheduled_time)} />}
                    {inv.additional_instructions && <InfoItem label="Additional Instructions" value={inv.additional_instructions} />}
                  </ListItem>
                </React.Fragment>
              ))}
            </List>
          </SectionCard>
        )}
      </Container>

      <Paper 
        elevation={0} 
        square
        sx={{ 
          p: {xs: 3, sm: 5}, 
          mt: 'auto', // Pushes footer to bottom if content is short
          textAlign: 'center', 
          backgroundColor: 'primary.dark', // Darker footer for contrast
          color: 'primary.contrastText',
        }}
      >
        <Container maxWidth="md">
          <Typography variant="h4" component="h2" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.contrastText' }}>
            Streamline Your Clinical Workflow
          </Typography>
          <Typography variant="body1" sx={{ mb: 3.5, maxWidth: '700px', mx: 'auto', opacity: 0.85, color: 'primary.contrastText' }}>
            Join PrestigeHealth Notes to automate documentation, reduce administrative burden, and dedicate more time to patient care. Secure, AI-powered, and designed for modern healthcare professionals.
          </Typography>
          <Box>
            <Button 
              variant="contained" 
              size="large" 
              onClick={handleSignUp}
              color="primary" // Changed from secondary to primary
              sx={{ 
                mr: {xs:0, sm:2}, 
                mb: {xs:2, sm:0}, 
                px: {xs:3, sm:4}, py: {xs:1.25, sm:1.5}
              }}
              startIcon={<PersonAddIcon />}
            >
              Get Started For Free
            </Button>
            <Button 
              variant="outlined" 
              size="large" 
              onClick={handleLogin}
              sx={{ 
                color: 'white', 
                borderColor: 'rgba(255,255,255,0.5)', 
                '&:hover': { 
                  backgroundColor: 'rgba(255,255,255,0.08)', 
                  borderColor: 'white' 
                },
                px: {xs:3, sm:4}, py: {xs:1.25, sm:1.5}
              }}
              startIcon={<LoginIcon />}
            >
              Access Your Account
            </Button>
          </Box>
        </Container>
      </Paper>

      <Box component="footer" sx={{ textAlign: 'center', py: 2.5, backgroundColor: 'grey.200', borderTop: '1px solid', borderColor: 'grey.300' }}>
        <Typography variant="body2" color="text.secondary">
          &copy; {new Date().getFullYear()} PrestigeHealth Notes. All Rights Reserved.
        </Typography>
        <Typography variant="caption" color="text.secondary">
           <Link href="/privacy-policy" color="inherit" sx={{'&:hover': {textDecoration: 'underline'}}}>Privacy Policy</Link> &bull; <Link href="/terms-of-service" color="inherit" sx={{'&:hover': {textDecoration: 'underline'}}}>Terms of Service</Link>
        </Typography>
      </Box>
    </Box>
  );
};

// Wrap the main component with ThemeProvider
const SharedNotePage = () => (
  <ThemeProvider theme={sharedNoteTheme}>
    <SharedNotePageInternal />
  </ThemeProvider>
);

export default SharedNotePage;
