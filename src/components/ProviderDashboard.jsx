import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Paper,
  Tabs,
  Tab,
  Badge,
  CircularProgress,
  Button,
  Avatar,
  Divider,
  Chip,
  IconButton,
  Stack,
  alpha,
  useTheme,
} from '@mui/material';
import {
  People as PeopleIcon,
  AttachMoney as MoneyIcon,
  TrendingUp as TrendingUpIcon,
  Schedule as ScheduleIcon,
  Warning as WarningIcon,
  FavoriteBorder as HeartIcon,
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon,
  LocalPharmacy as PharmacyIcon,
} from '@mui/icons-material';
import { getAccessToken } from '../api';
import { getProviderDashboard, getPatientDetails } from '../services/providerDashboardApi';
import PatientCard from './PatientCard';

const ProviderDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const navigate = useNavigate();
  const theme = useTheme();

  const showSnackbar = (message, severity = 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);

    try {
      const data = await getProviderDashboard();
      setDashboardData(data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      if (error.message.includes('provider access')) {
        showSnackbar('You do not have provider access.', 'error');
        navigate('/login');
      } else {
        showSnackbar('Failed to load dashboard data. Please try again.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchPatientDetails = (patientId) => {
    navigate(`/patient/${patientId}`);
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
          bgcolor: 'white',
        }}
      >
        <CircularProgress size={60} sx={{ color: 'primary.main', mb: 3 }} />
        <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 500 }}>
          Loading Dashboard...
        </Typography>
      </Box>
    );
  }

  if (!dashboardData) {
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
        <Typography variant="h6" color="text.secondary" gutterBottom>
          Failed to load dashboard data
        </Typography>
        <Button variant="contained" onClick={fetchDashboardData} sx={{ mt: 2 }}>
          Retry
        </Button>
      </Box>
    );
  }

  const { provider_info, patients } = dashboardData;

  // Add null checks and default values for provider_info
  const safeProviderInfo = {
    consultation_rate: provider_info?.consultation_rate ?? 0,
    currency: provider_info?.currency ?? 'NGN',
    expected_monthly_subscription_payout: provider_info?.expected_monthly_subscription_payout ?? 0,
    monthly_prescription_commission: provider_info?.monthly_prescription_commission ?? 0,
    total_expected_monthly_payout: provider_info?.total_expected_monthly_payout ?? 0,
    prescription_sales_this_month: provider_info?.prescription_sales_this_month ?? 0,
    active_subscribed_patients_count: provider_info?.active_subscribed_patients_count ?? 0,
    pending_subscribed_patients_count: provider_info?.pending_subscribed_patients_count ?? 0,
    churned_patients_count: provider_info?.churned_patients_count ?? 0,
    added_patients_count: provider_info?.added_patients_count ?? 0,
  };

  // Add null checks and default values for patients
  const safePatients = {
    active: patients?.active ?? [],
    pending: patients?.pending ?? [],
    churned: patients?.churned ?? [],
    added: patients?.added ?? [],
  };

  const MetricCard = ({ title, value, subtitle, icon: Icon, gradient, trend }) => (
    <Card
      sx={{
        background: gradient,
        color: 'white',
        borderRadius: 3,
        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 12px 32px rgba(0,0,0,0.16)',
        },
      }}
    >
      <CardContent sx={{ p: { xs: 2, md: 3 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography variant="body2" sx={{ opacity: 0.9, mb: 1, fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
              {title}
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5, fontSize: { xs: '1.5rem', md: '2rem' } }}>
              {value}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {trend && trend !== 0 && (
                trend > 0 ? <ArrowUpIcon sx={{ fontSize: { xs: 14, md: 16 } }} /> : <ArrowDownIcon sx={{ fontSize: { xs: 14, md: 16 } }} />
              )}
              <Typography variant="caption" sx={{ opacity: 0.9, fontSize: { xs: '0.7rem', md: '0.75rem' } }}>
                {subtitle}
              </Typography>
            </Box>
          </Box>
          <Box
            sx={{
              bgcolor: 'rgba(255,255,255,0.2)',
              borderRadius: 2,
              p: { xs: 1, md: 1.5 },
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon sx={{ fontSize: { xs: 28, md: 32 } }} />
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        width: '100%',
        maxWidth: '100vw',
        overflowX: 'hidden',
      }}
    >
      {/* Page Header */}
      <Paper
        elevation={0}
        sx={{
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
          color: 'white',
          py: { xs: 2, md: 3 },
          mb: { xs: 2, md: 3 },
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        }}
      >
        <Container maxWidth="xl" sx={{ px: { xs: 2, sm: 3 } }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar
              sx={{
                bgcolor: 'rgba(255,255,255,0.2)',
                width: { xs: 48, md: 56 },
                height: { xs: 48, md: 56 },
              }}
            >
              <HeartIcon sx={{ fontSize: { xs: 28, md: 32 } }} />
            </Avatar>
            <Box>
              <Typography variant="h5" sx={{ 
                fontWeight: 700, 
                letterSpacing: '-0.5px',
                fontSize: { xs: '1.25rem', md: '1.5rem' }
              }}>
                Business Dashboard
              </Typography>
              <Typography variant="body2" sx={{ 
                opacity: 0.9,
                fontSize: { xs: '0.8rem', md: '0.875rem' }
              }}>
                Monitor your practice performance
              </Typography>
            </Box>
          </Stack>
        </Container>
      </Paper>

      <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 }, px: { xs: 2, sm: 3 } }}>
        {/* Business Metrics */}
        <Box sx={{ mb: { xs: 3, md: 5 } }}>
          <Typography variant="h6" sx={{ 
            mb: { xs: 2, md: 3 }, 
            fontWeight: 600, 
            color: 'text.primary',
            fontSize: { xs: '1.1rem', md: '1.25rem' }
          }}>
            Business Overview
          </Typography>
          <Grid container spacing={{ xs: 2, md: 3 }}>
            <Grid item xs={12} sm={6} lg={2}>
              <MetricCard
                title="Consultation Rate"
                value={`${safeProviderInfo.consultation_rate.toFixed(1)}%`}
                subtitle={safeProviderInfo.consultation_rate > 70 ? 'Excellent performance' : 'Needs attention'}
                icon={TrendingUpIcon}
                gradient={`linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`}
                trend={safeProviderInfo.consultation_rate > 70 ? 1 : -1}
              />
            </Grid>
            <Grid item xs={12} sm={6} lg={2}>
              <MetricCard
                title="Total Monthly Payout"
                value={`${safeProviderInfo.currency} ${safeProviderInfo.total_expected_monthly_payout.toLocaleString()}`}
                subtitle={`Subscriptions: ${safeProviderInfo.currency} ${safeProviderInfo.expected_monthly_subscription_payout.toLocaleString()}`}
                icon={MoneyIcon}
                gradient="linear-gradient(135deg, #10b981 0%, #059669 100%)"
              />
            </Grid>
            <Grid item xs={12} sm={6} lg={2}>
              <MetricCard
                title="Prescription Sales"
                value={`${safeProviderInfo.currency} ${safeProviderInfo.prescription_sales_this_month.toLocaleString()}`}
                subtitle={`Commission: ${safeProviderInfo.currency} ${safeProviderInfo.monthly_prescription_commission.toLocaleString()}`}
                icon={PharmacyIcon}
                gradient="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
              />
            </Grid>
            <Grid item xs={12} sm={6} lg={2}>
              <MetricCard
                title="Active Patients"
                value={safeProviderInfo.active_subscribed_patients_count}
                subtitle="Currently subscribed"
                icon={PeopleIcon}
                gradient="linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)"
              />
            </Grid>
            <Grid item xs={12} sm={6} lg={2}>
              <MetricCard
                title="Added Patients"
                value={safeProviderInfo.added_patients_count}
                subtitle="Manually added"
                icon={PeopleIcon}
                gradient="linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)"
              />
            </Grid>
            <Grid item xs={12} sm={6} lg={2}>
              <MetricCard
                title="Pending / Churned"
                value={`${safeProviderInfo.pending_subscribed_patients_count} / ${safeProviderInfo.churned_patients_count}`}
                subtitle="Requires attention"
                icon={ScheduleIcon}
                gradient="linear-gradient(135deg, #ef4444 0%, #dc2626 100%)"
              />
            </Grid>
          </Grid>
        </Box>

        {/* Patient Categories */}
        <Paper
          elevation={2}
          sx={{
            borderRadius: 3,
            overflow: 'hidden',
            bgcolor: 'white',
          }}
        >
          <Box sx={{ borderBottom: 1, borderColor: 'divider', overflowX: 'auto' }}>
            <Tabs
              value={selectedTab}
              onChange={(e, newValue) => setSelectedTab(newValue)}
              variant="scrollable"
              scrollButtons="auto"
              allowScrollButtonsMobile
              sx={{
                px: { xs: 1, sm: 2 },
                minHeight: { xs: 56, md: 64 },
                '& .MuiTab-root': {
                  fontWeight: 600,
                  textTransform: 'none',
                  fontSize: { xs: '0.875rem', md: '1rem' },
                  minHeight: { xs: 56, md: 64 },
                  minWidth: { xs: 120, sm: 160 },
                  px: { xs: 2, sm: 3 },
                },
              }}
            >
              <Tab
                label={
                  <Stack direction="row" spacing={1} alignItems="center">
                    <span>Active Patients</span>
                    <Chip
                      label={safePatients.active.length}
                      size="small"
                      sx={{
                        bgcolor: alpha(theme.palette.success.main, 0.1),
                        color: 'success.main',
                        fontWeight: 600,
                      }}
                    />
                  </Stack>
                }
              />
              <Tab
                label={
                  <Stack direction="row" spacing={1} alignItems="center">
                    <span>Pending Patients</span>
                    <Chip
                      label={safePatients.pending.length}
                      size="small"
                      sx={{
                        bgcolor: alpha(theme.palette.warning.main, 0.1),
                        color: 'warning.main',
                        fontWeight: 600,
                      }}
                    />
                  </Stack>
                }
              />
              <Tab
                label={
                  <Stack direction="row" spacing={1} alignItems="center">
                    <span>Churned Patients</span>
                    <Chip
                      label={safePatients.churned.length}
                      size="small"
                      sx={{
                        bgcolor: alpha(theme.palette.error.main, 0.1),
                        color: 'error.main',
                        fontWeight: 600,
                      }}
                    />
                  </Stack>
                }
              />
              <Tab
                label={
                  <Stack direction="row" spacing={1} alignItems="center">
                    <span>Added Patients</span>
                    <Chip
                      label={safePatients.added.length}
                      size="small"
                      sx={{
                        bgcolor: alpha(theme.palette.info.main, 0.1),
                        color: 'info.main',
                        fontWeight: 600,
                      }}
                    />
                  </Stack>
                }
              />
            </Tabs>
          </Box>

          {/* Tab Panels */}
          <Box sx={{ p: 3 }}>
            {/* Active Patients */}
            {selectedTab === 0 && (
              <Box>
                {safePatients.active.length === 0 ? (
                  <Box
                    sx={{
                      textAlign: 'center',
                      py: 8,
                      color: 'text.secondary',
                    }}
                  >
                    <PeopleIcon sx={{ fontSize: 64, mb: 2, opacity: 0.3 }} />
                    <Typography variant="h6" color="text.secondary">
                      No active patients yet
                    </Typography>
                  </Box>
                ) : (
                  <Grid container spacing={3}>
                    {safePatients.active.map(patient => (
                      <Grid item xs={12} lg={6} key={patient.id}>
                        <PatientCard
                          patient={patient}
                          status="active"
                          onClick={() => fetchPatientDetails(patient.id)}
                        />
                      </Grid>
                    ))}
                  </Grid>
                )}
              </Box>
            )}

            {/* Pending Patients */}
            {selectedTab === 1 && (
              <Box>
                {safePatients.pending.length === 0 ? (
                  <Box
                    sx={{
                      textAlign: 'center',
                      py: 8,
                      color: 'text.secondary',
                    }}
                  >
                    <ScheduleIcon sx={{ fontSize: 64, mb: 2, opacity: 0.3 }} />
                    <Typography variant="h6" color="text.secondary">
                      No pending patients
                    </Typography>
                  </Box>
                ) : (
                  <Grid container spacing={3}>
                    {safePatients.pending.map(patient => (
                      <Grid item xs={12} lg={6} key={patient.id}>
                        <PatientCard
                          patient={patient}
                          status="pending"
                          onClick={() => fetchPatientDetails(patient.id)}
                        />
                      </Grid>
                    ))}
                  </Grid>
                )}
              </Box>
            )}

            {/* Churned Patients */}
            {selectedTab === 2 && (
              <Box>
                {safePatients.churned.length === 0 ? (
                  <Box
                    sx={{
                      textAlign: 'center',
                      py: 8,
                      color: 'text.secondary',
                    }}
                  >
                    <WarningIcon sx={{ fontSize: 64, mb: 2, opacity: 0.3 }} />
                    <Typography variant="h6" color="text.secondary">
                      No churned patients
                    </Typography>
                  </Box>
                ) : (
                  <Grid container spacing={3}>
                    {safePatients.churned.map(patient => (
                      <Grid item xs={12} lg={6} key={patient.id}>
                        <PatientCard
                          patient={patient}
                          status="churned"
                          onClick={() => fetchPatientDetails(patient.id)}
                        />
                      </Grid>
                    ))}
                  </Grid>
                )}
              </Box>
            )}

            {/* Added Patients */}
            {selectedTab === 3 && (
              <Box>
                {safePatients.added.length === 0 ? (
                  <Box
                    sx={{
                      textAlign: 'center',
                      py: 8,
                      color: 'text.secondary',
                    }}
                  >
                    <PeopleIcon sx={{ fontSize: 64, mb: 2, opacity: 0.3 }} />
                    <Typography variant="h6" color="text.secondary">
                      No added patients
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Patients you add will appear here
                    </Typography>
                  </Box>
                ) : (
                  <Grid container spacing={3}>
                    {safePatients.added.map(patient => (
                      <Grid item xs={12} lg={6} key={patient.id}>
                        <PatientCard
                          patient={patient}
                          status="added"
                          onClick={() => fetchPatientDetails(patient.id)}
                        />
                      </Grid>
                    ))}
                  </Grid>
                )}
              </Box>
            )}
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default ProviderDashboard;
