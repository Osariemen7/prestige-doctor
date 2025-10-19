import React from 'react';
import {
  Card,
  CardBody,
  Box,
  Heading,
  Text,
  Badge,
  HStack,
  VStack,
  useColorModeValue,
  Icon,
} from '@chakra-ui/react';
import { Line } from 'react-chartjs-2';
import { FiTrendingUp, FiTrendingDown, FiActivity } from 'react-icons/fi';
import { format } from 'date-fns';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const MetricChart = ({ metric }) => {
  const cardBg = useColorModeValue('white', 'gray.800');
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  const getImpactColor = (category) => {
    switch (category?.toLowerCase()) {
      case 'high':
        return 'red';
      case 'medium':
        return 'orange';
      case 'low':
        return 'green';
      default:
        return 'gray';
    }
  };

  const getMetricTypeColor = (type) => {
    switch (type?.toLowerCase()) {
      case 'output':
        return 'blue';
      case 'input':
        return 'purple';
      case 'outcome':
        return 'green';
      default:
        return 'gray';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      return format(new Date(dateString), 'MMM dd');
    } catch {
      return '';
    }
  };

  const records = metric.records || [];
  const sortedRecords = [...records].sort((a, b) => 
    new Date(a.recorded_at) - new Date(b.recorded_at)
  );

  const latestValue = sortedRecords.length > 0 
    ? sortedRecords[sortedRecords.length - 1].recorded_value 
    : null;

  const previousValue = sortedRecords.length > 1 
    ? sortedRecords[sortedRecords.length - 2].recorded_value 
    : null;

  const trend = latestValue !== null && previousValue !== null
    ? latestValue - previousValue
    : null;

  const isInNormalRange = latestValue !== null 
    && metric.normal_range_min !== null 
    && metric.normal_range_max !== null
    && latestValue >= metric.normal_range_min 
    && latestValue <= metric.normal_range_max;

  const isInCautionRange = latestValue !== null 
    && metric.caution_range_min !== null 
    && metric.caution_range_max !== null
    && latestValue >= metric.caution_range_min 
    && latestValue <= metric.caution_range_max;

  const getStatusColor = () => {
    if (isInNormalRange) return 'green';
    if (isInCautionRange) return 'yellow';
    return 'red';
  };

  const chartData = {
    labels: sortedRecords.map(r => formatDate(r.recorded_at)),
    datasets: [
      {
        label: `${metric.name} (${metric.unit})`,
        data: sortedRecords.map(r => r.recorded_value),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointRadius: 5,
        pointHoverRadius: 7,
        pointBackgroundColor: 'rgb(59, 130, 246)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
      },
      // Normal range
      ...(metric.normal_range_min !== null && metric.normal_range_max !== null ? [
        {
          label: 'Normal Range (Max)',
          data: sortedRecords.map(() => metric.normal_range_max),
          borderColor: 'rgba(34, 197, 94, 0.5)',
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderDash: [5, 5],
          fill: false,
          pointRadius: 0,
        },
        {
          label: 'Normal Range (Min)',
          data: sortedRecords.map(() => metric.normal_range_min),
          borderColor: 'rgba(34, 197, 94, 0.5)',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          borderWidth: 2,
          borderDash: [5, 5],
          fill: '-1',
          pointRadius: 0,
        }
      ] : [])
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 15,
        },
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1,
        padding: 12,
        displayColors: true,
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += context.parsed.y.toFixed(2) + ' ' + metric.unit;
            }
            return label;
          }
        }
      },
    },
    scales: {
      y: {
        beginAtZero: false,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
        ticks: {
          callback: function(value) {
            return value.toFixed(1) + ' ' + metric.unit;
          }
        }
      },
      x: {
        grid: {
          display: false,
        },
      },
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    },
  };

  return (
    <Card bg={cardBg} boxShadow="md" borderRadius="xl" overflow="hidden">
      <CardBody>
        <VStack align="stretch" spacing={4}>
          {/* Header */}
          <HStack justify="space-between" align="start">
            <VStack align="start" spacing={1}>
              <HStack>
                <Heading size="md">{metric.name}</Heading>
                <Badge colorScheme={getStatusColor()} fontSize="sm" px={3} py={1} borderRadius="full">
                  {isInNormalRange ? 'Normal' : isInCautionRange ? 'Caution' : 'Alert'}
                </Badge>
              </HStack>
              <HStack spacing={2}>
                <Badge colorScheme={getImpactColor(metric.impact_category)} variant="subtle">
                  {metric.impact_category} Impact
                </Badge>
                <Badge colorScheme={getMetricTypeColor(metric.metric_type)} variant="subtle">
                  {metric.metric_type}
                </Badge>
              </HStack>
            </VStack>

            {latestValue !== null && (
              <VStack align="end" spacing={0}>
                <Text fontSize="3xl" fontWeight="bold" color={`${getStatusColor()}.500`}>
                  {latestValue.toFixed(1)}
                </Text>
                <Text fontSize="sm" color="gray.500">{metric.unit}</Text>
                {trend !== null && (
                  <HStack spacing={1} mt={1}>
                    <Icon 
                      as={trend > 0 ? FiTrendingUp : FiTrendingDown} 
                      color={trend > 0 ? 'green.500' : 'red.500'}
                    />
                    <Text 
                      fontSize="sm" 
                      color={trend > 0 ? 'green.500' : 'red.500'}
                      fontWeight="semibold"
                    >
                      {Math.abs(trend).toFixed(1)}
                    </Text>
                  </HStack>
                )}
              </VStack>
            )}
          </HStack>

          {/* Range Information */}
          {(metric.normal_range_min !== null || metric.caution_range_min !== null) && (
            <Box p={3} bg={bgColor} borderRadius="md">
              <VStack align="stretch" spacing={2}>
                {metric.normal_range_min !== null && metric.normal_range_max !== null && (
                  <HStack justify="space-between">
                    <Text fontSize="sm" color="gray.600">Normal Range:</Text>
                    <Badge colorScheme="green" fontSize="sm">
                      {metric.normal_range_min} - {metric.normal_range_max} {metric.unit}
                    </Badge>
                  </HStack>
                )}
                {metric.caution_range_min !== null && metric.caution_range_max !== null && (
                  <HStack justify="space-between">
                    <Text fontSize="sm" color="gray.600">Caution Range:</Text>
                    <Badge colorScheme="yellow" fontSize="sm">
                      {metric.caution_range_min} - {metric.caution_range_max} {metric.unit}
                    </Badge>
                  </HStack>
                )}
              </VStack>
            </Box>
          )}

          {/* Chart */}
          {sortedRecords.length > 0 ? (
            <Box h="300px">
              <Line data={chartData} options={chartOptions} />
            </Box>
          ) : (
            <Box h="200px" display="flex" alignItems="center" justifyContent="center" bg={bgColor} borderRadius="md">
              <VStack spacing={2}>
                <Icon as={FiActivity} w={10} h={10} color="gray.400" />
                <Text color="gray.500">No data recorded yet</Text>
              </VStack>
            </Box>
          )}

          {/* Recent Readings */}
          {sortedRecords.length > 0 && (
            <Box>
              <Text fontSize="sm" fontWeight="semibold" mb={2} color="gray.600">Recent Readings</Text>
              <VStack align="stretch" spacing={2}>
                {sortedRecords.slice(-3).reverse().map((record, idx) => (
                  <HStack 
                    key={idx} 
                    p={2} 
                    bg={bgColor} 
                    borderRadius="md" 
                    justify="space-between"
                  >
                    <Text fontSize="sm" color="gray.600">
                      {format(new Date(record.recorded_at), 'MMM dd, yyyy HH:mm')}
                    </Text>
                    <Badge colorScheme="blue" fontSize="sm">
                      {record.recorded_value.toFixed(1)} {record.unit}
                    </Badge>
                  </HStack>
                ))}
              </VStack>
            </Box>
          )}
        </VStack>
      </CardBody>
    </Card>
  );
};

export default MetricChart;
