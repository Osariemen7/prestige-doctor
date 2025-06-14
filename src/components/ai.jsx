import React, { useEffect, useRef, useState } from 'react';
import { Box, Button, Text } from '@chakra-ui/react';
import { getAccessToken } from './api';
import ConversationWithImage from './img';

const WebRTCComponent = ({ ephemeralKey, onStop }) => {
  const audioRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const dataChannelRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0); // Timer state
  const timerRef = useRef(null); // Timer reference
  const [recentTranscript, setRecentTranscript] = useState("");

  const baseUrl = 'https://api.openai.com/v1/realtime';
  const model = 'gpt-4o-realtime-preview-2024-12-17';
  useEffect(() => {
    const initWebRTC = async () => {
      try {
        const pc = new RTCPeerConnection();
        peerConnectionRef.current = pc;
  
        // Setup tracks
        pc.ontrack = (e) => {
          if (audioRef.current) {
            audioRef.current.srcObject = e.streams[0];
            setIsPlaying(true);
            startTimer();
          }
        };
  
        const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStream.getTracks().forEach((track) => pc.addTrack(track));
  
        // Setup DataChannel
        const dc = pc.createDataChannel('oai-events');
        dataChannelRef.current = dc;
  
        dc.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            handleIncomingMessage(message);
          } catch (error) {
            console.error('Error parsing message:', error);
          }
        };
  
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
  
        const response = await fetch(`${baseUrl}?model=${model}`, {
          method: 'POST',
          body: offer.sdp,
          headers: {
            Authorization: `Bearer ${ephemeralKey}`,
            'Content-Type': 'application/sdp',
          },
        });
  
        const answer = { type: 'answer', sdp: await response.text() };
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
      }
      stopTimer();
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
  
  
  
  const handleIncomingMessage = (message) => {
    if (message.type === "response.done" && message.response) {
      const outputArray = message.response.output;
      
      // Iterate over the output array to process items
      outputArray.forEach((item) => {
        if (item.type === "message" && item.content) {
          // Extract the transcript from the content array
          const transcript = item.content
            .map((contentItem) => contentItem.transcript || "")
            .join(" ");
  
          // Update the recent transcript state
          setRecentTranscript(transcript);
        }
      });
    } else if (message.type === "response.done" && message.response) {
      message.response.output.forEach((item) => {
        if (item.type === "function_call") {
          handleFunctionCall(item);
        }
      });
    } else {
      console.warn("Unhandled DataChannel message type:", message.type);
    }
  };
   
  const sendToBackend = async (payload) => {
    const accessToken = await getAccessToken()
    try {
      const response = await fetch('https://service.prestigedelta.com/runfunction/', {
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
      // Extract the call_id and result from the backend response
      const callId = backendResponse.call_id;
      const result = backendResponse.result;
  
      // Send the function call output to OpenAI
      sendFunctionCallOutput(callId, result);
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
  const sendResponseCreate = () => {
    if (dataChannelRef.current && dataChannelRef.current.readyState === "open") {
      const responseCreateEvent = {
        type: "response.create",
      };
  
      // Send the event to OpenAI
      dataChannelRef.current.send(JSON.stringify(responseCreateEvent));
      console.log("Sent response.create event to OpenAI");
    } else {
      console.error("Data channel is not open.");
    }
  };
  
  const sendFunctionCallOutput = (callId, output) => {
    if (dataChannelRef.current && dataChannelRef.current.readyState === "open") {
      const conversationItem = {
        type: "conversation.item.create",
        item: {
          type: "function_call_output",
          call_id: callId, // The call_id from the function_call event
          output: JSON.stringify(output), // Convert the result to a JSON string
        },
      };
  
      // Send the event to OpenAI
      dataChannelRef.current.send(JSON.stringify(conversationItem));
      console.log("Sent function_call_output to OpenAI:", conversationItem);
  
      // Trigger the response.create event
      sendResponseCreate();
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
    <audio ref={audioRef} autoPlay controls style={{ display: "none" }} />
    {isPlaying && (
      <>
        <Text fontSize="lg" fontWeight="bold" mt="8px">
          Time: {formatTime(timeElapsed)}
        </Text>
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
    <ConversationWithImage
      dataChannelRef={dataChannelRef}
      recentTranscript={recentTranscript}
    />
  </Box>
  );
};

export default WebRTCComponent;
