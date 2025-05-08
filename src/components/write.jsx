import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import NavigationBar from './tab';
import { ThemeProvider } from '@mui/material/styles';
import { muiTheme } from '../theme/mui';
import TranscriptTab from './transcript';
import PatientProfileTab from './patent';
import HealthGoalsTab from './healthgoal';
import MedicalReviewTab from './medical';
import { Container, Box, Button, Typography, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import SnackbarComponent from './snackbar';
import axios from 'axios';
import { getAccessToken } from './api';
import './write.css';

const PatientProfile = forwardRef(({ reviewid, thread, setIsDocumentationSaved, transcript, resetKey }, ref) => {
    const [activeTab, setActiveTab] = useState('medicalReview');
    const [data, setData] = useState(null);
    const [editableData, setEditableData] = useState(null);
    const [suggestionData, setSuggestionData] = useState(null);
    const [appliedSuggestions, setAppliedSuggestions] = useState({
        profile: {},
        goals: {},
        review: {}
    });
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState('success');
    const parentalSetIsDocumentationSaved = setIsDocumentationSaved || (() => {});
    const [hasChanges, setHasChanges] = useState(false);
    const [isSuggestionsLoading, setIsSuggestionsLoading] = useState(false);
    const [suggestionDialogOpen, setSuggestionDialogOpen] = useState(false);
    const [suggestionLoading, setSuggestionLoading] = useState({});

    const didFetch = useRef(false);
    const fetchSubscribers = async () => {
        setLoading(true);
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
            setEditableData(JSON.parse(JSON.stringify(fetchedData)));
            setLoading(false);
        } catch (error) {
            console.error("Error fetching data:", error);
            setSnackbarSeverity('error');
            setSnackbarMessage('Error fetching data.');
            setSnackbarOpen(true);
        } finally {
            setLoading(false);
        }
    };

    const isGettingSuggestion = useRef(false);

    const getSuggestion = async () => {
        if (isGettingSuggestion.current) return;
        isGettingSuggestion.current = true;
    
        setIsSaving(true);
        try {
            let suggestionPayload = {
                note: JSON.parse(JSON.stringify(editableData))
            };
    
            if (transcript) {
                const currentTime = new Date().toISOString();
                suggestionPayload.transcript = transcript;
                // suggestionPayload.transcript = [
                //     {
                //         time: currentTime,
                //         speaker: "patient",
                //         content: ""
                //     },
                //     {
                //         time: currentTime,
                //         speaker: "doctor",
                //         content: transcript
                //     }
                // ];
            }
    
            if (thread) {
                suggestionPayload.note.thread_id = thread;
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
            setData(result); // Update the main data
            setEditableData(JSON.parse(JSON.stringify(result))); // Update editable data
            setSuggestionData(result); // Update suggestion data
    
            setAppliedSuggestions({
                profile: {},
                goals: {},
                review: {}
            });
    
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
            isGettingSuggestion.current = false;
        }
    };
    const getSuggestions = async () => {
        if (isGettingSuggestion.current) return;
        isGettingSuggestion.current = true;
        
        setSuggestionLoading(prev => ({ ...prev, [activeTab]: true }));
        
        try {
            let suggestionPayload = {
                note: JSON.parse(JSON.stringify(editableData))
            };

            // Include transcript if available
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

            // Include thread ID if available
            if (thread) {
                suggestionPayload.note.thread_id = thread;
            }

            const accessToken = await getAccessToken();
            const response = await axios.post(
                `https://health.prestigedelta.com/documentreview/${reviewid}/generate-suggestions/`,
                suggestionPayload,
                {
                    headers: { Authorization: `Bearer ${accessToken}` },
                }
            );

            const result = response.data;
            console.log("Received suggestions:", result);
            setSuggestionData(result);
            
            setSnackbarSeverity('success');
            setSnackbarMessage('Suggestions generated successfully!');
            setSnackbarOpen(true);
            
            return true;
        } catch (error) {
            console.error("Error getting suggestions:", error);
            setSnackbarSeverity('error');
            setSnackbarMessage('Failed to generate suggestions.');
            setSnackbarOpen(true);
            return false;
        } finally {
            setSuggestionLoading(prev => ({ ...prev, [activeTab]: false }));
            isGettingSuggestion.current = false;
        }
    };

    const handleSubmit = async (tabName) => {
        let sectionDataToSave = {};
        if (tabName === 'patientProfile') {
            sectionDataToSave = { profile_data: editableData.profile_data };
        } else if (tabName === 'healthGoals') {
            sectionDataToSave = { goal_data: editableData.goal_data };
            console.log("Data being sent for healthGoals:", sectionDataToSave);
        } else if (tabName === 'medicalReview') {
            sectionDataToSave = { review_data: editableData.review_data };
        } else if (tabName === 'all') {
            sectionDataToSave = {
                profile_data: editableData.profile_data,
                goal_data: editableData.goal_data,
                review_data: editableData.review_data,
            };
            console.log("Data being sent for ALL:", sectionDataToSave);
        } else {
            console.error("Invalid tab name for saving:", tabName);
            return false;
        }

        if (!isSaving) setIsSaving(true);
        try {
            const accessToken = await getAccessToken();
           const result = await axios.post(
                `https://health.prestigedelta.com/documentreview/${reviewid}/document-assessment/`,
                sectionDataToSave,
                { headers: { Authorization: `Bearer ${accessToken}` } }
            );

            if (tabName === 'all') {
                setData(prevData => ({ ...prevData, ...editableData }));
            } else if (tabName === 'patientProfile') {
                setData(prevData => ({ ...prevData, profile_data: editableData.profile_data }));
            } else if (tabName === 'healthGoals') {
                setData(prevData => ({ ...prevData, goal_data: editableData.goal_data }));
            } else if (tabName === 'medicalReview') {
                setData(prevData => ({ ...prevData, review_data: editableData.review_data }));
            }
            const response = result.data;
            console.log("Response from submit:", response);
            
            setSnackbarSeverity('success');
            setSnackbarMessage(`${tabName === 'all' ? 'All' : tabName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} documentation updated successfully!`);
            setSnackbarOpen(true);
            parentalSetIsDocumentationSaved(true);
            setHasChanges(false);
            return true;
        } catch (error) {
            console.error(`Error submitting edits for ${tabName}:`, error);
            setSnackbarSeverity('error');
            setSnackbarMessage(`Failed to update ${tabName === 'all' ? 'all' : tabName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} documentation.`);
            setSnackbarOpen(true);
            return false;
        } finally {
            setIsSaving(false);
        }
    };

    

    const handleTabChange = (tabName) => {
        setActiveTab(tabName);
    };

    
    const saveAllDocumentation = async () => {
        setIsSaving(true);
        try {
            const success = await handleSubmit('all');

            if (success) {
                setSnackbarSeverity('success');
                setSnackbarMessage('All documentation saved successfully!');
                setSnackbarOpen(true);
                parentalSetIsDocumentationSaved(true);
                setHasChanges(false);
            }
        } catch (error) {
            console.error("Error saving all documentation:", error);
            setSnackbarSeverity('error');
            setSnackbarMessage('Failed to save all documentation.');
            setSnackbarOpen(true);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDataChange = (tabName, newDataFromChild) => {
        setEditableData(prevData => {
            const updatedData = JSON.parse(JSON.stringify(prevData));

            const updateSectionConditionally = (currentSectionInPrevData, newSectionDataFromChild) => {
                const sectionCopy = { ...currentSectionInPrevData };

                for (const key in newSectionDataFromChild) {
                    if (newSectionDataFromChild.hasOwnProperty(key)) {
                        const value = newSectionDataFromChild[key];
                        if (value !== null && value !== "") {
                            sectionCopy[key] = value;
                        }
                    }
                }
                return sectionCopy;
            };

            if (tabName === 'patientProfile') {
                if (updatedData.profile_data && newDataFromChild) {
                    updatedData.profile_data = updateSectionConditionally(prevData.profile_data, newDataFromChild);
                }
            } else if (tabName === 'healthGoals') {
                if (updatedData.goal_data && newDataFromChild) {
                    updatedData.goal_data = updateSectionConditionally(prevData.goal_data, newDataFromChild);
                }
            } else if (tabName === 'medicalReview') {
                if (updatedData.review_data && newDataFromChild) {
                    updatedData.review_data = updateSectionConditionally(prevData.review_data, newDataFromChild);
                }
            }
            setHasChanges(true);
            return updatedData;
        });
    };

    const handleApplySuggestion = (suggestionSection, fieldsToApply) => {
        console.log("handleApplySuggestion called for section:", suggestionSection, "fields:", fieldsToApply);
        console.log("Current editableData before apply:", editableData);
        console.log("Current data before apply:", data);
    
        setEditableData(prevData => {
            let updatedData = JSON.parse(JSON.stringify(prevData));
            if (suggestionData) {
                let sectionSuggestionData;
                let sectionEditableData;
    
                if (suggestionSection === 'profile') {
                    sectionSuggestionData = suggestionData.profile_data;
                    sectionEditableData = updatedData.profile_data;
                } else if (suggestionSection === 'goals') {
                    sectionSuggestionData = suggestionData.goal_data;
                    sectionEditableData = updatedData.goal_data;
                } else if (suggestionSection === 'review') {
                    sectionSuggestionData = suggestionData.review_data;
                    sectionEditableData = updatedData.review_data;
                }
    
                if (sectionSuggestionData && fieldsToApply) {
                    Object.keys(fieldsToApply).forEach(fieldKey => {
                        if (sectionSuggestionData.hasOwnProperty(fieldKey)) {
                            if (suggestionSection === 'profile') {
                                updatedData.profile_data[fieldKey] = sectionSuggestionData[fieldKey + '_suggestion'] || sectionSuggestionData[fieldKey];
                            } else if (suggestionSection === 'goals') {
                                updatedData.goal_data[fieldKey] = sectionSuggestionData[fieldKey + '_suggestion'] || sectionSuggestionData[fieldKey];
                            } else if (suggestionSection === 'review') {
                                if (fieldKey.includes('.')) { //nested fields like assessment.primary_diagnosis
                                    const parts = fieldKey.split('.');
                                    if (parts.length === 2) {
                                        updatedData.review_data[parts[0]][parts[1]] = sectionSuggestionData[parts[0] + '_suggestion'][parts[1]] || sectionSuggestionData[parts[0]][parts[1]];
                                    }
                                } else {
                                    updatedData.review_data[fieldKey] = sectionSuggestionData[fieldKey + '_suggestion'] || sectionSuggestionData[fieldKey];
                                }
                            }
                        }
                    });
                }
                console.log("Updated editableData in handleApplySuggestion:", updatedData);
                return updatedData;
            }
            return updatedData; // Add this return to handle cases where suggestionData is null
        });
    
        setData(prevData => {
            let updatedData = JSON.parse(JSON.stringify(prevData));
            if (suggestionData) {
                let sectionSuggestionData;
                let sectionData;
    
                if (suggestionSection === 'profile') {
                    sectionSuggestionData = suggestionData.profile_data;
                    sectionData = updatedData.profile_data;
                } else if (suggestionSection === 'goals') {
                    sectionSuggestionData = suggestionData.goal_data;
                    sectionData = updatedData.goal_data;
                } else if (suggestionSection === 'review') {
                    sectionSuggestionData = suggestionData.review_data;
                    sectionData = updatedData.review_data;
                }
    
                if (sectionSuggestionData && fieldsToApply) {
                    Object.keys(fieldsToApply).forEach(fieldKey => {
                        if (sectionSuggestionData.hasOwnProperty(fieldKey)) {
                            if (suggestionSection === 'profile') {
                                updatedData.profile_data[fieldKey] = sectionSuggestionData[fieldKey + '_suggestion'] || sectionSuggestionData[fieldKey];
                            } else if (suggestionSection === 'goals') {
                                updatedData.goal_data[fieldKey] = sectionSuggestionData[fieldKey + '_suggestion'] || sectionSuggestionData[fieldKey];
                            } else if (suggestionSection === 'review') {
                                if (fieldKey.includes('.')) { //nested fields like assessment.primary_diagnosis
                                    const parts = fieldKey.split('.');
                                    if (parts.length === 2) {
                                        updatedData.review_data[parts[0]][parts[1]] = sectionSuggestionData[parts[0] + '_suggestion'][parts[1]] || sectionSuggestionData[parts[0]][parts[1]];
                                    }
                                } else {
                                    updatedData.review_data[fieldKey] = sectionSuggestionData[fieldKey + '_suggestion'] || sectionSuggestionData[fieldKey];
                                }
                            }
                        }
                    });
                }
                console.log("Updated data in handleApplySuggestion:", updatedData);
                return updatedData;
            }
            return updatedData; // Add this return to handle cases where suggestionData is null
        });
    
    
        setAppliedSuggestions(prev => ({
            ...prev,
            [suggestionSection]: { ...prev[suggestionSection], ...fieldsToApply }
        }));
        console.log("Updated appliedSuggestions:", appliedSuggestions);
    
        setSnackbarSeverity('success');
        setSnackbarMessage(`Suggestion applied to ${suggestionSection} successfully!`);
        setSnackbarOpen(true);
    };

    const handleSnackbarClose = (event, reason) => {
        if (reason === 'clickaway') {
            return;
        }
        setSnackbarOpen(false);
    };

    useEffect(() => {
        // Only fetch if we have a reviewid and either:
        // 1. We haven't fetched before (didFetch.current is false)
        // 2. The resetKey has changed
        if (reviewid && (!didFetch.current || resetKey)) {
            setData(null);
            setEditableData(null);
            setSuggestionData(null);
            didFetch.current = false;
            fetchSubscribers();
            didFetch.current = true;
        }
    }, [reviewid, resetKey]);

    // Remove other duplicate useEffect hooks that call fetchSubscribers
    useEffect(() => {
        console.log("useEffect in PatientProfile.js (data fetch) - suggestionData changed:", suggestionData);
    }, [suggestionData]);
    
    useImperativeHandle(ref, () => ({
        getSuggestion: getSuggestion,
        handleSubmitFromParent: handleSubmit,
        getSuggestions,
        dataLoaded: !loading
    }));

    const SuggestionsDialog = () => (
        <Dialog
            open={suggestionDialogOpen}
            onClose={() => setSuggestionDialogOpen(false)}
            maxWidth="md"
            fullWidth
        >
            <DialogTitle>AI Generated Suggestions</DialogTitle>
            <DialogContent>
                {suggestionData && (
                    <Box sx={{ mt: 2 }}>
                        {Object.entries(suggestionData).map(([section, suggestions], index) => (
                            <Box key={index} sx={{ mb: 3 }}>
                                <Typography variant="h6" sx={{ mb: 1 }}>
                                    {section.charAt(0).toUpperCase() + section.slice(1)}
                                </Typography>
                                {Object.entries(suggestions).map(([field, suggestion], idx) => (
                                    <Box key={idx} sx={{ mb: 2 }}>
                                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                                            {field}:
                                        </Typography>
                                        <Typography>{suggestion}</Typography>
                                        <Button
                                            variant="outlined"
                                            size="small"
                                            sx={{ mt: 1 }}
                                            onClick={() => applySuggestion(section, field, suggestion)}
                                            disabled={appliedSuggestions[section]?.[field]}
                                        >
                                            {appliedSuggestions[section]?.[field] ? 'Applied' : 'Apply Suggestion'}
                                        </Button>
                                    </Box>
                                ))}
                            </Box>
                        ))}
                    </Box>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setSuggestionDialogOpen(false)}>Close</Button>
            </DialogActions>
        </Dialog>
    );

    const applySuggestion = (section, field, suggestion) => {
        setEditableData(prev => ({
            ...prev,
            [field]: suggestion
        }));
        
        setAppliedSuggestions(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                [field]: true
            }
        }));
    };

    if (loading) {
        return <div>Loading...</div>;
    }

    if (!data) {
        return <div>Error loading data.</div>;
    }

    return (
        <ThemeProvider theme={muiTheme}>
            <Container 
                maxWidth="xl" 
                sx={{
                    height: '100%',
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    pb: 4
                }}
            >
                <Box sx={{ position: 'sticky', top: 0, zIndex: 1, bg: 'background.paper', pt: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <Button
                                variant="contained"
                                color="primary"
                                onClick={saveAllDocumentation}
                                disabled={isSaving}
                            >
                                Save All Documentation
                            </Button>
                            <Button
                                variant="outlined"
                                color="secondary"
                                onClick={getSuggestions}
                                disabled={isSuggestionsLoading || isSaving}
                                startIcon={isSuggestionsLoading ? <CircularProgress size={20} /> : null}
                            >
                                {isSuggestionsLoading ? 'Loading Suggestions...' : 'Show Suggestions'}
                            </Button>
                        </Box>
                        {isSaving && (
                            <Typography
                                variant="body1"
                                sx={{ ml: 2, display: 'flex', alignItems: 'center', color: 'primary.main' }}
                            >
                                <span className="loading-dots">Generating doctor's note</span>
                            </Typography>
                        )}
                    </Box>
                    <NavigationBar activeTab={activeTab} onTabChange={handleTabChange} />
                </Box>

                <Box sx={{ flex: 1, overflowY: 'auto' }}>
                    {activeTab === 'transcript' && (
                        <TranscriptTab transcript={transcript} />
                    )}
                    {activeTab === 'patientProfile' && (
                        <PatientProfileTab
                            data={data.profile_data}
                            editableData={editableData.profile_data}
                            schema={data.profile_data_schema}
                            onDataChange={(newData) => handleDataChange('patientProfile', newData)}
                            suggestion={suggestionData?.profile_data}
                            appliedSuggestions={appliedSuggestions.profile}
                            onApplySuggestion={(field, value) => handleApplySuggestion('profile', { [field]: value })}
                            onSaveProfile={() => handleSubmit('patientProfile')}
                            isSaving={isSaving}
                        />
                    )}
                    {activeTab === 'healthGoals' && (
                        <HealthGoalsTab
                            data={data.goal_data}
                            editableData={editableData.goal_data}
                            schema={data.goal_data_schema}
                            suggestion={suggestionData?.goal_data}
                            appliedSuggestions={appliedSuggestions.goals}
                            onDataChange={(newData) => handleDataChange('healthGoals', newData)}
                            onApplySuggestion={(field, value) => handleApplySuggestion('goals', { [field]: value })}
                            onSaveGoals={() => handleSubmit('healthGoals')}
                            isSaving={isSaving}
                        />
                    )}
                    {activeTab === 'medicalReview' && (
                        <MedicalReviewTab
                            key={JSON.stringify(editableData.review_data)} // Use a unique key to force re-render
                            data={data.review_data}
                            editableData={editableData.review_data}
                            schema={data.review_data_schema}
                            onDataChange={(newData) => handleDataChange('medicalReview', newData)}
                            suggestion={suggestionData?.review_data}
                            appliedSuggestions={appliedSuggestions.review}
                            onApplySuggestion={(field, value) => handleApplySuggestion('review', { [field]: value })}
                            onGetSuggestion={getSuggestion}
                            onSaveReview={() => handleSubmit('medicalReview')}
                            isGeneratingSuggestion={isSaving}
                            isSavingReview={isSaving}
                            hasChanges={hasChanges}
                        />
                    )}
                </Box>

                <SnackbarComponent
                    open={snackbarOpen}
                    message={snackbarMessage}
                    severity={snackbarSeverity}
                    onClose={handleSnackbarClose}
                />
                <SuggestionsDialog />
            </Container>
        </ThemeProvider>
    );
});

export default PatientProfile;