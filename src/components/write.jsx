import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import NavigationBar from './tab';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import TranscriptTab from './transcript';
import PatientProfileTab from './patent';
import HealthGoalsTab from './healthgoal';
import MedicalReviewTab from './medical';
import { Container, Box, Button, Typography } from '@mui/material';
import SnackbarComponent from './snackbar';
import axios from 'axios';
import { getAccessToken } from './api';

const theme = createTheme();

const PatientProfile = forwardRef(({reviewid, thread, wsStatus, setIsDocumentationSaved, transcript}, ref)=> {
    const [activeTab, setActiveTab] = useState('medicalReview'); // Default to Medical Review as per video
    const [data, setData] = useState(null);
    const [editableData, setEditableData] = useState(null);
    const [suggestionData, setSuggestionData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState('success'); // or 'error'
    const parentalSetIsDocumentationSaved = () => { }; // Placeholder, adjust if needed
    const [hasChanges, setHasChanges] = useState(false);
    
    // Placeholder for getAccessToken - Implement your actual token retrieval logic
   

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
            setEditableData(JSON.parse(JSON.stringify(fetchedData))); // Initialize editable data
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

    const getSuggestion = async () => { // Modified getSuggestion function
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
            setSuggestionData(result.documentation); // Assuming suggestion is under 'documentation'
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


    const handleSubmit = async (tabName) => {
        let sectionDataToSave;
        if (tabName === 'patientProfile') {
            sectionDataToSave = { profile_data: { profile_data: editableData.profile_data.profile_data } };
        } else if (tabName === 'healthGoals') {
            sectionDataToSave = { goal_data: { goal_data: editableData.goal_data.goal_data } };
        } else if (tabName === 'medicalReview') {
            sectionDataToSave = { review_data: { doctor_note_data: editableData.review_data.doctor_note_data } };
        } else {
            console.error("Invalid tab name for saving:", tabName);
            return false;
        }


        setIsSaving(true);
        try {


            const accessToken = await getAccessToken();
            await axios.post(
                `https://health.prestigedelta.com/documentreview/${reviewid}/document-assessment/`,
                editableData, // Send only the relevant section data
                {
                    headers: { Authorization: `Bearer ${accessToken}` },
                }
            );

            // Update the local data with the new data - for specific section only
            if (tabName === 'patientProfile') {
                setData(prevData => ({ ...prevData, profile_data: { ...prevData.profile_data, profile_data: editableData.profile_data.profile_data } }));
            } else if (tabName === 'healthGoals') {
                setData(prevData => ({ ...prevData, goal_data: { ...prevData.goal_data, goal_data: editableData.goal_data.goal_data } }));
            } else if (tabName === 'medicalReview') {
                setData(prevData => ({ ...prevData, review_data: { ...prevData.review_data, doctor_note_data: editableData.review_data.doctor_note_data } }));
            }


            setSuggestionData(null); // Clear suggestions after save
            setSnackbarSeverity('success');
            setSnackbarMessage(`${tabName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} updated successfully!`); // Nicer message
            setSnackbarOpen(true);
            parentalSetIsDocumentationSaved(true);
            setHasChanges(false);
            return true;
        } catch (error) {
            console.error(`Error submitting edits for ${tabName}:`, error);
            setSnackbarSeverity('error');
            setSnackbarMessage(`Failed to update ${tabName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}.`);
            setSnackbarOpen(true);
            return false;
        } finally {
            setIsSaving(false);
        }
    };

    const handleTabChange = (tabName) => {
        setActiveTab(tabName);
    };

    const savePatientProfile = async () => {
        return handleSubmit('patientProfile');
    };

    const saveHealthGoals = async () => {
        return handleSubmit('healthGoals');
    };

    const saveMedicalReview = async () => {
        return handleSubmit('medicalReview');
    };


    
    const saveAllDocumentation = async () => {
        setIsSaving(true); // Start saving indication for all saves
        try {
            await savePatientProfile();
            await saveHealthGoals();
            await saveMedicalReview();

            setSnackbarSeverity('success');
            setSnackbarMessage('All documentation saved successfully!');
            setSnackbarOpen(true);
            parentalSetIsDocumentationSaved(true);

        } catch (error) {
            console.error("Error saving all documentation:", error);
            setSnackbarSeverity('error');
            setSnackbarMessage('Failed to save all documentation. Please check each section.');
            setSnackbarOpen(true);
        } finally {
            setIsSaving(false); // End saving indication after all saves or errors
        }
    };
    const handleDataChange = (tabName, newData) => {
        setEditableData(prevData => {
            let updatedData = { ...prevData };
            if (tabName === 'patientProfile') {
                updatedData.profile_data.profile_data = newData;
            } else if (tabName === 'healthGoals') {
                updatedData.goal_data.goal_data = newData;
            } else if (tabName === 'medicalReview') {
                updatedData.review_data.doctor_note_data = newData;
            }
            setHasChanges(true); // Indicate changes
            return updatedData;
        });
    };

    const handleApplySuggestion = (suggestionSection) => {
        setEditableData(prevData => {
            let updatedData = JSON.parse(JSON.stringify(prevData)); // Deep copy
            if (suggestionData) {
                if (suggestionSection === 'profile') {
                    updatedData.profile_data.profile_data = suggestionData.profile_data;
                } else if (suggestionSection === 'goals') {
                    updatedData.goal_data.goal_data = suggestionData.goal_data;
                } else if (suggestionSection === 'review') {
                    updatedData.review_data.doctor_note_data = suggestionData.review_data;
                }
                setHasChanges(true); // Indicate changes
            }
            return updatedData;
        });
        setData(prevData => { // Update main data to reflect applied suggestion for view mode
            let updatedData = JSON.parse(JSON.stringify(prevData));
            if (suggestionData) {
                if (suggestionSection === 'profile') {
                    updatedData.profile_data.profile_data = suggestionData.profile_data;
                } else if (suggestionSection === 'goals') {
                    updatedData.goal_data.goal_data = suggestionData.goal_data;
                } else if (suggestionSection === 'review') {
                    updatedData.review_data.doctor_note_data = suggestionData.review_data;
                }
            }
            return updatedData;
        });
        setSuggestionData(null); // Clear suggestions after apply
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
        fetchSubscribers();
    }, []);

    useImperativeHandle(ref, () => ({ // Use the ref passed as argument
        getSuggestion: getSuggestion, // Expose the getSuggestion function
        handleSubmitFromParent: handleSubmit, // Keep exposing handleSubmit for endConsultation
        dataLoaded: !loading // Example of exposing dataLoaded status (adjust logic if needed)
    }));


    if (loading) {
        return <div>Loading...</div>; // Replace with a better loading indicator
    }

    if (!data) {
        return <div>Error loading data.</div>; // Handle error case
    }


    return (
        <ThemeProvider theme={theme}> 
        <Container maxWidth="xl">
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}> {/* Header Box */}
                            <Button
                    variant="contained"
                    color="primary"
                    onClick={saveAllDocumentation}
                    disabled={isSaving}
                >
                    Save All Documentation
                </Button>
            </Box>

            <NavigationBar activeTab={activeTab} onTabChange={handleTabChange} />

            {activeTab === 'transcript' && (
                <TranscriptTab transcript={transcript} />
            )}
            {activeTab === 'patientProfile' && (
                <PatientProfileTab
                    data={data.profile_data.profile_data} // Use 'data' for initial view mode
                    editableData={editableData.profile_data.profile_data} // Pass editable data
                    schema={data.profile_data.schema}
                    onDataChange={(newData) => handleDataChange('patientProfile', newData)}
                    suggestion={suggestionData?.profile_data}
                    onApplySuggestion={() => handleApplySuggestion('profile')}
                    onSaveProfile={() => handleSubmit('patientProfile')} // Pass save handler
                    isSaving={isSaving}
                />
            )}
            {activeTab === 'healthGoals' && (
                <HealthGoalsTab
                    data={data.goal_data.goal_data} // Use 'data' for initial view mode
                    editableData={editableData.goal_data.goal_data} // Pass editable data
                    schema={data.goal_data.schema}
                    onDataChange={(newData) => handleDataChange('healthGoals', newData)}
                    suggestion={suggestionData?.goal_data}
                    onApplySuggestion={() => handleApplySuggestion('goals')}
                    onSaveGoals={() => handleSubmit('healthGoals')} // Pass save handler
                    isSaving={isSaving}
                />
            )}
            {activeTab === 'medicalReview' && (
                <MedicalReviewTab
                    data={data.review_data.doctor_note_data} // Use 'data' for initial view mode
                    editableData={editableData.review_data.doctor_note_data} // Pass editable data
                    schema={data.review_data.schema}
                    onDataChange={(newData) => handleDataChange('medicalReview', newData)}
                    suggestion={suggestionData?.review_data}
                    onApplySuggestion={() => handleApplySuggestion('review')}
                    onGetSuggestion={getSuggestion}
                    onSaveReview={() => handleSubmit('medicalReview')} // Pass save handler
                    isGeneratingSuggestion={isSaving}
                    isSavingReview={isSaving}
                    hasChanges={hasChanges}
                />
            )}

            <SnackbarComponent
                open={snackbarOpen}
                message={snackbarMessage}
                severity={snackbarSeverity}
                onClose={handleSnackbarClose}
            />
        </Container>
        </ThemeProvider>
    );
})

export default PatientProfile;