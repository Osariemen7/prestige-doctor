import React, { useEffect, useRef, useState } from "react";
import {
  ChakraProvider,
  Box,
  Flex,
  Heading,
  Text,
  Spinner,
  Divider,
  VStack,
  IconButton,
  Button
} from "@chakra-ui/react";
import { FiCopy } from 'react-icons/fi'
import axios from "axios";
import { getAccessToken } from "./api";
import {useNavigate} from 'react-router-dom';
import Sidebar from './sidebar'; // Import Sidebar component
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
  Textarea,
  useToast,
  useDisclosure,
} from '@chakra-ui/react';
import { Input, Select } from "@chakra-ui/react";

const Va = () => {
  const [data, setData] = useState(null);
  const [info, setInfo] = useState([]);
  const { isOpen, onOpen, onClose } = useDisclosure();
    const [date, setDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [phoneNumber, setPhone] = useState('');
    const [reason, setReason] = useState('');
    const [buttonVisible, setButtonVisible] = useState(false);
    const [startTime, setStartTime] = useState('');
    const toast = useToast();
    const [message, setmessage] = useState('')
    const [isInstance, setInstance] = useState(false)
    const [link, setLink] = useState('')  
  
  const navigate = useNavigate()
  const opt =['Yes', 'No']

  const handleSubmit = async () => {
    setButtonVisible(true);

    const phone_number = phoneNumber ? `+234${phoneNumber.slice(1)}` : '';
    const formattedStartTime = formatDateTime(startTime);

    // Base data object
    let data = {
      
        start_time: formattedStartTime,
        reason,
        phone_number,
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
            const result = await response.json()
            setLink(result)
            onClose(); // Close the modal
        } else if (response.ok && isInstance === true){
          const result = await response.json()
             setLink(result)
        }
        else {
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

 const formatDateTime = (isoString) => {
    return isoString.replace('T', ' ').slice(0, 16); // Ensures 'YYYY-MM-DD HH:MM' format
  };
 
    const CopyButton = ({ textToCopy }) => {
      const textRef = useRef(null);
    
      const copyToClipboard = async () => {
        try {
          await navigator.clipboard.writeText(textToCopy);
          alert('Copied to clipboard!');
        } catch (err) {
          console.error('Unable to copy to clipboard.', err);
        }
      };
      return (
          <div>
          <IconButton
          aria-label="Copy"
          icon={<FiCopy />}
          size="sm"
          colorScheme="blue"
          onClick={copyToClipboard}
        />
            
          </div>
        );
      };
console.log(link)
      
  // Fetch doctor subscribers data
  useEffect(() => {
    const fetchSubscribers = async () => {
      try {
        const accessToken = await getAccessToken();
        const response = await axios.get(
          "https://health.prestigedelta.com/doctorsubscribers/",
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );
        setData(response.data[0]);
      } catch (error) {
        console.error("Error fetching doctor subscribers data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscribers();
  }, []);

  // Fetch appointment slots data
  useEffect(() => {
    const fetchSlots = async () => {
      try {
        const accessToken = await getAccessToken();
        const response = await axios.get(
          "https://health.prestigedelta.com/appointments/available_slots/",
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );
        setInfo(response.data);
      } catch (error) {
        console.error("Error fetching appointment slots data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSlots();
  }, []);
  const handleCalls = (item) => {
    navigate('/call', { state: { item } }); // Navigate using the ID
  };

  const handleInstCalls = () => {
    const item = link.appointment
    navigate('/call', { state: { item } }); // Navigate using the ID
  };
  const cLink = link?.appointment?.channel_name
  ? `https://prestige-doctor.vercel.app/appointment?channel=${link.appointment.channel_name}`
  : '';

  if (loading) {
    return (
      <Flex justify="center" align="center" height="100vh">
        <Spinner size="xl" />
      </Flex>
    );
  }

  const bookedItems = info.filter((item) => item.status === "BOOKED");

 
  const handleLogout = () => {
    localStorage.removeItem('user-info');
    navigate('/');
  };
  
  return (
    <ChakraProvider>
    <div className="dashboard-container">
    <div className="main-content">
      <Box p={5} >
      <Sidebar navigate={navigate} handleLogout={handleLogout} />

        <Heading textAlign='center' fontSize="24px" mb={4}>
          Virtual Appointment
        </Heading>

        <Button colorScheme="blue" onClick={onOpen} mb='10px'>
                Schedule Call with New patient
            </Button>
        <Heading fontSize="20px" mb={4}>
          Call Schedules
        </Heading>

        <VStack spacing={4} align="stretch">
          {bookedItems.length > 0 ? (
            bookedItems.map((item, index) => {
              const dynamicLink = `https://prestige-doctor.vercel.app/appointment?channel=${item.appointment.channel_name}`;
              return (
                <Box
                  key={index}
                  p={4}
                  bg="white"
                  shadow="md"
                  borderRadius="md"
                  onClick={() => handleCalls(item)}
                >
                  <Text fontSize="md" fontWeight="bold" color="blue.500">
                    Patient ID: {item.patient_id}
                  </Text>
                  <Text fontSize="sm">Time: {new Date(item.start_time).toLocaleString()}</Text>
                 <Flex gap='15px'>
                  <Text>Patient link: {dynamicLink}</Text>
                  <CopyButton textToCopy={dynamicLink} />
                  </Flex>
                  <Button colorScheme='blue'>Start call</Button>
                </Box>
              );
            })
          ) : (
            
            <div>
            <Text color="gray.500">No booked appointments available.</Text>
         
  {cLink ? (
    <> <Flex gap="15px">
      <Text>Patient link: {cLink}</Text>
      <CopyButton textToCopy={cLink} /></Flex> 
      <Button colorScheme='blue' onClick={handleInstCalls}>Start call</Button>
    </>
  ) : (
    <Text color="gray.500"></Text>
  )}
     </div>
          )}
        </VStack>
      </Box>
      </div>
      </div>

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
                              <FormLabel>Phone Number</FormLabel>
                                  <Input
                                      type="number"
                                      value={phoneNumber}
                                      onChange={(e) => setPhone(e.target.value)}
                                      placeholder="Input Phone Number"
                                  />
      
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

export default Va;
