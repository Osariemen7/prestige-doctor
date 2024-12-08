import React, { useState, useEffect } from 'react';
import { createClient, createMicrophoneAudioTrack, createCameraVideoTrack } from 'agora-rtc-sdk-ng';
import Recorder from 'recorder-js';
import { getAccessToken } from './api';
import { MdCall, MdCallEnd, MdVideocam, MdVideocamOff } from 'react-icons/md';
import { useSearchParams, useLocation } from 'react-router-dom';
import { ChakraProvider, Heading, Text, Spinner, Box, Flex, IconButton, Avatar } from '@chakra-ui/react';

const Voice = () => {
    const { state } = useLocation();
    const item = state?.item || {};
    const [searchParams] = useSearchParams();
    const chanel = searchParams.get("channel");
    

    const [remoteAudioTracks, setRemoteAudioTracks] = useState([]);

    const [localAudioTrack, setLocalAudioTrack] = useState(null);
    const [localVideoTrack, setLocalVideoTrack] = useState(null);
    const [remoteUsers, setRemoteUsers] = useState([]);
    const [isRecording, setIsRecording] = useState(false);
    const [isVideoEnabled, setIsVideoEnabled] = useState(false);
    const [recorder, setRecorder] = useState(null);

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
        });
    
        client.on('user-unpublished', (user) => {
            setRemoteUsers((prev) => prev.filter((u) => u.uid !== user.uid));
            setRemoteAudioTracks((prev) =>
                prev.filter((track) => track.getUserId() !== user.uid)
            );
        });
    }, [client]);
    

    async function joinChannel() {
        const appId = '44787e17cd0348cd8b75366a2b5931e9';
        const token = null;
        const channel = item.channel_name || chanel;
        await client.join(appId, channel, token, null);

        const audioTrack = await createMicrophoneAudioTrack();
        await client.publish(audioTrack);
        setLocalAudioTrack(audioTrack);

        await startRecording(audioTrack);
        console.log('Joined channel with audio.');
    }


    async function enableVideo() {
        if (!isVideoEnabled) {
            const videoTrack = await createCameraVideoTrack();
            await client.publish(videoTrack);
            setLocalVideoTrack(videoTrack);
            setIsVideoEnabled(true);
            console.log('Video enabled.');
        }
    }

    async function disableVideo() {
        if (isVideoEnabled && localVideoTrack) {
            await client.unpublish(localVideoTrack);
            localVideoTrack.close();
            setLocalVideoTrack(null);
            setIsVideoEnabled(false);
            console.log('Video disabled.');
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
      
    async function leaveChannel() {
        try {
            // Stop the recording before leaving the channel
            await stopRecording();
    
            await client.leave();
            
    
            // Clean up local tracks
            if (localAudioTrack) {
                localAudioTrack.close();
                setLocalAudioTrack(null);
            }
            if (localVideoTrack) {
                localVideoTrack.close();
                setLocalVideoTrack(null);
            }

            setRemoteUsers([]);
            setIsVideoEnabled(false);
            setIsRecording(false); // Ensure the spinner stops
            console.log('Left the channel.');
        } catch (error) {
            console.error('Error leaving channel:', error);
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
            <Flex
                direction="column"
                align="center"
                justify="space-between"
                height="100vh"
                padding="24px"
                bgColor="#2c2c2c"
                color="white"
            >
                <Heading fontSize="25px" marginBottom="20px">
                    Doctor's Appointment
                </Heading>

                {/* Circular User Icon */}
                <Avatar size="2xl" name="User" backgroundColor="gray.600" marginBottom="20px" />

                {/* Call Control Buttons */}
                <Flex justify="center" gap="30px" marginTop="auto" marginBottom="20px">
                    <Box textAlign="center">
                        <IconButton
                            icon={<MdCall />}
                            colorScheme="green"
                            fontSize="36px"
                            onClick={joinChannel}
                            borderRadius="full"
                            size="lg"
                        />
                        <Text marginTop="5px">Start Call</Text>
                    </Box>

                    <Box textAlign="center">
                        <IconButton
                            icon={<MdCallEnd />}
                            colorScheme="red"
                            fontSize="36px"
                            onClick={leaveChannel}
                            borderRadius="full"
                            size="lg"
                        />
                        <Text marginTop="5px">End Call</Text>
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
                                onClick={enableVideo}
                                borderRadius="full"
                                size="lg"
                            />
                        )}
                        <Text marginTop="5px">
                            {isVideoEnabled ? 'Disable Video' : 'Enable Video'}
                        </Text>
                    </Box>
                </Flex>

                {/* Spinner for Recording State */}
                {isRecording && (
                    <Box textAlign="center" marginTop="20px">
                        <Spinner color="red.500" size="xl" />
                        <Text fontSize="lg" color="red.500">
                            Recording...
                        </Text>
                    </Box>
                )}
            </Flex>
        </ChakraProvider>
    );
};

export default Voice;
