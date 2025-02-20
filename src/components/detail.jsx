import React, { useEffect, useState } from "react"; 
import { ChakraProvider, Box, Button, Divider, Flex, Heading, Text, Spinner } from "@chakra-ui/react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { AiOutlineArrowLeft } from 'react-icons/ai';
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
  const [info, setInfo] = useState([]);
  const [loading, setLoading] = useState(true);
  const [buttonVisible, setButtonVisible] = useState(false);
  const [message, setmessage] = useState('');
  const [isInstance, setInstance] = useState(false);
  const toast = useToast();
  const { id } = useParams();
  const navigate = useNavigate();
  const { state } = useLocation(); // Retrieve passed data using useLocation
  const item = state?.item || {};

  // Extract the first review if available, otherwise null.
  const review = item.last_reviews && item.last_reviews.length > 0 ? item.last_reviews[0] : null;

  const formatDateTime = (isoString) => {
    return isoString.replace('T', ' ').slice(0, 16); // 'YYYY-MM-DD HH:MM'
  };

  const handleSubmit = async () => {
    setButtonVisible(true);
    const phone_number = phoneNumber ? `+234${phoneNumber.slice(1)}` : '';
    const formattedStartTime = formatDateTime(startTime);
    
    let data = {
      patient_id: item.id,
      start_time: formattedStartTime,
      reason,
      is_instant: isInstance
    };

    // Modify data based on whether a phone number is provided.
    if (phone_number === '') {
      delete data.phone_number;
    } else {
      delete data.patient_id;
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
        onClose();
      } else {
        const errorResult = await response.json();
        setmessage(errorResult.message);
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
      setButtonVisible(false);
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
          setInfo(response.data);
        } catch (error) {
          console.error("Error fetching data:", error);
        } finally {
          setLoading(false);
        }
      };
      fetchDa();
    }
  }, [date]);

  const options = info.map((slot) => (
    <option key={slot.start_time} value={slot.start_time}>
      {slot.start_time}
    </option>
  ));

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const dateObj = new Date(dateString);
    const days = Math.ceil((new Date() - dateObj) / (1000 * 60 * 60 * 24));
    return `Last updated ${days} days ago`;
  };

  const opt = ['Yes', 'No'];
  const healthSummary = JSON.parse(item.health_summary || "{}");

  const deleteDet = async () => {
    try {
      const token = await getAccessToken();
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
   
  const parsePrescriptionItems = (prescriptionItems) => {
    try {
      return JSON.parse(prescriptionItems);
    } catch {
      return [];
    }
  };

  return (
    <ChakraProvider>
      <Box p={6} bg="blue.50" minH="100vh" overflowY="auto">
        <div className="back-icon" onClick={() => navigate('/dashboard')}>
          <AiOutlineArrowLeft size={24} />
          <span className="back-text"></span>
        </div>
      
        <Heading size="lg" mb={4} color="blue.700" justifySelf="center">
          Patient Details
        </Heading>
      
        {/* <Button colorScheme="red" onClick={deleteDet}>Delete</Button> */}
      
        <Button colorScheme="blue" onClick={onOpen} mb="10px">
          Schedule Call Appointment
        </Button>
      
        <div className="w-full max-w-4xl mx-auto p-6 space-y-4">
          {/* Header Section */}
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-600">Patient ID: {item.id}</p>
              <h1 className="text-2xl font-bold text-blue-900">Patient Health Overview</h1>
              <p className="text-sm text-gray-500">{formatDate(item.most_recent_review)}</p>
            </div>
            {/* Health Score Circle */}
            <div className="relative w-24 h-24">
              <svg className="w-24 h-24 transform -rotate-90">
                <circle
                  cx="48"
                  cy="48"
                  r="36"
                  stroke="#E2E8F0"
                  strokeWidth="8"
                  fill="none"
                />
                <circle
                  cx="48"
                  cy="48"
                  r="36"
                  stroke="#10B981"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 36}`}
                  strokeDashoffset={`${2 * Math.PI * 36 * (1 - (item.health_score / 100))}`}
                />
              </svg>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <span className="text-xl font-bold text-blue-900">{item.health_score}</span>
              </div>
            </div>
          </div>
      
          {/* Status Badge */}
          <div className="mt-4">
            <span className="inline-block px-3 py-1 text-sm font-medium text-green-700 bg-green-100 rounded-full">
              {item.status}
            </span>
          </div>
      
          {/* Current Condition Section */}
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-blue-900">Current Condition</h2>
            <p className="text-gray-700">
              {review ? (review.chief_complaint || 'None recorded') : 'No current review'}
            </p>
          </div>
      
          {/* History Section */}
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-blue-900">History of Present Illness</h2>
            <p className="text-gray-700">
              {review ? (review.history_of_present_illness || 'None recorded') : 'No current review'}
            </p>
          </div>
      
          {/* Key Information Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">Past Medical History</h3>
              <p className="text-gray-700">
                {review ? (review.past_medical_history || 'None recorded') : 'No current review'}
              </p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">Medications</h3>
              <p className="text-gray-700">
                {review ? (review.medications || 'None recorded') : 'No current review'}
              </p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">Allergies</h3>
              <p className="text-gray-700">
                {review ? (review.allergies || 'None recorded') : 'No current review'}
              </p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">Social History</h3>
              <p className="text-gray-700">
                {review ? (review.social_history || 'None recorded') : 'No current review'}
              </p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">Physical Examination Findings</h3>
              <p className="text-gray-700">
                {review ? (review.physical_examination_findings || 'None recorded') : 'No current review'}
              </p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">Diagnosis Reason</h3>
              <p className="text-gray-700">
                {review ? (review.diagnosis_reason || 'None recorded') : 'No current review'}
              </p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">Assessment Diagnosis</h3>
              <p className="text-gray-700">
                {review ? (review.assessment_diagnosis || 'None recorded') : 'No current review'}
              </p>
            </div>
          </div>
      
          {/* Management Plan Section */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-blue-900 mb-4">Treatment Plan</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium text-blue-800">Management Plan</h3>
                <p className="text-gray-700 mt-1">
                  {review ? (review.management_plan || 'None recorded') : 'No current review'}
                </p>
              </div>
              <div>
                <h3 className="font-medium text-blue-800">Lifestyle Advice</h3>
                <p className="text-gray-700 mt-1">
                  {review ? (review.lifestyle_advice || 'None recorded') : 'No current review'}
                </p>
              </div>
            </div>
          </div>
      
          {/* Prescriptions Section */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-blue-900 mb-4">Prescriptions</h2>
            <div className="space-y-4">
              {review && review.prescriptions && review.prescriptions.length > 0 ? (
                review.prescriptions.map((prescription) => {
                  const medications = parsePrescriptionItems(prescription.prescription_items);
                  return (
                    <div key={prescription.id} className="bg-blue-50 rounded-lg p-4">
                      {medications.map((med, index) => (
                        <div key={index} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div>
                            <h4 className="text-sm font-medium text-blue-800">Medication</h4>
                            <p className="text-gray-700">{med.medication_name}</p>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-blue-800">Dosage</h4>
                            <p className="text-gray-700">{med.dosage}</p>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-blue-800">Frequency</h4>
                            <p className="text-gray-700">{med.frequency}</p>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-blue-800">Duration</h4>
                            <p className="text-gray-700">{med.duration}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })
              ) : (
                <Text>No prescriptions recorded</Text>
              )}
            </div>
          </div>
      
          {/* Investigations Section */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-blue-900 mb-4">Investigations</h2>
            <div className="space-y-4">
              {review && review.investigations && review.investigations.length > 0 ? (
                review.investigations.map((investigation) => (
                  <div key={investigation.id} className="bg-blue-50 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-medium text-blue-800">Test Type</h4>
                        <p className="text-gray-700">{investigation.test_type}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-blue-800">Reason</h4>
                        <p className="text-gray-700">{investigation.reason}</p>
                      </div>
                      {investigation.additional_instructions && (
                        <div className="md:col-span-2">
                          <h4 className="text-sm font-medium text-blue-800">Additional Instructions</h4>
                          <p className="text-gray-700">{investigation.additional_instructions}</p>
                        </div>
                      )}
                      {investigation.scheduled_time && (
                        <div>
                          <h4 className="text-sm font-medium text-blue-800">Scheduled Time</h4>
                          <p className="text-gray-700">
                            {new Date(investigation.scheduled_time).toLocaleString()}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <Text>No investigations recorded</Text>
              )}
            </div>
          </div>
      
          {/* Follow-up Section */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-blue-900 mb-4">Follow-up & Progress</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium text-blue-800">Follow-up Plan</h3>
                <p className="text-gray-700 mt-1">
                  {review ? (review.follow_up_plan || 'None recorded') : 'No current review'}
                </p>
              </div>
              <div>
                <h3 className="font-medium text-blue-800">Progress Notes</h3>
                <p className="text-gray-700 mt-1">
                  {review ? (review.daily_progress_notes || 'None recorded') : 'No current review'}
                </p>
              </div>
            </div>
          </div>
        </div>
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
            >
              {opt.map((option) => (
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
            <Text color="red">{message}</Text>
          </ModalBody>
      
          <ModalFooter>
            <Button
              colorScheme="blue"
              mr={3}
              onClick={handleSubmit}
              isDisabled={loading}
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
