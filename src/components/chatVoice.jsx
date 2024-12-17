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
import { sendMessage, getAccessToken } from './api';
import { useReview } from './context';
import axios from 'axios';

const Chat = () => {
  const [userMessage, setUserMessage] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const { reviewId, setReview } = useReview();

  // Fetch AI messages from the API
  const fetchMessages = async () => {
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        console.error('No access token available. Cannot fetch messages.');
        return;
      }
      const response = await axios.get(
        `https://health.prestigedelta.com/doctormessages/${reviewId}/`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      const newMessages = response.data.map((msg) => ({
        sender: 'ai',
        text: msg.message_content
        , // Adjust based on API response structure
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
    if (reviewId !== null) {
    fetchMessages(); // Initial fetch
    const intervalId = setInterval(fetchMessages, 10000); // Poll every 10 seconds
    return () => clearInterval(intervalId); // Cleanup
 } }, [reviewId]);

 useEffect(() => {
  return () => {
    console.log('Clearing reviewId on component exit...');
    setReview(null); // Reset reviewId in the context
  };
}, [setReview]);


  // Handle sending user messages
  const handleSendMessage = async () => {
    if (!userMessage.trim()) return;
  
    // Add user message to the chat UI
    setChatMessages((prevMessages) => [
      ...prevMessages,
      { sender: 'user', text: userMessage },
    ]);
    setUserMessage('');
    setIsLoading(true);
  
    try {
      // Send the user message to the API
      await sendMessage(userMessage, { review_id: reviewId });
  
      // Wait for fetchMessages to pull AI's response
    } catch (error) {
      console.error('Error sending message:', error);
      setChatMessages((prevMessages) => [
        ...prevMessages,
        { sender: 'ai', text: 'Error sending message. Please try again.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Flex direction="column" height="100%" bg="gray.100" p={4}>
      {/* Chat Header */}
      <Box mb={2} textAlign="center">
        <Text fontSize="lg" fontWeight="bold" color="teal.600">
          Chat with AI
        </Text>
      </Box>
  
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

export default Chat;

