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
import { getUser } from './api'
import Sidebar from './sidebar';
import Confetti from 'react-confetti';

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
    const [showConfetti, setShowConfetti] = useState(false); // New state for confetti

    const userInfo = localStorage.getItem('user-info');
    const parsedUserInfo = userInfo ? JSON.parse(userInfo) : null;
    const bvnStatus = parsedUserInfo ? parsedUserInfo.user.bvn_verified : "NOT_VERIFIED" ;

    const url = 'https://health.prestigedelta.com/paystack/';
    const callback_url = 'https://prestige-health.vercel.app/components/callback';
  
     

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
      const users = await getUser()
      const phone_number = users.phone_number
      const email = users.email
      let amount = buyCreditsAmountNgn
      const item = { email, phone_number, amount, callback_url };

    let result = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify(item),
    });

    if (result.status !== 200) {
      const errorResult = await result.json();
      toast({
        title: 'Credits Purchase Unsuccessful',
        description: `${errorResult}`,
        status: 'error',
        duration: 5000,
        isClosable: true,
    });;
    } else {
      const responseData = await result.json();
      
      if (responseData.data && responseData.data.authorization_url) {
        window.location.href = responseData.data.authorization_url;
      } else {
        toast({
          title: 'Credits Purchase Unsuccessful',
          description: `Failed to retrieve Paystack authorization url`,
          status: 'error',
          duration: 5000,
          isClosable: true,
      });
      }
    }       
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


        const fetchConfetti = async () => {
            try {
                let response = await fetch("https://health.prestigedelta.com/confetti/");
                const data = await response.json();
                if (data.show_confetti) {
                    setShowConfetti(true);
                    setTimeout(() => setShowConfetti(false), 5000);
                }
            } catch (error) {
                console.error("Failed to fetch confetti", error);
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
                fetchConfetti();
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
    {showConfetti && <Confetti width={window.innerWidth} height={window.innerHeight} />}
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
              balance.transactions.map((transaction) => {
                  let transactionIcon;
                  if (transaction.type === 'CR') {
                      transactionIcon = <Icon as={FiArrowDownLeft} color="green.500" />;
                  } else if (transaction.type === 'DR') {
                      transactionIcon = <Icon as={FiArrowUpRight} color="red.500" />;
                  } else {
                      transactionIcon = <Icon as={FiCopy} color="gray.500" />;
                  }
                  return (
                      <Flex key={transaction.id} justify="space-between" align="center" p={3} borderRadius="md" _hover={{ bg: 'gray.50' }}>
                          <HStack spacing={3}>
                              <Box>
                                  {transactionIcon}
                              </Box>
                              <Box>
                                  <Text fontWeight="medium">{transaction.description}</Text>
                                  <Text fontSize="sm" color="gray.500">
                                      {new Date(transaction.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(transaction.created_at).toLocaleDateString()}
                                  </Text>
                              </Box>
                          </HStack>
                          <Text
                              fontWeight="bold"
                              color={
                                  transaction.type === 'CR'
                                      ? "green.500"
                                      : transaction.type === 'DR'
                                      ? "red.500"
                                      : "gray.500"
                              }
                              ml={4}
                              textAlign="right"
                          >
                              {transaction.type === 'CR'
                                  ? '+'
                                  : transaction.type === 'DR'
                                  ? '-'
                                  : ''} ${Math.abs(parseFloat(transaction.amount)).toFixed(2)}
                          </Text>
                      </Flex>
                  );
              })
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