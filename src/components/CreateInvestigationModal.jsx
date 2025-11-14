import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Autocomplete,
  Stack,
  Box,
  Typography,
  IconButton,
  Chip,
  Divider,
  Paper,
  Grid,
  InputAdornment,
  Alert,
  CircularProgress,
  alpha,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Close as CloseIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Science as ScienceIcon,
  Person as PersonIcon,
  AttachMoney as MoneyIcon,
} from '@mui/icons-material';
import {
  getDefaultListings,
  createInvestigationRequest,
  updateInvestigationRequest,
  getAllPatients,
  formatCurrency,
} from '../services/investigationApi';
import CreatePatientForInvestigation from './CreatePatientForInvestigation';

const CreateInvestigationModal = ({ open, onClose, onSuccess, editData = null }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  const isBottomSheet = isMobile || isTablet;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [availableTests, setAvailableTests] = useState([]);
  const [loadingTests, setLoadingTests] = useState(false);
  const [patients, setPatients] = useState([]);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [createPatientModalOpen, setCreatePatientModalOpen] = useState(false);

  // Helper to get current UTC time in YYYY-MM-DDTHH:mm format
  const getCurrentUTCDateTime = () => {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const day = String(now.getUTCDate()).padStart(2, '0');
    const hours = String(now.getUTCHours()).padStart(2, '0');
    const minutes = String(now.getUTCMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Form state
  const [patientId, setPatientId] = useState('');
  const [patientSearch, setPatientSearch] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('out_of_pocket');
  const [investigations, setInvestigations] = useState([
    {
      testType: '',
      reason: '',
      scheduledDateTime: getCurrentUTCDateTime(), // Default to current UTC time
      listing: null,
    },
  ]);

  const mapEditInvestigations = (editInvestigationList) =>
    editInvestigationList.map((inv) => ({
      id: inv.id,
      testType: inv.test_type,
      reason: inv.reason,
      scheduledDateTime: inv.scheduled_time
        ? new Date(inv.scheduled_time).toISOString().slice(0, 16)
        : getCurrentUTCDateTime(),
      listing: {
        code: inv.listing?.code || inv.test_type,
        price: inv.listing?.price || Number(inv.cost || 0),
        currency: inv.listing?.currency || inv.currency || 'NGN',
        name: inv.listing?.name || inv.test_type,
      },
    }));

  useEffect(() => {
    if (open) {
      loadAvailableTests();
      loadPatients();
      if (editData) {
        setPatientId((editData.patient_id || editData.patient?.id)?.toString() || '');
        setInvestigations(mapEditInvestigations(editData.investigations || []));
        setPaymentMethod(editData.payment_method || 'out_of_pocket');
      } else {
        setPatientId('');
        setPaymentMethod('out_of_pocket');
        setInvestigations([
          {
            testType: '',
            reason: '',
            scheduledDateTime: getCurrentUTCDateTime(),
            listing: null,
          },
        ]);
      }
    }
  }, [open, editData]);

  const findListingByTestName = (testName) =>
    availableTests.find(
      (listing) =>
        listing?.name?.toLowerCase() === testName?.toLowerCase() ||
        listing?.code?.toLowerCase() === testName?.toLowerCase()
    );

  const loadAvailableTests = async () => {
    setLoadingTests(true);
    try {
      const data = await getDefaultListings();
      console.log('Available tests loaded:', data);
      setAvailableTests(data.listings || data || []);
    } catch (err) {
      console.error('Error loading tests:', err);
      setError('Failed to load available tests');
    } finally {
      setLoadingTests(false);
    }
  };

  const loadPatients = async () => {
    setLoadingPatients(true);
    try {
      const data = await getAllPatients();
      // API returns array directly
      setPatients(Array.isArray(data) ? data : data.patients || []);
    } catch (err) {
      console.error('Error loading patients:', err);
    } finally {
      setLoadingPatients(false);
    }
  };

  const handleAddInvestigation = () => {
    setInvestigations([
      ...investigations,
      {
        testType: '',
        reason: '',
        scheduledDateTime: getCurrentUTCDateTime(),
        listing: null,
      },
    ]);
  };

  const handleRemoveInvestigation = (index) => {
    if (investigations.length > 1) {
      setInvestigations(investigations.filter((_, i) => i !== index));
    }
  };

  const handleInvestigationChange = (index, field, value) => {
    const updated = [...investigations];
    updated[index][field] = value;

    // If test is selected, auto-fill test type and listing
    if (field === 'listing' && value) {
      updated[index].testType = value.name;
    }

    setInvestigations(updated);
  };

  const calculateTotal = () => {
    return investigations.reduce((sum, inv) => {
      if (inv.listing?.price) {
        return sum + parseFloat(inv.listing.price);
      }
      return sum;
    }, 0);
  };

  const validateForm = () => {
    if (!patientId) {
      console.warn('Validation failed: No patient ID');
      setError('Please enter a patient ID');
      return false;
    }

    for (let i = 0; i < investigations.length; i++) {
      const inv = investigations[i];
      console.log(`Checking investigation ${i}:`, inv);
      if (!inv.testType) {
        console.warn(`Validation failed: No testType for investigation ${i}`);
        setError(`Please enter test type for investigation ${i + 1}`);
        return false;
      }
      const listing = inv.listing || findListingByTestName(inv.testType);
      if (!listing) {
        console.warn(`Validation failed: No listing for investigation ${i}`);
        setError(`Please select a test for investigation ${i + 1}`);
        return false;
      }
      if (!inv.reason) {
        console.warn(`Validation failed: No reason for investigation ${i}`);
        setError(`Please enter reason for investigation ${i + 1}`);
        return false;
      }
      // Validate that price is greater than zero
      const price = parseFloat(listing.price);
      if (isNaN(price) || price <= 0) {
        console.warn(`Validation failed: Invalid price for investigation ${i}`);
        setError(`Investigation ${i + 1} requires a valid price greater than zero. Current price: ${listing.price ? formatCurrency(price, listing.currency) : 'Not set'}`);
        return false;
      }
    }

    console.log('Form validation passed');
    return true;
  };

  const handleSubmit = async () => {
    setError(null);
    console.log('handleSubmit called');
    console.log('Current state:', { patientId, investigations, createOrder: true, paymentMethod, editData: !!editData });

    if (!validateForm()) {
      console.log('Form validation failed');
      return;
    }

    setLoading(true);
    try {
      const investigationPayload = investigations.map((inv) => {
        const listing = inv.listing || findListingByTestName(inv.testType);
        if (!listing || !listing.code || listing.price == null) {
          throw new Error(`Investigation ${inv.testType} is missing required listing information`);
        }

        // Validate that price is greater than zero
        const price = parseFloat(listing.price);
        if (price <= 0) {
          throw new Error(`Investigation ${inv.testType} requires a valid price greater than zero. Current price: ${formatCurrency(price, listing.currency)}`);
        }

        return {
          ...(inv.id && { id: inv.id }),
          testType: inv.testType,
          reason: inv.reason,
          scheduledTime: new Date(inv.scheduledDateTime).toISOString(),
          listing: {
            code: listing.code,
            price: price,
            currency: listing.currency || 'NGN',
          },
        };
      });

      console.log('Investigation payload:', investigationPayload);

      let response;
      
      if (editData) {
        // Update existing request
        console.log('Updating investigation request with ID:', editData.id);
        response = await updateInvestigationRequest({
          investigationRequestId: editData.id,
          patientId: parseInt(patientId),
          investigations: investigationPayload,
          createOrder: true,
          paymentMethod,
        });
      } else {
        // Create new request
        console.log('Creating new investigation request');
        response = await createInvestigationRequest({
          patientId: parseInt(patientId),
          investigations: investigationPayload,
          createOrder: true,
          paymentMethod,
        });
      }

      console.log('API Response:', response);
      onSuccess(response);
      handleClose();
    } catch (err) {
      console.error('Error submitting investigation request:', err);
      setError(err.message || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      // Reset form
      setPatientId('');
      setPatientSearch('');
      setInvestigations([
        {
          testType: '',
          reason: '',
          scheduledTime: new Date(),
          listing: null,
        },
      ]);
      setError(null);
      onClose();
    }
  };

  const handlePatientCreated = (response) => {
    // response contains patient_id from the API
    setPatientId(response.patient_id?.toString() || '');
    setCreatePatientModalOpen(false);
    // Reload patients list
    loadPatients();
  };

  const paymentMethods = [
    { value: 'out_of_pocket', label: 'Out of Pocket' },
    { value: 'insurance', label: 'Insurance' },
    { value: 'hmo', label: 'HMO' },
  ];

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      fullScreen={isBottomSheet}
      PaperProps={{
        sx: isBottomSheet
          ? {
              // Bottom sheet styling for mobile/tablet
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
              // Desktop modal styling
              borderRadius: 3,
              maxHeight: '90vh',
            },
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2,
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ScienceIcon sx={{ color: 'white', fontSize: 28 }} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={700}>
                {editData ? 'Update Investigation Request' : 'New Investigation Request'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {editData ? 'Modify laboratory tests for your patient' : 'Request laboratory tests for your patient'}
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={handleClose} disabled={loading}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent
        dividers
        sx={isBottomSheet ? { flex: 1, overflow: 'auto', pb: 2 } : {}}
      >
        <Stack spacing={3}>
          {/* Error Alert */}
          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Patient Selection */}
          <Paper
            elevation={0}
            sx={{
              p: 3,
              border: '2px solid',
              borderColor: 'divider',
              borderRadius: 2,
              bgcolor: alpha('#3b82f6', 0.02),
            }}
          >
            <Typography variant="subtitle1" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PersonIcon color="primary" />
              Patient Information
            </Typography>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={editData ? 12 : 6}>
                {editData ? (
                  // Read-only patient info when editing
                  <TextField
                    fullWidth
                    label="Patient ID"
                    value={patientId}
                    disabled
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PersonIcon color="action" />
                        </InputAdornment>
                      ),
                    }}
                  />
                ) : (
                  // Patient dropdown when creating
                  <Autocomplete
                    fullWidth
                    options={patients}
                    loading={loadingPatients}
                    value={patients.find((p) => p.patient_id.toString() === patientId) || null}
                    onChange={(e, newValue) => setPatientId(newValue?.patient_id?.toString() || '')}
                    getOptionLabel={(option) => `${option.patient_id} - ${option.patient_name}`}
                    isOptionEqualToValue={(option, value) => option?.patient_id === value?.patient_id}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Select Patient *"
                        placeholder="Search by ID or name"
                        required
                      />
                    )}
                  />
                )}
              </Grid>
              {!editData && (
                <Grid item xs={12} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Can't find your patient?
                  </Typography>
                  <Button
                    size="small"
                    onClick={() => setCreatePatientModalOpen(true)}
                    sx={{
                      textTransform: 'none',
                      color: 'primary.main',
                      '&:hover': { bgcolor: alpha('#2563eb', 0.08) },
                    }}
                  >
                    Create New Patient
                  </Button>
                </Grid>
              )}
              <Grid item xs={12} sm={editData ? 12 : 6}>
                <Autocomplete
                  options={paymentMethods}
                  value={paymentMethods.find((pm) => pm.value === paymentMethod) || null}
                  onChange={(e, newValue) => setPaymentMethod(newValue?.value || 'out_of_pocket')}
                  getOptionLabel={(option) => option.label}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Payment Method"
                      placeholder="Select payment method"
                    />
                  )}
                />
              </Grid>
            </Grid>
          </Paper>

          {/* Investigations */}
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle1" fontWeight={600}>
                Investigation Tests
              </Typography>
              <Button
                startIcon={<AddIcon />}
                onClick={handleAddInvestigation}
                size="small"
                variant="outlined"
                sx={{ borderRadius: 2 }}
              >
                Add Test
              </Button>
            </Box>

            <Stack spacing={2}>
              {investigations.map((investigation, index) => (
                <Paper
                  key={index}
                  elevation={0}
                  sx={{
                    p: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 2,
                    position: 'relative',
                  }}
                >
                  {investigations.length > 1 && (
                    <IconButton
                      size="small"
                      onClick={() => handleRemoveInvestigation(index)}
                      sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        color: 'error.main',
                      }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  )}

                  <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 2, display: 'block' }}>
                    Investigation #{index + 1}
                  </Typography>

                  <Stack spacing={2}>
                    <Autocomplete
                      options={availableTests}
                      loading={loadingTests}
                      value={investigation.listing}
                      onChange={(e, newValue) => handleInvestigationChange(index, 'listing', newValue)}
                      getOptionLabel={(option) => `${option.name} - ${option.code}`}
                      groupBy={(option) => option.category || 'Other'}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Select Test"
                          placeholder="Search for a test..."
                          required
                          InputProps={{
                            ...params.InputProps,
                            startAdornment: (
                              <>
                                <InputAdornment position="start">
                                  <ScienceIcon color="action" />
                                </InputAdornment>
                                {params.InputProps.startAdornment}
                              </>
                            ),
                          }}
                        />
                      )}
                      renderOption={(props, option, state) => {
                        const { key, ...restProps } = props;
                        return (
                          <Box key={key} component="li" {...restProps}>
                            <Box sx={{ width: '100%' }}>
                              <Typography variant="body2" fontWeight={500}>
                                {option.name}
                              </Typography>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                                <Typography variant="caption" color="text.secondary">
                                  {option.code} • {option.category}
                                </Typography>
                                <Typography variant="caption" color="primary" fontWeight={600}>
                                  {formatCurrency(option.price, option.currency)}
                                </Typography>
                              </Box>
                            </Box>
                          </Box>
                        );
                      }}
                    />

                    <TextField
                      fullWidth
                      label="Test Type/Name"
                      value={investigation.testType}
                      onChange={(e) => handleInvestigationChange(index, 'testType', e.target.value)}
                      required
                      placeholder="E.g., Complete Blood Count"
                    />

                    <TextField
                      fullWidth
                      label="Reason for Investigation"
                      value={investigation.reason}
                      onChange={(e) => handleInvestigationChange(index, 'reason', e.target.value)}
                      required
                      multiline
                      rows={2}
                      placeholder="E.g., Routine checkup, suspected anemia"
                    />

                    <TextField
                      fullWidth
                      label="Scheduled Date & Time"
                      type="datetime-local"
                      value={investigation.scheduledDateTime}
                      onChange={(e) => handleInvestigationChange(index, 'scheduledDateTime', e.target.value)}
                      InputLabelProps={{
                        shrink: true,
                      }}
                      required
                    />

                    {investigation.listing && (
                      <Box sx={{ display: 'flex', gap: 2 }}>
                        <TextField
                          fullWidth
                          label="Test Cost"
                          type="number"
                          value={investigation.listing.price || ''}
                          onChange={(e) => {
                            const newPrice = parseFloat(e.target.value) || 0;
                            handleInvestigationChange(index, 'listing', {
                              ...investigation.listing,
                              price: newPrice,
                            });
                          }}
                          InputProps={{
                            startAdornment: <InputAdornment position="start">₦</InputAdornment>,
                          }}
                          required
                          error={investigation.listing.price <= 0}
                          helperText={investigation.listing.price <= 0 ? 'Price must be greater than zero' : ''}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              '&.Mui-error': {
                                '& fieldset': {
                                  borderColor: 'error.main',
                                },
                              },
                            },
                          }}
                        />
                        <Box
                          sx={{
                            minWidth: 120,
                            display: 'flex',
                            alignItems: 'center',
                            p: 2,
                            bgcolor: alpha('#10b981', 0.05),
                            borderRadius: 1,
                          }}
                        >
                          <Typography variant="body2" color="text.secondary">
                            {investigation.listing.currency || 'NGN'}
                          </Typography>
                        </Box>
                      </Box>
                    )}
                  </Stack>
                </Paper>
              ))}
            </Stack>
          </Box>

          {/* Total Summary */}
          <Divider />
          <Box
            sx={{
              p: 3,
              bgcolor: alpha('#2563eb', 0.05),
              borderRadius: 2,
              border: '2px solid',
              borderColor: 'primary.main',
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Total Cost ({investigations.length} {investigations.length === 1 ? 'test' : 'tests'})
                </Typography>
                <Typography variant="h4" fontWeight={700} color="primary">
                  {formatCurrency(calculateTotal())}
                </Typography>
              </Box>
              <MoneyIcon sx={{ fontSize: 48, color: 'primary.main', opacity: 0.2 }} />
            </Stack>
          </Box>
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
        <Button onClick={handleClose} disabled={loading} size="large" sx={{ borderRadius: 2 }}>
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
              {editData ? 'Updating...' : 'Creating...'}
            </>
          ) : (
            editData
              ? 'Update Request & Order'
              : 'Create Request & Order'
          )}
        </Button>
      </DialogActions>

      {/* Create Patient Modal */}
      <CreatePatientForInvestigation
        open={createPatientModalOpen}
        onClose={() => setCreatePatientModalOpen(false)}
        onSuccess={handlePatientCreated}
      />
    </Dialog>
  );
};

export default CreateInvestigationModal;
