import React, { useState } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Text,
  Grid,
  Badge,
  Flex,
  Select,
  useBreakpointValue,
  Drawer,
  DrawerOverlay,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  DrawerFooter,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Textarea,
  Switch,
  Divider,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  IconButton,
  useColorModeValue,
} from "@chakra-ui/react";
import { AddIcon, DeleteIcon } from '@chakra-ui/icons';

// List of common chronic conditions for dropdown
const commonChronicConditions = [
  { value: 'Hypertension', label: 'Hypertension' },
  { value: 'Diabetes', label: 'Diabetes' },
  { value: 'Asthma', label: 'Asthma' },
  { value: 'COPD', label: 'COPD (Chronic Obstructive Pulmonary Disease)' },
  { value: 'Arthritis', label: 'Arthritis' },
  { value: 'Heart Disease', label: 'Heart Disease' },
  { value: 'Cancer', label: 'Cancer' },
  { value: 'Stroke', label: 'Stroke' },
  { value: 'Depression', label: 'Depression' },
  { value: 'Anxiety', label: 'Anxiety' },
  { value: 'Bipolar Disorder', label: 'Bipolar Disorder' },
  { value: 'Schizophrenia', label: 'Schizophrenia' },
  { value: 'Epilepsy', label: 'Epilepsy' },
  { value: 'Parkinson\'s Disease', label: 'Parkinson\'s Disease' },
  { value: 'Multiple Sclerosis', label: 'Multiple Sclerosis' },
  { value: 'HIV/AIDS', label: 'HIV/AIDS' },
  { value: 'Kidney Disease', label: 'Kidney Disease' },
  { value: 'Liver Disease', label: 'Liver Disease' },
  { value: 'GERD', label: 'GERD (Gastroesophageal Reflux Disease)' },
  { value: 'IBS', label: 'IBS (Irritable Bowel Syndrome)' },
  { value: 'Crohn\'s Disease', label: 'Crohn\'s Disease' },
  { value: 'Ulcerative Colitis', label: 'Ulcerative Colitis' },
  { value: 'Celiac Disease', label: 'Celiac Disease' },
  { value: 'Fibromyalgia', label: 'Fibromyalgia' },
  { value: 'Lupus', label: 'Lupus' },
  { value: 'Sickle Cell Disease', label: 'Sickle Cell Disease' },
  { value: 'Thyroid Disorders', label: 'Thyroid Disorders' },
  { value: 'Osteoporosis', label: 'Osteoporosis' },
  { value: 'Chronic Fatigue Syndrome', label: 'Chronic Fatigue Syndrome' },
  { value: 'Sleep Apnea', label: 'Sleep Apnea' },
];

// Common health metrics
const commonMetrics = [
  { name: 'Blood Pressure (Systolic)', unit: 'mmHg' },
  { name: 'Blood Pressure (Diastolic)', unit: 'mmHg' },
  { name: 'Blood Sugar', unit: 'mg/dL' },
  { name: 'Weight', unit: 'kg' },
  { name: 'Body Mass Index (BMI)', unit: 'kg/m²' },
  { name: 'Heart Rate', unit: 'bpm' },
  { name: 'Cholesterol (Total)', unit: 'mg/dL' },
  { name: 'LDL Cholesterol', unit: 'mg/dL' },
  { name: 'HDL Cholesterol', unit: 'mg/dL' },
  { name: 'Triglycerides', unit: 'mg/dL' },
  { name: 'A1C', unit: '%' },
  { name: 'Steps', unit: 'steps/day' },
  { name: 'Sleep Duration', unit: 'hours' },
  { name: 'Oxygen Saturation', unit: '%' },
  { name: 'Respiratory Rate', unit: 'breaths/min' },
];

// Function to validate international phone number format
const isValidPhoneNumber = (phoneNumber) => {
  // Basic international phone number validation
  // Allows formats like: +1234567890, +123 456 7890, +123-456-7890
  const phoneRegex = /^\+[1-9]\d{1,14}$/;
  return phoneRegex.test(phoneNumber.replace(/[\s-]/g, ''));
};

const AddPatientModal = ({ isOpen, onClose, onAddPatient, isLoading }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [chronicConditions, setChronicConditions] = useState([]);
  const [customCondition, setCustomCondition] = useState('');
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  
  // Health Goal States
  const [healthGoal, setHealthGoal] = useState({
    goal_name: '',
    target_date: '',
    comments: '',
    context: '',
    doctor_instructions: '',
    checkin_interval: 168, // Weekly (in hours)
    metrics: [],
    actions: []
  });
  
  const [newMetric, setNewMetric] = useState({
    metric_name: '',
    unit: '',
    interval: 24, // Daily by default
    target_value: ''
  });
  
  const [newAction, setNewAction] = useState({
    name: '',
    description: '',
    interval: 24, // Daily by default
    action_end_date: ''
  });
  
  const [withHealthGoal, setWithHealthGoal] = useState(false);
  
  // Use responsive values for UI
  const isMobile = useBreakpointValue({ base: true, md: false });
  const modalSize = useBreakpointValue({ base: "full", md: "xl" });
  
  // Color scheme
  const headerBgGradient = "linear(to-r, blue.500, cyan.400)";
  const buttonBgGradient = "linear(to-r, blue.500, cyan.400)";
  const buttonHoverBgGradient = "linear(to-r, blue.600, cyan.500)";
  const borderColor = useColorModeValue("gray.200", "gray.600");
  const bgColor = useColorModeValue("white", "gray.800");
  const highlightColor = useColorModeValue("blue.50", "blue.900");
  
  // Reset form
  const resetForm = () => {
    setPhoneNumber('');
    setFirstName('');
    setLastName('');
    setChronicConditions([]);
    setCustomCondition('');
    setMessage('');
    setActiveTab(0);
    setHealthGoal({
      goal_name: '',
      target_date: '',
      comments: '',
      context: '',
      doctor_instructions: '',
      checkin_interval: 168,
      metrics: [],
      actions: []
    });
    setWithHealthGoal(false);
  };
    // Handle form submission
  const handleSubmit = () => {
    setMessage('');

    // Validate required fields (phone is no longer required)
    if (!firstName || !lastName) {
      setMessage('Please fill in all required fields');
      return;
    }

    // Validate phone number if provided
    if (phoneNumber && !isValidPhoneNumber(phoneNumber)) {
      setMessage('Please enter a valid international phone number or leave it blank');
      return;
    }
    
    // Create the request body
    const requestBody = {
      phone_number: phoneNumber, // Can be empty string now
      first_name: firstName,
      last_name: lastName,
      chronic_conditions: chronicConditions
    };
    
    // Add health goal if enabled
    if (withHealthGoal) {
      // Validate health goal if it's enabled
      if (!healthGoal.goal_name) {
        setMessage('Please provide a goal name');
        setActiveTab(1);
        return;
      }
      if (!healthGoal.target_date) {
        setMessage('Please provide a target date');
        setActiveTab(1);
        return;
      }
      if (!healthGoal.metrics || healthGoal.metrics.length === 0) {
        setMessage('Please add at least one health metric to track.');
        setActiveTab(1);
        return;
      }
      if (!healthGoal.actions || healthGoal.actions.length === 0) {
        setMessage('Please add at least one recommended action for the patient.');
        setActiveTab(1);
        return;
      }
      // Convert all interval fields to integer hours
      const metrics = healthGoal.metrics.map(m => ({
        ...m,
        interval: Number(m.interval)
      }));
      const actions = healthGoal.actions.map(a => ({
        ...a,
        interval: Number(a.interval)
      }));
      requestBody.health_goal = {
        ...healthGoal,
        checkin_interval: Number(healthGoal.checkin_interval),
        metrics,
        actions
      };
    }
    
    // Call the parent component's function to handle the API request
    onAddPatient(requestBody, resetForm);
  };
  
  // Handle adding a chronic condition
  const addChronicCondition = (condition) => {
    if (condition && !chronicConditions.includes(condition)) {
      setChronicConditions([...chronicConditions, condition]);
    }
  };
  
  // Handle adding a new metric
  const addMetric = () => {
    if (newMetric.metric_name && newMetric.unit) {
      setHealthGoal({
        ...healthGoal,
        metrics: [...healthGoal.metrics, { ...newMetric }]
      });
      
      // Reset new metric form
      setNewMetric({
        metric_name: '',
        unit: '',
        interval: 24,
        target_value: ''
      });
    }
  };
  
  // Handle removing a metric
  const removeMetric = (index) => {
    const updatedMetrics = [...healthGoal.metrics];
    updatedMetrics.splice(index, 1);
    setHealthGoal({
      ...healthGoal,
      metrics: updatedMetrics
    });
  };
  
  // Handle adding a new action
  const addAction = () => {
    if (newAction.name && newAction.description) {
      setHealthGoal({
        ...healthGoal,
        actions: [...healthGoal.actions, { ...newAction }]
      });
      
      // Reset new action form
      setNewAction({
        name: '',
        description: '',
        interval: 24,
        action_end_date: healthGoal.target_date // Default to same as goal target date
      });
    }
  };
  
  // Handle removing an action
  const removeAction = (index) => {
    const updatedActions = [...healthGoal.actions];
    updatedActions.splice(index, 1);
    setHealthGoal({
      ...healthGoal,
      actions: updatedActions
    });
  };
  
  // Convert interval hours to friendly text
  const getIntervalText = (hours) => {
    if (hours === 24) return "Daily";
    if (hours === 168) return "Weekly";
    if (hours === 720) return "Monthly";
    return `Every ${hours} hours`;
  };
  
  // This decides whether to render a Modal (desktop) or Drawer (mobile)
  const ModalComponent = isMobile ? Drawer : Modal;
  const ModalContentComponent = isMobile ? DrawerContent : ModalContent;
  const ModalHeaderComponent = isMobile ? DrawerHeader : ModalHeader;
  const ModalBodyComponent = isMobile ? DrawerBody : ModalBody;
  const ModalFooterComponent = isMobile ? DrawerFooter : ModalFooter;
  const ModalCloseButtonComponent = isMobile ? null : ModalCloseButton;
  
  // Custom properties for bottom drawer on mobile
  const mobileProps = isMobile ? {
    placement: "bottom",
    size: "full"
  } : {};
  
  return (
    <ModalComponent 
      isOpen={isOpen} 
      onClose={() => {
        resetForm();
        onClose();
      }}
      {...mobileProps}
    >
      <ModalOverlay backdropFilter="blur(4px)" />
      <ModalContentComponent 
        borderRadius={isMobile ? undefined : "xl"}
        borderTopLeftRadius={isMobile ? "2xl" : undefined}
        borderTopRightRadius={isMobile ? "2xl" : undefined}
        boxShadow="xl" 
        maxW={{ base: "100%", md: "800px" }}
        maxH={isMobile ? "90vh" : "auto"}
        height={isMobile ? "auto" : "auto"}
      >
        <Box bgGradient={headerBgGradient} borderTopRadius={isMobile ? "2xl" : "xl"} p={1}>
          <ModalHeaderComponent color="white" fontSize="xl">
            Add New Patient
          </ModalHeaderComponent>
          {ModalCloseButtonComponent && <ModalCloseButtonComponent color="white" />}
        </Box>
        
        <ModalBodyComponent pt={4} pb={4} px={{ base: 4, md: 6 }} overflowY="auto">
          <Text mb={6} color="gray.600" fontWeight="medium">
            Adding a new patient helps grow your practice and expand your healthcare reach.
          </Text>
          
          <Tabs colorScheme="blue" index={activeTab} onChange={setActiveTab} isFitted>
            <TabList mb={4}>
              <Tab fontWeight="medium">Basic Info</Tab>
              <Tab fontWeight="medium" isDisabled={!withHealthGoal}>Health Goal</Tab>
            </TabList>
            
            <TabPanels>
              {/* BASIC INFO TAB */}
              <TabPanel px={0}>
                <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
                  <FormControl isRequired>
                    <FormLabel fontWeight="medium" color="gray.700">First Name</FormLabel>
                    <Input 
                      type="text"
                      placeholder="Enter first name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      borderRadius="md"
                      focusBorderColor="blue.400"
                      _hover={{ borderColor: "blue.300" }}
                      size="lg"
                    />
                  </FormControl>
                  
                  <FormControl isRequired>
                    <FormLabel fontWeight="medium" color="gray.700">Last Name</FormLabel>
                    <Input 
                      type="text"
                      placeholder="Enter last name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      borderRadius="md"
                      focusBorderColor="blue.400"
                      _hover={{ borderColor: "blue.300" }}
                      size="lg"
                    />                  </FormControl>
                </Grid>
                
                <FormControl mt={4}>
                  <FormLabel fontWeight="medium" color="gray.700">Phone Number</FormLabel>
                  <Input 
                    type="tel"
                    placeholder="Enter phone number in international format (e.g., +1234567890)"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    borderRadius="md"
                    focusBorderColor="blue.400"
                    _hover={{ borderColor: "blue.300" }}
                    size="lg"
                  />
                  <Text fontSize="sm" color="gray.500" mt={1}>
                    Without a real phone number, a patient cannot be verified and assigned to you, but you can still work with them and get value from the platform.
                  </Text>
                </FormControl>
                
                <FormControl mt={4}>
                  <FormLabel fontWeight="medium" color="gray.700">Chronic Conditions</FormLabel>
                  <Box border="1px" borderColor={borderColor} borderRadius="md" p={2}>
                    {/* Selected conditions tags */}
                    <Flex wrap="wrap" mb={chronicConditions.length > 0 ? 2 : 0} gap={2}>
                      {chronicConditions.map((condition, index) => (
                        <Badge 
                          key={index} 
                          colorScheme="blue" 
                          borderRadius="full" 
                          px={2} 
                          py={1}
                          display="flex"
                          alignItems="center"
                        >
                          {condition}
                          <Box 
                            as="span" 
                            ml={1} 
                            cursor="pointer" 
                            onClick={() => {
                              const updatedConditions = [...chronicConditions];
                              updatedConditions.splice(index, 1);
                              setChronicConditions(updatedConditions);
                            }}
                          >
                            ✕
                          </Box>
                        </Badge>
                      ))}
                    </Flex>
                    
                    {/* Dropdown for common conditions */}
                    <Select 
                      placeholder="Select or type a chronic condition" 
                      onChange={(e) => {
                        if (e.target.value) {
                          addChronicCondition(e.target.value);
                          e.target.value = ""; // Reset select after selection
                        }
                      }}
                      focusBorderColor="blue.400"
                      border="none"
                      _focus={{ boxShadow: "none" }}
                    >
                      {commonChronicConditions.map((condition) => (
                        <option 
                          key={condition.value} 
                          value={condition.value} 
                          disabled={chronicConditions.includes(condition.value)}
                        >
                          {condition.label}
                        </option>
                      ))}
                    </Select>
                    
                    {/* Custom condition input */}
                    <Flex mt={2}>
                      <Input 
                        placeholder="Add a custom condition"
                        value={customCondition}
                        onChange={(e) => setCustomCondition(e.target.value)}
                        mr={2}
                        size="md"
                      />
                      <Button 
                        colorScheme="blue" 
                        size="md"
                        isDisabled={!customCondition.trim()}
                        onClick={() => {
                          if (customCondition.trim()) {
                            addChronicCondition(customCondition.trim());
                            setCustomCondition("");
                          }
                        }}
                      >
                        Add
                      </Button>
                    </Flex>
                  </Box>
                  <Text fontSize="sm" color="gray.500" mt={1}>
                    Select from common conditions or add custom ones
                  </Text>
                </FormControl>
                
                <FormControl display='flex' alignItems='center' mt={6}>
                  <FormLabel htmlFor='health-goal-switch' mb='0'>
                    Add a Health Goal for this patient
                  </FormLabel>
                  <Switch 
                    id='health-goal-switch' 
                    colorScheme='blue'
                    isChecked={withHealthGoal}
                    onChange={() => {
                      setWithHealthGoal(!withHealthGoal);
                      if (!withHealthGoal && healthGoal.target_date === '') {
                        // Set default target date to 3 months from now
                        const targetDate = new Date();
                        targetDate.setMonth(targetDate.getMonth() + 3);
                        setHealthGoal({
                          ...healthGoal,
                          target_date: targetDate.toISOString().split('T')[0]
                        });
                      }
                    }}
                  />
                </FormControl>
              </TabPanel>
              
              {/* HEALTH GOAL TAB */}
              <TabPanel px={0}>
                <FormControl isRequired mb={4}>
                  <FormLabel fontWeight="medium" color="gray.700">Goal Name</FormLabel>
                  <Input 
                    placeholder="e.g., Control Blood Pressure"
                    value={healthGoal.goal_name}
                    onChange={(e) => setHealthGoal({...healthGoal, goal_name: e.target.value})}
                    borderRadius="md"
                    focusBorderColor="blue.400"
                  />
                </FormControl>
                
                <FormControl isRequired mb={4}>
                  <FormLabel fontWeight="medium" color="gray.700">Target Date</FormLabel>
                  <Input 
                    type="date"
                    value={healthGoal.target_date}
                    onChange={(e) => setHealthGoal({...healthGoal, target_date: e.target.value})}
                    borderRadius="md"
                    focusBorderColor="blue.400"
                  />
                </FormControl>
                
                <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
                  <FormControl mb={4}>
                    <FormLabel fontWeight="medium" color="gray.700">Comments</FormLabel>
                    <Textarea 
                      placeholder="e.g., Patient wants to reduce medication dependency"
                      value={healthGoal.comments}
                      onChange={(e) => setHealthGoal({...healthGoal, comments: e.target.value})}
                      borderRadius="md"
                      focusBorderColor="blue.400"
                      rows={3}
                    />
                  </FormControl>
                  
                  <FormControl mb={4}>
                    <FormLabel fontWeight="medium" color="gray.700">Context</FormLabel>
                    <Textarea 
                      placeholder="e.g., Family history of cardiovascular disease"
                      value={healthGoal.context}
                      onChange={(e) => setHealthGoal({...healthGoal, context: e.target.value})}
                      borderRadius="md"
                      focusBorderColor="blue.400"
                      rows={3}
                    />
                    <Text fontSize="sm" color="gray.500" mt={1}>
                      <b>Tip:</b> This helps your AI physician assistant understand the patient's background and motivation.
                    </Text>
                  </FormControl>
                </Grid>
                
                <FormControl mb={4}>
                  <FormLabel fontWeight="medium" color="gray.700">Doctor Instructions</FormLabel>
                  <Textarea 
                    placeholder="e.g., Monitor blood pressure weekly and report changes"
                    value={healthGoal.doctor_instructions}
                    onChange={(e) => setHealthGoal({...healthGoal, doctor_instructions: e.target.value})}
                    borderRadius="md"
                    focusBorderColor="blue.400"
                  />
                  <Text fontSize="sm" color="gray.500" mt={1}>
                    <b>Tip:</b> These instructions will guide your AI assistant in managing the patient and alerting you to important changes.
                  </Text>
                </FormControl>
                
                <FormControl mb={4}>
                  <FormLabel fontWeight="medium" color="gray.700">Check-in Interval</FormLabel>
                  <Select
                    value={healthGoal.checkin_interval}
                    onChange={(e) => setHealthGoal({...healthGoal, checkin_interval: Number(e.target.value)})}
                    borderRadius="md"
                    focusBorderColor="blue.400"
                  >
                    <option value={24}>Daily</option>
                    <option value={168}>Weekly</option>
                    <option value={336}>Every 2 Weeks</option>
                    <option value={720}>Monthly</option>
                  </Select>
                  <Text fontSize="sm" color="gray.500" mt={1}>
                    How often should the patient check in on their progress?
                  </Text>
                </FormControl>
                
                <Divider my={6} borderColor={borderColor} />
                
                {/* Health Metrics Section */}
                <Accordion allowToggle defaultIndex={[0]} mb={6}>
                  <AccordionItem border="1px" borderColor={borderColor} borderRadius="md">
                    <h2>
                      <AccordionButton bg={highlightColor} _hover={{ bg: 'blue.100' }} borderRadius="md" p={3}>
                        <Box flex="1" textAlign="left" fontWeight="bold">
                          Health Metrics to Track
                        </Box>
                        <AccordionIcon />
                      </AccordionButton>
                    </h2>
                    <AccordionPanel pb={4}>
                      {/* List of current metrics */}
                      {healthGoal.metrics.length > 0 && (
                        <Box mb={4}>
                          {healthGoal.metrics.map((metric, index) => (
                            <Flex 
                              key={index} 
                              p={3} 
                              bg="gray.50" 
                              borderRadius="md" 
                              mb={2}
                              align="center"
                              justify="space-between"
                            >
                              <Box flex="1">
                                <Text fontWeight="medium">{metric.metric_name}</Text>
                                <Flex fontSize="sm" color="gray.600">
                                  <Text mr={2}>Target: {metric.target_value} {metric.unit}</Text>
                                  <Text>| {getIntervalText(metric.interval)}</Text>
                                </Flex>
                              </Box>
                              <IconButton
                                icon={<DeleteIcon />}
                                variant="ghost"
                                colorScheme="red"
                                aria-label="Remove metric"
                                size="sm"
                                onClick={() => removeMetric(index)}
                              />
                            </Flex>
                          ))}
                        </Box>
                      )}
                      
                      {/* Add new metric form */}
                      <Grid templateColumns={{ base: "1fr", md: "3fr 2fr" }} gap={4} mb={3}>
                        <FormControl>
                          <FormLabel fontSize="sm">Metric Name</FormLabel>
                          <Input
                            placeholder="Type or select metric name"
                            list="common-metrics-list"
                            value={newMetric.metric_name}
                            onChange={e => {
                              const selectedMetric = commonMetrics.find(m => m.name === e.target.value);
                              if (selectedMetric) {
                                setNewMetric({
                                  ...newMetric,
                                  metric_name: selectedMetric.name,
                                  unit: selectedMetric.unit
                                });
                              } else {
                                setNewMetric({
                                  ...newMetric,
                                  metric_name: e.target.value
                                });
                              }
                            }}
                          />
                          <datalist id="common-metrics-list">
                            {commonMetrics.map(metric => (
                              <option key={metric.name} value={metric.name} />
                            ))}
                          </datalist>
                        </FormControl>
                        
                        <FormControl>
                          <FormLabel fontSize="sm">Unit</FormLabel>
                          <Input
                            placeholder="e.g., mmHg, mg/dL"
                            value={newMetric.unit}
                            onChange={(e) => setNewMetric({...newMetric, unit: e.target.value})}
                          />
                        </FormControl>
                      </Grid>
                      
                      <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4} mb={3}>
                        <FormControl>
                          <FormLabel fontSize="sm">Target Value</FormLabel>
                          <NumberInput min={0}>
                            <NumberInputField
                              placeholder="Target value"
                              value={newMetric.target_value}
                              onChange={(e) => setNewMetric({...newMetric, target_value: e.target.value})}
                            />
                            <NumberInputStepper>
                              <NumberIncrementStepper />
                              <NumberDecrementStepper />
                            </NumberInputStepper>
                          </NumberInput>
                        </FormControl>
                        
                        <FormControl>
                          <FormLabel fontSize="sm">Measurement Interval</FormLabel>
                          <Select
                            value={newMetric.interval}
                            onChange={(e) => setNewMetric({...newMetric, interval: Number(e.target.value)})}
                          >
                            <option value={24}>Daily</option>
                            <option value={168}>Weekly</option>
                            <option value={336}>Every 2 Weeks</option>
                            <option value={720}>Monthly</option>
                          </Select>
                        </FormControl>
                      </Grid>
                      
                      <Button
                        leftIcon={<AddIcon />}
                        colorScheme="blue"
                        variant="outline"
                        isDisabled={!newMetric.metric_name || !newMetric.unit}
                        onClick={addMetric}
                        size="sm"
                        mt={2}
                      >
                        Add Metric
                      </Button>
                    </AccordionPanel>
                  </AccordionItem>
                </Accordion>
                
                {/* Recommended Actions Section */}
                <Accordion allowToggle defaultIndex={[0]} mb={6}>
                  <AccordionItem border="1px" borderColor={borderColor} borderRadius="md">
                    <h2>
                      <AccordionButton bg={highlightColor} _hover={{ bg: 'blue.100' }} borderRadius="md" p={3}>
                        <Box flex="1" textAlign="left" fontWeight="bold">
                          Recommended Actions
                        </Box>
                        <AccordionIcon />
                      </AccordionButton>
                    </h2>
                    <AccordionPanel pb={4}>
                      {/* List of current actions */}
                      {healthGoal.actions.length > 0 && (
                        <Box mb={4}>
                          {healthGoal.actions.map((action, index) => (
                            <Flex 
                              key={index} 
                              p={3} 
                              bg="gray.50" 
                              borderRadius="md" 
                              mb={2}
                              align="center"
                              justify="space-between"
                            >
                              <Box flex="1">
                                <Text fontWeight="medium">{action.name}</Text>
                                <Text fontSize="sm" color="gray.600" noOfLines={2}>
                                  {action.description}
                                </Text>
                                <Text fontSize="sm" color="gray.500" mt={1}>
                                  {getIntervalText(action.interval)} | Until: {new Date(action.action_end_date).toLocaleDateString()}
                                </Text>
                              </Box>
                              <IconButton
                                icon={<DeleteIcon />}
                                variant="ghost"
                                colorScheme="red"
                                aria-label="Remove action"
                                size="sm"
                                onClick={() => removeAction(index)}
                              />
                            </Flex>
                          ))}
                        </Box>
                      )}
                      
                      {/* Add new action form */}
                      <FormControl mb={3}>
                        <FormLabel fontSize="sm">Action Name</FormLabel>
                        <Input
                          placeholder="e.g., 30-minute Daily Walk"
                          value={newAction.name}
                          onChange={(e) => setNewAction({...newAction, name: e.target.value})}
                        />
                      </FormControl>
                      
                      <FormControl mb={3}>
                        <FormLabel fontSize="sm">Description</FormLabel>
                        <Textarea
                          placeholder="e.g., Brisk walking for cardiovascular health"
                          value={newAction.description}
                          onChange={(e) => setNewAction({...newAction, description: e.target.value})}
                          rows={2}
                        />
                      </FormControl>
                      
                      <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4} mb={3}>
                        <FormControl>
                          <FormLabel fontSize="sm">Frequency</FormLabel>
                          <Select
                            value={newAction.interval}
                            onChange={(e) => setNewAction({...newAction, interval: Number(e.target.value)})}
                          >
                            <option value={24}>Daily</option>
                            <option value={168}>Weekly</option>
                            <option value={336}>Every 2 Weeks</option>
                            <option value={720}>Monthly</option>
                          </Select>
                        </FormControl>
                        
                        <FormControl>
                          <FormLabel fontSize="sm">End Date</FormLabel>
                          <Input
                            type="date"
                            value={newAction.action_end_date || healthGoal.target_date}
                            onChange={(e) => setNewAction({...newAction, action_end_date: e.target.value})}
                          />
                        </FormControl>
                      </Grid>
                      
                      <Button
                        leftIcon={<AddIcon />}
                        colorScheme="blue"
                        variant="outline"
                        isDisabled={!newAction.name || !newAction.description}
                        onClick={addAction}
                        size="sm"
                        mt={2}
                      >
                        Add Action
                      </Button>
                    </AccordionPanel>
                  </AccordionItem>
                </Accordion>
              </TabPanel>
            </TabPanels>
          </Tabs>
          
          {message && (
            <Box 
              mt={4} 
              p={3} 
              borderRadius="md" 
              bg="red.50" 
              color="red.500" 
              borderLeft="4px" 
              borderColor="red.500"
            >
              <Text fontWeight="medium">{message}</Text>
            </Box>
          )}
        </ModalBodyComponent>
        
        <ModalFooterComponent 
          bg="gray.50" 
          borderBottomRadius={isMobile ? "0" : "xl"} 
          borderTopRadius={0}
          p={4}
          mt={2}
        >
          <Button 
            colorScheme="blue" 
            mr={3} 
            onClick={handleSubmit} 
            isLoading={isLoading}
            loadingText="Adding..."
            size="lg"
            px={8}
            bgGradient={buttonBgGradient}
            _hover={{
              bgGradient: buttonHoverBgGradient,
            }}
            borderRadius="md"
          >
            {withHealthGoal ? 'Add Patient with Health Goal' : 'Add Patient'}
          </Button>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
        </ModalFooterComponent>
      </ModalContentComponent>
    </ModalComponent>
  );
};

export default AddPatientModal;
