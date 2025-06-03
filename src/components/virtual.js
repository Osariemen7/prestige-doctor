import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  ChakraProvider,
  Box,
  Flex,
  Heading,
  Text,
  Spinner,
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
  Skeleton,
  Image,
  Grid,
  GridItem,
  Tooltip,
  SkeletonText,
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
  Center,
  Input,
  Select,
} from "@chakra-ui/react";
import { FiCopy, FiVideo, FiCalendar, FiClock, FiUser } from 'react-icons/fi';
import { motion } from "framer-motion";
import axios from "axios";
import { getAccessToken } from "./api";
import { useNavigate } from 'react-router-dom';
import Sidebar from './sidebar';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import "./virtual.css";

const MotionBox = motion(Box);
const MotionButton = motion(Button);

// Helper function for formatting time slots for display
const formatTimeSlotForDisplay = (timeString) => {
  if (!timeString) return '';
  try {
    const date = new Date(timeString);
    if (isNaN(date.getTime())) {
      console.error('Invalid date for formatting:', timeString);
      return 'Invalid Time';
    }
    return date.toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).replace(/\s/, '').toLowerCase(); // Formats like "9:30am"
  } catch (error) {
    console.error('Error formatting time:', error, timeString);
    return 'Error Time';
  }
};


const Va = () => {
  const [info, setInfo] = useState([]); // Stores ALL appointment/slot info (booked and available initially)
  const scheduleModalDisclosure = useDisclosure();
  const instantModalDisclosure = useDisclosure();
  const [date, setDate] = useState(''); // YYYY-MM-DD string for API and selected date focus
  const [loading, setLoading] = useState(true); 
  const [phoneNumber, setPhone] = useState('');
  const [reason, setReason] = useState('');
  const [buttonVisible, setButtonVisible] = useState(false); 
  const [startTime, setStartTime] = useState(''); // ISO string for selected slot start time for booking
  const toast = useToast();
  const [message, setMessage] = useState(''); 
  const [link, setLink] = useState(null); 
  const [dataList, setDataList] = useState([]); 
  const [isSidebarMinimized, setIsSidebarMinimized] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [isManualInput, setIsManualInput] = useState(false);
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const [availableSlots, setAvailableSlots] = useState([]); // Slots for a SPECIFIC selected date (status: AVAILABLE)
  const [selectedSlot, setSelectedSlot] = useState(null); // Full object of the selected slot for booking
  const [selectedDate, setSelectedDate] = useState(null); // Date object for DatePicker/FullCalendar selection context
  const [isLoadingSlots, setIsLoadingSlots] = useState(false); 
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const navigate = useNavigate();

  // Memoized events for the main page FullCalendar (shows only scheduled appointments)
  const allCalendarEvents = useMemo(() => {
    return info
      .filter(slot => slot.status === "SCHEDULED")
      .map(slot => ({
        id: slot.appointment_id || slot.start_time,
        title: `Patient ${slot.patient_id || 'N/A'}`,
        start: slot.start_time,
        end: slot.end_time,
        allDay: false,
        backgroundColor: '#3182CE', // blue.500
        borderColor: '#2B6CB0', // blue.600
        textColor: 'white',
        classNames: ['fc-event-scheduled'],
        extendedProps: { ...slot }
      }));
  }, [info]);

  // Combined scheduled appointments for the upcoming appointments section
  const upcomingAppointments = useMemo(() => {
    const booked = info.filter(item => item.status === "BOOKED");
    const scheduled = info.filter(item => item.status === "SCHEDULED");
    
    return [...booked, ...scheduled].sort((a, b) => 
      new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );
  }, [info]);

  // Fetch patient list
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true); // Set loading for the whole page data fetching process
      const accessToken = await getAccessToken();
      if (!accessToken) {
        navigate('/'); 
        return;
      }
      try {
        const response = await fetch('https://health.prestigedelta.com/patientlist/', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json', accept: 'application/json', Authorization: `Bearer ${accessToken}`},
        });
        if (response.status === 401) navigate('/');
        else {
          const result = await response.json();
          setDataList(result);
        }
      } catch (error) {
        console.error('Error fetching patient list:', error);
        toast({ title: 'Error', description: 'Failed to fetch patient list.', status: 'error', duration: 3000, isClosable: true });
      } 
      // setLoading(false) will be handled by fetchAllSlots finally block
    };
    fetchData();
  }, [navigate, toast]);

  // Fetch ALL appointment slots data (initial load for main calendar)
  useEffect(() => {
    const fetchAllSlots = async () => {
      setLoading(true); // Ensure loading is true at the start of this major data fetch
      try {
        const accessToken = await getAccessToken();
        if (!accessToken) { setLoading(false); return; }
        const response = await axios.get("https://health.prestigedelta.com/appointments/available_slots/", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        setInfo(response.data); 
      } catch (error) {
        console.error("Error fetching all appointment slots data:", error);
        toast({ title: 'Error', description: 'Failed to fetch appointment slots.', status: 'error', duration: 3000, isClosable: true });
      } finally {
        setLoading(false); // This signals initial data loading is complete
      }
    };
    fetchAllSlots();
  }, [toast]);

  // Function to fetch available slots for a SPECIFIC date (for list view and modal calendar)
  const fetchAvailableSlots = useCallback(async (selectedDateStr) => {
    if (!selectedDateStr) {
      setAvailableSlots([]);
      return;
    }
    setIsLoadingSlots(true);
    try {
      const formattedDateForAPI = new Date(selectedDateStr).toISOString().split('T')[0];
      const token = await getAccessToken();
      if (!token) { setIsLoadingSlots(false); return; }

      const response = await axios.get(
        `https://health.prestigedelta.com/appointments/available_slots/?date=${formattedDateForAPI}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const validSlots = response.data.filter(slot => {
        try {
          const startDate = new Date(slot.start_time);
          // Ensure slots are in the future (or at least today, depending on strictness)
          // And explicitly check for 'AVAILABLE' status as this endpoint might return others too
          return !isNaN(startDate.getTime()) && slot.status === "AVAILABLE" && startDate >= new Date(new Date().setHours(0,0,0,0));
        } catch (e) {
          console.error('Invalid date in slot during filtering:', slot, e);
          return false;
        }
      }).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

      setAvailableSlots(validSlots);

    } catch (error) {
      console.error("Error fetching slots for date:", error);
      toast({
        title: "Error", description: "Failed to fetch available time slots.", status: "error",
        duration: 3000, isClosable: true,
      });
      setAvailableSlots([]);
    } finally {
      setIsLoadingSlots(false);
    }
  }, [toast]); // Removed startTime from deps as it doesn't directly influence fetching, only how fetched data might be pre-selected

  // Auto-fetch slots if `date` (YYYY-MM-DD string) changes and is valid
  useEffect(() => {
    if (date) { 
      fetchAvailableSlots(date);
    } else {
      setAvailableSlots([]); // Clear if no date string
    }
  }, [date, fetchAvailableSlots]);


  const handlePatientSelect = (value) => {
    if (value === 'manual') {
      setIsManualInput(true); setSelectedPatientId(''); setPhone('');
    } else {
      setIsManualInput(false); setSelectedPatientId(value);
      const selectedPatient = dataList.find(patient => patient.id.toString() === value);
      if (selectedPatient) setPhone(selectedPatient.phone_number || '');
    }
  };
  
  const handleBookingSubmit = async (isInstantBooking) => {
    setButtonVisible(true); setMessage(''); 

    // Validations
    if (!isInstantBooking) {
        if (!isManualInput && !selectedPatientId) {
            toast({ title: 'Validation Error', description: 'Please select a patient.', status: 'error', duration: 5000, isClosable: true });
            setButtonVisible(false); return;
        }
        if (isManualInput && !phoneNumber) {
            toast({ title: 'Validation Error', description: 'Please provide a phone number.', status: 'error', duration: 5000, isClosable: true });
            setButtonVisible(false); return;
        }
        if (!startTime) {
            toast({ title: 'Validation Error', description: 'Please select an appointment time.', status: 'error', duration: 5000, isClosable: true });
            setButtonVisible(false); return;
        }
    }
    if (!reason) {
        toast({ title: 'Validation Error', description: 'Please provide a reason for the appointment.', status: 'error', duration: 5000, isClosable: true });
        setButtonVisible(false); return;
    }

    const phone_number_to_send = isManualInput && phoneNumber ? `+234${phoneNumber.slice(1)}` : null;
    
    // Ensure startTime is a full ISO string for the API    // Format date as YYYY-MM-DD HH:MM for the API
    const formatToAPIDate = (date) => {
      return date.toISOString()
        .replace('T', ' ')
        .slice(0, 16);
    };

    const bookingStartTime = isInstantBooking 
        ? formatToAPIDate(new Date())
        : formatToAPIDate(new Date(startTime));

    let payload = {
        start_time: bookingStartTime,
        reason,
        is_instant: isInstantBooking
    };

    if (isManualInput && phone_number_to_send) payload.phone_number = phone_number_to_send;
    else if (!isManualInput && selectedPatientId) payload.patient_id = parseInt(selectedPatientId);
    
    const token = await getAccessToken();
    if(!token) {setButtonVisible(false); return; }

    try {
        const response = await fetch('https://health.prestigedelta.com/appointments/book/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
            body: JSON.stringify(payload),
        });
        const result = await response.json();

        if (response.ok) {
            toast({ title: 'Appointment booked successfully!', description: `Your appointment has been scheduled.`, status: 'success', duration: 5000, isClosable: true });
            setLink(result); 
            
            // Refresh all slots info for main calendar and booked items list
            const refreshedAllSlots = await axios.get("https://health.prestigedelta.com/appointments/available_slots/", { headers: { Authorization: `Bearer ${token}` } });
            setInfo(refreshedAllSlots.data);
            
            // If a date was selected, refresh its specific available slots too
            if (date) fetchAvailableSlots(date); 

            if (isInstantBooking) instantModalDisclosure.onClose();
            else scheduleModalDisclosure.onClose();
            
            // Reset form fields
            setReason(''); setPhone(''); setSelectedPatientId(''); setIsManualInput(false);
            setSelectedDate(null); setDate(''); setStartTime(''); setSelectedSlot(null);
        } else {
            setMessage(result.message || result.detail || 'Failed to book the appointment.');
            throw new Error(result.message || result.detail || 'Failed to book the appointment.');
        }
    } catch (error) {
        console.error("Booking error:", error);
        toast({ title: 'Booking Error', description: error.message, status: 'error', duration: 5000, isClosable: true });
    } finally {
        setButtonVisible(false);
    }
};

  const CopyButton = ({ textToCopy }) => {
    const copyToClipboard = async () => {
      try {
        await navigator.clipboard.writeText(textToCopy);
        toast({ title: 'Copied!', description: 'Link copied to clipboard.', status: 'success', duration: 2000, isClosable: true });
      } catch (err) {
        console.error('Unable to copy to clipboard.', err);
        toast({ title: 'Error', description: 'Failed to copy link.', status: 'error', duration: 2000, isClosable: true });
      }
    };
    return <IconButton aria-label="Copy" icon={<FiCopy />} size="sm" colorScheme="blue" onClick={copyToClipboard} />;
  };
      
  const handleCalls = (item) => { 
    if (item) navigate('/call', { state: { item: item } });
    else toast({title: "Error", description: "Appointment details missing.", status: "error"})
  };

  const handleInstCalls = () => {
    if (link && link.appointment) navigate('/call', { state: { item: link.appointment } });
    else toast({ title: 'Error', description: 'Instant call link not available.', status: 'error', duration: 3000, isClosable: true });
  };
  
  const cLink = link?.appointment?.channel_name && link?.appointment?.review_id
  ? `https://provider.prestigehealth.app/appointment?channel=${link.appointment.channel_name}&reviewId=${link.appointment.review_id}`
  : '';

  const bookedItems = useMemo(() => info.filter((item) => item.status === "BOOKED"), [info]);
 
  const handleLogout = () => {
    localStorage.removeItem('user-info'); 
    navigate('/');
  };
  
  const groupSlotsByHour = (slotsToList) => {
    if (!slotsToList || slotsToList.length === 0) return {};
    return slotsToList.reduce((groups, slot) => {
      const slotDate = new Date(slot.start_time);
      const hour = slotDate.getHours();
      let period = '';
      if (hour < 12) period = 'Morning';
      else if (hour < 17) period = 'Afternoon';
      else period = 'Evening';
      
      const timeLabel = `${period} (${slotDate.toLocaleTimeString([], { hour: 'numeric', hour12: true }).replace(/\s/,'').toLowerCase()} onwards)`;
      
      if (!groups[hour]) groups[hour] = { label: timeLabel, slots: [] };
      groups[hour].slots.push(slot);
      return groups;
    }, {});
  };
  
  // Global loading spinner for initial data
  if (loading) { 
    return <Flex justify="center" align="center" height="100vh"><Spinner size="xl" /></Flex>;
  }
 
  return (
    <div className="dashboard-container">
      <Sidebar 
        onToggleSidebar={(minimized) => setIsSidebarMinimized(minimized)} 
        onNavigate={(path) => navigate(path)} 
        onLogout={handleLogout}
      />
      <div className={`${isSidebarMinimized ? 'ml-14 md:ml-76' : 'ml-0 md:ml-64'} flex-1 transition-all duration-300`}> 
        <ChakraProvider> 
          <Box p={5} bg={bgColor} minH="100vh">
            <Container maxW="container.xl">
              <VStack spacing={8} align="stretch">
                <Flex direction={['column', 'row']} justify="space-between" align="center" mb={6}>
                  <Heading size="lg" mb={[4, 0]}>Virtual Appointments</Heading>
                  <Flex gap={2}> 
                    <MotionButton colorScheme="blue" size="md" leftIcon={<FiCalendar />}
                      onClick={() => {
                        const today = new Date();
                        setSelectedDate(today); 
                        setDate(today.toISOString().split('T')[0]); 
                        fetchAvailableSlots(today.toISOString().split('T')[0]).then(() => { // Ensure slots for today are loaded for modal
                           scheduleModalDisclosure.onOpen();
                        });
                      }}
                      whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    > Schedule Call </MotionButton>
                    <MotionButton colorScheme="green" size="md" leftIcon={<FiVideo />} onClick={instantModalDisclosure.onOpen}
                      whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    > Instant Call </MotionButton>
                  </Flex>
                </Flex>

                <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
                  <Card><CardBody><Stat><StatLabel>Total Upcoming</StatLabel><StatNumber>{bookedItems.length}</StatNumber></Stat></CardBody></Card>
                  <Card><CardBody><Stat><StatLabel>Today's Appointments</StatLabel>
                        <StatNumber>{bookedItems.filter(item => new Date(item.start_time).toDateString() === new Date().toDateString()).length}</StatNumber>
                  </Stat></CardBody></Card>
                  <Card><CardBody><Stat><StatLabel>Total Slots (All)</StatLabel><StatNumber>{info.length}</StatNumber></Stat></CardBody></Card>                
                </SimpleGrid>

                <Box mb={6}>
                  <Flex justify="space-between" align="center" mb={4}>
                    <Heading size="md">Full Schedule Overview</Heading>
                    <Button leftIcon={<FiCalendar />} colorScheme="teal" variant="outline" onClick={() => setShowCalendar(!showCalendar)}>
                      {showCalendar ? 'Hide Calendar' : 'Show Calendar'}
                    </Button>
                  </Flex>
                  {showCalendar && (
                    <Card p={{base:2, md:4}} mb={6} variant="outline" bg="white" shadow="sm">
                      <Flex direction={{ base: "column", lg: "row" }} gap={6}>
                        <Box flex={{ base: "1", lg: "1.5" }} className="main-calendar-wrapper">
                          <FullCalendar
                            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                            initialView="timeGridWeek"
                            headerToolbar={{
                              left: 'prev,next today',
                              center: 'title',
                              right: 'dayGridMonth,timeGridWeek,timeGridDay'
                            }}
                            events={allCalendarEvents}
                            eventClick={(eventClickInfo) => {
                              const { event } = eventClickInfo;
                              const appointmentInfo = event.extendedProps;
                              // Create a modal to display appointment details
                              toast({
                                title: "Appointment Details",
                                description: (
                                  <VStack align="start" spacing={2}>
                                    <Text fontWeight="bold">
                                      {formatTimeSlotForDisplay(event.start)} - {formatTimeSlotForDisplay(event.end)}
                                    </Text>
                                    <Text>Patient ID: {appointmentInfo.patient_id}</Text>
                                    {appointmentInfo.patient_phone_number && (
                                      <Text>Phone: {appointmentInfo.patient_phone_number}</Text>
                                    )}
                                    {appointmentInfo.channel_name && (
                                      <Button 
                                        size="sm" 
                                        colorScheme="blue" 
                                        leftIcon={<FiVideo />}
                                        onClick={() => handleCalls(appointmentInfo)}
                                        mt={2}
                                      >
                                        Join Call
                                      </Button>
                                    )}
                                  </VStack>
                                ),
                                status: "info",
                                duration: null,
                                isClosable: true,
                              });
                            }}
                            height="600px"
                            slotMinTime="08:00:00"
                            slotMaxTime="22:00:00"
                            allDaySlot={false}
                            nowIndicator={true}
                            dayMaxEvents={3}
                            eventDisplay="block"
                            slotEventOverlap={false}
                            expandRows={true}
                            stickyHeaderDates={true}
                            handleWindowResize={true}
                            weekNumbers={true}
                            businessHours={{
                              daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
                              startTime: '08:00',
                              endTime: '22:00',
                            }}
                            slotLabelFormat={{
                              hour: 'numeric',
                              minute: '2-digit',
                              meridiem: 'short'
                            }}
                          />
                        </Box>
                        <Box flex="1" mt={{base: 4, lg: 0}}>
                          <Heading size="sm" mb={4} borderBottomWidth="1px" pb={2}>
                            {selectedDate ? `Available Slots for ${selectedDate.toLocaleDateString()}` : "Click a date on the calendar"}
                          </Heading>
                          {isLoadingSlots ? (
                            <VStack spacing={3} align="stretch">
                              <SkeletonText mt="2" noOfLines={1} w="120px"/>
                              <SimpleGrid columns={{base:2, sm:3}} spacing={2}>
                                {[...Array(6)].map((_, i) => ( <Skeleton key={i} height="36px" /> ))}
                              </SimpleGrid>
                            </VStack>
                          ) : availableSlots.length > 0 ? (
                            <VStack spacing={4} align="stretch" maxH="450px" overflowY="auto" pr={2} className="custom-scrollbar">
                              {Object.entries(groupSlotsByHour(availableSlots))
                                .sort(([hourA], [hourB]) => Number(hourA) - Number(hourB))
                                .map(([hour, { label, slots }]) => (
                                <Box key={hour}>
                                  <Flex align="center" bg="gray.100" p={2} borderRadius="md" mb={2}>
                                    <FiClock size="0.9em" style={{marginRight: '6px'}}/>
                                    <Text fontWeight="semibold" color="gray.700" fontSize="sm">{label}</Text>
                                  </Flex>
                                  <SimpleGrid columns={{base:2, sm:3}} spacing={2}>
                                    {slots.map((slot) => (
                                      <Tooltip key={slot.start_time} label={`${formatTimeSlotForDisplay(slot.start_time)} - ${formatTimeSlotForDisplay(slot.end_time)}`} placement="top" hasArrow>
                                        <Button size="sm" width="full" colorScheme="green" variant="outline"
                                          onClick={() => {
                                            setStartTime(slot.start_time); setSelectedSlot(slot);
                                            setSelectedDate(new Date(slot.start_time)); setDate(new Date(slot.start_time).toISOString().split('T')[0]);
                                            scheduleModalDisclosure.onOpen();
                                          }}
                                        > {formatTimeSlotForDisplay(slot.start_time)} </Button>
                                      </Tooltip>
                                    ))}
                                  </SimpleGrid>
                                </Box>
                              ))}
                            </VStack>
                          ) : date ? ( // `date` is set, but no `availableSlots`
                            <Flex direction="column" align="center" justify="center" p={4} bg="gray.50" borderRadius="lg" minH="150px">
                              <Text color="gray.500">No available slots for this date.</Text>
                            </Flex>
                          ) : ( // No date selected yet
                             <Flex direction="column" align="center" justify="center" p={4} bg="gray.50" borderRadius="lg" minH="150px">
                                <Image src="https://illustrations.popsy.co/gray/calendar-search.svg" alt="Select date" boxSize="100px" mb={3}/>
                                <Text color="gray.500">Select a date on the calendar to see available time slots here.</Text>
                            </Flex>
                          )}
                        </Box>
                      </Flex>
                    </Card>
                  )}
                </Box>

                <Box>
                  <Heading size="md" mb={4}>Upcoming Appointments</Heading>
                  <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
                    {(upcomingAppointments.length > 0 || link?.appointment) ? (
                      <>
                        {upcomingAppointments.map((item, index) => {
                          if (!item.channel_name && !item.appointment?.channel_name) return null;
                          const appointmentInfo = item.appointment || item;
                          const dynamicLink = `https://provider.prestigehealth.app/appointment?channel=${appointmentInfo.channel_name}${appointmentInfo.review_id ? `&reviewId=${appointmentInfo.review_id}`: ''}`;
                          const appointmentDate = new Date(item.start_time);
                          const isToday = appointmentDate.toDateString() === new Date().toDateString();

                          return (
                            <MotionBox key={item.appointment_id || item.id || index} whileHover={{ y: -5 }} transition={{ duration: 0.2 }}>
                              <Card shadow="md" variant="outline">
                                <CardHeader pb={2}><Flex justify="space-between" align="center">
                                    <Heading size="sm">Appt. #{appointmentInfo.id || index + 1}</Heading>
                                    <Badge colorScheme={isToday ? 'green' : 'blue'} variant="solid" borderRadius="full" px={3}>
                                      {isToday ? 'Today' : appointmentDate.toLocaleDateString()}
                                    </Badge>
                                </Flex></CardHeader>
                                <CardBody py={3}><VStack align="stretch" spacing={2.5}>
                                    <Flex align="center" gap={2} title={`Patient ID: ${item.patient_id || 'N/A'}`}><FiUser /><Text fontSize="sm">ID: {item.patient_id || 'N/A'}</Text></Flex>
                                    <Flex align="center" gap={2}><FiClock />
                                      <Text fontSize="sm">{appointmentDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}</Text>
                                    </Flex>
                                    <Flex align="center" justify="space-between" gap={2}>
                                      <Text fontSize="xs" color="gray.600" noOfLines={1} title={dynamicLink}>{dynamicLink}</Text>
                                      <CopyButton textToCopy={dynamicLink} />
                                    </Flex>
                                </VStack></CardBody>
                                <CardFooter pt={2}>
                                  <Button 
                                    colorScheme={item.status === "SCHEDULED" ? "blue" : "green"} 
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
                          <MotionBox whileHover={{ y: -5 }} transition={{ duration: 0.2 }}>
                            <Card shadow="md" variant="outline" borderColor="green.300">
                              <CardHeader pb={2}><Flex justify="space-between" align="center">
                                  <Heading size="sm">New Instant Appointment</Heading>
                                  <Badge colorScheme="green" variant="solid" borderRadius="full" px={3}>Now</Badge>
                              </Flex></CardHeader>
                              <CardBody py={3}><VStack align="stretch" spacing={2.5}>
                                  <Flex align="center" gap={2} title={`Patient ID: ${link.appointment.patient_id || 'N/A'}`}><FiUser /><Text fontSize="sm">ID: {link.appointment.patient_id || 'N/A'}</Text></Flex>
                                  <Flex align="center" justify="space-between" gap={2}><Text fontSize="xs" color="gray.600" noOfLines={1} title={cLink}>{cLink}</Text><CopyButton textToCopy={cLink} /></Flex>
                              </VStack></CardBody>
                              <CardFooter pt={2}><Button colorScheme="green" width="full" leftIcon={<FiVideo />} onClick={handleInstCalls}>Join Call</Button></CardFooter>
                            </Card>
                          </MotionBox>
                        )}
                      </>
                    ) : (
                      <GridItem colSpan={{ base: 1, md: 2, lg: 3 }}><Box p={6} textAlign="center" borderRadius="lg" bg="white" shadow="sm">
                          <Image src="https://illustrations.popsy.co/gray/work-from-home.svg" alt="No appointments" maxW="180px" mx="auto" mb={4}/>
                          <Text color="gray.500" fontSize="lg">No upcoming appointments scheduled.</Text>
                          <Text color="gray.400" fontSize="sm">Use the buttons above to schedule a new call.</Text>
                      </Box></GridItem>
                    )}
                  </SimpleGrid>
                </Box>
              </VStack>
            </Container>

            {/* Schedule Call Modal (Modal 1) */}
            <Modal isOpen={scheduleModalDisclosure.isOpen} onClose={scheduleModalDisclosure.onClose} size="2xl" scrollBehavior="inside"> 
              <ModalOverlay />
              <ModalContent >
                <ModalHeader>Book Scheduled Call</ModalHeader>
                <ModalCloseButton />
                <ModalBody pb={6}>
                  <Flex direction={{ base: "column", md: "row" }} gap={6}>
                    <Box flex={{ base: "1", md: "0.6" }} className="modal-calendar-wrapper">
                      <FormControl id="schedule-date" mb={4}>
                        <FormLabel>Select Date</FormLabel>
                        <Box height="300px" mb={4}>
                          <FullCalendar
                            plugins={[dayGridPlugin, interactionPlugin]}
                            initialView="dayGridMonth"
                            headerToolbar={{
                              left: 'prev',
                              center: 'title',
                              right: 'next'
                            }}
                            selectable={true}
                            dateClick={(dateClickInfo) => {
                              const selectedDate = dateClickInfo.date;
                              setSelectedDate(selectedDate);
                              setDate(selectedDate.toISOString().split('T')[0]);
                            }}
                            selectMirror={true}
                            validRange={{
                              start: new Date().toISOString().split('T')[0]
                            }}
                            height="100%"
                            dayMaxEvents={0}
                            events={allCalendarEvents}
                            eventDisplay="background"
                            eventColor="#EDF2F7"
                            eventTextColor="#718096"
                            businessHours={{
                              daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
                              startTime: '08:00',
                              endTime: '22:00',
                            }}
                          />
                        </Box>
                      </FormControl>
                      
                      <Box mt={6}>
                       
                      </Box>

                      {availableSlots.some(slot => slot.status === "SCHEDULED") && (
                        <Box mt={6}>
                          <FormLabel>Scheduled Appointments</FormLabel>
                          <VStack spacing={2} align="stretch">
                            {availableSlots
                              .filter(slot => slot.status === "SCHEDULED")
                              .map((slot) => (
                                <Box
                                  key={slot.appointment_id || slot.start_time}
                                  p={2}
                                  bg="gray.100"
                                  borderRadius="md"
                                  borderLeft="4px solid"
                                  borderLeftColor="blue.500"
                                >
                                  <Text fontSize="sm" fontWeight="medium">
                                    {formatTimeSlotForDisplay(slot.start_time)} - {formatTimeSlotForDisplay(slot.end_time)}
                                  </Text>
                                  {slot.patient_id && (
                                    <Text fontSize="xs" color="gray.600">
                                      Patient ID: {slot.patient_id}
                                    </Text>
                                  )}
                                </Box>
                              ))}
                          </VStack>
                        </Box>
                      )}
                    </Box>

                    <Box flex="1" mt={{base: 4, md: 0}}>
                       <FormControl>
                          <FormLabel>Available Time Slots</FormLabel>
                          {isLoadingSlots ? (
                            <Center p={4}><Spinner /></Center>
                          ) : availableSlots.length > 0 ? (
                            <SimpleGrid columns={2} spacing={2} maxH="350px" overflowY="auto" pr={2}>
                              {availableSlots
                                .filter(slot => slot.status === "AVAILABLE")
                                .map((slot) => (
                                  <Button
                                    key={slot.start_time}
                                    size="sm"
                                    colorScheme={startTime === slot.start_time ? "blue" : "gray"}
                                    variant={startTime === slot.start_time ? "solid" : "outline"}
                                    onClick={() => {
                                      setStartTime(slot.start_time);
                                      setSelectedSlot(slot);
                                    }}
                                    py={4}
                                  >
                                    <VStack spacing={0}>
                                      <Text>{formatTimeSlotForDisplay(slot.start_time)}</Text>
                                      <Text fontSize="xs" opacity={0.8}>
                                        {`${(new Date(slot.end_time).getTime() - new Date(slot.start_time).getTime()) / (1000 * 60)}min`}
                                      </Text>
                                    </VStack>
                                  </Button>
                              ))}
                            </SimpleGrid>
                          ) : (
                            <Text color="gray.500" textAlign="center" py={4}>
                              {selectedDate ? "No available slots for this date" : "Select a date to see available slots"}
                            </Text>
                          )}
                        </FormControl>
                    </Box>
                  </Flex>

                  <VStack spacing={4} mt={6} align="stretch">
                    <FormControl id="schedule-patient" isRequired> <FormLabel>Select Patient</FormLabel>
                        <Select placeholder="Select patient or enter manually" value={isManualInput ? 'manual' : selectedPatientId} onChange={(e) => handlePatientSelect(e.target.value)}>
                        <option value="manual">Enter Phone Number Manually</option>
                        {dataList.map((patient) => (<option key={patient.id} value={patient.id.toString()}>
                            {patient.full_name ? `${patient.full_name} (${patient.phone_number})` : patient.phone_number} </option> ))}
                        </Select>
                    </FormControl>
                    {isManualInput && ( <FormControl id="schedule-phone" isRequired> <FormLabel>Phone Number</FormLabel>
                        <Input type="tel" value={phoneNumber} onChange={(e) => setPhone(e.target.value)} placeholder="e.g., 08012345678"/>
                        </FormControl> )}
                    <FormControl id="schedule-reason" isRequired> <FormLabel>Reason for Appointment</FormLabel>
                        <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Briefly describe the reason for this call"/>
                    </FormControl>
                    {message && <Text color='red.500' fontSize="sm">{message}</Text>}
                  </VStack>
                </ModalBody>
                <ModalFooter>
                  <Button variant="ghost" mr={3} onClick={scheduleModalDisclosure.onClose}>Cancel</Button>
                  <Button colorScheme="blue" onClick={() => handleBookingSubmit(false)} isLoading={buttonVisible} loadingText="Submitting...">
                    Book Appointment
                  </Button>
                </ModalFooter>
              </ModalContent>
            </Modal>

            {/* Instant Call Modal (Modal 2) */}
            <Modal isOpen={instantModalDisclosure.isOpen} onClose={instantModalDisclosure.onClose} size="md" scrollBehavior="inside">
              <ModalOverlay />
              <ModalContent>
                <ModalHeader>Book Instant Call</ModalHeader>
                <ModalCloseButton />
                <ModalBody pb={6}>
                  <VStack spacing={4} align="stretch">
                    <FormControl id="instant-patient" isRequired>
                      <FormLabel>Select Patient</FormLabel>
                      <Select placeholder="Select patient or enter manually" value={isManualInput ? 'manual' : selectedPatientId} onChange={(e) => handlePatientSelect(e.target.value)}>
                        <option value="manual">Enter Phone Number Manually</option>
                        {dataList.map((patient) => (<option key={patient.id} value={patient.id.toString()}>
                            {patient.full_name ? `${patient.full_name} (${patient.phone_number})` : patient.phone_number} </option> ))}
                      </Select>
                    </FormControl>
                    {isManualInput && ( <FormControl id="instant-phone" isRequired> <FormLabel>Phone Number</FormLabel>
                        <Input type="tel" value={phoneNumber} onChange={(e) => setPhone(e.target.value)} placeholder="e.g., 08012345678"/>
                        </FormControl> )}
                    <FormControl id="instant-reason" isRequired>
                      <FormLabel>Reason for Appointment</FormLabel>
                      <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Briefly describe the reason for this call"/>
                    </FormControl>
                    {message && <Text color='red.500' fontSize="sm">{message}</Text>}
                  </VStack>
                </ModalBody>
                <ModalFooter>
                  <Button variant="ghost" mr={3} onClick={instantModalDisclosure.onClose}>Cancel</Button>
                  <Button colorScheme="green" onClick={() => handleBookingSubmit(true)} isLoading={buttonVisible} loadingText="Submitting...">
                    Book Instant Call
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