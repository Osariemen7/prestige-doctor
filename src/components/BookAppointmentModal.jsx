import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Alert,
  CircularProgress,
  MenuItem,
  Stack,
  IconButton,
  useMediaQuery,
  useTheme
} from '@mui/material';
import {
  Close as CloseIcon,
  Event as EventIcon,
  Payment as PaymentIcon
} from '@mui/icons-material';
import { getAccessToken } from '../api';

const BookAppointmentModal = ({ open, onClose, patientId, patientName, onSuccess }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    start_time: '',
    reason: '',
    channel: 'audio' // Default to new audio channel
  });

  const channels = [
    { value: 'audio', label: 'Audio (WhatsApp Call)' },
    { value: 'video', label: 'Video Call' },
    { value: 'in-person', label: 'In-person Visit' }
  ];

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const token = await getAccessToken();
    if (!token) {
      setError('Authentication required');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('https://service.prestigedelta.com/appointments/book-patient/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          patient_id: patientId,
          start_time: formData.start_time.replace('T', ' ')
        })
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => {
          onSuccess(result);
          onClose();
          setSuccess(false);
        }, 2000);
      } else {
        throw new Error(result.error || 'Failed to request appointment');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      fullScreen={isMobile}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle sx={{ m: 0, p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6" fontWeight={700}>
          {success ? 'Request Sent' : 'Schedule Appointment'}
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        
        {success ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <EventIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
            <Typography variant="h6" fontWeight={700} gutterBottom>
              Appointment Requested
            </Typography>
            <Typography variant="body2" color="text.secondary">
              The appointment has been scheduled. The patient will be notified to confirm and complete payment in their app.
            </Typography>
          </Box>
        ) : (
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Request a follow-up or new consultation for {patientName}.
            </Typography>
            
            <TextField
              label="Appointment Date & Time"
              type="datetime-local"
              name="start_time"
              value={formData.start_time}
              onChange={handleChange}
              fullWidth
              InputLabelProps={{ shrink: true }}
              required
            />
            
            <TextField
              select
              label="Channel"
              name="channel"
              value={formData.channel}
              onChange={handleChange}
              fullWidth
              required
            >
              {channels.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
            
            <TextField
              label="Reason / Clinical Note"
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              multiline
              rows={3}
              fullWidth
              placeholder="Briefly describe the reason for this appointment"
              required
            />
          </Stack>
        )}
      </DialogContent>
      
      {!success && (
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained" 
            disabled={loading || !formData.start_time || !formData.reason}
            startIcon={loading ? <CircularProgress size={20} /> : <EventIcon />}
          >
            {loading ? 'Requesting...' : 'Request Appointment'}
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
};

export default BookAppointmentModal;
