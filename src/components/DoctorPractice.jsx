import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Chip, CircularProgress, Divider, Stack, Typography } from '@mui/material';
import {
  ArrowForwardRounded,
  Groups2Rounded,
  HandshakeRounded,
  MonetizationOnRounded,
  PersonAddAlt1Rounded,
  TrendingUpRounded,
} from '@mui/icons-material';
import { getProviderDashboard } from '../services/providerDashboardApi';
import './DoctorHome.css';

const formatMoney = (value, currency = 'NGN') => {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return '—';
  try {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${currency} ${Math.round(amount).toLocaleString()}`;
  }
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

const PracticeMetric = ({ icon: Icon, label, value, detail, tone }) => (
  <Box className={`doctor-stat doctor-stat-${tone}`}>
    <Box className="doctor-stat-icon"><Icon /></Box>
    <Typography className="doctor-eyebrow">{label}</Typography>
    <Typography className="doctor-stat-value">{value}</Typography>
    <Typography className="doctor-stat-detail">{detail}</Typography>
  </Box>
);

export default function DoctorPractice() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getProviderDashboard()
      .then((response) => { if (active) setDashboard(response); })
      .catch(() => { if (active) setError('We could not load the latest practice numbers. Try again in a moment.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const providerInfo = dashboard?.provider_info || {};
  const groups = dashboard?.patients || {};
  const activePatients = Array.isArray(groups.active) ? groups.active : [];
  const pendingPatients = Array.isArray(groups.pending) ? groups.pending : [];
  const churnedPatients = Array.isArray(groups.churned) ? groups.churned : [];
  const currency = providerInfo.currency || 'NGN';
  const patients = useMemo(() => [...activePatients, ...pendingPatients, ...churnedPatients], [activePatients, pendingPatients, churnedPatients]);

  if (loading) return <Box className="doctor-loading"><CircularProgress size={28} /><Typography>Loading your practice…</Typography></Box>;

  return (
    <Box className="doctor-page doctor-practice-page">
      {error && <Alert severity="info" className="doctor-page-alert">{error}</Alert>}
      <Box className="doctor-page-heading">
        <Box>
          <Typography className="doctor-eyebrow">Patients</Typography>
          <Typography component="h1" className="doctor-page-title">Keep up with your patients.</Typography>
          <Typography className="doctor-page-subtitle">Review your care relationships and open the authorized patient context.</Typography>
        </Box>
        <Button variant="contained" startIcon={<PersonAddAlt1Rounded />} onClick={() => navigate('/app/messages')}>Open care messages</Button>
      </Box>

      <Box className="doctor-stat-grid">
        <PracticeMetric icon={Groups2Rounded} label="Patients in care" value={activePatients.length || '—'} detail="Active continuity relationships" tone="blue" />
        <PracticeMetric icon={HandshakeRounded} label="Starting soon" value={pendingPatients.length || '—'} detail="Patients awaiting activation" tone="mint" />
        <PracticeMetric icon={MonetizationOnRounded} label="Expected monthly value" value={formatMoney(providerInfo.total_expected_monthly_payout || providerInfo.expected_monthly_subscription_payout, currency)} detail="From recurring care" tone="plum" />
        <PracticeMetric icon={TrendingUpRounded} label="This month" value={providerInfo.patients_onboarded_this_month || '—'} detail="New patient relationships" tone="amber" />
      </Box>

      <Box className="doctor-content-grid doctor-practice-grid">
        <Box className="doctor-panel">
          <Box className="doctor-panel-heading doctor-panel-heading-wide">
            <Box>
              <Typography className="doctor-eyebrow">Patient relationships</Typography>
              <Typography className="doctor-panel-title">Your continuity roster</Typography>
            </Box>
            <Chip label={`${patients.length} total`} className="doctor-soft-chip" />
          </Box>
          <Divider />
          {patients.length === 0 ? (
            <Box className="doctor-empty-state">
              <Groups2Rounded />
              <Typography>No patients have been assigned yet.</Typography>
              <Typography className="doctor-muted">Patients in your authorized care scope will appear here as their care is assigned.</Typography>
              <Button variant="outlined" onClick={() => navigate('/app/messages')}>Open care messages</Button>
            </Box>
          ) : (
            <Box className="doctor-practice-list">
              {patients.map((patient, index) => {
                const status = index < activePatients.length ? 'In care' : index < activePatients.length + pendingPatients.length ? 'Starting soon' : 'Needs attention';
                return (
                  <Box className="doctor-patient-row" key={patient.id || patient.user_id || `${getPatientName(patient)}-${index}`}>
                    <Box className="doctor-patient-avatar">{getPatientInitials(patient)}</Box>
                    <Box className="doctor-patient-copy">
                      <Typography className="doctor-patient-name">{getPatientName(patient)}</Typography>
                      <Typography className="doctor-patient-detail">{patient.last_activity || patient.next_action || 'No recent activity recorded'}</Typography>
                    </Box>
                    <Chip size="small" label={status} className={`doctor-patient-chip ${status === 'In care' ? 'doctor-patient-chip-active' : ''}`} />
                  </Box>
                );
              })}
            </Box>
          )}
        </Box>

        <Box className="doctor-panel doctor-practice-callout">
          <Box className="doctor-callout-icon"><MonetizationOnRounded /></Box>
          <Typography className="doctor-eyebrow">Recurring care, made simple</Typography>
          <Typography className="doctor-panel-title">Your best clinical relationships can become your most durable ones.</Typography>
          <Typography className="doctor-callout-copy">Prestige keeps the operational layer moving so you can stay focused on decisions, trust, and outcomes.</Typography>
          <Button variant="contained" endIcon={<ArrowForwardRounded />} onClick={() => navigate('/app/messages')}>Open care inbox</Button>
        </Box>
      </Box>
    </Box>
  );
}
