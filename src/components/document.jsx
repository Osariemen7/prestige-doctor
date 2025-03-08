import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import {
  Container,
  Paper,
  Typography,
  Grid,
  Divider,
  Chip,
  List,
  ListItem,
  ListItemText,
  IconButton,
  TextField,
  Button,
  CircularProgress,
  Box,
  Snackbar,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import axios from 'axios';
import { getAccessToken } from './api';
import { Edit as EditIcon, Schedule as ScheduleIcon, FileCopy as FileCopyIcon } from '@mui/icons-material'; // Import FileCopy Icon

// Custom theme with your settings
const theme = createTheme({
  palette: {
    primary: {
      light: '#4f83cc',
      main: '#1976d2',
      dark: '#115293',
      contrastText: '#fff',
    },
    background: {
      default: '#f5f8fa',
      paper: '#ffffff',
    },
  },
  typography: {
    fontSize: 12,
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          margin: 2,
        },
      },
    },
  },
});

const PatientProfileDisplay = forwardRef(({ reviewid, thread, wsStatus, setIsDocumentationSaved, transcript }, ref) => {
  // "data" will hold the entire API response
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingSection, setEditingSection] = useState(null); // Track which section is being edited
  // We’ll store the editable copy of the entire data object here.
  const [editableData, setEditableData] = useState({});
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [parentalSetIsDocumentationSaved, setParentalSetIsDocumentationSaved] = useState(() => setIsDocumentationSaved);

  // Destructure the API response.
  // If data is empty, default to empty objects.
  const { profile_data = {}, goal_data = {}, review_data = {} } = data;
  console.log(data);

  // Function to fetch the profile data from the API.
  const fetchSubscribers = async () => {
    try {
      const accessToken = await getAccessToken();
      const response = await axios.get(
        `https://health.prestigedelta.com/documentreview/${reviewid}/aggregate-data/`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      // Assuming response.data is an array and we want the first item.
      const fetchedData = response.data;
      setData(fetchedData);
      console.log("Fetched Data:", fetchedData); // Debugging: Log fetched data
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Call fetchSubscribers when wsStatus is Connected and reviewid exists.
  useEffect(() => {
    if (wsStatus === 'Connected' && reviewid) {
      fetchSubscribers();
    }
  }, [wsStatus, reviewid]);

  // When entering edit mode, copy entire data object into editableData.
  const handleEditClick = (section) => {
    setEditableData(JSON.parse(JSON.stringify(data))); // Deep copy entire data
    setIsEditing(true);
    setEditingSection(section); // Set the editing section
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingSection(null);
    setEditableData({}); // Clear editable data on cancel
  };

  // For updating individual fields in editableData.
  const handleFieldChange = (sectionKeys, value) => {
    setEditableData((prevData) => {
      let newData = { ...prevData };
      let currentLevel = newData;
      for (let i = 0; i < sectionKeys.length - 1; i++) {
        currentLevel = currentLevel[sectionKeys[i]];
      }
      currentLevel[sectionKeys[sectionKeys.length - 1]] = value;
      return newData;
    });
  };

  // Modified renderEditableObject to add required validation for specific fields.
  const renderEditableObject = (obj, sectionKeysPrefix) => {
    if (!obj) return null;
    return Object.entries(obj).map(([key, value]) => {
      const currentSectionKeys = [...sectionKeysPrefix, key];
      // Compute the current value from editableData.
      const currentValue =
        editableData && currentSectionKeys.reduce((acc, k) => acc?.[k], editableData) || value || '';
      // Determine if this field is required.
      const isRequiredField =
        (editingSection === 'goals' && key === 'goal_name') ||
        (editingSection === 'profile' && key === 'name');
      const showError = isRequiredField && (!currentValue || currentValue.toString().trim() === '');
      let inputType = 'text';
      if (key === 'next_review' && editingSection === 'review') {
        inputType = 'datetime-local'; // Set input type to datetime-local for next_review
      } else if ((key === 'target_date' || key === 'action_end_date') && editingSection === 'goals') {
        inputType = 'date'; // Set input type to date for target_date and action_end_date in goals section
      } else if (key === 'date_of_birth' && editingSection === 'profile') {
        inputType = 'date'; // Set input type to date for date_of_birth in profile section
      }

      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        return (
          <div key={key} style={{ marginBottom: 16, paddingLeft: 16 }}>
            <Typography variant="subtitle2" style={{ textTransform: 'capitalize' }}>
              {key.replace(/_/g, ' ')}:
            </Typography>
            {renderEditableObject(value, currentSectionKeys)}
          </div>
        );
      } else if (Array.isArray(value)) {
        return (
          <div key={key} style={{ marginBottom: 16, paddingLeft: 16 }}>
            <Typography variant="subtitle2" style={{ textTransform: 'capitalize' }}>
              {key.replace(/_/g, ' ')} (Array):
            </Typography>
            {value.map((item, index) => (
              <div
                key={index}
                style={{
                  marginBottom: 8,
                  paddingLeft: 16,
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  padding: '8px',
                }}
              >
                <Typography variant="subtitle2" style={{ textTransform: 'capitalize' }}>
                  Item {index + 1}:
                </Typography>
                {typeof item === 'object'
                  ? renderEditableObject(item, [...currentSectionKeys, index.toString()])
                  : (
                    <TextField
                      label={`${key}[${index}]`}
                      value={currentValue}
                      onChange={(e) => handleFieldChange([...currentSectionKeys, index.toString()], e.target.value)}
                      fullWidth
                      multiline
                      required={isRequiredField}
                      error={showError}
                      helperText={showError ? 'This field is required' : ''}
                    />
                  )}
              </div>
            ))}
          </div>
        );
      } else {
        return (
          <div key={key} style={{ marginBottom: 16 }}>
            <TextField
              label={key.replace(/_/g, ' ')}
              value={currentValue}
              onChange={(e) => handleFieldChange(currentSectionKeys, e.target.value)}
              fullWidth
              required={isRequiredField}
              error={showError}
              helperText={showError ? 'This field is required' : ''}
              type={inputType} // Set input type here
            />
          </div>
        );
      }
    });
  };

  // Helper to render a read-only object.
  const renderObject = (obj) => {
    if (!obj) return null;
    return Object.entries(obj).map(([key, value]) => {
      if (value === null || value === undefined) return null;
      return (
        <div key={key} style={{ marginBottom: 8 }}>
          <Typography variant="subtitle2" style={{ textTransform: 'capitalize' }}>
            {key.replace(/_/g, ' ')}:
          </Typography>
          {Array.isArray(value) ? (
            value.length > 0 ? (
              <List dense>
                {value.map((item, i) => (
                  <ListItem key={i}>
                    <ListItemText
                      primary={typeof item === 'object' ? JSON.stringify(item, null, 2) : item}
                      secondary={typeof item === 'object' ? "(Object)" : null}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2">None</Typography>
            )
          ) : typeof value === 'object' ? (
            renderObject(value)
          ) : (
            <Typography variant="body2">{value.toString()}</Typography>
          )}
        </div>
      );
    });
  };

  // Function to extract text content from a section for copying
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

  // Helper function to recursively get text from objects, handling arrays and nested objects
  const getTextFromObject = (obj, indent = '') => {
    if (!obj) return '';
    let text = '';
    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === undefined) continue;
      const label = key.replace(/_/g, ' ');
      if (Array.isArray(value)) {
        if (value.length > 0) {
          text += `${indent}${label}:\n`;
          value.forEach(item => {
            if (typeof item === 'object') {
              text += getTextFromObject(item, indent + '  '); // Indent array of objects
            } else {
              text += `${indent}  - ${item}\n`; // Indent array items
            }
          });
        } else {
          text += `${indent}${label}: None\n`;
        }
      } else if (typeof value === 'object') {
        text += `${indent}${label}:\n`;
        text += getTextFromObject(value, indent + '  '); // Indent nested objects
      } else {
        text += `${indent}${label}: ${value}\n`;
      }
    }
    return text;
  };


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


  // On save, send all sections (even unchanged ones) in the payload.
  const handleSubmit = async () => {
    // Validate required fields based on the section being edited.
    if (editingSection === 'profile') {
      const patientName =
        editableData?.profile_data?.profile_data?.demographics?.name ||
        '';
      if (!patientName || patientName.trim() === '') {
        setSnackbarSeverity('error');
        setSnackbarMessage('Patient name is required.');
        setSnackbarOpen(true);
        return false; // Indicate failure
      }
    }
    if (editingSection === 'goals') {
      const healthGoal =
        editableData?.goal_data?.goal_data?.goal_name || '';
      if (transcript) {
        editableData.transcript = transcript
      }
      if (thread) {
        editableData.thread_id = thread
      }
      if (!healthGoal || healthGoal.trim() === '') {
        setSnackbarSeverity('error');
        setSnackbarMessage('Health goal is required.');
        setSnackbarOpen(true);
        return false; // Indicate failure
      }

      if (editableData?.goal_data?.goal_data?.target_date) {
        const targetDate = new Date(editableData.goal_data.goal_data.target_date);
        const currentDate = new Date();
        if (targetDate < currentDate) {
          setSnackbarSeverity('error');
          setSnackbarMessage('Target date must be in the future.');
          setSnackbarOpen(true);
          return false; // Indicate failure
        }
      }
    }

    setIsSaving(true);
    try {
      // Send the entire editableData back to the API
      const payload = editableData;

      // --- ADD THESE LOGS FOR DEBUGGING ---
      console.log("Payload being sent to API:", JSON.stringify(payload, null, 2)); // Log the payload as formatted JSON
      console.log("Current editableData state:", JSON.stringify(editableData, null, 2)); // Log the editableData state

      const accessToken = await getAccessToken();
      const response = await axios.post(
        `https://health.prestigedelta.com/documentreview/${reviewid}/generate-documentation/`,
        payload,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      // Update the local data with the new data
      setData(editableData);
      setIsEditing(false);
      setEditingSection(null);
      setSnackbarSeverity('success');
      setSnackbarMessage('Data updated successfully!');
      setSnackbarOpen(true);
      parentalSetIsDocumentationSaved(true)
      return true; // Indicate success
    } catch (error) {
      console.error("Error submitting edits:", error);
      setSnackbarSeverity('error');
      setSnackbarMessage('Failed to update data.');
      setSnackbarOpen(true);
      return false; // Indicate failure
    } finally {
      setIsSaving(false);
    }
  };

  const handleSnackbarClose = (event, reason) => {
    if (reason === 'clickaway') return;
    setSnackbarOpen(false);
  };

  useImperativeHandle(ref, () => ({
    handleSubmitFromParent: async () => {
      return await handleSubmit();
    }
  }));


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
              Loading...
            </Typography>
            <CircularProgress color="primary" />
          </Box>
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <Box bgcolor="background.default" minHeight="100vh" py={1}>
        <Container maxWidth="lg" >
          <Grid container spacing={3} >
            {/* Patient Profile Section (without Temporal Context) */}
            <Grid item xs={12} >
              <Accordion defaultExpanded >
                <AccordionSummary expandIcon={<ExpandMoreIcon />} >
                  <Box
                    display="flex"
                    alignItems="center"
                    width="100%"
                    justifyContent="space-between"
                    backgroundColor="#1976d2"

                  >
                    <Typography variant="h5" color="white">
                      Patient Profile
                    </Typography>
                    <Box display="flex"> {/* Container for icons */}
                      <IconButton
                        onClick={() => handleEditClick('profile')}
                        sx={{ color: 'white', marginRight: 1 }}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        onClick={() => handleCopyToClipboard('profile')}
                        sx={{ color: 'white' }}
                      >
                        <FileCopyIcon />
                      </IconButton>
                    </Box>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Paper elevation={3} sx={{ overflow: 'hidden', width: '100%' }}>
                    <Box p={1}>
                      <Grid container spacing={3}>
                        {[
                          { title: "Demographics", field: "demographics" },
                          { title: "Genetic Proxies", field: "genetic_proxies" },
                          { title: "Lifestyle & Biometrics", field: "lifestyle" },
                          { title: "Environment", field: "environment" },
                          { title: "Clinical Status", field: "clinical_status" },
                        ].map((section) => (
                          <Grid item xs={12} md={6} key={section.field}>
                            <Paper variant="outlined" sx={{ p: 2 }}>
                              <Typography variant="h6" color="primary" gutterBottom>
                                {section.title}
                              </Typography>
                              {isEditing && editingSection === 'profile'
                                ? renderEditableObject(
                                  editableData?.profile_data?.profile_data?.[section.field],
                                  ['profile_data', 'profile_data', section.field]
                                )
                                : renderObject(profile_data?.profile_data?.[section.field])}
                            </Paper>
                          </Grid>
                        ))}
                      </Grid>
                      {isEditing && editingSection === 'profile' && (
                        <Box mt={3}>
                          <Button
                            variant="contained"
                            color="primary"
                            onClick={handleSubmit}
                            disabled={isSaving}
                            sx={{ mr: 2 }}
                          >
                            {isSaving ? 'Saving...' : 'Save Changes'}
                          </Button>
                          <Button variant="outlined" onClick={handleCancelEdit}>
                            Cancel
                          </Button>
                        </Box>
                      )}
                    </Box>
                  </Paper>
                </AccordionDetails>
              </Accordion>
            </Grid>

            {/* Health Goals Section */}
            <Grid item xs={12}>
              <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />} m={0}>
                  <Box
                    display="flex"
                    alignItems="center"
                    width="100%"
                    justifyContent="space-between"
                    backgroundColor="#1976d2"
                  >
                    <Typography variant="h5" color="white">
                      Health Goals
                    </Typography>
                    <Box display="flex"> {/* Container for icons */}
                      <IconButton
                        onClick={() => handleEditClick('goals')}
                        sx={{ color: 'white', marginRight: 1 }}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        onClick={() => handleCopyToClipboard('goals')}
                        sx={{ color: 'white' }}
                      >
                        <FileCopyIcon />
                      </IconButton>
                    </Box>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Paper elevation={3} sx={{ overflow: 'hidden', width: '100%' }}>
                    <Box p={1}>
                      {isEditing && editingSection === 'goals'
                        ? renderEditableObject(editableData?.goal_data?.goal_data, ['goal_data', 'goal_data'])
                        : goal_data?.goal_data?.goal_name ? (
                          renderObject(goal_data.goal_data)
                        ) : (
                          <Typography color="text.secondary" fontStyle="italic">
                            No current health goals established
                          </Typography>
                        )}
                      {isEditing && editingSection === 'goals' && (
                        <Box mt={3}>
                          <Button
                            variant="contained"
                            color="primary"
                            onClick={handleSubmit}
                            disabled={isSaving}
                            sx={{ mr: 2 }}
                          >
                            {isSaving ? 'Saving...' : 'Save Changes'}
                          </Button>
                          <Button variant="outlined" onClick={handleCancelEdit}>
                            Cancel
                          </Button>
                        </Box>
                      )}
                    </Box>
                  </Paper>
                </AccordionDetails>
              </Accordion>
            </Grid>

            {/* Medical Review Section */}
            <Grid item xs={12}>
              <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box
                    display="flex"
                    alignItems="center"
                    width="100%"
                    justifyContent="space-between"
                    backgroundColor="#1976d2"
                  >
                    <Typography variant="h5" color="white">
                      Medical Review
                    </Typography>
                    <Box display="flex"> {/* Container for icons */}
                      <IconButton
                        onClick={() => handleEditClick('review')}
                        sx={{ color: 'white', marginRight: 1 }}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        onClick={() => handleCopyToClipboard('review')}
                        sx={{ color: 'white' }}
                      >
                        <FileCopyIcon />
                      </IconButton>
                    </Box>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Paper elevation={3} sx={{ overflow: 'hidden', width: '100%' }}>
                    <Box p={1}>
                      <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                          <Paper variant="outlined" sx={{ p: 1, mb: 2 }}>
                            <Typography variant="h6" color="primary" gutterBottom>
                              Subjective
                            </Typography>
                            {isEditing && editingSection === 'review'
                              ? renderEditableObject(
                                editableData?.review_data?.doctor_note_data?.subjective,
                                ['review_data', 'doctor_note_data', 'subjective']
                              )
                              : renderObject(review_data?.doctor_note_data?.subjective)}
                          </Paper>
                          <Paper variant="outlined" sx={{ p: 2 }}>
                            <Typography variant="h6" color="primary" gutterBottom>
                              Objective
                            </Typography>
                            {isEditing && editingSection === 'review'
                              ? renderEditableObject(
                                editableData?.review_data?.doctor_note_data?.objective,
                                ['review_data', 'doctor_note_data', 'objective']
                              )
                              : renderObject(review_data?.doctor_note_data?.objective)}
                          </Paper>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                            <Typography variant="h6" color="primary" gutterBottom>
                              Assessment
                            </Typography>
                            {isEditing && editingSection === 'review'
                              ? renderEditableObject(
                                editableData?.review_data?.doctor_note_data?.assessment,
                                ['review_data', 'doctor_note_data', 'assessment']
                              )
                              : renderObject(review_data?.doctor_note_data?.assessment)}
                          </Paper>
                          <Paper variant="outlined" sx={{ p: 2 }}>
                            <Typography variant="h6" color="primary" gutterBottom>
                              Plan
                            </Typography>
                            {isEditing && editingSection === 'review'
                              ? renderEditableObject(
                                editableData?.review_data?.doctor_note_data?.plan,
                                ['review_data', 'doctor_note_data', 'plan']
                              )
                              : renderObject(review_data?.doctor_note_data?.plan)}
                          </Paper>
                        </Grid>
                      </Grid>
                      <Box mt={3}>
                        <Box display="flex" alignItems="center" gap={1}>
                          <ScheduleIcon color="primary" />
                          <Typography variant="h6" color="primary">
                            Next Review
                          </Typography>
                        </Box>
                        <Typography variant="body1" mt={1}>
                          {isEditing && editingSection === 'review' ? (
                            <TextField
                              type="datetime-local" // set type to datetime-local
                              value={editableData?.review_data?.doctor_note_data?.next_review || ''}
                              onChange={(e) =>
                                handleFieldChange(['review_data', 'doctor_note_data', 'next_review'], e.target.value)
                              }
                              fullWidth
                            />
                          ) : (
                            review_data?.doctor_note_data?.next_review || 'Not Scheduled'
                          )}
                        </Typography>
                      </Box>
                      <Divider sx={{ my: 3 }} />
                      <Typography variant="h6" color="primary" gutterBottom>
                        Prescriptions & Investigations
                      </Typography>
                      <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                          <Typography variant="subtitle1" gutterBottom>
                            Prescriptions
                          </Typography>
                          <Box>
                            {isEditing && editingSection === 'review' ? (
                              renderEditableObject(
                                editableData?.review_data?.doctor_note_data?.prescription,
                                ['review_data', 'doctor_note_data', 'prescription']
                              )
                            ) : review_data?.doctor_note_data?.prescription?.length > 0 ? (
                              review_data.doctor_note_data.prescription.map((pres, i) => (
                                <Chip
                                  key={i}
                                  label={`${pres.medication_name} - ${pres.dosage}`}
                                  color="primary"
                                  variant="outlined"
                                />
                              ))
                            ) : (
                              <Typography color="text.secondary">None</Typography>
                            )}
                          </Box>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Typography variant="subtitle1" gutterBottom>
                            Investigations
                          </Typography>
                          <Box>
                            {isEditing && editingSection === 'review' ? (
                              renderEditableObject(
                                editableData?.review_data?.doctor_note_data?.investigation,
                                ['review_data', 'doctor_note_data', 'investigation']
                              )
                            ) : review_data?.doctor_note_data?.investigation?.length > 0 ? (
                              review_data.doctor_note_data.investigation.map((inv, i) => (
                                <Chip
                                  key={i}
                                  label={`${inv.test_type}: ${inv.reason}`}
                                  color="primary"
                                  variant="outlined"
                                />
                              ))
                            ) : (
                              <Typography color="text.secondary">None</Typography>
                            )}
                          </Box>
                        </Grid>
                      </Grid>
                      <Divider sx={{ my: 3 }} />
                      <Typography variant="h6" color="primary" gutterBottom>
                        Summary
                      </Typography>
                      <Paper variant="outlined" sx={{ p: 2 }}>
                        {isEditing && editingSection === 'review'
                          ? renderEditableObject(
                            editableData?.review_data?.doctor_note_data?.summary,
                            ['review_data', 'doctor_note_data', 'summary']
                          )
                          : renderObject(review_data?.doctor_note_data?.summary)}
                      </Paper>
                      {isEditing && editingSection === 'review' && (
                        <Box mt={3}>
                          <Button
                            variant="contained"
                            color="primary"
                            onClick={handleSubmit}
                            disabled={isSaving}
                            sx={{ mr: 2 }}
                          >
                            {isSaving ? 'Saving...' : 'Save Changes'}
                          </Button>
                          <Button variant="outlined" onClick={handleCancelEdit}>
                            Cancel
                          </Button>
                        </Box>
                      )}
                    </Box>
                  </Paper>
                </AccordionDetails>
              </Accordion>
            </Grid>
          </Grid>
        </Container>
      </Box>
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </ThemeProvider>
  );
});

export default PatientProfileDisplay;