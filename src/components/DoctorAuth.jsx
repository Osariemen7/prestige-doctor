import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { safeDoctorPath } from '../pwa/safePath';
import InstallButton from '../pwa/InstallButton';
import { resolveDoctorApiUrl } from '../apiOrigin';
import { Alert, Box, Button, CircularProgress, Container, MenuItem, Snackbar, TextField, Typography } from '@mui/material';
import {
  ArrowBackRounded,
  ArrowForwardRounded,
  CheckCircleOutlineRounded,
  LockOutlined,
  PhoneIphoneRounded,
  VerifiedUserRounded,
} from '@mui/icons-material';
import { isAuthenticated, storeAuthData } from '../api';
import { normalizeDoctorPhone } from '../utils/doctorAuth';
import './DoctorAuth.css';
import { DoctorBrand } from './DoctorPublicLayout';

const API_BASE = resolveDoctorApiUrl('/api');

const SPECIALTIES = [
  { value: 'general_practice', label: 'General Practice' },
  { value: 'internal_medicine', label: 'Internal Medicine' },
  { value: 'cardiology', label: 'Cardiology' },
  { value: 'dermatology', label: 'Dermatology' },
  { value: 'endocrinology', label: 'Endocrinology' },
  { value: 'gastroenterology', label: 'Gastroenterology' },
  { value: 'neurology', label: 'Neurology' },
  { value: 'obstetrics_gynecology', label: 'Obstetrics & Gynecology' },
  { value: 'ophthalmology', label: 'Ophthalmology' },
  { value: 'orthopedics', label: 'Orthopedics' },
  { value: 'pediatrics', label: 'Pediatrics' },
  { value: 'psychiatry', label: 'Psychiatry' },
  { value: 'pulmonology', label: 'Pulmonology' },
  { value: 'radiology', label: 'Radiology' },
  { value: 'surgery', label: 'Surgery' },
  { value: 'urology', label: 'Urology' },
];

const isValidDoctorPhone = (value) => /^\+234\d{10}$/.test(value);

const displayPhone = (value) => {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length !== 13 || !digits.startsWith('234')) return value;
  return `+234 ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`;
};

const initialNotice = { open: false, message: '', severity: 'info' };

const profileSetupRequirement = (data) => {
  // This describes the next form, not provider/invitation authority. Both
  // endpoints still establish that authority on the server independently.
  if (!data || Array.isArray(data) || data.success !== true
      || typeof data.requires_profile_setup !== 'boolean') return null;
  // A legacy flag alone is not the current contract. If supplied alongside
  // it, require explicit, consistent booleans rather than truthy coercion.
  if (Object.prototype.hasOwnProperty.call(data, 'is_existing_user')
      && (typeof data.is_existing_user !== 'boolean'
        || data.is_existing_user === data.requires_profile_setup)) return null;
  return data.requires_profile_setup;
};

export default function DoctorAuth() {
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = safeDoctorPath(new URLSearchParams(location.search).get('next'));
  const [step, setStep] = useState('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [requiresProfileSetup, setRequiresProfileSetup] = useState(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [specialty, setSpecialty] = useState('general_practice');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(initialNotice);

  useEffect(() => {
    if (isAuthenticated()) navigate(returnTo, { replace: true });
  }, [navigate, returnTo]);

  const showNotice = (message, severity = 'info') => setNotice({ open: true, message, severity });

  const handleRequestOtp = async (event) => {
    event?.preventDefault?.();
    const normalized = normalizeDoctorPhone(phoneNumber);
    if (!isValidDoctorPhone(normalized)) {
      showNotice('Enter a valid Nigerian number, for example 0801 234 5678 or +234 801 234 5678.', 'warning');
      return;
    }

    setLoading(true);
    setRequiresProfileSetup(null);
    setOtp('');
    setStep('phone');
    try {
      const response = await fetch(`${API_BASE}/doctor-auth/request-otp/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Client-Type': 'doctor_app' },
        body: JSON.stringify({ phone_number: normalized }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        showNotice(data.error || 'We could not send your code. Please try again.', 'error');
        return;
      }

      const requirement = profileSetupRequirement(data);
      if (requirement === null) {
        showNotice('We could not confirm the next sign-in step. Request a new code and try again.', 'error');
        return;
      }

      setPhoneNumber(normalized);
      setRequiresProfileSetup(requirement);
      setStep('otp');
      showNotice(requirement ? 'Code sent. Add your details to complete your invited doctor profile.' : 'Welcome back. Check WhatsApp for your code.', 'success');
    } catch {
      showNotice('Network error. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (event) => {
    event?.preventDefault?.();
    if (requiresProfileSetup === null) {
      showNotice('Request a new code to confirm the next sign-in step.', 'warning');
      return;
    }
    if (!/^\d{4,6}$/.test(otp)) {
      showNotice('Enter the verification code sent to WhatsApp.', 'warning');
      return;
    }
    if (requiresProfileSetup && (!firstName.trim() || !lastName.trim())) {
      showNotice('Add your first and last name to set up your workspace.', 'warning');
      return;
    }

    setLoading(true);
    try {
      const payload = { phone_number: normalizeDoctorPhone(phoneNumber), otp };
      if (requiresProfileSetup) {
        payload.first_name = firstName.trim();
        payload.last_name = lastName.trim();
        payload.specialty = specialty;
      }
      const response = await fetch(`${API_BASE}/doctor-auth/verify-otp/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Client-Type': 'doctor_app' },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        showNotice(data.error || 'That code was not accepted. Request a new one and try again.', 'error');
        return;
      }

      storeAuthData(data);
      navigate(returnTo, { replace: true });
    } catch {
      showNotice('Network error. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setStep('phone');
    setOtp('');
    setRequiresProfileSetup(null);
  };

  return (
    <>
    <Box className="doctor-auth-page">
      <header className="doctor-auth-header"><DoctorBrand /><InstallButton /></header>
      <Container component="main" maxWidth="lg" className="doctor-auth-container">
        <Box className="doctor-auth-story">
          <Link to="/" className="doctor-auth-back"><ArrowBackRounded fontSize="small" /> Back to Prestige</Link>
          <Typography className="doctor-auth-kicker">YOUR CARE, IN FOCUS</Typography>
          <Typography component="h2" className="doctor-auth-display">A little less admin. A lot more care.</Typography>
          <Typography className="doctor-auth-story-copy">A clear place for your clinical work, patient conversations and next steps. Pick up where you left off.</Typography>
          <Box className="doctor-auth-benefits">
            <Box><CheckCircleOutlineRounded /><Typography>Clinical work, ready to review</Typography></Box>
            <Box><CheckCircleOutlineRounded /><Typography>Patient context, all together</Typography></Box>
            <Box><CheckCircleOutlineRounded /><Typography>Follow-through, built into your day</Typography></Box>
          </Box>
        </Box>

        <Box component="section" className="doctor-auth-card">
          <Box className="doctor-auth-card-heading">
            <Box className="doctor-auth-card-icon"><VerifiedUserRounded /></Box>
            <Box>
              <Typography className="doctor-auth-eyebrow">Doctor workspace</Typography>
              <Typography component="h1" className="doctor-auth-title">{step === 'phone' ? 'Start with your WhatsApp number' : requiresProfileSetup ? 'Complete your invited profile' : 'Welcome back'}</Typography>
            </Box>
          </Box>
          <Typography className="doctor-auth-subtitle">{step === 'phone' ? 'We’ll send a verification code to your WhatsApp. No password to remember.' : `Enter the code sent to ${displayPhone(phoneNumber)}.`}</Typography>

          <Box className="doctor-auth-steps" aria-label="Sign-in progress">
            <Box className={`doctor-auth-step ${step === 'phone' ? 'doctor-auth-step-active' : 'doctor-auth-step-done'}`}><Box>1</Box><Typography>Number</Typography></Box>
            <Box className="doctor-auth-step-line" />
            <Box className={`doctor-auth-step ${step === 'otp' ? 'doctor-auth-step-active' : ''}`}><Box>2</Box><Typography>Verify</Typography></Box>
          </Box>

          {step === 'phone' ? (
            <Box component="form" onSubmit={handleRequestOtp} className="doctor-auth-form">
              <TextField
                label="WhatsApp number"
                placeholder="0801 234 5678"
                value={phoneNumber}
                onChange={(event) => setPhoneNumber(event.target.value)}
                autoComplete="tel"
                type="tel"
                inputMode="tel"
                fullWidth
                InputProps={{ startAdornment: <PhoneIphoneRounded className="doctor-auth-field-icon" /> }}
              />
              <Button type="submit" variant="contained" disabled={loading} endIcon={loading ? <CircularProgress size={18} color="inherit" /> : <ArrowForwardRounded />}>
                {loading ? 'Sending code…' : 'Continue securely'}
              </Button>
              <Box className="doctor-auth-trust"><LockOutlined /><Typography>One WhatsApp verification every 7 days on this device.</Typography></Box>
            </Box>
          ) : (
            <Box component="form" onSubmit={handleVerifyOtp} className="doctor-auth-form">
              {requiresProfileSetup === true && (
                <Box className="doctor-auth-name-row">
                  <TextField label="First name" value={firstName} onChange={(event) => setFirstName(event.target.value)} fullWidth autoComplete="given-name" />
                  <TextField label="Last name" value={lastName} onChange={(event) => setLastName(event.target.value)} fullWidth autoComplete="family-name" />
                </Box>
              )}
              {requiresProfileSetup === true && (
                <TextField select label="Primary specialty" value={specialty} onChange={(event) => setSpecialty(event.target.value)} fullWidth>
                  {SPECIALTIES.map((item) => <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>)}
                </TextField>
              )}
              <TextField
                label="WhatsApp code"
                placeholder="6-digit code"
                value={otp}
                onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                fullWidth
                inputProps={{ maxLength: 6 }}
                className="doctor-auth-otp-input"
              />
              <Button type="submit" variant="contained" disabled={loading || requiresProfileSetup === null} endIcon={loading ? <CircularProgress size={18} color="inherit" /> : <VerifiedUserRounded />}>
                {loading ? 'Verifying…' : 'Verify & enter workspace'}
              </Button>
              <Box className="doctor-auth-secondary-actions">
                <Button type="button" variant="text" startIcon={<ArrowBackRounded />} onClick={handleBack}>Change number</Button>
                <Button type="button" variant="text" onClick={handleRequestOtp} disabled={loading}>Resend code</Button>
              </Box>
            </Box>
          )}
          <Typography className="doctor-auth-legal">By continuing, you agree to our <Link to="/terms">Terms of use</Link> and <Link to="/privacy">Privacy notice</Link>. Your clinical decisions remain yours.</Typography>
        </Box>
      </Container>
      <Snackbar open={notice.open} autoHideDuration={5000} onClose={() => setNotice((current) => ({ ...current, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={notice.severity} variant="filled" onClose={() => setNotice((current) => ({ ...current, open: false }))}>{notice.message}</Alert>
      </Snackbar>
    </Box>
    </>
  );
}
