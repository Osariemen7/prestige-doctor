import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Input,
  Button,
  Text,
  Flex,
  Spinner,
} from '@chakra-ui/react';
import { sendMessage } from './api';
import { useReview } from './context';
import axios from 'axios';

const ChatScreen = () => {
  const [userMessage, setUserMessage] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const { reviewId } = useReview();

  // Fetch AI messages from the API
  const fetchMessages = async () => {
    try {
      const response = await axios.get(`https://health.prestigedelta.com/doctormessages/${reviewId.review_id}/`);
      const newMessages = response.data.map((msg) => ({
        sender: 'ai',
        text: msg.message, // Adjust based on API response structure
      }));

      // Avoid duplicates and merge messages
      setChatMessages((prevMessages) => {
        const existingTexts = prevMessages.map((msg) => msg.text);
        const filteredNewMessages = newMessages.filter(
          (msg) => !existingTexts.includes(msg.text)
        );
        return [...prevMessages, ...filteredNewMessages];
      });
    } catch (error) {
      console.error('Error fetching AI messages:', error);
    }
  };

  // Poll for new messages
  useEffect(() => {
    fetchMessages(); // Initial fetch
    const intervalId = setInterval(fetchMessages, 10000); // Poll every 10 seconds
    return () => clearInterval(intervalId); // Cleanup
  }, []);

  // Handle sending user messages
  const handleSendMessage = async () => {
    if (!userMessage.trim()) return;

    setChatMessages((prevMessages) => [
      ...prevMessages,
      { sender: 'user', text: userMessage },
    ]);
    setUserMessage('');
    setIsLoading(true);

    try {
      const response = await sendMessage(userMessage, { review_id: reviewId });

      if (response?.response) {
        setChatMessages((prevMessages) => [
          ...prevMessages,
          { sender: 'ai', text: response.response },
        ]);
      }
    } catch (error) {
      setChatMessages((prevMessages) => [
        ...prevMessages,
        { sender: 'ai', text: 'Error retrieving response. Please try again later.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Flex direction="column" height="80vh" bg="gray.100" p={4}>
      {/* Chat Messages */}
      <VStack
        flex="1"
        spacing={4}
        overflowY="auto"
        bg="white"
        borderRadius="md"
        shadow="md"
        p={4}
        mb={4}
      >
        {chatMessages.map((item, index) => (
          <Box
            key={index}
            alignSelf={item.sender === 'user' ? 'flex-end' : 'flex-start'}
            bg={item.sender === 'user' ? 'teal.100' : 'gray.200'}
            px={4}
            py={2}
            borderRadius="lg"
            maxW="75%"
          >
            <Text>{item.text}</Text>
          </Box>
        ))}
        {isLoading && (
          <Flex justifyContent="center" alignItems="center" w="100%">
            <Spinner size="md" color="teal.500" />
          </Flex>
        )}
      </VStack>

      {/* Input and Send Button */}
      <HStack spacing={2}>
        <Input
          flex="1"
          placeholder="Type your message"
          value={userMessage}
          onChange={(e) => setUserMessage(e.target.value)}
          bg="white"
          borderColor="gray.300"
          borderRadius="full"
          px={4}
          isDisabled={isLoading}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && userMessage.trim()) {
              handleSendMessage();
            }
          }}
        />
        <Button
          colorScheme="teal"
          borderRadius="full"
          px={6}
          onClick={handleSendMessage}
          isLoading={isLoading}
          loadingText="Sending"
        >
          Send
        </Button>
      </HStack>
    </Flex>
  );
};

export default ChatScreen;

