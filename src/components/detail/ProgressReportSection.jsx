import React from "react";
import {
  Box,
  Button,
  Heading,
} from "@chakra-ui/react";

const ProgressReportSection = ({ navigate, patientId }) => {
  const handleGenerateReport = () => {
    navigate("/ask", {
      state: {
        initialQuery: `Generate a comprehensive progress report for patient ${patientId}`,
        selectedPatientId: patientId,
      },
    });
  };

  return (
    <Box mb={8}>
      <Heading size="md" mb={4}>
        Progress Report
      </Heading>
      <Button colorScheme="blue" onClick={handleGenerateReport} mb={4}>
        Generate Progress Report
      </Button>
    </Box>
  );
};

export default ProgressReportSection;
