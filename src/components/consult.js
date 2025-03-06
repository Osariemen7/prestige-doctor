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
} from '@chakra-ui/react';
import { MdNotes, MdClose, MdMic, MdStop, MdTextFields } from 'react-icons/md';
import VoiceNoteScreen from './voicenote';
import ChatScreen from './chatScreen';
import { useNavigate } from 'react-router-dom';
import { AiOutlineArrowLeft } from 'react-icons/ai';
import { getAccessToken } from './api';
import PatientProfileDisplay from './document';

const ConsultAIPage = () => {
  // ... (rest of your state variables and refs - same as before)
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
  const [isMobileOriginal] = useMediaQuery('(max-width: 768px)'); // Renamed original isMobile
  const [isDocumentTabMobileForced, setIsDocumentTabMobileForced] = useState(false); // New state for forced mobile doc tab
  const isMobile = isMobileOriginal || isDocumentTabMobileForced; // Combined mobile check
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
  const [boxPosition, setBoxPosition] = useState({ top: 100, left: 20 }); // Initial position

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

  // --- Realtime Transcription Functions --- (same as before - important: keep the FinalTranscript logic)
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
      setIsProfileOpen(true); // Auto-open Patient Profile on WebSocket connect - FIX for auto slide-in
      setTimeLeft(900);
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
    };

    wsRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('Transcription data:', data);

        if (data.message_type === 'FinalTranscript') { // Only process FinalTranscript
          if (data.text) {
            let newText = data.text;
            const lastTranscriptPart = transcript.slice(-newText.length);

            if (lastTranscriptPart.trim() === newText.trim() && lastTranscriptPart.trim() !== "") {
              console.log("Detected repetition (FinalTranscript), skipping:", newText);
              return;
            }
            setTranscript(prev => prev + ' ' + newText);
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
    };

    wsRef.current.onclose = () => {
      console.log('WebSocket closed');
      setWsStatus('Disconnected');
      setIsTranscribing(false);
      setRealtimeStarted(false);
      clearInterval(timerIntervalRef.current);
      setIsBottomTabVisible(false);
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
        const inputData = e.inputBuffer.getChannelData(0);
        const pcmData = convertFloat32ToInt16(inputData);
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(pcmData);
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
  };

  const toggleTranscription = () => {
    if (isTranscribing) {
      stopRealtimeTranscription();
    } else {
      startRealtimeTranscription();
    }
  };

  // --- End Realtime Transcription Functions ---

  // ... (rest of your functions - same as before)
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
        console.log('Appointment booked, starting realtime transcription');
        startRealtimeTranscription();
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
    setIsDocumentTabMobileForced(false); // Also reset forced mobile view when closing profile
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
        setIsProfileOpen(false); // Close profile when switching to Researcher tab
        setIsDocumentTabMobileForced(false); // Reset forced mobile view
      } else if (index === 1) {
        toggleActiveScreen('document'); // Optionally set activeScreen to document if needed
        setIsProfileOpen(true);
        setIsDocumentTabMobileForced(true); // Force mobile style for Document tab on desktop
      }
    } else {
      if (index === 0) {
        toggleActiveScreen('voice');
        setIsProfileOpen(false); // Close profile when switching to Voice tab
        setIsDocumentTabMobileForced(false); // Reset forced mobile view
      } else if (index === 1) {
        toggleActiveScreen('document'); // Optionally set activeScreen to document if needed
        setIsProfileOpen(true);
        setIsDocumentTabMobileForced(true); // Force mobile style for Document tab on desktop
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
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (processorRef.current) processorRef.current.disconnect();
      if (audioContextRef.current) audioContextRef.current.close();
      clearInterval(timerIntervalRef.current);
    };
  }, []);

  return (
    <ChakraProvider>
      <Flex direction="column" height="100vh" bg="gray.50">
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
            <Button onClick={startConsultationSession} isDisabled={loading} colorScheme="blue" marginTop="10px" mr={2}>
              {loading ? <Spinner size="sm" /> : 'Start Consultation'}
            </Button>
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
            <Button
              onClick={toggleTranscription}
              colorScheme={isTranscribing ? 'red' : 'blue'}
              borderRadius="50%"
              width="40px"
              height="40px"
              isDisabled={wsStatus !== 'Connected'}
            >
              <Icon as={isTranscribing ? MdStop : MdMic} boxSize={8} />
            </Button>
            <Text>{isTranscribing ? formatTime(timeLeft) : "Record"}</Text>
          </HStack>
        </Flex>

        {/* Content Area */}
        <Flex flex="1" overflow="hidden" direction={!isMobile && isBottomTabVisible ? "row" : "column" }>

          {/* Left Side (ChatScreen/VoiceNote) - 70% on Desktop */}
          <Box
            width={!isMobile && isBottomTabVisible ? "30%" : "100%"}
            flex="1" // Take remaining space on mobile
            overflow="auto"
            p="2"
            position="relative" // For transcription overlay positioning
          >
            {patientInfo && !(!isMobile && isBottomTabVisible) && ( // Patient Info on top for mobile/default desktop
              <Box bg="white" p="4" mb="4" borderRadius="md" boxShadow="md">
                <Text fontWeight="bold" mb="2">Patient Information</Text>
                {Object.entries(patientInfo).map(([key, value]) => (
                  <Text key={key}><strong>{key}:</strong> {value}</Text>
                ))}
              </Box>
            )}
            <Box display={activeScreen === "voice" ? "block" : "none"}>
              <VoiceNoteScreen
                phoneNumber={phoneNumber}
                setPhoneNumber={setPhoneNumber}
                errorMessage={errorMessage}
                removePhoneNumberInput={false}
                phoneNumberVisible={true}
                wsStatus={wsStatus}
              />
            </Box>
            <Box display={activeScreen === "chat" ? "block" : "none"}>
              <ChatScreen
                chatMessages={chatMessages}
                setChatMessages={setChatMessages}
                reviewId={reviewId}
                phoneNumber={phoneNumber}
                setReviewId={setReviewId}
                ite={ite}
              />
            </Box>

            {/* Transcription Overlay */}
            {isTranscriptionPanelOpen && (
              <Box
                position="fixed" // Overlay position
                top={boxPosition.top} // Use state for top position
                left={boxPosition.left} // Use state for left position
                right="auto" // Remove right to allow left to control horizontal position
                bottom="auto" // Remove bottom to allow top to control vertical position
                maxWidth="400px" // Use max-width for width control - adjust as needed
                height="40vh" // Set a fixed height for the outer box to enable scrolling within it
                bg="rgba(255, 255, 255, 0.95)" // Semi-transparent white background
                zIndex="12" // Higher z-index to overlay everything
                p={5}
                overflowY="auto" // Enable vertical scrolling on the OUTER Box
                borderRadius="md" // Added border radius for a softer look
                boxShadow="lg" // Added box shadow for better visual separation
                onMouseDown={handleMouseDown} // Add mouse down handler to start dragging
                style={{ cursor: 'grab' }} // Change cursor to grab to indicate draggable
              >
                <Flex justify="space-between" align="center" mb={4}>
                  <Text fontWeight="bold" fontSize="lg">Realtime Transcription</Text>
                  <IconButton icon={<MdClose />} aria-label="Close transcription" onClick={toggleTranscriptionPanel} size="sm" />
                </Flex>
                <Box
                  bg="gray.100"
                  p={2}
                  borderRadius="md"
                  overflowY="auto" // Enable vertical scrolling on the INNER Box as well (redundant but good to have)
                  maxHeight="calc(100% - 60px)" // Limit height of inner box to trigger scrolling in outer box - Adjust 60px based on padding/header
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
              p={4}
              display={!isMobile && isBottomTabVisible ? 'block' : 'none'} // Show on desktop when bottom tab is visible
            >
              <Flex justify="space-between" align="center" mb={4} display={!isMobile ? 'none' : 'flex'}> {/* Hide title on desktop split view */}
                <Text fontWeight="bold" fontSize="lg">Patient Profile</Text>
                <IconButton icon={<MdClose />} aria-label="Close profile" onClick={closeProfile} size="sm" />
              </Flex>
              <PatientProfileDisplay reviewid={reviewId} wsStatus={wsStatus} />
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
                p={4}
                transition="transform 0.3s ease-in-out"
                transform={isProfileOpen ? "translateX(0)" : "translateX(100%)"} // Slide in/out
              >
                <Flex justify="space-between" align="center" mb={4}>
                  <Text fontWeight="bold" fontSize="lg">Patient Profile</Text>
                  <IconButton icon={<MdClose />} aria-label="Close profile" onClick={closeProfile} size="sm" />
                </Flex>
                <PatientProfileDisplay reviewid={reviewId} wsStatus={wsStatus} />
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