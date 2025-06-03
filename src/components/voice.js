import React, { useState, useEffect, useRef } from 'react';
import { createClient, createMicrophoneAudioTrack, createCameraVideoTrack } from 'agora-rtc-sdk-ng';
import Recorder from 'recorder-js';
import { getAccessToken } from './api';
import axios from 'axios';
import { MdCall, MdCallEnd, MdVideoCall, MdVideocam, MdVideocamOff, MdDescription } from 'react-icons/md';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { Box, Flex, IconButton, Avatar, 
  Popover, PopoverTrigger, PopoverContent, PopoverBody, PopoverArrow, PopoverCloseButton, Text, Spinner, Heading } from '@chakra-ui/react';
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
    const [isLoading, setIsLoading] = useState(false);
    const [userCount, setUserCount] = useState(0);    const [callDuration, setCallDuration] = useState(900);
    const timerIdRef = useRef(null);
    const navigate = useNavigate();
    const audioContextRef = useRef(null);
    const destinationRef = useRef(null);
    const [transcript, setTranscript] = useState('');
    const [assemblyAiToken, setAssemblyAiToken] = useState('');
    const assemblyWsRef = useRef(null);
    const wsClosingForResumeRef = useRef(false);
    const transcriptionIntervalRef = useRef(null);
    const [timerId, setTimerId] = useState(null);
    const transcriptionInterval = useRef(null);

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
    const reviewid = searchParams.get("reviewid") || state?.item?.review_id;
    const thread = state?.item?.thread_id;

    const clientRef = useRef(null);

    const [connectionState, setConnectionState] = useState('DISCONNECTED');
    const [isPaused, setIsPaused] = useState(false);

    // Initialize client and audio context
    useEffect(() => {
        if (!clientRef.current) {
            clientRef.current = createClient({ mode: 'rtc', codec: 'vp8' });
        }
        
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
            destinationRef.current = audioContextRef.current.createMediaStreamDestination();
        }

        return () => {
            if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
                audioContextRef.current.close();
            }
        };
    }, []);

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
    };    useEffect(() => {
        const client = clientRef.current;
        if (!client) return;

        // Add connection state handlers
        const handleConnectionStateChange = (curState, prevState) => {
            console.log(`Connection state changed from ${prevState} to ${curState}`);
            setConnectionState(curState);
        };

        const handleUserPublished = async (user, mediaType) => {
            console.log('User published:', user.uid, mediaType);
            try {
                await client.subscribe(user, mediaType);
                console.log('Subscribed to', user.uid, mediaType);

                if (mediaType === 'video') {
                    setRemoteUsers((prevUsers) => {
                        if (prevUsers.find(u => u.uid === user.uid)) {
                            return prevUsers;
                        }
                        return [...prevUsers, user];
                    });
                }
                
                if (mediaType === 'audio') {
                    // Always play remote audio track and prevent duplicates
                    if (user.audioTrack) {
                        try {
                            user.audioTrack.play();
                            user.audioTrack.setVolume(100);
                            console.log('Playing remote audio track for user:', user.uid);
                        } catch (err) {
                            console.warn('Error playing remote audio track:', err);
                        }
                        setRemoteAudioTracks((prev) => {
                            if (prev.includes(user.audioTrack)) return prev;
                            return [...prev, user.audioTrack];
                        });
                    } else {
                        // Retry if audioTrack is not ready
                        setTimeout(() => {
                            if (user.audioTrack) {
                                try { user.audioTrack.play(); user.audioTrack.setVolume(100); } catch (err) {}
                                setRemoteAudioTracks((prev) => {
                                    if (prev.includes(user.audioTrack)) return prev;
                                    return [...prev, user.audioTrack];
                                });
                            }
                        }, 500);
                    }
                }

                setUserCount((prev) => {
                    const newCount = prev + 1;
                    if (newCount === 2) {
                        startTimer();
                    }
                    return newCount;
                });
            } catch (error) {
                console.error('Error subscribing to user:', error);
            }
        };

        const handleUserUnpublished = (user, mediaType) => {
            console.log('User unpublished:', user.uid, mediaType);
            if (mediaType === 'audio') {
                if (user.audioTrack) {
                    user.audioTrack.stop();
                }
                setRemoteAudioTracks((prev) =>
                    prev.filter((track) => track !== user.audioTrack)
                );
            }
            if (mediaType === 'video') {
                setRemoteUsers((prev) => prev.filter((u) => u.uid !== user.uid));
            }
            
            setUserCount((prev) => {
                const newCount = Math.max(prev - 1, 0);
                if (newCount < 2) {
                    stopTimer();
                }
                return newCount;
            });
        };

        client.on('connection-state-change', handleConnectionStateChange);
        client.on('user-published', handleUserPublished);
        client.on('user-unpublished', handleUserUnpublished);

        return () => {
            client.off('connection-state-change', handleConnectionStateChange);
            client.off('user-published', handleUserPublished);
            client.off('user-unpublished', handleUserUnpublished);
            stopTimer();
        };
    }, []);
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
        if (timerIdRef.current) {
            clearInterval(timerIdRef.current);
            timerIdRef.current = null;
        }
    };
    
      async function joinChannelWithVideo() {
        const client = clientRef.current;
        if (!client) {
            console.error('Client not initialized');
            return;
        }

        if (isJoined) {
            console.warn('You are already in the channel.');
            return;
        }
    
        setIsLoading(true);
        try {
            const appId = '44787e17cd0348cd8b75366a2b5931e9';
            const token = null;
            const channel = item.channel_name || chanel;
    
            // First try to join the channel
            console.log('Attempting to join channel:', channel);
            await client.join(appId, channel, token, null);
            console.log('Successfully joined channel');
           
            // Create and publish audio track
            const audioTrack = await createMicrophoneAudioTrack({
                encoderConfig: {
                    sampleRate: 48000,
                    stereo: false,
                    bitrate: 128
                }
            });

            console.log('Created audio track, publishing...');
            await client.publish(audioTrack);
            setLocalAudioTrack(audioTrack);
            console.log('Published audio track successfully');

            // Create and publish video track
            console.log('Creating video track...');
            const videoTrack = await createCameraVideoTrack({
                encoderConfig: {
                    width: 640,
                    height: 480,
                    frameRate: 30,
                    bitrateMin: 400,
                    bitrateMax: 1000
                }
            });
            
            console.log('Publishing video track...');
            await client.publish(videoTrack);
            setLocalVideoTrack(videoTrack);
            setIsVideoEnabled(true);
            console.log('Published video track successfully');

            setIsJoined(true);
            setUserCount(1);

        } catch (error) {
            console.error('Error joining channel:', error);
            // Show error message to user
            alert(`Failed to join call: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    }
    
        async function disableVideo() {
        const client = clientRef.current;
        if (!client) return;

        if (isVideoEnabled && localVideoTrack) {
            try {
                await client.unpublish(localVideoTrack);
                localVideoTrack.stop();
                localVideoTrack.close();
                setLocalVideoTrack(null);
                setIsVideoEnabled(false);
                setVid(true);
                console.log('Video disabled.');
            } catch (error) {
                console.error('Error disabling video:', error);
            }
        }
    }
         async function leaveChannel() {
    const client = clientRef.current;
    setIsLoading(true); // Start loading
    try {
        if (isJoined && client) {
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
        window.location.href = 'https://prestigehealth.app/';
    }
}

    
      async function enableVideo() {
        const client = clientRef.current;
        if (!client) return;
        
        try {
            if (localVideoTrack) {
                console.log('Cleaning up existing video track before creating new one');
                await client.unpublish(localVideoTrack);
                localVideoTrack.stop();
                localVideoTrack.close();
            }
            
            const videoTrack = await createCameraVideoTrack();
            await client.publish(videoTrack);
            setLocalVideoTrack(videoTrack);
            setIsVideoEnabled(true);
            console.log('Video enabled.');
        } catch (error) {
            console.error('Error enabling video:', error);
        }
    }
     const formatDuration = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

    const stopRecord = () => {
        if (recorder) {
            recorder.stop();
        }
        setIsRecording(false);
    };

    const pauseTranscription = () => {
        getSuggestion();
        setIsPaused(true);
        if (assemblyWsRef.current && assemblyWsRef.current.readyState === WebSocket.OPEN) {
            const socketBeingPaused = assemblyWsRef.current;
            socketBeingPaused.onclose = () => {
                if (assemblyWsRef.current === socketBeingPaused) {
                    assemblyWsRef.current = null;
                }
            };
            socketBeingPaused.close(1000, "User paused transcription");
        }
    };

    const resumeTranscription = () => {
        setIsPaused(false);
        if (assemblyWsRef.current) {
            wsClosingForResumeRef.current = true;
            assemblyWsRef.current.onclose = null;
            assemblyWsRef.current.close(1000, "Closing old WebSocket before resume");
            assemblyWsRef.current = null;
            setTimeout(() => {
                wsClosingForResumeRef.current = false;
            }, 200);
        }
        setTimeout(() => {
            connectWebSocket();
        }, 300);
    };

    const connectWebSocket = async () => {

        if (!assemblyAiToken) {
            console.log('No AssemblyAI token available');
            return;
        }

        const socketUrl = `wss://api.assemblyai.com/v2/realtime/ws?sample_rate=16000&token=${assemblyAiToken}`;
        assemblyWsRef.current = new WebSocket(socketUrl);

        assemblyWsRef.current.onopen = () => {
            console.log('AssemblyAI WebSocket connected');
            // Set up interval to call getSuggestion every 18 seconds
            const suggestionInterval = setInterval(getSuggestion, 18000);
            // Store interval ID to clear it later
            setTimerId(prev => ({...prev, suggestionInterval}));
            
        };

        assemblyWsRef.current.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        assemblyWsRef.current.onclose = (event) => {
            const currentWs = assemblyWsRef.current;
            if (wsClosingForResumeRef.current) {
                wsClosingForResumeRef.current = false;
                if (currentWs === assemblyWsRef.current) {
                    assemblyWsRef.current = null;
                }
                return;
            }
            if (isPaused) {
                return;
            } else {
                stopTimer();
                setIsRecording(false);
            }
            if (currentWs === assemblyWsRef.current) {
                assemblyWsRef.current = null;
            }
        };

        assemblyWsRef.current.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.error) {
                    if (data.error === "Session idle for too long") {
                        setConnectionState('DISCONNECTED');
                        setIsRecording(false);
                        setTimeout(() => {
                            connectWebSocket();
                        }, 1000);
                        return;
                    }
                }
                if (data.message_type === 'FinalTranscript') {
                    console.log('Received transcript:', data.text);
                    setTranscript(prev => prev + (prev ? '\n' : '') + data.text);
                }
            } catch (error) {
                console.error('Error processing transcript:', error);
            }
        };
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (assemblyWsRef.current) {
                assemblyWsRef.current.close();
            }            if (transcriptionInterval.current) {
                clearInterval(transcriptionInterval.current);
            }
        };
    }, []);

    // Add AssemblyAI token fetch effect
    useEffect(() => {
        const fetchAssemblyAiToken = async () => {
            try {
                const token = await getAccessToken();
                const response = await fetch(
                    "https://health.prestigedelta.com/assemblyai/generate-token/",
                    {
                        headers: {
                            "Content-Type": "application/json",
                            Accept: "application/json",
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );
                
                if (!response.ok) {
                    throw new Error('Failed to fetch AssemblyAI token');
                }
                
                const data = await response.json();
                setAssemblyAiToken(data.token);
                console.log('AssemblyAI token fetched successfully');
            } catch (error) {
                console.error("Error fetching AssemblyAI token:", error);
            }
        };

        fetchAssemblyAiToken();
        // Refresh token every hour
        const tokenRefreshInterval = setInterval(fetchAssemblyAiToken, 3600000);

        return () => {
            clearInterval(tokenRefreshInterval);
        };
    }, []);

  useEffect(() => {
          if (userCount > 1 && assemblyAiToken) {
              connectWebSocket();
          }
      }, [userCount, assemblyAiToken]);
  
    // Add connection status display
    const getConnectionStatusMessage = () => {
        switch (connectionState) {
            case 'CONNECTING':
                return 'Connecting...';
            case 'CONNECTED':
                return 'Connected';
            case 'DISCONNECTED':
                return 'Disconnected';
            case 'DISCONNECTING':
                return 'Disconnecting...';
            case 'RECONNECTING':
                return 'Reconnecting...';
            default:
                return '';
        }
    };

    // Add cleanup effect when component unmounts
    useEffect(() => {
        return async () => {
            try {
                // Stop any ongoing recording
                if (isRecording) {
                    stopRecord();
                }

                // Clean up audio tracks
                if (localAudioTrack) {
                    localAudioTrack.stop();
                    localAudioTrack.close();
                }

                // Clean up video tracks
                if (localVideoTrack) {
                    localVideoTrack.stop();
                    localVideoTrack.close();
                }

                // Clean up remote audio tracks
                remoteAudioTracks.forEach(track => {
                    track.stop();
                });                // Leave the channel if joined
                if (isJoined && clientRef.current) {
                    await clientRef.current.leave();
                }

                // Reset states
                setLocalAudioTrack(null);
                setLocalVideoTrack(null);
                setRemoteAudioTracks([]);
                setRemoteUsers([]);
                setIsJoined(false);
                setIsVideoEnabled(false);                // Clear timer if running
                if (timerId) {
                    clearInterval(timerId);
                }

            } catch (error) {
                console.error('Error during cleanup:', error);
            }
        };
    }, [isJoined, isRecording, localAudioTrack, localVideoTrack, remoteAudioTracks, timerId]);

    return (
        <Box 
            position="relative" 
            height="100vh" 
            width="100%" 
            bg="#2c2c2c"
            display="flex"
            flexDirection="column"
        >
            {/* Connection Status */}
            <Box
                position="absolute"
                top="20px"
                left="20px"
                zIndex={2}
                bg={connectionState === 'CONNECTED' ? 'green.500' : 'orange.500'}
                color="white"
                px="3"
                py="1"
                borderRadius="full"
                fontSize="sm"
            >
                {getConnectionStatusMessage()}
            </Box>

                {/* Video Container */}
                <Box flex="1" position="relative">
                    <VideoDisplay localVideoTrack={localVideoTrack} remoteUsers={remoteUsers} />                    {/* Transcription Icon - Moved to top-right */}
                    <Box position="absolute" top="20px" right="20px" zIndex={2}>
                        <Popover placement="left" isLazy>
                            <PopoverTrigger>
                                <Box>
                                    <IconButton
                                        icon={<MdDescription />}
                                        colorScheme="blue"
                                        variant="solid"
                                        borderRadius="full"
                                        aria-label="View Transcription"
                                    />
                                </Box>
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

                {/* Control Panel with Timer */}
                <Flex
                    position="absolute"
                    bottom="20px"
                    left="50%"
                    transform="translateX(-50%)"
                    flexDirection="column"
                    alignItems="center"
                    gap="15px"
                    zIndex="1"
                >
                    {/* Timer moved above controls */}
                    {isJoined && (
                        <Box 
                            bg="rgba(0, 0, 0, 0.6)" 
                            px="4" 
                            py="2" 
                            borderRadius="full"
                            mb="10px"
                        >
                            <Text fontSize="xl" color="white" fontWeight="bold">
                                {formatDuration(callDuration)}
                            </Text>
                        </Box>
                    )}

                    {/* Control Buttons */}
                    <Flex gap="30px" alignItems="center">
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

                        {!isVideoEnabled && vid ? (
                            <Box textAlign='center'> 
                                <IconButton 
                                    icon={<MdVideoCall />} 
                                    colorScheme="blue" 
                                    fontSize="36px" 
                                    onClick={enableVideo}  
                                    borderRadius="full" 
                                    size="lg" 
                                />
                                <Text marginTop="5px" fontSize='12px' color='white'>Enable Video</Text>
                            </Box>
                        ) : (
                            <Box textAlign="center">
                                {isVideoEnabled ? (
                                    <IconButton 
                                        icon={<MdVideocamOff />} 
                                        colorScheme="red" 
                                        fontSize="36px" 
                                        onClick={disableVideo} 
                                        borderRadius="full" 
                                        size="lg" 
                                    />
                                ) : (
                                    <IconButton 
                                        icon={<MdVideocam />} 
                                        colorScheme="green" 
                                        fontSize="36px" 
                                        onClick={joinChannelWithVideo}  
                                        borderRadius="full" 
                                        size="lg" 
                                    />
                                )}
                                <Text marginTop="5px" fontSize='12px' color='white'>
                                    {isVideoEnabled ? 'Disable Video' : 'Start Call'}
                                </Text>
                            </Box>
                        )}
                    </Flex>
                </Flex>

                {/* Loading Spinner */}
                {isLoading && (
                    <Box
                        position="absolute"
                        top="50%"
                        left="50%"
                        transform="translate(-50%, -50%)"
                        textAlign="center"
                        zIndex="2"
                        bg="rgba(0, 0, 0, 0.7)"
                        p={4}
                        borderRadius="md"
                    >
                        <Spinner color="blue.500" size="xl" />
                        <Text fontSize="lg" color="white" mt={2}>Processing...</Text>
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
                        zIndex="2"
                        bg="rgba(0, 0, 0, 0.7)"
                        p={4}
                        borderRadius="md"
                    >
                        <Text fontSize="lg" color="yellow.400">
                            Waiting for other caller to join...
                        </Text>
                    </Box>
                )}

                {/* Transcript Display (always visible below controls) */}
                <Box
                    position="absolute"
                    left="50%"
                    bottom="-80px"
                    transform="translateX(-50%)"
                    width="90%"
                    maxW="600px"
                    bg="whiteAlpha.900"
                    color="black"
                    p={4}
                    borderRadius="md"
                    boxShadow="md"
                    zIndex={2}
                    fontSize="md"
                    minH="48px"
                    mt={4}
                    style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}
                >
                    <Text fontWeight="bold" mb={2}>Live Transcript</Text>
                    <Box>{transcript || 'No transcription available yet...'}</Box>
                </Box>
            </Box>
        </Box>
    );
};

export default Voice;
