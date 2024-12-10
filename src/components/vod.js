import React, { useState } from 'react';
import { Box, Flex } from '@chakra-ui/react';

const VideoDisplay = ({ localVideoTrack, remoteUsers }) => {
    const [isLocalPrimary, setIsLocalPrimary] = useState(false);

    // Handler to toggle video positions
    const toggleVideoPosition = () => {
        setIsLocalPrimary((prev) => !prev);
    };

    return (
        <Flex direction="column" align="center" gap="20px">
            {/* Primary (Larger) Video */}
            <Box
                width="340px"
                height="270px"
                bg="black"
                onClick={toggleVideoPosition}
                cursor="pointer"
            >
                {isLocalPrimary && localVideoTrack ? (
                    <div ref={(ref) => ref && localVideoTrack.play(ref)} style={{ width: '100%', height: '100%' }} />
                ) : remoteUsers.length > 0 && remoteUsers[0].videoTrack ? (
                    <div ref={(ref) => ref && remoteUsers[0].videoTrack.play(ref)} style={{ width: '100%', height: '100%' }} />
                ) : (
                    <Box bg="gray.700" width="100%" height="100%" />
                )}
            </Box>

            {/* Secondary (Smaller) Video */}
            <Box
                width="190px"
                height="190px"
                bg="black"
                onClick={toggleVideoPosition}
                cursor="pointer"
            >
                {!isLocalPrimary && localVideoTrack ? (
                    <div ref={(ref) => ref && localVideoTrack.play(ref)} style={{ width: '100%', height: '100%' }} />
                ) : remoteUsers.length > 0 && remoteUsers[0].videoTrack ? (
                    <div ref={(ref) => ref && remoteUsers[0].videoTrack.play(ref)} style={{ width: '100%', height: '100%' }} />
                ) : (
                    <Box bg="gray.700" width="100%" height="100%" />
                )}
            </Box>
        </Flex>
    );
};

export default VideoDisplay;
