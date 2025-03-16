import React, { useEffect, useState } from "react"; 
import { ChakraProvider, Box, Button, Divider, Flex, Heading, Text, Spinner, SimpleGrid, Progress } from "@chakra-ui/react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { AiOutlineArrowLeft } from 'react-icons/ai';
import { getAccessToken } from './api';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
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
import Carousel from 'react-multi-carousel';
import 'react-multi-carousel/lib/styles.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

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
  const [patientData, setPatientData] = useState(null);
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

  useEffect(() => {
    const fetchPatientData = async () => {
      try {
        const token = await getAccessToken();
        const response = await fetch(`https://health.prestigedelta.com/providerdashboard/${item.id}/`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        const data = await response.json();
        setPatientData(data);
      } catch (error) {
        console.error('Error fetching patient data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPatientData();
  }, [item.id]);

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

  const MetricChart = ({ metric, actions }) => {
    const chartData = {
      labels: metric.records ? metric.records.map(r => new Date(r.recorded_at).toLocaleDateString()) : [],
      datasets: [
        {
          label: metric.details.metric_name,
          data: metric.records ? metric.records.map(r => r.recorded_value) : [],
          borderColor: 'rgb(75, 192, 192)',
          tension: 0.1
        },
        {
          label: 'Target Value',
          data: metric.records ? metric.records.map(() => metric.details.target_value) : [],
          borderColor: 'rgb(255, 205, 86)',
          borderDash: [10, 5],
          tension: 0.1
        },
        {
          label: 'Actions',
          data: actions && actions.records ? actions.records.map(a => a.value) : [],
          borderColor: 'rgb(255, 99, 132)',
          tension: 0.1
        }
      ]
    };

    return (
      <Box p={4} bg="white" rounded="lg" shadow="sm">
        <Heading size="sm" mb={4}>{metric.details.metric_name}</Heading>
        <Line data={chartData} />
      </Box>
    );
  };

  const GoalProgress = ({ goal }) => (
    <Box p={6} bg="white" rounded="lg" shadow="sm">
      <Heading size="md" mb={4}>{goal.goal_name}</Heading>
      <Text color="gray.600" mb={4}>Target Date: {new Date(goal.target_date).toLocaleDateString()}</Text>
      <Text mb={4}>{goal.comments}</Text>
      
      {goal.metrics.map((metric, index) => (
        <Box key={index} mb={4}>
          <Flex justify="space-between" mb={2}>
            <Text>{metric.metric_name}</Text>
            <Text>{metric.target_value} {metric.unit}</Text>
          </Flex>
        </Box>
      ))}

      <Box mt={6}>
        <Heading size="sm" mb={3}>Action Items</Heading>
        {goal.actions.map((action, index) => (
          <Box key={index} p={3} bg="gray.50" rounded="md" mb={2}>
            <Text fontWeight="bold">{action.name}</Text>
            <Text fontSize="sm">{action.description}</Text>
          </Box>
        ))}
      </Box>
    </Box>
  );

  const handleGenerateReport = () => {
    navigate('/ask', { 
      state: { 
        initialQuery: `Generate a comprehensive progress report for patient ${item.id}`,
        selectedPatientId: item.id 
      } 
    });
  };

  if (loading) return <Spinner />;
  if (!patientData) return <Text>No data available</Text>;

  return (
    <ChakraProvider>
      <Box p={6} bg="gray.50" minH="100vh" overflowY="auto" style={{ backgroundImage: "linear-gradient(to bottom, #f0f8ff, #e6f7ff)" }}>
        <Button leftIcon={<AiOutlineArrowLeft />} onClick={() => navigate('/patientlist')} mb={6}>
          Back to Patient List
        </Button>

        {/* Patient Overview */}
        <Box mb={8}>
          <Heading size="lg" mb={4}>Patient Overview</Heading>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
            <Box p={5} bg="white" rounded="lg" shadow="md">
              <Text fontWeight="bold" fontSize="xl">{patientData.profile_data.demographics.name}</Text>
              <Text>Age: {patientData.profile_data.demographics.age}</Text>
              <Text>Gender: {patientData.profile_data.demographics.gender}</Text>
              <Text>Date of Birth: {new Date(patientData.profile_data.demographics.date_of_birth).toLocaleDateString()}</Text>
              <Text>Location: {patientData.profile_data.demographics.location.country_code}</Text>
            </Box>
            <Box p={5} bg="white" rounded="lg" shadow="md">
              <Text fontWeight="bold">Health Score</Text>
              <Heading size="xl" color="teal.500">{patientData.profile_data.lifestyle.biometrics.health_score}</Heading>
              <Text>Height: {patientData.profile_data.lifestyle.biometrics.height} cm</Text>
              <Text>Weight: {patientData.profile_data.lifestyle.biometrics.weight} kg</Text>
            </Box>
          </SimpleGrid>
        </Box>

        {/* Health Goals Section */}
        <Box mb={8}>
          <Heading size="md" mb={4}>Health Goal</Heading>
          <GoalProgress goal={patientData.health_goal} />
        </Box>

        {/* Metrics Charts with Carousel */}
        <Box mb={8}>
          <Heading size="md" mb={4}>Health Metrics</Heading>
          <Carousel
            additionalTransfrom={0}
            arrows
            autoPlaySpeed={3000}
            centerMode={false}
            containerClass="carousel-container"
            dotListClass=""
            draggable
            focusOnSelect={false}
            infinite
            keyBoardControl
            minimumTouchDrag={80}
            responsive={{
              desktop: {
                breakpoint: { max: 3000, min: 1024 },
                items: 2,
                partialVisibilityGutter: 40
              },
              tablet: {
                breakpoint: { max: 1024, min: 464 },
                items: 1,
                partialVisibilityGutter: 30
              },
              mobile: {
                breakpoint: { max: 464, min: 0 },
                items: 1,
                partialVisibilityGutter: 0
              }
            }}
            showDots={false}
            slidesToSlide={1}
            swipeable
          >
            {Object.entries(patientData.time_series.metrics).map(([key, metric]) => (
              <MetricChart 
                key={key} 
                metric={metric} 
                actions={patientData.time_series.actions[Object.keys(patientData.time_series.actions)[0]]} 
              />
            ))}
          </Carousel>
        </Box>

        {/* Latest Medical Review Section */}
        <Box mb={8}>
          <Heading size="md" mb={4}>Latest Medical Review</Heading>
          <Box p={5} bg="white" rounded="lg" shadow="md">
            <Box mb={4} pb={2} borderBottom="1px" borderColor="gray.200">
              <Text fontWeight="bold" color="gray.600">Last Review Date</Text>
              <Text color="blue.600">
                {new Date(patientData.medical_reviews[0]?.created_at || patientData.medical_reviews[0]?.updated_at).toLocaleString()}
              </Text>
            </Box>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
              <Box>
                <Text fontWeight="bold" color="blue.600">Chief Complaint</Text>
                <Text mb={4}>{patientData.medical_reviews[0]?.chief_complaint}</Text>
                
                <Text fontWeight="bold" color="blue.600">History of Present Illness</Text>
                <Text mb={4}>{patientData.medical_reviews[0]?.history_of_present_illness}</Text>
                
                <Text fontWeight="bold" color="blue.600">Assessment</Text>
                <Text mb={4}>{patientData.medical_reviews[0]?.assessment_diagnosis}</Text>
                
                <Text fontWeight="bold" color="blue.600">Treatment Plan</Text>
                <Text mb={4}>{patientData.medical_reviews[0]?.management_plan}</Text>
              </Box>
              
              <Box>
                <Text fontWeight="bold" color="blue.600">Physical Examination</Text>
                <Text mb={4}>{patientData.medical_reviews[0]?.physical_examination_findings}</Text>
                
                <Text fontWeight="bold" color="blue.600">Investigation Results</Text>
                <Text mb={4}>{patientData.medical_reviews[0]?.investigation_results}</Text>
                
                <Text fontWeight="bold" color="blue.600">Lifestyle Advice</Text>
                <Text mb={4}>{patientData.medical_reviews[0]?.lifestyle_advice}</Text>
                
                <Text fontWeight="bold" color="blue.600">Follow-up Plan</Text>
                <Text mb={4}>{patientData.medical_reviews[0]?.follow_up_plan}</Text>

                <Text fontWeight="bold" color="blue.600">Status</Text>
                <Text mb={4} color={patientData.medical_reviews[0]?.status === 'stable' ? 'green.500' : 'yellow.500'}>
                  {patientData.medical_reviews[0]?.status?.toUpperCase()}
                </Text>
              </Box>
              
              {patientData.medical_reviews[0]?.prescriptions?.length > 0 && (
                <Box gridColumn={{ md: "span 2" }}>
                  <Text fontWeight="bold" color="blue.600" mb={2}>Prescriptions</Text>
                  {patientData.medical_reviews[0]?.prescriptions.map((prescription, idx) => (
                    <Box key={idx} p={3} bg="gray.50" rounded="md" mb={2}>
                      {prescription.medications.map((med, medIdx) => (
                        <Box key={medIdx} mb={2}>
                          <Text fontWeight="semibold">{med.name}</Text>
                          <Text>Dosage: {med.dosage}</Text>
                          <Text>Frequency: {med.frequency}</Text>
                          <Text>Duration: {med.duration}</Text>
                          <Text>Instructions: {med.instructions}</Text>
                        </Box>
                      ))}
                    </Box>
                  ))}
                </Box>
              )}
            </SimpleGrid>
          </Box>
        </Box>

        {/* Progress Report Section */}
        <Box mb={8}>
          <Heading size="md" mb={4}>Progress Report</Heading>
          <Button colorScheme="blue" onClick={handleGenerateReport} mb={4}>
            Generate Progress Report
          </Button>
        </Box>
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
