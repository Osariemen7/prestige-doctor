import React, {useState, useRef, useEffect} from 'react';
import { Box, Text, Flex, Button,useToast, IconButton, ChakraProvider } from "@chakra-ui/react";
import { FiCopy } from "react-icons/fi";
import { useNavigate } from 'react-router-dom';
import { getAccessToken } from './api';
import Sidebar from './sidebar'; // Import Sidebar component


const Account = () => {
    const [data, setData] = useState(null); // Initialize data to null to handle initial rendering when data is not yet fetched
    const [balance, setBal] = useState(null); // Initialize balance to null for similar reasons
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true); // You are setting loading to true but not using it to control UI. Consider using it.
    const [message, setMessage] = useState('');
    const toast = useToast();

    const userInfo = localStorage.getItem('user-info');
    const parsedUserInfo = userInfo ? JSON.parse(userInfo) : null;
    const bvnStatus = parsedUserInfo ? parsedUserInfo.user.bvn_verified : "NOT_VERIFIED" ; // Default to NOT_VERIFIED if no user info

    const withDraw = async () => {
        if (bvnStatus === "NOT_VERIFIED") {
          toast({
            title: 'BVN not Verified',
            description: 'Your BVN is not verified. Please verify your BVN to proceed with withdrawals.',
            status: 'error',
            duration: 5000,
            isClosable: true,
          });
          navigate('/organization');
          return;
        }

        if (!balance || balance.available_balance <= 0) { // Access available_balance from balance object
          toast({
            title: 'Invalid Withdrawal Amount',
            description: 'You do not have sufficient balance to withdraw or balance is invalid.', // Improved description
            status: 'error',
            duration: 5000,
            isClosable: true,
          });
          return;
        }

        const dat = {
          amount: balance.available_balance, // Use available_balance for withdrawal amount
        };

        const token = await getAccessToken();

        try {
          const response = await fetch(
            'https://health.prestigedelta.com/banktransfer/',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify(dat),
            }
          );

          const result = await response.json();

          if (response.ok) {
            setMessage(result);

            toast({
              title: 'Withdrawal Successful',
              description: result.message || 'Withdrawal request submitted successfully.',
              status: 'success',
              duration: 5000,
              isClosable: true,
            });
            fetchData(); // Refresh balance after successful withdrawal
          } else {
            let errorMessage = 'Failed to Withdraw.';
            if (result && result.message) {
              errorMessage = result.message;
            } else if (response.statusText) {
              errorMessage = `Withdrawal Failed: ${response.status} ${response.statusText}`;
            }
            throw new Error(errorMessage);
          }
        } catch (error) {
          console.error(error);
          toast({
            title: 'Withdrawal Error',
            description: error.message,
            status: 'error',
            duration: 5000,
            isClosable: true,
          });
        }
      };


    const CopyButton = ({ textToCopy }) => {
        const copyToClipboard = async () => {
          if (!textToCopy) {
            toast({
              title: 'Copy Error',
              description: 'No account number to copy.',
              status: 'error',
              duration: 3000,
              isClosable: true,
            });
            return;
          }
          try {
            await navigator.clipboard.writeText(textToCopy);
            toast({
              title: 'Copied!',
              description: 'Account number copied to clipboard.',
              status: 'success',
              duration: 3000,
              isClosable: true,
            });
          } catch (err) {
            console.error('Unable to copy to clipboard.', err);
            toast({
              title: 'Copy Error',
              description: 'Failed to copy account number.',
              status: 'error',
              duration: 3000,
              isClosable: true,
            });
          }
        };
        return (
            <IconButton
            aria-label="Copy Account Number"
            icon={<FiCopy />}
            size="sm"
            colorScheme="blue"
            onClick={copyToClipboard}
          />
        );
      };

        const fetchDat = async () => {
            setLoading(true); // Start loading before fetching
            const accessToken = await getAccessToken();
            if (!accessToken) {
                setLoading(false); // Stop loading if no token
                return;
            }
            try {
                let response = await fetch("https://health.prestigedelta.com/virtualnuban/",{
                method: "GET",
                headers:{'Authorization': `Bearer ${accessToken}`},
                });
                if (!response.ok) {
                    // Handle non-200 responses, maybe redirect to an error page
                    console.error(`HTTP error! status: ${response.status}`);
                  setLoading(false);
                    return;
                }
                const responseData = await response.json();
                 setData(responseData); // Directly use responseData as it's already parsed JSON
            } catch (error) {
                console.error("Fetching account data failed:", error);
                toast({
                    title: 'Fetch Account Error',
                    description: 'Failed to load account details.',
                    status: 'error',
                    duration: 5000,
                    isClosable: true,
                  });
            } finally {
                setLoading(false); // Stop loading after fetch completes, success or error
            }
        };

        useEffect(() => {
          fetchDat();
        }, []);

        const fetchData = async () => {
            const accessToken = await getAccessToken();
            if (!accessToken) return;
            try {
                let response = await fetch("https://health.prestigedelta.com/balance/",{
                method: "GET",
                headers:{'Authorization': `Bearer ${accessToken}`},
                });
                 if (!response.ok) {
                    // Handle non-200 responses
                    console.error(`HTTP error! status: ${response.status}`);
                     navigate('/error', { replace: true }); // Or handle error as needed
                    return;
                }
                const responseData = await response.json();
                setBal(responseData); // Directly use responseData
            } catch (error) {
                console.error("Fetching balance failed:", error);
                 toast({
                    title: 'Fetch Balance Error',
                    description: 'Failed to load balance details.',
                    status: 'error',
                    duration: 5000,
                    isClosable: true,
                  });
            }
        };

        useEffect(() => {
          fetchData();
        }, []); // Removed loading dependency, fetch balance on component mount


        const handleLogout = () => {
            localStorage.removeItem('user-info');
            navigate('/');
          };

  return (
    <ChakraProvider >
     <Sidebar navigate={navigate} handleLogout={handleLogout} />
     <div className='main-content'>
    <Box bg="blue.50" minH="100vh" p={4} >
      {/* Header */}
      <Text fontSize="xl" fontWeight="bold" mb={6}>
        Hello!
      </Text>

      {loading ? (
          <Text>Loading account information...</Text> // Basic loading state
      ) : (
      <Box bg="white" p={4} borderRadius="md" shadow="sm">
        {/* Bank Name */}
        {data && data.bank && ( // Conditional rendering to avoid errors if data is null
          <Text fontSize="sm" color="gray.500">
            {data.bank}
          </Text>
        )}

        {/* Account Number and Copy Button */}
        <Flex justify="space-between" align="center" mt={2}>
          <Box>
            {data && data.account_number && (
              <Text fontSize="md" fontWeight="bold">
                {data.account_number}
              </Text>
            )}
            {data && data.account_name && (
              <Text fontSize="sm" color="gray.500">
                {data.account_name}
              </Text>
            )}
          </Box>
          {data && data.account_number && <CopyButton textToCopy={data.account_number} />}
        </Flex>
        <Box mt={4}>
          {balance && balance.available_balance !== undefined ? (
            <>
              <Text fontSize="2xl" fontWeight="bold" color="blue.700">
                ₦{(balance.available_balance)}
              </Text>
              <Button colorScheme='blue' size='sm' mt={2} onClick={withDraw} isLoading={loading}> {/* Consider adding loading state to button */}
                Withdraw
              </Button>
            </>
          ) : (
            <Text>Balance information not available.</Text>
          )}
        </Box>
      </Box>
      )}


      {/* Transaction History - Example, you'll need to populate this dynamically */}
      <Box bg="white" p={4} borderRadius="md" shadow="sm" mt={6}>
        <Text fontSize="md" fontWeight="bold" mb={4}>
          Transaction History (Example)
        </Text>
        <Box border="1px" borderColor="gray.200" p={3} borderRadius="md">
          <Flex justify="space-between" align="center">
            <Text fontSize="sm" fontWeight="medium">
              Example Transaction
            </Text>
            <Text fontSize="sm" color="green.500">
              +₦100.00
            </Text>
          </Flex>
          <Text fontSize="xs" color="gray.500">
            2024-08-07 10:00 AM
          </Text>
        </Box>
        {/* Add more transaction history items here */}
      </Box>
    </Box>
    </div>
    </ChakraProvider>
  );

};

export default Account;