import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material';
import {
  ArrowForwardRounded,
  AutoAwesomeRounded,
  CheckCircleRounded,
  Groups2Rounded,
  MarkUnreadChatAltRounded,
  MonetizationOnRounded,
  NorthEastRounded,
  PsychologyRounded,
  ScheduleRounded,
  TaskAltRounded,
  WarningAmberRounded,
} from '@mui/icons-material';
import { getUser } from '../api';
import { getProviderDashboard, getProviderReviews } from '../services/providerDashboardApi';
import { getCareConversationSummary } from '../services/careConversationApi';
import './DoctorHome.css';

const reviewStatus = (review) => String(review?.review_status || (review?.is_finalized ? 'finalized' : 'pending')).toLowerCase();

const isUrgentReview = (review) => {
  const text = JSON.stringify({
    priority: review?.priority,
    urgency: review?.urgency,
    risk: review?.risk_level,
    flags: review?.risk_flags,
  }).toLowerCase();
  return ['urgent', 'emergency', 'critical', 'high'].some((value) => text.includes(value));
};

const formatMoney = (value, currency = 'NGN') => {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return '—';
  try {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${Math.round(amount).toLocaleString()}`;
  }
};

const getFirstName = (user) => {
  if (user?.first_name) return user.first_name;
  if (user?.full_name) return String(user.full_name).split(' ')[0];
  return 'Doctor';
};

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

const getPatientName = (patient) => (
  patient?.full_name || patient?.name || patient?.patient_name || patient?.user?.full_name || 'Patient'
);

const getPatientInitials = (patient) => getPatientName(patient)
  .split(' ')
  .filter(Boolean)
  .slice(0, 2)
  .map((part) => part[0])
  .join('')
  .toUpperCase() || 'P';

const StatCard = ({ icon: Icon, label, value, detail, tone = 'blue' }) => (
  <Box className={`doctor-stat doctor-stat-${tone}`}>
    <Box className="doctor-stat-icon"><Icon /></Box>
    <Typography className="doctor-eyebrow">{label}</Typography>
    <Typography className="doctor-stat-value">{value}</Typography>
    <Typography className="doctor-stat-detail">{detail}</Typography>
  </Box>
);

const ActionRow = ({ icon: Icon, tone, title, description, action, onClick }) => (
  <Box className="doctor-action-row" onClick={onClick} role="button" tabIndex={0} onKeyDown={(event) => {
    if (event.key === 'Enter' || event.key === ' ') onClick();
  }}>
    <Box className={`doctor-action-icon doctor-action-${tone}`}><Icon /></Box>
    <Box className="doctor-action-copy">
      <Typography className="doctor-action-title">{title}</Typography>
      <Typography className="doctor-action-description">{description}</Typography>
    </Box>
    <Box className="doctor-action-link">{action}<ArrowForwardRounded /></Box>
  </Box>
);

export default function DoctorHome() {
  const navigate = useNavigate();
  const user = useMemo(() => getUser() || {}, []);
  const [data, setData] = useState({ dashboard: null, reviews: [], care: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      const [dashboardResult, reviewsResult, careResult] = await Promise.allSettled([
        getProviderDashboard(),
        getProviderReviews(168),
        getCareConversationSummary(),
      ]);

      if (!active) return;

      const dashboard = dashboardResult.status === 'fulfilled' ? dashboardResult.value : null;
      const reviewsPayload = reviewsResult.status === 'fulfilled' ? reviewsResult.value : [];
      const care = careResult.status === 'fulfilled' ? careResult.value : null;
      const reviews = Array.isArray(reviewsPayload)
        ? reviewsPayload
        : (reviewsPayload?.results || reviewsPayload?.items || []);

      setData({ dashboard, reviews, care });
      if (!dashboard && !reviews.length && !care) {
        setError('Live practice data is temporarily unavailable. Your workspace is ready when the connection returns.');
      }
      setLoading(false);
    };
    void load();
    return () => { active = false; };
  }, []);

  const providerInfo = data.dashboard?.provider_info || {};
  const patientGroups = data.dashboard?.patients || {};
  const activePatients = Array.isArray(patientGroups.active) ? patientGroups.active : [];
  const pendingPatients = Array.isArray(patientGroups.pending) ? patientGroups.pending : [];
  const activeSubscriptions = Number(providerInfo.active_subscribed_patients_count || activePatients.length || 0);
  const reviewsNeedingAttention = data.reviews.filter((review) => ['pending', 'in_review'].includes(reviewStatus(review)));
  const urgentReviews = data.reviews.filter(isUrgentReview);
  const aiPrepared = data.reviews.filter((review) => review?.conducted_by_ai || review?.is_ai_triage || review?.ai_triage).length;
  const unreadCare = Number(data.care?.unread_count || 0);
  const monthlyValue = providerInfo.total_expected_monthly_payout || providerInfo.expected_monthly_subscription_payout;
  const userName = getFirstName(user);
  const currency = providerInfo.currency || 'NGN';

  if (loading) {
    return <Box className="doctor-loading"><CircularProgress size={28} /><Typography>Preparing your care workspace…</Typography></Box>;
  }

  return (
    <Box className="doctor-page doctor-home-page">
      {error && <Alert severity="info" className="doctor-page-alert">{error}</Alert>}

      <Box className="doctor-home-hero">
        <Box className="doctor-home-hero-copy">
          <Chip icon={<AutoAwesomeRounded />} label="AI care team active" className="doctor-status-chip" />
          <Typography component="h1" className="doctor-display-title">
            {getGreeting()}, Dr. {userName}
          </Typography>
          <Typography className="doctor-display-subtitle">
            One calm workspace for the patients who need you, the work AI can carry, and the care your practice can grow.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} className="doctor-hero-actions">
            <Button variant="contained" endIcon={<ArrowForwardRounded />} onClick={() => navigate('/work')}>
              Open work queue
            </Button>
            <Button variant="text" endIcon={<NorthEastRounded />} onClick={() => navigate('/patients')}>
              View practice
            </Button>
          </Stack>
        </Box>
        <Box className="doctor-hero-insight">
          <Box className="doctor-hero-insight-icon"><PsychologyRounded /></Box>
          <Typography className="doctor-eyebrow">Your AI chief of staff</Typography>
          <Typography className="doctor-hero-insight-title">The signal is ready before you are.</Typography>
          <Typography className="doctor-hero-insight-copy">
            AI prepares the context, tracks follow-through, and brings only decisions that need your clinical judgment.
          </Typography>
        </Box>
      </Box>

      <Box className="doctor-stat-grid">
        <StatCard icon={Groups2Rounded} label="Patients in care" value={activePatients.length || '—'} detail="Active continuity relationships" tone="blue" />
        <StatCard icon={TaskAltRounded} label="Needs your review" value={reviewsNeedingAttention.length || '—'} detail="AI-prepared work this week" tone="amber" />
        <StatCard icon={MarkUnreadChatAltRounded} label="Care moments" value={unreadCare || '—'} detail="Unread patient checkpoints" tone="mint" />
        <StatCard icon={MonetizationOnRounded} label="Recurring care" value={formatMoney(monthlyValue, currency)} detail={`${activeSubscriptions || 'No'} active care subscriptions`} tone="plum" />
      </Box>

      <Box className="doctor-content-grid">
        <Box className="doctor-panel doctor-next-panel">
          <Box className="doctor-panel-heading">
            <Box>
              <Typography className="doctor-eyebrow">Your next best actions</Typography>
              <Typography className="doctor-panel-title">Keep care moving</Typography>
            </Box>
            <AutoAwesomeRounded className="doctor-panel-heading-icon" />
          </Box>
          <Divider />
          <ActionRow
            icon={TaskAltRounded}
            tone="amber"
            title={reviewsNeedingAttention.length ? `Review ${reviewsNeedingAttention.length} AI-prepared case${reviewsNeedingAttention.length === 1 ? '' : 's'}` : 'Review your AI work queue'}
            description={urgentReviews.length ? `${urgentReviews.length} case${urgentReviews.length === 1 ? '' : 's'} carries an elevated risk signal.` : 'Approve, amend, or close cases with the context already assembled.'}
            action="Open queue"
            onClick={() => navigate('/work')}
          />
          <ActionRow
            icon={MarkUnreadChatAltRounded}
            tone="mint"
            title={unreadCare ? `${unreadCare} care moment${unreadCare === 1 ? '' : 's'} waiting` : 'Check patient continuity'}
            description="Stay present between visits without carrying every follow-up yourself."
            action="Open inbox"
            onClick={() => navigate('/care')}
          />
          <ActionRow
            icon={MonetizationOnRounded}
            tone="plum"
            title="Build recurring care"
            description="Turn trusted follow-up into an ongoing care relationship patients can stay in."
            action="View practice"
            onClick={() => navigate('/patients')}
          />
        </Box>

        <Box className="doctor-panel doctor-ai-panel">
          <Box className="doctor-panel-heading">
            <Box>
              <Typography className="doctor-eyebrow">AI at work</Typography>
              <Typography className="doctor-panel-title">More touch, less chase</Typography>
            </Box>
            <Box className="doctor-live-dot" aria-label="AI services active" />
          </Box>
          <Box className="doctor-ai-score">
            <Box className="doctor-ai-score-number">{aiPrepared || '—'}</Box>
            <Box>
              <Typography className="doctor-ai-score-label">reviews prepared this week</Typography>
              <Typography className="doctor-ai-score-copy">Your team starts with the important part: patient context.</Typography>
            </Box>
          </Box>
          <Box className="doctor-progress-block">
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography className="doctor-progress-label">Continuity coverage</Typography>
              <Typography className="doctor-progress-value">{activeSubscriptions ? `${Math.min(100, Math.round((activeSubscriptions / Math.max(activePatients.length, activeSubscriptions)) * 100))}%` : 'Ready'}</Typography>
            </Stack>
            <LinearProgress variant="determinate" value={activeSubscriptions ? Math.min(100, Math.round((activeSubscriptions / Math.max(activePatients.length, activeSubscriptions)) * 100)) : 0} className="doctor-progress" />
            <Typography className="doctor-progress-copy">Patients stay connected to a plan, not just a single encounter.</Typography>
          </Box>
          <Box className="doctor-ai-note">
            <CheckCircleRounded />
            <Typography>Clinical decisions stay with you. AI handles the preparation and the follow-through.</Typography>
          </Box>
        </Box>
      </Box>

      <Box className="doctor-panel doctor-patients-panel">
        <Box className="doctor-panel-heading doctor-panel-heading-wide">
          <Box>
            <Typography className="doctor-eyebrow">Patient continuity</Typography>
            <Typography className="doctor-panel-title">The relationships that matter next</Typography>
          </Box>
          <Button variant="text" endIcon={<ArrowForwardRounded />} onClick={() => navigate('/patients')}>View all patients</Button>
        </Box>
        <Divider />
        {activePatients.length === 0 && pendingPatients.length === 0 ? (
          <Box className="doctor-empty-state">
            <Groups2Rounded />
            <Typography>No patient relationships yet.</Typography>
            <Typography className="doctor-muted">Invite your first patient into a continuity plan to start building a calmer practice.</Typography>
            <Button variant="outlined" onClick={() => navigate('/patients')}>Set up your practice</Button>
          </Box>
        ) : (
          <Box className="doctor-patient-list">
            {[...activePatients.slice(0, 3), ...pendingPatients.slice(0, Math.max(0, 3 - activePatients.length))].map((patient, index) => (
              <Box className="doctor-patient-row" key={patient.id || patient.user_id || `${getPatientName(patient)}-${index}`}>
                <Box className="doctor-patient-avatar">{getPatientInitials(patient)}</Box>
                <Box className="doctor-patient-copy">
                  <Typography className="doctor-patient-name">{getPatientName(patient)}</Typography>
                  <Typography className="doctor-patient-detail">{patient.last_activity || patient.next_action || 'Continuity plan active'}</Typography>
                </Box>
                <Chip size="small" label={activePatients.includes(patient) ? 'In care' : 'Getting started'} className={activePatients.includes(patient) ? 'doctor-patient-chip doctor-patient-chip-active' : 'doctor-patient-chip'} />
              </Box>
            ))}
          </Box>
        )}
      </Box>

      <Box className="doctor-footer-note">
        <WarningAmberRounded />
        <Typography>AI surfaces risk and drafts the next step. You remain the final clinical voice.</Typography>
      </Box>
    </Box>
  );
}
