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
} from '@chakra-ui/react';
import { MdNotes, MdClose } from 'react-icons/md';
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
  // New state to toggle between VoiceNoteScreen and ChatScreen
  const [activeScreen, setActiveScreen] = useState("voice");
  const [isMobile] = useMediaQuery('(max-width: 768px)');

  const ws = useRef(null);
  const navigate = useNavigate();
  const toast = useToast();

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
    const date = new Date('2025-01-25 09:00');
const formattedDate = date.toISOString().slice(0, 16); // "YYYY-MM-DDTHH:MM"
console.log(formattedDate);

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
    };
    ws.current.onclose = () => {
      setWsStatus('Disconnected');
      log('WebSocket disconnected');
    };
    ws.current.onerror = (event) => {
      console.error('WebSocket Error:', event);
      setWsStatus('Disconnected');
      log('WebSocket encountered an error');
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

  // Toggle the Patient Profile display (Document panel)
  const toggleProfile = async () => {
    await sendOobRequest();
    setIsProfileOpen((prev) => !prev);
  };

  const closeProfile = () => {
    setIsProfileOpen(false);
    sendOobRequest();
  };

  // Toggle between VoiceNoteScreen and ChatScreen without unmounting the VoiceNoteScreen
  const toggleActiveScreen = () => {
    setActiveScreen((prev) => (prev === "voice" ? "chat" : "voice"));
    if (activeScreen === "voice") {
      setHasNewMessage(false);
    }
  };

  // When WebSocket is connected, automatically open the Document panel.
  useEffect(() => {
    if (wsStatus === 'Connected') {
      setIsProfileOpen(true);
    }
  }, [wsStatus]);

  return (
    <ChakraProvider>
      <Flex direction="column" height="90vh" bg="gray.50">
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

        {/* Bottom Buttons – Only render when WebSocket is Connected */}
        {wsStatus === 'Connected' && (
          <Flex
            p="2"
            justify="space-around"
            bg="white"
            boxShadow="sm"
            mx="4"
            position={isMobile ? 'fixed' : 'static'}
            bottom={isMobile ? '10px' : undefined}
            left={isMobile ? '10px' : undefined}
            right={isMobile ? '10px' : undefined}
            zIndex="1000"
          >
            {/* Document Button on the Left */}
            <Button
              leftIcon={<MdNotes />}
              onClick={toggleProfile}
              colorScheme="blue"
              variant="outline"
            >
              Document
            </Button>

            {/* Toggle Screen Button on the Right */}
            <Button
              onClick={toggleActiveScreen}
              variant="outline"
              colorScheme="blue"
              position="relative"
            >
              {activeScreen === "voice" ? "Launch Researcher" : "Voice Note"}
              {hasNewMessage && activeScreen === "voice" && (
                <Box
                  position="absolute"
                  top="2"
                  right="2"
                  width="10px"
                  height="10px"
                  borderRadius="50%"
                  bg="red.500"
                />
              )}
            </Button>
          </Flex>
        )}

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
