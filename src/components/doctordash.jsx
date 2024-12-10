import React, { useEffect, useRef, useState } from "react";
import {
  ChakraProvider,
  Box,
  Flex,
  Heading,
  Text,
  Spinner,
  Divider,
  VStack,
  IconButton,
  Button
} from "@chakra-ui/react";
import { FiCopy } from 'react-icons/fi'
import axios from "axios";
import { getAccessToken } from "./api";
import {useNavigate} from 'react-router-dom';
import Sidebar from './sidebar'; // Import Sidebar component

const DocDash = () => {
  const [data, setData] = useState(null);
  const [info, setInfo] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate()

  
    const CopyButton = ({ textToCopy }) => {
      const textRef = useRef(null);
    
      const copyToClipboard = async () => {
        try {
          await navigator.clipboard.writeText(textToCopy);
          alert('Copied to clipboard!');
        } catch (err) {
          console.error('Unable to copy to clipboard.', err);
        }
      };
      return (
          <div>
          <IconButton
          aria-label="Copy"
          icon={<FiCopy />}
          size="sm"
          colorScheme="blue"
          onClick={copyToClipboard}
        />
            
          </div>
        );
      };

      
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
          "https://health.prestigedelta.com/appointments/available_slots/",
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
    navigate('/call', { state: { item } }); // Navigate using the ID
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

  const handleLogout = () => {
    localStorage.removeItem('user-info');
    navigate('/');
  };
  
  return (
    <ChakraProvider>
    <div className="main-content">
      <Box p={5} >
      <Sidebar navigate={navigate} handleLogout={handleLogout} />

        <Heading textAlign='center' fontSize="24px" mb={4}>
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
            bookedItems.map((item, index) => {
              const dynamicLink = `https://prestige-doctor.vercel.app/appointment?channel=${item.channel_name}`;
              return (
                <Box
                  key={index}
                  p={4}
                  bg="white"
                  shadow="md"
                  borderRadius="md"
                  onClick={() => handleCalls(item)}
                >
                  <Text fontSize="md" fontWeight="bold" color="blue.500">
                    Patient ID: {item.patient_id}
                  </Text>
                  <Text fontSize="sm">Time: {new Date(item.start_time).toLocaleString()}</Text>
                 <Flex gap='15px'>
                  <Text>Patient link: {dynamicLink}</Text>
                  <CopyButton textToCopy={dynamicLink} />
                  </Flex>
                  <Button colorScheme='blue'>Start call</Button>
                </Box>
              );
            })
          ) : (
            <Text color="gray.500">No booked appointments available.</Text>
          )}
        </VStack>
      </Box>
      </div>
    </ChakraProvider>
  );
};

export default DocDash;
