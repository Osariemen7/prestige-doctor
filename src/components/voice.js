import React, { useState, useEffect, useRef } from 'react';
import { createClient, createMicrophoneAudioTrack, createCameraVideoTrack } from 'agora-rtc-sdk-ng';
import Recorder from 'recorder-js';
import { getAccessToken } from './api';
import axios from 'axios';
import { MdCall, MdCallEnd, MdVideoCall, MdVideocam, MdVideocamOff, MdDescription } from 'react-icons/md';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { ChakraProvider, Heading, Text, Spinner, Box, Flex, IconButton, Avatar, 
  Popover, PopoverTrigger, PopoverContent, PopoverBody, PopoverArrow, PopoverCloseButton } from '@chakra-ui/react';
import VideoDisplay from './vod';

const Voice = () => {
    const { state } = useLocation();
    const item = state?.item || {};
    const [searchParams] = useSearchParams();
    const chanel = searchParams.get("channel");
  

    const [vid, setVid] = useState(false)
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
    const [callDuration, setCallDuration] = useState(900); // Countdown from 60 seconds
    const [timerId, setTimerId] = useState(null);
    const timerIdRef = useRef('')
    const navigate = useNavigate()
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const destination = audioContext.createMediaStreamDestination();
    const [transcript, setTranscript] = useState('');
    const [assemblyAiToken, setAssemblyAiToken] = useState('');
    const assemblyWsRef = useRef(null);
    let transcriptionInterval = null;

    const [isSaving, setIsSaving] = useState(false);
    const [data, setData] = useState(null);
    const [editableData, setEditableData] = useState(null);
    const [suggestionData, setSuggestionData] = useState(null);
    const [appliedSuggestions, setAppliedSuggestions] = useState({
        profile: {},
        goals: {},
        review: {}
    });
    const [snackbarSeverity, setSnackbarSeverity] = useState('success');
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const isGettingSuggestion = useRef(false);
    const { state: locationState } = useLocation();
    const reviewid = locationState?.item?.review_id;
    const thread = locationState?.item?.thread_id;

    const client = createClient({ mode: 'rtc', codec: 'vp8' });

    const getSuggestion = async () => {
        if (isGettingSuggestion.current) return;
        isGettingSuggestion.current = true;
    
        setIsSaving(true);
        try {
            let suggestionPayload = {
                note: JSON.parse(JSON.stringify(editableData))
            };
    
            if (transcript) {
                const currentTime = new Date().toISOString();
                suggestionPayload.transcript = [
                    {
                        time: currentTime,
                        speaker: "patient",
                        content: transcript
                    },
                    {
                        time: currentTime,
                        speaker: "doctor",
                        content: ''
                    }
                ];
            }
    
            if (thread) {
                suggestionPayload.note.thread_id = thread;
            }
    
            const accessToken = await getAccessToken();
            const response = await axios.post(
                `https://health.prestigedelta.com/documentreview/${reviewid}/generate-documentation/`,
                suggestionPayload,
                {
                    headers: { Authorization: `Bearer ${accessToken}` },
                }
            );
    
            const result = response.data;
            setData(result); // Update the main data
            setEditableData(JSON.parse(JSON.stringify(result))); // Update editable data
            setSuggestionData(result); // Update suggestion data
    
            setAppliedSuggestions({
                profile: {},
                goals: {},
                review: {}
            });
    
            setSnackbarSeverity('success');
            setSnackbarMessage('Suggestion generated successfully!');
            setSnackbarOpen(true);
            return true;
        } catch (error) {
            console.error("Error getting suggestion:", error);
            setSnackbarSeverity('error');
            setSnackbarMessage('Failed to generate suggestion.');
            setSnackbarOpen(true);
            return false;
        } finally {
            setIsSaving(false);
            isGettingSuggestion.current = false;
        }
    };

    useEffect(() => {
        client.on('user-published', async (user, mediaType) => {
          await client.subscribe(user, mediaType);
      
          if (mediaType === 'video') {
            setRemoteUsers((prev) => [...prev, user]);
          } else if (mediaType === 'audio') {
            user.audioTrack.play();
            setRemoteAudioTracks((prev) => [...prev, user.audioTrack]);
          }
      
          setUserCount((prev) => {
            const newCount = prev + 1;
            // Only start timer when second user joins
            if (newCount === 2) {
                startTimer();
            }
            return newCount;
          });
        });
      
        client.on('user-unpublished', (user) => {
          setRemoteUsers((prev) => prev.filter((u) => u.uid !== user.uid));
          setRemoteAudioTracks((prev) =>
            prev.filter((track) => track.getUserId() !== user.uid)
          );
          setUserCount((prev) => {
            const newCount = Math.max(prev - 1, 0);
            // Stop timer if less than 2 users
            if (newCount < 2) {
                stopTimer();
            }
            return newCount;
          });
        });
      }, [client, timerId, userCount]);
      

      const startTimer = () => {
        setCallDuration(900); // Reset duration
        if (timerIdRef.current) clearInterval(timerIdRef.current); // Clear any existing interval
        const id = setInterval(() => {
            setCallDuration((prev) => {
                if (prev <= 1) {
                    clearInterval(id);
                    leaveChannel();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        timerIdRef.current = id; // Store interval ID in useRef
    };
    
    useEffect(() => {
        return () => {
            if (timerIdRef.current) clearInterval(timerIdRef.current); // Clear timer on component unmount
        };
    }, []);
      
    
      const stopTimer = () => {
        if (timerId) {
            clearInterval(timerId);
            setTimerId(null);
        }
    };
    
    
    async function joinChannelWithVideo() {
        if (isJoined) {
            console.warn('You are already in the channel.');
            return;
        }
    
        setIsLoading(true);
        try {
            const appId = '44787e17cd0348cd8b75366a2b5931e9';
            const token = null;
            const channel = item.channel_name || chanel;
    
            await client.join(appId, channel, token, null);
           
            const audioTrack = await createMicrophoneAudioTrack({
                constraints: {
                    audio: true
                }
            });

            await client.publish(audioTrack);
            setLocalAudioTrack(audioTrack);
            console.log('Local Audio Track Published', audioTrack);

            const videoTrack = await createCameraVideoTrack();
            await client.publish(videoTrack);
            setLocalVideoTrack(videoTrack);
            setIsVideoEnabled(true);
            setIsJoined(true);
            setUserCount(1);
            // Removed startTimer() from here since we only want it to start when second user joins
    
            console.log('Joined channel with audio and video.');
    
            // Add listener to stop all tracks on page unload
            window.onbeforeunload = () => {
                leaveChannel();
            };
        } catch (error) {
            console.error('Error joining channel with video:', error);
        } finally {
            setIsLoading(false);
        }
    }
    
    

    async function disableVideo() {
        if (isVideoEnabled && localVideoTrack) {
            try {
                localVideoTrack.stop();
                localVideoTrack.close();
                setLocalVideoTrack(null);
                setIsVideoEnabled(false);
                setVid(true)
                console.log('Video disabled.');
            } catch (error) {
                console.error('Error disabling video:', error);
            }
        }
    }
      

   async function leaveChannel() {
    setIsLoading(true); // Start loading
    try {
        if (isJoined) {
            console.log('Leaving channel...');
            await client.leave();
            stopTimer();
        }

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

        remoteAudioTracks.forEach((track) => track.stop());
        setRemoteAudioTracks([]);

        setRemoteUsers([]);
        setIsVideoEnabled(false);
        setIsRecording(false);
        setUserCount(0);
        setIsJoined(false);

        console.log('Left the channel and cleaned up tracks.');
    } catch (error) {
        console.error('Error leaving channel:', error);
    } finally {
        setIsLoading(false); // Stop loading
        navigate('/');
            window.location.href = 'https://prestige-health.vercel.app/';
    }
}

    
    
    async function enableVideo() {
        try {
          const videoTrack = await createCameraVideoTrack();
          
          setLocalVideoTrack(videoTrack);
          setIsVideoEnabled(true);
          console.log('Video enabled.');
          console.log(isVideoEnabled)
      } catch (error) {
          console.error('Error enabling video:', error);
      }
  }
   
    const formatDuration = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

    // Add transcription WebSocket connection
    const connectWebSocket = async () => {
        if (!assemblyAiToken) return;

        const socketUrl = `wss://api.assemblyai.com/v2/realtime/ws?sample_rate=16000&token=${assemblyAiToken}`;
        assemblyWsRef.current = new WebSocket(socketUrl);

        assemblyWsRef.current.onmessage = (message) => {
            const data = JSON.parse(message.data);
            if (data.message_type === 'FinalTranscript') {
                setTranscript(prev => prev + ' ' + data.text);
            }
        };

        // Send transcription every 15 seconds to suggestion API
        transcriptionInterval = setInterval(() => {
            if (transcript) {
                sendTranscriptionToApi(transcript);
            }
        }, 15000);
    };

    const sendTranscriptionToApi = async (text) => {
        try {
            const token = await getAccessToken();
            await fetch('https://health.prestigedelta.com/suggestions/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ transcript: text })
            });
        } catch (error) {
            console.error('Error sending transcription:', error);
        }
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (assemblyWsRef.current) {
                assemblyWsRef.current.close();
            }
            if (transcriptionInterval) {
                clearInterval(transcriptionInterval);
            }
        };
    }, []);

    return (
        <ChakraProvider>
        <Box position="relative" height="95vh" width="100%" bg="#2c2c2c">
            {/* Full-Screen Video */}
            <VideoDisplay localVideoTrack={localVideoTrack} remoteUsers={remoteUsers} />

            {/* Header */}
           
            {/* Call Timer */}
            
            {/* Overlayed Controls */}
            <Flex
                position="absolute"
                bottom="20px"
                left="50%"
                transform="translateX(-50%)"
                gap="30px"
                zIndex="1"
            >
                <Box textAlign="center">
                    <IconButton
                        icon={<MdCallEnd />}
                        colorScheme="red"
                        fontSize="36px"
                        onClick={leaveChannel}
                        borderRadius="full"
                        size="lg"
                    />
                    <Text marginTop="5px" color="white">End Call</Text>
                </Box>

                {!isVideoEnabled && vid ? <Box textAlign='center'> <IconButton icon={<MdVideoCall />} colorScheme="blue" fontSize="36px" onClick={enableVideo}  borderRadius="full" size="lg" />
                   <Text marginTop="5px" fontSize='12px' color='white'>Enable Video</Text></Box> : <Box textAlign="center">
                        {isVideoEnabled ? (
                            <IconButton icon={<MdVideocamOff />} colorScheme="red" fontSize="36px" onClick={disableVideo} borderRadius="full" size="lg" />
                        ) : (
                            <IconButton icon={<MdVideocam />} colorScheme="green" fontSize="36px" onClick={joinChannelWithVideo}  borderRadius="full" size="lg" />
                        )}
                        <Text marginTop="5px" fontSize='12px' color='white'>{isVideoEnabled ? 'Disable Video' : 'Start Call'}</Text>
                    </Box>}
                
            </Flex>

            {/* Loading Spinner */}
            {isLoading && (
                <Box
                    position="absolute"
                    top="50%"
                    left="50%"
                    transform="translate(-50%, -50%)"
                    textAlign="center"
                    zIndex="1"
                >
                    <Spinner color="blue.500" size="xl" />
                    <Text fontSize="lg" color="white">Processing...</Text>
                </Box>
            )}

            {/* Waiting for Caller */}
            {isJoined && remoteUsers.length === 0 && (
    <Box
        position="absolute"
        top="50%"
        left="50%"
        transform="translate(-50%, -50%)"
        textAlign="center"
        zIndex="1"
    >
        <Text fontSize="lg" color="yellow.400">
            Waiting for other caller to join...
        </Text>
    </Box>
)}

            {isJoined && (
                <Box
                    position="absolute"
                    bottom="120px"
                    left="50%"
                    transform="translateX(-50%)"
                    zIndex="1"
                >
                    <Text fontSize="m" color="green.300">
                         {formatDuration(callDuration)}
                    </Text>
                </Box>
            )}

            {/* Add Transcription Icon and Popup */}
            <Box position="absolute" top="20px" right="20px" zIndex={2}>
                <Popover placement="left">
                    <PopoverTrigger>
                        <IconButton
                            icon={<MdDescription />}
                            colorScheme="blue"
                            variant="solid"
                            borderRadius="full"
                            aria-label="View Transcription"
                        />
                    </PopoverTrigger>
                    <PopoverContent width="300px" maxHeight="400px" overflowY="auto">
                        <PopoverArrow />
                        <PopoverCloseButton />
                        <PopoverBody p={4}>
                            <Text fontWeight="bold" mb={2}>Transcription</Text>
                            <Box 
                                bg="gray.50" 
                                p={3} 
                                borderRadius="md" 
                                fontSize="sm"
                                whiteSpace="pre-wrap"
                            >
                                {transcript || "No transcription available yet..."}
                            </Box>
                        </PopoverBody>
                    </PopoverContent>
                </Popover>
            </Box>

        </Box>
    </ChakraProvider>
    );
};

export default Voice;