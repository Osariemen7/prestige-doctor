import React, { useEffect, useState } from 'react';
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
  Event as EventIcon
} from '@mui/icons-material';
import { getAccessToken } from '../api';

const parseBookingRequestResponse = async (response) => {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.toLowerCase().includes('application/json')) {
    return response.json().catch(() => ({}));
  }

  const rawText = await response.text().catch(() => '');
  return { rawText };
};

const getBookingRequestErrorMessage = (response, result) => {
  if (result?.detail || result?.error || result?.message) {
    return result.detail || result.error || result.message;
  }

  const rawText = typeof result?.rawText === 'string' ? result.rawText : '';
  const returnedHtml = /<!doctype html>|<html/i.test(rawText);

  if (response.status === 404 && returnedHtml) {
    return 'This booking-request endpoint is not available in the current API environment yet.';
  }

  if (returnedHtml) {
    return 'The booking-request endpoint returned an unexpected HTML response.';
  }

  return 'Failed to request appointment';
};

const BookAppointmentModal = ({
  open,
  onClose,
  patientId,
  reviewId = null,
  reviewPublicId = null,
  patientName,
  onSuccess,
  initialReason = '',
  initialChannel = 'audio',
  title = 'Request Patient Booking',
  description = null,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [bookingResult, setBookingResult] = useState(null);

  const [formData, setFormData] = useState({
    reason: '',
    channel: 'audio'
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    setFormData({
      reason: initialReason,
      channel: initialChannel || 'audio',
    });
    setError('');
    setSuccess(false);
    setBookingResult(null);
  }, [open, initialReason, initialChannel]);

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

    if (!reviewPublicId) {
      setError('Review identifier is missing');
      setLoading(false);
      return;
    }

    const token = await getAccessToken();
    if (!token) {
      setError('Authentication required');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`https://api.prestigedelta.com/provider-reviews/${reviewPublicId}/request-patient-booking/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reason: formData.reason,
          channel: formData.channel,
        })
      });

      const result = await parseBookingRequestResponse(response);

      if (response.ok) {
        if (typeof result?.rawText === 'string' && /<!doctype html>|<html/i.test(result.rawText)) {
          throw new Error('The booking-request endpoint returned an unexpected HTML response.');
        }
        setBookingResult(result);
        setSuccess(true);
        setTimeout(() => {
          onSuccess(result);
          onClose();
          setSuccess(false);
        }, 2000);
      } else {
        throw new Error(getBookingRequestErrorMessage(response, result));
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
        <Typography component="span" variant="h6" fontWeight={700}>
          {success ? 'Booking Request Sent' : title}
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
              Booking Link Sent
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {bookingResult?.callback_booking_request?.booking_url
                ? 'The patient has been sent a WhatsApp booking link and can also reply in chat if they want help booking.'
                : 'The patient booking request has been sent successfully.'}
            </Typography>
          </Box>
        ) : (
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {description || `Send ${patientName} a booking link so they can choose a convenient time themselves.`}
            </Typography>
            
            <TextField
              select
              label="Preferred Channel"
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
            disabled={loading || !formData.reason}
            startIcon={loading ? <CircularProgress size={20} /> : <EventIcon />}
          >
            {loading ? 'Sending...' : 'Send Booking Request'}
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
};

export default BookAppointmentModal;
