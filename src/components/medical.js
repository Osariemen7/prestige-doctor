import React, { useState, useEffect } from 'react';
import { Paper, Typography, Grid, TextField, Button, Box, IconButton, FormControl, InputLabel, Select, MenuItem, useMediaQuery } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import format from 'date-fns/format';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import SendIcon from '@mui/icons-material/Send';
import VisibilityIcon from '@mui/icons-material/Visibility';

// Helper function to safely format date strings
const safeFormatDateString = (dateString, options = { year: 'numeric', month: 'long', day: 'numeric' }) => {
    if (!dateString) {
        return 'N/A';
    }
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        return dateString;
    }
    return date.toLocaleDateString(undefined, options);
};

// Helper function to safely format time strings
const safeFormatTimeString = (dateString, options = { hour: '2-digit', minute: '2-digit' }) => {
    if (!dateString) {
        return 'N/A';
    }
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        return dateString;
    }
    return date.toLocaleTimeString(undefined, options);
};

// Changed prop name from isPaused to isDocumenting
function MedicalReviewTab({ data, editableData, schema, onDataChange, suggestion, appliedSuggestions, onApplySuggestion, onGetSuggestion, isGeneratingSuggestion, isSavingReview, hasChanges, onSaveReview, assessmentRef, isMobile, isDocumenting }) {
    const [localData, setLocalData] = useState(() => {
        return editableData || data || {
            subjective: { chief_complaint: '', history_of_present_illness: '', review_of_systems: '' },
            objective: { examination_findings: '', investigations: '' },
            assessment: { primary_diagnosis: '', differential_diagnosis: '', diagnosis_reasoning: '', status: '' },
            plan: { management: '', lifestyle_advice: '', follow_up: '', patient_education: '', treatment_goal: '', plan_reasoning: '' },
            prescription: [],
            investigation: [],
            next_review: '',
            summary: { health_score: 0, daily_progress_notes: '', discharge_instructions: '' }
        };
    });
    const [isEditing, setIsEditing] = useState(false);

    // Log suggestion data for debugging
    useEffect(() => {
        if (suggestion) {
            console.log("MedicalReviewTab received suggestion data:", suggestion);
            console.log("Prescription suggestions:", suggestion.prescription_suggestion);
            console.log("Investigation suggestions:", suggestion.investigation_suggestion);
        }
    }, [suggestion]);

    // Sync localData only when starting to edit, preserving applied suggestions thereafter
    useEffect(() => {
        if (isEditing) {
            setLocalData(editableData ? JSON.parse(JSON.stringify(editableData)) : (prev => prev));
        }
    }, [isEditing]);

    const handleInputChange = (field, value) => {
        setLocalData(prevData => ({
            ...prevData,
            [field]: value // Directly update top-level fields if any (though most are nested)
        }));
    };

    const handleNestedInputChange = (section, field, value) => {
        setLocalData(prevData => ({
            ...prevData,
            [section]: {
                ...(prevData[section] || {}),
                [field]: value
            }
        }));
    };

    const handlePrescriptionChange = (index, field, value) => {
        const updatedPrescriptions = [...(localData.prescription || [])];
        updatedPrescriptions[index] = {
            ...(updatedPrescriptions[index] || {}),
            [field]: value
        };

        setLocalData(prevData => ({
            ...prevData,
            prescription: updatedPrescriptions
        }));
    };

    const handleInvestigationChange = (index, field, value) => {
        const updatedInvestigations = [...(localData.investigation || [])];
        updatedInvestigations[index] = {
            ...(updatedInvestigations[index] || {}),
            [field]: value
        };

        setLocalData(prevData => ({
            ...prevData,
            investigation: updatedInvestigations
        }));
    };

    const handleAddPrescription = () => {
        const newPrescription = {
            medication_name: '',
            dosage: '',
            route: '',
            frequency: '',
            duration: '',
            instructions: ''
        };

        setLocalData(prevData => ({
            ...prevData,
            prescription: [...(prevData.prescription || []), newPrescription]
        }));
    };

    const handleAddInvestigation = () => {
        const newInvestigation = {
            test_type: '',
            reason: '',
            instructions: '',
            schedule_time: format(new Date(), "yyyy-MM-dd'T'HH:mm")
        };

        setLocalData(prevData => ({
            ...prevData,
            investigation: [...(prevData.investigation || []), newInvestigation]
        }));
    };

    const handleRemovePrescription = (index) => {
        const updatedPrescriptions = [...(localData.prescription || [])];
        updatedPrescriptions.splice(index, 1);

        setLocalData(prevData => ({
            ...prevData,
            prescription: updatedPrescriptions
        }));
    };

    const handleRemoveInvestigation = (index) => {
        const updatedInvestigations = [...(localData.investigation || [])];
        updatedInvestigations.splice(index, 1);

        setLocalData(prevData => ({
            ...prevData,
            investigation: updatedInvestigations
        }));
    };

    const startEditing = () => {
        setIsEditing(true);
    };

    const saveChanges = () => {
        onDataChange(localData); // update parent state
        // Removed API call for saving; only update state and switch mode
        setIsEditing(false);
    };

    const cancelEditing = () => {
        setIsEditing(false); // isEditing state change will trigger useEffect to reset localData
    };

    const handleLocalApplySuggestion = (field, value) => {
        setLocalData(prevData => {
            const updatedData = {...prevData};
            if (field.startsWith('assessment.')) {
                const subField = field.split('.')[1];
                updatedData.assessment = {...updatedData.assessment, [subField]: value};
            } else if (field.startsWith('plan.')) {
                const subField = field.split('.')[1];
                updatedData.plan = {...updatedData.plan, [subField]: value};
            } else if (field === 'next_review') {
                updatedData.next_review = value;
            } else if (field.startsWith('prescription_suggestion[')) {
                // Apply single prescription suggestion: replace or append
                const medName = value.medication_name;
                const idx = updatedData.prescription.findIndex(p => p.medication_name === medName);
                if (idx > -1) {
                    updatedData.prescription[idx] = value;
                } else {
                    updatedData.prescription = [...(updatedData.prescription || []), value];
                }
            } else if (field === 'prescription_suggestion') {
                // When applying all prescription suggestions, copy them to the prescription field
                if (Array.isArray(value) && value.length > 0) {
                    updatedData.prescription = updatedData.prescription || [];
                    value.forEach(val => {
                        const medName = val.medication_name;
                        const idx = updatedData.prescription.findIndex(p => p.medication_name === medName);
                        if (idx > -1) {
                            updatedData.prescription[idx] = val;
                        } else {
                            updatedData.prescription.push(val);
                        }
                    });
                }
            } else if (field.startsWith('investigation_suggestion[')) {
                // Apply single investigation suggestion: replace or append
                const testType = value.test_type;
                const idxInv = updatedData.investigation.findIndex(i => i.test_type === testType);
                if (idxInv > -1) {
                    updatedData.investigation[idxInv] = value;
                } else {
                    updatedData.investigation = [...(updatedData.investigation || []), value];
                }
            } else if (field === 'investigation_suggestion') {
                // When applying all investigation suggestions, copy them to the investigation field
                if (Array.isArray(value) && value.length > 0) {
                    updatedData.investigation = updatedData.investigation || [];
                    value.forEach(val => {
                        const testType = val.test_type;
                        const idxInv = updatedData.investigation.findIndex(i => i.test_type === testType);
                        if (idxInv > -1) {
                            updatedData.investigation[idxInv] = val;
                        } else {
                            updatedData.investigation.push(val);
                        }
                    });
                }
            }
            return updatedData;
        });
        
        // For bulk prescription and investigation applications, mark all individual items as applied
        if (field === 'prescription_suggestion' && Array.isArray(value)) {
            // Mark each prescription suggestion as applied individually
            value.forEach((prescription, index) => {
                onApplySuggestion(`prescription_suggestion[${index}]`, prescription);
            });
        } else if (field === 'investigation_suggestion' && Array.isArray(value)) {
            // Mark each investigation suggestion as applied individually
            value.forEach((investigation, index) => {
                onApplySuggestion(`investigation_suggestion[${index}]`, investigation);
            });
        } else {
            // For other fields, just call the normal apply suggestion
            onApplySuggestion(field, value);
        }
    };

    const handleCopyReview = () => {
        const reviewText = formatReviewForEMR(localData);
        navigator.clipboard.writeText(reviewText).then(() => {
            alert('Doctor Note copied to clipboard!');
        });
    };

    const formatReviewForEMR = (reviewData) => {
        let emrText = "DOCTOR NOTE:\n";

        if (reviewData.subjective) {
            emrText += "\nSUBJECTIVE:\n";
            emrText += `  Chief Complaint: ${reviewData.subjective.chief_complaint || ''}\n`;
            emrText += `  History of Present Illness: ${reviewData.subjective.history_of_present_illness || ''}\n`;
            emrText += `  Review of Systems: ${reviewData.subjective.review_of_systems || ''}\n`;
        }

        if (reviewData.objective) {
            emrText += "\nOBJECTIVE:\n";
            emrText += `  Examination Findings: ${reviewData.objective.examination_findings || ''}\n`;
            emrText += `  Investigations: ${reviewData.objective.investigations || ''}\n`;
        }

        if (reviewData.assessment) {
            emrText += "\nASSESSMENT:\n";
            emrText += `  Primary Diagnosis: ${reviewData.assessment.primary_diagnosis || ''}\n`;
            emrText += `  Differential Diagnosis: ${reviewData.assessment.differential_diagnosis || ''}\n`;
            emrText += `  Diagnosis Reasoning: ${reviewData.assessment.diagnosis_reasoning || ''}\n`;
            emrText += `  Status: ${reviewData.assessment.status || ''}\n`;
        }

        if (reviewData.plan) {
            emrText += "\nPLAN:\n";
            emrText += `  Management: ${reviewData.plan.management || ''}\n`;
            emrText += `  Lifestyle Advice: ${reviewData.plan.lifestyle_advice || ''}\n`;
            emrText += `  Follow Up: ${reviewData.plan.follow_up || ''}\n`;
            emrText += `  Patient Education: ${reviewData.plan.patient_education || ''}\n`;
            emrText += `  Treatment Goal: ${reviewData.plan.treatment_goal || ''}\n`;
            emrText += `  Plan Reasoning: ${reviewData.plan.plan_reasoning || ''}\n`;
        }

        if (reviewData.prescription && reviewData.prescription.length > 0) {
            emrText += "\nPRESCRIPTIONS:\n";
            reviewData.prescription.forEach((prescription, index) => {
                emrText += `  ${index + 1}. ${prescription.medication_name || ''} - ${prescription.dosage || ''}\n`;
                emrText += `     Route: ${prescription.route || ''}, Frequency: ${prescription.frequency || ''}\n`;
                emrText += `     Duration: ${prescription.duration || ''}\n`;
                emrText += `     Instructions: ${prescription.instructions || ''}\n`;
            });
        }

        if (reviewData.investigation && reviewData.investigation.length > 0) {
            emrText += "\nINVESTIGATIONS:\n";
            reviewData.investigation.forEach((investigation, index) => {
                emrText += `  ${index + 1}. ${investigation.test_type || ''}\n`;
                emrText += `     Reason: ${investigation.reason || ''}\n`;
                emrText += `     Instructions: ${investigation.instructions || ''}\n`;
                emrText += `     Schedule: ${safeFormatDateString(investigation.schedule_time)} ${safeFormatTimeString(investigation.schedule_time)}\n`;
            });
        }

        if (reviewData.next_review) {
            emrText += `\nNEXT REVIEW: ${safeFormatDateString(reviewData.next_review)} ${safeFormatTimeString(reviewData.next_review)}\n`;
        }

        return emrText;
    };

    const renderPrescriptionSuggestions = () => {
        if (!suggestion?.prescription_suggestion || 
            !Array.isArray(suggestion.prescription_suggestion) || 
            suggestion.prescription_suggestion.length === 0) {
            return null;
        }
        
        // Check if all individual prescription suggestions are marked as applied
        const allApplied = suggestion.prescription_suggestion.every((_, idx) => 
            appliedSuggestions?.[`prescription_suggestion[${idx}]`]
        );
        
        // If all suggestions are already applied, don't render the suggestions box
        if (allApplied) {
            return null;
        }
        
        // Filter out any already applied suggestions
        const unappliedSuggestions = suggestion.prescription_suggestion.filter((prescription, idx) => 
            !appliedSuggestions?.[`prescription_suggestion[${idx}]`] &&
            !(localData.prescription || []).some(p => p.medication_name === prescription.medication_name)
        );
        // If no suggestions left to apply, hide the suggestions box
        if (unappliedSuggestions.length === 0) return null;
        
        return (
            <Box sx={{
                border: '1px solid #f0f0b8',
                borderRadius: 1,
                p: 2,
                mb: 4,
                bgcolor: '#ffffd7'
            }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#5c5c00' }}>
                        AI Suggested Prescriptions ({unappliedSuggestions.length})
                    </Typography>
                    <Button
                        variant="contained"
                        color="primary"
                        size="small"
                        onClick={() => handleLocalApplySuggestion('prescription_suggestion', unappliedSuggestions)}
                    >
                        Apply All
                    </Button>
                </Box>
                {unappliedSuggestions.map((prescriptionSuggestion, idx) => {
                    // Find the original index in the full suggestion array
                    const originalIndex = suggestion.prescription_suggestion.findIndex(
                        item => JSON.stringify(item) === JSON.stringify(prescriptionSuggestion)
                    );
                    
                    return (
                        <Box key={originalIndex} sx={{ 
                            mb: 3,
                            p: 2,
                            bgcolor: '#fffff0',
                            borderRadius: 1,
                            border: '1px dashed #d6d68c'
                        }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 'bold' }}>
                                    Suggested Prescription {originalIndex + 1}
                                </Typography>
                                <Button
                                    variant="outlined"
                                    color="primary"
                                    size="small"
                                    onClick={() => handleLocalApplySuggestion(`prescription_suggestion[${originalIndex}]`, prescriptionSuggestion)}
                                >
                                    Apply
                                </Button>
                            </Box>
                            <Grid container spacing={2}>
                                <Grid item xs={12} md={6}>
                                    <Typography variant="subtitle2" color="text.secondary">Medication Name</Typography>
                                    <Typography variant="body1">{prescriptionSuggestion.medication_name || ''}</Typography>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <Typography variant="subtitle2" color="text.secondary">Dosage</Typography>
                                    <Typography variant="body1">{prescriptionSuggestion.dosage || ''}</Typography>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <Typography variant="subtitle2" color="text.secondary">Route</Typography>
                                    <Typography variant="body1">{prescriptionSuggestion.route || ''}</Typography>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <Typography variant="subtitle2" color="text.secondary">Interval</Typography>
                                    <Typography variant="body1">{prescriptionSuggestion.interval || ''} hours</Typography>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <Typography variant="subtitle2" color="text.secondary">End Date</Typography>
                                    <Typography variant="body1">{prescriptionSuggestion.end_date || ''}</Typography>
                                </Grid>
                                <Grid item xs={12}>
                                    <Typography variant="subtitle2" color="text.secondary">Instructions</Typography>
                                    <Typography variant="body1">{prescriptionSuggestion.instructions || ''}</Typography>
                                </Grid>
                            </Grid>
                        </Box>
                    );
                })}
            </Box>
        );
    };

    const renderInvestigationSuggestions = () => {
        if (!suggestion?.investigation_suggestion || 
            !Array.isArray(suggestion.investigation_suggestion) || 
            suggestion.investigation_suggestion.length === 0) {
            return null;
        }
        
        // Check if all individual investigation suggestions are marked as applied
        const allApplied = suggestion.investigation_suggestion.every((_, idx) => 
            appliedSuggestions?.[`investigation_suggestion[${idx}]`]
        );
        
        // If all suggestions are already applied, don't render the suggestions box
        if (allApplied) {
            return null;
        }
        
        // Filter out any already applied suggestions
        const unappliedSuggestions = suggestion.investigation_suggestion.filter((investigation, idx) => 
            !appliedSuggestions?.[`investigation_suggestion[${idx}]`] &&
            !(localData.investigation || []).some(i => i.test_type === investigation.test_type)
        );
        // If no suggestions left to apply, hide the suggestions box
        if (unappliedSuggestions.length === 0) return null;
        
        return (
            <Box sx={{
                border: '1px solid #f0f0b8',
                borderRadius: 1,
                p: 2,
                mb: 4,
                bgcolor: '#ffffd7'
            }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#5c5c00' }}>
                        AI Suggested Investigations ({unappliedSuggestions.length})
                    </Typography>
                    <Button
                        variant="contained"
                        color="primary"
                        size="small"
                        onClick={() => handleLocalApplySuggestion('investigation_suggestion', unappliedSuggestions)}
                    >
                        Apply All
                    </Button>
                </Box>
                {unappliedSuggestions.map((investigationSuggestion, idx) => {
                    // Find the original index in the full suggestion array
                    const originalIndex = suggestion.investigation_suggestion.findIndex(
                        item => JSON.stringify(item) === JSON.stringify(investigationSuggestion)
                    );
                    
                    return (
                        <Box key={originalIndex} sx={{ 
                            mb: 3,
                            p: 2,
                            bgcolor: '#fffff0',
                            borderRadius: 1,
                            border: '1px dashed #d6d68c'
                        }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 'bold' }}>
                                    Suggested Investigation {originalIndex + 1}
                                </Typography>
                                <Button
                                    variant="outlined"
                                    color="primary"
                                    size="small"
                                    onClick={() => handleLocalApplySuggestion(`investigation_suggestion[${originalIndex}]`, investigationSuggestion)}
                                >
                                    Apply
                                </Button>
                            </Box>
                            <Grid container spacing={2}>
                                <Grid item xs={12} md={6}>
                                    <Typography variant="subtitle2" color="text.secondary">Test Type</Typography>
                                    <Typography variant="body1">{investigationSuggestion.test_type || ''}</Typography>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <Typography variant="subtitle2" color="text.secondary">Schedule Time</Typography>
                                    <Typography variant="body1">
                                        {investigationSuggestion.schedule_time ? 
                                         `${safeFormatDateString(investigationSuggestion.schedule_time)} ${safeFormatTimeString(investigationSuggestion.schedule_time)}` : ''}
                                    </Typography>
                                </Grid>
                                <Grid item xs={12}>
                                    <Typography variant="subtitle2" color="text.secondary">Reason</Typography>
                                    <Typography variant="body1">{investigationSuggestion.reason || ''}</Typography>
                                </Grid>
                                <Grid item xs={12}>
                                    <Typography variant="subtitle2" color="text.secondary">Instructions</Typography>
                                    <Typography variant="body1">{investigationSuggestion.instructions || ''}</Typography>
                                </Grid>
                            </Grid>
                        </Box>
                    );
                })}
            </Box>
        );
    };

    const renderSuggestionItem = (suggestionValue, currentValue, applySuggestionHandler, fieldName) => {
        if (suggestionValue !== undefined && 
            suggestionValue !== null && 
            suggestionValue !== '' && 
            suggestionValue !== currentValue && 
            !appliedSuggestions?.[fieldName]) {
            
            return (
                <Box sx={{
                    mt: 1,
                    bgcolor: '#f5f5dc',
                    p: 1,
                    borderRadius: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mr: 1 }}>
                        Suggestion: {suggestionValue}
                    </Typography>
                    <Button
                        variant="outlined"
                        color="primary"
                        size="small"
                        onClick={() => applySuggestionHandler(fieldName, suggestionValue)}
                    >
                        Apply
                    </Button>
                </Box>
            );
        }
        return null;
    };

    if (isDocumenting) {
        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: 'calc(100vh - 250px)',
                height: '100%',
                padding: '20px',
                textAlign: 'center',
                boxSizing: 'border-box'
            }}>
                <style>
                    {`
                        .loader-medical-tab {
                            border: 5px solid #f3f3f3; /* Light grey */
                            border-top: 5px solid #3498db; /* Blue */
                            border-radius: 50%;
                            width: 50px;
                            height: 50px;
                            animation: spin-medical-tab 1s linear infinite;
                            margin-bottom: 20px;
                        }
                        @keyframes spin-medical-tab {
                            0% { transform: rotate(0deg); }
                            100% { transform: rotate(360deg); }
                        }
                    `}
                </style>
                <div className="loader-medical-tab"></div>
                <h3 style={{ marginBottom: '10px', fontSize: '1.2em', color: '#333' }}>Generating Clinical Note...</h3>
                <p style={{ fontSize: '0.9em', color: '#555', maxWidth: '400px' }}>
                    The AI is currently processing the information to create a comprehensive clinical note. 
                    This may take a few moments. Please wait.
                </p>
            </div>
        );
    }

    return (
        <Paper elevation={2} sx={{ 
            padding: isMobile ? 2 : 3, 
            mt: 2,
            pb: isMobile ? 6 : 8
        }}>
            <Box sx={{ 
                display: 'flex', 
                flexDirection: isMobile ? 'column' : 'row',
                justifyContent: 'space-between', 
                alignItems: isMobile ? 'flex-start' : 'center', 
                mb: 2 
            }}>
                <Typography variant="h5" gutterBottom={isMobile ? false : true}>Doctor Note</Typography>
                <Box sx={{ 
                    display: 'flex', 
                    flexDirection: isMobile ? 'column' : 'row',
                    width: isMobile ? '100%' : 'auto',
                    gap: isMobile ? 1 : 0,
                    mt: isMobile ? 1 : 0
                }}>
                    <Button
                        variant="outlined"
                        startIcon={<ContentCopyIcon />}
                        onClick={handleCopyReview}
                        sx={{ mr: isMobile ? 0 : 1 }}
                        size={isMobile ? "small" : "medium"}
                        fullWidth={isMobile}
                    >
                        Copy Note
                    </Button>
                    {!isEditing ? (
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={startEditing}
                            startIcon={<EditIcon />}
                            disabled={isGeneratingSuggestion}
                            size={isMobile ? "small" : "medium"}
                            fullWidth={isMobile}
                        >
                            Edit Note
                        </Button>
                    ) : (
                        <Box sx={{
                            display: 'flex',
                            flexDirection: isMobile ? 'column' : 'row',
                            width: isMobile ? '100%' : 'auto',
                            gap: isMobile ? 1 : 0
                        }}>
                            <Button
                                variant="outlined"
                                startIcon={<VisibilityIcon />}
                                onClick={cancelEditing}
                                sx={{ mr: isMobile ? 0 : 1 }}
                                size={isMobile ? "small" : "medium"}
                                fullWidth={isMobile}
                            >
                                View Note
                            </Button>
                            <Button
                                variant="contained"
                                color="primary"
                                onClick={saveChanges}
                                size={isMobile ? "small" : "medium"}
                                fullWidth={isMobile}
                                startIcon={<SaveIcon />}
                                disabled={isSavingReview}
                            >
                                Save Note
                            </Button>
                        </Box>
                    )}
                </Box>
            </Box>
            {/* Subjective Section */}
            <Typography variant="h6" sx={{ mt: 3, mb: 2, borderBottom: '1px solid #eee', pb: 1, fontSize: isMobile ? '1rem' : '1.25rem' }}>Subjective</Typography>
            <Grid container spacing={isMobile ? 1 : 2}>
                <Grid item xs={12}>
                    {!isEditing ? (
                        <>
                            <Typography variant="subtitle2" color="text.secondary">Chief Complaint</Typography>
                            <Typography variant="body1">{localData.subjective?.chief_complaint || ''}</Typography>
                        </>
                    ) : (
                        <TextField
                            label="Chief Complaint"
                            fullWidth
                            margin="normal"
                            value={localData.subjective?.chief_complaint || ''}
                            onChange={(e) => handleNestedInputChange('subjective', 'chief_complaint', e.target.value)}
                            variant="outlined"
                        />
                    )}
                </Grid>
                <Grid item xs={12}>
                    {!isEditing ? (
                        <>
                            <Typography variant="subtitle2" color="text.secondary">History of Present Illness</Typography>
                            <Typography variant="body1">{localData.subjective?.history_of_present_illness || ''}</Typography>
                        </>
                    ) : (
                        <TextField
                            label="History of Present Illness"
                            fullWidth
                            margin="normal"
                            multiline
                            rows={3}
                            value={localData.subjective?.history_of_present_illness || ''}
                            onChange={(e) => handleNestedInputChange('subjective', 'history_of_present_illness', e.target.value)}
                            variant="outlined"
                        />
                    )}
                </Grid>
                <Grid item xs={12}>
                    {!isEditing ? (
                        <>
                            <Typography variant="subtitle2" color="text.secondary">Review of Systems</Typography>
                            <Typography variant="body1">{localData.subjective?.review_of_systems || ''}</Typography>
                        </>
                    ) : (
                        <TextField
                            label="Review of Systems"
                            fullWidth
                            margin="normal"
                            multiline
                            rows={3}
                            value={localData.subjective?.review_of_systems || ''}
                            onChange={(e) => handleNestedInputChange('subjective', 'review_of_systems', e.target.value)}
                            variant="outlined"
                        />
                    )}
                </Grid>
            </Grid>
            {/* Objective Section */}
            <Typography variant="h6" sx={{ mt: 3, mb: 2, borderBottom: '1px solid #eee', pb: 1, fontSize: isMobile ? '1rem' : '1.25rem' }}>Objective</Typography>
            <Grid container spacing={isMobile ? 1 : 2}>
                <Grid item xs={12} md={6}>
                    {!isEditing ? (
                        <>
                            <Typography variant="subtitle2" color="text.secondary">Examination Findings</Typography>
                            <Typography variant="body1">{localData.objective?.examination_findings || ''}</Typography>
                        </>
                    ) : (
                        <TextField
                            label="Examination Findings"
                            fullWidth
                            margin="normal"
                            multiline
                            rows={2}
                            value={localData.objective?.examination_findings || ''}
                            onChange={(e) => handleNestedInputChange('objective', 'examination_findings', e.target.value)}
                            variant="outlined"
                        />
                    )}
                </Grid>
                <Grid item xs={12} md={6}>
                    {!isEditing ? (
                        <>
                            <Typography variant="subtitle2" color="text.secondary">Investigations</Typography>
                            <Typography variant="body1">{localData.objective?.investigations || ''}</Typography>
                        </>
                    ) : (
                        <TextField
                            label="Investigations"
                            fullWidth
                            margin="normal"
                            multiline
                            rows={2}
                            value={localData.objective?.investigations || ''}
                            onChange={(e) => handleNestedInputChange('objective', 'investigations', e.target.value)}
                            variant="outlined"
                        />
                    )}
                </Grid>
            </Grid>
            {/* Assessment Section */}
            <Typography
                variant="h6"
                sx={{ mt: 3, mb: 2, borderBottom: '1px solid #eee', pb: 1, fontSize: isMobile ? '1rem' : '1.25rem' }}
                ref={assessmentRef}
            >Assessment</Typography>
            <Grid container spacing={isMobile ? 1 : 2}>
                <Grid item xs={12} md={6}>
                    {!isEditing ? (
                        <>
                            <Typography variant="subtitle2" color="text.secondary">Primary Diagnosis</Typography>
                            <Typography variant="body1">{localData.assessment?.primary_diagnosis || ''}</Typography>
                            {renderSuggestionItem(
                                suggestion?.assessment_suggestion?.primary_diagnosis,
                                localData.assessment?.primary_diagnosis,
                                handleLocalApplySuggestion,
                                'assessment.primary_diagnosis'
                            )}
                        </>
                    ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                            <TextField
                                label="Primary Diagnosis"
                                fullWidth
                                margin="normal"
                                value={localData.assessment?.primary_diagnosis || ''}
                                onChange={(e) => handleNestedInputChange('assessment', 'primary_diagnosis', e.target.value)}
                                variant="outlined"
                            />
                            {renderSuggestionItem(
                                suggestion?.assessment_suggestion?.primary_diagnosis,
                                localData.assessment?.primary_diagnosis,
                                handleLocalApplySuggestion,
                                'assessment.primary_diagnosis'
                            )}
                        </Box>
                    )}
                </Grid>
                <Grid item xs={12} md={6}>
                    {!isEditing ? (
                        <>
                            <Typography variant="subtitle2" color="text.secondary">Differential Diagnosis</Typography>
                            <Typography variant="body1">{localData.assessment?.differential_diagnosis || ''}</Typography>
                            {renderSuggestionItem(
                                suggestion?.assessment_suggestion?.differential_diagnosis,
                                localData.assessment?.differential_diagnosis,
                                handleLocalApplySuggestion,
                                'assessment.differential_diagnosis'
                            )}
                        </>
                    ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                            <TextField
                                label="Differential Diagnosis"
                                fullWidth
                                margin="normal"
                                value={localData.assessment?.differential_diagnosis || ''}
                                onChange={(e) => handleNestedInputChange('assessment', 'differential_diagnosis', e.target.value)}
                                variant="outlined"
                            />
                            {renderSuggestionItem(
                                suggestion?.assessment_suggestion?.differential_diagnosis,
                                localData.assessment?.differential_diagnosis,
                                handleLocalApplySuggestion,
                                'assessment.differential_diagnosis'
                            )}
                        </Box>
                    )}
                </Grid>
                <Grid item xs={12}>
                    {!isEditing ? (
                        <>
                            <Typography variant="subtitle2" color="text.secondary">Diagnosis Reasoning</Typography>
                            <Typography variant="body1">{localData.assessment?.diagnosis_reasoning || ''}</Typography>
                            {renderSuggestionItem(
                                suggestion?.assessment_suggestion?.diagnosis_reasoning,
                                localData.assessment?.diagnosis_reasoning,
                                handleLocalApplySuggestion,
                                'assessment.diagnosis_reasoning'
                            )}
                        </>
                    ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                            <TextField
                                label="Diagnosis Reasoning"
                                fullWidth
                                margin="normal"
                                multiline
                                rows={2}
                                value={localData.assessment?.diagnosis_reasoning || ''}
                                onChange={(e) => handleNestedInputChange('assessment', 'diagnosis_reasoning', e.target.value)}
                                variant="outlined"
                            />
                            {renderSuggestionItem(
                                suggestion?.assessment_suggestion?.diagnosis_reasoning,
                                localData.assessment?.diagnosis_reasoning,
                                handleLocalApplySuggestion,
                                'assessment.diagnosis_reasoning'
                            )}
                        </Box>
                    )}
                </Grid>
                <Grid item xs={12} md={6}>
                    {!isEditing ? (
                        <>
                            <Typography variant="subtitle2" color="text.secondary">Status</Typography>
                            <Typography variant="body1">{localData.assessment?.status || ''}</Typography>
                            {renderSuggestionItem(
                                suggestion?.assessment_suggestion?.status,
                                localData.assessment?.status,
                                handleLocalApplySuggestion,
                                'assessment.status'
                            )}
                        </>
                    ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                            <FormControl fullWidth margin="normal" variant="outlined">
                                <InputLabel id="status-label">Status</InputLabel>
                                <Select
                                    labelId="status-label"
                                    value={localData.assessment?.status || ''}
                                    label="Status"
                                    onChange={(e) => handleNestedInputChange('assessment', 'status', e.target.value)}
                                >
                                    <MenuItem value="stable">Stable</MenuItem>
                                    <MenuItem value="improving">Improving</MenuItem>
                                    <MenuItem value="worsening">Worsening</MenuItem>
                                    <MenuItem value="resolved">Resolved</MenuItem>
                                    <MenuItem value="unknown">Unknown</MenuItem>
                                </Select>
                            </FormControl>
                            {renderSuggestionItem(
                                suggestion?.assessment_suggestion?.status,
                                localData.assessment?.status,
                                handleLocalApplySuggestion,
                                'assessment.status'
                            )}
                        </Box>
                    )}
                </Grid>
            </Grid>
            {/* Plan Section */}
            <Typography variant="h6" sx={{ mt: 3, mb: 2, borderBottom: '1px solid #eee', pb: 1, fontSize: isMobile ? '1rem' : '1.25rem' }}>Plan</Typography>
            <Grid container spacing={isMobile ? 1 : 2}>
                <Grid item xs={12}>
                    {!isEditing ? (
                        <>
                            <Typography variant="subtitle2" color="text.secondary">Management</Typography>
                            <Typography variant="body1">{localData.plan?.management || ''}</Typography>
                            {renderSuggestionItem(
                                suggestion?.plan_suggestion?.management,
                                localData.plan?.management,
                                handleLocalApplySuggestion,
                                'plan.management'
                            )}
                        </>
                    ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                            <TextField
                                label="Management"
                                fullWidth
                                margin="normal"
                                multiline
                                rows={2}
                                value={localData.plan?.management || ''}
                                onChange={(e) => handleNestedInputChange('plan', 'management', e.target.value)}
                                variant="outlined"
                            />
                            {renderSuggestionItem(
                                suggestion?.plan_suggestion?.management,
                                localData.plan?.management,
                                handleLocalApplySuggestion,
                                'plan.management'
                            )}
                        </Box>
                    )}
                </Grid>
                <Grid item xs={12}>
                    {!isEditing ? (
                        <>
                            <Typography variant="subtitle2" color="text.secondary">Lifestyle Advice</Typography>
                            <Typography variant="body1">{localData.plan?.lifestyle_advice || ''}</Typography>
                            {renderSuggestionItem(
                                suggestion?.plan_suggestion?.lifestyle_advice,
                                localData.plan?.lifestyle_advice,
                                handleLocalApplySuggestion,
                                'plan.lifestyle_advice'
                            )}
                        </>
                    ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                            <TextField
                                label="Lifestyle Advice"
                                fullWidth
                                margin="normal"
                                multiline
                                rows={2}
                                value={localData.plan?.lifestyle_advice || ''}
                                onChange={(e) => handleNestedInputChange('plan', 'lifestyle_advice', e.target.value)}
                                variant="outlined"
                            />
                            {renderSuggestionItem(
                                suggestion?.plan_suggestion?.lifestyle_advice,
                                localData.plan?.lifestyle_advice,
                                handleLocalApplySuggestion,
                                'plan.lifestyle_advice'
                            )}
                        </Box>
                    )}
                </Grid>
                <Grid item xs={12} md={6}>
                    {!isEditing ? (
                        <>
                            <Typography variant="subtitle2" color="text.secondary">Follow Up</Typography>
                            <Typography variant="body1">{localData.plan?.follow_up || ''}</Typography>
                            {renderSuggestionItem(
                                suggestion?.plan_suggestion?.follow_up,
                                localData.plan?.follow_up,
                                handleLocalApplySuggestion,
                                'plan.follow_up'
                            )}
                        </>
                    ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                            <TextField
                                label="Follow Up"
                                fullWidth
                                margin="normal"
                                value={localData.plan?.follow_up || ''}
                                onChange={(e) => handleNestedInputChange('plan', 'follow_up', e.target.value)}
                                variant="outlined"
                            />
                            {renderSuggestionItem(
                                suggestion?.plan_suggestion?.follow_up,
                                localData.plan?.follow_up,
                                handleLocalApplySuggestion,
                                'plan.follow_up'
                            )}
                        </Box>
                    )}
                </Grid>
                <Grid item xs={12} md={6}>
                    {!isEditing ? (
                        <>
                            <Typography variant="subtitle2" color="text.secondary">Next Review</Typography>
                            <Typography variant="body1">
                                {localData.next_review ? `${safeFormatDateString(localData.next_review)} ${safeFormatTimeString(localData.next_review)}` : ''}
                            </Typography>
                            {renderSuggestionItem(
                                suggestion?.next_review_suggestion,
                                localData.next_review,
                                handleLocalApplySuggestion,
                                'next_review'
                            )}
                        </>
                    ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                            <TextField
                                label="Next Review"
                                fullWidth
                                margin="normal"
                                type="datetime-local"
                                value={localData.next_review ? new Date(localData.next_review).toISOString().slice(0, 16) : ''}
                                onChange={(e) => handleInputChange('next_review', e.target.value)}
                                InputLabelProps={{ shrink: true }}
                                variant="outlined"
                            />
                            {renderSuggestionItem(
                                suggestion?.next_review_suggestion,
                                localData.next_review,
                                handleLocalApplySuggestion,
                                'next_review'
                            )}
                        </Box>
                    )}
                </Grid>
                <Grid item xs={12}>
                    {!isEditing ? (
                        <>
                            <Typography variant="subtitle2" color="text.secondary">Patient Education</Typography>
                            <Typography variant="body1">{localData.plan?.patient_education || ''}</Typography>
                            {renderSuggestionItem(
                                suggestion?.plan_suggestion?.patient_education,
                                localData.plan?.patient_education,
                                handleLocalApplySuggestion,
                                'plan.patient_education'
                            )}
                        </>
                    ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                            <TextField
                                label="Patient Education"
                                fullWidth
                                margin="normal"
                                multiline
                                rows={2}
                                value={localData.plan?.patient_education || ''}
                                onChange={(e) => handleNestedInputChange('plan', 'patient_education', e.target.value)}
                                variant="outlined"
                            />
                            {renderSuggestionItem(
                                suggestion?.plan_suggestion?.patient_education,
                                localData.plan?.patient_education,
                                handleLocalApplySuggestion,
                                'plan.patient_education'
                            )}
                        </Box>
                    )}
                </Grid>
                <Grid item xs={12}>
                    {!isEditing ? (
                        <>
                            <Typography variant="subtitle2" color="text.secondary">Treatment Goal</Typography>
                            <Typography variant="body1">{localData.plan?.treatment_goal || ''}</Typography>
                            {renderSuggestionItem(
                                suggestion?.plan_suggestion?.treatment_goal,
                                localData.plan?.treatment_goal,
                                handleLocalApplySuggestion,
                                'plan.treatment_goal'
                            )}
                        </>
                    ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                            <TextField
                                label="Treatment Goal"
                                fullWidth
                                margin="normal"
                                value={localData.plan?.treatment_goal || ''}
                                onChange={(e) => handleNestedInputChange('plan', 'treatment_goal', e.target.value)}
                                variant="outlined"
                            />
                            {renderSuggestionItem(
                                suggestion?.plan_suggestion?.treatment_goal,
                                localData.plan?.treatment_goal,
                                handleLocalApplySuggestion,
                                'plan.treatment_goal'
                            )}
                        </Box>
                    )}
                </Grid>
                <Grid item xs={12}>
                    {!isEditing ? (
                        <>
                            <Typography variant="subtitle2" color="text.secondary">Plan Reasoning</Typography>
                            <Typography variant="body1">{localData.plan?.plan_reasoning || ''}</Typography>
                            {renderSuggestionItem(
                                suggestion?.plan_suggestion?.plan_reasoning,
                                localData.plan?.plan_reasoning,
                                handleLocalApplySuggestion,
                                'plan.plan_reasoning'
                            )}
                        </>
                    ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                            <TextField
                                label="Plan Reasoning"
                                fullWidth
                                margin="normal"
                                multiline
                                rows={2}
                                value={localData.plan?.plan_reasoning || ''}
                                onChange={(e) => handleNestedInputChange('plan', 'plan_reasoning', e.target.value)}
                                variant="outlined"
                            />
                            {renderSuggestionItem(
                                suggestion?.plan_suggestion?.plan_reasoning,
                                localData.plan?.plan_reasoning,
                                handleLocalApplySuggestion,
                                'plan.plan_reasoning'
                            )}
                        </Box>
                    )}
                </Grid>
            </Grid>
            {/* Prescriptions Section */}
            <Box sx={{ mt: 4, mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" sx={{ fontSize: isMobile ? '1rem' : '1.25rem' }}>Prescriptions</Typography>
                {isEditing && (
                    <Button
                        startIcon={<AddCircleOutlineIcon />}
                        onClick={handleAddPrescription}
                        variant="outlined"
                        size={isMobile ? "small" : "medium"}
                    >
                        Add Prescription
                    </Button>
                )}
            </Box>

            {localData?.prescription && localData.prescription.length > 0 ? (
                localData.prescription.map((prescription, index) => (
                    <Box key={index} sx={{
                        border: '1px solid #eee',
                        borderRadius: 1,
                        p: 2.5,
                        mb: 3,
                        position: 'relative'
                    }}>
                        {isEditing && (
                            <IconButton
                                aria-label="delete prescription"
                                size="small"
                                onClick={() => handleRemovePrescription(index)}
                                sx={{ position: 'absolute', top: 8, right: 8 }}
                            >
                                <DeleteIcon />
                            </IconButton>
                        )}
                        <Grid container spacing={2}>
                            <Grid item xs={12} md={6}>
                                {!isEditing ? (
                                    <>
                                        <Typography variant="subtitle2" color="text.secondary">Medication Name</Typography>
                                        <Typography variant="body1">{prescription?.medication_name || ''}</Typography>
                                    </>
                                ) : (
                                    <TextField
                                        label="Medication Name"
                                        fullWidth
                                        margin="normal"
                                        value={prescription?.medication_name || ''}
                                        onChange={(e) => handlePrescriptionChange(index, 'medication_name', e.target.value)}
                                        variant="outlined"
                                    />
                                )}
                            </Grid>
                            <Grid item xs={12} md={6}>
                                {!isEditing ? (
                                    <>
                                        <Typography variant="subtitle2" color="text.secondary">Dosage</Typography>
                                        <Typography variant="body1">{prescription?.dosage || ''}</Typography>
                                    </>
                                ) : (
                                    <TextField
                                        label="Dosage"
                                        fullWidth
                                        margin="normal"
                                        value={prescription?.dosage || ''}
                                        onChange={(e) => handlePrescriptionChange(index, 'dosage', e.target.value)}
                                        variant="outlined"
                                    />
                                )}
                            </Grid>
                            <Grid item xs={12} md={6}>
                                {!isEditing ? (
                                    <>
                                        <Typography variant="subtitle2" color="text.secondary">Route</Typography>
                                        <Typography variant="body1">{prescription?.route || ''}</Typography>
                                    </>
                                ) : (
                                    <TextField
                                        label="Route"
                                        fullWidth
                                        margin="normal"
                                        value={prescription?.route || ''}
                                        onChange={(e) => handlePrescriptionChange(index, 'route', e.target.value)}
                                        variant="outlined"
                                    />
                                )}
                            </Grid>
                            <Grid item xs={12} md={6}>
                                {!isEditing ? (
                                    <>
                                        <Typography variant="subtitle2" color="text.secondary">Frequency</Typography>
                                        <Typography variant="body1">{prescription?.frequency || ''}</Typography>
                                    </>
                                ) : (
                                    <TextField
                                        label="Frequency"
                                        fullWidth
                                        margin="normal"
                                        value={prescription?.frequency || ''}
                                        onChange={(e) => handlePrescriptionChange(index, 'frequency', e.target.value)}
                                        variant="outlined"
                                    />
                                )}
                            </Grid>
                            <Grid item xs={12} md={6}>
                                {!isEditing ? (
                                    <>
                                        <Typography variant="subtitle2" color="text.secondary">Duration</Typography>
                                        <Typography variant="body1">{prescription?.duration || ''}</Typography>
                                    </>
                                ) : (
                                    <TextField
                                        label="Duration"
                                        fullWidth
                                        margin="normal"
                                        value={prescription?.duration || ''}
                                        onChange={(e) => handlePrescriptionChange(index, 'duration', e.target.value)}
                                        variant="outlined"
                                    />
                                )}
                            </Grid>
                            <Grid item xs={12}>
                                {!isEditing ? (
                                    <>
                                        <Typography variant="subtitle2" color="text.secondary">Instructions</Typography>
                                        <Typography variant="body1">{prescription?.instructions || ''}</Typography>
                                    </>
                                ) : (
                                    <TextField
                                        label="Instructions"
                                        fullWidth
                                        margin="normal"
                                        value={prescription?.instructions || ''}
                                        onChange={(e) => handlePrescriptionChange(index, 'instructions', e.target.value)}
                                        variant="outlined"
                                    />
                                )}
                            </Grid>
                        </Grid>
                    </Box>
                ))
            ) : (
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 5 }}>
                    No prescriptions added.
                </Typography>
            )}
            {renderPrescriptionSuggestions()}
            {/* Investigations Section */}
            <Box sx={{ mt: 4, mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" sx={{ fontSize: isMobile ? '1rem' : '1.25rem' }}>Investigations</Typography>
                {isEditing && (
                    <Button
                        startIcon={<AddCircleOutlineIcon />}
                        onClick={handleAddInvestigation}
                        variant="outlined"
                        size={isMobile ? "small" : "medium"}
                    >
                        Add Investigation
                    </Button>
                )}
            </Box>

            {localData?.investigation && localData.investigation.length > 0 ? (
                localData.investigation.map((investigation, index) => (
                    <Box key={index} sx={{
                        border: '1px solid #eee',
                        borderRadius: 1,
                        p: 2.5,
                        mb: 3,
                        position: 'relative'
                    }}>
                        {isEditing && (
                            <IconButton
                                aria-label="delete investigation"
                                size="small"
                                onClick={() => handleRemoveInvestigation(index)}
                                sx={{ position: 'absolute', top: 8, right: 8 }}
                            >
                                <DeleteIcon />
                            </IconButton>
                        )}
                        <Grid container spacing={2}>
                            <Grid item xs={12} md={6}>
                                {!isEditing ? (
                                    <>
                                        <Typography variant="subtitle2" color="text.secondary">Test Type</Typography>
                                        <Typography variant="body1">{investigation.test_type || ''}</Typography>
                                    </>
                                ) : (
                                    <TextField
                                        label="Test Type"
                                        fullWidth
                                        margin="normal"
                                        value={investigation.test_type || ''}
                                        onChange={(e) => handleInvestigationChange(index, 'test_type', e.target.value)}
                                        variant="outlined"
                                    />
                                )}
                            </Grid>
                            <Grid item xs={12} md={6}>
                                {!isEditing ? (
                                    <>
                                        <Typography variant="subtitle2" color="text.secondary">Schedule Time</Typography>
                                        <Typography variant="body1">
                                            {investigation.schedule_time ? `${safeFormatDateString(investigation.schedule_time)} ${safeFormatTimeString(investigation.schedule_time)}` : ''}
                                        </Typography>
                                    </>
                                ) : (
                                    <TextField
                                        label="Schedule Time"
                                        type="datetime-local"
                                        fullWidth
                                        margin="normal"
                                        value={investigation.schedule_time ? new Date(investigation.schedule_time).toISOString().slice(0, 16) : ''}
                                        onChange={(e) => handleInvestigationChange(index, 'schedule_time', e.target.value)}
                                        InputLabelProps={{ shrink: true }}
                                        variant="outlined"
                                    />
                                )}
                            </Grid>
                            <Grid item xs={12}>
                                {!isEditing ? (
                                    <>
                                        <Typography variant="subtitle2" color="text.secondary">Reason</Typography>
                                        <Typography variant="body1">{investigation.reason || ''}</Typography>
                                    </>
                                ) : (
                                    <TextField
                                        label="Reason"
                                        fullWidth
                                        margin="normal"
                                        multiline
                                        rows={2}
                                        value={investigation.reason || ''}
                                        onChange={(e) => handleInvestigationChange(index, 'reason', e.target.value)}
                                        variant="outlined"
                                    />
                                )}
                            </Grid>
                            <Grid item xs={12}>
                                {!isEditing ? (
                                    <>
                                        <Typography variant="subtitle2" color="text.secondary">Instructions</Typography>
                                        <Typography variant="body1">{investigation.instructions || ''}</Typography>
                                    </>
                                ) : (
                                    <TextField
                                        label="Instructions"
                                        fullWidth
                                        margin="normal"
                                        value={investigation.instructions || ''}
                                        onChange={(e) => handleInvestigationChange(index, 'instructions', e.target.value)}
                                        variant="outlined"
                                    />
                                )}
                            </Grid>
                        </Grid>
                    </Box>
                ))
            ) : (
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 5 }}>
                    No investigations added.
                </Typography>
            )}
            {renderInvestigationSuggestions()}
        </Paper>
    );
}

export default MedicalReviewTab;