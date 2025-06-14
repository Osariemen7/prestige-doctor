import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import NavigationBar from './tab';
import { ThemeProvider } from '@mui/material/styles';
import { muiTheme } from '../theme/mui';
import TranscriptTab from './transcript';
import PatientProfileTab from './patent';
import HealthGoalsTab from './healthgoal';
import MedicalReviewTab from './medical';
import SuggestedQuestionsTab from './suggestedQuestions';
import { Container, Box, Button, Typography, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import SnackbarComponent from './snackbar';
import axios from 'axios';
import { getAccessToken, balanceCheck } from './api';
import BuyCreditsModal from './BuyCreditsModal';
import './write.css';

const PatientProfile = forwardRef(({ reviewid, thread, setIsDocumentationSaved, transcript, resetKey, onDocumentationChange, onDocumentationSaved, isMobile, hideSaveAllButton }, ref) => {
    const [activeTab, setActiveTab] = useState('medicalReview');
    const [data, setData] = useState(null);
    const [editableData, setEditableData] = useState(null);
    const [suggestionData, setSuggestionData] = useState(null);
    const [appliedSuggestions, setAppliedSuggestions] = useState({
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
    const [suggestionLoading, setSuggestionLoading] = useState({});    const [isShowRecommendationsLoading, setIsShowRecommendationsLoading] = useState(false);
    const [isSaveAllLoading, setIsSaveAllLoading] = useState(false);    const [isGenerateQuestionsLoading, setIsGenerateQuestionsLoading] = useState(false);
    const [isGeneratingNote, setIsGeneratingNote] = useState(false);
    const [noteHasBeenGenerated, setNoteHasBeenGenerated] = useState(false);
    
    // Buy credits modal states
    const [buyCreditsModalOpen, setBuyCreditsModalOpen] = useState(false);
    const [buyCreditsBalance, setBuyCreditsBalance] = useState(null);
    const [buyCreditsRequiredAmount, setBuyCreditsRequiredAmount] = useState(null);
    
    // Added state for suggested questions
    const [suggestedQuestions, setSuggestedQuestions] = useState([]);
    const [isQuestionsLoading, setIsQuestionsLoading] = useState(false);

    const didFetch = useRef(false);
    const assessmentRef = useRef(null); // Ref for Assessment section

    const mergeSourceIntoTarget = (target, source) => {
        const output = { ...(target || {}) };

        for (const key in source) {
            if (source.hasOwnProperty(key)) {
                const sourceValue = source[key];
                const targetValue = output[key];

                if (sourceValue !== null && sourceValue !== "") {
                    if (
                        typeof sourceValue === 'object' &&
                        !Array.isArray(sourceValue) &&
                        typeof targetValue === 'object' &&
                        !Array.isArray(targetValue) && targetValue !== null
                    ) {
                        output[key] = mergeSourceIntoTarget(targetValue, sourceValue);
                    } else {
                        if (typeof sourceValue === 'object' && sourceValue !== null) {
                            output[key] = JSON.parse(JSON.stringify(sourceValue));
                        } else {
                            output[key] = sourceValue;
                        }
                    }
                }
            }
        }
        return output;
    };    const fetchSubscribers = async () => {
        setLoading(true);
        try {
            // Validate reviewid before making API call
            if (!reviewid || reviewid === null || reviewid === undefined) {
                throw new Error('Invalid consultation ID');
            }

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
            if (error.response?.status === 404) {
                setSnackbarMessage('Consultation not found. This consultation may not exist or you may not have access to it.');
            } else if (error.message === 'Invalid consultation ID') {
                setSnackbarMessage('Invalid consultation ID provided.');
            } else {
                setSnackbarMessage('Error fetching consultation data.');
            }
            setSnackbarOpen(true);
        } finally {
            setLoading(false);
        }
    };

    const isGettingSuggestion = useRef(false);    const getSuggestion = async () => {        
        if (isGettingSuggestion.current) {
            console.warn("getSuggestion: Call ignored, an AI process (getSuggestion or getSuggestions) is already running.");
            setSnackbarSeverity('info');
            setSnackbarMessage('Note generation already in progress. Please wait for it to complete.');
            setSnackbarOpen(true);
            return false;
        }
        
        // // If a note has already been generated, don't generate a new one
        // if (noteHasBeenGenerated) {
        //     console.log("Note has already been generated, skipping generation");
        //     setSnackbarSeverity('info');
        //     setSnackbarMessage('Clinical note has already been generated.');
        //     setSnackbarOpen(true);
        //     return true;
        // }
        
        isGettingSuggestion.current = true;
        setIsGeneratingNote(true);
        setIsSaving(true);
        try {
            let suggestionPayload = {
                note: {
                    profile_data: editableData?.profile_data || {},
                    goal_data: editableData?.goal_data || {},
                    review_data: editableData?.review_data || {},
                    ...(editableData || {})
                }
            };
            if (Object.keys(suggestionPayload.note.profile_data).length === 0) delete suggestionPayload.note.profile_data;
            if (Object.keys(suggestionPayload.note.goal_data).length === 0) delete suggestionPayload.note.goal_data;
            if (Object.keys(suggestionPayload.note.review_data).length === 0) delete suggestionPayload.note.review_data;

            if (transcript && transcript.length > 0) {
                suggestionPayload.transcript = transcript;
            }
    
            if (thread) {
                suggestionPayload.note.thread_id = thread;
            }
    
            const accessToken = await getAccessToken();
            const response = await axios.post(
                `https://service.prestigedelta.com/documentreview/${reviewid}/generate-documentation/`,
                suggestionPayload,
                {
                    headers: { Authorization: `Bearer ${accessToken}` },
                }
            );
    
            const result = response.data;

            setData(prevData => {
                const updatedData = JSON.parse(JSON.stringify(prevData || {}));
                if (result.profile_data) {
                    updatedData.profile_data = mergeSourceIntoTarget(updatedData.profile_data || {}, result.profile_data);
                }
                if (result.goal_data) {
                    updatedData.goal_data = mergeSourceIntoTarget(updatedData.goal_data || {}, result.goal_data);
                }
                if (result.review_data) {
                    updatedData.review_data = mergeSourceIntoTarget(updatedData.review_data || {}, result.review_data);
                }
                Object.keys(result).forEach(key => {
                    if (!['profile_data', 'goal_data', 'review_data'].includes(key) && result[key] !== null && result[key] !== "") {
                        updatedData[key] = typeof result[key] === 'object' ? JSON.parse(JSON.stringify(result[key])) : result[key];
                    }
                });
                return updatedData;
            });
            
            setEditableData(prevEditableData => {
                const updatedEditableData = JSON.parse(JSON.stringify(prevEditableData || {}));
                if (result.profile_data) {
                    updatedEditableData.profile_data = mergeSourceIntoTarget(updatedEditableData.profile_data || {}, result.profile_data);
                }
                if (result.goal_data) {
                    updatedEditableData.goal_data = mergeSourceIntoTarget(updatedEditableData.goal_data || {}, result.goal_data);
                }
                if (result.review_data) {
                    updatedEditableData.review_data = mergeSourceIntoTarget(updatedEditableData.review_data || {}, result.review_data);
                }
                Object.keys(result).forEach(key => {
                    if (!['profile_data', 'goal_data', 'review_data'].includes(key) && result[key] !== null && result[key] !== "") {
                        updatedEditableData[key] = typeof result[key] === 'object' ? JSON.parse(JSON.stringify(result[key])) : result[key];
                    }
                });
                return updatedEditableData;
            });
              setSuggestionData(result);            setAppliedSuggestions({
                review: {}
            });            setSnackbarSeverity('success');
            setSnackbarMessage('Clinical note generated successfully!');
            setSnackbarOpen(true);
            setNoteHasBeenGenerated(true);
            return true;
        } catch (error) {
            console.error("Error generating note:", error);            setSnackbarSeverity('error');
            setSnackbarMessage('Failed to generate clinical note.');
            setSnackbarOpen(true);
            // balance check
            try {
                const balanceResult = await balanceCheck("low");
                if (balanceResult && balanceResult.sufficient_funds === false) {
                    setBuyCreditsBalance(balanceResult);
                    setBuyCreditsRequiredAmount(balanceResult.required_amount);
                    setBuyCreditsModalOpen(true);
                }
            } catch (balanceError) {
                console.error("Error checking balance:", balanceError);
            }
            return false;
        } finally {
            setIsSaving(false);
            setIsGeneratingNote(false);
            isGettingSuggestion.current = false;
        }
    };    const getSuggestions = async () => {
        if (isGettingSuggestion.current) {
            setSnackbarSeverity('info');
            setSnackbarMessage('Note generation already in progress. Please wait for it to complete.');
            setSnackbarOpen(true);
            return false;
        }
        isGettingSuggestion.current = true;
        setIsShowRecommendationsLoading(true);
        setSuggestionLoading(prev => ({ ...prev, [activeTab]: true }));
        
        try {
            let suggestionPayload = {
                note: JSON.parse(JSON.stringify(editableData))
            };

            if (transcript) {
                suggestionPayload.transcript = transcript
            }

            if (thread) {
                suggestionPayload.note.thread_id = thread;
            }

            const accessToken = await getAccessToken();
            const response = await axios.post(
                `https://service.prestigedelta.com/documentreview/${reviewid}/generate-suggestions/`,
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
            
            // Switch to Doctor Note tab and scroll to Assessment
            setActiveTab('medicalReview');
            setTimeout(() => {
                if (assessmentRef.current) {
                    assessmentRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 400); // Delay to ensure tab content is rendered

            return true;
        } catch (error) {
            console.error("Error getting suggestions:", error);
            setSnackbarSeverity('error');
            setSnackbarMessage('Failed to generate suggestions.');
            setSnackbarOpen(true);
            // balance check
            try {
                const balanceResult = await balanceCheck("low");
                if (balanceResult && balanceResult.sufficient_funds === false) {
                    setBuyCreditsBalance(balanceResult);
                    setBuyCreditsRequiredAmount(balanceResult.required_amount);
                    setBuyCreditsModalOpen(true);
                }
            } catch (balanceError) {
                console.error("Error checking balance:", balanceError);
            }
            return false;
        } finally {
            setSuggestionLoading(prev => ({ ...prev, [activeTab]: false }));
            setIsShowRecommendationsLoading(false);
            isGettingSuggestion.current = false;
        }
    };    // Function to get suggested questions for the doctor
    const getSuggestedQuestions = async () => {
        // Add validation for reviewid
        if (!reviewid || reviewid === null || reviewid === undefined) {
            setSnackbarSeverity('error');
            setSnackbarMessage('Invalid consultation ID. Cannot generate questions.');
            setSnackbarOpen(true);
            return false;
        }

        if (isGettingSuggestion.current) {
            setSnackbarSeverity('info');
            setSnackbarMessage('An AI process is already running. Please wait for it to complete.');
            setSnackbarOpen(true);
            return;
        }
        
        setIsGenerateQuestionsLoading(true);
        setIsQuestionsLoading(true);
        isGettingSuggestion.current = true;
        
        try {
            let payload = {
                note: {
                    profile_data: editableData?.profile_data || {},
                    goal_data: editableData?.goal_data || {},
                    review_data: editableData?.review_data || {},
                    ...(editableData || {})
                }
            };
            
            // Clean up payload
            if (Object.keys(payload.note.profile_data).length === 0) delete payload.note.profile_data;
            if (Object.keys(payload.note.goal_data).length === 0) delete payload.note.goal_data;
            if (Object.keys(payload.note.review_data).length === 0) delete payload.note.review_data;

            // Add transcript if available
            if (transcript && transcript.length > 0) {
                payload.transcript = transcript;
            }
            
            // Add thread if available
            if (thread) {
                payload.note.thread_id = thread;
            }
            
            const accessToken = await getAccessToken();
            const response = await axios.post(
                `https://service.prestigedelta.com/documentreview/${reviewid}/generate-questions/`,
                payload,
                {
                    headers: { Authorization: `Bearer ${accessToken}` },
                }
            );
            
            const result = response.data;
            console.log("Received suggested questions:", result);
            
            if (result?.insightful_questions) {
                setSuggestedQuestions(result.insightful_questions);
                
                // Switch to the suggested questions tab automatically
                setActiveTab('suggestedQuestions');
                
                setSnackbarSeverity('success');
                setSnackbarMessage('Questions generated successfully!');
                setSnackbarOpen(true);
            } else {
                setSnackbarSeverity('warning');
                setSnackbarMessage('No suggested questions were generated.');
                setSnackbarOpen(true);
            }
            
            return true;
        } catch (error) {
            console.error("Error getting suggested questions:", error);
            setSnackbarSeverity('error');
            setSnackbarMessage('Failed to generate questions.');
            setSnackbarOpen(true);
            // balance check
            try {
                const balanceResult = await balanceCheck("low");
                if (balanceResult && balanceResult.sufficient_funds === false) {
                    setBuyCreditsBalance(balanceResult);
                    setBuyCreditsRequiredAmount(balanceResult.required_amount);
                    setBuyCreditsModalOpen(true);
                }
            } catch (balanceError) {
                console.error("Error checking balance:", balanceError);
            }
            return false;
        } finally {
            setIsGenerateQuestionsLoading(false);
            setIsQuestionsLoading(false);
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
            const response = result.data;
            console.log("Response from submit:", response);
              setSnackbarSeverity('success');
            setSnackbarMessage(`${tabName === 'all' ? 'All' : tabName === 'medicalReview' ? 'Doctor Note' : tabName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} documentation updated successfully!`);
            setSnackbarOpen(true);
            parentalSetIsDocumentationSaved(true);
            setHasChanges(false);
            if (onDocumentationSaved) onDocumentationSaved();
            return true;
        } catch (error) {
            console.error(`Error submitting edits for ${tabName}:`, error);            setSnackbarSeverity('error');
            setSnackbarMessage(`Failed to update ${tabName === 'all' ? 'all' : tabName === 'medicalReview' ? 'Doctor Note' : tabName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} documentation.`);
            setSnackbarOpen(true);
            return false;
        } finally {
            setIsSaving(false);
        }
    };

    const handleTabChange = (tabName) => {
        setActiveTab(tabName);
    };    const saveAllDocumentation = async () => {
        setIsSaveAllLoading(true);
        try {
            // Generate a note first if one hasn't been generated yet
            if (!noteHasBeenGenerated && !isGettingSuggestion.current) {
                setSnackbarSeverity('info');
                setSnackbarMessage('Generating clinical note before saving...');
                setSnackbarOpen(true);
                
                const noteGenerated = await getSuggestion();
                if (!noteGenerated) {
                    throw new Error("Failed to generate clinical note");
                }
            }
            
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
            setIsSaveAllLoading(false);
        }
    };

    const handleDataChange = (tabName, newDataFromChild) => {
        setEditableData(prevEditableData => {
            const newEditableDataState = JSON.parse(JSON.stringify(prevEditableData || {}));
            if (newDataFromChild) {
                if (tabName === 'patientProfile') {
                    newEditableDataState.profile_data = mergeSourceIntoTarget(newEditableDataState.profile_data || {}, newDataFromChild);
                } else if (tabName === 'healthGoals') {
                    newEditableDataState.goal_data = mergeSourceIntoTarget(newEditableDataState.goal_data || {}, newDataFromChild);
                } else if (tabName === 'medicalReview') {
                    newEditableDataState.review_data = mergeSourceIntoTarget(newEditableDataState.review_data || {}, newDataFromChild);
                }
            }
            setHasChanges(true);
            if (onDocumentationChange && (tabName === 'patientProfile' || tabName === 'healthGoals' || tabName === 'medicalReview')) onDocumentationChange();
            return newEditableDataState;
        });
    };

    const applySuggestion = (sectionKey, fieldPath, suggestionValue) => {
        console.log(`Applying suggestion: sectionKey=${sectionKey}, fieldPath=${fieldPath}, value=${ typeof suggestionValue === 'object' ? JSON.stringify(suggestionValue) : suggestionValue}`);
        if (suggestionValue === null || suggestionValue === undefined) {
            console.warn(`Cannot apply null or undefined suggestion for ${sectionKey}.${fieldPath}`);
            setSnackbarSeverity('warning');
            setSnackbarMessage(`Cannot apply empty suggestion for ${fieldPath.split('.').pop()}.`);
            setSnackbarOpen(true);
            return;
        }

        setEditableData(prev => {
            const newData = JSON.parse(JSON.stringify(prev || {})); // Deep clone

            // Ensure the top-level section object/array exists (e.g., newData.review_data)
            if (!newData[sectionKey]) {
                // This assumes sections like 'review_data' are objects. 
                // If a section itself could be an array at the top level of suggestionData,
                // this might need more specific handling based on expected structure.
                newData[sectionKey] = {}; 
            }

            const pathParts = fieldPath.split('.');
            let currentLevel = newData[sectionKey];

            for (let i = 0; i < pathParts.length - 1; i++) {
                const part = pathParts[i];
                const nextPart = pathParts[i + 1];
                const nextPartIsNumber = /^[0-9]+$/.test(nextPart);

                // If the current part doesn't exist, or isn't the correct type (obj/array), create/recreate it.
                if (currentLevel[part] === undefined || currentLevel[part] === null || typeof currentLevel[part] !== 'object') {
                    currentLevel[part] = nextPartIsNumber ? [] : {};
                }
                currentLevel = currentLevel[part];
            }

            const lastPart = pathParts[pathParts.length - 1];
            // Apply the value to the target property or array index
            if (Array.isArray(currentLevel) && /^[0-9]+$/.test(lastPart)) {
                currentLevel[parseInt(lastPart, 10)] = suggestionValue;
            } else {
                currentLevel[lastPart] = suggestionValue;
            }
            
            console.log("Updated editableData in applySuggestion:", JSON.stringify(newData, null, 2));
            setHasChanges(true); // Ensure changes are flagged for saving
            return newData;
        });

        setAppliedSuggestions(prev => {
            const updatedSectionApplied = { ...(prev[sectionKey] || {}) }; 
            updatedSectionApplied[fieldPath] = true;
            const newAppliedSuggestions = {
                ...prev,
                [sectionKey]: updatedSectionApplied,
            };
            console.log("Updated appliedSuggestions:", JSON.stringify(newAppliedSuggestions, null, 2));
            return newAppliedSuggestions;
        });        setSnackbarSeverity('success');
        setSnackbarMessage(`Suggestion for '${fieldPath.split('.').pop()}' in '${sectionKey.replace('_data', '')}' applied!`);
        setSnackbarOpen(true);
    };

    const handleSnackbarClose = (event, reason) => {
        if (reason === 'clickaway') {
            return;
        }
        setSnackbarOpen(false);
    };

    useEffect(() => {
        if (reviewid && (!didFetch.current || resetKey)) {
            setData(null);
            setEditableData(null);
            setSuggestionData(null);
            didFetch.current = false;
            fetchSubscribers();
            didFetch.current = true;
        }
    }, [reviewid, resetKey]);

    // Reset note generation state on component mount or reset
    useEffect(() => {
        setNoteHasBeenGenerated(false);
        isGettingSuggestion.current = false;
        setIsGeneratingNote(false);
    }, [resetKey]);

    useEffect(() => {
        console.log("useEffect in PatientProfile.js (data fetch) - suggestionData changed:", suggestionData);
    }, [suggestionData]);      useImperativeHandle(ref, () => ({
        getSuggestion: getSuggestion,
        handleSubmitFromParent: handleSubmit,
        getSuggestions,
        getSuggestedQuestions,
        dataLoaded: !loading,
        saveAllDocumentation: saveAllDocumentation, // Expose this method
        isGeneratingNote: () => isGeneratingNote || isGettingSuggestion.current, // Expose loading state
        hasNoteBeenGenerated: () => noteHasBeenGenerated, // Expose whether a note has been generated
    }));

    const SuggestionsDialog = () => {
        // Helper function to render array-type suggestions (like prescriptions or investigations)
        const renderArraySuggestion = (arr) => {
            if (!Array.isArray(arr) || arr.length === 0) {
                return "None";
            }
            
            return (
                <Box sx={{ mt: 1 }}>
                    {arr.map((item, idx) => (
                        <Box key={idx} sx={{ 
                            mb: 1, 
                            p: 1, 
                            backgroundColor: '#f5f5f5',
                            borderRadius: '4px',
                            border: '1px solid #e0e0e0'
                        }}>
                            {Object.entries(item).map(([key, value]) => (
                                <Typography key={key} sx={{ fontSize: '0.85rem', mb: 0.5 }}>
                                    <strong>{key.replace(/_/g, ' ')}:</strong> {value}
                                </Typography>
                            ))}
                        </Box>
                    ))}
                </Box>
            );
        };

        // Helper function to format suggestion values for display
        const renderSuggestionValue = (value, field) => {
            if (value === null || value === undefined) {
                return "None";
            }
            
            // Special handling for arrays (like prescriptions or investigations)
            if (Array.isArray(value)) {
                return renderArraySuggestion(value);
            }
            
            // Special handling for objects
            if (typeof value === 'object') {
                return (
                    <Box sx={{ 
                        mt: 1,
                        p: 1, 
                        backgroundColor: '#f5f5f5',
                        borderRadius: '4px',
                        border: '1px solid #e0e0e0' 
                    }}>
                        {Object.entries(value).map(([key, val]) => (
                            <Typography key={key} sx={{ fontSize: '0.85rem', mb: 0.5 }}>
                                <strong>{key.replace(/_/g, ' ')}:</strong> {
                                    typeof val === 'object' ? JSON.stringify(val) : val
                                }
                            </Typography>
                        ))}
                    </Box>
                );
            }
            
            // Simple string/number values
            return String(value);
        };

        // Format field name for display (e.g., "prescription_suggestion" -> "Prescription Suggestion")
        const formatFieldName = (field) => {
            return field
                .split('_')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
        };

        return (
            <Dialog
                open={suggestionDialogOpen}
                onClose={() => setSuggestionDialogOpen(false)}
                maxWidth="md"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: '8px',
                        overflow: 'hidden'
                    }
                }}
            >
                <DialogTitle sx={{ 
                    borderBottom: '1px solid #eaeaea',
                    backgroundColor: '#f8fafc',
                    fontSize: '1.2rem',
                    py: 1.5
                }}>
                    AI Generated Suggestions
                </DialogTitle>
                <DialogContent sx={{ px: isMobile ? 1.5 : 2, py: 2 }}>
                    {suggestionData ? (
                        <Box sx={{ mt: 1 }}>
                            {Object.entries(suggestionData).map(([section, suggestions], index) => {
                                // Make sure suggestions is an object before trying to iterate
                                if (!suggestions || typeof suggestions !== 'object') {
                                    return null;
                                }

                                // Format section name (e.g., "review_data" -> "Review Data")
                                const formattedSection = section
                                    .split('_')
                                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                                    .join(' ');

                                return (
                                    <Box key={section} sx={{ mb: 2.5 }}>
                                        <Typography variant="h6" sx={{ 
                                            mb: 0.75, 
                                            fontSize: isMobile ? '1rem' : '1.1rem',
                                            color: 'primary.main',
                                            borderBottom: '1px solid #f0f0f0',
                                            pb: 0.5
                                        }}>
                                            {formattedSection}
                                        </Typography>
                                        {Object.entries(suggestions).map(([field, suggestionValue], idx) => (
                                            <Box key={`${section}-${field}`} sx={{ 
                                                mb: 1.5, 
                                                backgroundColor: idx % 2 === 0 ? '#f9f9f9' : 'transparent',
                                                p: 1.5, 
                                                borderRadius: 1,
                                                border: '1px solid #eee'
                                            }}>
                                                <Typography variant="subtitle1" sx={{ 
                                                    fontWeight: 'bold',
                                                    fontSize: isMobile ? '0.9rem' : '0.95rem',
                                                    color: 'text.primary'
                                                }}>
                                                    {formatFieldName(field)}:
                                                </Typography>
                                                <Box sx={{ 
                                                    fontSize: isMobile ? '0.85rem' : '0.9rem',
                                                    mb: 1,
                                                    mt: 0.5
                                                }}>
                                                    {renderSuggestionValue(suggestionValue, field)}
                                                </Box>
                                                <Button
                                                    variant="outlined"
                                                    size="small"
                                                    color="primary"
                                                    sx={{ 
                                                        fontSize: '0.8rem',
                                                        py: 0.5,
                                                        height: 28,
                                                        mt: 1
                                                    }}
                                                    onClick={() => applySuggestion(section, field, suggestionValue)}
                                                    disabled={appliedSuggestions[section]?.[field]}
                                                >
                                                    {appliedSuggestions[section]?.[field] ? 'Applied' : 'Apply Suggestion'}
                                                </Button>
                                            </Box>
                                        ))}
                                    </Box>
                                );
                            })}
                        </Box>
                    ) : (
                        <Box sx={{ p: 2, textAlign: 'center' }}>
                            <Typography>No suggestions available.</Typography>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ 
                    borderTop: '1px solid #eaeaea',
                    px: 2,
                    py: 1.5
                }}>
                    <Button 
                        onClick={() => setSuggestionDialogOpen(false)}
                        variant="outlined"
                        size={isMobile ? "small" : "medium"}
                    >
                        Close
                    </Button>
                </DialogActions>
            </Dialog>
        );
    };    if (loading) {
        return <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
            <CircularProgress />
        </Box>;
    }

    if (!data) {
        return <Typography>No data available for this review.</Typography>;
    }

    return (
        <div className="write-documentation-page">
            <ThemeProvider theme={muiTheme}>
                <Container 
                    maxWidth="xl" 
                    sx={{
                        height: '100vh',
                        display: 'flex',
                        flexDirection: 'column',
                        pb: 2,
                        pt: isMobile ? 0.5 : 2,
                        px: isMobile ? 1 : 2
                    }}
                >
                    <Box sx={{ 
                        p: isMobile ? 0.5 : 1.5,
                        display: 'flex', 
                        flexDirection: 'column',
                        flexShrink: 0,
                        borderBottom: '1px solid #eaeaea',
                        backgroundColor: '#f8fafc',
                        borderRadius: '4px 4px 0 0'
                    }}>
                        <Box sx={{ 
                            display: 'flex', 
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            mb: isMobile ? 0.75 : 1.5,
                            gap: 1,
                            flexWrap: 'wrap'
                        }}>
                            {!hideSaveAllButton && (                                <Button
                                    variant="contained"
                                    color="primary"
                                    onClick={getSuggestion}
                                    disabled={isSaving || isGettingSuggestion.current}
                                    size={isMobile ? "small" : "large"}
                                    sx={{ 
                                        minWidth: isMobile ? 100 : 150,
                                        height: isMobile ? 32 : 42,
                                        fontSize: isMobile ? '0.8rem' : '0.95rem',
                                        boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                                        fontWeight: 'bold',
                                        flex: isMobile ? '0 0 auto' : 'inherit',
                                        order: 0
                                    }}                                    startIcon={isSaving ? <CircularProgress size={16} /> : null}
                                >
                                    {isSaving ? 'Generating note...' : 'Generate Note'}
                                </Button>
                            )}
                            <Box sx={{ 
                                display: 'flex', 
                                gap: 1,
                                flexDirection: 'row',
                                alignItems: 'center',
                                flexWrap: 'nowrap',
                                justifyContent: 'flex-end',
                                flex: isMobile ? '1 1 auto' : '0 0 auto'
                            }}>
                                <Button
                                    variant="outlined"
                                    color="primary"
                                    onClick={getSuggestions}
                                    disabled={isShowRecommendationsLoading}
                                    startIcon={isShowRecommendationsLoading ? <CircularProgress size={14} /> : null}
                                    size={isMobile ? "small" : "medium"}
                                    sx={{ 
                                        height: isMobile ? 32 : 36,
                                        fontSize: isMobile ? '0.7rem' : '0.8rem',
                                        textTransform: 'none',
                                        px: isMobile ? 1 : 2,
                                        minWidth: isMobile ? 'auto' : 'inherit',
                                        order: isMobile ? 2 : 1
                                    }}
                                >
                                    {isShowRecommendationsLoading ? 'Loading...' : (isMobile ? 'Recommend' : 'Show Recommendations')}
                                </Button>
                                <Button
                                    variant="outlined"
                                    color="secondary"
                                    onClick={getSuggestedQuestions}
                                    disabled={isGenerateQuestionsLoading}
                                    startIcon={isGenerateQuestionsLoading ? <CircularProgress size={14} /> : null}
                                    size={isMobile ? "small" : "medium"}
                                    sx={{ 
                                        height: isMobile ? 32 : 36,
                                        fontSize: isMobile ? '0.7rem' : '0.8rem',
                                        textTransform: 'none',
                                        px: isMobile ? 1 : 2,
                                        minWidth: isMobile ? 'auto' : 'inherit',
                                        order: isMobile ? 1 : 2
                                    }}
                                >
                                    {isGenerateQuestionsLoading ? 'Loading...' : (isMobile ? 'Questions' : 'Generate Questions')}
                                </Button>
                            </Box>
                        </Box>
                        <NavigationBar activeTab={activeTab} onTabChange={handleTabChange} />
                    </Box>                <Box sx={{ 
                        flex: 1,
                        minHeight: isMobile ? '75vh' : '78vh',
                        maxHeight: isMobile ? 'calc(100vh - 140px)' : 'calc(100vh - 100px)', // Adjusted for mobile
                        overflowY: 'auto',
                        overflowX: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        borderRadius: '0 0 8px 8px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                        bgcolor: 'white',
                        pb: isMobile ? '80px' : 0, // Add padding to bottom for mobile view
                        position: 'relative', // Add position relative for better control
                        '&::-webkit-scrollbar': {
                            width: '8px',
                        },
                        '&::-webkit-scrollbar-track': {
                            backgroundColor: '#f5f5f5',
                            borderRadius: '0 0 8px 0',
                        },
                        '&::-webkit-scrollbar-thumb': {
                            backgroundColor: '#ddd',
                            borderRadius: '4px',
                            '&:hover': {
                                backgroundColor: '#ccc',
                            },
                        },
                    }}>
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
                                onApplySuggestion={(field, value) => applySuggestion('profile_data', field, value)}
                                onSaveProfile={() => handleSubmit('patientProfile')}
                                isSaving={isSaving}
                                isMobile={isMobile}
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
                                onApplySuggestion={(field, value) => applySuggestion('goal_data', field, value)}
                                onSaveGoals={() => handleSubmit('healthGoals')}
                                isSaving={isSaving}
                                isMobile={isMobile}
                            />
                        )}
                        {activeTab === 'medicalReview' && (
                            <MedicalReviewTab
                               className="medical-review-tab"
                                key={JSON.stringify(editableData.review_data)}
                                data={data.review_data}
                                editableData={editableData.review_data}
                                schema={data.review_data_schema}
                                onDataChange={(newData) => handleDataChange('medicalReview', newData)}
                                suggestion={suggestionData?.review_data}
                                appliedSuggestions={appliedSuggestions.review}
                                onApplySuggestion={(field, value) => applySuggestion('review_data', field, value)}
                                onGetSuggestion={getSuggestion}
                                onSaveReview={() => handleSubmit('medicalReview')}
                                isDocumenting={isSaving}
                                isSavingReview={isSaving}
                                isMobile={isMobile}
                            />
                        )}
                        {activeTab === 'suggestedQuestions' && (
                            <SuggestedQuestionsTab
                                questions={suggestedQuestions}
                                isLoading={isQuestionsLoading}
                                isMobile={isMobile}
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
                    <BuyCreditsModal
                        open={buyCreditsModalOpen}
                        onClose={() => setBuyCreditsModalOpen(false)}
                        balance={buyCreditsBalance}
                        requiredAmount={buyCreditsRequiredAmount}
                    />
                </Container>
            </ThemeProvider>
        </div>
    );
});

export default PatientProfile;