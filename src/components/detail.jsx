import React, { useState } from 'react';
import {
  Box,
  Heading,
  Text,
  Flex,
  Button,
  Input,
  Textarea,
  Stack,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  ChakraProvider,
  HStack,
} from '@chakra-ui/react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AiOutlineArrowLeft } from 'react-icons/ai'; // Import the back arrow icon

const DetailPage = () => {
  const { state } = useLocation(); // Retrieve passed data using useLocation
  const item = state?.item || {}; // Fallback to an empty object if no data passed
  const navigate = useNavigate()
  const editableFields = [
    'chief_complaint',
    'history_of_present_illness',
    'past_medical_history',
    'medications',
    'allergies',
    'family_history',
    'social_history',
    'review_of_systems',
    'physical_examination_findings',
    'differential_diagnosis',
    'diagnosis_reason',
    'assessment_diagnosis',
    'management_plan',
    'lifestyle_advice',
    'patient_education',
    'follow_up_plan',
    'management_plan_reason',
    'follow_up',
    'daily_progress_notes',
    'discharge_instructions',
  ];

  const [formData, setFormData] = useState(() =>
    editableFields.reduce((acc, key) => {
      acc[key] = item[key] || '';
      return acc;
    }, {})
  );

  const [editMode, setEditMode] = useState(false);
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();

  const handleInputChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const getRefreshToken = async () => {
    try {
      const userInfo = localStorage.getItem('user-info'); // Use localStorage for web storage
      const parsedUserInfo = userInfo ? JSON.parse(userInfo) : null;
      if (parsedUserInfo) {
        console.log('Access Token:', parsedUserInfo.access);
        return parsedUserInfo.refresh; // Return the access token
        
      } else {
        console.log('No user information found in storage.');
        return null;
      }
    } catch (error) {
      console.error('Error fetching token:', error);
      return null;
    }
    
  };
   const getAccessToken = async () => {
    let refresh = await getRefreshToken()
    let term = {refresh}
    let rep = await fetch ('https://health.prestigedelta.com/tokenrefresh/',{
        method: 'POST',
        headers:{
          'Content-Type': 'application/json',
          'accept' : 'application/json'
     },
     body:JSON.stringify(term)
    });
    rep = await rep.json();
    if (rep) {
      console.log('Access Token:', rep.access);
      localStorage.setItem('user-info', JSON.stringify(rep));
      return rep.access // Return the access token
      
    } 
  
  }
  
  const handleSave = async () => {
    const token = await getAccessToken();
    const updatedData = {
      review_details: {
        ...formData
      },
    };
    try {
      const response = await fetch(`https://health.prestigedelta.com/updatereview/${item.id}/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        
        body: JSON.stringify(updatedData),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Data saved successfully.',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        setEditMode(false);
      } else {
        throw new Error('Failed to save data');
      }
    } catch (error) {
      console.error(error);
      toast({
        title: 'Error',
        description: 'An error occurred while saving data.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  return (
    <ChakraProvider >
    <Box p={6} bg="blue.50" minH="100vh" overflowY="auto">
    <div className="back-icon" onClick={() => navigate('/dashboard')}>
        <AiOutlineArrowLeft size={24} />
        <span className="back-text"></span>
      </div>

      <Heading size="lg" mb={4} color="blue.700">
        Patient Details
      </Heading>
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
          Patient ID: {item.patient_id}
        </Text>
        <Text fontWeight="bold" mb={2}>
          Phone Number: {item.patient_phone_number}
        </Text>
        <Text fontWeight="bold" mb={4}>
          Status: {item.status}
        </Text>
  <HStack><Button mb={4} onClick={onOpen} colorScheme='green'>Approve Diagnosis</Button>
  <Button
          colorScheme="blue"
          mb={4}
          onClick={() => setEditMode((prev) => !prev)}
        >
          {editMode ? 'Cancel Edit' : 'Edit Details'}
        </Button>
  </HStack>
       
        
        <Stack spacing={4}>
          {editableFields.map((field) => (
            <Box key={field}>
              <Text
                fontWeight="medium"
                mb={1}
                color="blue.600"
                textTransform="capitalize"
              >
                {field.replace(/_/g, ' ')}
              </Text>
              {editMode ? (
                field === 'review_of_systems' ? (
                  <Textarea
                    value={formData[field]}
                    onChange={(e) => handleInputChange(field, e.target.value)}
                  />
                ) : (
                  <Input
                    value={formData[field]}
                    onChange={(e) => handleInputChange(field, e.target.value)}
                  />
                )
              ) : (
                <Text>{formData[field] || 'Not provided'}</Text>
              )}
            </Box>
          ))}
        </Stack>
        {editMode && (
          <Button colorScheme="green" mt={6} onClick={handleSave}>
            Save Changes
          </Button>
        )}
      </Flex>

      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Approve Diagnosis</ModalHeader>
          <ModalBody>
            <Text>Are you sure you want to approve the diagnosis?</Text>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="blue" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button
              colorScheme="green"
              onClick={async () => {
                const updatedData = {
      review_details: {
        ...formData
      },
    };
                try {
                  const response = await fetch(
                    `https://health.prestigedelta.com/medicalreview/${item.id}/`,
                    {
                      method: 'PUT',
                      headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
                      },
                      body: JSON.stringify(updatedData),
                    }
                  );

                  if (response.ok) {
                    toast({
                      title: 'Diagnosis Approved',
                      description: 'The diagnosis has been approved.',
                      status: 'success',
                      duration: 3000,
                      isClosable: true,
                    });
                    onClose();
                  } else {
                    throw new Error('Failed to approve diagnosis');
                  }
                } catch (error) {
                  console.error(error);
                  toast({
                    title: 'Error',
                    description: 'Failed to approve diagnosis.',
                    status: 'error',
                    duration: 3000,
                    isClosable: true,
                  });
                }
              }}
            >
              Approve
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
    </ChakraProvider>
  );
};

export default DetailPage;
