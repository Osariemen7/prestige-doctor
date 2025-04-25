import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Paper,
  Typography,
  IconButton,
  TextField,
  FormControl,
  InputAdornment,
  Autocomplete,
  Snackbar,
  Select,
  MenuItem,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  StepConnector,
  styled,
  Fade,
  Card,
  CardContent,
  LinearProgress,
} from '@mui/material';
import { 
  ArrowLeft, 
  ArrowRight, 
  BadgeCheck, 
  Building2, 
  Stethoscope, 
  DollarSign,
  Copy,
  CalendarDays,
  FileBadge,
  Send
} from 'lucide-react';

// Custom styling for stepper
const ColorlibStepConnector = styled(StepConnector)(({ theme }) => ({
  [`&.MuiStepConnector-alternativeLabel`]: {
    top: 22,
  },
  [`&.MuiStepConnector-active`]: {
    [`& .MuiStepConnector-line`]: {
      backgroundImage: 'linear-gradient(95deg, #1976D2 0%, #42a5f5 50%, #1976D2 100%)',
    },
  },
  [`&.MuiStepConnector-completed`]: {
    [`& .MuiStepConnector-line`]: {
      backgroundImage: 'linear-gradient(95deg, #1976D2 0%, #42a5f5 50%, #1976D2 100%)',
    },
  },
  [`& .MuiStepConnector-line`]: {
    height: 3,
    border: 0,
    backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[800] : '#eaeaf0',
    borderRadius: 1,
  },
}));

// Custom step icon
const ColorlibStepIconRoot = styled('div')(({ theme, ownerState }) => ({
  backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[700] : '#ccc',
  zIndex: 1,
  color: '#fff',
  width: 50,
  height: 50,
  display: 'flex',
  borderRadius: '50%',
  justifyContent: 'center',
  alignItems: 'center',
  boxShadow: '0 4px 10px 0 rgba(0,0,0,.1)',
  ...(ownerState.active && {
    backgroundImage: 'linear-gradient(136deg, #1976D2 0%, #42a5f5 50%, #1976D2 100%)',
    boxShadow: '0 4px 10px 0 rgba(0,0,0,.25)',
  }),
  ...(ownerState.completed && {
    backgroundImage: 'linear-gradient(136deg, #1976D2 0%, #42a5f5 50%, #1976D2 100%)',
  }),
}));

const ColorlibStepIcon = (props) => {
  const { active, completed, className, icon } = props;

  const icons = {
    1: <Stethoscope size={24} />,
    2: <Building2 size={24} />,
    3: <BadgeCheck size={24} />,
  };

  return (
    <ColorlibStepIconRoot ownerState={{ completed, active }} className={className}>
      {icons[String(icon)]}
    </ColorlibStepIconRoot>
  );
};

const ProviderPage = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [clinicName, setClinicName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [qualifications, setQualifications] = useState(null);
  const [provider, setProvider] = useState('');
  const [referral_code, setReferal] = useState('');
  const [dateOfRegistration, setDateOfRegistration] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [bio, setBio] = useState('');
  const [message, setMessage] = useState('');
  const [amount, setAmount] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState('NGN');
  const [regNumber, setRegNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const qualificationOptions = [
    { label: 'MBBS', value: 'MBBS' },
    { label: 'MD', value: 'MD' },
    { label: 'MBChB', value: 'MBChB' },
    { label: 'BDS', value: 'BDS' },
    { label: 'BPharm', value: 'BPharm' },
    { label: 'HND', value: 'HND' },
    { label: 'OND', value: 'OND' },
    { label: 'BSc', value: 'BSc' },
    { label: 'RN', value: 'RN' },
    { label: 'RPH', value: 'RPH' },
    { label: 'pharmD', value: 'pharmD' },
  ];

 const providerType = [
    {value:'doctor', label:'Doctor'},
    {value:'dentist', label:'Dentist'},
    {value:'pharmacist', label: 'Pharmacist'},
    {value:'lab_scientist', label:'Lab Scientist'},
    {value:'radiographer', label:'Radiographer'},
    {value:'nurse', label:'Nurse'},
];

const currencies = {
  NGN: '₦',
  USD: '$',
  GBP: '£'
};

const steps = [
  {
    label: 'Professional Information',
    description: 'Select your profession and qualifications',
  },
  {
    label: 'Personal Details',
    description: 'Tell us about you and your practice',
  },
  {
    label: 'Finalize Profile',
    description: 'Complete your registration details',
  },
];

const getRefreshToken = async () => {
  try {
    const userInfo = localStorage.getItem('user-info'); // Use localStorage for web storage
    const parsedUserInfo = userInfo ? JSON.parse(userInfo) : null;
    if (parsedUserInfo) {
      console.log('Access Token:', parsedUserInfo.access);
      return parsedUserInfo.refresh; // Return the access token
    } else {
      console.log('No user information found in storage.');
      return null;
    }
  } catch (error) {
    console.error('Error fetching token:', error);
    return null;
  }
};

const getAccessToken = async () => {
  let refresh = await getRefreshToken()
  let term = {refresh}
  let rep = await fetch ('https://health.prestigedelta.com/tokenrefresh/',{
    method: 'POST',
    headers:{
      'Content-Type': 'application/json',
      'accept' : 'application/json'
    },
    body:JSON.stringify(term)
  });
  rep = await rep.json();
  if (rep) {
    console.log('Access Token:', rep.access);
    return rep.access // Return the access token
  }
};

useEffect(() => {
  getAccessToken();
}, []);

const handleDateChange = (event) => {
  setDateOfRegistration(event.target.value);
};

// Step navigation handlers
const handleNext = () => {
  setActiveStep((prevActiveStep) => prevActiveStep + 1);
};

const handleBack = () => {
  setActiveStep((prevActiveStep) => prevActiveStep - 1);
};

// Validate step before proceeding
const canProceed = () => {
  switch (activeStep) {
    case 0:
      return provider && qualifications && regNumber;
    case 1:
      return clinicName && specialty && bio;
    case 2:
      return amount && dateOfRegistration;
    default:
      return false;
  }
};

const handleSubmit = async (e) => {
  e.preventDefault();
  setIsSubmitting(true);
  
  const formData = {
    clinic_name: clinicName,
    specialty: specialty,
    qualifications: qualifications?.value,
    reg_number: regNumber,
    date_of_registration: dateOfRegistration,
    provider_type: provider?.value,
    bio: bio,
    rate_per_hour: amount,
    rate_currency: selectedCurrency,
    ...(referral_code && { referral_code }),
  };
  
  const accessToken = await getAccessToken();
  try {
    const response = await fetch('https://health.prestigedelta.com/provider/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(formData),
    });
    const result = await response.json();
    if (response.status !== 200) {
      setMessage(result.message || 'An error occurred');
      setSnackbarOpen(true);
    } else {
      setMessage('Profile created successfully!');
      setSnackbarOpen(true);
      setTimeout(() => navigate('/available'), 1500);
    }
  } catch (error) {
    console.error(error);
    setMessage('An error occurred during updating');
    setSnackbarOpen(true);
  } finally {
    setIsSubmitting(false);
  }
};

// Function to determine progress percentage
const calculateProgress = () => {
  const stepTotalFields = [3, 3, 3]; // Fields per step
  const stepCompletedFields = [
    (provider ? 1 : 0) + (qualifications ? 1 : 0) + (regNumber ? 1 : 0),
    (clinicName ? 1 : 0) + (specialty ? 1 : 0) + (bio ? 1 : 0),
    (amount ? 1 : 0) + (dateOfRegistration ? 1 : 0) + 1 // Always count the optional field
  ];
  
  const totalFields = stepTotalFields.reduce((a, b) => a + b, 0);
  const completedFields = stepCompletedFields.reduce((a, b) => a + b, 0);
  
  return Math.round((completedFields / totalFields) * 100);
};

return (
  <Box
    sx={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #E3F2FD 0%, #90CAF9 100%)',
      p: { xs: 1, sm: 4 },
      overflowY: 'auto',
    }}
  >
    <Paper
      elevation={6}
      sx={{
        width: '100%',
        maxWidth: 650,
        p: { xs: 2, sm: 4 },
        bgcolor: 'rgba(255, 255, 255, 0.97)',
        backdropFilter: 'blur(10px)',
        borderRadius: 3,
        boxShadow: '0 8px 32px rgba(33, 150, 243, 0.1)',
        position: 'relative',
        my: 4,
        overflow: 'hidden',
      }}
    >
      <IconButton
        onClick={() => navigate('/register')}
        sx={{
          position: 'absolute',
          top: 20,
          left: 20,
          color: '#1976D2',
          bgcolor: 'rgba(33, 150, 243, 0.1)',
          '&:hover': {
            bgcolor: 'rgba(33, 150, 243, 0.2)',
          },
        }}
      >
        <ArrowLeft size={20} />
      </IconButton>

      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1" 
          sx={{ 
            color: '#1976D2', 
            fontWeight: 700,
            textShadow: '0 2px 4px rgba(0,0,0,0.1)',
            mb: 1
          }}>
          Create Profile
        </Typography>
        <Typography variant="body1" sx={{ color: '#607D8B' }}>
          Set up your professional healthcare profile
        </Typography>
        
        <Box sx={{ width: '100%', mt: 3, mb: 1 }}>
          <LinearProgress 
            variant="determinate" 
            value={calculateProgress()} 
            sx={{ 
              height: 6, 
              borderRadius: 3,
              bgcolor: 'rgba(25, 118, 210, 0.1)',
              '& .MuiLinearProgress-bar': {
                bgcolor: 'primary.main',
                backgroundImage: 'linear-gradient(90deg, #1976D2 0%, #42a5f5 50%, #1976D2 100%)',
              }
            }} 
          />
          <Typography 
            variant="caption" 
            component="div" 
            color="text.secondary"
            sx={{ mt: 0.5, textAlign: 'right' }}
          >
            {`${calculateProgress()}% Complete`}
          </Typography>
        </Box>
      </Box>

      <Stepper 
        alternativeLabel 
        activeStep={activeStep} 
        connector={<ColorlibStepConnector />}
        sx={{ mb: 4 }}
      >
        {steps.map((step, index) => (
          <Step key={step.label}>
            <StepLabel StepIconComponent={ColorlibStepIcon}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                {step.label}
              </Typography>
              <Typography variant="caption" sx={{ display: { xs: 'none', sm: 'block' } }}>
                {step.description}
              </Typography>
            </StepLabel>
          </Step>
        ))}
      </Stepper>

      <Box component="form" onSubmit={activeStep === steps.length - 1 ? handleSubmit : (e) => { e.preventDefault(); handleNext(); }}>
        <Fade in={activeStep === 0} timeout={500}>
          <Box sx={{ display: activeStep === 0 ? 'flex' : 'none', flexDirection: 'column', gap: 3 }}>
            <Card elevation={1} sx={{ borderRadius: 2, bgcolor: 'rgba(255, 255, 255, 0.8)' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Stethoscope size={24} color="#1976D2" />
                  <Typography variant="h6" sx={{ ml: 1, fontWeight: 600, color: '#1976D2' }}>
                    Professional Details
                  </Typography>
                </Box>
                
                <Autocomplete
                  options={providerType}
                  value={provider}
                  onChange={(_, newValue) => setProvider(newValue)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Select Profession"
                      variant="outlined"
                      required
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: 'rgba(255,255,255,0.8)',
                        }
                      }}
                    />
                  )}
                  sx={{ mb: 2.5 }}
                />
                
                <Autocomplete
                  options={qualificationOptions}
                  value={qualifications}
                  onChange={(_, newValue) => setQualifications(newValue)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Select Qualification"
                      variant="outlined"
                      required
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: 'rgba(255,255,255,0.8)',
                        }
                      }}
                    />
                  )}
                  sx={{ mb: 2.5 }}
                />
                
                <TextField
                  name="regNumber"
                  label="Licence Registration Number"
                  value={regNumber}
                  onChange={(e) => setRegNumber(e.target.value)}
                  required
                  variant="outlined"
                  fullWidth
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <FileBadge size={20} color="#1976D2" />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: 'rgba(255,255,255,0.8)',
                    }
                  }}
                />
              </CardContent>
            </Card>
          </Box>
        </Fade>

        <Fade in={activeStep === 1} timeout={500}>
          <Box sx={{ display: activeStep === 1 ? 'flex' : 'none', flexDirection: 'column', gap: 3 }}>
            <Card elevation={1} sx={{ borderRadius: 2, bgcolor: 'rgba(255, 255, 255, 0.8)' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Building2 size={24} color="#1976D2" />
                  <Typography variant="h6" sx={{ ml: 1, fontWeight: 600, color: '#1976D2' }}>
                    Practice Information
                  </Typography>
                </Box>
                
                <TextField
                  name="clinicName"
                  label="Clinic Name"
                  value={clinicName}
                  onChange={(e) => setClinicName(e.target.value)}
                  required
                  variant="outlined"
                  fullWidth
                  sx={{
                    mb: 2.5,
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: 'rgba(255,255,255,0.8)',
                    }
                  }}
                />
                
                <TextField
                  name="specialty"
                  label="Specialty (e.g. Cardiologist)"
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  required
                  variant="outlined"
                  fullWidth
                  sx={{
                    mb: 2.5,
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: 'rgba(255,255,255,0.8)',
                    }
                  }}
                />
                
                <TextField
                  name="bio"
                  label="Bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  required
                  multiline
                  rows={4}
                  variant="outlined"
                  fullWidth
                  placeholder="Share your professional experience and expertise..."
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: 'rgba(255,255,255,0.8)',
                    }
                  }}
                />
              </CardContent>
            </Card>
          </Box>
        </Fade>

        <Fade in={activeStep === 2} timeout={500}>
          <Box sx={{ display: activeStep === 2 ? 'flex' : 'none', flexDirection: 'column', gap: 3 }}>
            <Card elevation={1} sx={{ borderRadius: 2, bgcolor: 'rgba(255, 255, 255, 0.8)' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <BadgeCheck size={24} color="#1976D2" />
                  <Typography variant="h6" sx={{ ml: 1, fontWeight: 600, color: '#1976D2' }}>
                    Final Details
                  </Typography>
                </Box>
                
                <TextField
                  label="Date of Professional Registration"
                  type="date"
                  value={dateOfRegistration}
                  onChange={handleDateChange}
                  InputLabelProps={{ shrink: true }}
                  variant="outlined"
                  required
                  fullWidth
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <CalendarDays size={20} color="#1976D2" />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    mb: 2.5,
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: 'rgba(255,255,255,0.8)',
                    }
                  }}
                />
                
                <FormControl fullWidth sx={{ mb: 2.5 }}>
                  <TextField
                    label="Hourly Consultation Rate"
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <DollarSign size={20} color="#1976D2" />
                            <Select
                              value={selectedCurrency}
                              onChange={(e) => setSelectedCurrency(e.target.value)}
                              variant="standard"
                              sx={{ 
                                minWidth: '60px',
                                '&:before, &:after': { display: 'none' },
                                '& .MuiSelect-select': { 
                                  py: 0,
                                  border: 'none',
                                  backgroundColor: 'transparent' 
                                }
                              }}
                            >
                              <MenuItem value="NGN">₦</MenuItem>
                              <MenuItem value="USD">$</MenuItem>
                              <MenuItem value="GBP">£</MenuItem>
                            </Select>
                          </Box>
                        </InputAdornment>
                      )
                    }}
                    variant="outlined"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: 'rgba(255,255,255,0.8)',
                      }
                    }}
                  />
                </FormControl>
                
                <FormControl fullWidth>
                  <TextField
                    label="Referral Code (optional)"
                    type="text"
                    value={referral_code}
                    onChange={(e) => setReferal(e.target.value)}
                    required={false}
                    variant="outlined"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Copy size={20} color="#1976D2" />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: 'rgba(255,255,255,0.8)',
                      }
                    }}
                  />
                </FormControl>
              </CardContent>
            </Card>
          </Box>
        </Fade>

        {message && (
          <Typography variant="body2" sx={{ color: message.includes('success') ? '#43a047' : '#f44336', textAlign: 'center', mt: 2 }}>
            {message}
          </Typography>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4, mb: 1 }}>
          <Button
            onClick={handleBack}
            disabled={activeStep === 0}
            startIcon={<ArrowLeft size={18} />}
            sx={{
              color: '#1976D2',
              textTransform: 'none',
              fontWeight: 600,
            }}
          >
            Back
          </Button>
          
          <Button
            variant="contained"
            disabled={!canProceed() || (activeStep === steps.length - 1 && isSubmitting)}
            type={activeStep === steps.length - 1 ? "submit" : "button"}
            endIcon={activeStep === steps.length - 1 ? <Send size={18} /> : <ArrowRight size={18} />}
            onClick={activeStep === steps.length - 1 ? undefined : handleNext}
            sx={{
              bgcolor: '#1976D2',
              color: 'white',
              py: 1,
              px: 3,
              fontSize: '1rem',
              fontWeight: 600,
              textTransform: 'none',
              boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)',
              '&:hover': {
                bgcolor: '#1565C0',
                boxShadow: '0 6px 16px rgba(25, 118, 210, 0.4)',
              },
            }}
          >
            {activeStep === steps.length - 1 ? (
              isSubmitting ? 'Creating...' : 'Create Profile'
            ) : (
              'Continue'
            )}
          </Button>
        </Box>
      </Box>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        message={message}
        sx={{
          '& .MuiSnackbarContent-root': {
            bgcolor: message?.includes('success') ? '#43a047' : '#f44336',
          }
        }}
      />
    </Paper>
  </Box>
);
};

export default ProviderPage;
