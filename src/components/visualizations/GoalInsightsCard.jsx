import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Card, CardContent, Button, Divider, Chip, Paper, LinearProgress, IconButton, Tooltip } from '@mui/material';
import { SafeGrid } from '../material'; // Import our SafeGrid component
import { alpha, useTheme } from '@mui/material/styles';
import { Calendar, TrendingUp, Users, CheckCircle, AlertTriangle, ChevronRight, Clock, Award, Info, Zap, Target, Lightbulb as LightbulbIcon, Sparkles as SparklesIcon } from 'lucide-react';
import ScheduledItemsCalendar from './ScheduledItemsCalendar';

// Helper function to get color based on value
const getColorByValue = (value) => {
  if (value < 30) return { main: '#F44336', light: '#FFEBEE', dark: '#B71C1C', border: '#FFCDD2' };
  if (value < 70) return { main: '#FF9800', light: '#FFF3E0', dark: '#E65100', border: '#FFE0B2' };
  return { main: '#66BB6A', light: '#E8F5E9', dark: '#2E7D32', border: '#C8E6C9' };
};

// Helper function to get status text
const getStatusText = (value) => {
  if (value < 30) return 'Off Track';
  if (value < 70) return 'At Risk';
  return 'On Track';
};

// Helper function to get message based on metrics
const getMessage = (probability, compliance, streak) => {
  if (streak > 5 && compliance > 70 && probability > 70) {
    return "You're doing great! Your consistent actions are keeping you on track to reach your goal.";
  } else if (compliance > 70 && probability > 50) {
    return "You're making good progress. Keep up with your scheduled activities to improve your success rate.";
  } else if (compliance < 50 && probability < 50) {
    return "Your consistency has been lower than recommended. Try focusing on completing more of your scheduled activities.";
  } else {
    return "Keep working on your health actions. Each step gets you closer to your goal.";
  }
};

const GoalInsightsCard = ({ healthGoal, timeSeriesData, onViewDetails, patientName }) => {
  // Update data extraction to safely handle the API response structure
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 600);
  const [isTablet, setIsTablet] = useState(window.innerWidth < 960 && window.innerWidth >= 600);
  
  // Add window resize listener to handle responsive breakpoints
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 600);
      setIsTablet(window.innerWidth < 960 && window.innerWidth >= 600);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const [showScheduler, setShowScheduler] = useState(false);
  
  // Default values if data is missing - handles the headache management example
  const probability = healthGoal?.overall_probability || 0;
  const compliance = healthGoal?.overall_compliance_rate || 0;
  const streak = healthGoal?.streak_count || 0;
  const progress = healthGoal?.progress || 0;
  
  // Map the goal name, comments, and target date from the data structure
  // Check both direct properties and nested locations based on API structure
  const goalName = healthGoal?.goal_name || healthGoal?.name || "Health Goal";
  const goalComments = healthGoal?.comments || healthGoal?.description || "Improve health through regular actions";
  
  // Try to get target date from different possible locations
  const rawTargetDate = healthGoal?.target_date || healthGoal?.targetDate || healthGoal?.end_date;
  const targetDate = rawTargetDate ? new Date(rawTargetDate) : new Date(new Date().setDate(new Date().getDate() + 30));
  const daysRemaining = targetDate ? Math.max(0, Math.ceil((targetDate - new Date()) / (1000 * 60 * 60 * 24))) : 0;
  
  // Get colors based on values
  const probabilityColor = getColorByValue(probability);
  const complianceColor = getColorByValue(compliance);
  const streakColor = streak > 0 ? { main: '#FF9800', light: '#FFF3E0', dark: '#E65100', border: '#FFE0B2' } : { main: '#9E9E9E', light: '#F5F5F5', dark: '#616161', border: '#E0E0E0' };
  
  // Message for the story - generate a custom message for the headache management case
  const insightMessage = probability < 20 ? 
    "Your low compliance with recommended actions is affecting your success probability. Try to follow your scheduled actions more consistently." :
    getMessage(probability, compliance, streak);
  
  // Handle click to view more details
  const handleViewDetails = () => {
    if (onViewDetails) {
      onViewDetails();
    }
  };
  
  // Handle scheduled item click
  const handleScheduledItemClick = (item) => {
    console.log('Item clicked:', item);
    // Here you would implement the logic to record a metric or complete an action
    // This would typically involve an API call or state update
  };
  
  // Toggle schedule view
  const toggleScheduler = () => {
    setShowScheduler(!showScheduler);
  };

  return (
    <Card 
      sx={{ 
        borderRadius: 2, 
        overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        position: 'relative',
        backgroundImage: 'linear-gradient(135deg, rgba(101, 84, 192, 0.05) 0%, rgba(255,255,255,0) 100%)'
      }}
    >
      {/* Background decoration */}
      <Box sx={{
        position: 'absolute',
        top: -20,
        right: -20,
        width: 150,
        height: 150,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${probabilityColor.light} 0%, rgba(255,255,255,0) 70%)`,
        opacity: 0.6,
        zIndex: 0
      }} />
      
      <CardContent sx={{ p: { xs: 2, md: 3 }, position: 'relative', zIndex: 1 }}>
        {/* Patient Name Header */}
        <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
          {patientName}'s Goal Insights
        </Typography>

        {/* Goal Header - Enhanced to be more prominent and mobile responsive */}
        <Box sx={{ 
          p: { xs: 1.5, md: 2 },
          mb: { xs: 2, md: 3 }, 
          borderLeft: `4px solid #6554C0`,
          bgcolor: 'rgba(101, 84, 192, 0.05)',
          borderRadius: '0 8px 8px 0'
        }}>
          <Box sx={{ 
            display: 'flex', 
            flexDirection: isMobile ? 'column' : 'row',
            justifyContent: 'space-between', 
            alignItems: isMobile ? 'flex-start' : 'flex-start' 
          }}>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Target size={isMobile ? 18 : 20} color="#6554C0" style={{ marginRight: 8 }} />
                <Typography variant="h5" fontWeight="bold" color="#6554C0" sx={{
                  fontSize: { xs: '1.2rem', md: '1.5rem' }
                }}>
                  {goalName}
                </Typography>
              </Box>
              <Typography variant="body1" color="text.primary" sx={{ mt: 1 }}>
                {goalComments}
              </Typography>
            </Box>
            {targetDate && (
              <Chip
                icon={<Calendar size={12} />}
                label={`${daysRemaining} days left • ${targetDate.toLocaleDateString()}`}
                size="small"
                sx={{
                  height: 20,
                  fontSize: '0.65rem',
                  bgcolor: daysRemaining < 7 ? 'rgba(255, 152, 0, 0.1)' : 'rgba(101, 84, 192, 0.1)',
                  color: daysRemaining < 7 ? '#FF9800' : '#6554C0',
                  '& .MuiChip-label': { px: 1 },
                  mt: isMobile ? 1 : 0
                }}
              />
            )}
          </Box>
        </Box>
        
        {/* Schedule Toggle Button */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          mb: 2 
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <SparklesIcon size={isMobile ? 18 : 20} color="#6554C0" style={{ marginRight: 8 }} />
            <Typography variant="h6" fontWeight="bold" sx={{ fontSize: { xs: '1rem', md: '1.25rem' } }}>
              Goal Insights
            </Typography>
            <Tooltip title="These metrics show your commitment level and likelihood of success based on your actions and progress">
              <Info size={isMobile ? 14 : 16} style={{ marginLeft: 8, opacity: 0.6, cursor: 'pointer' }} />
            </Tooltip>
          </Box>
          
          <Tooltip title={showScheduler ? "Show goal metrics" : "Show upcoming actions & metrics"}>
            <Chip
              icon={showScheduler ? <SparklesIcon size={12} /> : <Calendar size={12} />}
              label={showScheduler ? "Metrics" : "Schedule"}
              size="small"
              clickable
              onClick={toggleScheduler}
              sx={{
                fontSize: '0.7rem',
                height: 24,
                '& .MuiChip-label': { px: 1 },
                bgcolor: showScheduler ? 'rgba(101, 84, 192, 0.1)' : 'rgba(33, 150, 243, 0.1)',
                color: showScheduler ? '#6554C0' : '#2196F3'
              }}
            />
          </Tooltip>
        </Box>
        
        {/* Schedule or Insights based on toggle */}
        {showScheduler ? (
          <Box sx={{ mb: 3 }}>
            <ScheduledItemsCalendar 
              healthGoal={healthGoal} 
              timeSeriesData={timeSeriesData}
              viewType="week"
              onItemClick={handleScheduledItemClick}
            />
          </Box>
        ) : (
          <>
            <Box sx={{ mb: { xs: 2, md: 3 } }}>
              <Paper 
                elevation={0} 
                sx={{ 
                  p: { xs: 1.5, md: 2 }, 
                  borderRadius: 2, 
                  bgcolor: 'rgba(255,255,255,0.7)',
                  border: '1px solid rgba(101, 84, 192, 0.1)'
                }}
              >
                <Typography variant="body2" sx={{ 
                  fontStyle: 'italic', 
                  color: '#5345B0',
                  fontSize: { xs: '0.8rem', md: '0.875rem' }
                }}>
                  "{insightMessage}"
                </Typography>
                
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 1.5 }}>
                  <LightbulbIcon size={isMobile ? 12 : 14} color="#6554C0" style={{ marginRight: 6 }} />
                  <Typography variant="caption" color="text.secondary">
                    Based on your recent activity and progress patterns
                  </Typography>
                </Box>
              </Paper>
            </Box>
            
            <SafeGrid container spacing={isMobile ? 1 : 2} sx={{ mb: { xs: 1, md: 2 } }}>
              {/* Success Probability - made responsive */}
              <SafeGrid item xs={4}>
                <Box sx={{ position: 'relative' }}>
                  <Tooltip title="Your likelihood of achieving your goal based on current progress and commitment">
                    <Box>
                      <Typography variant="body2" color="text.secondary" align="center" sx={{ 
                        mb: 1,
                        fontSize: { xs: '0.7rem', sm: '0.75rem', md: '0.875rem' }
                      }}>
                        Success Probability
                      </Typography>
                      
                      <Box sx={{ 
                        position: 'relative', 
                        width: '100%', 
                        aspectRatio: '1/1',
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center'
                      }}>
                        <Box 
                          component="svg" 
                          viewBox="0 0 36 36"
                          sx={{
                            width: '100%',
                            height: '100%',
                            transform: 'rotate(-90deg)'
                          }}
                        >
                          {/* Background circle */}
                          <circle
                            cx="18" 
                            cy="18" 
                            r="16"
                            fill="none"
                            stroke="#f5f5f5"
                            strokeWidth="3.6"
                          />
                          
                          {/* Progress arc with animation */}
                          <circle
                            cx="18" 
                            cy="18" 
                            r="16"
                            fill="none"
                            stroke={probabilityColor.main}
                            strokeWidth="3.6"
                            strokeDasharray={`${probability} 100`}
                            strokeLinecap="round"
                            sx={{
                              animation: 'progress-reveal 1.5s ease-out forwards',
                              '@keyframes progress-reveal': {
                                '0%': { strokeDasharray: '0 100' },
                                '100%': { strokeDasharray: `${probability} 100` }
                              }
                            }}
                          />
                        </Box>
                        
                        <Box 
                          sx={{ 
                            position: 'absolute', 
                            top: '50%', 
                            left: '50%', 
                            transform: 'translate(-50%, -50%)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center'
                          }}
                        >
                          <Typography 
                            variant="h5" 
                            fontWeight="bold" 
                            color={probabilityColor.dark}
                            sx={{
                              animation: 'count-up 1.5s ease-out forwards',
                              '@keyframes count-up': {
                                '0%': { opacity: 0 },
                                '100%': { opacity: 1 }
                              }
                            }}
                          >
                            {probability}%
                          </Typography>
                        </Box>
                      </Box>
                      
                      <Chip 
                        label={getStatusText(probability)}
                        size="small"
                        sx={{ 
                          width: '100%',
                          mt: 1,
                          bgcolor: probabilityColor.light,
                          color: probabilityColor.dark,
                          border: `1px solid ${probabilityColor.border}`,
                          '& .MuiChip-label': { 
                            px: 1,
                            fontSize: { xs: '0.6rem', sm: '0.7rem', md: '0.75rem' }
                          }
                        }}
                      />
                    </Box>
                  </Tooltip>
                </Box>
              </SafeGrid>
              
              {/* Compliance Rate */}
              <SafeGrid item xs={4}>
                <Box sx={{ position: 'relative' }}>
                  <Tooltip title="How consistently you're following the recommended health plan">
                    <Box>
                      <Typography variant="body2" color="text.secondary" align="center" sx={{ 
                        mb: 1,
                        fontSize: { xs: '0.7rem', sm: '0.75rem', md: '0.875rem' }
                      }}>
                        Consistency
                      </Typography>
                      
                      <Box sx={{ 
                        position: 'relative', 
                        width: '100%', 
                        aspectRatio: '1/1',
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center'
                      }}>
                        <Box 
                          component="svg" 
                          viewBox="0 0 36 36"
                          sx={{
                            width: '100%',
                            height: '100%',
                            transform: 'rotate(-90deg)'
                          }}
                        >
                          {/* Background circle */}
                          <circle
                            cx="18" 
                            cy="18" 
                            r="16"
                            fill="none"
                            stroke="#f5f5f5"
                            strokeWidth="3.6"
                          />
                          
                          {/* Progress arc with animation */}
                          <circle
                            cx="18" 
                            cy="18" 
                            r="16"
                            fill="none"
                            stroke={complianceColor.main}
                            strokeWidth="3.6"
                            strokeDasharray={`${compliance} 100`}
                            strokeLinecap="round"
                            sx={{
                              animation: 'progress-reveal 1.5s ease-out forwards',
                              animationDelay: '0.25s',
                              strokeDasharray: '0 100',
                              '@keyframes progress-reveal': {
                                '0%': { strokeDasharray: '0 100' },
                                '100%': { strokeDasharray: `${compliance} 100` }
                              }
                            }}
                          />
                        </Box>
                        
                        <Box 
                          sx={{ 
                            position: 'absolute', 
                            top: '50%', 
                            left: '50%', 
                            transform: 'translate(-50%, -50%)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center'
                          }}
                        >
                          <Typography 
                            variant="h5" 
                            fontWeight="bold" 
                            color={complianceColor.dark}
                            sx={{
                              animation: 'count-up 1.5s ease-out forwards',
                              animationDelay: '0.25s',
                              opacity: 0,
                              '@keyframes count-up': {
                                '0%': { opacity: 0 },
                                '100%': { opacity: 1 }
                              }
                            }}
                          >
                            {compliance}%
                          </Typography>
                        </Box>
                      </Box>
                      
                      <Chip 
                        label={getStatusText(compliance)}
                        size="small"
                        sx={{ 
                          width: '100%',
                          mt: 1,
                          bgcolor: complianceColor.light,
                          color: complianceColor.dark,
                          border: `1px solid ${complianceColor.border}`,
                          '& .MuiChip-label': { 
                            px: 1,
                            fontSize: { xs: '0.6rem', sm: '0.7rem', md: '0.75rem' }
                          }
                        }}
                      />
                    </Box>
                  </Tooltip>
                </Box>
              </SafeGrid>
              
              {/* Streak */}
              <SafeGrid item xs={4}>
                <Box sx={{ position: 'relative' }}>
                  <Tooltip title="Your current streak of consecutive days with completed health actions">
                    <Box>
                      <Typography variant="body2" color="text.secondary" align="center" sx={{ 
                        mb: 1,
                        fontSize: { xs: '0.7rem', sm: '0.75rem', md: '0.875rem' }
                      }}>
                        Day Streak
                      </Typography>
                      
                      <Box sx={{ 
                        position: 'relative', 
                        width: '100%', 
                        aspectRatio: '1/1',
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center'
                      }}>
                        {/* Animated background for streaks */}
                        {streak > 0 && (
                          <Box sx={{
                            position: 'absolute',
                            width: '100%',
                            height: '100%',
                            borderRadius: '50%',
                            background: `radial-gradient(circle, ${streakColor.light} 0%, rgba(255,255,255,0) 70%)`,
                            animation: 'pulse 2.5s infinite ease-in-out',
                            '@keyframes pulse': {
                              '0%': { transform: 'scale(0.95)', opacity: 0.5 },
                              '70%': { transform: 'scale(1.05)', opacity: 0.8 },
                              '100%': { transform: 'scale(0.95)', opacity: 0.5 }
                            }
                          }} />
                        )}
                        
                        <Box sx={{
                          width: '85%',
                          height: '85%',
                          borderRadius: '50%',
                          border: `3px solid ${streakColor.border}`,
                          backgroundColor: streak > 0 ? streakColor.light : 'transparent',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: streak > 0 ? '0 0 10px rgba(255, 152, 0, 0.3)' : 'none',
                          transition: 'all 0.3s ease'
                        }}>
                          <Zap 
                            size={20} 
                            color={streakColor.main}
                            style={{ marginBottom: 2 }} 
                          />
                          <Typography 
                            variant="h5" 
                            fontWeight="bold" 
                            color={streakColor.dark}
                            sx={{
                              animation: streak > 0 ? 'bounce 0.5s ease-in-out' : 'none',
                              '@keyframes bounce': {
                                '0%, 100%': { transform: 'translateY(0)' },
                                '50%': { transform: 'translateY(-5px)' }
                              }
                            }}
                          >
                            {streak}
                          </Typography>
                        </Box>
                      </Box>
                      
                      {streak > 0 ? (
                        <Chip 
                          label={streak > 5 ? "On Fire! 🔥" : "Keep Going!"}
                          size="small"
                          sx={{ 
                            width: '100%',
                            mt: 1,
                            bgcolor: streakColor.light,
                            color: streakColor.dark,
                            border: `1px solid ${streakColor.border}`,
                            '& .MuiChip-label': { 
                              px: 1,
                              fontSize: { xs: '0.6rem', sm: '0.7rem', md: '0.75rem' }
                            },
                            fontWeight: 'medium'
                          }}
                        />
                      ) : (
                        <Chip 
                          label="Start Today!"
                          size="small"
                          sx={{ 
                            width: '100%',
                            mt: 1,
                            bgcolor: '#F5F5F5',
                            color: '#757575',
                            border: '1px solid #E0E0E0',
                            '& .MuiChip-label': { 
                              px: 1,
                              fontSize: { xs: '0.6rem', sm: '0.7rem', md: '0.75rem' }
                            }
                          }}
                        />
                      )}
                    </Box>
                  </Tooltip>
                </Box>
              </SafeGrid>
            </SafeGrid>
          </>
        )}
        
        <Divider sx={{ my: { xs: 1.5, md: 2 } }} />
        
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" fontWeight="medium" sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
              Overall Progress
            </Typography>
            <Typography variant="body2" color={probabilityColor.dark} fontWeight="medium">
              {progress}%
            </Typography>
          </Box>
          
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              height: 10,
              borderRadius: 5,
              backgroundColor: '#E0E0E0',
              mb: 2,
              '& .MuiLinearProgress-bar': {
                backgroundColor: probabilityColor.main,
                borderRadius: 5,
                animation: 'progress-grow 1.5s ease-out',
                '@keyframes progress-grow': {
                  '0%': { width: '0%' },
                  '100%': { width: `${progress}%` }
                }
              }
            }}
          />
          
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mt: { xs: 1.5, md: 2 } }}>
            <Button
              variant="outlined"
              color="primary"
              fullWidth
              size={isMobile ? "small" : "medium"}
              sx={{ 
                borderRadius: 2,
                borderColor: '#6554C0',
                color: '#6554C0',
                '&:hover': { borderColor: '#5345B0', backgroundColor: 'rgba(101, 84, 192, 0.04)' },
                py: isMobile ? 0.5 : 1
              }}
              onClick={handleViewDetails}
            >
              View Detailed Analysis
            </Button>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default GoalInsightsCard;