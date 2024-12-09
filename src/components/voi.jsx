import React, { useState, useEffect } from 'react';
import { createClient, createMicrophoneAudioTrack, createCameraVideoTrack } from 'agora-rtc-sdk-ng';
import Recorder from 'recorder-js';
import { getAccessToken } from './api';
import { MdCall, MdCallEnd, MdVideoCall, MdVideocam, MdVideocamOff } from 'react-icons/md';
import { useSearchParams, useLocation } from 'react-router-dom';
import { ChakraProvider, Heading, Text, Spinner, Box, Flex, IconButton, Avatar, Button, VStack, Divider, Textarea } from '@chakra-ui/react';
import {  submitEdits } from './api';

const Call = () => {
    const { state } = useLocation();
    const item = state?.item || {};
    const [searchParams] = useSearchParams();
    const chanel = searchParams.get("channel");
    const [data, setData] = useState(null)
    const [isEditing, setIsEditing] = useState(false);
  const [editableFields, setEditableFields] = useState({});
  const [message, setMessage] = useState('')


    const [isJoined, setIsJoined] = useState(false);
    const [remoteAudioTracks, setRemoteAudioTracks] = useState([]);
    const [localAudioTrack, setLocalAudioTrack] = useState(null);
    const [localVideoTrack, setLocalVideoTrack] = useState(null);
    const [remoteUsers, setRemoteUsers] = useState([]);
    const [isRecording, setIsRecording] = useState(false);
    const [isVideoEnabled, setIsVideoEnabled] = useState(false);
    const [recorder, setRecorder] = useState(null);
    const [isLoading, setIsLoading] = useState(false); // New loading state
    const [userCount, setUserCount] = useState(0);

    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const destination = audioContext.createMediaStreamDestination();

    const client = createClient({ mode: 'rtc', codec: 'vp8' });

    useEffect(() => {
        client.on('user-published', async (user, mediaType) => {
            await client.subscribe(user, mediaType);
            if (mediaType === 'video') {
                setRemoteUsers((prev) => [...prev, user]);
            } else if (mediaType === 'audio') {
                user.audioTrack.play();
                setRemoteAudioTracks((prev) => [...prev, user.audioTrack]);
            }
            setUserCount((prev) => prev + 1); // Increment user count
        });
    
        client.on('user-unpublished', (user) => {
            setRemoteUsers((prev) => prev.filter((u) => u.uid !== user.uid));
            setRemoteAudioTracks((prev) =>
                prev.filter((track) => track.getUserId() !== user.uid)
            );
            setUserCount((prev) => Math.max(prev - 1, 0)); // Decrement user count
        });
    }, [client]);
    
    async function joinChannel() {
        setIsLoading(true); // Start loading
        try {
            const appId = '44787e17cd0348cd8b75366a2b5931e9';
            const token = null;
            const channel = item.channel_name || chanel;

            await client.join(appId, channel, token, null);

            const audioTrack = await createMicrophoneAudioTrack();
            await client.publish(audioTrack);
            setLocalAudioTrack(audioTrack);
            setIsJoined(true);
            setUserCount(1)

            await startRecording(audioTrack);
            console.log('Joined channel with audio.');
        } catch (error) {
            console.error('Error joining channel:', error);
        } finally {
            setIsLoading(false); // Stop loading
        }
    }

    async function enableVideo() {
        const appId = '44787e17cd0348cd8b75366a2b5931e9';
            const token = null;
            const channel = item.channel_name || chanel;

            await client.join(appId, channel, token, null);
        if (!isJoined) {
            console.error('You need to join the channel before enabling video.');
            return;
        }

        try {
            const videoTrack = await createCameraVideoTrack();
            await client.publish(videoTrack);
            setLocalVideoTrack(videoTrack);
            setIsVideoEnabled(true);
            console.log('Video enabled.');
            console.log(isVideoEnabled)
        } catch (error) {
            console.error('Error enabling video:', error);
        }
    }


    async function disableVideo() {
        if (isVideoEnabled && localVideoTrack) {
            try {
                await client.unpublish(localVideoTrack);
                localVideoTrack.stop();
                localVideoTrack.close();
                setLocalVideoTrack(null);
                setIsVideoEnabled(false);
                console.log('Video disabled.');
            } catch (error) {
                console.error('Error disabling video:', error);
            }
        }
    }

    async function leaveChannel() {
        setIsLoading(true); // Start loading
        setMessage('please wait, fetching data...')
        try {
            if (isRecording) {
                stopRecording();
            }
            
            await client.leave();

            if (localAudioTrack) {
                localAudioTrack.stop();
                localAudioTrack.close();
                setLocalAudioTrack(null);
            }

            if (localVideoTrack) {
                localVideoTrack.stop();
                localVideoTrack.close();
                setLocalVideoTrack(null);
            }

            setRemoteUsers([]);
            setRemoteAudioTracks([]);
            setIsVideoEnabled(false);
            setIsRecording(false);
            setUserCount(0)

            console.log('Left the channel and cleaned up tracks.');
        } catch (error) {
            console.error('Error leaving channel:', error);
        } finally {
            setIsLoading(false); // Stop loading
        }
    }
 
    async function joinChannelWithVideo() {
        setIsLoading(true);
        try {
            const appId = '44787e17cd0348cd8b75366a2b5931e9';
            const token = null;
            const channel = item.channel_name || chanel;

            await client.join(appId, channel, token, null);
            await startRecording(audioTrack);
            const audioTrack = await createMicrophoneAudioTrack();
            await client.publish(audioTrack);
            setLocalAudioTrack(audioTrack);

            const videoTrack = await createCameraVideoTrack();
            await client.publish(videoTrack);
            setLocalVideoTrack(videoTrack);
            setIsVideoEnabled(true);
            setIsJoined(true);

            console.log('Joined channel with audio and video.');
        } catch (error) {
            console.error('Error joining channel with video:', error);
        } finally {
            setIsLoading(false);
        }
    }
    
    function mixAudio(localTrack, remoteTracks) {
        if (localTrack) {
            const localSource = audioContext.createMediaStreamSource(localTrack.getMediaStream());
            localSource.connect(destination);
        }
    
        remoteTracks.forEach((remoteTrack) => {
            const remoteSource = audioContext.createMediaStreamSource(remoteTrack.getMediaStream());
            remoteSource.connect(destination);
        });
    
        console.log('Mixed audio stream:', destination.stream);
        return destination.stream; // Should return a valid MediaStream
    }
    
    async function startRecording() {
        try {
            const mixedStream = mixAudio(localAudioTrack, remoteAudioTracks);
            console.log('Mixed stream:', mixedStream);
            const recorderInstance = new Recorder(audioContext);
            await recorderInstance.init(mixedStream);
            await recorderInstance.start();
            setRecorder(recorderInstance);
            setIsRecording(true);
            console.log('Recording started.');
        } catch (error) {
            console.error('Error starting recording:', error);
        }
    }
    
    async function stopRecording() {
        if (recorder) {
            try {
                const { blob } = await recorder.stop();
                console.log('Recording stopped. Blob size:', blob.size);
                setIsRecording(false);
                await uploadAudio(blob);
            } catch (error) {
                console.error('Error stopping recording:', error);
            } finally {
                setRecorder(null);
            }
        } else {
            console.warn('Recorder is not initialized or already stopped.');
        }
    }
        
    async function uploadAudio(blob) {
        const phone = item.patient_phone_number
       
        const formData = new FormData();
        formData.append('audio_file', blob, 'conversation.wav');
        formData.append('phone_number', phone);
        formData.append('document', 'true');
        try {
            const token = await getAccessToken();
            const response = await fetch('https://health.prestigedelta.com/recording/', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                body: formData,
            });
              
            if (response.ok) {
                const responseData = await response.json()
                setData(responseData)
                console.log('Audio uploaded successfully.');
            } else {
                console.error('Failed to upload audio:', response.statusText);
            }
        } catch (error) {
            console.error('Error uploading audio:', error);
        }
    }

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
    if(!data){
    return (
        <ChakraProvider>
            <Flex direction="column" align="center" justify="space-between" height="100vh" padding="24px" bgColor="#2c2c2c" color="white">
                <Heading fontSize="25px" marginBottom="20px">
                  Appointment
                </Heading>

                {isVideoEnabled ? (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '20px' }}>
                        {localVideoTrack && <div ref={(ref) => ref && localVideoTrack.play(ref)} style={{ width: '320px', height: '240px', backgroundColor: 'black' }} />}
                        {remoteUsers.map((user) => (
                            <div key={user.uid} ref={(ref) => ref && user.videoTrack.play(ref)} style={{ width: '320px', height: '240px', backgroundColor: 'black' }} />
                        ))}
                    </div>
                ) : (
                    <Avatar size="2xl" name="User" backgroundColor="gray.600" marginBottom="20px" />
                )}
                {userCount === 1 && (
                <Box textAlign="center" marginTop="20px">
                    <Text fontSize="lg" color="yellow.400">
                        Waiting for other caller to join...
                    </Text>
                </Box>
            )}
                <Text>{message}</Text>
                {isLoading && (
                    <Box textAlign="center" marginTop="20px">
                        <Spinner color="blue.500" size="xl" />
                        <Text fontSize="lg">Processing...</Text>
                    </Box>
                )}

                <Flex justify="center" gap="30px" marginTop="auto" marginBottom="20px">
                    <Box textAlign="center">
                        <IconButton icon={<MdCall />} colorScheme="green" fontSize="36px" onClick={joinChannel} borderRadius="full" size="lg" />
                        <Text marginTop="5px">Start Call</Text>
                    </Box>

                    <Box textAlign="center">
                        <IconButton icon={<MdCallEnd />} colorScheme="red" fontSize="36px" onClick={leaveChannel} borderRadius="full" size="lg" />
                        <Text marginTop="5px">End Call</Text>
                    </Box>

                   {isJoined? <Box textAlign='center'> <IconButton icon={<MdVideoCall />} colorScheme="blue" fontSize="36px" onClick={enableVideo}  borderRadius="full" size="lg" />
                   <Text marginTop="5px">Enable Video</Text></Box> : <Box textAlign="center">
                        {isVideoEnabled ? (
                            <IconButton icon={<MdVideocamOff />} colorScheme="red" fontSize="36px" onClick={disableVideo} borderRadius="full" size="lg" />
                        ) : (
                            <IconButton icon={<MdVideocam />} colorScheme="green" fontSize="36px" onClick={joinChannelWithVideo}  borderRadius="full" size="lg" />
                        )}
                        <Text marginTop="5px">{isVideoEnabled ? 'Disable Video' : 'Start Video'}</Text>
                    </Box>}
                </Flex>
            </Flex>
        </ChakraProvider>
    );}

    return (
        <ChakraProvider>
        <Flex direction="column" height="80vh">
          {/* Header */}
          <Flex bg="#f0f4f8" p={2} justify="space-between" align="center" boxShadow="md">
            {data && (
              <Button
                colorScheme="teal"
                onClick={isEditing ? handleEditSubmit : () => setIsEditing(true)}
                isDisabled={!data}
              >
                {isEditing ? 'Submit' : 'Edit'}
              </Button>
            )}
            <Button colorScheme='blue' onClick={handleEditSubmit}>Save</Button>
          </Flex>
    
          {/* Main Content */}
          <Box flex="1" overflowY="auto" p={4}>
            {isRecording && !data ? (
              <Flex justify="center" align="center">
                <Spinner />
                <Text ml={2}>Fetching data...</Text>
              </Flex>
            ) : (
              data && (
                <VStack spacing={4}>
                  <Heading fontSize="lg">Patient Report</Heading>
                  <Box bg="#4682b4" color="white" p={3} borderRadius="md" w="fit-content">
                    <Text>Patient ID: {data.patient_id}</Text>
                  </Box>
                  <VStack spacing={2} align="stretch">
                    <Text>Review Time: {data.review_time}</Text>
                    <Text>Sentiment: {data.doctor_note?.sentiment}</Text>
                  </VStack>
                  <Box bg="#f0f8ff" p={4} borderRadius="md" w="100%">
                    <Heading fontSize="md">AI Response</Heading>
                    <Text>{data.doctor_note?.response}</Text>
                  </Box>
                  <VStack spacing={4} align="stretch" w="100%">
                    {Object.entries(data?.doctor_note?.review_details || {}).map(([section, details]) => (
                      <Box key={section} w="100%">
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
                </VStack>
              )
            )}
          </Box>
        </Flex>
        </ChakraProvider>
      );
    };
    

export default Call;
