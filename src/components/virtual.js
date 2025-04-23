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
  Button,
  SimpleGrid,
  useColorModeValue,
  Badge,
  Container,
  Card,
  CardBody,
  CardHeader,
  CardFooter,
  Stat,
  StatLabel,
  StatNumber,
  StatGroup,
  Skeleton,
  Image,
  useBreakpointValue,
  Grid,
  GridItem,
  Tooltip,
  SkeletonText,
} from "@chakra-ui/react";
import { FiCopy, FiVideo, FiCalendar, FiClock, FiUser } from 'react-icons/fi';
import { motion } from "framer-motion";
import axios from "axios";
import { getAccessToken } from "./api";
import {useNavigate} from 'react-router-dom';
import Sidebar from './sidebar'; // Import Sidebar component
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Textarea,
  useToast,
  useDisclosure,
} from '@chakra-ui/react';
import { Input, Select } from "@chakra-ui/react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "./virtual.css";  // Add this line to import the custom styles

const MotionBox = motion(Box);
const MotionButton = motion(Button);

const Va = () => {
  const [data, setData] = useState(null);
  const [info, setInfo] = useState([]);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [date, setDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [phoneNumber, setPhone] = useState('');
  const [reason, setReason] = useState('');
  const [buttonVisible, setButtonVisible] = useState(false);
  const [startTime, setStartTime] = useState('2025-01-25 09:00');
  const toast = useToast();
  const [message, setmessage] = useState('');
  const [isInstance, setInstance] = useState(false);
  const [link, setLink] = useState('');
  const [dataList, setDataList] = useState([]);
  const modal1 = useDisclosure();
  const modal2 = useDisclosure();
  const [isSidebarMinimized, setIsSidebarMinimized] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [isManualInput, setIsManualInput] = useState(false);
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  const handlePatientSelect = (value) => {
    if (value === 'manual') {
      setIsManualInput(true);
      setSelectedPatientId('');
      setPhone('');
    } else {
      setIsManualInput(false);
      setSelectedPatientId(value);
      const selectedPatient = dataList.find(patient => patient.id.toString() === value);
      if (selectedPatient) {
        setPhone(selectedPatient.phone_number);
      }
    }
  };

  const navigate = useNavigate()
  const opt =['Yes', 'No']

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
      if (date) {
        fetchAvailableSlots(date);
      }
    }, [date]);
    
  const handleSubmit = async () => {
    setButtonVisible(true);

    // Only format phone number if using manual input
    const phone_number = isManualInput && phoneNumber ? `+234${phoneNumber.slice(1)}` : '';
    const formattedStartTime = formatDateTime(startTime);

    // Base data object
    let data = {
      start_time: formattedStartTime,
      reason,
      is_instant: isInstance
    };

    // Add either phone_number or patient_id based on selection
    if (isManualInput) {
      if (phone_number) {
        data.phone_number = phone_number;
      }
    } else {
      if (selectedPatientId) {
        data.patient_id = parseInt(selectedPatientId);
      }
    }

    const token = await getAccessToken();

    try {
        const response = await fetch('https://health.prestigedelta.com/appointments/book/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(data),
        });
      
        if (response.ok) {
            toast({
                title: 'Appointment booked successfully!',
                description: `Your appointment is scheduled for ${startTime}.`,
                status: 'success',
                duration: 5000,
                isClosable: true,
            });
            const result = await response.json()
            setLink(result)
            modal1.onClose(); // Close the modal
        } else if (response.ok && isInstance === true){
          const result = await response.json()
             setLink(result)
        }
        else {
          const errorResult = await response.json()
          setmessage(errorResult.message)
            throw new Error('Failed to book the appointment.');
            
        }
    } catch (error) {
        toast({
            title: 'Error',
            description: error.message,
            status: 'error',
            duration: 5000,
            isClosable: true,
        });
    } finally {
        setButtonVisible(false); // Reset loading state
    }
};
const handleSubmit2 = async () => {
  setButtonVisible(true);

  // Only format phone number if using manual input
  const phone_number = isManualInput && phoneNumber ? `+234${phoneNumber.slice(1)}` : '';
  const formattedStartTime = formatDateTime(startTime);

  // Base data object
  let data = {
    start_time: formattedStartTime,
    reason,
    is_instant: true
  };

  // Add either phone_number or patient_id based on selection
  if (isManualInput) {
    if (phone_number) {
      data.phone_number = phone_number;
    }
  } else {
    if (selectedPatientId) {
      data.patient_id = parseInt(selectedPatientId);
    }
  }

  const token = await getAccessToken();

  try {
      const response = await fetch('https://health.prestigedelta.com/appointments/book/', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(data),
      });
    
      if (response.ok) {
          toast({
              title: 'Appointment booked successfully!',
              description: `Your appointment is scheduled for ${startTime}.`,
              status: 'success',
              duration: 5000,
              isClosable: true,
          });
          const result = await response.json()
          setLink(result)
          modal2.onClose(); // Close the modal
      } else if (response.ok && isInstance === true){
        const result = await response.json()
           setLink(result)
      }
      else {
        const errorResult = await response.json()
        setmessage(errorResult.message)
          throw new Error('Failed to book the appointment.');
          
      }
  } catch (error) {
      toast({
          title: 'Error',
          description: error.message,
          status: 'error',
          duration: 5000,
          isClosable: true,
      });
  } finally {
      setButtonVisible(false); // Reset loading state
  }
};

useEffect(() => {
  const fetchSlotsData = async () => {
    if (!date) return;
    
    await fetchAvailableSlots(date);
  };

  fetchSlotsData();
}, [date]);

const options = info.map((slot) => (
  <option key={slot.start_time} value={slot.start_time}>
    {slot.start_time}
  </option>
));

 const formatDateTime = (isoString) => {
    return isoString.replace('T', ' ').slice(0, 16); // Ensures 'YYYY-MM-DD HH:MM' format
  };
 
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
console.log(link)
      
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

  const handleInstCalls = () => {
    const item = link.appointment
    navigate('/call', { state: { item } }); // Navigate using the ID
  };
  const cLink = link?.appointment?.channel_name
  ? `https://prestige-doctor.vercel.app/appointment?channel=${link.appointment.channel_name}&reviewId=${link.appointment.review_id}`
  : '';

  if (loading) {
    return (
      <Flex justify="center" align="center" height="100vh">
        <Spinner size="xl" />
      </Flex>
    );
  }

  const bookedItems = info.filter((item) => item.status === "BOOKED");

 
  const handleLogout = () => {
    localStorage.removeItem('user-info');
    navigate('/');
  };
  
  const fetchAvailableSlots = async (selectedDate) => {
    setIsLoadingSlots(true);
    try {
      const token = await getAccessToken();
      const response = await axios.get(
        `https://health.prestigedelta.com/appointments/available_slots/?date=${selectedDate}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setAvailableSlots(response.data);
      if (response.data.length > 0) {
        setStartTime(response.data[0].start_time);
      }
    } catch (error) {
      console.error("Error fetching slots:", error);
      toast({
        title: "Error",
        description: "Failed to fetch available time slots",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoadingSlots(false);
    }
  };

  // Group slots by hour
  const groupSlotsByHour = (slots) => {
    const grouped = {};
    slots.forEach(slot => {
      const hour = new Date(slot.start_time).getHours();
      if (!grouped[hour]) {
        grouped[hour] = [];
      }
      grouped[hour].push(slot);
    });
    return grouped;
  };

  const formatTime = (timeString) => {
    const date = new Date(timeString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleDateChange = (date) => {
    setSelectedDate(date);
    setDate(date.toISOString().split('T')[0]);
  };

 
  return (
    <div className="dashboard-container">
      <Sidebar 
        onToggleSidebar={(minimized) => setIsSidebarMinimized(minimized)} 
        onNavigate={(path) => navigate(path)} 
        onLogout={handleLogout}
      />
      <div className={`${isSidebarMinimized ? 'ml-14 md:ml-76' : 'ml-0 md:ml-64'} flex-1 transition-all duration-300`}> 
        <ChakraProvider>
          <Box p={5} bg={bgColor}>
            <Container maxW="container.xl">
              <VStack spacing={8} align="stretch">
                <Flex 
                  direction={['column', 'row']} 
                  justify="space-between" 
                  align="center"
                  mb={6}
                >
                  <Heading size="lg" mb={[4, 0]}>Virtual Appointments</Heading>
                  <Flex gap={4}>
                    <MotionButton
                      colorScheme="blue"
                      size="lg"
                      leftIcon={<FiCalendar />}
                      onClick={modal1.onOpen}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      Schedule Call
                    </MotionButton>
                    <MotionButton
                      colorScheme="green"
                      size="lg"
                      leftIcon={<FiVideo />}
                      onClick={modal2.onOpen}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      Instant Call
                    </MotionButton>
                  </Flex>
                </Flex>

                <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
                  <Card>
                    <CardBody>
                      <Stat>
                        <StatLabel>Total Appointments</StatLabel>
                        <StatNumber>{bookedItems.length}</StatNumber>
                      </Stat>
                    </CardBody>
                  </Card>
                  <Card>
                    <CardBody>
                      <Stat>
                        <StatLabel>Today's Appointments</StatLabel>
                        <StatNumber>
                          {bookedItems.filter(item => 
                            new Date(item.start_time).toDateString() === new Date().toDateString()
                          ).length}
                        </StatNumber>
                      </Stat>
                    </CardBody>
                  </Card>
                  <Card>
                    <CardBody>
                      <Stat>
                        <StatLabel>Available Slots</StatLabel>
                        <StatNumber>{info.length - bookedItems.length}</StatNumber>
                      </Stat>
                    </CardBody>
                  </Card>
                </SimpleGrid>

                <Box>
                  <Heading size="md" mb={4}>Upcoming Appointments</Heading>
                  <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
                    {loading ? (
                      Array(3).fill(0).map((_, i) => (
                        <Card key={i}>
                          <CardBody>
                            <VStack align="stretch" spacing={4}>
                              <Skeleton height="20px" />
                              <Skeleton height="20px" />
                              <Skeleton height="20px" />
                            </VStack>
                          </CardBody>
                        </Card>
                      ))
                    ) : bookedItems.length > 0 || link?.appointment ? (
                      <>
                        {bookedItems.map((item, index) => {
                          const dynamicLink = `https://prestige-doctor.vercel.app/appointment?channel=${item.appointment.channel_name}`;
                          const appointmentDate = new Date(item.start_time);
                          const isToday = appointmentDate.toDateString() === new Date().toDateString();

                          return (
                            <MotionBox
                              key={index}
                              whileHover={{ y: -5 }}
                              transition={{ duration: 0.2 }}
                            >
                              <Card>
                                <CardHeader>
                                  <Flex justify="space-between" align="center">
                                    <Heading size="sm">Appointment #{index + 1}</Heading>
                                    <Badge
                                      colorScheme={isToday ? 'green' : 'blue'}
                                      variant="solid"
                                      borderRadius="full"
                                      px={3}
                                    >
                                      {isToday ? 'Today' : appointmentDate.toLocaleDateString()}
                                    </Badge>
                                  </Flex>
                                </CardHeader>
                                <CardBody>
                                  <VStack align="stretch" spacing={3}>
                                    <Flex align="center" gap={2}>
                                      <FiUser />
                                      <Text>Patient ID: {item.patient_id}</Text>
                                    </Flex>
                                    <Flex align="center" gap={2}>
                                      <FiClock />
                                      <Text>{appointmentDate.toLocaleTimeString()}</Text>
                                    </Flex>
                                    <Flex align="center" justify="space-between">
                                      <Text fontSize="sm" color="gray.600" noOfLines={1}>
                                        {dynamicLink}
                                      </Text>
                                      <CopyButton textToCopy={dynamicLink} />
                                    </Flex>
                                  </VStack>
                                </CardBody>
                                <CardFooter>
                                  <Button
                                    colorScheme="blue"
                                    width="full"
                                    leftIcon={<FiVideo />}
                                    onClick={() => handleCalls(item)}
                                  >
                                    Join Call
                                  </Button>
                                </CardFooter>
                              </Card>
                            </MotionBox>
                          );
                        })}
                        {link?.appointment && (
                          <MotionBox
                            whileHover={{ y: -5 }}
                            transition={{ duration: 0.2 }}
                          >
                            <Card>
                              <CardHeader>
                                <Flex justify="space-between" align="center">
                                  <Heading size="sm">Instant Appointment</Heading>
                                  <Badge
                                    colorScheme="green"
                                    variant="solid"
                                    borderRadius="full"
                                    px={3}
                                  >
                                    Now
                                  </Badge>
                                </Flex>
                              </CardHeader>
                              <CardBody>
                                <VStack align="stretch" spacing={3}>
                                  <Flex align="center" justify="space-between">
                                    <Text fontSize="sm" color="gray.600" noOfLines={1}>
                                      {cLink}
                                    </Text>
                                    <CopyButton textToCopy={cLink} />
                                  </Flex>
                                </VStack>
                              </CardBody>
                              <CardFooter>
                                <Button
                                  colorScheme="blue"
                                  width="full"
                                  leftIcon={<FiVideo />}
                                  onClick={handleInstCalls}
                                >
                                  Join Call
                                </Button>
                              </CardFooter>
                            </Card>
                          </MotionBox>
                        )}
                      </>
                    ) : (
                      <Box p={6} textAlign="center" borderRadius="lg" bg="white">
                        <Image
                          src="https://illustrations.popsy.co/gray/work-from-home.svg"
                          alt="No appointments"
                          maxW="200px"
                          mx="auto"
                          mb={4}
                        />
                        <Text color="gray.500">No appointments scheduled</Text>
                      </Box>
                    )}
                  </SimpleGrid>
                </Box>
              </VStack>
            </Container>

            {/* Existing modals */}
            <Modal isOpen={modal1.isOpen} onClose={modal1.onClose} size="xl">
              <ModalOverlay />
              <ModalContent maxW="4xl">
                <ModalHeader>Book Call Appointment</ModalHeader>
                <ModalCloseButton />
                <ModalBody>
                  <Flex direction={{ base: "column", md: "row" }} gap={6}>
                    <Box flex="1">
                      <FormControl>
                        <FormLabel>Select Date</FormLabel>
                        <Box 
                          borderWidth="1px" 
                          borderRadius="lg" 
                          p={2}
                          bg="white"
                          shadow="sm"
                        >
                          <DatePicker
                            selected={selectedDate}
                            onChange={handleDateChange}
                            inline
                            minDate={new Date()}
                            calendarClassName="custom-calendar"
                            dayClassName={date => {
                              const dateString = date.toISOString().split('T')[0];
                              return availableSlots.some(slot => 
                                slot.start_time.startsWith(dateString) && 
                                slot.status === "AVAILABLE"
                              ) ? "has-slots" : undefined;
                            }}
                          />
                        </Box>
                      </FormControl>
                    </Box>

                    <Box flex="1">
                      {isLoadingSlots ? (
                        <VStack spacing={4} align="stretch">
                          <Skeleton height="24px" width="150px" />
                          <Grid templateColumns="repeat(3, 1fr)" gap={2}>
                            {[...Array(9)].map((_, i) => (
                              <Skeleton key={i} height="36px" />
                            ))}
                          </Grid>
                        </VStack>
                      ) : date && availableSlots.length > 0 ? (
                        <Box>
                          <Text mb={4} fontWeight="bold">Available Time Slots</Text>
                          <Grid templateColumns="repeat(3, 1fr)" gap={3} maxH="400px" overflowY="auto">
                            {Object.entries(groupSlotsByHour(availableSlots)).map(([hour, slots]) => (
                              <React.Fragment key={hour}>
                                <GridItem colSpan={3} bg="gray.50" p={2} borderRadius="md">
                                  <Text fontWeight="bold">{`${hour}:00`}</Text>
                                </GridItem>
                                {slots.map((slot) => (
                                  <GridItem key={slot.start_time}>
                                    <Tooltip 
                                      label={slot.status === "AVAILABLE" ? "Click to select this time slot" : "This slot is already booked"}
                                      placement="top"
                                    >
                                      <Button
                                        size="sm"
                                        width="100%"
                                        colorScheme={slot.status === "AVAILABLE" ? 
                                          (startTime === slot.start_time ? "blue" : "gray") : 
                                          "red"}
                                        onClick={() => {
                                          if (slot.status === "AVAILABLE") {
                                            setStartTime(slot.start_time);
                                            setSelectedSlot(slot);
                                          }
                                        }}
                                        isDisabled={slot.status !== "AVAILABLE"}
                                        _hover={
                                          slot.status === "AVAILABLE" && startTime !== slot.start_time
                                            ? { bg: "gray.200" }
                                            : undefined
                                        }
                                        transition="all 0.2s"
                                      >
                                        {new Date(slot.start_time).toLocaleTimeString([], { 
                                          hour: '2-digit', 
                                          minute: '2-digit',
                                          hour12: true
                                        })}
                                      </Button>
                                    </Tooltip>
                                  </GridItem>
                                ))}
                              </React.Fragment>
                            ))}
                          </Grid>
                        </Box>
                      ) : date ? (
                        <Flex 
                          direction="column" 
                          align="center" 
                          justify="center" 
                          p={6} 
                          bg="gray.50" 
                          borderRadius="lg"
                        >
                          <Text color="gray.500" fontSize="lg">No available slots for selected date</Text>
                        </Flex>
                      ) : (
                        <Flex 
                          direction="column" 
                          align="center" 
                          justify="center" 
                          p={6} 
                          bg="gray.50" 
                          borderRadius="lg"
                        >
                          <Text color="gray.500" fontSize="lg">Please select a date to view available slots</Text>
                        </Flex>
                      )}
                    </Box>
                  </Flex>

                  {/* Rest of the form controls */}
                  <FormControl mt={4}>
                    <FormLabel>Select Patient</FormLabel>
                    <Select
                      placeholder="Select patient"
                      value={isManualInput ? 'manual' : selectedPatientId}
                      onChange={(e) => handlePatientSelect(e.target.value)}
                    >
                      <option value="manual">Enter Phone Number Manually</option>
                      {dataList.map((patient) => (
                        <option key={patient.id} value={patient.id.toString()}>
                          {patient.phone_number} {patient.full_name ? `(${patient.full_name})` : ''}
                        </option>
                      ))}
                    </Select>
                  </FormControl>
                  {isManualInput && (
                    <FormControl>
                      <FormLabel>Phone Number</FormLabel>
                      <Input
                        type="number"
                        value={phoneNumber}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Input Phone Number"
                      />
                    </FormControl>
                  )}
                  <FormControl>
                    <FormLabel>Reason for Appointment</FormLabel>
                    <Textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Enter the reason for your appointment"
                    />
                  </FormControl>
                  <Text color='red'>{message}</Text>
                </ModalBody>

                <ModalFooter>
                  <Button
                    colorScheme="blue"
                    mr={3}
                    onClick={handleSubmit}
                    isDisabled={loading} // Disable button while loading
                  >
                    {buttonVisible ? <Spinner size="sm" /> : 'Submit'}
                  </Button>
                  <Button variant="ghost" onClick={modal1.onClose}>
                    Cancel
                  </Button>
                </ModalFooter>
              </ModalContent>
            </Modal>
            <Modal isOpen={modal2.isOpen} onClose={modal2.onClose}>
              <ModalOverlay />
              <ModalContent>
                <ModalHeader>Start Instant Call</ModalHeader>
                <ModalCloseButton />
                <ModalBody>
                  <FormControl>
                    <FormLabel>Select Patient</FormLabel>
                    <Select
                      placeholder="Select patient"
                      value={isManualInput ? 'manual' : selectedPatientId}
                      onChange={(e) => handlePatientSelect(e.target.value)}
                    >
                      <option value="manual">Enter Phone Number Manually</option>
                      {dataList.map((patient) => (
                        <option key={patient.id} value={patient.id.toString()}>
                          {patient.phone_number} {patient.full_name ? `(${patient.full_name})` : ''}
                        </option>
                      ))}
                    </Select>
                  </FormControl>
                  {isManualInput && (
                    <FormControl>
                      <FormLabel>Phone Number</FormLabel>
                      <Input
                        type="number"
                        value={phoneNumber}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Input Phone Number"
                      />
                    </FormControl>
                  )}
                  <FormControl>
                    <FormLabel>Reason for Appointment</FormLabel>
                    <Textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Enter the reason for your appointment"
                    />
                  </FormControl>
                  <Text color='red'>{message}</Text>
                </ModalBody>

                <ModalFooter>
                  <Button
                    colorScheme="blue"
                    mr={3}
                    onClick={handleSubmit2}
                    isDisabled={loading} // Disable button while loading
                  >
                    {buttonVisible ? <Spinner size="sm" /> : 'Submit'}
                  </Button>
                  <Button variant="ghost" onClick={modal2.onClose}>
                    Cancel
                  </Button>
                </ModalFooter>
              </ModalContent>
            </Modal>
          </Box>
        </ChakraProvider>
      </div>
    </div>
  );
};

export default Va;
