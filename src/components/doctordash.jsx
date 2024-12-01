import React, { useEffect, useState } from "react";
import {
  ChakraProvider,
  Box,
  Flex,
  Stat,
  StatLabel,
  StatNumber,
  Heading,
  SimpleGrid,
  Spinner,
  Divider,
} from "@chakra-ui/react";
import axios from "axios";
import { getAccessToken } from './api';

const DocDash = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  
  useEffect(() => {
    const fetchData = async () => {
        
      try {
        const accessToken = await getAccessToken();
        const response = await axios.get("https://health.prestigedelta.com/doctorsubscribers/",
            {
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                },
              }
        ); // Replace with your API endpoint
        setData(response.data[0]);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);


  if (loading) {
    return (
      <Flex justify="center" align="center" height="100vh">
        <Spinner size="xl" />
      </Flex>
    );
  }

  if (!data) {
    return (
      <Flex justify="center" align="center" height="100vh">
        <Heading size="lg">No Data Available</Heading>
      </Flex>
    );
  }

  const {
    total_subscribers,
    current_earnings,
    projected_earnings,
    num_patients_assigned,
    subscribing_patients,
    non_subscribing_patients,
    subscription_rate,
  } = data;

  return (
    <ChakraProvider>
      <Box p={5}>
        <Heading fontSize='24px' mb={6}>
          Doctor's Dashboard
        </Heading>
        <SimpleGrid columns={[1, 2, 3]} spacing={5}>
          <StatBox label="Total Subscribers" value={total_subscribers} />
          <StatBox label="Current Earnings" value={`₦${current_earnings}`} />
          <StatBox
            label="Projected Earnings"
            value={`₦${projected_earnings}`}
          />
          <StatBox label="Patients Assigned" value={num_patients_assigned} />
          <StatBox
            label="Subscription Rate"
            value={`${subscription_rate}%`}
          />
          <StatBox
            label="Subscribing Patients"
            value={subscribing_patients.length}
          />
          <StatBox
            label="Non-Subscribing Patients"
            value={non_subscribing_patients.length}
          />
        </SimpleGrid>
      </Box>
    </ChakraProvider>
  );
};

const StatBox = ({ label, value }) => (
  <Box
    p={4}
    shadow="md"
    borderWidth="1px"
    borderRadius="md"
    textAlign="center"
    bg="white"
  >
    <Stat>
      <StatLabel>{label}</StatLabel>
      <StatNumber>{value}</StatNumber>
    </Stat>
  </Box>
);

export default DocDash;
