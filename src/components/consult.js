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
import { MdNotes, MdClose, MdMic, MdStop, MdTextFields } from 'react-icons/md'; // Using MdTextFields for pen icon
import VoiceNoteScreen from './voicenote';
import ChatScreen from './chatScreen';
import { useNavigate } from 'react-router-dom';
import { AiOutlineArrowLeft } from 'react-icons/ai';
import { getAccessToken } from './api';
import PatientProfileDisplay from './document';
import { AssemblyAI } from 'assemblyai'; // used only for token generation in this example

const ConsultAIPage = () => {
  // Basic state & refs
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
  const [isBottomTabVisible, setIsBottomTabVisible] = useState(false); // For bottom tab visibility
  const [timeLeft, setTimeLeft] = useState(900); // Timer state
  const [isTranscriptionPanelOpen, setIsTranscriptionPanelOpen] = useState(false); // For transcription panel visibility

  // Realtime transcription states
  const [transcript, setTranscript] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [realtimeStarted, setRealtimeStarted] = useState(false);

  // Animation messages (optional)
  const [animationIndex, setAnimationIndex] = useState(0);
  const animationMessages = [
    "Warming up the microphone...",
    "Connecting to our server...",
    "Preparing consultation...",
    "Almost ready!",
  ];
  const timerRef = useRef(null);
  const timerIntervalRef = useRef(null); // Ref for the timer interval

  const navigate = useNavigate();
  const toast = useToast();
  const [isMobile] = useMediaQuery('(max-width: 768px)');

  // Refs for realtime transcription via WebSocket and audio processing
  const wsRef = useRef(null);
  const audioContextRef = useRef(null);
  const processorRef = useRef(null);

  // AssemblyAI token state
  const [toke, setTok] = useState('');

  // Function to format time in MM:SS
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
  };

  // Fetch the AssemblyAI token from your endpoint
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
  }, []);

  // Fetch patient info when phone number has correct length
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

  console.log(reviewId)
  // --- Realtime Transcription Functions ---

  // Start realtime transcription by opening the WebSocket connection
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
      setIsBottomTabVisible(true); // Show bottom tab on connection
      setIsTranscriptionPanelOpen(true); // Open transcription panel by default on desktop
      setWsStatus('Connected');
      // Start Timer
      setTimeLeft(900);
      timerIntervalRef.current = setInterval(() => {
        setTimeLeft((prevTime) => {
          if (prevTime <= 1) {
            clearInterval(timerIntervalRef.current);
            stopRealtimeTranscription(); // Auto disconnect on timer end
            setIsBottomTabVisible(false); // Hide bottom tab after disconnect if needed
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
        if (data.text) {
          setTranscript(prev => prev + ' ' + data.text);
        }
      } catch (err) {
        console.error('Error parsing message:', err);
      }
    };

    wsRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      clearInterval(timerIntervalRef.current); // Clear timer on error
      setIsBottomTabVisible(false); // Hide bottom tab on error if needed
    };

    wsRef.current.onclose = () => {
      console.log('WebSocket closed');
      setWsStatus('Disconnected');
      setIsTranscribing(false);
      setRealtimeStarted(false);
      clearInterval(timerIntervalRef.current); // Clear timer on close
      setIsBottomTabVisible(false); // Hide bottom tab on close if needed
    };
  };

  // Capture and stream audio via the Web Audio API
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

  // Convert Float32Array to 16-bit PCM ArrayBuffer
  const convertFloat32ToInt16 = (buffer) => {
    const l = buffer.length;
    const int16Buffer = new Int16Array(l);
    for (let i = 0; i < l; i++) {
      let s = Math.max(-1, Math.min(1, buffer[i]));
      int16Buffer[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return int16Buffer.buffer;
  };

  // Stop realtime transcription by closing the WebSocket and cleaning up audio streams
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
    clearInterval(timerIntervalRef.current); // Clear timer when manually stopped
    setIsBottomTabVisible(false); // Hide bottom tab when manually stopped if needed
  };

  // Toggle realtime transcription on/off
  const toggleTranscription = () => {
    if (isTranscribing) {
      stopRealtimeTranscription();
    } else {
      startRealtimeTranscription();
    }
  };

  // --- End Realtime Transcription Functions ---

  // Modified Start Consultation function (does not switch screens automatically)
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
        // Start realtime transcription but do not switch to chat screen automatically.
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

  // Navigation and UI helper functions
  const handleBackClick = () => {
    navigate('/dashboard');
  };

  const toggleProfile = async () => {
    setIsProfileOpen(prev => !prev);
  };

  const closeProfile = () => {
    setIsProfileOpen(false);
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
      } else if (index === 1) {
        toggleProfile();
      }
    } else {
      if (index === 0) {
        toggleActiveScreen('voice');
      } else if (index === 1) {
        toggleProfile();
      }
    }
  };


  const toggleTranscriptionPanel = () => {
    setIsTranscriptionPanelOpen(!isTranscriptionPanelOpen);
  };

  // Animation messages effect
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

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (processorRef.current) processorRef.current.disconnect();
      if (audioContextRef.current) audioContextRef.current.close();
      clearInterval(timerIntervalRef.current); // Clear timer on unmount
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
              isDisabled={wsStatus !== 'Connected'} // Disable when not connected
            >
              <Icon as={isTranscribing ? MdStop : MdMic} boxSize={8} />
            </Button>
            <Text>{isTranscribing ? formatTime(timeLeft) : "Record"}</Text>
          </HStack>
        </Flex>

        {/* Transcription Section (Desktop - Above Content in full width) */}
       


        {/* Content Area */}
        <Flex flex="1" overflow="hidden" direction={!isMobile && isBottomTabVisible ? "row" : "column" }> {/* Row direction on desktop with bottom tab visible */}

          {/* Launch Researcher (Chat Screen) - Left on Desktop */}
          {(!isMobile && isBottomTabVisible) && (
            <Box
              width="30%"
              overflow="auto"
              p="2"
              bg="white"
              boxShadow="md"
              borderRadius="md"
              mr={2}
              order={1} // Position to the left
              display={activeScreen === "chat" ? "block" : "none"} // Show ChatScreen
            >
              <ChatScreen
                chatMessages={chatMessages}
                setChatMessages={setChatMessages}
                reviewId={reviewId}
                setReviewId={setReviewId}
                ite={ite}
              />
            </Box>
          )}
           {/* Transcription Section (Desktop) - Middle */}
          {(!isMobile && isBottomTabVisible && isTranscriptionPanelOpen) && (
            <Box
              width="26%" // Desktop Transcription width
              overflow="auto"
              p="2"
              bg="white"
              boxShadow="md"
              borderRadius="md"
              mr={2} // Add some right margin
              order={2} // Position in the middle
            >
              <Text fontSize="sm" color="gray.600" fontWeight="bold" mb="2">Transcription</Text>
              <Box bg="gray.100" p={2} borderRadius="md" h="calc(100% - 50px)" overflowY="auto"> {/* Adjust height as needed */}
                <Text fontSize="md">{transcript}</Text>
              </Box>
            </Box>
          )}

          <Box flex="1" overflow="auto" p="2" maxWidth={(!isMobile && isBottomTabVisible) ? 'auto' : (isProfileOpen && !isMobile ? '40%' : '100%')} transition="max-width 0.3s" order={(!isMobile && isBottomTabVisible) ? 3 : 1 }>
            {patientInfo && !(!isMobile && isBottomTabVisible) && ( // Hide patient info section on desktop when bottom tab is visible and layout is changed
              <Box bg="white" p="4" mb="4" borderRadius="md" boxShadow="md">
                <Text fontWeight="bold" mb="2">Patient Information</Text>
                {Object.entries(patientInfo).map(([key, value]) => (
                  <Text key={key}><strong>{key}:</strong> {value}</Text>
                ))}
              </Box>
            )}
            {/* Both screens are always mounted; visibility toggled via CSS */}
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

             {/* Transcription Section (Mobile - full width) */}
            {isMobile && realtimeStarted && isTranscriptionPanelOpen && (
              <Box mt={2} p={2} bg="white" boxShadow="md" borderRadius="md" width="100%">
                <Text fontSize="sm" color="gray.600">Realtime Transcript:</Text>
                <Text fontSize="md">{transcript}</Text>
              </Box>
            )}
          </Box>


          {/* Patient Profile Display (Document panel) - Right on Desktop */}
          {(isMobile || isProfileOpen || (!isMobile && isBottomTabVisible)) && ( // Keep profile open on desktop if bottom tab is visible
            <Box
              position={isMobile ? 'fixed' : (!isMobile && isBottomTabVisible ? 'relative' : 'relative')} // Keep relative on desktop when bottom tab visible
              top="0"
              right={isMobile ? (isProfileOpen ? '0' : '-100%') : (!isMobile && isBottomTabVisible ? '0' : isProfileOpen ? '0' : '-60%')} // Always show on desktop if bottom tab is visible
              height={isMobile ? '100vh' : (!isMobile && isBottomTabVisible ? 'auto' : '100%')} // Auto height on desktop when bottom tab visible
              width={isMobile ? '100%' : (!isMobile && isBottomTabVisible ? '44%' : '64%')} // Adjust width on desktop when bottom tab visible
              bg="white"
              boxShadow="md"
              transition={isMobile ? 'right 0.3s' : 'right 0.3s, max-width 0.3s'}
              zIndex="2"
              overflowY="auto"
              p={1}
              display={(!isMobile && isBottomTabVisible) && 'block'} // Show as side panel on desktop when bottom tab is visible
              order={4} // Position to the right on desktop
            >
              <Flex justify="space-between" align="center" mb={1}>
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
         {/* Transcription Section Toggle for Mobile - Always Visible */}
        
           {realtimeStarted && isTranscriptionPanelOpen && isMobile && ( // Mobile Transcript Box
          <Box mt={2} p={2} bg="white" boxShadow="md" borderRadius="md" width="100%" position="fixed" bottom="50px" zIndex="1100" maxHeight="30vh" overflowY="auto"> {/* Adjust maxHeight and bottom as needed */}
            <Text fontSize="sm" color="gray.600">Realtime Transcript:</Text>
            <Text fontSize="md">{transcript}</Text>
          </Box>
        )}
      </Flex>
    </ChakraProvider>
  );
};

export default ConsultAIPage;