import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getAccessToken } from './api';
import axios from 'axios';
import PatientProfile from './write';
import {
    Box,
    Container,
    VStack,
    Heading,
    Spinner,
    useToast,
    Center,
    ChakraProvider,
    Flex,
    IconButton,
    Button
} from '@chakra-ui/react';
import { ArrowBackIcon } from '@chakra-ui/icons';

const PatientUpdate = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const patientId = location.state?.review_id;
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');
    const [reviewId, setReviewId] = useState('');
    const [threadId, setThreadId] = useState('');
    const [isDocumentationSaved, setIsDocumentationSaved] = useState(false);
    const [showDocumentation, setShowDocumentation] = useState(false);
    const patientProfileRef = useRef(null);
    const toast = useToast();
    const [resetKey, setResetKey] = useState('initial');

    const bookAppointment = async () => {
        try {
            const accessToken = await getAccessToken();
            const data = {
                start_time: new Date().toISOString(),
                reason: 'Document Review',
                patient_id: patientId,
                is_instant: true,
            };

            const response = await axios.post(
                'https://service.prestigedelta.com/appointments/book/',
                data,
                {
                    headers: { Authorization: `Bearer ${accessToken}` },
                }
            );

            if (response.data && response.data.appointment) {
                setReviewId(response.data.appointment.review_id);
                setThreadId(response.data.appointment.thread_id);
                toast({
                    title: 'Success',
                    description: 'Appointment booked successfully',
                    status: 'success',
                    duration: 3000,
                    isClosable: true,
                });
                return response.data.appointment;
            }
        } catch (error) {
            console.error("Error booking appointment:", error);
            toast({
                title: 'Error',
                description: 'Failed to book appointment',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
            return null;
        }
    };

    const fetchDocumentReview = async (reviewId) => {
        try {
            const accessToken = await getAccessToken();
            const response = await axios.get(
                `https://service.prestigedelta.com/documentreview/${reviewId}/aggregate-data/`,
                {
                    headers: { Authorization: `Bearer ${accessToken}` },
                }
            );
            
            if (response.data) {
                setShowDocumentation(true);
                return true;
            }
            return false;
        } catch (error) {
            console.error("Error fetching document review:", error);
            toast({
                title: 'Error',
                description: 'Failed to fetch document data',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
            return false;
        }
    };

    useEffect(() => {
        const initializeDocumentation = async () => {
            if (!patientId) {
                toast({
                    title: 'Error',
                    description: 'No patient ID provided',
                    status: 'error',
                    duration: 5000,
                    isClosable: true,
                });
                setLoading(false);
                return;
            }

            const appointment = await bookAppointment();
            if (appointment && appointment.review_id) {
                const success = await fetchDocumentReview(appointment.review_id);
                if (success) {
                    toast({
                        title: 'Ready',
                        description: 'Documentation ready for review',
                        status: 'success',
                        duration: 3000,
                        isClosable: true,
                    });
                }
            }
            setLoading(false);
        };

        initializeDocumentation();
    }, [patientId]);

    const handleBack = () => {
        navigate('/dashboard');
   
    };

    if (loading) {
        return (
            <Center h="100vh">
                <Spinner size="xl" thickness="4px" speed="0.65s" color="blue.500" />
            </Center>
        );
    }

    if (!patientId) {
        return (
            <Center h="100vh">
                <Heading size="md" color="red.500">Error: No patient ID provided</Heading>
            </Center>
        );
    }

    return (
        <ChakraProvider>
            <Box minH="100vh" bg="gray.50">
                {/* Header */}
                <Box position="sticky" top={0} bg="white" boxShadow="sm" zIndex={10}>
                    <Container maxW="100%" p={4}>
                        <Flex justifyContent="space-between" alignItems="center">
                            <Flex alignItems="center" gap={4}>
                                <IconButton
                                    icon={<ArrowBackIcon />}
                                    onClick={handleBack}
                                    variant="ghost"
                                    aria-label="Back to details"
                                />
                                <Heading size="lg">Patient Documentation</Heading>
                            </Flex>
                        </Flex>
                    </Container>
                </Box>

                {/* Main Content */}
                <Container maxW="100%" p={4} overflow="hidden" display="flex" flexDirection="column" height="calc(100vh - 80px)">
                    {showDocumentation && reviewId && (
                        <Box 
                            flex="1" 
                            bg="white" 
                            boxShadow="md" 
                            borderRadius="lg" 
                            overflow="auto"
                            position="relative"
                        >
                            <PatientProfile
                                key={resetKey}
                                reviewid={reviewId}
                                thread={threadId}
                                setIsDocumentationSaved={setIsDocumentationSaved}
                                ref={patientProfileRef}
                                resetKey={resetKey}
                            />
                        </Box>
                    )}
                </Container>
            </Box>
        </ChakraProvider>
    );
};

export default PatientUpdate;