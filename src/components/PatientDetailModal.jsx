import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Box,
  Tabs,
  Tab,
  Typography,
  Chip,
  IconButton,
  Divider,
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
} from '@mui/material';
import {
  Close as CloseIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  LocationOn as LocationIcon,
  FavoriteBorder as HeartIcon,
  LocalHospital as HospitalIcon,
  Description as FileIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Cake as CakeIcon,
  ExpandMore as ExpandMoreIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
  SentimentSatisfiedAlt as MoodIcon,
  FlashOn as EnergyIcon,
  Bedtime as SleepIcon,
  ReportProblem as PainIcon,
  Notes as NoteIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import MetricChart from './MetricChart';

const PatientDetailModal = ({ patient, onClose }) => {
  const [selectedTab, setSelectedTab] = useState(0);
  const theme = useTheme();

  // Extract data from the correct structure
  const profileData = patient?.profile_data || {};
  const demographics = profileData.demographics || {};
  const geneticProxies = profileData.genetic_proxies || {};
  const environment = profileData.environment || {};
  const lifestyle = profileData.lifestyle || {};
  const clinicalStatus = profileData.clinical_status || {};
  const carePlan = patient?.remote_care_plan || {};
  const medicalReviews = patient?.medical_reviews || {};
  const fullMedicalReviews = patient?.full_medical_reviews || [];
  const metrics = patient?.metrics || [];
  const wellnessLogs = patient?.wellness_logs || [];
  const latestWellnessLog = wellnessLogs.length > 0 ? wellnessLogs[0] : null;

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

  const getHealthScoreColor = (score) => {
    if (score >= 80) return theme.palette.success.main;
    if (score >= 60) return theme.palette.warning.main;
    return theme.palette.error.main;
  };

  const statusConfig = getStatusConfig(patient.subscription_status);
  const StatusIcon = statusConfig.icon;

  return (
    <Dialog 
      open={true} 
      onClose={onClose} 
      maxWidth="lg" 
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          maxHeight: '90vh',
        },
      }}
    >
      {/* Header */}
      <DialogTitle
        sx={{
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
          color: 'white',
          pb: 2,
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar
              sx={{
                width: 64,
                height: 64,
                bgcolor: 'rgba(255,255,255,0.2)',
                fontSize: '2rem',
                fontWeight: 700,
              }}
            >
              {demographics.first_name?.[0]?.toUpperCase() || 'P'}
            </Avatar>
            <Box>
              <Typography variant="h5" fontWeight={700}>
                {`${demographics.first_name || ''} ${demographics.last_name || ''}`.trim() || 'Unknown Patient'}
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  {calculateAge(demographics.date_of_birth)} years old • {demographics.gender || 'N/A'}
                </Typography>
                <Chip
                  icon={<StatusIcon sx={{ fontSize: 16 }} />}
                  label={statusConfig.label}
                  size="small"
                  sx={{
                    bgcolor: 'rgba(255,255,255,0.2)',
                    color: 'white',
                    '& .MuiChip-icon': { color: 'white' },
                  }}
                />
              </Stack>
            </Box>
          </Stack>
          <IconButton onClick={onClose} sx={{ color: 'white' }}>
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={selectedTab}
            onChange={(e, newValue) => setSelectedTab(newValue)}
            sx={{
              px: 2,
              '& .MuiTab-root': {
                fontWeight: 600,
                textTransform: 'none',
                minHeight: 56,
              },
            }}
          >
            <Tab label="Overview" />
            <Tab 
              label={
                <Stack direction="row" spacing={1} alignItems="center">
                  <span>Medical Reviews</span>
                  {medicalReviews.medical_history && (
                    <Chip
                      label={medicalReviews.medical_history.length}
                      size="small"
                      sx={{
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                        color: 'primary.main',
                        height: 20,
                        fontSize: '0.7rem',
                      }}
                    />
                  )}
                </Stack>
              }
            />
            <Tab 
              label={
                <Stack direction="row" spacing={1} alignItems="center">
                  <span>Care Plan</span>
                  {carePlan && Object.keys(carePlan).length > 0 && (
                    <Chip
                      label="Active"
                      size="small"
                      sx={{
                        bgcolor: alpha(theme.palette.success.main, 0.1),
                        color: 'success.main',
                        height: 20,
                        fontSize: '0.7rem',
                      }}
                    />
                  )}
                </Stack>
              }
            />
            <Tab 
              label={
                <Stack direction="row" spacing={1} alignItems="center">
                  <span>Metrics</span>
                  {metrics && (
                    <Chip
                      label={metrics.filter(m => m.is_active).length}
                      size="small"
                      sx={{
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                        color: 'primary.main',
                        height: 20,
                        fontSize: '0.7rem',
                      }}
                    />
                  )}
                </Stack>
              }
            />
          </Tabs>
        </Box>

        <Box sx={{ p: 3 }}>
          {/* Overview Tab */}
          {selectedTab === 0 && (
            <Stack spacing={3}>
              {/* Profile Information */}
              <Card elevation={1} sx={{ borderRadius: 2 }}>
                <CardContent>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    Profile Information
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <PhoneIcon sx={{ fontSize: 20, color: 'primary.main' }} />
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Phone Number
                          </Typography>
                          <Typography variant="body2" fontWeight={600}>
                            {demographics.phone_number || 'N/A'}
                          </Typography>
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
                            Blood Group
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
                            <Typography variant="body2" fontWeight={600}>
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
                <Card elevation={1} sx={{ borderRadius: 2 }}>
                  <CardContent>
                    <Typography variant="h6" fontWeight={600} gutterBottom>
                      Health Summary
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={4}>
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
                          <Typography variant="h4" fontWeight={700} color="primary.main">
                            {fullMedicalReviews.length}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={4}>
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
                          <Typography variant="h4" fontWeight={700} color="success.main">
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
                          <Typography variant="h4" fontWeight={700} color="warning.main">
                            {patient.pending_ai_review_count || 0}
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              )}

              {/* Chronic Conditions */}
              {clinicalStatus.chronic_conditions && clinicalStatus.chronic_conditions.length > 0 && (
                <Card elevation={1} sx={{ borderRadius: 2 }}>
                  <CardContent>
                    <Typography variant="h6" fontWeight={600} gutterBottom>
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

              {/* Wellness Monitoring */}
              {latestWellnessLog && (
                <Accordion 
                  elevation={1} 
                  sx={{ 
                    borderRadius: '8px !important',
                    '&:before': { display: 'none' },
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                    overflow: 'hidden'
                  }}
                >
                  <AccordionSummary 
                    expandIcon={<ExpandMoreIcon />}
                    sx={{ 
                      bgcolor: alpha(theme.palette.primary.main, 0.02),
                      '&.Mui-expanded': {
                        borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`
                      }
                    }}
                  >
                    <Stack direction="row" spacing={2} alignItems="center" sx={{ width: '100%' }}>
                      <TrendingUpIcon color="primary" />
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle1" fontWeight={600}>
                          Latest Wellness Monitoring
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Last updated: {formatDateTime(latestWellnessLog.created_at)}
                        </Typography>
                      </Box>
                      <Chip 
                        label={`Score: ${latestWellnessLog.wellness_score}/100`}
                        color={latestWellnessLog.wellness_score >= 70 ? "success" : latestWellnessLog.wellness_score >= 40 ? "warning" : "error"}
                        size="small"
                        sx={{ fontWeight: 700 }}
                      />
                    </Stack>
                  </AccordionSummary>
                  <AccordionDetails sx={{ p: 3 }}>
                    <Grid container spacing={3}>
                      <Grid item xs={12} md={4}>
                        <Stack spacing={2}>
                          <Box>
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                              <MoodIcon sx={{ fontSize: 18, color: 'primary.main' }} />
                              <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ textTransform: 'uppercase' }}>
                                Mood
                              </Typography>
                            </Stack>
                            <Typography variant="body1" fontWeight={500}>
                              {latestWellnessLog.mood_label || 'Not reported'}
                            </Typography>
                          </Box>
                          <Box>
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                              <EnergyIcon sx={{ fontSize: 18, color: 'warning.main' }} />
                              <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ textTransform: 'uppercase' }}>
                                Energy
                              </Typography>
                            </Stack>
                            <Typography variant="body1" fontWeight={500}>
                              {latestWellnessLog.energy_label || 'Not reported'}
                            </Typography>
                          </Box>
                        </Stack>
                      </Grid>
                      
                      <Grid item xs={12} md={4}>
                        <Stack spacing={2}>
                          <Box>
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                              <SleepIcon sx={{ fontSize: 18, color: 'info.main' }} />
                              <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ textTransform: 'uppercase' }}>
                                Sleep
                              </Typography>
                            </Stack>
                            <Typography variant="body1" fontWeight={500}>
                              {latestWellnessLog.sleep_label || 'Not reported'} 
                              {latestWellnessLog.sleep_hours ? ` (${latestWellnessLog.sleep_hours} hrs)` : ''}
                            </Typography>
                          </Box>
                          <Box>
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                              <PainIcon sx={{ fontSize: 18, color: 'error.main' }} />
                              <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ textTransform: 'uppercase' }}>
                                Pain Level
                              </Typography>
                            </Stack>
                            <Typography variant="body1" fontWeight={500}>
                              {latestWellnessLog.pain_level !== undefined ? `${latestWellnessLog.pain_level}/10` : 'Not reported'}
                              {latestWellnessLog.pain_location ? ` - ${latestWellnessLog.pain_location}` : ''}
                            </Typography>
                          </Box>
                        </Stack>
                      </Grid>

                      <Grid item xs={12} md={4}>
                        <Stack spacing={2}>
                          {latestWellnessLog.symptoms && latestWellnessLog.symptoms.length > 0 && (
                            <Box>
                              <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ textTransform: 'uppercase', display: 'block', mb: 0.5 }}>
                                Symptoms
                              </Typography>
                              <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                                {latestWellnessLog.symptoms.map((s, i) => (
                                  <Chip key={i} label={s} size="small" variant="outlined" />
                                ))}
                              </Stack>
                            </Box>
                          )}
                          {latestWellnessLog.notes && (
                            <Box>
                              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                                <NoteIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                                <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ textTransform: 'uppercase' }}>
                                  Notes
                                </Typography>
                              </Stack>
                              <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
                                "{latestWellnessLog.notes}"
                              </Typography>
                            </Box>
                          )}
                        </Stack>
                      </Grid>
                    </Grid>
                  </AccordionDetails>
                </Accordion>
              )}
            </Stack>
          )}

          {/* Medical Reviews Tab */}
          {selectedTab === 1 && (
            <Stack spacing={3}>
              {fullMedicalReviews && fullMedicalReviews.length > 0 ? (
                fullMedicalReviews.map((review, idx) => (
                  <Accordion key={idx} sx={{ borderRadius: 2, '&:before': { display: 'none' } }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Stack direction="row" spacing={2} alignItems="center" sx={{ width: '100%' }}>
                        <HospitalIcon color="primary" />
                        <Box sx={{ flex: 1 }}>
                          <Typography fontWeight={600}>
                            Review #{fullMedicalReviews.length - idx}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatDateTime(review.created)}
                          </Typography>
                        </Box>
                        {review.review_status && (
                          <Chip
                            label={review.review_status}
                            size="small"
                            color={review.review_status === 'completed' ? 'success' : 'warning'}
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
                            <Typography variant="body2">{review.chief_complaint}</Typography>
                          </Box>
                        )}
                        {review.assessment && (
                          <Box>
                            <Typography variant="caption" color="text.secondary" fontWeight={600}>
                              Assessment
                            </Typography>
                            <Typography variant="body2">{review.assessment}</Typography>
                          </Box>
                        )}
                        {review.plan && (
                          <Box>
                            <Typography variant="caption" color="text.secondary" fontWeight={600}>
                              Plan
                            </Typography>
                            <Typography variant="body2">{review.plan}</Typography>
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
                <Card elevation={1} sx={{ borderRadius: 2 }}>
                  <CardContent>
                    <Typography variant="h6" fontWeight={600} gutterBottom>
                      Remote Care Plan
                    </Typography>
                    <Stack spacing={2}>
                      {carePlan.start_date && (
                        <Box>
                          <Typography variant="caption" color="text.secondary" fontWeight={600}>
                            Start Date
                          </Typography>
                          <Typography variant="body2">{formatDate(carePlan.start_date)}</Typography>
                        </Box>
                      )}
                      {carePlan.objective && (
                        <Box>
                          <Typography variant="caption" color="text.secondary" fontWeight={600}>
                            Objective
                          </Typography>
                          <Typography variant="body2">{carePlan.objective}</Typography>
                        </Box>
                      )}
                      {carePlan.prevention_focus && (
                        <Box>
                          <Typography variant="caption" color="text.secondary" fontWeight={600}>
                            Prevention Focus
                          </Typography>
                          <Typography variant="body2">{carePlan.prevention_focus}</Typography>
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
            <Stack spacing={3}>
              {metrics && metrics.length > 0 ? (
                metrics.filter(m => m.is_active).map((metric, idx) => (
                  <Card key={idx} elevation={1} sx={{ borderRadius: 2 }}>
                    <CardContent>
                      <Typography variant="h6" fontWeight={600} gutterBottom>
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
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default PatientDetailModal;
