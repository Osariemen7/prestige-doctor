import React from "react";
import {
  Box,
  Heading,
  Text,
  SimpleGrid,
} from "@chakra-ui/react";

const MedicalReviewSection = ({ patientData }) => {
  return (
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
            <Text mb={4}>{patientData.medical_reviews[0]?.management_plan}</Text>
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
            <Text mb={4}>{patientData.medical_reviews[0]?.lifestyle_advice}</Text>
            <Text fontWeight="bold" color="blue.600">
              Follow-up Plan
            </Text>
            <Text mb={4}>{patientData.medical_reviews[0]?.follow_up_plan}</Text>
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
              {patientData.medical_reviews[0]?.prescriptions.map(
                (prescription, idx) => (
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
                )
              )}
            </Box>
          )}
        </SimpleGrid>
      </Box>
    </Box>
  );
};

export default MedicalReviewSection;
