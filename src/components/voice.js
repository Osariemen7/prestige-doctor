import React, { useState, useEffect } from 'react';
import { createClient, createMicrophoneAudioTrack, createCameraVideoTrack } from 'agora-rtc-sdk-ng';
import Recorder from 'recorder-js';
import { getAccessToken } from './api';
import { MdCall, MdCallEnd, MdVideoCall, MdVideocam, MdVideocamOff } from 'react-icons/md';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { ChakraProvider, Heading, Text, Spinner, Box, Flex, IconButton, Avatar } from '@chakra-ui/react';
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
    const [callDuration, setCallDuration] = useState(0);
    const [timerId, setTimerId] = useState(null);
    const navigate = useNavigate()
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
      
          setUserCount((prev) => prev + 1);
      
          // Start timer when the first remote user joins
          if (!timerId) {
            startTimer();
          }
        });
      
        client.on('user-unpublished', (user) => {
          setRemoteUsers((prev) => prev.filter((u) => u.uid !== user.uid));
          setRemoteAudioTracks((prev) =>
            prev.filter((track) => track.getUserId() !== user.uid)
          );
          setUserCount((prev) => Math.max(prev - 1, 0));
      
          // Stop timer if no remote users remain
          if (userCount <= 1) {
            stopTimer();
          }
        });
      }, [client, timerId, userCount]);
      

      const startTimer = () => {
        setCallDuration(0); // Reset duration
        const id = setInterval(() => {
          setCallDuration((prev) => prev + 1);
        }, 1000);
        setTimerId(id);
      };
      
    
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
    
            const audioTrack = await createMicrophoneAudioTrack();
            await client.publish(audioTrack);
            setLocalAudioTrack(audioTrack);
    
            const videoTrack = await createCameraVideoTrack();
            await client.publish(videoTrack);
            setLocalVideoTrack(videoTrack);
            setIsVideoEnabled(true);
            setIsJoined(true);
            setUserCount(1);
    
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
            navigate('https://prestige-health.vercel.app/');
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

    return (
        <ChakraProvider>
        <Box position="relative" height="100vh" width="100%" bg="#2c2c2c">
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

        </Box>
    </ChakraProvider>
    );
};

export default Voice;
