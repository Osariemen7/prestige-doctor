import React, { useState, useEffect } from 'react';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { getAccessToken, submitEdits } from './api';
import { ChakraProvider, Heading, Text, Spinner, Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalFooter,
    ModalBody,
    ModalCloseButton, Box, Flex, useDisclosure, IconButton, Avatar, Button, VStack, Divider, Textarea } from '@chakra-ui/react';

const Document = () => {
    const { state } = useLocation();
    const data = state?.responseData || {};
    const { isOpen, onOpen, onClose } = useDisclosure();
    const [isEditing, setIsEditing] = useState(false);
  const [editableFields, setEditableFields] = useState({});
  const [isloading, setIsLoading] = useState(true)
  const navigate = useNavigate()

  const editableFieldKeys = [
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

  const handleInputChange = (key, value) => {
    setEditableFields((prev) => ({ ...prev, [key]: value }));
  };

  const handleEditSubmit = async () => {
    setIsLoading(true);
  
    // Create the structured payload
    const structuredPayload = {
      review_details: {
        patient_medical_history: {
          medical_conditions: editableFields.medical_conditions || data.medical_conditions || [],
          medications: editableFields.medications || data.medications || [],
          allergies: editableFields.allergies || data.allergies || [],
          surgeries: editableFields.surgeries || data.surgeries || [],
          family_history: editableFields.family_history || data.family_history || [],
          past_medical_history: editableFields.past_medical_history || data.past_medical_history || [],
          social_history: editableFields.social_history || data.social_history || "",
        },
        subjective: {
          chief_complaint: editableFields.chief_complaint || data.chief_complaint || "",
          history_of_present_illness: editableFields.history_of_present_illness || data.history_of_present_illness || "",
        },
        objective: {
          examination_findings: editableFields.physical_examination_findings || data.physical_examination_findings || "",
          investigations: editableFields.investigations || data.investigations || [],
        },
        review_of_systems: {
          system_assessment: {
            cardiovascular: editableFields.cardiovascular || data.cardiovascular || "",
            respiratory: editableFields.respiratory || data.respiratory || "",
          },
        },
        assessment: {
          primary_diagnosis: editableFields.assessment_diagnosis || data.assessment_diagnosis || "",
          differential_diagnosis: editableFields.differential_diagnosis || data.differential_diagnosis || [],
          status: editableFields.status || data.status || "",
          health_score: editableFields.health_score || data.health_score || null,
        },
        plan: {
          management: editableFields.management_plan || data.management_plan || "",
          lifestyle_advice: editableFields.lifestyle_advice || data.lifestyle_advice || "",
          follow_up: editableFields.follow_up || data.follow_up || "",
          patient_education: editableFields.patient_education || data.patient_education || "",
          treatment_goal: editableFields.treatment_goal || data.treatment_goal || "",
          next_review: editableFields.next_review || data.next_review || "",
        },
        reasoning: {
          diagnosis_reasoning: editableFields.diagnosis_reason || data.diagnosis_reason || "",
          plan_reasoning: editableFields.management_plan_reason || data.management_plan_reason || "",
        },
        investigations: editableFields.investigations || data.investigations || [],
        prescriptions: editableFields.prescriptions || data.prescriptions || [],
      },
    };
  
    try {
      const response = await submitEdits(data, structuredPayload);
      if (response) {
        console.log('Edit submission successful:', response);
        setIsEditing(false);
        onOpen()
         // Update data with changes
      }
    } catch (error) {
      console.error('Error submitting edits:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleHome = () =>{
    navigate('/dashboard')
}

  const renderEditableField = (key, value) => {
    const isEditable = editableFieldKeys.includes(key);
    const displayValue = editableFields[key] ?? value;
   

    return (
      <Box
        key={key}
        bg={isEditable ? 'gray.100' : 'white'}
        p={4}
        borderRadius="md"
        borderWidth={isEditable ? '1px' : '0'}
        borderColor={isEditable ? 'teal.300' : 'transparent'}
      >
        <Text fontWeight="bold" mb={2}>
  {key
    .replace(/_/g, ' ') // Replace underscores with spaces
    .toLowerCase()      // Convert the entire string to lowercase
    .replace(/^\w/, (c) => c.toUpperCase())}: {/* Capitalize the first letter */}
</Text>
        {isEditable && isEditing ? (
          <Textarea
            value={displayValue}
            onChange={(e) => handleInputChange(key, e.target.value)}
            size="sm"
            resize="vertical"
            bg="white"
          />
        ) : (
          <Text>
            {typeof value === 'object' ? JSON.stringify(value, null, 2) : value}
          </Text>
        )}
      </Box>
    );
  };
    
    return(
        <ChakraProvider>
           <Flex direction="column" height="80vh">
          {/* Header */}
          <Flex bg="#f0f4f8" p={2} justify="space-between" align="center" boxShadow="md">
            {data && (
              <Button
                colorScheme="teal"
                onClick={isEditing ? handleEditSubmit : () => setIsEditing(true)}
                isDisabled={!data}
              >
                {isEditing ? 'Submit' : 'Edit'}
              </Button>
            )}
            <Button colorScheme='blue' onClick={handleEditSubmit}>Save</Button>
          </Flex>
    
          {/* Main Content */}
          <Box flex="1" overflowY="auto" p={4}>
            
               
                <VStack spacing={4}>
                  <Heading fontSize="lg">Patient Report</Heading>
                  <Box bg="#4682b4" color="white" p={3} borderRadius="md" w="fit-content">
                    <Text>Patient ID: {data.patient_id}</Text>
                  </Box>
                  <VStack spacing={2} align="stretch">
                    <Text>Review Time: {data.review_time}</Text>
                    <Text>Sentiment: {data.doctor_note?.sentiment}</Text>
                  </VStack>
                  <Box bg="#f0f8ff" p={4} borderRadius="md" w="100%">
                    <Heading fontSize="md">AI Response</Heading>
                    <Text>{data.doctor_note?.response}</Text>
                  </Box>
                  <VStack spacing={4} align="stretch" w="100%">
                    {Object.entries(data?.doctor_note?.review_details || {}).map(([section, details]) => (
                      <Box key={section} w="100%">
                        <Text fontWeight="bold" mt={4} mb={2}>
                          {section
                            .replace(/_/g, ' ')
                            .toLowerCase()
                            .replace(/^\w/, (c) => c.toUpperCase())}
                          :
                        </Text>
                        {typeof details === 'object'
                          ? Object.entries(details).map(([key, value]) => renderEditableField(key, value))
                          : renderEditableField(section, details)}
                        <Divider />
                      </Box>
                    ))}
                  </VStack>
                </VStack>
              
            
          </Box>
        </Flex>
        <Modal isOpen={isOpen} onClose={onClose}>
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>Successful!!</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>
                        <Text>Documents saved!</Text>
                    </ModalBody>

                    <ModalFooter>
                        <Button
                            colorScheme="blue"
                            mr={3}
                            onClick={handleHome}
                     
                        >
                            Home
                        </Button>
                        
                    </ModalFooter>
                </ModalContent>
            </Modal>

        </ChakraProvider>
    )
}
export default Document