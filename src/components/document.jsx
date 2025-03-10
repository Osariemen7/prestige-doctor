import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import {
  Container,
  Paper,
  Typography,
  Grid,
  Divider,
  IconButton,
  TextField,
  Button,
  CircularProgress,
  Box,
  Snackbar,
  Alert,
  Tabs,
  Tab,
  AppBar,
  Chip,
  InputAdornment,
  FormControlLabel,
  Switch,
  Card,
  CardHeader,
  CardContent,
} from '@mui/material';
import FileCopyIcon from '@mui/icons-material/FileCopy';
import ScheduleIcon from '@mui/icons-material/Schedule';
import SaveIcon from '@mui/icons-material/Save';
import EditIcon from '@mui/icons-material/Edit';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import axios from 'axios';
import { getAccessToken } from './api';

// Updated theme with clean, modern aesthetics
const theme = createTheme({
  palette: {
    primary: {
      light: '#4f83cc',
      main: '#1976d2',
      dark: '#0d47a1',
      contrastText: '#fff',
    },
    secondary: {
      main: '#f4f6f8',
    },
    background: {
      default: '#f8f9fa',
      paper: '#ffffff',
    },
    text: {
      primary: '#333333',
      secondary: '#666666',
    }
  },
  typography: {
    fontSize: 14,
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 500,
    },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          marginBottom: 12,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
          borderBottom: '1px solid #e0e0e0',
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          minHeight: 48,
        },
        indicator: {
          height: 3,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          minHeight: 48,
          fontWeight: 500,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
        },
        containedPrimary: {
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          borderRadius: 8,
        },
      },
    },
  },
});

// Tab panel component
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`patient-tabpanel-${index}`}
      aria-labelledby={`patient-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: { xs: 1, sm: 2 } }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const PatientProfileDisplay = forwardRef(({ reviewid, thread, wsStatus, setIsDocumentationSaved, transcript }, ref) => {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editableData, setEditableData] = useState({});
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [parentalSetIsDocumentationSaved, setParentalSetIsDocumentationSaved] = useState(() => setIsDocumentationSaved);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [datas, setDatas] = useState({});
  const [isSuggestionMode, setIsSuggestionMode] = useState(false);
  const [suggestionData, setSuggestionData] = useState({});
  const [hasChanges, setHasChanges] = useState(false);
  const [tabValue, setTabValue] = useState(2); // Default to Health Goals tab

  // Destructure the API response with default empty objects
  const { profile_data = {}, goal_data = {}, review_data = {} } = isSuggestionMode && suggestionData.documentation ? suggestionData.documentation : data;

  // Function to fetch the profile data from the API
  const fetchSubscribers = async () => {
    try {
      const accessToken = await getAccessToken();
      const response = await axios.get(
        `https://health.prestigedelta.com/documentreview/${reviewid}/aggregate-data/`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      const fetchedData = response.data;
      setData(fetchedData);
      setEditableData(JSON.parse(JSON.stringify(fetchedData))); // Initialize editable data
      setDataLoaded(true);
      setDatas(fetchedData);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Call fetchSubscribers when wsStatus is Connected and reviewid exists
  useEffect(() => {
    if (wsStatus === 'Connected' && reviewid) {
      fetchSubscribers();
    }
  }, [wsStatus, reviewid]);

  // Tab change handler
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // For updating individual fields in editableData
  const handleFieldChange = (sectionKeys, value) => {
    setEditableData((prevData) => {
      let newData = { ...prevData };
      let currentLevel = newData;
      for (let i = 0; i < sectionKeys.length - 1; i++) {
        if (!currentLevel[sectionKeys[i]]) {
          currentLevel[sectionKeys[i]] = {};
        }
        currentLevel = currentLevel[sectionKeys[i]];
      }
      currentLevel[sectionKeys[sectionKeys.length - 1]] = value;
      return newData;
    });
    setHasChanges(true);
  };

  // Render editable field for any type of data
  const renderEditableField = (value, sectionKeys, isRequired = false) => {
    const currentValue = sectionKeys.reduce((acc, k) => acc?.[k], editableData) || value || '';
    const showError = isRequired && (!currentValue || currentValue.toString().trim() === '');

    // Determine input type
    let inputType = 'text';
    const lastKey = sectionKeys[sectionKeys.length - 1];

    if (lastKey === 'next_review') {
      inputType = 'datetime-local';
    } else if (['target_date', 'action_end_date', 'date_of_birth'].includes(lastKey)) {
      inputType = 'date';
    }

    // Handle suggestion data
    const suggestedValue = isSuggestionMode ?
      (sectionKeys.slice(0, -1).reduce((acc, k) => acc?.[k], suggestionData.documentation) || {})[`${lastKey}_suggestion`] :
      null;

    const applySuggestion = () => {
      handleFieldChange(sectionKeys, suggestedValue);
    };

    return (
      <TextField
        label={lastKey.replace(/_/g, ' ')}
        value={currentValue}
        onChange={(e) => handleFieldChange(sectionKeys, e.target.value)}
        fullWidth
        size="small"
        required={isRequired}
        error={showError}
        helperText={showError ? 'This field is required' : ''}
        type={inputType}
        variant="outlined"
        margin="dense"
        InputProps={suggestedValue ? {
          endAdornment: (
            <InputAdornment position="end">
              <Chip
                label={`Suggestion: ${suggestedValue}`}
                color="primary"
                size="small"
                variant="outlined"
                onClick={applySuggestion}
                style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer' }}
              />
              <Button
                onClick={applySuggestion}
                size="small"
                sx={{ ml: 1, minWidth: 'auto' }}
              >
                <CheckCircleIcon color="primary" />
              </Button>
            </InputAdornment>
          ),
        } : undefined}
      />
    );
  };

  // Render editable object with nested fields
  const renderEditableObject = (obj, sectionKeysPrefix) => {
    if (!obj) return null;

    return Object.entries(obj).map(([key, value]) => {
      const currentSectionKeys = [...sectionKeysPrefix, key];

      // Skip suggestion keys when rendering editable fields
      if (key.endsWith('_suggestion')) return null;

      // Determine if this field is required
      const isRequiredField =
        (sectionKeysPrefix.includes('goal_data') && key === 'goal_name') ||
        (sectionKeysPrefix.includes('profile_data') && key === 'name');

      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        return (
          <Box key={key} sx={{ mb: 2, px: 1 }}>
            <Typography variant="subtitle2" sx={{ textTransform: 'capitalize', fontWeight: 500, mb: 1 }}>
              {key.replace(/_/g, ' ')}:
            </Typography>
            <Paper variant="outlined" sx={{ p: 2, mb: 1 }}>
              {renderEditableObject(value, currentSectionKeys)}
            </Paper>
          </Box>
        );
      } else if (Array.isArray(value)) {
        return (
          <Box key={key} sx={{ mb: 2, px: 1 }}>
            <Typography variant="subtitle2" sx={{ textTransform: 'capitalize', fontWeight: 500, mb: 1 }}>
              {key.replace(/_/g, ' ')}:
            </Typography>
            {value.map((item, index) => (
              <Paper
                variant="outlined"
                key={index}
                sx={{ p: 2, mb: 1, borderLeft: '3px solid #1976d2' }}
              >
                <Typography variant="caption" sx={{ display: 'block', mb: 1 }}>
                  Item {index + 1}
                </Typography>
                {typeof item === 'object' && item !== null
                  ? renderEditableObject(item, [...currentSectionKeys, index.toString()])
                  : renderEditableField(item, [...currentSectionKeys, index.toString()], isRequiredField)
                }
              </Paper>
            ))}
          </Box>
        );
      } else {
        return renderEditableField(value, currentSectionKeys, isRequiredField);
      }
    });
  };

  // Extract text content from a section for copying
  const extractTextContent = (sectionName) => {
    let textContent = '';
    if (sectionName === 'profile') {
      textContent = getTextFromObject(profile_data?.profile_data);
    } else if (sectionName === 'goals') {
      textContent = getTextFromObject(goal_data?.goal_data);
    } else if (sectionName === 'review') {
      textContent = getTextFromObject(review_data?.doctor_note_data);
    }
    return textContent;
  };

  // Helper function to recursively get text from objects
  const getTextFromObject = (obj, indent = '') => {
    if (!obj) return '';
    let text = '';
    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === undefined || key.endsWith('_suggestion')) continue;
      const label = key.replace(/_/g, ' ');
      if (Array.isArray(value)) {
        if (value.length > 0) {
          text += `${indent}${label}:\n`;
          value.forEach(item => {
            if (typeof item === 'object') {
              text += getTextFromObject(item, indent + '  ');
            } else {
              text += `${indent}  - ${item}\n`;
            }
          });
        } else {
          text += `${indent}${label}: None\n`;
        }
      } else if (typeof value === 'object') {
        text += `${indent}${label}:\n`;
        text += getTextFromObject(value, indent + '  ');
      } else {
        text += `${indent}${label}: ${value}\n`;
      }
    }
    return text;
  };

  // Handle copying section to clipboard
  const handleCopyToClipboard = async (sectionName) => {
    const textToCopy = extractTextContent(sectionName);
    try {
      await navigator.clipboard.writeText(textToCopy);
      setSnackbarSeverity('success');
      setSnackbarMessage(`${sectionName.charAt(0).toUpperCase() + sectionName.slice(1)} section copied to clipboard!`);
      setSnackbarOpen(true);
    } catch (err) {
      console.error('Failed to copy text: ', err);
      setSnackbarSeverity('error');
      setSnackbarMessage(`Failed to copy ${sectionName} section.`);
      setSnackbarOpen(true);
    }
  };

  // Validate and submit data
  const handleSubmit = async () => {
    // Validate required fields
    const patientName = editableData?.profile_data?.profile_data?.demographics?.name || '';
    if (!patientName || patientName.trim() === '') {
      setSnackbarSeverity('error');
      setSnackbarMessage('Patient name is required.');
      setSnackbarOpen(true);
      return false;
    }

    const healthGoal = editableData?.goal_data?.goal_data?.goal_name || '';
    if (!healthGoal || healthGoal.trim() === '') {
      setSnackbarSeverity('error');
      setSnackbarMessage('Health goal is required.');
      setSnackbarOpen(true);
      return false;
    }

    if (editableData?.goal_data?.goal_data?.target_date) {
      const targetDate = new Date(editableData.goal_data.goal_data.target_date);
      const currentDate = new Date();
      if (targetDate < currentDate) {
        setSnackbarSeverity('error');
        setSnackbarMessage('Target date must be in the future.');
        setSnackbarOpen(true);
        return false;
      }
    }

    setIsSaving(true);
    try {
      // Add transcript and thread if available
      if (transcript) {
        editableData.transcript = transcript;
      }
      if (thread) {
        editableData.thread_id = thread;
      }

      const accessToken = await getAccessToken();
      await axios.post(
        `https://health.prestigedelta.com/documentreview/${reviewid}/document-assessment/`,
        editableData,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      // Update the local data with the new data
      setData(editableData);
      setSnackbarSeverity('success');
      setSnackbarMessage('Data updated successfully!');
      setSnackbarOpen(true);
      parentalSetIsDocumentationSaved(true);
      setHasChanges(false);
      return true;
    } catch (error) {
      console.error("Error submitting edits:", error);
      setSnackbarSeverity('error');
      setSnackbarMessage('Failed to update data.');
      setSnackbarOpen(true);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // Generate suggestions
  const getSuggestion = async () => {
    setIsSaving(true);
    try {
      // Prepare data payload
      let suggestionPayload = JSON.parse(JSON.stringify(editableData));

      if (transcript) {
        const currentTime = new Date().toISOString();
        suggestionPayload.transcript = [
          {
            time: currentTime,
            speaker: "patient",
            content: ""
          },
          {
            time: currentTime,
            speaker: "doctor",
            content: transcript
          }
        ];
      }

      if (thread) {
        suggestionPayload.thread_id = thread;
      }

      const accessToken = await getAccessToken();
      const response = await axios.post(
        `https://health.prestigedelta.com/documentreview/${reviewid}/generate-documentation/`,
        suggestionPayload,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      const result = response.data;
      setSuggestionData(result);
      setSnackbarSeverity('success');
      setSnackbarMessage('Suggestion generated successfully!');
      setSnackbarOpen(true);
      return true;
    } catch (error) {
      console.error("Error getting suggestion:", error);
      setSnackbarSeverity('error');
      setSnackbarMessage('Failed to generate suggestion.');
      setSnackbarOpen(true);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // Handle closing snackbar
  const handleSnackbarClose = (event, reason) => {
    if (reason === 'clickaway') return;
    setSnackbarOpen(false);
  };

  // Handle suggestion mode toggle
  const handleSuggestionSwitchChange = (event) => {
    setIsSuggestionMode(event.target.checked);
    if (event.target.checked && !suggestionData.documentation) {
      getSuggestion();
    }
  };

  // Expose functions to parent component
  useImperativeHandle(ref, () => ({
    handleSubmitFromParent: async () => {
      return await handleSubmit();
    },
    getSuggestion: () => {
      getSuggestion();
    }
  }));

  // Render Health Goals Tab Content
  const renderHealthGoalsTab = () => {
    const goalData = editableData?.goal_data?.goal_data || {};
    const suggestedGoalData = isSuggestionMode && suggestionData.documentation?.goal_data?.goal_data || {};

    const applySuggestedGoalName = () => {
      handleFieldChange(['goal_data', 'goal_data', 'goal_name'], suggestedGoalData.goal_name_suggestion);
    };

    const applySuggestedTargetDate = () => {
      handleFieldChange(['goal_data', 'goal_data', 'target_date'], suggestedGoalData.target_date_suggestion);
    };

    const applySuggestedComments = () => {
      handleFieldChange(['goal_data', 'goal_data', 'comments'], suggestedGoalData.comments_suggestion);
    };

    return (
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Headache Symptom Reduction Plan</Typography>
          <Box>
            <Button
              variant="outlined"
              startIcon={<FileCopyIcon />}
              size="small"
              sx={{ mr: 1 }}
              onClick={() => handleCopyToClipboard('goals')}
            >
              Copy Goals
            </Button>
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              size="small"
            >
              Edit Goals
            </Button>
          </Box>
        </Box>

        <Card sx={{ mb: 3, backgroundColor: '#fffdf5', border: '1px solid #f7e8c3' }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle1" color="primary" fontWeight={500}>
                Suggested Goal Name:
              </Typography>
              <Button
                variant="contained"
                color="primary"
                size="small"
                startIcon={<CheckCircleIcon />}
                sx={{ borderRadius: 20 }}
                onClick={applySuggestedGoalName}
              >
                Apply
              </Button>
            </Box>
            <Typography variant="body1" sx={{ mt: 1 }}>
              {suggestedGoalData.goal_name_suggestion || goalData.goal_name || "Headache Symptom Reduction Plan"}
            </Typography>
          </CardContent>
        </Card>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1" color="text.secondary">Target Date</Typography>
              <TextField
                fullWidth
                type="date"
                size="small"
                value={goalData.target_date || "2024-08-10"}
                onChange={(e) => handleFieldChange(['goal_data', 'goal_data', 'target_date'], e.target.value)}
              />
              {suggestedGoalData.target_date_suggestion && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                  <Typography variant="caption" color="primary">
                    Suggestion: {suggestedGoalData.target_date_suggestion}
                  </Typography>
                  <Button
                    variant="text"
                    color="primary"
                    size="small"
                    onClick={applySuggestedTargetDate}
                  >
                    Apply
                  </Button>
                </Box>
              )}
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1" color="text.secondary">Comments</Typography>
              <TextField
                fullWidth
                multiline
                rows={2}
                size="small"
                value={goalData.comments || "Initial goal to reduce headache frequency and intensity."}
                onChange={(e) => handleFieldChange(['goal_data', 'goal_data', 'comments'], e.target.value)}
              />
              {suggestedGoalData.comments_suggestion && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                  <Typography variant="caption" color="primary">
                    Suggestion: {suggestedGoalData.comments_suggestion}
                  </Typography>
                  <Button
                    variant="text"
                    color="primary"
                    size="small"
                    onClick={applySuggestedComments}
                  >
                    Apply
                  </Button>
                </Box>
              )}
            </Box>
          </Grid>
        </Grid>

        <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>Metrics</Typography>

        <Card sx={{ mb: 3, backgroundColor: '#fffdf5', border: '1px solid #f7e8c3' }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle1" color="primary" fontWeight={500}>
                Suggested Metrics:
              </Typography>
              <Button
                variant="contained"
                color="primary"
                size="small"
                startIcon={<CheckCircleIcon />}
                sx={{ borderRadius: 20 }}
                onClick={() => {
                  if (suggestionData.documentation?.goal_data?.goal_data?.metrics_suggestion) {
                    handleFieldChange(['goal_data', 'goal_data', 'metrics'], suggestionData.documentation.goal_data.goal_data.metrics_suggestion);
                  }
                }}
              >
                Apply All
              </Button>
            </Box>
          </CardContent>
        </Card>

        {renderEditableObject(
          goalData.metrics,
          ['goal_data', 'goal_data', 'metrics']
        )}
      </Box>
    );
  };

  // Loading state
  if (loading) {
    return (
      <ThemeProvider theme={theme}>
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="100vh"
          bgcolor="background.default"
        >
          <Box textAlign="center">
            <Typography variant="h6" color="primary" gutterBottom>
              Loading patient information...
            </Typography>
            <CircularProgress color="primary" />
          </Box>
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <Box bgcolor="background.default" minHeight="100vh">
        {/* Top Save Button Bar */}
        <Box sx={{ p: 1, display: 'flex', justifyContent: 'flex-end', borderBottom: '1px solid #e0e0e0', backgroundColor: 'white' }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<SaveIcon />}
            onClick={handleSubmit}
            disabled={isSaving || !hasChanges}
            size="medium"
            sx={{ borderRadius: 2 }}
          >
            Save All Documentation
          </Button>
        </Box>

        {/* Navigation Tabs */}
        <AppBar position="static" color="default" sx={{ backgroundColor: '#f0f4f8' }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            variant="fullWidth"
            aria-label="patient documentation tabs"
            sx={{ minHeight: '48px' }}
          >
            <Tab label="Transcript" id="patient-tab-0" aria-controls="patient-tabpanel-0" />
            <Tab label="Patient Profile" id="patient-tab-1" aria-controls="patient-tabpanel-1" />
            <Tab label="Health Goals" id="patient-tab-2" aria-controls="patient-tabpanel-2" />
            <Tab label="Medical Review" id="patient-tab-3" aria-controls="patient-tabpanel-3" />
          </Tabs>
        </AppBar>

        {/* Tab Panels */}
        <Container maxWidth="lg" sx={{ py: 2 }}>
          {/* AI Suggestion Toggle */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={isSuggestionMode}
                  onChange={handleSuggestionSwitchChange}
                  name="aiSuggestionSwitch"
                  color="primary"
                />
              }
              label="AI Suggestions"
            />
          </Box>

          {/* Transcript Tab */}
          <TabPanel value={tabValue} index={0}>
            <Typography variant="h6" gutterBottom>Transcript Content</Typography>
            <Paper sx={{ p: 3 }}>
              <Typography variant="body1">{transcript || "No transcript available"}</Typography>
            </Paper>
          </TabPanel>

          {/* Patient Profile Tab */}
          <TabPanel value={tabValue} index={1}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">Patient Profile</Typography>
              <IconButton
                onClick={() => handleCopyToClipboard('profile')}
                size="small"
                sx={{ color: 'text.secondary' }}
              >
                <FileCopyIcon fontSize="small" />
              </IconButton>
            </Box>
            <Grid container spacing={3}>
              {[
                { title: "Demographics", field: "demographics" },
                { title: "Genetic Proxies", field: "genetic_proxies" },
                { title: "Lifestyle & Biometrics", field: "lifestyle" },
                { title: "Environment", field: "environment" },
                { title: "Clinical Status", field: "clinical_status" },
              ].map((section) => (
                <Grid item xs={12} md={6} key={section.field}>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                      }
                    }}
                  >
                    <Typography
                      variant="subtitle1"
                      color="primary"
                      gutterBottom
                      sx={{ fontWeight: 500 }}
                    >
                      {section.title}
                    </Typography>
                    {renderEditableObject(
                      editableData?.profile_data?.profile_data?.[section.field],
                      ['profile_data', 'profile_data', section.field]
                    )}
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </TabPanel>

          {/* Health Goals Tab */}
          <TabPanel value={tabValue} index={2}>
            {renderHealthGoalsTab()}
          </TabPanel>

          {/* Medical Review Tab */}
          <TabPanel value={tabValue} index={3}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">Medical Review</Typography>
              <IconButton
                onClick={() => handleCopyToClipboard('review')}
                size="small"
                sx={{ color: 'text.secondary' }}
              >
                <FileCopyIcon fontSize="small" />
              </IconButton>
            </Box>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    mb: 2,
                    borderRadius: 2,
                    borderLeft: '3px solid #4caf50'
                  }}
                >
                  <Typography
                    variant="subtitle1"
                    color="primary"
                    gutterBottom
                    sx={{ fontWeight: 500 }}
                  >
                    Subjective
                  </Typography>
                  {renderEditableObject(
                    editableData?.review_data?.doctor_note_data?.subjective,
                    ['review_data', 'doctor_note_data', 'subjective']
                  )}
                </Paper>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    borderLeft: '3px solid #ff9800'
                  }}
                >
                  <Typography
                    variant="subtitle1"
                    color="primary"
                    gutterBottom
                    sx={{ fontWeight: 500 }}
                  >
                    Objective
                  </Typography>
                  {renderEditableObject(
                    editableData?.review_data?.doctor_note_data?.objective,
                    ['review_data', 'doctor_note_data', 'objective']
                  )}
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    mb: 2,
                    borderRadius: 2,
                    borderLeft: '3px solid #2196f3'
                  }}
                >
                  <Typography
                    variant="subtitle1"
                    color="primary"
                    gutterBottom
                    sx={{ fontWeight: 500 }}
                  >
                    Assessment
                  </Typography>
                  {renderEditableObject(
                    editableData?.review_data?.doctor_note_data?.assessment,
                    ['review_data', 'doctor_note_data', 'assessment']
                  )}
                </Paper>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    borderLeft: '3px solid #9c27b0'
                  }}
                >
                  <Typography
                    variant="subtitle1"
                    color="primary"
                    gutterBottom
                    sx={{ fontWeight: 500 }}
                  >
                    Plan
                  </Typography>
                  {renderEditableObject(
                    editableData?.review_data?.doctor_note_data?.plan,
                    ['review_data', 'doctor_note_data', 'plan']
                  )}
                </Paper>
              </Grid>
            </Grid>

            <Box mt={3} p={2} sx={{ backgroundColor: '#f5f9ff', borderRadius: 2 }}>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <ScheduleIcon color="primary" />
                <Typography variant="subtitle1" color="primary" sx={{ fontWeight: 500 }}>
                  Next Review
                </Typography>
              </Box>
              {renderEditableField(
                editableData?.review_data?.doctor_note_data?.next_review || '',
                ['review_data', 'doctor_note_data', 'next_review']
              )}
            </Box>

            <Divider sx={{ my: 3 }} />

            <Typography
              variant="h6"
              color="primary"
              gutterBottom
              sx={{ fontWeight: 500 }}
            >
              Prescriptions & Investigations
            </Typography>

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Paper
                  variant="outlined"
                  sx={{ p: 2, borderRadius: 2 }}
                >
                  <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 500 }}>
                    Prescriptions
                  </Typography>
                  {renderEditableObject(
                    editableData?.review_data?.doctor_note_data?.prescription,
                    ['review_data', 'doctor_note_data', 'prescription']
                  )}
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper
                  variant="outlined"
                  sx={{ p: 2, borderRadius: 2 }}
                >
                  <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 500 }}>
                    Investigations
                  </Typography>
                  {renderEditableObject(
                    editableData?.review_data?.doctor_note_data?.investigation,
                    ['review_data', 'doctor_note_data', 'investigation']
                  )}
                </Paper>
              </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />

            <Typography
              variant="h6"
              color="primary"
              gutterBottom
              sx={{ fontWeight: 500 }}
            >
              Summary
            </Typography>

            <Paper
              variant="outlined"
              sx={{
                p: 2,
                borderRadius: 2,
                backgroundColor: '#f8f9fa'
              }}
            >
              {renderEditableObject(
                editableData?.review_data?.doctor_note_data?.summary,
                ['review_data', 'doctor_note_data', 'summary']
              )}
            </Paper>
          </TabPanel>
        </Container>

        {/* Notification snackbar */}
        <Snackbar
          open={snackbarOpen}
          autoHideDuration={6000}
          onClose={handleSnackbarClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert
            onClose={handleSnackbarClose}
            severity={snackbarSeverity}
            sx={{ width: '100%' }}
          >
            {snackbarMessage}
          </Alert>
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
});

export default PatientProfileDisplay;