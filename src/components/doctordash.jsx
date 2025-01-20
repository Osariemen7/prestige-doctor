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
import {
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  useColorModeValue,
} from "@chakra-ui/react";

const DocDash = () => {
  const [data, setData] = useState(null);
  const [info, setInfo] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate()

  const headingColor = useColorModeValue("gray.800", "white");
  const textColor = useColorModeValue("gray.700", "gray.300");
  const statBg = useColorModeValue("white", "gray.700");
  const borderColor = useColorModeValue("gray.200", "gray.600");
  const statNumberColor = useColorModeValue("blue.600","blue.300")
  
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
    <div className="dashboard-container">
    <div className="main-content">
      <Box p={5} >
      <Sidebar navigate={navigate} handleLogout={handleLogout} />

      <Box p={5}  >
      <Heading textAlign="center" fontSize="2xl" mb={6} color={headingColor}>
        Doctor's Dashboard
      </Heading>

      <Box mb={8}  >
        {data ? (
          <Flex direction={{ base: "column", md: "row" }} wrap="wrap"  gap={4} >
            <Stat boxShadow="md" bg={statBg} p={4} borderRadius="md" border="1px" borderColor={borderColor}>
              <StatLabel  color={textColor}>Total Subscribers</StatLabel>
              <StatNumber color={statNumberColor}>{total_subscribers}</StatNumber>
              {/* <StatHelpText>...</StatHelpText>  optional */}
            </Stat>

             <Stat boxShadow="md" bg={statBg} p={4} borderRadius="md" border="1px" borderColor={borderColor}>
              <StatLabel  color={textColor}>Current Earnings</StatLabel>
              <StatNumber color={statNumberColor}>{`₦${current_earnings}`}</StatNumber>
              {/* <StatHelpText>...</StatHelpText>  optional */}
            </Stat>

              <Stat boxShadow="md" bg={statBg} p={4} borderRadius="md" border="1px" borderColor={borderColor}>
              <StatLabel  color={textColor}>Projected Earnings</StatLabel>
              <StatNumber color={statNumberColor}>{`₦${projected_earnings}`}</StatNumber>
              {/* <StatHelpText>...</StatHelpText>  optional */}
            </Stat>

             <Stat boxShadow="md" bg={statBg} p={4} borderRadius="md" border="1px" borderColor={borderColor}>
              <StatLabel  color={textColor}>Patients Assigned</StatLabel>
              <StatNumber color={statNumberColor}>{num_patients_assigned}</StatNumber>
              {/* <StatHelpText>...</StatHelpText>  optional */}
            </Stat>

               <Stat boxShadow="md" bg={statBg} p={4} borderRadius="md" border="1px" borderColor={borderColor}>
              <StatLabel color={textColor}>Subscribers Rate</StatLabel>
              <StatNumber color={statNumberColor}>{`${subscription_rate}%`}</StatNumber>
              {/* <StatHelpText>...</StatHelpText>  optional */}
            </Stat>

               <Stat boxShadow="md" bg={statBg} p={4} borderRadius="md" border="1px" borderColor={borderColor}>
              <StatLabel  color={textColor}>Subscribers Patients</StatLabel>
              <StatNumber color={statNumberColor}>{subscribing_patients?.length}</StatNumber>
              {/* <StatHelpText>...</StatHelpText>  optional */}
            </Stat>

             <Stat boxShadow="md" bg={statBg} p={4} borderRadius="md" border="1px" borderColor={borderColor}>
              <StatLabel color={textColor}>Non-Subscribing Patients</StatLabel>
              <StatNumber color={statNumberColor}>{non_subscribing_patients?.length}</StatNumber>
              {/* <StatHelpText>...</StatHelpText>  optional */}
            </Stat>
          </Flex>
        ) : (
          <Text color="gray.500">No Data Available</Text>
        )}
      </Box>
      <Divider mb={4} borderColor={borderColor} />
    </Box>
      </Box>
      </div>
      </div>
    </ChakraProvider>
  );
};

export default DocDash;
