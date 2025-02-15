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

  const getMessage = async () => {
    await sendOobRequest();
    const review_id = reviewId;
    try {
      const token = await getAccessToken();
      if (token) {
        const response = await fetch(
          `https://health.prestigedelta.com/updatereview/${review_id}/`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          }
        );
        const result = await response.json();
        setData(result);
        // Update the last documented timestamp in the parent
        if (typeof updateLastDocumented === 'function') {
          updateLastDocumented(new Date());
        }
      } else {
        console.log('No access token available.');
        return null;
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

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
    console.log('Submitting edits...');
    try {
      const structuredPayload = {
        review_details: {
          patient_medical_history: {
            medical_conditions: editableFields.medical_conditions || data.medical_conditions || [],
            medications: editableFields.medications || data.medications || [],
            allergies: editableFields.allergies || data.allergies || [],
            surgeries: editableFields.surgeries || data.surgeries || [],
            family_history: editableFields.family_history || data.family_history || [],
            past_medical_history: editableFields.past_medical_history || data.past_medical_history || [],
            social_history: editableFields.social_history || data.social_history || '',
          },
          subjective: {
            chief_complaint: editableFields.chief_complaint || data.chief_complaint || '',
            history_of_present_illness: editableFields.history_of_present_illness || data.history_of_present_illness || '',
          },
          objective: {
            examination_findings: editableFields.physical_examination_findings || data.physical_examination_findings || '',
            investigations: editableFields.investigations || data.investigations || [],
          },
          review_of_systems: {
            system_assessment: {
              cardiovascular: editableFields.cardiovascular || data.cardiovascular || '',
              respiratory: editableFields.respiratory || data.respiratory || '',
            },
          },
          assessment: {
            primary_diagnosis: editableFields.assessment_diagnosis || data.assessment_diagnosis || '',
            differential_diagnosis: editableFields.differential_diagnosis || data.differential_diagnosis || [],
            status: editableFields.status || data.status || '',
            health_score: editableFields.health_score || data.health_score || null,
          },
          plan: {
            management: editableFields.management_plan || data.management_plan || '',
            lifestyle_advice: editableFields.lifestyle_advice || data.lifestyle_advice || '',
            follow_up: editableFields.follow_up || data.follow_up || '',
            patient_education: editableFields.patient_education || data.patient_education || '',
            treatment_goal: editableFields.treatment_goal || data.treatment_goal || '',
            next_review: editableFields.next_review || data.next_review || '',
          },
          reasoning: {
            diagnosis_reasoning: editableFields.diagnosis_reason || data.diagnosis_reason || '',
            plan_reasoning: editableFields.management_plan_reason || data.management_plan_reason || '',
          },
          investigations: editableFields.investigations || data.investigations || [],
          prescriptions: editableFields.prescriptions || data.prescriptions || [],
        },
      };

      const token = await getAccessToken();
      if (!token) {
        console.log('No access token available.');
        return;
      }
      const response = await fetch(
        `https://health.prestigedelta.com/updatereview/${reviewId}/`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(structuredPayload),
        }
      );
      if (!response.ok) {
        console.error(`Failed to submit edits: ${response.statusText}`);
        alert(`Error: ${response.statusText}`);
        return null;
      }
      setIsEditing(false);
      const result = await response.json();
      console.log('Submission successful:', result);
      return result;
    } catch (error) {
      console.error('Error submitting edits:', error);
      alert('Failed to submit edits');
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
            .replace(/_/g, ' ')
            .toLowerCase()
            .replace(/^\w/, (c) => c.toUpperCase())}:
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
            colorScheme="teal"
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
          {data ? (
            <Button mt="10px" colorScheme="blue" onClick={handleEditSubmit}>
              Save
            </Button>
          ) : null}
          <HStack justify="center">
            <Button
              onClick={toggleRecording}
              colorScheme={isRecording ? 'red' : 'teal'}
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
        {wsStatus === 'Connected' && (
          <Box>
            {!data ? (
              <Button m={3} onClick={getMessage} colorScheme="purple">
                Document
              </Button>
            ) : (
              <Button onClick={getMessage} colorScheme="purple">
                Update Document
              </Button>
            )}
          </Box>
        )}
      </VStack>
      {wsStatus === 'Connected' && data ? (
        <VStack spacing={4}>
          <Heading fontSize="lg">Patient Report</Heading>
          <VStack spacing={2} align="stretch" width="100%">
            {Object.entries(data?.doctor_note || {}).map(([section, details]) => (
              <Box key={section} width="100%">
                <Text fontWeight="bold" mt={4} mb={2}>
                  {section
                    .replace(/_/g, ' ')
                    .toLowerCase()
                    .replace(/^\w/, (c) => c.toUpperCase())}
                  :
                </Text>
                {typeof details === 'object'
                  ? Object.entries(details).map(([key, value]) => renderEditableField(key, value))
                  : renderEditableField(section, details)}
                <Divider />
              </Box>
            ))}
          </VStack>
          <Button
            colorScheme="teal"
            onClick={isEditing ? handleEditSubmit : () => setIsEditing(true)}
          >
            {isEditing ? <div>{isLoading ? <Spinner /> : 'Submit Edits'}</div> : 'Edit'}
          </Button>
        </VStack>
      ) : null}
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
