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
import { useNavigate } from 'react-router-dom';
import { sendAudioFile, submitEdits } from './api';
import { useReview } from './context';
import Recorder from 'recorder-js';

const VoiceNoteScreen = () => {
  const navigate = useNavigate()
  const { setReview } = useReview();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [recording, setRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [timer, setTimer] = useState(0);
  const recorderRef = useRef(null);

  const audioContextRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const [data, setData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editableFields, setEditableFields] = useState({});
  const [reviewId, setReviewId] = useState(null);
  const [isLoading, setIsLoading] = useState(false)
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
  
    // Create the structured payload
    const structuredPayload = {
      review_details: {
        patient_medical_history: {
          medical_conditions: editableFields.medical_conditions || data.medical_conditions || [],
          medications: editableFields.medications || data.medications || [],
          allergies: editableFields.allergies || data.allergies || [],
          surgeries: editableFields.surgeries || data.surgeries || [],
          family_history: editableFields.family_history || data.family_history || [],
          past_medical_history: editableFields.past_medical_history || data.past_medical_history || [],
          social_history: editableFields.social_history || data.social_history || "",
        },
        subjective: {
          chief_complaint: editableFields.chief_complaint || data.chief_complaint || "",
          history_of_present_illness: editableFields.history_of_present_illness || data.history_of_present_illness || "",
        },
        objective: {
          examination_findings: editableFields.physical_examination_findings || data.physical_examination_findings || "",
          investigations: editableFields.investigations || data.investigations || [],
        },
        review_of_systems: {
          system_assessment: {
            cardiovascular: editableFields.cardiovascular || data.cardiovascular || "",
            respiratory: editableFields.respiratory || data.respiratory || "",
          },
        },
        assessment: {
          primary_diagnosis: editableFields.assessment_diagnosis || data.assessment_diagnosis || "",
          differential_diagnosis: editableFields.differential_diagnosis || data.differential_diagnosis || [],
          status: editableFields.status || data.status || "",
          health_score: editableFields.health_score || data.health_score || null,
        },
        plan: {
          management: editableFields.management_plan || data.management_plan || "",
          lifestyle_advice: editableFields.lifestyle_advice || data.lifestyle_advice || "",
          follow_up: editableFields.follow_up || data.follow_up || "",
          patient_education: editableFields.patient_education || data.patient_education || "",
          treatment_goal: editableFields.treatment_goal || data.treatment_goal || "",
          next_review: editableFields.next_review || data.next_review || "",
        },
        reasoning: {
          diagnosis_reasoning: editableFields.diagnosis_reason || data.diagnosis_reason || "",
          plan_reasoning: editableFields.management_plan_reason || data.management_plan_reason || "",
        },
        investigations: editableFields.investigations || data.investigations || [],
        prescriptions: editableFields.prescriptions || data.prescriptions || [],
      },
    };
  
    try {
      const response = await submitEdits(data, structuredPayload);
      if (response) {
        console.log('Edit submission successful:', response);
        setIsEditing(false);
        setData(null); // Update data with changes
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
    } else {
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
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const recorder = new Recorder(audioContext);
      recorder.init(stream);
      recorderRef.current = recorder;

      // Start recording
      recorder.start();
      setRecording(true);
      setIsPaused(false);

      // Start 1-minute interval for sending audio
      timerRef.current = setInterval(async () => {
        const audioData = await recorder.stop(); // Stop and fetch current chunk
        audioChunksRef.current.push(audioData.blob); // Save chunk
        await sendRecording(audioData.blob); // Send current chunk
        recorder.start(); // Restart recorder for the next chunk
      }, 60000); // 1-minute interval
    } catch (error) {
      console.error('Error accessing microphone:', error);
      setErrorMessage('Could not access microphone.');
    }
  };

  const pauseRecording = async () => {
    if (recorderRef.current && recording) {
      clearInterval(timerRef.current); // Stop the timer
      timerRef.current = null; // Clear interval reference
  
      const audioData = await recorderRef.current.stop();
      audioChunksRef.current.push(audioData.blob); // Save the current chunk
  
      setIsPaused(true);
  
      // Send the recording asynchronously without blocking
      sendRecording(audioData.blob, true).catch((error) => {
        console.error('Error sending paused recording:', error);
      });
    }
  };
  

  const resumeRecording = () => {
    if (recorderRef.current && isPaused) {
      recorderRef.current.start(); // Resume recording
      setIsPaused(false);

      // Restart 1-minute interval
      timerRef.current = setInterval(async () => {
        const audioData = await recorderRef.current.stop();
        audioChunksRef.current.push(audioData.blob);
        await sendRecording(audioData.blob);
        recorderRef.current.start();
      }, 60000);
    }
  };

  const stopRecording = async () => {
    if (recorderRef.current && recording) {
      clearInterval(timerRef.current); // Stop the timer
      const audioData = await recorderRef.current.stop(); // Get final chunk
      audioChunksRef.current.push(audioData.blob); // Save it
      // Send it
      setRecording(false);
      setIsPaused(false);
      setTimer(0);
      await sendRecording(audioData.blob, true);
    }
  };

  const sendRecording = async (audioBlob, documentation = false) => {
    setIsLoading(true);
    const phone = `+234${phoneNumber.slice(1)}`;
    
    try {
      const recipient = reviewId === null ? phone : reviewId; // Use reviewId if available; otherwise, phoneNumber
      // Use reviewId if available; otherwise, phoneNumber
      const response = await sendAudioFile(audioBlob, recipient, documentation);
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
  {key
    .replace(/_/g, ' ') // Replace underscores with spaces
    .toLowerCase()      // Convert the entire string to lowercase
    .replace(/^\w/, (c) => c.toUpperCase())}: {/* Capitalize the first letter */}
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
    <Flex direction="column" height="80vh">
    {/* Header with Recording Controls */}
    <Flex
      bg="#f0f4f8"
      padding={2}
      justifyContent="space-between"
      alignItems="center"
      boxShadow="md"
    >{data? (
     <Button
      colorScheme="teal"
      onClick={isEditing ? handleEditSubmit : () => setIsEditing(true)}
      isDisabled={!data} // Disable if no data is available
    >
      {isEditing ? 'Submit' : 'Edit'}
    </Button>): null}
  
      <Text>Time: {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}</Text>
      <Flex gap={4}>
        {recording ? (
          <>
            <Button
              colorScheme="yellow"
              onClick={isPaused ? resumeRecording : pauseRecording}
            >
              {isPaused ? 'Resume' : 'Pause'}
            </Button>
            <Button colorScheme="red" onClick={isPaused ? handleEditSubmit : stopRecording }>
            {isPaused? 'Save' : 'Stop'}
            </Button>
          </>
        ) : (
          <Button colorScheme="blue" onClick={startRecording}>
            Start Recording
          </Button>
        )}
      </Flex>
    </Flex>

    {/* Main Content */}
    <Box flex="1" overflowY="auto" padding={4}>
      {isLoading && !data ? (
        <Flex justifyContent="center" alignItems="center">
          <Spinner />
          <Text ml={2}>Fetching data...</Text>
        </Flex>
      ) : data ? (
        <VStack spacing={4}>
          <Heading fontSize="lg">Patient Report</Heading>
          <Box
            bg="#4682b4"
            color="white"
            padding={3}
            borderRadius="md"
            width="fit-content"
          >
            <Text>Patient ID: {data.patient_id}</Text>
          </Box>
          <VStack spacing={2} align="stretch">
            <Text>Review Time: {data.review_time}</Text>
            <Text>Sentiment: {data.doctor_note?.sentiment}</Text>
          </VStack>
          <Box bg="#f0f8ff" padding={4} borderRadius="md" width="100%">
            <Heading fontSize="md">AI Response</Heading>
            <Text>{data.doctor_note?.response}</Text>
          </Box>
          <VStack spacing={4} align="stretch" width="100%">
            {Object.entries(data?.doctor_note?.review_details || {}).map(
              ([section, details]) => (
                <Box key={section} width="100%">
                <Text fontWeight="bold" mt={4} mb={2}>
  {section
    .replace(/_/g, ' ') // Replace underscores with spaces
    .toLowerCase()      // Convert the entire string to lowercase
    .replace(/^\w/, (c) => c.toUpperCase())}: {/* Capitalize the first letter */}
</Text>
                 
                  {typeof details === 'object'
                    ? Object.entries(details).map(([key, value]) =>
                        renderEditableField(key, value)
                      )
                    : renderEditableField(section, details)}
                  <Divider />
                </Box>
              )
            )}
          </VStack>
          <Button
            colorScheme="teal"
            onClick={isEditing ? handleEditSubmit : () => setIsEditing(true)}
          >
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
  </Flex>
  );
};

export default VoiceNoteScreen;
