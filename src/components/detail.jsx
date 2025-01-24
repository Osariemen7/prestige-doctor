import React, { useEffect, useState } from "react";
import {ChakraProvider, Box, Button, Divider, Flex, Heading, Text, Spinner } from "@chakra-ui/react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { AiOutlineArrowLeft } from 'react-icons/ai' ;
import { getAccessToken } from './api';

import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  useToast,
  useDisclosure,
} from '@chakra-ui/react';
import axios from "axios";
import { Select } from "@chakra-ui/react";

const Details = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();
    const [startTime, setStartTime] = useState('');
    const [date, setDate] = useState('');
    const [phoneNumber, setPhone] = useState('');
    const [reason, setReason] = useState('');
    const [info, setInfo] = useState([])
    const [loading, setLoading] = useState(true);
    const [buttonVisible, setButtonVisible] = useState(false);
    const [message, setmessage] = useState('');
    const [isInstance, setInstance] = useState(false)
    const toast = useToast();
  const { id } = useParams();
  const navigate = useNavigate()
  const { state } = useLocation(); // Retrieve passed data using useLocation
  const item = state?.item || {};

  const formatDateTime = (isoString) => {
    return isoString.replace('T', ' ').slice(0, 16); // Ensures 'YYYY-MM-DD HH:MM' format
  };
  const handleSubmit = async () => {
    setButtonVisible(true);

    const phone_number = phoneNumber ? `+234${phoneNumber.slice(1)}` : '';
    const formattedStartTime = formatDateTime(startTime);
    
    // Base data object
    let data = {
        patient_id: item.id,
        start_time: formattedStartTime,
        reason,
        is_instant: isInstance
    };

    // Condition to modify the data object
    if (phone_number === '') {
        delete data.phone_number; // Remove phone_number if it's empty
    } else {
        delete data.patient_id; // Remove patient_id if phone_number is provided
    }

    const token = await getAccessToken();

    try {
        const response = await fetch('https://health.prestigedelta.com/appointments/book/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(data),
        });

        if (response.ok) {
            toast({
                title: 'Appointment booked successfully!',
                description: `Your appointment is scheduled for ${startTime}.`,
                status: 'success',
                duration: 5000,
                isClosable: true,
            });
            onClose(); // Close the modal
        } else {
          const errorResult = await response.json()
          setmessage(errorResult.message)
            throw new Error('Failed to book the appointment.');
        }
    } catch (error) {
        toast({
            title: 'Error',
            description: error.message,
            status: 'error',
            duration: 5000,
            isClosable: true,
        });
    } finally {
        setButtonVisible(false); // Reset loading state
    }
};


useEffect(() => {
  if (date) {
  const fetchDa = async () => {
    try {
      const accessToken = await getAccessToken();
      const response = await axios.get(
        `https://health.prestigedelta.com/appointments/available_slots/?date=${date}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      setInfo(response.data); // Assuming response.data is the array of slots
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    
    }
  };

  fetchDa();}
}, [date]);

const options = info.map((slot) => (
  <option key={slot.start_time} value={slot.start_time}>
    {slot.start_time}
  </option>
));
  
const opt =['Yes', 'No']
  const healthSummary = JSON.parse(item.health_summary || "{}");

  const deleteDet = async () => {
    try {
      const token = await getAccessToken(); // Get the token
      if (!token) {
        alert('Failed to get access token.');
        return;
      }
  
      const response = await fetch(`https://health.prestigedelta.com/medicalreview/${item.id}/`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
  
      if (response.ok) {
        alert('Review deleted successfully');
      } else {
        const errorData = await response.json();
        alert(`Failed to delete review: ${errorData.message || response.statusText}`);
      }
    } catch (error) {
      console.error('Error deleting review:', error);
      alert('An error occurred while deleting the review. Please try again.');
    }
  };
   
  
  return (
    <ChakraProvider>
    <Box p={6} bg="blue.50" minH="100vh" overflowY="auto">
    <div className="back-icon" onClick={() => navigate('/dashboard')}>
        <AiOutlineArrowLeft size={24} />
        <span className="back-text"></span>
      </div>
      
      <Heading size="lg" mb={4} color="blue.700">
        Patient Details
      </Heading>
      {/* <Button colorScheme="red" onClick={deleteDet}>
          Delete
        </Button> */}
      
            <Button colorScheme="blue" onClick={onOpen} mb='10px'>
                Schedule Call Appointment
            </Button>
            
      <Flex
        direction="column"
        bg="white"
        p={6}
        borderRadius="md"
        shadow="md"
        overflowY="auto"
        maxH="calc(100vh - 100px)"
      >
        <Text fontWeight="bold" mb={2}>
          Patient ID: {item.id}
        </Text>
        <Text>
          <strong>Full Name:</strong> {item.full_name || "N/A"}
        </Text>
        <Text fontWeight="bold" mb={2}>
          Phone Number: {item.phone_number}
        </Text>
        <Text fontWeight="bold" mb={4}>
          Status: {item.status}
        </Text>
        <Text>
          <strong>Health Score:</strong> {item.health_score || "N/A"}
        </Text>
        {item.most_recent_review ? (
  <Text>
    <strong>Most Recent Review:</strong>{" "}
    {new Date(item.most_recent_review).toLocaleString()}
  </Text>
) : null}

        {healthSummary?.health_summary && (
          <Text>
            <strong>Overall Health Status:</strong> {healthSummary.health_summary.overall_health_status}
          </Text>
        )}
        <Divider />

<Heading size="md" mt={4}>Last Reviews</Heading>
{item.last_reviews && item.last_reviews.length > 0 ? (
  item.last_reviews.map((review) => (
    <Box key={review.id} p={4} borderWidth="1px" borderRadius="lg" mb={4}>
      {Object.entries(review).map(([key, value]) => (
        <Box key={key} mb={2}>
          <Text>
            <strong>{key.replace(/_/g, ' ').toUpperCase()}:</strong>{' '}
            {Array.isArray(value) ? (
              value.length > 0 ? JSON.stringify(value) : 'N/A'
            ) : typeof value === 'object' && value !== null ? (
              JSON.stringify(value, null, 2)
            ) : (
              value || 'N/A'
            )}
          </Text>
        </Box>
      ))}
      <Divider mt={4} />
    
    </Box>
  ))
) : (
  <Text>No reviews found.</Text>
)}
    </Flex>
    </Box>
    <Modal isOpen={isOpen} onClose={onClose}>
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>Book Call Appointment</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>
                    <FormLabel>Do you want to start an Instant call?</FormLabel>
                        <Select
                placeholder="Select Yes or No"
              
                onChange={(e) => setInstance(e.target.value === 'Yes')}
              > {opt.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
              </Select>
                    <FormControl mb={4}>
                    <FormLabel>Set Date</FormLabel>
                            <Input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                placeholder="Select start time"
                            />
                        <FormLabel>Select available Slot</FormLabel>
                        <Select
                placeholder="Select start time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              >
                {options}
              </Select>
                            
                        </FormControl>
                        <FormControl>
                            <FormLabel>Reason for Appointment</FormLabel>
                            <Textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="Enter the reason for your appointment"
                            />
                        </FormControl>
                     <Text color='red'>{message}</Text>
                    </ModalBody>

                    <ModalFooter>
                        <Button
                            colorScheme="blue"
                            mr={3}
                            onClick={handleSubmit}
                            isDisabled={loading} // Disable button while loading
                        >
                            {buttonVisible ? <Spinner size="sm" /> : 'Submit'}
                        </Button>
                        <Button variant="ghost" onClick={onClose}>
                            Cancel
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            
  
    </ChakraProvider>
  );
};

export default Details;
