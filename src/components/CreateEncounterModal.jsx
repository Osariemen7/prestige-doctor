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
  Drawer,
  IconButton,
  useMediaQuery,
  useTheme,
  Stack
} from '@mui/material';
import {
  Close as CloseIcon,
  PersonAdd as PersonAddIcon
} from '@mui/icons-material';
import { getAccessToken } from '../api';

const convertToInternationalFormat = (phoneNumber) => {
  if (!phoneNumber || typeof phoneNumber !== 'string') {
    return phoneNumber;
  }

  const trimmed = phoneNumber.trim();

  // If already in international format (+234...), return as is
  if (trimmed.startsWith('+')) {
    return trimmed;
  }

  // Convert Nigerian national format (080..., 081..., 090..., 070..., etc.) to international format
  const nigerianRegex = /^0([789]\d{9})$/;
  const match = trimmed.match(nigerianRegex);

  if (match) {
    return `+234${match[1]}`;
  }

  // Return original if no conversion needed
  return trimmed;
};

const CreateEncounterModal = ({ open, onClose, onSuccess, medicalReviewId = null }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    patient_first_name: '',
    patient_last_name: '',
    patient_phone_number: ''
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // If medical_review_id is provided (existing review), we don't need patient info
    // Otherwise, validation: at least first name or last name required for new reviews
    if (!medicalReviewId && !formData.patient_first_name.trim() && !formData.patient_last_name.trim()) {
      setError('Please provide at least a first name or last name for tracking purposes');
      return;
    }

    setLoading(true);
    setError('');

    const token = await getAccessToken();
    if (!token) {
      setError('Authentication required. Please login again.');
      setLoading(false);
      return;
    }

    try {
      // Convert phone number to international format if needed
      const convertedPhone = convertToInternationalFormat(formData.patient_phone_number);
      
      // Build request body based on whether we have a medical_review_id
      const requestBody = medicalReviewId 
        ? { medical_review_id: medicalReviewId }
        : {
            patient_first_name: formData.patient_first_name || '',
            patient_last_name: formData.patient_last_name || '',
            patient_phone_number: convertedPhone || '',
            encounter_date: new Date().toISOString(),
            metadata: {}
          };

      const response = await fetch('https://service.prestigedelta.com/in-person-encounters/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        const encounter = await response.json();
        // Reset form
        setFormData({
          patient_first_name: '',
          patient_last_name: '',
          patient_phone_number: ''
        });
        // Call success callback with encounter data
        if (onSuccess) {
          onSuccess(encounter);
        }
        onClose();
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Failed to create encounter');
      }
    } catch (error) {
      console.error('Error creating encounter:', error);
      setError('An error occurred while creating the encounter');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFormData({
        patient_first_name: '',
        patient_last_name: '',
        patient_phone_number: ''
      });
      setError('');
      onClose();
    }
  };

  const modalContent = (
    <Box component="form" onSubmit={handleSubmit}>
      {/* Header */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        mb: 2,
        pb: isMobile ? 2 : 0,
        borderBottom: isMobile ? '1px solid' : 'none',
        borderColor: 'divider'
      }}>
        <Box display="flex" alignItems="center" gap={1}>
          <PersonAddIcon color="primary" />
          <Typography variant="h6" fontWeight="bold">
            {medicalReviewId ? 'New Encounter for Existing Review' : 'Create New Encounter'}
          </Typography>
        </Box>
        {isMobile && (
          <IconButton onClick={handleClose} disabled={loading}>
            <CloseIcon />
          </IconButton>
        )}
      </Box>

      {/* Instructions */}
      {medicalReviewId ? (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            Creating a new encounter for an existing medical review. Click "Create" to start recording.
          </Typography>
        </Alert>
      ) : (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>Required:</strong> Provide at least a first name or last name for tracking.
            <br />
            <strong>Phone number:</strong> Optional now, but you can add it later when saving the review.
          </Typography>
        </Alert>
      )}

      {/* Error Message */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Form Fields - Only show if not linking to existing review */}
      {!medicalReviewId && (
        <Stack spacing={3}>
          <TextField
            label="First Name"
            name="patient_first_name"
            value={formData.patient_first_name}
            onChange={handleChange}
            fullWidth
            autoFocus
            disabled={loading}
            placeholder="Enter patient's first name"
          />

          <TextField
            label="Last Name"
            name="patient_last_name"
            value={formData.patient_last_name}
            onChange={handleChange}
            fullWidth
            disabled={loading}
            placeholder="Enter patient's last name"
          />

          <TextField
            label="Phone Number (Optional)"
            name="patient_phone_number"
            value={formData.patient_phone_number}
            onChange={handleChange}
            onBlur={(e) => {
              const converted = convertToInternationalFormat(e.target.value);
              if (converted !== e.target.value) {
                setFormData(prev => ({
                  ...prev,
                  patient_phone_number: converted
                }));
              }
            }}
            fullWidth
            type="tel"
            disabled={loading}
            placeholder="+234... or 080..."
            helperText="Enter in national format (080...) or international format (+234...) - will be converted automatically"
          />
        </Stack>
      )}

      {/* Actions */}
      <Box sx={{ 
        display: 'flex', 
        gap: 2, 
        mt: 4,
        flexDirection: isMobile ? 'column-reverse' : 'row',
        justifyContent: 'flex-end'
      }}>
        <Button
          onClick={handleClose}
          disabled={loading}
          fullWidth={isMobile}
          size="large"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : <PersonAddIcon />}
          fullWidth={isMobile}
          size="large"
        >
          {loading ? 'Creating...' : 'Create Encounter'}
        </Button>
      </Box>
    </Box>
  );

  // Mobile: Bottom Sheet Drawer
  if (isMobile) {
    return (
      <Drawer
        anchor="bottom"
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: {
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            maxHeight: '90vh',
            p: 3
          }
        }}
      >
        {modalContent}
      </Drawer>
    );
  }

  // Desktop: Dialog Modal
  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2
        }
      }}
    >
      <DialogContent sx={{ p: 3 }}>
        {modalContent}
      </DialogContent>
    </Dialog>
  );
};

export default CreateEncounterModal;
