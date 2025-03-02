import React, { useState, useRef, useEffect } from 'react';
import {
  Button,
  Box,
  Input,
  Text,
  VStack,
  Icon,
  HStack,
  Flex,
  Heading,
  Spinner,
  Divider,
  Textarea,
  useToast,
} from '@chakra-ui/react';
import { MdMic, MdStop, MdSearch } from 'react-icons/md';
import { getAccessToken } from './api';

const VoiceNoteScreen = ({
  wsStatus,
  reviewId,
  ite,
  sendOobRequest,
  connectWebSocket,
  phoneNumber,
  setPhoneNumber,
  ws,
  errorMessage,
  disconnectWebSocket,
  documen,
  searchText,
  setSearchText,
  removePhoneNumberInput,
  updateLastDocumented,
  phoneNumberVisible // <---- New Prop to control phone input visibility
}) => {

  return (
    <Box overflowY="auto" padding="2px" height="87vh" display="flex" flexDirection="column">
      <VStack spacing={4} align="stretch">

        <Box padding="10px">
          {phoneNumberVisible && !removePhoneNumberInput && ( // <---- Conditionally render based on phoneNumberVisible prop
            <Input
              placeholder="Enter phone number of Patient"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
          )}
          <Text color="red.500">{errorMessage}</Text>
          {wsStatus !== 'Disconnected' && (
            <Text marginTop="5px" color="green.500">
              {`AI Status: ${wsStatus}`}
            </Text>
          )}
        </Box>

      </VStack>

    </Box>

  );
};

export default VoiceNoteScreen;