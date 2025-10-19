import React from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  Code,
  Divider,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  useColorModeValue,
  List,
  ListItem,
  ListIcon,
  Badge,
} from '@chakra-ui/react';
import { FiCheckCircle, FiInfo } from 'react-icons/fi';

const ProviderDashboardDocs = () => {
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');

  return (
    <Box minH="100vh" bg={bgColor} py={10}>
      <Container maxW="container.xl">
        <VStack align="stretch" spacing={8}>
          {/* Header */}
          <Box>
            <Heading size="2xl" mb={2}>Provider Dashboard Documentation</Heading>
            <Text fontSize="lg" color="gray.600">
              Complete guide to using the Provider Dashboard
            </Text>
          </Box>

          <Divider />

          {/* Quick Start */}
          <Alert status="info" borderRadius="lg">
            <AlertIcon />
            <Box>
              <AlertTitle>Quick Start</AlertTitle>
              <AlertDescription>
                Navigate to <Code>/provider-dashboard</Code> to access the dashboard. 
                You must be logged in with a provider account.
              </AlertDescription>
            </Box>
          </Alert>

          {/* Features Overview */}
          <Box bg={cardBg} p={6} borderRadius="xl" boxShadow="md">
            <Heading size="lg" mb={4}>Key Features</Heading>
            <List spacing={3}>
              <ListItem>
                <ListIcon as={FiCheckCircle} color="green.500" />
                <strong>Business Metrics:</strong> Track consultation rate, expected payout, and patient counts
              </ListItem>
              <ListItem>
                <ListIcon as={FiCheckCircle} color="green.500" />
                <strong>Patient Categorization:</strong> View active, pending, and churned patients
              </ListItem>
              <ListItem>
                <ListIcon as={FiCheckCircle} color="green.500" />
                <strong>Detailed Patient Views:</strong> Access comprehensive patient information
              </ListItem>
              <ListItem>
                <ListIcon as={FiCheckCircle} color="green.500" />
                <strong>Medical Reviews:</strong> View all patient medical reviews and assessments
              </ListItem>
              <ListItem>
                <ListIcon as={FiCheckCircle} color="green.500" />
                <strong>Care Plans:</strong> Monitor remote care plans and objectives
              </ListItem>
              <ListItem>
                <ListIcon as={FiCheckCircle} color="green.500" />
                <strong>Metrics Tracking:</strong> Interactive charts for patient health metrics
              </ListItem>
            </List>
          </Box>

          {/* Code Examples */}
          <Tabs colorScheme="blue" variant="enclosed">
            <TabList>
              <Tab>Fetching Dashboard Data</Tab>
              <Tab>Opening Patient Details</Tab>
              <Tab>Using in Components</Tab>
            </TabList>

            <TabPanels>
              {/* Tab 1: Fetching Dashboard Data */}
              <TabPanel>
                <VStack align="stretch" spacing={4}>
                  <Text>Example of fetching dashboard data:</Text>
                  <Code p={4} borderRadius="md" display="block" whiteSpace="pre" overflowX="auto">
{`import { getAccessToken } from '../api';

const fetchDashboardData = async () => {
  const token = await getAccessToken();
  
  try {
    const response = await fetch(
      'https://service.prestigedelta.com/providerdashboard/',
      {
        headers: {
          'Authorization': \`Bearer \${token}\`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.ok) {
      const data = await response.json();
      console.log('Provider Info:', data.provider_info);
      console.log('Active Patients:', data.patients.active);
      console.log('Pending Patients:', data.patients.pending);
      console.log('Churned Patients:', data.patients.churned);
    }
  } catch (error) {
    console.error('Error:', error);
  }
};`}
                  </Code>
                </VStack>
              </TabPanel>

              {/* Tab 2: Opening Patient Details */}
              <TabPanel>
                <VStack align="stretch" spacing={4}>
                  <Text>Example of fetching patient details:</Text>
                  <Code p={4} borderRadius="md" display="block" whiteSpace="pre" overflowX="auto">
{`import { getAccessToken } from '../api';

const fetchPatientDetails = async (patientId) => {
  const token = await getAccessToken();
  
  try {
    const response = await fetch(
      \`https://service.prestigedelta.com/providerdashboard/\${patientId}/\`,
      {
        headers: {
          'Authorization': \`Bearer \${token}\`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.ok) {
      const patient = await response.json();
      console.log('Patient Profile:', patient.profile_data);
      console.log('Medical Reviews:', patient.full_medical_reviews);
      console.log('Care Plan:', patient.remote_care_plan);
      console.log('Metrics:', patient.metrics);
    }
  } catch (error) {
    console.error('Error:', error);
  }
};

// Usage: Get patientId from the dashboard list
// data.patients.active[0].id`}
                  </Code>
                </VStack>
              </TabPanel>

              {/* Tab 3: Using in Components */}
              <TabPanel>
                <VStack align="stretch" spacing={4}>
                  <Text>Example of using the dashboard in a React component:</Text>
                  <Code p={4} borderRadius="md" display="block" whiteSpace="pre" overflowX="auto">
{`import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAccessToken } from '../api';

function MyComponent() {
  const [dashboard, setDashboard] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    const token = await getAccessToken();
    if (!token) {
      navigate('/login');
      return;
    }

    const response = await fetch(
      'https://service.prestigedelta.com/providerdashboard/',
      {
        headers: {
          'Authorization': \`Bearer \${token}\`,
          'Content-Type': 'application/json'
        }
      }
    );

    const data = await response.json();
    setDashboard(data);
  };

  const viewPatient = async (patientId) => {
    const token = await getAccessToken();
    const response = await fetch(
      \`https://service.prestigedelta.com/providerdashboard/\${patientId}/\`,
      {
        headers: {
          'Authorization': \`Bearer \${token}\`,
          'Content-Type': 'application/json'
        }
      }
    );

    const patient = await response.json();
    setSelectedPatient(patient);
  };

  return (
    <div>
      {dashboard && (
        <>
          <h2>Business Overview</h2>
          <p>Consultation Rate: {dashboard.provider_info.consultation_rate}%</p>
          <p>Expected Payout: {dashboard.provider_info.currency} {dashboard.provider_info.expected_monthly_payout}</p>
          
          <h3>Active Patients</h3>
          {dashboard.patients.active.map(patient => (
            <div key={patient.id} onClick={() => viewPatient(patient.id)}>
              {patient.profile_data.full_name}
            </div>
          ))}
        </>
      )}
    </div>
  );
}`}
                  </Code>
                </VStack>
              </TabPanel>
            </TabPanels>
          </Tabs>

          {/* API Response Structure */}
          <Box bg={cardBg} p={6} borderRadius="xl" boxShadow="md">
            <Heading size="lg" mb={4}>API Response Structure</Heading>
            
            <VStack align="stretch" spacing={4}>
              <Box>
                <Badge colorScheme="blue" mb={2}>Dashboard Endpoint</Badge>
                <Code p={4} borderRadius="md" display="block" whiteSpace="pre" overflowX="auto" fontSize="sm">
{`{
  "provider_info": {
    "consultation_rate": 75.5,
    "currency": "NGN",
    "expected_monthly_payout": 157500.00,
    "active_subscribed_patients_count": 12,
    "pending_subscribed_patients_count": 3,
    "churned_patients_count": 8
  },
  "patients": {
    "active": [...],
    "pending": [...],
    "churned": [...]
  }
}`}
                </Code>
              </Box>

              <Box>
                <Badge colorScheme="green" mb={2}>Patient Detail Endpoint</Badge>
                <Code p={4} borderRadius="md" display="block" whiteSpace="pre" overflowX="auto" fontSize="sm">
{`{
  "id": 123,
  "profile_data": {
    "full_name": "John Doe",
    "phone_number": "+2348012345678",
    "health_score": 85,
    ...
  },
  "medical_reviews": {...},
  "full_medical_reviews": [...],
  "remote_care_plan": {...},
  "metrics": [...],
  "subscription_status": "active"
}`}
                </Code>
              </Box>
            </VStack>
          </Box>

          {/* Status Codes */}
          <Box bg={cardBg} p={6} borderRadius="xl" boxShadow="md">
            <Heading size="lg" mb={4}>Subscription Status Codes</Heading>
            <List spacing={2}>
              <ListItem>
                <Badge colorScheme="green" mr={2}>active</Badge>
                Patient has active subscription (is_active=true AND end_date {'>'} current_time)
              </ListItem>
              <ListItem>
                <Badge colorScheme="yellow" mr={2}>pending</Badge>
                Subscription exists but inactive (is_active=false AND end_date {'>'} current_time)
              </ListItem>
              <ListItem>
                <Badge colorScheme="red" mr={2}>churned</Badge>
                Subscription has expired (end_date {'<='} current_time)
              </ListItem>
              <ListItem>
                <Badge colorScheme="gray" mr={2}>no_subscription</Badge>
                No subscription relationship found
              </ListItem>
            </List>
          </Box>

          {/* Error Handling */}
          <Alert status="warning" borderRadius="lg">
            <AlertIcon />
            <Box>
              <AlertTitle>Error Handling</AlertTitle>
              <AlertDescription>
                <List spacing={2} mt={2}>
                  <ListItem>
                    <strong>403 Forbidden:</strong> User is not a provider
                  </ListItem>
                  <ListItem>
                    <strong>404 Not Found:</strong> Patient or resource not found
                  </ListItem>
                  <ListItem>
                    <strong>401 Unauthorized:</strong> Invalid or expired token
                  </ListItem>
                </List>
              </AlertDescription>
            </Box>
          </Alert>
        </VStack>
      </Container>
    </Box>
  );
};

export default ProviderDashboardDocs;
