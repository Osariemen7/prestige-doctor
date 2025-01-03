import React, { useRef, useState } from 'react';
import { Box, VStack, Input, Button, Text } from '@chakra-ui/react';

const ChatScreen = ({ ws, chatMessages, setChatMessages }) => {
  const [text, setText] = useState('');
  const textInputRef = useRef(null);

  // Function to handle sending text messages
  const handleSendText = () => {
    const trimmedText = text.trim();
    if (trimmedText && ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(
        JSON.stringify({
          type: 'text',
          content: trimmedText,
        })
      );
      setChatMessages((prevMessages) => [
        ...prevMessages,
        { role: 'user', content: trimmedText },
      ]);
      setText(''); // Clear input field
    }
  };

  return (
    <VStack spacing={4} align="stretch">
      {/* Chat Messages Display */}
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

      {/* Text Input and Send Button */}
      <Box padding="10px">
        <Input
          placeholder="Type your message"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSendText();
          }}
          ref={textInputRef}
        />
        <Button onClick={handleSendText} colorScheme="blue" marginTop="10px">
          Send
        </Button>
      </Box>
    </VStack>
  );
};

export default ChatScreen;
