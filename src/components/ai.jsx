import React, { useEffect, useRef, useState } from 'react';
import { Box, Button } from '@chakra-ui/react';

const WebRTCComponent = ({ ephemeralKey, onStop  }) => {
  const audioRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const dataChannelRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const initWebRTC = async () => {
      try {
        const pc = new RTCPeerConnection();
        peerConnectionRef.current = pc;

        // Handle incoming audio track and play it
        pc.ontrack = (e) => {
          if (audioRef.current) {
            audioRef.current.srcObject = e.streams[0];
            setIsPlaying(true);
          }
        };

        // Capture user's microphone input
        const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        pc.addTrack(mediaStream.getTracks()[0]);

        // Create a data channel
        const dc = pc.createDataChannel('oai-events');
        dataChannelRef.current = dc;

        // Create an offer and set the local description
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        // Send the offer to the OpenAI Realtime API
        const baseUrl = 'https://api.openai.com/v1/realtime';
        const model = 'gpt-4o-realtime-preview-2024-12-17';
        const response = await fetch(`${baseUrl}?model=${model}`, {
          method: 'POST',
          body: offer.sdp,
          headers: {
            Authorization: `Bearer ${ephemeralKey}`,
            'Content-Type': 'application/sdp',
          },
        });

        // Set the remote description with the response
        const answer = {
          type: 'answer',
          sdp: await response.text(),
        };
        await pc.setRemoteDescription(answer);

      } catch (error) {
        console.error('Error initializing WebRTC:', error);
      }
    };

    initWebRTC();

    return () => {
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      if (audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    };
  }, [ephemeralKey]);

  // Stop button handler
  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.srcObject = null;
      setIsPlaying(false);
    }
  };

  return (
    <Box textAlign="center">
      <audio ref={audioRef} autoPlay controls style={{ display: 'none' }} />

      {isPlaying && (
        <>
          {/* Wave Animation */}
          <Box
            className="wave-animation"
            width="100%"
            height="80px"
            mt="16px"
            background="linear-gradient(90deg, #48BB78 25%, transparent 25%)"
            backgroundSize="50px 50px"
            animation="wave 1s infinite linear"
          />
          <style>
            {`
              @keyframes wave {
                from {
                  background-position: 0 0;
                }
                to {
                  background-position: 50px 0;
                }
              }
            `}
          </style>

          
        </>
      )}
    </Box>
  );
};

export default WebRTCComponent;
