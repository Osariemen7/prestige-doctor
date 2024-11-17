import React, { useState } from 'react';
import { Box, VStack, HStack, Input, Button, Text, Flex, Spinner } from '@chakra-ui/react';
import { sendMessage } from './api';
import { useReview } from './context';

const ChatScreen = () => {
  const [userMessage, setUserMessage] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false); // Loading state
  const { reviewId } = useReview();

  const handleSendMessage = async () => {
    if (!userMessage.trim()) return;

    setChatMessages((prevMessages) => [
      ...prevMessages,
      { sender: 'user', text: userMessage },
    ]);
    setUserMessage('');
    setIsLoading(true); // Start loading

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
      setIsLoading(false); // Stop loading
    }
  };

  return (
    <Flex direction="column" height="88vh" bg="gray.100" p={4}>
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
          isDisabled={isLoading} // Disable input while loading
        />
        <Button
          colorScheme="teal"
          borderRadius="full"
          px={6}
          onClick={handleSendMessage}
          isLoading={isLoading} // Display loading spinner in button
          loadingText="Sending"
        >
          Send
        </Button>
      </HStack>
    </Flex>
  );
};

export default ChatScreen;
