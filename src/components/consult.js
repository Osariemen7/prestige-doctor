import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Icon,
  ChakraProvider,
  Badge,
  HStack,
} from '@chakra-ui/react';
import { MdMic, MdChat } from 'react-icons/md';
import VoiceNoteScreen from './voicenote';
import ChatScreen from './chatScreen';
import { useNavigate } from 'react-router-dom';
import { AiOutlineArrowLeft } from 'react-icons/ai';
import { getAccessToken } from './api';

const ConsultAIPage = () => {
  const [selectedTab, setSelectedTab] = useState(0);
  const [wsStatus, setWsStatus] = useState('Disconnected');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [reviewId, setReviewId] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [hasNewMessage, setHasNewMessage] = useState(false); // New state for message indication
  const currentReviewId = useRef(null);
  const [oobRequestType, setOobRequestType] = useState('summary');
 const [oobRequestDetails, setOobRequestDetails] = useState('');
 const [oobResponse, setOobResponse] = useState([]);
 const [debugLogs, setDebugLogs] = useState([]);
   

  const ws = useRef(null);
  const navigate = useNavigate();

  const log = (message) => {
    const time = new Date().toLocaleTimeString();
    setDebugLogs(prev => [...prev, `[${time}] ${message}`]);
  };

  useEffect(() => {
    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, []);

  const handleSubmit = async () => {
  
      const phone_number = phoneNumber ? `+234${phoneNumber.slice(1)}` : '';
     
      // Base data object
      let data = {
        
          start_time: '2025-01-25 09:00',
          reason: 'Routine Check',
          phone_number,
          is_instant: true
      };
  
      // Condition to modify the data object
      if (phone_number === '') {
          delete data.phone_number; // Remove phone_number if it's empty
      } else {
          delete data.patient_id; // Remove patient_id if phone_number is provided
      }
  
      const token = await getAccessToken();
  
      try {
          const response = await fetch('https://health.prestigedelta.com/appointments/book/', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify(data),
          });
        
          if (response.ok) {
              console.log('call begins')
              ; // Close the modal
          }
          else {

              throw new Error('Failed to book the appointment.');
              
          }
      } catch (error) {
          
      }
  };

  const connectWebSocket = async () => {
    if (phoneNumber.length !== 11) {
      setErrorMessage('Please enter a valid 11-digit phone number');
      return;
    }
    setErrorMessage('');
    handleSubmit()
    const token = await getAccessToken();
    let wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'wss:'}//health.prestigedelta.com/ws/medical/?token=${token}`;

    if (phoneNumber) wsUrl += `&phone_number=${encodeURIComponent(`+234${phoneNumber.slice(1)}`)}`;
    if (reviewId) wsUrl += `&review_id=${encodeURIComponent(reviewId)}`;

    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => setWsStatus('Connected');

    ws.current.onclose = () => setWsStatus('Disconnected');

    ws.current.onerror = (event) => {
      console.error('WebSocket Error:', event);
    };

    ws.current.onmessage = (event) => {
      if (typeof event.data === 'string') {
        try {
          const data = JSON.parse(event.data);
          console.log(`Received message:`, data);
          setReviewId(data.review_id);
          
          if (data.type === 'openai_message' && data.message) {
            setChatMessages((prevMessages) => [
              ...prevMessages,
              { role: data.message.role, content: data.message.content[0].text },
            ]);

            // Set new message indication if user is not on the Chat tab
            if (selectedTab !== 1) {
              setHasNewMessage(true);
            }
          } else if (data.type === 'oob_response') {
            console.log('OOB Response:', data.content);
            setOobResponse(prevResponses => [
              ...prevResponses,
              { type: data.content.request_type, data: data.content.data }
          ]);
          } else if (data.type === 'documentation') {
            console.log('Documentation:', data.message);
            setOobResponse(prevResponses => [
              ...prevResponses,
              { type: 'documentation', message: data.message }
          ]);
           
          } else if (data.type === 'session_started') {
            currentReviewId.current = data.review_id;
            console.log(`Session started with review ID: ${currentReviewId.current}`);
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
          },
        })
      );
      log(`Out-of-Band request sent: Type - ${oobRequestType}, Details - ${oobRequestDetails}`);
    } else {
      log('WebSocket is not connected. Cannot send Out-of-Band request.');
    }
  };
  

  const handleTabChange = (index) => {
    setSelectedTab(index);
    if (index === 1) {
      setHasNewMessage(false); // Remove new message indication when Chat tab is selected
    }
  };

  return (
    <ChakraProvider>
      <Box display="flex" flexDirection="column" height="100vh">
        {/* Back Icon */}
        <Box
          display="flex"
          alignItems="center"
          padding="10px"
          cursor="pointer"
          onClick={() => navigate('/dashboard')}
        >
          <AiOutlineArrowLeft size={24} />
          <span style={{ marginLeft: '8px' }}>Back</span>
        </Box>

        {/* Tabs for Voice and Chat */}
        <Tabs
          index={selectedTab}
          onChange={handleTabChange}
          variant="unstyled"
          isFitted
        >
          <TabList borderBottom="1px solid #e0e0e0" boxShadow="sm">
            {/* Voice Note Tab */}
            <Tab
              flex="1"
              justifyContent="center"
              _selected={{ bg: 'teal.500', color: 'white', borderRadius: 'md' }}
              padding="8px"
            >
              <Icon as={MdMic} boxSize={5} marginRight={2} />
              Send Voice Note
            </Tab>

            {/* Chat Tab with new message indication */}
            <Tab
              flex="1"
              justifyContent="center"
              _selected={{ bg: 'teal.500', color: 'white', borderRadius: 'md' }}
              padding="8px"
            >
              <HStack spacing={2}>
                <Icon as={MdChat} boxSize={5} />
                <span>Chat</span>
                {hasNewMessage && (
  <Box
    width="12px"
    height="12px"
    borderRadius="50%"
    bg="red.500"
    border="2px solid white" // Optional for extra border
  />
)}

              </HStack>
            </Tab>
          </TabList>

          <TabPanels flex="1" overflow="auto">
            <TabPanel>
              <VoiceNoteScreen
                ws={ws}
                isRecording={isRecording}
                setIsRecording={setIsRecording}
                wsStatus={wsStatus}
                connectWebSocket={connectWebSocket}
                phoneNumber={phoneNumber}
                setPhoneNumber={setPhoneNumber}
                errorMessage={errorMessage}
                reviewId={reviewId}
                sendOobRequest={sendOobRequest}
              />
            </TabPanel>
            <TabPanel>
              <ChatScreen
                ws={ws}
                chatMessages={chatMessages}
                setChatMessages={setChatMessages}
              />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>
    </ChakraProvider>
  );
};

export default ConsultAIPage;
