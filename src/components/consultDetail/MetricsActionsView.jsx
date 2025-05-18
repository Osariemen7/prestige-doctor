import React, { useState, useEffect, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  Divider,
  useMediaQuery,
  useTheme
} from '@mui/material';
import AssessmentIcon from '@mui/icons-material/Assessment';
import DirectionsRunIcon from '@mui/icons-material/DirectionsRun';
import FavoriteIcon from '@mui/icons-material/Favorite';
import MonitorWeightIcon from '@mui/icons-material/MonitorWeight';
import OpacityIcon from '@mui/icons-material/Opacity';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import SpaIcon from '@mui/icons-material/Spa';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';

// For future enhancement: import charting libraries
// import { Line, Bar, Radar } from 'react-chartjs-2';

// Debounce function for resize optimization
const debounce = (fn, ms) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      fn(...args);
    }, ms);
  };
};

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

// Use React.memo for optimization
const MetricCard = React.memo(({ title, value, unit, trend, icon, color, isSpaceLimited }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isVerySmallMobile = useMediaQuery('(max-width:360px)'); // Extra breakpoint for very small devices

  // Determine appropriate sizing based on space constraints
  const getFontSize = () => {
    if (isVerySmallMobile) return { title: '0.8rem', value: '1.35rem', unit: '0.6rem', trend: '0.6rem' };
    if (isMobile) return { title: '0.85rem', value: '1.5rem', unit: '0.65rem', trend: '0.65rem' };
    if (isSpaceLimited) return { title: '0.9rem', value: '1.75rem', unit: '0.7rem', trend: '0.7rem' };
    return { title: '1rem', value: '2rem', unit: '0.75rem', trend: '0.75rem' };
  };

  const fontSizes = getFontSize();

  return (
    <Card elevation={2} sx={{ borderRadius: 2, height: '100%', overflow: 'hidden' }}>
      <CardContent sx={{ 
        p: { xs: 1.5, sm: isSpaceLimited ? 1.75 : 2 },
        '&:last-child': { pb: { xs: 1.5, sm: isSpaceLimited ? 1.75 : 2 } } // Override MUI's default padding
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Box sx={{ 
            backgroundColor: `${color}.light`, 
            borderRadius: '50%', 
            p: { xs: 0.75, sm: isSpaceLimited ? 0.85 : 1 }, 
            mr: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {React.cloneElement(icon, { 
              fontSize: isMobile ? 'small' : isSpaceLimited ? 'small' : 'medium'
            })}
          </Box>
          <Typography variant="subtitle1" sx={{ 
            fontWeight: 'medium',
            fontSize: fontSizes.title,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: '75%' // Prevent very long titles from overflowing
          }}>
            {title}
          </Typography>
        </Box>
        <Box sx={{ mt: 1.5 }}>
          <Typography variant="h4" component="div" sx={{ 
            fontWeight: 'bold',
            fontSize: fontSizes.value
          }}>
            {value}
            {unit && (
              <Typography component="span" variant="body2" sx={{ 
                verticalAlign: 'super', 
                ml: 0.5,
                fontSize: fontSizes.unit
              }}>
                {unit}
              </Typography>
            )}
          </Typography>
          {trend && (
            <Box sx={{ mt: 0.5, display: 'flex', alignItems: 'center' }}>
              {trend.direction === 'up' ? (
                <Typography variant="caption" color="success.main" sx={{ fontSize: fontSizes.trend }}>↑ {trend.value}%</Typography>
              ) : (
                <Typography variant="caption" color="error.main" sx={{ fontSize: fontSizes.trend }}>↓ {trend.value}%</Typography>
              )}
              <Typography variant="caption" color="text.secondary" sx={{ 
                ml: 0.5,
                fontSize: fontSizes.trend
              }}>
                from last {trend.period || 'month'}
              </Typography>
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
});

// Use React.memo for optimization
const ActionCard = React.memo(({ action, isSpaceLimited }) => {
  const theme = useTheme();
  const isVerySmallMobile = useMediaQuery('(max-width:360px)'); // Extra breakpoint for very small devices
  
  // Determine appropriate sizing based on space constraints
  const getFontSize = () => {
    if (isVerySmallMobile) return { title: '0.9rem', subheader: '0.75rem', body: '0.8rem', progress: '0.7rem' };
    if (isSpaceLimited) return { title: '1rem', subheader: '0.8rem', body: '0.85rem', progress: '0.725rem' };
    return { title: '1.1rem', subheader: '0.875rem', body: '0.875rem', progress: '0.75rem' };
  };
  
  const fontSizes = getFontSize();
  
  return (
    <Card elevation={1} sx={{ mb: 2, borderRadius: 2 }}>
      <CardHeader
        title={action.title}
        subheader={`Due: ${formatDate(action.due_date)}`}
        sx={{ 
          pb: 1,
          '& .MuiCardHeader-title': {
            fontSize: { xs: '0.9rem', sm: fontSizes.title },
            fontWeight: 'medium'
          },
          '& .MuiCardHeader-subheader': {
            fontSize: { xs: '0.75rem', sm: fontSizes.subheader }
          }
        }}
      />
      <Divider />
      <CardContent sx={{ 
        pt: 1.5, 
        px: { xs: 1.5, sm: isSpaceLimited ? 2 : 2.5 },
        pb: { xs: 1.5, sm: isSpaceLimited ? 2 : 2.5 },
        '&:last-child': { pb: { xs: 1.5, sm: isSpaceLimited ? 2 : 2.5 } }
      }}>
        <Typography variant="body2" sx={{ 
          mb: 1,
          fontSize: { xs: '0.8rem', sm: fontSizes.body }
        }}>
          {action.description}
        </Typography>
        {action.progress && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: fontSizes.progress } }}>
              Progress: {action.progress.completed}/{action.progress.total} {action.progress.unit || 'steps'}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
});

// Use React.memo for optimization
const TabPanel = React.memo(({ children, value, index, ...props }) => (
  <div role="tabpanel" hidden={value !== index} {...props}>
    {value === index && children}
  </div>
));

const MetricsActionsView = ({ data, isSidebarMinimized }) => {
  const [tabIndex, setTabIndex] = useState(0);
  const [spaceLimited, setSpaceLimited] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = React.useRef(null);
  const theme = useTheme();
  
  // Media query breakpoints
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  const isLargeScreen = useMediaQuery(theme.breakpoints.down('lg'));
  
  // Dynamic breakpoint based on theme's breakpoints and device width
  const containerWidthBreakpoint = useMemo(() => {
    // Adapt breakpoint based on device size
    if (isMobile) return 600;
    if (isTablet) return 800;
    return 900;
  }, [isMobile, isTablet]);
  
  // Monitor the actual container width for more precise layouts
  useEffect(() => {
    if (!containerRef.current) return;
    
    const resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    
    resizeObserver.observe(containerRef.current);
    return () => {
      resizeObserver.disconnect();
    };
  }, []);
  
  // Recalculate layout when sidebar state changes or window size changes
  useEffect(() => {
    // Consider both screen size and actual container width
    const isTight = isLargeScreen && !isSidebarMinimized;
    const hasLimitedWidth = containerWidth > 0 && containerWidth < containerWidthBreakpoint;
    setSpaceLimited(isTight || hasLimitedWidth);
    
    // Create debounced resize handler for better performance
    const handleResize = debounce(() => {
      // Force a recalculation of layouts when window size changes
      setSpaceLimited(
        (window.innerWidth < theme.breakpoints.values.lg && !isSidebarMinimized) || 
        (containerWidth > 0 && containerWidth < containerWidthBreakpoint)
      );
    }, 100); // 100ms debounce
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [isLargeScreen, isSidebarMinimized, theme.breakpoints.values.lg, containerWidth, containerWidthBreakpoint]);
  
  // Consider available space when sidebar is expanded
  const isSpaceLimited = spaceLimited;

  if (!data) {
    return (
      <Paper 
        elevation={2} 
        sx={{ 
          p: { xs: 2, sm: 3 }, 
          textAlign: 'center', 
          borderRadius: 2,
          maxWidth: '100%',
          transition: 'all 0.3s ease'
        }}
        ref={containerRef} // Keep ref for consistent behavior
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: { xs: 3, sm: 4 } }}>
          <AssessmentIcon sx={{ 
            fontSize: { xs: 36, sm: 48 }, 
            color: 'text.secondary', 
            mb: 1,
            transition: 'all 0.2s ease'
          }} />
          <Typography 
            variant="h6" 
            color="text.secondary"
            sx={{
              fontSize: { xs: '1rem', sm: '1.25rem' },
              transition: 'all 0.2s ease'
            }}
          >
            No Metrics Data Available
          </Typography>
          <Typography 
            variant="body2" 
            color="text.secondary"
            sx={{
              mt: 1,
              maxWidth: '80%',
              fontSize: { xs: '0.8rem', sm: '0.9rem' },
              transition: 'all 0.2s ease'
            }}
          >
            Health metrics and action plan information will appear here when available.
          </Typography>
        </Box>
      </Paper>
    );
  }

  const handleTabChange = (event, newValue) => {
    setTabIndex(newValue);
  };

  // Extract from the data prop
  const metrics = data.metrics || {};
  const actions = data.actions || [];
  const recommendations = data.recommendations || [];

  // Organize metrics by category
  const vitalSigns = metrics.vital_signs || {};
  const labResults = metrics.lab_results || {};
  const bodyMetrics = metrics.body_metrics || {};
  const lifestyleMetrics = metrics.lifestyle_metrics || {};
  return (
    <Paper 
      ref={containerRef}
      elevation={2} 
      sx={{ 
        p: { xs: 1.5, sm: isSpaceLimited ? 2 : 2.5, md: isSpaceLimited ? 2.5 : 3 },
        borderRadius: 2,
        overflow: 'hidden', // Prevent horizontal overflow
        maxWidth: '100%', // Ensure the paper doesn't exceed the container width
        transition: 'padding 0.3s ease, box-shadow 0.3s ease', // Smoother transition for padding and shadow
      }}>
      <Typography variant="h6" gutterBottom sx={{ 
        fontWeight: 'bold', 
        color: 'primary.dark', 
        mb: 2,
        fontSize: { xs: '1rem', sm: isSpaceLimited ? '1.15rem' : '1.25rem' },
        px: { xs: 0.5, sm: 0 },
        transition: 'all 0.2s ease', // Smooth transition for font size changes
      }}>
        Health Metrics & Action Plan
      </Typography>

      <Tabs
        value={tabIndex}
        onChange={handleTabChange}
        variant="scrollable"
        scrollButtons="auto"
        textColor="primary"
        indicatorColor="primary"
        sx={{ 
          mb: 3, 
          borderBottom: 1, 
          borderColor: 'divider',
          '& .MuiTabs-flexContainer': {
            gap: { xs: 0.5, sm: isSpaceLimited ? 0.5 : 1 },
            transition: 'gap 0.2s ease'
          },
          '& .MuiTab-root': {
            minWidth: { xs: 'auto', sm: isSpaceLimited ? 80 : 90 },
            minHeight: { xs: '46px', sm: isSpaceLimited ? '50px' : '56px' },
            fontSize: { xs: '0.7rem', sm: isSpaceLimited ? '0.8rem' : '0.875rem' },
            padding: { xs: '6px 10px', sm: isSpaceLimited ? '10px 14px' : '12px 16px' },
            transition: 'all 0.2s ease', // Smooth transition for tab size changes
          },
          // Use transition for smooth indicator movement
          '& .MuiTabs-indicator': {
            transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1) 0ms, width 0.3s cubic-bezier(0.4, 0, 0.2, 1) 0ms'
          }
        }}
      >
        <Tab 
          label={isMobile ? "Metrics" : "Key Metrics"} 
          icon={<AssessmentIcon fontSize={isMobile ? "small" : "medium"} />} 
          iconPosition="start" 
        />
        <Tab 
          label={isMobile ? "Actions" : "Actions"} 
          icon={<DirectionsRunIcon fontSize={isMobile ? "small" : "medium"} />} 
          iconPosition="start" 
        />
        <Tab 
          label={isMobile ? "Recmd." : "Recommendations"} 
          icon={<SpaIcon fontSize={isMobile ? "small" : "medium"} />} 
          iconPosition="start" 
        />
      </Tabs>

      <TabPanel value={tabIndex} index={0}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="subtitle1" gutterBottom sx={{ 
            fontWeight: 'medium', 
            mb: 2,
            fontSize: { xs: '0.9rem', sm: '1rem' },
            transition: 'font-size 0.2s ease'
          }}>
            Vital Signs
          </Typography>
          <Grid 
            container 
            spacing={{ xs: 1, sm: 1.5, md: isSpaceLimited ? 1.5 : 2 }} 
            sx={{ 
              transition: 'all 0.3s ease',
              mx: { xs: -0.5, sm: 0 } // Negative margin compensation on very small screens
            }}
          >
            <Grid 
              item 
              xs={6} 
              sm={6} 
              md={isSpaceLimited ? 6 : 3} 
              lg={3}
              sx={{ transition: 'all 0.3s ease' }} // Smooth transition for grid resizing
            >
              <MetricCard 
                title="Blood Pressure" 
                value={vitalSigns.blood_pressure?.value || 'N/A'} 
                unit="mmHg"
                trend={vitalSigns.blood_pressure?.trend}
                icon={<FavoriteIcon color="error" />}
                color="error"
                isSpaceLimited={isSpaceLimited}
              />
            </Grid>
            <Grid item xs={6} sm={6} md={isSpaceLimited ? 6 : 3} lg={3}>
              <MetricCard 
                title="Heart Rate" 
                value={vitalSigns.heart_rate?.value || 'N/A'} 
                unit="bpm"
                trend={vitalSigns.heart_rate?.trend}
                icon={<FavoriteIcon color="error" />}
                color="error"
                isSpaceLimited={isSpaceLimited}
              />
            </Grid>
            <Grid item xs={6} sm={6} md={isSpaceLimited ? 6 : 3} lg={3}>
              <MetricCard 
                title="Respiratory Rate" 
                value={vitalSigns.respiratory_rate?.value || 'N/A'} 
                unit="bpm"
                trend={vitalSigns.respiratory_rate?.trend}
                icon={<SpaIcon color="info" />}
                color="info"
                isSpaceLimited={isSpaceLimited}
              />
            </Grid>
            <Grid item xs={6} sm={6} md={isSpaceLimited ? 6 : 3} lg={3}>
              <MetricCard 
                title="Temperature" 
                value={vitalSigns.temperature?.value || 'N/A'} 
                unit="°F"
                trend={vitalSigns.temperature?.trend}
                icon={<AssessmentIcon color="warning" />}
                color="warning"
                isSpaceLimited={isSpaceLimited}
              />
            </Grid>
          </Grid>
        </Box>

        <Box sx={{ mb: 4 }}>
          <Typography variant="subtitle1" gutterBottom sx={{ 
            fontWeight: 'medium', 
            mb: 2,
            fontSize: { xs: '0.9rem', sm: '1rem' },
            transition: 'font-size 0.2s ease'
          }}>
            Body Metrics
          </Typography>
          <Grid 
            container 
            spacing={{ xs: 1, sm: 1.5, md: isSpaceLimited ? 1.5 : 2 }}
            sx={{ 
              transition: 'all 0.3s ease',
              mx: { xs: -0.5, sm: 0 } // Negative margin compensation on very small screens
            }}
          >
            <Grid 
              item 
              xs={6} 
              sm={6} 
              md={isSpaceLimited ? 6 : 4} 
              lg={4}
              sx={{ transition: 'all 0.3s ease' }} // Smooth transition for grid resizing
            >
              <MetricCard 
                title="Weight" 
                value={bodyMetrics.weight?.value || 'N/A'} 
                unit="kg"
                trend={bodyMetrics.weight?.trend}
                icon={<MonitorWeightIcon color="success" />}
                color="success"
                isSpaceLimited={isSpaceLimited}
              />
            </Grid>
            <Grid item xs={6} sm={6} md={isSpaceLimited ? 6 : 4} lg={4}>
              <MetricCard 
                title="BMI" 
                value={bodyMetrics.bmi?.value || 'N/A'} 
                unit="kg/m²"
                trend={bodyMetrics.bmi?.trend}
                icon={<MonitorWeightIcon color="success" />}
                color="success"
                isSpaceLimited={isSpaceLimited}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={isSpaceLimited ? 12 : 4} lg={4}>
              <MetricCard 
                title="Body Fat" 
                value={bodyMetrics.body_fat?.value || 'N/A'} 
                unit="%"
                trend={bodyMetrics.body_fat?.trend}
                icon={<MonitorWeightIcon color="success" />}
                color="success"
                isSpaceLimited={isSpaceLimited}
              />
            </Grid>
          </Grid>
        </Box>

        <Box sx={{ mb: 4 }}>
          <Typography variant="subtitle1" gutterBottom sx={{ 
            fontWeight: 'medium', 
            mb: 2,
            fontSize: { xs: '0.9rem', sm: '1rem' },
            transition: 'font-size 0.2s ease'
          }}>
            Lab Results
          </Typography>
          <Grid 
            container 
            spacing={{ xs: 1, sm: 1.5, md: isSpaceLimited ? 1.5 : 2 }}
            sx={{ 
              transition: 'all 0.3s ease',
              mx: { xs: -0.5, sm: 0 } // Negative margin compensation on very small screens
            }}
          >
            <Grid item xs={12} sm={6} md={isSpaceLimited ? 6 : 4} lg={4}>
              <MetricCard 
                title="Glucose" 
                value={labResults.glucose?.value || 'N/A'} 
                unit="mg/dL"
                trend={labResults.glucose?.trend}
                icon={<OpacityIcon color="error" />}
                color="error"
                isSpaceLimited={isSpaceLimited}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={isSpaceLimited ? 6 : 4} lg={4}>
              <MetricCard 
                title="Cholesterol" 
                value={labResults.cholesterol?.value || 'N/A'} 
                unit="mg/dL"
                trend={labResults.cholesterol?.trend}
                icon={<OpacityIcon color="warning" />}
                color="warning"
                isSpaceLimited={isSpaceLimited}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={isSpaceLimited ? 12 : 4} lg={4}>
              <MetricCard 
                title="HbA1c" 
                value={labResults.hba1c?.value || 'N/A'} 
                unit="%"
                trend={labResults.hba1c?.trend}
                icon={<OpacityIcon color="primary" />}
                color="primary"
                isSpaceLimited={isSpaceLimited}
              />
            </Grid>
          </Grid>
        </Box>

        <Box>          <Typography variant="subtitle1" gutterBottom sx={{ 
            fontWeight: 'medium', 
            mb: 2,
            fontSize: { xs: '0.9rem', sm: '1rem' },
            transition: 'font-size 0.2s ease'
          }}>
            Lifestyle Metrics
          </Typography>
          <Grid 
            container 
            spacing={{ xs: 1, sm: 1.5, md: isSpaceLimited ? 1.5 : 2 }}
            sx={{ 
              transition: 'all 0.3s ease',
              mx: { xs: -0.5, sm: 0 } // Negative margin compensation on very small screens
            }}
          >
            <Grid item xs={6} sm={6} md={isSpaceLimited ? 6 : 3} lg={3}>
              <MetricCard 
                title="Exercise" 
                value={lifestyleMetrics.exercise?.value || 'N/A'} 
                unit="min/day"
                trend={lifestyleMetrics.exercise?.trend}
                icon={<FitnessCenterIcon color="success" />}
                color="success"
                isSpaceLimited={isSpaceLimited}
              />
            </Grid>
            <Grid item xs={6} sm={6} md={isSpaceLimited ? 6 : 3} lg={3}>
              <MetricCard 
                title="Sleep" 
                value={lifestyleMetrics.sleep?.value || 'N/A'} 
                unit="hrs/day"
                trend={lifestyleMetrics.sleep?.trend}
                icon={<SpaIcon color="info" />}
                color="info"
                isSpaceLimited={isSpaceLimited}
              />
            </Grid>
            <Grid item xs={6} sm={6} md={isSpaceLimited ? 6 : 3} lg={3}>
              <MetricCard 
                title="Calorie Intake" 
                value={lifestyleMetrics.calorie_intake?.value || 'N/A'} 
                unit="kcal/day"
                trend={lifestyleMetrics.calorie_intake?.trend}
                icon={<RestaurantIcon color="warning" />}
                color="warning"
                isSpaceLimited={isSpaceLimited}
              />
            </Grid>
            <Grid item xs={6} sm={6} md={isSpaceLimited ? 6 : 3} lg={3}>
              <MetricCard 
                title="Water Intake" 
                value={lifestyleMetrics.water_intake?.value || 'N/A'} 
                unit="L/day"
                trend={lifestyleMetrics.water_intake?.trend}
                icon={<OpacityIcon color="primary" />}
                color="primary"
                isSpaceLimited={isSpaceLimited}
              />
            </Grid>
          </Grid>
        </Box>

        {/* For future enhancement: Chart components can be added here */}
        {/* <Box sx={{ mt: 4 }}>
          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'medium', mb: 2 }}>
            Trend Analysis
          </Typography>
          <Card sx={{ p: 2 }}>
            <Line data={chartData} options={chartOptions} />
          </Card>
        </Box> */}
      </TabPanel>      <TabPanel value={tabIndex} index={1}>
        {actions.length > 0 ? (
          <Grid 
            container 
            spacing={{ xs: 1, sm: 1.5, md: isSpaceLimited ? 1.5 : 2 }}
            sx={{ 
              transition: 'all 0.3s ease',
              mx: { xs: -0.5, sm: 0 } // Negative margin compensation on very small screens
            }}
          >
            {actions.map((action, index) => (
              <Grid 
                item 
                key={index} 
                xs={12} 
                sm={isSpaceLimited ? 12 : 6}
                md={isSpaceLimited ? 12 : 4} 
                lg={4}
                sx={{ 
                  transition: 'all 0.3s ease', 
                  display: 'flex',
                  height: '100%' 
                }}
              >
                <Box sx={{ width: '100%', height: '100%' }}>
                  <ActionCard action={action} isSpaceLimited={isSpaceLimited} />
                </Box>
              </Grid>
            ))}
          </Grid>
        ) : (
          <Box sx={{ 
            py: { xs: 2, sm: 3 }, 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'padding 0.2s ease'
          }}>
            <DirectionsRunIcon sx={{ 
              fontSize: { xs: 36, sm: 48 }, 
              color: 'text.secondary', 
              mb: 1,
              opacity: 0.7,
              transition: 'all 0.2s ease'
            }} />
            <Typography 
              color="text.secondary" 
              textAlign="center" 
              sx={{ 
                fontSize: { xs: '0.9rem', sm: '1rem' },
                transition: 'font-size 0.2s ease'
              }}
            >
              No action items have been assigned.
            </Typography>
          </Box>
        )}
      </TabPanel>      <TabPanel value={tabIndex} index={2}>
        {recommendations.length > 0 ? (
          <List sx={{ 
            p: 0, // Remove default padding to maximize space
            width: '100%', // Ensure the list uses the full width 
            maxWidth: '100%', // Prevent overflow
            transition: 'all 0.3s ease', // Smooth transition when sidebar changes
            borderRadius: 1, // Slight rounding
            // Add subtle background for better separation on small screens
            bgcolor: { xs: 'background.paper', sm: 'transparent' },
            boxShadow: { xs: 1, sm: 0 },
          }}>
            {recommendations.map((recommendation, index) => (
              <React.Fragment key={index}>
                <ListItem 
                  alignItems="flex-start" 
                  sx={{ 
                    py: { xs: 1, sm: isSpaceLimited ? 1.25 : 1.5 },
                    px: { xs: 0.5, sm: isSpaceLimited ? 0.75 : 1 },
                    borderRadius: { xs: 0, sm: 1 },
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      bgcolor: 'rgba(0, 0, 0, 0.02)', // Subtle hover effect
                    }
                  }}
                >
                  <ListItemText
                    primary={recommendation.title}
                    secondary={
                      <>
                        <Typography 
                          component="span" 
                          variant="body2" 
                          color="text.primary" 
                          sx={{ 
                            fontSize: { 
                              xs: '0.75rem', 
                              sm: isSpaceLimited ? '0.825rem' : '0.875rem' 
                            },
                            display: 'block', // Force category to be on its own line when space limited
                            fontWeight: 'medium', // Make category slightly bolder
                            transition: 'font-size 0.2s ease',
                          }}
                        >
                          {recommendation.category}
                        </Typography>
                        <Typography 
                          variant="body2" 
                          color="text.secondary" 
                          sx={{ 
                            fontSize: { 
                              xs: '0.75rem', 
                              sm: isSpaceLimited ? '0.825rem' : '0.875rem' 
                            },
                            mt: 0.5, // Add space between category and description
                            lineHeight: 1.5, // Improve readability
                            transition: 'font-size 0.2s ease',
                          }}
                        >
                          {recommendation.description}
                        </Typography>
                      </>
                    }
                    primaryTypographyProps={{ 
                      fontWeight: 'medium',
                      fontSize: { 
                        xs: '0.85rem', 
                        sm: isSpaceLimited ? '0.925rem' : '1rem' 
                      },
                      color: 'primary.main',
                      transition: 'font-size 0.2s ease',
                    }}
                    sx={{ 
                      m: 0, // Remove default margins
                      overflowWrap: 'break-word', // Ensure long titles wrap properly
                      wordWrap: 'break-word',
                    }}
                  />
                </ListItem>
                {index < recommendations.length - 1 && <Divider component="li" sx={{ transition: 'opacity 0.2s ease' }} />}
              </React.Fragment>
            ))}
          </List>
        ) : (
          <Box sx={{ 
            py: { xs: 2, sm: 3 }, 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'padding 0.2s ease'
          }}>
            <SpaIcon sx={{ 
              fontSize: { xs: 36, sm: 48 }, 
              color: 'text.secondary', 
              mb: 1,
              opacity: 0.7,
              transition: 'all 0.2s ease'
            }} />
            <Typography 
              color="text.secondary" 
              textAlign="center" 
              sx={{ 
                fontSize: { xs: '0.9rem', sm: '1rem' },
                transition: 'font-size 0.2s ease'
              }}
            >
              No recommendations are currently available.
            </Typography>
          </Box>
        )}
      </TabPanel>
    </Paper>
  );
};

export default React.memo(MetricsActionsView); // Memoize the entire component for performance

// PropTypes for better documentation and type checking
MetricsActionsView.propTypes = {
  data: PropTypes.shape({
    metrics: PropTypes.shape({
      vital_signs: PropTypes.object,
      lab_results: PropTypes.object,
      body_metrics: PropTypes.object,
      lifestyle_metrics: PropTypes.object
    }),
    actions: PropTypes.array,
    recommendations: PropTypes.array
  }),
  isSidebarMinimized: PropTypes.bool
};

MetricCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  unit: PropTypes.string,
  trend: PropTypes.shape({
    direction: PropTypes.oneOf(['up', 'down']),
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    period: PropTypes.string
  }),
  icon: PropTypes.element.isRequired,
  color: PropTypes.string.isRequired,
  isSpaceLimited: PropTypes.bool
};

ActionCard.propTypes = {
  action: PropTypes.shape({
    title: PropTypes.string.isRequired,
    due_date: PropTypes.string,
    description: PropTypes.string,
    progress: PropTypes.shape({
      completed: PropTypes.number,
      total: PropTypes.number,
      unit: PropTypes.string
    })
  }).isRequired,
  isSpaceLimited: PropTypes.bool
};

TabPanel.propTypes = {
  children: PropTypes.node,
  value: PropTypes.number.isRequired,
  index: PropTypes.number.isRequired
};
