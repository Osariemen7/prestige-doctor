import React, { useEffect, useState } from "react";
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
  useColorModeValue,
  IconButton,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  theme,
  extendTheme,
} from "@chakra-ui/react";
import { AiOutlineArrowLeft, AiOutlineHome, AiOutlineUser } from "react-icons/ai";
import { FiRefreshCw } from "react-icons/fi";
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
  },
  styles: {
    global: {
      html: {
        height: "100%",
        overflowY: "scroll", // Force scrollbar to be always present
      },
      body: {
        bg: "gray.50",
        minHeight: "100%",
        overflowY: "auto",
      },
      "#root": {
        height: "auto", // Allow root to expand with content
        minHeight: "100vh",
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
        `https://health.prestigedelta.com/providerdashboard/${item.id}/`,
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

  return (
    <ChakraProvider theme={customTheme}>
      <Box 
        w="100%" 
        bgGradient="linear(to-b, blue.50, gray.50)" 
        pb={10}
        pt={2}
        height="auto" // Allow height to adjust to content
        className="detail-page-container" // Add a class for potential CSS targeting
      >
        <Container 
          maxW="1400px"
          px={4}
        >
          {/* Header with navigation */}
          <Box mb={6}>
            <Breadcrumb separator=">" mb={4} fontSize="sm" color="gray.600">
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

            <Flex 
              justify="space-between" 
              align="center" 
              bg="white" 
              p={3} 
              borderRadius="lg" 
              boxShadow="sm"
              mb={6}
            >
              <Button 
                leftIcon={<AiOutlineArrowLeft />} 
                onClick={() => navigate("/dashboard")}
                size="md"
                variant="outline"
                colorScheme="gray"
              >
                Back to Patients
              </Button>
              
              <Flex align="center">
                <Text fontWeight="medium" mr={3} color="gray.600">
                  Last updated: {new Date().toLocaleString()}
                </Text>
                <IconButton
                  icon={<FiRefreshCw />}
                  onClick={refreshPatientData}
                  isLoading={loading}
                  aria-label="Refresh patient data"
                  colorScheme="blue"
                  variant="ghost"
                />
              </Flex>
            </Flex>
          </Box>

          {loading ? (
            <Flex justify="center" align="center" h="50vh">
              <VStack spacing={4}>
                <Spinner size="xl" thickness="4px" color="blue.500" />
                <Text>Loading patient information...</Text>
              </VStack>
            </Flex>
          ) : !patientData ? (
            <Flex justify="center" align="center" h="50vh" bg="white" borderRadius="md" boxShadow="sm">
              <Text>No data available for this patient</Text>
            </Flex>
          ) : (
            <>
              {/* Patient Overview */}
              <PatientOverview 
                patientData={patientData} 
                navigate={navigate}
                patientId={item.id}
              />

              {/* Alerts & Recommendations */}
              <AlertsRecommendations 
                patientData={patientData} 
                handleActionRecommendation={handleActionRecommendation} 
              />

              {/* Health Goal Section */}
              <HealthGoalSection 
                patientData={patientData} 
                patientId={item.id}
                updateHealthGoal={updateHealthGoal}
                toast={toast}
              />

              {/* Health Metrics Carousel */}
              <HealthMetricsCarousel patientData={patientData} />

              {/* Latest Medical Review Section */}
              <MedicalReviewSection patientData={patientData} />

              {/* Progress Report Section */}
              <ProgressReportSection navigate={navigate} patientId={item.id} />
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
        onClose={handleCloseActionModal} // Use enhanced close handler
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