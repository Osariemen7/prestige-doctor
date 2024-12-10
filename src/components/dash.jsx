import React, { useState, useEffect } from 'react';
import { ChakraProvider, Box, Grid, VStack, Text, Button, Input, Spinner } from "@chakra-ui/react";
import './DashboardPage.css';
import Sidebar from './sidebar'; // Import Sidebar component
import { useNavigate } from 'react-router-dom';
import {
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Heading
} from '@chakra-ui/react';
import { getAccessToken } from './api';
import DocDash from './doctordash';

const DashboardPage = () => {
  const navigate = useNavigate();
  const [data, setDataList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredPatients = data.filter((patient) =>
    patient.phone_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  

  useEffect(() => {
    const fetchData = async () => {
      const accessToken = await getAccessToken();
      if (!accessToken) return;

      try {
        const response = await fetch('https://health.prestigedelta.com/patientlist/', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            accept: 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
        });
        if (response.status === 401) {
          navigate('/');
        } else {
          const result = await response.json();
          setDataList(result);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const fetchSub = async () => {
      const accessToken = await getAccessToken();
      if (!accessToken) return;

      try {
        const response = await fetch('https://health.prestigedelta.com/patientlist/', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            accept: 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
        });
        if (response.status === 401) {
          navigate('/');
        } else {
          const result = await response.json();
          setDataList(result);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSub();
  }, []);


  const handleViewDetails = (item) => {
    navigate('/detail', { state: { item } }); // Navigate using the ID
  };

  const handleLogout = () => {
    localStorage.removeItem('user-info');
    navigate('/');
  };

  const PatientCard = ({ patient }) => (
    <Box borderWidth="1px" borderRadius="lg" p={4} shadow="md" backgroundColor='#f0f8ff'>
      <VStack align="start" spacing={7}>
        <Text>
          <strong>Patient ID:</strong> {patient.id}
        </Text>
        <Text>
          <strong>Phone:</strong> {patient.phone_number}
        </Text>
        <Text>
          <strong>Most Recent Review:</strong>{" "}
          {new Date(patient.most_recent_review).toLocaleString()}
        </Text>
        <Button colorScheme="blue" onClick={() => handleViewDetails(patient)}>
          View Details
        </Button>
      </VStack>
    </Box>
  );
  
  return (
    <div className="dashboard-container">
      {/* Persistent Sidebar */}
      <Sidebar navigate={navigate} handleLogout={handleLogout} />

      {/* Main Content */}
      <div className="main-content">
      <ChakraProvider>
      <Box flex="1" overflow="auto">
  
    {/* Tab Content Below */}
        <Heading fontSize='22px' textAlign='center'>Patient Health Dashboard</Heading>
        {loading ? (
          <Box textAlign="center" mt={8}>
            <Spinner size="xl" />
            <Text mt={4}>Loading...</Text>
          </Box>
        ) : (
          <Box p={4}>
            <Text fontSize="20px" fontWeight="bold" mb={4}>
              Patient Records
            </Text>
            <Box mb={6}>
              <Input
                placeholder="Search by phone number"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </Box>
            <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={6}>
              {filteredPatients.length > 0 ? (
                filteredPatients.map((patient) => (
                  <PatientCard key={patient.id} patient={patient} />
                ))
              ) : (
                <Text>No patients found.</Text>
              )}
            </Grid>
          </Box>
        )}
       
      
</Box>


      </ChakraProvider>

             </div>
    </div>
  );
};

export default DashboardPage;
