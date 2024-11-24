import React, { useEffect, useState } from "react";
import {ChakraProvider, Box, Divider, Flex, Heading, Text, Spinner } from "@chakra-ui/react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { AiOutlineArrowLeft } from 'react-icons/ai' ;

const Details = () => {
  const { id } = useParams();
  const navigate = useNavigate()
  const { state } = useLocation(); // Retrieve passed data using useLocation
  const item = state?.item || {};
  
 
  const healthSummary = JSON.parse(item.health_summary || "{}");

 

  return (
    <ChakraProvider>
    <Box p={6} bg="blue.50" minH="100vh" overflowY="auto">
    <div className="back-icon" onClick={() => navigate('/dashboard')}>
        <AiOutlineArrowLeft size={24} />
        <span className="back-text"></span>
      </div>

      <Heading size="lg" mb={4} color="blue.700">
        Patient Details
      </Heading>
      <Flex
        direction="column"
        bg="white"
        p={6}
        borderRadius="md"
        shadow="md"
        overflowY="auto"
        maxH="calc(100vh - 100px)"
      >
        <Text fontWeight="bold" mb={2}>
          Patient ID: {item.id}
        </Text>
        <Text>
          <strong>Full Name:</strong> {item.full_name || "N/A"}
        </Text>
        <Text fontWeight="bold" mb={2}>
          Phone Number: {item.phone_number}
        </Text>
        <Text fontWeight="bold" mb={4}>
          Status: {item.status}
        </Text>
        <Text>
          <strong>Health Score:</strong> {item.health_score || "N/A"}
        </Text>
        <Text>
          <strong>Most Recent Review:</strong>{" "}
          {new Date(item.most_recent_review).toLocaleString()}
        </Text>
   
        {healthSummary?.health_summary && (
          <Text>
            <strong>Overall Health Status:</strong> {healthSummary.health_summary.overall_health_status}
          </Text>
        )}
        <Divider />

<Heading size="md" mt={4}>Last Reviews</Heading>
{item.last_reviews && item.last_reviews.length > 0 ? (
  item.last_reviews.map((review) => (
    <Box key={review.id} p={4} borderWidth="1px" borderRadius="lg" mb={4}>
      {Object.entries(review).map(([key, value]) => (
        <Box key={key} mb={2}>
          <Text>
            <strong>{key.replace(/_/g, ' ').toUpperCase()}:</strong>{' '}
            {Array.isArray(value) ? (
              value.length > 0 ? JSON.stringify(value) : 'N/A'
            ) : typeof value === 'object' && value !== null ? (
              JSON.stringify(value, null, 2)
            ) : (
              value || 'N/A'
            )}
          </Text>
        </Box>
      ))}
      <Divider mt={4} />
    </Box>
  ))
) : (
  <Text>No reviews found.</Text>
)}
    </Flex>
    </Box>
  
    </ChakraProvider>
  );
};

export default Details;
