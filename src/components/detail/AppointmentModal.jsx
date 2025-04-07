import React, { useState, useEffect } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Select,
  Text,
  Spinner,
} from "@chakra-ui/react";
import { getAccessToken } from "../api";
import axios from "axios";

const AppointmentModal = ({ isOpen, onClose, patientId, toast }) => {
  const [startTime, setStartTime] = useState("");
  const [date, setDate] = useState("");
  const [phoneNumber, setPhone] = useState("");
  const [reason, setReason] = useState("");
  const [info, setInfo] = useState([]);
  const [loading, setLoading] = useState(true);
  const [buttonVisible, setButtonVisible] = useState(false);
  const [message, setMessage] = useState("");
  const [isInstance, setInstance] = useState(false);

  // Helper to format ISO datetime string to "YYYY-MM-DD HH:MM"
  const formatDateTime = (isoString) => {
    return isoString.replace("T", " ").slice(0, 16);
  };

  // Fetch available appointment slots when a date is set
  useEffect(() => {
    if (date) {
      const fetchSlots = async () => {
        try {
          const accessToken = await getAccessToken();
          const response = await axios.get(
            `https://health.prestigedelta.com/appointments/available_slots/?date=${date}`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            }
          );
          setInfo(response.data);
        } catch (error) {
          console.error("Error fetching slots:", error);
        } finally {
          setLoading(false);
        }
      };
      fetchSlots();
    }
  }, [date]);

  // Appointment booking function
  const handleSubmit = async () => {
    setButtonVisible(true);
    const phone_number = phoneNumber ? `+234${phoneNumber.slice(1)}` : "";
    const formattedStartTime = formatDateTime(startTime);

    let data = {
      patient_id: patientId,
      start_time: formattedStartTime,
      reason,
      is_instant: isInstance,
    };

    // Modify payload based on whether a phone number is provided.
    if (phone_number === "") {
      delete data.phone_number;
    } else {
      delete data.patient_id;
    }

    try {
      const token = await getAccessToken();
      const response = await fetch(
        "https://health.prestigedelta.com/appointments/book/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(data),
        }
      );

      if (response.ok) {
        toast({
          title: "Appointment booked successfully!",
          description: `Your appointment is scheduled for ${startTime}.`,
          status: "success",
          duration: 5000,
          isClosable: true,
        });
        onClose();
      } else {
        const errorResult = await response.json();
        setMessage(errorResult.message);
        throw new Error("Failed to book the appointment.");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setButtonVisible(false);
    }
  };

  const options = info.map((slot) => (
    <option key={slot.start_time} value={slot.start_time}>
      {slot.start_time}
    </option>
  ));

  const opt = ["Yes", "No"];

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Book Call Appointment</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <FormLabel>Do you want to start an Instant call?</FormLabel>
          <Select
            placeholder="Select Yes or No"
            onChange={(e) => setInstance(e.target.value === "Yes")}
          >
            {opt.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
          <FormControl mb={4}>
            <FormLabel>Set Date</FormLabel>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              placeholder="Select start time"
            />
            <FormLabel>Select available Slot</FormLabel>
            <Select
              placeholder="Select start time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            >
              {options}
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel>Reason for Appointment</FormLabel>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter the reason for your appointment"
            />
          </FormControl>
          <Text color="red">{message}</Text>
        </ModalBody>
        <ModalFooter>
          <Button
            colorScheme="blue"
            mr={3}
            onClick={handleSubmit}
            isDisabled={loading}
          >
            {buttonVisible ? <Spinner size="sm" /> : "Submit"}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default AppointmentModal;
