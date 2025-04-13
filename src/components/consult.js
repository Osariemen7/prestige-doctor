import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle, useCallback } from 'react';
import {
  Box,
  ChakraProvider,
  Button,
  Flex,
  Text,
  IconButton,
  useMediaQuery,
  useToast,
  Tabs,
  TabList,
  Tab,
  HStack,
  Icon,
  Spinner,
  Center,
  Tooltip,
  Badge,
  Input,
  keyframes,
  VStack,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Heading,
  Divider,
  FormControl,
  FormLabel,
  FormHelperText,
  InputGroup,
  InputLeftAddon,
  Select
} from '@chakra-ui/react';
import { MdNotes, MdClose, MdMic, MdStop, MdTextFields, MdPause, MdPlayArrow, MdMessage } from 'react-icons/md';
import ChatScreen from './chatScreen';
import { useNavigate } from 'react-router-dom';
import { AiOutlineArrowLeft } from 'react-icons/ai';
import { getAccessToken } from './api';
import PatientProfileDisplay from './document';
import PatientProfile from './write'
import axios from 'axios';

const pulseAnimation = keyframes`
  0% { transform: scale(1); opacity: 0.8; }
  50% { transform: scale(1.1); opacity: 1; }
  100% { transform: scale(1); opacity: 0.8; }
`;

const ConsultAIPage = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [lastPhoneNumber, setLastPhoneNumber] = useState('');
  const [reviewId, setReviewId] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [wsStatus, setWsStatus] = useState('Disconnected');
  const [errorMessage, setErrorMessage] = useState('');
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [patientInfo, setPatientInfo] = useState(null);
  const [activeScreen, setActiveScreen] = useState("voice");
  const [bottomTabIndex, setBottomTabIndex] = useState(0);
  const [countryCode, setCountryCode] = useState("+234");
  const [loading, setLoading] = useState(false);
  const [ite, setIte] = useState('');
  const [isBottomTabVisible, setIsBottomTabVisible] = useState(false);
  const [timeLeft, setTimeLeft] = useState(900);
  const [isTranscriptionPanelOpen, setIsTranscriptionPanelOpen] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [realtimeStarted, setRealtimeStarted] = useState(false);
  const [animationIndex, setAnimationIndex] = useState(0);
  const [isConsultationStarted, setIsConsultationStarted] = useState(false);
  const [thread, setThread] = useState('');
  const [isDocumentationSaved, setIsDocumentationSaved] = useState(false);
  const { isOpen: isSaveModalOpen, onOpen: onSaveModalOpen, onClose: onSaveModalClose } = useDisclosure();
  const [isEndConsultModalOpen, setIsEndConsultModalOpen] = useState(false);
  const patientProfileRef = useRef(null);
  const [patient, setPatient] = useState('')
  const [pageResetKey, setPageResetKey] = useState('initial');

  const animationMessages = [
    "Warming up the microphone...",
    "Connecting to our server...",
    "Preparing consultation...",
    "Almost ready!",
  ];
  const timerIntervalRef = useRef(null);
  const navigate = useNavigate();
  const toast = useToast();
  const [isMobileOriginal] = useMediaQuery('(max-width: 768px)');
  const isMobile = isMobileOriginal;
  const wsRef = useRef(null);
  const audioContextRef = useRef(null);
  const processorRef = useRef(null);
  const [assemblyAiToken, setAssemblyAiToken] = useState('');
  const [isAudioProcessingActive, setIsAudioProcessingActive] = useState(false);
  const formatPhoneNumber = (phoneNumber, countryCode) => {
    return `${countryCode}${phoneNumber}`;
  };

  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(isPaused);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
  };

  // Drag state and handlers for transcription box
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartPosition, setDragStartPosition] = useState({ x: 0, y: 0 });
  const [boxPosition, setBoxPosition] = useState({ top: 100, left: 20 });
  const [dataList, setDataList] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [isManualInput, setIsManualInput] = useState(false);

  const handlePatientSelect = (value) => {
    if (value === 'manual') {
      setIsManualInput(true);
      setSelectedPatientId('');
      setPhoneNumber('');
    } else {
      setIsManualInput(false);
      setSelectedPatientId(value);
      const selectedPatient = dataList.find(patient => patient.id.toString() === value);
      if (selectedPatient) {
        setPhoneNumber(selectedPatient.phone_number);
      }
    }
  };

  useEffect(() => {
    const fetchPatientList = async () => {
      const accessToken = await getAccessToken();
      if (!accessToken) return;

      try {
        const response = await fetch('https://health.prestigedelta.com/patientlist/', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            accept: 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
        });
        if (response.status === 401) {
          navigate('/');
        } else {
          const result = await response.json();
          setDataList(result);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPatientList();
  }, []);


  const handleBilling = async () => {
    try {
      if (!ite?.appointment.patient_phone_number || !ite?.appointment.id) {
        console.warn("Billing information missing (patient phone or appointment ID). Billing skipped.");
        return;
      }

      const phone = ite.appointment.patient_phone_number;
      const formattedPhoneNumber = formatPhoneNumber(phone, countryCode);
      const token = await getAccessToken();
      const item = {
        cost_bearer: 'doctor',
        appointment_id: ite.appointment.id,
        expertise: 'trainee',
        seconds_used: 900 - timeLeft,
      };

      const response = await fetch('https://health.prestigedelta.com/billing/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          accept: 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(item),
      });

      const result = await response.json();
      if (!response.ok) {
        console.error('Billing error:', result.message || 'An error occurred during billing', result);
      } else {
        console.log('Billing successful:', result.message || 'Billing processed successfully');
      }
    } catch (error) {
      console.error('Error during billing process:', error);
    } finally {
    }
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStartPosition({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStartPosition.x;
    const deltaY = e.clientY - dragStartPosition.y;
    setBoxPosition(prevPosition => ({ top: prevPosition.top + deltaY, left: prevPosition.left + deltaX }));
    setDragStartPosition({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStartPosition]);


  useEffect(() => {
    const fetchTranscriptToken = async () => {
      try {
        const tok = await getAccessToken();
        const tokenRes = await fetch(
          "https://health.prestigedelta.com/assemblyai/generate-token/",
          {
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
              Authorization: `Bearer ${tok}`,
            },
          }
        );
        if (!tokenRes.ok) {
          const message = `Failed to fetch AssemblyAI token, status code: ${tokenRes.status}`;
          console.error(message);
          toast({
            title: 'Token Error',
            description: message,
            status: 'error',
            duration: 5000,
            isClosable: true,
          });
          return;
        }
        const tokenData = await tokenRes.json();
        setAssemblyAiToken(tokenData.token);
        console.log("AssemblyAI token:", tokenData.token);
      } catch (error) {
        console.error("Error initializing AssemblyAI:", error);
        toast({
          title: 'Token Error',
          description: 'Failed to initialize AssemblyAI token service.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    };

    fetchTranscriptToken();

    const intervalId = setInterval(fetchTranscriptToken, 249000);

    return () => clearInterval(intervalId);
  }, [toast]);



  // --- Realtime Transcription Functions ---
  const startRealtimeTranscription = () => {
    if (isTranscribing) {
      console.log("Transcription already in progress.");
      return;
    }
    if (!assemblyAiToken) {
      console.error("AssemblyAI token is not available. Cannot start transcription.");
      toast({
        title: 'Transcription Error',
        description: 'Could not start transcription service due to token issue.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    const sampleRate = 16000;
    const socketUrl = `wss://api.assemblyai.com/v2/realtime/ws?sample_rate=${sampleRate}&token=${assemblyAiToken}`;
    wsRef.current = new WebSocket(socketUrl);

    wsRef.current.onopen = () => {
      console.log('WebSocket connected for transcription.');
      setWsStatus('Connected');
      setIsTranscribing(true);
      setRealtimeStarted(true);
      setIsBottomTabVisible(true);
      setIsTranscriptionPanelOpen(false);
      setTimeLeft(900);
      setErrorMessage('');

      if (!isPaused) {
        timerIntervalRef.current = setInterval(() => {
          setTimeLeft(prevTime => {
            if (prevTime <= 1) {
              clearInterval(timerIntervalRef.current);
              stopRealtimeTranscription();
              setIsBottomTabVisible(false);
              endConsultation(); // Call endConsultation when timer runs out
              return 0;
            }
            return prevTime - 1;
          });
        }, 1000);
      }
      startAudioStream();
    };

    wsRef.current.onmessage = (event) => {
      console.log("Raw WS message:", event.data); // <<=== New log to see raw message
      try {
        const data = JSON.parse(event.data);
        if (data.message_type === 'FinalTranscript') {
          if (data.text) {
            setTranscript(prev => {
              const updatedTranscript = prev + (prev ? '\n\n' : '') + data.text;
              console.log("Transcript received after resume:", updatedTranscript);
              return updatedTranscript;

            });
          } else {
            console.log("FinalTranscript message received with empty text.");
          }
        } else {
          console.log("Non-transcript message received:", data);
        }
      } catch (err) {
        console.error('Error parsing transcription message:', err);
      }
    };

    wsRef.current.onerror = (error) => {
      console.error('WebSocket error during transcription:', error);
      clearInterval(timerIntervalRef.current);
      setIsBottomTabVisible(false);
      setWsStatus('Error');
      setIsTranscribing(false);
      setRealtimeStarted(false);
      setIsPaused(false);
      setErrorMessage('Failed to maintain transcription service. Please check connection.');
      toast({
        title: 'Transcription Error',
        description: 'Real-time transcription service encountered an error.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    };

    wsRef.current.onclose = () => {
      console.log('WebSocket connection closed for transcription.');
      setWsStatus('Disconnected');
      setIsTranscribing(false);
      setRealtimeStarted(false);
      clearInterval(timerIntervalRef.current);
      setIsBottomTabVisible(false);
      setIsPaused(false);
      if (wsStatus !== 'Error') {
        toast({
          title: 'Transcription Service Disconnected',
          description: 'Real-time transcription service has been disconnected.',
          status: 'warning',
          duration: 3000,
          isClosable: true,
        });
      }
    };
  };


  const startAudioStream = async () => {
    if (audioContextRef.current && audioContextRef.current.state === 'running') {
      console.log("Audio stream already running.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, sampleRate: 16000 });
      audioContextRef.current = audioContextRef.current || new AudioContext({ sampleRate: 16000 });
      const source = audioContextRef.current.createMediaStreamSource(stream);
      processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);

      source.connect(processorRef.current);
      processorRef.current.connect(audioContextRef.current.destination);

      processorRef.current.onaudioprocess = (e) => {
        if (!isPaused && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          const inputData = e.inputBuffer.getChannelData(0);
          const pcmData = convertFloat32ToInt16(inputData);
          wsRef.current.send(pcmData);
        }
      };
      if (audioContextRef.current.state !== 'running') {
        await audioContextRef.current.resume();
      }
      console.log("Audio stream started.");

    } catch (err) {
      console.error('Error accessing microphone or starting audio stream:', err);
      setErrorMessage('Microphone access failed. Please check permissions.');
      toast({
        title: 'Microphone Error',
        description: 'Failed to access microphone. Please ensure permissions are granted.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      stopRealtimeTranscription();
    }
  };


  const convertFloat32ToInt16 = (buffer) => {
    const l = buffer.length;
    const int16Buffer = new Int16Array(l);
    for (let i = 0; i < l; i++) {
      let s = Math.max(-1, Math.min(1, buffer[i]));
      int16Buffer[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return int16Buffer.buffer;
  };

  const stopRealtimeTranscription = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    stopAudioProcessing();
    setIsTranscribing(false);
    setRealtimeStarted(false);
    clearInterval(timerIntervalRef.current);
    setIsBottomTabVisible(false);
    setIsPaused(false);
    console.log("Realtime transcription stopped.");
  };


  const toggleTranscription = () => {
    if (isTranscribing) {
      if (isPaused) {
        resumeTranscription();
      } else {
        pauseTranscription();
      }
    } else {
      startConsultationSessionFlow();
    }
  };


  const pauseTranscription = () => {
    if (isTranscribing && !isPaused) {
        setIsPaused(true);
        clearInterval(timerIntervalRef.current);
        stopAudioProcessing();
        console.log("Transcription paused.");
      if (patientProfileRef.current && patientProfileRef.current.getSuggestion) { // Check if ref and function exist
        patientProfileRef.current.getSuggestion(); // Call getSuggestion on pause
      }
      if (patientProfileRef.current && patientProfileRef.current.getSuggestion) {
        patientProfileRef.current.getSuggestion('patientProfile'); // Pass 'patientProfile' tab name
        patientProfileRef.current.getSuggestion('healthGoals');   // Pass 'healthGoals' tab name
        patientProfileRef.current.getSuggestion('medicalReview');  // Pass 'medicalReview' tab name
      }

    }
  };

  const resumeTranscription = async () => {
    if (isTranscribing && isPaused) {
      setIsPaused(false); // <== This will update the isPaused state and trigger useEffect to update isPausedRef.current
      console.log("Resuming transcription...");

      try {
        if (audioContextRef.current) {
          console.log(`Audio context state before resume: ${audioContextRef.current.state}`);
          if (audioContextRef.current.state === 'suspended') {
            await audioContextRef.current.resume();
            console.log(`Audio context resumed in resumeTranscription. State: ${audioContextRef.current.state}`);
          } else {
            console.log(`Audio context was not suspended, current state: ${audioContextRef.current.state}. No resume needed.`);
          }
        } else {
          console.log("Audio context was null in resumeTranscription, this should not happen if starting from pause. Check logic.");
        }


        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
          console.log(`WebSocket state before reconnection check: ${wsRef.current?.readyState}`);
          console.log("Reinitializing WebSocket connection in resumeTranscription...");
          const sampleRate = 16000;
          const socketUrl = `wss://api.assemblyai.com/v2/realtime/ws?sample_rate=${sampleRate}&token=${assemblyAiToken}`;
          wsRef.current = new WebSocket(socketUrl);

          wsRef.current.onopen = () => {
            console.log('WebSocket reconnected for transcription in resumeTranscription.');
            setWsStatus('Connected');
          };

          wsRef.current.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data);
              if (data.message_type === 'FinalTranscript' && data.text) {
                setTranscript((prev) => `${prev}\n\n${data.text}`);
                console.log("Transcript received after resume:", data.text);
              }
            } catch (err) {
              console.error('Error parsing transcription message:', err);
            }
          };

          wsRef.current.onerror = (error) => {
            console.error('WebSocket error during transcription in resumeTranscription:', error);
            setWsStatus('Error');
          };

          wsRef.current.onclose = () => {
            console.log('WebSocket connection closed for transcription in resumeTranscription.');
            setWsStatus('Disconnected');
          };
        } else {
          console.log(`WebSocket already open in resumeTranscription, state: ${wsRef.current.readyState}. Reusing connection.`);
        }

        await startAudioProcessing();

        timerIntervalRef.current = setInterval(() => {
          setTimeLeft((prevTime) => {
            if (prevTime <= 1) {
              clearInterval(timerIntervalRef.current);
              stopRealtimeTranscription();
              setIsBottomTabVisible(false);
              return 0;
            }
            return prevTime - 1;
          });
        }, 1000);

        console.log("Transcription resumed successfully.");
      } catch (error) {
        console.error('Error resuming transcription:', error);
        toast({
          title: 'Resume Error',
          description: 'Failed to resume transcription. Please try again.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        stopRealtimeTranscription();
      }
    }
  };


  const stopAudioProcessing = () => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current.onaudioprocess = null;
      processorRef.current = null;
      console.log("Audio processor disconnected.");

    }
    if (audioContextRef.current && audioContextRef.current.state === 'running') {
      audioContextRef.current.suspend();
      console.log("Audio context suspended.");
    }
  };

  const startAudioProcessing = async () => {
    try {
      console.log("Starting audio processing...");

      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
        console.log(`Audio context resumed in startAudioProcessing. State: ${audioContextRef.current.state}`);
      } else if (!audioContextRef.current) {
        console.log("Audio context was null, starting audio stream to initialize it.");
        await startAudioStream();
        return;
      } else {
        console.log(`Audio context state before processor setup: ${audioContextRef.current.state}`);
      }

      console.log(`processorRef.current before setup: ${processorRef.current}`);
      if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current.onaudioprocess = null;
        processorRef.current = null;
        console.log("Existing processor disconnected and set to null.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, sampleRate: 16000 });
      const source = audioContextRef.current.createMediaStreamSource(stream);

      processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);
      source.connect(processorRef.current);
      processorRef.current.connect(audioContextRef.current.destination);
      console.log(`processorRef.current after setup: ${processorRef.current}`);


      processorRef.current.onaudioprocess = (e) => {
        setIsAudioProcessingActive(true);
        console.log("Audio data is being processed by onaudioprocess (in startAudioProcessing).");

        if (audioContextRef.current.state !== 'running') {
          console.log(`Audio context not running in onaudioprocess, state: ${audioContextRef.current.state}. Aborting send.`);
          setIsAudioProcessingActive(false);
          return;
        }

        if (!isPausedRef.current && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) { // <==== Use isPausedRef.current here
          const inputData = e.inputBuffer.getChannelData(0);
          const pcmData = convertFloat32ToInt16(inputData);
          wsRef.current.send(pcmData);
          console.log("Audio data sent to WebSocket from onaudioprocess (startAudioProcessing).");
        } else {
          console.log(`Conditions not met to send audio data from onaudioprocess (startAudioProcessing). Paused: ${isPausedRef.current.current}, WS Open: ${wsRef.current?.readyState === WebSocket.OPEN}`); // <==== Use isPausedRef.current here in log
          setIsAudioProcessingActive(false);
        }
      };

      console.log("Audio processor initialized and onaudioprocess set in startAudioProcessing.");

    } catch (err) {
      console.error('Error restarting audio processing:', err);
      setErrorMessage('Failed to restart audio processing. Please check microphone and try again.');
      toast({
        title: 'Audio Error',
        description: 'Failed to restart audio processing.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };


  const stopAudioStream = () => {
    stopAudioProcessing();
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
      console.log("Audio context fully closed.");
    }
  };


  const endConsultation = async () => {
    if (wsStatus === 'Connected') {
      if (!isDocumentationSaved) {
        setIsEndConsultModalOpen(true); // Open the modal instead of showing alert
        return;
      } else {
        stopRealtimeTranscription();
        performEndConsultation();
      }
    } else {
      stopRealtimeTranscription();
      performEndConsultation();
    }
  };

  const handleEndWithoutSaving = () => {
    setIsEndConsultModalOpen(false);
    stopRealtimeTranscription();
    performEndConsultation();
  };

  const handleSaveAndEnd = async () => {
    setIsEndConsultModalOpen(false);
    try {
      if (patientProfileRef.current && patientProfileRef.current.handleSubmitFromParent) {
        const saved = await patientProfileRef.current.handleSubmitFromParent('all');
        if (saved) {
          setIsDocumentationSaved(true);
          stopRealtimeTranscription();
          performEndConsultation();
        }
      }
    } catch (error) {
      console.error('Error saving documentation:', error);
      toast({
        title: 'Save Error',
        description: 'Failed to save documentation',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const performEndConsultation = async () => {
    // Save all documentation via the /document-assessment/ endpoint using the patientProfileRef
    if (patientProfileRef.current && patientProfileRef.current.handleSubmitFromParent) {
      try {
        const saveSuccessful = await patientProfileRef.current.handleSubmitFromParent();
        if (!saveSuccessful) {
          toast({
            title: 'Save Error',
            description: 'Failed to save documentation before ending consultation.',
            status: 'error',
            duration: 5000,
            isClosable: true,
          });
          return;
        }
      } catch(error) {
        console.error("Error saving documentation:", error);
        toast({
          title: 'Save Error',
          description: 'An error occurred during document save.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        return;
      }
    }
    setIsConsultationStarted(false);
    // Do not clear reviewId and chat so that they persist
    // setPhoneNumber(''); <- Optionally you can clear phone number if desired
    // setReviewId('');
    setTranscript('');
    setIsBottomTabVisible(true); // Show documentation tabs
    setBottomTabIndex(1);        // Set active tab to document
    setActiveScreen("document"); // Switch to document view
    setIsDocumentationSaved(true); // Mark as saved
    await handleBilling();
    toast({
      title: 'Consultation Ended',
      description: 'Consultation ended and documentation saved.',
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };


  const startConsultationSessionFlow = async () => {
    // Reset documentation state if a new phone number is used
    if (phoneNumber !== lastPhoneNumber) {
      setPatientInfo(null);
      setTranscript('');
      setBottomTabIndex(0);
      setActiveScreen("voice");
      setLastPhoneNumber(phoneNumber);
      setReviewId('');    
      setThread('');      
      setPageResetKey(Date.now());
      console.log("Full page reset triggered due to phone number change.");
    }

    if (!isConsultationStarted) {
      setLoading(true);
      const appointmentBooked = await startConsultationSession();
      setIsConsultationStarted(appointmentBooked);
      setLoading(false);
      if (appointmentBooked) {
        startRealtimeTranscription();
      }
    }
  };

  const startConsultationSession = async () => {
    if (!selectedPatientId) {
      setErrorMessage('Please select a patient to start consultation');
      toast({
        title: 'Selection Required',
        description: 'Please select a patient from the list to start consultation',
        status: 'warning',
        duration: 5000,
        isClosable: true,
      });
      setLoading(false);
      return false;
    }
    setErrorMessage('');

    const data = {
      start_time: new Date().toISOString(),
      reason: 'Instant Consultation',
      patient_id: parseInt(selectedPatientId),
      is_instant: true,
    };

    const token = await getAccessToken();

    try {
      const response = await fetch('https://health.prestigedelta.com/appointments/book/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const message = `Failed to book appointment, status code: ${response.status}`;
        console.error(message);
        throw new Error(message);
      }

      const result = await response.json();
      setIte(result);
      setReviewId(result.appointment.review_id);
      setThread(result.appointment.thread_id);
      setPatient(result.appointment.patient)
      console.log('Appointment booked successfully.');
      console.log(result.appointment.review_id)
      return true; // Booking successful

    } catch (error) {
      console.error('Error booking appointment:', error);
      toast({
        title: 'Appointment Error',
        description: error.message || 'Failed to book appointment.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return false; // Booking failed
    } finally {
      setLoading(false);
    }
  };

  const handleBackClick = useCallback(async () => {
    if (wsStatus === 'Connected') {
      toast({
        title: 'Cannot Exit',
        description: "You can't exit the page while consultation is ongoing. Please end the consultation first.",
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    await handleBilling();
    navigate('/dashboard');
  }, [wsStatus]);


  const toggleActiveScreen = (screenName) => {
    setActiveScreen(screenName);
    if (screenName === "chat") {
      setHasNewMessage(false);
    }
  };

  const handleBottomTabChange = (index) => {
    setBottomTabIndex(index);
    if (index === 0) {
      toggleActiveScreen('chat');
    } else if (index === 1) {
      toggleActiveScreen('document');
    }
  };


  const toggleTranscriptionPanel = () => {
    setIsTranscriptionPanelOpen(!isTranscriptionPanelOpen);
  };

  useEffect(() => {
    let animationInterval;
    if (loading) {
      animationInterval = setInterval(() => {
        setAnimationIndex(prevIndex => (prevIndex + 1) % animationMessages.length);
      }, 8000);
    }
    return () => clearInterval(animationInterval);
  }, [loading]);

  useEffect(() => {
    setActiveScreen(wsStatus === 'Connected' ? 'chat' : 'voice');
    if (wsStatus === 'Connected') {
      setIsBottomTabVisible(true); // Make bottom tabs visible on connection
      if (isMobile) {
        setBottomTabIndex(0); // Default to chat tab on mobile after connection
      }
    } else {
      setIsBottomTabVisible(false); // Hide bottom tabs when disconnected
    }
  }, [wsStatus, isMobile]);


  useEffect(() => {
    return () => {
      stopRealtimeTranscription();
      stopAudioStream();
    };
  }, []);

  useEffect(() => {
    if (timeLeft <= 1 && isTranscribing) {
      // Auto-save documentation when timer expires
      const autoSaveAndEnd = async () => {
        if (patientProfileRef.current && patientProfileRef.current.handleSubmitFromParent) {
          try {
            await patientProfileRef.current.handleSubmitFromParent('all');
            setIsDocumentationSaved(true);
          } catch (error) {
            console.error('Error auto-saving documentation:', error);
          }
        }
        endConsultation();
      };
      autoSaveAndEnd();
    }
  }, [timeLeft, isTranscribing]);

  const isRecordButtonVisible = !isConsultationStarted && wsStatus !== 'Connected' && !isTranscribing;
  const isPausePlayButtonVisible = isConsultationStarted && isTranscribing;
  const animation = `${pulseAnimation} 2s linear infinite`;


  return (
    <ChakraProvider>
      <Flex key={pageResetKey} direction="column" height="100vh" bg="gray.50">
        {/* End Consultation Modal */}
        <Modal isOpen={isEndConsultModalOpen} onClose={() => setIsEndConsultModalOpen(false)} isCentered>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>End Consultation Without Saving?</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              Do you want to end the consultation without saving the documentation?
            </ModalBody>
            <ModalFooter>
              <Button colorScheme="red" mr={3} onClick={handleEndWithoutSaving}>
                End Without Saving
              </Button>
              <Button colorScheme="blue" mr={3} onClick={handleSaveAndEnd}>
                Save and End
              </Button>
              <Button variant="ghost" onClick={() => setIsEndConsultModalOpen(false)}>Cancel</Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* Save Documentation Modal */}
        <Modal isOpen={isSaveModalOpen} onClose={onSaveModalClose} isCentered>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Save Documentation?</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              Please save the patient documentation before ending the consultation.
            </ModalBody>
            <ModalFooter>
              <Button colorScheme='blue' mr={3} onClick={() => { setIsDocumentationSaved(true); onSaveModalClose(); performEndConsultation(); }}>
                Okay, End Consultation
              </Button>
              <Button variant='ghost' onClick={onSaveModalClose}>Cancel</Button>
            </ModalFooter>
          </ModalContent>
        </Modal>


        {/* Header */}
        <Flex align="center" justify="space-between" bg="white" p="2" boxShadow="md" position="sticky" top="0" zIndex="1">
          <Flex align="center" cursor="pointer" onClick={handleBackClick}>
            <IconButton icon={<AiOutlineArrowLeft />} aria-label="Back" mr="2" variant="ghost" />
            <Text fontSize="lg" fontWeight="medium">Back</Text>
          </Flex>
          <Box display="flex" alignItems="center">
            <Badge colorScheme={wsStatus === 'Connected' ? 'green' : wsStatus === 'Error' ? 'red' : 'gray'}>
              {wsStatus}
            </Badge>
            {wsStatus === 'Connected' && (
              <Text ml="4" fontWeight="bold" color="blue.600">
                {formatTime(timeLeft)}
              </Text>
            )}
          </Box>
        </Flex>

        {/* Persistent Controls */}
        <Flex
          bg="#f0f4f8"
          padding={2}
          justifyContent="space-between"
          alignItems="center"
          boxShadow="md"
          direction="row"
        >
          <Flex align="center">
            <Button
              onClick={isConsultationStarted ? endConsultation : startConsultationSessionFlow}
              isDisabled={loading}
              colorScheme={isConsultationStarted ? "red" : "blue"}
              mr={1}
            >
              {loading ? <Spinner size="sm" /> : isConsultationStarted ? 'End Consultation' : 'Start Consultation'}
            </Button>
            <Tooltip label={isTranscriptionPanelOpen ? "Hide Transcription" : "Show Transcription"} placement="bottom">
              <IconButton
                icon={<MdTextFields />}
                aria-label="Toggle Transcription"
                variant="ghost"
                onClick={toggleTranscriptionPanel}
                isRound={true}
                isDisabled={!isTranscribing && wsStatus !== 'Connected'}
              />
            </Tooltip>
            {isConsultationStarted && (
              <Tooltip label={isPaused ? "Resume Recording" : "Pause Recording"} placement="bottom">
                <IconButton
                  icon={isPaused ? <MdPlayArrow /> : <MdPause />}
                  aria-label={isPaused ? "Resume Recording" : "Pause Recording"}
                  variant="solid" // Changed from ghost to solid
                  colorScheme={isPaused ? "green" : "red"} // Green for resume, red for pause
                  size="lg" // Increased size
                  onClick={toggleTranscription}
                  isRound={true}
                  mx={1}
                  boxShadow="xl" // Added shadow for emphasis
                />
              </Tooltip>
            )}
          </Flex>
        </Flex>

        {/* Content Area */}
        <Flex flex="1" overflow="hidden" direction={!isMobile && isBottomTabVisible ? "row" : "column" }>
        { !isConsultationStarted && wsStatus !== 'Connected' && (
          <Flex
            direction="column"
            align="center"
            justify="center"
            flex="1"
            p={8}
            bg="gray.50"
          >
            <VStack
              spacing={8}
              maxWidth="md"
              bg="white"
              p={8}
              borderRadius="lg"
              boxShadow="md"
            >
              <Heading size="lg" textAlign="center" color="blue.600">
                Start a New Consultation
              </Heading>

              <FormControl isRequired isInvalid={!!errorMessage}>
                <FormLabel>Select Patient</FormLabel>
                <Select
                  value={selectedPatientId}
                  onChange={(e) => {
                    setSelectedPatientId(e.target.value);
                    const selectedPatient = dataList.find(patient => patient.id.toString() === e.target.value);
                    if (selectedPatient) {
                      setPhoneNumber(selectedPatient.phone_number);
                    }
                  }}
                  placeholder="Select a patient"
                  mb={2}
                >
                  {dataList.map(patient => (
                    <option key={patient.id} value={patient.id}>
                      {patient.phone_number} {patient.full_name ? `(${patient.full_name})` : ''}
                    </option>
                  ))}
                </Select>

                {errorMessage && (
                  <Alert status="error" mt={2} borderRadius="md">
                    <AlertIcon />
                    {errorMessage}
                  </Alert>
                )}
              </FormControl>

              <Button
                onClick={startConsultationSessionFlow}
                colorScheme="blue"
                size="lg"
                width="full"
                isLoading={loading}
                loadingText="Starting..."
              >
                Start Consultation
              </Button>

              {loading && (
                <Text textAlign="center" color="gray.600">
                  {animationMessages[animationIndex]}
                </Text>
              )}
            </VStack>
          </Flex>
        )}

          {/* Left Side (ChatScreen/VoiceNote) */}
          <Box
            width={!isMobile && isBottomTabVisible ? "30%" : "100%"}
            flex="1"
            overflow="auto"
            p="2"
            position="relative"
            display={isConsultationStarted || wsStatus === 'Connected' ? 'block' : 'none'}
          >
            {patientInfo && !(!isMobile && isBottomTabVisible) && (
              <Box bg="white" p="4" mb="4" borderRadius="md" boxShadow="md">
                <Text fontWeight="bold" mb="2">Patient Information</Text>
                {Object.entries(patientInfo).map(([key, value]) => (
                  <Text key={key}><strong>{key}:</strong> {value}</Text>
                ))}
              </Box>
            )}
            {/* Voice Only Chat Screen - Hidden when wsStatus is connected */}
            <Box display={activeScreen === "voice" && wsStatus !== "Connected" ? "block" : "none"}>
              <Text color="red.500">{errorMessage}</Text>
              {wsStatus !== 'Disconnected' && (
                <Text marginTop="5px" color="green.500">
                  {`AI Status: ${wsStatus}`}
                </Text>
              )}
              {loading && (
                <Center>
                  <VStack>
                    <Spinner thickness='4px' speed='0.65s' emptyColor='gray.200' color='blue.500' size='xl' />
                    <Text mt={4}>{animationMessages[animationIndex]}</Text>
                  </VStack>
                </Center>
              )}
            </Box>
            {/* Chat Screen - Displayed when activeScreen is chat or on mobile tab 0 */}
            <Box display={(activeScreen === "chat" || (isMobile && isBottomTabVisible && bottomTabIndex === 0)) ? "block" : "none"}>
              <ChatScreen
                chatMessages={chatMessages}
                setChatMessages={setChatMessages}
                reviewId={reviewId}
                phoneNumber={phoneNumber}
                setReviewId={setReviewId}
                ite={ite}
                transcript={transcript}
                thread = {thread}
                patient={patient}
              />
            </Box>

            {/* Transcription Overlay */}
            {isTranscriptionPanelOpen && (
              <Box
                position="fixed"
                top={boxPosition.top}
                left={boxPosition.left}
                right="auto"
                bottom="auto"
                maxWidth="400px"
                height="40vh"
                bg="rgba(255, 255, 255, 0.95)"
                zIndex="12"
                p={5}
                overflowY="auto"
                borderRadius="md"
                boxShadow="lg"
                onMouseDown={handleMouseDown}
                style={{ cursor: 'grab' }}
              >
                <Flex justify="space-between" align="center" mb={4}>
                  <Text fontWeight="bold" fontSize="lg">Realtime Transcription</Text>
                  <IconButton icon={<MdClose />} aria-label="Close transcription" onClick={toggleTranscriptionPanel} size="sm" />
                </Flex>
                <Box
                  bg="gray.100"
                  p={2}
                  borderRadius="md"
                  overflowY="auto"
                  maxHeight="calc(100% - 60px)"
                >
                  <Text fontSize="md">{transcript}</Text>
                </Box>
              </Box>
            )}
          </Box>

          {/* Right Side (Document Panel) */}
          { (isBottomTabVisible) && (
            <Box
              width={!isMobile && isBottomTabVisible ? "70%" : "100%"}
              bg="white"
              boxShadow="md"
              zIndex="2"
              overflowY="auto"
              p={1}
              display={(!isMobile && isBottomTabVisible) || (isMobile && isBottomTabVisible && bottomTabIndex === 1) ? 'block' : 'none'}
            >
              <PatientProfile
                key={pageResetKey}
                resetKey={pageResetKey}
                thread={thread}
                reviewid={reviewId}
                wsStatus={wsStatus}
                setIsDocumentationSaved={setIsDocumentationSaved}
                transcript={transcript}
                ref={patientProfileRef}
                parentalSetIsDocumentationSaved={setIsDocumentationSaved}
              />
            </Box>
          )}
        </Flex>

        {/* Bottom Tabs - Mobile Only */}
        {isBottomTabVisible && isMobile && (
          <Center
            w="100%"
            mx="auto"
            position={'fixed'}
            bottom={'0'}
            left="0"
            right="0"
            zIndex="1000"
            bg="white"
            boxShadow="md"
            pb={4}
            borderRadius="md"
          >
            <Tabs
              index={bottomTabIndex}
              onChange={handleBottomTabChange}
              isFitted
              variant="enclosed-colored"
              colorScheme="blue"
              maxwidth="100%"
              align="center"
              style={{ display: 'flex' }}
            >
              <TabList bg="white" borderRadius="md" justifyContent="center">
                <>
                  <Tab _selected={{ color: 'white', bg: 'blue.500' }} position="relative" width="14rem">
                    Researcher
                    {hasNewMessage && activeScreen === "chat" && (
                      <Box
                        position="absolute"
                        top="-2px"
                        right="-2px"
                        width="8px"
                        height="8px"
                        borderRadius="50%"
                        bg="red.500"
                        border="1px solid white"
                      />
                    )}
                  </Tab>
                  <Tab _selected={{ color: 'white', bg: 'blue.500' }}>
                    <Flex align="center">
                      <MdNotes style={{ marginRight: '0.5rem' }} />
                      Document
                    </Flex>
                  </Tab>
                </>
              </TabList>
            </Tabs>
          </Center>
        )}

      </Flex>
    </ChakraProvider>
  );
};

export default ConsultAIPage;