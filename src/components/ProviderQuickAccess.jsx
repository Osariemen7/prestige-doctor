import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardBody,
  Heading,
  Text,
  Button,
  VStack,
  HStack,
  Icon,
  Badge,
  SimpleGrid,
  useColorModeValue,
} from '@chakra-ui/react';
import {
  FiActivity,
  FiTrendingUp,
  FiUsers,
  FiArrowRight,
  FiDollarSign,
} from 'react-icons/fi';

const ProviderQuickAccess = () => {
  const navigate = useNavigate();
  const cardBg = useColorModeValue('white', 'gray.800');
  const accentColor = useColorModeValue('blue.500', 'blue.300');

  return (
    <Card
      bg={cardBg}
      boxShadow="xl"
      borderRadius="xl"
      overflow="hidden"
      position="relative"
      _before={{
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '4px',
        bgGradient: 'linear(to-r, blue.400, purple.500)',
      }}
    >
      <CardBody>
        <VStack align="stretch" spacing={4}>
          <HStack justify="space-between">
            <VStack align="start" spacing={1}>
              <HStack>
                <Icon as={FiActivity} color={accentColor} boxSize={6} />
                <Heading size="md">Provider Dashboard</Heading>
              </HStack>
              <Text fontSize="sm" color="gray.600">
                Monitor your practice and patient welfare
              </Text>
            </VStack>
            <Badge colorScheme="purple" fontSize="sm" px={3} py={1} borderRadius="full">
              New
            </Badge>
          </HStack>

          <SimpleGrid columns={{ base: 2, md: 4 }} spacing={3}>
            <Box textAlign="center" p={3} bg="blue.50" borderRadius="lg">
              <Icon as={FiTrendingUp} color="blue.500" boxSize={6} mb={1} />
              <Text fontSize="xs" color="gray.600">Consultation Rate</Text>
            </Box>
            <Box textAlign="center" p={3} bg="green.50" borderRadius="lg">
              <Icon as={FiDollarSign} color="green.500" boxSize={6} mb={1} />
              <Text fontSize="xs" color="gray.600">Monthly Payout</Text>
            </Box>
            <Box textAlign="center" p={3} bg="purple.50" borderRadius="lg">
              <Icon as={FiUsers} color="purple.500" boxSize={6} mb={1} />
              <Text fontSize="xs" color="gray.600">Active Patients</Text>
            </Box>
            <Box textAlign="center" p={3} bg="orange.50" borderRadius="lg">
              <Icon as={FiActivity} color="orange.500" boxSize={6} mb={1} />
              <Text fontSize="xs" color="gray.600">Patient Metrics</Text>
            </Box>
          </SimpleGrid>

          <Button
            colorScheme="blue"
            size="lg"
            rightIcon={<FiArrowRight />}
            onClick={() => navigate('/provider-dashboard')}
            _hover={{
              transform: 'translateX(4px)',
              transition: 'transform 0.2s',
            }}
          >
            Open Provider Dashboard
          </Button>
        </VStack>
      </CardBody>
    </Card>
  );
};

export default ProviderQuickAccess;
