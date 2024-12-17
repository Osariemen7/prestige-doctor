import React, { useState, useEffect , useRef} from 'react';
import { createClient, createMicrophoneAudioTrack, createCameraVideoTrack } from 'agora-rtc-sdk-ng';
import Recorder from 'recorder-js';
import { getAccessToken } from './api';
import { MdCall, MdCallEnd, MdVideoCall,MdChat, MdVideocam, MdVideocamOff } from 'react-icons/md';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { ChakraProvider, Heading, Text, Spinner, Box, Flex, IconButton, Avatar, Button, VStack, Divider, Textarea } from '@chakra-ui/react';
import {  submitEdits } from './api';
import { BiMicrophone, BiMicrophoneOff } from 'react-icons/bi';
import VideoDisplay from './vod';
import { sendAudioFile} from './api'
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

    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const destination = audioContext.createMediaStreamDestination();

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
        if (isJoined) {
            console.warn('You are already in the channel.');
            return;
        }
        setIsLoading(true);
        startRecording()
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

  
 
    
    function mixAudio(localTrack, remoteTracks) {
      if (localTrack) {
          const localStream = new MediaStream([localTrack.getMediaStreamTrack()]);
          const localSource = audioContext.createMediaStreamSource(localStream);
          localSource.connect(destination);
      }
  
      remoteTracks.forEach((remoteTrack) => {
          const remoteStream = new MediaStream([remoteTrack.getMediaStreamTrack()]);
          const remoteSource = audioContext.createMediaStreamSource(remoteStream);
          remoteSource.connect(destination);
      });
  
      console.log('Mixed audio stream:', destination.stream);
      return destination.stream; // Returns a valid MediaStream
  }
      
    const startRecording = async () => {
      try {
          if (!localAudioTrack) {
              console.error('Local audio track is not available.');
              return;
          }
  
          const mixedStream = mixAudio(localAudioTrack, remoteAudioTracks);
  
          const recorderInstance = new Recorder(audioContext);
          await recorderInstance.init(mixedStream);
          await recorderInstance.start();
  
          setRecorder(recorderInstance);
          setIsRecording(true);
  
          console.log('Recording started.');
  
          // Set up a timer to upload recording every 60 seconds
          const timerId = setInterval(async () => {
              if (recorderInstance) {
                  const { blob } = await recorderInstance.stop();
                  await uploadAudio(blob, false);
                  await recorderInstance.start(); // Restart recording after upload
              }
          }, 60000);
  
          setRecordingTimer(timerId);
      } catch (error) {
          console.error('Error starting recording:', error);
      }
  };
  

  // Stop recording function
  const stopRecording = async () => {
    try {
        if (recordingTimer) {
            clearInterval(recordingTimer); // Clear the timer
            setRecordingTimer(null);
        }
        setMessage('Please wait, fetching data...');

        if (recorder) {
            const { blob } = await recorder.stop();
            await uploadAudio(blob, true); // Send with `document=true`
            setRecorder(null);
            console.log('Recording stopped and sent with document=true.');
        }
    } catch (error) {
        console.error('Error stopping recording:', error);
    } finally {
        setIsRecording(false);
    }
};


// Upload audio function
const uploadAudio = async (blob, isFinal) => {
    const phoneNumber = item.patient_phone_number;
    
    const formatPhoneNumber = (phoneNumber) => {
        if (phoneNumber.startsWith('+234')) {
            return phoneNumber;
        }
        return `+234${phoneNumber.slice(1)}`;
    };  
    const phone = formatPhoneNumber(phoneNumber) 
    try {
        const recipient = reviewId || phone; // Use reviewId if available; otherwise, phoneNumber
        const response = await sendAudioFile(blob, recipient, isFinal);
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
        navigate('/show', { state: { dat } });
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
        width={['80%', '300px']}
        height={['50%', '370px']}
        bg="white"
        borderRadius="md"
        boxShadow="lg"
        zIndex="2"
        display={['none', 'block']} // Hide on mobile, show on desktop
      >
        <Chat />
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
          <Chat />
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
                   
                    
                <Box textAlign='center'>
    {isRecording ? (
        <IconButton
            icon={<BiMicrophoneOff />}
            colorScheme="red"
            fontSize="36px"
            onClick={stopRecording} // Correct handler
            borderRadius="full"
            size="lg"
        />
    ) : (
        <IconButton
            icon={<BiMicrophone />}
            colorScheme="green"
            fontSize="36px"
            onClick={startRecording} // Correct handler
            borderRadius="full"
            size="lg"
        />
    )}
    <Text marginTop="5px" fontSize='12px' color='white'>{isRecording ? 'Stop Recording' : 'Record'}</Text>
</Box>
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
