import React, { useState, useEffect } from 'react';
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
} from '@chakra-ui/react';
import { MdMic, MdChat } from 'react-icons/md';
import VoiceNoteScreen from './voicenote';
import ChatScreen from './chatScreen';
import { useNavigate } from 'react-router-dom';
import { AiOutlineArrowLeft } from 'react-icons/ai'; // Import the back arrow icon
import axios from 'axios';
import { useReview } from './context';

const ConsultAIPage = () => {
  const { reviewId } = useReview();
  const [selectedTab, setSelectedTab] = useState(0);
  const [messages, setMessages] = useState([]);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const navigate = useNavigate();

  // Function to fetch messages
  const fetchMessages = async () => {
    try {
      const response = await axios.get(`https://health.prestigedelta.com/doctormessages/${reviewId.review_id}/`);
      const newMessages = response.data;

      if (newMessages.length > messages.length) {
        setHasNewMessage(true);
        setMessages(newMessages);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  // Poll the API every 10 seconds
  useEffect(() => {
  if (reviewId !== null) {
    const intervalId = setInterval(fetchMessages, 10000);
    return () => clearInterval(intervalId); // Cleanup interval on component unmount
    } }, [messages]);

  // Clear the new message notification when switching to the Chat tab
  useEffect(() => {
    if (selectedTab === 1) {
      setHasNewMessage(false);
    }
  }, [selectedTab]);

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

        {/* Tabs at the Top */}
        <Tabs
          index={selectedTab}
          onChange={(index) => setSelectedTab(index)}
          variant="unstyled"
          isFitted
        >
          {/* Tab List */}
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
              position="relative"
            >
              <Icon as={MdChat} boxSize={5} marginRight={2} />
              Chat
              {hasNewMessage && (
                <Badge
                  colorScheme="red"
                  position="absolute"
                  top="0"
                  right="10px"
                  borderRadius="full"
                >
                  New
                </Badge>
              )}
            </Tab>
          </TabList>

          {/* Tab Panels */}
          <TabPanels flex="1" overflow="auto">
            <TabPanel>
              <VoiceNoteScreen />
            </TabPanel>
            <TabPanel>
              <ChatScreen messages={messages} />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>
    </ChakraProvider>
  );
};

export default ConsultAIPage;
