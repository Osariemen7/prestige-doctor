import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Paper,
  Card,
  CardContent,
  Divider,
  IconButton,
  Stack,
  Avatar,
  Fade,
  Slide,
  useMediaQuery,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  CssBaseline,
  GlobalStyles,
  AppBar,
  Toolbar,
  Menu,
  MenuItem,
  useScrollTrigger,
  Drawer,
  Link
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  Stethoscope,
  Globe,
  Users,
  Zap,
  DollarSign,
  BarChart2,
  Check,
  Calendar,
  Award,
  Clock,
  ChevronRight,
  Brain,
  FileText,
  LucideMessagesSquare,
  Star,
  ArrowRight,
  FileCheck,
  RefreshCw,
  CreditCard,
  Menu as MenuIcon,
  X,
  LifeBuoy,
  Percent,
  UserCheck
} from 'lucide-react';

// Create a component for the scrollable navbar
function ElevationScroll(props) {
  const { children } = props;
  const trigger = useScrollTrigger({
    disableHysteresis: true,
    threshold: 0,
  });

  return React.cloneElement(children, {
    elevation: trigger ? 4 : 0,
    sx: {
      backgroundColor: trigger ? 'rgba(255, 255, 255, 0.95)' : 'transparent',
      backdropFilter: trigger ? 'blur(10px)' : 'none',
      transition: 'background-color 0.3s, backdrop-filter 0.3s',
      boxShadow: trigger ? '0 4px 20px rgba(0, 0, 0, 0.1)' : 'none',
    },
  });
}

const LandingPage = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));
  const [animate, setAnimate] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setAnimate(true);
  }, []);

  const navigateToSignUp = () => {
    navigate('/register');
  };

  const navigateToLogin = () => {
    navigate('/login');
  };
  
  const scrollToSection = (sectionId) => {
    const section = document.getElementById(sectionId);
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' });
    }
    setMobileMenuOpen(false);
  };

  const navItems = [
    { label: 'Features', sectionId: 'features' },
    { label: 'How It Works', sectionId: 'how-it-works' },
    { label: 'Pricing', sectionId: 'pricing' },
    { label: 'Success Stories', sectionId: 'testimonials' },
  ];

  return (
    <Box sx={{ 
      height: '100%',
      overflow: 'auto'
    }}>
      <CssBaseline />
      <GlobalStyles styles={{ 
        body: { margin: 0, padding: 0 },
        '@keyframes morph': {
          '0%': {
            borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%',
          },
          '50%': {
            borderRadius: '70% 30% 30% 70% / 70% 70% 30% 30%',
          },
          '100%': {
            borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%',
          },
        }
      }} />

      {/* Navigation Bar */}
      <ElevationScroll>
        <AppBar position="sticky">
          <Toolbar>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                flexGrow: 1,
              }}
            >
              <Stethoscope 
                size={28} 
                color="#1E3A8A" 
                style={{ marginRight: '8px' }} 
              />
              <Typography
                variant="h6"
                component="div"
                sx={{ fontWeight: 700, color: '#1E3A8A', display: 'inline' }}
              >
                Prestige Health
              </Typography>
            </Box>
            {isSmallScreen ? (
              <>
                <IconButton
                  edge="end"
                  color="inherit"
                  onClick={() => setMobileMenuOpen(true)}
                >
                  <MenuIcon />
                </IconButton>
                <Drawer
                  anchor="right"
                  open={mobileMenuOpen}
                  onClose={() => setMobileMenuOpen(false)}
                >
                  <Box
                    sx={{
                      width: 250,
                      p: 2,
                      display: 'flex',
                      flexDirection: 'column',
                      backgroundColor: '#1E3A8A', // Adding a background color for contrast
                    }}
                  >
                    <IconButton
                      edge="end"
                      onClick={() => setMobileMenuOpen(false)}
                      sx={{ 
                        alignSelf: 'flex-end', 
                        color: 'white' // Making the close icon white for visibility
                      }}
                    >
                      <X />
                    </IconButton>
                    <Box 
                      sx={{ 
                        display: 'flex',
                        alignItems: 'center',
                        mb: 3,
                        mt: 1
                      }}
                    >
                      <Stethoscope size={22} color="white" style={{ marginRight: '8px' }} />
                      <Typography color="white" fontWeight={600}>
                        Prestige Health
                      </Typography>
                    </Box>
                    {navItems.map((item, index) => (
                      <Button
                        key={index}
                        onClick={() => scrollToSection(item.sectionId)}
                        sx={{
                          textAlign: 'left',
                          color: 'white', // Setting text color to white
                          fontWeight: 600,
                          mb: 1,
                          '&:hover': {
                            backgroundColor: 'rgba(255, 255, 255, 0.1)' // Adding hover effect
                          }
                        }}
                      >
                        {item.label}
                      </Button>
                    ))}
                  </Box>
                </Drawer>
              </>
            ) : (
              navItems.map((item, index) => (
                <Button
                  key={index}
                  onClick={() => scrollToSection(item.sectionId)}
                  sx={{
                    color: '#1E3A8A',
                    fontWeight: 600,
                    mx: 1,
                  }}
                >
                  {item.label}
                </Button>
              ))
            )}
          </Toolbar>
        </AppBar>
      </ElevationScroll>

      {/* Hero Section */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #0A2463 0%, #1E3A8A 100%)',
          color: 'white',
          pt: { xs: 12, sm: 16, md: 20 },
          pb: { xs: 10, sm: 14, md: 18 },
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={7}>
              <Fade in={animate} timeout={1000}>
                <Box>
                  <Chip
                    label="AI-Powered Practice Management"
                    sx={{
                      backgroundColor: 'rgba(255, 255, 255, 0.15)',
                      color: 'white',
                      fontWeight: 'bold',
                      mb: 2,
                      '& .MuiChip-label': { px: 2 },
                    }}
                  />
                  <Typography
                    variant="h1"
                    component="h1"
                    sx={{
                      fontSize: { xs: '2.5rem', sm: '3.5rem', md: '4rem' },
                      fontWeight: 800,
                      mb: 2,
                      lineHeight: 1.1,
                    }}
                  >
                    Build Your Profitable Private Practice{' '}
                    <Box
                      component="span"
                      sx={{
                        position: 'relative',
                        color: '#4CC9F0',
                        '&::after': {
                          content: '""',
                          position: 'absolute',
                          width: '100%',
                          height: '30%',
                          bottom: '0',
                          left: '0',
                          backgroundColor: 'rgba(76, 201, 240, 0.3)',
                          zIndex: -1,
                        },
                      }}
                    >
                      Without The Grind
                    </Box>
                  </Typography>
                  <Typography
                    variant="h2"
                    component="h2"
                    sx={{
                      fontSize: { xs: '1.25rem', md: '1.5rem' },
                      fontWeight: 400,
                      mb: 4,
                      color: 'rgba(255, 255, 255, 0.8)',
                      lineHeight: 1.5,
                    }}
                  >
                    Your AI physician copilot helps manage administrative tasks so you can focus on what matters—seeing patients directly and building meaningful doctor-patient relationships.
                  </Typography>
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={2}
                    sx={{ mt: 5 }}
                  >
                    <Button
                      variant="contained"
                      size="large"
                      onClick={navigateToSignUp}
                      startIcon={<Award />}
                      sx={{
                        py: 1.5,
                        px: 4,
                        borderRadius: 2,
                        backgroundColor: '#4CC9F0',
                        fontSize: '1.1rem',
                        fontWeight: 600,
                        boxShadow: '0 4px 14px 0 rgba(76, 201, 240, 0.4)',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          backgroundColor: '#3DB9E0',
                          transform: 'translateY(-3px)',
                          boxShadow: '0 6px 20px 0 rgba(76, 201, 240, 0.6)',
                        },
                      }}
                    >
                      Set Up Your Private Practice
                    </Button>
                    <Button
                      variant="outlined"
                      size="large"
                      onClick={navigateToLogin}
                      sx={{
                        py: 1.5,
                        px: 4,
                        borderRadius: 2,
                        borderColor: 'rgba(255, 255, 255, 0.5)',
                        color: 'white',
                        fontSize: '1.1rem',
                        fontWeight: 600,
                        '&:hover': {
                          borderColor: 'white',
                          backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        },
                      }}
                    >
                      Log In
                    </Button>
                  </Stack>
                </Box>
              </Fade>
            </Grid>
            <Grid
              item
              xs={12}
              md={5}
              sx={{
                display: { xs: 'none', md: 'block' },
              }}
            >
              <Slide direction="left" in={animate} timeout={800}>
                <Box
                  sx={{
                    position: 'relative',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: '-10%',
                      right: '-10%',
                      width: '120%',
                      height: '120%',
                      borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%',
                      background: 'linear-gradient(135deg, rgba(76, 201, 240, 0.4) 0%, rgba(67, 97, 238, 0.3) 100%)',
                      animation: 'morph 8s linear infinite',
                      zIndex: -1,
                    },
                  }}
                >
                  <Box
                    component="img"
                    src="/images/doctor-ai-platform.png"
                    alt="Physician using AI-powered healthcare platform"
                    sx={{
                      width: '100%',
                      height: 'auto',
                      borderRadius: '15px',
                      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
                      transform: 'perspective(1000px) rotateY(-10deg)',
                    }}
                  />
                </Box>
              </Slide>
            </Grid>
          </Grid>
        </Container>

        {/* Decorative elements */}
        <Box
          sx={{
            position: 'absolute',
            top: '10%',
            left: '2%',
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            backgroundColor: '#4CC9F0',
            opacity: 0.6,
            boxShadow: '0 0 20px 5px rgba(76, 201, 240, 0.4)',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            bottom: '15%',
            right: '5%',
            width: '15px',
            height: '15px',
            borderRadius: '50%',
            backgroundColor: '#4CC9F0',
            opacity: 0.6,
            boxShadow: '0 0 20px 5px rgba(76, 201, 240, 0.4)',
          }}
        />
      </Box>

      {/* Rest of the sections */}
      
      {/* Stats Banner */}
      <Box
        sx={{
          background: 'white',
          py: 6,
          borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={3} justifyContent="center">
            <Grid item xs={6} md={3}>
              <Box textAlign="center">
                <Typography variant="h3" component="div" sx={{ fontWeight: 700, color: '#1E3A8A', mb: 1 }}>
                  75%
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Revenue Share for Direct Consultations
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} md={3}>
              <Box textAlign="center">
                <Typography variant="h3" component="div" sx={{ fontWeight: 700, color: '#1E3A8A', mb: 1 }}>
                  25%
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Revenue Share for AI Interactions
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} md={3}>
              <Box textAlign="center">
                <Typography variant="h3" component="div" sx={{ fontWeight: 700, color: '#1E3A8A', mb: 1 }}>
                  100%
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Patient Data Ownership
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} md={3}>
              <Box textAlign="center">
                <Typography variant="h3" component="div" sx={{ fontWeight: 700, color: '#1E3A8A', mb: 1 }}>
                  $0
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Setup or Monthly Fees
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Key Features Section */}
      <Box id="features" sx={{ py: 10, background: 'linear-gradient(135deg, #F8FAFC 0%, #EFF6FF 100%)' }}>
        <Container maxWidth="lg">
          <Box textAlign="center" mb={8}>
            <Typography variant="h2" component="h2" sx={{ fontWeight: 700, color: '#1E3A8A', mb: 2 }}>
              Designed for Modern Healthcare Providers
            </Typography>
            <Typography variant="h5" component="p" sx={{ color: 'text.secondary', maxWidth: '800px', mx: 'auto' }}>
              Our platform combines AI-powered efficiency with full control over your practice
            </Typography>
          </Box>

          <Grid container spacing={4}>
            {[
              {
                icon: <Stethoscope size={32} />,
                title: 'Your Practice, Your Rules',
                description: 'Set your own consultation rates, availability, and practice policies with complete autonomy.',
              },
              {
                icon: <Brain size={32} />,
                title: 'AI Physician Copilot',
                description: 'Leverage our AI to handle administrative tasks, patient communications, and routine follow-ups.',
              },
              {
                icon: <UserCheck size={32} />,
                title: 'Personal Success Manager',
                description: 'Get dedicated support from a physician success manager who helps you maximize platform value.',
              },
              {
                icon: <DollarSign size={32} />,
                title: 'Transparent Revenue Model',
                description: 'Keep 75% of direct consultation fees and 25% of AI-assisted interactions with your patients.',
              },
              {
                icon: <Globe size={32} />,
                title: 'Virtual Care Anywhere',
                description: 'Provide telemedicine consultations to patients regardless of their location.',
              },
              {
                icon: <FileText size={32} />,
                title: 'Comprehensive Patient Records',
                description: 'Access detailed patient histories, test results, and health metrics in one secure place.',
              },
            ].map((feature, index) => (
              <Grid item xs={12} md={6} lg={4} key={index}>
                <Card
                  elevation={0}
                  sx={{
                    p: 3,
                    height: '100%',
                    borderRadius: 3,
                    transition: 'transform 0.3s, box-shadow 0.3s',
                    '&:hover': {
                      transform: 'translateY(-5px)',
                      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
                    },
                    background: 'white',
                    border: '1px solid rgba(0, 0, 0, 0.05)',
                  }}
                >
                  <Box
                    sx={{
                      display: 'inline-flex',
                      p: 1.5,
                      borderRadius: 2,
                      mb: 2,
                      color: '#4361EE',
                      backgroundColor: 'rgba(67, 97, 238, 0.1)',
                    }}
                  >
                    {feature.icon}
                  </Box>
                  <Typography variant="h5" component="h3" sx={{ fontWeight: 600, mb: 1.5 }}>
                    {feature.title}
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    {feature.description}
                  </Typography>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* How It Works Section */}
      <Box id="how-it-works" sx={{ py: 10, background: 'white' }}>
        <Container maxWidth="lg">
          <Box textAlign="center" mb={8}>
            <Typography variant="h2" component="h2" sx={{ fontWeight: 700, color: '#1E3A8A', mb: 2 }}>
              How It Works
            </Typography>
            <Typography variant="h5" component="p" sx={{ color: 'text.secondary', maxWidth: '800px', mx: 'auto' }}>
              Get started with your virtual practice in three simple steps
            </Typography>
          </Box>

          <Grid container spacing={4} alignItems="center">
            {[
              {
                step: '01',
                title: 'Create Your Profile',
                description: 'Sign up and build your professional profile with your credentials, specialties, and practice details.',
                icon: <FileCheck size={48} />,
              },
              {
                step: '02',
                title: 'Set Your Availability',
                description: 'Define when you are available for virtual consultations and how much you charge.',
                icon: <Calendar size={48} />,
              },
              {
                step: '03',
                title: 'Start Seeing Patients',
                description: 'Accept patient appointments and provide care through our secure platform.',
                icon: <LucideMessagesSquare size={48} />,
              },
            ].map((step, index) => (
              <Grid item xs={12} key={index}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 4,
                    borderRadius: 3,
                    background: 'linear-gradient(135deg, #FAFAFA 0%, #F5F5F5 100%)',
                    border: '1px solid rgba(0, 0, 0, 0.05)',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  <Grid container spacing={4} alignItems="center">
                    <Grid item xs={12} md={7}>
                      <Box
                        sx={{
                          position: 'relative',
                          zIndex: 1,
                        }}
                      >
                        <Typography
                          variant="h1"
                          sx={{
                            fontSize: '4rem',
                            fontWeight: 800,
                            color: 'rgba(30, 58, 138, 0.1)',
                            position: 'absolute',
                            top: '-30px',
                            left: '-15px',
                          }}
                        >
                          {step.step}
                        </Typography>
                        <Typography variant="h4" component="h3" sx={{ fontWeight: 700, mb: 2, color: '#1E3A8A' }}>
                          {step.title}
                        </Typography>
                        <Typography variant="body1" paragraph sx={{ color: 'text.secondary', mb: 3 }}>
                          {step.description}
                        </Typography>
                        {index === 2 && (
                          <Button
                            variant="contained"
                            onClick={navigateToSignUp}
                            endIcon={<ArrowRight />}
                            sx={{
                              py: 1,
                              px: 3,
                              borderRadius: 2,
                              backgroundColor: '#4361EE',
                              textTransform: 'none',
                              '&:hover': {
                                backgroundColor: '#3A56E0',
                              },
                            }}
                          >
                            Get Started Now
                          </Button>
                        )}
                      </Box>
                    </Grid>
                    <Grid item xs={12} md={5}>
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          height: '100%',
                        }}
                      >
                        <Box
                          sx={{
                            backgroundColor: 'white',
                            borderRadius: '50%',
                            p: 3,
                            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
                            color: '#4361EE',
                          }}
                        >
                          {step.icon}
                        </Box>
                      </Box>
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Pricing Section */}
      <Box id="pricing" sx={{ py: 10, background: 'linear-gradient(135deg, #F8FAFC 0%, #EFF6FF 100%)' }}>
        <Container maxWidth="lg">
          <Box textAlign="center" mb={8}>
            <Typography variant="h2" component="h2" sx={{ fontWeight: 700, color: '#1E3A8A', mb: 2 }}>
              Transparent Pricing
            </Typography>
            <Typography variant="h5" component="p" sx={{ color: 'text.secondary', maxWidth: '800px', mx: 'auto' }}>
              No hidden fees, no setup costs—just a fair revenue-sharing model
            </Typography>
          </Box>

          <Grid container spacing={6} justifyContent="center">
            <Grid item xs={12} md={6}>
              <Card
                elevation={0}
                sx={{
                  borderRadius: 3,
                  overflow: 'hidden',
                  boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  border: '1px solid rgba(76, 201, 240, 0.3)',
                }}
              >
                <Box
                  sx={{
                    bgcolor: '#1E3A8A',
                    color: 'white',
                    p: 4,
                  }}
                >
                  <Typography variant="h4" component="h3" fontWeight={700} mb={1}>
                    Doctor-Owned Practice
                  </Typography>
                  <Typography variant="subtitle1" mb={3}>
                    A true partnership model that grows as you grow
                  </Typography>

                  <Box sx={{ display: 'flex', alignItems: 'baseline' }}>
                    <Typography variant="h3" component="span" fontWeight={800}>
                      $0
                    </Typography>
                    <Typography variant="h6" component="span" sx={{ ml: 1 }}>
                      setup fee
                    </Typography>
                  </Box>
                  <Typography variant="subtitle1" fontWeight={400}>
                    No monthly subscription or hidden charges
                  </Typography>
                </Box>

                <CardContent sx={{ p: 4, flexGrow: 1, bgcolor: 'white' }}>
                  <List disablePadding>
                    {[
                      { text: 'You keep 75% of direct consultation fees', icon: <Percent size={20} color="#4CC9F0" /> },
                      { text: 'You earn 25% of AI copilot interaction fees', icon: <Brain size={20} color="#4CC9F0" /> },
                      { text: 'Full ownership of your patient relationships', icon: <Users size={20} color="#4CC9F0" /> },
                      { text: 'Set your own consultation rates', icon: <DollarSign size={20} color="#4CC9F0" /> },
                      { text: 'Transparent earnings dashboard', icon: <BarChart2 size={20} color="#4CC9F0" /> },
                      { text: 'Dedicated physician success manager', icon: <LifeBuoy size={20} color="#4CC9F0" /> },
                      { text: 'Weekly direct deposit payments', icon: <CreditCard size={20} color="#4CC9F0" /> },
                    ].map((item, index) => (
                      <ListItem key={index} sx={{ py: 1.5, px: 0 }}>
                        <ListItemIcon sx={{ minWidth: 40 }}>
                          {item.icon}
                        </ListItemIcon>
                        <ListItemText primary={item.text} primaryTypographyProps={{ fontWeight: 500 }} />
                      </ListItem>
                    ))}
                  </List>
                  <Button
                    variant="contained"
                    fullWidth
                    size="large"
                    onClick={navigateToSignUp}
                    endIcon={<ArrowRight />}
                    sx={{
                      mt: 4,
                      py: 1.5,
                      borderRadius: 2,
                      backgroundColor: '#1E3A8A',
                      fontSize: '1rem',
                      fontWeight: 600,
                      textTransform: 'none',
                      '&:hover': {
                        backgroundColor: '#182F71',
                      },
                    }}
                  >
                    Start Your Practice
                  </Button>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card
                elevation={0}
                sx={{
                  borderRadius: 3,
                  bgcolor: 'white',
                  p: 4,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  border: '1px solid rgba(0, 0, 0, 0.05)',
                }}
              >
                <Typography variant="h4" component="h3" fontWeight={700} color="#1E3A8A" mb={3}>
                  Your Personal Success Manager
                </Typography>
                
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
                  <Avatar
                    src="/physician-manager.jpg"
                    alt="Success Manager"
                    sx={{ width: 80, height: 80, mr: 3 }}
                  />
                  <Box>
                    <Typography variant="h6" fontWeight={600}>
                      Partnering for Your Success
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Every physician gets a dedicated success manager to maximize your practice potential
                    </Typography>
                  </Box>
                </Box>

                <Divider sx={{ my: 3 }} />

                <Typography variant="body1" paragraph>
                  Your success manager will help you with:
                </Typography>

                <List disablePadding sx={{ mb: 3, flexGrow: 1 }}>
                  {[
                    'Optimizing your profile to attract more patients',
                    'Setting competitive rates for your services',
                    'Best practices for virtual consultations',
                    'Marketing your telehealth services effectively',
                    'Maximizing the benefits of the AI physician copilot',
                    'Analyzing your practice metrics for growth'
                  ].map((item, index) => (
                    <ListItem key={index} sx={{ py: 1, px: 0 }}>
                      <ListItemIcon sx={{ minWidth: 40 }}>
                        <Check size={20} color="#4CC9F0" />
                      </ListItemIcon>
                      <ListItemText primary={item} />
                    </ListItem>
                  ))}
                </List>

                <Box sx={{ bgcolor: '#F0F9FF', p: 3, borderRadius: 2, mt: 'auto' }}>
                  <Typography variant="body1" fontWeight={600} color="#0C4A6E">
                    "Our goal is to help you build a thriving virtual practice with minimal administrative burden. We succeed when you succeed."
                  </Typography>
                </Box>
              </Card>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Testimonials Section */}
      <Box id="testimonials" sx={{ py: 10, background: 'white' }}>
        <Container maxWidth="lg">
          <Box textAlign="center" mb={8}>
            <Typography variant="h2" component="h2" sx={{ fontWeight: 700, color: '#1E3A8A', mb: 2 }}>
              Success Stories
            </Typography>
            <Typography variant="h5" component="p" sx={{ color: 'text.secondary', maxWidth: '800px', mx: 'auto' }}>
              Hear from physicians who've transformed their practice with our platform
            </Typography>
          </Box>

          <Grid container spacing={4}>
            {[
              {
                name: 'Dr. Sarah Johnson',
                specialty: 'Cardiologist',
                image: '/doctor1.jpg',
                quote: 'Setting up my virtual cardiology practice was seamless. I am now able to see more patients with less administrative overhead, and my patients love the convenience of virtual follow-ups.',
                stats: 'Increased patient volume by 40% within 3 months'
              },
              {
                name: 'Dr. Michael Chen',
                specialty: 'Family Medicine',
                image: '/doctor2.jpg',
                quote: 'The AI copilot handles routine follow-ups and medication checks, which has freed up my schedule to focus on complex cases. I am earning more while working fewer hours.',
                stats: 'Reduced administrative work by 60%'
              },
              {
                name: 'Dr. Aisha Patel',
                specialty: 'Pediatrician',
                image: '/doctor3.jpg',
                quote: 'My success manager helped me optimize my pricing strategy and availability. The transparent revenue model means I can predict my income and plan my schedule accordingly.',
                stats: 'Doubled practice revenue in 6 months'
              },
            ].map((testimonial, index) => (
              <Grid item xs={12} md={4} key={index}>
                <Card
                  elevation={0}
                  sx={{
                    borderRadius: 3,
                    p: 4,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    background: 'linear-gradient(135deg, #F9FAFB 0%, #F3F4F6 100%)',
                    border: '1px solid rgba(0, 0, 0, 0.05)',
                    transition: 'transform 0.3s, box-shadow 0.3s',
                    '&:hover': {
                      transform: 'translateY(-5px)',
                      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <Avatar
                      src={testimonial.image}
                      alt={testimonial.name}
                      sx={{ width: 64, height: 64, mr: 2 }}
                    />
                    <Box>
                      <Typography variant="h6" fontWeight={600}>
                        {testimonial.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {testimonial.specialty}
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Box
                    sx={{
                      mb: 3,
                      p: 3,
                      borderRadius: 2,
                      bgcolor: 'white',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                      position: 'relative',
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: -10,
                        left: 20,
                        borderWidth: '0 10px 10px 10px',
                        borderStyle: 'solid',
                        borderColor: 'transparent transparent white transparent',
                      },
                      flexGrow: 1,
                    }}
                  >
                    <Typography variant="body1" paragraph fontStyle="italic">
                      "{testimonial.quote}"
                    </Typography>
                  </Box>
                  
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      p: 2,
                      borderRadius: 2,
                      bgcolor: 'rgba(76, 201, 240, 0.1)',
                    }}
                  >
                    <Zap size={20} color="#4361EE" />
                    <Typography variant="body2" fontWeight={600} sx={{ ml: 1, color: '#1E3A8A' }}>
                      {testimonial.stats}
                    </Typography>
                  </Box>
                </Card>
              </Grid>
            ))}
          </Grid>
          
          <Box textAlign="center" mt={6}>
            <Button
              variant="outlined"
              color="primary"
              endIcon={<ArrowRight />}
              onClick={navigateToSignUp}
              sx={{
                borderColor: '#4361EE',
                color: '#4361EE',
                borderRadius: 2,
                py: 1,
                px: 3,
                '&:hover': {
                  borderColor: '#3A56E0',
                  backgroundColor: 'rgba(67, 97, 238, 0.05)',
                },
              }}
            >
              Join Our Physician Community
            </Button>
          </Box>
        </Container>
      </Box>

      {/* Final CTA Section */}
      <Box
        sx={{
          py: 10,
          background: 'linear-gradient(135deg, #0A2463 0%, #1E3A8A 100%)',
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center" justifyContent="center">
            <Grid item xs={12} md={8}>
              <Box textAlign="center">
                <Typography variant="h3" component="h2" sx={{ fontWeight: 700, mb: 3 }}>
                  Ready to Transform Your Medical Practice?
                </Typography>
                <Typography variant="h6" component="p" sx={{ mb: 4, color: 'rgba(255, 255, 255, 0.8)' }}>
                  Join thousands of physicians who are building profitable practices with the help of AI technology. 
                  No setup fees, no monthly subscriptions — just a fair revenue share model.
                </Typography>
                <Button
                  variant="contained"
                  size="large"
                  onClick={navigateToSignUp}
                  startIcon={<Stethoscope />}
                  sx={{
                    py: 1.5,
                    px: 4,
                    borderRadius: 2,
                    backgroundColor: '#4CC9F0',
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    boxShadow: '0 4px 14px 0 rgba(76, 201, 240, 0.4)',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      backgroundColor: '#3DB9E0',
                      transform: 'translateY(-3px)',
                      boxShadow: '0 6px 20px 0 rgba(76, 201, 240, 0.6)',
                    },
                  }}
                >
                  Create Your Doctor Account
                </Button>
                <Typography variant="body2" sx={{ mt: 3, color: 'rgba(255, 255, 255, 0.7)' }}>
                  Already have an account? <Link href="#" onClick={navigateToLogin} sx={{ color: '#4CC9F0', textDecoration: 'none' }}>Log in here</Link>
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Container>
        
        {/* Decorative elements */}
        <Box
          sx={{
            position: 'absolute',
            top: '20%',
            left: '5%',
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            backgroundColor: '#4CC9F0',
            opacity: 0.6,
            boxShadow: '0 0 20px 5px rgba(76, 201, 240, 0.4)',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            bottom: '15%',
            right: '10%',
            width: '15px',
            height: '15px',
            borderRadius: '50%',
            backgroundColor: '#4CC9F0',
            opacity: 0.6,
            boxShadow: '0 0 20px 5px rgba(76, 201, 240, 0.4)',
          }}
        />
      </Box>
      
      {/* Footer */}
      <Box
        sx={{
          py: 5,
          background: '#0F172A',
          color: 'rgba(255, 255, 255, 0.7)',
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={4}>
            <Grid item xs={12} md={4}>
              <Typography variant="h6" sx={{ color: 'white', fontWeight: 600, mb: 2 }}>
                Prestige Health
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Empowering physicians to build profitable virtual practices with AI technology.
              </Typography>
              <Typography variant="body2">
                © {new Date().getFullYear()} Prestige Health. All rights reserved.
              </Typography>
            </Grid>
            <Grid item xs={6} md={2}>
              <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 600, mb: 2 }}>
                Platform
              </Typography>
              <List disablePadding>
                {['Features', 'Pricing', 'Security', 'Support'].map((item) => (
                  <ListItem key={item} sx={{ py: 0.5, px: 0 }}>
                    <Link
                      href="#"
                      sx={{
                        color: 'inherit',
                        textDecoration: 'none',
                        '&:hover': { color: '#4CC9F0' },
                      }}
                    >
                      {item}
                    </Link>
                  </ListItem>
                ))}
              </List>
            </Grid>
            <Grid item xs={6} md={2}>
              <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 600, mb: 2 }}>
                Company
              </Typography>
              <List disablePadding>
                {['About', 'Blog', 'Careers', 'Press'].map((item) => (
                  <ListItem key={item} sx={{ py: 0.5, px: 0 }}>
                    <Link
                      href="#"
                      sx={{
                        color: 'inherit',
                        textDecoration: 'none',
                        '&:hover': { color: '#4CC9F0' },
                      }}
                    >
                      {item}
                    </Link>
                  </ListItem>
                ))}
              </List>
            </Grid>
            <Grid item xs={6} md={2}>
              <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 600, mb: 2 }}>
                Legal
              </Typography>
              <List disablePadding>
                {['Terms', 'Privacy', 'Cookies', 'Licenses'].map((item) => (
                  <ListItem key={item} sx={{ py: 0.5, px: 0 }}>
                    <Link
                      href="#"
                      sx={{
                        color: 'inherit',
                        textDecoration: 'none',
                        '&:hover': { color: '#4CC9F0' },
                      }}
                    >
                      {item}
                    </Link>
                  </ListItem>
                ))}
              </List>
            </Grid>
            <Grid item xs={6} md={2}>
              <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 600, mb: 2 }}>
                Connect
              </Typography>
              <List disablePadding>
                {['Twitter', 'LinkedIn', 'Facebook', 'Contact'].map((item) => (
                  <ListItem key={item} sx={{ py: 0.5, px: 0 }}>
                    <Link
                      href="#"
                      sx={{
                        color: 'inherit',
                        textDecoration: 'none',
                        '&:hover': { color: '#4CC9F0' },
                      }}
                    >
                      {item}
                    </Link>
                  </ListItem>
                ))}
              </List>
            </Grid>
          </Grid>
        </Container>
      </Box>
    </Box>
  );
};

export default LandingPage;