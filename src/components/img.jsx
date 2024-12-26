import React, { useState, useEffect, useRef } from "react";
import { Box, IconButton, Input, Text } from "@chakra-ui/react";
import { FaCamera } from "react-icons/fa";
import { getAccessToken } from "./api";

const ConversationWithImage = ({ dataChannelRef, recentTranscript }) => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [backendResponse, setBackendResponse] = useState("");
  const inputRef = useRef(null);
  const [fullConversation, setFullConversation] = useState("");

  // Update fullConversation whenever recentTranscript changes
  useEffect(() => {
    if (recentTranscript) {
      setFullConversation((prev) => `${prev} ${recentTranscript}`.trim());
    }
  }, [recentTranscript]);

  
  
  const handleImageChange = async (event) => {
    if (event.target.files && event.target.files[0]) {
      const imageFile = event.target.files[0];
      setSelectedImage(imageFile);

      if (fullConversation) {
        await sendImageAndTranscript(imageFile, fullConversation);
      } else {
        console.error("No transcript available to send as caption.");
      }
    }
  };

  const sendImageAndTranscript = async (image, transcript) => {
    try {
      setIsUploading(true);
      const accessToken = await getAccessToken();
      const formData = new FormData();
      formData.append("image", image);
      formData.append("caption", transcript);

      const response = await fetch(
        "https://health.prestigedelta.com/imagecompletion/",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to send image and transcript: ${response.statusText}`);
      }

      const responseData = await response.json();
      
      if (dataChannelRef?.current?.readyState === "open") {
        const openAIResponse = {
          type: "conversation.item.create",
          item: {
            type: "message",
            content:responseData.completion,
          },
        };
        dataChannelRef.current.send(openAIResponse);
        sendResponseCreate(); 
        console.log(openAIResponse)
    } else {
        console.error("Data channel is not open.");
      }
    } catch (error) {
      console.error("Error sending image and transcript:", error);
    } finally {
      setIsUploading(false);
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
  
  return (
    <Box>
    <Input
      type="file"
      accept="image/*"
      onChange={handleImageChange}
      ref={inputRef}
      style={{ display: "none" }}
    />
    <IconButton
      aria-label="Upload Image"
      icon={<FaCamera />}
      onClick={() => inputRef.current.click()}
      colorScheme="blue"
      isLoading={isUploading}
      mt="4"
    />
    <Text>Upload Picture</Text>
    {selectedImage && (
      <Box mt="4" display="flex" justifyContent="center">
        <img
          src={URL.createObjectURL(selectedImage)}
          alt="Selected"
          style={{ maxWidth: "80%", maxHeight: "150px" }}
        />
      </Box>
    )}
   
  </Box>
  );
};

export default ConversationWithImage;
