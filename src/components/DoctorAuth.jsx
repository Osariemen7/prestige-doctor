import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Paper,
  Typography,
  Snackbar,
  Alert,
  Container,
  Fade,
  MenuItem,
  InputAdornment,
  CircularProgress,
} from '@mui/material';
import {
  MedicalServices as MedicalServicesIcon,
  Phone as PhoneIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { storeAuthData } from '../api';

const API_BASE = 'https://api.prestigedelta.com/api';

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

const DoctorAuth = () => {
  const navigate = useNavigate();

  // Flow steps: 'phone' → 'otp'
  const [step, setStep] = useState('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [isExistingUser, setIsExistingUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  // Signup-only fields (shown when is_existing_user === false)
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [specialty, setSpecialty] = useState('general_practice');

  // ── Step 1: Request OTP ──────────────────────────────────────────────
  const handleRequestOtp = async (e) => {
    e.preventDefault();

    const cleaned = phoneNumber.trim();
    if (!cleaned) {
      setSnackbar({ open: true, message: 'Please enter your phone number.', severity: 'warning' });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/doctor-auth/request-otp/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: cleaned }),
      });
      const data = await res.json();

      if (!res.ok) {
        setSnackbar({ open: true, message: data.error || 'Failed to send OTP.', severity: 'error' });
        return;
      }

      setIsExistingUser(data.is_existing_user);
      setStep('otp');
      setSnackbar({
        open: true,
        message: data.is_existing_user
          ? 'Welcome back! Check WhatsApp for your OTP.'
          : 'OTP sent to your WhatsApp. Fill in your details to create an account.',
        severity: 'success',
      });
    } catch {
      setSnackbar({ open: true, message: 'Network error. Please try again.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Verify OTP ───────────────────────────────────────────────
  const handleVerifyOtp = async (e) => {
    e.preventDefault();

    if (!otp || otp.length < 4) {
      setSnackbar({ open: true, message: 'Please enter the OTP sent to your WhatsApp.', severity: 'warning' });
      return;
    }

    // For new users, require at least first + last name
    if (!isExistingUser && (!firstName.trim() || !lastName.trim())) {
      setSnackbar({ open: true, message: 'Please enter your first and last name.', severity: 'warning' });
      return;
    }

    setLoading(true);
    try {
      const payload = {
        phone_number: phoneNumber.trim(),
        otp,
      };

      if (!isExistingUser) {
        payload.first_name = firstName.trim();
        payload.last_name = lastName.trim();
        payload.specialty = specialty;
      }

      const res = await fetch(`${API_BASE}/doctor-auth/verify-otp/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        setSnackbar({ open: true, message: data.error || 'Verification failed.', severity: 'error' });
        return;
      }

      // Persist tokens + user info
      storeAuthData(data);

      setSnackbar({ open: true, message: 'Authenticated! Redirecting…', severity: 'success' });

      setTimeout(() => {
        if (data.is_new_user) {
          navigate('/complete-profile');
        } else {
          navigate('/reviews');
        }
      }, 800);
    } catch {
      setSnackbar({ open: true, message: 'Network error. Please try again.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setStep('phone');
    setOtp('');
  };

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #2563EB 0%, #1e40af 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
      }}
    >
      <Container maxWidth="xs">
        <Fade in timeout={800}>
          <Paper
            elevation={12}
            sx={{
              p: 4,
              borderRadius: 3,
              background: 'rgba(255,255,255,0.98)',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 16px 48px rgba(0,0,0,0.15)',
              textAlign: 'center',
            }}
          >
            {/* Header */}
            <Box sx={{ mb: 3 }}>
              <MedicalServicesIcon
                sx={{
                  fontSize: 48,
                  color: '#2563EB',
                  mb: 2,
                  filter: 'drop-shadow(0 4px 8px rgba(37,99,235,0.3))',
                }}
              />
              <Typography
                variant="h4"
                fontWeight={700}
                sx={{
                  mb: 1,
                  background: 'linear-gradient(45deg, #2563EB, #1e40af)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {step === 'phone' ? 'Doctor Portal' : isExistingUser ? 'Welcome Back' : 'Create Account'}
              </Typography>
              <Typography variant="body1" sx={{ color: '#666' }}>
                {step === 'phone'
                  ? 'Enter your phone number to receive a WhatsApp OTP'
                  : isExistingUser
                  ? 'Enter the code sent to your WhatsApp'
                  : 'Complete your details and enter the OTP'}
              </Typography>
            </Box>

            {/* ─── Phone Step ─────────────────────────── */}
            {step === 'phone' && (
              <Box component="form" onSubmit={handleRequestOtp} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <TextField
                  label="WhatsApp Phone Number"
                  placeholder="+2348012345678"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                  fullWidth
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PhoneIcon sx={{ color: '#2563EB' }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      '&:hover': { boxShadow: '0 2px 8px rgba(37,99,235,0.1)' },
                    },
                  }}
                />
                <Button
                  type="submit"
                  variant="contained"
                  disabled={loading}
                  fullWidth
                  size="large"
                  sx={{
                    py: 1.5,
                    borderRadius: 2,
                    background: 'linear-gradient(45deg, #2563EB, #1e40af)',
                    boxShadow: '0 4px 16px rgba(37,99,235,0.3)',
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    '&:hover': {
                      background: 'linear-gradient(45deg, #1d4ed8, #1e3a8a)',
                      boxShadow: '0 8px 24px rgba(37,99,235,0.4)',
                      transform: 'translateY(-2px)',
                    },
                    '&:disabled': { background: '#ccc' },
                  }}
                >
                  {loading ? <CircularProgress size={24} sx={{ color: '#fff' }} /> : 'Send OTP via WhatsApp'}
                </Button>
              </Box>
            )}

            {/* ─── OTP Step ──────────────────────────── */}
            {step === 'otp' && (
              <Box component="form" onSubmit={handleVerifyOtp} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                {/* Signup fields for new users */}
                {!isExistingUser && (
                  <>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <TextField
                        label="First Name"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                        fullWidth
                        size="small"
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                      />
                      <TextField
                        label="Last Name"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        required
                        fullWidth
                        size="small"
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                      />
                    </Box>
                    <TextField
                      select
                      label="Specialty"
                      value={specialty}
                      onChange={(e) => setSpecialty(e.target.value)}
                      fullWidth
                      size="small"
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    >
                      {SPECIALTIES.map((s) => (
                        <MenuItem key={s.value} value={s.value}>
                          {s.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  </>
                )}

                <TextField
                  label="OTP Code"
                  placeholder="Enter 6-digit code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  fullWidth
                  inputProps={{ maxLength: 6, inputMode: 'numeric', style: { letterSpacing: '0.5em', textAlign: 'center', fontSize: '1.3rem' } }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      '&:hover': { boxShadow: '0 2px 8px rgba(37,99,235,0.1)' },
                    },
                  }}
                />

                <Button
                  type="submit"
                  variant="contained"
                  disabled={loading}
                  fullWidth
                  size="large"
                  sx={{
                    py: 1.5,
                    borderRadius: 2,
                    background: 'linear-gradient(45deg, #2563EB, #1e40af)',
                    boxShadow: '0 4px 16px rgba(37,99,235,0.3)',
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    '&:hover': {
                      background: 'linear-gradient(45deg, #1d4ed8, #1e3a8a)',
                      boxShadow: '0 8px 24px rgba(37,99,235,0.4)',
                      transform: 'translateY(-2px)',
                    },
                    '&:disabled': { background: '#ccc' },
                  }}
                >
                  {loading ? <CircularProgress size={24} sx={{ color: '#fff' }} /> : 'Verify & Continue'}
                </Button>

                <Button
                  startIcon={<ArrowBackIcon />}
                  onClick={handleBack}
                  sx={{ color: '#666', textTransform: 'none' }}
                >
                  Change phone number
                </Button>

                <Button
                  onClick={handleRequestOtp}
                  disabled={loading}
                  sx={{ color: '#2563EB', textTransform: 'none', fontWeight: 600 }}
                >
                  Resend OTP
                </Button>
              </Box>
            )}
          </Paper>
        </Fade>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert
            onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
            severity={snackbar.severity}
            variant="filled"
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Container>
    </Box>
  );
};

export default DoctorAuth;
