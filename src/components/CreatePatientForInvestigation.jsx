import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Checkbox,
  FormControlLabel,
  FormGroup,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { createPatient } from '../services/investigationApi';

// List of chronic conditions
const CHRONIC_CONDITIONS = [
  'Diabetes Mellitus',
  'Hypertension',
  'Asthma',
  'COPD',
  'Heart Disease',
  'Kidney Disease',
  'Liver Disease',
  'Cancer',
  'Thyroid Disorder',
  'Arthritis',
  'Depression',
  'Anxiety',
  'Other',
];

const CreatePatientForInvestigation = ({ open, onClose, onSuccess }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  const isBottomSheet = isMobile || isTablet;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedConditions, setSelectedConditions] = useState([]);
  const [customCondition, setCustomCondition] = useState('');
  const [clinicalHistory, setClinicalHistory] = useState('');

  const handleConditionChange = (condition) => {
    if (selectedConditions.includes(condition)) {
      setSelectedConditions(selectedConditions.filter((c) => c !== condition));
      if (condition === 'Other') {
        setCustomCondition('');
      }
    } else {
      setSelectedConditions([...selectedConditions, condition]);
    }
  };

  const validateForm = () => {
    if (!firstName.trim() && !lastName.trim()) {
      setError('Please enter first name or last name');
      return false;
    }
    if (!phoneNumber.trim()) {
      setError('Please enter phone number');
      return false;
    }
    if (selectedConditions.length === 0 && !clinicalHistory.trim()) {
      setError('Please provide either chronic conditions or clinical history');
      return false;
    }
    if (selectedConditions.includes('Other') && !customCondition.trim()) {
      setError('Please specify the custom condition');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const chronicConditions = selectedConditions.map((c) =>
        c === 'Other' ? customCondition.trim() : c
      );

      const patientData = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone_number: phoneNumber.trim(),
        chronic_conditions: chronicConditions,
        clinical_history: clinicalHistory.trim(),
      };

      const response = await createPatient(patientData);
      onSuccess(response);
      handleClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFirstName('');
      setLastName('');
      setPhoneNumber('');
      setSelectedConditions([]);
      setCustomCondition('');
      setClinicalHistory('');
      setError(null);
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      fullScreen={isBottomSheet}
      PaperProps={{
        sx: isBottomSheet
          ? {
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              margin: 0,
              borderRadius: '20px 20px 0 0',
              maxHeight: '95vh',
              display: 'flex',
              flexDirection: 'column',
            }
          : {
              borderRadius: 3,
              maxHeight: '90vh',
            },
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box>
            <Typography variant="h6" fontWeight={700}>
              Create New Patient
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Add a new patient profile for investigation request
            </Typography>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent
        dividers
        sx={isBottomSheet ? { flex: 1, overflow: 'auto', pb: 2 } : {}}
      >
        <Stack spacing={3}>
          {error && <Alert severity="error">{error}</Alert>}

          <TextField
            fullWidth
            label="First Name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Optional if last name provided"
            disabled={loading}
          />

          <TextField
            fullWidth
            label="Last Name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Optional if first name provided"
            disabled={loading}
          />

          <TextField
            fullWidth
            label="Phone Number *"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="e.g., 08012345678 or +2348012345678"
            helperText="Enter in national (08012345678) or international (+234...) format"
            disabled={loading}
            required
          />

          <Box>
            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
              Chronic Conditions
            </Typography>
            <FormGroup>
              {CHRONIC_CONDITIONS.map((condition) => (
                <FormControlLabel
                  key={condition}
                  control={
                    <Checkbox
                      checked={selectedConditions.includes(condition)}
                      onChange={() => handleConditionChange(condition)}
                      disabled={loading}
                    />
                  }
                  label={condition}
                />
              ))}
            </FormGroup>
          </Box>

          {selectedConditions.includes('Other') && (
            <TextField
              fullWidth
              label="Specify Other Condition *"
              value={customCondition}
              onChange={(e) => setCustomCondition(e.target.value)}
              placeholder="Enter the specific condition..."
              disabled={loading}
              required
            />
          )}

          <TextField
            fullWidth
            multiline
            rows={4}
            label="Clinical History"
            value={clinicalHistory}
            onChange={(e) => setClinicalHistory(e.target.value)}
            placeholder="Describe the patient's condition, treatment goals, and current medications..."
            helperText="Include condition details and current routine medications"
            disabled={loading}
          />
        </Stack>
      </DialogContent>

      <DialogActions
        sx={{
          p: 3,
          gap: 2,
          ...(isBottomSheet && {
            position: 'sticky',
            bottom: 0,
            bgcolor: 'background.paper',
            borderTop: '1px solid',
            borderColor: 'divider',
          }),
        }}
      >
        <Button onClick={handleClose} disabled={loading} size="large">
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading}
          size="large"
          sx={{
            borderRadius: 2,
            px: 4,
            background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
          }}
        >
          {loading ? (
            <>
              <CircularProgress size={20} sx={{ mr: 1, color: 'white' }} />
              Creating...
            </>
          ) : (
            'Create Patient'
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreatePatientForInvestigation;
