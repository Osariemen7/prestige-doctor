import React, { useState, useEffect } from 'react';
import { createClient, createMicrophoneAudioTrack, createCameraVideoTrack } from 'agora-rtc-sdk-ng';
import Recorder from 'recorder-js';
import { getAccessToken } from './api';
import { MdCall, MdCallEnd, MdVideoCall, MdVideocam, MdVideocamOff } from 'react-icons/md';
import { useSearchParams, useLocation } from 'react-router-dom';
import { ChakraProvider, Heading, Text, Spinner, Box, Flex, IconButton, Avatar } from '@chakra-ui/react';

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
    
    async function joinChannel() {
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
            setUserCount(1)

            await startRecording(audioTrack);
            console.log('Joined channel with audio.');
        } catch (error) {
            console.error('Error joining channel:', error);
        } finally {
            setIsLoading(false); // Stop loading
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

        try {
            const videoTrack = await createCameraVideoTrack();
            await client.publish(videoTrack);
            setLocalVideoTrack(videoTrack);
            setIsVideoEnabled(true);
            console.log('Video enabled.');
            console.log(isVideoEnabled)
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
            if (isRecording) {
                await stopRecording();
            }

            await client.leave();

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
 
    async function joinChannelWithVideo() {
        setIsLoading(true);
        try {
            const appId = '44787e17cd0348cd8b75366a2b5931e9';
            const token = null;
            const channel = item.channel_name || chanel;

            await client.join(appId, channel, token, null);
            await startRecording(audioTrack);
            const audioTrack = await createMicrophoneAudioTrack();
            await client.publish(audioTrack);
            setLocalAudioTrack(audioTrack);

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


    function mixAudio(localTrack, remoteTracks) {
        if (localTrack) {
            const localSource = audioContext.createMediaStreamSource(localTrack.getMediaStream());
            localSource.connect(destination);
        }
    
        remoteTracks.forEach((remoteTrack) => {
            const remoteSource = audioContext.createMediaStreamSource(remoteTrack.getMediaStream());
            remoteSource.connect(destination);
        });
    
        console.log('Mixed audio stream:', destination.stream);
        return destination.stream; // Should return a valid MediaStream
    }

    async function startRecording() {
        try {
            const mixedStream = mixAudio(localAudioTrack, remoteAudioTracks);
            console.log('Mixed stream:', mixedStream);
            const recorderInstance = new Recorder(audioContext);
            await recorderInstance.init(mixedStream);
            await recorderInstance.start();
            setRecorder(recorderInstance);
            setIsRecording(true);
            console.log('Recording started.');
        } catch (error) {
            console.error('Error starting recording:', error);
        }
    }
   
    async function stopRecording() {
        if (recorder) {
            try {
                const { blob } = await recorder.stop();
                console.log('Recording stopped. Blob size:', blob.size);
                setIsRecording(false);
                await uploadAudio(blob);
            } catch (error) {
                console.error('Error stopping recording:', error);
            } finally {
                setRecorder(null);
            }
        } else {
            console.warn('Recorder is not initialized or already stopped.');
        }
    }
        
    async function uploadAudio(blob) {
        const phone = item.patient_phone_number
       
        const formData = new FormData();
        formData.append('audio_file', blob, 'conversation.wav');
        formData.append('phone_number', phone);
        formData.append('document', 'true');
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
                console.log('Audio uploaded successfully.');
            } else {
                console.error('Failed to upload audio:', response.statusText);
            }
        } catch (error) {
            console.error('Error uploading audio:', error);
        }
    }

    return (
        <ChakraProvider>
            <Flex direction="column" align="center" justify="space-between" height="100vh" padding="24px" bgColor="#2c2c2c" color="white">
                <Heading fontSize="25px" marginBottom="20px">
                    Doctor's Appointment
                </Heading>

                {isVideoEnabled ? (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '20px' }}>
                        {localVideoTrack && <div ref={(ref) => ref && localVideoTrack.play(ref)} style={{ width: '320px', height: '240px', backgroundColor: 'black' }} />}
                        {remoteUsers.map((user) => (
                            <div key={user.uid} ref={(ref) => ref && user.videoTrack.play(ref)} style={{ width: '320px', height: '240px', backgroundColor: 'black' }} />
                        ))}
                    </div>
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
