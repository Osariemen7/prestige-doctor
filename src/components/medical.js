import React, { useState, useEffect } from 'react';
import { Paper, Typography, Grid, TextField, Button, Box, IconButton, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import format from 'date-fns/format';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import SendIcon from '@mui/icons-material/Send';
import VisibilityIcon from '@mui/icons-material/Visibility';

function MedicalReviewTab({ data, editableData, schema, onDataChange, suggestion, appliedSuggestions, onApplySuggestion, onGetSuggestion, isGeneratingSuggestion, isSavingReview, hasChanges, onSaveReview /* new prop */ }) {
    // Initialize localData state - similar to HealthGoalsTab, initialize with editableData or data
    const [localData, setLocalData] = useState(() => {
        return editableData || data || {
            subjective: { chief_complaint: '', history_of_present_illness: '' },
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

    // useEffect to synchronize localData with editableData and data based on isEditing state
    useEffect(() => {
        if (isEditing) {
            setLocalData(editableData ? JSON.parse(JSON.stringify(editableData)) : localData);
        }
        // When not editing, do not overwrite localData
    }, [editableData, isEditing]);

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

    // Modified handleLocalApplySuggestion - Directly update localData and then call onApplySuggestion
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
            }
            return updatedData;
        });
        onApplySuggestion(field, value); // Still call parent's onApplySuggestion
    };


    const handleCopyReview = () => {
        const reviewText = formatReviewForEMR(localData); // Use localData directly for formatting
        navigator.clipboard.writeText(reviewText).then(() => {
            alert('Medical Review copied to clipboard!');
        });
    };

    const formatReviewForEMR = (reviewData) => { // Now directly accepts reviewData which is localData
        let emrText = "MEDICAL REVIEW:\n";

        if (reviewData.subjective) {
            emrText += "\nSUBJECTIVE:\n";
            emrText += `  Chief Complaint: ${reviewData.subjective.chief_complaint || ''}\n`;
            emrText += `  History of Present Illness: ${reviewData.subjective.history_of_present_illness || ''}\n`;
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
                emrText += `     Schedule: ${investigation.schedule_time ? format(new Date(investigation.schedule_time), 'MM/dd/yyyy HH:mm') : ''}\n`;
            });
        }

        if (reviewData.next_review) {
            emrText += `\nNEXT REVIEW: ${reviewData.next_review ? format(new Date(reviewData.next_review), 'MM/dd/yyyy HH:mm') : ''}\n`;
        }

        return emrText;
    };

    const renderSuggestionItem = (suggestionValue, currentValue, applySuggestionHandler, fieldName) => {
        if (suggestionValue && suggestionValue !== currentValue && !appliedSuggestions[fieldName]) {
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

    return (
        <Paper elevation={2} sx={{ padding: 3, mt: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h5" gutterBottom>Medical Review</Typography>
                <Box>
                    <Button
                        variant="outlined"
                        startIcon={<ContentCopyIcon />}
                        onClick={handleCopyReview}
                        sx={{ mr: 1 }}
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
                        >
                            Edit Note
                        </Button>
                    ) : (
                        <Box>
                            <Button
                                variant="outlined"
                                startIcon={<VisibilityIcon />}
                                onClick={cancelEditing}
                                sx={{ mr: 1 }}
                            >
                                View Note
                            </Button>
                            <Button
                                variant="contained"
                                color="primary"
                                onClick={saveChanges}
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
            <Typography variant="h6" sx={{ mt: 3, mb: 2, borderBottom: '1px solid #eee', pb: 1 }}>Subjective</Typography>
            <Grid container spacing={2}>
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
            </Grid>

            {/* Objective Section */}
            <Typography variant="h6" sx={{ mt: 3, mb: 2, borderBottom: '1px solid #eee', pb: 1 }}>Objective</Typography>
            <Grid container spacing={2}>
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
            <Typography variant="h6" sx={{ mt: 3, mb: 2, borderBottom: '1px solid #eee', pb: 1 }}>Assessment</Typography>
            <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                    {!isEditing ? (
                        <>
                            <Typography variant="subtitle2" color="text.secondary">Primary Diagnosis</Typography>
                            <Typography variant="body1">{localData.assessment?.primary_diagnosis || ''}</Typography>
                             {renderSuggestionItem(
                                suggestion?.assessment_suggestion?.primary_diagnosis,
                                localData.assessment?.primary_diagnosis,
                                handleLocalApplySuggestion, // Use local handler
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
                                handleLocalApplySuggestion, // Use local handler
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
                                handleLocalApplySuggestion, // Use local handler
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
                                handleLocalApplySuggestion, // Use local handler
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
                                handleLocalApplySuggestion, // Use local handler
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
                                handleLocalApplySuggestion, // Use local handler
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
                                handleLocalApplySuggestion, // Use local handler
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
                                handleLocalApplySuggestion, // Use local handler
                                'assessment.status'
                            )}
                        </Box>
                    )}
                </Grid>
            </Grid>

            {/* Plan Section */}
            <Typography variant="h6" sx={{ mt: 3, mb: 2, borderBottom: '1px solid #eee', pb: 1 }}>Plan</Typography>
            <Grid container spacing={2}>
                <Grid item xs={12}>
                    {!isEditing ? (
                        <>
                            <Typography variant="subtitle2" color="text.secondary">Management</Typography>
                            <Typography variant="body1">{localData.plan?.management || ''}</Typography>
                             {renderSuggestionItem(
                                suggestion?.plan_suggestion?.management,
                                localData.plan?.management,
                                handleLocalApplySuggestion, // Use local handler
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
                                handleLocalApplySuggestion, // Use local handler
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
                                handleLocalApplySuggestion, // Use local handler
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
                                handleLocalApplySuggestion, // Use local handler
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
                                handleLocalApplySuggestion, // Use local handler
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
                                handleLocalApplySuggestion, // Use local handler
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
                                {localData.next_review ? format(new Date(localData.next_review), 'MMMM d, yyyy HH:mm') : ''}
                            </Typography>
                             {renderSuggestionItem(
                                suggestion?.next_review_suggestion,
                                localData.next_review,
                                handleLocalApplySuggestion, // Use local handler
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
                                handleLocalApplySuggestion, // Use local handler
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
                                handleLocalApplySuggestion, // Use local handler
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
                                handleLocalApplySuggestion, // Use local handler
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
                                handleLocalApplySuggestion, // Use local handler
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
                                handleLocalApplySuggestion, // Use local handler
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
                                handleLocalApplySuggestion, // Use local handler
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
                                handleLocalApplySuggestion, // Use local handler
                                'plan.plan_reasoning'
                            )}
                        </Box>
                    )}
                </Grid>
            </Grid>

            {/* Prescriptions Section */}
            <Box sx={{ mt: 4, mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">Prescriptions</Typography>
                {isEditing && (
                    <Button
                        startIcon={<AddCircleOutlineIcon />}
                        onClick={handleAddPrescription}
                        variant="outlined"
                        size="small"
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
                        p: 2,
                        mb: 2,
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
                                {  !isEditing ? (                                  <>
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
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
                    No prescriptions added.
                </Typography>
            )}

            {/* Investigations Section */}
            <Box sx={{ mt: 4, mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">Investigations</Typography>
                {isEditing && (
                    <Button
                        startIcon={<AddCircleOutlineIcon />}
                        onClick={handleAddInvestigation}
                        variant="outlined"
                        size="small"
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
                        p: 2,
                        mb: 2,
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
                                            {investigation.schedule_time ? format(new Date(investigation.schedule_time), 'MMMM d, yyyy HH:mm') : ''}
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
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
                    No investigations added.
                </Typography>
            )}
        </Paper>
    );
}

export default MedicalReviewTab;