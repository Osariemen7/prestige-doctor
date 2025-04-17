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
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
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
    const fullName = `${firstName} ${lastName}`.trim();
    const searchTermLower = searchTerm.toLowerCase().trim();
    return (
      firstName.includes(searchTermLower) ||
      lastName.includes(searchTermLower) ||
      phoneNumber.includes(searchTermLower) ||
      (searchTermLower && fullName.includes(searchTermLower))
    );
  });

  const handleAddPatient = async () => {
    setButtonVisible(true);
    setMessage('');

    if (!phoneNumber || !firstName || !lastName) {
        setMessage('Please fill in all required fields');
        setButtonVisible(false);
        return;
    }

    // Format the phone number with country code
    const formattedPhoneNumber = `${countryCode}${phoneNumber.startsWith('0') ? phoneNumber.slice(1) : phoneNumber}`;

    try {
        const token = await getAccessToken();
        const response = await fetch('https://health.prestigedelta.com/appointments/create-patient/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
                phone_number: formattedPhoneNumber,
                first_name: firstName,
                last_name: lastName
            }),
        });
      
        if (response.ok) {
            // Reset form fields
            setPhoneNumber('');
            setFirstName('');
            setLastName('');
            
            // Close the modal
            onClose(); 
            
            // Set search box to new patient's name
            setSearchTerm(`${firstName} ${lastName}`);
            
            // Show success toast with enhanced styling
            toast({
                position: 'top',
                title: '🎉 Patient Added Successfully!',
                description: `${firstName} ${lastName} has been added to your patient list.`,
                status: 'success',
                duration: 5000,
                isClosable: true,
                variant: 'solid',
                render: ({ onClose }) => (
                    <Box 
                        color="white" 
                        p={4} 
                        bg="green.500" 
                        borderRadius="xl"
                        position="relative"
                        overflow="hidden"
                        boxShadow="0 4px 12px rgba(0, 200, 0, 0.2)"
                    >
                        <Box 
                            position="absolute" 
                            top="0" 
                            right="0" 
                            bottom="0" 
                            w="30%" 
                            bgGradient="linear(to-r, transparent, green.400)"
                            opacity="0.6"
                        />
                        <Flex alignItems="center">
                            <Box
                                borderRadius="full"
                                bg="green.100"
                                color="green.700"
                                p={2}
                                mr={3}
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </Box>
                            <Box flex="1">
                                <Text fontWeight="bold" fontSize="lg">Patient Added Successfully!</Text>
                                <Text fontSize="sm" opacity="0.9">{firstName} {lastName} has been added to your patient list.</Text>
                            </Box>
                            <Button size="sm" variant="unstyled" onClick={onClose}>✕</Button>
                        </Flex>
                    </Box>
                )
            });
            
            // Wait a moment then refresh the patient list to include the new patient with their name
            setTimeout(() => {
                fetchPatients();
            }, 1000); // Small delay to ensure the backend has processed the new patient
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
  const fetchPatients = async () => {
    setLoading(true);
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

  // Fetch patients on component mount
  useEffect(() => {
    fetchPatients();
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
              <Flex justifyContent="space-between" alignItems="center" mb={4} flexDirection={{ base: 'column', md: 'row' }} gap={4}>
                <Heading fontSize='22px'>Patient Dashboard</Heading>
                <Button
                  colorScheme="blue"
                  size="lg"
                  px={{ base: 4, md: 6 }}
                  py={{ base: 2, md: 4 }}
                  fontWeight="bold"
                  fontSize={{ base: 'md', md: 'lg' }}
                  bgGradient="linear(to-r, blue.500, cyan.400)"
                  _hover={{
                    transform: 'scale(1.05)',
                    bgGradient: 'linear(to-r, cyan.400, blue.500)',
                    boxShadow: '0 4px 20px rgba(0, 112, 244, 0.15)'
                  }}
                  boxShadow="lg"
                  borderRadius="full"
                  onClick={onOpen}
                  display="flex"
                  flexDirection="column"
                  height="auto"
                  minH={{ base: "70px", md: "80px" }}
                  textAlign="center"
                  justifyContent="center"
                  whiteSpace="normal"
                >
                  <Text as="span" display="block" lineHeight="1.2" mb={1}>
                    Add New Patient
                  </Text>
                  <Text as="span" 
                    fontSize="xs" 
                    fontWeight="normal"
                    color="#e0f2fe"
                    lineHeight="1"
                  >
                    (Grow Your Practice)
                  </Text>
                </Button>
              </Flex>
     {/* Add New Patient Modal */}
     <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay backdropFilter="blur(4px)" />
      <ModalContent borderRadius="xl" boxShadow="xl" maxW={{ base: "90%", md: "500px" }}>
        <Box bgGradient="linear(to-r, blue.500, cyan.400)" borderTopRadius="xl" p={1}>
          <ModalHeader color="white" fontSize="xl">
            Add New Patient
          </ModalHeader>
        </Box>
        <ModalCloseButton color="white" />
        <ModalBody pt={6} pb={8} px={{ base: 4, md: 6 }}>
          <Text mb={6} color="gray.600" fontWeight="medium">
            Adding a new patient helps grow your practice and expand your healthcare reach.
          </Text>
          
          <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
            <FormControl isRequired>
              <FormLabel fontWeight="medium" color="gray.700">First Name</FormLabel>
              <Input 
                type="text"
                placeholder="Enter first name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                borderRadius="md"
                focusBorderColor="blue.400"
                _hover={{ borderColor: "blue.300" }}
                size="lg"
              />
            </FormControl>
            
            <FormControl isRequired>
              <FormLabel fontWeight="medium" color="gray.700">Last Name</FormLabel>
              <Input 
                type="text"
                placeholder="Enter last name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                borderRadius="md"
                focusBorderColor="blue.400"
                _hover={{ borderColor: "blue.300" }}
                size="lg"
              />
            </FormControl>
          </Grid>
          
          <Grid templateColumns={{ base: "100px 1fr", md: "120px 1fr" }} gap={4} mt={4}>
            <FormControl isRequired>
              <FormLabel fontWeight="medium" color="gray.700">Country</FormLabel>
              <Select 
                value={countryCode} 
                onChange={(e) => setCountryCode(e.target.value)}
                borderRadius="md"
                focusBorderColor="blue.400"
                _hover={{ borderColor: "blue.300" }}
                size="lg"
                h="auto"
              >
                <option value="+234">+234 🇳🇬</option>
                <option value="+44">+44 🇬🇧</option>
                <option value="+1">+1 🇺🇸</option>
              </Select>
            </FormControl>
            
            <FormControl isRequired>
              <FormLabel fontWeight="medium" color="gray.700">Phone Number</FormLabel>
              <Input 
                type="tel"
                placeholder="Enter phone number"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9]/g, ''))}
                borderRadius="md"
                focusBorderColor="blue.400"
                _hover={{ borderColor: "blue.300" }}
                size="lg"
              />
            </FormControl>
          </Grid>
          
          {message && (
            <Box 
              mt={4} 
              p={3} 
              borderRadius="md" 
              bg="red.50" 
              color="red.500" 
              borderLeft="4px" 
              borderColor="red.500"
            >
              <Text fontWeight="medium">{message}</Text>
            </Box>
          )}
        </ModalBody>
        <ModalFooter bg="gray.50" borderBottomRadius="xl" p={4}>
          <Button 
            colorScheme="blue" 
            mr={3} 
            onClick={handleAddPatient} 
            isLoading={buttonVisible}
            loadingText="Adding..."
            size="lg"
            px={8}
            bgGradient="linear(to-r, blue.500, cyan.400)"
            _hover={{
              bgGradient: "linear(to-r, blue.600, cyan.500)",
            }}
            borderRadius="md"
          >
            Add Patient
          </Button>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
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
                      {patients.length === 0 ? (
                        // Show compelling empty state when there are NO patients at all
                        <Box 
                          textAlign="center" 
                          gridColumn="1 / -1" 
                          py={12}
                          px={6}
                          bg="white" 
                          borderRadius="xl"
                          boxShadow="md"
                          maxW="800px"
                          mx="auto"
                          position="relative"
                          overflow="hidden"
                        >
                          <Box 
                            position="absolute" 
                            top="0" 
                            left="0" 
                            right="0" 
                            h="8px" 
                            bgGradient="linear(to-r, blue.400, cyan.500)" 
                          />
                          
                          <Box mb={6} mx="auto" maxW="72px">
                            <Box 
                              w="72px" 
                              h="72px" 
                              borderRadius="full" 
                              bg="blue.50" 
                              display="flex" 
                              alignItems="center" 
                              justifyContent="center"
                            >
                              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M19 10H17V7C17 4.24 14.76 2 12 2C9.24 2 7 4.24 7 7V10H5C3.9 10 3 10.9 3 12V20C3 21.1 3.9 22 5 22H19C20.1 22 21 21.1 21 20V12C21 10.9 20.1 10 19 10ZM9 7C9 5.34 10.34 4 12 4C13.66 4 15 5.34 15 7V10H9V7ZM15 16H13V18H11V16H9V14H11V12H13V14H15V16Z" fill="#3182CE"/>
                              </svg>
                            </Box>
                          </Box>
                          
                          <Heading size="lg" mb={4} color="gray.700">
                            Welcome to Your Healthcare Practice
                          </Heading>
                          
                          <Text fontSize="lg" mb={5} color="gray.600" maxW="550px" mx="auto">
                            Get started by adding your first patient to unlock the full potential of the Prestige Doctor platform.
                          </Text>
                          
                          <Box mb={8}>
                            <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={4} maxW="600px" mx="auto">
                              <Box p={4} bg="blue.50" borderRadius="md" textAlign="left">
                                <Flex mb={3}>
                                  <Box p={2} bg="blue.100" borderRadius="md" mr={3}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                      <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z" fill="#3182CE"/>
                                    </svg>
                                  </Box>
                                  <Text fontWeight="bold" color="gray.700">Boost Your Income</Text>
                                </Flex>
                                <Text fontSize="sm" color="gray.600">Earn from virtual consultations and receive commissions on AI assistant follow-up care, with automated billing.</Text>
                              </Box>
                              
                              <Box p={4} bg="blue.50" borderRadius="md" textAlign="left">
                                <Flex mb={3}>
                                  <Box p={2} bg="blue.100" borderRadius="md" mr={3}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                      <path d="M19 3H5C3.89 3 3 3.9 3 5V19C3 20.1 3.89 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM9 17H7V10H9V17ZM13 17H11V7H13V17ZM17 17H15V13H17V17Z" fill="#3182CE"/>
                                    </svg>
                                  </Box>
                                  <Text fontWeight="bold" color="gray.700">Track Patient Progress</Text>
                                </Flex>
                                <Text fontSize="sm" color="gray.600">Monitor health metrics, view patient history, and track treatment outcomes.</Text>
                              </Box>
                              
                              <Box p={4} bg="blue.50" borderRadius="md" textAlign="left">
                                <Flex mb={3}>
                                  <Box p={2} bg="blue.100" borderRadius="md" mr={3}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                      <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2ZM8 14H6V12H8V14ZM8 11H6V9H8V11ZM8 8H6V6H8V8ZM15 14H10V12H15V14ZM18 11H10V9H18V11ZM18 8H10V6H18V8Z" fill="#3182CE"/>
                                    </svg>
                                  </Box>
                                  <Text fontWeight="bold" color="gray.700">Effective Communication</Text>
                                </Flex>
                                <Text fontSize="sm" color="gray.600">Send messages, share results, and maintain ongoing communication with patients.</Text>
                              </Box>
                              
                              <Box p={4} bg="blue.50" borderRadius="md" textAlign="left">
                                <Flex mb={3}>
                                  <Box p={2} bg="blue.100" borderRadius="md" mr={3}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                      <path d="M12 11C9.79 11 8 9.21 8 7C8 4.79 9.79 3 12 3C14.21 3 16 4.79 16 7C16 9.21 14.21 11 12 11ZM12 5C10.9 5 10 5.9 10 7C10 8.1 10.9 9 12 9C13.1 9 14 8.1 14 7C14 5.9 13.1 5 12 5ZM12 13C9.33 13 4 14.34 4 17V20H20V17C20 14.34 14.67 13 12 13ZM18 18H6V17.01C6.2 16.29 9.3 15 12 15C14.7 15 17.8 16.29 18 17V18Z" fill="#3182CE"/>
                                    </svg>
                                  </Box>
                                  <Text fontWeight="bold" color="gray.700">Patient Management</Text>
                                </Flex>
                                <Text fontSize="sm" color="gray.600">Organize patient records, manage appointments, and streamline your practice.</Text>
                              </Box>
                              
                              <Box p={4} bg="blue.50" borderRadius="md" textAlign="left">
                                <Flex mb={3}>
                                  <Box p={2} bg="blue.100" borderRadius="md" mr={3}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                      <path d="M12 3C7.03 3 3 7.03 3 12C3 16.97 7.03 21 12 21C16.97 21 21 16.97 21 12C21 7.03 16.97 3 12 3ZM13 19.94C8.61 19.44 5 16.04 5 12C5 11.45 5.06 10.91 5.17 10.4L9 14.23V15C9 16.1 9.9 17 11 17H13V19.94ZM18.31 16.9C17.84 16.21 16.97 15.75 16 15.75H15V13.5C15 12.67 14.33 12 13.5 12H8V10H10C10.83 10 11.5 9.33 11.5 8.5V7.5H13.5C14.33 7.5 15 6.83 15 6V5.25C17.09 6.04 18.61 7.95 18.91 10.26L16.4 12.77L17.2 13.57L19 11.77V12C19 13.54 18.5 14.93 17.7 16.08L18.31 16.9Z" fill="#3182CE"/>
                                    </svg>
                                  </Box>
                                  <Text fontWeight="bold" color="gray.700">AI-Powered Assistance</Text>
                                </Flex>
                                <Text fontSize="sm" color="gray.600">Leverage AI for follow-up care while earning commissions, reducing your workload.</Text>
                              </Box>
                            </Grid>
                          </Box>
                          
                          <Button
                            colorScheme="blue"
                            size="lg"
                            px={8}
                            py={6}
                            fontWeight="bold"
                            bgGradient="linear(to-r, blue.500, cyan.400)"
                            _hover={{
                              transform: 'translateY(-2px)',
                              bgGradient: 'linear(to-r, blue.600, cyan.500)',
                              boxShadow: '0 4px 20px rgba(0, 112, 244, 0.3)'
                            }}
                            onClick={onOpen}
                            boxShadow="lg"
                            borderRadius="lg"
                          >
                            Add Your First Patient
                          </Button>
                          
                          <Text mt={5} fontSize="sm" color="gray.500">
                            Adding patients allows you to utilize all features and services of the platform.
                          </Text>
                        </Box>
                      ) : filteredPatients.length > 0 ? (
                        // Show patient cards when search returns results
                        filteredPatients.map((patient) => (
                          <PatientCard key={patient.id} patient={patient} />
                        ))
                      ) : (
                        // Show a simple message when search returns no results
                        <Box 
                          textAlign="center" 
                          gridColumn="1 / -1" 
                          py={10}
                          px={6}
                          bg="white" 
                          borderRadius="xl"
                          boxShadow="sm"
                          maxW="600px"
                          mx="auto"
                        >
                          <Box mb={4}>
                            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" fill="#A0AEC0"/>
                            </svg>
                          </Box>
                          
                          <Heading size="md" mb={3} color="gray.700">
                            No patients found matching your search
                          </Heading>
                          
                          <Text fontSize="md" color="gray.600" mb={5}>
                            Try adjusting your search terms or clear the search to see all patients.
                          </Text>
                          
                          <Button
                            colorScheme="blue"
                            size="md"
                            onClick={() => setSearchTerm('')}
                            variant="outline"
                          >
                            Clear Search
                          </Button>
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