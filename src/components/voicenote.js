// voicenote.js
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
  updateLastDocumented, // new callback prop from parent
}) => {
  // (States for recording, editing, animation, etc.)
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(900);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [data, setData] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editableFields, setEditableFields] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shouldStartRecording, setShouldStartRecording] = useState(false);
  const [animationIndex, setAnimationIndex] = useState(0);
  const animationMessages = [
    "Warming up the microphone...",
    "Connecting to our server...",
    "Preparing a fun consultation...",
    "Almost ready!",
  ];

  const toast = useToast();
  const audioStream = useRef(null);
  const audioContext = useRef(null);
  const scriptProcessor = useRef(null);
  const desiredSampleRate = 16000;
  const debugLogRef = useRef(null);
  const timerRef = useRef(null);

  // ---------------------------
  // Billing and Editing Helpers
  // ---------------------------
  const handleBilling = async () => {
    try {
      const phone = ite.patient_phone_number;
      const formatPhoneNumber = (phoneNumber) => {
        if (phoneNumber.startsWith('+234')) return phoneNumber;
        return `+234${phoneNumber.slice(1)}`;
      };
      const formattedPhone = formatPhoneNumber(phone);
      const token = await getAccessToken();
      const item = {
        appointment_id: ite.id,
        seconds_used: timeElapsed,
      };
      const response = await fetch('https://health.prestigedelta.com/billing/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(item),
      });
      const result = await response.json();
      if (response.status !== 201) {
        console.log(result.message || 'An error occurred');
      } else {
        console.log(result.message || 'Billing successful');
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleStartConsultation = async () => {
    setLoading(true);
    await connectWebSocket();
    setLoading(false);
    setShouldStartRecording(true);
  };



  const log = (message) => {
    const time = new Date().toLocaleTimeString();
    if (debugLogRef.current) {
      debugLogRef.current.innerHTML += `[${time}] ${message}\n`;
      debugLogRef.current.scrollTop = debugLogRef.current.scrollHeight;
    } else {
      console.log(`[${time}] ${message}`);
    }
  };

  // Clean up on unmount.
  useEffect(() => {
    return () => {
      stopRecording(false);
    };
  }, []);

  // Start recording once the WebSocket is connected.
  useEffect(() => {
    if (wsStatus === 'Connected' && shouldStartRecording && !isRecording) {
      startRecording();
      setShouldStartRecording(false);
    }
  }, [wsStatus, shouldStartRecording, isRecording]);

  useEffect(() => {
    if (wsStatus === 'Disconnected') {
      handleBilling();
    }
  }, [wsStatus]);

  // Animation messages effect.
  useEffect(() => {
    let animationInterval;
    if (loading && wsStatus !== 'Connected') {
      animationInterval = setInterval(() => {
        setAnimationIndex((prevIndex) => (prevIndex + 1) % animationMessages.length);
      }, 10000);
    }
    return () => {
      if (animationInterval) clearInterval(animationInterval);
    };
  }, [loading, wsStatus, animationMessages.length]);

  // ---------------------------
  // Recording Functions
  // ---------------------------
  const startRecording = async () => {
    log('Attempting to start recording...');
    if (!ws?.current || ws.current.readyState !== WebSocket.OPEN) {
      log('WebSocket is not connected.');
      alert('WebSocket is not connected. Please set up the session first.');
      return;
    }
    try {
      audioContext.current =
        audioContext.current ||
        new (window.AudioContext || window.webkitAudioContext)({
          sampleRate: desiredSampleRate,
        });
      audioStream.current = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: desiredSampleRate,
          channelCount: 1,
        },
      });
      const sourceNode = audioContext.current.createMediaStreamSource(audioStream.current);
      scriptProcessor.current = audioContext.current.createScriptProcessor(2048, 1, 1);
      scriptProcessor.current.onaudioprocess = (audioProcessingEvent) => {
        const inputBuffer = audioProcessingEvent.inputBuffer.getChannelData(0);
        const pcmBuffer = pcmEncode(inputBuffer);
        if (ws.current?.readyState === WebSocket.OPEN) {
          ws.current.send(pcmBuffer);
        }
      };
      sourceNode.connect(scriptProcessor.current);
      scriptProcessor.current.connect(audioContext.current.destination);
      // Timer setup
      setTimeElapsed(0);
      setRecordingTime(900);
      const interval = setInterval(() => {
        setTimeElapsed((prev) => prev + 1);
        setRecordingTime((prev) => {
          if (prev <= 0) {
            stopRecording(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      timerRef.current = interval;
      setIsRecording(true);
      log('Recording started.');
    } catch (error) {
      log(`Error starting recording: ${error.message}`);
      alert('Error accessing microphone. Please ensure microphone permissions are granted.');
    }
  };

  const stopRecording = async (shouldDisconnect) => {
    log('Attempting to stop recording...');
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (scriptProcessor.current) {
      scriptProcessor.current.disconnect();
      scriptProcessor.current.onaudioprocess = null;
      scriptProcessor.current = null;
    }
    if (audioStream.current) {
      audioStream.current.getTracks().forEach((track) => track.stop());
      audioStream.current = null;
    }
    setRecordingTime(900);
    setIsRecording(false);
    log('Recording stopped.');
    await handleBilling();
    if (shouldDisconnect) {
      disconnectWebSocket();
    }
  };

  const pcmEncode = (input) => {
    const buffer = new ArrayBuffer(input.length * 2);
    const output = new DataView(buffer);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      output.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return buffer;
  };

  const toggleRecording = async () => {
    if (isRecording) {
      await stopRecording(true);
    } else {
      await startRecording();
    }
  };

  const formatTime = (timeInSeconds) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = timeInSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  return (
    <Box overflowY="auto" padding="2px" height="87vh" display="flex" flexDirection="column">
      <VStack spacing={4} align="stretch">
        <Flex bg="#f0f4f8" padding={2} justifyContent="space-between" alignItems="center" boxShadow="md">
          <Button
            onClick={handleStartConsultation}
            isDisabled={wsStatus === 'Connected' || loading}
            colorScheme="blue"
            marginTop="10px"
          >
            {loading ? <Spinner size="sm" /> : 'Start Consultation'}
          </Button>
          {loading && wsStatus !== 'Connected' && (
            <Box mt={2} textAlign="center">
              <Text fontSize="lg" fontWeight="bold">
                {animationMessages[animationIndex]}
              </Text>
            </Box>
          )}
          
          <HStack justify="center">
            <Button
              onClick={toggleRecording}
              colorScheme={isRecording ? 'red' : 'blue'}
              borderRadius="50%"
              width="40px"
              height="40px"
            >
              <Icon as={isRecording ? MdStop : MdMic} boxSize={8} />
            </Button>
            <Text>{isRecording ? formatTime(recordingTime) : 'Record'}</Text>
          </HStack>
        </Flex>
        <Box padding="10px">
          {!removePhoneNumberInput && (
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
      <Box
        ref={debugLogRef}
        height="150px"
        overflowY="scroll"
        border="1px solid #ccc"
        borderRadius="5px"
        padding="10px"
        backgroundColor="#f9f9f9"
      />

          </Box>
          
  );
};

export default VoiceNoteScreen;
