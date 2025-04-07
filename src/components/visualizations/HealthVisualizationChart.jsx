import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Card, CardContent, Typography, FormControl, InputLabel, Select, MenuItem, Chip, Button, ButtonGroup, Paper, IconButton, Tooltip, Divider } from '@mui/material';
import { SafeGrid } from './material'; // Import our SafeGrid component
import { alpha, useTheme } from '@mui/material/styles';
import Chart from 'react-apexcharts';
import { TrendingUp, Info, Calendar, ChevronUp, ChevronDown, ArrowUpRight, Activity, Target, Clock, AlertCircle, Monitor, Zap, Award, Check } from 'react-feather';

// Add this explicit spacing prop configuration at the beginning of the file
// to prevent Grid.js forEach errors
const GRID_DEFAULT_PROPS = {
  container: {
    spacing: 2
  },
  item: {
    xs: 12,
    sm: 6,
    md: 4
  }
};

// Fixed default theme - ensure all theme properties used in the component have defaults
const DEFAULT_THEME = {
  palette: {
    primary: {
      main: '#2196F3',
      light: '#64B5F6',
      dark: '#1976D2',
      contrastText: '#FFFFFF'
    },
    secondary: {
      main: '#6554C0',
      light: '#7E6AD0',
      dark: '#5245A7',
      contrastText: '#FFFFFF'
    },
    warning: {
      main: '#FF9800',
      light: '#FFB74D',
      dark: '#F57C00'
    },
    error: {
      main: '#F44336',
      light: '#E57373',
      dark: '#D32F2F'
    },
    success: {
      main: '#4CAF50',
      light: '#81C784',
      dark: '#388E3C'
    },
    info: {
      main: '#2196F3',
      light: '#64B5F6',
      dark: '#1976D2'
    },
    text: {
      primary: '#212121',
      secondary: '#757575'
    },
    divider: '#E0E0E0',
    background: {
      paper: '#FFFFFF',
      default: '#F5F5F5'
    },
    grey: {
      500: '#9E9E9E'
    },
    mode: 'light'
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif'
  },
  shape: {
    borderRadius: 4
  },
  shadows: [
    'none',
    '0px 2px 1px -1px rgba(0,0,0,0.2)',
    '0px 3px 1px -2px rgba(0,0,0,0.2),0px 2px 2px 0px rgba(0,0,0,0.14),0px 1px 5px 0px rgba(0,0,0,0.12)'
  ]
};

// Import or declare missing components
const Pill = Activity; // Using Activity as a fallback icon
const Footprints = Activity; // Using Activity as a fallback for Footprints icon

const HealthVisualizationChart = ({ patientData, navigate: navigationProp, patientName }) => {
  // Always call useNavigate unconditionally at the top level
  const navigateHook = useNavigate();
  // Then use the prop if provided, otherwise use the hook result
  const navigate = navigationProp || navigateHook;

  const themeFromContext = useTheme();
  
  // Use the theme from context if available, otherwise use default theme
  const theme = useMemo(() => {
    // Check if the theme object has the required properties
    if (themeFromContext && 
        themeFromContext.palette && 
        themeFromContext.typography && 
        themeFromContext.typography.fontFamily) {
      return themeFromContext;
    }
    return DEFAULT_THEME;
  }, [themeFromContext]);
  
  // Replace theme.breakpoints.down with a manual check for window width
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
  
  // Update the data extraction logic to better handle the API response format
  const { time_series = {}, health_goal = {} } = patientData || {};
  const { metrics = {}, actions = {} } = time_series;

  // Safe extraction of available metrics with additional null checks
  const availableMetrics = Object.keys(metrics).filter(key => 
    metrics[key]?.records && 
    Array.isArray(metrics[key].records) && 
    metrics[key].records.length > 0
  );
  
  // Safe extraction of available actions with additional null checks
  const availableActions = Object.keys(actions).filter(key => 
    actions[key]?.records && 
    Array.isArray(actions[key].records) && 
    actions[key].records.length > 0
  );

  // Initialize selected metrics and actions with safe defaults
  const [selectedMetrics, setSelectedMetrics] = useState(
    availableMetrics.length > 0 ? 
      availableMetrics.slice(0, Math.min(2, availableMetrics.length)) : 
      []
  );
  
  const [selectedActions, setSelectedActions] = useState(
    availableActions.length > 0 ? 
      availableActions.slice(0, Math.min(1, availableActions.length)) : 
      []
  );

  const today = new Date();
  const [dateRange, setDateRange] = useState('7days');
  const [startDate, setStartDate] = useState(new Date(today));
  const [endDate, setEndDate] = useState(new Date());
  const [showInsights, setShowInsights] = useState(true);
  
  // Initialize date range
  useEffect(() => {
    handleDateRangeChange(null, '7days');
  }, []);

  const handleDateRangeChange = (event, newRange) => {
    if (newRange !== null) {
      setDateRange(newRange);
      const newToday = new Date();

      switch (newRange) {
        case '7days':
          setStartDate(new Date(newToday.getTime() - 7 * 24 * 60 * 60 * 1000));
          setEndDate(new Date(newToday));
          break;
        case '14days':
          setStartDate(new Date(newToday.getTime() - 14 * 24 * 60 * 60 * 1000));
          setEndDate(new Date(newToday));
          break;
        case '30days':
          setStartDate(new Date(newToday.getTime() - 30 * 24 * 60 * 60 * 1000));
          setEndDate(new Date(newToday));
          break;
        case 'all':
          const allDates = [];
          availableMetrics.forEach(metric => {
            if (metrics[metric]?.records) {
              metrics[metric].records.forEach(record => {
                allDates.push(new Date(record.recorded_at));
              });
            }
          });

          availableActions.forEach(action => {
            if (actions[action]?.records) {
              actions[action].records.forEach(record => {
                allDates.push(new Date(record.performed_at));
              });
            }
          });

          if (allDates.length > 0) {
            const earliest = new Date(Math.min(...allDates));
            setStartDate(earliest);
            setEndDate(new Date(newToday));
          }
          break;
        default:
          setStartDate(new Date(newToday.getTime() - 7 * 24 * 60 * 60 * 1000));
          setEndDate(new Date(newToday));
      }
    }
  };

  const handleMetricChange = (event) => {
    setSelectedMetrics(event.target.value);
  };

  const handleActionChange = (event) => {
    setSelectedActions(event.target.value);
  };

  const chartData = useMemo(() => {
    let series = [];
    let annotations = { points: [] };

    // Process selected metrics data
    selectedMetrics.forEach((metricName, index) => {
      if (!metrics[metricName] || !metrics[metricName].records) return;

      const metricDetails = metrics[metricName].details || {};
      const unit = metricDetails.unit || '';
      const targetValue = metricDetails.target_value;
      
      // Get the metric color based on index
      const metricColors = ['#2196F3', '#00BCD4', '#6554C0', '#F44336', '#4CAF50'];
      const metricColor = metricColors[index % metricColors.length];

      const filteredRecords = metrics[metricName].records
        .filter(record => {
          const recordDate = new Date(record.recorded_at);
          return recordDate >= startDate && recordDate <= endDate;
        })
        .sort((a, b) => new Date(a.recorded_at) - new Date(b.recorded_at));

      if (filteredRecords.length === 0) return;

      const formattedData = filteredRecords.map(record => ({
        x: new Date(record.recorded_at).getTime(),
        y: record.recorded_value,
        status: record.status,
        prediction: record.prediction_probability,
        rationale: record.prediction_rationale
      }));

      series.push({
        name: `${metricName} ${unit ? `(${unit})` : ''}`,
        type: 'line',
        data: formattedData,
        color: metricColor
      });

      // Add target line if available
      if (targetValue !== undefined) {
        series.push({
          name: `${metricName} Target`,
          type: 'line',
          data: [
            { x: startDate.getTime(), y: targetValue },
            { x: endDate.getTime(), y: targetValue }
          ],
          color: alpha(metricColor, 0.6),
          dashArray: 5
        });
      }
    });

    // Process selected actions data
    selectedActions.forEach(actionName => {
      if (!actions[actionName] || !actions[actionName].records) return;

      const filteredRecords = actions[actionName].records
        .filter(record => {
          const actionDate = new Date(record.performed_at);
          return actionDate >= startDate && actionDate <= endDate;
        });

      if (filteredRecords.length === 0) return;

      // Group actions by date
      const actionsByDate = {};
      filteredRecords.forEach(record => {
        const dateKey = new Date(record.performed_at).toISOString().split('T')[0];
        if (!actionsByDate[dateKey]) {
          actionsByDate[dateKey] = [];
        }
        actionsByDate[dateKey].push(record);
      });

      // Create annotation points for actions
      Object.keys(actionsByDate).forEach(dateKey => {
        const actionDate = new Date(dateKey);
        let yPosition = null;

        // Try to position actions near metric points if possible
        if (selectedMetrics.length > 0 && series.length > 0) {
          const metricData = series[0].data;
          // Find if there's a metric point on the same day
          for (const point of metricData) {
            if (new Date(point.x).toISOString().split('T')[0] === dateKey) {
              yPosition = point.y;
              break;
            }
          }

          // If no exact match, find closest point
          if (yPosition === null && metricData.length > 0) {
            const sortedData = [...metricData].sort((a, b) => 
              Math.abs(new Date(a.x).getTime() - actionDate.getTime()) - 
              Math.abs(new Date(b.x).getTime() - actionDate.getTime())
            );
            yPosition = sortedData[0].y;
          }
        }

        // Default y-position if no metrics available
        if (yPosition === null && series.length > 0 && series[0].data.length > 0) {
          const avgValues = series.map(s => 
            s.data.reduce((sum, point) => sum + point.y, 0) / s.data.length
          );
          yPosition = Math.max(...avgValues) * 0.9;
        } else if (yPosition === null) {
          yPosition = 0;
        }

        const recordCount = actionsByDate[dateKey].length;
        const actionColor = actionName === 'Take Medication' ? '#4CAF50' : '#7C4DFF';

        annotations.points.push({
          x: actionDate.getTime(),
          y: yPosition,
          marker: {
            size: recordCount > 1 ? 10 : 8,
            fillColor: actionColor,
            strokeColor: '#FFF',
            radius: 2
          },
          label: {
            borderColor: actionColor,
            text: `${actionName} (${recordCount})`,
            style: {
              color: '#fff',
              background: actionColor,
              fontSize: '11px',
              fontWeight: 'bold'
            }
          }
        });
      });
    });

    return { series, annotations };
  }, [selectedMetrics, selectedActions, metrics, actions, startDate, endDate]);

  const chartOptions = useMemo(() => {
    return {
      chart: {
        height: 400,
        type: 'line',
        toolbar: {
          show: true,
          tools: {
            download: true,
            selection: true,
            zoom: true,
            zoomin: true,
            zoomout: true,
            pan: true,
          }
        },
        zoom: {
          enabled: true,
          type: 'x'
        },
        animations: {
          enabled: true,
          easing: 'easeinout',
          speed: 800,
          dynamicAnimation: {
            enabled: true,
            speed: 350
          }
        },
        background: '#fff',
        fontFamily: theme.typography.fontFamily
      },
      stroke: {
        curve: 'smooth',
        width: 3
      },
      legend: {
        show: true,
        position: 'top',
        horizontalAlign: 'center',
        fontSize: '13px',
        fontFamily: theme.typography.fontFamily,
        offsetY: 5,
        itemMargin: {
          horizontal: 10,
          vertical: 5
        }
      },
      grid: {
        borderColor: theme.palette.divider,
        row: {
          colors: ['#f8f9fa', 'transparent'],
          opacity: 0.2
        }
      },
      xaxis: {
        type: 'datetime',
        title: {
          text: 'Date',
          style: {
            fontSize: '14px',
            fontFamily: theme.typography.fontFamily,
            fontWeight: 500,
            color: theme.palette.text.primary
          }
        },
        labels: {
          formatter: function (val) {
            return new Date(val).toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric' 
            });
          },
          style: {
            fontSize: '12px',
            fontFamily: theme.typography.fontFamily,
            colors: theme.palette.text.secondary
          }
        },
        axisBorder: {
          show: true,
          color: theme.palette.divider
        },
        axisTicks: {
          show: true,
          color: theme.palette.divider
        }
      },
      yaxis: {
        title: {
          text: 'Value',
          style: {
            fontSize: '14px',
            fontFamily: theme.typography.fontFamily,
            fontWeight: 500,
            color: theme.palette.text.primary
          }
        },
        labels: {
          formatter: function (val) {
            return val.toFixed(1);
          },
          style: {
            fontSize: '12px',
            fontFamily: theme.typography.fontFamily,
            colors: theme.palette.text.secondary
          }
        }
      },
      tooltip: {
        shared: true,
        intersect: false,
        theme: theme.palette.mode,
        y: {
          formatter: function (y, { seriesIndex, dataPointIndex, w }) {
            if (typeof y !== 'undefined') {
              const seriesName = w.config.series[seriesIndex].name;
              if (seriesName.includes('Target')) {
                return `Target: ${y.toFixed(1)}`;
              } else {
                const point = w.config.series[seriesIndex].data[dataPointIndex];
                let tooltipText = `${y.toFixed(1)}`;
                if (point && point.prediction) {
                  tooltipText += `\nPrediction: ${point.prediction}%`;
                }
                return tooltipText;
              }
            }
            return y;
          }
        },
        x: {
          formatter: function(val) {
            return new Date(val).toLocaleDateString('en-US', { 
              weekday: 'short',
              month: 'short', 
              day: 'numeric',
              year: 'numeric'
            });
          }
        },
        marker: {
          show: true
        }
      },
      markers: {
        size: 5,
        strokeWidth: 2,
        hover: {
          size: 8
        }
      },
      annotations: chartData.annotations,
      responsive: [
        {
          breakpoint: 600,
          options: {
            chart: {
              height: 300
            },
            legend: {
              position: 'bottom',
              offsetY: 0
            }
          }
        }
      ]
    };
  }, [chartData, theme]);

  const getMetricStatus = (metricName) => {
    const metricDetails = metrics[metricName]?.details;
    if (!metricDetails) return { status: 'unknown', color: theme.palette.grey[500] };
    
    switch(metricDetails.status) {
      case 'on_track':
        return { status: 'On Track', color: theme.palette.success.main };
      case 'at_risk':
        return { status: 'At Risk', color: theme.palette.warning.main };
      case 'off_track':
        return { status: 'Off Track', color: theme.palette.error.main };
      default:
        return { status: 'Unknown', color: theme.palette.grey[500] };
    }
  };

  const getActionCount = (actionName) => {
    if (!actions[actionName]?.records) return 0;
    return actions[actionName].records.filter(record => 
      new Date(record.performed_at) >= startDate && 
      new Date(record.performed_at) <= endDate
    ).length;
  };

  const getInsightForMetric = (metricName) => {
    if (!metrics[metricName]?.records || metrics[metricName].records.length === 0) {
      return null;
    }
    
    // Get the most recent record with a prediction rationale
    const recordsWithRationale = metrics[metricName].records
      .filter(r => r.prediction_rationale)
      .sort((a, b) => new Date(b.recorded_at) - new Date(a.recorded_at));
    
    if (recordsWithRationale.length === 0) {
      return null;
    }
    
    return {
      probability: recordsWithRationale[0].prediction_probability,
      rationale: recordsWithRationale[0].prediction_rationale
    };
  };

  // Gather insights for selected metrics
  const insights = useMemo(() => {
    return selectedMetrics
      .map(metricName => {
        const insight = getInsightForMetric(metricName);
        if (!insight) return null;
        
        return {
          metricName,
          ...insight
        };
      })
      .filter(Boolean);
  }, [selectedMetrics]);

  // No data message when no metrics or actions are recorded
  const hasRecordedData = availableMetrics.length > 0 || availableActions.length > 0;
  
  if (!hasRecordedData) {
    return (
      <Card sx={{ 
        borderRadius: 2, 
        overflow: 'hidden', 
        mb: 4, 
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)', 
        width: '100%' 
      }}>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ 
            p: 3, 
            bgcolor: theme.palette.primary.main, 
            color: theme.palette.primary.contrastText 
          }}>
            <Typography variant="h6" component="h2" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center' }}>
              <TrendingUp size={20} style={{ marginRight: 10 }} />
              Health Data Visualization
            </Typography>
            <Typography variant="body2">
              Track your health metrics and actions to see patterns and trends over time
            </Typography>
          </Box>
          
          <Paper
            elevation={0}
            sx={{ 
              p: 4, 
              m: 3,
              bgcolor: alpha(theme.palette.primary.light, 0.05), 
              borderRadius: 2, 
              textAlign: 'center', 
              border: `1px dashed ${theme.palette.primary.main}`
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: '600px', mx: 'auto' }}>
              <Box sx={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 2
              }}>
                <Activity size={40} color={theme.palette.primary.main} />
              </Box>
              
              <Typography variant="h5" color="primary.dark" fontWeight="medium" gutterBottom>
                Start Your Health Tracking Journey
              </Typography>
              
              <Typography variant="body1" color="text.secondary" paragraph>
                Track your health metrics and actions to visualize your progress over time. 
                This powerful visualization helps you identify patterns and make informed decisions about your health.
              </Typography>
              
              <SafeGrid container spacing={2} sx={{ mb: 3, justifyContent: 'center' }}>
                <SafeGrid item>
                  <Button 
                    variant="contained" 
                    color="primary"
                    startIcon={<Monitor size={18} />}
                    size="large"
                    sx={{ 
                      borderRadius: 2,
                      px: 3,
                      boxShadow: theme.shadows[2]
                    }}
                    onClick={() => navigate('/healthdashboard', {
                      state: {
                        ...patientData,
                        openRecordDialog: true,
                        goal_data: patientData?.health_goal,
                        patientData: patientData
                      }
                    })}
                  >
                    Record Your First Metric
                  </Button>
                </SafeGrid>
                <SafeGrid item>
                  <Button 
                    variant="outlined" 
                    color="secondary"
                    startIcon={<Footprints size={18} />}
                    size="large"
                    sx={{ 
                      borderRadius: 2,
                      px: 3
                    }}
                    onClick={() => navigate('/healthdashboard', {
                      state: {
                        ...patientData,
                        openRecordDialog: true,
                        goal_data: patientData?.health_goal,
                        patientData: patientData
                      }
                    })}
                  >
                    Log Your First Action
                  </Button>
                </SafeGrid>
              </SafeGrid>
              
              <SafeGrid container spacing={2} sx={{ mb: 2 }}>
                <SafeGrid item xs={12} sm={6}>
                  <Paper sx={{ 
                    p: 2, 
                    bgcolor: alpha(theme.palette.success.main, 0.1),
                    border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                      <Zap size={22} color={theme.palette.success.main} style={{ marginRight: 8, flexShrink: 0 }} />
                      <Box>
                        <Typography variant="subtitle2" fontWeight="bold" color="success.main">
                          Visualize Health Trends
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          See how your metrics change over time and identify patterns
                        </Typography>
                      </Box>
                    </Box>
                  </Paper>
                </SafeGrid>
                <SafeGrid item xs={12} sm={6}>
                  <Paper sx={{ 
                    p: 2, 
                    bgcolor: alpha(theme.palette.info.main, 0.1),
                    border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                      <Award size={22} color={theme.palette.info.main} style={{ marginRight: 8, flexShrink: 0 }} />
                      <Box>
                        <Typography variant="subtitle2" fontWeight="bold" color="info.main">
                          Track Your Progress
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Monitor your health journey and celebrate improvements
                        </Typography>
                      </Box>
                    </Box>
                  </Paper>
                </SafeGrid>
              </SafeGrid>
              
              <Box sx={{ 
                mt: 2, 
                p: 2, 
                bgcolor: alpha(theme.palette.warning.main, 0.1), 
                borderRadius: 2, 
                display: 'flex', 
                alignItems: 'center',
                maxWidth: '500px',
                border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`
              }}>
                <Info size={20} color={theme.palette.warning.main} style={{ marginRight: 10, flexShrink: 0 }} />
                <Typography variant="body2" color="text.secondary">
                  <strong>Did you know?</strong> Consistent health tracking can improve health outcomes by up to 30% through better awareness and early intervention.
                </Typography>
              </Box>
            </Box>
          </Paper>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ 
      borderRadius: 2, 
      overflow: 'hidden', 
      mb: 4, 
      boxShadow: '0 4px 20px rgba(0,0,0,0.08)', 
      width: '100%' 
    }}>
      <CardContent sx={{ p: 0 }}>
        {/* Header */}
        <Box sx={{ 
          p: 3, 
          bgcolor: theme.palette.primary.main, 
          color: theme.palette.primary.contrastText 
        }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" component="h2" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center' }}>
              <TrendingUp size={20} style={{ marginRight: 10 }} />
              Health Data for {patientName}
            </Typography>
            
            <Tooltip title="This visualization shows how your health metrics and actions correlate over time">
              <IconButton size="small" color="inherit">
                <Info size={18} />
              </IconButton>
            </Tooltip>
          </Box>
          <Typography variant="body2">
            Track your health metrics and see how your actions affect your progress over time
          </Typography>
        </Box>
        
        {/* Filter Controls */}
        <Box sx={{ p: 3, bgcolor: alpha(theme.palette.background.paper, 0.5) }}>
          <SafeGrid container spacing={2}>
            <SafeGrid item xs={12} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel id="metric-select-label">Health Metrics</InputLabel>
                <Select
                  labelId="metric-select-label"
                  id="metric-select"
                  multiple
                  value={selectedMetrics}
                  onChange={handleMetricChange}
                  label="Health Metrics"
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip
                          key={value}
                          label={value}
                          size="small"
                          sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), color: theme.palette.primary.main }}
                        />
                      ))}
                    </Box>
                  )}
                >
                  {availableMetrics.map((metric) => {
                    const { status, color } = getMetricStatus(metric);
                    const unit = metrics[metric]?.details?.unit;
                    
                    return (
                      <MenuItem key={metric} value={metric}>
                        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Activity size={16} style={{ marginRight: 8, color: theme.palette.primary.main }} />
                            <Typography variant="body2">
                              {metric} {unit ? `(${unit})` : ''}
                            </Typography>
                          </Box>
                          <Chip 
                            label={status} 
                            size="small" 
                            sx={{ 
                              bgcolor: alpha(color, 0.1), 
                              color: color,
                              height: 20,
                              '& .MuiChip-label': {
                                px: 1,
                                fontSize: '0.7rem'
                              }
                            }} 
                          />
                        </Box>
                      </MenuItem>
                    );
                  })}
                </Select>
              </FormControl>
            </SafeGrid>
            
            <SafeGrid item xs={12} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel id="action-select-label">Health Actions</InputLabel>
                <Select
                  labelId="action-select-label"
                  id="action-select"
                  multiple
                  value={selectedActions}
                  onChange={handleActionChange}
                  label="Health Actions"
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip
                          key={value}
                          label={value}
                          size="small"
                          sx={{ bgcolor: alpha(theme.palette.secondary.main, 0.1), color: theme.palette.secondary.main }}
                        />
                      ))}
                    </Box>
                  )}
                >
                  {availableActions.map((action) => {
                    const count = getActionCount(action);
                    const icon = action === 'Take Medication' ? Pill : Footprints;
                    const IconComponent = icon;
                    
                    return (
                      <MenuItem key={action} value={action}>
                        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <IconComponent size={16} style={{ marginRight: 8, color: theme.palette.secondary.main }} />
                            <Typography variant="body2">{action}</Typography>
                          </Box>
                          <Chip 
                            label={`${count} time${count !== 1 ? 's' : ''}`} 
                            size="small"
                            sx={{ 
                              bgcolor: alpha(theme.palette.secondary.main, 0.1), 
                              color: theme.palette.secondary.main,
                              height: 20,
                              '& .MuiChip-label': {
                                px: 1,
                                fontSize: '0.7rem'
                              }
                            }} 
                          />
                        </Box>
                      </MenuItem>
                    );
                  })}
                </Select>
              </FormControl>
            </SafeGrid>
            
            <SafeGrid item xs={12} md={4}>
              <Box sx={{ 
                display: 'flex', 
                height: '100%', 
                alignItems: 'center', 
                justifyContent: { xs: 'flex-start', md: 'flex-end' } 
              }}>
                <Box sx={{ mr: 2, display: 'flex', alignItems: 'center' }}>
                  <Clock size={16} style={{ marginRight: 6, color: theme.palette.text.secondary }} />
                  <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                    Time Range:
                  </Typography>
                </Box>
                
                <ButtonGroup size="small" aria-label="date range" sx={{ height: '40px' }}>
                  <Button 
                    variant={dateRange === '7days' ? 'contained' : 'outlined'} 
                    color="primary"
                    onClick={(e) => handleDateRangeChange(e, '7days')}
                  >
                    7d
                  </Button>
                  <Button 
                    variant={dateRange === '14days' ? 'contained' : 'outlined'} 
                    color="primary"
                    onClick={(e) => handleDateRangeChange(e, '14days')}
                  >
                    14d
                  </Button>
                  <Button 
                    variant={dateRange === '30days' ? 'contained' : 'outlined'} 
                    color="primary"
                    onClick={(e) => handleDateRangeChange(e, '30days')}
                  >
                    30d
                  </Button>
                  <Button 
                    variant={dateRange === 'all' ? 'contained' : 'outlined'} 
                    color="primary"
                    onClick={(e) => handleDateRangeChange(e, 'all')}
                  >
                    All
                  </Button>
                </ButtonGroup>
              </Box>
            </SafeGrid>
          </SafeGrid>
        </Box>
        
        {/* Legend */}
        <Box sx={{ 
          px: 3,
          py: 2,
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: 3, 
          borderBottom: `1px solid ${theme.palette.divider}`, 
          justifyContent: { xs: 'center', sm: 'flex-start' } 
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: theme.palette.primary.main, mr: 1 }} />
            <Typography variant="body2">Metric Value</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box sx={{ width: 12, height: 2, bgcolor: theme.palette.warning.main, mr: 1 }} />
            <Typography variant="body2">Target Value</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#4CAF50', mr: 1 }} />
            <Typography variant="body2">Medication</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#7C4DFF', mr: 1 }} />
            <Typography variant="body2">Exercise/Activity</Typography>
          </Box>
        </Box>
        
        {/* Chart Section */}
        <Box sx={{ p: 3 }}>
          {/* Date range display */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
              <Calendar size={14} style={{ marginRight: 6 }} />
              Showing data from {startDate.toLocaleDateString()} to {endDate.toLocaleDateString()}
            </Typography>
            
            {insights.length > 0 && (
              <Button 
                size="small"
                color="primary"
                endIcon={showInsights ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                onClick={() => setShowInsights(!showInsights)}
              >
                Insights
              </Button>
            )}
          </Box>
          
          {/* Main chart */}
          <Box sx={{
            height: isMobile ? 300 : 400,
            width: '100%',
            position: 'relative'
          }}>
            {chartData.series.length > 0 ? (
              <Chart
                options={chartOptions}
                series={chartData.series}
                type="line"
                height={isMobile ? 300 : 400}
                width="100%"
              />
            ) : (
              <Paper
                elevation={0}
                sx={{ 
                  p: 4, 
                  bgcolor: alpha(theme.palette.info.light, 0.05), 
                  borderRadius: 2, 
                  textAlign: 'center', 
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                  border: `1px dashed ${theme.palette.divider}`
                }}
              >
                <AlertCircle size={32} style={{ color: theme.palette.text.secondary, marginBottom: 16 }} />
                <Typography variant="body1" color="text.secondary">
                  No data available for the selected metrics and time range
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Try selecting different metrics or adjusting the time range
                </Typography>
              </Paper>
            )}
          </Box>
        </Box>
        
        {/* Insights Section */}
        {insights.length > 0 && showInsights && (
          <Box sx={{ 
            mx: 3, 
            mb: 3, 
            p: 3, 
            bgcolor: alpha(theme.palette.info.main, 0.05), 
            borderRadius: 2, 
            border: `1px solid ${alpha(theme.palette.info.main, 0.2)}` 
          }}>
            <Typography 
              variant="subtitle1" 
              fontWeight="medium" 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                mb: 2,
                color: theme.palette.info.dark
              }}
            >
              <Zap size={18} style={{ marginRight: 8, color: theme.palette.info.main }} />
              Health Insights
            </Typography>
            
            <SafeGrid container spacing={2}>
              {insights.map((insight, index) => (
                <SafeGrid item xs={12} key={index}>
                  <Box sx={{ mb: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                      <Typography variant="subtitle2" fontWeight="bold">
                        {insight.metricName}
                      </Typography>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Target size={14} style={{ marginRight: 4 }} />
                        <Typography variant="body2" fontWeight="medium">
                          Success Probability: {insight.probability}%
                        </Typography>
                      </Box>
                    </Box>
                    
                    <Divider sx={{ my: 1 }} />
                    
                    <Typography variant="body2" color="text.secondary">
                      {insight.rationale}
                    </Typography>
                  </Box>
                </SafeGrid>
              ))}
            </SafeGrid>
          </Box>
        )}
        
        {/* Action Buttons */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'flex-end', 
          p: 3, 
          pt: 0,
          gap: 2,
          flexWrap: 'wrap' 
        }}>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<Monitor size={16} />}
            onClick={() => navigate('/healthdashboard', {
              state: {
                ...patientData,
                openRecordDialog: true,
                goal_data: patientData?.health_goal,
                patientData: patientData
              }
            })}
          >
            Record Metric
          </Button>
          
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<Footprints size={16} />}
            onClick={() => navigate('/healthdashboard', {
              state: {
                ...patientData,
                openRecordDialog: true,
                goal_data: patientData?.health_goal,
                patientData: patientData
              }
            })}
          >
            Record Action
          </Button>
          
          <Button
            variant="contained"
            color="primary"
            startIcon={<ArrowUpRight size={16} />}
            onClick={() => navigate('/healthdashboard', { 
              state: patientData 
            })}
          >
            View Detailed Dashboard
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

export default HealthVisualizationChart;