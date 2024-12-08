import React, { useEffect, useState } from "react";
import {
  ChakraProvider,
  Box,
  Flex,
  Heading,
  Text,
  Spinner,
  Divider,
  VStack,
} from "@chakra-ui/react";
import axios from "axios";
import { getAccessToken } from "./api";
import {useNavigate} from 'react-router-dom';

const DocDash = () => {
  const [data, setData] = useState(null);
  const [info, setInfo] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate()

  // Fetch doctor subscribers data
  useEffect(() => {
    const fetchSubscribers = async () => {
      try {
        const accessToken = await getAccessToken();
        const response = await axios.get(
          "https://health.prestigedelta.com/doctorsubscribers/",
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );
        setData(response.data[0]);
      } catch (error) {
        console.error("Error fetching doctor subscribers data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscribers();
  }, []);

  // Fetch appointment slots data
  useEffect(() => {
    const fetchSlots = async () => {
      try {
        const accessToken = await getAccessToken();
        const response = await axios.get(
          "https://health.prestigedelta.com/appointments/available_slots/?date=2024-12-05",
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );
        setInfo(response.data);
      } catch (error) {
        console.error("Error fetching appointment slots data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSlots();
  }, []);
  const handleCalls = (item) => {
    navigate('/appointment', { state: { item } }); // Navigate using the ID
  };


  if (loading) {
    return (
      <Flex justify="center" align="center" height="100vh">
        <Spinner size="xl" />
      </Flex>
    );
  }

  const bookedItems = info.filter((item) => item.status === "BOOKED");

  const {
    total_subscribers,
    current_earnings,
    projected_earnings,
    num_patients_assigned,
    subscribing_patients = [],
    non_subscribing_patients = [],
    subscription_rate,
  } = data || {};

  return (
    <ChakraProvider>
      <Box p={5}>
        <Heading fontSize="24px" mb={4}>
          Doctor's Dashboard
        </Heading>

        <Box mb={6}>
          {data ? (
            <>
              <Text>Total Subscribers: {total_subscribers}</Text>
              <Text>Current Earnings: {`₦${current_earnings}`}</Text>
              <Text>Projected Earnings: {`₦${projected_earnings}`}</Text>
              <Text>Patients Assigned: {num_patients_assigned}</Text>
              <Text>Subscribers Rate: {`${subscription_rate}%`}</Text>
              <Text>Subscribers Patients: {subscribing_patients.length}</Text>
              <Text>Non-Subscribing Patients: {non_subscribing_patients.length}</Text>
            </>
          ) : (
            <Text color="gray.500">No Data Available</Text>
          )}
        </Box>

        <Divider mb={4} />

        <Heading fontSize="20px" mb={4}>
          Call Schedules
        </Heading>

        <VStack spacing={4} align="stretch">
          {bookedItems.length > 0 ? (
            bookedItems.map((item, index) => (
              <Box key={index} p={4} bg="white" shadow="md" borderRadius="md" onClick={() => handleCalls(item)}>
                <Text fontSize="md" fontWeight="bold" color="blue.500">
                  Patient ID: {item.patient_id}
                </Text>
                <Text fontSize="sm">
                   Time: {new Date(item.start_time).toLocaleString()}
                </Text>
                
              </Box>
            ))
          ) : (
            <Text color="gray.500">No booked appointments available.</Text>
          )}
        </VStack>
      </Box>
    </ChakraProvider>
  );
};

export default DocDash;
