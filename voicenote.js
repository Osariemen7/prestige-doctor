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
} from '@chakra-ui/react';
import { sendAudioFile, submitEdits } from './api';
import { useReview } from './context';

const VoiceNoteScreen = () => {
  const { setReview } = useReview();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [recording, setRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [data, setData] = useState(null);
  const [timer, setTimer] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editableFields, setEditableFields] = useState({});
  const [reviewId, setReviewId] = useState(null);
  const audioRecorder = useRef(null);
  const lastRecordingUri = useRef(null);
  const intervalId = useRef(null);
  const [audioURL, setAudioURL] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  
  const editableFieldKeys = [
    'chief_complaint',
    'history_of_present_illness',
    'past_medical_history',
    'medications',
    'allergies',
    'family_history',
    'social_history',
    'review_of_systems',
    'physical_examination_findings',
    'differential_diagnosis',
    'diagnosis_reason',
    'assessment_diagnosis',
    'management_plan',
    'lifestyle_advice',
    'patient_education',
    'follow_up_plan',
    'management_plan_reason',
    'follow_up',
    'daily_progress_notes',
    'discharge_instructions',
  ];

  const handleInputChange = (key, value) => {
    setEditableFields((prev) => ({ ...prev, [key]: value }));
  };

  const handleEditSubmit = async () => {
    setIsLoading(true);
    try {
      const response = await submitEdits(data, editableFields);
      if (response) {
        console.log('Edit submission successful:', response);
        setIsEditing(false);
        setData(response); // Update data with changes
      }
    } catch (error) {
      console.error('Error submitting edits:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let timerInterval;
    if (recording && !isPaused) {
      timerInterval = setInterval(() => setTimer((prev) => prev + 1), 1000);
    }    else {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => clearInterval(timerInterval);
  
  }, [recording, isPaused]);

  const startRecording = async () => {
    if (phoneNumber.length !== 11) {
      setErrorMessage('Please enter a valid 11-digit phone number');
      return;
    }
    setErrorMessage('');
    setTimer(0);

    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Send final recording
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        await sendRecording(audioBlob);
      };

      mediaRecorder.start();
      setRecording(true);
      setIsPaused(false);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      setErrorMessage('Could not access microphone.');
    }
  };

  const pauseRecording = async () => {
    if (mediaRecorderRef.current && recording) {
      // Request the current data chunk
      mediaRecorderRef.current.requestData();
  
      // Pause the recorder
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      clearInterval(timerRef.current); // Stop the timer
      timerRef.current = null; // Clear the interval reference
  
      // Wait for any pending data to be flushed
      setTimeout(async () => {
        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
          await sendRecording(audioBlob);
          audioChunksRef.current = []; // Clear the chunks after sending
        }
      }, 100); // Allow a short delay for data to flush
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
    }
  };

  const stopRecording = async () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      setIsPaused(false);
      setTimer(0);
    }
  };

  const sendRecording = async (audioBlob) => {
    setIsLoading(true);
    const phone =`+234${phoneNumber.slice(1)}`;
    try {
      const recipient = reviewId || phone; // Use reviewId if available; otherwise, phoneNumber
      const response = await sendAudioFile(audioBlob, recipient);

      if (response?.review_id) {
        setReview(response.review_id)
        setReviewId(response.review_id); // Save reviewId after the first successful response
        setData(response); // Update UI with the response
        console.log(response)
      } else {
        console.error('Error in response:', response);
      }
    } catch (error) {
      console.error('Error sending audio file:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderEditableField = (key, value) => {
    const isEditable = editableFieldKeys.includes(key);
    const displayValue = editableFields[key] ?? value;
  
    return (
      <Box
        key={key}
        bg={isEditable ? 'gray.100' : 'white'}
        p={4}
        borderRadius="md"
        borderWidth={isEditable ? '1px' : '0'}
        borderColor={isEditable ? 'teal.300' : 'transparent'}
      >
        <Text fontWeight="bold" mb={2}>
          {key.replace(/_/g, ' ')}:
        </Text>
        {isEditable && isEditing ? (
          <Textarea
            value={displayValue}
            onChange={(e) => handleInputChange(key, e.target.value)}
            size="sm"
            resize="vertical"
            bg="white"
          />
        ) : (
          <Text>
            {typeof value === 'object' ? JSON.stringify(value, null, 2) : value}
          </Text>
        )}
      </Box>
    );
  };

  return (
    <Flex direction="column" height="80vh"  >
      <Box flex="1" overflowY="auto" padding={1}>
        {isLoading && !data ? (
          <Flex justifyContent="center" alignItems="center">
            <Spinner />
            <Text ml={2}>Fetching data...</Text>
          </Flex>
        ) : data ? (
          <VStack>
          <Heading fontSize='20px'>Patient Report</Heading>
          <Box  backgroundColor='#4682b4' 
  w='fit-content' 
  p={3} 
  ml={0} 
  display='flex'>
  <Heading fontSize='16px' color='#fff'>Patient ID: {data.patient_id}</Heading>
</Box>

          <VStack  spacing={2} align="stretch">
          
            
            <Heading fontSize='13px'>Review Time: {data.review_time}</Heading>
            <Heading fontSize='13px'>Sentiment: {data.doctor_note?.sentiment}</Heading>
          </VStack>
          <Box backgroundColor='#f0f8ff' p={2}>
          <Heading fontSize='16px'>AI Response</Heading>
          <Text> {data.doctor_note?.response}</Text>
          </Box>
          <VStack align="stretch" spacing={4} w="100%">
      {Object.entries(data?.doctor_note?.review_details || {}).map(([section, details]) => (
        <Box key={section} w="100%">
          <Text fontSize="lg" fontWeight="bold" mt={4} mb={2}>
            {section.replace(/_/g, ' ')}
          </Text>
          {typeof details === 'object'
            ? Object.entries(details).map(([key, value]) => renderEditableField(key, value))
            : renderEditableField(section, details)}
          <Divider />
        </Box>
      ))}
    </VStack>
    

  <Button colorScheme="teal" onClick={isEditing ? handleEditSubmit : () => setIsEditing(true)}>
    {isEditing ? 'Submit Edits' : 'Edit'}
  </Button>
</VStack>

        ) : (
          <VStack spacing={4} align="stretch">
            <Input
              placeholder="Enter phone number of Patient"
              maxLength={11}
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
            {errorMessage && <Text color="red.500">{errorMessage}</Text>}
          </VStack>
        )}
      </Box>

      <Box padding={4} bg="white" boxShadow="md">
      <Text mb={2}>
        Recorded Time: {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}
      </Text>
      {recording ? (
        <Flex justifyContent="space-between">
          <Button colorScheme="yellow" onClick={isPaused ? resumeRecording : pauseRecording}>
            {isPaused ? 'Resume' : 'Pause'}
          </Button>
          <Button colorScheme="red" onClick={stopRecording}>
            End
          </Button>
        </Flex>
      ) : (
        <Button colorScheme="blue" width="100%" onClick={startRecording}>
          Start Recording
        </Button>

        )}
      </Box>
    </Flex>
  );
};

export default VoiceNoteScreen;
