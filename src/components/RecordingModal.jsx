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
  const { getStatus, startEncounterPolling } = useProcessingStatus();
  const [step, setStep] = useState(0); // 0: input selection/recording, 1: patient-details
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(30 * 60); // 30 minutes
  const [pauseWarning, setPauseWarning] = useState(false);
  const [error, setError] = useState(null);
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState(null);
  const [processingData, setProcessingData] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState(null);
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
  const activeOperationsRef = useRef(0);

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
        'Documentation Ready!\n\nYour encounter documentation has been processed. Click OK to view the documentation, or Cancel to continue with your current task.'
      );
      if (shouldNavigate === true) {
        navigate(reviewPath);
      }
      // If shouldNavigate is false (Cancel clicked), do nothing - stay on current page
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
      activeOperationsRef.current = 0;
      // Release wake lock on unmount
      releaseWakeLock();
    };
  }, []);

  useEffect(() => {
    if (open && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, [open]);

  useEffect(() => {
    if (!reviewId) {
      return;
    }

    const status = getStatus(reviewId);
    if (!status) {
      if (!open) {
        setIsProcessing(false);
        setProcessingStatus(null);
      }
      return;
    }

    if (status === 'processing' || status === 'queued') {
      setIsProcessing(true);
      setProcessingStatus(status === 'queued' ? 'processing' : status);
      return;
    }

    setProcessingStatus(status);
    setIsProcessing(false);
  }, [reviewId, open, getStatus]);

  // Handle wake lock restoration when page becomes visible again
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && (isRecording || activeOperationsRef.current > 0) && !wakeLock) {
        console.log('Page became visible, attempting to restore wake lock');
        await requestWakeLock();
      } else if (document.visibilityState === 'hidden' && isMobile && (isRecording || activeOperationsRef.current > 0)) {
        // On mobile, warn user when page becomes hidden during active operations
        console.log('Page hidden on mobile during active operation');
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Page Hidden ⚠️', {
            body: 'Recording/processing may be interrupted. Return to this page to continue.',
            icon: '/images/logo.png',
            requireInteraction: true
          });
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isRecording, wakeLock, isMobile]);

  // Handle beforeunload warning for ongoing operations
  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (isRecording || activeOperationsRef.current > 0) {
        const operation = isRecording ? 'recording' : activeOperationsRef.current > 0 ? 'uploading/processing' : 'operation';
        event.preventDefault();
        const mobileWarning = isMobile ? ' On mobile, this may interrupt the process.' : '';
        event.returnValue = `Warning: ${operation} is in progress. If you leave this page, you will lose your data.${mobileWarning} Are you sure you want to continue?`;
        return event.returnValue;
      }
    };

    if (isRecording || activeOperationsRef.current > 0) {
      window.addEventListener('beforeunload', handleBeforeUnload);
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isRecording, isMobile]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatProcessingStatus = (status) => {
    if (!status) {
      return 'Processing';
    }

    const normalized = String(status).trim();
    if (!normalized) {
      return 'Processing';
    }

    if (normalized === 'queued' || normalized === 'processing') {
      return 'Processing';
    }

    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
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
          
          // On mobile, warn user if wake lock is lost during active operations
          if (isMobile && (isRecording || activeOperationsRef.current > 0)) {
            const operation = isRecording ? 'recording' : 'processing';
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('Screen Lock Released ⚠️', {
                body: `Screen may turn off during ${operation}. Keep this page visible to prevent interruptions.`,
                icon: '/images/logo.png',
                requireInteraction: true
              });
            } else {
              alert(`Screen lock released. Screen may turn off during ${operation}. Keep this page visible to prevent interruptions.`);
            }
          }
        });
      } catch (error) {
        console.warn('Failed to acquire wake lock:', error);
        
        // On mobile, provide specific guidance for wake lock failures
        if (isMobile && (isRecording || activeOperationsRef.current > 0)) {
          const operation = isRecording ? 'recording' : 'processing';
          setError(`Screen lock failed. On mobile devices, keep this page visible and avoid locking your screen during ${operation} to prevent interruptions.`);
        }
      }
    } else {
      console.warn('Wake Lock API not supported');
      
      // On mobile without wake lock support, provide guidance
      if (isMobile && (isRecording || activeOperationsRef.current > 0)) {
        const operation = isRecording ? 'recording' : 'processing';
        setError(`Screen lock not supported. On mobile devices, keep this page visible and avoid locking your screen during ${operation} to prevent interruptions.`);
      }
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

      // Mobile-specific warning
      if (isMobile) {
        setTimeout(() => {
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Recording Started 📱', {
              body: 'Keep this page visible and don\'t lock your screen. Recording will continue in background.',
              icon: '/images/logo.png'
            });
          }
        }, 1000);
      }

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
      
      // Release wake lock only if no other operations are active
      if (activeOperationsRef.current === 0) {
        releaseWakeLock();
      }
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
      
      // Check if recording is at least 60 seconds
      const recordingDuration = (30 * 60) - timeRemaining; // 1800 - timeRemaining
      if (recordingDuration < 60) {
        setError('Recording must be at least 60 seconds long. Please record for a longer duration.');
        return;
      }
      
      // Move to patient details step instead of uploading immediately
      setStep(1);
    }
  };

  const handleUpload = async (audioBlob, patientDetails, options = {}) => {
    const { background = false } = options;

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

      console.log('Queueing audio for processing:', {
        size: audioBlob.size,
        type: mimeType,
        extension: fileExtension,
        format: originalFormat
      });

      const formData = new FormData();
      formData.append('audio_file', audioBlob, `recording.${fileExtension}`);
      formData.append('original_format', originalFormat);
      formData.append('query', 'Create a concise note');

      const trimmedFirstName = (patientDetails.patient_first_name || '').trim();
      const trimmedLastName = (patientDetails.patient_last_name || '').trim();
      const trimmedPhone = (patientDetails.patient_phone_number || '').trim();

      if (trimmedFirstName) formData.append('patient_first_name', trimmedFirstName);
      if (trimmedLastName) formData.append('patient_last_name', trimmedLastName);
      if (trimmedPhone) formData.append('patient_phone_number', trimmedPhone);

      formData.append('save_documentation', patientDetails.save_documentation ? 'true' : 'false');

      if (existingNote && Object.keys(existingNote).length > 0) {
        formData.append('existing_note', JSON.stringify(existingNote));
      }

      if (Array.isArray(existingTranscript) && existingTranscript.length > 0) {
        formData.append('existing_transcript', JSON.stringify(existingTranscript));
      }

      const token = await getAccessToken();

      const response = await fetch(
        `https://service.prestigedelta.com/in-person-encounters/${encounterId}/queue-processing/`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        }
      );

      const responseData = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message = responseData.detail || responseData.error || 'Failed to start processing. Please try again.';
        console.error('Queue processing failed:', responseData);
        if (onWorkflowEvent) {
          onWorkflowEvent('error');
        }
        if (background) {
          notifyProcessingFailure(message);
        } else if (isMountedRef.current) {
          setError(message);
        }
        return;
      }

      const initialState = responseData.state || 'queued';
      const normalizedInitialState = initialState === 'queued' ? 'processing' : initialState;

      if (onWorkflowEvent) {
        onWorkflowEvent('processing');
      }

      if (isMountedRef.current) {
        setIsProcessing(true);
        setProcessingStatus(normalizedInitialState);
      }

      if (reviewId) {
        startEncounterPolling({
          reviewId,
          encounterId,
          initialState: normalizedInitialState,
          onStatus: (state) => {
            if (isMountedRef.current) {
              const normalizedState = state === 'queued' ? 'processing' : state;
              setProcessingStatus(normalizedState);
            }
          },
          onComplete: (statusData) => {
            const processedReviewId =
              statusData?.result?.review_public_id ||
              statusData?.result?.medical_review_public_id ||
              statusData?.result?.reviewPublicId ||
              statusData?.result?.reviewId ||
              reviewId;

            if (onWorkflowEvent) {
              onWorkflowEvent('completed');
            }
            if (onComplete) onComplete();

            if (background) {
              showProcessingCompleteNotification(processedReviewId);
            } else {
              handleClose();
            }

            if (isMountedRef.current) {
              setIsProcessing(false);
              setProcessingStatus('completed');
            }
          },
          onError: (message) => {
            if (onWorkflowEvent) {
              onWorkflowEvent('error');
            }

            if (background) {
              notifyProcessingFailure(message);
            } else if (isMountedRef.current) {
              setError(message);
            }

            if (isMountedRef.current) {
              setIsProcessing(false);
              setProcessingStatus('failed');
            }
          }
        });
      }
    } catch (error) {
      console.error('Queue processing error:', error);
      const message = error instanceof Error && error.message
        ? error.message
        : 'Failed to start processing. Please try again.';
      if (onWorkflowEvent) {
        onWorkflowEvent('error');
      }
      if (background) {
        notifyProcessingFailure(message);
      } else if (isMountedRef.current) {
        setError(message);
      }
    } finally {
      setIsProcessing(false);
      activeOperationsRef.current -= 1;
      // Release wake lock if no operations are active
      if (activeOperationsRef.current === 0 && isMountedRef.current) {
        releaseWakeLock();
      }
      if (isMountedRef.current) {
        setProcessingData(false);
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
      alert('Recording is processing in the background. You can keep working and we will notify you once it is complete.');
    }, 0);

    await handleUpload(recordedAudioBlob, payload, { background: true });
    resetState({ preserveProcessing: true });
  };

  const resetState = (options = {}) => {
    const { preserveProcessing = false } = options;
    setStep(0);
    setIsRecording(false);
    setIsPaused(false);
    setTimeRemaining(30 * 60);
    setPauseWarning(false);
    setError(null);
    setShowPatientModal(false);
    setRecordedAudioBlob(null);
    setProcessingData(false);
    if (!preserveProcessing) {
      setIsProcessing(false);
      setProcessingStatus(null);
    }
  };

  const handlePatientModalCancel = () => {
    resetState();
  };

  const handleClose = () => {
    // Prevent closing if uploading or processing is active
    if (isUploading || isProcessing) {
      const operation = isUploading ? 'uploading' : 'processing';
      if (!window.confirm(`Warning: ${operation} is in progress. If you close this modal, the operation will continue in the background, but you won't see progress updates. Are you sure you want to close?`)) {
        return;
      }
    }

    // Stop recording if active
    if (isRecording || isPaused) {
      stopRecording();
    }

    resetState();
    onClose();
  };

  const progress = ((30 * 60 - timeRemaining) / (30 * 60)) * 100; // Progress fills as time elapses

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

      {isProcessing && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <Typography variant="body2" sx={{ flexGrow: 1 }}>
              Recording is processing. You can keep working — we will notify you once it is ready.
            </Typography>
            <Chip
              label={formatProcessingStatus(processingStatus)}
              color="primary"
              variant="outlined"
              size="small"
            />
          </Box>
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
                backgroundColor: 'grey.300',
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
            {isUploading && (
              <Chip 
                label="Uploading" 
                color="info" 
                sx={{ animation: 'pulse 2s infinite' }}
              />
            )}
            {isProcessing && (
              <Chip 
                label="Processing" 
                color="secondary" 
                sx={{ animation: 'pulse 2s infinite' }}
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
            {isMobile && (isRecording || activeOperationsRef.current > 0) && !wakeLock && (
              <Chip 
                label="Screen May Sleep" 
                color="warning" 
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
                • <strong>Minimum Duration:</strong> Recordings must be at least 60 seconds long<br />
                • Recording will automatically stop after 30 minutes<br />
                • You can pause and resume anytime<br />
                • Screen stays awake during recording, uploading, and processing<br />
                {isMobile && (
                  <>
                    • <strong>Mobile:</strong> Keep this page visible and avoid locking your screen<br />
                    • <strong>Mobile:</strong> Don't switch apps during recording/uploading/processing<br />
                  </>
                )}
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
