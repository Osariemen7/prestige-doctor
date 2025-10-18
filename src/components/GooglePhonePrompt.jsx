import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Avatar
} from '@mui/material';
import { Phone as PhoneIcon } from '@mui/icons-material';

const GooglePhonePrompt = ({ 
  open, 
  onClose, 
  onSubmit, 
  googleUserData,
  loading = false 
}) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');

  const validatePhoneNumber = (phone) => {
    // International format: +[country code][number]
    const regex = /^\+[1-9]\d{1,14}$/;
    return regex.test(phone);
  };

  const handleSubmit = () => {
    setError('');
    
    if (!phoneNumber) {
      setError('Phone number is required');
      return;
    }

    if (!validatePhoneNumber(phoneNumber)) {
      setError('Please enter a valid international phone number (e.g., +2347012345678)');
      return;
    }

    onSubmit(phoneNumber);
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)'
        }
      }}
    >
      <DialogTitle sx={{ 
        textAlign: 'center', 
        pt: 4,
        pb: 2
      }}>
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          gap: 2
        }}>
          <Avatar sx={{ 
            bgcolor: 'primary.main', 
            width: 60, 
            height: 60 
          }}>
            <PhoneIcon sx={{ fontSize: 30 }} />
          </Avatar>
          <Typography variant="h5" fontWeight="bold">
            Complete Your Profile
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ px: 4, py: 3 }}>
        <Typography 
          variant="body1" 
          color="text.secondary" 
          sx={{ mb: 3, textAlign: 'center' }}
        >
          To complete your registration with Google, please provide your phone number.
        </Typography>

        {googleUserData?.email && (
          <Alert severity="info" sx={{ mb: 3 }}>
            <strong>Email:</strong> {googleUserData.email}
          </Alert>
        )}

        <TextField
          fullWidth
          label="Phone Number"
          placeholder="+2347012345678"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          error={!!error}
          helperText={error || 'Include country code (e.g., +234 for Nigeria)'}
          disabled={loading}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 2
            }
          }}
          InputProps={{
            startAdornment: (
              <PhoneIcon sx={{ mr: 1, color: 'text.secondary' }} />
            )
          }}
        />
      </DialogContent>

      <DialogActions sx={{ px: 4, pb: 4, gap: 2 }}>
        <Button 
          onClick={onClose} 
          variant="outlined"
          disabled={loading}
          sx={{ 
            flex: 1,
            borderRadius: 2
          }}
        >
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit}
          variant="contained"
          disabled={loading}
          sx={{ 
            flex: 1,
            borderRadius: 2
          }}
        >
          {loading ? (
            <>
              <CircularProgress size={20} sx={{ mr: 1 }} color="inherit" />
              Completing...
            </>
          ) : (
            'Complete Registration'
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default GooglePhonePrompt;
