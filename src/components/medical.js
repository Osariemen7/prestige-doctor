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


function MedicalReviewTab({ data, editableData, schema, onDataChange, suggestion, onApplySuggestion, onGetSuggestion, onSaveReview, isGeneratingSuggestion, isSavingReview, hasChanges }) {
    const [localData, setLocalData] = useState(editableData);
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        setLocalData(editableData);
    }, [editableData]);

    const handleInputChange = (section, field, value) => {
        setLocalData(prevData => ({
            ...prevData,
            [section]: {
                ...prevData[section],
                [field]: value
            }
        }));
    };

    const handleNestedInputChange = (section, subsection, field, value) => {
        setLocalData(prevData => ({
            ...prevData,
            [section]: {
                ...prevData[section],
                [subsection]: {
                    ...prevData[section][subsection],
                    [field]: value
                }
            }
        }));
    };

    const handlePrescriptionChange = (index, field, value) => {
        const updatedPrescriptions = [...localData.prescription];
        updatedPrescriptions[index] = {
            ...updatedPrescriptions[index],
            [field]: value
        };

        setLocalData(prevData => ({
            ...prevData,
            prescription: updatedPrescriptions
        }));
    };

    const handleInvestigationChange = (index, field, value) => {
        const updatedInvestigations = [...localData.investigation];
        updatedInvestigations[index] = {
            ...updatedInvestigations[index],
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
            prescription: [...prevData.prescription, newPrescription]
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
            investigation: [...prevData.investigation, newInvestigation]
        }));
    };

    const handleRemovePrescription = (index) => {
        const updatedPrescriptions = [...localData.prescription];
        updatedPrescriptions.splice(index, 1);

        setLocalData(prevData => ({
            ...prevData,
            prescription: updatedPrescriptions
        }));
    };

    const handleRemoveInvestigation = (index) => {
        const updatedInvestigations = [...localData.investigation];
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
        onDataChange(localData);
        onSaveReview();
        setIsEditing(false);
    };

    const cancelEditing = () => {
        setLocalData(editableData);
        setIsEditing(false);
        console.log("Cancelled Editing, reverting to:", editableData); // Debugging line
        console.log("Local Data after cancel:", localData); // Debugging line
    };

    const handleCopyReview = () => {
        const reviewText = formatReviewForEMR(localData);
        navigator.clipboard.writeText(reviewText).then(() => {
            alert('Medical Review copied to clipboard!');
        });
    };

    const formatReviewForEMR = (reviewData) => {
        let emrText = "MEDICAL REVIEW:\n";

        // Subjective section
        if (reviewData.subjective) {
            emrText += "\nSUBJECTIVE:\n";
            emrText += `  Chief Complaint: ${reviewData.subjective.chief_complaint || ''}\n`;
            emrText += `  History of Present Illness: ${reviewData.subjective.history_of_present_illness || ''}\n`;
        }

        // Objective section
        if (reviewData.objective) {
            emrText += "\nOBJECTIVE:\n";
            emrText += `  Examination Findings: ${reviewData.objective.examination_findings || ''}\n`;
            emrText += `  Investigations: ${reviewData.objective.investigations || ''}\n`;
        }

        // Assessment section
        if (reviewData.assessment) {
            emrText += "\nASSESSMENT:\n";
            emrText += `  Primary Diagnosis: ${reviewData.assessment.primary_diagnosis || ''}\n`;
            emrText += `  Differential Diagnosis: ${reviewData.assessment.differential_diagnosis || ''}\n`;
            emrText += `  Diagnosis Reasoning: ${reviewData.assessment.diagnosis_reasoning || ''}\n`;
            emrText += `  Status: ${reviewData.assessment.status || ''}\n`;
        }

        // Plan section
        if (reviewData.plan) {
            emrText += "\nPLAN:\n";
            emrText += `  Management: ${reviewData.plan.management || ''}\n`;
            emrText += `  Lifestyle Advice: ${reviewData.plan.lifestyle_advice || ''}\n`;
            emrText += `  Follow Up: ${reviewData.plan.follow_up || ''}\n`;
            emrText += `  Patient Education: ${reviewData.plan.patient_education || ''}\n`;
            emrText += `  Treatment Goal: ${reviewData.plan.treatment_goal || ''}\n`;
            emrText += `  Plan Reasoning: ${reviewData.plan.plan_reasoning || ''}\n`;
        }

        // Prescriptions
        if (reviewData.prescription && reviewData.prescription.length > 0) {
            emrText += "\nPRESCRIPTIONS:\n";
            reviewData.prescription.forEach((prescription, index) => {
                emrText += `  ${index + 1}. ${prescription.medication_name || ''} - ${prescription.dosage || ''}\n`;
                emrText += `     Route: ${prescription.route || ''}, Frequency: ${prescription.frequency || ''}\n`;
                emrText += `     Duration: ${prescription.duration || ''}\n`;
                emrText += `     Instructions: ${prescription.instructions || ''}\n`;
            });
        }

        // Investigations
        if (reviewData.investigation && reviewData.investigation.length > 0) {
            emrText += "\nINVESTIGATIONS:\n";
            reviewData.investigation.forEach((investigation, index) => {
                emrText += `  ${index + 1}. ${investigation.test_type || ''}\n`;
                emrText += `     Reason: ${investigation.reason || ''}\n`;
                emrText += `     Instructions: ${investigation.instructions || ''}\n`;
                emrText += `     Schedule: ${investigation.schedule_time ? format(new Date(investigation.schedule_time), 'MM/dd/yyyy HH:mm') : ''}\n`;
            });
        }

        // Next Review
        if (reviewData.next_review) {
            emrText += `\nNEXT REVIEW: ${reviewData.next_review ? format(new Date(reviewData.next_review), 'MM/dd/yyyy HH:mm') : ''}\n`;
        }

        return emrText;
    };

    const renderSuggestions = () => {
        if (!suggestion) return null;

        const hasSuggestions = Object.keys(suggestion).some(key => suggestion[key] != null && typeof suggestion[key] === 'object' && Object.keys(suggestion[key]).length > 0);

        if (!hasSuggestions) return null;


        return (
            <Box sx={{ mt: 3, border: '1px solid #ccc', padding: 2, borderRadius: 1, bgcolor: '#f9f9f9' }}>
                <Typography variant="h6" gutterBottom>Suggestions</Typography>

                {suggestion.assessment_suggestion && Object.keys(suggestion.assessment_suggestion).length > 0 && (
                    <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle1">Assessment Suggestions:</Typography>
                        {suggestion.assessment_suggestion.primary_diagnosis && suggestion.assessment_suggestion.primary_diagnosis !== editableData.assessment?.primary_diagnosis && (
                            <Typography variant="body2">Primary Diagnosis: {suggestion.assessment_suggestion.primary_diagnosis}</Typography>
                        )}
                        {suggestion.assessment_suggestion.differential_diagnosis && suggestion.assessment_suggestion.differential_diagnosis !== editableData.assessment?.differential_diagnosis && (
                            <Typography variant="body2">Differential Diagnosis: {suggestion.assessment_suggestion.differential_diagnosis}</Typography>
                        )}
                        {suggestion.assessment_suggestion.diagnosis_reasoning && suggestion.assessment_suggestion.diagnosis_reasoning !== editableData.assessment?.diagnosis_reasoning && (
                             <Typography variant="body2">Diagnosis Reasoning: {suggestion.assessment_suggestion.diagnosis_reasoning}</Typography>
                        )}
                        {suggestion.assessment_suggestion.status && suggestion.assessment_suggestion.status !== editableData.assessment?.status && (
                            <Typography variant="body2">Status: {suggestion.assessment_suggestion.status}</Typography>
                        )}
                    </Box>
                )}

                {suggestion.plan_suggestion && Object.keys(suggestion.plan_suggestion).length > 0 && (
                    <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle1">Plan Suggestions:</Typography>
                        {suggestion.plan_suggestion.management && suggestion.plan_suggestion.management !== editableData.plan?.management && (
                            <Typography variant="body2">Management: {suggestion.plan_suggestion.management}</Typography>
                        )}
                        {suggestion.plan_suggestion.lifestyle_advice && suggestion.plan_suggestion.lifestyle_advice !== editableData.plan?.lifestyle_advice && (
                            <Typography variant="body2">Lifestyle Advice: {suggestion.plan_suggestion.lifestyle_advice}</Typography>
                        )}
                        {suggestion.plan_suggestion.follow_up && suggestion.plan_suggestion.follow_up !== editableData.plan?.follow_up && (
                            <Typography variant="body2">Follow Up: {suggestion.plan_suggestion.follow_up}</Typography>
                        )}
                        {suggestion.plan_suggestion.patient_education && suggestion.plan_suggestion.patient_education !== editableData.plan?.patient_education && (
                            <Typography variant="body2">Patient Education: {suggestion.plan_suggestion.patient_education}</Typography>
                        )}
                        {suggestion.plan_suggestion.treatment_goal && suggestion.plan_suggestion.treatment_goal !== editableData.plan?.treatment_goal && (
                            <Typography variant="body2">Treatment Goal: {suggestion.plan_suggestion.treatment_goal}</Typography>
                        )}
                        {suggestion.plan_suggestion.plan_reasoning && suggestion.plan_suggestion.plan_reasoning !== editableData.plan?.plan_reasoning && (
                            <Typography variant="body2">Plan Reasoning: {suggestion.plan_suggestion.plan_reasoning}</Typography>
                        )}
                    </Box>
                )}
                 {suggestion.next_review_suggestion && suggestion.next_review_suggestion !== editableData.next_review && (
                    <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle1">Next Review Suggestion:</Typography>
                        <Typography variant="body2">Next Review: {suggestion.next_review_suggestion}</Typography>
                    </Box>
                )}


                <Button variant="contained" color="secondary" onClick={onApplySuggestion} sx={{ mt: 1 }}>
                    Apply Suggestions
                </Button>
            </Box>
        );
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
                        Copy Review
                    </Button>
                    {!isEditing ? (
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={startEditing}
                            startIcon={<EditIcon />}
                        >
                            Edit Review
                        </Button>
                    ) : (
                        <Box>
                            <Button
                                variant="outlined"
                                startIcon={<VisibilityIcon />}
                                onClick={cancelEditing}
                                sx={{ mr: 1 }}
                            >
                                View Review
                            </Button>
                            <Button
                                variant="contained"
                                color="primary"
                                onClick={saveChanges}
                                startIcon={<SaveIcon />}
                                disabled={isSavingReview}
                            >
                                Save Review
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
                            <Typography variant="body1">{localData?.subjective?.chief_complaint || ''}</Typography>
                        </>
                    ) : (
                        <TextField
                            label="Chief Complaint"
                            fullWidth
                            margin="normal"
                            value={localData?.subjective?.chief_complaint || ''}
                            disabled={!isEditing}
                            onChange={(e) => handleNestedInputChange('subjective', 'chief_complaint', e.target.value)}
                            variant="outlined"
                        />
                    )}
                </Grid>
                <Grid item xs={12}>
                    {!isEditing ? (
                        <>
                            <Typography variant="subtitle2" color="text.secondary">History of Present Illness</Typography>
                            <Typography variant="body1">{localData?.subjective?.history_of_present_illness || ''}</Typography>
                        </>
                    ) : (
                        <TextField
                            label="History of Present Illness"
                            fullWidth
                            margin="normal"
                            multiline
                            rows={3}
                            value={localData?.subjective?.history_of_present_illness || ''}
                            disabled={!isEditing}
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
                            <Typography variant="body1">{localData?.objective?.examination_findings || ''}</Typography>
                        </>
                    ) : (
                        <TextField
                            label="Examination Findings"
                            fullWidth
                            margin="normal"
                            multiline
                            rows={2}
                            value={localData?.objective?.examination_findings || ''}
                            disabled={!isEditing}
                            onChange={(e) => handleNestedInputChange('objective', 'examination_findings', e.target.value)}
                            variant="outlined"
                        />
                    )}
                </Grid>
                <Grid item xs={12} md={6}>
                    {!isEditing ? (
                        <>
                            <Typography variant="subtitle2" color="text.secondary">Investigations</Typography>
                            <Typography variant="body1">{localData?.objective?.investigations || ''}</Typography>
                        </>
                    ) : (
                        <TextField
                            label="Investigations"
                            fullWidth
                            margin="normal"
                            multiline
                            rows={2}
                            value={localData?.objective?.investigations || ''}
                            disabled={!isEditing}
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
                            <Typography variant="body1">{localData?.assessment?.primary_diagnosis || ''}</Typography>
                        </>
                    ) : (
                        <TextField
                            label="Primary Diagnosis"
                            fullWidth
                            margin="normal"
                            value={localData?.assessment?.primary_diagnosis || ''}
                            disabled={!isEditing}
                            onChange={(e) => handleNestedInputChange('assessment', 'primary_diagnosis', e.target.value)}
                            variant="outlined"
                        />
                    )}
                </Grid>
                <Grid item xs={12} md={6}>
                    {!isEditing ? (
                        <>
                            <Typography variant="subtitle2" color="text.secondary">Differential Diagnosis</Typography>
                            <Typography variant="body1">{localData?.assessment?.differential_diagnosis || ''}</Typography>
                        </>
                    ) : (
                        <TextField
                            label="Differential Diagnosis"
                            fullWidth
                            margin="normal"
                            value={localData?.assessment?.differential_diagnosis || ''}
                            disabled={!isEditing}
                            onChange={(e) => handleNestedInputChange('assessment', 'differential_diagnosis', e.target.value)}
                            variant="outlined"
                        />
                    )}
                </Grid>
                <Grid item xs={12}>
                    {!isEditing ? (
                        <>
                            <Typography variant="subtitle2" color="text.secondary">Diagnosis Reasoning</Typography>
                            <Typography variant="body1">{localData?.assessment?.diagnosis_reasoning || ''}</Typography>
                        </>
                    ) : (
                        <TextField
                            label="Diagnosis Reasoning"
                            fullWidth
                            margin="normal"
                            multiline
                            rows={2}
                            value={localData?.assessment?.diagnosis_reasoning || ''}
                            disabled={!isEditing}
                            onChange={(e) => handleNestedInputChange('assessment', 'diagnosis_reasoning', e.target.value)}
                            variant="outlined"
                        />
                    )}
                </Grid>
                <Grid item xs={12} md={6}>
                    {!isEditing ? (
                        <>
                            <Typography variant="subtitle2" color="text.secondary">Status</Typography>
                            <Typography variant="body1">{localData?.assessment?.status || ''}</Typography>
                        </>
                    ) : (
                        <FormControl fullWidth margin="normal" variant="outlined" disabled={!isEditing}>
                            <InputLabel id="status-label">Status</InputLabel>
                            <Select
                                labelId="status-label"
                                value={localData?.assessment?.status || ''}
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
                            <Typography variant="body1">{localData?.plan?.management || ''}</Typography>
                        </>
                    ) : (
                        <TextField
                            label="Management"
                            fullWidth
                            margin="normal"
                            multiline
                            rows={2}
                            value={localData?.plan?.management || ''}
                            disabled={!isEditing}
                            onChange={(e) => handleNestedInputChange('plan', 'management', e.target.value)}
                            variant="outlined"
                        />
                    )}
                </Grid>
                <Grid item xs={12}>
                    {!isEditing ? (
                        <>
                            <Typography variant="subtitle2" color="text.secondary">Lifestyle Advice</Typography>
                            <Typography variant="body1">{localData?.plan?.lifestyle_advice || ''}</Typography>
                        </>
                    ) : (
                        <TextField
                            label="Lifestyle Advice"
                            fullWidth
                            margin="normal"
                            multiline
                            rows={2}
                            value={localData?.plan?.lifestyle_advice || ''}
                            disabled={!isEditing}
                            onChange={(e) => handleNestedInputChange('plan', 'lifestyle_advice', e.target.value)}
                            variant="outlined"
                        />
                    )}
                </Grid>
                <Grid item xs={12} md={6}>
                    {!isEditing ? (
                        <>
                            <Typography variant="subtitle2" color="text.secondary">Follow Up</Typography>
                            <Typography variant="body1">{localData?.plan?.follow_up || ''}</Typography>
                        </>
                    ) : (
                        <TextField
                            label="Follow Up"
                            fullWidth
                            margin="normal"
                            value={localData?.plan?.follow_up || ''}
                            disabled={!isEditing}
                            onChange={(e) => handleNestedInputChange('plan', 'follow_up', e.target.value)}
                            variant="outlined"
                        />
                    )}
                </Grid>
                <Grid item xs={12} md={6}>
                    {!isEditing ? (
                        <>
                            <Typography variant="subtitle2" color="text.secondary">Next Review</Typography>
                            <Typography variant="body1">
                                {localData?.next_review ? format(new Date(localData.next_review), 'MMMM d, yyyy HH:mm') : ''}
                            </Typography>
                        </>
                    ) : (
                        <TextField
                            label="Next Review"
                            fullWidth
                            margin="normal"
                            type="datetime-local"
                            value={localData?.next_review ? new Date(localData.next_review).toISOString().slice(0, 16) : ''}
                            disabled={!isEditing}
                            onChange={(e) => handleInputChange('next_review', e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            variant="outlined"
                        />
                    )}
                </Grid>
                <Grid item xs={12}>
                    {!isEditing ? (
                        <>
                            <Typography variant="subtitle2" color="text.secondary">Patient Education</Typography>
                            <Typography variant="body1">{localData?.plan?.patient_education || ''}</Typography>
                        </>
                    ) : (
                        <TextField
                            label="Patient Education"
                            fullWidth
                            margin="normal"
                            multiline
                            rows={2}
                            value={localData?.plan?.patient_education || ''}
                            disabled={!isEditing}
                            onChange={(e) => handleNestedInputChange('plan', 'patient_education', e.target.value)}
                            variant="outlined"
                        />
                    )}
                </Grid>
                <Grid item xs={12}>
                    {!isEditing ? (
                        <>
                            <Typography variant="subtitle2" color="text.secondary">Treatment Goal</Typography>
                            <Typography variant="body1">{localData?.plan?.treatment_goal || ''}</Typography>
                        </>
                    ) : (
                        <TextField
                            label="Treatment Goal"
                            fullWidth
                            margin="normal"
                            value={localData?.plan?.treatment_goal || ''}
                            disabled={!isEditing}
                            onChange={(e) => handleNestedInputChange('plan', 'treatment_goal', e.target.value)}
                            variant="outlined"
                        />
                    )}
                </Grid>
                <Grid item xs={12}>
                    {!isEditing ? (
                        <>
                            <Typography variant="subtitle2" color="text.secondary">Plan Reasoning</Typography>
                            <Typography variant="body1">{localData?.plan?.plan_reasoning || ''}</Typography>
                        </>
                    ) : (
                        <TextField
                            label="Plan Reasoning"
                            fullWidth
                            margin="normal"
                            multiline
                            rows={2}
                            value={localData?.plan?.plan_reasoning || ''}
                            disabled={!isEditing}
                            onChange={(e) => handleNestedInputChange('plan', 'plan_reasoning', e.target.value)}
                            variant="outlined"
                        />
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

            {localData?.prescription?.map((prescription, index) => (
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
                                    <Typography variant="body1">{prescription.medication_name || ''}</Typography>
                                </>
                            ) : (
                                <TextField
                                    label="Medication Name"
                                    fullWidth
                                    margin="normal"
                                    value={prescription.medication_name || ''}
                                    disabled={!isEditing}
                                    onChange={(e) => handlePrescriptionChange(index, 'medication_name', e.target.value)}
                                    variant="outlined"
                                />
                            )}
                        </Grid>
                        <Grid item xs={12} md={6}>
                            {!isEditing ? (
                                <>
                                    <Typography variant="subtitle2" color="text.secondary">Dosage</Typography>
                                    <Typography variant="body1">{prescription.dosage || ''}</Typography>
                                </>
                            ) : (
                                <TextField
                                    label="Dosage"
                                    fullWidth
                                    margin="normal"
                                    value={prescription.dosage || ''}
                                    disabled={!isEditing}
                                    onChange={(e) => handlePrescriptionChange(index, 'dosage', e.target.value)}
                                    variant="outlined"
                                />
                            )}
                        </Grid>
                        <Grid item xs={12} md={6}>
                            {!isEditing ? (
                                <>
                                    <Typography variant="subtitle2" color="text.secondary">Route</Typography>
                                    <Typography variant="body1">{prescription.route || ''}</Typography>
                                </>
                            ) : (
                                <TextField
                                    label="Route"
                                    fullWidth
                                    margin="normal"
                                    value={prescription.route || ''}
                                    disabled={!isEditing}
                                    onChange={(e) => handlePrescriptionChange(index, 'route', e.target.value)}
                                    variant="outlined"
                                />
                            )}
                        </Grid>
                        <Grid item xs={12} md={6}>
                            {!isEditing ? (
                                <>
                                    <Typography variant="subtitle2" color="text.secondary">Frequency</Typography>
                                    <Typography variant="body1">{prescription.frequency || ''}</Typography>
                                </>
                            ) : (
                                <TextField
                                    label="Frequency"
                                    fullWidth
                                    margin="normal"
                                    value={prescription.frequency || ''}
                                    disabled={!isEditing}
                                    onChange={(e) => handlePrescriptionChange(index, 'frequency', e.target.value)}
                                    variant="outlined"
                                />
                            )}
                        </Grid>
                        <Grid item xs={12} md={6}>
                            {!isEditing ? (
                                <>
                                    <Typography variant="subtitle2" color="text.secondary">Duration</Typography>
                                    <Typography variant="body1">{prescription.duration || ''}</Typography>
                                </>
                            ) : (
                                <TextField
                                    label="Duration"
                                    fullWidth
                                    margin="normal"
                                    value={prescription.duration || ''}
                                    disabled={!isEditing}
                                    onChange={(e) => handlePrescriptionChange(index, 'duration', e.target.value)}
                                    variant="outlined"
                                />
                            )}
                        </Grid>
                        <Grid item xs={12} md={6}>
                            {!isEditing ? (
                                <>
                                    <Typography variant="subtitle2" color="text.secondary">Instructions</Typography>
                                    <Typography variant="body1">{prescription.instructions || ''}</Typography>
                                </>
                            ) : (
                                <TextField
                                    label="Instructions"
                                    fullWidth
                                    margin="normal"
                                    value={prescription.instructions || ''}
                                    disabled={!isEditing}
                                    onChange={(e) => handlePrescriptionChange(index, 'instructions', e.target.value)}
                                    variant="outlined"
                                />
                            )}
                        </Grid>
                    </Grid>
                </Box>
            ))}

            {(!localData?.prescription || localData.prescription.length === 0) && (
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

            {localData?.investigation?.map((investigation, index) => (
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
                                    disabled={!isEditing}
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
                                    disabled={!isEditing}
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
                                    disabled={!isEditing}
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
                                    disabled={!isEditing}
                                    onChange={(e) => handleInvestigationChange(index, 'instructions', e.target.value)}
                                    variant="outlined"
                                />
                            )}
                        </Grid>
                    </Grid>
                </Box>
            ))}

            {(!localData?.investigation || localData.investigation.length === 0) && (
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
                    No investigations added.
                </Typography>
            )}

            {/* Render suggestions if available */}
            {renderSuggestions()}
        </Paper>
    );
}

export default MedicalReviewTab;