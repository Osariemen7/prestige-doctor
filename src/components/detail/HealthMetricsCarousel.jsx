import React, { useState } from "react";
import {
  Box,
  Heading,
  Text,
  Button,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
} from "@chakra-ui/react";
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

const MetricChart = ({ metric, actions }) => {
  const [selectedAction, setSelectedAction] = useState(null);
  const [showActionDetails, setShowActionDetails] = useState(false);

  // Calculate min and max values for proper Y axis scaling
  const recordedValues = metric.records ? metric.records.map((r) => r.recorded_value) : [];
  const targetValue = metric.details.target_value;
  const allValues = [...recordedValues, targetValue];
  const minValue = Math.min(...allValues) * 0.9; // Add 10% padding below
  const maxValue = Math.max(...allValues) * 1.1; // Add 10% padding above

  // Process action data for relative display
  const actionRecords = actions && actions.records ? actions.records : [];
  // Normalize action values for relative display (if there are any)
  const normalizedActions = actionRecords.length
    ? actionRecords.map((a) => ({
        x: new Date(a.performed_at).toLocaleDateString(),
        y: a.value || 1, // Default to 1 if no value
        details: a,
      }))
    : [];

  // Find corresponding dates between metrics and actions
  const dates = metric.records
    ? metric.records.map((r) => new Date(r.recorded_at).toLocaleDateString())
    : [];
  // Filter actions to only include those on dates when metrics were recorded
  const filteredActions = normalizedActions.filter((a) => dates.includes(a.x));

  const chartData = {
    labels: metric.records
      ? metric.records.map((r) => new Date(r.recorded_at).toLocaleDateString())
      : [],
    datasets: [
      {
        label: metric.details.metric_name,
        data: recordedValues,
        borderColor: "rgb(75, 192, 192)",
        backgroundColor: "rgba(75, 192, 192, 0.2)",
        tension: 0.1,
        yAxisID: "y",
      },
      {
        label: "Target Value",
        data: metric.records ? metric.records.map(() => targetValue) : [],
        borderColor: "rgb(255, 205, 86)",
        backgroundColor: "rgba(255, 205, 86, 0.2)",
        borderDash: [10, 5],
        tension: 0.1,
        yAxisID: "y",
      },
      {
        label: "Actions",
        data: filteredActions.map((a) => a.y),
        borderColor: "rgb(255, 99, 132)",
        backgroundColor: "rgba(255, 99, 132, 0.5)",
        tension: 0.1,
        yAxisID: "y1",
        pointStyle: "rectRot",
        pointRadius: 8,
        pointHoverRadius: 12,
        pointBackgroundColor: "rgba(255, 99, 132, 0.8)",
      },
    ],
  };

  const options = {
    responsive: true,
    interaction: {
      mode: "index",
      intersect: false,
    },
    scales: {
      y: {
        type: "linear",
        display: true,
        position: "left",
        min: minValue,
        max: maxValue,
        title: {
          display: true,
          text: metric.details.unit,
        },
      },
      y1: {
        type: "linear",
        display: false, // Hide this axis as requested
        position: "right",
        grid: {
          drawOnChartArea: false,
        },
      },
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
    },
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
                <Text>
                  Compliance Rate: {selectedAction.details.compliance_rate}%
                </Text>
                <Text mt={2} fontStyle="italic">
                  This action was taken as part of your health plan. Click on
                  other action points to compare.
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

const HealthMetricsCarousel = ({ patientData }) => {
  return (
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
  );
};

export default HealthMetricsCarousel;
