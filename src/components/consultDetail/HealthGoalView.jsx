import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  LinearProgress,
  Grid,
  useMediaQuery,
  useTheme,
  CircularProgress,
  Alert,
  Button
} from '@mui/material';
import TrackChangesIcon from '@mui/icons-material/TrackChanges';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import FlagIcon from '@mui/icons-material/Flag';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import BarChartIcon from '@mui/icons-material/BarChart';
import PlaylistPlayIcon from '@mui/icons-material/PlaylistPlay';
import SpeakerNotesIcon from '@mui/icons-material/SpeakerNotes';
import { getAccessToken } from '../api'; // Import for API access

// Helper function to format date strings
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (error) {
    return 'Invalid Date';
  }
};

const GoalProgress = ({ progress }) => {
  const numericProgress = parseFloat(progress);
  if (isNaN(numericProgress) || numericProgress < 0 || numericProgress > 100) {
    return <Typography variant="caption" color="text.secondary">Progress not available</Typography>;
  }
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
      <Box sx={{ width: '100%', mr: 1 }}>
        <LinearProgress 
          variant="determinate" 
          value={numericProgress} 
          sx={{ 
            height: { xs: 6, sm: 8 }, 
            borderRadius: 5 
          }} 
        />
      </Box>
      <Box sx={{ minWidth: 35 }}>
        <Typography 
          variant="body2" 
          color="text.secondary"
          sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
        >
          {`${Math.round(numericProgress)}%`}
        </Typography>
      </Box>
    </Box>
  );
};

const MetricItem = ({ metric, index }) => {
  return (
    <ListItem 
      key={index} 
      sx={{ 
        pl: { xs: 0.5, sm: 1 },
        pr: 1,
        py: { xs: 0.75, sm: 1 },
        flexDirection: 'column',
        alignItems: 'flex-start',
        borderBottom: '1px solid',
        borderColor: 'divider',
        '&:last-child': {
          borderBottom: 'none'
        }
      }}
    >
      <ListItemText 
        primary={metric.metric_name || 'Unnamed Metric'}
        secondary={`Target: ${metric.target_value} ${metric.unit} | Current: ${metric.current_value !== null ? metric.current_value : 'N/A'} ${metric.unit}`}
        primaryTypographyProps={{
          fontSize: { xs: '0.875rem', sm: '1rem' },
          fontWeight: 'medium',
        }}
        secondaryTypographyProps={{
          fontSize: { xs: '0.75rem', sm: '0.875rem' },
          color: 'text.secondary'
        }}
      />
      {metric.latest_prediction_rationale && (
        <Typography variant="caption" sx={{ mt: 0.5, color: 'text.hint', fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
          Prediction: {metric.latest_prediction_rationale}
        </Typography>
      )}
      <Chip 
        label={metric.status || 'N/A'}
        size="small"
        color={metric.status === 'on_track' ? 'success' : metric.status === 'at_risk' ? 'warning' : 'default'}
        variant="outlined"
        sx={{ mt: 1, fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
      />
    </ListItem>
  );
};

const ActionItem = ({ action, index }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <ListItem 
      key={index} 
      sx={{ 
        pl: { xs: 0.5, sm: 1 },
        pr: 1,
        py: { xs: 0.75, sm: 1 },
        flexDirection: 'column',
        alignItems: 'flex-start',
        borderBottom: '1px solid',
        borderColor: 'divider',
        '&:last-child': {
          borderBottom: 'none'
        }
      }}
    >
      <ListItemText 
        primary={action.name || 'Unnamed Action'} 
        secondary={action.description || 'No description'}
        primaryTypographyProps={{
          fontSize: { xs: '0.875rem', sm: '1rem' },
          fontWeight: 'medium',
        }}
        secondaryTypographyProps={{
          fontSize: { xs: '0.75rem', sm: '0.875rem' },
          color: 'text.secondary'
        }}
      />
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
        {action.category && <Chip label={`Category: ${action.category}`} size="small" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }} />}
        {action.interval && <Chip label={`Interval: ${action.interval} hrs`} size="small" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }} />}
        {action.action_end_date && <Chip label={`End Date: ${formatDate(action.action_end_date)}`} size="small" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }} />}
      </Box>
    </ListItem>
  );
};

const HealthGoalView = ({ patientId, publicConsultId }) => {
  // Get the patient_data.goals_with_details from the ConsultDetailPage's API response
  const theme = useTheme();
  
  // Get goals directly from parent component
  const [goals, setGoals] = useState([]);
  
  // Get goal details from ConsultDetailPage's consultData
  useEffect(() => {
    const getGoalData = async () => {
      try {
        const token = await getAccessToken();
        if (!token) return;
        
        const headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        };
        
        // Get data from main endpoint
        const response = await fetch(`https://service.prestigedelta.com/review-note/${publicConsultId}/`, { headers });
        
        if (!response.ok) throw new Error(`Failed to fetch data: ${response.status}`);
        
        const data = await response.json();
        // Extract goals_with_details from the patient_data
        const goalData = data?.patient_data?.goals_with_details;
        
        setGoals(goalData ? [goalData] : []);
      } catch (error) {
        console.error("Error fetching health goal data:", error);
      }
    };
    
    getGoalData();  }, [publicConsultId]);
  
  // Loading state
  if (!goals || goals.length === 0) {
    return (
      <Paper elevation={2} sx={{ p: 3, textAlign: 'center', borderRadius: 2 }}>
        <TrackChangesIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
        <Typography variant="h6" color="text.secondary">
          No Health Goals Set
        </Typography>
        <Typography variant="body2" color="text.secondary">
          There are no health goals recorded for this patient.
        </Typography>
      </Paper>
    );
  }
  // Since there's only one goal, we take the first element.
  const goal = goals[0];

  return (
    <Paper elevation={2} sx={{ p: { xs: 1.5, md: 3 }, borderRadius: 2 }}>
      <Typography variant="h6" gutterBottom sx={{ 
        fontWeight: 'bold', 
        color: 'primary.dark', 
        mb: 2,
        fontSize: { xs: '1rem', sm: '1.25rem' },
        px: { xs: 0.5, sm: 0 }
      }}>
        Health Goal & Progress
      </Typography>
      
      {/* Displaying the single goal directly */}
      <Box key={goal.goal_name || 'active-goal'} sx={{ mb: 2, boxShadow: 1, borderRadius: 1, backgroundColor: 'white' }}>
        {/* Header section (from former AccordionSummary) */}
        <Box 
          sx={{ 
            display: 'flex', 
            alignItems: 'center',
            p: { xs: 1.5, sm: 2 },
            backgroundColor: 'grey.50', 
            borderBottom: '1px solid', 
            borderColor: 'divider',
            borderRadius: '4px 4px 0 0', // Rounded corners for top part
            minHeight: { xs: '48px', sm: '56px' },
          }}
        >
          <ListItemIcon sx={{ minWidth: { xs: 28, sm: 32 }, mr: 1.5 }}>
            {goal.status === 'Achieved' ? 
              <CheckCircleOutlineIcon color="success" sx={{ fontSize: { xs: '1.2rem', sm: '1.5rem' } }} /> : 
              <FlagIcon color="primary" sx={{ fontSize: { xs: '1.2rem', sm: '1.5rem' } }} />}
          </ListItemIcon>
          <Typography variant="subtitle1" sx={{ 
            fontWeight: 'medium', 
            flexGrow: 1,
            fontSize: { xs: '0.875rem', sm: '1rem' },
            mr: 1,
            lineHeight: { xs: 1.3, sm: 1.5 },
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {goal.goal_name || goal.title || 'Unnamed Goal'}
          </Typography>
          <Chip 
            label={goal.status || 'In Progress'} 
            size="small" 
            color={goal.status === 'Achieved' ? 'success' : goal.status === 'Not Achieved' ? 'error' : 'info'}
            variant="outlined"
            sx={{ 
              fontSize: { xs: '0.7rem', sm: '0.75rem' },
              height: { xs: '24px', sm: 'auto' } // Adjusted height for small chip
            }}
          />
        </Box>

        {/* Details section (from former AccordionDetails) */}
        <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
          <Grid container spacing={{ xs: 2, sm: 3 }} sx={{ pt: { xs: 1, sm: 1.5 } }}>
            {/* Goal Overview Section */}
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', fontSize: { xs: '0.9rem', sm: '1rem' } }}>
                <FlagIcon sx={{ mr: 1, color: 'primary.main' }} /> Goal Overview
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                <strong>Target Date:</strong> {formatDate(goal.target_date)}
              </Typography>
              {goal.comments && (
                <Typography variant="body2" color="text.secondary" paragraph sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                  <strong>Initial Comments:</strong> {goal.comments}
                </Typography>
              )}
              {goal.doctor_instructions && (
                <Typography variant="body2" color="text.secondary" paragraph sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                  <strong>Doctor Instructions:</strong> {goal.doctor_instructions}
                </Typography>
              )}
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                <strong>Check-in Interval:</strong> {goal.checkin_interval ? `${goal.checkin_interval / 24} days` : 'N/A'}
              </Typography>
            </Grid>

            {/* Progress & Prediction Section */}
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', fontSize: { xs: '0.9rem', sm: '1rem' } }}>
                <TrendingUpIcon sx={{ mr: 1, color: 'success.main' }} /> Progress & Prediction
              </Typography>
              <GoalProgress progress={goal.progress * 100} /> {/* Assuming progress is 0.0-1.0 */}
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                <strong>Expected Progress:</strong> {goal.expected_progress !== null ? `${(goal.expected_progress * 100).toFixed(1)}%` : 'N/A'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                <strong>Overall Probability:</strong> {goal.overall_probability !== null ? `${(goal.overall_probability * 100).toFixed(1)}%` : 'N/A'}
              </Typography>
              {goal.overall_rationale && (
                <Typography variant="caption" display="block" color="text.hint" sx={{ mt: 0.5, fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
                  Rationale: {goal.overall_rationale}
                </Typography>
              )}
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                <strong>Compliance Rate:</strong> {goal.overall_compliance_rate !== null ? `${(goal.overall_compliance_rate * 100).toFixed(1)}%` : 'N/A'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                <strong>Streak:</strong> {goal.streak_count !== null ? `${goal.streak_count} days` : 'N/A'}
              </Typography>
              {goal.last_prediction_text && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontStyle: 'italic', fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                  Last Prediction: {goal.last_prediction_text} ({formatDate(goal.last_prediction_at)})
                </Typography>
              )}
            </Grid>

            {/* Metrics Section */}
            {goal.metrics && goal.metrics.length > 0 && (
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', mt: 2, fontSize: { xs: '0.9rem', sm: '1rem' } }}>
                  <BarChartIcon sx={{ mr: 1, color: 'info.main' }} /> Key Metrics
                </Typography>
                <List dense disablePadding sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                  {goal.metrics.map((metric, metricIndex) => (
                    <MetricItem key={metricIndex} metric={metric} index={metricIndex} />
                  ))}
                </List>
              </Grid>
            )}

            {/* Actions Section */}
            {goal.actions && goal.actions.length > 0 && (
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', mt: 2, fontSize: { xs: '0.9rem', sm: '1rem' } }}>
                  <PlaylistPlayIcon sx={{ mr: 1, color: 'secondary.main' }} /> Prescribed Actions
                </Typography>
                <List dense disablePadding sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                  {goal.actions.map((action, actionIndex) => (
                    <ActionItem key={actionIndex} action={action} index={actionIndex} />
                  ))}
                </List>
              </Grid>
            )}
            
            {/* General Notes/Context (if not already covered by comments/doctor_instructions) */}
            {goal.context && goal.context !== goal.comments && (
               <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', mt: 2, fontSize: { xs: '0.9rem', sm: '1rem' } }}>
                    <SpeakerNotesIcon sx={{ mr: 1, color: 'text.secondary' }} /> Additional Context
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                    {goal.context}
                  </Typography>
                </Grid>
            )}
          </Grid>
        </Box>
      </Box>
    </Paper>
  );
};

export default HealthGoalView;
