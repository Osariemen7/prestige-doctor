import React, { useState } from 'react';
import { Box, Tab, TabList, TabPanel, TabPanels, Tabs, Icon, ChakraProvider } from '@chakra-ui/react';
import { MdMic, MdChat } from 'react-icons/md';
import VoiceNoteScreen from './voicenote';
import ChatScreen from './chatScreen';
import { useNavigate } from 'react-router-dom';
import { AiOutlineArrowLeft } from 'react-icons/ai'; // Import the back arrow icon

const ConsultAIPage = () => {
  const [selectedTab, setSelectedTab] = useState(0);
  const navigate = useNavigate();

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
            >
              <Icon as={MdChat} boxSize={5} marginRight={2} />
              Chat
            </Tab>
          </TabList>

          {/* Tab Panels */}
          <TabPanels flex="1" overflow="auto">
            <TabPanel>
              <VoiceNoteScreen />
            </TabPanel>
            <TabPanel>
              <ChatScreen />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>
    </ChakraProvider>
  );
};

export default ConsultAIPage;
