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
  StepConnector,
  styled,
  Fade,
  Card,
  CardContent,
  LinearProgress,
  Grid,
  useMediaQuery,
  useTheme,
  Alert,
  Avatar,
  Tooltip,
  Chip,
  Backdrop,
  CircularProgress,
  Grow,
  Divider
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
  Send,
  CheckCircle2,
  Info,
  User,
  Sparkles,
  Award,
  BarChart2,
  CreditCard,
  MessageCircle,
  Clock,
  Share2,
  Medal
} from 'lucide-react';

// Custom styling for stepper
const ColorlibStepConnector = styled(StepConnector)(({ theme }) => ({
  [`&.MuiStepConnector-alternativeLabel`]: {
    top: 22,
  },
  [`&.MuiStepConnector-active`]: {
    [`& .MuiStepConnector-line`]: {
      backgroundImage: 'linear-gradient(95deg, #4361EE 0%, #4CC9F0 50%, #4361EE 100%)',
    },
  },
  [`&.MuiStepConnector-completed`]: {
    [`& .MuiStepConnector-line`]: {
      backgroundImage: 'linear-gradient(95deg, #4361EE 0%, #4CC9F0 50%, #4361EE 100%)',
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
    backgroundImage: 'linear-gradient(136deg, #4361EE 0%, #4CC9F0 50%, #4361EE 100%)',
    boxShadow: '0 4px 10px 0 rgba(0,0,0,.25)',
  }),
  ...(ownerState.completed && {
    backgroundImage: 'linear-gradient(136deg, #4361EE 0%, #4CC9F0 50%, #4361EE 100%)',
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

// Testimonial data
const testimonials = [
  {
    quote: "Setting up my profile was seamless. I'm now seeing 40% more patients and earning more than in my physical practice.",
    name: "Dr. Sarah Johnson",
    specialty: "Cardiologist",
    avatar: "/doctor1.jpg"
  },
  {
    quote: "The platform's AI assistant handles routine follow-ups, which has freed up my schedule to focus on complex cases.",
    name: "Dr. Michael Chen",
    specialty: "Family Medicine",
    avatar: "/doctor2.jpg"
  }
];

const ProviderPage = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [clinicName, setClinicName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [qualifications, setQualifications] = useState(null);
  const [referral_code, setReferal] = useState('');
  const [dateOfRegistration, setDateOfRegistration] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [bio, setBio] = useState('');
  const [message, setMessage] = useState('');
  const [messageSeverity, setMessageSeverity] = useState('error');
  const [amount, setAmount] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState('NGN');
  const [regNumber, setRegNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const qualificationOptions = [
    { label: 'MBBS', value: 'MBBS' },
    { label: 'MD', value: 'MD' },
    { label: 'MBChB', value: 'MBChB' },
    { label: 'BDS', value: 'BDS' },
  ];

const currencies = {
  NGN: '₦',
  USD: '$',
  GBP: '£'
};

const steps = [
  {
    label: 'Professional Credentials',
    description: 'Your qualifications and license details',
    icon: <Stethoscope size={24} />,
    motivationalText: 'Great start! This information helps patients trust your expertise.'
  },
  {
    label: 'Practice Information',
    description: 'Tell us about your clinic and specialization',
    icon: <Building2 size={24} />,
    motivationalText: "Perfect! You're halfway to reaching new patients online."
  },
  {
    label: 'Finalize Profile',
    description: 'Set your fees and complete your profile',
    icon: <BadgeCheck size={24} />,
    motivationalText: 'Almost there! Just a few more details before you can start seeing patients.'
  },
];

// Benefits of being on the platform
const benefits = [
  { text: 'Set your own consultation fees', icon: <DollarSign size={18} color="#4361EE" /> },
  { text: 'Keep 75% of all direct fees', icon: <CreditCard size={18} color="#4361EE" /> },
  { text: 'AI handles routine follow-ups', icon: <MessageCircle size={18} color="#4361EE" /> },
  { text: 'Flexible schedule on your terms', icon: <Clock size={18} color="#4361EE" /> },
  { text: 'Dedicated success manager', icon: <User size={18} color="#4361EE" /> },
  { text: 'Free marketing of your services', icon: <Share2 size={18} color="#4361EE" /> },
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
  let rep = await fetch ('https://service.prestigedelta.com/tokenrefresh/',{
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
  
  // Google Ads conversion tracking for successful registration
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'conversion', {
      'send_to': 'AW-11242421150/jxFjCIehodcaEJ735vAp',
      'value': 1.0,
      'currency': 'USD'
    });
    console.log('Registration conversion tracked - user reached provider page');
  }
  
  // Rotate testimonials every 8 seconds
  const testimonialInterval = setInterval(() => {
    setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
  }, 8000);
  
  return () => clearInterval(testimonialInterval);
}, []);

const handleDateChange = (event) => {
  setDateOfRegistration(event.target.value);
};

// Step navigation handlers
const handleNext = () => {
  setActiveStep((prevActiveStep) => prevActiveStep + 1);
  // Scroll to top when changing steps
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const handleBack = () => {
  setActiveStep((prevActiveStep) => prevActiveStep - 1);
  // Scroll to top when changing steps
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

// Validate step before proceeding
const canProceed = () => {
  switch (activeStep) {
    case 0:
      return qualifications && regNumber;
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
    provider_type: 'doctor', // Always set to doctor
    bio: bio,
    rate_per_hour: amount,
    rate_currency: selectedCurrency,
    ...(referral_code && { referral_code }),
  };
  
  const accessToken = await getAccessToken();
  try {
    const response = await fetch('https://service.prestigedelta.com/provider/', {
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
      setMessageSeverity('error');
      setSnackbarOpen(true);    } else {
      setMessage('Profile created successfully!');
      setMessageSeverity('success');
      setSnackbarOpen(true);
      setTimeout(() => navigate('/available'), 1500);
    }
  } catch (error) {
    console.error(error);
    setMessage('An error occurred during updating');
    setMessageSeverity('error');
    setSnackbarOpen(true);
  } finally {
    setIsSubmitting(false);
  }
};

// Function to determine progress percentage
const calculateProgress = () => {
  const stepTotalFields = [2, 3, 3]; // Fields per step
  const stepCompletedFields = [
    (qualifications ? 1 : 0) + (regNumber ? 1 : 0),
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
      position: 'relative',
      background: 'linear-gradient(135deg, #EFF6FF 0%, #F0F9FF 100%)',
      p: { xs: 0, sm: 0 },
      overflowX: 'hidden',
    }}
  >
    {/* Decorative elements */}
    <Box
      sx={{
        position: 'absolute',
        top: '10%',
        left: '5%',
        width: '300px',
        height: '300px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(67, 97, 238, 0.15) 0%, rgba(76, 201, 240, 0.05) 70%)',
        filter: 'blur(40px)',
        zIndex: 0,
      }}
    />
    <Box
      sx={{
        position: 'absolute',
        bottom: '15%',
        right: '10%',
        width: '250px',
        height: '250px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(76, 201, 240, 0.15) 0%, rgba(67, 97, 238, 0.05) 70%)',
        filter: 'blur(50px)',
        zIndex: 0,
      }}
    />
    
    <Grid container spacing={0}>
      {/* Left sidebar with benefits - only on desktop */}
      {!isMobile && (
        <Grid item md={3}
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            height: '100vh',
            bgcolor: '#1E3A8A',
            color: 'white',
            display: 'flex',
            flexDirection: 'column',
            p: 4,
          }}
        >
          <Box sx={{ mb: 4 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
              Prestige Health
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.85 }}>
              For healthcare professionals
            </Typography>
          </Box>
          
          <Box sx={{ mt: 4, mb: 6 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 3, display: 'flex', alignItems: 'center' }}>
              <Sparkles size={20} style={{ marginRight: '8px' }} />
              Platform Benefits
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              {benefits.map((benefit, index) => (
                <Box key={index} sx={{ display: 'flex', alignItems: 'center' }}>
                  <Box sx={{ 
                    width: 34, 
                    height: 34, 
                    borderRadius: '50%', 
                    bgcolor: 'rgba(255, 255, 255, 0.15)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    mr: 2
                  }}>
                    {benefit.icon}
                  </Box>
                  <Typography variant="body2">{benefit.text}</Typography>
                </Box>
              ))}
            </Box>
          </Box>
          
          <Grow in timeout={1000}>
            <Card sx={{ 
              bgcolor: 'rgba(255, 255, 255, 0.1)', 
              backdropFilter: 'blur(10px)',
              borderRadius: 2,
              mt: 'auto',
              p: 2.5
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar src={testimonials[activeTestimonial].avatar || ""} sx={{ width: 48, height: 48, mr: 2 }} />
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    {testimonials[activeTestimonial].name}
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.9 }}>
                    {testimonials[activeTestimonial].specialty}
                  </Typography>
                </Box>
              </Box>
              <Typography variant="body2" sx={{ fontStyle: 'italic', opacity: 0.9, lineHeight: 1.6 }}>
                "{testimonials[activeTestimonial].quote}"
              </Typography>
            </Card>
          </Grow>
        </Grid>
      )}

      {/* Main content */}
      <Grid item xs={12} md={9} sx={{ ml: { xs: 0, md: '25%' } }}>
        <Box sx={{ p: { xs: 3, sm: 4, md: 6 }, maxWidth: 800, mx: 'auto' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
            <IconButton
              onClick={() => navigate('/register')}
              aria-label="Go back"
              sx={{
                color: '#1E3A8A',
                bgcolor: 'rgba(30, 58, 138, 0.1)',
                '&:hover': {
                  bgcolor: 'rgba(30, 58, 138, 0.2)',
                },
                mr: 2
              }}
            >
              <ArrowLeft size={20} />
            </IconButton>
            
            <Box>
              <Typography variant="h4" component="h1" 
                sx={{ 
                  color: '#1E3A8A', 
                  fontWeight: 800,
                }}
              >
                Create Your Doctor Profile
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                Set up your professional profile to start accepting patients
              </Typography>
            </Box>
          </Box>
          
          {/* Mobile-only progress indicator */}
          {isMobile && (
            <Card elevation={0} sx={{ mb: 4, p: 2, bgcolor: 'white', borderRadius: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#1E3A8A', mb: 0.5 }}>
                    {calculateProgress()}% Complete
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Step {activeStep + 1} of 3 - {steps[activeStep].label}
                  </Typography>
                </Box>
                <CircularProgress 
                  variant="determinate" 
                  value={calculateProgress()} 
                  size={48}
                  thickness={4}
                  sx={{
                    color: '#4361EE',
                    '& .MuiCircularProgress-circle': {
                      strokeLinecap: 'round',
                    }
                  }}
                />
              </Box>
            </Card>
          )}
          
          {/* Desktop progress indicator */}
          {!isMobile && (
            <Box>
              <Stepper 
                alternativeLabel 
                activeStep={activeStep} 
                connector={<ColorlibStepConnector />}
                sx={{ mb: 5 }}
              >
                {steps.map((step, index) => (
                  <Step key={step.label}>
                    <StepLabel StepIconComponent={ColorlibStepIcon}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, color: index === activeStep ? '#1E3A8A' : 'inherit' }}>
                        {step.label}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {step.description}
                      </Typography>
                    </StepLabel>
                  </Step>
                ))}
              </Stepper>
              
              <Box sx={{ width: '100%', mb: 4 }}>
                <LinearProgress 
                  variant="determinate" 
                  value={calculateProgress()} 
                  sx={{ 
                    height: 8, 
                    borderRadius: 4,
                    bgcolor: 'rgba(67, 97, 238, 0.1)',
                    '& .MuiLinearProgress-bar': {
                      bgcolor: 'primary.main',
                      backgroundImage: 'linear-gradient(90deg, #4361EE 0%, #4CC9F0 50%, #4361EE 100%)',
                    }
                  }} 
                />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Step {activeStep + 1} of 3
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {calculateProgress()}% complete
                  </Typography>
                </Box>
              </Box>
            </Box>
          )}
          
          <Card 
            elevation={2} 
            sx={{ 
              borderRadius: 3, 
              overflow: 'hidden',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.08)',
              bgcolor: 'white',
              mb: 4
            }}
          >
            <Box sx={{ p: 0.5, bgcolor: '#4361EE' }}>
              <Box sx={{ 
                p: 2, 
                bgcolor: '#F8FAFC', 
                border: '1px dashed rgba(67, 97, 238, 0.3)',
                borderRadius: 1,
                display: 'flex',
                alignItems: 'center'
              }}>
                <Info size={18} color="#4361EE" style={{ flexShrink: 0, marginRight: '12px' }} />
                <Typography variant="body2" sx={{ fontSize: '0.9rem', color: '#1E3A8A' }}>
                  {steps[activeStep].motivationalText}
                </Typography>
              </Box>
            </Box>
            
            <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
              <Box component="form" onSubmit={activeStep === steps.length - 1 ? handleSubmit : (e) => { e.preventDefault(); handleNext(); }}>
                <Fade in={activeStep === 0} timeout={500}>
                  <Box sx={{ display: activeStep === 0 ? 'flex' : 'none', flexDirection: 'column', gap: 3 }}>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600, color: '#1E3A8A', mb: 1, display: 'flex', alignItems: 'center' }}>
                        <Stethoscope size={20} style={{ marginRight: '8px' }} />
                        Professional Credentials
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
                        Patients trust detailed and accurate professional information
                      </Typography>
                      
                      <Autocomplete
                        options={qualificationOptions}
                        value={qualifications}
                        onChange={(_, newValue) => setQualifications(newValue)}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Your Primary Qualification"
                            variant="outlined"
                            required
                            helperText="Select your highest level of medical qualification"
                            sx={{
                              mb: 3,
                              '& .MuiOutlinedInput-root': {
                                borderRadius: 2,
                              }
                            }}
                          />
                        )}
                      />
                      
                      <TextField
                        name="regNumber"
                        label="License/Registration Number"
                        value={regNumber}
                        onChange={(e) => setRegNumber(e.target.value)}
                        required
                        variant="outlined"
                        fullWidth
                        helperText="Your professional license number issued by your country's medical council"
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <FileBadge size={20} color="#4361EE" />
                            </InputAdornment>
                          ),
                          sx: { borderRadius: 2 }
                        }}
                      />
                    </Box>
                    
                    {isMobile && (
                      <Box sx={{ bgcolor: '#F8FAFC', p: 3, borderRadius: 2, mt: 3 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1E3A8A', mb: 2, display: 'flex', alignItems: 'center' }}>
                          <Medal size={16} style={{ marginRight: '8px' }} />
                          Why adding your credentials matters:
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                          Patients are 3x more likely to book appointments with providers who have complete credential information.
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Fade>

                <Fade in={activeStep === 1} timeout={500}>
                  <Box sx={{ display: activeStep === 1 ? 'flex' : 'none', flexDirection: 'column', gap: 3 }}>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600, color: '#1E3A8A', mb: 1, display: 'flex', alignItems: 'center' }}>
                        <Building2 size={20} style={{ marginRight: '8px' }} />
                        Practice Information
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
                        Tell patients about your practice and areas of expertise
                      </Typography>
                      
                      <TextField
                        name="clinicName"
                        label="Practice/Clinic Name"
                        value={clinicName}
                        onChange={(e) => setClinicName(e.target.value)}
                        required
                        variant="outlined"
                        fullWidth
                        placeholder="e.g., Johnson Family Medicine"
                        helperText="What would you like patients to see as your practice name?"
                        sx={{
                          mb: 3,
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 2,
                          }
                        }}
                      />
                      
                      <TextField
                        name="specialty"
                        label="Your Medical Specialty"
                        value={specialty}
                        onChange={(e) => setSpecialty(e.target.value)}
                        required
                        variant="outlined"
                        fullWidth
                        placeholder="e.g., Cardiology, Pediatrics, Family Medicine"
                        helperText="Be specific about your area of expertise to attract the right patients"
                        sx={{
                          mb: 3,
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 2,
                          }
                        }}
                      />
                      
                      <TextField
                        name="bio"
                        label="Professional Bio"
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        required
                        multiline
                        rows={5}
                        variant="outlined"
                        fullWidth
                        placeholder="Share your professional experience, specializations, and approach to patient care..."
                        helperText="This is your chance to introduce yourself to potential patients (minimum 100 characters)"
                        InputProps={{
                          sx: { borderRadius: 2 }
                        }}
                      />
                    </Box>
                    
                    {isMobile && (
                      <Card variant="outlined" sx={{ mt: 2, borderColor: '#DBEAFE', bgcolor: '#F8FAFC' }}>
                        <CardContent>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1E3A8A', mb: 1 }}>
                            Pro Tip for Your Bio:
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                            Include your years of experience, notable achievements, and your philosophy of care to build patient trust.
                          </Typography>
                        </CardContent>
                      </Card>
                    )}
                  </Box>
                </Fade>

                <Fade in={activeStep === 2} timeout={500}>
                  <Box sx={{ display: activeStep === 2 ? 'flex' : 'none', flexDirection: 'column', gap: 3 }}>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600, color: '#1E3A8A', mb: 1, display: 'flex', alignItems: 'center' }}>
                        <BadgeCheck size={20} style={{ marginRight: '8px' }} />
                        Final Details
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
                        Set your consultation rates and complete your registration
                      </Typography>
                      
                      <Card variant="outlined" sx={{ mb: 4, borderColor: '#DBEAFE', bgcolor: '#F0F9FF' }}>
                        <CardContent sx={{ pb: 3 }}>
                          <Typography variant="subtitle2" fontWeight={600} color="#1E3A8A" mb={1}>
                            Pricing Guidance:
                          </Typography>
                          <Typography variant="body2" color="text.secondary" mb={2}>
                            Average consultation rates on our platform:
                          </Typography>
                          
                          <Grid container spacing={2} sx={{ mb: 2 }}>
                            <Grid item xs={4}>
                              <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'white', borderRadius: 1 }}>
                                <Typography variant="h6" color="#1E3A8A" fontWeight={700}>
                                  $35-45
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  General Practice
                                </Typography>
                              </Box>
                            </Grid>
                            <Grid item xs={4}>
                              <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'white', borderRadius: 1 }}>
                                <Typography variant="h6" color="#1E3A8A" fontWeight={700}>
                                  $45-65
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Specialists
                                </Typography>
                              </Box>
                            </Grid>
                            <Grid item xs={4}>
                              <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'white', borderRadius: 1 }}>
                                <Typography variant="h6" color="#1E3A8A" fontWeight={700}>
                                  $75+
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Senior Specialists
                                </Typography>
                              </Box>
                            </Grid>
                          </Grid>
                          
                          <Typography variant="body2" color="text.secondary">
                            Remember, you keep 75% of all direct consultation fees.
                          </Typography>
                        </CardContent>
                      </Card>
                      
                      <TextField
                        label="Date of Professional Registration"
                        type="date"
                        value={dateOfRegistration}
                        onChange={handleDateChange}
                        InputLabelProps={{ shrink: true }}
                        variant="outlined"
                        required
                        fullWidth
                        helperText="When did you receive your professional license?"
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <CalendarDays size={20} color="#4361EE" />
                            </InputAdornment>
                          ),
                          sx: { borderRadius: 2 }
                        }}
                        sx={{ mb: 3 }}
                      />
                      
                      <FormControl fullWidth sx={{ mb: 3 }}>
                        <TextField
                          label="Hourly Consultation Rate"
                          type="number"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          required
                          helperText="You can adjust this rate at any time after registration"
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  <DollarSign size={20} color="#4361EE" />
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
                            ),
                            sx: { borderRadius: 2 }
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
                          helperText="Enter a referral code if you were invited by another doctor"
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <Copy size={20} color="#4361EE" />
                              </InputAdornment>
                            ),
                            sx: { borderRadius: 2 }
                          }}
                        />
                      </FormControl>
                    </Box>
                  </Box>
                </Fade>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
                  <Button
                    onClick={handleBack}
                    disabled={activeStep === 0}
                    startIcon={<ArrowLeft size={18} />}
                    sx={{
                      color: '#4361EE',
                      bgcolor: activeStep === 0 ? 'transparent' : 'rgba(67, 97, 238, 0.08)',
                      px: 2,
                      py: 1,
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 600,
                      '&:hover': {
                        bgcolor: 'rgba(67, 97, 238, 0.12)',
                      }
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
                      bgcolor: '#4361EE',
                      color: 'white',
                      py: 1.5,
                      px: 3,
                      fontSize: '1rem',
                      fontWeight: 600,
                      textTransform: 'none',
                      borderRadius: 2,
                      boxShadow: '0 4px 12px rgba(67, 97, 238, 0.3)',
                      '&:hover': {
                        bgcolor: '#3a56dd',
                        boxShadow: '0 6px 16px rgba(67, 97, 238, 0.4)',
                      },
                      '&.Mui-disabled': {
                        bgcolor: '#E2E8F0',
                        color: '#94A3B8'
                      }
                    }}
                  >
                    {activeStep === steps.length - 1 ? (
                      isSubmitting ? 'Creating Profile...' : 'Complete & Start Practicing'
                    ) : (
                      'Continue'
                    )}
                  </Button>
                </Box>
              </Box>
            </CardContent>
          </Card>
          
          {/* Trust factors - show only on mobile */}
          {isMobile && (
            <Card elevation={1} sx={{ borderRadius: 2, p: 3, mb: 4 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1E3A8A', mb: 2, display: 'flex', alignItems: 'center' }}>
                <Award size={18} style={{ marginRight: '8px' }} />
                Why Doctors Trust Us
              </Typography>
              
              {benefits.slice(0, 4).map((benefit, index) => (
                <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                  <CheckCircle2 size={16} color="#4361EE" style={{ marginRight: '12px' }} />
                  <Typography variant="body2">{benefit.text}</Typography>
                </Box>
              ))}
              
              <Divider sx={{ my: 2 }} />
              
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar src={testimonials[0].avatar || ""} sx={{ width: 36, height: 36, mr: 2 }} />
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    "{testimonials[0].quote.substring(0, 65)}..."
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {testimonials[0].name}, {testimonials[0].specialty}
                  </Typography>
                </Box>
              </Box>
            </Card>
          )}
        </Box>
      </Grid>
    </Grid>

    <Backdrop
      sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
      open={isSubmitting}
    >
      <Box sx={{ textAlign: 'center' }}>
        <CircularProgress color="inherit" size={60} thickness={4} />
        <Typography variant="h6" sx={{ mt: 2, fontWeight: 600 }}>
          Creating your profile...
        </Typography>
      </Box>
    </Backdrop>

    <Snackbar
      open={snackbarOpen}
      autoHideDuration={6000}
      onClose={() => setSnackbarOpen(false)}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert
        onClose={() => setSnackbarOpen(false)}
        severity={messageSeverity}
        variant="filled"
        sx={{ width: '100%', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)' }}
      >
        {message}
      </Alert>
    </Snackbar>
  </Box>
);
};

export default ProviderPage;
