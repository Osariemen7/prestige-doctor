import React, { useState, useEffect } from 'react';
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
  FormControlLabel,
  Switch,
  Stack,
  Drawer,
  useMediaQuery,
  useTheme,
  IconButton
} from '@mui/material';
import {
  Close as CloseIcon,
  Save as SaveIcon,
  Send as SendIcon
} from '@mui/icons-material';

const PatientDetailsModal = ({ 
  open, 
  onClose, 
  onSubmit, 
  initialData = null,
  loading = false,
  readOnly = false
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [formData, setFormData] = useState({
    patient_first_name: '',
    patient_last_name: '',
    patient_phone_number: ''
  });
  const [saveDocumentation, setSaveDocumentation] = useState(true);
  const [error, setError] = useState('');

  const primaryActionSx = {
    px: { xs: 3, sm: 5 },
    py: 2,
    fontWeight: 'bold',
    textTransform: 'none',
    boxShadow: 4,
    minWidth: { xs: '100%', sm: 220 },
    bgcolor: 'primary.main',
    color: 'common.white',
    '&:hover': {
      bgcolor: 'primary.dark',
      boxShadow: 6
    }
  };

  const secondaryActionSx = {
    px: { xs: 3, sm: 4 },
    py: 2,
    fontWeight: 'bold',
    textTransform: 'none',
    minWidth: { xs: '100%', sm: 160 },
  borderWidth: 2,
    borderColor: 'grey.400',
    color: 'text.primary',
    '&:hover': {
      borderColor: 'grey.600',
      bgcolor: 'grey.100'
    }
  };

  // Check if patient data already exists (makes fields read-only)
  const hasExistingFirstName = readOnly && Boolean(initialData?.patient_first_name);
  const hasExistingLastName = readOnly && Boolean(initialData?.patient_last_name);
  const hasExistingPhone = readOnly && Boolean(initialData?.patient_phone_number);
  const hasAllExistingPatientData = hasExistingFirstName && hasExistingLastName && hasExistingPhone;
  const hasExistingPatientData = hasAllExistingPatientData;

  // Pre-populate form data when modal opens
  useEffect(() => {
    if (open && initialData) {
      setFormData({
        patient_first_name: initialData.patient_first_name || '',
        patient_last_name: initialData.patient_last_name || '',
        patient_phone_number: initialData.patient_phone_number || ''
      });
    }
  }, [open, initialData]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate phone number format if provided
    if (formData.patient_phone_number.trim()) {
      const phoneRegex = /^\+\d{1,4}\d{6,14}$/;
      if (!phoneRegex.test(formData.patient_phone_number.trim())) {
        setError('Phone number must be in international format (e.g., +1234567890)');
        return;
      }
    }
    
    // Call parent submit handler
    onSubmit({
      ...formData,
      save_documentation: saveDocumentation
    });
  };

  const handleClose = () => {
    if (!loading) {
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
          <SaveIcon color="primary" />
          <Typography variant="h6" fontWeight="bold">
            Patient Details
          </Typography>
        </Box>
        {isMobile && (
          <IconButton onClick={handleClose} disabled={loading}>
            <CloseIcon />
          </IconButton>
        )}
      </Box>

      {/* Info Alert */}
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          {hasExistingPatientData 
            ? 'Patient details already exist for this encounter and cannot be modified.'
            : 'Please provide patient details to complete the documentation process.'}
        </Typography>
      </Alert>

      {/* Error Message */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Form Fields */}
      <Stack spacing={3}>
        <TextField
          label="First Name"
          name="patient_first_name"
          value={formData.patient_first_name}
          onChange={handleChange}
          fullWidth
          disabled={loading || hasExistingFirstName}
          InputProps={{
            readOnly: hasExistingFirstName
          }}
          placeholder="Enter patient's first name"
        />

        <TextField
          label="Last Name"
          name="patient_last_name"
          value={formData.patient_last_name}
          onChange={handleChange}
          fullWidth
          disabled={loading || hasExistingLastName}
          InputProps={{
            readOnly: hasExistingLastName
          }}
          placeholder="Enter patient's last name"
        />

        <TextField
          label="Phone Number"
          name="patient_phone_number"
          value={formData.patient_phone_number}
          onChange={handleChange}
          fullWidth
          disabled={loading || hasExistingPhone}
          InputProps={{
            readOnly: hasExistingPhone
          }}
          placeholder="+234XXXXXXXXXX"
          helperText="Optional - must be in international format (e.g., +1234567890) for saving documentation"
        />

        {/* Save Documentation Toggle */}
        <Box sx={{ 
          p: 2, 
          bgcolor: 'primary.50', 
          borderRadius: 1,
          border: '1px solid',
          borderColor: 'primary.main'
        }}>
          <FormControlLabel
            control={
              <Switch
                checked={saveDocumentation}
                onChange={(e) => setSaveDocumentation(e.target.checked)}
                disabled={loading}
                color="primary"
              />
            }
            label={
              <Box>
                <Typography variant="subtitle1" fontWeight="bold">
                  Save Documentation
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {saveDocumentation 
                    ? 'Documentation will be automatically processed and saved after upload'
                    : 'Audio will be uploaded but documentation will not be processed'}
                </Typography>
              </Box>
            }
          />
        </Box>
      </Stack>

      {/* Actions */}
      <Box
        sx={{
          mt: 4,
          display: 'flex',
          gap: 2,
          justifyContent: { xs: 'center', sm: 'flex-end' },
          flexDirection: { xs: 'column', sm: 'row' }
        }}
      >
        <Button
          onClick={handleClose}
          disabled={loading}
          variant="outlined"
          sx={secondaryActionSx}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
          sx={primaryActionSx}
        >
          {loading ? 'Processing...' : 'Upload & Process'}
        </Button>
      </Box>
    </Box>
  );

  // Render as Drawer on mobile, Dialog on desktop
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

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 }
      }}
    >
      <DialogContent sx={{ p: 3 }}>
        {modalContent}
      </DialogContent>
    </Dialog>
  );
};

export default PatientDetailsModal;
