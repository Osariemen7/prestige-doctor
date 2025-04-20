import React, { useState } from 'react';
import { Box } from '@chakra-ui/react';

const VideoDisplay = ({ localVideoTrack, remoteUsers }) => {
    const [isLocalPrimary, setIsLocalPrimary] = useState(false);

    // Handler to toggle video positions
    const toggleVideoPosition = () => {
        setIsLocalPrimary((prev) => !prev);
    };

    return (
        <Box position="relative" width="100%" height="100%" bg="black">
            {/* Main Video */}
            <Box width="100%" height="100%" onClick={toggleVideoPosition} cursor="pointer">
                {isLocalPrimary && localVideoTrack ? (
                    <div ref={(ref) => ref && localVideoTrack.play(ref)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : remoteUsers.length > 0 && remoteUsers[0].videoTrack ? (
                    <div ref={(ref) => ref && remoteUsers[0].videoTrack.play(ref)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                    <Box bg="gray.700" width="100%" height="100%" />
                )}
            </Box>

            {/* Inset (Smaller) Video */}
            <Box
                position="absolute"
                top="20px"
                right="20px"
                width="230px"
                height="180px"
                bg="black"
                border="2px solid white"
                borderRadius="10px"
                onClick={toggleVideoPosition}
                cursor="pointer"
                boxShadow="lg"
                overflow="hidden"
            >
                {!isLocalPrimary && localVideoTrack ? (
                    <div ref={(ref) => ref && localVideoTrack.play(ref)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : remoteUsers.length > 0 && remoteUsers[0].videoTrack ? (
                    <div ref={(ref) => ref && remoteUsers[0].videoTrack.play(ref)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                    <Box bg="gray.700" width="100%" height="100%" />
                )}
            </Box>
        </Box>
    );
};

export default VideoDisplay;
