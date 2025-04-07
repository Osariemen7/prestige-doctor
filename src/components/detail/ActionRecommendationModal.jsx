import React, { useEffect } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  FormControl,
  FormLabel,
  Textarea,
  Text,
  Box,
  Badge,
  Flex,
  Divider,
  Icon,
} from "@chakra-ui/react";
import { CheckIcon, InfoIcon } from "@chakra-ui/icons";

const ActionRecommendationModal = ({
  isOpen,
  onClose,
  selectedRecommendation,
  doctorNotes,
  setDoctorNotes,
  markAsActioned,
  isActioning,
}) => {
  // This effect fixes the scrolling issue by ensuring body overflow is restored
  useEffect(() => {
    // If modal is open, let Chakra UI handle the body styles
    if (isOpen) return;
    
    // When modal closes, ensure body can scroll
    const restoreScrolling = () => {
      document.body.style.overflow = "auto";
      document.body.style.paddingRight = "0px";
    };
    
    // Small delay to ensure this runs after Chakra's internal handlers
    const timer = setTimeout(restoreScrolling, 100);
    
    return () => clearTimeout(timer);
  }, [isOpen]);

  // Custom close handler to ensure scrolling is restored
  const handleClose = () => {
    onClose();
    // Ensure scrolling is restored immediately
    setTimeout(() => {
      document.body.style.overflow = "auto";
      document.body.style.paddingRight = "0px";
    }, 100);
  };

  // Custom action handler to properly close the modal
  const handleMarkAsActioned = async () => {
    await markAsActioned();
    // We don't call handleClose() here as markAsActioned already calls setActionModalOpen(false)
    // which triggers the onClose function
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose}
      size="lg"
      scrollBehavior="outside" // Use outside scrolling to avoid body manipulation
    >
      <ModalOverlay backdropFilter="blur(2px)" />
      <ModalContent borderRadius="lg" boxShadow="0 4px 12px rgba(0, 0, 0, 0.15)">
        <ModalHeader 
          bg="blue.50" 
          borderTopRadius="lg" 
          borderBottom="1px" 
          borderColor="blue.100"
          display="flex"
          alignItems="center"
        >
          <Icon as={CheckIcon} color="green.500" mr={2} />
          Mark Clinical Recommendation as Complete
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody py={6}>
          {selectedRecommendation && (
            <>
              <Flex justify="space-between" align="center" mb={3}>
                <Text fontWeight="bold" fontSize="lg" color="blue.800">
                  {selectedRecommendation.title}
                </Text>
                <Badge 
                  colorScheme={
                    selectedRecommendation.priority === "high" ? "red" : 
                    selectedRecommendation.priority === "medium" ? "orange" : 
                    "blue"
                  }
                  fontSize="0.8em"
                  px={2}
                  py={1}
                  borderRadius="md"
                >
                  {selectedRecommendation.priority === "high" ? "Urgent" : 
                   selectedRecommendation.priority === "medium" ? "High Priority" : 
                   "Standard"}
                </Badge>
              </Flex>
              
              <Box 
                bg="gray.50" 
                p={4} 
                borderRadius="md" 
                mb={4} 
                borderLeft="4px" 
                borderColor="blue.400"
              >
                <Text fontSize="md" mb={3}>
                  {selectedRecommendation.recommendation}
                </Text>
                <Flex align="center" color="gray.600">
                  <InfoIcon mr={2} />
                  <Text fontSize="sm" fontStyle="italic">
                    Rationale: {selectedRecommendation.rationale}
                  </Text>
                </Flex>
              </Box>
              
              <Divider my={4} />
              
              <FormControl>
                <FormLabel fontWeight="medium" color="blue.700">
                  Clinical Notes (Optional)
                </FormLabel>
                <Textarea
                  value={doctorNotes}
                  onChange={(e) => setDoctorNotes(e.target.value)}
                  placeholder="Add your clinical assessment, actions taken, or follow-up plans..."
                  rows={4}
                  borderColor="gray.300"
                  _hover={{ borderColor: "blue.300" }}
                  _focus={{ borderColor: "blue.500", boxShadow: "0 0 0 1px #3182ce" }}
                  resize="vertical"
                  transition="all 0.2s"
                  fontSize="md"
                />
              </FormControl>
            </>
          )}
        </ModalBody>
        <ModalFooter bg="gray.50" borderBottomRadius="lg" borderTop="1px" borderColor="gray.100">
          <Button
            colorScheme="green"
            mr={3}
            onClick={handleMarkAsActioned}
            isLoading={isActioning}
            size="md"
            leftIcon={<CheckIcon />}
            px={6}
            boxShadow="sm"
          >
            Confirm Action
          </Button>
          <Button variant="outline" onClick={handleClose} size="md" boxShadow="sm">
            Cancel
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default ActionRecommendationModal;
