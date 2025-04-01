import React, { useEffect, useState } from "react";
import {
  ChakraProvider,
  Box,
  Button,
  Flex,
  Heading,
  Text,
  Spinner,
  SimpleGrid,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  useToast,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Select,
  Badge,
} from "@chakra-ui/react";
import { ChatIcon } from "@chakra-ui/icons";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { AiOutlineArrowLeft, AiOutlineArrowRight } from "react-icons/ai";
import { CheckIcon } from "@chakra-ui/icons";
import { getAccessToken } from "./api";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import axios from "axios";
import Carousel from "react-multi-carousel";
import "react-multi-carousel/lib/styles.css";

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
  const [startTime, setStartTime] = useState("");
  const [date, setDate] = useState("");
  const [phoneNumber, setPhone] = useState("");
  const [reason, setReason] = useState("");
  const [info, setInfo] = useState([]);
  const [loading, setLoading] = useState(true);
  const [buttonVisible, setButtonVisible] = useState(false);
  const [message, setMessage] = useState("");
  const [isInstance, setInstance] = useState(false);
  const [patientData, setPatientData] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [healthGoal, setHealthGoal] = useState({
    goal_name: "",
    target_date: "",
    comments: "",
    metrics: [],
    actions: [],
  });
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [selectedRecommendation, setSelectedRecommendation] = useState(null);
  const [doctorNotes, setDoctorNotes] = useState("");
  const [isActioning, setIsActioning] = useState(false);

  const toast = useToast();
  const { id } = useParams();
  const navigate = useNavigate();
  const { state } = useLocation();
  const item = state?.item || {};

  // Function to start a conversation with the patient
  const handleStartConversation = () => {
    navigate('/patient-messages', {
      state: {
        newConversation: true,
        selectedPatientId: item.id,
        patientName: `${patientData.profile_data.demographics.first_name} ${patientData.profile_data.demographics.last_name}`
      }
    });
  };

  // Helper to format ISO datetime string to "YYYY-MM-DD HH:MM"
  const formatDateTime = (isoString) => {
    return isoString.replace("T", " ").slice(0, 16);
  };

  // Appointment booking function
  const handleSubmit = async () => {
    setButtonVisible(true);
    const phone_number = phoneNumber ? `+234${phoneNumber.slice(1)}` : "";
    const formattedStartTime = formatDateTime(startTime);

    let data = {
      patient_id: item.id,
      start_time: formattedStartTime,
      reason,
      is_instant: isInstance,
    };

    // Modify payload based on whether a phone number is provided.
    if (phone_number === "") {
      delete data.phone_number;
    } else {
      delete data.patient_id;
    }

    const token = await getAccessToken();

    try {
      const response = await fetch(
        "https://health.prestigedelta.com/appointments/book/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(data),
        }
      );

      if (response.ok) {
        toast({
          title: "Appointment booked successfully!",
          description: `Your appointment is scheduled for ${startTime}.`,
          status: "success",
          duration: 5000,
          isClosable: true,
        });
        onClose();
      } else {
        const errorResult = await response.json();
        setMessage(errorResult.message);
        throw new Error("Failed to book the appointment.");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setButtonVisible(false);
    }
  };

  // Fetch available appointment slots when a date is set
  useEffect(() => {
    if (date) {
      const fetchSlots = async () => {
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
          console.error("Error fetching slots:", error);
        } finally {
          setLoading(false);
        }
      };
      fetchSlots();
    }
  }, [date]);

  // Fetch patient data
  const fetchPatientData = async () => {
    try {
      const token = await getAccessToken();
      const response = await fetch(
        `https://health.prestigedelta.com/providerdashboard/${item.id}/`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await response.json();
      setPatientData(data);
      console.log("Patient data:", data); // Add logging to see the data structure
    } catch (error) {
      console.error("Error fetching patient data:", error);
      toast({
        title: "Error fetching patient data",
        description: error.message,
        status: "error",
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatientData();
  }, [item.id]);

  // When patientData loads, update the healthGoal state for editing.
  useEffect(() => {
    if (patientData && patientData.health_goal) {
      setHealthGoal(patientData.health_goal);
    }
  }, [patientData]);

  const options = info.map((slot) => (
    <option key={slot.start_time} value={slot.start_time}>
      {slot.start_time}
    </option>
  ));

  const opt = ["Yes", "No"];

  // Organize recommendations by priority
  const recommendations = patientData?.recommendations?.recommendations || [];
  const urgentRecs = recommendations.filter((rec) => rec.priority === "high");
  const highRecs = recommendations.filter((rec) => rec.priority === "medium");
  const lowRecs = recommendations.filter((rec) => rec.priority === "low");
  const infoRecs = recommendations.filter((rec) => rec.priority === "info");

  // Function to handle opening the action modal
  const handleActionRecommendation = (recommendation) => {
    setSelectedRecommendation(recommendation);
    setDoctorNotes("");
    setActionModalOpen(true);
  };

  // Function to mark a recommendation as actioned
  const markAsActioned = async () => {
    if (!selectedRecommendation) return;

    setIsActioning(true);

    try {
      const token = await getAccessToken();
      const response = await fetch(
        `https://health.prestigedelta.com/recommendations/${selectedRecommendation.id}/mark-actioned/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            doctor_notes: doctorNotes.trim() || null,
          }),
        }
      );

      if (response.ok) {
        const updatedRecommendation = await response.json();

        // Update the recommendation in the state
        const updatedRecommendations = recommendations.map((rec) =>
          rec.id === updatedRecommendation.id ? updatedRecommendation : rec
        );

        // Update the sorted recommendations lists
        setPatientData({
          ...patientData,
          recommendations: {
            ...patientData.recommendations,
            recommendations: updatedRecommendations,
          },
        });

        toast({
          title: "Recommendation actioned",
          description: "The recommendation has been marked as actioned.",
          status: "success",
          duration: 3000,
          isClosable: true,
        });

        setActionModalOpen(false);
      } else {
        throw new Error("Failed to mark recommendation as actioned");
      }
    } catch (error) {
      console.error("Error marking recommendation as actioned:", error);
      toast({
        title: "Error",
        description: error.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsActioning(false);
    }
  };

  // Render a recommendation card with action button
  const renderRecommendationCard = (rec, colorScheme, borderColor) => {
    const isActioned = rec.actioned_at !== undefined;

    return (
      <Box
        key={rec.id}
        p={3}
        bg={isActioned ? "gray.50" : `${colorScheme}.50`}
        rounded="md"
        mb={2}
        borderLeft="4px"
        borderColor={isActioned ? "gray.300" : borderColor}
        position="relative"
        opacity={isActioned ? 0.7 : 1}
      >
        <Flex justify="space-between" align="center" mb={1}>
          <Text fontWeight="bold">{rec.title}</Text>
          {isActioned ? (
            <Badge colorScheme="green">Actioned</Badge>
          ) : (
            <Button
              size="xs"
              colorScheme="green"
              leftIcon={<CheckIcon />}
              onClick={() => handleActionRecommendation(rec)}
            >
              Mark Actioned
            </Button>
          )}
        </Flex>
        <Text fontSize="sm">{rec.recommendation}</Text>
        <Text fontSize="xs" fontStyle="italic" mt={1} color="gray.600">
          Rationale: {rec.rationale}
        </Text>
        {isActioned && (
          <Box mt={2} p={2} bg="white" rounded="md" fontSize="sm">
            <Text fontWeight="semibold">
              Actioned on: {new Date(rec.actioned_at).toLocaleDateString()}
            </Text>
            {rec.doctor_notes && (
              <>
                <Text fontWeight="semibold" mt={1}>
                  Notes:
                </Text>
                <Text>{rec.doctor_notes}</Text>
              </>
            )}
          </Box>
        )}
      </Box>
    );
  };

  const handleGenerateReport = () => {
    navigate("/ask", {
      state: {
        initialQuery: `Generate a comprehensive progress report for patient ${item.id}`,
        selectedPatientId: item.id,
      },
    });
  };

  // Chart component for displaying health metrics
  const MetricChart = ({ metric, actions }) => {
    const [selectedAction, setSelectedAction] = useState(null);
    const [showActionDetails, setShowActionDetails] = useState(false);

    // Calculate min and max values for proper Y axis scaling
    const recordedValues = metric.records ? metric.records.map(r => r.recorded_value) : [];
    const targetValue = metric.details.target_value;
    const allValues = [...recordedValues, targetValue];
    const minValue = Math.min(...allValues) * 0.9; // Add 10% padding below
    const maxValue = Math.max(...allValues) * 1.1; // Add 10% padding above

    // Process action data for relative display
    const actionRecords = actions && actions.records ? actions.records : [];
    // Normalize action values for relative display (if there are any)
    const normalizedActions = actionRecords.length ? 
      actionRecords.map(a => ({
        x: new Date(a.performed_at).toLocaleDateString(),
        y: a.value || 1, // Default to 1 if no value
        details: a
      })) : [];

    // Find corresponding dates between metrics and actions
    const dates = metric.records ? metric.records.map(r => new Date(r.recorded_at).toLocaleDateString()) : [];
    // Filter actions to only include those on dates when metrics were recorded
    const filteredActions = normalizedActions.filter(a => dates.includes(a.x));

    const chartData = {
      labels: metric.records
        ? metric.records.map(r => new Date(r.recorded_at).toLocaleDateString())
        : [],
      datasets: [
        {
          label: metric.details.metric_name,
          data: recordedValues,
          borderColor: "rgb(75, 192, 192)",
          backgroundColor: "rgba(75, 192, 192, 0.2)",
          tension: 0.1,
          yAxisID: 'y',
        },
        {
          label: "Target Value",
          data: metric.records
            ? metric.records.map(() => targetValue)
            : [],
          borderColor: "rgb(255, 205, 86)",
          backgroundColor: "rgba(255, 205, 86, 0.2)",
          borderDash: [10, 5],
          tension: 0.1,
          yAxisID: 'y'
        },
        {
          label: "Actions",
          data: filteredActions.map(a => a.y),
          borderColor: "rgb(255, 99, 132)",
          backgroundColor: "rgba(255, 99, 132, 0.5)",
          tension: 0.1,
          yAxisID: 'y1',
          pointStyle: 'rectRot',
          pointRadius: 8,
          pointHoverRadius: 12,
          pointBackgroundColor: "rgba(255, 99, 132, 0.8)"
        },
      ],
    };

    const options = {
      responsive: true,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      scales: {
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          min: minValue,
          max: maxValue,
          title: {
            display: true,
            text: metric.details.unit
          }
        },
        y1: {
          type: 'linear',
          display: false, // Hide this axis as requested
          position: 'right',
          grid: {
            drawOnChartArea: false,
          }
        }
      },
      onClick: (event, elements) => {
        if (elements.length > 0) {
          const clickedElement = elements[0];
          const datasetIndex = clickedElement.datasetIndex;
          
          // Check if clicked on action point (dataset index 2)
          if (datasetIndex === 2) {
            const index = clickedElement.index;
            setSelectedAction(filteredActions[index]);
            setShowActionDetails(true);
          }
        }
      }
    };

    const handleCloseDetails = () => {
      setShowActionDetails(false);
      setSelectedAction(null);
    };

    return (
      <Box p={4} bg="white" rounded="lg" shadow="sm">
        <Heading size="sm" mb={4}>
          {metric.details.metric_name}
        </Heading>
        <Text fontSize="xs" color="gray.500" mb={2}>
          Click on action points to see details
        </Text>
        <Line data={chartData} options={options} />
        {/* Action Details Modal */}
        <Modal isOpen={showActionDetails} onClose={handleCloseDetails} size="md">
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Action Details</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              {selectedAction && (
                <Box>
                  <Text fontWeight="bold">Date: {selectedAction.x}</Text>
                  <Text>Result: {selectedAction.details.result}</Text>
                  <Text>Compliance Rate: {selectedAction.details.compliance_rate}%</Text>
                  <Text mt={2} fontStyle="italic">
                    This action was taken as part of your health plan. Click on other action points to compare.
                  </Text>
                </Box>
              )}
            </ModalBody>
            <ModalFooter>
              <Button colorScheme="blue" onClick={handleCloseDetails}>
                Close
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </Box>
    );
  };

  // Functions for editing metrics
  const handleMetricChange = (index, field, value) => {
    const updatedMetrics = [...healthGoal.metrics];
    updatedMetrics[index] = { ...updatedMetrics[index], [field]: value };
    setHealthGoal({ ...healthGoal, metrics: updatedMetrics });
  };

  const handleRemoveMetric = (index) => {
    const updatedMetrics = [...healthGoal.metrics];
    updatedMetrics.splice(index, 1);
    setHealthGoal({ ...healthGoal, metrics: updatedMetrics });
  };

  const handleAddMetric = () => {
    const newMetric = {
      metric_name: "",
      unit: "",
      interval: 0, // default for metrics can remain 0 if desired
      target_value: 0,
    };
    setHealthGoal({ ...healthGoal, metrics: [...healthGoal.metrics, newMetric] });
  };

  // Functions for editing actions
  const handleActionChange = (index, field, value) => {
    const updatedActions = [...healthGoal.actions];
    updatedActions[index] = { ...updatedActions[index], [field]: value };
    setHealthGoal({ ...healthGoal, actions: updatedActions });
  };

  const handleRemoveAction = (index) => {
    const updatedActions = [...healthGoal.actions];
    updatedActions.splice(index, 1);
    setHealthGoal({ ...healthGoal, actions: updatedActions });
  };

  // For actions, the interval field is initialized as an empty string (so the UI shows no hard-coded "0")
  const handleAddAction = () => {
    const newAction = {
      name: "",
      description: "",
      interval: "", // no hard-coded "0"
      action_end_date: "",
    };
    setHealthGoal({ ...healthGoal, actions: [...healthGoal.actions, newAction] });
  };

  // Save updated health goal with processing to ensure intervals are sent as integers
  const handleSaveHealthGoal = async () => {
    // Process metrics and actions to convert interval and target_value to integers
    const processedHealthGoal = {
      ...healthGoal,
      metrics: healthGoal.metrics.map((metric) => ({
        ...metric,
        interval: metric.interval === "" ? 0 : parseInt(metric.interval, 10),
        target_value: metric.target_value === "" ? 0 : parseInt(metric.target_value, 10),
      })),
      actions: healthGoal.actions.map((action) => ({
        ...action,
        interval: action.interval === "" ? 0 : parseInt(action.interval, 10),
      })),
    };

    const payload = {
      patient_id: item.id,
      health_goal: processedHealthGoal,
    };

    try {
      const token = await getAccessToken();
      const response = await fetch(
        "https://health.prestigedelta.com/healthgoal/manage_goal/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );
      const result = await response.json();
      if (response.ok) {
        toast({
          title: "Health Goal Update",
          description: result.message.message,
          status: "success",
          duration: 5000,
          isClosable: true,
        });
        setPatientData({ ...patientData, health_goal: processedHealthGoal });
        setEditMode(false);
      } else {
        toast({
          title: "Error updating health goal",
          description: result.message.message || "Failed to update health goal",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      toast({
        title: "Error updating health goal",
        description: error.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  if (loading) return <Spinner />;
  if (!patientData) return <Text>No data available</Text>;
  return (
    <ChakraProvider>
      <Box
        p={6}
        bg="gray.50"
        minH="100vh"
        overflowY="auto"
        style={{ backgroundImage: "linear-gradient(to bottom, #f0f8ff, #e6f7ff)" }}
      >
        <Button leftIcon={<AiOutlineArrowLeft />} onClick={() => navigate("/dashboard")} mb={6}>
          Back to Patient List
        </Button>

        {/* Patient Overview */}
        <Box mb={8}>
          <Heading size="lg" mb={4}>
            Patient Overview
          </Heading>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
            <Box p={5} bg="white" rounded="lg" shadow="md">
              <Flex justify="space-between" align="center" mb={3}>
                <Text fontWeight="bold" fontSize="xl">
                  {patientData.profile_data.demographics.first_name} {patientData.profile_data.demographics.last_name}
                </Text>
                <Button 
                  leftIcon={<ChatIcon />}
                  colorScheme="blue" 
                  size="sm"
                  onClick={handleStartConversation}
                >
                  Start Conversation
                </Button>
              </Flex>
              <Text>Age: {patientData.profile_data.demographics.age || 
                           new Date().getFullYear() - new Date(patientData.profile_data.demographics.date_of_birth).getFullYear()}</Text>
              <Text>Gender: {patientData.profile_data.demographics.gender}</Text>
              <Text>
                Date of Birth:{" "}
                {new Date(patientData.profile_data.demographics.date_of_birth).toLocaleDateString()}
              </Text>
              <Text>
                Location: {patientData.profile_data.demographics.location.country_code}
              </Text>
              <Text mt={2}>Phone: {patientData.profile_data.demographics.phone_number}</Text>
            </Box>
            <Box p={5} bg="white" rounded="lg" shadow="md">
              <Flex justify="space-between" align="center">
                <Text fontWeight="bold">Overall Probability</Text>
                <Heading size="xl" color={
                  patientData.health_goal.overall_probability > 70 ? "green.500" : 
                  patientData.health_goal.overall_probability > 40 ? "yellow.500" : "red.500"
                }>
                  {patientData.health_goal.overall_probability}%
                </Heading>
              </Flex>
              <Text mt={2} fontSize="sm" color="gray.600">Expected Progress: {patientData.health_goal.expected_progress}%</Text>
              <Text fontSize="sm" color="gray.600">Current Progress: {patientData.health_goal.progress}%</Text>
              <Text mt={3} fontSize="sm">Height: {patientData.profile_data.lifestyle.biometrics.height} cm</Text>
              <Text fontSize="sm">Weight: {patientData.profile_data.lifestyle.biometrics.weight} kg</Text>
              <Text fontSize="sm">BMI: {patientData.profile_data.lifestyle.biometrics.bmi}</Text>
            </Box>
          </SimpleGrid>
        </Box>

        {/* Alerts & Recommendations */}
        <Box mb={8}>
          <Heading size="md" mb={4}>
            Alerts & Recommendations
          </Heading>
          <Box p={5} bg="white" rounded="lg" shadow="md">
            <Flex justify="space-between" align="center" mb={4}>
              <Text fontWeight="bold">Priority Alerts</Text>
              <Box>
                <Badge colorScheme="red" mr={2}>Urgent: {patientData.recommendations.urgent_count}</Badge>
                <Badge colorScheme="orange">High: {patientData.recommendations.high_count}</Badge>
              </Box>
            </Flex>
            {urgentRecs.length > 0 && (
              <Box mb={4}>
                <Text fontWeight="semibold" color="red.500" mb={2}>Urgent - Immediate Action Required</Text>
                {urgentRecs.map(rec => renderRecommendationCard(rec, "red", "red.500"))}
              </Box>
            )}
            {urgentRecs.length === 0 && highRecs.length === 0 ? (
              <Text color="green.500" fontWeight="medium">No urgent actions required at this time.</Text>
            ) : (
              <>
                {highRecs.length > 0 && (
                  <Box mb={4}>
                    <Text fontWeight="semibold" color="orange.500" mb={2}>High Priority - Action Within 24 Hours</Text>
                    {highRecs.slice(0, 3).map(rec => renderRecommendationCard(rec, "orange", "orange.500"))}
                    {highRecs.length > 3 && (
                      <Button size="sm" colorScheme="orange" variant="outline" mt={2}>
                        View {highRecs.length - 3} more high priority alerts
                      </Button>
                    )}
                  </Box>
                )}
              </>
            )}
            <Flex justify="flex-end">
              <Button size="sm" colorScheme="blue" rightIcon={<AiOutlineArrowRight />}>
                View All Recommendations ({patientData.recommendations.total_count})
              </Button>
            </Flex>
          </Box>
        </Box>

        {/* Health Goal Section */}
        <Box mb={8}>
          <Heading size="md" mb={4}>
            Health Goal
          </Heading>
          {editMode ? (
            <Box p={6} bg="white" rounded="lg" shadow="sm">
              <Heading size="md" mb={4}>
                Edit Health Goal
              </Heading>
              <FormControl mb={4}>
                <FormLabel>Goal Name</FormLabel>
                <Input
                  value={healthGoal.goal_name}
                  onChange={(e) =>
                    setHealthGoal({ ...healthGoal, goal_name: e.target.value })
                  }
                />
              </FormControl>
              <FormControl mb={4}>
                <FormLabel>Target Date</FormLabel>
                <Input
                  type="date"
                  value={healthGoal.target_date}
                  onChange={(e) =>
                    setHealthGoal({ ...healthGoal, target_date: e.target.value })
                  }
                />
              </FormControl>
              <FormControl mb={4}>
                <FormLabel>Comments</FormLabel>
                <Textarea
                  value={healthGoal.comments}
                  onChange={(e) =>
                    setHealthGoal({ ...healthGoal, comments: e.target.value })
                  }
                />
              </FormControl>
              {/* Metrics Editing */}
              <Box mb={4}>
                <Heading size="sm" mb={2}>
                  Metrics
                </Heading>
                {healthGoal.metrics &&
                  healthGoal.metrics.map((metric, index) => (
                    <Box
                      key={index}
                      borderWidth="1px"
                      borderColor="gray.200"
                      rounded="md"
                      p={2}
                      mb={2}
                    >
                      <FormControl mb={2}>
                        <FormLabel>Metric Name</FormLabel>
                        <Input
                          value={metric.metric_name}
                          onChange={(e) =>
                            handleMetricChange(index, "metric_name", e.target.value)
                          }
                        />
                      </FormControl>
                      <FormControl mb={2}>
                        <FormLabel>Unit</FormLabel>
                        <Input
                          value={metric.unit}
                          onChange={(e) =>
                            handleMetricChange(index, "unit", e.target.value)
                          }
                        />
                      </FormControl>
                      <FormControl mb={2}>
                        <FormLabel>Interval (hours)</FormLabel>
                        <Input
                          type="number"
                          value={metric.interval}
                          onChange={(e) =>
                            handleMetricChange(index, "interval", parseInt(e.target.value) || 0)
                          }
                        />
                      </FormControl>
                      <FormControl mb={2}>
                        <FormLabel>Target Value</FormLabel>
                        <Input
                          type="number"
                          value={metric.target_value}
                          onChange={(e) =>
                            handleMetricChange(index, "target_value", parseInt(e.target.value) || 0)
                          }
                        />
                      </FormControl>
                      <Button
                        colorScheme="red"
                        size="sm"
                        onClick={() => handleRemoveMetric(index)}
                      >
                        Remove Metric
                      </Button>
                    </Box>
                  ))}
                <Button colorScheme="blue" size="sm" onClick={handleAddMetric}>
                  Add Metric
                </Button>
              </Box>
              {/* Actions Editing */}
              <Box mb={4}>
                <Heading size="sm" mb={2}>
                  Actions
                </Heading>
                {healthGoal.actions &&
                  healthGoal.actions.map((action, index) => (
                    <Box
                      key={index}
                      borderWidth="1px"
                      borderColor="gray.200"
                      rounded="md"
                      p={2}
                      mb={2}
                    >
                      <FormControl mb={2}>
                        <FormLabel>Action Name</FormLabel>
                        <Input
                          value={action.name}
                          onChange={(e) =>
                            handleActionChange(index, "name", e.target.value)
                          }
                        />
                      </FormControl>
                      <FormControl mb={2}>
                        <FormLabel>Description</FormLabel>
                        <Textarea
                          value={action.description}
                          onChange={(e) =>
                            handleActionChange(index, "description", e.target.value)
                          }
                        />
                      </FormControl>
                      <FormControl mb={2}>
                        <FormLabel>Interval (hours)</FormLabel>
                        <Input
                          type="number"
                          value={action.interval}
                          onChange={(e) =>
                            handleActionChange(index, "interval", e.target.value)
                          }
                        />
                      </FormControl>
                      <FormControl mb={2}>
                        <FormLabel>Action End Date</FormLabel>
                        <Input
                          type="date"
                          value={action.action_end_date}
                          onChange={(e) =>
                            handleActionChange(index, "action_end_date", e.target.value)
                          }
                        />
                      </FormControl>
                      <Button
                        colorScheme="red"
                        size="sm"
                        onClick={() => handleRemoveAction(index)}
                      >
                        Remove Action
                      </Button>
                    </Box>
                  ))}
                <Button colorScheme="blue" size="sm" onClick={handleAddAction}>
                  Add Action
                </Button>
              </Box>
              <Button colorScheme="green" mr={3} onClick={handleSaveHealthGoal}>
                Save
              </Button>
              <Button
                onClick={() => {
                  setEditMode(false);
                  setHealthGoal(patientData.health_goal);
                }}
              >
                Cancel
              </Button>
            </Box>
          ) : (
            <Box p={6} bg="white" rounded="lg" shadow="sm">
              <Flex justify="space-between" align="center">
                <Heading size="md" mb={2}>
                  {patientData.health_goal.goal_name}
                </Heading>
                <Button onClick={() => setEditMode(true)}>Edit</Button>
              </Flex>
              <Text color="gray.600" mb={2}>
                Target Date:{" "}
                {new Date(patientData.health_goal.target_date).toLocaleDateString()}
              </Text>
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} mt={4}>
                <Box>
                  <Text mb={4}>{patientData.health_goal.comments}</Text>
                  {patientData.health_goal.metrics &&
                    patientData.health_goal.metrics.map((metric, index) => (
                      <Box key={index} mb={2}>
                        <Flex justify="space-between">
                          <Text>{metric.metric_name}</Text>
                          <Text>
                            Target: {metric.target_value} {metric.unit}
                          </Text>
                        </Flex>
                        <Flex justify="space-between">
                          <Text fontSize="sm" color="gray.500">Current: {metric.current_value} {metric.unit}</Text>
                          <Badge colorScheme={metric.status === "on_track" ? "green" : "yellow"}>
                            {metric.status === "on_track" ? "On Track" : "Needs Attention"}
                          </Badge>
                        </Flex>
                      </Box>
                    ))}
                </Box>
                <Box>
                  <Box mb={4} p={3} bg="gray.50" rounded="md">
                    <Text fontWeight="semibold">Overall Assessment</Text>
                    <Text fontSize="sm" mt={2}>{patientData.health_goal.overall_rationale}</Text>
                  </Box>
                  <SimpleGrid columns={2} spacing={4} mb={4}>
                    <Box p={3} bg="blue.50" rounded="md" textAlign="center">
                      <Text fontWeight="bold" fontSize="lg">{patientData.health_goal.overall_compliance_rate}%</Text>
                      <Text fontSize="sm">Compliance Rate</Text>
                    </Box>
                    <Box p={3} bg="green.50" rounded="md" textAlign="center">
                      <Text fontWeight="bold" fontSize="lg">{patientData.health_goal.streak_count}</Text>
                      <Text fontSize="sm">Day Streak</Text>
                    </Box>
                  </SimpleGrid>
                  <Box>
                    <Heading size="sm" mb={2}>
                      Action Items
                    </Heading>
                    {patientData.health_goal.actions &&
                      patientData.health_goal.actions.map((action, index) => (
                        <Box key={index} p={3} bg="gray.50" rounded="md" mb={2}>
                          <Text fontWeight="bold">{action.name}</Text>
                          <Text fontSize="sm">{action.description}</Text>
                          {action.interval > 0 && (
                            <Text fontSize="xs" color="gray.500">Every {action.interval} hours</Text>
                          )}
                        </Box>
                      ))}
                  </Box>
                </Box>
              </SimpleGrid>
            </Box>
          )}
        </Box>

        {/* Health Metrics Carousel */}
        <Box mb={8}>
          <Heading size="md" mb={4}>
            Health Metrics
          </Heading>
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
                partialVisibilityGutter: 40,
              },
              tablet: {
                breakpoint: { max: 1024, min: 464 },
                items: 1,
                partialVisibilityGutter: 30,
              },
              mobile: {
                breakpoint: { max: 464, min: 0 },
                items: 1,
                partialVisibilityGutter: 0,
              },
            }}
            showDots={false}
            slidesToSlide={1}
            swipeable
          >
            {Object.entries(patientData.time_series.metrics).map(([key, metric]) => (
              <MetricChart
                key={key}
                metric={metric}
                actions={
                  patientData.time_series.actions[
                    Object.keys(patientData.time_series.actions)[0]
                  ]
                }
              />
            ))}
          </Carousel>
        </Box>

        {/* Latest Medical Review Section */}
        <Box mb={8}>
          <Heading size="md" mb={4}>
            Latest Medical Review
          </Heading>
          <Box p={5} bg="white" rounded="lg" shadow="md">
            <Box mb={4} pb={2} borderBottom="1px" borderColor="gray.200">
              <Text fontWeight="bold" color="gray.600">
                Last Review Date
              </Text>
              <Text color="blue.600">
                {new Date(
                  patientData.medical_reviews[0]?.created_at ||
                    patientData.medical_reviews[0]?.updated_at
                ).toLocaleString()}
              </Text>
            </Box>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
              <Box>
                <Text fontWeight="bold" color="blue.600">
                  Chief Complaint
                </Text>
                <Text mb={4}>{patientData.medical_reviews[0]?.chief_complaint}</Text>
                <Text fontWeight="bold" color="blue.600">
                  History of Present Illness
                </Text>
                <Text mb={4}>
                  {patientData.medical_reviews[0]?.history_of_present_illness}
                </Text>
                <Text fontWeight="bold" color="blue.600">
                  Assessment
                </Text>
                <Text mb={4}>
                  {patientData.medical_reviews[0]?.assessment_diagnosis}
                </Text>
                <Text fontWeight="bold" color="blue.600">
                  Treatment Plan
                </Text>
                <Text mb={4}>
                  {patientData.medical_reviews[0]?.management_plan}
                </Text>
              </Box>
              <Box>
                <Text fontWeight="bold" color="blue.600">
                  Physical Examination
                </Text>
                <Text mb={4}>
                  {patientData.medical_reviews[0]?.physical_examination_findings}
                </Text>
                <Text fontWeight="bold" color="blue.600">
                  Investigation Results
                </Text>
                <Text mb={4}>
                  {patientData.medical_reviews[0]?.investigation_results}
                </Text>
                <Text fontWeight="bold" color="blue.600">
                  Lifestyle Advice
                </Text>
                <Text mb={4}>
                  {patientData.medical_reviews[0]?.lifestyle_advice}
                </Text>
                <Text fontWeight="bold" color="blue.600">
                  Follow-up Plan
                </Text>
                <Text mb={4}>
                  {patientData.medical_reviews[0]?.follow_up_plan}
                </Text>
                <Text fontWeight="bold" color="blue.600">
                  Status
                </Text>
                <Text
                  mb={4}
                  color={
                    patientData.medical_reviews[0]?.status === "stable"
                      ? "green.500"
                      : "yellow.500"
                  }
                >
                  {patientData.medical_reviews[0]?.status?.toUpperCase()}
                </Text>
              </Box>
              {patientData.medical_reviews[0]?.prescriptions?.length > 0 && (
                <Box gridColumn={{ md: "span 2" }}>
                  <Text fontWeight="bold" color="blue.600" mb={2}>
                    Prescriptions
                  </Text>
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
          <Heading size="md" mb={4}>
            Progress Report
          </Heading>
          <Button colorScheme="blue" onClick={handleGenerateReport} mb={4}>
            Generate Progress Report
          </Button>
        </Box>
      </Box>

      {/* Appointment Booking Modal */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Book Call Appointment</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormLabel>Do you want to start an Instant call?</FormLabel>
            <Select
              placeholder="Select Yes or No"
              onChange={(e) => setInstance(e.target.value === "Yes")}
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
              {buttonVisible ? <Spinner size="sm" /> : "Submit"}
            </Button>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Action Recommendation Modal */}
      <Modal isOpen={actionModalOpen} onClose={() => setActionModalOpen(false)}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Mark Recommendation as Actioned</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedRecommendation && (
              <>
                <Text fontWeight="bold" mb={2}>{selectedRecommendation.title}</Text>
                <Text fontSize="sm" mb={4}>{selectedRecommendation.recommendation}</Text>
                <FormControl>
                  <FormLabel>Doctor Notes (Optional)</FormLabel>
                  <Textarea
                    value={doctorNotes}
                    onChange={(e) => setDoctorNotes(e.target.value)}
                    placeholder="Add any notes about how this recommendation was handled..."
                    rows={4}
                  />
                </FormControl>
              </>
            )}
          </ModalBody>
          <ModalFooter>
            <Button 
              colorScheme="green" 
              mr={3} 
              onClick={markAsActioned}
              isLoading={isActioning}
            >
              Confirm
            </Button>
            <Button variant="ghost" onClick={() => setActionModalOpen(false)}>
              Cancel
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </ChakraProvider>
  );
};

export default Details;