import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Icon,
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
  useToast,
  Badge,
} from '@chakra-ui/react';
import { MdMic, MdChat } from 'react-icons/md';
import VoiceNoteScreen from './voicenote';
import ChatScreen from './chatScreen';
import { useNavigate } from 'react-router-dom';
import { AiOutlineArrowLeft } from 'react-icons/ai';
import { getAccessToken } from './api';

const ConsultAIPage = () => {
  const [wsStatus, setWsStatus] = useState('Disconnected');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [reviewId, setReviewId] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const currentReviewId = useRef(null);
  const [oobRequestType, setOobRequestType] = useState('summary');
  const [oobRequestDetails, setOobRequestDetails] = useState('');
  const [oobResponse, setOobResponse] = useState([]);
  const [debugLogs, setDebugLogs] = useState([]);
  const [ite, setItem] = useState({});
  const [isChatModalOpen, setIsChatModalOpen] = useState(false); // Controls modal visibility

  const ws = useRef(null);
  const navigate = useNavigate();
  const toast = useToast();

  // Log messages to a debug log state
  const log = (message) => {
    const time = new Date().toLocaleTimeString();
    setDebugLogs((prev) => [...prev, `[${time}] ${message}`]);
  };

  useEffect(() => {
    return () => {
      disconnectWebSocket();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Book an appointment before starting the WebSocket connection
  const handleSubmit = async () => {
    const phone_number = phoneNumber ? `+234${phoneNumber.slice(1)}` : '';
    let data = {
      start_time: '2025-01-25 09:00',
      reason: 'Routine Check',
      phone_number,
      is_instant: true,
    };

    if (phone_number === '') {
      delete data.phone_number;
    } else {
      delete data.patient_id;
    }

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

  // Connect to the WebSocket server
  const connectWebSocket = async () => {
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
    await handleSubmit();
    const appointment_id = ite.id;
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
          console.log(`Received message:`, data);
          if (data.type === 'openai_message' && data.message) {
            setChatMessages((prevMessages) => [
              ...prevMessages,
              {
                role: data.message.role,
                content: data.message.content[0].text,
              },
            ]);
            setReviewId(data.review_id);
            if (isChatModalOpen) {
              setHasNewMessage(false);
            } else {
              setHasNewMessage(true);
            }
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

  // Send an out-of-band request via the WebSocket
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

  // Toggle the chat modal and clear the new message indicator
  const toggleChatModal = () => {
    setIsChatModalOpen(!isChatModalOpen);
    setHasNewMessage(false);
  };

  return (
    <ChakraProvider>
      <Flex direction="column" height="100vh" bg="gray.50">
        {/* Header with Back Button and Connection Status */}
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
          <Flex align="center" cursor="pointer" onClick={() => navigate('/dashboard')}>
            <Icon as={AiOutlineArrowLeft} w={6} h={6} mr="2" />
            <Text fontSize="lg" fontWeight="medium">
              Back
            </Text>
          </Flex>
          <Badge colorScheme={wsStatus === 'Connected' ? 'green' : 'red'}>
            {wsStatus}
          </Badge>
        </Flex>

        {/* Toggle Buttons */}
        <Flex p="4" justify="center" bg="white" boxShadow="sm">
          <Button
            flex="1"
            mr="2"
            onClick={() => setIsChatModalOpen(false)}
            variant={!isChatModalOpen ? 'solid' : 'outline'}
            leftIcon={<MdMic />}
            size="lg"
          >
            Voice Note
          </Button>
          <Button
            flex="1"
            ml="2"
            onClick={toggleChatModal}
            variant={isChatModalOpen ? 'solid' : 'outline'}
            leftIcon={<MdChat />}
            size="lg"
            position="relative"
          >
            Chat
            {hasNewMessage && (
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

        {/* Main Content Area */}
        <Box flex="1" overflow="auto" p="4">
          <VoiceNoteScreen
            ws={ws}
            isRecording={isRecording}
            setIsRecording={setIsRecording}
            wsStatus={wsStatus}
            connectWebSocket={connectWebSocket}
            disconnectWebSocket={disconnectWebSocket}
            phoneNumber={phoneNumber}
            setPhoneNumber={setPhoneNumber}
            errorMessage={errorMessage}
            reviewId={reviewId}
            sendOobRequest={sendOobRequest}
            ite={ite}
          />
        </Box>

        {/* Chat Modal */}
        <Modal
          isOpen={isChatModalOpen}
          onClose={toggleChatModal}
          size="xl"
          scrollBehavior="inside"
        >
          <ModalOverlay />
          <ModalContent
            maxW="container.md"
            mx="auto"
            mt="auto"
            mb="0"
            height="80vh"
            maxWidth="100%"
            borderTopRadius="lg"
            overflow="hidden"
          >
            <ModalHeader textAlign="center" fontSize="2xl" bg="blue.500" color="white">
              What do you want to know?
            </ModalHeader>
            <ModalCloseButton color="white" />
            <ModalBody p="4" bg="gray.50">
              <ChatScreen
                phoneNumber={phoneNumber}
                setChatMessages={setChatMessages}
                chatMessages={chatMessages}
                sendOobRequest={sendOobRequest}
              />
            </ModalBody>
            <ModalFooter bg="gray.50">
              <Button colorScheme="blue" onClick={toggleChatModal}>
                Close
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </Flex>
    </ChakraProvider>
  );
};

export default ConsultAIPage;
