import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, Button, CircularProgress, Container, MenuItem, Snackbar, TextField, Typography } from '@mui/material';
import {
  ArrowBackRounded,
  ArrowForwardRounded,
  AutoAwesomeRounded,
  CheckCircleOutlineRounded,
  LockOutlined,
  PhoneIphoneRounded,
  VerifiedUserRounded,
} from '@mui/icons-material';
import { isAuthenticated, storeAuthData } from '../api';
import { normalizeDoctorPhone } from '../utils/doctorAuth';
import './DoctorAuth.css';

const API_BASE = `${process.env.REACT_APP_BACKEND_BASE_URL || 'https://api.prestigedelta.com'}/api`;

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

export default function DoctorAuth() {
  const navigate = useNavigate();
  const [step, setStep] = useState('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [isExistingUser, setIsExistingUser] = useState(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [specialty, setSpecialty] = useState('general_practice');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(initialNotice);

  useEffect(() => {
    if (isAuthenticated()) navigate('/', { replace: true });
  }, [navigate]);

  const showNotice = (message, severity = 'info') => setNotice({ open: true, message, severity });

  const handleRequestOtp = async (event) => {
    event?.preventDefault?.();
    const normalized = normalizeDoctorPhone(phoneNumber);
    if (!isValidDoctorPhone(normalized)) {
      showNotice('Enter a valid Nigerian number, for example 0801 234 5678 or +234 801 234 5678.', 'warning');
      return;
    }

    setLoading(true);
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

      setPhoneNumber(normalized);
      setIsExistingUser(Boolean(data.is_existing_user));
      setStep('otp');
      showNotice(data.is_existing_user ? 'Welcome back. Check WhatsApp for your code.' : 'Code sent. Add your details to create your doctor workspace.', 'success');
    } catch {
      showNotice('Network error. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (event) => {
    event?.preventDefault?.();
    if (!/^\d{4,6}$/.test(otp)) {
      showNotice('Enter the verification code sent to WhatsApp.', 'warning');
      return;
    }
    if (!isExistingUser && (!firstName.trim() || !lastName.trim())) {
      showNotice('Add your first and last name to set up your workspace.', 'warning');
      return;
    }

    setLoading(true);
    try {
      const payload = { phone_number: normalizeDoctorPhone(phoneNumber), otp };
      if (!isExistingUser) {
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
      navigate('/', { replace: true });
    } catch {
      showNotice('Network error. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setStep('phone');
    setOtp('');
  };

  return (
    <Box className="doctor-auth-page">
      <Box className="doctor-auth-orb doctor-auth-orb-one" />
      <Box className="doctor-auth-orb doctor-auth-orb-two" />
      <Container maxWidth="lg" className="doctor-auth-container">
        <Box className="doctor-auth-story">
          <Box className="doctor-auth-brand"><Box className="doctor-auth-brand-mark"><AutoAwesomeRounded /></Box><Typography>prestige</Typography></Box>
          <Typography className="doctor-auth-kicker">A calmer way to practice</Typography>
          <Typography component="h1" className="doctor-auth-display">More care, without more chasing.</Typography>
          <Typography className="doctor-auth-story-copy">Prestige gives doctors an AI care team that prepares the work, keeps patients close, and turns trusted follow-through into a durable practice.</Typography>
          <Box className="doctor-auth-benefits">
            <Box><CheckCircleOutlineRounded /><Typography>AI-prepared clinical work</Typography></Box>
            <Box><CheckCircleOutlineRounded /><Typography>High-touch patient continuity</Typography></Box>
            <Box><CheckCircleOutlineRounded /><Typography>Recurring care, built into your workflow</Typography></Box>
          </Box>
        </Box>

        <Box component="section" className="doctor-auth-card">
          <Box className="doctor-auth-card-heading">
            <Box className="doctor-auth-card-icon"><VerifiedUserRounded /></Box>
            <Box>
              <Typography className="doctor-auth-eyebrow">Doctor workspace</Typography>
              <Typography component="h2" className="doctor-auth-title">{step === 'phone' ? 'Start with your WhatsApp number' : isExistingUser ? 'Welcome back' : 'Create your workspace'}</Typography>
            </Box>
          </Box>
          <Typography className="doctor-auth-subtitle">{step === 'phone' ? 'Sign in or create your account in under a minute.' : `Enter the code sent to ${displayPhone(phoneNumber)}.`}</Typography>

          <Box className="doctor-auth-steps">
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
              {!isExistingUser && (
                <Box className="doctor-auth-name-row">
                  <TextField label="First name" value={firstName} onChange={(event) => setFirstName(event.target.value)} fullWidth autoComplete="given-name" />
                  <TextField label="Last name" value={lastName} onChange={(event) => setLastName(event.target.value)} fullWidth autoComplete="family-name" />
                </Box>
              )}
              {!isExistingUser && (
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
              <Button type="submit" variant="contained" disabled={loading} endIcon={loading ? <CircularProgress size={18} color="inherit" /> : <VerifiedUserRounded />}>
                {loading ? 'Verifying…' : 'Verify & enter workspace'}
              </Button>
              <Box className="doctor-auth-secondary-actions">
                <Button type="button" variant="text" startIcon={<ArrowBackRounded />} onClick={handleBack}>Change number</Button>
                <Button type="button" variant="text" onClick={handleRequestOtp} disabled={loading}>Resend code</Button>
              </Box>
            </Box>
          )}
          <Typography className="doctor-auth-legal">By continuing, you agree to use Prestige for clinician-led care. Your clinical decisions remain yours.</Typography>
        </Box>
      </Container>
      <Snackbar open={notice.open} autoHideDuration={5000} onClose={() => setNotice((current) => ({ ...current, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={notice.severity} variant="filled" onClose={() => setNotice((current) => ({ ...current, open: false }))}>{notice.message}</Alert>
      </Snackbar>
    </Box>
  );
}
