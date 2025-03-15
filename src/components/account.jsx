import React, {useState, useRef, useEffect} from 'react';
import {
    Box,
    Text,
    Flex,
    Button,
    useToast,
    IconButton,
    ChakraProvider,
    VStack,
    HStack,
    Divider,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalFooter,
    ModalBody,
    ModalCloseButton,
    FormControl,
    FormLabel,
    FormErrorMessage, // Import FormErrorMessage
    Input,
    NumberInput,
    NumberInputField,
    useDisclosure,
    Stack,
    Icon
} from "@chakra-ui/react";
import { FiCopy, FiShoppingCart, FiArrowUpRight, FiArrowDownLeft } from "react-icons/fi";
import { useNavigate } from 'react-router-dom';
import { getAccessToken } from './api';
import Sidebar from './sidebar';


const Account = () => {
    const [balance, setBal] = useState(null);
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const toast = useToast();
    const [isSidebarMinimized, setIsSidebarMinimized] = useState(false);
    const { isOpen, onOpen, onClose } = useDisclosure();
    const [buyCreditsAmountNgn, setBuyCreditsAmountNgn] = useState(''); // Allow empty initial value
    const [usdCredits, setUsdCredits] = useState(0);
    const [isBuyingCredits, setIsBuyingCredits] = useState(false);
    const [isBuyCreditsAmountValid, setIsBuyCreditsAmountValid] = useState(false); // State for validation


    const userInfo = localStorage.getItem('user-info');
    const parsedUserInfo = userInfo ? JSON.parse(userInfo) : null;
    const bvnStatus = parsedUserInfo ? parsedUserInfo.user.bvn_verified : "NOT_VERIFIED" ;


    const handleBuyCreditsOpen = () => {
        setBuyCreditsAmountNgn(''); // Reset amount when modal opens
        setIsBuyCreditsAmountValid(false); // Reset validation state
        setUsdCredits(0); // Reset USD credits
        onOpen();
    };

    useEffect(() => {
        const amount = parseInt(buyCreditsAmountNgn, 10) || 0;
        setUsdCredits(amount / 1500);
        setIsBuyCreditsAmountValid(amount >= 5000); // Update validation state
    }, [buyCreditsAmountNgn]);


    const handleBuyCredits = async () => {
      let amount = buyCreditsAmountNgn
      navigate('/payment', { state: { amount } });
        if (!isBuyCreditsAmountValid) return; // Prevent buy if not valid
        setIsBuyingCredits(true);
        // Simulate API call for buying credits
        setTimeout(() => {
            setIsBuyingCredits(false);
            onClose();
            toast({
                title: 'Credits Purchased',
                description: `Successfully purchased $${usdCredits.toFixed(2)} credits.`,
                status: 'success',
                duration: 5000,
                isClosable: true,
            });
            fetchData(); // Refresh balance after purchase simulation
        }, 2000);
    };


    const withDraw = async () => {
        if (bvnStatus === "NOT_VERIFIED") {
          toast({
            title: 'BVN not Verified',
            description: 'Your BVN is not verified. Please verify your BVN to proceed with withdrawals.',
            status: 'error',
            duration: 5000,
            isClosable: true,
          });
          setTimeout(() => {
            navigate('/organization');
          }, 2000);
          return;
        }

          if (!balance || balance.available_balance <= 0) {
            toast({
              title: 'Invalid Withdrawal Amount',
              description: 'You do not have sufficient balance to withdraw or balance is invalid.',
              status: 'error',
              duration: 5000,
              isClosable: true,
            });
            return;
          }

          const dat = {
            amount: balance.available_balance,
          };

          const token = await getAccessToken();

          setLoading(true);
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
             setLoading(false);

            if (response.ok) {
              toast({
                title: 'Withdrawal Successful',
                description: result.message || 'Withdrawal request submitted successfully.',
                status: 'success',
                duration: 5000,
                isClosable: true,
              });
              fetchData();
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
            setLoading(false);
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


        const fetchData = async () => {
            const accessToken = await getAccessToken();
            if (!accessToken) return;
            setLoading(true);
            try {
                let response = await fetch("https://health.prestigedelta.com/balance/",{
                method: "GET",
                headers:{'Authorization': `Bearer ${accessToken}`},
                });
                 if (!response.ok) {
                    console.error(`HTTP error! status: ${response.status}`);
                     navigate('/error', { replace: true });
                    return;
                }
                const responseData = await response.json();
                setBal(responseData);
            } catch (error) {
                console.error("Fetching balance failed:", error);
                 toast({
                    title: 'Fetch Balance Error',
                    description: 'Failed to load balance details.',
                    status: 'error',
                    duration: 5000,
                    isClosable: true,
                  });
            } finally {
                setLoading(false);
            }
        };

        useEffect(() => {
          fetchData();
        }, []);


        const handleLogout = () => {
            localStorage.removeItem('user-info');
            navigate('/');
          };

  return (
    <ChakraProvider >
    <Flex direction="column" minH="100vh">
    <Box flex="1" overflowY="auto">
    <Sidebar
      onToggleSidebar={(minimized) => setIsSidebarMinimized(minimized)}
      onNavigate={(path) => navigate(path)}
      onLogout={handleLogout}
    />
    <div className={`${isSidebarMinimized ? 'ml-14 md:ml-76' : 'ml-0 md:ml-64'} flex-1 transition-all duration-300`}>
    <Box bg="blue.50" minH="100vh" p={4} overflowY="auto">
      {/* Header */}
      <Text fontSize="xl" fontWeight="bold" mb={6} textAlign="center">
        Account Overview
      </Text>

      <VStack spacing={6} align="stretch">
          <Box bg="white" p={6} borderRadius="md" shadow="md" textAlign="center">
              <Text fontSize="lg" fontWeight="semibold" mb={2}>
                  Available Credits
              </Text>
              {loading && !balance ? (
                  <Text>Loading balance...</Text>
              ) : (
                  <Text fontSize="3xl" fontWeight="bold" color="blue.600">
                      ${balance && balance.available_balance !== undefined ? (balance.available_balance).toLocaleString('en-US') : '0.00'}
                  </Text>
              )}
          </Box>

          <Flex justifyContent="center"> {/* Center the buttons */}
            <HStack spacing={4}>
                <Button
                    colorScheme="green"
                    size="lg"
                    leftIcon={<Icon as={FiShoppingCart} />}
                    onClick={handleBuyCreditsOpen}
                >
                    Buy Credits
                </Button>
                <Button
                    colorScheme="blue"
                    size="lg"
                    rightIcon={<Icon as={FiArrowUpRight} />}
                    onClick={withDraw}
                    isLoading={loading}
                    isDisabled={loading}
                >
                    Withdraw
                </Button>
            </HStack>
          </Flex>


        {/* Transaction History */}
        <Box bg="white" p={6} borderRadius="md" shadow="md">
          <Text fontSize="md" fontWeight="bold" mb={5}>
            Transaction History
          </Text>
          <VStack divider={<Divider />} spacing={4} align="stretch">
            {balance && balance.transactions && balance.transactions.length > 0 ? (
              balance.transactions.map((transaction) => (
                <Flex key={transaction.id} justify="space-between" align="center" p={3} borderRadius="md" _hover={{ bg: 'gray.50' }}>
                  <Box>
                    <Text fontWeight="medium">{transaction.description}</Text>
                    <Text fontSize="sm" color="gray.500">
                      {new Date(transaction.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(transaction.created_at).toLocaleDateString()}
                    </Text>
                  </Box>
                  <Text
                    fontWeight="bold"
                    color={parseFloat(transaction.amount) >= 0 ? "green.500" : "red.500"}
                    ml={4}
                    textAlign="right"
                  >
                    {parseFloat(transaction.amount) >= 0 ? '+' : '-'} ${Math.abs(parseFloat(transaction.amount)).toFixed(2)}
                  </Text>
                </Flex>
              ))
            ) : (
              <Box textAlign="center" color="gray.500" py={4}>
                No transactions available.
              </Box>
            )}
          </VStack>
        </Box>
      </VStack>


        {/* Buy Credits Modal */}
        <Modal isOpen={isOpen} onClose={onClose} isCentered>
            <ModalOverlay />
            <ModalContent>
                <ModalHeader textAlign="center">Buy Credits</ModalHeader>
                <ModalCloseButton />
                <ModalBody>
                    <VStack spacing={4} align="stretch">
                        <FormControl isInvalid={!isBuyCreditsAmountValid}>
                            <FormLabel>Enter Amount in NGN (Minimum 5000)</FormLabel>
                            <NumberInput
                                placeholder="Enter NGN Amount"
                                value={buyCreditsAmountNgn}
                                onChange={(valueString) => setBuyCreditsAmountNgn(valueString)}
                            >
                                <NumberInputField />
                            </NumberInput>
                            {!isBuyCreditsAmountValid && (
                                <FormErrorMessage>
                                    Minimum amount to buy credits is NGN 5000.
                                </FormErrorMessage>
                            )}
                        </FormControl>
                        <Box textAlign="center">
                            <Text fontSize="sm" color="gray.600">
                                You will receive approximately:
                            </Text>
                            <Text fontSize="xl" fontWeight="bold">
                                ${usdCredits.toFixed(2)} in Credits
                            </Text>
                            <Text fontSize="xs" color="gray.500">
                                (Conversion rate: 1500 NGN = 1 USD)
                            </Text>
                        </Box>
                    </VStack>
                </ModalBody>

                <ModalFooter justifyContent="center"> {/* Center buttons in footer */}
                    <HStack spacing={4}>
                        <Button colorScheme="gray" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button colorScheme="green" onClick={handleBuyCredits} isLoading={isBuyingCredits} isDisabled={!isBuyCreditsAmountValid || isBuyingCredits}>
                            Buy Credits
                        </Button>
                    </HStack>
                </ModalFooter>
            </ModalContent>
        </Modal>


    </Box>
    </div>
    </Box>
    </Flex>
    </ChakraProvider>
  );

};

export default Account;