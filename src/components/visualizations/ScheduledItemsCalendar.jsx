import React, { useState, useMemo, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Divider,
  Chip,
  Paper,
  IconButton,
  Tooltip,
  Badge,
  useTheme
} from '@mui/material';
import { SafeGrid } from '../material'; // Import our SafeGrid component
import {
  Clock,
  Check,
  Calendar as CalendarIcon,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Plus,
  Activity,
  Clipboard,
  CheckCircle,
  TimerReset,
  Info
} from 'lucide-react';

// Add explicit default Grid props to prevent Grid.js forEach errors
const GRID_DEFAULT_PROPS = {
  container: {
    spacing: 2,
    direction: "row",
    justifyContent: "flex-start",
    alignItems: "stretch"
  },
  item: {
    xs: 12,
    sm: 6,
    md: 4
  }
};

// Helper to generate day labels for calendar
const getDayLabel = (date) => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[date.getDay()];
};

// Helper to get month name
const getMonthName = (month) => {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[month];
};

// Helper to get formatted time string
const getTimeString = (date) => {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const formattedHours = hours % 12 || 12;
  const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
  return `${formattedHours}:${formattedMinutes} ${ampm}`;
};

// Helper to check if date is today
const isToday = (date) => {
  const today = new Date();
  return date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();
};

// Helper to format overdue time
const formatOverdueTime = (milliseconds) => {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days} day${days !== 1 ? 's' : ''} overdue`;
  } else if (hours > 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''} overdue`;
  } else if (minutes > 0) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''} overdue`;
  } else {
    return 'Just now';
  }
};

// Calculate next scheduled time based on interval and last record
const getNextScheduledTime = (item, itemType) => {
  const now = new Date();
  let interval, lastRecordTime, creationTime;

  // Add defensive checks to handle potential undefined values
  if (!item || !item.details) {
    console.warn(`Invalid item data for ${itemType}`, item);
    return {
      scheduledTime: now,
      isOverdue: false,
      overdueTime: '',
      intervalHours: 24 // Default to daily
    };
  }

  if (itemType === 'action') {
    interval = item.details.interval || 24; // Default to daily if not specified
    creationTime = item.details.created_at ? new Date(item.details.created_at) : now;
    lastRecordTime = item.records && item.records.length > 0 && item.records[item.records.length - 1].performed_at
      ? new Date(item.records[item.records.length - 1].performed_at)
      : creationTime;
  } else { // metric
    interval = item.details.measurement_interval || 24; // Default to daily if not specified
    creationTime = item.details.created_at ? new Date(item.details.created_at) : now;
    lastRecordTime = item.records && item.records.length > 0 && item.records[item.records.length - 1].recorded_at
      ? new Date(item.records[item.records.length - 1].recorded_at)
      : creationTime;
  }

  // Calculate next scheduled time (interval is in hours)
  const nextScheduledTime = new Date(lastRecordTime);
  nextScheduledTime.setHours(nextScheduledTime.getHours() + interval);

  // Calculate if it's overdue
  const isOverdue = nextScheduledTime < now;
  const overdueTime = isOverdue ? now - nextScheduledTime : 0;
  
  return {
    scheduledTime: nextScheduledTime,
    isOverdue,
    overdueTime: isOverdue ? formatOverdueTime(overdueTime) : '',
    intervalHours: interval
  };
};

// Get all scheduled items for the calendar
const getScheduledItems = (healthGoal) => {
  if (!healthGoal) return [];
  
  const actions = healthGoal.actions || {};
  const metrics = healthGoal.metrics || {};
  const scheduledItems = [];
  const now = new Date();
  
  // Process actions
  Object.keys(actions).forEach(actionKey => {
    const action = actions[actionKey];
    if (!action || !action.details) return;
    
    const records = action.records || [];
    const interval = action.details.interval || 24; // Default to daily if not specified
    const creationTime = action.details.created_at ? new Date(action.details.created_at) : now;
    
    // Generate past scheduled items with completion status
    if (records.length > 0) {
      // First, handle all recorded actions
      records.forEach(record => {
        const recordTime = new Date(record.performed_at);
        scheduledItems.push({
          id: `action-past-${actionKey}-${record.performed_at}`,
          name: actionKey,
          description: action.details.description || 'Complete this action',
          type: 'action',
          scheduledTime: recordTime,
          isPast: true,
          isCompleted: record.result === "completed",
          status: record.result || "completed",
          intervalHours: interval,
          value: record.value || null
        });
      });
      
      // Find any missed actions between records based on interval
      if (records.length > 1) {
        for (let i = 0; i < records.length - 1; i++) {
          const currentRecordTime = new Date(records[i].performed_at);
          const nextRecordTime = new Date(records[i + 1].performed_at);
          
          // Calculate how many scheduled items should be between these records
          const hoursDiff = (nextRecordTime - currentRecordTime) / (1000 * 60 * 60);
          const expectedItems = Math.floor(hoursDiff / interval);
          
          if (expectedItems > 1) {
            // There are some potentially missed items
            for (let j = 1; j < expectedItems; j++) {
              const missedTime = new Date(currentRecordTime);
              missedTime.setHours(missedTime.getHours() + (interval * j));
              
              // Only add if it's not too close to the next record (within half the interval)
              if (missedTime < new Date(nextRecordTime.getTime() - (interval * 1000 * 60 * 60 * 0.5))) {
                scheduledItems.push({
                  id: `action-missed-${actionKey}-${missedTime.getTime()}`,
                  name: actionKey,
                  description: action.details.description || 'Complete this action',
                  type: 'action',
                  scheduledTime: missedTime,
                  isPast: true,
                  isCompleted: false,
                  status: "missed",
                  intervalHours: interval
                });
              }
            }
          }
        }
      }
      
      // Calculate future schedule based on the most recent record
      const lastRecord = records[records.length - 1];
      const lastRecordTime = new Date(lastRecord.performed_at);
      
      // Create future items for the next 6 intervals
      for (let i = 1; i <= 6; i++) {
        const futureTime = new Date(lastRecordTime);
        futureTime.setHours(futureTime.getHours() + (interval * i));
        
        // Only add future items that haven't passed yet
        if (futureTime > now) {
          scheduledItems.push({
            id: `action-future-${actionKey}-${futureTime.getTime()}`,
            name: actionKey,
            description: action.details.description || 'Complete this action',
            type: 'action',
            scheduledTime: futureTime,
            isPast: false,
            isCompleted: false,
            status: "scheduled",
            isOverdue: futureTime < now,
            overdueTime: futureTime < now ? formatOverdueTime(now - futureTime) : '',
            intervalHours: interval
          });
        }
      }
    } else {
      // No records yet, start from creation date
      // Add one past missed item if the first interval has passed
      const firstScheduledTime = new Date(creationTime);
      firstScheduledTime.setHours(firstScheduledTime.getHours() + interval);
      
      if (firstScheduledTime < now) {
        scheduledItems.push({
          id: `action-missed-${actionKey}-${firstScheduledTime.getTime()}`,
          name: actionKey,
          description: action.details.description || 'Complete this action',
          type: 'action',
          scheduledTime: firstScheduledTime,
          isPast: true,
          isCompleted: false,
          status: "missed",
          intervalHours: interval
        });
      }
      
      // Create future items starting from creation time
      for (let i = 1; i <= 6; i++) {
        const futureTime = new Date(creationTime);
        futureTime.setHours(futureTime.getHours() + (interval * i));
        
        // Only add future items that haven't passed yet (except the first one which might be overdue)
        if (i === 1 || futureTime > now) {
          scheduledItems.push({
            id: `action-future-${actionKey}-${futureTime.getTime()}`,
            name: actionKey,
            description: action.details.description || 'Complete this action',
            type: 'action',
            scheduledTime: futureTime,
            isPast: false,
            isCompleted: false,
            status: "scheduled",
            isOverdue: futureTime < now,
            overdueTime: futureTime < now ? formatOverdueTime(now - futureTime) : '',
            intervalHours: interval
          });
        }
      }
    }
  });

  // Process metrics
  Object.keys(metrics).forEach(metricKey => {
    const metric = metrics[metricKey];
    if (!metric || !metric.details) return;
    
    const records = metric.records || [];
    const interval = metric.details.measurement_interval || 72; // Default to 3 days if not specified
    const creationTime = metric.details.created_at ? new Date(metric.details.created_at) : now;
    
    // Generate past scheduled items with completion status
    if (records.length > 0) {
      // First, handle all recorded metrics
      records.forEach(record => {
        const recordTime = new Date(record.recorded_at);
        scheduledItems.push({
          id: `metric-past-${metricKey}-${record.recorded_at}`,
          name: metricKey,
          description: metric.details && metric.details.unit 
            ? `Record ${metricKey} (${metric.details.unit})` 
            : `Record ${metricKey}`,
          type: 'metric',
          scheduledTime: recordTime,
          isPast: true,
          isCompleted: true,
          status: "recorded",
          intervalHours: interval,
          value: record.recorded_value || null,
          unit: metric.details.unit || ''
        });
      });
      
      // Find any missed metrics between records based on interval
      if (records.length > 1) {
        for (let i = 0; i < records.length - 1; i++) {
          const currentRecordTime = new Date(records[i].recorded_at);
          const nextRecordTime = new Date(records[i + 1].recorded_at);
          
          // Calculate how many scheduled items should be between these records
          const hoursDiff = (nextRecordTime - currentRecordTime) / (1000 * 60 * 60);
          const expectedItems = Math.floor(hoursDiff / interval);
          
          if (expectedItems > 1) {
            // There are some potentially missed items
            for (let j = 1; j < expectedItems; j++) {
              const missedTime = new Date(currentRecordTime);
              missedTime.setHours(missedTime.getHours() + (interval * j));
              
              // Only add if it's not too close to the next record (within half the interval)
              if (missedTime < new Date(nextRecordTime.getTime() - (interval * 1000 * 60 * 60 * 0.5))) {
                scheduledItems.push({
                  id: `metric-missed-${metricKey}-${missedTime.getTime()}`,
                  name: metricKey,
                  description: metric.details && metric.details.unit 
                    ? `Record ${metricKey} (${metric.details.unit})` 
                    : `Record ${metricKey}`,
                  type: 'metric',
                  scheduledTime: missedTime,
                  isPast: true,
                  isCompleted: false,
                  status: "missed",
                  intervalHours: interval,
                  unit: metric.details.unit || ''
                });
              }
            }
          }
        }
      }
      
      // Calculate future schedule based on the most recent record
      const lastRecord = records[records.length - 1];
      const lastRecordTime = new Date(lastRecord.recorded_at);
      
      // Create future items for the next 6 intervals
      for (let i = 1; i <= 6; i++) {
        const futureTime = new Date(lastRecordTime);
        futureTime.setHours(futureTime.getHours() + (interval * i));
        
        // Only add future items that haven't passed yet
        if (futureTime > now) {
          scheduledItems.push({
            id: `metric-future-${metricKey}-${futureTime.getTime()}`,
            name: metricKey,
            description: metric.details && metric.details.unit 
              ? `Record ${metricKey} (${metric.details.unit})` 
              : `Record ${metricKey}`,
            type: 'metric',
            scheduledTime: futureTime,
            isPast: false,
            isCompleted: false,
            status: "scheduled",
            isOverdue: futureTime < now,
            overdueTime: futureTime < now ? formatOverdueTime(now - futureTime) : '',
            intervalHours: interval,
            unit: metric.details.unit || ''
          });
        }
      }
    } else {
      // No records yet, start from creation date
      // Add one past missed item if the first interval has passed
      const firstScheduledTime = new Date(creationTime);
      firstScheduledTime.setHours(firstScheduledTime.getHours() + interval);
      
      if (firstScheduledTime < now) {
        scheduledItems.push({
          id: `metric-missed-${metricKey}-${firstScheduledTime.getTime()}`,
          name: metricKey,
          description: metric.details && metric.details.unit 
            ? `Record ${metricKey} (${metric.details.unit})` 
            : `Record ${metricKey}`,
          type: 'metric',
          scheduledTime: firstScheduledTime,
          isPast: true,
          isCompleted: false,
          status: "missed",
          intervalHours: interval,
          unit: metric.details.unit || ''
        });
      }
      
      // Create future items starting from creation time
      for (let i = 1; i <= 6; i++) {
        const futureTime = new Date(creationTime);
        futureTime.setHours(futureTime.getHours() + (interval * i));
        
        // Only add future items that haven't passed yet (except the first one which might be overdue)
        if (i === 1 || futureTime > now) {
          scheduledItems.push({
            id: `metric-future-${metricKey}-${futureTime.getTime()}`,
            name: metricKey,
            description: metric.details && metric.details.unit 
              ? `Record ${metricKey} (${metric.details.unit})` 
              : `Record ${metricKey}`,
            type: 'metric',
            scheduledTime: futureTime,
            isPast: false,
            isCompleted: false,
            status: "scheduled",
            isOverdue: futureTime < now,
            overdueTime: futureTime < now ? formatOverdueTime(now - futureTime) : '',
            intervalHours: interval,
            unit: metric.details.unit || ''
          });
        }
      }
    }
  });

  // Sort by scheduled time
  return scheduledItems.sort((a, b) => a.scheduledTime - b.scheduledTime);
};

const getItemStatusColor = (item) => {
  // For completed past items
  if (item.isPast && item.isCompleted) {
    return {
      bg: item.type === 'action' ? 'rgba(101, 84, 192, 0.2)' : 'rgba(33, 150, 243, 0.2)',
      text: item.type === 'action' ? '#6554C0' : '#2196F3',
      border: item.type === 'action' ? '#D4CCEC' : '#BBDEFB',
      icon: <CheckCircle size={14} style={{ marginRight: 4 }} />
    };
  }
  
  // For missed past items
  if (item.isPast && !item.isCompleted) {
    return {
      bg: 'rgba(244, 67, 54, 0.1)',
      text: '#F44336',
      border: '#FFCDD2',
      icon: <AlertTriangle size={14} style={{ marginRight: 4 }} />
    };
  }
  
  // For overdue future items
  if (!item.isPast && item.isOverdue) {
    return {
      bg: 'rgba(255, 152, 0, 0.1)',
      text: '#FF9800',
      border: '#FFE0B2',
      icon: <Clock size={14} style={{ marginRight: 4 }} />
    };
  }
  
  // For upcoming future items
  return {
    bg: item.type === 'action' ? 'rgba(101, 84, 192, 0.1)' : 'rgba(33, 150, 243, 0.1)',
    text: item.type === 'action' ? '#6554C0' : '#2196F3',
    border: item.type === 'action' ? '#E2DEEB' : '#BBDEFB',
    icon: item.type === 'action' ? <Clipboard size={14} style={{ marginRight: 4 }} /> : <Activity size={14} style={{ marginRight: 4 }} />
  };
};

const ScheduledItemsCalendar = ({ 
  healthGoal, 
  timeSeriesData, 
  viewType = 'week', // 'week' or 'month'
  onItemClick,
  patientName
}) => {
  const theme = useTheme();
  // Replace theme.breakpoints.down with manual window width checks
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

  // Use data from time_series if available, otherwise use healthGoal
  // Extract metrics and actions from the API data structure safely
  const data = timeSeriesData || {};
  
  // Safely extract metrics and actions with null checks
  const { metrics = {}, actions = {} } = data;
  const metricDetails = healthGoal?.metrics || [];
  const actionDetails = healthGoal?.actions || [];
  
  // State for calendar navigation
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Get all scheduled items
  const scheduledItems = useMemo(() => getScheduledItems(data), [data]);

  // Navigate calendar
  const handlePrevious = () => {
    const newDate = new Date(currentDate);
    if (viewType === 'week') {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setMonth(newDate.getMonth() - 1);
    }
    setCurrentDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(currentDate);
    if (viewType === 'week') {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  // Generate calendar days based on view type
  const calendarDays = useMemo(() => {
    const days = [];
    const firstDay = new Date(currentDate);
    
    if (viewType === 'week') {
      // Set to the start of the week (Sunday)
      const dayOfWeek = firstDay.getDay();
      firstDay.setDate(firstDay.getDate() - dayOfWeek);
      
      // Generate 7 days for the week
      for (let i = 0; i < 7; i++) {
        const day = new Date(firstDay);
        day.setDate(day.getDate() + i);
        days.push(day);
      }
    } else {
      // Set to the first day of the month
      firstDay.setDate(1);
      
      // Get days in month
      const lastDay = new Date(firstDay.getFullYear(), firstDay.getMonth() + 1, 0);
      const daysInMonth = lastDay.getDate();
      
      // Include padding for days from previous month
      const firstDayOfWeek = firstDay.getDay();
      for (let i = 0; i < firstDayOfWeek; i++) {
        const prevMonthDay = new Date(firstDay);
        prevMonthDay.setDate(prevMonthDay.getDate() - (firstDayOfWeek - i));
        days.push({ date: prevMonthDay, isCurrentMonth: false });
      }
      
      // Add days of current month
      for (let i = 0; i < daysInMonth; i++) {
        const day = new Date(firstDay);
        day.setDate(day.getDate() + i);
        days.push({ date: day, isCurrentMonth: true });
      }
      
      // Add padding for days from next month to complete the grid
      const lastDayOfWeek = lastDay.getDay();
      for (let i = 1; i < 7 - lastDayOfWeek; i++) {
        const nextMonthDay = new Date(lastDay);
        nextMonthDay.setDate(nextMonthDay.getDate() + i);
        days.push({ date: nextMonthDay, isCurrentMonth: false });
      }
    }
    
    return days;
  }, [currentDate, viewType]);

  // Get items for a specific day
  const getItemsForDay = (day) => {
    return scheduledItems.filter(item => {
      const itemDate = new Date(item.scheduledTime);
      return itemDate.getDate() === day.getDate() &&
        itemDate.getMonth() === day.getMonth() &&
        itemDate.getFullYear() === day.getFullYear();
    });
  };

  // Get all overdue items (for compact view)
  const overdueItems = useMemo(() => {
    const now = new Date();
    return scheduledItems.filter(item => item.isOverdue);
  }, [scheduledItems]);

  // Get upcoming items for the next 7 days (for compact view)
  const upcomingItems = useMemo(() => {
    const now = new Date();
    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    return scheduledItems.filter(item => 
      !item.isOverdue && 
      item.scheduledTime >= now && 
      item.scheduledTime <= nextWeek
    ).slice(0, 5); // Limit to 5 for compact view
  }, [scheduledItems]);

  // Render week view (for GoalInsightsCard)
  const renderWeekView = () => {
    return (
      <>
        <Box sx={{ mb: 2, width: '100%' }}>
          {overdueItems.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" fontWeight="bold" sx={{ 
                color: theme.palette.error.main,
                display: 'flex',
                alignItems: 'center',
                mb: 1
              }}>
                <AlertTriangle size={16} style={{ marginRight: 6 }} />
                Overdue Items
              </Typography>
              <SafeGrid container spacing={1}>
                {overdueItems.map(item => (
                  <SafeGrid item xs={12} key={item.id}>
                    <Paper 
                      variant="outlined"
                      sx={{
                        p: 1.5,
                        borderLeft: `4px solid ${item.type === 'action' ? theme.palette.secondary.main : theme.palette.primary.main}`,
                        borderColor: theme.palette.error.main,
                        bgcolor: 'rgba(244, 67, 54, 0.04)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        cursor: 'pointer',
                        width: '100%',
                        '&:hover': {
                          bgcolor: 'rgba(244, 67, 54, 0.08)',
                        }
                      }}
                      onClick={() => onItemClick && onItemClick(item)}
                    >
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          {item.type === 'action' ? (
                            <Clipboard size={16} style={{ marginRight: 8, opacity: 0.7 }} />
                          ) : (
                            <Activity size={16} style={{ marginRight: 8, opacity: 0.7 }} />
                          )}
                          <Typography variant="body2" fontWeight="medium">
                            {item.name}
                          </Typography>
                        </Box>
                        <Typography variant="caption" color="error.main" sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                          <Clock size={12} style={{ marginRight: 4 }} />
                          {item.overdueTime}
                        </Typography>
                      </Box>
                      <TimerReset size={18} color={theme.palette.error.main} />
                    </Paper>
                  </SafeGrid>
                ))}
              </SafeGrid>
            </Box>
          )}

          <Typography variant="subtitle2" fontWeight="bold" sx={{ 
            display: 'flex',
            alignItems: 'center',
            mb: 1
          }}>
            <CalendarIcon size={16} style={{ marginRight: 6 }} />
            Upcoming Items
          </Typography>
          {upcomingItems.length > 0 ? (
            <SafeGrid container spacing={4}>
              {upcomingItems.map(item => {
                const statusColors = getItemStatusColor(item);
                return (
                  <SafeGrid item xs={12} sm={6} md={4} key={item.id}>
                    <Paper 
                      variant="outlined"
                      sx={{
                        p: 1.5,
                        height: '100%',
                        borderLeft: `4px solid ${statusColors.text}`,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        bgcolor: statusColors.bg,
                        '&:hover': {
                          bgcolor: `${statusColors.bg.slice(0, -1)}8)`,
                        }
                      }}
                      onClick={() => onItemClick && onItemClick(item)}
                    >
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          {statusColors.icon}
                          <Typography variant="body2" fontWeight="medium" color={statusColors.text} noWrap>
                            {item.name}
                          </Typography>
                        </Box>
                        
                        {item.isPast && item.isCompleted && item.value && (
                          <Typography variant="caption" sx={{ display: 'block', mb: 1 }}>
                            Value: {item.value} {item.unit || ''}
                          </Typography>
                        )}
                        
                        <Typography 
                          variant="caption" 
                          color={item.isOverdue ? "error.main" : "text.secondary"} 
                          sx={{ display: 'flex', alignItems: 'center' }}
                        >
                          <Clock size={12} style={{ marginRight: 4, flexShrink: 0 }} />
                          <Box sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {item.isOverdue ? 
                              item.overdueTime : 
                              `${item.scheduledTime.toLocaleDateString()} at ${getTimeString(item.scheduledTime)}`}
                          </Box>
                        </Typography>
                      </Box>
                      
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                        <Chip 
                          label={item.isPast && item.isCompleted ? 'Completed' : 
                                item.isPast && !item.isCompleted ? 'Missed' : 
                                item.isOverdue ? 'Overdue' : 
                                item.type === 'action' ? 'Action' : 'Metric'}
                          size="small"
                          sx={{ 
                            bgcolor: `${statusColors.bg.slice(0, -1)}4)`,
                            color: statusColors.text,
                            fontSize: '0.65rem',
                            height: 20,
                            '& .MuiChip-label': { px: 1 }
                          }}
                        />
                      </Box>
                    </Paper>
                  </SafeGrid>
                );
              })}
            </SafeGrid>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
              No upcoming items for the next 7 days
            </Typography>
          )}
        </Box>
      </>
    );
  };

  // Render month view (for GoalInsightsPage)
  const renderMonthView = () => {
    return (
      <>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, mb: 2 }}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <Typography 
              key={day} 
              variant="caption" 
              align="center" 
              fontWeight="medium"
              sx={{ 
                py: 0.5,
                color: 'text.secondary'
              }}
            >
              {day}
            </Typography>
          ))}
        </Box>
        
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
          {viewType === 'month' && calendarDays.map((dayObj, index) => {
            const { date, isCurrentMonth } = dayObj;
            const dayItems = getItemsForDay(date);
            const isCurrentDay = isToday(date);
            
            return (
              <Paper
                key={index}
                elevation={0}
                variant={isCurrentMonth ? "outlined" : "elevation"}
                sx={{
                  p: 1,
                  height: { xs: 80, sm: 100, md: 120 },
                  opacity: isCurrentMonth ? 1 : 0.4,
                  position: 'relative',
                  borderColor: isCurrentDay ? theme.palette.primary.main : 'divider',
                  borderWidth: isCurrentDay ? 2 : 1,
                  bgcolor: isCurrentDay ? 'rgba(33, 150, 243, 0.05)' : 'background.paper',
                  '&:hover': {
                    bgcolor: 'rgba(0, 0, 0, 0.02)',
                  },
                  overflow: 'hidden'
                }}
              >
                <Typography 
                  variant="caption" 
                  sx={{ 
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    fontWeight: isCurrentDay ? 'bold' : 'regular',
                    color: isCurrentDay ? 'primary.main' : 'text.primary',
                    height: 18,
                    width: 18,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '50%',
                    bgcolor: isCurrentDay ? 'primary.light' : 'transparent',
                    color: isCurrentDay ? 'white' : 'inherit'
                  }}
                >
                  {date.getDate()}
                </Typography>
                
                <Box sx={{ pt: 2, maxHeight: '100%', overflow: 'hidden' }}>
                  {dayItems.length > 0 ? dayItems.slice(0, 3).map(item => {
                    const statusColors = getItemStatusColor(item);
                    return (
                      <Tooltip 
                        key={item.id} 
                        title={`${item.name} - ${item.status} - ${item.scheduledTime.toLocaleTimeString()}`}
                        arrow
                      >
                        <Box
                          sx={{
                            px: 0.5,
                            py: 0.3,
                            mb: 0.5,
                            borderRadius: 0.5,
                            bgcolor: statusColors.bg,
                            color: statusColors.text,
                            borderLeft: `3px solid ${statusColors.text}`,
                            fontSize: '0.65rem',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                          onClick={() => onItemClick && onItemClick(item)}
                        >
                          {item.isPast && item.isCompleted && <CheckCircle size={10} style={{ marginRight: 3, flexShrink: 0 }} />}
                          {item.isPast && !item.isCompleted && <AlertTriangle size={10} style={{ marginRight: 3, flexShrink: 0 }} />}
                          {!item.isPast && item.isOverdue && <Clock size={10} style={{ marginRight: 3, flexShrink: 0 }} />}
                          <Box sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {item.name}
                            {item.isPast && item.isCompleted && item.value && (
                              <Typography component="span" variant="caption" sx={{ ml: 0.5, fontSize: '0.6rem' }}>
                                ({item.value})
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </Tooltip>
                    );
                  }) : null}
                  
                  {dayItems.length > 3 && (
                    <Tooltip title={`${dayItems.length - 3} more items`} arrow>
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          display: 'block', 
                          color: 'text.secondary',
                          fontSize: '0.65rem',
                          textAlign: 'center'
                        }}
                      >
                        +{dayItems.length - 3} more
                      </Typography>
                    </Tooltip>
                  )}
                </Box>
              </Paper>
            );
          })}
        </Box>
      </>
    );
  };

  // Generate title based on current view and date
  const calendarTitle = viewType === 'week'
    ? `Week of ${calendarDays[0].toLocaleDateString()} - ${calendarDays[6].toLocaleDateString()}`
    : `${getMonthName(currentDate.getMonth())} ${currentDate.getFullYear()}`;

  return (
    <Box>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mb: 2
      }}>
        <Typography variant="subtitle1" fontWeight="bold">
          {viewType === 'week' ? `Schedule for ${patientName}` : `Monthly Schedule for ${patientName}`}
        </Typography>
        
        {viewType === 'month' && (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton size="small" onClick={handlePrevious}>
              <ChevronLeft size={18} />
            </IconButton>
            <Typography variant="body2" sx={{ mx: 1 }}>
              {calendarTitle}
            </Typography>
            <IconButton size="small" onClick={handleNext}>
              <ChevronRight size={18} />
            </IconButton>
          </Box>
        )}
      </Box>
      
      {viewType === 'week' ? renderWeekView() : renderMonthView()}
      
      {viewType === 'week' && (
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          mt: 2,
          pt: 1,
          borderTop: '1px dashed rgba(0, 0, 0, 0.1)'
        }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
            <Info size={12} style={{ marginRight: 4 }} />
            Tap items to record or complete them
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default ScheduledItemsCalendar;