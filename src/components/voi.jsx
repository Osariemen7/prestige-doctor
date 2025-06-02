import React, { useState, useEffect, useRef } from 'react';
import { createClient, createMicrophoneAudioTrack, createCameraVideoTrack } from 'agora-rtc-sdk-ng';
import {
    MdCallEnd,
    MdDocumentScanner,
    MdVideoCall,
    MdChat,
    MdVideocam,
    MdVideocamOff,
    MdMic, 
    MdStop, 
    MdPause, 
    MdPlayArrow, 
    MdOutlineDocumentScanner, 
    MdNotes,
    MdDescription,
    MdSave,
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
    Button,
    VStack,
    HStack,
    Badge,
    useToast,
    Progress,
    Tab,
    TabList,
    TabPanel,
    TabPanels,
    Tabs,
    Alert,
    AlertIcon,
    Drawer,
    DrawerBody,
    DrawerHeader,
    DrawerOverlay,
    DrawerContent,
    DrawerCloseButton,
    keyframes,
    Icon,
    useMediaQuery,
    Popover,
    PopoverTrigger,
    PopoverContent,
    PopoverArrow,
    PopoverCloseButton,
} from '@chakra-ui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { BsWaveform } from 'react-icons/bs';
import { FiClock } from 'react-icons/fi';
import VideoDisplay from './vod';
import { getAccessToken } from './api';
import { useReview } from './context';
import Chat from './chatVoice';

import PatientProfile from './write';
import { ErrorBoundary } from 'react-error-boundary';
import { AgoraRTC } from 'agora-rtc-sdk-ng';


// Animation for recording indicator
const pulseAnimation = keyframes`
  0% { transform: scale(1); opacity: 0.8; }
  50% { transform: scale(1.1); opacity: 1; }
  100% { transform: scale(1); opacity: 0.8; }
`;

// Audio visualization setup
const setupAudioVisualization = (audioContext, sourceNode) => {
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    sourceNode.connect(analyser);
    
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    return { analyser, dataArray, bufferLength };
};

// Error handling utility
const handleError = (error, toast, action) => {
    console.error(`Error during ${action}:`, error);
    toast({
        title: 'Error',
        description: `Failed to ${action}. ${error.message}`,
        status: 'error',
        duration: 5000,
        isClosable: true,
    });
    return false;
};

const LoadingOverlay = ({ message }) => (
    <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
        }}
    >
        <VStack spacing={4}>
            <Spinner size="xl" color="white" />
            <Text color="white" fontSize="lg">{message}</Text>
        </VStack>
    </motion.div>
);

const ErrorFallback = ({ error, resetErrorBoundary }) => (
    <Box
        role="alert"
        p={4}
        bg="red.50"
        borderRadius="md"
        borderWidth="1px"
        borderColor="red.200"
    >
        <Heading size="md" color="red.600" mb={2}>Something went wrong:</Heading>
        <Text color="red.500" mb={4}>{error.message}</Text>
        <Button onClick={resetErrorBoundary} colorScheme="red">Try again</Button>
    </Box>
);

const RecordingIndicator = ({ isRecording }) => (
    <motion.div
        animate={{
            scale: isRecording ? [1, 1.2, 1] : 1,
        }}
        transition={{
            duration: 1.5,
            repeat: isRecording ? Infinity : 0,
            repeatType: "reverse"
        }}
    >
        <HStack spacing={2} alignItems="center">
            <Box
                w="12px"
                h="12px"
                borderRadius="full"
                bg={isRecording ? "red.500" : "gray.500"}
            />
            <Text fontSize="sm" color={isRecording ? "red.500" : "gray.500"}>
                {isRecording ? "Recording" : "Not Recording"}
            </Text>
        </HStack>
    </motion.div>
);

const TimeDisplay = ({ duration }) => (
    <HStack
        spacing={2}
        p={2}
        bg={useColorModeValue('blackAlpha.100', 'whiteAlpha.100')}
        borderRadius="full"
    >
        <Icon as={FiClock} />
        <Text fontFamily="mono">{formatTime(duration)}</Text>
    </HStack>
);

const WaveformVisualizer = ({ isActive }) => (
    <HStack spacing={1} h="20px" alignItems="flex-end">
        {[...Array(10)].map((_, i) => (
            <motion.div
                key={i}
                animate={{
                    height: isActive ? ['20%', '100%', '20%'][i % 3] : '20%',
                }}
                transition={{
                    duration: 1,
                    repeat: Infinity,
                    delay: i * 0.1,
                }}
                style={{
                    width: '3px',
                    background: isActive ? '#48BB78' : '#A0AEC0',
                    borderRadius: '2px',
                }}
            />
        ))}
    </HStack>
);


// Add these transition variants at the top level
const pageTransitions = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
};

const fadeIn = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 }
};

// Error handling utility for audio setup
const setupAudioWithFallback = async (constraints) => {
    try {
        return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err) {
        if (err.name === 'NotAllowedError') {
            throw new Error('Microphone access denied. Please check your browser permissions.');
        } else if (err.name === 'NotFoundError') {
            throw new Error('No microphone found. Please check your audio device connection.');
        } else {
            throw new Error(`Failed to access microphone: ${err.message}`);
        }
    }
};

// Add utility functions
const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

// Add StatusBadge component
const StatusBadge = () => {
    const status = 'disconnected'; // Default status
    return (
        <Badge
            colorScheme={
                status === 'connected' ? 'green' :
                status === 'error' ? 'red' : 'gray'
            }
            variant="subtle"
            px={2}
            py={1}
        >
            {status}
        </Badge>
    );
};

// Add TranscriptionControls component
const TranscriptionControls = ({ isRecording, onToggle }) => (
    <HStack spacing={4}>
        <IconButton
            icon={isRecording ? <MdStop /> : <MdMic />}
            onClick={onToggle}
            colorScheme={isRecording ? "red" : "blue"}
            aria-label={isRecording ? "Stop Recording" : "Start Recording"}
        />
    </HStack>
);

const Call = () => {
    const [isMobile] = useMediaQuery("(max-width: 768px)");
    const audioContextRef = useRef(null);
    const processorRef = useRef(null);
    const [isPaused, setIsPaused] = useState(false);
    const isPausedRef = useRef(false);
    const transcriptionBgColor = useColorModeValue('white', 'gray.700');
    
    // Update isPausedRef when isPaused changes
    useEffect(() => {
        isPausedRef.current = isPaused;
    }, [isPaused]);

    const { state } = useLocation();
    const item = state?.item || {};
    const [searchParams] = useSearchParams();
    const chanel = searchParams.get('channel');
    const navigate = useNavigate();
    const location = useLocation(); // Add this line for route monitoring

    // Add effect to handle route changes
    useEffect(() => {
        const handleRouteChange = async () => {
            if (isJoined) {
                await leaveChannel();
            }
        };

        // Call cleanup when route changes
        return () => {
            handleRouteChange();
        };
    }, [location.pathname]); // Watch for route changes

    const [message, setMessage] = useState('');
    const [callDuration, setCallDuration] = useState(900); // Initialize callDuration
    const [timerId, setTimerId] = useState(null);
    const startTimeRef = useRef(null);
    const { setReview } = useReview();
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
    const [isInitializing, setIsInitializing] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');
    const [loadingMessage, setLoadingMessage] = useState('');
    const [visualizer, setVisualizer] = useState(null);
    const [isReconnecting, setIsReconnecting] = useState(false);
    const reconnectAttempts = useRef(0);
    const MAX_RECONNECT_ATTEMPTS = 3;
    const [connectionStatus, setConnectionStatus] = useState('disconnected');
    const [isTranscribing, setIsTranscribing] = useState(false);
    const toast = useToast();
    const { isOpen: isDrawerOpen, onOpen: onDrawerOpen, onClose: onDrawerClose } = useDisclosure();
    const [activeTab, setActiveTab] = useState('consultation');
    const patientProfileRef = useRef(null);
    const [borderColor] = useState(useColorModeValue('gray.200', 'gray.600'));
    const animation = keyframes`
        0% { opacity: 0.5; }
        50% { opacity: 1; }
        100% { opacity: 0.5; }
    `;
    
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
        try {
            await clientRef.current.subscribe(user, mediaType);

            if (mediaType === 'video') {
                setRemoteUsers((prev) => [...prev, user]);
            } else if (mediaType === 'audio') {
                user.audioTrack.play();
                setRemoteAudioTracks((prev) => [...prev, user.audioTrack]);
            }

            // Update user count and start timer
            setUserCount((prev) => {
                const newCount = prev + 1;
                if (newCount === 2) { // Start timer when second user joins
                    startTimer();
                }
                return newCount;
            });
        } catch (error) {
            console.error('Error in handleUserPublished:', error);
            toast({
                title: "Connection Error",
                description: "Failed to connect with other participant",
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        }
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
        if (isJoined) {
            console.warn('Already in channel');
            return;
        }

        setIsLoading(true);
        setLoadingMessage('Joining video call...');

        try {
            const appId = '44787e17cd0348cd8b75366a2b5931e9';
            const token = null;
            if (!item?.channel_name) {
                throw new Error('Channel name not provided');
            }
            const channel = item.channel_name;

            await clientRef.current.join(appId, channel, token, null);
            
            // Create and publish audio track
            const audioTrack = await createMicrophoneAudioTrack();
            await clientRef.current.publish(audioTrack);
            setLocalAudioTrack(audioTrack);

            // Clean up any existing video track
            if (localVideoTrack) {
                await clientRef.current.unpublish(localVideoTrack);
                localVideoTrack.stop();
                localVideoTrack.close();
            }

            // Create and publish new video track
            const videoTrack = await createCameraVideoTrack();
            await clientRef.current.publish(videoTrack);
            
            setLocalVideoTrack(videoTrack);
            setIsVideoEnabled(true);
            setIsJoined(true);
            setUserCount(1);
            connectWebSocket(); // Start transcription automatically

        } catch (error) {
            console.error('Error joining channel:', error);
            toast({
                title: 'Connection Error',
                description: error.message || 'Failed to join video call',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
            setErrorMessage(error.message);
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    };

    // Leave channel logic
    
    // Modified leaveChannel function
    const leaveChannel = async () => {
        try {
            stopRecording();
            setIsLoading(true);
            
            // Stop timer immediately when leaving
            stopTimer();
            
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
            setRemoteAudioTracks([]);            await clientRef.current.leave();
            
            setRemoteUsers([]);
            setIsVideoEnabled(false);
            setIsRecording(false);
            setIsJoined(false);
            setUserCount(0);
            // Reset timer state
            startTimeRef.current = null;
            setCallDuration(900);

            // Save documentation before exiting
            await saveAllDocumentation();

            console.log('Successfully left the channel and cleaned up.');
        } catch (error) {
            console.error('Error leaving channel:', error);
            setMessage('Error leaving channel');
            toast({
                title: 'Error',
                description: 'Failed to save documentation and leave channel. Please try again.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
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
                await clientRef.current.unpublish(localVideoTrack);
                localVideoTrack.stop();
                localVideoTrack.close();
                setLocalVideoTrack(null);
                setIsVideoEnabled(false);
                console.log('Video disabled.');
                setVid(true);
            } catch (error) {
                console.error('Error disabling video:', error);
                toast({
                    title: 'Video Error',
                    description: 'Failed to disable video',
                    status: 'error',
                    duration: 5000,
                    isClosable: true,
                });
            }
        }
    }
    // Enable video
    async function enableVideo() {
        try {
            // Clean up existing video track if any
            if (localVideoTrack) {
                await clientRef.current.unpublish(localVideoTrack);
                localVideoTrack.stop();
                localVideoTrack.close();
            }

            const videoTrack = await createCameraVideoTrack({
                encoderConfig: {
                    resolution: '1280x720',
                    frameRate: 30,
                    bitrateMax: 1130,
                },
            });
            
            await clientRef.current.publish(videoTrack);
            setLocalVideoTrack(videoTrack);
            setIsVideoEnabled(true);
            console.log('Video enabled successfully');
        } catch (error) {
            console.error('Error enabling video:', error);
            toast({
                title: 'Video Error',
                description: 'Failed to enable video',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
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


    // Start Audio Recording
    const streamProcessor = useRef(null);
    const [isProcessingAudio, setIsProcessingAudio] = useState(false);
    const [audioQuality, setAudioQuality] = useState('high');

    // Add these audio processing functions
    const getOptimalAudioConfig = () => {
        const configs = {
            high: {
                sampleRate: 48000,
                channelCount: 2,
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            },
            medium: {
                sampleRate: 32000,
                channelCount: 1,
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            },
            low: {
                sampleRate: 16000,
                channelCount: 1,
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: false
            }
        };
        
        return configs[audioQuality];
    };

    // Modify the startRecording function
    const startRecording = async () => {
        try {
        
            setIsProcessingAudio(true);
            const audioConfig = getOptimalAudioConfig();
            const stream = await setupAudioWithFallback({ audio: audioConfig });
    
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const source = audioContext.createMediaStreamSource(stream);
            const processor = audioContext.createScriptProcessor(2048, 1, 1);
            
            processor.onaudioprocess = (e) => {
                if (!isProcessingAudio || !assemblyWsRef.current || assemblyWsRef.current.readyState !== WebSocket.OPEN) return;
                
                const inputData = e.inputBuffer.getChannelData(0);
                const downsampledData = downsampleAudio(inputData, audioContext.sampleRate, 16000);
                const encodedData = encodeAudioData(downsampledData);
                
                try {
                    assemblyWsRef.current.send(encodedData);
                } catch (err) {
                    console.error('Error sending audio data:', err);
                    setIsProcessingAudio(false);
                }
            };
    
            source.connect(processor);
            processor.connect(audioContext.destination);
            streamProcessor.current = { processor, audioContext, source };
            
            // Set up audio visualization
            const vizData = setupAudioVisualization(audioContext, source);
            setVisualizer(vizData);
            
            setIsRecording(true);
            console.log('Recording started with quality:', audioQuality);
            
        } catch (error) {
            console.error('Error starting recording:', error);
            toast({
                title: "Recording Error",
                description: error.message,
                status: "error",
                duration: 5000,
                isClosable: true,
            });
            setIsProcessingAudio(false);
        }
    };

    // Add these helper functions
    const downsampleAudio = (audioData, originalSampleRate, targetSampleRate) => {
        if (originalSampleRate === targetSampleRate) return audioData;
        
        const ratio = originalSampleRate / targetSampleRate;
        const newLength = Math.round(audioData.length / ratio);
        const result = new Float32Array(newLength);
        
        for (let i = 0; i < newLength; i++) {
            const pos = i * ratio;
            const index = Math.floor(pos);
            const fraction = pos - index;
            
            let value;
            if (index >= audioData.length - 1) {
                value = audioData[audioData.length - 1];
            } else {
                value = audioData[index] * (1 - fraction) + audioData[index + 1] * fraction;
            }
            result[i] = value;
        }
        
        return result;
    };
    
    const encodeAudioData = (floatData) => {
        const buffer = new ArrayBuffer(floatData.length * 2);
        const view = new DataView(buffer);
        
        for (let i = 0; i < floatData.length; i++) {
            const s = Math.max(-1, Math.min(1, floatData[i]));
            view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
        }
        
        return buffer;
    };

    // Modify the stopRecording function
    const stopRecord = () => {
        setIsProcessingAudio(false);
        setIsRecording(false);
        
        if (streamProcessor.current) {
            const { processor, audioContext, source } = streamProcessor.current;
            processor.disconnect();
            source.disconnect();
            audioContext.close();
            streamProcessor.current = null;
        }
        
        if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({ type: 'documentation.stop' }));
        }
        
        setVisualizer(null);
        console.log('Recording stopped');
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

    const AudioVisualizer = ({ analyser, dataArray, bufferLength }) => {
        const canvasRef = useRef(null);
        const animationRef = useRef(null);
    
        useEffect(() => {
            if (!analyser) return;
    
            const canvas = canvasRef.current;
            const canvasCtx = canvas.getContext('2d');
            const draw = () => {
                const WIDTH = canvas.width;
                const HEIGHT = canvas.height;
    
                analyser.getByteFrequencyData(dataArray);
    
                canvasCtx.fillStyle = 'rgb(0, 0, 0)';
                canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);
    
                const barWidth = (WIDTH / bufferLength) * 2.5;
                let barHeight;
                let x = 0;
    
                for(let i = 0; i < bufferLength; i++) {
                    barHeight = dataArray[i] / 2;
    
                    const r = barHeight + (25 * (i/bufferLength));
                    const g = 250 * (i/bufferLength);
                    const b = 50;
    
                    canvasCtx.fillStyle = `rgb(${r},${g},${b})`;
                    canvasCtx.fillRect(x, HEIGHT - barHeight, barWidth, barHeight);
    
                    x += barWidth + 1;
                }
                animationRef.current = requestAnimationFrame(draw);
            };
    
            draw();
    
            return () => {
                if (animationRef.current) {
                    cancelAnimationFrame(animationRef.current);
                }
            };
        }, [analyser, dataArray, bufferLength]);
    
        return (
            <Box borderRadius="md" overflow="hidden" my={4}>
                <canvas
                    ref={canvasRef}
                    width={300}
                    height={50}
                    style={{
                        width: '100%',
                        height: '50px',
                        background: 'black',
                    }}
                />
            </Box>
        );
    };

    // Status components
    const StatusControls = ({ isVideoEnabled, isRecording, connectionStatus }) => (
        <HStack spacing={4} px={4} py={2} bg={useColorModeValue('gray.100', 'gray.700')} borderRadius="md">
            <Badge
                colorScheme={isVideoEnabled ? 'green' : 'gray'}
                variant="subtle"
                px={2}
                py={1}
            >
                Video {isVideoEnabled ? 'On' : 'Off'}
            </Badge>
            <Badge
                colorScheme={isRecording ? 'red' : 'gray'}
                variant="subtle"
                px={2}
                py={1}
            >
                {isRecording ? 'Recording' : 'Not Recording'}
            </Badge>
            <Badge
                colorScheme={
                    connectionStatus === 'connected' ? 'green' :
                    connectionStatus === 'error' ? 'red' : 'yellow'
                }
                variant="subtle"
                px={2}
                py={1}
            >
                {connectionStatus}
            </Badge>
        </HStack>
    );

    // Video controls component
    const VideoControls = ({ 
        isVideoEnabled, 
        toggleVideo, 
        isRecording, 
        toggleRecording,
        endCall,
        isLoading 
    }) => (
        <HStack spacing={4} justify="center" mt={4}>
            <Tooltip label={isVideoEnabled ? "Disable Video" : "Enable Video"}>
                <IconButton
                    icon={isVideoEnabled ? <MdVideocam /> : <MdVideocamOff />}
                    onClick={toggleVideo}
                    colorScheme={isVideoEnabled ? "blue" : "gray"}
                    isRound
                    size="lg"
                />
            </Tooltip>
            <Tooltip label={isRecording ? "Stop Recording" : "Start Recording"}>
                <IconButton
                    icon={isRecording ? <MdStop /> : <MdMic />}
                    onClick={toggleRecording}
                    colorScheme={isRecording ? "red" : "blue"}
                    isRound
                    size="lg"
                />
            </Tooltip>
            <Tooltip label="End Call">
                <IconButton
                    icon={<MdCallEnd />}
                    onClick={endCall}
                    colorScheme="red"
                    isRound
                    size="lg"
                    isLoading={isLoading}
                />
            </Tooltip>
        </HStack>
    );

    const [assemblyAiToken, setAssemblyAiToken] = useState('');
    const [transcript, setTranscript] = useState([]);
    const [isDocumentationSaved, setIsDocumentationSaved] = useState(false);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const assemblyWsRef = useRef(null);
    const reviewId = item.review_id;
    const threadId = item.thread_id;
    
    // Add AssemblyAI token fetch useEffect
     useEffect(() => {
        const fetchTranscriptToken = async () => {
          try {
            const tok = await getAccessToken();
            const tokenRes = await fetch(
              "https://health.prestigedelta.com/assemblyai/generate-token/",
              {
                headers: {
                  "Content-Type": "application/json",
                  Accept: "application/json",
                  Authorization: `Bearer ${tok}`,
                },
              }
            );
            if (!tokenRes.ok) {
              const message = `Failed to fetch AssemblyAI token, status code: ${tokenRes.status}`;
              console.error(message);
              toast({
                title: 'Token Error',
                description: message,
                status: 'error',
                duration: 5000,
                isClosable: true,
              });
              return;
            }
            const tokenData = await tokenRes.json();
            setAssemblyAiToken(tokenData.token);
            console.log("AssemblyAI token:", tokenData.token);
          } catch (error) {
            console.error("Error initializing AssemblyAI:", error);
            toast({
              title: 'Token Error',
              description: 'Failed to initialize AssemblyAI token service.',
              status: 'error',
              duration: 5000,
              isClosable: true,
            });
          }
        };
    
        fetchTranscriptToken();
    
        const intervalId = setInterval(fetchTranscriptToken, 249000);
    
        return () => clearInterval(intervalId);
      }, [toast]);
    

    const handleConnectionError = async () => {
        setConnectionStatus('error');
        toast({
            title: 'Connection Error',
            description: 'Failed to maintain connection. Please try reconnecting.',
            status: 'error',
            duration: 5000,
            isClosable: true,
        });

        if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
            setIsReconnecting(true);
            reconnectAttempts.current += 1;
            try {
                await connectWebSocket();
                setConnectionStatus('connected');
            } catch (error) {
                console.error('Reconnection attempt failed:', error);
            } finally {
                setIsReconnecting(false);
            }
        }
    };

    const connectWebSocket = async () => {
        try {
            // First attempt to wait for existing tokens
            const socketUrl = `wss://api.assemblyai.com/v2/realtime/ws?sample_rate=16000&token=${assemblyAiToken}`;

            return new Promise((resolve, reject) => {
                if (assemblyWsRef.current?.readyState === WebSocket.OPEN) {
                    console.log('WebSocket already connected');
                    return resolve(assemblyWsRef.current);
                }

                console.log('Creating new WebSocket connection...');
                assemblyWsRef.current = new WebSocket(socketUrl);

                assemblyWsRef.current.onopen = () => {
                    console.log('AssemblyAI WebSocket connected successfully');
                    setConnectionStatus('connected');
                    setIsTranscribing(true);
                    startAudioProcessing();
                    resolve(assemblyWsRef.current);
                    startRecording();
                };

                assemblyWsRef.current.onerror = (error) => {
                    console.error('WebSocket error:', error);
                    handleConnectionError();
                    reject(error);
                };

                assemblyWsRef.current.onclose = () => {
                    console.log('WebSocket closed');
                    setConnectionStatus('disconnected');
                    setIsTranscribing(false);
                    
                    // Attempt to reconnect if not intentionally closed and still in call
                    if (isJoined && reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
                        console.log('Attempting to reconnect...');
                        setTimeout(() => {
                            connectWebSocket().catch(console.error);
                        }, 2000);
                    }
                };

                assemblyWsRef.current.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        if (data.error) {                        if (data.error === "Session idle for too long") {
                                setConnectionStatus('disconnected');
                                setIsRecording(false);
                                setTimeout(() => {
                                    connectWebSocket();
                                }, 1000);
                                return;
                            }
                        }
                        if (data.message_type === 'FinalTranscript' && data.text) {
                            setTranscript(prev => {
                                const newEntry = {
                                    time: new Date().toISOString(),
                                    speaker: "", // Speaker will be assigned later if needed
                                    content: data.text
                                };
                                const updatedTranscript = [...prev, newEntry];
                                return updatedTranscript;
                            });
                        }
                    } catch (error) {
                        console.error('Error processing transcript:', error);
                    }
                };
            });
        } catch (error) {
            console.error('Error in connectWebSocket:', error);
            toast({
                title: 'Connection Error',
                description: 'Failed to initialize transcription service',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
            throw error;
        }
    };

    const stopTranscription = () => {
        if (assemblyWsRef.current) {
            assemblyWsRef.current.close();
            assemblyWsRef.current = null;
        }
        stopAudioProcessing();
        setIsTranscribing(false);
        setConnectionStatus('disconnected');
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopTranscription();
        };
    }, []);

    const startAudioProcessing = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    sampleRate: 16000,
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true,
                }
            });
            
            audioContextRef.current = new AudioContext({ sampleRate: 16000 });
            const source = audioContextRef.current.createMediaStreamSource(stream);
            processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);
            
            source.connect(processorRef.current);
            processorRef.current.connect(audioContextRef.current.destination);
            
            processorRef.current.onaudioprocess = (e) => {
                if (!isTranscribing || isPaused) return;
                
                const inputData = e.inputBuffer.getChannelData(0);
                const pcmData = convertFloat32ToInt16(inputData);
                if (assemblyWsRef.current?.readyState === WebSocket.OPEN) {
                    assemblyWsRef.current.send(pcmData);
                }
            };
            
            setIsProcessingAudio(true);
        } catch (error) {
            console.error('Error starting audio processing:', error);
            toast({
                title: 'Audio Error',
                description: 'Failed to start audio processing. Please check microphone permissions.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        }
    };
    
    const stopAudioProcessing = () => {
        if (processorRef.current) {
            processorRef.current.disconnect();
            processorRef.current = null;
        }
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
        setIsProcessingAudio(false);
    };
    
    const convertFloat32ToInt16 = (buffer) => {
        const l = buffer.length;
        const buf = new Int16Array(l);
        for (let i = 0; i < l; i++) {
            buf[i] = Math.min(1, Math.max(-1, buffer[i])) * 0x7FFF;
        }
        return buf.buffer;
    };

    // Auto-join effect
    useEffect(() => {
        const initializeCall = async () => {
            if (!isJoined && !isLoading) {
                try {
                    await joinChannelWithVideo();
                    // Start AssemblyAI after successful join
                    if (userCount > 1) {
                        await connectWebSocket();
                    }
                } catch (error) {
                    console.error('Error initializing call:', error);
                    toast({
                        title: "Connection Error",
                        description: "Failed to start video call. Please refresh the page.",
                        status: "error",
                        duration: 5000,
                        isClosable: true,
                    });
                }
            }
        };

        initializeCall();
    }, []);

    // Add listener for user count changes to start transcription
    useEffect(() => {
        if (userCount > 1 && assemblyAiToken && !isTranscribing) {
            connectWebSocket();
        }
    }, [userCount, assemblyAiToken]);

    const saveAllDocumentation = async () => {
        try {
            toast({
                title: "Saving documentation...",
                description: "Please wait while we save your documentation.",
                status: "info",
                duration: 3000,
                isClosable: true,
            });
    
            // If patientProfileRef exists and has getSuggestion method, try to generate suggestions first
            if (patientProfileRef.current && patientProfileRef.current.getSuggestion) {
                if (patientProfileRef.current.isGeneratingNote && patientProfileRef.current.isGeneratingNote()) {
                    toast({
                        title: "Note generation in progress",
                        description: "A clinical note is already being generated. Please wait.",
                        status: "info",
                        duration: 3000,
                        isClosable: true,
                    });
                } else {
                    await patientProfileRef.current.getSuggestion();
                }
            }
    
            // Save the documentation
            let saved = false;
            if (patientProfileRef.current && patientProfileRef.current.handleSubmitFromParent) {
                saved = await patientProfileRef.current.handleSubmitFromParent('all');
            }
    
            if (saved) {
                setIsDocumentationSaved(true);
                toast({
                    title: "Documentation saved",
                    description: "All documentation has been saved successfully.",
                    status: "success",
                    duration: 3000,
                    isClosable: true,
                });
                // Stop transcription and recording
                if (isTranscribing) {
                    stopRealtimeTranscription();
                }
                // Navigate back to dashboard
                navigate('/dashboard');
            }
        } catch (error) {
            console.error("Error saving documentation:", error);
            toast({
                title: "Error",
                description: "Failed to save documentation. Please try again.",
                status: "error",
                duration: 3000,
                isClosable: true,
            });
        }
    };

    const stopRealtimeTranscription = () => {
        if (assemblyWsRef.current) {
            assemblyWsRef.current.close();
            assemblyWsRef.current = null;
        }
        setIsRecording(false);
        setIsTranscribing(false);
    };

    const endCall = () => {
        stopRealtimeTranscription();
        navigate('/dashboard');
    };

    // Main UI Render
    return (
        <ErrorBoundary FallbackComponent={ErrorFallback}>
            <ChakraProvider>
                <Box 
                    h="100vh" 
                    bg={bgColor} 
                    position="relative"
                    display="flex"
                    flexDirection="column"
                >
                    {/* Fixed Header */}
                    <Flex
                        py={2}
                        px={4}
                        bg={useColorModeValue('white', 'gray.800')}
                        borderBottomWidth="1px"
                        borderColor={borderColor}
                        justify="space-between"
                        align="center"
                        h="48px"
                    >
                        <HStack spacing={4} align="center">
                            <Box
                                bg={useColorModeValue('gray.100', 'gray.700')}
                                px={3}
                                py={1}
                                borderRadius="full"
                            >
                                <Text fontSize="lg" fontWeight="medium">
                                    {formatTime(callDuration)}
                                </Text>
                            </Box>                            <Button
                                leftIcon={<MdSave />}
                                size="sm"
                                colorScheme="blue"
                                onClick={saveAllDocumentation}
                            >
                                Save and Exit Call
                            </Button>
                        </HStack>

                        <HStack spacing={4}>
                            {isTranscribing && (
                                <Badge 
                                    colorScheme="red" 
                                    variant="subtle"
                                    px={2}
                                    py={1}
                                >
                                    Transcribing
                                </Badge>
                            )}
                            <Popover placement="bottom-start" isLazy>
                                <PopoverTrigger>
                                    <IconButton
                                        icon={<MdDescription />}
                                        colorScheme="blue"
                                        variant="ghost"
                                        size="sm"
                                        aria-label="View Live Transcription"
                                        isDisabled={!isTranscribing}
                                    />
                                </PopoverTrigger>
                                <PopoverContent width="400px">
                                    <PopoverArrow />
                                    <PopoverCloseButton />
                                    <Box p={4}>
                                        <VStack align="stretch" spacing={3}>
                                            <Flex justify="space-between" align="center">
                                                <Text fontWeight="bold">Live Transcription</Text>
                                                {isTranscribing && (
                                                    <Badge colorScheme="green" variant="subtle">
                                                        Active
                                                    </Badge>
                                                )}
                                            </Flex>
                                            <Box 
                                                bg={useColorModeValue('gray.50', 'gray.700')}
                                                p={3} 
                                                borderRadius="md" 
                                                fontSize="sm"
                                                whiteSpace="pre-wrap"
                                                minHeight="200px"
                                                maxHeight="400px"
                                                overflowY="auto"
                                                css={{
                                                    '&::-webkit-scrollbar': {
                                                        width: '4px',
                                                    },
                                                    '&::-webkit-scrollbar-thumb': {
                                                        background: 'gray',
                                                        borderRadius: '24px',
                                                    },
                                                }}
                                            >
                                                {transcript.map((entry, index) => (
                                                    <Text key={index}>
                                                        <strong>{entry.time}</strong>: {entry.content}
                                                    </Text>
                                                )) || "No transcription available yet..."}
                                            </Box>
                                            {/* Audio Visualization */}
                                            {visualizer && (
                                                <AudioVisualizer 
                                                    analyser={visualizer.analyser}
                                                    dataArray={visualizer.dataArray}
                                                    bufferLength={visualizer.bufferLength}
                                                />
                                            )}
                                        </VStack>
                                    </Box>
                                </PopoverContent>
                            </Popover>
                        </HStack>
                    </Flex>
                    
                    {/* Main Content Area */}
                    <Box flex="1" display="flex" flexDirection="column" height="calc(100vh - 48px)">
                       
                        <Tabs 
                            variant="enclosed" 
                            colorScheme="blue" 
                            onChange={(index) => setActiveTab(index === 0 ? 'consultation' : 'documentation')}
                            display="flex"
                            flexDirection="column"
                            height="100%"
                        >
                            <TabList>
                                <Tab>Consultation</Tab>
                                <Tab color='white'>Documentation</Tab>
                            </TabList>

                            <TabPanels flex="1">
                                <TabPanel p={0} height="100%">
                                    <Box position="relative" height="100%">
                                        {/* Status Controls */}
                                        <Box
                                            position="absolute"
                                            top={2}
                                            left={2}
                                            right={2}
                                            zIndex={2}
                                        >
                                            <StatusControls 
                                                isVideoEnabled={isVideoEnabled}
                                                isRecording={isRecording}
                                                connectionStatus={connectionStatus}
                                            />
                                        </Box>
                                        
                                        {/* Video Display */}
                                        <Box
                                            position="relative"
                                            height="100%"
                                            bg="black"
                                        >
                                            {isVideoEnabled ? (
                                                <VideoDisplay
                                                    localVideoTrack={localVideoTrack}
                                                    remoteUsers={remoteUsers}
                                                />
                                            ) : (
                                                <Flex
                                                    height="100%"
                                                    justify="center"
                                                    align="center"
                                                    bg="gray.900"
                                                >
                                                    <Text color="white">Video is disabled</Text>
                                                </Flex>
                                            )}

                                            {/* Waiting for user message */}
                                            {userCount <= 1 && (
                                                <Alert
                                                    status="info"
                                                    variant="solid"
                                                    position="absolute"
                                                    top="50%"
                                                    left="50%"
                                                    transform="translate(-50%, -50%)"
                                                    zIndex={2}
                                                    borderRadius="md"
                                                    width="auto"
                                                >
                                                    <AlertIcon />
                                                    Waiting for user to join...
                                                </Alert>
                                            )}

                                            {/* Controls */}
                                            <Box
                                                position="absolute"
                                                bottom={4}
                                                left="50%"
                                                transform="translateX(-50%)"
                                                zIndex={2}
                                            >
                                                <HStack 
                                                    spacing={4} 
                                                    p={3} 
                                                    bg="rgba(0, 0, 0, 0.6)" 
                                                    borderRadius="full"
                                                >
                                                    <Tooltip label={isVideoEnabled ? "Disable Video" : "Enable Video"}>
                                                        <IconButton
                                                            icon={isVideoEnabled ? <MdVideocam /> : <MdVideocamOff />}
                                                            onClick={() => isVideoEnabled ? disableVideo() : enableVideo()}
                                                            colorScheme={isVideoEnabled ? "blue" : "gray"}
                                                            isRound
                                                            size="lg"
                                                            variant="ghost"
                                                            _hover={{ bg: 'whiteAlpha.200' }}
                                                        />
                                                    </Tooltip>
                                                    <Tooltip label="End Call">
                                                        <IconButton
                                                            icon={<MdCallEnd />}
                                                            onClick={leaveChannel}
                                                            colorScheme="red"
                                                            isRound
                                                            size="lg"
                                                            variant="solid"
                                                            isLoading={isLoading}
                                                        />
                                                    </Tooltip>
                                                </HStack>
                                            </Box>

                                            {/* Progress bar */}
                                            {userCount > 1 && (
                                                <Box
                                                    position="absolute"
                                                    bottom={0}
                                                    left={0}
                                                    right={0}
                                                    zIndex={2}
                                                >
                                                    <Progress
                                                        value={(900 - callDuration) / 9}
                                                        size="xs"
                                                        colorScheme="blue"
                                                    />
                                                </Box>
                                            )}
                                        </Box>
                                    </Box>
                                </TabPanel>

                                <TabPanel>
                                    <PatientProfile
                                        ref={patientProfileRef}
                                        reviewid={reviewId}
                                        thread={threadId}
                                        wsStatus={connectionStatus}
                                        setIsDocumentationSaved={setIsDocumentationSaved}
                                        transcript={transcript}
                                    />
                                </TabPanel>
                            </TabPanels>
                        </Tabs>
                    </Box>
                </Box>
            </ChakraProvider>
        </ErrorBoundary>
    );
};

export default Call;