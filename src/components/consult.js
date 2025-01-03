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

  const ws = useRef(null);
  const navigate = useNavigate();

  const connectWebSocket = async () => {
    if (phoneNumber.length !== 11) {
      setErrorMessage('Please enter a valid 11-digit phone number');
      return;
    }
    const token = await getAccessToken(); // Assume this function is defined elsewhere
    let wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/medical/?token=${token}`;

    if (phoneNumber) wsUrl += `&phone_number=${encodeURIComponent(`+234${phoneNumber.slice(1)}`)}`;
    if (reviewId) wsUrl += `&review_id=${encodeURIComponent(reviewId)}`;

    ws.current = new WebSocket(wsUrl);
    ws.current.onopen = () => setWsStatus('Connected');
    ws.current.onclose = () => setWsStatus('Disconnected');
    ws.current.onmessage = (event) => handleWebSocketMessage(event);
  };

  const handleWebSocketMessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'openai_message') {
      setChatMessages((prev) => [...prev, { role: data.role, content: data.content }]);
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
          onChange={(index) => setSelectedTab(index)}
          variant="unstyled"
          isFitted
        >
          <TabList borderBottom="1px solid #e0e0e0" boxShadow="sm">
            <Tab
              flex="1"
              justifyContent="center"
              _selected={{ bg: 'teal.500', color: 'white', borderRadius: 'md' }}
              padding="8px"
            >
              <Icon as={MdMic} boxSize={5} marginRight={2} />
              Send Voice Note
            </Tab>
            <Tab
              flex="1"
              justifyContent="center"
              _selected={{ bg: 'teal.500', color: 'white', borderRadius: 'md' }}
              padding="8px"
            >
              <Icon as={MdChat} boxSize={5} marginRight={2} />
              Chat
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
