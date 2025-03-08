import React, { useState, useEffect, useRef } from 'react';
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
} from '@chakra-ui/react';
import { MdNotes, MdClose, MdMic, MdStop, MdTextFields, MdPause, MdPlayArrow, MdMessage } from 'react-icons/md';
import ChatScreen from './chatScreen';
import { useNavigate } from 'react-router-dom';
import { AiOutlineArrowLeft } from 'react-icons/ai';
import { getAccessToken } from './api';
import PatientProfileDisplay from './document';

const pulseAnimation = keyframes`
  0% { transform: scale(1); opacity: 0.8; }
  50% { transform: scale(1.1); opacity: 1; }
  100% { transform: scale(1); opacity: 0.8; }
`;

const ConsultAIPage = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [reviewId, setReviewId] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [wsStatus, setWsStatus] = useState('Disconnected');
  const [errorMessage, setErrorMessage] = useState('');
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [patientInfo, setPatientInfo] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [activeScreen, setActiveScreen] = useState("voice");
  const [bottomTabIndex, setBottomTabIndex] = useState(0);
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
  const [isPaused, setIsPaused] = useState(false);
  const [thread, setThread] = useState('');
  const [isDocumentationSaved, setIsDocumentationSaved] = useState(false); // Track if documentation is saved
  const { isOpen: isSaveModalOpen, onOpen: onSaveModalOpen, onClose: onSaveModalClose } = useDisclosure();
  const patientProfileRef = useRef(null);


  const animationMessages = [
    "Warming up the microphone...",
    "Connecting to our server...",
    "Preparing consultation...",
    "Almost ready!",
  ];
  const timerRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const navigate = useNavigate();
  const toast = useToast();
  const [isMobileOriginal] = useMediaQuery('(max-width: 768px)');
  const [isDocumentTabMobileForced, setIsDocumentTabMobileForced] = useState(false);
  const isMobile = isMobileOriginal || isDocumentTabMobileForced;
  const wsRef = useRef(null);
  const audioContextRef = useRef(null);
  const processorRef = useRef(null);
  const [toke, setTok] = useState('');
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
  };

  // Drag state and handlers for transcription box
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartPosition, setDragStartPosition] = useState({ x: 0, y: 0 });
  const [boxPosition, setBoxPosition] = useState({ top: 100, left: 20 });

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStartPosition({
      x: e.clientX,
      y: e.clientY,
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;

    const deltaX = e.clientX - dragStartPosition.x;
    const deltaY = e.clientY - dragStartPosition.y;

    setBoxPosition((prevPosition) => ({
      top: prevPosition.top + deltaY,
      left: prevPosition.left + deltaX,
    }));

    setDragStartPosition({
      x: e.clientX,
      y: e.clientY,
    });
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
    const fetchTranscriptWithToken = async () => {
      const tok = await getAccessToken();
      try {
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
        const tokenData = await tokenRes.json();
        setTok(tokenData.token);
        console.log("AssemblyAI token:", tokenData.token);
      } catch (error) {
        console.error("Error initializing AssemblyAI:", error);
      }
    };
    fetchTranscriptWithToken();
    const interval = setInterval(() => {
      fetchTranscriptWithToken();
    }, 249000);
    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    const token = getAccessToken();
    if (phoneNumber.length === 11) {
      fetch(`https://health.prestigedelta.com/patientreviews/${phoneNumber}/`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
        .then((res) => {
          if (!res.ok) throw new Error('Network response was not ok');
          return res.json();
        })
        .then((data) => setPatientInfo(data))
        .catch((error) => console.error('Failed to fetch patient info:', error));
    } else {
      setPatientInfo(null);
    }
  }, [phoneNumber]);

  // --- Realtime Transcription Functions ---
  const startRealtimeTranscription = () => {
    const sampleRate = 16000;
    if (!toke) {
      console.error("No AssemblyAI token available");
      return;
    }
    const socketUrl = `wss://api.assemblyai.com/v2/realtime/ws?sample_rate=${sampleRate}&token=${toke}`;
    wsRef.current = new WebSocket(socketUrl);

    wsRef.current.onopen = () => {
      console.log('WebSocket connected');
      startAudioStream();
      setIsTranscribing(true);
      setRealtimeStarted(true);
      setIsBottomTabVisible(true);
      setIsTranscriptionPanelOpen(false);
      setWsStatus('Connected');
      setIsProfileOpen(true);
      setTimeLeft(900);
      if (!isPaused) { // Start timer only if not paused initially
        timerIntervalRef.current = setInterval(() => {
          setTimeLeft((prevTime) => {
            if (prevTime <= 1) {
              clearInterval(timerIntervalRef.current);
              stopRealtimeTranscription();
              setIsBottomTabVisible(false);
              return 0;
            } else {
              return prevTime - 1;
            }
          });
        }, 1000);
      }
    };

    wsRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('Transcription data:', data);

        if (data.message_type === 'FinalTranscript') {
          if (data.text) {
            setTranscript(prev => prev + (prev ? '\n\n' : '') + data.text); // Add newline for each final transcript and extra line for paragraph spacing
          }
        } else if (data.message_type === 'PartialTranscript') {
          console.log("Ignoring PartialTranscript message:", data);
        }
      } catch (err) {
        console.error('Error parsing message:', err);
      }
    };

    wsRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      clearInterval(timerIntervalRef.current);
      setIsBottomTabVisible(false);
      setWsStatus('Disconnected'); // Ensure status is updated on error
      setIsTranscribing(false); // Ensure transcribing state is updated on error
      setRealtimeStarted(false); // Ensure realtimeStarted state is updated on error
      setIsPaused(false); // Reset pause state on websocket error
    };

    wsRef.current.onclose = () => {
      console.log('WebSocket closed');
      setWsStatus('Disconnected');
      setIsTranscribing(false);
      setRealtimeStarted(false);
      clearInterval(timerIntervalRef.current);
      setIsBottomTabVisible(false);
      setIsPaused(false); // Reset pause state on websocket close
    };
  };

  const startAudioStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new AudioContext({ sampleRate: 16000 });
      const source = audioContextRef.current.createMediaStreamSource(stream);
      processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);
      source.connect(processorRef.current);
      processorRef.current.connect(audioContextRef.current.destination);

      processorRef.current.onaudioprocess = (e) => {
        if (!isPaused) { // Only send data if not paused
          const inputData = e.inputBuffer.getChannelData(0);
          const pcmData = convertFloat32ToInt16(inputData);
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(pcmData);
          }
        }
      };
    } catch (err) {
      console.error('Error accessing microphone:', err);
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
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setIsTranscribing(false);
    setRealtimeStarted(false);
    clearInterval(timerIntervalRef.current);
    setIsBottomTabVisible(false);
    setIsPaused(false);
  };

  const toggleTranscription = () => {
    if (isTranscribing) {
      pauseTranscription(); // Changed to pause instead of stop for pause/play functionality
    } else {
      if (isPaused) {
        // Resume transcription logic - restart websocket and timer
        startRealtimeTranscription();
        setIsPaused(false);
      } else {
        startConsultationSessionFlow(); // Start new consultation flow
      }
    }
  };


  const pauseTranscription = () => {
    if (!isPaused) {
      setIsPaused(true);
      clearInterval(timerIntervalRef.current);
      stopAudioProcessing(); // Call new function to stop audio processing
    } else {
      setIsPaused(false);
      startAudioProcessing(); // Call new function to start audio processing
      if (wsStatus === 'Connected' && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        // If websocket is still open and status is connected, resume timer
        timerIntervalRef.current = setInterval(() => {
          setTimeLeft((prevTime) => {
            if (prevTime <= 1) {
              clearInterval(timerIntervalRef.current);
              stopRealtimeTranscription(); // Stop if time runs out even when paused and resumed
              setIsBottomTabVisible(false);
              return 0;
            } else {
              return prevTime - 1;
            }
          });
        }, 1000);
      } else {
        // If websocket is closed (maybe due to inactivity or error during pause), try to reconnect
        startRealtimeTranscription(); // Re-establish websocket and audio stream
      }
    }
  };

  const stopAudioProcessing = () => {
    if (processorRef.current) {
      processorRef.current.disconnect(); // Disconnect processor from destination
      processorRef.current.onaudioprocess = null; // Clear audio process handler
    }
    if (audioContextRef.current && audioContextRef.current.state === 'running') {
      audioContextRef.current.suspend(); // Suspend audio context, but keep it alive
    }
  };

  const startAudioProcessing = async () => {
    try {
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume(); // Resume audio context if suspended
      } else if (!audioContextRef.current) {
        // If audio context is not initialized (maybe after a full stop and restart), re-initialize stream
        startAudioStream(); // Re-initialize audio stream if context is lost.
        return; // Early return to avoid setting onaudioprocess again immediately if stream restart needed.
      }


      if (processorRef.current) {
        processorRef.current.connect(audioContextRef.current.destination); // Reconnect processor
        processorRef.current.onaudioprocess = (e) => { // Re-set audio process handler
          if (!isPaused) {
            const inputData = e.inputBuffer.getChannelData(0);
            const pcmData = convertFloat32ToInt16(inputData);
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
              wsRef.current.send(pcmData);
            }
          }
        };
      } else {
        startAudioStream(); // If processor is lost, restart entire audio stream setup.
      }
    } catch (err) {
      console.error('Error restarting audio processing:', err);
    }
  };

  const stopAudioStream = () => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  };


  const endConsultation = async () => {
    if (!isDocumentationSaved) {
      // Automatically trigger save in PatientProfileDisplay if documentation is not saved
      if (patientProfileRef.current && patientProfileRef.current.handleSubmitFromParent) {
        const saveSuccessful = await patientProfileRef.current.handleSubmitFromParent();
        if (saveSuccessful) {
          setIsDocumentationSaved(true); // Only set to true if save was successful
          performEndConsultation(); // Proceed to end consultation after successful save
        } else {
          // Handle save failure, maybe show a toast or message
          toast({
            title: 'Save Failed',
            description: 'Failed to save documentation. Please try again.',
            status: 'error',
            duration: 3000,
            isClosable: true,
          });
          return; // Stop end consultation if save failed
        }
      } else {
        onSaveModalOpen(); // Fallback to modal if ref or handleSubmit function is not available (though it should be)
      }
    } else {
      performEndConsultation(); // Proceed if documentation is already saved
    }
  };

  const performEndConsultation = () => {
    stopRealtimeTranscription();
    setIsConsultationStarted(false);
    setPhoneNumber('');
    setReviewId('');
    setTranscript('');
    setIsBottomTabVisible(false);
    setIsDocumentationSaved(false); // Reset documentation saved state for new consultation
    toast({
      title: 'Consultation Ended',
      description: 'Consultation has been ended and ready for new session.',
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };


  // --- End Realtime Transcription Functions ---

  const startConsultationSessionFlow = async () => {
      if (!isConsultationStarted) { // Only execute if consultation hasn't started yet
          await startConsultationSession(); // Book appointment first
          setIsConsultationStarted(true); // Mark consultation as started
      }
      startRealtimeTranscription(); // Then, start transcription
  };


  const startConsultationSession = async () => {
    if (phoneNumber.length !== 11) {
      setErrorMessage('Please enter a valid 11-digit phone number');
      toast({
        title: 'Invalid Phone Number',
        description: 'Please enter a valid 11-digit phone number',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    setErrorMessage('');
    setLoading(true);

    const phone_number = phoneNumber ? `+234${phoneNumber.slice(1)}` : '';
    const data = {
      start_time: '2025-01-25 09:00',
      reason: 'Routine Check',
      phone_number,
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

      if (response.ok) {
        const result = await response.json();
        setIte(result);
        setReviewId(result.appointment.review_id);
        setThread(result.appointment.thread_id);

        console.log('Appointment booked');
        // Transcription starts in startConsultationSessionFlow now
      } else {
        throw new Error('Failed to book the appointment.');
      }
    } catch (error) {
      console.error(error);
      toast({
        title: 'Appointment Error',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBackClick = () => {
    navigate('/dashboard');
  };

  const toggleProfile = async () => {
    setIsProfileOpen(prev => !prev);
  };

  const closeProfile = () => {
    setIsProfileOpen(false);
    setIsDocumentTabMobileForced(false);
  };

  const toggleActiveScreen = (screenName) => {
    setActiveScreen(screenName);
    if (screenName === "chat") {
      setHasNewMessage(false);
    }
  };

  const handleBottomTabChange = (index) => {
    setBottomTabIndex(index);
    if (wsStatus === 'Connected') {
      if (index === 0) {
        toggleActiveScreen('chat');
        setIsProfileOpen(false);
        setIsDocumentTabMobileForced(false);
      } else if (index === 1) {
        toggleActiveScreen('document');
        setIsProfileOpen(true);
        setIsDocumentTabMobileForced(true);
      }
    } else {
      if (index === 0) {
        toggleActiveScreen('chat');
        setIsProfileOpen(false);
        setIsDocumentTabMobileForced(false);
      } else if (index === 1) {
        toggleActiveScreen('document');
        setIsProfileOpen(true);
        setIsDocumentTabMobileForced(true);
      }
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
    return () => {
      if (animationInterval) clearInterval(animationInterval);
    };
  }, [loading]);

  useEffect(() => {
    if (wsStatus === 'Connected') {
      setActiveScreen('chat'); // Automatically switch to chat screen on websocket connect
    } else {
      setActiveScreen('voice'); // Default to voice screen when disconnected or initially loading
    }
  }, [wsStatus]);


  useEffect(() => {
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (processorRef.current) processorRef.current.disconnect();
      if (audioContextRef.current) audioContextRef.current.close();
      clearInterval(timerIntervalRef.current);
    };
  }, []);

  const isRecordButtonVisible = !isConsultationStarted && wsStatus !== 'Connected'; // Show record only when not started and disconnected
  const isStopButtonVisible = isConsultationStarted && isTranscribing && !isPaused;
  const isPausePlayButtonVisible = isConsultationStarted && isTranscribing;
  const animation = `${pulseAnimation} 2s linear infinite`;


  return (
    <ChakraProvider>
      <Flex direction="column" height="100vh" bg="gray.50">
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
        <Flex align="center" justify="space-between" bg="white" p="4" boxShadow="md" position="sticky" top="0" zIndex="1">
          <Flex align="center" cursor="pointer" onClick={handleBackClick}>
            <IconButton icon={<AiOutlineArrowLeft />} aria-label="Back" mr="2" variant="ghost" />
            <Text fontSize="lg" fontWeight="medium">Back</Text>
          </Flex>
          <Badge colorScheme={wsStatus === 'Connected' ? 'green' : 'red'}>
            {wsStatus}
          </Badge>
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
            {!isConsultationStarted && wsStatus !== 'Connected' && ( // Conditionally render phone input
              <Input
                placeholder="Enter patient's phone number"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                mr={2}
                maxWidth="50%"
              />
            )}
            {!isConsultationStarted ? (
              <Button onClick={startConsultationSessionFlow} isDisabled={loading} colorScheme="blue" mr={1}>
                {loading ? <Spinner size="sm" /> : 'Start Consultation'}
              </Button>
            ) : (
              <Button colorScheme="red" mr={2} onClick={endConsultation} isDisabled={!isConsultationStarted}>
                End Consultation
              </Button>
            )}
            <Tooltip label={isTranscriptionPanelOpen ? "Hide Transcription" : "Show Transcription"} placement="bottom">
              <IconButton
                icon={<MdTextFields />}
                aria-label="Toggle Transcription"
                variant="ghost"
                onClick={toggleTranscriptionPanel}
                isRound={true}
              />
            </Tooltip>
          </Flex>
          <HStack mt={2} justify="center">
            {isPausePlayButtonVisible && (
              <>
                {!isPaused ? ( // Show Pause button when not paused
                  <Box
                    width="40px"
                    height="40px"
                    borderRadius="50%"
                    bg="blue.200"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    mr={2}
                    animation={animation}
                  >
                    <IconButton
                      onClick={pauseTranscription}
                      aria-label="Pause Transcription"
                      icon={<Icon as={MdPause} boxSize={6} color="blue.600" />}
                      variant="ghost"
                      isRound={true}
                    />
                  </Box>
                ) : ( // Show Play button when paused
                  <Box
                    width="40px"
                    height="40px"
                    borderRadius="50%"
                    bg="gray.200"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    mr={2}
                  >
                    <IconButton
                      onClick={pauseTranscription} // Toggling pause state will handle play/resume
                      aria-label="Resume Transcription"
                      icon={<Icon as={MdPlayArrow} boxSize={6} color="gray.600" />}
                      variant="ghost"
                      isRound={true}
                    />
                  </Box>
                )}

            </>
            )}

            <Text>{isTranscribing && !isPaused ? formatTime(timeLeft) : ""}</Text>
          </HStack>
        </Flex>

        {/* Content Area */}
        <Flex flex="1" overflow="hidden" direction={!isMobile && isBottomTabVisible ? "row" : "column" }>

          {/* Left Side (ChatScreen/VoiceNote) - 70% on Desktop */}
          <Box
            width={!isMobile && isBottomTabVisible ? "30%" : "100%"}
            flex="1"
            overflow="auto"
            p="2"
            position="relative"
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
            {/* Chat Screen - Displayed when wsStatus is connected and activeScreen is chat */}
            <Box display={activeScreen === "chat" ? "block" : "none"}>
              <ChatScreen
                chatMessages={chatMessages}
                setChatMessages={setChatMessages}
                reviewId={reviewId}
                phoneNumber={phoneNumber}
                setReviewId={setReviewId}
                ite={ite}
                transcript={transcript}
                thread = {thread}
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

          {/* Right Side (Document Panel) - 30% on Desktop, Slide-in on Mobile */}
          { (isBottomTabVisible) && (
            <Box
              width={!isMobile && isBottomTabVisible ? "70%" : "100%"}
              bg="white"
              boxShadow="md"
              zIndex="2"
              overflowY="auto"
              p={1}
              display={!isMobile && isBottomTabVisible ? 'block' : 'none'}
            >
              <Flex justify="space-between" align="center" mb={2} display={!isMobile ? 'none' : 'flex'}>
                <Text fontWeight="bold" fontSize="lg">Patient Profile</Text>
                <IconButton icon={<MdClose />} aria-label="Close profile" onClick={closeProfile} size="sm" />
              </Flex>
              <PatientProfileDisplay thread={thread} reviewid={reviewId} wsStatus={wsStatus} setIsDocumentationSaved={setIsDocumentationSaved} transcript={transcript} ref={patientProfileRef} />
            </Box>
          )}

            {/* Mobile Document Slide-in */}
            {isMobile && isBottomTabVisible && isProfileOpen && (
              <Box
                position="fixed"
                top="0"
                left="0"
                right="0"
                bottom="0"
                bg="white"
                boxShadow="md"
                zIndex="1100"
                overflowY="auto"
                p={2}
                transition="transform 0.3s ease-in-out"
                transform={isProfileOpen ? "translateX(0)" : "translateX(100%)"}
              >
                <Flex justify="space-between" align="center" mb={2}>
                  <Text fontWeight="bold" fontSize="lg">Patient Profile</Text>
                  <IconButton icon={<MdClose />} aria-label="Close profile" onClick={closeProfile} size="sm" />
                </Flex>
                <PatientProfileDisplay reviewid={reviewId} wsStatus={wsStatus} setIsDocumentationSaved={setIsDocumentationSaved} transcript={transcript} ref={patientProfileRef}/>
              </Box>
            )}
        </Flex>

        {/* Bottom Tabs */}
        {isBottomTabVisible && (
          <Center
            w="100%"
            mx="auto"
            position={isMobile ? 'fixed' : 'static'}
            bottom={isMobile ? '0' : undefined}
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