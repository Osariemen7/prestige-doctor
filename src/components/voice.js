import React, { useState, useEffect } from 'react';
import { createClient, createMicrophoneAudioTrack, createCameraVideoTrack } from 'agora-rtc-sdk-ng';
import Recorder from 'recorder-js';
import { getAccessToken } from './api';
import { MdCall, MdCallEnd, MdVideoCall, MdVideocam, MdVideocamOff } from 'react-icons/md';
import { useSearchParams, useLocation } from 'react-router-dom';
import { ChakraProvider, Heading, Text, Spinner, Box, Flex, IconButton, Avatar } from '@chakra-ui/react';
import VideoDisplay from './vod';

const Voice = () => {
    const { state } = useLocation();
    const item = state?.item || {};
    const [searchParams] = useSearchParams();
    const chanel = searchParams.get("channel");

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

    const startTimer = () => {
        setCallDuration(0);
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
    
    async function joinChannel() {
        if (isJoined) {
            console.warn('You are already in the channel.');
            return;
        }
    
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
            setUserCount(1);
    
            startTimer();
            console.log('Joined channel with audio.');
        } catch (error) {
            console.error('Error joining channel:', error);
        } finally {
            setIsLoading(false); // Stop loading
        }
    }
    
    async function joinChannelWithVideo() {
        if (isJoined) {
            console.warn('You are already in the channel.');
            return;
        }
    
        setIsLoading(true);
        try {
            const appId = '44787e17cd0348cd8b75366a2b5931e9';
            const token = null;
            const channel = `${item.channel_name}s` || `${chanel}s`;
    
            await client.join(appId, channel, token, null);
    
            const audioTrack = await createMicrophoneAudioTrack();
            await client.publish(audioTrack);
            setLocalAudioTrack(audioTrack);
            startTimer();
    
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
    
    async function enableVideo() {
        const appId = '44787e17cd0348cd8b75366a2b5931e9';
            const token = null;
            const channel = item.channel_name || chanel;

            await client.join(appId, channel, token, null);
        if (!isJoined) {
            console.error('You need to join the channel before enabling video.');
            return;
        }
    
        if (localVideoTrack) {
            console.warn('Video is already enabled.');
            return;
        }
    
        try {
            const videoTrack = await createCameraVideoTrack();
            await client.publish(videoTrack);
            setLocalVideoTrack(videoTrack);
            setIsVideoEnabled(true);
            console.log('Video enabled.');
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
        try {
            
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
            setUserCount(0)

            console.log('Left the channel and cleaned up tracks.');
        } catch (error) {
            console.error('Error leaving channel:', error);
        } finally {
            setIsLoading(false); // Stop loading
        }
    }
 
   
    const formatDuration = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

    return (
        <ChakraProvider>
            <Flex direction="column" align="center" justify="space-between" height="100vh" padding="24px" bgColor="#2c2c2c" color="white">
                <Heading fontSize="25px" marginBottom="20px">
                    Doctor's Appointment
                </Heading>
                  {/* Call timer display */}
                {isJoined && (
                    <Box marginBottom="10px">
                        <Text fontSize="lg" color="yellow.300">
                            Call Duration: {formatDuration(callDuration)}
                        </Text>
                    </Box>
                )}
                {isVideoEnabled ? (
                    <VideoDisplay localVideoTrack={localVideoTrack} remoteUsers={remoteUsers} />
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
    );
};

export default Voice;
