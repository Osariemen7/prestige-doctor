import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Button,
  Input,
  Text,
  VStack,
  Spinner,
  Flex,
  Textarea,
  Divider,
  Heading,
  IconButton,
  ChakraProvider
} from '@chakra-ui/react';
import WebRTCComponent from './ai';
import { getAccessToken } from './api';
import { AiOutlineArrowLeft } from 'react-icons/ai'; // Import the back arrow icon
import { BiMicrophone } from 'react-icons/bi';
import { useNavigate, useLocation } from 'react-router-dom';

const Talk = () => {
    const [phoneNumber, setPhoneNumber] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [ephemeralKey, setEphemeralKey] = useState('');
  const [load, setLoad] =useState(false)
  const navigate = useNavigate()
   const { state } = useLocation();
      const ite = state?.result || {};
    
  const stopAudio = () => {
    setEphemeralKey('');
  };
    // Fetch the ephemeral key from your server
    const getEphemeralKey = async () => {
      
      setErrorMessage('');
      setLoad(true)
      const accessToken = await getAccessToken()
      const phone_number = ite.user.phone_number
      let item = {phone_number}
      try {
        const response = await fetch('https://service.prestigedelta.com/openaisession/',{
          method: "POST",
          headers:{'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          'accept' : 'application/json'
          },
          body: JSON.stringify(item)
          })
        const data = await response.json();
        setEphemeralKey(data.client_secret.value);
        setLoad(false)
      } catch (error) {
        console.error('Error fetching ephemeral key:', error);
      }
    };

    return(
        <ChakraProvider>
        <Box minH="100vh" overflowY="auto">
      <div className="back-icon" onClick={() => navigate("/log")}>
        <AiOutlineArrowLeft size={24} />
        <span className="back-text"></span>
      </div>
      <Flex direction="column" align="center" p="24px" gap="20px" maxW="400px" mx="auto">
        <Heading fontSize="28px" mb="16px">
          Speak with AI
        </Heading>

        {ephemeralKey ? (
          <Box position="relative" width="100%" mb="16px">
            <WebRTCComponent ephemeralKey={ephemeralKey} />
            <Flex justifyContent="center">
              <Button mt="16px" colorScheme="red" onClick={stopAudio}>
                Stop
              </Button>
            </Flex>
          </Box>
        ) : !load ? (
          <Box textAlign="center">
            <IconButton
              icon={<BiMicrophone />}
              colorScheme="green"
              fontSize="36px"
              onClick={getEphemeralKey}
              borderRadius="full"
              size="lg"
            />
            <Text mt="8px">Start Audio</Text>
          </Box>
        ) : (
          <Spinner size="lg" />
        )}
      </Flex>
    </Box>
      </ChakraProvider>
    );

}
export default Talk