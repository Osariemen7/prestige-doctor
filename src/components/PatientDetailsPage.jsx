import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Tabs,
  Tab,
  Typography,
  Chip,
  IconButton,
  Grid,
  Card,
  CardContent,
  Avatar,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Stack,
  alpha,
  useTheme,
  CircularProgress,
  Paper,
  Divider,
  Button,
  Tooltip,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  FavoriteBorder as HeartIcon,
  LocalHospital as HospitalIcon,
  Description as FileIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Cake as CakeIcon,
  ExpandMore as ExpandMoreIcon,
  Message as MessageIcon,
  Call as CallIcon,
  SentimentSatisfiedAlt as MoodIcon,
  FlashOn as EnergyIcon,
  Bedtime as SleepIcon,
  ReportProblem as PainIcon,
  Notes as NoteIcon,
  Psychology as StressIcon,
  SelfImprovement as ClarityIcon,
  Restaurant as AppetiteIcon,
  Healing as DigestionIcon,
  DirectionsRun as ActivityIcon,
  Groups as SocialIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import MetricChart from './MetricChart';
import { getPatientDetails } from '../services/providerDashboardApi';

const PatientDetailsPage = () => {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const [selectedTab, setSelectedTab] = useState(0);
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const handleMessagePatient = () => {
    navigate(`/messages/${patientId}`);
  };

  const handleCallPatient = (phoneNumber) => {
    if (phoneNumber) {
      window.location.href = `tel:${phoneNumber}`;
    }
  };

  useEffect(() => {
    fetchPatient();
  }, [patientId]);

  const fetchPatient = async () => {
    try {
      setLoading(true);
      const data = await getPatientDetails(patientId);
      setPatient(data);
    } catch (err) {
      console.error('Error fetching patient:', err);
      setError('Failed to load patient details');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch {
      return 'Invalid date';
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMM dd, yyyy HH:mm');
    } catch {
      return 'Invalid date';
    }
  };

  const calculateAge = (dob) => {
    if (!dob) return 'N/A';
    try {
      const birthDate = new Date(dob);
      const ageDiff = Date.now() - birthDate.getTime();
      const ageDate = new Date(ageDiff);
      return Math.abs(ageDate.getUTCFullYear() - 1970);
    } catch {
      return 'N/A';
    }
  };

  const getStatusConfig = (status) => {
    const configs = {
      active: { color: theme.palette.success.main, label: 'Active', icon: CheckCircleIcon },
      pending: { color: theme.palette.warning.main, label: 'Pending', icon: ScheduleIcon },
      churned: { color: theme.palette.error.main, label: 'Churned', icon: WarningIcon },
      no_subscription: { color: theme.palette.grey[500], label: 'No Subscription', icon: WarningIcon },
    };
    return configs[status] || configs.no_subscription;
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          bgcolor: 'background.default',
        }}
      >
        <CircularProgress size={60} sx={{ color: 'primary.main', mb: 3 }} />
        <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 500 }}>
          Loading Patient Details...
        </Typography>
      </Box>
    );
  }

  if (error || !patient) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          bgcolor: 'background.default',
        }}
      >
        <WarningIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
        <Typography variant="h6" color="text.secondary">
          {error || 'Patient not found'}
        </Typography>
        <IconButton onClick={() => navigate(-1)} sx={{ mt: 2 }}>
          <ArrowBackIcon />
        </IconButton>
      </Box>
    );
  }

  // Extract data from the correct structure
  const profileData = patient?.profile_data || {};
  const demographics = profileData.demographics || {};
  const geneticProxies = profileData.genetic_proxies || {};
  const lifestyle = profileData.lifestyle || {};
  const clinicalStatus = profileData.clinical_status || {};
  const carePlan = patient?.remote_care_plan || {};
  const medicalReviews = patient?.medical_reviews || {};
  const fullMedicalReviews = patient?.full_medical_reviews || [];
  const metrics = patient?.metrics || [];
  const wellnessLogs = patient?.wellness_logs || [];
  const latestWellnessLog = wellnessLogs.length > 0 ? wellnessLogs[0] : null;

  const statusConfig = getStatusConfig(patient.subscription_status);
  const StatusIcon = statusConfig.icon;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        pb: { xs: 2, md: 4 },
      }}
    >
      {/* Header */}
      <Paper
        elevation={0}
        sx={{
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
          color: 'white',
          py: { xs: 2, md: 3 },
          mb: { xs: 2, md: 3 },
          position: 'sticky',
          top: 0,
          zIndex: 1000,
        }}
      >
        <Container maxWidth="xl" sx={{ px: { xs: 2, sm: 3 } }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <IconButton
              onClick={() => navigate(-1)}
              sx={{
                color: 'white',
                bgcolor: 'rgba(255,255,255,0.1)',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' },
              }}
            >
              <ArrowBackIcon />
            </IconButton>
            <Avatar
              sx={{
                width: { xs: 48, md: 64 },
                height: { xs: 48, md: 64 },
                bgcolor: 'rgba(255,255,255,0.2)',
                fontSize: { xs: '1.5rem', md: '2rem' },
                fontWeight: 700,
              }}
            >
              {demographics.first_name?.[0]?.toUpperCase() || 'P'}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="h5"
                fontWeight={700}
                sx={{
                  fontSize: { xs: '1.25rem', md: '1.5rem' },
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {`${demographics.first_name || ''} ${demographics.last_name || ''}`.trim() || 'Unknown Patient'}
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ mt: 0.5 }}>
                <Typography variant="body2" sx={{ opacity: 0.9, fontSize: { xs: '0.8rem', md: '0.875rem' } }}>
                  {calculateAge(demographics.date_of_birth)} years • {demographics.gender || 'N/A'}
                </Typography>
                <Chip
                  icon={<StatusIcon sx={{ fontSize: 14 }} />}
                  label={statusConfig.label}
                  size="small"
                  sx={{
                    bgcolor: 'rgba(255,255,255,0.2)',
                    color: 'white',
                    height: 24,
                    fontSize: '0.75rem',
                    '& .MuiChip-icon': { color: 'white' },
                  }}
                />
              </Stack>
            </Box>
            {/* Action Buttons */}
            <Stack direction="row" spacing={1} sx={{ display: { xs: 'none', sm: 'flex' } }}>
              {demographics.phone_number && (
                <Tooltip title="Call Patient">
                  <IconButton
                    onClick={() => handleCallPatient(demographics.phone_number)}
                    sx={{
                      color: 'white',
                      bgcolor: 'rgba(255,255,255,0.2)',
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                    }}
                  >
                    <CallIcon />
                  </IconButton>
                </Tooltip>
              )}
              <Button
                variant="contained"
                startIcon={<MessageIcon />}
                onClick={handleMessagePatient}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  textTransform: 'none',
                  fontWeight: 600,
                  '&:hover': {
                    bgcolor: 'rgba(255,255,255,0.3)',
                  },
                }}
              >
                Message
              </Button>
            </Stack>
          </Stack>
          {/* Mobile Action Buttons */}
          <Stack direction="row" spacing={1} sx={{ mt: 2, display: { xs: 'flex', sm: 'none' } }}>
            {demographics.phone_number && (
              <Button
                variant="contained"
                startIcon={<CallIcon />}
                onClick={() => handleCallPatient(demographics.phone_number)}
                fullWidth
                sx={{
                  bgcolor: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  textTransform: 'none',
                  fontWeight: 600,
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                }}
              >
                Call
              </Button>
            )}
            <Button
              variant="contained"
              startIcon={<MessageIcon />}
              onClick={handleMessagePatient}
              fullWidth
              sx={{
                bgcolor: 'rgba(255,255,255,0.2)',
                color: 'white',
                textTransform: 'none',
                fontWeight: 600,
                '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
              }}
            >
              Message
            </Button>
          </Stack>
        </Container>
      </Paper>

      <Container maxWidth="xl" sx={{ px: { xs: 2, sm: 3 } }}>
        {/* Tabs */}
        <Paper elevation={1} sx={{ borderRadius: 2, mb: 3 }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', overflowX: 'auto' }}>
            <Tabs
              value={selectedTab}
              onChange={(e, newValue) => setSelectedTab(newValue)}
              variant="scrollable"
              scrollButtons="auto"
              allowScrollButtonsMobile
              sx={{
                minHeight: { xs: 48, md: 56 },
                '& .MuiTab-root': {
                  minHeight: { xs: 48, md: 56 },
                  fontSize: { xs: '0.8rem', md: '0.875rem' },
                  fontWeight: 600,
                  textTransform: 'none',
                  minWidth: { xs: 80, sm: 120 },
                  px: { xs: 1.5, sm: 2 },
                },
              }}
            >
              <Tab
                label={
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <span>Overview</span>
                  </Stack>
                }
              />
              <Tab
                label={
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <span>Reviews</span>
                    {medicalReviews.medical_history && (
                      <Chip
                        label={medicalReviews.medical_history.length}
                        size="small"
                        sx={{
                          height: 18,
                          fontSize: '0.65rem',
                          bgcolor: alpha(theme.palette.primary.main, 0.1),
                          color: 'primary.main',
                        }}
                      />
                    )}
                  </Stack>
                }
              />
              <Tab
                label={
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <span>Care Plan</span>
                  </Stack>
                }
              />
              <Tab
                label={
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <span>Metrics</span>
                    {metrics && (
                      <Chip
                        label={metrics.filter(m => m.is_active).length}
                        size="small"
                        sx={{
                          height: 18,
                          fontSize: '0.65rem',
                          bgcolor: alpha(theme.palette.primary.main, 0.1),
                          color: 'primary.main',
                        }}
                      />
                    )}
                  </Stack>
                }
              />              <Tab
                label={
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <span>Wellness</span>
                    {wellnessLogs.length > 0 && (
                      <Chip
                        label={wellnessLogs.length}
                        size="small"
                        sx={{
                          height: 18,
                          fontSize: '0.65rem',
                          bgcolor: alpha(theme.palette.primary.main, 0.1),
                          color: 'primary.main',
                        }}
                      />
                    )}
                  </Stack>
                }
              />            </Tabs>
          </Box>

          {/* Tab Content */}
          <Box sx={{ p: { xs: 2, sm: 3 } }}>
            {/* Overview Tab */}
            {selectedTab === 0 && (
              <Stack spacing={3}>
                {/* Profile Information */}
                <Card elevation={0} sx={{ borderRadius: 2, border: 1, borderColor: 'divider' }}>
                  <CardContent>
                    <Typography variant="h6" fontWeight={600} gutterBottom sx={{ fontSize: { xs: '1rem', md: '1.25rem' } }}>
                      Profile Information
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <PhoneIcon sx={{ fontSize: 20, color: 'primary.main' }} />
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="caption" color="text.secondary">
                              Phone Number
                            </Typography>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Typography variant="body2" fontWeight={600}>
                                {demographics.phone_number || 'N/A'}
                              </Typography>
                              {demographics.phone_number && (
                                <Tooltip title="Call Patient">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleCallPatient(demographics.phone_number)}
                                    sx={{
                                      width: 28,
                                      height: 28,
                                      bgcolor: 'primary.main',
                                      color: 'white',
                                      '&:hover': {
                                        bgcolor: 'primary.dark',
                                      },
                                    }}
                                  >
                                    <CallIcon sx={{ fontSize: 16 }} />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Stack>
                          </Box>
                        </Stack>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <CakeIcon sx={{ fontSize: 20, color: 'primary.main' }} />
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              Date of Birth
                            </Typography>
                            <Typography variant="body2" fontWeight={600}>
                              {formatDate(demographics.date_of_birth)}
                            </Typography>
                          </Box>
                        </Stack>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <HeartIcon sx={{ fontSize: 20, color: 'error.main' }} />
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              Blood Type
                            </Typography>
                            <Typography variant="body2" fontWeight={600}>
                              {geneticProxies.blood_type || 'N/A'}
                            </Typography>
                          </Box>
                        </Stack>
                      </Grid>
                      {demographics.email && (
                        <Grid item xs={12} sm={6}>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <EmailIcon sx={{ fontSize: 20, color: 'primary.main' }} />
                            <Box>
                              <Typography variant="caption" color="text.secondary">
                                Email
                              </Typography>
                              <Typography variant="body2" fontWeight={600} sx={{ wordBreak: 'break-word' }}>
                                {demographics.email}
                              </Typography>
                            </Box>
                          </Stack>
                        </Grid>
                      )}
                    </Grid>
                  </CardContent>
                </Card>

                {/* Health Summary */}
                {medicalReviews && Object.keys(medicalReviews).length > 0 && (
                  <Card elevation={0} sx={{ borderRadius: 2, border: 1, borderColor: 'divider' }}>
                    <CardContent>
                      <Typography variant="h6" fontWeight={600} gutterBottom sx={{ fontSize: { xs: '1rem', md: '1.25rem' } }}>
                        Health Summary
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={6} sm={4}>
                          <Box
                            sx={{
                              textAlign: 'center',
                              p: 2,
                              borderRadius: 2,
                              bgcolor: alpha(theme.palette.primary.main, 0.05),
                            }}
                          >
                            <Typography variant="caption" color="text.secondary">
                              Total Reviews
                            </Typography>
                            <Typography variant="h4" fontWeight={700} color="primary.main" sx={{ fontSize: { xs: '1.5rem', md: '2rem' } }}>
                              {fullMedicalReviews.length}
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={6} sm={4}>
                          <Box
                            sx={{
                              textAlign: 'center',
                              p: 2,
                              borderRadius: 2,
                              bgcolor: alpha(theme.palette.success.main, 0.05),
                            }}
                          >
                            <Typography variant="caption" color="text.secondary">
                              Last 30 Days
                            </Typography>
                            <Typography variant="h4" fontWeight={700} color="success.main" sx={{ fontSize: { xs: '1.5rem', md: '2rem' } }}>
                              {fullMedicalReviews.filter(review => {
                                const reviewDate = new Date(review.created);
                                const thirtyDaysAgo = new Date();
                                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                                return reviewDate >= thirtyDaysAgo;
                              }).length}
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <Box
                            sx={{
                              textAlign: 'center',
                              p: 2,
                              borderRadius: 2,
                              bgcolor: alpha(theme.palette.warning.main, 0.05),
                            }}
                          >
                            <Typography variant="caption" color="text.secondary">
                              Pending AI Reviews
                            </Typography>
                            <Typography variant="h4" fontWeight={700} color="warning.main" sx={{ fontSize: { xs: '1.5rem', md: '2rem' } }}>
                              {patient.pending_ai_review_count || 0}
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                )}

                {/* Wellness Monitoring */}
                {latestWellnessLog && (
                  <Card elevation={0} sx={{ borderRadius: 2, border: 1, borderColor: 'divider' }}>
                    <CardContent sx={{ pb: 1 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                        <Typography variant="h6" fontWeight={600} sx={{ fontSize: { xs: '1rem', md: '1.25rem' } }}>
                          Latest Wellness Check-in
                        </Typography>
                        <Chip 
                          label={`Score: ${latestWellnessLog.wellness_score}/100`}
                          color={latestWellnessLog.wellness_score > 70 ? "success" : latestWellnessLog.wellness_score > 40 ? "warning" : "error"}
                          size="small"
                          sx={{ fontWeight: 700 }}
                        />
                      </Stack>
                      
                      <Accordion elevation={0} sx={{ '&:before': { display: 'none' }, bgcolor: alpha(theme.palette.primary.main, 0.02), borderRadius: 2 }}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Grid container spacing={2}>
                            <Grid item xs={6} sm={3}>
                              <Stack direction="row" spacing={1} alignItems="center">
                                <MoodIcon sx={{ color: 'warning.main' }} />
                                <Box>
                                  <Typography variant="caption" color="text.secondary">Mood</Typography>
                                  <Typography variant="body2" fontWeight={600}>{latestWellnessLog.mood_label}</Typography>
                                </Box>
                              </Stack>
                            </Grid>
                            <Grid item xs={6} sm={3}>
                              <Stack direction="row" spacing={1} alignItems="center">
                                <EnergyIcon sx={{ color: 'primary.main' }} />
                                <Box>
                                  <Typography variant="caption" color="text.secondary">Energy</Typography>
                                  <Typography variant="body2" fontWeight={600}>{latestWellnessLog.energy_label}</Typography>
                                </Box>
                              </Stack>
                            </Grid>
                            <Grid item xs={6} sm={3}>
                              <Stack direction="row" spacing={1} alignItems="center">
                                <SleepIcon sx={{ color: 'info.main' }} />
                                <Box>
                                  <Typography variant="caption" color="text.secondary">Sleep</Typography>
                                  <Typography variant="body2" fontWeight={600}>{latestWellnessLog.sleep_label}</Typography>
                                </Box>
                              </Stack>
                            </Grid>
                            <Grid item xs={6} sm={3}>
                              <Stack direction="row" spacing={1} alignItems="center">
                                <PainIcon sx={{ color: latestWellnessLog.pain_level > 0 ? 'error.main' : 'success.main' }} />
                                <Box>
                                  <Typography variant="caption" color="text.secondary">Pain</Typography>
                                  <Typography variant="body2" fontWeight={600}>{latestWellnessLog.pain_level}/10</Typography>
                                </Box>
                              </Stack>
                            </Grid>
                          </Grid>
                        </AccordionSummary>
                        <AccordionDetails>
                          <Divider sx={{ mb: 2 }} />
                          <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                              <Stack spacing={2}>
                                {latestWellnessLog.stress_label && (
                                  <Box>
                                    <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                      <StressIcon sx={{ fontSize: 14 }} /> Stress Level
                                    </Typography>
                                    <Typography variant="body2">{latestWellnessLog.stress_label}</Typography>
                                  </Box>
                                )}
                                {latestWellnessLog.mental_clarity_label && (
                                  <Box>
                                    <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                      <ClarityIcon sx={{ fontSize: 14 }} /> Mental Clarity
                                    </Typography>
                                    <Typography variant="body2">{latestWellnessLog.mental_clarity_label}</Typography>
                                  </Box>
                                )}
                                {latestWellnessLog.appetite_label && (
                                  <Box>
                                    <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                      <AppetiteIcon sx={{ fontSize: 14 }} /> Appetite
                                    </Typography>
                                    <Typography variant="body2">{latestWellnessLog.appetite_label}</Typography>
                                  </Box>
                                )}
                                {latestWellnessLog.digestion_label && (
                                  <Box>
                                    <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                      <DigestionIcon sx={{ fontSize: 14 }} /> Digestion
                                    </Typography>
                                    <Typography variant="body2">{latestWellnessLog.digestion_label}</Typography>
                                  </Box>
                                )}
                              </Stack>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                              <Stack spacing={2}>
                                {latestWellnessLog.lifestyle_label && (
                                  <Box>
                                    <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                      <ActivityIcon sx={{ fontSize: 14 }} /> Lifestyle Activity
                                    </Typography>
                                    <Typography variant="body2">{latestWellnessLog.lifestyle_label}</Typography>
                                  </Box>
                                )}
                                {latestWellnessLog.social_label && (
                                  <Box>
                                    <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                      <SocialIcon sx={{ fontSize: 14 }} /> Social Engagement
                                    </Typography>
                                    <Typography variant="body2">{latestWellnessLog.social_label}</Typography>
                                  </Box>
                                )}
                                <Box>
                                  <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <SleepIcon sx={{ fontSize: 14 }} /> Sleep Duration
                                  </Typography>
                                  <Typography variant="body2">{latestWellnessLog.sleep_hours} hours</Typography>
                                </Box>
                                {latestWellnessLog.pain_location && (
                                  <Box>
                                    <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                      <PainIcon sx={{ fontSize: 14 }} /> Pain Location
                                    </Typography>
                                    <Typography variant="body2">{latestWellnessLog.pain_location}</Typography>
                                  </Box>
                                )}
                              </Stack>
                            </Grid>
                          </Grid>
                          
                          <Box sx={{ mt: 2 }}>
                            {latestWellnessLog.symptoms && latestWellnessLog.symptoms.length > 0 && (
                              <Box sx={{ mb: 2 }}>
                                <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                                  <WarningIcon sx={{ fontSize: 14 }} /> Reported Symptoms
                                </Typography>
                                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                  {latestWellnessLog.symptoms.map((symptom, i) => (
                                    <Chip key={i} label={symptom} size="small" variant="outlined" />
                                  ))}
                                </Stack>
                              </Box>
                            )}
                            
                            {latestWellnessLog.notes && (
                              <Box>
                                <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <NoteIcon sx={{ fontSize: 14 }} /> Patient Notes
                                </Typography>
                                <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
                                  "{latestWellnessLog.notes}"
                                </Typography>
                              </Box>
                            )}
                            
                            <Typography variant="caption" color="text.disabled" sx={{ textAlign: 'right', display: 'block', mt: 2 }}>
                              Logged on {formatDateTime(latestWellnessLog.created_at)}
                            </Typography>
                          </Box>
                        </AccordionDetails>
                      </Accordion>
                      <Button 
                        fullWidth 
                        variant="outlined" 
                        size="small" 
                        sx={{ mt: 2, textTransform: 'none' }}
                        onClick={() => setSelectedTab(4)}
                      >
                        View 14-Day Wellness Trends
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {/* Chronic Conditions */}
                {clinicalStatus.chronic_conditions && clinicalStatus.chronic_conditions.length > 0 && (
                  <Card elevation={0} sx={{ borderRadius: 2, border: 1, borderColor: 'divider' }}>
                    <CardContent>
                      <Typography variant="h6" fontWeight={600} gutterBottom sx={{ fontSize: { xs: '1rem', md: '1.25rem' } }}>
                        Chronic Conditions
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        {clinicalStatus.chronic_conditions.map((condition, index) => (
                          <Chip
                            key={index}
                            label={condition}
                            sx={{
                              bgcolor: alpha(theme.palette.error.main, 0.1),
                              color: 'error.main',
                              fontWeight: 600,
                            }}
                          />
                        ))}
                      </Stack>
                    </CardContent>
                  </Card>
                )}
              </Stack>
            )}

            {/* Medical Reviews Tab */}
            {selectedTab === 1 && (
              <Stack spacing={2}>
                {fullMedicalReviews && fullMedicalReviews.length > 0 ? (
                  fullMedicalReviews.map((review, idx) => (
                    <Accordion key={idx} sx={{ borderRadius: 2, '&:before': { display: 'none' }, border: 1, borderColor: 'divider' }}>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Stack direction="row" spacing={2} alignItems="center" sx={{ width: '100%', overflow: 'hidden' }}>
                          <HospitalIcon color="primary" />
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography fontWeight={600} sx={{ fontSize: { xs: '0.9rem', md: '1rem' } }}>
                              Review #{fullMedicalReviews.length - idx}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', md: '0.75rem' } }}>
                              {formatDateTime(review.created)}
                            </Typography>
                          </Box>
                          {review.review_status && (
                            <Chip
                              label={review.review_status}
                              size="small"
                              color={review.review_status === 'completed' ? 'success' : 'warning'}
                              sx={{ fontSize: { xs: '0.7rem', md: '0.75rem' } }}
                            />
                          )}
                        </Stack>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Stack spacing={2}>
                          {review.chief_complaint && (
                            <Box>
                              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                Chief Complaint
                              </Typography>
                              <Typography variant="body2" sx={{ fontSize: { xs: '0.85rem', md: '0.875rem' } }}>
                                {review.chief_complaint}
                              </Typography>
                            </Box>
                          )}
                          {review.assessment_diagnosis && (
                            <Box>
                              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                Diagnosis
                              </Typography>
                              <Typography variant="body2" sx={{ fontSize: { xs: '0.85rem', md: '0.875rem' } }}>
                                {review.assessment_diagnosis}
                              </Typography>
                            </Box>
                          )}
                          {review.management_plan && (
                            <Box>
                              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                Management Plan
                              </Typography>
                              <Typography variant="body2" sx={{ fontSize: { xs: '0.85rem', md: '0.875rem' } }}>
                                {review.management_plan}
                              </Typography>
                            </Box>
                          )}
                        </Stack>
                      </AccordionDetails>
                    </Accordion>
                  ))
                ) : (
                  <Box sx={{ textAlign: 'center', py: 8 }}>
                    <FileIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary">
                      No medical reviews available
                    </Typography>
                  </Box>
                )}
              </Stack>
            )}

            {/* Care Plan Tab */}
            {selectedTab === 2 && (
              <Stack spacing={3}>
                {carePlan && Object.keys(carePlan).length > 0 ? (
                  <Card elevation={0} sx={{ borderRadius: 2, border: 1, borderColor: 'divider' }}>
                    <CardContent>
                      <Typography variant="h6" fontWeight={600} gutterBottom sx={{ fontSize: { xs: '1rem', md: '1.25rem' } }}>
                        Remote Care Plan
                      </Typography>
                      <Stack spacing={2}>
                        {carePlan.start_date && (
                          <Box>
                            <Typography variant="caption" color="text.secondary" fontWeight={600}>
                              Start Date
                            </Typography>
                            <Typography variant="body2" sx={{ fontSize: { xs: '0.85rem', md: '0.875rem' } }}>
                              {formatDate(carePlan.start_date)}
                            </Typography>
                          </Box>
                        )}
                        {carePlan.prevention_focus && (
                          <Box>
                            <Typography variant="caption" color="text.secondary" fontWeight={600}>
                              Prevention Focus
                            </Typography>
                            <Typography variant="body2" sx={{ fontSize: { xs: '0.85rem', md: '0.875rem' } }}>
                              {carePlan.prevention_focus}
                            </Typography>
                          </Box>
                        )}
                      </Stack>
                    </CardContent>
                  </Card>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 8 }}>
                    <FileIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary">
                      No care plan available
                    </Typography>
                  </Box>
                )}
              </Stack>
            )}

            {/* Metrics Tab */}
            {selectedTab === 3 && (
              <Stack spacing={2}>
                {metrics && metrics.length > 0 ? (
                  metrics.filter(m => m.is_active).map((metric, idx) => (
                    <Card key={idx} elevation={0} sx={{ borderRadius: 2, border: 1, borderColor: 'divider' }}>
                      <CardContent>
                        <Typography variant="h6" fontWeight={600} gutterBottom sx={{ fontSize: { xs: '1rem', md: '1.25rem' } }}>
                          {metric.name || 'Health Metric'}
                        </Typography>
                        {metric.records && metric.records.length > 0 && (
                          <Box sx={{ mt: 2 }}>
                            <MetricChart metricData={metric} />
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Box sx={{ textAlign: 'center', py: 8 }}>
                    <TrendingUpIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary">
                      No metrics available
                    </Typography>
                  </Box>
                )}
              </Stack>
            )}

            {/* Wellness Tab */}
            {selectedTab === 4 && (
              <Stack spacing={3}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="h6" fontWeight={600}>
                    Subjective Wellness Monitoring
                  </Typography>
                  {wellnessLogs.length > 0 && (
                    <Chip 
                      label={`Average Score: ${Math.round(wellnessLogs.slice(0, 14).reduce((acc, log) => acc + log.wellness_score, 0) / Math.min(wellnessLogs.length, 14))}/100`}
                      color="primary"
                      variant="outlined"
                      sx={{ fontWeight: 600 }}
                    />
                  )}
                </Box>
                
                {wellnessLogs && wellnessLogs.length > 0 ? (
                  <>
                    <Card elevation={0} sx={{ borderRadius: 2, border: 1, borderColor: 'divider' }}>
                      <CardContent>
                        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                          Wellness Score Trend (Last 14 Logs)
                        </Typography>
                        <Box sx={{ height: 300, mt: 2 }}>
                          <MetricChart 
                            metricData={{
                              name: 'Wellness Score',
                              records: wellnessLogs.slice(0, 14).map(log => ({
                                timestamp: log.created_at,
                                value: log.wellness_score
                              })).reverse(),
                              normal_range_min: 70,
                              normal_range_max: 100,
                              unit: ''
                            }} 
                          />
                        </Box>
                      </CardContent>
                    </Card>

                    <Typography variant="subtitle1" fontWeight={600} sx={{ mt: 2 }}>
                      Check-in History
                    </Typography>
                    
                    <Stack spacing={2}>
                      {wellnessLogs.slice(0, 14).map((log, idx) => (
                        <Card key={idx} elevation={0} sx={{ borderRadius: 2, border: 1, borderColor: 'divider' }}>
                          <CardContent>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                              <Box>
                                <Typography variant="subtitle2" fontWeight={700}>
                                  {formatDateTime(log.created_at)}
                                </Typography>
                              </Box>
                              <Chip 
                                label={`Score: ${log.wellness_score}/100`}
                                color={log.wellness_score > 70 ? "success" : log.wellness_score > 40 ? "warning" : "error"}
                                size="small"
                                sx={{ fontWeight: 700 }}
                              />
                            </Stack>
                            
                            <Grid container spacing={2}>
                              <Grid item xs={6} sm={4} md={2}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <MoodIcon sx={{ color: 'warning.main', fontSize: 20 }} />
                                  <Box>
                                    <Typography variant="caption" color="text.secondary">Mood</Typography>
                                    <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.75rem' }}>{log.mood_label}</Typography>
                                  </Box>
                                </Stack>
                              </Grid>
                              <Grid item xs={6} sm={4} md={2}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <EnergyIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                                  <Box>
                                    <Typography variant="caption" color="text.secondary">Energy</Typography>
                                    <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.75rem' }}>{log.energy_label}</Typography>
                                  </Box>
                                </Stack>
                              </Grid>
                              <Grid item xs={6} sm={4} md={2}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <SleepIcon sx={{ color: 'info.main', fontSize: 20 }} />
                                  <Box>
                                    <Typography variant="caption" color="text.secondary">Sleep</Typography>
                                    <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.75rem' }}>{log.sleep_label}</Typography>
                                  </Box>
                                </Stack>
                              </Grid>
                              <Grid item xs={6} sm={4} md={2}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <StressIcon sx={{ color: 'secondary.main', fontSize: 20 }} />
                                  <Box>
                                    <Typography variant="caption" color="text.secondary">Stress</Typography>
                                    <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.75rem' }}>{log.stress_label || 'Normal'}</Typography>
                                  </Box>
                                </Stack>
                              </Grid>
                              <Grid item xs={6} sm={4} md={2}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <ClarityIcon sx={{ color: 'success.main', fontSize: 20 }} />
                                  <Box>
                                    <Typography variant="caption" color="text.secondary">Clarity</Typography>
                                    <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.75rem' }}>{log.mental_clarity_label || 'Clear'}</Typography>
                                  </Box>
                                </Stack>
                              </Box>
                              <Grid item xs={6} sm={4} md={2}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <PainIcon sx={{ color: log.pain_level > 0 ? 'error.main' : 'success.main', fontSize: 20 }} />
                                  <Box>
                                    <Typography variant="caption" color="text.secondary">Pain</Typography>
                                    <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.75rem' }}>{log.pain_level}/10</Typography>
                                  </Box>
                                </Stack>
                              </Grid>
                            </Grid>

                            <Grid container spacing={2} sx={{ mt: 1 }}>
                              <Grid item xs={6} sm={4} md={2}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <AppetiteIcon sx={{ color: 'orange', fontSize: 20 }} />
                                  <Box>
                                    <Typography variant="caption" color="text.secondary">Appetite</Typography>
                                    <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.75rem' }}>{log.appetite_label || 'Normal'}</Typography>
                                  </Box>
                                </Stack>
                              </Grid>
                              <Grid item xs={6} sm={4} md={2}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <DigestionIcon sx={{ color: 'brown', fontSize: 20 }} />
                                  <Box>
                                    <Typography variant="caption" color="text.secondary">Digestion</Typography>
                                    <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.75rem' }}>{log.digestion_label || 'Normal'}</Typography>
                                  </Box>
                                </Stack>
                              </Grid>
                              <Grid item xs={6} sm={4} md={2}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <ActivityIcon sx={{ color: 'blue', fontSize: 20 }} />
                                  <Box>
                                    <Typography variant="caption" color="text.secondary">Activity</Typography>
                                    <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.75rem' }}>{log.lifestyle_label || 'Active'}</Typography>
                                  </Box>
                                </Stack>
                              </Grid>
                              <Grid item xs={6} sm={4} md={2}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <SocialIcon sx={{ color: 'purple', fontSize: 20 }} />
                                  <Box>
                                    <Typography variant="caption" color="text.secondary">Social</Typography>
                                    <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.75rem' }}>{log.social_label || 'Social'}</Typography>
                                  </Box>
                                </Stack>
                              </Grid>
                            </Grid>
                            
                            {(log.notes || (log.symptoms && log.symptoms.length > 0)) && (
                              <Box sx={{ mt: 2, pt: 1, borderTop: 1, borderColor: 'divider' }}>
                                {log.symptoms && log.symptoms.length > 0 && (
                                  <Box sx={{ mb: 1 }}>
                                    <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">
                                      Reported Symptoms:
                                    </Typography>
                                    <Stack direction="row" spacing={0.5} flexWrap="wrap">
                                      {log.symptoms.map((s, i) => (
                                        <Chip key={i} label={s} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
                                      ))}
                                    </Stack>
                                  </Box>
                                )}
                                {log.notes && (
                                  <Box>
                                    <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">
                                      Patient Notes:
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', fontSize: '0.8rem' }}>
                                      "{log.notes}"
                                    </Typography>
                                  </Box>
                                )}
                              </Box>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </Stack>
                  </>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 8 }}>
                    <MoodIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary">
                      No wellness logs available for the last 14 days
                    </Typography>
                  </Box>
                )}
              </Stack>
            )}
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default PatientDetailsPage;
