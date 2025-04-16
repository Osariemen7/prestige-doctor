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