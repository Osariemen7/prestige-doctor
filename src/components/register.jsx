import React, { useState } from 'react';
import { 
  Box, 
  Button, 
  TextField, 
  Paper, 
  Typography, 
  IconButton, 
  Snackbar, 
  Alert,
  Container,
  CircularProgress,
  Fade
} from '@mui/material';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './RegistrationPage.css';

const RegistrationPage = () => {
  const [formData, setFormData] = useState({
    phone_number: '',
    email: '',
    password: '',
    last_name: '',
    first_name: '',
    middle_name: '',
  });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSnackbarOpen(true);
    setLoading(true);
    try {
      const formattedPhoneNumber = formData.phone_number.replace(/^0/, '+234');
      const item = {
        ...formData,
        phone_number: formattedPhoneNumber,
      };
      const response = await fetch('https://health.prestigedelta.com/register/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify(item),
      });

      const result = await response.json();
      if (response.status !== 201) {
        setMessage(result.phone_number || result.email || result.password || 'An error occurred');
      } else {
        setMessage('Registration successful');
        localStorage.setItem('user-info', JSON.stringify(result));
        navigate('/provider');
      }
    } catch (error) {
      console.log(error);
      setMessage('An error occurred during registration');
    } finally {
      setLoading(false);
    }
  };

  const formFields = [
    { name: 'first_name', label: 'First Name', required: true },
    { name: 'middle_name', label: 'Middle Name', required: false },
    { name: 'last_name', label: 'Last Name', required: true },
    { name: 'email', label: 'Email', type: 'email', required: true },
    { name: 'phone_number', label: 'Phone Number', type: 'tel', required: true },
  ];

  return (
    <Container maxWidth={false} disableGutters 
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #E3F2FD 0%, #90CAF9 100%)',
        p: { xs: 2, sm: 4, md: 6 },
        overflowY: 'auto',
        boxSizing: 'border-box',
      }}
    >
      <Fade in timeout={800}>
        <Paper
          elevation={6}
          sx={{
            position: 'relative',
    
            width: '100%',
            maxWidth: 480,
            p: { xs: 3, sm: 4, md: 5 },
            mt: { xs: 4, sm: 6, md: 30 },
            mb: { xs: 4, sm: 6 },
            bgcolor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            borderRadius: 3,
            transition: 'transform 0.3s ease-in-out',
            '&:hover': {
              transform: 'scale(1.01)',
            },
          }}
        >
          <IconButton
            onClick={() => window.history.back()}
            sx={{
              position: 'absolute',
              top: { xs: 16, sm: 20 },
              left: { xs: 16, sm: 20 },
              color: '#1976D2',
              bgcolor: 'rgba(25, 118, 210, 0.1)',
              '&:hover': {
                bgcolor: 'rgba(25, 118, 210, 0.2)',
              },
              zIndex: 1,
            }}
          >
            <ArrowLeft size={20} />
          </IconButton>

          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography 
              variant="h4" 
              component="h1" 
              sx={{ 
                color: '#1976D2', 
                fontWeight: 700,
                letterSpacing: 0.5,
              }}
            >
              Create Account
            </Typography>
            <Typography 
              variant="body1" 
              sx={{ 
                color: '#546E7A', 
                mt: 1,
                fontSize: '1.1rem',
              }}
            >
              Join our healthcare community
            </Typography>
          </Box>

          <Box 
            component="form" 
            onSubmit={handleSubmit} 
            sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: 2.5 
            }}
          >
            {formFields.map((field) => (
              <TextField
                key={field.name}
                name={field.name}
                label={field.label}
                type={field.type || 'text'}
                variant="outlined"
                value={formData[field.name]}
                onChange={handleInputChange}
                required={field.required}
                fullWidth
                InputProps={{
                  sx: {
                    borderRadius: 2,
                    bgcolor: 'rgba(255,255,255,0.8)',
                    '&:hover': {
                      bgcolor: 'rgba(255,255,255,0.9)',
                    },
                  },
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': {
                      borderColor: 'rgba(25, 118, 210, 0.2)',
                    },
                    '&:hover fieldset': {
                      borderColor: 'rgba(25, 118, 210, 0.5)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#1976D2',
                    },
                  },
                }}
              />
            ))}

            <TextField
              name="password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              variant="outlined"
              value={formData.password}
              onChange={handleInputChange}
              required
              fullWidth
              InputProps={{
                sx: {
                  borderRadius: 2,
                  bgcolor: 'rgba(255,255,255,0.8)',
                  '&:hover': {
                    bgcolor: 'rgba(255,255,255,0.9)',
                  },
                },
                endAdornment: (
                  <IconButton 
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                    sx={{ color: '#1976D2' }}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </IconButton>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': {
                    borderColor: 'rgba(25, 118, 210, 0.2)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'rgba(25, 118, 210, 0.5)',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#1976D2',
                  },
                },
              }}
            />

            <Button
              type="submit"
              variant="contained"
              disabled={loading}
              sx={{
                mt: 2,
                py: 1.5,
                bgcolor: '#1976D2',
                fontSize: '1.1rem',
                fontWeight: 600,
                borderRadius: 2,
                textTransform: 'none',
                boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)',
                '&:hover': {
                  bgcolor: '#1565C0',
                  boxShadow: '0 6px 16px rgba(25, 118, 210, 0.4)',
                },
                transition: 'all 0.3s ease',
              }}
            >
              {loading ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={20} color="inherit" />
                  <span>Registering...</span>
                </Box>
              ) : (
                'Create Account'
              )}
            </Button>
          </Box>

          <Typography 
            variant="body1" 
            sx={{ 
              textAlign: 'center', 
              mt: 3, 
              color: '#546E7A',
              fontSize: '1rem',
            }}
          >
            Already have an account?{' '}
            <Button
              href="/login"
              sx={{
                color: '#1976D2',
                textTransform: 'none',
                fontWeight: 600,
                '&:hover': {
                  bgcolor: 'rgba(25, 118, 210, 0.1)',
                },
              }}
            >
              Sign in
            </Button>
          </Typography>
        </Paper>
      </Fade>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={5000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          severity={message?.status === 201 ? "success" : "error"}
          variant="filled"
          sx={{ width: '100%' }}
          onClose={() => setSnackbarOpen(false)}
        >
          {message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default RegistrationPage;
