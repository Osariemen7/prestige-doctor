import React from "react";
import {
  Box,
  Button,
  Flex,
  Heading,
  Text,
  Badge,
  Icon,
  HStack,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Tooltip,
  Divider,
} from "@chakra-ui/react";
import { CheckIcon, WarningIcon, InfoIcon, TimeIcon } from "@chakra-ui/icons";
import { AiOutlineArrowRight } from "react-icons/ai";
import { FiAlertTriangle, FiAlertCircle } from "react-icons/fi";

const AlertsRecommendations = ({ patientData, handleActionRecommendation }) => {
  // Organize recommendations by priority
  const recommendations = patientData?.recommendations?.recommendations || [];
  const urgentRecs = recommendations.filter((rec) => rec.priority === "high");
  const highRecs = recommendations.filter((rec) => rec.priority === "medium");
  const lowRecs = recommendations.filter((rec) => rec.priority === "low");
  const infoRecs = recommendations.filter((rec) => rec.priority === "info");

  // Priority icon mapping
  const priorityIcons = {
    high: FiAlertTriangle,
    medium: FiAlertCircle,
    low: TimeIcon,
    info: InfoIcon
  };

  // Render a recommendation card with action button
  const renderRecommendationCard = (rec, colorScheme, borderColor) => {
    const isActioned = rec.actioned_at !== undefined;
    const PriorityIcon = priorityIcons[rec.priority];

    return (
      <Box
        key={rec.id}
        p={4}
        bg={isActioned ? "gray.50" : `${colorScheme}.50`}
        rounded="md"
        mb={3}
        borderLeft="4px"
        borderColor={isActioned ? "gray.300" : borderColor}
        position="relative"
        opacity={isActioned ? 0.7 : 1}
        transition="all 0.2s"
        _hover={{ transform: "translateY(-2px)", boxShadow: "sm" }}
      >
        <Flex justify="space-between" align="center" mb={2}>
          <HStack spacing={2}>
            <Icon as={PriorityIcon} color={`${colorScheme}.500`} boxSize={5} />
            <Text fontWeight="bold" fontSize="md">
              {rec.title}
            </Text>
          </HStack>
          {isActioned ? (
            <Badge colorScheme="green" p={2} borderRadius="md">
              <Flex align="center">
                <CheckIcon mr={1} />
                Actioned
              </Flex>
            </Badge>
          ) : (
            <Tooltip label="Mark this recommendation as complete">
              <Button
                size="sm"
                colorScheme="green"
                leftIcon={<CheckIcon />}
                onClick={() => handleActionRecommendation(rec)}
                boxShadow="sm"
              >
                Mark Complete
              </Button>
            </Tooltip>
          )}
        </Flex>
        
        <Text fontSize="sm" pl={7} mb={2}>
          {rec.recommendation}
        </Text>
        
        <Flex fontSize="xs" fontStyle="italic" mt={2} color="gray.600" pl={7}>
          <InfoIcon mr={2} />
          <Text>
            Rationale: {rec.rationale}
          </Text>
        </Flex>
        
        {isActioned && (
          <Box mt={3} p={3} bg="white" rounded="md" fontSize="sm" boxShadow="xs">
            <Text fontWeight="semibold" color="green.600">
              Actioned on: {new Date(rec.actioned_at).toLocaleDateString()}
            </Text>
            {rec.doctor_notes && (
              <>
                <Text fontWeight="semibold" mt={2} color="blue.700">
                  Notes:
                </Text>
                <Text fontStyle="italic" color="gray.700" pl={2} borderLeft="2px" borderColor="blue.100">
                  "{rec.doctor_notes}"
                </Text>
              </>
            )}
          </Box>
        )}
      </Box>
    );
  };

  return (
    <Box mb={8} id="alerts-recommendations">
      <Heading size="lg" mb={4} color="gray.700" borderBottom="2px" borderColor="blue.100" pb={2}>
        Clinical Alerts & Recommendations
      </Heading>
      
      <Box p={5} bg="white" rounded="lg" shadow="md">
        <Flex justify="space-between" align="center" mb={4}>
          <Heading size="md" color="gray.700">
            Priority Clinical Actions
          </Heading>
          <HStack spacing={2}>
            <Badge colorScheme="red" p={1} borderRadius="md">
              <Flex align="center">
                <Icon as={FiAlertTriangle} mr={1} />
                Urgent: {patientData.recommendations.urgent_count}
              </Flex>
            </Badge>
            <Badge colorScheme="orange" p={1} borderRadius="md">
              <Flex align="center">
                <Icon as={FiAlertCircle} mr={1} />
                High: {patientData.recommendations.high_count}
              </Flex>
            </Badge>
          </HStack>
        </Flex>
        
        {urgentRecs.length > 0 && (
          <Box mb={5} p={2}>
            <Flex align="center" mb={3}>
              <Icon as={WarningIcon} color="red.500" mr={2} boxSize={5} />
              <Text fontWeight="bold" fontSize="md" color="red.600">
                Urgent - Immediate Action Required
              </Text>
            </Flex>
            <Box maxH="400px" overflowY="auto" px={2}>
              {urgentRecs.map((rec) => renderRecommendationCard(rec, "red", "red.500"))}
            </Box>
          </Box>
        )}
        
        {urgentRecs.length === 0 && highRecs.length === 0 ? (
          <Box textAlign="center" py={8} px={4} bg="green.50" rounded="md">
            <Icon as={CheckIcon} boxSize={10} color="green.500" mb={3} />
            <Text color="green.600" fontWeight="medium" fontSize="lg">
              No urgent actions required at this time.
            </Text>
            <Text color="gray.600" mt={2}>
              The patient is currently following all recommended clinical guidelines.
            </Text>
          </Box>
        ) : (
          <>
            {highRecs.length > 0 && (
              <Box mb={4} p={2}>
                <Flex align="center" mb={3}>
                  <Icon as={FiAlertCircle} color="orange.500" mr={2} boxSize={5} />
                  <Text fontWeight="bold" fontSize="md" color="orange.600">
                    High Priority - Action Within 24 Hours
                  </Text>
                </Flex>
                
                <Box maxH="300px" overflowY="auto" px={2}>
                  {highRecs.slice(0, 3).map((rec) =>
                    renderRecommendationCard(rec, "orange", "orange.500")
                  )}
                </Box>
                
                {highRecs.length > 3 && (
                  <Flex justify="center" mt={2}>
                    <Button 
                      size="sm" 
                      colorScheme="orange" 
                      variant="outline"
                      rightIcon={<AiOutlineArrowRight />}
                    >
                      View {highRecs.length - 3} more high priority alerts
                    </Button>
                  </Flex>
                )}
              </Box>
            )}
            
            {lowRecs.length > 0 && (
              <Accordion allowToggle mt={4}>
                <AccordionItem border="none">
                  <h2>
                    <AccordionButton bg="gray.50" rounded="md" _hover={{ bg: "gray.100" }}>
                      <Box flex="1" textAlign="left" fontWeight="medium">
                        <Flex align="center">
                          <TimeIcon mr={2} color="blue.500" />
                          Standard Priority Recommendations ({lowRecs.length})
                        </Flex>
                      </Box>
                      <AccordionIcon />
                    </AccordionButton>
                  </h2>
                  <AccordionPanel pb={4}>
                    {lowRecs.slice(0, 3).map((rec) =>
                      renderRecommendationCard(rec, "blue", "blue.400")
                    )}
                    
                    {lowRecs.length > 3 && (
                      <Button size="sm" colorScheme="blue" variant="ghost" mt={2} w="full">
                        Show {lowRecs.length - 3} more
                      </Button>
                    )}
                  </AccordionPanel>
                </AccordionItem>
              </Accordion>
            )}
          </>
        )}
        
        <Divider my={4} />
        
        <Flex justify="flex-end">
          <Button
            size="md"
            colorScheme="blue"
            rightIcon={<AiOutlineArrowRight />}
            variant="outline"
            boxShadow="sm"
          >
            View All Recommendations ({patientData.recommendations.total_count})
          </Button>
        </Flex>
      </Box>
    </Box>
  );
};

export default AlertsRecommendations;
