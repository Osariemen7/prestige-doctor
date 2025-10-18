import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
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
  StepLabel,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
  FormControl,
  InputLabel,
  Input,
  FormHelperText
} from '@mui/material';
import {
  Mic as MicIcon,
  Pause as PauseIcon,
  PlayArrow as PlayArrowIcon,
  Stop as StopIcon,
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  CloudUpload as CloudUploadIcon
} from '@mui/icons-material';
import { getAccessToken } from '../api';
import PatientDetailsModal from './PatientDetailsModal';
import { useProcessingStatus } from '../contexts/ProcessingStatusContext';

const RecordingModal = ({
  open,
  onClose,
  encounterId,
  encounterData,
  reviewId,
  onComplete,
  onWorkflowEvent,
  existingNote = null,
  existingTranscript = []
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { setStatus, clearStatus } = useProcessingStatus();
  
  const [inputMode, setInputMode] = useState('record'); // 'record' or 'upload'
  const [step, setStep] = useState(0); // 0: input selection/recording, 1: patient-details
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(15 * 60); // 15 minutes
  const [pauseWarning, setPauseWarning] = useState(false);
  const [error, setError] = useState(null);
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [processingData, setProcessingData] = useState(false);
  
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

  const steps = inputMode === 'record' 
    ? ['Record Audio', 'Patient Details'] 
    : ['Upload Audio', 'Patient Details'];

  // Keep refs in sync with state
  useEffect(() => {
    isRecordingRef.current = isRecording;
    isPausedRef.current = isPaused;
  }, [isRecording, isPaused]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (timerRef.current) clearInterval(timerRef.current);
      if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  const testMicrophoneAccess = async () => {
    try {
      setError(null);
      
      // Check browser support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Audio recording is not supported in this browser.');
        return;
      }

      // Request microphone access
      const testStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Immediately stop the test stream
      testStream.getTracks().forEach(track => track.stop());
      
      setError('✅ Microphone access granted! You can now start recording.');
      setTimeout(() => setError(null), 3000); // Clear success message after 3 seconds
      
    } catch (error) {
      console.error('Microphone test failed:', error);
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setError('❌ Microphone permission denied. Please click "Allow" when prompted, or check browser settings.');
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        setError('❌ No microphone found. Please connect a microphone.');
      } else {
        setError(`❌ Microphone test failed: ${error.message}`);
      }
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    // Validate file type/extension where available
    const allowedMimeTypes = ['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/x-m4a'];
    const allowedExtensions = ['webm', 'ogg', 'mp4', 'm4a', 'mp3', 'wav'];
    const fileExtension = (file.name.split('.').pop() || '').toLowerCase();
    const mimeTypeValid = file.type ? allowedMimeTypes.includes(file.type) : false;
    const extensionValid = allowedExtensions.includes(fileExtension);

    if (!mimeTypeValid && !extensionValid) {
      setError('Please select a valid audio file (WebM, OGG, MP4, M4A, MP3, WAV)');
      return;
    }
    
    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      setError('File size must be less than 50MB');
      return;
    }
    
    console.log('File selected:', {
      name: file.name,
      size: file.size,
      type: file.type
    });
    
    setUploadedFile(file);
    setError(null);
    
    // Move to patient details step and show modal for details
    setStep(1);
    setShowPatientModal(true);
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

  const handleUpload = async (audioBlob, patientDetails) => {
    // Set status to 'uploading' in the global context
    if (reviewId) {
      setStatus(reviewId, 'uploading');
    }
    if (onWorkflowEvent) {
      onWorkflowEvent('uploading');
    }
    
    try {
      // Determine file extension and format from mimeType
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
      
      // Log FormData details for debugging
      console.log('FormData created with:', {
        fileName: `recording.${fileExtension}`,
        fileSize: audioBlob.size,
        mimeType: audioBlob.type
      });

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

      if (response.ok) {
        const uploadResult = await response.json();
        console.log('Upload result:', uploadResult);
        // Check if uploads are complete
        if (!uploadResult.s3_upload_pending && !uploadResult.google_upload_pending) {
          await handleProcess(patientDetails);
        } else {
          setError('Audio upload is still pending. Please wait...');
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Upload failed:', errorData);
        setError(errorData.detail || 'Upload failed. Please try again.');
        if (reviewId) clearStatus(reviewId);
        if (onWorkflowEvent) {
          onWorkflowEvent('error');
        }
      }
    } catch (error) {
      console.error('Upload error:', error);
      setError('Failed to upload audio. Please try again.');
      if (reviewId) clearStatus(reviewId);
      if (onWorkflowEvent) {
        onWorkflowEvent('error');
      }
    }
  };

  const handleProcess = async (patientDetails) => {
    // Set status to 'processing' in the global context
    if (reviewId) {
      setStatus(reviewId, 'processing');
    }
    if (onWorkflowEvent) {
      onWorkflowEvent('processing');
    }
    
    try {
      const token = await getAccessToken();

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
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody)
        }
      );

      if (response.ok) {
        const result = await response.json();
        console.log('Processing complete:', result);
        
        // Clear processing status
        if (reviewId) {
          clearStatus(reviewId);
        }
        
        // Close modal and trigger completion callback
        if (onWorkflowEvent) {
          onWorkflowEvent('completed');
        }
        if (onComplete) onComplete();
        handleClose();
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Processing failed:', errorData);
        setError(`Processing failed: ${errorData.detail || 'Please try again.'}`);
        if (reviewId) clearStatus(reviewId);
        if (onWorkflowEvent) {
          onWorkflowEvent('error');
        }
      }
    } catch (error) {
      console.error('Processing error:', error);
      setError('Failed to process audio. Please try again.');
      if (reviewId) clearStatus(reviewId);
      if (onWorkflowEvent) {
        onWorkflowEvent('error');
      }
    }
  };

  const handlePatientDetailsSubmit = async (patientData) => {
    setProcessingData(true);
    
    let audioToUpload = null;
    
    if (inputMode === 'record' && recordedAudioBlob) {
      // Final validation for recorded audio
      if (recordedAudioBlob.size === 0) {
        setError('Audio file is empty. Please record again.');
        setProcessingData(false);
        return;
      }
      
      if (recordedAudioBlob.size < 1000) {
        setError('Audio file too small. Please record a longer message.');
        setProcessingData(false);
        return;
      }
      
      console.log('Final audio validation passed:', {
        size: recordedAudioBlob.size,
        type: recordedAudioBlob.type
      });
      
      audioToUpload = recordedAudioBlob;
    } else if (inputMode === 'upload' && uploadedFile) {
      // Convert File to Blob for consistency
      audioToUpload = new Blob([uploadedFile], { type: uploadedFile.type });
      console.log('Using uploaded file:', {
        name: uploadedFile.name,
        size: uploadedFile.size,
        type: uploadedFile.type
      });
    } else {
      setError('No audio found. Please record or upload audio.');
      setProcessingData(false);
      return;
    }
    
    await handleUpload(audioToUpload, patientData);
    setProcessingData(false);
    setShowPatientModal(false);
  };

  const handleClose = () => {
    // Stop recording if active
    if (isRecording || isPaused) {
      stopRecording();
    }
    
    // Reset all states
    setInputMode('record');
    setStep(0);
    setIsRecording(false);
    setIsPaused(false);
    setTimeRemaining(15 * 60);
    setPauseWarning(false);
    setError(null);
    setShowPatientModal(false);
    setRecordedAudioBlob(null);
    setUploadedFile(null);
    setProcessingData(false);
    
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

      {/* Input Mode Toggle */}
      {step === 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" sx={{ mb: 2 }}>Choose Input Method:</Typography>
          <ToggleButtonGroup
            value={inputMode}
            exclusive
            onChange={(event, newMode) => {
              if (newMode) {
                setInputMode(newMode);
                setError(null);
                setRecordedAudioBlob(null);
                setUploadedFile(null);
              }
            }}
            sx={{ width: '100%' }}
          >
            <ToggleButton value="record" sx={{ flex: 1 }}>
              <MicIcon sx={{ mr: 1 }} />
              Record Audio
            </ToggleButton>
            <ToggleButton value="upload" sx={{ flex: 1 }}>
              <CloudUploadIcon sx={{ mr: 1 }} />
              Upload File
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      )}

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
          {inputMode === 'record' ? (
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
                    • Stopping will automatically upload and process
                  </Typography>
                </Alert>
              )}

              {/* Control Buttons */}
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
                {!isRecording && !isPaused ? (
                  <>
                    <Button
                      variant="outlined"
                      size="large"
                      onClick={testMicrophoneAccess}
                      sx={{ py: 2, px: 4 }}
                    >
                      Test Microphone
                    </Button>
                    <Button
                      variant="contained"
                      size="large"
                      startIcon={<MicIcon />}
                      onClick={startRecording}
                      sx={{ py: 2, px: 4 }}
                    >
                      Start Recording
                    </Button>
                  </>
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
                      Stop & Continue
                    </Button>
                  </>
                )}
              </Box>
            </>
          ) : (
            <>
              {/* File Upload Section */}
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <CloudUploadIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Upload Audio File
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Select an audio file to upload and process
                </Typography>
                
                {uploadedFile ? (
                  <Box sx={{ mb: 3 }}>
                    <Chip 
                      label={`${uploadedFile.name} (${(uploadedFile.size / 1024 / 1024).toFixed(1)}MB)`}
                      color="success"
                      icon={<CheckCircleIcon />}
                      sx={{ mb: 2 }}
                    />
                    <Button
                      variant="outlined"
                      onClick={() => {
                        setUploadedFile(null);
                        setStep(0);
                      }}
                      sx={{ mr: 1 }}
                    >
                      Change File
                    </Button>
                    <Button
                      variant="contained"
                      onClick={() => setStep(1)}
                    >
                      Continue
                    </Button>
                  </Box>
                ) : (
                  <FormControl fullWidth sx={{ mb: 3 }}>
                    <InputLabel htmlFor="audio-file-input" shrink>
                      Choose Audio File
                    </InputLabel>
                    <Input
                      id="audio-file-input"
                      type="file"
                      inputProps={{
                        accept: 'audio/*'
                      }}
                      onChange={handleFileUpload}
                    />
                    <FormHelperText>
                      Supported formats: WebM, OGG, MP4, MP3, WAV (max 50MB)
                    </FormHelperText>
                  </FormControl>
                )}
              </Box>
            </>
          )}
        </>
      )}      {/* Patient Details Step - info only, actual modal shown separately */}
      {step === 1 && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            {inputMode === 'record' ? 'Recording Complete!' : 'File Uploaded!'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Please provide patient details to continue...
          </Typography>
          {uploadedFile && (
            <Typography variant="body2" sx={{ mt: 1, fontWeight: 'bold' }}>
              File: {uploadedFile.name}
            </Typography>
          )}
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
          onClose={() => setShowPatientModal(false)}
          onSubmit={handlePatientDetailsSubmit}
          initialData={encounterData}
          loading={processingData}
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
        onClose={() => setShowPatientModal(false)}
        onSubmit={handlePatientDetailsSubmit}
        initialData={encounterData}
        loading={processingData}
      />
    </>
  );
};

export default RecordingModal;
