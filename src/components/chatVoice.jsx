import React, { useState, useEffect, useRef } from 'react';
import {
  Flex,
  Box,
  VStack,
  Input,
  Button,
  Text,
  Icon,
  HStack,
  useToast,
} from '@chakra-ui/react';
import { MdSend } from 'react-icons/md';

const Chat = ({ ws, chatMessages, setChatMessages }) => {
  const [text, setText] = useState('');
  const textInputRef = useRef(null);
  const toast = useToast();

  useEffect(() => {
    const handleMessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'text' || message.type === 'audio') {
          setChatMessages((prevMessages) => [
            ...prevMessages,
            { role: 'assistant', content: message.content },
          ]);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    if (ws.current) {
      ws.current.onmessage = handleMessage;
      ws.current.onerror = () => {
        toast({
          title: 'WebSocket Error',
          description: 'An error occurred with the WebSocket connection.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      };
    }

    return () => {
      if (ws.current) {
        ws.current.onmessage = null;
        ws.current.onerror = null;
      }
    };
  }, [ws, setChatMessages, toast]);

  const handleSendText = () => {
    const messageText = text.trim();
    if (messageText && ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(
        JSON.stringify({
          type: 'text',
          content: messageText,
        })
      );
      setChatMessages((prevMessages) => [
        ...prevMessages,
        { role: 'user', content: messageText },
      ]);
      setText('');
    } else {
      toast({
        title: 'Message not sent',
        description: 'WebSocket is not connected.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
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
            alignSelf={item.role === 'user' ? 'flex-end' : 'flex-start'}
            bg={item.role === 'user' ? 'teal.100' : 'gray.200'}
            px={4}
            py={2}
            borderRadius="lg"
            maxW="75%"
          >
            <Text>{item.content}</Text>
          </Box>
        ))}
      </VStack>

      {/* Input and Send Button */}
      <HStack padding="10px">
        <Input
          placeholder="Type your message"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSendText();
          }}
          ref={textInputRef}
        />
        <Button
          onClick={handleSendText}
          colorScheme="blue"
          leftIcon={<Icon as={MdSend} />}
        >
          Send
        </Button>
      </HStack>
    </Flex>
  );
};

export default Chat;
