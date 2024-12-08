import React, { useState, useEffect } from 'react';
import { createClient, createMicrophoneAudioTrack, createCameraVideoTrack } from 'agora-rtc-sdk-ng';
import Recorder from 'recorder-js';
import { getAccessToken } from './api';
import { MdCall, MdCallEnd, MdVideocam, MdVideocamOff } from 'react-icons/md';
import { ChakraProvider, Heading, Text, Spinner } from '@chakra-ui/react';
import { useSearchParams, useLocation } from 'react-router-dom';

const Voice = () => {
    const { state } = useLocation();
    const item = state?.item || {};
    const [searchParams] = useSearchParams();
    const chanel = searchParams.get("channel");

    const [localAudioTrack, setLocalAudioTrack] = useState(null);
    const [localVideoTrack, setLocalVideoTrack] = useState(null);
    const [remoteUsers, setRemoteUsers] = useState([]);
    const [isRecording, setIsRecording] = useState(false);
    const [isVideoEnabled, setIsVideoEnabled] = useState(false);

    const client = createClient({ mode: 'rtc', codec: 'vp8' });
    let recorder = null;

    useEffect(() => {
        client.on('user-published', async (user, mediaType) => {
            await client.subscribe(user, mediaType);
            if (mediaType === 'video') {
                setRemoteUsers((prev) => [...prev, user]);
            } else if (mediaType === 'audio') {
                user.audioTrack.play();
            }
        });

        client.on('user-unpublished', (user) => {
            setRemoteUsers((prev) => prev.filter((u) => u.uid !== user.uid));
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

    async function startRecording(audioTrack) {
        try {
            const stream = new MediaStream([audioTrack.getMediaStreamTrack()]);
            recorder = new Recorder(new (window.AudioContext || window.webkitAudioContext)());
            await recorder.init(stream);
            await recorder.start();
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
                setIsRecording(false); // Stop the spinner immediately
                console.log('Recording stopped.');
                await uploadAudio(blob); // Ensure the upload happens here
            } catch (error) {
                console.error('Error stopping recording:', error);
                setIsRecording(false);
            } finally {
                recorder = null; // Reset the recorder instance
            }
        }
    }
        
    async function uploadAudio(blob) {
        const formData = new FormData();
        formData.append('audio_file', blob, 'conversation.wav');

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
            <Heading fontSize="25px" p="24px">Doctor's Appointment</Heading>
            <div style={{ display: 'flex', gap: '35px', padding: '12px', justifyContent: 'center' }}>
                <div>
                    <MdCall
                        style={{ color: 'green', fontSize: '48px', cursor: 'pointer' }}
                        onClick={joinChannel}
                    />
                    <Text>Start Call</Text>
                </div>
                <div>
                    <MdCallEnd
                        style={{ color: 'red', fontSize: '48px', cursor: 'pointer' }}
                        onClick={leaveChannel}
                    />
                    <Text>End Call</Text>
                </div>
                <div>
                    {isVideoEnabled ? (
                        <MdVideocamOff
                            style={{ color: 'red', fontSize: '48px', cursor: 'pointer' }}
                            onClick={disableVideo}
                        />
                    ) : (
                        <MdVideocam
                            style={{ color: 'green', fontSize: '48px', cursor: 'pointer' }}
                            onClick={enableVideo}
                        />
                    )}
                    <Text>{isVideoEnabled ? 'Disable Video' : 'Enable Video'}</Text>
                </div>
            </div>
            
            {isRecording && (
                <div style={{ textAlign: 'center', marginTop: '20px' }}>
                    <Spinner color="red.500" size="xl" />
                    <Text fontSize="lg" color="red.500">Recording...</Text>
                </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '20px' }}>
                {localVideoTrack && (
                    <div ref={(ref) => ref && localVideoTrack.play(ref)} style={{ width: '320px', height: '240px', backgroundColor: 'black' }} />
                )}
                {remoteUsers.map((user) => (
                    <div key={user.uid} ref={(ref) => ref && user.videoTrack.play(ref)} style={{ width: '320px', height: '240px', backgroundColor: 'black' }} />
                ))}
            </div>
        </ChakraProvider>
    );
};

export default Voice;
