import React, { useState, useEffect, useRef } from 'react';
import { createClient, createMicrophoneAudioTrack, createCameraVideoTrack } from 'agora-rtc-sdk-ng';
import {
    MdCallEnd,
    MdDocumentScanner,
    MdVideoCall,
    MdChat,
    MdVideocam,
    MdVideocamOff,
} from 'react-icons/md';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import {
    ChakraProvider,
    Heading,
    Text,
    Spinner,
    Box,
    Flex,
    IconButton,
    useColorModeValue,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalBody,
    Tooltip,
    useDisclosure,
} from '@chakra-ui/react';
import VideoDisplay from './vod';
import { getAccessToken } from './api';
import { useReview } from './context';
import Chat from './chatVoice';
import VoiceDocu from './voidocu';



const Call = () => {
    const { state } = useLocation();
    const item = state?.item || {};
    const [searchParams] = useSearchParams();
    const chanel = searchParams.get('channel');
    const navigate = useNavigate();
    const [message, setMessage] = useState('');
    const [callDuration, setCallDuration] = useState(900); // Initialize callDuration
    const [timerId, setTimerId] = useState(null);
    const startTimeRef = useRef(null);
    const { setReview } = useReview();
    const [reviewId, setReviewId] = useState(null);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isVoiceDocuOpen, setIsVoiceDocuOpen] = useState(false);
    const [isJoined, setIsJoined] = useState(false);
    const [remoteUsers, setRemoteUsers] = useState([]);
    const [localAudioTrack, setLocalAudioTrack] = useState(null);
    const [remoteAudioTracks, setRemoteAudioTracks] = useState([]);
    const [localVideoTrack, setLocalVideoTrack] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const [isVideoEnabled, setIsVideoEnabled] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [userCount, setUserCount] = useState(0);
    const [vid, setVid] = useState(false);
    const clientRef = useRef(null);
    const [chatMessages, setChatMessages] = useState([]);
    const ws = useRef(null);
    const [oobRequestType, setOobRequestType] = useState('summary');
    const [oobRequestDetails, setOobRequestDetails] = useState('');
    // Chakra UI color mode values
    const bgColor = useColorModeValue("#2c2c2c", "gray.900"); // Dark background
    const textColor = useColorModeValue("white", "gray.200");
    const controlButtonBg = useColorModeValue("gray.700", "gray.800");
    const controlButtonHover = useColorModeValue("gray.500", "gray.700");
    const modalBg = useColorModeValue("white", "gray.700");
    const modalTextColor = useColorModeValue("black", "white");
    const [debugLogs, setDebugLogs] = useState([]);
    const { isOpen: isChatModalOpen, onOpen: onChatModalOpen, onClose: onChatModalClose } = useDisclosure();
    const { isOpen: isDocuModalOpen, onOpen: onDocuModalOpen, onClose: onDocuModalClose } = useDisclosure();
    
    const appointment_id = item?.id

    const stopRecording = () => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.send(
                JSON.stringify({
                    type: 'documentation.stop',
                })
            );
        }

        setIsRecording(false);
        console.log('Recording stopped.');
    };
    // Set up Agora client on mount
    const handleUserPublished = async (user, mediaType) => {
        await clientRef.current.subscribe(user, mediaType);

        if (mediaType === 'video') {
            setRemoteUsers((prev) => [...prev, user]);
        } else if (mediaType === 'audio') {
            user.audioTrack.play();
            setRemoteAudioTracks((prev) => [...prev, user.audioTrack]);
        }


        setUserCount((prev) => {
            const newCount = prev + 1;
            if (newCount === 1) {
                startTimer();
            }
            return newCount;
        });
    };
    const handleUserUnpublished = (user) => {
        setRemoteUsers((prev) => prev.filter((u) => u.uid !== user.uid));
        setRemoteAudioTracks((prev) =>
            prev.filter((track) => track.getUserId() !== user.uid)
        );

        setUserCount((prev) => {
            const newCount = Math.max(prev - 1, 0);
            if (newCount === 0) {
                stopTimer();
            }
            return newCount;
        });
    };
    useEffect(() => {
        clientRef.current = createClient({ mode: 'rtc', codec: 'vp8' });
        const client = clientRef.current;



        client.on('user-published', handleUserPublished);
        client.on('user-unpublished', handleUserUnpublished);

        return () => {
            client.off('user-published', handleUserPublished);
            client.off('user-unpublished', handleUserUnpublished);
            stopTimer();
        };
    }, []);


    const startTimer = () => {
        if (!startTimeRef.current) {
            startTimeRef.current = Date.now();
            const id = setInterval(() => {
                const elapsedTime = Math.floor((Date.now() - startTimeRef.current) / 1000);
                const remainingTime = 900 - elapsedTime;
                
                if (remainingTime <= 0) {
                    leaveChannel();
                    clearInterval(id);
                    setTimerId(null);
                    setCallDuration(0);
                } else {
                    setCallDuration(remainingTime);
                }
            }, 1000);
            setTimerId(id);
        }
    };

    useEffect(() => {
        return () => {
            if (timerId) {
                clearInterval(timerId);
            }
        };
    }, []);

    const stopTimer = () => {
        if (timerId) {
            clearInterval(timerId);
            setTimerId(null);
             startTimeRef.current = null;
        }
    };

    // Joining channel with video
    const joinChannelWithVideo = async () => {
        connectWebSocket();
        if (isJoined) {
            console.warn('You are already in the channel.');
            return;
        }
        setIsLoading(true);


        try {
            const appId = '44787e17cd0348cd8b75366a2b5931e9';
            const token = null;
            const channel = item.channel_name;

            await clientRef.current.join(appId, channel, token, null);
            const audioTrack = await createMicrophoneAudioTrack({
                constraints: {
                    audio: true
                }
            });
            await clientRef.current.publish(audioTrack);
            setLocalAudioTrack(audioTrack);
            console.log('Local Audio Track Published', audioTrack);

            const videoTrack = await createCameraVideoTrack();
            await clientRef.current.publish(videoTrack);
            setLocalVideoTrack(videoTrack);
            setIsVideoEnabled(true);
            setIsJoined(true);
            setUserCount(1);

            //Start Timer
        } catch (error) {
            console.error('Error joining channel with video:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Leave channel logic
    
    // Modified leaveChannel function
    const leaveChannel = async () => {
        try {
            stopRecording();
            setIsLoading(true);
            
            // Ensure we handle billing before cleaning up
            if (startTimeRef.current) {
                await handleBilling();
            }

            if (ws.current) {
                ws.current.close();
                ws.current = null;
            }

            // Clean up tracks and state
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

            await clientRef.current.leave();
            stopTimer();
            
            setRemoteUsers([]);
            setIsVideoEnabled(false);
            setIsRecording(false);
            setIsJoined(false);
            setUserCount(0);

            console.log('Successfully left the channel and cleaned up.');
        } catch (error) {
            console.error('Error leaving channel:', error);
            setMessage('Error leaving channel');
        } finally {
            setIsLoading(false);
            navigate('/virtual');
        }
    };


    // Start recording after joining channel
    useEffect(() => {
        if (isJoined) {
            startRecording();
        }
    }, [isJoined]);

    // Disable video
    async function disableVideo() {
        if (isVideoEnabled && localVideoTrack) {
            try {
                localVideoTrack.stop();
                localVideoTrack.close();
                setLocalVideoTrack(null);
                setIsVideoEnabled(false);
                console.log('Video disabled.');
                setVid(true);
            } catch (error) {
                console.error('Error disabling video:', error);
            }
        }
    }
    // Enable video
    async function enableVideo() {
        try {
            const videoTrack = await createCameraVideoTrack({
                encoderConfig: {
                    resolution: '1280x720', // Options: '120p', '360p', '720p', '1080p'
                    frameRate: 30,         // Frame rate: 15, 30
                    bitrateMax: 1130,      // Adjust bitrate (Kbps) for better quality
                },
            });
            setLocalVideoTrack(videoTrack);
            setIsVideoEnabled(true);
            console.log('Video enabled.');
        } catch (error) {
            console.error('Error enabling video:', error);
        }
    }

    // Clean up WebSocket
    useEffect(() => {
        return () => {
            if (ws.current) {
                ws.current.close();
                ws.current = null;
            }
        };
    }, []);

    // Establish WebSocket connection
    const connectWebSocket = async () => {
        try {
            const phone = item.patient_phone_number;
            const formatPhoneNumber = (phoneNumber) => {
                if (phoneNumber.startsWith('+234')) return phoneNumber;
                return `+234${phoneNumber.slice(1)}`;
            };
            const phoneNumber = formatPhoneNumber(phone);


            const token = await getAccessToken();
            let wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'wss:'}//health.prestigedelta.com/ws/medical/?token=${token}`;

            if (reviewId) wsUrl += `&review_id=${encodeURIComponent(reviewId)}`;
            if (appointment_id) wsUrl += `&appointment_id=${encodeURIComponent(appointment_id)}`;
            const webSocket = new WebSocket(wsUrl);

            webSocket.onopen = () => {
                console.log('WebSocket connected.');
                setIsRecording(true);
            };

            webSocket.onclose = () => {
                console.log('WebSocket disconnected.');
            };

            webSocket.onerror = (event) => {
                console.error('WebSocket Error:', event);
            };

            webSocket.onmessage = (event) => { // Set onmessage within the callback
                if (typeof event.data === 'string') {
                    try {
                        const data = JSON.parse(event.data);
                        console.log('Received message:', data);
                        setReviewId(data.review_id);
                        if (data.type === 'openai_message' && Array.isArray(data.message?.content)) {
                            setChatMessages((prevMessages) => [
                                ...prevMessages,
                                { role: data.message.role, content: data.message.content[0]?.text || 'No content' },
                            ]);
                        } else if (data.type === 'oob_response') {
                            console.log('OOB Response:', data.content);
                        } else if (data.type === 'documentation') {
                            console.log('Documentation:', data.message);
                        } else if (data.type === 'session_started') {
                            console.log('Session started with review ID:', data.review_id);
                        } else if (data.type === 'error') {
                            console.error('OpenAI Error:', data);
                        }
                    } catch (error) {
                        console.error('Error parsing message:', error);
                    }
                }
            };
            ws.current = webSocket // Assign the valid WebSocket to the ref
        } catch (error) {
            console.error('Error connecting WebSocket:', error);
        }
    };
    // Start Audio Recording
    const startRecording = async () => {
        if (!ws?.current || ws.current.readyState !== WebSocket.OPEN) {
            console.error('WebSocket is not connected.');
            alert('WebSocket is not connected. Please set up the session first.');
            return;
        }

        try {
            // Create audio context
            const audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
            const audioStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 16000,
                    channelCount: 1,
                },
            });

            const sourceNode = audioContext.createMediaStreamSource(audioStream);
            const scriptProcessor = audioContext.createScriptProcessor(2048, 1, 1);
            scriptProcessor.onaudioprocess = (event) => {
                const inputBuffer = event.inputBuffer.getChannelData(0);
                const pcmBuffer = pcmEncode(inputBuffer);
                if (ws.current?.readyState === WebSocket.OPEN) {
                    ws.current.send(pcmBuffer);
                }
            };

            sourceNode.connect(scriptProcessor);
            scriptProcessor.connect(audioContext.destination);
            setIsRecording(true);
            console.log('Recording started.');
            sendOobRequest();
        } catch (error) {
            console.error(`Error starting recording: ${error.message}`);
            alert('Error accessing microphone. Please ensure microphone permissions are granted.');
        }
    };
    // Encode to PCM
    const pcmEncode = (input) => {
        const buffer = new ArrayBuffer(input.length * 2);
        const output = new DataView(buffer);
        for (let i = 0; i < input.length; i++) {
            const s = Math.max(-1, Math.min(1, input[i]));
            output.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
        }
        return buffer;
    };
    // Sending OOB Request
    const sendOobRequest = () => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.send(
                JSON.stringify({
                    type: 'documentation.request',
                    content: {
                        request_type: oobRequestType,
                        details: oobRequestDetails,
                        appointment_id: item.id,
                    },
                })
            );

        } else {
            console.log('WebSocket is not connected. Cannot send Out-of-Band request.');
        }
    };
        // Modified handleBilling function
        const handleBilling = async () => {
            try {
                const phone = item.patient_phone_number;
                const formatPhoneNumber = (phoneNumber) => {
                    if (!phoneNumber) return '';
                    if (phoneNumber.startsWith('+234')) return phoneNumber;
                    return `+234${phoneNumber.slice(1)}`;
                };
                const phoneNumber = formatPhoneNumber(phone);
                const token = await getAccessToken();
                
                // Calculate seconds used based on start time
                const secondsUsed = startTimeRef.current 
                    ? Math.floor((Date.now() - startTimeRef.current) / 1000)
                    : 0;
    
                const billingData = {
                    cost_bearer: "doctor",
                    appointment_id: item?.id, // Add optional chaining
                    expertise: "trainee",
                    seconds_used: Math.min(secondsUsed, 900) // Ensure we don't exceed 900 seconds
                };
    
                console.log('Sending billing data:', billingData); // Debug log
    
                const response = await fetch('https://health.prestigedelta.com/billing/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify(billingData),
                });
    
                const result = await response.json();
                console.log('Billing response:', result); // Debug log
    
                if (response.status !== 201) {
                    setMessage(result.message || 'An error occurred during billing');
                    console.error('Billing error:', result);
                } else {
                    setMessage(result.message || 'Billing successful');
                    navigate('/virtual');
                }
            } catch (error) {
                console.error('Billing error:', error);
                setMessage('Failed to process billing');
            }
        }

    // Format duration for call timer
    const formatDuration = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };
    // Main UI Rendering
    return (
        <ChakraProvider>
            <Box position="relative" height="100vh" width="100%" bg={bgColor}>
                {/* Full-Screen Video */}
                <VideoDisplay localVideoTrack={localVideoTrack} remoteUsers={remoteUsers} />

                {/* VoiceDocu Box - Always Visible on Desktop, Toggle on Mobile */}
                <Box
                    position="absolute"
                    top="20px"
                    left="20px"
                    width={["90%", "300px"]} // Responsive width
                    maxHeight={['60%', '400px']}
                    bg={modalBg}
                    borderRadius="md"
                    boxShadow="lg"
                    zIndex="2"
                    overflowY="auto"
                    display={["none", "block"]} // Hide on mobile, show on desktop
                >
                    <VoiceDocu reviewId={reviewId} sendOobRequest={sendOobRequest} />
                </Box>

                {/* VoiceDocu Modal for Mobile */}
                <Modal isOpen={isDocuModalOpen} onClose={onDocuModalClose}>
                    <ModalOverlay />
                    <ModalContent bg={modalBg} color={modalTextColor} maxHeight="80vh" overflowY="auto" position="fixed" // This is key for bottom placement
                        bottom={20} // Stick to the bottom
                        left={0}>

                        <ModalBody>
                            <VoiceDocu
                                reviewId={reviewId}
                                sendOobRequest={sendOobRequest}

                            />
                        </ModalBody>
                    </ModalContent>
                </Modal>

                {/* Chat Box - Always Visible on Desktop, Toggle on Mobile */}
                <Box
                    position="absolute"
                    bottom={['70px', '20px']}
                    right={['10px', '20px']}
                    width={['90%', '350px']} // Responsive width
                    maxHeight={['60%', '340px']}
                    bg={modalBg}
                    borderRadius="md"
                    boxShadow="lg"
                    zIndex="2"
                    overflowY="auto"
                    display={['none', 'block']} // Hide on mobile, show on desktop
                >
                    <Chat
                        ws={ws}
                        chatMessages={chatMessages}
                        setChatMessages={setChatMessages}
                    />
                </Box>

                {/* Chat Box for Mobile View (Visible Only When Toggled) */}
                <Modal isOpen={isChatModalOpen} onClose={onChatModalClose}>
                    <ModalOverlay />
                    <ModalContent bg={modalBg} color={modalTextColor} maxHeight="80vh" overflowY="auto" position="fixed" // This is key for bottom placement
                        bottom={14} // Stick to the bottom
                        left={0}>
                        <ModalBody>
                            <Chat
                                ws={ws}
                                chatMessages={chatMessages}
                                setChatMessages={setChatMessages}
                            />
                        </ModalBody>
                    </ModalContent>
                </Modal>

                {/* Controls */}
                <Flex
                    position="absolute"
                    bottom="20px"
                    left="50%"
                    transform="translateX(-50%)"
                    gap="30px"
                    zIndex="1"
                >
                    <Box display={['block', 'none']} textAlign="center">
                        <Tooltip label="Document" aria-label="Document">
                            <IconButton
                                icon={<MdDocumentScanner />}
                                colorScheme="purple"
                                fontSize="36px"
                                onClick={onDocuModalOpen}
                                borderRadius="full"
                                size="lg"
                                _hover={{ bg: controlButtonHover }}
                            />
                        </Tooltip>
                        <Text marginTop="5px" color={textColor} fontSize="12px">
                            Document
                        </Text>
                    </Box>
                    <Box textAlign="center">
                        <Tooltip label="End Call" aria-label="End Call">
                            <IconButton
                                icon={<MdCallEnd />}
                                colorScheme="red"
                                fontSize="36px"
                                onClick={leaveChannel}
                                borderRadius="full"
                                size="lg"
                                _hover={{ bg: controlButtonHover }}
                            />
                        </Tooltip>
                        <Text marginTop="5px" color={textColor} fontSize="12px">
                            End Call
                        </Text>
                    </Box>

                    {!isVideoEnabled && vid ? (
                        <Box textAlign="center">
                            <Tooltip label="Enable Video" aria-label="Enable Video">
                                <IconButton
                                    icon={<MdVideoCall />}
                                    colorScheme="blue"
                                    fontSize="36px"
                                    onClick={enableVideo}
                                    borderRadius="full"
                                    size="lg"
                                    _hover={{ bg: controlButtonHover }}
                                />
                            </Tooltip>
                            <Text marginTop="5px" fontSize="12px" color={textColor}>
                                Enable Video
                            </Text>
                        </Box>
                    ) : (
                        <Box textAlign="center">
                            <Tooltip label={isVideoEnabled ? 'Disable Video' : 'Start Video'} aria-label={isVideoEnabled ? 'Disable Video' : 'Start Video'}>
                                {isVideoEnabled ? (
                                    <IconButton
                                        icon={<MdVideocamOff />}
                                        colorScheme="red"
                                        fontSize="36px"
                                        onClick={disableVideo}
                                        borderRadius="full"
                                        size="lg"
                                        _hover={{ bg: controlButtonHover }}
                                    />
                                ) : (
                                    <IconButton
                                        icon={<MdVideocam />}
                                        colorScheme="green"
                                        fontSize="36px"
                                        onClick={joinChannelWithVideo}
                                        borderRadius="full"
                                        size="lg"
                                        _hover={{ bg: controlButtonHover }}
                                    />
                                )}
                            </Tooltip>
                            <Text marginTop="5px" fontSize="12px" color={textColor}>
                                {isVideoEnabled ? 'Disable Video' : 'Start Video'}
                            </Text>
                        </Box>
                    )}
                    {/* Chat Toggle Button (Visible Only on Mobile) */}
                    <Box display={['block', 'none']} textAlign="center">
                        <Tooltip label="Open Chat" aria-label="Open Chat">
                            <IconButton
                                icon={<MdChat />}
                                colorScheme="teal"
                                fontSize="36px"
                                onClick={onChatModalOpen}
                                borderRadius="full"
                                size="lg"
                                _hover={{ bg: controlButtonHover }}
                            />
                        </Tooltip>
                        <Text marginTop="5px" color={textColor} fontSize="12px">
                            Open Chat
                        </Text>
                    </Box>
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
                        <Text fontSize="lg" color={textColor}>
                            Processing...
                        </Text>
                    </Box>
                )}

                {/* Waiting for Caller */}
                {userCount === 1 && (
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
                <Box position="absolute"
                    top="50%"
                    left="50%"
                    transform="translate(-50%, -50%)"
                    textAlign="center"
                    zIndex="1">
                    <Text color={textColor}>{message}</Text>
                </Box>

                {isRecording && (
                    <Box position="absolute" top="20px" left="20px" zIndex="1">
                        <Text fontSize="lg" color="red.500">
                            ● Recording...
                        </Text>
                    </Box>
                )}
                <Box> </Box>
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
            </Box>
        </ChakraProvider>
    );
};

export default Call;