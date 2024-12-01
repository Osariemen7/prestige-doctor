import React, {useState, useRef, useEffect} from 'react';
import { Box, Text, Flex, Button, IconButton, ChakraProvider } from "@chakra-ui/react";
import { FiCopy } from "react-icons/fi";
import { Link, useNavigate } from 'react-router-dom';
import { getAccessToken } from './api';
import Sidebar from './sidebar'; // Import Sidebar component




const Account = () => {
    const [data, setData] = useState('')
    const [balance, setBal] = useState('')
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
  
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
            aria-label="Copy Account Number"
            icon={<FiCopy />}
            size="sm"
            colorScheme="blue"
            onClick={copyToClipboard}
          />
              
            </div>
          );
        };

        const fetchDat = async () => {
            const accessToken = await getAccessToken();
      if (!accessToken) return;
          let response = await fetch("https://health.prestigedelta.com/virtualnuban/",{
          method: "GET",
          headers:{'Authorization': `Bearer ${accessToken}`},
          })
          response = await response.json()
          if (response.status !== 200) {
            navigate(window.location.pathname, { replace: true });
          } else {  
          response = await response.json();}
        
         setData(response)
          
        }
        useEffect(() => {
          fetchDat()
        }, [])
        const fetchData = async () => {
            const accessToken = await getAccessToken();
      if (!accessToken) return;
          let response = await fetch("https://health.prestigedelta.com/balance/",{
          method: "GET",
          headers:{'Authorization': `Bearer ${accessToken}`},
          })
          response = await response.json()
          if (response.status !== 200) {
            navigate(window.location.pathname, { replace: true });
          } else {  
          response = await response.json();}
        
         setBal(response)
          
        }
        useEffect(() => {
          fetchData()
        }, [])

        const handleLogout = () => {
            localStorage.removeItem('user-info');
            navigate('/');
          };

  return (
    <ChakraProvider bg="blue.50" minH="100vh" p={4}>
     <Sidebar navigate={navigate} handleLogout={handleLogout} />
     <div className='main-content'>
    <Box bg="blue.50" minH="100vh" p={4} >
      {/* Header */}
      <Text fontSize="xl" fontWeight="bold" mb={6}>
        Hello!
      </Text>

      {/* Account Details */}
      <Box bg="white" p={4} borderRadius="md" shadow="sm">
        {/* Bank Name */}
        <Text fontSize="sm" color="gray.500">
        {data.bank}
        </Text>

        {/* Account Number and Copy Button */}
        <Flex justify="space-between" align="center" mt={2}>
          <Box>
            <Text fontSize="md" fontWeight="bold">
            {data.account_number}
            </Text>
            <Text fontSize="sm" color="gray.500">
            {data.account_name}
            </Text>
          </Box>
          <CopyButton textToCopy={data.account_number} />
        </Flex>
        <Box mt={4}>
          <Text fontSize="2xl" fontWeight="bold" color="blue.700">
          ₦{(balance.available_balance)}
          </Text>
          <Text fontSize="sm" color="gray.500">
            Book balance: ₦0
          </Text>
        </Box>
      </Box>

      {/* Transaction History */}
      <Box bg="white" p={4} borderRadius="md" shadow="sm" mt={6}>
        <Text fontSize="md" fontWeight="bold" mb={4}>
          Transaction History
        </Text>
        <Box border="1px" borderColor="gray.200" p={3} borderRadius="md">
          <Flex justify="space-between" align="center">
            <Text fontSize="sm" fontWeight="medium">
              
            </Text>
            <Text fontSize="sm" color="green.500">
              
            </Text>
          </Flex>
          <Text fontSize="xs" color="gray.500">
            
          </Text>
        </Box>
      </Box>
    </Box>
    </div>
    </ChakraProvider>
  );
    
};

export default Account;
