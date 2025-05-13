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
import { MdNotes, MdClose, MdMic, MdStop, MdTextFields, MdPause, MdPlayArrow, MdMessage, MdChevronLeft, MdChevronRight, MdChatBubbleOutline } from 'react-icons/md';
import { AddIcon, CloseIcon } from '@chakra-ui/icons';
import Split from 'react-split';
import ChatScreen from './chatScreen';
import { useNavigate, useLocation } from 'react-router-dom';
import { AiOutlineArrowLeft } from 'react-icons/ai';
import { getAccessToken } from './api';
import PatientProfileDisplay from './document';
import PatientProfile from './write';
import AddPatientModal from './AddPatientModal';
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
  const [isMobileOriginal] = useMediaQuery('(max-width: 768px)');
  const isMobile = isMobileOriginal;
  const [activeScreen, setActiveScreen] = useState(isMobile ? "documentation" : "voice");
  const [bottomTabIndex, setBottomTabIndex] = useState(isMobile ? 0 : 1); // Set to 0 for documentation tab on mobile (swapped order)
  const [countryCode, setCountryCode] = useState("+234");
  const [loading, setLoading] = useState(false);
  const [ite, setIte] = useState('');
  const [isBottomTabVisible, setIsBottomTabVisible] = useState(false);
  const [timeLeft, setTimeLeft] = useState(900);
  const [isTranscriptionPanelOpen, setIsTranscriptionPanelOpen] = useState(false);
  const [transcript, setTranscript] = useState([]);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [realtimeStarted, setRealtimeStarted] = useState(false);
  const [animationIndex, setAnimationIndex] = useState(0);
  const [isConsultationStarted, setIsConsultationStarted] = useState(false);
  const [thread, setThread] = useState('');
  const [isDocumentationSaved, setIsDocumentationSaved] = useState(false);
  const { isOpen: isSaveModalOpen, onOpen: onSaveModalOpen, onClose: onSaveModalClose } = useDisclosure();
  const [isEndConsultModalOpen, setIsEndConsultModalOpen] = useState(false);
  const patientProfileRef = useRef(null);
  const [patient, setPatient] = useState('');
  const [pageResetKey, setPageResetKey] = useState('initial');
  const [isSessionPrimed, setIsSessionPrimed] = useState(false);
  const wsClosingForResumeRef = useRef(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [pendingEndConsult, setPendingEndConsult] = useState(false);
  const [isAddPatientOpen, setIsAddPatientOpen] = useState(false);
  const [addPatientLoading, setAddPatientLoading] = useState(false);  const [isChatCollapsed, setIsChatCollapsed] = useState(false);
  const [splitSizes, setSplitSizes] = useState([35, 65]); // default split
  const [isEndingConsultation, setIsEndingConsultation] = useState(false);
  const [isEndingConsultationLoading, setIsEndingConsultationLoading] = useState(false); // NEW
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [billingProcessedForAppointmentId, setBillingProcessedForAppointmentId] = useState(null); // New state

  const location = useLocation();

  const animationMessages = [
    "Warming up the microphone...",
    "Connecting to our server...",
    "Preparing consultation...",
    "Almost ready!",
  ];
  const timerIntervalRef = useRef(null);
  const navigate = useNavigate();
  const toast = useToast();
  const wsRef = useRef(null);
  const audioContextRef = useRef(null);
  const processorRef = useRef(null);
  const [assemblyAiToken, setAssemblyAiToken] = useState('');
  const [isAudioProcessingActive, setIsAudioProcessingActive] = useState(false);
  
  // Reset component state when navigating to this page with reset flag
  useEffect(() => {
    if (location.state?.reset) {
      // Reset all relevant states to their initial values
      setIsEndingConsultation(false);
      setIsEndingConsultationLoading(false);
      setIsSavingAll(false);
      setIsConsultationStarted(false);
      setChatMessages([]);
      setTranscript([]);
      setWsStatus('Disconnected');
      setActiveScreen(isMobile ? "documentation" : "voice");
      setBottomTabIndex(isMobile ? 0 : 1);
      setIsBottomTabVisible(false);
      setTimeLeft(900);
      setHasUnsavedChanges(false);
      setPendingEndConsult(false);
      setPhoneNumber('');
      setReviewId('');
      setThread('');
      setPageResetKey(Date.now()); // Force child components to reset
      setBillingProcessedForAppointmentId(null); // Reset billing status
      
      // Remove the reset flag from location state to prevent multiple resets
      window.history.replaceState({}, document.title);
      
      // Toast to confirm reset
      toast({
        title: "Consultation Complete",
        description: "Ready to start a new consultation",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    }
  }, [location, isMobile, toast]);
  
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
    // Guard: Ensure consultation is active and appointment info is available
    if (!isConsultationStarted || !ite || !ite.appointment || !ite.appointment.id) {
      console.warn("Billing skipped: No active consultation, missing appointment info, or consultation not started.");
      return;
    }

    const appointment_id = ite.appointment.id;

    // Guard: Check if billing has already been processed for this specific appointment
    if (billingProcessedForAppointmentId === appointment_id) {
      console.log(`Billing already processed for appointment ID: ${appointment_id}. Skipping.`);
      return;
    }

    try {
      // Calculate seconds used (900 - timeLeft)
      const seconds_used = 900 - timeLeft;
      const token = await getAccessToken();
      const billingData = {
        appointment_id,
        seconds_used: Math.max(0, seconds_used),
      };
      const response = await fetch('https://health.prestigedelta.com/billing/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(billingData),
      });
      const result = await response.json();
      if (!response.ok) {
        console.error('Billing error:', result.message || result);
        toast({
          title: 'Billing Error',
          description: result.message || 'Failed to process billing.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      } else {
        console.log('Billing successful:', result.message || result);
        setBillingProcessedForAppointmentId(appointment_id); // Mark billing as processed for this appointment
      }
    } catch (error) {
      console.error('Error during billing:', error);
      toast({
        title: 'Billing Error',
        description: error.message || 'Failed to process billing.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
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
    if (isTranscribing && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      console.warn("startRealtimeTranscription called while already transcribing and WebSocket is open.");
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
      setIsTranscribing(true);
      setRealtimeStarted(true);
      setIsBottomTabVisible(true);
      setWsStatus('Connected');
      setErrorMessage('');
      console.log("WebSocket opened for transcription.");

      if (!isSessionPrimed) {
        setTimeLeft(900);
        setIsSessionPrimed(true);
        console.log("Timer reset to 900 (initial session start).");
      }

      if (!timerIntervalRef.current && timeLeft > 0) {
        console.log(`Starting timer in onopen. timeLeft: ${timeLeft}`);
        timerIntervalRef.current = setInterval(() => {
          setTimeLeft(prevTime => {
            if (prevTime <= 1) {
              clearInterval(timerIntervalRef.current);
              timerIntervalRef.current = null;
              console.log("Timer reached zero.");
              if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.onclose = () => {
                  console.log("WebSocket closed due to timer expiry.");
                  if (wsRef.current) wsRef.current = null;
                  endConsultation();
                };
                wsRef.current.close(1000, "Timer expired");
              } else {
                endConsultation();
              }
              return 0;
            }
            return prevTime - 1;
          });
        }, 1000);
      } else if (timerIntervalRef.current && timeLeft > 0) {
        console.log("Timer already running (likely started by resumeTranscription).");
      } else if (timeLeft <= 0) {
        console.log("Timer not started/applicable in onopen as timeLeft is 0 or less.");
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.onclose = () => {
            if (wsRef.current) wsRef.current = null;
            endConsultation();
          };
          wsRef.current.close(1000, "Session started with no time left");
        } else {
          endConsultation();
        }
      }

      startAudioStream();
    };

    wsRef.current.onmessage = (event) => {
      console.log("Raw WS message:", event.data);
      try {
        const data = JSON.parse(event.data);
        if (data.error) {
          console.error('WebSocket error from server:', data.error);
          if (data.error === "Session idle for too long") {
            toast({
              title: 'Session Timeout',
              description: 'Transcription session timed out. Reconnecting...',
              status: 'warning',
              duration: 3000,
              isClosable: true,
            });
            if (wsRef.current) {
              wsRef.current.close();
              wsRef.current = null;
            }
            setTimeout(() => {
              startRealtimeTranscription();
            }, 1000);
            return;
          }
        }
        if (data.message_type === 'FinalTranscript') {
          if (data.text) {
            setTranscript(prev => {
              const newEntry = {
                time: new Date().toISOString(),
                speaker: "",
                content: data.text
              };
              const updatedTranscript = [...prev, newEntry];
              console.log("Transcript entry received:", newEntry);
              console.log("Updated transcript array:", updatedTranscript);
              return updatedTranscript;
            });
          } else {
            console.log("FinalTranscript message received with empty text.");
          }
        } else if (data.message_type === 'SessionBegins') {
          // Ignore session begin messages, do not treat as error
          return;
        } else {
          // Only treat as error if not a known/expected message type
          console.warn("Non-transcript message received:", data);
          // Optionally: handle other known message types here
          // If truly unexpected, you may want to show a warning, but do NOT call stopRealtimeTranscription
        }
      } catch (err) {
        console.error('Error parsing transcription message:', err);
      }
    };

    wsRef.current.onerror = (error) => {
      console.error('WebSocket error during transcription:', error);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      stopAudioProcessing();
      setIsBottomTabVisible(false);
      setWsStatus('Error');
      setIsTranscribing(false);
      setRealtimeStarted(false);
      setErrorMessage('Failed to maintain transcription service. Please check connection.');
      toast({
        title: 'Transcription Error',
        description: 'Real-time transcription service encountered an error.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    };

    wsRef.current.onclose = (event) => {
      console.log(`Main WebSocket onclose. Code: ${event.code}, Reason: '${event.reason}'. isPausedRef.current: ${isPausedRef.current}, wsStatus: ${wsStatus}`);

      const currentWs = wsRef.current;

      if (wsClosingForResumeRef.current) {
        console.log("Main onclose: WebSocket closed as part of resume. Skipping UI reset.");
        wsClosingForResumeRef.current = false;
        if (currentWs === wsRef.current) {
          wsRef.current = null;
        }
        return;
      }

      if (isPausedRef.current) {
        console.log("Main onclose: WebSocket closed while in a paused state. Pause-specific onclose should have handled this.");
        if (wsStatus !== 'Paused') {
          console.warn("Main onclose: wsStatus was not 'Paused'. Setting to 'Paused'. This might indicate an issue with pause logic.");
          setWsStatus('Paused');
        }
      } else {
        console.log('Main onclose: WebSocket connection closed (not by pause or already handled by specific close).');
        stopAudioProcessing();
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
        if (event.reason !== "User stopped transcription" && event.reason !== "Timer expired" && event.reason !== "User paused transcription") {
          setIsTranscribing(false);
          setRealtimeStarted(false);
          setIsBottomTabVisible(false);
          setWsStatus('Disconnected');
          toast({
            title: 'Transcription Disconnected',
            description: `Service disconnected: ${event.reason || 'Unknown reason'}. Code: ${event.code}`,
            status: 'warning',
            duration: 5000,
            isClosable: true,
          });
        } else if (wsStatus !== 'Disconnected' && wsStatus !== 'Paused') {
          setWsStatus('Disconnected');
        }
      }

      if (currentWs === wsRef.current) {
        wsRef.current = null;
      }
      console.log("Main onclose finished. wsRef.current is now:", wsRef.current);
    };
  };

  const stopRealtimeTranscription = () => {
    console.log("stopRealtimeTranscription called.");
    if (wsRef.current) {
      console.log("Closing WebSocket in stopRealtimeTranscription.");
      wsRef.current.onclose = null;
      wsRef.current.close(1000, "User stopped transcription");
      wsRef.current = null;
    }
    stopAudioProcessing();
    setIsTranscribing(false);
    setRealtimeStarted(false);
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setIsBottomTabVisible(false);
    setIsPaused(false);
    isPausedRef.current = false;
    setWsStatus('Disconnected');
    console.log("Realtime transcription stopped by user.");
  };

  const pauseTranscription = () => {
    console.log("pauseTranscription called.");
    // Call getSuggestion on pause if available
    if (patientProfileRef.current && patientProfileRef.current.getSuggestion) {
      patientProfileRef.current.getSuggestion();
    }
    setIsPaused(true);
    isPausedRef.current = true; // Directly update the ref to ensure it's set before onclose can fire

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    stopAudioProcessing();

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const socketBeingPaused = wsRef.current;
      socketBeingPaused.onclose = () => {
        setWsStatus('Paused');
        if (wsRef.current === socketBeingPaused) {
          wsRef.current = null;
        }
      };
      socketBeingPaused.close(1000, "User paused transcription");
    } else {
      if (isTranscribing) setWsStatus('Paused');
    }
    console.log("Transcription paused.");
  };

  const resumeTranscription = async () => {
    console.log("resumeTranscription called.");
    setIsPaused(false);

    if (wsRef.current) {
      console.warn("resumeTranscription: Found an existing WebSocket. Closing it before proceeding.");
      wsClosingForResumeRef.current = true; // Mark that we're closing for resume
      wsRef.current.onclose = null;
      wsRef.current.close(1000, "Closing old WebSocket before resume");
      wsRef.current = null;
      setTimeout(() => {
        wsClosingForResumeRef.current = false; // Reset after a short delay
      }, 200);
    }

    if (!timerIntervalRef.current && timeLeft > 0) {
      console.log(`Restarting timer in resumeTranscription. timeLeft: ${timeLeft}`);
      timerIntervalRef.current = setInterval(() => {
        setTimeLeft(prevTime => {
          if (prevTime <= 1) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
            console.log("Timer reached zero during resume sequence.");
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
              wsRef.current.onclose = () => {
                if (wsRef.current) wsRef.current = null;
                endConsultation();
              };
              wsRef.current.close(1000, "Timer expired");
            } else {
              endConsultation();
            }
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    }

    setIsTranscribing(false);
    setRealtimeStarted(false);

    console.log("Scheduling startRealtimeTranscription after a delay.");
    setTimeout(() => {
      console.log("Calling startRealtimeTranscription from resume.");
      startRealtimeTranscription();
    }, 300);
  };

  const startAudioStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, sampleRate: 16000 });

      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new AudioContext({ sampleRate: 16000 });
        console.log("AudioContext created/re-created in startAudioStream.");
      } else if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
        console.log("AudioContext resumed in startAudioStream.");
      }

      const source = audioContextRef.current.createMediaStreamSource(stream);

      if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current.onaudioprocess = null;
        processorRef.current = null;
        console.log("Old ScriptProcessor disconnected and nulled in startAudioStream.");
      }

      processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);

      source.connect(processorRef.current);
      processorRef.current.connect(audioContextRef.current.destination);

      processorRef.current.onaudioprocess = (e) => {
        if (isPausedRef.current) {
          return;
        }

        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN &&
          audioContextRef.current && audioContextRef.current.state === 'running') {
          const inputData = e.inputBuffer.getChannelData(0);
          const int16Buffer = convertFloat32ToInt16(inputData);
          wsRef.current.send(int16Buffer);
        }
      };

      if (audioContextRef.current.state !== 'running') {
        console.warn(`AudioContext is not 'running' after stream setup in startAudioStream. State: ${audioContextRef.current.state}. Attempting to resume.`);
        await audioContextRef.current.resume();
      }
      console.log("Audio stream processing configured by startAudioStream. AudioContext state:", audioContextRef.current.state);

    } catch (err) {
      console.error('Error accessing microphone or starting audio stream:', err);
      setErrorMessage('Microphone access failed. Please check permissions.');
      toast({
        title: 'Microphone Error',
        description: 'Failed to access microphone. Please ensure permissions are granted and try again.',
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
      if (hasUnsavedChanges) {
        setShowUnsavedModal(true);
        setPendingEndConsult(true);
        return;
      }
      setIsEndingConsultationLoading(true); // Start loading
      // If documentation needs to be generated, trigger it here and await
      if (patientProfileRef.current && patientProfileRef.current.getSuggestion) {
        try {
          await patientProfileRef.current.getSuggestion();
        } catch (e) {
          // Optionally handle error
        }
      }
      setIsEndingConsultation(true); // Only after generation is done
      setIsEndingConsultationLoading(false); // Stop loading
      if (!isPaused && isTranscribing) {
        pauseTranscription();
      }
      if (isMobile && bottomTabIndex !== 0) {
        setBottomTabIndex(0);
        setActiveScreen('documentation');
      }
    } else {
      stopRealtimeTranscription();
      await handleBilling();
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
          await handleBilling();
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
    console.log("Performing end consultation actions.");
    stopRealtimeTranscription();

    setIsSessionPrimed(false);
    setTimeLeft(900);
    setTranscript([]);
    setChatMessages([]);
    setIsBottomTabVisible(false);
    setWsStatus('Disconnected');
    setIsConsultationStarted(false);

    toast({
      title: "Consultation Ended",
      description: "The consultation has been successfully ended.",
      status: "info",
      duration: 3000,
      isClosable: true,
    });

    setIsEndConsultModalOpen(false);
  };

  const handleSaveAndEndWithBilling = async () => {
    setShowUnsavedModal(false);
    setPendingEndConsult(false);
    try {
      if (patientProfileRef.current && patientProfileRef.current.handleSubmitFromParent) {
        const saved = await patientProfileRef.current.handleSubmitFromParent('all');
        if (saved) {
          setIsDocumentationSaved(true);
          setHasUnsavedChanges(false);
          stopRealtimeTranscription();
          await handleBilling();
          performEndConsultation();
        }
      }
    } catch (error) {
      toast({
        title: 'Save Error',
        description: 'Failed to save documentation',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleDiscardAndEndWithBilling = async () => {
    setShowUnsavedModal(false);
    setPendingEndConsult(false);
    stopRealtimeTranscription();
    await handleBilling();
    performEndConsultation();
  };

  const startConsultationSessionFlow = async () => {
    if (phoneNumber !== lastPhoneNumber) {
      setPatientInfo(null);
      setTranscript([]);
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
        duration: 3000,
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
      return true;

    } catch (error) {
      console.error('Error booking appointment:', error);
      toast({
        title: 'Appointment Error',
        description: error.message || 'Failed to book appointment.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return false;
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
    if (index === 1) {
      toggleActiveScreen('chat');
    } else if (index === 0) {
      toggleActiveScreen('document');
    }
  };


  const toggleTranscriptionPanel = () => {
    setIsTranscriptionPanelOpen(!isTranscriptionPanelOpen);
  };

  const toggleTranscription = () => {
    if (isPaused) {
      resumeTranscription();
    } else {
      pauseTranscription();
    }
  };
  useEffect(() => {
    // Ensure documentation tab is default when entering on mobile,
    // but only on initial component mount, not on viewport changes
    if (isMobile) {
      setBottomTabIndex(0);
      setActiveScreen('documentation');
    }
  }, []); // Remove isMobile dependency to prevent resets on viewport changes

  useEffect(() => {
    // Only update isBottomTabVisible based on wsStatus if not paused
    if (!isPaused) {
      setActiveScreen(wsStatus === 'Connected' ? 'chat' : 'voice');
      if (wsStatus === 'Connected') {
        setIsBottomTabVisible(true);
        // only auto-switch to chat on desktop
        if (!isMobile) {
          setBottomTabIndex(1); // Changed to 1 for chat on desktop
        }
      } else {
        setIsBottomTabVisible(false);
      }
    }
  }, [wsStatus, isMobile, isPaused]);

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
    return () => {
      stopRealtimeTranscription();
      stopAudioStream();
    };
  }, []);

  useEffect(() => {
    if (timeLeft <= 1 && isTranscribing) {
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

  useEffect(() => {
    const beforeUnloadHandler = (e) => {
      if (wsStatus === 'Connected' || isConsultationStarted) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };
    window.addEventListener('beforeunload', beforeUnloadHandler);
    const popStateHandler = (e) => {
      if (wsStatus === 'Connected' || isConsultationStarted) {
        window.history.pushState(null, '', window.location.href);
        toast({
          title: 'Cannot Exit',
          description: 'You must end the consultation before leaving this page.',
          status: 'warning',
          duration: 3000,
          isClosable: true,
        });
      }
    };
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', popStateHandler);
    return () => {
      window.removeEventListener('beforeunload', beforeUnloadHandler);
      window.removeEventListener('popstate', popStateHandler);
    };
  }, [wsStatus, isConsultationStarted, toast]);

  useEffect(() => {
    const onUnload = async (e) => {
      if (wsStatus === 'Connected' || isConsultationStarted) {
        await handleBilling();
      }
    };
    window.addEventListener('unload', onUnload);
    return () => window.removeEventListener('unload', onUnload);
  }, [wsStatus, isConsultationStarted, handleBilling]);

  const handleDocumentationChange = useCallback(() => {
    setHasUnsavedChanges(true);
  }, []);

  const handleDocumentationSaved = useCallback(() => {
    setHasUnsavedChanges(false);
  }, []);

  const handleAddPatient = async (requestBody, resetForm) => {
    setAddPatientLoading(true);
    setErrorMessage('');
    try {
      const token = await getAccessToken();
      const response = await fetch('https://health.prestigedelta.com/appointments/create-patient/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });
      const result = await response.json();
      if (response.ok) {
        toast({
          title: 'Patient Added',
          description: 'Patient has been added successfully.',
          status: 'success',
          duration: 4000,
          isClosable: true,
        });
        // Refresh patient list and select the new patient
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
              const resultList = await response.json();
              setDataList(resultList);
              // Select the new patient by id
              if (result.patient_id) {
                setSelectedPatientId(result.patient_id.toString());
                setPhoneNumber(requestBody.phone_number);
              }
            }
          } catch (error) {
            console.error('Error fetching data:', error);
          }
        };
        fetchPatientList();
        setIsAddPatientOpen(false);
        resetForm();
      } else {
        setErrorMessage(result.message || 'Failed to add patient');
      }
    } catch (error) {
      setErrorMessage('An error occurred while adding the patient');
      console.error('Error:', error);
    } finally {
      setAddPatientLoading(false);
    }
  };  const handleSaveAllAndExit = async () => {
    setIsSavingAll(true);
    try {
      if (patientProfileRef.current && patientProfileRef.current.saveAllDocumentation) {
        await patientProfileRef.current.saveAllDocumentation();
        setIsDocumentationSaved(true);
        setHasUnsavedChanges(false);
        await handleBilling();
        performEndConsultation();
        // Navigate to a fresh consult page with reset flag
        navigate('/consult-ai', { state: { reset: true } });
      } else {
        toast({
          title: 'Save Error',
          description: 'Could not access documentation save function',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      toast({
        title: 'Save Error',
        description: 'Failed to save documentation',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSavingAll(false);
    }
  };

  const cancelEndingConsultation = () => {
    setIsEndingConsultation(false);

    if (wsStatus === 'Paused') {
      resumeTranscription();
    }
  };

  return (
    <ChakraProvider>
      <Flex key={pageResetKey} direction="column" height="100vh" bg="gray.100">
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

        <Modal isOpen={showUnsavedModal} onClose={() => setShowUnsavedModal(false)} isCentered>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Unsaved Changes</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              You have unsaved changes in the documentation. Would you like to save before ending the consultation?
            </ModalBody>
            <ModalFooter>
              <Button colorScheme="blue" mr={3} onClick={handleSaveAndEndWithBilling}>
                Save and End
              </Button>
              <Button colorScheme="red" mr={3} onClick={handleDiscardAndEndWithBilling}>
                Discard and End
              </Button>
              <Button variant="ghost" onClick={() => setShowUnsavedModal(false)}>Cancel</Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        <Flex 
          align="center" 
          justify="space-between" 
          bg="white" 
          p="3"
          boxShadow="sm"
          position="sticky" 
          top="0" 
          zIndex="1001"
        >
          <Flex align="center" cursor="pointer" onClick={handleBackClick}>
            <IconButton icon={<AiOutlineArrowLeft />} aria-label="Back" mr="2" variant="ghost" size="md" />
            <Text fontSize="lg" fontWeight="medium">Back</Text>
          </Flex>
          <Box display="flex" alignItems="center">
            <Badge 
              colorScheme={wsStatus === 'Connected' ? 'green' : wsStatus === 'Error' ? 'red' : wsStatus === 'Paused' ? 'yellow' : 'gray'}
              px={3}
              py={1}
              borderRadius="md"
              textTransform="capitalize"
            >
              {wsStatus.toLowerCase()}
            </Badge>
            {isConsultationStarted && wsStatus === 'Connected' && (
              <Text ml="4" fontWeight="bold" color="blue.600" fontSize="lg">
                {formatTime(timeLeft)}
              </Text>
            )}
          </Box>
        </Flex>

        <Flex
          bg="gray.50"
          padding={3}
          justifyContent="space-between"
          alignItems="center"
          boxShadow="sm"
          position="sticky"
          top="60px"
          zIndex="1000"
          borderBottom="1px solid"
          borderColor="gray.200"
        >
          <Flex align="center">
            {!isEndingConsultation ? (
              <>
                <Button
                  onClick={isConsultationStarted ? endConsultation : startConsultationSessionFlow}
                  isDisabled={loading || (!selectedPatientId && !isConsultationStarted) || isEndingConsultationLoading}
                  colorScheme={isConsultationStarted ? "red" : "blue"}
                  mr={3}
                  size="md"
                  isLoading={isEndingConsultationLoading}
                  loadingText="Ending..."
                >
                  {(loading || isEndingConsultationLoading) ? <Spinner size="sm" /> : isConsultationStarted ? 'End Consultation' : 'Start Consultation'}
                </Button>
                {isConsultationStarted && (
                  <>
                    <Tooltip label={isPaused ? "Resume Recording" : "Pause Recording"} placement="bottom">
                      <IconButton
                        icon={isPaused ? <MdPlayArrow /> : <MdPause />}
                        aria-label={isPaused ? "Resume Recording" : "Pause Recording"}
                        variant="solid"
                        colorScheme={isPaused ? "green" : "orange"}
                        size="md"
                        onClick={toggleTranscription}
                        isRound={true}
                        mr={3}
                        boxShadow="md"
                        isDisabled={isEndingConsultation}
                      />
                    </Tooltip>
                    <Tooltip label={isTranscriptionPanelOpen ? "Hide Transcription" : "Show Transcription"} placement="bottom">
                      <IconButton
                        icon={<MdTextFields />}
                        aria-label="Toggle Transcription"
                        variant="ghost"
                        onClick={toggleTranscriptionPanel}
                        isRound={true}
                        size="md"
                        isDisabled={!isTranscribing && wsStatus !== 'Connected' || isEndingConsultation}
                      />
                    </Tooltip>
                  </>
                )}
              </>
            ) : (              <>                <Button
                  onClick={handleSaveAllAndExit}
                  isLoading={isSavingAll}
                  loadingText="Saving..."
                  colorScheme="green"
                  mr={3}
                  size="md"
                  isDisabled={isSavingAll}
                >
                  Save All & Exit
                </Button>
                <Button
                  onClick={cancelEndingConsultation}
                  variant="outline"
                  mr={3}
                  size="md"
                  isDisabled={isSavingAll}
                >
                  Cancel
                </Button>
              </>
            )}
          </Flex>
          <Box /> 
        </Flex>

        <Flex 
          flex="1" 
          overflow="hidden"
          direction="column"
          bg="white"
        >
          {!isConsultationStarted && (
            <Flex
              direction="column"
              align="center"
              justify="center"
              flex="1"
              p={6}
              bg="gray.50"
            >
              <VStack
                spacing={6}
                w="100%"
                maxW="lg"
                bg="white"
                p={8}
                borderRadius="xl"
                boxShadow="xl"
              >
                <Heading size="xl" textAlign="center" color="blue.700">
                  Start New Consultation
                </Heading>

                <FormControl isRequired isInvalid={!!errorMessage}>
                  <FormLabel fontWeight="semibold">Select Patient</FormLabel>
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
                    size="lg"
                  >
                    {dataList.map(patient => (
                      <option key={patient.id} value={patient.id}>
                        {patient.phone_number} {patient.full_name ? `(${patient.full_name})` : ''}
                      </option>
                    ))}
                  </Select>
                  <Button
                    colorScheme="teal"
                    variant="outline"
                    size="sm"
                    mt={2}
                    leftIcon={<AddIcon fontSize="0.8em"/>}
                    onClick={() => setIsAddPatientOpen(true)}
                  >
                    Add New Patient
                  </Button>
                  {errorMessage && (
                    <Alert status="error" mt={4} borderRadius="md">
                      <AlertIcon />
                      {errorMessage}
                    </Alert>
                  )}
                </FormControl>

                {loading && (
                  <VStack spacing={3} mt={4} align="center">
                    <Spinner size="xl" color="blue.500" />
                    <Text textAlign="center" color="gray.600" fontSize="md">
                      {animationMessages[animationIndex]}
                    </Text>
                  </VStack>
                )}
              </VStack>
              <AddPatientModal
                isOpen={isAddPatientOpen}
                onClose={() => setIsAddPatientOpen(false)}
                onAddPatient={handleAddPatient}
                isLoading={addPatientLoading}
              />
            </Flex>
          )}

          {isConsultationStarted && isBottomTabVisible && ( 
            <Flex flex="1" overflow="hidden" direction={isMobile ? "column" : "row"}>
              {!isMobile && (
                <Box flex="1" display="flex" height="100%" position="relative" minW={0}>
                  <Split
                    sizes={isChatCollapsed ? [0, 100] : splitSizes}
                    minSize={isChatCollapsed ? [0, 350] : [300, 350]}
                    maxSize={[700, Infinity]}
                    expandToMin={false}
                    gutterSize={10}
                    gutterAlign="center"
                    snapOffset={30}
                    dragInterval={1}
                    direction="horizontal"
                    cursor="col-resize"
                    onDragEnd={newSizes => {
                      setSplitSizes(newSizes);
                      // If chat was collapsed and user drags its size to be > 10px (threshold)
                      if (isChatCollapsed && newSizes[0] > 10) {
                        setIsChatCollapsed(false);
                      }
                    }}
                    style={{ display: 'flex', width: '100%', height: '100%' }}
                  >
                    {/* Pane 1: Chat Panel (Dr House) */}
                    <Box
                      bg="white"
                      boxShadow="md"
                      zIndex="2"
                      p={0}
                      position="relative"
                      borderRight="1px solid"
                      borderColor="gray.200"
                      display={isChatCollapsed ? 'none' : 'flex'} // This hides the chat panel when collapsed
                      flexDirection="column"
                      minW={0}
                      height="100%"
                    >
                      {/* ... Chat panel header and content ... */}
                      <Flex 
                        align="center" 
                        justify="space-between" 
                        px={4} py={3}
                        borderBottom="1px solid" 
                        borderColor="gray.200" 
                        bg="gray.50"
                      >
                        <Text fontWeight="bold" fontSize="lg" color="gray.700">Dr House</Text>
                        <IconButton
                          icon={<MdChevronLeft />}
                          aria-label="Collapse Chat"
                          size="sm"
                          variant="ghost"
                          onClick={() => setIsChatCollapsed(true)}
                        />
                      </Flex>
                      <Box flex="1" minH={0} overflowY="auto" p={3}>
                        <ChatScreen
                          chatMessages={chatMessages}
                          setChatMessages={setChatMessages}
                          reviewId={reviewId}
                          phoneNumber={phoneNumber}
                          setReviewId={setReviewId}
                          ite={ite}
                          transcript={transcript}
                          thread={thread}
                          patient={patient}
                          hideInput={true}
                          disableOuterScroll={true} 
                        />
                      </Box>
                      <Box 
                        bg="gray.50"
                        px={3} py={2} 
                        borderTop="1px solid" 
                        borderColor="gray.200" 
                        boxShadow="0 -2px 5px -2px rgba(0,0,0,0.05)"
                        flexGrow={0}
                        flexShrink={0}
                      >
                        <ChatScreen
                          chatMessages={chatMessages}
                          setChatMessages={setChatMessages}
                          reviewId={reviewId}
                          phoneNumber={phoneNumber}
                          setReviewId={setReviewId}
                          ite={ite}
                          transcript={transcript}
                          thread={thread}
                          patient={patient}
                          onlyInput={true}
                        />
                      </Box>
                    </Box>

                    {/* Pane 2: Documentation Panel */}
                    <Box
                      bg="white"
                      boxShadow="md"
                      zIndex="1"
                      p={0} // Padding is handled internally now
                      minW={0}
                      height="100%"
                      position="relative" // For absolute positioning of the restore bar
                      display="flex"
                      flexDirection="column"
                    >
                      {isChatCollapsed && (
                        <Box
                          position="absolute"
                          left={0}
                          top={0}
                          bottom={0}
                          width="40px" // Width of the restore bar
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                          zIndex={3} // Ensure it's above documentation content if it ever overlaps (it shouldn't with margin)
                          bg="gray.100"
                          borderRight="1px solid"
                          borderColor="gray.300"
                          cursor="pointer"
                          onClick={() => setIsChatCollapsed(false)}
                          _hover={{ bg: "gray.200" }}
                          title="Expand Chat"
                        >
                          <MdChevronRight size={28} color="gray.600"/>
                        </Box>
                      )}
                      <Flex 
                        align="center" 
                        justifyContent="space-between" 
                        px={4} py={3} 
                        borderBottom="1px solid" 
                        borderColor="gray.200" 
                        bg="gray.50"
                        marginLeft={isChatCollapsed ? '40px' : '0'} // Shift header when chat is collapsed
                        transition="margin-left 0.2s ease-in-out" // Smooth transition for margin shift
                      >
                        <Text fontWeight="bold" fontSize="lg" color="gray.700">Documentation</Text>
                      </Flex>
                      <Box 
                        flex="1" 
                        minH={0} 
                        overflowY="auto" 
                        p={4} 
                        marginLeft={isChatCollapsed ? '40px' : '0'} // Shift content when chat is collapsed
                        transition="margin-left 0.2s ease-in-out" // Smooth transition for margin shift
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
                          onDocumentationChange={handleDocumentationChange}
                          onDocumentationSaved={handleDocumentationSaved}
                          isPaused={isPaused}
                          hideSaveAllButton={isEndingConsultation} // Pass this new prop
                        />
                      </Box>
                    </Box>
                  </Split>
                </Box>
              )}

              {isMobile && (
                <Box 
                  flex="1" 
                  minW={0} 
                  display="flex" 
                  flexDirection="column" 
                  height="100%" 
                  position="relative"
                  overflow="hidden"
                >
                  {/* Chat Tab View */}
                  <Box 
                    flex="1" 
                    p={2} // Reduced padding for mobile
                    display={bottomTabIndex === 1 ? 'flex' : 'none'}
                    flexDirection="column"
                    position="absolute"
                    top={0}
                    left={0}
                    right={0}
                    bottom={0}
                    overflow="hidden"
                  >
                    <ChatScreen
                      chatMessages={chatMessages}
                      setChatMessages={setChatMessages}
                      reviewId={reviewId}
                      phoneNumber={phoneNumber}
                      setReviewId={setReviewId}
                      ite={ite}
                      transcript={transcript}
                      thread={thread}
                      patient={patient}
                    />
                  </Box>
                  
                  {/* Documentation Tab View - optimized for mobile */}
                  <Box 
                    flex="1" 
                    px={1} // Reduced horizontal padding
                    py={2}
                    display={bottomTabIndex === 0 ? 'flex' : 'none'}
                    flexDirection="column"
                    position="absolute"
                    top={0}
                    left={0}
                    right={0}
                    bottom={0}
                    height="calc(100vh - 90px)" // Increased height by reducing subtraction
                    minHeight="85vh" // Increased minimum height to 85% of viewport
                    overflow="auto" // Auto scrolling for content
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
                      onDocumentationChange={handleDocumentationChange}
                      onDocumentationSaved={handleDocumentationSaved}
                      isMobile={isMobile} // Pass isMobile flag to PatientProfile
                      isPaused={isPaused}
                      hideSaveAllButton={isEndingConsultation} // Pass this new prop
                    />
                  </Box>
                </Box>
              )}
            </Flex>
          )}
        </Flex>
        
        {isConsultationStarted && isBottomTabVisible && isMobile && (
          <Box
            w="100%"
            position={'sticky'}
            bottom={'0'}
            left="0"
            right="0"
            zIndex="1000"
            bg="white"
            boxShadow="0 -1px 5px rgba(0,0,0,0.1)" // Reduced shadow
            borderTop="1px solid"
            borderColor="gray.200"
            height="56px" // Increased height for better touch targets
          >
            <Tabs
              index={bottomTabIndex}
              onChange={handleBottomTabChange}
              isFitted
              variant="unstyled"
              colorScheme="blue"
              pt={0} // Removed top padding
              height="100%"
            >
              <TabList 
                justifyContent="space-between" 
                width="100%"
                height="100%"
                css={{
                  '&::-webkit-scrollbar': { height: '0px' }, // Hide scrollbar for cleaner look
                  'scrollbarWidth': 'none',
                  'msOverflowStyle': 'none',
                  'display': 'flex'
                }}
              >
                <Tab 
                  flexDirection="column" 
                  py={0} // No vertical padding
                  px={1} // Minimal horizontal padding
                  minWidth="45%" 
                  maxWidth="45%"
                  height="100%"
                  _selected={{ color: 'blue.500', borderBottom: '2px solid', borderColor: 'blue.500' }}
                  _focus={{ boxShadow: 'none' }}
                >
                  <Flex align="center" justify="center" width="100%" height="100%">
                    <Icon as={MdNotes} w={3} h={3} mr={1}/>
                    <Text fontSize="xs" fontWeight="medium">Documentation</Text>
                  </Flex>
                </Tab>
                <Tab 
                  flexDirection="column" 
                  py={0} // No vertical padding
                  px={1} // Minimal horizontal padding
                  minWidth="45%" 
                  maxWidth="45%"
                  height="100%"
                  _selected={{ color: 'blue.500', borderBottom: '2px solid', borderColor: 'blue.500' }}
                  _focus={{ boxShadow: 'none' }}
                  position="relative"
                >
                  <Flex align="center" justify="center" width="100%" height="100%">
                    <Icon as={MdChatBubbleOutline} w={3} h={3} mr={1}/>
                    <Text fontSize="xs" fontWeight="medium">Dr House</Text>
                    {hasNewMessage && activeScreen === "chat" && (
                       <Box
                          position="absolute"
                          top="4px"
                          right="4px"
                          width="6px"
                          height="6px"
                          borderRadius="50%"
                          bg="red.500"
                          border="1px solid white"
                        />
                    )}
                  </Flex>
                </Tab>
                <Tab 
                  flexDirection="column" 
                  py={0} // No vertical padding
                  px={1} // Minimal horizontal padding
                  minWidth="45%" 
                  maxWidth="45%"
                  height="100%"
                  _selected={{ color: 'blue.500', borderBottom: '2px solid', borderColor: 'blue.500' }}
                  _focus={{ boxShadow: 'none' }}
                >
                  <Flex align="center" justify="center" width="100%" height="100%">
                    <Icon as={MdNotes} w={3} h={3} mr={1}/>
                    <Text fontSize="xs" fontWeight="medium">Documentation</Text>
                  </Flex>
                </Tab>
              </TabList>
            </Tabs>
          </Box>
        )}

        {isTranscriptionPanelOpen && (
          <Box
            position="fixed"
            top={`${boxPosition.top}px`}
            left={`${boxPosition.left}px`}
            bg="white"
            boxShadow="2xl"
            borderRadius="md"
            p={4}
            zIndex="1050"
            cursor={isDragging ? 'grabbing' : 'grab'}
            onMouseDown={handleMouseDown}
            minWidth="300px"
            maxWidth="500px"
          >
            <Flex justify="space-between" align="center" mb={2}>
              <Text fontWeight="bold">Live Transcription</Text>
              <IconButton icon={<CloseIcon />} size="xs" onClick={toggleTranscriptionPanel} aria-label="Close transcription"/>
            </Flex>
            <Box maxHeight="300px" overflowY="auto">
              {transcript.map((item, index) => (
                <Text key={index} fontSize="sm" mb={1}>{item.text}</Text>
              ))}
              {transcript.length === 0 && <Text fontSize="sm" color="gray.500">Waiting for speech...</Text>}
            </Box>
          </Box>
        )}
      </Flex>
    </ChakraProvider>
  );
};

export default ConsultAIPage;