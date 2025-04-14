import React, { useState, useEffect } from 'react';
import { ChakraProvider, Box, Grid, Text, Button, Input, Spinner,
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
import { useColorModeValue } from "@chakra-ui/react";
import { Heading, Badge, Tooltip } from "@chakra-ui/react";
import './DashboardPage.css';
import Sidebar from './sidebar';
import { useNavigate } from 'react-router-dom';
import { getAccessToken } from './api';
import { Search } from 'lucide-react';
import { AlertTriangle } from 'lucide-react';

const Dashboard = () => {
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSidebarMinimized, setIsSidebarMinimized] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+234'); // Default to Nigeria
  const [buttonVisible, setButtonVisible] = useState(false);
  const [data, setDataList] = useState([]);
  const [message, setMessage] = useState('');
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  // Color settings for priority badges
  const urgentColor = "red";
  const highColor = "orange";
  const normalColor = "blue";
  
  // Filter patients based on search term (first name, last name, or phone number)
  const filteredPatients = patients.filter((patient) => {
    const firstName = patient.profile_data?.demographics?.first_name?.toLowerCase() || '';
    const lastName = patient.profile_data?.demographics?.last_name?.toLowerCase() || '';
    const phoneNumber = patient.profile_data?.demographics?.phone_number?.toLowerCase() || '';
    const searchTermLower = searchTerm.toLowerCase();
    
    return (
      firstName.includes(searchTermLower) ||
      lastName.includes(searchTermLower) ||
      phoneNumber.includes(searchTermLower)
    );
  });

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

  // Fetch patients data from providerdashboard endpoint
  useEffect(() => {
    const fetchData = async () => {
      const accessToken = await getAccessToken();
      if (!accessToken) return;

      try {
        const response = await fetch('https://health.prestigedelta.com/providerdashboard/', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'accept': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
        });
        
        if (response.status === 401) {
          navigate('/');
        } else {
          const result = await response.json();
          setPatients(result);
        }
      } catch (error) {
        console.error('Error fetching patient data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  const handleViewDetails = (patient) => {
    navigate('/detail', { state: { item: patient } });
  };

  const handleLogout = () => {
    localStorage.removeItem('user-info');
    navigate('/');
  };
  
  // Patient card component with alert information
  const PatientCard = ({ patient }) => {
    const cardBg = useColorModeValue("white", "gray.700");
    const hasUrgentAlerts = patient.urgent_unactioned_count > 0;
    const hasHighAlerts = patient.high_unactioned_count > 0;
    
    // Get patient name or show "Unnamed Patient" if name is not available
    const firstName = patient.profile_data?.demographics?.first_name || '';
    const lastName = patient.profile_data?.demographics?.last_name || '';
    const fullName = firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName || "Unnamed Patient";
    
    // Get phone number
    const phoneNumber = patient.profile_data?.demographics?.phone_number || 'No phone number';
    
    return (
      <Box 
        p={5} 
        borderWidth="1px" 
        borderRadius="lg" 
        bg={cardBg}
        boxShadow="sm"
        position="relative"
      >
        {/* Priority indicator */}
        {hasUrgentAlerts && (
          <Box position="absolute" top={2} right={2}>
            <Tooltip label={`${patient.urgent_unactioned_count} urgent alerts require attention`}>
              <span>
                <AlertTriangle size={20} color="red" fill="red" />
              </span>
            </Tooltip>
          </Box>
        )}
        
        <Flex justify="space-between" align="center">
          <Text fontSize="sm" color="blue.600">Patient ID: {patient.id}</Text>
        </Flex>
        
        <Heading size="md" mt={2} mb={1}>
          {fullName}
        </Heading>
        
        <Text fontSize="sm" color="gray.600" mb={3}>
          {phoneNumber}
        </Text>
        
        {/* Alert badges */}
        <Flex gap={2} mb={4} wrap="wrap">
          {patient.urgent_unactioned_count > 0 && (
            <Badge colorScheme={urgentColor} variant="solid" borderRadius="full" px={2}>
              {patient.urgent_unactioned_count} Urgent
            </Badge>
          )}
          
          {patient.high_unactioned_count > 0 && (
            <Badge colorScheme={highColor} variant="solid" borderRadius="full" px={2}>
              {patient.high_unactioned_count} High
            </Badge>
          )}
          
          {patient.total_unactioned_count > 0 && (
            <Badge colorScheme={normalColor} variant="outline" borderRadius="full" px={2}>
              {patient.total_unactioned_count} Total Alerts
            </Badge>
          )}
        </Flex>
        
        <Button
          onClick={() => handleViewDetails(patient)}
          colorScheme="blue"
          size="sm"
          width="full"
        >
          View Details
        </Button>
      </Box>
    );
  };

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <Sidebar 
        onToggleSidebar={(minimized) => setIsSidebarMinimized(minimized)} 
        onNavigate={(path) => navigate(path)} 
        onLogout={handleLogout}
      />
      
      {/* Main Content */}
      <div className={`${isSidebarMinimized ? 'ml-14 md:ml-76' : 'ml-0 md:ml-64'} flex-1 transition-all duration-300`}>
        <div className="min-h-screen bg-gray-50 p-6">
          <ChakraProvider>
            <Box flex="1" overflow="auto">
              <Flex direction="column">
              <Flex justifyContent="space-between" alignItems="center" mb={4} >
      <Heading fontSize='22px'>Patient Dashboard</Heading>
      <Button colorScheme="blue" m={4} onClick={onOpen}>Add New Patient</Button>
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
                  <Flex direction="column" align="center" justify="center" minH="50vh">
                    <Spinner size="xl" color="blue.500" thickness="4px" />
                    <Text mt={4} fontSize="lg">Loading patient data...</Text>
                  </Flex>
                ) : (
                  <Box p={4}>
                    {/* Search Bar */}
                    <Box mb={6} maxW="600px" mx="auto">
                      <Box position="relative">
                        <Box position="absolute" left={3} top="50%" transform="translateY(-50%)">
                          <Search size={18} className="text-gray-400" />
                        </Box>
                        <Input
                          pl="40px"
                          placeholder="Search by name or phone number"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          borderRadius="full"
                          bg="white"
                          boxShadow="sm"
                        />
                      </Box>
                    </Box>
                    
                    {/* Patient Cards Grid */}
                    <Grid 
                      templateColumns={{
                        base: "1fr",
                        md: "repeat(2, 1fr)",
                        lg: "repeat(3, 1fr)"
                      }} 
                      gap={6}
                    >
                      {filteredPatients.length > 0 ? (
                        filteredPatients.map((patient) => (
                          <PatientCard key={patient.id} patient={patient} />
                        ))
                      ) : (
                        <Box textAlign="center" gridColumn="1 / -1" py={10}>
                          <Text fontSize="lg">No patients found matching your search.</Text>
                        </Box>
                      )}
                    </Grid>
                  </Box>
                )}
              </Flex>
            </Box>
          </ChakraProvider>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;