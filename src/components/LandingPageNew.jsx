import React, { useState, useEffect, useRef } from 'react';
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
  Drawer,
  Link,
  Icon,
} from '@mui/material';
import { useTheme, styled, keyframes } from '@mui/material/styles';
import { css } from '@emotion/react'; // Import css
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
  Brain,
  FileText,
  MessageSquare,
  ArrowRight,
  FileCheck,
  CreditCard,
  Menu as MenuIcon,
  X,
  LifeBuoy,
  Percent,
  UserCheck,
  ChevronDown,
  PlayCircle,
  TrendingUp,
  ShieldCheck,
  Lightbulb,
  Heart,
  Smile,
  ThumbsUp
} from 'lucide-react';
import { Parallax } from 'react-scroll-parallax';

const neonGlow = keyframes`
  0% { box-shadow: 0 0 5px #2C75FB, 0 0 10px #2C75FB, 0 0 15px #2C75FB, 0 0 20px #001C82, 0 0 35px #001C82, 0 0 40px #001C82, 0 0 50px #001C82, 0 0 75px #001C82; }
  50% { box-shadow: 0 0 10px #2C75FB, 0 0 20px #2C75FB, 0 0 30px #2C75FB, 0 0 40px #001C82, 0 0 70px #001C82, 0 0 80px #001C82, 0 0 100px #001C82, 0 0 150px #001C82; }
  100% { box-shadow: 0 0 5px #2C75FB, 0 0 10px #2C75FB, 0 0 15px #2C75FB, 0 0 20px #001C82, 0 0 35px #001C82, 0 0 40px #001C82, 0 0 50px #001C82, 0 0 75px #001C82; }
`;

const pulseAnimation = keyframes`
  0% { transform: scale(1); opacity: 0.7; }
  50% { transform: scale(1.05); opacity: 1; }
  100% { transform: scale(1); opacity: 0.7; }
`;

const slideInUp = keyframes`
  from {
    transform: translateY(50px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
`;

const AnimatedBox = styled(Box)(({ theme, inView }) => ({
  opacity: 0,
  transform: 'translateY(50px)',
  transition: 'opacity 0.6s ease-out, transform 0.6s ease-out',
  ...(inView && {
    opacity: 1,
    transform: 'translateY(0px)',
  }),
}));

const StyledHeroButton = styled(Button)(({ theme }) => css`
  padding: ${theme.spacing(1.8)} ${theme.spacing(5)};
  border-radius: 30px;
  background-color: #2C75FB;
  color: #FFFFFF;
  font-size: 1.1rem;
  font-weight: 700;
  text-transform: none;
  box-shadow: 0 0 20px rgba(44, 117, 251, 0.5), ${neonGlow};
  transition: all 0.3s ease;
  animation: ${pulseAnimation} 3s infinite alternate;

  &:hover {
    background-color: #1A5FDE;
    transform: translateY(-3px) scale(1.02);
    box-shadow: 0 0 30px rgba(44, 117, 251, 0.7), ${neonGlow};
  }
`);

const useIntersectionObserver = (options) => {
  const [inView, setInView] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setInView(true);
        observer.unobserve(entry.target);
      }
    }, options);

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [options]);

  return [ref, inView];
};

const navItems = [
  { label: 'Features', sectionId: 'features' },
  { label: 'How It Works', sectionId: 'how-it-works' },
  { label: 'Pricing', sectionId: 'pricing' },
  { label: 'Success Stories', sectionId: 'testimonials' },
];

const LandingPageNew = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navigateToSignUp = () => navigate('/register');
  const navigateToLogin = () => navigate('/login');

  const scrollToSection = (sectionId) => {
    const section = document.getElementById(sectionId);
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setMobileMenuOpen(false);
  };
  
  const Section = ({ children, id, sx, ...props }) => {
    const [ref, inView] = useIntersectionObserver({ threshold: 0.1 });
    return (
      <AnimatedBox ref={ref} inView={inView} component="section" id={id} sx={{ py: { xs: 8, md: 12 }, ...sx }} {...props}>
        <Container maxWidth="lg">
          {children}
        </Container>
      </AnimatedBox>
    );
  };

  return (
    <Box sx={{ backgroundColor: '#050816', color: '#E0E0E0', overflowX: 'hidden' }}>
      <CssBaseline />
      <GlobalStyles styles={{
        html: { scrollBehavior: 'smooth' },
        body: { margin: 0, padding: 0, WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale' },
        '*::-webkit-scrollbar': { width: '8px' },
        '*::-webkit-scrollbar-track': { background: '#0a192f' },
        '*::-webkit-scrollbar-thumb': { background: '#2C75FB', borderRadius: '4px' },
        '*::-webkit-scrollbar-thumb:hover': { background: '#1A5FDE' },
      }} />

      <AppBar
        position="fixed"
        elevation={scrolled ? 6 : 0}
        sx={{
          backgroundColor: scrolled ? 'rgba(10, 25, 47, 0.85)' : 'transparent',
          backdropFilter: scrolled ? 'blur(10px)' : 'none',
          transition: 'all 0.3s ease-in-out',
          boxShadow: scrolled ? '0 2px 10px rgba(0,0,0,0.3)' : 'none',
        }}
      >
        <Toolbar sx={{ justifyContent: 'flex-end', py: 1 }}>
          {isSmallScreen ? (
            <IconButton edge="end" onClick={() => setMobileMenuOpen(true)} sx={{ color: 'white' }}>
              <MenuIcon />
            </IconButton>
          ) : (
            <Stack direction="row" spacing={1}>
              {navItems.map((item) => (
                <Button
                  key={item.label}
                  onClick={() => scrollToSection(item.sectionId)}
                  sx={{
                    color: 'white',
                    fontWeight: 500,
                    textTransform: 'none',
                    fontSize: '1rem',
                    px: 2,
                    py: 1,
                    borderRadius: '20px',
                    '&:hover': {
                      backgroundColor: 'rgba(44, 117, 251, 0.1)',
                      color: '#2C75FB',
                    },
                  }}
                >
                  {item.label}
                </Button>
              ))}
              <Button
                variant="outlined"
                onClick={navigateToLogin}
                sx={{
                  color: 'white',
                  borderColor: '#2C75FB',
                  fontWeight: 600,
                  borderRadius: '20px',
                  textTransform: 'none',
                  ml: 2,
                  '&:hover': {
                    backgroundColor: '#2C75FB',
                    color: '#0a192f',
                    borderColor: '#2C75FB',
                  },
                }}
              >
                Log In
              </Button>
              <Button
                variant="contained"
                onClick={navigateToSignUp}
                startIcon={<Award />}
                sx={{
                  backgroundColor: '#2C75FB',
                  color: '#0a192f',
                  fontWeight: 600,
                  borderRadius: '20px',
                  textTransform: 'none',
                  '&:hover': {
                    backgroundColor: '#1A5FDE',
                    boxShadow: '0 0 15px #2C75FB',
                  },
                }}
              >
                Get Started
              </Button>
            </Stack>
          )}
        </Toolbar>
      </AppBar>

      <Drawer anchor="right" open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} PaperProps={{ sx: { backgroundColor: '#0a192f', width: 280 } }}>
        <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
          <IconButton onClick={() => setMobileMenuOpen(false)} sx={{ color: 'white', alignSelf: 'flex-end' }}>
            <X />
          </IconButton>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 4, mt: 2, pl: 1 }}>
            <img src="/images/logo.png" alt="PrestigeHealth Logo" style={{ height: '32px', marginRight: '10px' }} />
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#FFFFFF' }}>
              Prestige<span style={{ color: '#2C75FB' }}>Health</span>
            </Typography>
          </Box>
          {navItems.map((item) => (
            <Button
              key={item.label}
              fullWidth
              onClick={() => scrollToSection(item.sectionId)}
              sx={{
                color: 'white',
                fontWeight: 500,
                justifyContent: 'flex-start',
                py: 1.5,
                px: 2,
                textTransform: 'none',
                fontSize: '1.1rem',
                borderRadius: '8px',
                mb: 1,
                '&:hover': {
                  backgroundColor: 'rgba(44, 117, 251, 0.1)',
                  color: '#2C75FB',
                },
              }}
            >
              {item.label}
            </Button>
          ))}
          <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.2)' }} />
          <Button
            variant="outlined"
            fullWidth
            onClick={navigateToLogin}
            sx={{
              color: 'white',
              borderColor: '#2C75FB',
              fontWeight: 600,
              borderRadius: '20px',
              textTransform: 'none',
              py: 1.5,
              mb: 2,
              '&:hover': {
                backgroundColor: '#2C75FB',
                color: '#0a192f',
              },
            }}
          >
            Log In
          </Button>
          <Button
            variant="contained"
            fullWidth
            onClick={navigateToSignUp}
            startIcon={<Award />}
            sx={{
              backgroundColor: '#2C75FB',
              color: '#0a192f',
              fontWeight: 600,
              borderRadius: '20px',
              textTransform: 'none',
              py: 1.5,
              '&:hover': {
                backgroundColor: '#1A5FDE',
              },
            }}
          >
            Get Started
          </Button>
        </Box>
      </Drawer>

      {/* Hero Section */}
      <Box
        id="hero"
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pt: { xs: 15, md: 20 },
          pb: { xs: 10, md: 15 },
          background: 'linear-gradient(180deg, #001C82 0%, #050816 100%)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: 'url("/images/abstract-bg.svg")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.1,
            zIndex: 0,
          }}
        />
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1, textAlign: { xs: 'center', md: 'left' } }}>
          <Grid container spacing={5} alignItems="center">
            <Grid item xs={12} md={7}>
              <Chip
                label="AI-POWERED PRACTICE MANAGEMENT"
                icon={<Brain size={18} />}
                sx={{
                  backgroundColor: 'rgba(44, 117, 251, 0.15)',
                  color: '#2C75FB',
                  fontWeight: 'bold',
                  mb: 3,
                  fontSize: '0.9rem',
                  py: 2,
                  px: 1,
                  borderRadius: '16px',
                  border: '1px solid #2C75FB'
                }}
              />
              <Typography
                variant="h1"
                component="h1"
                sx={{
                  fontSize: { xs: '2.8rem', sm: '3.8rem', md: '4.5rem' },
                  fontWeight: 800,
                  mb: 2,
                  lineHeight: 1.15,
                  color: '#F9FAFB',
                  textShadow: '0 2px 10px rgba(0,0,0,0.3)',
                }}
              >
                Build Your Profitable Private Practice{' '}
                <Box
                  component="span"
                  sx={{
                    color: '#2C75FB',
                    position: 'relative',
                    display: 'inline-block',
                    '&::after': {
                      content: '""',
                      position: 'absolute',
                      width: '100%',
                      height: '8px',
                      bottom: '5px',
                      left: '0',
                      backgroundColor: 'rgba(44, 117, 251, 0.5)',
                      zIndex: -1,
                      borderRadius: '4px'
                    },
                  }}
                >
                  Without The Grind
                </Box>
              </Typography>
              <Typography
                variant="h5"
                component="p"
                sx={{
                  fontSize: { xs: '1.1rem', md: '1.3rem' },
                  fontWeight: 400,
                  mb: 5,
                  color: '#F9FAFB',
                  maxWidth: '600px',
                  mx: { xs: 'auto', md: 0 },
                  lineHeight: 1.6,
                }}
              >
                Your AI physician copilot helps manage administrative tasks so you can focus on what matters—seeing patients directly and building meaningful doctor-patient relationships.
              </Typography>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                sx={{ mt: 4, justifyContent: { xs: 'center', md: 'flex-start' } }}
              >
                <StyledHeroButton
                  variant="contained"
                  size="large"
                  onClick={navigateToSignUp}
                  startIcon={<Award size={22} />}
                >
                  Set Up Your Private Practice
                </StyledHeroButton>
                <Button
                  variant="outlined"
                  size="large"
                  onClick={navigateToLogin}
                  startIcon={<PlayCircle size={22} />}
                  sx={{
                    py: 1.8,
                    px: 5,
                    borderRadius: '30px',
                    borderColor: '#2C75FB',
                    color: '#F9FAFB',
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    textTransform: 'none',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      borderColor: '#F9FAFB',
                      backgroundColor: 'rgba(44, 117, 251, 0.1)',
                      color: '#2C75FB',
                      transform: 'translateY(-3px)',
                    },
                  }}
                >
                  Watch Demo
                </Button>
              </Stack>
            </Grid>
            <Grid item xs={12} md={5} sx={{ display: { xs: 'none', md: 'block' } }}>
              <Parallax y={[-20, 20]} tagOuter="figure">
                <Box
                  sx={{
                    position: 'relative',
                    perspective: '1500px',
                  }}
                >
                  <Box
                    component="img"
                    src="/images/doctor-ai-platform.png"
                    alt="Physician using AI-powered healthcare platform"
                    sx={{
                      width: '110%',
                      height: 'auto',
                      borderRadius: '25px',
                      boxShadow: '0 30px 60px rgba(0, 0, 0, 0.4), 0 0 50px rgba(44, 117, 251, 0.3)',
                      transform: 'rotateY(-15deg) rotateX(5deg) scale(0.95)',
                      transition: 'transform 0.4s ease-out',
                      border: '2px solid rgba(44, 117, 251, 0.3)',
                      '&:hover': {
                        transform: 'rotateY(-10deg) rotateX(2deg) scale(1)',
                      }
                    }}
                  />
                   <Box sx={{
                      position: 'absolute',
                      top: '-10%', left: '-10%', width: '120%', height: '120%',
                      background: 'radial-gradient(circle, rgba(44,117,251,0.2) 0%, rgba(44,117,251,0) 70%)',
                      zIndex: -1,
                      borderRadius: '50%',
                      animation: `${pulseAnimation} 4s infinite ease-in-out alternate`
                    }} />
                </Box>
              </Parallax>
            </Grid>
          </Grid>
        </Container>
        <Box sx={{ position: 'absolute', bottom: 30, left: '50%', transform: 'translateX(-50%)', animation: `${pulseAnimation} 1.5s infinite` }}>
          <IconButton onClick={() => scrollToSection('stats')} sx={{ color: '#2C75FB' }}>
            <ChevronDown size={40} />
          </IconButton>
        </Box>
      </Box>

      {/* Stats Section */}
      <Section id="stats" sx={{ backgroundColor: '#0a192f' }}>
        <Grid container spacing={4} justifyContent="center">
          {[
            { value: '75%', label: 'Revenue Share for Direct Consultations', icon: TrendingUp },
            { value: '25%', label: 'Revenue Share for AI Interactions', icon: Brain },
            { value: '100%', label: 'Patient Data Ownership', icon: ShieldCheck },
            { value: '$0', label: 'Setup or Monthly Fees', icon: ThumbsUp },
          ].map((stat, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Paper
                elevation={3}
                sx={{
                  p: 4,
                  textAlign: 'center',
                  backgroundColor: 'rgba(17, 34, 64, 0.6)',
                  borderRadius: '16px',
                  border: '1px solid rgba(44, 117, 251, 0.2)',
                  transition: 'all 0.3s ease',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  '&:hover': {
                    transform: 'translateY(-10px)',
                    boxShadow: '0 15px 30px rgba(0,0,0,0.2), 0 0 20px rgba(44, 117, 251, 0.4)',
                    borderColor: '#2C75FB',
                  }
                }}
              >
                <Icon component={stat.icon} sx={{ fontSize: 48, mb: 2, color: '#2C75FB' }} />
                <Typography variant="h3" component="div" sx={{ fontWeight: 700, color: 'white', mb: 1 }}>
                  {stat.value}
                </Typography>
                <Typography variant="body1" sx={{ color: '#B0C4DE' }}>
                  {stat.label}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Section>

      {/* Features Section */}
      <Section id="features" sx={{ backgroundColor: '#050816' }}>
        <Box textAlign="center" mb={10}>
          <Typography variant="h2" component="h2" sx={{ fontWeight: 700, color: 'white', mb: 2, textTransform: 'uppercase', letterSpacing: '1px' }}>
            Designed for <span style={{ color: '#2C75FB' }}>Modern</span> Healthcare Providers
          </Typography>
          <Typography variant="h5" component="p" sx={{ color: '#B0C4DE', maxWidth: '800px', mx: 'auto', lineHeight: 1.7 }}>
            Our platform combines AI-powered efficiency with full control over your practice, empowering you to deliver exceptional care.
          </Typography>
        </Box>

        <Grid container spacing={5}>
          {[
            { icon: <Stethoscope size={36} />, title: 'Your Practice, Your Rules', description: 'Set your own consultation rates, availability, and practice policies with complete autonomy.' },
            { icon: <Brain size={36} />, title: 'AI Physician Copilot', description: 'Leverage our AI to handle administrative tasks, patient communications, and routine follow-ups.' },
            { icon: <UserCheck size={36} />, title: 'Personal Success Manager', description: 'Get dedicated support from a physician success manager who helps you maximize platform value.' },
            { icon: <DollarSign size={36} />, title: 'Transparent Revenue Model', description: 'Keep 75% of direct consultation fees and 25% of AI-assisted interactions with your patients.' },
            { icon: <Globe size={36} />, title: 'Virtual Care Anywhere', description: 'Provide telemedicine consultations to patients regardless of their location.' },
            { icon: <FileText size={36} />, title: 'Comprehensive Patient Records', description: 'Access detailed patient histories, test results, and health metrics in one secure place.' },
          ].map((feature, index) => (
            <Grid item xs={12} md={6} lg={4} key={index}>
              <Card
                elevation={0}
                sx={{
                  p: 3.5,
                  height: '100%',
                  borderRadius: '20px',
                  transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                  backgroundColor: 'rgba(17, 34, 64, 0.5)',
                  border: '1px solid rgba(44, 117, 251, 0.15)',
                  backdropFilter: 'blur(5px)',
                  '&:hover': {
                    transform: 'translateY(-15px) scale(1.03)',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.3), 0 0 30px rgba(44, 117, 251, 0.5)',
                    borderColor: 'rgba(44, 117, 251, 0.7)',
                    backgroundColor: 'rgba(17, 34, 64, 0.8)',
                  },
                }}
              >
                <Box
                  sx={{
                    display: 'inline-flex',
                    p: 2,
                    borderRadius: '50%',
                    mb: 2.5,
                    color: '#050816',
                    backgroundColor: '#2C75FB',
                    boxShadow: '0 0 15px rgba(44, 117, 251, 0.6)',
                  }}
                >
                  {React.cloneElement(feature.icon, { color: '#050816' })}
                </Box>
                <Typography variant="h5" component="h3" sx={{ fontWeight: 600, mb: 1.5, color: 'white' }}>
                  {feature.title}
                </Typography>
                <Typography variant="body1" sx={{ color: '#B0C4DE', lineHeight: 1.6 }}>
                  {feature.description}
                </Typography>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Section>

      {/* How It Works Section */}
      <Section id="how-it-works" sx={{ backgroundColor: '#0a192f' }}>
        <Box textAlign="center" mb={10}>
          <Typography variant="h2" component="h2" sx={{ fontWeight: 700, color: 'white', mb: 2, textTransform: 'uppercase', letterSpacing: '1px' }}>
            How It <span style={{ color: '#2C75FB' }}>Works</span>
          </Typography>
          <Typography variant="h5" component="p" sx={{ color: '#B0C4DE', maxWidth: '800px', mx: 'auto', lineHeight: 1.7 }}>
            Get started with your virtual practice in three simple, streamlined steps.
          </Typography>
        </Box>

        <Grid container spacing={5} alignItems="stretch">
          {[
            { step: '01', title: 'Create Your Profile', description: 'Sign up and build your professional profile with your credentials, specialties, and practice details.', icon: <FileCheck size={52} /> },
            { step: '02', title: 'Set Your Availability', description: 'Define when you are available for virtual consultations and how much you charge.', icon: <Calendar size={52} /> },
            { step: '03', title: 'Start Seeing Patients', description: 'Accept patient appointments and provide care through our secure platform.', icon: <MessageSquare size={52} /> },
          ].map((step, index) => (
            <Grid item xs={12} md={4} key={index}>
              <Paper
                elevation={0}
                sx={{
                  p: {xs:3, md:4},
                  borderRadius: '20px',
                  background: 'linear-gradient(145deg, rgba(17, 34, 64, 0.7) 0%, rgba(10, 25, 47, 0.7) 100%)',
                  border: '1px solid rgba(44, 117, 251, 0.2)',
                  position: 'relative',
                  overflow: 'hidden',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 0.3s ease-in-out',
                  '&:hover': {
                    borderColor: '#2C75FB',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.25), 0 0 20px rgba(44, 117, 251, 0.3)',
                    transform: 'scale(1.02)'
                  }
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <Typography
                    variant="h1"
                    sx={{
                      fontSize: {xs: '3rem', md:'3.5rem'},
                      fontWeight: 800,
                      color: 'rgba(44, 117, 251, 0.3)',
                      mr: 2,
                      lineHeight: 1
                    }}
                  >
                    {step.step}
                  </Typography>
                  <Box sx={{ color: '#2C75FB' }}>{React.cloneElement(step.icon, { strokeWidth: 1.5 })}</Box>
                </Box>
                <Typography variant="h4" component="h3" sx={{ fontWeight: 700, mb: 2, color: 'white', fontSize: {xs: '1.5rem', md:'1.75rem'} }}>
                  {step.title}
                </Typography>
                <Typography variant="body1" paragraph sx={{ color: '#B0C4DE', mb: 3, flexGrow: 1, lineHeight: 1.6 }}>
                  {step.description}
                </Typography>
                {index === 2 && (
                  <Button
                    variant="contained"
                    onClick={navigateToSignUp}
                    endIcon={<ArrowRight />}
                    sx={{
                      py: 1.2,
                      px: 3,
                      borderRadius: '25px',
                      backgroundColor: '#2C75FB',
                      color: '#0a192f',
                      textTransform: 'none',
                      fontWeight: 600,
                      alignSelf: 'flex-start',
                      '&:hover': {
                        backgroundColor: '#1A5FDE',
                        boxShadow: '0 0 10px #2C75FB',
                      },
                    }}
                  >
                    Get Started Now
                  </Button>
                )}
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Section>

      {/* Pricing Section */}
      <Section id="pricing" sx={{ backgroundColor: '#050816' }}>
        <Box textAlign="center" mb={10}>
          <Typography variant="h2" component="h2" sx={{ fontWeight: 700, color: 'white', mb: 2, textTransform: 'uppercase', letterSpacing: '1px' }}>
            Transparent <span style={{ color: '#2C75FB' }}>Pricing</span>
          </Typography>
          <Typography variant="h5" component="p" sx={{ color: '#B0C4DE', maxWidth: '800px', mx: 'auto', lineHeight: 1.7 }}>
            No hidden fees, no setup costs—just a fair revenue-sharing model designed for your success.
          </Typography>
        </Box>

        <Grid container spacing={5} justifyContent="center" alignItems="stretch">
          <Grid item xs={12} md={6} lg={5}>
            <Card
              elevation={0}
              sx={{
                borderRadius: '24px',
                overflow: 'hidden',
                boxShadow: '0 20px 50px rgba(0,0,0,0.35), 0 0 30px rgba(44, 117, 251, 0.3)',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                border: '1px solid rgba(44, 117, 251, 0.4)',
                background: 'linear-gradient(160deg, #0a192f 0%, #112240 100%)',
                transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                 '&:hover': {
                    transform: 'scale(1.02)',
                    boxShadow: '0 25px 60px rgba(0,0,0,0.45), 0 0 40px rgba(44, 117, 251, 0.5)',
                  }
              }}
            >
              <Box sx={{ bgcolor: '#2C75FB', color: '#050816', p: {xs:3, md:4}, textAlign: 'center' }}>
                <Typography variant="h4" component="h3" fontWeight={700} mb={1}>
                  Doctor-Owned Practice
                </Typography>
                <Typography variant="subtitle1" mb={2} sx={{opacity: 0.9}}>
                  A true partnership model that grows as you grow.
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center' }}>
                  <Typography variant="h2" component="span" fontWeight={800}>
                    $0
                  </Typography>
                  <Typography variant="h6" component="span" sx={{ ml: 1 }}>
                    setup fee
                  </Typography>
                </Box>
                <Typography variant="body2" fontWeight={400} sx={{opacity: 0.8}}>
                  No monthly subscription or hidden charges.
                </Typography>
              </Box>

              <CardContent sx={{ p: {xs:3, md:4}, flexGrow: 1, backgroundColor: 'rgba(17,34,64,0.3)' }}>
                <List disablePadding>
                  {[
                    { text: 'You keep 75% of direct consultation fees', icon: <Percent size={22} color="#2C75FB" /> },
                    { text: 'You earn 25% of AI copilot interaction fees', icon: <Brain size={22} color="#2C75FB" /> },
                    { text: 'Full ownership of your patient relationships', icon: <Users size={22} color="#2C75FB" /> },
                    { text: 'Set your own consultation rates', icon: <DollarSign size={22} color="#2C75FB" /> },
                    { text: 'Transparent earnings dashboard', icon: <BarChart2 size={22} color="#2C75FB" /> },
                    { text: 'Dedicated physician success manager', icon: <LifeBuoy size={22} color="#2C75FB" /> },
                    { text: 'Weekly direct deposit payments', icon: <CreditCard size={22} color="#2C75FB" /> },
                  ].map((item, index) => (
                    <ListItem key={index} sx={{ py: 1.2, px: 0, borderBottom: index !== 6 ? '1px dashed rgba(44, 117, 251, 0.2)' : 'none' }}>
                      <ListItemIcon sx={{ minWidth: 45, color: '#2C75FB' }}>{item.icon}</ListItemIcon>
                      <ListItemText primary={item.text} primaryTypographyProps={{ fontWeight: 500, color: 'white' }} />
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
                    borderRadius: '30px',
                    backgroundColor: '#2C75FB',
                    color: '#0a192f',
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    textTransform: 'none',
                    '&:hover': {
                      backgroundColor: '#1A5FDE',
                      boxShadow: '0 0 15px #2C75FB',
                    },
                  }}
                >
                  Start Your Practice
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6} lg={5}>
            <Card
              elevation={0}
              sx={{
                borderRadius: '24px',
                p: {xs:3, md:4},
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                border: '1px solid rgba(44, 117, 251, 0.2)',
                backgroundColor: 'rgba(17, 34, 64, 0.6)',
                backdropFilter: 'blur(8px)',
                 transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                 '&:hover': {
                    transform: 'scale(1.02)',
                    boxShadow: '0 15px 40px rgba(0,0,0,0.3), 0 0 30px rgba(44, 117, 251, 0.4)',
                    borderColor: 'rgba(44, 117, 251, 0.5)',
                  }
              }}
            >
              <Typography variant="h4" component="h3" fontWeight={700} color="white" mb={2}>
                Your Personal <span style={{color: '#2C75FB'}}>Success Manager</span>
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Avatar
                  src="/physician-manager.jpg"
                  alt="Success Manager"
                  sx={{ width: 80, height: 80, mr: 2.5, border: '3px solid #2C75FB' }}
                />
                <Box>
                  <Typography variant="h6" fontWeight={600} color="white">
                    Partnering for Your Success
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#B0C4DE' }}>
                    Every physician gets a dedicated success manager to maximize your practice potential.
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ my: 2.5, borderColor: 'rgba(44, 117, 251, 0.3)' }} />

              <Typography variant="body1" paragraph sx={{ color: '#E0E0E0' }}>
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
                  <ListItem key={index} sx={{ py: 0.8, px: 0 }}>
                    <ListItemIcon sx={{ minWidth: 35, color: '#2C75FB' }}><Check size={20} /></ListItemIcon>
                    <ListItemText primary={item} primaryTypographyProps={{ color: '#B0C4DE' }} />
                  </ListItem>
                ))}
              </List>

              <Box sx={{ backgroundColor: 'rgba(44, 117, 251, 0.1)', p: 2.5, borderRadius: '12px', mt: 'auto', borderLeft: '4px solid #2C75FB' }}>
                <Typography variant="body1" fontWeight={600} sx={{ color: '#E0E0E0', fontStyle: 'italic' }}>
                  "Our goal is to help you build a thriving virtual practice with minimal administrative burden. We succeed when you succeed."
                </Typography>
              </Box>
            </Card>
          </Grid>
        </Grid>
      </Section>

      {/* Testimonials Section */}
      <Section id="testimonials" sx={{ backgroundColor: '#0a192f' }}>
        <Box textAlign="center" mb={10}>
          <Typography variant="h2" component="h2" sx={{ fontWeight: 700, color: 'white', mb: 2, textTransform: 'uppercase', letterSpacing: '1px' }}>
            Success <span style={{ color: '#2C75FB' }}>Stories</span>
          </Typography>
          <Typography variant="h5" component="p" sx={{ color: '#B0C4DE', maxWidth: '800px', mx: 'auto', lineHeight: 1.7 }}>
            Hear from physicians who've transformed their practice and achieved remarkable results with our platform.
          </Typography>
        </Box>

        <Grid container spacing={4}>
          {[
            { name: 'Dr. Sarah Johnson', specialty: 'Cardiologist', image: '/doctor1.jpg', quote: 'Setting up my virtual cardiology practice was seamless. I am now able to see more patients with less administrative overhead, and my patients love the convenience of virtual follow-ups.', stats: 'Increased patient volume by 40% within 3 months', icon: Heart },
            { name: 'Dr. Michael Chen', specialty: 'Family Medicine', image: '/doctor2.jpg', quote: 'The AI copilot handles routine follow-ups and medication checks, which has freed up my schedule to focus on complex cases. I am earning more while working fewer hours.', stats: 'Reduced administrative work by 60%', icon: Smile },
            { name: 'Dr. Aisha Patel', specialty: 'Pediatrician', image: '/doctor3.jpg', quote: 'My success manager helped me optimize my pricing strategy and availability. The transparent revenue model means I can predict my income and plan my schedule accordingly.', stats: 'Doubled practice revenue in 6 months', icon: Lightbulb },
          ].map((testimonial, index) => (
            <Grid item xs={12} md={4} key={index}>
              <Card
                elevation={0}
                sx={{
                  borderRadius: '20px',
                  p: {xs:3, md:3.5},
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  background: 'linear-gradient(145deg, rgba(17, 34, 64, 0.8) 0%, rgba(10, 25, 47, 0.8) 100%)',
                  border: '1px solid rgba(44, 117, 251, 0.25)',
                  backdropFilter: 'blur(6px)',
                  transition: 'all 0.3s ease-in-out',
                  '&:hover': {
                    borderColor: '#2C75FB',
                    boxShadow: '0 15px 35px rgba(0,0,0,0.3), 0 0 25px rgba(44, 117, 251, 0.4)',
                    transform: 'translateY(-8px)'
                  },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2.5 }}>
                  <Avatar src={testimonial.image} alt={testimonial.name} sx={{ width: 64, height: 64, mr: 2, border: '2px solid #2C75FB' }} />
                  <Box>
                    <Typography variant="h6" fontWeight={600} color="white">{testimonial.name}</Typography>
                    <Typography variant="body2" sx={{ color: '#2C75FB' }}>{testimonial.specialty}</Typography>
                  </Box>
                </Box>
                
                <Box sx={{ mb: 3, p: 2.5, borderRadius: '12px', backgroundColor: 'rgba(5, 8, 22, 0.5)', borderLeft: '3px solid #2C75FB', flexGrow: 1 }}>
                  <Typography variant="body1" paragraph sx={{ fontStyle: 'italic', color: '#E0E0E0', mb:0 }}>
                    "{testimonial.quote}"
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', p: 2, borderRadius: '10px', backgroundColor: 'rgba(44, 117, 251, 0.1)' }}>
                  <Icon component={testimonial.icon} sx={{ color: '#2C75FB', mr: 1.5, fontSize: 24 }} />
                  <Typography variant="body2" fontWeight={600} sx={{ color: 'white' }}>
                    {testimonial.stats}
                  </Typography>
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>
        
        <Box textAlign="center" mt={8}>
          <Button
            variant="outlined"
            endIcon={<ArrowRight />}
            onClick={navigateToSignUp}
            sx={{
              borderColor: '#2C75FB',
              color: '#2C75FB',
              borderRadius: '30px',
              py: 1.5,
              px: 4,
              fontSize: '1.1rem',
              fontWeight: 600,
              textTransform: 'none',
              transition: 'all 0.3s ease',
              '&:hover': {
                backgroundColor: 'rgba(44, 117, 251, 0.15)',
                borderColor: 'white',
                color: 'white',
                transform: 'scale(1.05)',
              },
            }}
          >
            Join Our Physician Community
          </Button>
        </Box>
      </Section>

      {/* CTA Section */}
      <Section id="cta" sx={{ backgroundColor: '#050816', py: { xs: 10, md: 15 } }}>
        <Box
          sx={{
            p: { xs: 4, md: 6 },
            textAlign: 'center',
            borderRadius: '24px',
            background: 'linear-gradient(135deg, #001C82 0%, #2C75FB 100%)',
            color: 'white',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3), 0 0 50px rgba(44, 117, 251, 0.6)',
          }}
        >
          <Typography variant="h2" component="h2" sx={{ fontWeight: 700, mb: 3, fontSize: { xs: '2.2rem', md: '3rem' } }}>
            Ready to Transform Your Medical Practice?
          </Typography>
          <Typography variant="h6" component="p" sx={{ mb: 5, color: 'rgba(255, 255, 255, 0.9)', maxWidth: '700px', mx: 'auto', lineHeight: 1.7 }}>
            Join thousands of physicians who are building profitable practices with the help of AI technology. 
            No setup fees, no monthly subscriptions — just a fair revenue share model.
          </Typography>
          <Button
            variant="contained"
            size="large"
            onClick={navigateToSignUp}
            startIcon={<Stethoscope size={24} />}
            sx={{
              py: 2,
              px: 6,
              borderRadius: '30px',
              backgroundColor: 'white',
              color: '#1E3A8A',
              fontSize: '1.2rem',
              fontWeight: 700,
              textTransform: 'none',
              boxShadow: '0 8px 20px rgba(0,0,0,0.25)',
              transition: 'all 0.3s ease',
              '&:hover': {
                backgroundColor: '#f0f0f0',
                transform: 'translateY(-5px) scale(1.03)',
                boxShadow: '0 12px 25px rgba(0,0,0,0.3)',
              },
            }}
          >
            Create Your Doctor Account
          </Button>
          <Typography variant="body2" sx={{ mt: 3, color: 'rgba(255, 255, 255, 0.85)' }}>
            Already have an account?{' '}
            <Link
              href="#"
              onClick={navigateToLogin}
              sx={{
                color: 'white',
                fontWeight: 'bold',
                textDecoration: 'underline',
                '&:hover': { color: '#0a192f' },
              }}
            >
              Log in here
            </Link>
          </Typography>
        </Box>
      </Section>
      
      {/* Footer */}
      <Box component="footer" sx={{ py: 8, background: '#0a192f', color: '#B0C4DE' }}>
        <Container maxWidth="lg">
          <Grid container spacing={5}>
            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                 <img src="/images/logo.png" alt="PrestigeHealth Logo" style={{ height: '36px', marginRight: '10px' }} />
                 <Typography variant="h5" sx={{ color: 'white', fontWeight: 600 }}>
                   Prestige<span style={{ color: '#2C75FB' }}>Health</span>
                 </Typography>
              </Box>
              <Typography variant="body2" sx={{ mb: 2, lineHeight: 1.6 }}>
                Empowering physicians to build profitable virtual practices with AI technology.
              </Typography>
              <Typography variant="caption">
                © {new Date().getFullYear()} Prestige Health. All rights reserved.
              </Typography>
            </Grid>
            {[
              { title: 'Platform', items: ['Features', 'Pricing', 'Security', 'Support'] },
              { title: 'Company', items: ['About', 'Blog', 'Careers', 'Press'] },
              { title: 'Legal', items: ['Terms', 'Privacy', 'Cookies', 'Licenses'] },
              { title: 'Connect', items: ['Twitter', 'LinkedIn', 'Facebook', 'Contact'] },
            ].map((section) => (
              <Grid item xs={6} sm={3} md={2} key={section.title}>
                <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 600, mb: 2 }}>
                  {section.title}
                </Typography>
                <List disablePadding dense>
                  {section.items.map((item) => (
                    <ListItem key={item} sx={{ py: 0.5, px: 0 }}>
                      <Link
                        href="#" // Replace with actual links
                        onClick={(e) => { e.preventDefault(); if(item.toLowerCase() === 'features') scrollToSection('features'); /* Add other specific scrolls */ }}
                        sx={{
                          color: '#B0C4DE',
                          textDecoration: 'none',
                          fontSize: '0.95rem',
                          '&:hover': { color: '#2C75FB', textDecoration: 'underline' },
                        }}
                      >
                        {item}
                      </Link>
                    </ListItem>
                  ))}
                </List>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>
    </Box>
  );
};

export default LandingPageNew;

// You might need to install react-scroll-parallax:
// npm install react-scroll-parallax
// or
// yarn add react-scroll-parallax
// And wrap your App or this component with <ParallaxProvider>
// import { ParallaxProvider } from 'react-scroll-parallax';
// <ParallaxProvider><App /></ParallaxProvider>
