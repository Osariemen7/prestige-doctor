import React, { useState } from "react";
import {
  Box,
  Button,
  Flex,
  Heading,
  Text,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Badge,
  SimpleGrid,
} from "@chakra-ui/react";
import { getAccessToken } from "../api";

const HealthGoalSection = ({ patientData, patientId, updateHealthGoal, toast }) => {
  const [editMode, setEditMode] = useState(false);
  const [healthGoal, setHealthGoal] = useState(patientData.health_goal);

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
      interval: 0,
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

  const handleAddAction = () => {
    const newAction = {
      name: "",
      description: "",
      interval: "",
      action_end_date: "",
    };
    setHealthGoal({ ...healthGoal, actions: [...healthGoal.actions, newAction] });
  };

  // Save updated health goal
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
      patient_id: patientId,
      health_goal: processedHealthGoal,
    };

    try {
      const token = await getAccessToken();
      const response = await fetch(
        "https://service.prestigedelta.com/healthgoal/manage_goal/",
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
        updateHealthGoal(processedHealthGoal);
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

  return (
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
                      <Text fontSize="sm" color="gray.500">
                        Current: {metric.current_value} {metric.unit}
                      </Text>
                      <Badge
                        colorScheme={
                          metric.status === "on_track" ? "green" : "yellow"
                        }
                      >
                        {metric.status === "on_track"
                          ? "On Track"
                          : "Needs Attention"}
                      </Badge>
                    </Flex>
                  </Box>
                ))}
            </Box>
            <Box>
              <Box mb={4} p={3} bg="gray.50" rounded="md">
                <Text fontWeight="semibold">Overall Assessment</Text>
                <Text fontSize="sm" mt={2}>
                  {patientData.health_goal.overall_rationale}
                </Text>
              </Box>
              <SimpleGrid columns={2} spacing={4} mb={4}>
                <Box p={3} bg="blue.50" rounded="md" textAlign="center">
                  <Text fontWeight="bold" fontSize="lg">
                    {patientData.health_goal.overall_compliance_rate}%
                  </Text>
                  <Text fontSize="sm">Compliance Rate</Text>
                </Box>
                <Box p={3} bg="green.50" rounded="md" textAlign="center">
                  <Text fontWeight="bold" fontSize="lg">
                    {patientData.health_goal.streak_count}
                  </Text>
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
                        <Text fontSize="xs" color="gray.500">
                          Every {action.interval} hours
                        </Text>
                      )}
                    </Box>
                  ))}
              </Box>
            </Box>
          </SimpleGrid>
        </Box>
      )}
    </Box>
  );
};

export default HealthGoalSection;
