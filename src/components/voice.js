import React, { useState, useEffect, useRef } from 'react';
import { createClient, createMicrophoneAudioTrack, createCameraVideoTrack } from 'agora-rtc-sdk-ng';
import { getAccessToken } from './api';
import {
    MdCallEnd,
    MdVideocam,
    MdVideocamOff,
    MdDescription,
} from 'react-icons/md';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import {
    ChakraProvider,
    Box,
    Flex,
    IconButton,
    Text,
    Spinner,
    Heading,
    useToast,
    Popover,
    PopoverTrigger,
    PopoverContent,
    PopoverBody,
    PopoverArrow,
    PopoverCloseButton,
    Tooltip,
    Alert,
    AlertIcon,
} from '@chakra-ui/react';
import VideoDisplay from './vod';

// This is the fixed version of your Voice component.
const Voice = () => {
    // Hooks
    const { state } = useLocation();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const toast = useToast();

    // Component State
    const [isJoined, setIsJoined] = useState(false);
    const [remoteUsers, setRemoteUsers] = useState([]);
    const [localAudioTrack, setLocalAudioTrack] = useState(null);
    const [localVideoTrack, setLocalVideoTrack] = useState(null);
    const [isVideoEnabled, setIsVideoEnabled] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [userCount, setUserCount] = useState(0);
    const [callDuration, setCallDuration] = useState(900); // 15 minutes
    const [transcript, setTranscript] = useState('');
    const [assemblyAiToken, setAssemblyAiToken] = useState('');
    const [connectionState, setConnectionState] = useState('DISCONNECTED');

    // Refs for stable objects
    const clientRef = useRef(null);
    const timerIdRef = useRef(null);
    const assemblyWsRef = useRef(null);
    
    // Derived values from router
    const item = state?.item || {};
    const channel = item.channel_name || searchParams.get("channel");

    // --- Core Agora Logic ---

    // Function to handle a user joining the call
    const handleUserPublished = async (user, mediaType) => {
        try {
            await clientRef.current.subscribe(user, mediaType);
            if (mediaType === 'video') {
                setRemoteUsers((prev) => [...prev, user]);
            }
            if (mediaType === 'audio' && user.audioTrack) {
                user.audioTrack.play();
            }
            // Update user count and start timer on the second user's join
            setUserCount((prev) => {
                const newCount = prev + 1;
                if (newCount === 2) startTimer();
                return newCount;
            });
        } catch (error) {
            console.error('Failed to subscribe to user:', error);
            toast({ title: "Subscription Error", description: "Failed to connect to the other participant.", status: "error", duration: 5000, isClosable: true });
        }
    };

    // Function to handle a user leaving
    const handleUserUnpublished = (user) => {
        setRemoteUsers((prev) => prev.filter((u) => u.uid !== user.uid));
        // Update user count and stop timer if only one person is left
        setUserCount((prev) => {
            const newCount = Math.max(prev - 1, 0);
            if (newCount < 2) stopTimer();
            return newCount;
        });
    };

    // Initialize Agora Client and set up listeners (runs only once on mount)
    useEffect(() => {
        // FIX: Use a ref to store the client instance, preventing re-creation on re-renders.
        clientRef.current = createClient({ mode: 'rtc', codec: 'vp8' });
        const client = clientRef.current;

        client.on('connection-state-change', (curState, prevState) => {
            setConnectionState(curState);
        });
        client.on('user-published', handleUserPublished);
        client.on('user-unpublished', handleUserUnpublished);

        // Auto-join the call when component mounts
        if (channel) {
            joinChannelWithVideo();
        } else {
             toast({ title: "Error", description: "No channel name provided.", status: "error", duration: 5000, isClosable: true });
        }

        // Cleanup function on component unmount
        return () => {
            leaveChannel();
            client.removeAllListeners();
        };
    }, []); // Empty dependency array ensures this runs only once.

    const joinChannelWithVideo = async () => {
        if (isJoined) return;

        setIsLoading(true);
        try {
            const appId = '44787e17cd0348cd8b75366a2b5931e9'; // Your App ID
            await clientRef.current.join(appId, channel, null, null);

            const audioTrack = await createMicrophoneAudioTrack();
            const videoTrack = await createCameraVideoTrack();

            await clientRef.current.publish([audioTrack, videoTrack]);

            setLocalAudioTrack(audioTrack);
            setLocalVideoTrack(videoTrack);
            setIsVideoEnabled(true);
            setIsJoined(true);
            setUserCount(1);

        } catch (error) {
            console.error('Error joining channel:', error);
            toast({ title: "Connection Error", description: `Failed to join the call: ${error.message}`, status: "error", duration: 5000, isClosable: true });
        } finally {
            setIsLoading(false);
        }
    };
    
    const leaveChannel = async () => {
        stopTimer();
        stopTranscription();

        try {
            if (localAudioTrack) {
                localAudioTrack.stop();
                localAudioTrack.close();
            }
            if (localVideoTrack) {
                localVideoTrack.stop();
                localVideoTrack.close();
            }
            if(clientRef.current && isJoined){
                await clientRef.current.leave();
            }
        } catch (error) {
            console.error("Error during cleanup:", error);
        } finally {
            setLocalAudioTrack(null);
            setLocalVideoTrack(null);
            setRemoteUsers([]);
            setIsJoined(false);
            setIsVideoEnabled(false);
            setUserCount(0);
            setCallDuration(900);
            navigate('/'); // Navigate to a safe page after leaving
        }
    };

    const toggleVideo = async () => {
        if (!localVideoTrack) return;
        
        if (isVideoEnabled) {
            await localVideoTrack.setEnabled(false);
            setIsVideoEnabled(false);
        } else {
            await localVideoTrack.setEnabled(true);
            setIsVideoEnabled(true);
        }
    };

    // --- Timer Logic ---
    
    const startTimer = () => {
        if (timerIdRef.current) return;
        timerIdRef.current = setInterval(() => {
            setCallDuration((prev) => {
                if (prev <= 1) {
                    clearInterval(timerIdRef.current);
                    timerIdRef.current = null;
                    leaveChannel();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const stopTimer = () => {
        if (timerIdRef.current) {
            clearInterval(timerIdRef.current);
            timerIdRef.current = null;
        }
    };

    const formatDuration = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

    // --- Transcription Logic (AssemblyAI) ---

    // Fetch AssemblyAI token
    useEffect(() => {
        const fetchAssemblyAiToken = async () => {
            try {
                const token = await getAccessToken();
                const response = await fetch("https://health.prestigedelta.com/assemblyai/generate-token/", {
                    headers: { "Authorization": `Bearer ${token}` },
                });
                if (!response.ok) throw new Error('Failed to fetch AssemblyAI token');
                const data = await response.json();
                setAssemblyAiToken(data.token);
            } catch (error) {
                console.error("Error fetching AssemblyAI token:", error);
                toast({ title: "Transcription Error", description: "Could not initialize transcription service.", status: "warning", duration: 5000, isClosable: true });
            }
        };
        fetchAssemblyAiToken();
    }, [toast]);

    // Connect to WebSocket when conditions are met
    useEffect(() => {
        if (isJoined && userCount > 1 && assemblyAiToken && !assemblyWsRef.current) {
            connectWebSocket();
        }
    }, [isJoined, userCount, assemblyAiToken]);

    const connectWebSocket = () => {
        if (!assemblyAiToken) return;

        const socketUrl = `wss://api.assemblyai.com/v2/realtime/ws?sample_rate=16000&token=${assemblyAiToken}`;
        assemblyWsRef.current = new WebSocket(socketUrl);

        assemblyWsRef.current.onopen = () => console.log('AssemblyAI WebSocket connected');
        assemblyWsRef.current.onerror = (error) => console.error('WebSocket error:', error);
        assemblyWsRef.current.onclose = () => {
            console.log('AssemblyAI WebSocket closed');
            assemblyWsRef.current = null;
        };
        assemblyWsRef.current.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.message_type === 'FinalTranscript' && data.text) {
                setTranscript(prev => prev + data.text + ' ');
            }
        };
    };

    const stopTranscription = () => {
        if (assemblyWsRef.current) {
            assemblyWsRef.current.close();
            assemblyWsRef.current = null;
        }
    };
    
    // --- UI Rendering ---

    const getStatusMessage = () => {
        if (connectionState === 'RECONNECTING') return 'Reconnecting...';
        if (connectionState === 'CONNECTED') return 'Connected';
        if (isLoading) return 'Connecting...';
        return 'Disconnected';
    }

    // FIX: Wrap the entire component in ChakraProvider to ensure UI elements render correctly.
    return (
        <ChakraProvider>
            <Box
                position="relative"
                height="100vh"
                width="100%"
                bg="#2c2c2c"
                display="flex"
                flexDirection="column"
            >
                {/* Status Badge */}
                <Box position="absolute" top="20px" left="20px" zIndex={2}>
                    <Text
                        bg={connectionState === 'CONNECTED' ? 'green.500' : 'orange.500'}
                        color="white"
                        px="3"
                        py="1"
                        borderRadius="full"
                        fontSize="sm"
                    >
                        {getStatusMessage()}
                    </Text>
                </Box>

                {/* Main Video Area */}
                <Box flex="1" position="relative" bg="black">
                    <VideoDisplay localVideoTrack={localVideoTrack} remoteUsers={remoteUsers} />

                    {isLoading && (
                        <Flex position="absolute" inset="0" align="center" justify="center" bg="rgba(0,0,0,0.5)">
                            <Spinner size="xl" color="white" />
                        </Flex>
                    )}

                    {isJoined && userCount < 2 && !isLoading && (
                         <Alert status="info" position="absolute" top="50%" left="50%" transform="translate(-50%, -50%)" zIndex={2}>
                             <AlertIcon />
                             Waiting for other participant to join...
                         </Alert>
                    )}
                </Box>

                {/* Control Bar */}
                <Flex
                    position="absolute"
                    bottom="20px"
                    left="50%"
                    transform="translateX(-50%)"
                    alignItems="center"
                    gap="20px"
                    zIndex={2}
                    bg="rgba(0, 0, 0, 0.6)"
                    p={4}
                    borderRadius="full"
                >
                    {isJoined && (
                        <Text fontSize="lg" color="white" fontWeight="bold" fontFamily="monospace">
                            {formatDuration(callDuration)}
                        </Text>
                    )}

                    <Tooltip label={isVideoEnabled ? "Disable Video" : "Enable Video"}>
                        <IconButton
                            icon={isVideoEnabled ? <MdVideocam /> : <MdVideocamOff />}
                            colorScheme={isVideoEnabled ? "blue" : "gray"}
                            isRound
                            size="lg"
                            onClick={toggleVideo}
                            isDisabled={!isJoined || !localVideoTrack}
                        />
                    </Tooltip>

                    <Tooltip label="End Call">
                        <IconButton
                            icon={<MdCallEnd />}
                            colorScheme="red"
                            isRound
                            size="lg"
                            onClick={leaveChannel}
                            isDisabled={!isJoined}
                        />
                    </Tooltip>
                    
                     <Popover placement="top">
                        <PopoverTrigger>
                           <IconButton
                                icon={<MdDescription />}
                                colorScheme="blue"
                                variant="ghost"
                                _hover={{ bg: "whiteAlpha.200" }}
                                isRound size="lg"
                                aria-label="View Transcription"
                                isDisabled={!isJoined}
                            />
                        </PopoverTrigger>
                        <PopoverContent bg="gray.800" color="white" borderColor="gray.600">
                            <PopoverArrow bg="gray.800"/>
                            <PopoverCloseButton />
                            <PopoverBody p={4} maxHeight="300px" overflowY="auto">
                                <Heading size="sm" mb={2}>Live Transcription</Heading>
                                <Text fontSize="sm" whiteSpace="pre-wrap">
                                    {transcript || "Transcription will appear here..."}
                                </Text>
                            </PopoverBody>
                        </PopoverContent>
                    </Popover>
                </Flex>
            </Box>
        </ChakraProvider>
    );
};

export default Voice;