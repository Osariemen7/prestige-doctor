import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  Box,
  Button,
  LinearProgress,
  Typography,
  Chip,
  Alert,
  Drawer,
  useTheme,
  useMediaQuery,
  IconButton,
  Stepper,
  Step,
  StepLabel
} from '@mui/material';
import {
  Mic as MicIcon,
  Pause as PauseIcon,
  PlayArrow as PlayArrowIcon,
  Stop as StopIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { getAccessToken } from '../api';
import PatientDetailsModal from './PatientDetailsModal';
import { useProcessingStatus } from '../contexts/ProcessingStatusContext';

const selectPreferredValue = (...values) => {
  for (const value of values) {
    if (value === null || value === undefined) {
      continue;
    }

    const stringValue = String(value).trim();
    if (stringValue.length > 0) {
      return value;
    }
  }

  return '';
};

const RecordingModal = ({
  open,
  onClose,
  encounterId,
  encounterData,
  patientPrefill = null,
  reviewId,
  onComplete,
  onWorkflowEvent,
  existingNote = null,
  existingTranscript = []
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const { setStatus, clearStatus } = useProcessingStatus();
  const [step, setStep] = useState(0); // 0: input selection/recording, 1: patient-details
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(15 * 60); // 15 minutes
  const [pauseWarning, setPauseWarning] = useState(false);
  const [error, setError] = useState(null);
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState(null);
  const [processingData, setProcessingData] = useState(false);
  const [wakeLock, setWakeLock] = useState(null);
  
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const pauseTimerRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const chunksRef = useRef([]);
  const isRecordingRef = useRef(false);
  const isPausedRef = useRef(false);
  const recordedMimeTypeRef = useRef(null);
  const isMountedRef = useRef(false);

  const steps = ['Record Audio', 'Patient Details'];

  const mergedPatientDefaults = useMemo(() => {
    const prefill = patientPrefill || {};
    const encounterPatient = encounterData || {};
    return {
      patient_first_name: selectPreferredValue(
        encounterPatient.patient_first_name,
        prefill.first_name
      ),
      patient_last_name: selectPreferredValue(
        encounterPatient.patient_last_name,
        prefill.last_name
      ),
      patient_phone_number: selectPreferredValue(
        encounterPatient.patient_phone_number,
        encounterPatient.patient_phone,
        prefill.phone,
        prefill.phone_number
      )
    };
  }, [encounterData, patientPrefill]);

  const primaryActionSx = {
    py: 2.5,
    px: 5,
    minWidth: { xs: '100%', sm: 240 },
    fontSize: '1rem',
    fontWeight: 'bold',
    textTransform: 'none',
    boxShadow: 4
  };

  const secondaryActionSx = {
    py: 2.5,
    px: 5,
    minWidth: { xs: '100%', sm: 200 },
    fontWeight: 'bold',
    textTransform: 'none'
  };

  const notifyProcessingFailure = (message) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Processing Failed ❌', {
        body: message,
        icon: '/images/logo.png',
        requireInteraction: true
      });
    } else {
      alert(`Processing Failed ❌\n\n${message}`);
    }
  };

  const showProcessingCompleteNotification = (targetReviewId) => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }

    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification('Documentation Ready! 🎉', {
        body: 'Click to open the completed review or close this notification to keep working.',
        icon: '/images/logo.png',
        tag: targetReviewId || reviewId,
        requireInteraction: false,
        data: {
          reviewPath: targetReviewId ? `/reviews/${targetReviewId}` : `/reviews/${reviewId}`
        }
      });

      notification.onclick = (event) => {
        event.preventDefault();
        const reviewPath = notification.data?.reviewPath || `/reviews/${reviewId}`;
        window.focus();
        navigate(reviewPath);
        notification.close();
      };
    } else {
      const reviewPath = targetReviewId ? `/reviews/${targetReviewId}` : `/reviews/${reviewId}`;
      const shouldNavigate = window.confirm(
        'Documentation Ready!\n\nYour encounter documentation has been processed. Press OK to open the review now, or Cancel to keep working.'
      );
      if (shouldNavigate) {
        navigate(reviewPath);
      }
    }
  };

  // Keep refs in sync with state
  useEffect(() => {
    isRecordingRef.current = isRecording;
    isPausedRef.current = isPaused;
  }, [isRecording, isPaused]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (timerRef.current) clearInterval(timerRef.current);
      if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
      // Release wake lock on unmount
      releaseWakeLock();
    };
  }, []);

  useEffect(() => {
    if (open && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, [open]);

  // Handle wake lock restoration when page becomes visible again
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && isRecording && !wakeLock) {
        console.log('Page became visible, attempting to restore wake lock');
        await requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isRecording, wakeLock]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

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
    return average > 10;
  };

  const requestWakeLock = async () => {
    if ('wakeLock' in navigator) {
      try {
        const lock = await navigator.wakeLock.request('screen');
        setWakeLock(lock);
        console.log('Wake lock acquired');
        
        lock.addEventListener('release', () => {
          console.log('Wake lock released');
          setWakeLock(null);
        });
      } catch (error) {
        console.warn('Failed to acquire wake lock:', error);
      }
    } else {
      console.warn('Wake Lock API not supported');
    }
  };

  const releaseWakeLock = async () => {
    if (wakeLock) {
      try {
        await wakeLock.release();
        setWakeLock(null);
        console.log('Wake lock manually released');
      } catch (error) {
        console.warn('Failed to release wake lock:', error);
      }
    }
  };

  const startRecording = async () => {
    try {
      // Check if browser supports getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Audio recording is not supported in this browser. Please use Chrome, Firefox, Safari, or Edge.');
        return;
      }

      // Check for available audio input devices
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter(device => device.kind === 'audioinput');
        if (audioInputs.length === 0) {
          setError('No microphone detected. Please connect a microphone and refresh the page.');
          return;
        }
        console.log(`Found ${audioInputs.length} audio input device(s)`);
      } catch (deviceError) {
        console.warn('Could not enumerate devices (this is normal in some browsers):', deviceError);
        // Continue anyway - some browsers restrict device enumeration before permission is granted
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      
      if (timerRef.current) clearInterval(timerRef.current);
      if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
      setPauseWarning(false);

      // Try multiple codec options for better compatibility
      let mimeType;
      let codecOptions = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4',
        'audio/mpeg'
      ];
      
      for (let codec of codecOptions) {
        if (MediaRecorder.isTypeSupported(codec)) {
          mimeType = codec;
          break;
        }
      }
      
      if (!mimeType) {
        setError('No supported audio format found on this device');
        return;
      }
      
      console.log('Using mimeType:', mimeType);
      recordedMimeTypeRef.current = mimeType;
      
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: mimeType,
        audioBitsPerSecond: 128000
      });

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          console.log('Audio chunk received:', event.data.size, 'bytes');
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const mimeType = recordedMimeTypeRef.current || 'audio/webm';
        const audioBlob = new Blob(chunksRef.current, { type: mimeType });
        console.log('Audio blob created:', audioBlob.size, 'bytes, type:', audioBlob.type);
        console.log('Total chunks:', chunksRef.current.length);
        
        // Validate blob before proceeding
        if (audioBlob.size === 0) {
          setError('Recording failed - no audio data captured. Please try again.');
          return;
        }
        
        if (audioBlob.size < 1000) {
          setError('Recording too short - please record at least 1 second of audio.');
          return;
        }
        
        // Store the blob and show patient details modal
        setRecordedAudioBlob(audioBlob);
        setShowPatientModal(true);
      };

      setupAudioDetection(stream);
      
      // Request data every 1 second for better chunking
      mediaRecorderRef.current.start(1000);

      setIsRecording(true);
      setIsPaused(false);
      setPauseWarning(false);

      // Request wake lock to prevent screen sleep
      await requestWakeLock();

      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            stopRecording();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

    } catch (error) {
      console.error('Error starting recording:', error);
      
      // Provide specific error messages based on error type
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setError('Microphone access denied. Please click "Allow" when prompted for microphone permission, or check your browser settings.');
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        setError('No microphone found. Please connect a microphone and try again.');
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        setError('Microphone is already in use by another application. Please close other apps using the microphone.');
      } else if (error.name === 'OverconstrainedError' || error.name === 'ConstraintNotSatisfiedError') {
        setError('Microphone does not meet the required constraints. Please try a different microphone.');
      } else if (error.name === 'NotSupportedError') {
        setError('Audio recording is not supported in this browser. Please try Chrome, Firefox, or Edge.');
      } else if (error.name === 'SecurityError') {
        setError('Microphone access blocked for security reasons. Please ensure you\'re on HTTPS or localhost.');
      } else {
        setError(`Could not access microphone: ${error.message || 'Unknown error'}. Please check your microphone and browser permissions.`);
      }
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording && !isPaused && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      clearInterval(timerRef.current);

      pauseTimerRef.current = setTimeout(() => {
        const hasAudio = checkAudioLevel();
        if (hasAudio) {
          setPauseWarning(true);
        }
      }, 3000);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && isPaused && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      setPauseWarning(false);
      clearTimeout(pauseTimerRef.current);

      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            stopRecording();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && (isRecording || isPaused) && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      clearInterval(timerRef.current);
      clearTimeout(pauseTimerRef.current);
      
      // Release wake lock
      releaseWakeLock();
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
      
      // Move to patient details step instead of uploading immediately
      setStep(1);
    }
  };

  const handleUpload = async (audioBlob, patientDetails, options = {}) => {
    const { background = false } = options;

    if (reviewId) {
      setStatus(reviewId, 'uploading');
    }
    if (onWorkflowEvent) {
      onWorkflowEvent('uploading');
    }

    try {
      const mimeType = audioBlob.type || 'audio/webm';
      let fileExtension = 'webm';
      let originalFormat = 'webm';

      if (mimeType.includes('webm')) {
        fileExtension = 'webm';
        originalFormat = 'webm';
      } else if (mimeType.includes('ogg')) {
        fileExtension = 'ogg';
        originalFormat = 'ogg';
      } else if (mimeType.includes('mp4') || mimeType.includes('m4a')) {
        fileExtension = 'mp4';
        originalFormat = 'mp4';
      } else if (mimeType.includes('mpeg') || mimeType.includes('mp3')) {
        fileExtension = 'mp3';
        originalFormat = 'mp3';
      } else if (mimeType.includes('wav')) {
        fileExtension = 'wav';
        originalFormat = 'wav';
      }

      console.log('Uploading audio:', {
        size: audioBlob.size,
        type: mimeType,
        extension: fileExtension,
        format: originalFormat
      });

      const formData = new FormData();
      formData.append('audio_file', audioBlob, `recording.${fileExtension}`);
      formData.append('original_format', originalFormat);

      const token = await getAccessToken();

      const response = await fetch(
        `https://service.prestigedelta.com/in-person-encounters/${encounterId}/upload-audio/`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const message = errorData.detail || 'Upload failed. Please try again.';
        console.error('Upload failed:', errorData);
        if (!background && isMountedRef.current) {
          setError(message);
        }
        if (reviewId) clearStatus(reviewId);
        if (onWorkflowEvent) {
          onWorkflowEvent('error');
        }
        if (background) {
          notifyProcessingFailure(message);
        }
        return;
      }

      await waitForUploads(token);
      await handleProcess(patientDetails, token, background);
    } catch (error) {
      console.error('Upload error:', error);
      const message = error instanceof Error && error.message
        ? error.message
        : 'Failed to upload audio. Please try again.';
      if (!background && isMountedRef.current) {
        setError(message);
      }
      if (reviewId) clearStatus(reviewId);
      if (onWorkflowEvent) {
        onWorkflowEvent('error');
      }
      if (background) {
        notifyProcessingFailure(message);
      }
    } finally {
      if (isMountedRef.current) {
        setProcessingData(false);
      }
    }
  };

  const waitForUploads = async (token, maxAttempts = 120) => {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const statusResponse = await fetch(
        `https://service.prestigedelta.com/in-person-encounters/${encounterId}/`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!statusResponse.ok) {
        throw new Error('Failed to verify upload status.');
      }

      const statusData = await statusResponse.json();

      if (!statusData.s3_upload_pending && !statusData.google_upload_pending) {
        console.log('Uploads finished successfully.');
        return statusData;
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    throw new Error('Upload is taking longer than expected. Please try again.');
  };

  const handleProcess = async (patientDetails, token, background = false) => {
    if (reviewId) {
      setStatus(reviewId, 'processing');
    }
    if (onWorkflowEvent) {
      onWorkflowEvent('processing');
    }

    try {
      const authToken = token || await getAccessToken();

      const requestBody = {
        encounter_public_id: encounterId,
        query: 'Create a concise note',
        patient_first_name: patientDetails.patient_first_name,
        patient_last_name: patientDetails.patient_last_name,
        patient_phone_number: patientDetails.patient_phone_number,
        save_documentation: patientDetails.save_documentation
      };

      if (existingNote && Object.keys(existingNote).length > 0) {
        requestBody.existing_note = existingNote;
      }

      if (Array.isArray(existingTranscript) && existingTranscript.length > 0) {
        requestBody.existing_transcript = existingTranscript;
      }

      console.log('Processing audio with data:', requestBody);

      const response = await fetch(
        'https://service.prestigedelta.com/ai-processing/process-audio/',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody)
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const message = `Processing failed: ${errorData.detail || 'Please try again.'}`;
        console.error('Processing failed:', errorData);
        if (!background && isMountedRef.current) {
          setError(message);
        }
        if (reviewId) clearStatus(reviewId);
        if (onWorkflowEvent) {
          onWorkflowEvent('error');
        }
        if (background) {
          notifyProcessingFailure(message);
        }
        return;
      }

      const result = await response.json();
      console.log('Processing complete:', result);

      const processedReviewId =
        result?.review_public_id ||
        result?.medical_review_public_id ||
        result?.reviewPublicId ||
        result?.reviewId ||
        reviewId;

      if (reviewId) {
        clearStatus(reviewId);
      }

      if (onWorkflowEvent) {
        onWorkflowEvent('completed');
      }
      if (onComplete) onComplete();

      if (background) {
        showProcessingCompleteNotification(processedReviewId);
      } else if (isMountedRef.current) {
        handleClose();
      }
    } catch (error) {
      console.error('Processing error:', error);
      const message = error instanceof Error && error.message
        ? error.message
        : 'Failed to process audio. Please try again.';
      if (!background && isMountedRef.current) {
        setError(message);
      }
      if (reviewId) clearStatus(reviewId);
      if (onWorkflowEvent) {
        onWorkflowEvent('error');
      }
      if (background) {
        notifyProcessingFailure(message);
      }
    } finally {
      if (isMountedRef.current) {
        resetState();
      }
    }
  };

  const handlePatientDetailsSubmit = async (patientData) => {
    setProcessingData(true);

    if (!recordedAudioBlob) {
      setError('No audio found. Please record audio.');
      if (isMountedRef.current) {
        setProcessingData(false);
      }
      return;
    }

    if (recordedAudioBlob.size === 0) {
      setError('Audio file is empty. Please record again.');
      if (isMountedRef.current) {
        setProcessingData(false);
      }
      return;
    }

    if (recordedAudioBlob.size < 1000) {
      setError('Audio file too small. Please record a longer message.');
      if (isMountedRef.current) {
        setProcessingData(false);
      }
      return;
    }

    const sanitizedData = {
      patient_first_name: (patientData.patient_first_name || '').trim(),
      patient_last_name: (patientData.patient_last_name || '').trim(),
      patient_phone_number: (patientData.patient_phone_number || '').trim()
    };

    const payload = {
      ...sanitizedData,
      save_documentation: sanitizedData.patient_phone_number
        ? typeof patientData.save_documentation === 'boolean'
          ? patientData.save_documentation
          : true
        : false
    };

    setShowPatientModal(false);

    if (onClose) {
      onClose();
    }

    setTimeout(() => {
      alert('Processing in the background. You can continue with other tasks and we will notify you once processing is complete.');
    }, 0);

    await handleUpload(recordedAudioBlob, payload, { background: true });
  };

  const resetState = () => {
    setStep(0);
    setIsRecording(false);
    setIsPaused(false);
    setTimeRemaining(15 * 60);
    setPauseWarning(false);
    setError(null);
    setShowPatientModal(false);
    setRecordedAudioBlob(null);
    setProcessingData(false);
  };

  const handlePatientModalCancel = () => {
    setShowPatientModal(false);
    setProcessingData(false);
    setRecordedAudioBlob(null);
    setPauseWarning(false);
    setStep(0);
    setTimeRemaining(15 * 60);
    setError(null);
  };

  const handleClose = () => {
    // Stop recording if active
    if (isRecording || isPaused) {
      stopRecording();
    }

    resetState();
    onClose();
  };

  const progress = (timeRemaining / (15 * 60)) * 100;

  const modalContent = (
    <Box sx={{ minHeight: isMobile ? 'auto' : 400 }}>
      {/* Header with close button */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">Record Encounter</Typography>
        <IconButton onClick={handleClose} size="small">
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Stepper */}
      <Stepper activeStep={step} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Input Step */}
      {step === 0 && (
        <>
          {/* Timer Display */}
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 1 }}>
              {formatTime(timeRemaining)}
            </Typography>
            <LinearProgress 
              variant="determinate" 
              value={progress} 
              sx={{ 
                height: 8, 
                borderRadius: 4,
                backgroundColor: 'grey.200',
                '& .MuiLinearProgress-bar': {
                  backgroundColor: isRecording && !isPaused ? 'error.main' : 'grey.400'
                }
              }}
            />
          </Box>

          {/* Status Chip */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
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
            {wakeLock && (
              <Chip 
                label="Screen Awake" 
                color="info" 
                size="small"
                sx={{ ml: 1 }}
              />
            )}
          </Box>

          {/* Pause Warning */}
          {pauseWarning && (
            <Alert severity="warning" sx={{ mb: 3 }}>
              Audio detected! Consider resuming recording.
            </Alert>
          )}

          {/* Instructions */}
          {!isRecording && (
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                • <strong>Microphone Permission:</strong> Click "Allow" when prompted for microphone access<br />
                • Recording will automatically stop after 15 minutes<br />
                • You can pause and resume anytime<br />
                • Stopping uploads and processes in the background so you can keep working
              </Typography>
            </Alert>
          )}

          {/* Control Buttons */}
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
            {!isRecording && !isPaused ? (
              <Button
                variant="contained"
                size="large"
                startIcon={<MicIcon />}
                onClick={startRecording}
                sx={{
                  ...primaryActionSx,
                  bgcolor: 'primary.main',
                  color: 'common.white',
                  '&:hover': { bgcolor: 'primary.dark', boxShadow: 6 }
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
                    sx={{
                      ...secondaryActionSx,
                      bgcolor: 'success.main',
                      color: 'common.white',
                      '&:hover': { bgcolor: 'success.dark' }
                    }}
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
                    sx={{
                      ...secondaryActionSx,
                      bgcolor: 'warning.main',
                      color: 'common.white',
                      '&:hover': { bgcolor: 'warning.dark' }
                    }}
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
                  sx={{
                    ...primaryActionSx,
                    bgcolor: 'error.main',
                    color: 'common.white',
                    '&:hover': { bgcolor: 'error.dark', boxShadow: 6 }
                  }}
                >
                  Stop & Process
                </Button>
              </>
            )}
          </Box>
        </>
      )}      {/* Patient Details Step - info only, actual modal shown separately */}
      {step === 1 && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Recording Complete!
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Please provide patient details to continue...
          </Typography>
        </Box>
      )}
    </Box>
  );

  if (isMobile) {
    return (
      <>
        <Drawer
          anchor="bottom"
          open={open}
          onClose={handleClose}
          PaperProps={{
            sx: {
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              p: 3,
              maxHeight: '90vh'
            }
          }}
        >
          {modalContent}
        </Drawer>
        
        {/* Patient Details Modal */}
        <PatientDetailsModal
          open={showPatientModal}
          onClose={handlePatientModalCancel}
          onSubmit={handlePatientDetailsSubmit}
          initialData={mergedPatientDefaults}
          loading={processingData}
          readOnly={false}
        />
      </>
    );
  }

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2, p: 2 }
        }}
      >
        <DialogContent>
          {modalContent}
        </DialogContent>
      </Dialog>
      
      {/* Patient Details Modal */}
      <PatientDetailsModal
        open={showPatientModal}
        onClose={handlePatientModalCancel}
        onSubmit={handlePatientDetailsSubmit}
        initialData={mergedPatientDefaults}
        loading={processingData}
        readOnly={false}
      />
    </>
  );
};

export default RecordingModal;
