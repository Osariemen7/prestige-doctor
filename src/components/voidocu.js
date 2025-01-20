import React, { useState, useRef, useEffect } from 'react';
import { getAccessToken } from './api';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Divider, Flex, Heading, Spinner, Text, Textarea, VStack } from '@chakra-ui/react';
import { FaFileExcel } from 'react-icons/fa';

const VoiceDocu = ({reviewId, sendOobRequest}) => {
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editableFields, setEditableFields] = useState({});
    const navigate = useNavigate();
    
const getMessage = async () => {
     
   await sendOobRequest();
    const review_id = reviewId;
    try {
      const token = await getAccessToken();
      if (token) {
        const response = await fetch(`https://health.prestigedelta.com/updatereview/${review_id}/`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          
        });
      
        const result = await response.json();
        setData(result)
      

      } else {
        console.log('No access token available.');
        return null;
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

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
    console.log('hi');
  
    try {
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
  
      const token = await getAccessToken();
      if (!token) {
        console.log('No access token available.');
        return;
      }
  
      const response = await fetch(`https://health.prestigedelta.com/updatereview/${reviewId}/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(structuredPayload),
      });
  
      if (!response.ok) {
        console.error(`Failed to submit edits: ${response.statusText}`);
        alert(`Error: ${response.statusText}`);
        return null;
      }
      setIsEditing(false)
      const result = await response.json();
      console.log('Submission successful:', result);
      return result;
      
    } catch (error) {
      console.error('Error submitting edits:', error);
      alert('Failed to submit edits');
    } finally {
      setIsLoading(false);
    }
  };
  

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
return (
    <Box overflowY="auto" padding="2px" >
     {!data ? <Button m={3} onClick={getMessage} colorScheme='purple'>Document</Button> : 
    <Button onClick={getMessage} colorScheme='purple'>Update Document</Button>}
    { data ? 
        <VStack spacing={4}>
          <Heading fontSize="md">Documentation</Heading>
          <Flex justify="space-between" bg="#f0f4f8"
      padding={2}
      justifyContent="space-between"
      alignItems="center"
      boxShadow="md"> 
          {data ? <Button mt='2px' mr='18px' colorScheme='blue' justifySelf='left' display='flex' onClick={handleEditSubmit}>Save</Button>: null}
          <Button
            colorScheme="teal"
            onClick={isEditing ? handleEditSubmit : () => setIsEditing(true)}
          >{isEditing ? <div>{isLoading ? <Spinner/>: 'Submit Edits'}</div> : 'Edit'}</Button>
           </Flex>
           <VStack spacing={2} align="stretch" width="100%">
          
          {Object.entries(data?.doctor_note || {}).map(
              ([section, details]) => (
                <Box key={section} width="100%">
                <Text fontWeight="bold" mt={4} mb={2}>
  {section
    .replace(/_/g, ' ') // Replace underscores with spaces
    .toLowerCase()      // Convert the entire string to lowercase
    .replace(/^\w/, (c) => c.toUpperCase())}: {/* Capitalize the first letter */}
</Text>
                 
                  {typeof details === 'object'
                    ? Object.entries(details).map(([key, value]) =>
                        renderEditableField(key, value)
                      )
                    : renderEditableField(section, details)}
                  <Divider />
                </Box>
              )
            )}
          </VStack>
        
          </VStack> : <Text textAlign='center' >No Documentation yet!</Text>}
   

    </Box>
  );    
}
export default VoiceDocu;