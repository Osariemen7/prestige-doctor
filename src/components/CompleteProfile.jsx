import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  TextField,
  Paper,
  Typography,
  Snackbar,
  Alert,
  Container,
  MenuItem,
  Fade,
  CircularProgress,
  InputAdornment,
} from '@mui/material';
import {
  MedicalServices as MedicalServicesIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { getAccessToken, getUser, storeAuthData } from '../api';

const API_BASE = 'https://api.prestigehealth.app/api';

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

const CompleteProfile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  const user = getUser();

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    specialty: 'general_practice',
    bio: '',
    qualifications: '',
    reg_number: '',
    clinic_name: '',
    consultation_fee: '',
  });

  useEffect(() => {
    if (user) {
      setForm((prev) => ({
        ...prev,
        first_name: user.full_name?.split(' ')[0] || '',
        last_name: user.full_name?.split(' ').slice(1).join(' ') || '',
        email: user.email || '',
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = await getAccessToken();
      if (!token) {
        navigate('/login');
        return;
      }

      // Only send changed / non-empty fields
      const payload = {};
      Object.entries(form).forEach(([key, val]) => {
        if (val && val.trim()) payload[key] = val.trim();
      });

      const res = await fetch(`${API_BASE}/doctor-auth/complete-profile/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        setSnackbar({ open: true, message: data.error || 'Failed to update profile.', severity: 'error' });
        return;
      }

      // Merge updated info into stored data
      const current = JSON.parse(localStorage.getItem('user-info') || '{}');
      if (data.user) current.user = { ...current.user, ...data.user };
      if (data.provider_profile) current.provider_profile = { ...current.provider_profile, ...data.provider_profile };
      storeAuthData(current);

      setSnackbar({ open: true, message: 'Profile updated!', severity: 'success' });
      setTimeout(() => navigate('/reviews'), 1000);
    } catch {
      setSnackbar({ open: true, message: 'Network error. Please try again.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

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
      <Container maxWidth="sm">
        <Fade in timeout={800}>
          <Paper
            elevation={12}
            sx={{
              p: 4,
              borderRadius: 3,
              background: 'rgba(255,255,255,0.98)',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 16px 48px rgba(0,0,0,0.15)',
            }}
          >
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <MedicalServicesIcon sx={{ fontSize: 42, color: '#2563EB', mb: 1 }} />
              <Typography
                variant="h5"
                fontWeight={700}
                sx={{
                  background: 'linear-gradient(45deg, #2563EB, #1e40af)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Complete Your Profile
              </Typography>
              <Typography variant="body2" sx={{ color: '#666', mt: 1 }}>
                Fill in as many details as you'd like — you can always update later.
              </Typography>
            </Box>

            <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField name="first_name" label="First Name" value={form.first_name} onChange={handleChange} fullWidth size="small" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                <TextField name="last_name" label="Last Name" value={form.last_name} onChange={handleChange} fullWidth size="small" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
              </Box>
              <TextField name="email" label="Email Address" type="email" value={form.email} onChange={handleChange} fullWidth size="small" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
              <TextField select name="specialty" label="Specialty" value={form.specialty} onChange={handleChange} fullWidth size="small" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}>
                {SPECIALTIES.map((s) => (
                  <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
                ))}
              </TextField>
              <TextField name="qualifications" label="Qualifications (e.g. MBBS, FWACP)" value={form.qualifications} onChange={handleChange} fullWidth size="small" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
              <TextField name="reg_number" label="Registration Number (MDCN)" value={form.reg_number} onChange={handleChange} fullWidth size="small" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
              <TextField name="clinic_name" label="Clinic Name" value={form.clinic_name} onChange={handleChange} fullWidth size="small" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
              <TextField
                name="consultation_fee"
                label="Consultation Fee"
                type="number"
                value={form.consultation_fee}
                onChange={handleChange}
                fullWidth
                size="small"
                InputProps={{ startAdornment: <InputAdornment position="start">₦</InputAdornment> }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
              <TextField
                name="bio"
                label="Short Bio"
                value={form.bio}
                onChange={handleChange}
                multiline
                rows={3}
                fullWidth
                size="small"
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />

              <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                <Button
                  variant="outlined"
                  onClick={() => navigate('/reviews')}
                  sx={{ flex: 1, borderRadius: 2, borderColor: '#2563EB', color: '#2563EB' }}
                >
                  Skip for Now
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : <CheckCircleIcon />}
                  sx={{
                    flex: 2,
                    borderRadius: 2,
                    background: 'linear-gradient(45deg, #2563EB, #1e40af)',
                    fontWeight: 600,
                    '&:hover': {
                      background: 'linear-gradient(45deg, #1d4ed8, #1e3a8a)',
                      transform: 'translateY(-1px)',
                    },
                  }}
                >
                  {loading ? 'Saving…' : 'Save Profile'}
                </Button>
              </Box>
            </Box>
          </Paper>
        </Fade>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert onClose={() => setSnackbar((s) => ({ ...s, open: false }))} severity={snackbar.severity} variant="filled" sx={{ width: '100%' }}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Container>
    </Box>
  );
};

export default CompleteProfile;
