import React from "react";
import {
  Box,
  Button,
  Flex,
  Heading,
  Text,
  SimpleGrid,
  Badge,
  Icon,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Divider,
  Avatar,
  HStack,
  VStack,
  Tooltip,
} from "@chakra-ui/react";
import { ChatIcon, PhoneIcon, EmailIcon, StarIcon } from "@chakra-ui/icons";
import { FaBirthdayCake, FaMapMarkerAlt, FaWeight, FaRulerVertical } from "react-icons/fa";

const PatientOverview = ({ patientData, navigate, patientId }) => {
  // Function to start a conversation with the patient
  const handleStartConversation = () => {
    navigate("/patient-messages", {
      state: {
        newConversation: true,
        selectedPatientId: patientId,
        patientName: `${patientData.profile_data?.demographics?.first_name || ""} ${patientData.profile_data?.demographics?.last_name || ""}`,
      },
    });
  };

  // Extract patient name for avatar
  const demographics = patientData.profile_data?.demographics || {};
  const lifestyle = patientData.profile_data?.lifestyle || {};
  const biometrics = lifestyle.biometrics || {};
  const healthGoal = patientData.health_goal || {};
  const location = demographics.location || {};

  const firstName = demographics.first_name || "";
  const lastName = demographics.last_name || "";
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`;

  // Calculate overall health status
  const healthStatus = 
    healthGoal.overall_probability > 70 ? "Good" :
    healthGoal.overall_probability > 50 ? "Fair" : "Needs Attention";
  
  const healthStatusColor = 
    healthGoal.overall_probability > 70 ? "green" :
    healthGoal.overall_probability > 50 ? "yellow" : "red";

  return (
    <Box mb={8} id="patient-overview">
      <Heading size="lg" mb={4} color="gray.700" borderBottom="2px" borderColor="blue.100" pb={2}>
        <Flex align="center">
          Patient Overview
          <Badge ml={3} colorScheme={healthStatusColor} fontSize="0.6em" p={1}>
            {healthStatus}
          </Badge>
        </Flex>
      </Heading>
      
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
        {/* Patient Demographics Card */}
        <Box p={6} bg="white" rounded="lg" shadow="md" borderTop="4px" borderColor="blue.400" position="relative">
          <Flex mb={4}>
            <Avatar 
              size="xl" 
              name={initials} 
              bg="blue.400" 
              color="white"
              mr={4}
            />
            <Box>
              <Flex align="center" mb={1}>
                <Heading size="lg" fontWeight="bold">
                  {firstName} {lastName}
                </Heading>
                {demographics.gender && (
                  <Badge ml={2} colorScheme="purple">
                    {demographics.gender}
                  </Badge>
                )}
              </Flex>
              
              <Text fontSize="md" color="gray.600" mb={2}>
                Patient ID: {patientId}
              </Text>
              
              <HStack spacing={4} mt={2}>
                <Button
                  leftIcon={<ChatIcon />}
                  colorScheme="blue"
                  size="sm"
                  onClick={handleStartConversation}
                  boxShadow="sm"
                >
                  Message
                </Button>
                <Button
                  leftIcon={<PhoneIcon />}
                  colorScheme="green"
                  variant="outline"
                  size="sm"
                >
                  Call
                </Button>
              </HStack>
            </Box>
          </Flex>
          
          <Divider my={4} />
          
          <SimpleGrid columns={2} spacing={4}>
            <VStack align="start" spacing={2}>
              <Flex align="center">
                <Icon as={FaBirthdayCake} color="blue.500" mr={2} />
                <Text>
                  Age:{" "}
                  <Text as="span" fontWeight="bold">
                    {demographics.age || (demographics.date_of_birth ? new Date().getFullYear() - new Date(demographics.date_of_birth).getFullYear() : "N/A")}
                  </Text>
                </Text>
              </Flex>
              
              <Flex align="center">
                <Icon as={FaMapMarkerAlt} color="blue.500" mr={2} />
                <Text>
                  Location:{" "}
                  <Text as="span" fontWeight="bold">
                    {location.country_code || "N/A"}
                  </Text>
                </Text>
              </Flex>

              <Flex align="center">
                <EmailIcon color="blue.500" mr={2} />
                <Text isTruncated maxW="200px">
                  Email: <Text as="span" fontWeight="bold">
                    {demographics.email || "N/A"}
                  </Text>
                </Text>
              </Flex>
            </VStack>
            
            <VStack align="start" spacing={2}>
              <Flex align="center">
                <PhoneIcon color="blue.500" mr={2} />
                <Text>
                  Phone:{" "}
                  <Text as="span" fontWeight="bold">
                    {demographics.phone_number || "N/A"}
                  </Text>
                </Text>
              </Flex>
              
              <Flex align="center">
                <Icon as={FaRulerVertical} color="blue.500" mr={2} />
                <Text>
                  Height:{" "}
                  <Text as="span" fontWeight="bold">
                    {biometrics.height ? `${biometrics.height} cm` : "N/A"}
                  </Text>
                </Text>
              </Flex>
              
              <Flex align="center">
                <Icon as={FaWeight} color="blue.500" mr={2} />
                <Text>
                  Weight:{" "}
                  <Text as="span" fontWeight="bold">
                    {biometrics.weight ? `${biometrics.weight} kg` : "N/A"}
                  </Text>
                </Text>
              </Flex>
            </VStack>
          </SimpleGrid>
        </Box>

        {/* Health Metrics Card */}
        <Box p={6} bg="white" rounded="lg" shadow="md" borderTop="4px" borderColor="green.400">
          <Heading size="md" mb={4} color="gray.700">
            Health Progress
          </Heading>
          
          <SimpleGrid columns={2} spacing={6} mb={6}>
            <Stat>
              <StatLabel color="gray.600">Overall Probability</StatLabel>
              <StatNumber fontSize="3xl" color={`${healthStatusColor}.500`}>
                {healthGoal.overall_probability !== undefined ? `${healthGoal.overall_probability}%` : "N/A"}
              </StatNumber>
              <StatHelpText>
                <Flex align="center">
                  <Box 
                    w="full" 
                    h="8px" 
                    bg="gray.100" 
                    borderRadius="full" 
                    position="relative"
                  >
                    <Box 
                      h="8px" 
                      bg={`${healthStatusColor}.400`}
                      borderRadius="full"
                      w={healthGoal.overall_probability !== undefined ? `${healthGoal.overall_probability}%` : "0%"}
                    />
                  </Box>
                </Flex>
              </StatHelpText>
            </Stat>
            
            <Stat>
              <StatLabel color="gray.600">Progress to Goal</StatLabel>
              <Flex align="baseline">
                <StatNumber fontSize="3xl" color="blue.500">
                  {healthGoal.progress !== undefined ? `${healthGoal.progress}%` : "N/A"}
                </StatNumber>
                <Text fontSize="md" ml={2} color="gray.600">
                  of {healthGoal.expected_progress !== undefined ? `${healthGoal.expected_progress}%` : "N/A"}
                </Text>
              </Flex>
              <StatHelpText>
                <Flex align="center">
                  <Box 
                    w="full" 
                    h="8px" 
                    bg="gray.100" 
                    borderRadius="full" 
                    position="relative"
                  >
                    <Box 
                      h="8px" 
                      bg="blue.400"
                      borderRadius="full"
                      w={healthGoal.progress !== undefined && healthGoal.expected_progress ? `${(healthGoal.progress / healthGoal.expected_progress) * 100}%` : "0%"}
                    />
                  </Box>
                </Flex>
              </StatHelpText>
            </Stat>
          </SimpleGrid>
          
          <Divider my={4} />
          
          <SimpleGrid columns={2} spacing={4}>
            <Stat>
              <StatLabel fontSize="sm" color="gray.600">BMI</StatLabel>
              <StatNumber fontSize="xl">
                {biometrics.bmi !== undefined ? biometrics.bmi : "N/A"}
              </StatNumber>
              <StatHelpText fontSize="xs">
                {biometrics.bmi !== undefined ? (
                  biometrics.bmi < 18.5 ? "Underweight" :
                  biometrics.bmi < 25 ? "Normal" :
                  biometrics.bmi < 30 ? "Overweight" : "Obese"
                ) : "N/A"}
              </StatHelpText>
            </Stat>
            
            <Stat>
              <StatLabel fontSize="sm" color="gray.600">Compliance Rate</StatLabel>
              <StatNumber fontSize="xl">
                {healthGoal.overall_compliance_rate !== undefined ? `${healthGoal.overall_compliance_rate}%` : "N/A"}
              </StatNumber>
              <StatHelpText fontSize="xs">
                <Flex align="center">
                  <Icon as={StarIcon} color="yellow.400" mr={1} />
                  <Text>{healthGoal.streak_count !== undefined ? `${healthGoal.streak_count}-day streak` : "N/A"}</Text>
                </Flex>
              </StatHelpText>
            </Stat>
          </SimpleGrid>
        </Box>
      </SimpleGrid>
    </Box>
  );
};

export default PatientOverview;
