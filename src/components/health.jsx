import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Container,
  Divider,
} from '@mui/material';
import { FaHeartbeat, FaWalking, FaWeight, FaFireAlt, FaClock } from 'react-icons/fa';
import { MdFitnessCenter, MdHotel } from 'react-icons/md';

const HealthDashboard = () => {
  const healthData = {
    steps: 8432,
    heartRate: 72,
    sleep: 7.5,
    weight: 68.5,
    calories: 1850,
    exercise: 45,
  };

  const MetricCard = ({ title, value, icon, unit, progress }) => (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography color="textSecondary" variant="subtitle1">
            {title}
          </Typography>
          {icon}
        </Box>
        <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
          {value}
          {unit && (
            <Typography component="span" variant="subtitle1" sx={{ ml: 0.5 }}>
              {unit}
            </Typography>
          )}
        </Typography>
        {progress !== undefined && (
          <Box sx={{ mt: 2 }}>
            <LinearProgress variant="determinate" value={progress} />
          </Box>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Box
    sx={{
      height: '100vh', // Full viewport height
      overflowY: 'auto', // Enable vertical scrolling
      bgcolor: '#f5f5f5', // Optional: Set a background color
      p: 2, // Padding for the scrollable container
    }}
  >
    <Container  maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold' }}>
        Health Dashboard
      </Typography>

      {/* Health Metrics Section */}
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 'bold' }}>
        Health Metrics
      </Typography>
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 2,
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ flex: '1 1 calc(33.333% - 16px)', minWidth: '250px' }}>
          <MetricCard
            title="Heart Rate"
            value={healthData.heartRate}
            unit="BPM"
            icon={<FaHeartbeat size={24} color="red" />}
          />
        </Box>
        <Box sx={{ flex: '1 1 calc(33.333% - 16px)', minWidth: '250px' }}>
          <MetricCard
            title="Weight"
            value={healthData.weight}
            unit="kg"
            icon={<FaWeight size={24} color="blue" />}
          />
        </Box>
        <Box sx={{ flex: '1 1 calc(33.333% - 16px)', minWidth: '250px' }}>
          <MetricCard
            title="Calories Burned"
            value={healthData.calories}
            unit="cal"
            icon={<FaFireAlt size={24} color="orange" />}
          />
        </Box>
      </Box>

      <Divider sx={{ my: 4 }} />

      {/* Activities Section */}
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 'bold' }}>
        Activities
      </Typography>
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 2,
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ flex: '1 1 calc(33.333% - 16px)', minWidth: '250px' }}>
          <MetricCard
            title="Daily Steps"
            value={healthData.steps.toLocaleString()}
            progress={(healthData.steps / 10000) * 100}
            icon={<FaWalking size={24} color="green" />}
          />
        </Box>
        <Box sx={{ flex: '1 1 calc(33.333% - 16px)', minWidth: '250px' }}>
          <MetricCard
            title="Sleep Duration"
            value={healthData.sleep}
            unit="hours"
            icon={<MdHotel size={24} color="purple" />}
          />
        </Box>
        <Box sx={{ flex: '1 1 calc(33.333% - 16px)', minWidth: '250px' }}>
          <MetricCard
            title="Exercise Time"
            value={healthData.exercise}
            unit="min"
            icon={<MdFitnessCenter size={24} color="brown" />}
          />
        </Box>
      </Box>

      <Divider sx={{ my: 4 }} />
      <Box>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 'bold' }}>
        Goals
      </Typography>
     
      </Box>
    </Container>
 


    </Box>
  );
};

export default HealthDashboard;
