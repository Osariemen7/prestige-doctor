import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Tab, Tabs, Divider, Chip, LinearProgress, Card, CardContent, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton, Paper, Container, Table, TableHead, TableBody, TableRow, TableCell, TableContainer } from '@mui/material';
import { SafeGrid } from '../material'; // Import SafeGrid instead of Grid
import Chart from 'react-apexcharts';
import { alpha, useTheme } from '@mui/material/styles';
import { Activity, TrendingUp, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, CheckCircle, AlertTriangle, Info, AlertCircle, TimerReset, X, ArrowLeft, Target, Clipboard, Award, Check } from 'react-feather';
import ScheduledItemsCalendar from './ScheduledItemsCalendar';
import GoalInsightsCard from './GoalInsightsCard';

const GoalInsightsPage = ({ healthGoal, timeSeriesData, onBack, patientName }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [openDetails, setOpenDetails] = useState(false);
  const [detailType, setDetailType] = useState('');
  const [openScheduleDialog, setOpenScheduleDialog] = useState(false);
  const [selectedScheduleItem, setSelectedScheduleItem] = useState(null);

  // Fallback data if healthGoal is not provided
  const goal = healthGoal || {
    goal_name: "Lose 5 kg",
    comments: "Aim to lose 5 kg in 2 months through diet and exercise",
    target_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
    overall_probability: 65,
    overall_compliance_rate: 72,
    streak_count: 4,
    progress: 30,
    metrics: [
      { metric_name: "Weight", target_value: "75 kg", current_value: "80 kg" },
      { metric_name: "Blood Pressure", target_value: "120/80", current_value: "135/85" }
    ],
    actions: [
      { name: "Exercise", frequency: "3 times per week", compliance: 67 },
      { name: "Track Calories", frequency: "Daily", compliance: 80 },
      { name: "Take Medication", frequency: "Daily", compliance: 95 }
    ]
  };

  // Map the goal name, comments, and target date from the data structure
  // Check both direct properties and nested locations based on API structure
  const goalName = healthGoal?.goal_name || healthGoal?.name || goal.goal_name;
  const goalComments = healthGoal?.comments || healthGoal?.description || goal.comments;
  
  // Try to get target date from different possible locations
  const rawTargetDate = healthGoal?.target_date || healthGoal?.targetDate || healthGoal?.end_date;
  const targetDate = rawTargetDate ? new Date(rawTargetDate) : new Date(goal.target_date);
  const daysRemaining = targetDate ? Math.max(0, Math.ceil((targetDate - new Date()) / (1000 * 60 * 60 * 24))) : 0;

  const handleChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleOpenDetails = (type) => {
    setDetailType(type);
    setOpenDetails(true);
  };

  const handleCloseDetails = () => {
    setOpenDetails(false);
  };

  // Handle scheduled item click
  const handleScheduledItemClick = (item) => {
    console.log("Monthly view item clicked:", item);
    // Navigate to the HealthRecordForm and pass the selected item data
    navigate('/healthdashboard', {
      state: {
        openRecordDialog: true,
        selectedItem: item,
        goal_data: healthGoal,
        patientData: { health_goal: healthGoal, time_series: timeSeriesData }
      }
    });
  };

  // Close schedule dialog
  const handleCloseScheduleDialog = () => {
    setOpenScheduleDialog(false);
    setSelectedScheduleItem(null);
  };

  // Prepare trend data for chart
  const trendData = {
    probability: [55, 58, 62, 60, 63, 65],
    compliance: [60, 65, 70, 68, 72, 72],
    dates: ['Mar 1', 'Mar 8', 'Mar 15', 'Mar 22', 'Mar 29', 'Apr 5']
  };

  const trendChartOptions = {
    chart: {
      height: 350,
      type: 'line',
      toolbar: {
        show: false
      },
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif'
    },
    colors: ['#6554C0', '#2196F3'],
    dataLabels: {
      enabled: false
    },
    stroke: {
      curve: 'smooth',
      width: 3
    },
    grid: {
      borderColor: '#e7e7e7',
      row: {
        colors: ['#f3f3f3', 'transparent'],
        opacity: 0.5
      }
    },
    markers: {
      size: 5
    },
    xaxis: {
      categories: trendData.dates,
      title: {
        text: 'Date'
      }
    },
    yaxis: {
      title: {
        text: 'Percentage (%)'
      },
      min: 0,
      max: 100
    },
    legend: {
      position: 'top',
      horizontalAlign: 'right',
      floating: true,
      offsetY: -25,
      offsetX: -5
    },
    tooltip: {
      shared: true,
      intersect: false,
      y: {
        formatter: function (y) {
          if (typeof y !== "undefined") {
            return y.toFixed(0) + "%";
          }
          return y;
        }
      }
    }
  };

  const trendChartSeries = [
    {
      name: "Success Probability",
      data: trendData.probability
    },
    {
      name: "Compliance",
      data: trendData.compliance
    }
  ];

  // Activity history
  const activityHistory = [
    { date: 'Apr 5, 2025', type: 'Metric', name: 'Weight', value: '79 kg', change: '-1 kg' },
    { date: 'Apr 4, 2025', type: 'Action', name: 'Exercise', value: 'Completed', status: 'Success' },
    { date: 'Apr 3, 2025', type: 'Metric', name: 'Blood Pressure', value: '132/83', change: '-3/2' },
    { date: 'Apr 2, 2025', type: 'Action', name: 'Take Medication', value: 'Completed', status: 'Success' },
    { date: 'Apr 1, 2025', type: 'Action', name: 'Exercise', value: 'Skipped', status: 'Missed' },
    { date: 'Mar 31, 2025', type: 'Metric', name: 'Weight', value: '80 kg', change: '0 kg' }
  ];

  // Detail content based on type
  const getDetailContent = () => {
    switch (detailType) {
      case 'success':
        return (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="h6">Success Probability Explanation</Typography>
                <IconButton edge="end" onClick={handleCloseDetails}>
                  <X size={18} />
                </IconButton>
              </Box>
            </DialogTitle>
            <DialogContent dividers>
              <Typography paragraph>
                <strong>What is Success Probability?</strong>
              </Typography>
              <Typography paragraph variant="body2">
                The success probability is a predictive measure of how likely you are to achieve your health goal based on multiple factors including:
              </Typography>
              <Box component="ul" sx={{ pl: 2, mb: 2 }}>
                <Typography component="li" variant="body2">Your current progress towards the goal</Typography>
                <Typography component="li" variant="body2">Your consistency in recording measurements</Typography>
                <Typography component="li" variant="body2">Your compliance with recommended actions</Typography>
                <Typography component="li" variant="body2">Historical patterns for similar goals</Typography>
                <Typography component="li" variant="body2">Time remaining until your target date</Typography>
              </Box>
              <Typography paragraph variant="body2">
                <strong>Your Current Success Probability: {goal.overall_probability}%</strong>
              </Typography>
              <Typography paragraph variant="body2">
                This means that based on your current patterns, you have a {goal.overall_probability}% chance of reaching your target by the goal date.
              </Typography>
              <Typography variant="body2">
                {goal.overall_probability >= 70 ? (
                  <Box sx={{ p: 2, bgcolor: '#E8F5E9', borderRadius: 1, my: 2 }}>
                    You're doing great! Keep up the good work to maintain this high success probability.
                  </Box>
                ) : goal.overall_probability >= 30 ? (
                  <Box sx={{ p: 2, bgcolor: '#FFF3E0', borderRadius: 1, my: 2 }}>
                    You're making progress. Increasing your consistency and completing more recommended actions will improve your success probability.
                  </Box>
                ) : (
                  <Box sx={{ p: 2, bgcolor: '#FFEBEE', borderRadius: 1, my: 2 }}>
                    Your success probability indicates you might need adjustments to your plan. Consider speaking with your healthcare provider about making your goals more achievable.
                  </Box>
                )}
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDetails}>Close</Button>
            </DialogActions>
          </>
        );
      case 'compliance':
        return (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="h6">Compliance Rate Explanation</Typography>
                <IconButton edge="end" onClick={handleCloseDetails}>
                  <X size={18} />
                </IconButton>
              </Box>
            </DialogTitle>
            <DialogContent dividers>
              <Typography paragraph>
                <strong>What is Compliance Rate?</strong>
              </Typography>
              <Typography paragraph variant="body2">
                Compliance rate measures how consistently you're following your recommended health plan, including:
              </Typography>
              <Box component="ul" sx={{ pl: 2, mb: 2 }}>
                <Typography component="li" variant="body2">Completing recommended actions on schedule</Typography>
                <Typography component="li" variant="body2">Recording metrics as frequently as suggested</Typography>
                <Typography component="li" variant="body2">Following treatment guidelines</Typography>
              </Box>
              <Typography paragraph variant="body2">
                <strong>Your Current Compliance Rate: {goal.overall_compliance_rate}%</strong>
              </Typography>
              <Typography variant="body2">
                This means you're completing about {goal.overall_compliance_rate}% of your recommended health actions.
              </Typography>
              {goal.actions && goal.actions.length > 0 && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Action Compliance Breakdown:
                  </Typography>
                  <TableContainer component={Paper} variant="outlined" sx={{ mt: 1 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Action</TableCell>
                          <TableCell>Frequency</TableCell>
                          <TableCell align="right">Compliance</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {goal.actions.map((action, index) => (
                          <TableRow key={index}>
                            <TableCell>{action.name}</TableCell>
                            <TableCell>{action.frequency}</TableCell>
                            <TableCell align="right">{action.compliance}%</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDetails}>Close</Button>
            </DialogActions>
          </>
        );
      case 'streak':
        return (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="h6">Day Streak Explanation</Typography>
                <IconButton edge="end" onClick={handleCloseDetails}>
                  <X size={18} />
                </IconButton>
              </Box>
            </DialogTitle>
            <DialogContent dividers>
              <Typography paragraph>
                <strong>What is Day Streak?</strong>
              </Typography>
              <Typography paragraph variant="body2">
                Your day streak represents the number of consecutive days you've completed at least one health action related to your goal. This metric is designed to help you build and maintain health habits.
              </Typography>
              <Typography paragraph variant="body2">
                <strong>Your Current Streak: {goal.streak_count} days</strong>
              </Typography>
              <Typography paragraph variant="body2">
                Studies show that maintaining a streak can:
              </Typography>
              <Box component="ul" sx={{ pl: 2, mb: 2 }}>
                <Typography component="li" variant="body2">Increase motivation through visible progress</Typography>
                <Typography component="li" variant="body2">Build long-term habits through consistency</Typography>
                <Typography component="li" variant="body2">Create psychological momentum that makes continuing easier</Typography>
              </Box>
              <Typography variant="body2">
                {goal.streak_count > 5 ? (
                  <Box sx={{ p: 2, bgcolor: '#E8F5E9', borderRadius: 1, my: 2 }}>
                    Outstanding! You've maintained your streak for more than 5 days, which means you're well on your way to building a strong habit.
                  </Box>
                ) : goal.streak_count > 0 ? (
                  <Box sx={{ p: 2, bgcolor: '#FFF3E0', borderRadius: 1, my: 2 }}>
                    Good start! Keep going to build momentum. The first week is the most critical for establishing new habits.
                  </Box>
                ) : (
                  <Box sx={{ p: 2, bgcolor: '#FFEBEE', borderRadius: 1, my: 2 }}>
                    You haven't started a streak yet. Complete a health action today to begin building momentum!
                  </Box>
                )}
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDetails}>Close</Button>
            </DialogActions>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <Box sx={{ 
      bgcolor: '#f5f5f5', 
      minHeight: '100vh', 
      pb: 6,
      ml: { xs: 0, md: '250px' }, // Add margin to account for sidebar on desktop
      width: { xs: '100%', md: 'calc(100% - 250px)' } // Adjust width for sidebar on desktop
    }}>
      <Box 
        sx={{ 
          bgcolor: 'white', 
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)', 
          mb: 3,
          position: 'sticky',
          top: 0,
          zIndex: 10
        }}
      >
        <Container maxWidth="lg" sx={{ px: { xs: 2, md: 3 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', py: 2 }}>
            <IconButton onClick={onBack} sx={{ mr: 1 }}>
              <ArrowLeft />
            </IconButton>
            <Typography variant="h6" fontWeight="medium">
              Goal Insights & Analysis
            </Typography>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ px: { xs: 2, md: 3 } }}>
        {/* Patient Name Header */}
        <Typography variant="h5" fontWeight="bold" sx={{ mb: 2 }}>
          Insights for {patientName}
        </Typography>

        {/* New Prominent Goal Header */}
        <Paper sx={{ 
          p: 3, 
          mb: 3, 
          borderRadius: 2,
          background: 'linear-gradient(135deg, #6554C0 0%, #5345B0 100%)',
          color: 'white',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <Box sx={{ position: 'absolute', top: -10, right: -10, opacity: 0.1 }}>
            <Target size={120} />
          </Box>
          
          <Typography variant="overline" sx={{ opacity: 0.8, letterSpacing: 1, fontWeight: 'medium' }}>
            YOUR CURRENT GOAL
          </Typography>
          
          <Typography variant="h4" fontWeight="bold" gutterBottom sx={{ mt: 1 }}>
            {goalName}
          </Typography>
          
          <Typography variant="h6" sx={{ opacity: 0.9, maxWidth: '80%', mb: 2 }}>
            {goalComments}
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
            <Chip 
              icon={<CalendarIcon size={14} style={{ color: 'white' }} />} 
              label={`Target Date: ${targetDate.toLocaleDateString()}`}
              sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', borderRadius: 1 }}
            />
            <Chip 
              icon={<Clock size={14} style={{ color: 'white' }} />} 
              label={`${daysRemaining} days remaining`}
              sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', borderRadius: 1 }}
            />
          </Box>
        </Paper>

        {/* Calendar Section */}
        <Paper sx={{ 
          p: 3, 
          mb: 3, 
          borderRadius: 2,
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <CalendarIcon size={24} color="#2196F3" style={{ marginRight: 12 }} />
            <Typography variant="h5" fontWeight="bold">
              Health Schedule Calendar
            </Typography>
          </Box>
          
          <ScheduledItemsCalendar 
            healthGoal={healthGoal} 
            timeSeriesData={timeSeriesData}
            viewType="month"
            onItemClick={handleScheduledItemClick}
          />
          
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 4 }}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, flexGrow: 1, minWidth: '200px' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Clipboard size={16} color="#6554C0" style={{ marginRight: 8 }} />
                <Typography variant="subtitle1" color="secondary" fontWeight="medium">
                  Action Items
                </Typography>
              </Box>
              <Typography variant="body2">
                Health actions that need to be completed according to your plan. Shown in <strong style={{ color: '#6554C0' }}>purple</strong>.
              </Typography>
            </Paper>
            
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, flexGrow: 1, minWidth: '200px' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <TrendingUp size={16} color="#2196F3" style={{ marginRight: 8 }} />
                <Typography variant="subtitle1" color="primary" fontWeight="medium">
                  Metric Recordings
                </Typography>
              </Box>
              <Typography variant="body2">
                Health measurements that need to be recorded regularly. Shown in <strong style={{ color: '#2196F3' }}>blue</strong>.
              </Typography>
            </Paper>
            
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, flexGrow: 1, minWidth: '200px' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <CheckCircle size={16} color="#4CAF50" style={{ marginRight: 8 }} />
                <Typography variant="subtitle1" sx={{ color: '#4CAF50' }} fontWeight="medium">
                  Completed Items
                </Typography>
              </Box>
              <Typography variant="body2">
                Items you've already completed or recorded. History of your health journey.
              </Typography>
            </Paper>
            
            <Paper 
              variant="outlined" 
              sx={{ 
                p: 2, 
                borderRadius: 2, 
                borderLeft: '4px solid #F44336',
                bgcolor: 'rgba(244, 67, 54, 0.04)',
                flexGrow: 1,
                minWidth: '200px'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                <AlertTriangle size={16} color="#F44336" style={{ marginRight: 12, marginTop: 2 }} />
                <Box>
                  <Typography variant="subtitle1" gutterBottom color="error.dark" fontWeight="medium">
                    Overdue Items
                  </Typography>
                  <Typography variant="body2">
                    Items that are past their scheduled time appear in <strong style={{ color: '#F44336' }}>red</strong>. Complete these as soon as possible.
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Box>
        </Paper>

        <SafeGrid container spacing={3}>
          <SafeGrid item xs={12} md={4}>
            <GoalInsightsCard 
              healthGoal={goal} 
              timeSeriesData={timeSeriesData}
              onViewDetails={() => {}} 
              patientName={patientName}
            />
            
            <Card sx={{ mt: 3, borderRadius: 2, overflow: 'hidden' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Detailed Explanations
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 2 }}>
                  <Button 
                    variant="text" 
                    color="primary" 
                    endIcon={<ChevronRight />}
                    onClick={() => handleOpenDetails('success')}
                    fullWidth
                    sx={{ 
                      justifyContent: 'space-between',
                      py: 1.5,
                      borderRadius: 2,
                      bgcolor: 'rgba(33, 150, 243, 0.04)',
                      color: '#2196F3',
                      '&:hover': { bgcolor: 'rgba(33, 150, 243, 0.08)' }
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <TrendingUp size={18} style={{ marginRight: 8 }} />
                      Success Probability Details
                    </Box>
                  </Button>
                  <Button 
                    variant="text" 
                    color="secondary" 
                    endIcon={<ChevronRight />}
                    onClick={() => handleOpenDetails('compliance')}
                    fullWidth
                    sx={{ 
                      justifyContent: 'space-between',
                      py: 1.5,
                      borderRadius: 2,
                      bgcolor: 'rgba(101, 84, 192, 0.04)',
                      color: '#6554C0',
                      '&:hover': { bgcolor: 'rgba(101, 84, 192, 0.08)' }
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Clipboard size={18} style={{ marginRight: 8 }} />
                      Compliance Breakdown
                    </Box>
                  </Button>
                  <Button 
                    variant="text" 
                    endIcon={<ChevronRight />}
                    onClick={() => handleOpenDetails('streak')}
                    fullWidth
                    sx={{ 
                      justifyContent: 'space-between',
                      py: 1.5,
                      borderRadius: 2,
                      bgcolor: 'rgba(255, 152, 0, 0.04)',
                      color: '#FF9800',
                      '&:hover': { bgcolor: 'rgba(255, 152, 0, 0.08)' }
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Award size={18} style={{ marginRight: 8 }} />
                      Streak Information
                    </Box>
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </SafeGrid>
          
          <SafeGrid item xs={12} md={8}>
            <Card sx={{ borderRadius: 2, overflow: 'hidden' }}>
              <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={activeTab} onChange={handleChange} aria-label="goal insights tabs">
                  <Tab label="Progress Trends" />
                  <Tab label="Activity History" />
                  <Tab label="Recommendations" />
                  <Tab label="Schedule Calendar" />
                </Tabs>
              </Box>
              
              {/* Trends Tab */}
              {activeTab === 0 && (
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight="medium" gutterBottom>
                    Progress Over Time
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    This chart shows how your success probability and compliance rate have changed over time
                  </Typography>
                  
                  <Box sx={{ height: 400, mt: 3 }}>
                    <Chart
                      options={trendChartOptions}
                      series={trendChartSeries}
                      type="line"
                      height="100%"
                    />
                  </Box>
                  
                  <Box sx={{ mt: 4 }}>
                    <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                      Key Insights
                    </Typography>
                    
                    <SafeGrid container spacing={2} sx={{ mt: 1 }}>
                      <SafeGrid item xs={12} sm={6}>
                        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: '100%' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <TrendingUp size={16} color="#2196F3" style={{ marginRight: 8 }} />
                            <Typography variant="subtitle2" color="primary">
                              Success Probability Trend
                            </Typography>
                          </Box>
                          <Typography variant="body2">
                            Your success probability has {trendData.probability[5] >= trendData.probability[0] ? 'improved' : 'declined'} by {Math.abs(trendData.probability[5] - trendData.probability[0])}% over the past month.
                          </Typography>
                        </Paper>
                      </SafeGrid>
                      <SafeGrid item xs={12} sm={6}>
                        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: '100%' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <Clipboard size={16} color="#6554C0" style={{ marginRight: 8 }} />
                            <Typography variant="subtitle2" color="secondary">
                              Compliance Rate Trend
                            </Typography>
                          </Box>
                          <Typography variant="body2">
                            Your compliance has {trendData.compliance[5] >= trendData.compliance[0] ? 'improved' : 'declined'} by {Math.abs(trendData.compliance[5] - trendData.compliance[0])}% over the past month.
                          </Typography>
                        </Paper>
                      </SafeGrid>
                    </SafeGrid>
                  </Box>
                </CardContent>
              )}
              
              {/* Activity History Tab */}
              {activeTab === 1 && (
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight="medium" gutterBottom>
                    Recent Activity History
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    A record of all your health metrics and actions over time
                  </Typography>
                  
                  <TableContainer component={Paper} variant="outlined" sx={{ mt: 3 }}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Date</TableCell>
                          <TableCell>Activity Type</TableCell>
                          <TableCell>Name</TableCell>
                          <TableCell>Value</TableCell>
                          <TableCell>Change/Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {activityHistory.map((activity, index) => (
                          <TableRow key={index}>
                            <TableCell>{activity.date}</TableCell>
                            <TableCell>
                              <Chip 
                                label={activity.type} 
                                size="small"
                                color={activity.type === 'Metric' ? 'primary' : 'secondary'}
                                variant="outlined"
                                sx={{ 
                                  '& .MuiChip-label': { px: 1 },
                                  fontWeight: 'medium'
                                }}
                              />
                            </TableCell>
                            <TableCell>{activity.name}</TableCell>
                            <TableCell>{activity.value}</TableCell>
                            <TableCell>
                              {activity.type === 'Metric' ? (
                                <Typography 
                                  variant="body2" 
                                  color={
                                    activity.change.includes('-') ? 'success.main' : 
                                    activity.change.includes('0') ? 'text.secondary' : 
                                    'error.main'
                                  }
                                  fontWeight="medium"
                                >
                                  {activity.change}
                                </Typography>
                              ) : (
                                <Chip 
                                  label={activity.status} 
                                  size="small"
                                  color={activity.status === 'Success' ? 'success' : 'error'}
                                  sx={{ 
                                    height: 24,
                                    '& .MuiChip-label': { px: 1 },
                                    fontSize: '0.75rem'
                                  }}
                                />
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                    <Button variant="outlined" endIcon={<ChevronRight />}>
                      View Complete History
                    </Button>
                  </Box>
                </CardContent>
              )}
              
              {/* Recommendations Tab */}
              {activeTab === 2 && (
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight="medium" gutterBottom>
                    Personalized Recommendations
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Suggestions to help you improve your success rate and reach your goal
                  </Typography>
                  
                  <SafeGrid container spacing={2} sx={{ mt: 2 }}>
                    <SafeGrid item xs={12}>
                      <Paper 
                        variant="outlined" 
                        sx={{ 
                          p: 2, 
                          borderRadius: 2, 
                          borderLeft: '4px solid #66BB6A',
                          bgcolor: 'rgba(102, 187, 106, 0.04)'
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                          <Award size={20} color="#66BB6A" style={{ marginRight: 12, marginTop: 2 }} />
                          <Box>
                            <Typography variant="subtitle1" gutterBottom color="success.dark">
                              What's Working Well
                            </Typography>
                            <Typography variant="body2" paragraph>
                              You've been consistent with your medication schedule, achieving 95% compliance. This is excellent and directly contributes to your improved health outcomes.
                            </Typography>
                            <Typography variant="body2">
                              Recommendation: Continue this excellent habit and consider applying similar strategies to other actions.
                            </Typography>
                          </Box>
                        </Box>
                      </Paper>
                    </SafeGrid>
                    
                    <SafeGrid item xs={12}>
                      <Paper 
                        variant="outlined" 
                        sx={{ 
                          p: 2, 
                          borderRadius: 2, 
                          borderLeft: '4px solid #FFA726',
                          bgcolor: 'rgba(255, 167, 38, 0.04)'
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                          <Info size={20} color="#FFA726" style={{ marginRight: 12, marginTop: 2 }} />
                          <Box>
                            <Typography variant="subtitle1" gutterBottom color="warning.dark">
                              Improvement Opportunity
                            </Typography>
                            <Typography variant="body2" paragraph>
                              Your exercise compliance is at 67%, which is good but could be improved. Increasing this would likely boost your success rate significantly.
                            </Typography>
                            <Typography variant="body2">
                              Recommendation: Try scheduling your exercise at the same time each day to build a stronger habit.
                            </Typography>
                          </Box>
                        </Box>
                      </Paper>
                    </SafeGrid>
                    
                    <SafeGrid item xs={12}>
                      <Paper 
                        variant="outlined" 
                        sx={{ 
                          p: 2, 
                          borderRadius: 2, 
                          borderLeft: '4px solid #6554C0',
                          bgcolor: 'rgba(101, 84, 192, 0.04)'
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                          <CalendarIcon size={20} color="#6554C0" style={{ marginRight: 12, marginTop: 2 }} />
                          <Box>
                            <Typography variant="subtitle1" gutterBottom color="secondary.dark">
                              Next Steps
                            </Typography>
                            <Typography variant="body2" paragraph>
                              Based on your current progress, we recommend focusing on maintaining your streak to build momentum. Your streak is currently at {goal.streak_count} days.
                            </Typography>
                            <Typography variant="body2">
                              Recommendation: Complete at least one health action tomorrow to keep your streak going. Even a small action counts!
                            </Typography>
                          </Box>
                        </Box>
                      </Paper>
                    </SafeGrid>
                  </SafeGrid>
                </CardContent>
              )}
              
              {/* Schedule Calendar Tab - New */}
              {activeTab === 3 && (
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight="medium" gutterBottom>
                    Monthly Schedule Calendar
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    View when each action and metric needs to be completed or recorded
                  </Typography>
                  
                  <Box sx={{ mt: 3 }}>
                    <ScheduledItemsCalendar 
                      healthGoal={healthGoal} 
                      timeSeriesData={timeSeriesData}
                      viewType="month"
                      onItemClick={handleScheduledItemClick}
                    />
                  </Box>
                  
                  <Box sx={{ mt: 4 }}>
                    <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                      Understanding Your Schedule
                    </Typography>
                    
                    <SafeGrid container spacing={2} sx={{ mt: 1 }}>
                      <SafeGrid item xs={12} sm={6}>
                        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: '100%' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <Clipboard size={16} color="#6554C0" style={{ marginRight: 8 }} />
                            <Typography variant="subtitle2" color="secondary">
                              Action Items
                            </Typography>
                          </Box>
                          <Typography variant="body2">
                            Actions are activities you need to complete regularly. They're shown in <strong style={{ color: '#6554C0' }}>purple</strong> on the calendar.
                          </Typography>
                        </Paper>
                      </SafeGrid>
                      <SafeGrid item xs={12} sm={6}>
                        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: '100%' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <TrendingUp size={16} color="#2196F3" style={{ marginRight: 8 }} />
                            <Typography variant="subtitle2" color="primary">
                              Metric Recordings
                            </Typography>
                          </Box>
                          <Typography variant="body2">
                            Metrics are measurements you need to record regularly. They're shown in <strong style={{ color: '#2196F3' }}>blue</strong> on the calendar.
                          </Typography>
                        </Paper>
                      </SafeGrid>
                      <SafeGrid item xs={12}>
                        <Paper 
                          variant="outlined" 
                          sx={{ 
                            p: 2, 
                            borderRadius: 2, 
                            borderLeft: '4px solid #F44336',
                            bgcolor: 'rgba(244, 67, 54, 0.04)'
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                            <Info size={16} color="#F44336" style={{ marginRight: 12, marginTop: 2 }} />
                            <Box>
                              <Typography variant="subtitle2" gutterBottom color="error.dark">
                                Overdue Items
                              </Typography>
                              <Typography variant="body2">
                                Any items that are past their scheduled time will be marked in <strong style={{ color: '#F44336' }}>red</strong>. Complete these as soon as possible to maintain consistent progress toward your goal.
                              </Typography>
                            </Box>
                          </Box>
                        </Paper>
                      </SafeGrid>
                    </SafeGrid>
                  </Box>
                </CardContent>
              )}
            </Card>
            
            <Card sx={{ borderRadius: 2, overflow: 'hidden', mt: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight="medium" gutterBottom>
                  Medical Provider Notes
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Feedback from your healthcare provider about your progress
                </Typography>
                
                <Box sx={{ 
                  p: 2, 
                  bgcolor: 'rgba(33, 150, 243, 0.04)', 
                  borderRadius: 2,
                  border: '1px solid rgba(33, 150, 243, 0.2)',
                  mt: 2
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Clock size={16} color="#2196F3" style={{ marginRight: 8 }} />
                    <Typography variant="caption" color="primary">
                      Last updated: April 1, 2025
                    </Typography>
                  </Box>
                  <Typography variant="body1" paragraph>
                    Patient is showing good progress with weight loss program. Blood pressure is trending in the right direction but still needs monitoring. Continue current medication regimen and try to increase exercise frequency to 4 times per week.
                  </Typography>
                  <Typography variant="body2" align="right" color="text.secondary">
                    — Dr. Sarah Johnson
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </SafeGrid>
        </SafeGrid>
      </Container>
      
      {/* Details Dialog */}
      <Dialog
        open={openDetails}
        onClose={handleCloseDetails}
        maxWidth="sm"
        fullWidth
      >
        {getDetailContent()}
      </Dialog>
      
      {/* Schedule Item Dialog */}
      <Dialog
        open={openScheduleDialog}
        onClose={handleCloseScheduleDialog}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">
              {selectedScheduleItem?.type === 'action' ? 'Complete Action' : 'Record Metric'}
            </Typography>
            <IconButton edge="end" onClick={handleCloseScheduleDialog}>
              <X size={18} />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {selectedScheduleItem && (
            <>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                  {selectedScheduleItem.name}
                </Typography>
                <Typography variant="body2" paragraph color="text.secondary">
                  {selectedScheduleItem.description}
                </Typography>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Chip 
                    icon={selectedScheduleItem.type === 'action' ? <Clipboard size={14} /> : <TrendingUp size={14} />}
                    label={selectedScheduleItem.type === 'action' ? 'Action' : 'Metric'} 
                    size="small"
                    color={selectedScheduleItem.type === 'action' ? 'secondary' : 'primary'}
                    variant="outlined"
                  />
                  
                  <Chip 
                    icon={<Clock size={14} />}
                    label={`Every ${selectedScheduleItem.intervalHours} hours`}
                    size="small"
                    variant="outlined"
                  />
                </Box>
                
                <Typography variant="subtitle2" gutterBottom>
                  Scheduled for:
                </Typography>
                <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'background.default' }}>
                  <Typography variant="body2">
                    {selectedScheduleItem.scheduledTime.toLocaleDateString()} at {selectedScheduleItem.scheduledTime.toLocaleTimeString()}
                  </Typography>
                </Paper>
                
                {selectedScheduleItem.isOverdue && (
                  <Box sx={{ mt: 2, p: 1.5, bgcolor: 'error.light', borderRadius: 1, color: 'error.dark' }}>
                    <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                      <Info size={16} style={{ marginRight: 8 }} />
                      Overdue
                    </Typography>
                    <Typography variant="body2">
                      This item is {selectedScheduleItem.overdueTime}
                    </Typography>
                  </Box>
                )}
              </Box>
              
              {selectedScheduleItem.type === 'action' ? (
                <Button 
                  variant="contained" 
                  color="secondary" 
                  fullWidth
                  startIcon={<Check />}
                  sx={{ mt: 1 }}
                >
                  Mark as Completed
                </Button>
              ) : (
                <Button 
                  variant="contained" 
                  color="primary" 
                  fullWidth
                  startIcon={<TrendingUp />}
                  sx={{ mt: 1 }}
                >
                  Record Measurement
                </Button>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default GoalInsightsPage;