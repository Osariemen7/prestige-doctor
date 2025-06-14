import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
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

const PatientProfile = forwardRef(({ reviewid, thread, wsStatus, setIsDocumentationSaved, transcript }, ref) => {
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

    const didFetch = useRef(false);
    const fetchSubscribers = async () => {
        setLoading(true);
        try {
            const accessToken = await getAccessToken();
            const response = await axios.get(
                `https://service.prestigedelta.com/documentreview/${reviewid}/aggregate-data/`,
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
        // Prepare data payload with "note" wrapper
        let suggestionPayload = {
            note: JSON.parse(JSON.stringify(editableData))
        };

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
            suggestionPayload.note.thread_id = thread;
        }
        console.log("Suggestion payload:", suggestionPayload);
        const accessToken = await getAccessToken();
        const response = await axios.post(
            `https://service.prestigedelta.com/documentreview/${reviewid}/generate-documentation/`,
            suggestionPayload,
            {
                headers: { Authorization: `Bearer ${accessToken}` },
            }
        );

        const result = response.data;
        setData(result);
        setEditableData(prevData => {
            let updatedData = JSON.parse(JSON.stringify(prevData));

            // Merge suggestion data into editableData
            if (result.profile_data) {
                updatedData.profile_data = { ...updatedData.profile_data, ...result.profile_data };
            }
            if (result.goal_data) {
                updatedData.goal_data = { ...updatedData.goal_data, ...result.goal_data };
            }
            if (result.review_data) {
                updatedData.review_data = { ...updatedData.review_data, ...result.review_data };
            }

            return updatedData;
        });
        setSuggestionData(result);
        console.log(result);

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

console.log(suggestionData)
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
            await axios.post(
                `https://service.prestigedelta.com/documentreview/${reviewid}/document-assessment/`,
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

    const saveHealthGoals = async () => {
        const healthGoals = editableData?.goal_data?.goal_data;
        if (!healthGoals ||
            (Array.isArray(healthGoals) && healthGoals.length === 0) ||
            (typeof healthGoals === 'object' && Object.keys(healthGoals).length === 0)) {
            setSnackbarSeverity('error');
            setSnackbarMessage('A field on the health bar must be filled');
            setSnackbarOpen(true);
            return;
        }
        return handleSubmit('healthGoals');
    };

    const handleTabChange = (tabName) => {
        setActiveTab(tabName);
    };

    const savePatientProfile = async () => {
        return handleSubmit('patientProfile');
    };

    const saveMedicalReview = async () => {
        return handleSubmit('medicalReview');
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

    const handleDataChange = (tabName, newData) => {
        setEditableData(prevData => {
            let updatedData = { ...prevData };
            if (tabName === 'patientProfile') {
                updatedData.profile_data = newData;
            } else if (tabName === 'healthGoals') {
                updatedData.goal_data = newData;
            } else if (tabName === 'medicalReview') {
                updatedData.review_data = newData;
            }
            setHasChanges(true);
            return updatedData;
        });
    };

    const handleApplySuggestion = (suggestionSection, fieldsToApply) => {
        console.log("handleApplySuggestion called for section:", suggestionSection, "fields:", fieldsToApply); // ADD THIS LINE
    
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
                                updatedData.profile_data[fieldKey] = sectionSuggestionData[fieldKey];
                            } else if (suggestionSection === 'goals') {
                                updatedData.goal_data[fieldKey] = sectionSuggestionData[fieldKey];
                            } else if (suggestionSection === 'review') {
                                if (fieldKey.includes('.')) {
                                    const parts = fieldKey.split('.');
                                    if (parts.length === 2) {
                                        updatedData.review_data[parts[0]][parts[1]] = sectionSuggestionData[parts[0] + '_suggestion'][parts[1]];
                                    }
                                } else {
                                    updatedData.review_data[fieldKey] = sectionSuggestionData[fieldKey + '_suggestion'];
                                }
                            }
                        }
                    });
                }
                setAppliedSuggestions(prev => ({
                    ...prev,
                    [suggestionSection]: { ...prev[suggestionSection], ...fieldsToApply }
                }));
                setHasChanges(true);
            }
            console.log("Updated editableData:", updatedData); // ADD THIS LINE
            return updatedData;
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
                                updatedData.profile_data[fieldKey] = sectionSuggestionData[fieldKey];
                            } else if (suggestionSection === 'goals') {
                                updatedData.goal_data[fieldKey] = sectionSuggestionData[fieldKey];
                            } else if (suggestionSection === 'review') {
                                if (fieldKey.includes('.')) { //nested fields like assessment.primary_diagnosis
                                    const parts = fieldKey.split('.');
                                    if (parts.length === 2) {
                                        updatedData.review_data[parts[0]][parts[1]] = sectionSuggestionData[parts[0] + '_suggestion'][parts[1]];
                                    }
                                } else {
                                    updatedData.review_data[fieldKey] = sectionSuggestionData[fieldKey + '_suggestion'];
                                }
                            }
                        }
                    });
                }
            }
            console.log("Updated data:", updatedData); // ADD THIS LINE
            return updatedData;
        });
    
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
        if (!didFetch.current) {
            fetchSubscribers();
            didFetch.current = true;
        }
    }, []);

    useImperativeHandle(ref, () => ({
        getSuggestion: getSuggestion,
        handleSubmitFromParent: handleSubmit,
        dataLoaded: !loading
    }));

    if (loading) {
        return <div>Loading...</div>;
    }

    if (!data) {
        return <div>Error loading data.</div>;
    }

    return (
        <ThemeProvider theme={theme}>
            <Container maxWidth="xl">
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
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
        onSaveGoals={saveHealthGoals}
        isSaving={isSaving}
    />
)}
{activeTab === 'medicalReview' && (
    <MedicalReviewTab
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

                <SnackbarComponent
                    open={snackbarOpen}
                    message={snackbarMessage}
                    severity={snackbarSeverity}
                    onClose={handleSnackbarClose}
                />
            </Container>
        </ThemeProvider>
    );
});

export default PatientProfile;