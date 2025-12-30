import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardMedia,
  CardContent,
  CardActionArea,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
  IconButton,
  Button,
  Dialog,
  DialogContent,
  AppBar,
  Toolbar,
  useTheme,
  useMediaQuery,
  Chip
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Image as ImageIcon,
  Audiotrack as AudioIcon,
  Description as DocumentIcon,
  Close as CloseIcon,
  Download as DownloadIcon,
  PlayArrow as PlayArrowIcon,
  Pause as PauseIcon
} from '@mui/icons-material';
import { getAccessToken } from '../api';

const PatientMediaGallery = () => {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [mediaItems, setMediaItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0); // 0: All, 1: Images, 2: Audio, 3: Documents
  const [selectedMedia, setSelectedMedia] = useState(null); // For preview modal

  useEffect(() => {
    fetchMedia();
  }, [patientId]);

  const fetchMedia = async () => {
    try {
      setLoading(true);
      const token = await getAccessToken();
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await fetch(`https://service.prestigedelta.com/provider/patient-media/?patient_id=${patientId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setMediaItems(data);
      } else {
        if (response.status === 403) {
          setError('You do not have permission to view this patient\'s media.');
        } else if (response.status === 404) {
          setError('Patient not found.');
        } else {
          setError('Failed to load media.');
        }
      }
    } catch (err) {
      console.error('Error fetching media:', err);
      setError('An error occurred while fetching media.');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const getFilteredMedia = () => {
    if (tabValue === 0) return mediaItems;
    if (tabValue === 1) return mediaItems.filter(item => item.media_type === 'image');
    if (tabValue === 2) return mediaItems.filter(item => item.media_type === 'audio');
    if (tabValue === 3) return mediaItems.filter(item => item.media_type === 'document');
    return mediaItems;
  };

  const handleMediaClick = (item) => {
    setSelectedMedia(item);
  };

  const handleClosePreview = () => {
    setSelectedMedia(null);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const renderMediaPreview = (item) => {
    if (!item) return null;

    if (item.media_type === 'image') {
      return (
        <img 
          src={item.media_url} 
          alt="Patient Media" 
          style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain' }} 
        />
      );
    } else if (item.media_type === 'audio') {
      return (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <audio controls src={item.media_url} style={{ width: '100%' }}>
            Your browser does not support the audio element.
          </audio>
          <Typography variant="body1" sx={{ mt: 2 }}>
            {item.associated_text || 'Audio Message'}
          </Typography>
        </Box>
      );
    } else {
      return (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <DocumentIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            Document
          </Typography>
          <Button 
            variant="contained" 
            startIcon={<DownloadIcon />}
            href={item.media_url}
            target="_blank"
            rel="noopener noreferrer"
          >
            Download / View
          </Button>
        </Box>
      );
    }
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={() => navigate(-1)} aria-label="back">
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" sx={{ ml: 2, flexGrow: 1 }}>
            Patient Media Gallery
          </Typography>
        </Toolbar>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange} 
          variant="scrollable"
          scrollButtons="auto"
          textColor="primary"
          indicatorColor="primary"
        >
          <Tab label="All" />
          <Tab label="Images" icon={<ImageIcon fontSize="small" />} iconPosition="start" />
          <Tab label="Audio" icon={<AudioIcon fontSize="small" />} iconPosition="start" />
          <Tab label="Documents" icon={<DocumentIcon fontSize="small" />} iconPosition="start" />
        </Tabs>
      </AppBar>

      <Container maxWidth="lg" sx={{ flexGrow: 1, overflow: 'auto', py: 3 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>
        ) : mediaItems.length === 0 ? (
          <Box sx={{ textAlign: 'center', mt: 5, color: 'text.secondary' }}>
            <Typography variant="h6">No media found for this patient.</Typography>
          </Box>
        ) : (
          <Grid container spacing={2}>
            {getFilteredMedia().map((item) => (
              <Grid item xs={6} sm={4} md={3} key={item.message_id}>
                <Card 
                  sx={{ 
                    height: '100%', 
                    display: 'flex', 
                    flexDirection: 'column',
                    cursor: 'pointer',
                    transition: 'transform 0.2s',
                    '&:hover': { transform: 'scale(1.02)' }
                  }}
                  onClick={() => handleMediaClick(item)}
                >
                  <Box sx={{ position: 'relative', pt: '100%', bgcolor: '#f5f5f5' }}>
                    <Box sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {item.media_type === 'image' ? (
                        <img 
                          src={item.media_url} 
                          alt="Thumbnail" 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                        />
                      ) : item.media_type === 'audio' ? (
                        <AudioIcon sx={{ fontSize: 50, color: 'text.secondary' }} />
                      ) : (
                        <DocumentIcon sx={{ fontSize: 50, color: 'text.secondary' }} />
                      )}
                    </Box>
                    <Chip 
                      label={item.media_type} 
                      size="small" 
                      color={item.media_type === 'image' ? 'primary' : item.media_type === 'audio' ? 'secondary' : 'default'}
                      sx={{ position: 'absolute', top: 8, right: 8 }} 
                    />
                  </Box>
                  <CardContent sx={{ flexGrow: 1, p: 1.5 }}>
                    <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                      {formatDate(item.created)}
                    </Typography>
                    <Typography variant="body2" noWrap title={item.associated_text}>
                      {item.associated_text || 'No description'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Container>

      <Dialog 
        open={!!selectedMedia} 
        onClose={handleClosePreview}
        maxWidth="md"
        fullWidth
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6">
            {selectedMedia?.media_type === 'image' ? 'Image Preview' : 
             selectedMedia?.media_type === 'audio' ? 'Audio Playback' : 'Document'}
          </Typography>
          <IconButton onClick={handleClosePreview}>
            <CloseIcon />
          </IconButton>
        </Box>
        <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, bgcolor: '#000' }}>
          {renderMediaPreview(selectedMedia)}
        </DialogContent>
        <Box sx={{ p: 2, bgcolor: 'background.paper' }}>
          <Typography variant="caption" color="text.secondary">
            {selectedMedia && formatDate(selectedMedia.created)}
          </Typography>
          <Typography variant="body1" sx={{ mt: 1 }}>
            {selectedMedia?.associated_text}
          </Typography>
          {selectedMedia?.thread_public_id && (
             <Button 
               variant="outlined" 
               size="small" 
               sx={{ mt: 2 }}
               onClick={() => {
                 // Navigate to chat thread if possible, or just close
                 // For now, we just close as the requirement says "Clicking on a media item could navigate..."
                 // But we are already in a separate page.
                 // If we want to go back to chat, we might need to know where we came from.
                 handleClosePreview();
               }}
             >
               Close
             </Button>
          )}
        </Box>
      </Dialog>
    </Box>
  );
};

export default PatientMediaGallery;
