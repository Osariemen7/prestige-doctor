import React, { useState, useEffect } from 'react';
import { ChakraProvider, Box, Grid, VStack, Text, Button, Input, Spinner } from "@chakra-ui/react";
import './DashboardPage.css';
import Sidebar from './sidebar'; // Import Sidebar component
import { useNavigate } from 'react-router-dom';
import {
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Heading
} from '@chakra-ui/react';
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
  Textarea,
  useToast,
  useDisclosure,
} from '@chakra-ui/react';
import axios from "axios";
import { Select } from "@chakra-ui/react";


const DashboardPage = () => {
  const navigate = useNavigate();
  const [data, setDataList] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const [startTime, setStartTime] = useState('');
  const [selectedTab, setSelectedTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [date, setDate] = useState('');
    const [phoneNumber, setPhone] = useState('');
    const [reason, setReason] = useState('');
    const [info, setInfo] = useState([])
    const [buttonVisible, setButtonVisible] = useState(false);

  const filteredPatients = data.filter((patient) =>
    patient.phone_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  

  useEffect(() => {
    const fetchData = async () => {
      const accessToken = await getAccessToken();
      if (!accessToken) return;

      try {
        const response = await fetch('https://health.prestigedelta.com/patientlist/', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            accept: 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
        });
        if (response.status === 401) {
          navigate('/');
        } else {
          const result = await response.json();
          setDataList(result);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const fetchSub = async () => {
      const accessToken = await getAccessToken();
      if (!accessToken) return;

      try {
        const response = await fetch('https://health.prestigedelta.com/patientlist/', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            accept: 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
        });
        if (response.status === 401) {
          navigate('/');
        } else {
          const result = await response.json();
          setDataList(result);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSub();
  }, []);


  const handleViewDetails = (item) => {
    navigate('/detail', { state: { item } }); // Navigate using the ID
  };

  const handleLogout = () => {
    localStorage.removeItem('user-info');
    navigate('/');
  };

  const formatDateTime = (isoString) => {
    return isoString.replace('T', ' ').slice(0, 16); // Ensures 'YYYY-MM-DD HH:MM' format
  };
  const handleSubmit = async () => {
    setButtonVisible(true);

    const phone_number = phoneNumber ? `+234${phoneNumber.slice(1)}` : '';
    const formattedStartTime = formatDateTime(startTime);

    // Base data object
    let data = {
      
        start_time: formattedStartTime,
        reason,
        phone_number
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

  const PatientCard = ({ patient }) => (
    <Box borderWidth="1px" borderRadius="lg" p={4} shadow="md" backgroundColor='#f0f8ff'>
      <VStack align="start" spacing={7}>
        <Text>
          <strong>Patient ID:</strong> {patient.id}
        </Text>
        <Text>
          <strong>Phone:</strong> {patient.phone_number}
        </Text>
        <Text>
          <strong>Most Recent Review:</strong>{" "}
          {new Date(patient.most_recent_review).toLocaleString()}
        </Text>
        <Button colorScheme="blue" onClick={() => handleViewDetails(patient)}>
          View Details
        </Button>
      </VStack>
    </Box>
  );
  
  return (
    <div className="dashboard-container">
      {/* Persistent Sidebar */}
      <Sidebar navigate={navigate} handleLogout={handleLogout} />

      {/* Main Content */}
      <div className="main-content">
      <ChakraProvider>
      <Box flex="1" overflow="auto">
  
    {/* Tab Content Below */}
        <Heading fontSize='22px' textAlign='center'>Patient Health Dashboard</Heading>
        {loading ? (
          <Box textAlign="center" mt={8}>
            <Spinner size="xl" />
            <Text mt={4}>Loading...</Text>
          </Box>
        ) : (
          <Box p={4}>
            <Text fontSize="20px" fontWeight="bold" mb={4}>
              Patient Records
            </Text>
            <Box mb={6}>
              <Input
                placeholder="Search by phone number"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </Box>
            <Button colorScheme="blue" onClick={onOpen} mb='10px'>
                Schedule Call with New patient
            </Button>
            <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={6}>
              {filteredPatients.length > 0 ? (
                filteredPatients.map((patient) => (
                  <PatientCard key={patient.id} patient={patient} />
                ))
              ) : (
                <Text>No patients found.</Text>
              )}
            </Grid>
          </Box>
        )}
       
      
</Box>

<Modal isOpen={isOpen} onClose={onClose}>
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>Book Call Appointment</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>
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

             </div>
    </div>
  );
};

export default DashboardPage;
