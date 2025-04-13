import React, { useState, useEffect } from 'react';
import { ChakraProvider, Box, Grid, VStack, Text, Button, Input, Spinner,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Select,
  useDisclosure,
  useToast,
  Flex
} from "@chakra-ui/react";
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
import axios from "axios";
import { Search } from 'lucide-react';


const DashboardPage = () => {
  const navigate = useNavigate();
  const [data, setDataList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startTime, setStartTime] = useState('');
  const [selectedTab, setSelectedTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [date, setDate] = useState('');
  const [isSidebarMinimized, setIsSidebarMinimized] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+234'); // Default to Nigeria
  const [buttonVisible, setButtonVisible] = useState(false);
  const [message, setMessage] = useState('');
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();
    
  const filteredPatients = data.filter((patient) =>
    patient.phone_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  
const handleAddPatient = async () => {
    setButtonVisible(true);
    setMessage('');

    if (!phoneNumber) {
        setMessage('Please enter a phone number');
        setButtonVisible(false);
        return;
    }

    // Format the phone number with country code
    const formattedPhoneNumber = `${countryCode}${phoneNumber.startsWith('0') ? phoneNumber.slice(1) : phoneNumber}`;

    try {
        const token = await getAccessToken();
        const response = await fetch('https://health.prestigedelta.com/appointments/create_patient/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
                phone_number: formattedPhoneNumber
            }),
        });
      
        if (response.ok) {
            const result = await response.json();
            toast({
                title: 'Success',
                description: 'Patient added successfully',
                status: 'success',
                duration: 5000,
                isClosable: true,
            });
            onClose(); // Close the modal
            // Refresh the patient list
            const updatedResponse = await fetch('https://health.prestigedelta.com/patientlist/', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                }
            });
            if (updatedResponse.ok) {
                const updatedData = await updatedResponse.json();
                setDataList(updatedData);
            }
        } else {
            const errorData = await response.json();
            setMessage(errorData.message || 'Failed to add patient');
        }
    } catch (error) {
        setMessage('An error occurred while adding the patient');
        console.error('Error:', error);
    } finally {
        setButtonVisible(false);
    }
};

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

  
  const PatientCard = ({ patient }) => (
    <div className="bg-white rounded-lg p-6 shadow-sm">
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <span className="text-blue-600 text-sm">Patient ID: {patient.id}</span>
        </div>
        <h3 className="font-medium">
          {patient.full_name || "Unnamed Patient"}
        </h3>
        <div className="flex items-center space-x-2 text-gray-600">
          <span className="text-sm">{patient.phone_number}</span>
        </div>
        {patient.health_score && (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Health Score</span>
              <span className="text-sm font-medium">{patient.health_score}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full" 
                style={{ width: `${patient.health_score}%` }}
              />
            </div>
          </div>
        )}
        <Button
          onClick={() => handleViewDetails(patient)}
          colorScheme="blue"
          size="sm"
          variant="outline" >View Details</Button>
      </div>
    </div>
  );

  
  return (
    <div className="dashboard-container">
      {/* Persistent Sidebar */}
      <Sidebar 
      onToggleSidebar={(minimized) => setIsSidebarMinimized(minimized)} 
      onNavigate={(path) => navigate(path)} 
      onLogout={handleLogout}
    />
      {/* Main Content */}
      <div className={`${isSidebarMinimized ? 'ml-14 md:ml-76' : 'ml-0 md:ml-64'} flex-1 transition-all duration-300`}>
      <div className="min-h-screen bg-gray-50 p-6">
      <ChakraProvider>
      <Box flex="1" overflow="auto" p={4}>
  
    {/* Tab Content Below */}
    <Flex justifyContent="space-between" alignItems="center" mb={4}>
      <Heading fontSize='22px'>Patient Records</Heading>
      <Button colorScheme="blue" onClick={onOpen}>Add New Patient</Button>
    </Flex>

    {/* Add New Patient Modal */}
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Add New Patient</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <FormControl>
            <FormLabel>Country Code</FormLabel>
            <Select value={countryCode} onChange={(e) => setCountryCode(e.target.value)}>
              <option value="+234">Nigeria (+234)</option>
              <option value="+44">UK (+44)</option>
              <option value="+1">USA/Canada (+1)</option>
            </Select>
          </FormControl>
          <FormControl mt={4}>
            <FormLabel>Phone Number</FormLabel>
            <Input 
              type="tel"
              placeholder="Enter phone number"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
          </FormControl>
          {message && (
            <Text color="red.500" mt={2}>{message}</Text>
          )}
        </ModalBody>
        <ModalFooter>
          <Button colorScheme="blue" mr={3} onClick={handleAddPatient} isLoading={buttonVisible}>
            Add Patient
          </Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>

        {loading ? (
          <Box textAlign="center" mt={8}>
            <Spinner size="xl" />
            <Text mt={4}>Loading...</Text>
          </Box>
        ) : (
          <Box p={4}>
            <Text fontSize="20px" fontWeight="bold" mb={4}>
              Patient List
            </Text>
            <div className="relative">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <Box mb={6}>
              <Input pl='34px'
                placeholder="    Search by phone number"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </Box>
            </div>
            
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


      </ChakraProvider>

             </div>
             </div>
    </div>
  );
};

export default DashboardPage;