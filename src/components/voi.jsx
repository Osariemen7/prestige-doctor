import React, { useState, useEffect } from 'react';
import { createClient, createMicrophoneAudioTrack, createCameraVideoTrack } from 'agora-rtc-sdk-ng';
import Recorder from 'recorder-js';
import { getAccessToken } from './api';
import { MdCall, MdCallEnd, MdVideoCall, MdVideocam, MdVideocamOff } from 'react-icons/md';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { ChakraProvider, Heading, Text, Spinner, Box, Flex, IconButton, Avatar, Button, VStack, Divider, Textarea } from '@chakra-ui/react';
import {  submitEdits } from './api';
import { BiMicrophone, BiMicrophoneOff } from 'react-icons/bi';
import VideoDisplay from './vod';

const Call = () => {
    const { state } = useLocation();
    const item = state?.item || {};
    const [searchParams] = useSearchParams();
    const chanel = searchParams.get("channel");
    const navigate = useNavigate()
  const [message, setMessage] = useState('')

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
          if (userCount === 0) {
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
  }, [client, userCount]);
  
    

    const startTimer = () => {
      setCallDuration(0); // Reset duration
      const id = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
      setTimerId(id);
    };
    

  // Stop call timer
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
        startRecording(); // Start recording immediately

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
              console.log('Video disabled.');
          } catch (error) {
              console.error('Error disabling video:', error);
          }
      }
  }

  async function leaveChannel() {
    setIsLoading(true); // Start loading
    try {
        stopRecording();
        await client.leave();
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
        setUserCount(0);
        setIsJoined(false); // Reset isJoined state
        

        console.log('Left the channel and cleaned up tracks.');
    } catch (error) {
        console.error('Error leaving channel:', error);
    } finally {
        setIsLoading(false); // Stop loading
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
    const phone = `+234${phoneNumber.slice(1)}`;
    const formData = new FormData();
    formData.append('audio_file', blob, 'conversation.wav');
    formData.append('phone_number', phone);

    if (isFinal) {
        formData.append('document', 'true'); // Add `document=true` for final recording
    }

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
            const responseData = await response.json();
            navigate('/show', { state: { responseData } });
            console.log('Audio uploaded successfully:', responseData);
        } else {
            console.error('Failed to upload audio:', response.statusText);
        }
    } catch (error) {
        console.error('Error uploading audio:', error);
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
            
            <Flex
                position="absolute"
                bottom="20px"
                left="50%"
                transform="translateX(-50%)"
                gap="30px"
                zIndex="1"
            >
            {isRecording && (
    <Box position="absolute" top="20px" left="20px" zIndex="1">
        <Text fontSize="lg" color="red.500">● Recording...</Text>
    </Box>
)}

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
                    <Text marginTop="5px" color="white">
                        {isVideoEnabled ? 'Disable Video' : 'Start Video'}
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
                    <Text>{message}</Text>

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
