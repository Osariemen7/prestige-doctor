import React from 'react';
import { Button, Box, Input, Text } from '@chakra-ui/react';

const VoiceNoteScreen = ({
  ws,
  isRecording,
  setIsRecording,
  wsStatus,
  connectWebSocket,
  phoneNumber,
  setPhoneNumber,
  errorMessage,
}) => {
  const startRecording = () => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      // Start recording logic here...
      setIsRecording(true);
    }
  };

  const stopRecording = () => {
    if (isRecording) {
      // Stop recording logic here...
      setIsRecording(false);
    }
  };

  return (
    <Box>
      {/* Input for Phone Number */}
      <Box padding="10px">
        <Input
          placeholder="Enter phone number of Patient"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
        />
        <Button
          onClick={connectWebSocket}
          isDisabled={wsStatus === 'Connected'}
          colorScheme="teal"
          marginTop="10px"
        >
          Start Consultation
        </Button>
        {wsStatus !== 'Disconnected' && (
          <Text marginTop="5px" color="green.500">
            {`WebSocket Status: ${wsStatus}`}
          </Text>
        )}
      </Box>
     {errorMessage}
      {/* Recording Controls */}
      <Box marginTop="20px">
        <Button
          onClick={startRecording}
          isDisabled={wsStatus !== 'Connected' || isRecording}
          colorScheme="teal"
        >
          Start Recording
        </Button>
        <Button
          onClick={stopRecording}
          isDisabled={wsStatus !== 'Connected' || !isRecording}
          colorScheme="red"
          marginLeft="10px"
        >
          Stop Recording
        </Button>
      </Box>
    </Box>
  );
};

export default VoiceNoteScreen;
