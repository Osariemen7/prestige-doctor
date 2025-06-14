import React, { useEffect, useState, useRef } from "react";
import {
  ChakraProvider,
  Box,
  Button,
  Flex,
  Heading,
  Text,
  Spinner,
  useToast,
  useDisclosure,
  Container,
  Icon,
  VStack,
  HStack,
  useColorModeValue,
  IconButton,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  theme,
  extendTheme,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Divider,
  Badge,
  Progress,
  Tooltip,
  Tag,
  Link,
  Grid,
  GridItem,
} from "@chakra-ui/react";
import { AiOutlineArrowLeft, AiOutlineHome, AiOutlineUser, AiOutlineCalendar, AiOutlineMail } from "react-icons/ai";
import { FiRefreshCw, FiActivity, FiArrowRight, FiClock, FiClipboard, FiBarChart2, FiChevronDown, FiMessageSquare, FiPhone } from "react-icons/fi";
import { MdInsights, MdOutlineAssignment, MdHealthAndSafety, MdTimeline } from "react-icons/md";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { getAccessToken } from "./api";
import axios from "axios";

// Import custom components
import PatientOverview from "./detail/PatientOverview";
import AlertsRecommendations from "./detail/AlertsRecommendations";
import HealthGoalSection from "./detail/HealthGoalSection";
import HealthMetricsCarousel from "./detail/HealthMetricsCarousel";
import MedicalReviewSection from "./detail/MedicalReviewSection";
import ProgressReportSection from "./detail/ProgressReportSection";
import AppointmentModal from "./detail/AppointmentModal";
import ActionRecommendationModal from "./detail/ActionRecommendationModal";

// Extend theme with custom colors for medical interface
const customTheme = extendTheme({
  ...theme,
  colors: {
    ...theme.colors,
    brand: {
      50: "#e6f2ff",
      100: "#b3d9ff",
      500: "#0066cc",
      600: "#0052a3",
      700: "#003d7a",
    },
    clinicalPrimary: {
      50: "#e6f7ff",
      100: "#b3e6ff",
      500: "#0099cc",
      600: "#007aa3",
      700: "#005b7a",
    },
    timeline: {
      100: "#e3f2fd",
      200: "#bbdefb",
      500: "#2196f3",
      600: "#1e88e5",
    },
    careplan: {
      100: "#e8f5e9",
      500: "#4caf50",
      600: "#43a047",
    },
    insight: {
      100: "#f3e5f5",
      500: "#9c27b0", 
      600: "#8e24aa",
    }
  },
  components: {
    Button: {
      baseStyle: {
        fontWeight: "500",
      },
      variants: {
        solid: {
          _hover: {
            transform: "translateY(-1px)",
            boxShadow: "sm",
          },
          transition: "all 0.2s",
        },
        outline: {
          _hover: {
            transform: "translateY(-1px)",
            boxShadow: "sm",
          },
          transition: "all 0.2s",
        },
      },
    },
    Card: {
      baseStyle: {
        container: {
          transition: "all 0.2s",
          _hover: {
            transform: "translateY(-2px)",
            boxShadow: "md",
          },
        },
      },
    },
  },
  styles: {
    global: {
      html: {
        height: "100%",
        scrollBehavior: "smooth",
      },
      body: {
        bg: "gray.50",
        minHeight: "100%",
      },
      "#root": {
        height: "auto",
        minHeight: "100vh",
      },
      ".chakra-tabs__tab": {
        _selected: {
          fontWeight: "600",
          boxShadow: "none",
          borderColor: "blue.500",
        },
        transition: "all 0.2s",
      },
      ".patient-card": {
        transition: "all 0.3s",
        _hover: {
          transform: "translateY(-2px)",
          boxShadow: "md",
        },
      },
    }
  }
});

const Details = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [patientData, setPatientData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedRecommendation, setSelectedRecommendation] = useState(null);
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [doctorNotes, setDoctorNotes] = useState("");
  const [isActioning, setIsActioning] = useState(false);
  const [selectedSection, setSelectedSection] = useState("overview");
  const [journeyStep, setJourneyStep] = useState(0);
  
  // Refs for scroll navigation
  const overviewRef = useRef(null);
  const alertsRef = useRef(null);
  const healthGoalRef = useRef(null);
  const metricsRef = useRef(null);
  
  const toast = useToast();
  const { id } = useParams();
  const navigate = useNavigate();
  const { state } = useLocation();
  const item = state?.item || {};

  // Fetch patient data
  const fetchPatientData = async () => {
    try {
      const token = await getAccessToken();
      const response = await fetch(
        `https://service.prestigedelta.com/providerdashboard/${item.id}/`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await response.json();
      setPatientData(data);
      console.log("Patient data:", data);
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

  // Function to smoothly scroll to a section
  const scrollToSection = (ref) => {
    if (ref && ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleUpdate = () => {
    const review_id = item.id
    navigate('/patient-update', { state: { review_id} }); // Navigate using the ID
  };
  
  // Journey navigation
  const patientJourneySteps = [
    { name: "Overview", icon: AiOutlineUser, ref: overviewRef },
    { name: "Alerts", icon: FiActivity, ref: alertsRef },
    { name: "Health Goals", icon: MdHealthAndSafety, ref: healthGoalRef },
    { name: "Metrics", icon: FiBarChart2, ref: metricsRef },
  ];

  const nextJourneyStep = () => {
    if (journeyStep < patientJourneySteps.length - 1) {
      const nextStep = journeyStep + 1;
      setJourneyStep(nextStep);
      scrollToSection(patientJourneySteps[nextStep].ref);
    }
  };

  const previousJourneyStep = () => {
    if (journeyStep > 0) {
      const prevStep = journeyStep - 1;
      setJourneyStep(prevStep);
      scrollToSection(patientJourneySteps[prevStep].ref);
    }
  };
  
  const goToJourneyStep = (index) => {
    setJourneyStep(index);
    scrollToSection(patientJourneySteps[index].ref);
  };

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
        `https://service.prestigedelta.com/recommendations/${selectedRecommendation.id}/mark-actioned/`,
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
        const updatedRecommendations = patientData.recommendations.recommendations.map((rec) =>
          rec.id === updatedRecommendation.id ? updatedRecommendation : rec
        );

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

        // Enhanced modal closing to restore scrolling
        setActionModalOpen(false);
        setTimeout(() => {
          document.body.style.overflow = "auto";
        }, 100);
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

  // Create an enhanced modal close function
  const handleCloseActionModal = () => {
    setActionModalOpen(false);
    setTimeout(() => {
      document.body.style.overflow = "auto";
    }, 100);
  };

  // Function to update health goal
  const updateHealthGoal = (updatedHealthGoal) => {
    setPatientData({
      ...patientData,
      health_goal: updatedHealthGoal
    });
  };

  // Refresh patient data
  const refreshPatientData = () => {
    setLoading(true);
    fetchPatientData();
  };

  // Get urgent alert count
  const getUrgentAlertCount = () => {
    if (!patientData?.recommendations?.recommendations) return 0;
    return patientData.recommendations.recommendations.filter(rec => rec.priority === "urgent" && !rec.actioned_at).length;
  };

  // Get high priority alert count
  const getHighPriorityAlertCount = () => {
    if (!patientData?.recommendations?.recommendations) return 0;
    return patientData.recommendations.recommendations.filter(rec => rec.priority === "high" && !rec.actioned_at).length;
  };

  // Fetch pending AI medical reviews that need doctor approval
  const [pendingReviews, setPendingReviews] = useState([]);
  const [approvedReviews, setApprovedReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [selectedReview, setSelectedReview] = useState(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);

  const fetchMedicalReviews = async () => {
    if (!item.id) return;
    
    setLoadingReviews(true);
    try {
      const token = await getAccessToken();
      
      // Fetch pending reviews
      const pendingResponse = await fetch(
        `https://service.prestigedelta.com/medicalreview/pending-ai/?patient_id=${item.id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      // Fetch approved reviews
      const approvedResponse = await fetch(
        `https://service.prestigedelta.com/medicalreview/approved/?patient_id=${item.id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      if (pendingResponse.ok && approvedResponse.ok) {
        const pendingData = await pendingResponse.json();
        const approvedData = await approvedResponse.json();
        
        setPendingReviews(pendingData);
        setApprovedReviews(approvedData);
      } else {
        throw new Error("Failed to fetch medical reviews");
      }
    } catch (error) {
      console.error("Error fetching medical reviews:", error);
      toast({
        title: "Error fetching medical reviews",
        description: error.message,
        status: "error",
        duration: 3000,
      });
    } finally {
      setLoadingReviews(false);
    }
  };

  // Function to view details of a specific review
  const viewReviewDetails = (review) => {
    setSelectedReview(review);
    setReviewModalOpen(true);
  };

  // Function to approve a pending review
  const approveReview = async (reviewId) => {
    try {
      const token = await getAccessToken();
      const response = await fetch(
        `https://service.prestigedelta.com/medicalreview/${reviewId}/approve/`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      
      if (response.ok) {
        toast({
          title: "Review approved",
          description: "Medical review has been successfully approved.",
          status: "success",
          duration: 3000,
        });
        
        // Refresh the reviews
        fetchMedicalReviews();
        
        // Close the modal if open
        if (reviewModalOpen) {
          setReviewModalOpen(false);
        }
      } else {
        throw new Error("Failed to approve review");
      }
    } catch (error) {
      console.error("Error approving review:", error);
      toast({
        title: "Error approving review",
        description: error.message,
        status: "error",
        duration: 3000,
      });
    }
  };

  // Function to reject a pending review
  const rejectReview = async (reviewId) => {
    try {
      const token = await getAccessToken();
      const response = await fetch(
        `https://service.prestigedelta.com/medicalreview/${reviewId}/reject/`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      
      if (response.ok) {
        toast({
          title: "Review rejected",
          description: "Medical review has been rejected.",
          status: "success",
          duration: 3000,
        });
        
        // Refresh the reviews
        fetchMedicalReviews();
        
        // Close the modal if open
        if (reviewModalOpen) {
          setReviewModalOpen(false);
        }
      } else {
        throw new Error("Failed to reject review");
      }
    } catch (error) {
      console.error("Error rejecting review:", error);
      toast({
        title: "Error rejecting review",
        description: error.message,
        status: "error",
        duration: 3000,
      });
    }
  };

  // Format the review of systems JSON
  const formatReviewOfSystems = (reviewOfSystems) => {
    try {
      // Return empty array for falsy values
      if (!reviewOfSystems) return [];
      
      // If already an array, return it directly
      if (Array.isArray(reviewOfSystems)) return reviewOfSystems;
      
      // Handle string representation
      if (typeof reviewOfSystems === 'string') {
        try {
          const parsed = JSON.parse(reviewOfSystems);
          
          // Check if the parsed result is an array
          if (Array.isArray(parsed)) {
            return parsed;
          } else {
            console.warn("Review of systems parsed but not an array:", parsed);
            // Try to convert object to array if possible
            if (parsed && typeof parsed === 'object') {
              return [parsed]; // Convert single object to array with one item
            }
            return [];
          }
        } catch (parseError) {
          console.error("Error parsing review of systems JSON:", parseError);
          return [];
        }
      }
      
      // If it's an object but not an array, wrap it in an array
      if (typeof reviewOfSystems === 'object') {
        return [reviewOfSystems];
      }
      
      // Fallback - return empty array
      console.warn("Unknown format for review of systems:", reviewOfSystems);
      return [];
    } catch (error) {
      console.error("Unexpected error handling review of systems:", error);
      return [];
    }
  };

  useEffect(() => {
    if (patientData) {
      fetchMedicalReviews();
    }
  }, [patientData]);

  return (
    <ChakraProvider theme={customTheme}>
      <Box 
        w="100%" 
        bgGradient="linear(to-br, blue.50, gray.50)" 
        pb={10}
        pt={2}
        minHeight="100vh"
        className="detail-page-container"
      >
        <Container 
          maxW="1400px"
          px={{ base: 2, md: 4 }}
        >
          {/* Sticky Navigation Header */}
          <Box 
            position="sticky" 
            top="0" 
            zIndex="docked" 
            py={2}
            bg="rgba(255, 255, 255, 0.95)" 
            backdropFilter="blur(8px)" 
            borderBottom="1px" 
            borderColor="gray.100" 
            rounded="lg" 
            mb={4} 
            px={4}
            shadow="sm"
          >
            <Grid templateColumns="repeat(12, 1fr)" gap={4}>
              <GridItem colSpan={{ base: 12, md: 3 }}>
                <Button 
                  leftIcon={<AiOutlineArrowLeft />} 
                  onClick={() => navigate("/dashboard")}
                  size="md"
                  variant="outline"
                  colorScheme="gray"
                  w={{ base: "full", md: "auto" }}
                  mb={{ base: 2, md: 0 }}
                >
                  Back to Patients
                </Button>
              </GridItem>
              
              <GridItem colSpan={{ base: 12, md: 6 }}>
                <Breadcrumb separator=">" fontSize="sm" color="gray.600" display={{ base: "none", md: "flex" }}>
                  <BreadcrumbItem>
                    <BreadcrumbLink href="/dashboard">
                      <Flex align="center">
                        <Icon as={AiOutlineHome} mr={1} />
                        Dashboard
                      </Flex>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbItem>
                    <BreadcrumbLink href="/dashboard">
                      <Flex align="center">
                        <Icon as={AiOutlineUser} mr={1} />
                        Patients
                      </Flex>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbItem isCurrentPage>
                    <Text>
                      {patientData?.profile_data?.demographics?.first_name} {patientData?.profile_data?.demographics?.last_name}
                    </Text>
                  </BreadcrumbItem>
                </Breadcrumb>
                
                {/* Mobile Patient Name */}
                {patientData && (
                  <Text 
                    fontWeight="medium" 
                    display={{ base: "block", md: "none" }}
                    fontSize="lg"
                  >
                    {patientData?.profile_data?.demographics?.first_name} {patientData?.profile_data?.demographics?.last_name}
                  </Text>
                )}
                
                {/* Patient Journey Navigation Tabs (desktop) */}
                <HStack spacing={6} display={{ base: "none", md: "flex" }} justifyContent="center" mt={1}>
                  {patientJourneySteps.map((step, index) => (
                    <Button 
                      key={index}
                      variant="ghost"
                      size="sm"
                      leftIcon={<Icon as={step.icon} />}
                      onClick={() => goToJourneyStep(index)}
                      color={journeyStep === index ? "blue.600" : "gray.600"}
                      fontWeight={journeyStep === index ? "semibold" : "medium"}
                      borderBottom={journeyStep === index ? "2px" : "0px"}
                      borderColor="blue.500"
                      borderRadius="0"
                      _hover={{ bg: "transparent", color: "blue.500" }}
                    >
                      {step.name}
                      {step.name === "Alerts" && getUrgentAlertCount() > 0 && (
                        <Badge ml={1} colorScheme="red" borderRadius="full">
                          {getUrgentAlertCount()}
                        </Badge>
                      )}
                    </Button>
                  ))}
                </HStack>
              </GridItem>
              
              <GridItem colSpan={{ base: 12, md: 3 }} textAlign={{ base: "center", md: "right" }}>
                <HStack spacing={2} justify={{ base: "center", md: "flex-end" }}>
                  <Menu>
                    <MenuButton 
                      as={Button} 
                      rightIcon={<FiChevronDown />} 
                      colorScheme="blue"
                      size="md"
                    >
                      Take Action
                    </MenuButton>
                    <MenuList>
                      <MenuItem icon={<AiOutlineCalendar />} onClick={onOpen}>Schedule Appointment</MenuItem>
                      <MenuItem icon={<FiMessageSquare />} onClick={() => navigate("/patient-messages", { 
                        state: { 
                          newConversation: true,
                          selectedPatientId: item.id,
                          patientName: `${patientData?.profile_data?.demographics?.first_name || ""} ${patientData?.profile_data?.demographics?.last_name || ""}`
                        } 
                      })}>
                        Message Patient
                      </MenuItem>
                      <MenuItem icon={<MdOutlineAssignment />} onClick={() => navigate(`/patient/${item.id}/progress-report`)}>
                        Create Progress Report
                      </MenuItem>
                      <MenuItem icon={<FiClipboard />} onClick={handleUpdate}>Update Medical Record</MenuItem>
                    </MenuList>
                  </Menu>
                  
                  <Tooltip label="Refresh patient data">
                    <IconButton
                      icon={<FiRefreshCw />}
                      onClick={refreshPatientData}
                      isLoading={loading}
                      aria-label="Refresh patient data"
                      colorScheme="gray"
                      variant="ghost"
                    />
                  </Tooltip>
                </HStack>
              </GridItem>
            </Grid>

            {/* Mobile Journey Steps */}
            <Box mt={4} display={{ base: "block", md: "none" }}>
              <HStack spacing={1}>
                <Button
                  size="sm"
                  variant="ghost"
                  isDisabled={journeyStep === 0}
                  onClick={previousJourneyStep}
                >
                  Previous
                </Button>
                <Progress 
                  value={((journeyStep + 1) / patientJourneySteps.length) * 100} 
                  size="sm" 
                  colorScheme="blue" 
                  borderRadius="full"
                  flex="1"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  isDisabled={journeyStep === patientJourneySteps.length - 1}
                  onClick={nextJourneyStep}
                >
                  Next
                </Button>
              </HStack>
              <Text fontSize="sm" textAlign="center" mt={1}>
                {patientJourneySteps[journeyStep].name}
              </Text>
            </Box>
          </Box>

          {loading ? (
            <Flex justify="center" align="center" h="60vh">
              <VStack spacing={4}>
                <Spinner size="xl" thickness="4px" color="blue.500" />
                <Text>Loading patient information...</Text>
              </VStack>
            </Flex>
          ) : !patientData ? (
            <Flex justify="center" align="center" h="60vh" bg="white" borderRadius="md" boxShadow="sm">
              <VStack spacing={4}>
                <Icon as={FiActivity} boxSize={10} color="gray.300" />
                <Text>No data available for this patient</Text>
                <Button colorScheme="blue" onClick={() => navigate("/dashboard")}>
                  Return to Dashboard
                </Button>
              </VStack>
            </Flex>
          ) : (
            <>
              {/* Patient Timeline & Story */}
              <Box mb={8} p={4} bg="white" rounded="lg" shadow="sm">
                <Heading size="md" mb={4} color="gray.700" borderBottom="2px" borderColor="timeline.200" pb={2}>
                  <Flex align="center">
                    <Icon as={MdTimeline} mr={2} color="timeline.500" />
                    Patient Journey
                  </Flex>
                </Heading>
                <Box position="relative">
                  <Box
                    position="absolute"
                    left="24px"
                    top="0"
                    bottom="0"
                    width="2px"
                    bg="timeline.100"
                    zIndex={1}
                  />
                  
                  <VStack spacing={6} position="relative" align="stretch">
                    {/* Initial Assessment */}
                    <HStack spacing={4} position="relative">
                      <Flex
                        boxSize="50px"
                        bg="timeline.100"
                        color="timeline.600"
                        rounded="full"
                        align="center"
                        justify="center"
                        border="2px"
                        borderColor="timeline.500"
                        shadow="md"
                        zIndex={2}
                      >
                        <Icon as={MdHealthAndSafety} boxSize={6} />
                      </Flex>
                      <Box bg="gray.50" p={4} rounded="md" shadow="sm" flex="1">
                        <Flex justify="space-between" align="center" mb={2}>
                          <Text fontWeight="bold">Initial Assessment</Text>
                          <Text fontSize="sm" color="gray.500">
                            {new Date(patientData.profile_data?.demographics?.onboarding_date || Date.now()).toLocaleDateString()}
                          </Text>
                        </Flex>
                        <Text fontSize="sm">
                          Patient joined with primary health goal: <b>{patientData.health_goal?.goal_name || "Not specified"}</b>.
                        </Text>
                        <Text fontSize="sm" mt={1}>
                          {patientData.health_goal?.streak_count ? (
                            <span>Has been consistent for <b>{patientData.health_goal?.streak_count} days</b>.</span>
                          ) : "Has not started tracking consistently yet."}
                        </Text>
                        <HStack mt={3}>
                          <Tag size="sm" colorScheme="blue">Initial Consultation</Tag>
                          <Tag size="sm" colorScheme="green">Health Goal Set</Tag>
                        </HStack>
                      </Box>
                    </HStack>
                    
                    {/* Current Status */}
                    <HStack spacing={4} position="relative">
                      <Flex
                        boxSize="50px"
                        bg="timeline.100"
                        color="timeline.600"
                        rounded="full"
                        align="center"
                        justify="center"
                        border="2px"
                        borderColor="timeline.500"
                        shadow="md"
                        zIndex={2}
                      >
                        <Icon as={FiActivity} boxSize={6} />
                      </Flex>
                      <Box bg="gray.50" p={4} rounded="md" shadow="sm" flex="1">
                        <Flex justify="space-between" align="center" mb={2}>
                          <Text fontWeight="bold">Current Status</Text>
                          <Text fontSize="sm" color="gray.500">Present</Text>
                        </Flex>
                        <Text fontSize="sm">
                          {patientData.health_goal?.overall_probability > 70 ? (
                            "Patient is progressing well towards their health goal."
                          ) : patientData.health_goal?.overall_probability > 50 ? (
                            "Patient is making progress but requires some attention."
                          ) : (
                            "Patient needs immediate intervention to achieve health goal."
                          )}
                        </Text>
                        <Text fontSize="sm" mt={1}>
                          Overall probability of success: <b>{patientData.health_goal?.overall_probability || 0}%</b>
                        </Text>
                        <HStack mt={3}>
                          <Tag 
                            size="sm" 
                            colorScheme={
                              patientData.health_goal?.overall_probability > 70 ? "green" :
                              patientData.health_goal?.overall_probability > 50 ? "yellow" : 
                              "red"
                            }
                          >
                            {patientData.health_goal?.overall_probability > 70 ? "On Track" :
                             patientData.health_goal?.overall_probability > 50 ? "Needs Attention" : 
                             "At Risk"}
                          </Tag>
                          <Tag size="sm" colorScheme="purple">
                            {getUrgentAlertCount()} alerts
                          </Tag>
                        </HStack>
                        
                        {/* Next Steps */}
                        <Box mt={4} p={3} bg="blue.50" rounded="md">
                          <Text fontWeight="bold" fontSize="sm" mb={2}>Recommended Next Steps:</Text>
                          <VStack spacing={2} align="stretch">
                            {getUrgentAlertCount() > 0 && (
                              <Button 
                                size="sm" 
                                leftIcon={<FiArrowRight />} 
                                colorScheme="red" 
                                variant="solid" 
                                onClick={() => goToJourneyStep(1)} // Go to alerts
                              >
                                Address {getUrgentAlertCount()} urgent alerts
                              </Button>
                            )}
                            <Button 
                              size="sm" 
                              leftIcon={<AiOutlineCalendar />} 
                              colorScheme="blue" 
                              variant="outline"
                              onClick={onOpen}
                            >
                              Schedule follow-up appointment
                            </Button>
                            <Button 
                              size="sm" 
                              leftIcon={<MdOutlineAssignment />} 
                              colorScheme="blue" 
                              variant="outline" 
                              onClick={() => navigate(`/patient/${item.id}/progress-report`)}
                            >
                              Create progress report
                            </Button>
                          </VStack>
                        </Box>
                      </Box>
                    </HStack>
                    
                    {/* Future Projections */}
                    <HStack spacing={4} position="relative" opacity={0.7}>
                      <Flex
                        boxSize="50px"
                        bg="gray.100"
                        color="gray.500"
                        rounded="full"
                        align="center"
                        justify="center"
                        border="2px"
                        borderColor="gray.300"
                        zIndex={2}
                      >
                        <Icon as={MdInsights} boxSize={6} />
                      </Flex>
                      <Box bg="gray.50" p={4} rounded="md" shadow="sm" flex="1" borderStyle="dashed" borderWidth="1px" borderColor="gray.200">
                        <Flex justify="space-between" align="center" mb={2}>
                          <Text fontWeight="bold">Projected Outcome</Text>
                          <Text fontSize="sm" color="gray.500">
                            {new Date(patientData.health_goal?.target_date || Date.now()).toLocaleDateString()}
                          </Text>
                        </Flex>
                        <Text fontSize="sm">
                          Based on current trajectory, patient has a {patientData.health_goal?.overall_probability || 0}% probability of 
                          achieving the target goal by {new Date(patientData.health_goal?.target_date || Date.now()).toLocaleDateString()}.
                        </Text>
                        <HStack mt={3}>
                          <Tag size="sm" colorScheme="purple" variant="outline">Prediction</Tag>
                          <Tag size="sm" colorScheme="blue" variant="outline">Target Date</Tag>
                        </HStack>
                      </Box>
                    </HStack>
                  </VStack>
                </Box>
              </Box>
              
              {/* Main Content Grid */}
              <Grid templateColumns="repeat(12, 1fr)" gap={6}>
                {/* Main Content Area */}
                <GridItem colSpan={{ base: 12, lg: 8 }}>
                  {/* Patient Overview */}
                  <Box ref={overviewRef} id="patient-overview" mb={8} scrollMarginTop="120px">
                    <PatientOverview 
                      patientData={patientData} 
                      navigate={navigate}
                      patientId={item.id}
                    />
                  </Box>

                  {/* Medical Reviews Section */}
                  <Box id="medical-reviews" mb={8} scrollMarginTop="120px">
                    <Flex
                      bg="white"
                      p={5}
                      rounded="lg"
                      shadow="md"
                      flexDirection="column"
                      borderTop="4px"
                      borderColor="blue.500"
                    >
                      <Heading size="md" mb={4} color="gray.700">
                        <Flex align="center">
                          <Icon as={FiClipboard} mr={2} color="blue.500" />
                          Medical Reviews
                        </Flex>
                      </Heading>

                      {loadingReviews ? (
                        <Flex justify="center" align="center" p={8}>
                          <Spinner size="lg" color="blue.500" />
                        </Flex>
                      ) : (
                        <Tabs variant="enclosed" colorScheme="blue">
                          <TabList mb={4}>
                            <Tab>Pending Reviews ({pendingReviews.length})</Tab>
                            <Tab>Approved Reviews ({approvedReviews.length})</Tab>
                          </TabList>
                          <TabPanels>
                            {/* Pending Reviews Tab */}
                            <TabPanel p={0}>
                              {pendingReviews.length === 0 ? (
                                <Box p={6} textAlign="center" bg="gray.50" rounded="md">
                                  <Text>No pending reviews available.</Text>
                                </Box>
                              ) : (
                                <VStack spacing={4} align="stretch">
                                  {pendingReviews.map((review) => (
                                    <Box 
                                      key={review.id}
                                      p={4}
                                      bg="blue.50"
                                      rounded="md"
                                      borderLeft="4px"
                                      borderColor="blue.500"
                                    >
                                      <Flex justify="space-between" align="center" mb={2}>
                                        <Heading size="sm">{review.assessment_diagnosis}</Heading>
                                        <Badge colorScheme="yellow">Pending Approval</Badge>
                                      </Flex>
                                      
                                      <Text fontSize="sm" mb={1}>
                                        <b>Patient:</b> {review.patient_full_name}
                                      </Text>
                                      
                                      <Text fontSize="sm" mb={1}>
                                        <b>Chief Complaint:</b> {review.chief_complaint}
                                      </Text>
                                      
                                      <Text fontSize="sm" mb={3}>
                                        <b>Created:</b> {new Date(review.created).toLocaleString()}
                                      </Text>
                                      
                                      <HStack spacing={3} mt={2}>
                                        <Button 
                                          size="sm" 
                                          colorScheme="blue" 
                                          onClick={() => viewReviewDetails(review)}
                                        >
                                          View Details
                                        </Button>
                                        <Button 
                                          size="sm" 
                                          colorScheme="green" 
                                          onClick={() => approveReview(review.id)}
                                        >
                                          Approve
                                        </Button>
                                        <Button 
                                          size="sm" 
                                          colorScheme="red" 
                                          variant="outline"
                                          onClick={() => rejectReview(review.id)}
                                        >
                                          Reject
                                        </Button>
                                      </HStack>
                                    </Box>
                                  ))}
                                </VStack>
                              )}
                            </TabPanel>
                            
                            {/* Approved Reviews Tab */}
                            <TabPanel p={0}>
                              {approvedReviews.length === 0 ? (
                                <Box p={6} textAlign="center" bg="gray.50" rounded="md">
                                  <Text>No approved reviews available.</Text>
                                </Box>
                              ) : (
                                <VStack spacing={4} align="stretch">
                                  {approvedReviews.map((review) => (
                                    <Box 
                                      key={review.id}
                                      p={4}
                                      bg="green.50"
                                      rounded="md"
                                      borderLeft="4px"
                                      borderColor="green.500"
                                    >
                                      <Flex justify="space-between" align="center" mb={2}>
                                        <Heading size="sm">{review.assessment_diagnosis}</Heading>
                                        <Badge colorScheme="green">Approved</Badge>
                                      </Flex>
                                      
                                      <Text fontSize="sm" mb={1}>
                                        <b>Patient:</b> {review.patient_full_name}
                                      </Text>
                                      
                                      <Text fontSize="sm" mb={1}>
                                        <b>Chief Complaint:</b> {review.chief_complaint}
                                      </Text>
                                      
                                      <Text fontSize="sm" mb={3}>
                                        <b>Created:</b> {new Date(review.created).toLocaleString()}
                                      </Text>
                                      
                                      <Button 
                                        size="sm" 
                                        colorScheme="blue" 
                                        onClick={() => viewReviewDetails(review)}
                                      >
                                        View Details
                                      </Button>
                                    </Box>
                                  ))}
                                </VStack>
                              )}
                            </TabPanel>
                          </TabPanels>
                        </Tabs>
                      )}
                    </Flex>
                  </Box>

                  {/* Alerts & Recommendations */}
                  <Box ref={alertsRef} id="alerts-recommendations" mb={8} scrollMarginTop="120px">
                    <AlertsRecommendations 
                      patientData={patientData} 
                      handleActionRecommendation={handleActionRecommendation} 
                    />
                  </Box>

                  {/* Health Goal Section */}
                  <Box ref={healthGoalRef} id="health-goal" mb={8} scrollMarginTop="120px">
                    <HealthGoalSection 
                      patientData={patientData} 
                      patientId={item.id}
                      updateHealthGoal={updateHealthGoal}
                      toast={toast}
                    />
                  </Box>

                  {/* Health Metrics Carousel */}
                  <Box ref={metricsRef} id="health-metrics" mb={8} scrollMarginTop="120px">
                    <HealthMetricsCarousel patientData={patientData} />
                  </Box>
                  
                  {/* Medical Review Modal */}
                  {reviewModalOpen && selectedReview && (
                    <Box
                      position="fixed"
                      top="0"
                      left="0"
                      right="0"
                      bottom="0"
                      bg="rgba(0, 0, 0, 0.7)"
                      zIndex="modal"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      onClick={() => setReviewModalOpen(false)}
                    >
                      <Box
                        bg="white"
                        p={6}
                        rounded="lg"
                        shadow="xl"
                        maxW="800px"
                        w="90%"
                        maxH="90vh"
                        overflowY="auto"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Flex justify="space-between" align="center" mb={4}>
                          <Heading size="lg">Medical Review</Heading>
                          <Badge 
                            colorScheme={selectedReview.review_status === "approved" ? "green" : "yellow"}
                            p={2}
                            fontSize="md"
                          >
                            {selectedReview.review_status === "approved" ? "Approved" : "Pending Approval"}
                          </Badge>
                        </Flex>
                        
                        <Divider mb={4} />
                        
                        <Grid templateColumns="1fr 1fr" gap={6} mb={4}>
                          <Box>
                            <Text fontWeight="bold" mb={1}>Patient:</Text>
                            <Text mb={3}>{selectedReview.patient_full_name}</Text>
                            
                            <Text fontWeight="bold" mb={1}>Status:</Text>
                            <Text mb={3}>{selectedReview.status}</Text>
                          </Box>
                          <Box>
                            <Text fontWeight="bold" mb={1}>Created:</Text>
                            <Text mb={3}>{new Date(selectedReview.created).toLocaleString()}</Text>
                            
                            <Text fontWeight="bold" mb={1}>Last Updated:</Text>
                            <Text mb={3}>{new Date(selectedReview.updated).toLocaleString()}</Text>
                          </Box>
                        </Grid>
                        
                        <Box mb={4} p={3} bg="gray.50" rounded="md">
                          <Text fontWeight="bold" mb={1}>Chief Complaint:</Text>
                          <Text>{selectedReview.chief_complaint}</Text>
                        </Box>
                        
                        <Box mb={4}>
                          <Text fontWeight="bold" mb={1}>History of Present Illness:</Text>
                          <Text>{selectedReview.history_of_present_illness}</Text>
                        </Box>
                        
                        <Box mb={4}>
                          <Text fontWeight="bold" mb={1}>Review of Systems:</Text>
                          <Box p={3} bg="gray.50" rounded="md">
                            {formatReviewOfSystems(selectedReview.review_of_systems).map((item, index) => (
                              <Box key={index} mb={index < formatReviewOfSystems(selectedReview.review_of_systems).length - 1 ? 3 : 0}>
                                <Text fontWeight="semibold">{item.system}:</Text>
                                <Text>Symptoms: {item.symptoms}</Text>
                                {item.comments && <Text>Comments: {item.comments}</Text>}
                              </Box>
                            ))}
                          </Box>
                        </Box>
                        
                        <Box mb={4}>
                          <Text fontWeight="bold" mb={1}>Physical Examination Findings:</Text>
                          <Text>{selectedReview.physical_examination_findings}</Text>
                        </Box>
                        
                        <Box mb={4} p={3} bg="blue.50" rounded="md">
                          <Text fontWeight="bold" mb={1}>Assessment & Diagnosis:</Text>
                          <Text mb={3}>{selectedReview.assessment_diagnosis}</Text>
                          
                          <Text fontWeight="bold" mb={1}>Diagnosis Reasoning:</Text>
                          <Text>{selectedReview.diagnosis_reason}</Text>
                        </Box>
                        
                        <Box mb={4} p={3} bg="green.50" rounded="md">
                          <Text fontWeight="bold" mb={1}>Management Plan:</Text>
                          <Text mb={3}>{selectedReview.management_plan}</Text>
                          
                          <Text fontWeight="bold" mb={1}>Management Plan Reasoning:</Text>
                          <Text>{selectedReview.management_plan_reason}</Text>
                        </Box>
                        
                        <Box mb={4}>
                          <Text fontWeight="bold" mb={1}>Lifestyle Advice:</Text>
                          <Text>{selectedReview.lifestyle_advice}</Text>
                        </Box>
                        
                        <Box mb={4}>
                          <Text fontWeight="bold" mb={1}>Patient Education:</Text>
                          <Text>{selectedReview.patient_education}</Text>
                        </Box>
                        
                        <Box mb={4}>
                          <Text fontWeight="bold" mb={1}>Follow-up Plan:</Text>
                          <Text>{selectedReview.follow_up_plan}</Text>
                        </Box>
                        
                        {selectedReview.prescriptions && selectedReview.prescriptions.length > 0 && (
                          <Box mb={4} p={3} bg="purple.50" rounded="md">
                            <Text fontWeight="bold" mb={2}>Prescriptions:</Text>
                            {selectedReview.prescriptions.map((prescription, index) => (
                              <Box key={index} mb={index < selectedReview.prescriptions.length - 1 ? 4 : 0}>
                                <Text fontWeight="semibold">Prescription #{prescription.id}</Text>
                                <Text mb={1}>Created: {new Date(prescription.created).toLocaleString()}</Text>
                                <Text mb={1}>Sent to patient: {prescription.sent_to_patient ? "Yes" : "No"}</Text>
                                
                                <Box mt={2}>
                                  <Text fontWeight="semibold">Medications:</Text>
                                  {prescription.medications.map((med, idx) => (
                                    <Box key={idx} ml={3} mt={1}>
                                      <Text fontWeight="medium">{med.name} - {med.dosage}</Text>
                                      <Text>Route: {med.route}</Text>
                                      <Text>Instructions: {med.instructions}</Text>
                                    </Box>
                                  ))}
                                </Box>
                                
                                {prescription.pdf_url && (
                                  <Link href={prescription.pdf_url} isExternal color="blue.500" mt={2} display="inline-block">
                                    View Prescription PDF
                                  </Link>
                                )}
                              </Box>
                            ))}
                          </Box>
                        )}
                        
                        <Divider my={4} />
                        
                        <Flex justify="space-between">
                          <Button onClick={() => setReviewModalOpen(false)}>
                            Close
                          </Button>
                          
                          {selectedReview.review_status !== "approved" && (
                            <HStack>
                              <Button 
                                colorScheme="green" 
                                onClick={() => approveReview(selectedReview.id)}
                              >
                                Approve Review
                              </Button>
                              <Button 
                                colorScheme="red" 
                                variant="outline"
                                onClick={() => rejectReview(selectedReview.id)}
                              >
                                Reject Review
                              </Button>
                            </HStack>
                          )}
                        </Flex>
                      </Box>
                    </Box>
                  )}
                </GridItem>
                
                {/* Sidebar */}
                <GridItem colSpan={{ base: 12, lg: 4 }}>
                  <Box 
                    position={{ base: "relative", lg: "sticky" }}
                    top="120px"
                    maxH={{ base: "auto", lg: "calc(100vh - 140px)" }}
                    overflowY={{ base: "visible", lg: "auto" }}
                  >
                    {/* Quick Actions Card */}
                    <Box 
                      p={5} 
                      bg="white" 
                      rounded="lg" 
                      shadow="md" 
                      mb={6}
                      borderTop="4px"
                      borderColor="blue.500"
                    >
                      <Heading size="md" mb={4} color="gray.700">
                        Quick Actions
                      </Heading>
                      <VStack spacing={3} align="stretch">
                        <Button 
                          leftIcon={<AiOutlineCalendar />} 
                          colorScheme="blue"
                          onClick={onOpen}
                          justifyContent="flex-start"
                        >
                          Schedule Appointment
                        </Button>
                        <Button 
                          leftIcon={<AiOutlineMail />} 
                          colorScheme="green"
                          onClick={() => navigate("/patient-messages", { 
                            state: { 
                              newConversation: true,
                              selectedPatientId: item.id,
                              patientName: `${patientData.profile_data?.demographics?.first_name || ""} ${patientData.profile_data?.demographics?.last_name || ""}`
                            } 
                          })}
                          justifyContent="flex-start"
                        >
                          Message Patient
                        </Button>
                        <Button 
                          leftIcon={<FiPhone />} 
                          colorScheme="teal"
                          onClick={() => window.open(`tel:${patientData.profile_data?.demographics?.phone_number || ""}`)}
                          justifyContent="flex-start"
                        >
                          Call Patient
                        </Button>
                        <Button 
                          leftIcon={<MdOutlineAssignment />} 
                          colorScheme="purple"
                          onClick={() => navigate(`/patient/${item.id}/progress-report`)}
                          justifyContent="flex-start"
                        >
                          Create Progress Report
                        </Button>
                      </VStack>
                    </Box>
                    
                    {/* Upcoming Appointments Card */}
                    <Box 
                      p={5} 
                      bg="white" 
                      rounded="lg" 
                      shadow="md" 
                      mb={6}
                      borderTop="4px"
                      borderColor="careplan.500"
                    >
                      <Heading size="md" mb={4} color="gray.700">
                        <Flex align="center">
                          <Icon as={AiOutlineCalendar} mr={2} color="careplan.500" />
                          Upcoming Appointments
                        </Flex>
                      </Heading>
                      <Box px={1} pb={2}>
                        {/* This would be populated with real data */}
                        <Box 
                          p={4} 
                          bg="careplan.100" 
                          rounded="md" 
                          mb={3} 
                          borderLeft="4px" 
                          borderColor="careplan.500"
                        >
                          <Flex justify="space-between" align="center" mb={1}>
                            <Badge colorScheme="green">Upcoming</Badge>
                            <Text fontSize="sm" color="gray.500">In 3 days</Text>
                          </Flex>
                          <Text fontWeight="semibold">Follow-up Consultation</Text>
                          <Text fontSize="sm">
                            {new Date(Date.now() + 3*24*60*60*1000).toLocaleDateString()} - 10:30 AM
                          </Text>
                          <HStack mt={3} spacing={2}>
                            <Button size="xs" colorScheme="blue" variant="outline">
                              Reschedule
                            </Button>
                            <Button size="xs" colorScheme="red" variant="ghost">
                              Cancel
                            </Button>
                          </HStack>
                        </Box>
                        <Button size="sm" colorScheme="careplan" variant="outline" leftIcon={<AiOutlineCalendar />} w="full">
                          Schedule New Appointment
                        </Button>
                      </Box>
                    </Box>
                    
                    {/* Patient Insights Card */}
                    <Box 
                      p={5} 
                      bg="white" 
                      rounded="lg" 
                      shadow="md"
                      borderTop="4px"
                      borderColor="insight.500"
                    >
                      <Heading size="md" mb={4} color="gray.700">
                        <Flex align="center">
                          <Icon as={MdInsights} mr={2} color="insight.500" />
                          Patient Insights
                        </Flex>
                      </Heading>
                      <Box px={1} pb={2}>
                        <VStack spacing={4} align="stretch">
                          <Box p={3} bg="insight.100" rounded="md">
                            <Text fontWeight="semibold" fontSize="sm" mb={1}>Adherence Pattern</Text>
                            <Text fontSize="sm">
                              Patient shows highest medication adherence on weekday mornings, with decreased compliance on weekends.
                            </Text>
                            <Link fontSize="xs" color="insight.600" mt={2} display="inline-block">
                              View detailed pattern →
                            </Link>
                          </Box>
                          
                          <Box p={3} bg="insight.100" rounded="md">
                            <Text fontWeight="semibold" fontSize="sm" mb={1}>Health Goal Progress</Text>
                            <Text fontSize="sm">
                              Weight control goal is on track. Exercise consistency needs improvement.
                            </Text>
                            <Link fontSize="xs" color="insight.600" mt={2} display="inline-block">
                              View progress charts →
                            </Link>
                          </Box>
                          
                          <Box p={3} bg="insight.100" rounded="md">
                            <Text fontWeight="semibold" fontSize="sm" mb={1}>Communication Preference</Text>
                            <Text fontSize="sm">
                              Patient responds best to SMS reminders sent in the morning (8-10am).
                            </Text>
                          </Box>
                        </VStack>
                        
                        <Button 
                          size="sm" 
                          colorScheme="insight" 
                          variant="outline" 
                          leftIcon={<MdInsights />} 
                          w="full" 
                          mt={4}
                          onClick={() => navigate(`/patient/${item.id}/insights`)}
                        >
                          View All Insights
                        </Button>
                      </Box>
                    </Box>
                  </Box>
                </GridItem>
              </Grid>
              
              {/* Progress Report Section */}
              <Box mt={8}>
                <ProgressReportSection navigate={navigate} patientId={item.id} />
              </Box>
              
              {/* Journey Navigation Buttons */}
              <Box position="fixed" bottom="20px" right="20px" zIndex={10}>
                <HStack>
                  <Button
                    leftIcon={<AiOutlineArrowLeft />}
                    colorScheme="blue"
                    isDisabled={journeyStep === 0}
                    onClick={previousJourneyStep}
                    display={{ base: "none", md: "flex" }}
                  >
                    Previous
                  </Button>
                  <Button
                    rightIcon={<FiArrowRight />}
                    colorScheme="blue"
                    isDisabled={journeyStep === patientJourneySteps.length - 1}
                    onClick={nextJourneyStep}
                  >
                    {journeyStep < patientJourneySteps.length - 1 ? `Next: ${patientJourneySteps[journeyStep + 1].name}` : "Complete"}
                  </Button>
                </HStack>
              </Box>
            </>
          )}
        </Container>
      </Box>

      {/* Appointment Booking Modal */}
      <AppointmentModal 
        isOpen={isOpen} 
        onClose={onClose} 
        patientId={item.id}
        toast={toast}
      />

      {/* Action Recommendation Modal */}
      <ActionRecommendationModal
        isOpen={actionModalOpen}
        onClose={handleCloseActionModal}
        selectedRecommendation={selectedRecommendation}
        doctorNotes={doctorNotes}
        setDoctorNotes={setDoctorNotes}
        markAsActioned={markAsActioned}
        isActioning={isActioning}
      />
    </ChakraProvider>
  );
};

export default Details;
