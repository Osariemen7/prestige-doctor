import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAccessToken } from '../api';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  IconButton,
  Chip,
  Alert,
  Container,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Mic as MicIcon,
  Stop as StopIcon,
  Pause as PauseIcon,
  PlayArrow as PlayArrowIcon,
  Warning as WarningIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';

const Record = () => {
  const { publicId } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(30 * 60); // 30 minutes in seconds
  const [pauseWarning, setPauseWarning] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const pauseTimerRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const chunksRef = useRef([]);
  const isRecordingRef = useRef(false);
  const isPausedRef = useRef(false);

  // Keep refs in sync with state
  useEffect(() => {
    isRecordingRef.current = isRecording;
    isPausedRef.current = isPaused;
  }, [isRecording, isPaused]);

  useEffect(() => {
    // Handle page visibility change
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
      if (!document.hidden && (isRecordingRef.current || isPausedRef.current)) {
        // Show notification when user returns to tab
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Recording in Progress', {
            body: isPausedRef.current ? 'Your recording is paused' : 'Your recording is active',
            icon: '/favicon.ico'
          });
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (timerRef.current) clearInterval(timerRef.current);
      if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(err => {
          console.log('AudioContext cleanup - already closed:', err);
        });
      }
    };
  }, []); // Empty dependency array - cleanup only on unmount

  // Audio level detection
  const setupAudioDetection = (stream) => {
    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    analyserRef.current = audioContextRef.current.createAnalyser();
    const source = audioContextRef.current.createMediaStreamSource(stream);
    source.connect(analyserRef.current);
    analyserRef.current.fftSize = 256;
  };

  const checkAudioLevel = () => {
    if (!analyserRef.current) return false;
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
    return average > 10; // Threshold for detecting sound
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      
      // Clear any existing timers
      if (timerRef.current) clearInterval(timerRef.current);
      if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
      
      mediaRecorderRef.current = new MediaRecorder(stream);
      mediaRecorderRef.current.ondataavailable = (event) => {
        chunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        
        // Automatically upload and process the recording
        const token = await getAccessToken();
        if (!token) {
          navigate('/login');
          return;
        }

        const formData = new FormData();
        formData.append('audio_file', blob, 'recording.webm');
        formData.append('original_format', 'webm');

        try {
          const response = await fetch(`https://service.prestigedelta.com/in-person-encounters/${publicId}/upload-audio/`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            },
            body: formData
          });

          if (response.ok) {
            const result = await response.json();
            alert('Recording processed successfully!');
            // Processing complete - no need to navigate
          } else {
            console.error('Upload failed');
            alert('Upload failed. Please try again.');
          }
        } catch (error) {
          console.error('Error uploading:', error);
          alert('Upload error. Please try again.');
        }
        
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close().catch(err => {
            console.log('AudioContext already closed:', err);
          });
        }
      };

      setupAudioDetection(stream);
      mediaRecorderRef.current.start();
      setIsRecording(true);
      setIsPaused(false);
      setPauseWarning(false);
      console.log('Initial time remaining:', timeRemaining);

      // Start countdown timer
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          console.log('Timer tick, time remaining:', prev);
          if (prev <= 1) {
            stopRecording();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      console.log('Recording started, timer initialized');

    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Could not access microphone');
    }
  };

  const pauseRecording = () => {
    console.log('pauseRecording called, state:', mediaRecorderRef.current?.state, 'isRecording:', isRecording, 'isPaused:', isPaused);
    if (mediaRecorderRef.current && isRecording && !isPaused && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      clearInterval(timerRef.current);
      console.log('Recording paused, timer cleared');

      // Set timeout to check for audio after 3 seconds
      pauseTimerRef.current = setTimeout(() => {
        const hasAudio = checkAudioLevel();
        if (hasAudio) {
          setPauseWarning(true);
          // Show notification if tab is not visible
          if (!isVisible && 'Notification' in window && Notification.permission === 'granted') {
            new Notification('Recording Paused - Audio Detected!', {
              body: 'There seems to be ongoing conversation. Resume recording?',
              icon: '/favicon.ico'
            });
          }
        }
      }, 3000);
    }
  };

  const resumeRecording = () => {
    console.log('resumeRecording called, state:', mediaRecorderRef.current?.state, 'isPaused:', isPaused);
    if (mediaRecorderRef.current && isPaused && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      setPauseWarning(false);
      clearTimeout(pauseTimerRef.current);
      console.log('Recording resumed, restarting timer');

      // Resume countdown timer
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          console.log('Timer tick (after resume), time remaining:', prev);
          if (prev <= 1) {
            stopRecording();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  const stopRecording = async () => {
    if (mediaRecorderRef.current && (isRecording || isPaused) && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      clearInterval(timerRef.current);
      clearTimeout(pauseTimerRef.current);
      setPauseWarning(false);
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    }
  };
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressPercent = () => {
    return ((30 * 60 - timeRemaining) / (30 * 60)) * 100;
  };

  return (
    <Container maxWidth="md" sx={{ py: { xs: 2, md: 4 } }}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/reviews')}
        sx={{ mb: 2 }}
      >
        Back to Reviews
      </Button>

      <Card elevation={3}>
        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
          <Typography variant={isMobile ? "h5" : "h4"} fontWeight="bold" align="center" gutterBottom>
            🎙️ Record Consultation
          </Typography>

          {!audioBlob ? (
            <Box>
              {/* Time Remaining Display */}
              <Box sx={{ my: 4, textAlign: 'center' }}>
                <Typography variant="h3" fontWeight="bold" color={timeRemaining < 60 ? 'error' : 'primary'}>
                  {formatTime(timeRemaining)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Time Remaining
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={getProgressPercent()} 
                  sx={{ mt: 2, height: 8, borderRadius: 4 }}
                  color={timeRemaining < 60 ? 'error' : 'primary'}
                />
              </Box>

              {/* Pause Warning */}
              {pauseWarning && (
                <Alert 
                  severity="warning" 
                  icon={<WarningIcon sx={{ animation: 'pulse 1s infinite' }} />}
                  sx={{ 
                    mb: 3,
                    '@keyframes pulse': {
                      '0%, 100%': { opacity: 1 },
                      '50%': { opacity: 0.5 }
                    }
                  }}
                >
                  <Typography variant="body2" fontWeight="bold">
                    Audio detected! Recording is paused. Resume to continue.
                  </Typography>
                </Alert>
              )}

              {/* Status Chips */}
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 3 }}>
                {isRecording && !isPaused && (
                  <Chip 
                    label="Recording" 
                    color="error" 
                    icon={<MicIcon />}
                    sx={{ animation: 'pulse 2s infinite' }}
                  />
                )}
                {isPaused && (
                  <Chip 
                    label="Paused" 
                    color="warning" 
                    icon={<PauseIcon />}
                  />
                )}
              </Box>

              {/* Instructions */}
              {!isRecording && (
                <Alert severity="info" sx={{ mb: 3 }}>
                  <Typography variant="body2">
                    • Recording will automatically stop after 30 minutes<br />
                    • You can pause and resume anytime<br />
                    • A warning will show if audio is detected while paused
                  </Typography>
                </Alert>
              )}

              {/* Control Buttons */}
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexDirection: isMobile ? 'column' : 'row' }}>
                {!isRecording && !isPaused ? (
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={<MicIcon />}
                    onClick={startRecording}
                    sx={{ 
                      bgcolor: 'primary.main',
                      py: 2,
                      px: 4,
                      fontSize: '1.1rem'
                    }}
                  >
                    Start Recording
                  </Button>
                ) : (
                  <>
                    {isPaused ? (
                      <Button
                        variant="contained"
                        size="large"
                        startIcon={<PlayArrowIcon />}
                        onClick={resumeRecording}
                        color="success"
                        sx={{ py: 2, px: 4 }}
                      >
                        Resume
                      </Button>
                    ) : (
                      <Button
                        variant="contained"
                        size="large"
                        startIcon={<PauseIcon />}
                        onClick={pauseRecording}
                        color="warning"
                        sx={{ py: 2, px: 4 }}
                      >
                        Pause
                      </Button>
                    )}
                    <Button
                      variant="contained"
                      size="large"
                      startIcon={<StopIcon />}
                      onClick={stopRecording}
                      color="error"
                      sx={{ py: 2, px: 4 }}
                    >
                      Stop
                    </Button>
                  </>
                )}
              </Box>
            </Box>
          ) : (
            <Box>
              <Alert severity="success" sx={{ mb: 3 }}>
                <Typography variant="body1" fontWeight="bold">
                  Recording completed! {formatTime(15 * 60 - timeRemaining)} recorded.
                </Typography>
              </Alert>

              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Preview your recording:
                </Typography>
                <audio 
                  controls 
                  src={URL.createObjectURL(audioBlob)} 
                  style={{ width: '100%' }}
                />
              </Box>

              <Box sx={{ display: 'flex', gap: 2, flexDirection: isMobile ? 'column' : 'row' }}>
                <Button
                  variant="outlined"
                  size="large"
                  onClick={() => {
                    setAudioBlob(null);
                    setTimeRemaining(15 * 60);
                  }}
                  fullWidth={isMobile}
                >
                  Re-record
                </Button>
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>
    </Container>
  );
};

export default Record;