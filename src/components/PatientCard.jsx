import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Chip,
  Avatar,
  Box,
  Stack,
  Divider,
  alpha,
  useTheme,
} from '@mui/material';
import {
  Person as PersonIcon,
  Phone as PhoneIcon,
  Cake as CakeIcon,
  FavoriteBorder as HeartIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Warning as WarningIcon,
  LocalHospital as HospitalIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';

const PatientCard = ({ patient, status, onClick }) => {
  const theme = useTheme();

  const statusConfig = {
    active: {
      color: theme.palette.success.main,
      icon: CheckCircleIcon,
      label: 'Active',
      gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    },
    pending: {
      color: theme.palette.warning.main,
      icon: ScheduleIcon,
      label: 'Pending',
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    },
    churned: {
      color: theme.palette.error.main,
      icon: WarningIcon,
      label: 'Churned',
      gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    },
  };

  const config = statusConfig[status] || statusConfig.active;
  const profile = patient?.profile_data || {};
  const demographics = profile?.demographics || {};
  const clinicalStatus = profile?.clinical_status || {};
  const lastReview = patient?.last_medical_review || {};

  // Construct full name from first and last name
  const fullName = `${demographics.first_name || ''} ${demographics.last_name || ''}`.trim() || 'Unknown Patient';

  const getHealthScoreColor = (score) => {
    if (score >= 80) return theme.palette.success.main;
    if (score >= 60) return theme.palette.warning.main;
    return theme.palette.error.main;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch (error) {
      return 'N/A';
    }
  };

  const calculateAge = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const birthDate = new Date(dateString);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age;
    } catch (error) {
      return 'N/A';
    }
  };

  const StatusIcon = config.icon;

  return (
    <Card
      onClick={onClick}
      sx={{
        borderRadius: 3,
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        border: `2px solid ${alpha(config.color, 0.1)}`,
        position: 'relative',
        overflow: 'visible',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
          borderColor: alpha(config.color, 0.3),
        },
      }}
    >
      {/* Status Badge - Top Right Corner */}
      <Box
        sx={{
          position: 'absolute',
          top: -12,
          right: 16,
          zIndex: 1,
        }}
      >
        <Chip
          icon={<StatusIcon sx={{ fontSize: 16 }} />}
          label={config.label}
          sx={{
            background: config.gradient,
            color: 'white',
            fontWeight: 600,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            '& .MuiChip-icon': {
              color: 'white',
            },
          }}
        />
      </Box>

      <CardContent sx={{ p: 3 }}>
        {/* Patient Header */}
        <Stack direction="row" spacing={2} alignItems="flex-start" sx={{ mb: 2.5 }}>
          <Avatar
            sx={{
              width: 56,
              height: 56,
              background: config.gradient,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              fontSize: '1.5rem',
              fontWeight: 700,
            }}
          >
            {fullName?.[0]?.toUpperCase() || 'P'}
          </Avatar>
          <Box sx={{ flex: 1, pt: 0.5 }}>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                color: 'text.primary',
                mb: 0.5,
                lineHeight: 1.2,
              }}
            >
              {fullName}
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip
                icon={<PhoneIcon sx={{ fontSize: 14 }} />}
                label={demographics.phone_number || 'No phone'}
                size="small"
                variant="outlined"
                sx={{ height: 24, fontSize: '0.75rem' }}
              />
              <Chip
                icon={<CakeIcon sx={{ fontSize: 14 }} />}
                label={`${calculateAge(demographics.date_of_birth)} yrs`}
                size="small"
                variant="outlined"
                sx={{ height: 24, fontSize: '0.75rem' }}
              />
            </Stack>
          </Box>
        </Stack>

        <Divider sx={{ my: 2 }} />

        {/* Health Metrics */}
        <Stack spacing={1.5}>
          {/* Health Score */}
          {lastReview?.overall_health_score !== undefined && (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                p: 1.5,
                borderRadius: 2,
                bgcolor: alpha(getHealthScoreColor(lastReview.overall_health_score), 0.1),
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center">
                <HeartIcon sx={{ fontSize: 20, color: getHealthScoreColor(lastReview.overall_health_score) }} />
                <Typography variant="body2" fontWeight={600} color="text.primary">
                  Health Score
                </Typography>
              </Stack>
              <Typography
                variant="h6"
                fontWeight={700}
                sx={{ color: getHealthScoreColor(lastReview.overall_health_score) }}
              >
                {lastReview.overall_health_score}%
              </Typography>
            </Box>
          )}

          {/* Medical Reviews */}
          {patient?.medical_reviews && (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                p: 1.5,
                borderRadius: 2,
                bgcolor: alpha(theme.palette.primary.main, 0.05),
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center">
                <HospitalIcon sx={{ fontSize: 20, color: 'primary.main' }} />
                <Typography variant="body2" fontWeight={600} color="text.primary">
                  Medical Reviews
                </Typography>
              </Stack>
              <Chip
                label={`${patient.medical_reviews.total_reviews || 0} total`}
                size="small"
                sx={{
                  bgcolor: 'primary.main',
                  color: 'white',
                  fontWeight: 600,
                }}
              />
            </Box>
          )}

          {/* Chronic Conditions */}
          {clinicalStatus.chronic_conditions && clinicalStatus.chronic_conditions.length > 0 && (
            <Box>
              <Typography
                variant="caption"
                sx={{
                  color: 'text.secondary',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  mb: 1,
                  display: 'block',
                }}
              >
                Chronic Conditions
              </Typography>
              <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                {clinicalStatus.chronic_conditions.slice(0, 3).map((condition, index) => (
                  <Chip
                    key={index}
                    label={condition}
                    size="small"
                    sx={{
                      bgcolor: alpha(theme.palette.error.main, 0.1),
                      color: 'error.main',
                      fontSize: '0.7rem',
                      height: 22,
                    }}
                  />
                ))}
                {clinicalStatus.chronic_conditions.length > 3 && (
                  <Chip
                    label={`+${clinicalStatus.chronic_conditions.length - 3} more`}
                    size="small"
                    sx={{
                      bgcolor: alpha(theme.palette.grey[500], 0.1),
                      color: 'text.secondary',
                      fontSize: '0.7rem',
                      height: 22,
                    }}
                  />
                )}
              </Stack>
            </Box>
          )}

          {/* Care Plan */}
          {patient?.remote_care_plan_objective && (
            <Box>
              <Typography
                variant="caption"
                sx={{
                  color: 'text.secondary',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  mb: 0.5,
                  display: 'block',
                }}
              >
                Care Plan Objective
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: 'text.primary',
                  lineHeight: 1.5,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {patient.remote_care_plan_objective}
              </Typography>
            </Box>
          )}

          {/* Last Medical Review */}
          {lastReview && lastReview.created_at && (
            <Box>
              <Divider sx={{ my: 1.5 }} />
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  Last Review
                </Typography>
                <Typography variant="caption" color="text.primary" fontWeight={600}>
                  {formatDate(lastReview.created_at)}
                </Typography>
              </Stack>
            </Box>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
};

export default PatientCard;
