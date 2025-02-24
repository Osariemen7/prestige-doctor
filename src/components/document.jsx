import React, { useState, useEffect } from 'react';
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
} from '@mui/material';
import axios from 'axios';
import { getAccessToken } from './api';
import { Edit as EditIcon, Schedule as ScheduleIcon } from '@mui/icons-material';

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

const PatientProfileDisplay = ({ reviewid, wsStatus }) => {
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


  // On save, send all sections (even unchanged ones) in the payload.
  const handleSubmit = async () => {
    setIsSaving(true);
    try {
      // Send the entire editableData back to the API
      const payload = editableData;

      const accessToken = await getAccessToken();
      await axios.put(
        `https://health.prestigedelta.com/documentreview/${reviewid}/aggregate-data/`, // Assuming this endpoint updates all data
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
    } catch (error) {
      console.error("Error submitting edits:", error);
      setSnackbarSeverity('error');
      setSnackbarMessage('Failed to update data.');
      setSnackbarOpen(true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSnackbarClose = (event, reason) => {
    if (reason === 'clickaway') return;
    setSnackbarOpen(false);
  };

  // Helper to render an object (read-only)
  const renderObject = (obj) => {
    if (!obj) return null;
    return Object.entries(obj).map(([key, value]) => {
      if (value === null || value === undefined ) return null; // Removed empty string check for now to see if it helps display data
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
                    <ListItemText primary={typeof item === 'object' ? JSON.stringify(item, null, 2) : item} secondary={typeof item === 'object' ? "(Object)" : null} />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2">None</Typography>
            )
          ) : typeof value === 'object' ? (
            renderObject(value)
          ) : (
            <Typography variant="body2">{value?.toString()}</Typography>
          )}
        </div>
      );
    });
  };

    // Helper to render an object as editable fields.
    const renderEditableObject = (obj, sectionKeysPrefix) => {
        if (!obj) return null;
        return Object.entries(obj).map(([key, value]) => {
          const currentSectionKeys = [...sectionKeysPrefix, key];
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
                  <div key={index} style={{ marginBottom: 8, paddingLeft: 16, border: '1px solid #ccc', borderRadius: '4px', padding: '8px' }}>
                    <Typography variant="subtitle2" style={{ textTransform: 'capitalize' }}>
                      Item {index + 1}:
                    </Typography>
                    {typeof item === 'object' ? renderEditableObject(item, [...currentSectionKeys, index.toString()]) : (
                      <TextField
                        label={`${key}[${index}]`}
                        value={editableData /* Access nested value using sectionKeys */
                          ? currentSectionKeys.reduce((acc, k) => acc?.[k], editableData) || ''
                          : item || ''
                        }
                        onChange={(e) => handleFieldChange([...currentSectionKeys], e.target.value)}
                        fullWidth
                        multiline // Assuming array items might be complex and need multiline
                      />
                    )}
                  </div>
                ))}
              </div>
            );

          }

           else {
            return (
              <div key={key} style={{ marginBottom: 16 }}>
                <TextField
                  label={key.replace(/_/g, ' ')}
                  value={editableData /* Access nested value using sectionKeys */
                    ? currentSectionKeys.reduce((acc, k) => acc?.[k], editableData) || ''
                    : value || ''
                  }
                  onChange={(e) => handleFieldChange(currentSectionKeys, e.target.value)}
                  fullWidth
                />
              </div>
            );
          }
        });
      };


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
      <Box bgcolor="background.default" minHeight="100vh" py={2}>
        <Container maxWidth="lg">
          <Grid container spacing={3}>
            {/* Patient Profile Section */}
            <Grid item xs={12}>
              <Paper elevation={3} sx={{ overflow: 'hidden' }}>
                <Box
                  sx={{
                    bgcolor: 'primary.light',
                    p: 2,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Typography variant="h5" color="white">
                    Patient Profile
                  </Typography>
                  {!isEditing && editingSection !== 'profile' && (
                    <IconButton onClick={() => handleEditClick('profile')} sx={{ color: 'white' }}>
                      <EditIcon />
                    </IconButton>
                  )}
                </Box>
                <Box p={3}>
                  <Grid container spacing={3}>
                    {[
                      { title: "Demographics", field: "demographics" },
                      { title: "Genetic Proxies", field: "genetic_proxies" },
                      { title: "Lifestyle & Biometrics", field: "lifestyle" },
                      { title: "Environment", field: "environment" },
                      { title: "Clinical Status", field: "clinical_status" },
                      { title: "Temporal Context", field: "temporal_context" }
                    ].map((section) => (
                      <Grid item xs={12} md={6} key={section.field}>
                        <Paper variant="outlined" sx={{ p: 2 }}>
                          <Typography variant="h6" color="primary" gutterBottom>
                            {section.title}
                          </Typography>
                          {isEditing && editingSection === 'profile'
                            ? renderEditableObject(editableData?.profile_data?.profile_data?.[section.field], ['profile_data', 'profile_data', section.field])
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
                      <Button
                        variant="outlined"
                        onClick={handleCancelEdit}
                      >
                        Cancel
                      </Button>
                    </Box>
                  )}
                </Box>
              </Paper>
            </Grid>

            {/* Health Goals Section */}
            <Grid item xs={12}>
              <Paper elevation={3} sx={{ overflow: 'hidden' }}>
                <Box
                  sx={{
                    bgcolor: 'primary.light',
                    p: 2,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Typography variant="h5" color="white">
                    Health Goals
                  </Typography>
                  {!isEditing && editingSection !== 'goals' && (
                    <IconButton onClick={() => handleEditClick('goals')} sx={{ color: 'white' }}>
                      <EditIcon />
                    </IconButton>
                  )}
                </Box>
                <Box p={3}>
                  {isEditing && editingSection === 'goals' ? (
                    renderEditableObject(editableData?.goal_data?.goal_data, ['goal_data', 'goal_data'])
                  ) : (
                    goal_data?.goal_data?.goal_name ? ( // Access nested goal_data.goal_data
                      renderObject(goal_data.goal_data) // Access nested goal_data.goal_data
                    ) : (
                      <Typography color="text.secondary" fontStyle="italic">
                        No current health goals established
                      </Typography>
                    )
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
                      <Button
                        variant="outlined"
                        onClick={handleCancelEdit}
                      >
                        Cancel
                      </Button>
                    </Box>
                  )}
                </Box>
              </Paper>
            </Grid>

            {/* Medical Review Section */}
            <Grid item xs={12}>
              <Paper elevation={3} sx={{ overflow: 'hidden' }}>
                <Box
                  sx={{
                    bgcolor: 'primary.light',
                    p: 2,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Typography variant="h5" color="white">
                    Medical Review
                  </Typography>
                   {!isEditing && editingSection !== 'review' && (
                    <IconButton onClick={() => handleEditClick('review')} sx={{ color: 'white' }}>
                      <EditIcon />
                    </IconButton>
                  )}
                </Box>
                <Box p={3}>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                        <Typography variant="h6" color="primary" gutterBottom>
                          Subjective
                        </Typography>
                        {isEditing && editingSection === 'review'
                            ? renderEditableObject(editableData?.review_data?.doctor_note_data?.subjective, ['review_data', 'doctor_note_data', 'subjective']) // Correct path for review_data
                            : renderObject(review_data?.doctor_note_data?.subjective)} {/* Access nested review_data.doctor_note_data */}
                      </Paper>
                      <Paper variant="outlined" sx={{ p: 2 }}>
                        <Typography variant="h6" color="primary" gutterBottom>
                          Objective
                        </Typography>
                         {isEditing && editingSection === 'review'
                            ? renderEditableObject(editableData?.review_data?.doctor_note_data?.objective, ['review_data', 'doctor_note_data', 'objective']) // Correct path for review_data
                            : renderObject(review_data?.doctor_note_data?.objective)} {/* Access nested review_data.doctor_note_data */}
                      </Paper>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                        <Typography variant="h6" color="primary" gutterBottom>
                          Assessment
                        </Typography>
                         {isEditing && editingSection === 'review'
                            ? renderEditableObject(editableData?.review_data?.doctor_note_data?.assessment, ['review_data', 'doctor_note_data', 'assessment']) // Correct path for review_data
                            : renderObject(review_data?.doctor_note_data?.assessment)} {/* Access nested review_data.doctor_note_data */}
                      </Paper>
                      <Paper variant="outlined" sx={{ p: 2 }}>
                        <Typography variant="h6" color="primary" gutterBottom>
                          Plan
                        </Typography>
                         {isEditing && editingSection === 'review'
                            ? renderEditableObject(editableData?.review_data?.doctor_note_data?.plan, ['review_data', 'doctor_note_data', 'plan']) // Correct path for review_data
                            : renderObject(review_data?.doctor_note_data?.plan)} {/* Access nested review_data.doctor_note_data */}
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
                      {isEditing && editingSection === 'review'
                            ? <TextField
                                value={editableData?.review_data?.doctor_note_data?.next_review || ''} // Correct path for review_data
                                onChange={(e) => handleFieldChange(['review_data', 'doctor_note_data', 'next_review'], e.target.value)} // Correct path for review_data
                              />
                            : (review_data?.doctor_note_data?.next_review || 'Not Scheduled')  // Access nested review_data.doctor_note_data
                          }
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
                          renderEditableObject(editableData?.review_data?.doctor_note_data?.prescription, ['review_data', 'doctor_note_data', 'prescription']) // Correct path for review_data
                        ) : (
                          review_data?.doctor_note_data?.prescription?.length > 0 ? ( // Access nested review_data.doctor_note_data
                            review_data.doctor_note_data.prescription.map((pres, i) => ( // Access nested review_data.doctor_note_data
                              <Chip
                                key={i}
                                label={`${pres.medication_name} - ${pres.dosage}`}
                                color="primary"
                                variant="outlined"
                              />
                            ))
                          ) : (
                            <Typography color="text.secondary">None</Typography>
                          )
                        )}
                      </Box>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle1" gutterBottom>
                        Investigations
                      </Typography>
                      <Box>
                         {isEditing && editingSection === 'review' ? (
                          renderEditableObject(editableData?.review_data?.doctor_note_data?.investigation, ['review_data', 'doctor_note_data', 'investigation']) // Correct path for review_data
                        ) : (
                          review_data?.doctor_note_data?.investigation?.length > 0 ? ( // Access nested review_data.doctor_note_data
                            review_data.doctor_note_data.investigation.map((inv, i) => ( // Access nested review_data.doctor_note_data
                              <Chip
                                key={i}
                                label={`${inv.test_type}: ${inv.reason}`}
                                color="primary"
                                variant="outlined"
                              />
                            ))
                          ) : (
                            <Typography color="text.secondary">None</Typography>
                          )
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
                            ? renderEditableObject(editableData?.review_data?.doctor_note_data?.summary, ['review_data', 'doctor_note_data', 'summary']) // Correct path for review_data
                            : renderObject(review_data?.doctor_note_data?.summary)} {/* Access nested review_data.doctor_note_data */}
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
                      <Button
                        variant="outlined"
                        onClick={handleCancelEdit}
                      >
                        Cancel
                      </Button>
                    </Box>
                  )}
                </Box>
              </Paper>
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
};

export default PatientProfileDisplay;