import React, { useRef, useState, useEffect } from 'react';
import { Box, VStack, Input, Button, Text, Icon, HStack } from '@chakra-ui/react';
import { MdSend } from 'react-icons/md';

const ChatScreen = ({ ws, chatMessages, setChatMessages }) => {
  const [text, setText] = useState('');
  const textInputRef = useRef(null);

  useEffect(() => {
    if (ws.current) {
      ws.current.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === 'text' || message.type === 'audio') {
          setChatMessages((prevMessages) => [...prevMessages, { role: 'assistant', content: message.content }]);
        }
      };
    }
  }, [ws, setChatMessages]);

  const handleSendText = () => {
    const messageText = text.trim();
    if (messageText && ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(
        JSON.stringify({
          type: 'text',
          content: messageText,
        })
      );
      setChatMessages((prevMessages) => [...prevMessages, { role: 'user', content: messageText }]);
      setText('');
    }
  };

  return (
    <VStack spacing={4} align="stretch">
      <Box
        height="400px"
        overflowY="auto"
        border="1px solid #ccc"
        padding="10px"
        borderRadius="5px"
      >
        {chatMessages.map((message, index) => (
          <Text key={index} color={message.role === 'user' ? 'blue.500' : 'gray.700'}>
            {message.content}
          </Text>
        ))}
      </Box>

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
        <Button onClick={handleSendText} colorScheme="blue" leftIcon={<Icon as={MdSend} />}>
          Send
        </Button>
      </HStack>
    </VStack>
  );
};

export default ChatScreen;
