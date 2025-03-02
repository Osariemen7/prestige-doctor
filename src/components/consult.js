import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  ChakraProvider,
  Button,
  Flex,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  Text,
  Badge,
  IconButton,
  useMediaQuery,
  useToast,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  HStack,
  Icon,
  Spinner,
  Center // Import Center
} from '@chakra-ui/react';
import { MdNotes, MdClose, MdMic, MdStop } from 'react-icons/md';
import VoiceNoteScreen from './voicenote';
import ChatScreen from './chatScreen';
import { useNavigate } from 'react-router-dom';
import { AiOutlineArrowLeft } from 'react-icons/ai';
import { getAccessToken } from './api';
import PatientProfileDisplay from './document';

const ConsultAIPage = () => {
  const [wsStatus, setWsStatus] = useState('Disconnected');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [reviewId, setReviewId] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const currentReviewId = useRef(null);
  const [oobRequestType, setOobRequestType] = useState('summary');
  const [oobRequestDetails, setOobRequestDetails] = useState('');
  const [oobResponse, setOobResponse] = useState([]);
  const [debugLogs, setDebugLogs] = useState([]);
  const [ite, setItem] = useState({});
  const [lastDocumentedAt, setLastDocumentedAt] = useState(null);
  const [showDocumentDialog, setShowDocumentDialog] = useState(false);
  const [patientInfo, setPatientInfo] = useState(null);
  const [documen, setDocumen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [activeScreen, setActiveScreen] = useState("voice"); // Default to voice on initial load - Corrected default to voice
  const [isMobile] = useMediaQuery('(max-width: 768px)');
  const [bottomTabIndex, setBottomTabIndex] = useState(0);

  // States lifted from VoiceNoteScreen for persistent controls
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(900);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [loading, setLoading] = useState(false);
  const [shouldStartRecording, setShouldStartRecording] = useState(false);
  const [animationIndex, setAnimationIndex] = useState(0);
  const animationMessages = [
    "Warming up the microphone...",
    "Connecting to our server...",
    "Preparing consultation...",
    "Almost ready!",
  ];
  const timerRef = useRef(null);

  const ws = useRef(null);
  const navigate = useNavigate();
  const toast = useToast();
  const audioContext = useRef(null);
  const audioStream = useRef(null);
  const scriptProcessor = useRef(null);
  const desiredSampleRate = 16000;

  const log = (message) => {
    const time = new Date().toLocaleTimeString();
    setDebugLogs((prev) => [...prev, `[${time}] ${message}`]);
  };

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
          if (!res.ok) {
            throw new Error('Network response was not ok');
          }
          return res.json();
        })
        .then((data) => setPatientInfo(data))
        .catch((error) => {
          console.error('Failed to fetch patient info:', error);
        });
    } else {
      setPatientInfo(null);
    }
  }, [phoneNumber]);

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
      const response = await fetch(
        'https://health.prestigedelta.com/appointments/book/',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(data),
        }
      );

      if (response.ok) {
        const result = await response.json();
        setItem(result.appointment);
        console.log('Appointment booked, call begins');
        await connectWebSocket(result.appointment.id);
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

    // ---------------------------
  // Recording Functions
  // ---------------------------
  const startRecording = async () => {
    if (isRecording) return; // Prevent starting recording if already recording

    log('Attempting to start recording...');
    if (!ws?.current || ws.current.readyState !== WebSocket.OPEN) {
      log('WebSocket is not connected.');
      alert('WebSocket is not connected. Please set up the session first.');
      return;
    }
    try {
      audioContext.current =
        audioContext.current ||
        new (window.AudioContext || window.webkitAudioContext)({
          sampleRate: desiredSampleRate,
        });
      audioStream.current = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: desiredSampleRate,
          channelCount: 1,
        },
      });
      const sourceNode = audioContext.current.createMediaStreamSource(audioStream.current);
      scriptProcessor.current = audioContext.current.createScriptProcessor(2048, 1, 1);
      scriptProcessor.current.onaudioprocess = (audioProcessingEvent) => {
        const inputBuffer = audioProcessingEvent.inputBuffer.getChannelData(0);
        const pcmBuffer = pcmEncode(inputBuffer);
        if (ws.current?.readyState === WebSocket.OPEN) {
          ws.current.send(pcmBuffer);
        }
      };
      sourceNode.connect(scriptProcessor.current);
      scriptProcessor.current.connect(audioContext.current.destination);
      // Timer setup
      setTimeElapsed(0);
      setRecordingTime(900);
      const interval = setInterval(() => {
        setTimeElapsed((prev) => prev + 1);
        setRecordingTime((prev) => {
          if (prev <= 0) {
            stopRecording(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      timerRef.current = interval;
      setIsRecording(true);
      log('Recording started.');
    } catch (error) {
      log(`Error starting recording: ${error.message}`);
      alert('Error accessing microphone. Please ensure microphone permissions are granted.');
    }
  };

  const stopRecording = async (shouldDisconnect) => {
    log('Attempting to stop recording...');
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (scriptProcessor.current) {
      scriptProcessor.current.disconnect();
      scriptProcessor.current.onaudioprocess = null;
      scriptProcessor.current = null;
    }
    if (audioStream.current) {
      audioStream.current.getTracks().forEach((track) => track.stop());
      audioStream.current = null;
    }
    setRecordingTime(900);
    setIsRecording(false);
    log('Recording stopped.');
    handleBilling();
    if (shouldDisconnect) {
      disconnectWebSocket();
    }
  };

  const pcmEncode = (input) => {
    const buffer = new ArrayBuffer(input.length * 2);
    const output = new DataView(buffer);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      output.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return buffer;
  };

  const toggleRecording = async () => {
    if (isRecording) {
      await stopRecording(true);
    } else {
      await startRecording();
    }
  };

  const formatTime = (timeInSeconds) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = timeInSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

    // ---------------------------
  // Billing and Editing Helpers
  // ---------------------------
  const handleBilling = async () => {
    try {
      const phone = ite.patient_phone_number;
      const formatPhoneNumber = (phoneNumber) => {
        if (phoneNumber.startsWith('+234')) return phoneNumber;
        return `+234${phoneNumber.slice(1)}`;
      };
      const formattedPhone = formatPhoneNumber(phone);
      const token = await getAccessToken();
      const item = {
        appointment_id: ite.id,
        seconds_used: timeElapsed,
      };
      const response = await fetch('https://health.prestigedelta.com/billing/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(item),
      });
      const result = await response.json();
      if (response.status !== 201) {
        console.log(result.message || 'An error occurred');
      } else {
        console.log(result.message || 'Billing successful');
      }
    } catch (error) {
      console.log(error);
    }
  };


  const connectWebSocket = async (appointment_id) => {
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

    const token = await getAccessToken();
    let wsUrl = `${
      window.location.protocol === 'https:' ? 'wss:' : 'wss:'
    }//health.prestigedelta.com/ws/medical/?token=${token}`;

    if (reviewId) wsUrl += `&review_id=${encodeURIComponent(reviewId)}`;
    if (appointment_id)
      wsUrl += `&appointment_id=${encodeURIComponent(appointment_id)}`;

    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      setWsStatus('Connected');
      log('WebSocket connected');
      setActiveScreen('chat'); // Set ChatScreen as active screen on connection
      setIsProfileOpen(true);
      setBottomTabIndex(0);
      startRecording(); // <---- Start recording automatically on connection
    };
    ws.current.onclose = () => {
      setWsStatus('Disconnected');
      log('WebSocket disconnected');
      setActiveScreen('voice'); // Set VoiceNoteScreen as active on disconnect
      setIsRecording(false);
      clearInterval(timerRef.current);
      timerRef.current = null;
      setRecordingTime(900);
      setTimeElapsed(0);
      setBottomTabIndex(0);
      setLoading(false);
    };
    ws.current.onerror = (event) => {
      console.error('WebSocket Error:', event);
      setWsStatus('Disconnected');
      log('WebSocket encountered an error');
      setActiveScreen('voice'); // Set VoiceNoteScreen as active on error
      setIsRecording(false);
      clearInterval(timerRef.current);
      timerRef.current = null;
      setRecordingTime(900);
      setTimeElapsed(0);
      setBottomTabIndex(0);
      setLoading(false);
    };

    ws.current.onmessage = (event) => {
      if (typeof event.data === 'string') {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'authentication_success') {
            setReviewId(data.review_id);
          }
          console.log(`Received message:`, data);
          if (data.type === 'openai_message' && data.message) {
            setChatMessages((prevMessages) => [
              ...prevMessages,
              {
                role: data.message.role,
                content: data.message.content[0].text,
              },
            ]);
            setHasNewMessage(true);
          } else if (data.type === 'oob_response') {
            console.log('OOB Response:', data.content);
            setOobResponse((prevResponses) => [
              ...prevResponses,
              { type: data.content.request_type, data: data.content.data },
            ]);
          } else if (data.type === 'documentation') {
            console.log('Documentation:', data.message);
            setOobResponse((prevResponses) => [
              ...prevResponses,
              { type: 'documentation', message: data.message },
            ]);
          } else if (data.type === 'session_started') {
            currentReviewId.current = data.review_id;
            console.log(
              `Session started with review ID: ${currentReviewId.current}`
            );
          } else if (data.type === 'error') {
            console.error(`OpenAI Error:`, data);
          }
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      }
    };
  };

  const sendOobRequest = () => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(
        JSON.stringify({
          type: 'documentation.request',
          content: {
            request_type: oobRequestType,
            details: oobRequestDetails,
            appointment_id: ite.id,
          },
        })
      );
      log(
        `Out-of-Band request sent: Type - ${oobRequestType}, Details - ${oobRequestDetails}`
      );
      setLastDocumentedAt(new Date());
    } else {
      log('WebSocket is not connected. Cannot send Out-of-Band request.');
    }
  };

  const disconnectWebSocket = () => {
    if (ws.current) {
      ws.current.close();
      setWsStatus('Disconnected');
      ws.current = null;
      log('Disconnected WebSocket');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user-info');
    navigate('/');
  };

  const handleBackClick = () => {
    if (wsStatus === 'Disconnected') {
      navigate('/dashboard');
      return;
    }

    const now = new Date();
    if (!lastDocumentedAt || now - lastDocumentedAt > 14000) {
      setShowDocumentDialog(true);
      return;
    }

    disconnectWebSocket();
    navigate('/dashboard');
  };

  const handleDocumentAndExit = () => {
    sendOobRequest();
    setTimeout(() => {
      setShowDocumentDialog(false);
    }, 500);
  };

  const toggleProfile = async () => {
    await sendOobRequest();
    setIsProfileOpen((prev) => !prev);
  };

  const closeProfile = () => {
    setIsProfileOpen(false);
    sendOobRequest();
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

    // Animation messages effect.
    useEffect(() => {
      let animationInterval;
      if (loading && wsStatus !== 'Connected') {
        animationInterval = setInterval(() => {
          setAnimationIndex((prevIndex) => (prevIndex + 1) % animationMessages.length);
        }, 8000);
      }
      return () => {
        if (animationInterval) clearInterval(animationInterval);
      };
    }, [loading, wsStatus]);


  return (
    <ChakraProvider>
      <Flex direction="column" height="100vh" bg="gray.50"> {/* Changed height to 100vh to fill screen */}
        {/* Header */}
        <Flex
          align="center"
          justify="space-between"
          bg="white"
          p="4"
          boxShadow="md"
          position="sticky"
          top="0"
          zIndex="1"
        >
          <Flex align="center" cursor="pointer" onClick={handleBackClick}>
            <IconButton
              icon={<AiOutlineArrowLeft />}
              aria-label="Back"
              mr="2"
              variant="ghost"
            />
            <Text fontSize="lg" fontWeight="medium">
              Back
            </Text>
          </Flex>
          <Badge colorScheme={wsStatus === 'Connected' ? 'green' : 'red'}>
            {wsStatus}
          </Badge>
        </Flex>

        {/* Persistent Recording Controls */}
        <Flex bg="#f0f4f8" padding={2} justifyContent="space-between" alignItems="center" boxShadow="md">
          <Button
            onClick={startConsultationSession}
            isDisabled={wsStatus === 'Connected' || loading}
            colorScheme="blue"
            marginTop="10px"
          >
            {loading ? <Spinner size="sm" /> : 'Start Consultation'}
          </Button>
          {loading && wsStatus !== 'Connected' && (
            <Box mt={2} textAlign="center">
              <Text fontSize="lg" fontWeight="bold">
                {animationMessages[animationIndex]}
              </Text>
            </Box>
          )}

          <HStack justify="center">
            <Button
              onClick={toggleRecording}
              colorScheme={isRecording ? 'red' : 'blue'}
              borderRadius="50%"
              width="40px"
              height="40px"
            >
              <Icon as={isRecording ? MdStop : MdMic} boxSize={8} />
            </Button>
            <Text>{isRecording ? formatTime(recordingTime) : 'Record'}</Text>
          </HStack>
        </Flex>


        {/* Content Area */}
        <Flex flex="1" overflow="hidden">
          <Box
            flex="1"
            overflow="auto"
            p="2"
            maxWidth={isProfileOpen && !isMobile ? '40%' : '100%'}
            transition="max-width 0.3s"
          >
            {patientInfo && (
              <Box bg="white" p="4" mb="4" borderRadius="md" boxShadow="md" mx="0">
                <Text fontWeight="bold" mb="2">
                  Patient Information
                </Text>
                {Object.entries(patientInfo).map(([key, value]) => (
                  <Text key={key}>
                    <strong>{key}:</strong> {value}
                  </Text>
                ))}
              </Box>
            )}
            {/* Both screens are always mounted; visibility is toggled via CSS */}
            <Box display={activeScreen === "voice" ? "block" : "none"}>
              <VoiceNoteScreen
                ws={ws}
                wsStatus={wsStatus}
                connectWebSocket={startConsultationSession}
                disconnectWebSocket={disconnectWebSocket}
                phoneNumber={phoneNumber}
                setPhoneNumber={setPhoneNumber}
                errorMessage={errorMessage}
                reviewId={reviewId}
                sendOobRequest={sendOobRequest}
                ite={ite}
                documen={documen}
                updateLastDocumented={setLastDocumentedAt}
                removePhoneNumberInput={wsStatus === 'Connected'}
                phoneNumberVisible={wsStatus === 'Disconnected'} // <--- Prop to control phone input visibility
              />
            </Box>
            <Box display={activeScreen === "chat" ? "block" : "none"}>
              <ChatScreen
                chatMessages={chatMessages}
                setChatMessages={setChatMessages}
                ws={ws}
                wsStatus={wsStatus}
                reviewId={reviewId}
                setReviewId={setReviewId}
                sendOobRequest={sendOobRequest}
                ite={ite}
              />
            </Box>
          </Box>

          {/* Patient Profile Display (Document panel) */}
          {(isMobile || isProfileOpen) && (
            <Box
              position={isMobile ? 'fixed' : 'relative'}
              top="0"
              right={isMobile ? (isProfileOpen ? '0' : '-100%') : isProfileOpen ? '0' : '-60%'}
              height={isMobile ? '100vh' : '100%'}
              width={isMobile ? '100%' : '64%'}
              maxWidth={isMobile ? '100%' : '100%'}
              bg="white"
              boxShadow="md"
              transition={isMobile ? 'right 0.3s' : 'right 0.3s, max-width 0.3s'}
              zIndex="2"
              overflowY="auto"
              p={1}
            >
              <Flex justify="space-between" align="center" mb={1}>
                <Text fontWeight="bold" fontSize="lg">
                  Patient Profile
                </Text>
                <IconButton
                  icon={<MdClose />}
                  aria-label="Close profile"
                  onClick={closeProfile}
                  size="sm"
                />
              </Flex>
              <PatientProfileDisplay reviewid={reviewId} wsStatus={wsStatus} />
            </Box>
          )}
        </Flex>

        {/* Bottom Tabs - Centered and Full Width */}
        <Center w="100%" mx="auto" position={isMobile ? 'fixed' : 'static'} bottom={isMobile ? '0' : undefined} left="0" right="0" zIndex="1000" bg="white" boxShadow="md" pb={4} borderRadius="md"> {/* Use Center and fixed positioning */}
          <Tabs
            index={bottomTabIndex}
            onChange={handleBottomTabChange}
            isFitted
            variant="enclosed-colored"
            colorScheme="blue"
            maxwidth="100%"
            p='0, 10px' // control width of tabs
            align="center" // Ensure tabs are centered within container
            style={{ display: wsStatus === 'Connected' ? 'flex' : 'none' }}
          >
            <TabList bg="white" borderRadius="md" justifyContent="center"> {/* Center TabList content */}
                <>
                  <Tab
                    _selected={{ color: 'white', bg: 'blue.500' }}
                    position="relative" width="14rem"
                  >
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


        {/* Documentation Required Modal */}
        <Modal isOpen={showDocumentDialog} onClose={() => {}} isCentered>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Documentation Required</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <Text>
                You have not documented in the last 14 seconds. Please click the Document button to document your consultation notes and save before leaving.
              </Text>
            </ModalBody>
            <ModalFooter>
              <Button colorScheme="blue" onClick={handleDocumentAndExit}>
                Okay
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </Flex>
    </ChakraProvider>
  );
};

export default ConsultAIPage;