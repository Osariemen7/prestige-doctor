import React, { useEffect, useRef, useState } from 'react';
import { Box, Button, Text } from '@chakra-ui/react';
import { getAccessToken } from './api';

const WebRTCComponent = ({ ephemeralKey, onStop }) => {
  const audioRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const dataChannelRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0); // Timer state
  const timerRef = useRef(null); // Timer reference

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
            startTimer(); // Start the timer
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
      stopTimer(); // Stop the timer
    };
  }, [ephemeralKey]);

  const handleFunctionCall = async (functionCallData) => {
    try {
      // Parse the arguments string into an object
      const parsedArguments = JSON.parse(functionCallData.arguments);
  
      // Prepare the payload for the backend
      const payload = {
        call_id: functionCallData.call_id,
        function_name: functionCallData.name,
        arguments: parsedArguments,
      };
  
      console.log('Parsed Function Call Payload:', payload);
  
      // Send to backend
      await sendToBackend(payload);
    } catch (error) {
      console.error('Error handling function call:', error);
    }
  };
  
  
  useEffect(() => {
    if (dataChannelRef.current) {
      dataChannelRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
      
          if (message.type === 'response.done' && message.response) {
            message.response.output.forEach((item) => {
              if (item.type === 'function_call') {
                handleFunctionCall(item); // Process the function call
              }
            });
          } else {
            console.warn('Unhandled message type:', message.type);
          }
        } catch (error) {
          console.error('Error parsing incoming message:', error);
        }
      };      
    }
  }, [dataChannelRef.current]);
  
  const sendToBackend = async (payload) => {
    const accessToken = await getAccessToken()
    try {
      const response = await fetch('https://health.prestigedelta.com/runfunction/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
  
      if (!response.ok) {
        throw new Error(`Backend error: ${response.status}`);
      }
  
      const backendResponse = await response.json();
      console.log("Backend response received:", backendResponse);
  
      // Handle backend response and send to OpenAI
      handleBackendResponse(backendResponse);
    } catch (error) {
      console.error("Error sending to backend:", error);
    }
  };
  
  const handleBackendResponse = async (backendResponse) => {
    try {
      // Prepare the response payload for OpenAI
      const openAiResponse = {
        type: "function_call_result",
        call_id: backendResponse.call_id, // Received call_id from the backend
        result: backendResponse.result, // Backend's result
      };
  
      // Send to OpenAI
      sendToOpenAI(openAiResponse);
    } catch (error) {
      console.error("Error handling backend response:", error);
    }
  };
  
  const sendToOpenAI = (responsePayload) => {
    if (dataChannelRef.current && dataChannelRef.current.readyState === "open") {
      dataChannelRef.current.send(JSON.stringify(responsePayload));
      console.log("Sent response to OpenAI:", responsePayload);
    } else {
      console.error("Data channel is not open.");
    }
  };
  
  

  // Timer functions
  const startTimer = () => {
    timerRef.current = setInterval(() => {
      setTimeElapsed((prev) => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setTimeElapsed(0);
  };

  // Stop button handler
  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.srcObject = null;
      setIsPlaying(false);
      stopTimer(); // Stop the timer when audio stops
      if (onStop) onStop(); // Notify parent component
    }
  };

  // Format time elapsed
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Box textAlign="center">
      <audio ref={audioRef} autoPlay controls style={{ display: 'none' }} />

      {isPlaying && (
        <>
          {/* Timer */}
          <Text fontSize="lg" fontWeight="bold" mt="8px">
            Time: {formatTime(timeElapsed)}
          </Text>

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

          {/* Stop Button */}
                  </>
      )}
    </Box>
  );
};

export default WebRTCComponent;
