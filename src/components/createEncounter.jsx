import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAccessToken } from '../api';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  CircularProgress,
  Alert,
  useMediaQuery,
  useTheme,
  Slide,
  IconButton,
  Stack
} from '@mui/material';
import {
  Close as CloseIcon,
  PersonAdd as PersonAddIcon
} from '@mui/icons-material';

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const CreateEncounter = ({ open, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    patient_first_name: '',
    patient_last_name: '',
    patient_phone: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation: At least first name or last name is required
    if (!formData.patient_first_name.trim() && !formData.patient_last_name.trim()) {
      setError('Please enter at least a first name or last name for tracking purposes');
      return;
    }

    setLoading(true);

    const token = await getAccessToken();
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const response = await fetch('https://service.prestigedelta.com/in-person-encounters/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          patient_first_name: formData.patient_first_name.trim(),
          patient_last_name: formData.patient_last_name.trim(),
          patient_phone: formData.patient_phone.trim(),
          encounter_date: new Date().toISOString(),
          metadata: {}
        })
      });

      if (response.ok) {
        const encounter = await response.json();
        // Reset form
        setFormData({
          patient_first_name: '',
          patient_last_name: '',
          patient_phone: ''
        });
        // Close modal and navigate
        if (onSuccess) {
          onSuccess(encounter);
        }
        onClose();
        navigate(`/record/${encounter.public_id}`);
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
        patient_phone: ''
      });
      setError('');
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      TransitionComponent={Transition}
      fullScreen={isMobile}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: isMobile ? 0 : 2,
          m: isMobile ? 0 : 2
        }
      }}
    >
      <DialogTitle
        sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          py: 2
        }}
      >
        <Box display="flex" alignItems="center" gap={1}>
          <PersonAddIcon />
          <Typography variant="h6" fontWeight="bold">
            Create New Encounter
          </Typography>
        </Box>
        <IconButton
          onClick={handleClose}
          disabled={loading}
          sx={{ color: 'white' }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ pt: 3 }}>
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2" fontWeight="bold" gutterBottom>
              Quick Patient Setup
            </Typography>
            <Typography variant="caption">
              Enter at least a first name or last name for tracking. You can add phone number and other details later when saving the encounter.
            </Typography>
          </Alert>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <Stack spacing={3}>
            <TextField
              label="First Name"
              name="patient_first_name"
              value={formData.patient_first_name}
              onChange={handleChange}
              fullWidth
              variant="outlined"
              placeholder="e.g., John"
              helperText="Optional, but at least first or last name is required"
            />

            <TextField
              label="Last Name"
              name="patient_last_name"
              value={formData.patient_last_name}
              onChange={handleChange}
              fullWidth
              variant="outlined"
              placeholder="e.g., Doe"
              helperText="Optional, but at least first or last name is required"
            />

            <TextField
              label="Phone Number"
              name="patient_phone"
              value={formData.patient_phone}
              onChange={handleChange}
              fullWidth
              variant="outlined"
              placeholder="+234..."
              helperText="Optional - you can add this later when finalizing the encounter"
            />
          </Stack>

          <Box
            sx={{
              mt: 3,
              p: 2,
              bgcolor: 'primary.lighter',
              borderRadius: 1,
              borderLeft: '4px solid',
              borderColor: 'primary.main'
            }}
          >
            <Typography variant="body2" color="text.secondary">
              💡 <strong>What's Next?</strong>
              <br />
              After creating the encounter, you'll be able to record audio, upload documentation, and process the medical notes.
            </Typography>
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button
            onClick={handleClose}
            disabled={loading}
            variant="outlined"
            size="large"
            fullWidth={isMobile}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <PersonAddIcon />}
            size="large"
            fullWidth={isMobile}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
              }
            }}
          >
            {loading ? 'Creating...' : 'Create & Continue'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default CreateEncounter;