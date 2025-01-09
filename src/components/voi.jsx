import React, { useState, useEffect , useRef} from 'react';
import { createClient, createMicrophoneAudioTrack, createCameraVideoTrack } from 'agora-rtc-sdk-ng';
import Recorder from 'recorder-js';
import { MdCall, MdCallEnd, MdVideoCall,MdChat, MdVideocam, MdVideocamOff } from 'react-icons/md';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { ChakraProvider, Heading, Text, Spinner, Box, Flex, IconButton, Avatar, Button, VStack, Divider, Textarea } from '@chakra-ui/react';
import VideoDisplay from './vod';
import { sendAudioFile, getAccessToken} from './api'
import { useReview } from './context';
import Chat from './chatVoice';

const Call = () => {
    const { state } = useLocation();
    const item = state?.item || {};
    const [searchParams] = useSearchParams();
    const chanel = searchParams.get("channel");
    const navigate = useNavigate()
  const [message, setMessage] = useState('')
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);
  const { setReview } = useReview();
  const [reviewId, setReviewId] = useState(null);
  const [dat, setData] = useState('')
  const [isChatOpen, setIsChatOpen] = useState(false);  
    const [recordingTimer, setRecordingTimer] = useState(null);
const [recordingTime, setRecordingTime] = useState(0);
  const audioStream = useRef(null);
  const scriptProcessor = useRef(null);
  const desiredSampleRate = 16000;
  const currentReviewId = useRef(null);
   const audioContext = useRef(null);
    const [callDuration, setCallDuration] = useState(0);
    const [timerId, setTimerId] = useState(null);
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
    const [vid, setVid] = useState(false)
    const clientRef = useRef(null);
    const [chatMessages, setChatMessages] = useState([]);
    const ws = useRef(null);
    const [wsStatus, setWsStatus] = useState('Disconnected');
     const [oobRequestType, setOobRequestType] = useState('summary');
     const [oobRequestDetails, setOobRequestDetails] = useState('');
    const [debugLogs, setDebugLogs] = useState([]);
    
     useEffect(() => {
        return () => {
          if (ws.current) {
            ws.current.close();
          }
        };
      }, []);


    
    useEffect(() => {
        clientRef.current = createClient({ mode: 'rtc', codec: 'vp8' });
        const client = clientRef.current;

        const handleUserPublished = async (user, mediaType) => {
            await client.subscribe(user, mediaType);

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

        client.on('user-published', handleUserPublished);
        client.on('user-unpublished', handleUserUnpublished);

        return () => {
            client.off('user-published', handleUserPublished);
            client.off('user-unpublished', handleUserUnpublished);
            stopTimer();
        };
    }, []);

    const startTimer = () => {
        if (timerRef.current) return; // Prevent multiple timers

        setCallDuration(0);
        startTimeRef.current = Date.now();

        timerRef.current = setInterval(() => {
            const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
            setCallDuration(elapsed);
        }, 1000);
    };

    const stopTimer = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    };

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

            const audioTrack = await createMicrophoneAudioTrack();
            await clientRef.current.publish(audioTrack);
            setLocalAudioTrack(audioTrack);

            const videoTrack = await createCameraVideoTrack();
            await clientRef.current.publish(videoTrack);
            setLocalVideoTrack(videoTrack);
            setIsVideoEnabled(true);
            setIsJoined(true);
            setUserCount(1);
            startTimer()
           
            console.log('Joined channel with audio and video.');
        } catch (error) {
            console.error('Error joining channel with video:', error);
        }finally {
            setIsLoading(false);
        }
    };

    const leaveChannel = async () => {
        try {
            stopRecording();
            setIsLoading(true)

            if (ws.current) {
              ws.current.close();
              ws.current = null;
          }
            await clientRef.current.leave();
            stopTimer();

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
            setIsJoined(false);
            setUserCount(0);

            console.log('Left the channel and cleaned up tracks.');
        } catch (error) {
            console.error('Error leaving channel:', error);
        } finally {
            setIsLoading(false); // Stop loading
        }
    };
    useEffect(() => {
        if(isJoined){
          startRecording()
        }
      }, [isJoined])


  async function disableVideo() {
      if (isVideoEnabled && localVideoTrack) {
          try {
              localVideoTrack.stop();
              localVideoTrack.close();
              setLocalVideoTrack(null);
              setIsVideoEnabled(false);
              console.log('Video disabled.');
              setVid(true)
          } catch (error) {
              console.error('Error disabling video:', error);
          }
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

useEffect(() => {
  return () => {
      if (ws.current) {
          ws.current.close();
          ws.current = null;
      }
  };
}, []);


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

      if (phoneNumber) wsUrl += `&phone_number=${encodeURIComponent(phoneNumber)}`;
      if (reviewId) wsUrl += `&review_id=${encodeURIComponent(reviewId)}`;

      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
          setWsStatus('Connected');
          console.log('WebSocket connected.');
          setIsRecording(true)
           
      };

      ws.current.onclose = () => {
          setWsStatus('Disconnected');
          console.log('WebSocket disconnected.');
      };

      ws.current.onerror = (event) => {
          console.error('WebSocket Error:', event);
      };
  } catch (error) {
      console.error('Error connecting WebSocket:', error);
  }

  ws.current.onmessage = (event) => {
    if (typeof event.data === 'string') {
        try {
            const data = JSON.parse(event.data);
            console.log(`Received message:`, data);

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
                currentReviewId.current = data.review_id;
                console.log(`Session started with review ID: ${currentReviewId.current}`);
            } else if (data.type === 'error') {
                console.error(`OpenAI Error:`, data);
            }
        } catch (error) {
            console.error('Error parsing message:', error);
        }
    }
};
};
    
      const startRecording = async () => {
        if (!ws?.current || ws.current.readyState !== WebSocket.OPEN) {
            console.error('WebSocket is not connected.');
            alert('WebSocket is not connected. Please set up the session first.');
            return;
        }
    
        try {
            if (!audioContext.current) {
                audioContext.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: desiredSampleRate });
            }
    
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
    
            scriptProcessor.current.onaudioprocess = (event) => {
                const inputBuffer = event.inputBuffer.getChannelData(0);
                const pcmBuffer = pcmEncode(inputBuffer);
    
                if (ws.current?.readyState === WebSocket.OPEN) {
                    ws.current.send(pcmBuffer);
                }
            };
    
            sourceNode.connect(scriptProcessor.current);
            scriptProcessor.current.connect(audioContext.current.destination);
    
            setRecordingTime(0);
            timerRef.current = setInterval(() => setRecordingTime((prev) => prev + 1), 1000);
    
            setIsRecording(true);
            console.log('Recording started.');
        } catch (error) {
            console.error(`Error starting recording: ${error.message}`);
            alert('Error accessing microphone. Please ensure microphone permissions are granted.');
        }
    };
    
    const stopRecording = () => {
        if (scriptProcessor.current) {
            scriptProcessor.current.disconnect();
            scriptProcessor.current.onaudioprocess = null;
            scriptProcessor.current = null;
        }
    
        if (audioStream.current) {
            audioStream.current.getTracks().forEach((track) => track.stop());
            audioStream.current = null;
        }
    
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    
        setIsRecording(false);
        console.log('Recording stopped.');
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
    
// Upload audio function
const sendOobRequest = () => {
  if (ws.current && ws.current.readyState === WebSocket.OPEN) {
    ws.current.send(
      JSON.stringify({
        type: 'documentation.request',
        content: {
          request_type: oobRequestType,
          details: oobRequestDetails,
        },
      })
    );
    console.log(`Out-of-Band request sent: Type - ${oobRequestType}, Details - ${oobRequestDetails}`);
  } else {
    console.log('WebSocket is not connected. Cannot send Out-of-Band request.');
  }
};
  
      const formatDuration = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };
      
   
    return (
        <ChakraProvider>

        <Box position="relative" height="100vh" width="100%" bg="#2c2c2c">
            {/* Full-Screen Video */}
            <VideoDisplay localVideoTrack={localVideoTrack} remoteUsers={remoteUsers} />

            {/* Header */}
           
            {/* Call Timer */}
            
            {/* Overlayed Controls */}
             {/* Overlayed Chat Screen */}
   {/* Overlayed Chat Screen */}
 {/* Chat Box - Always Visible on Desktop, Toggle on Mobile */}
 <Box
        position="absolute"
        bottom={['70px', '20px']}
        right={['10px', '20px']}
        width={['80%', '350px']}
        height={['50%', '340px']}
        bg="white"
        borderRadius="md"
        boxShadow="lg"
        zIndex="2"
        display={['none', 'block']} // Hide on mobile, show on desktop
      >
        <Chat ws={ws}
                chatMessages={chatMessages}
                setChatMessages={setChatMessages}  />
      </Box>

      {/* Chat Box for Mobile View (Visible Only When Toggled) */}
      {isChatOpen && (
        <Box
          position="absolute"
          bottom="120px"
          right="10px"
          width="70%"
          height="50%"
          bg="white"
          borderRadius="md"
          boxShadow="lg"
          zIndex="2"
          display={['block', 'none']} // Show on mobile when toggled
        >
          <Chat ws={ws}
                chatMessages={chatMessages}
                setChatMessages={setChatMessages} />
        </Box>
      )}         
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
                    <Text marginTop="5px" color="white"  fontSize='12px'>End Call</Text>
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
                   
                    
                
  {/* Chat Toggle Button (Visible Only on Mobile) */}
  <Box display={['block', 'none']} textAlign="center">
          <IconButton
            icon={<MdChat />}
            colorScheme="teal"
            fontSize="36px"
            onClick={() => setIsChatOpen(!isChatOpen)}
            borderRadius="full"
            size="lg"
          />
          <Text marginTop="5px" color="white" fontSize="12px">
            {isChatOpen ? 'Close Chat' : 'Open Chat'}
          </Text>
        </Box>
            </Flex>
            {/* Responsive Chat Screen */}
      

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
            <Box  position="absolute"
                    top="50%"
                    left="50%"
                    transform="translate(-50%, -50%)"
                    textAlign="center"
                    zIndex="1">
                        <Text color='white'>{message}</Text>
                    </Box>
            
                    {isRecording && (
    <Box position="absolute" top="20px" left="20px" zIndex="1">
        <Text fontSize="lg" color="red.500">● Recording...</Text>
    </Box>
)}
            <Box>
                
            </Box>
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
