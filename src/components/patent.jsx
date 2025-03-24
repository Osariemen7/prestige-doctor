import React, { useState, useEffect } from 'react';
import { Paper, Typography, Grid, TextField, Button, Box, IconButton } from '@mui/material';
import { format } from 'date-fns';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import VisibilityIcon from '@mui/icons-material/Visibility';

function PatientProfileTab({ data, editableData, schema, onDataChange, suggestion, onApplySuggestion, appliedSuggestions, isSaving }) {
    const [localData, setLocalData] = useState(() => editableData || data || {}); // Initialize with editableData or data
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        setLocalData(isEditing ? editableData : data); // Update localData based on editing mode
    }, [editableData, data, isEditing]);


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
                    ...prevData[section]?.[subsection],
                    [field]: value
                }
            }
        }));
    };

    const handleDoctorInputChange = (field, value) => {
        setLocalData(prevData => ({
            ...prevData,
            clinical_status: {
                ...prevData.clinical_status,
                care_team: {
                    ...prevData.clinical_status?.care_team,
                    primary_doctor: {
                        ...prevData.clinical_status?.care_team?.primary_doctor,
                        [field]: value
                    }
                }
            }
        }));
    };

    const startEditing = () => {
        setIsEditing(true);
    };

    const saveChanges = () => {
        onDataChange(localData);
        setLocalData(localData);
        setIsEditing(false);
    };

    const cancelEditing = () => {
        setIsEditing(false); // isEditing state change will trigger useEffect to reset localData
    };

    const isValidDate = (date) => date instanceof Date && !isNaN(date.getTime());


    const handleCopyProfile = () => {
        const profileText = formatProfileForEMR(localData);
        navigator.clipboard.writeText(profileText).then(() => {
            alert('Patient Profile copied to clipboard!');
        });
    };

    const formatProfileForEMR = (profileData) => {
        let emrText = "PATIENT PROFILE:\n";
        if (profileData.demographics) {
            emrText += "\nDEMOGRAPHICS:\n";
            emrText += `  First Name: ${profileData.demographics.first_name || ''}\n`;
            emrText += `  Last Name: ${profileData.demographics.last_name || ''}\n`;
            emrText += `  Date of Birth: ${profileData.demographics.date_of_birth ? format(new Date(profileData.demographics.date_of_birth), 'MM/dd/yyyy') : ''}\n`;
            emrText += `  Age: ${profileData.demographics.age || ''}\n`;
            emrText += `  Gender: ${profileData.demographics.gender || ''}\n`;
            emrText += `  Country Code: ${profileData.demographics.location?.country_code || ''}\n`;
        }
        if (profileData.genetic_proxies) {
            emrText += "\nGENETIC INFORMATION:\n";
            emrText += `  Blood Type: ${profileData.genetic_proxies.blood_type || ''}\n`;
            emrText += `  Family History: ${profileData.genetic_proxies.family_history?.join(', ') || ''}\n`;
            emrText += `  Phenotypic Markers: ${profileData.genetic_proxies.phenotypic_markers?.join(', ') || ''}\n`;
            emrText += `  Medication Sensitivities: ${profileData.genetic_proxies.medication_sensitivities?.join(', ') || ''}\n`;
        }
        if (profileData.environment) {
            emrText += "\nENVIRONMENT:\n";
            emrText += `  Environmental Risks: ${profileData.environment.environmental_risks?.join(', ') || ''}\n`;
            emrText += `  Geographic Risk Factors: ${profileData.environment.geographic_risk_factors?.join(', ') || ''}\n`;
        }
        if (profileData.lifestyle?.biometrics) {
            emrText += "\nBIOMETRICS:\n";
            emrText += `  Height: ${profileData.lifestyle.biometrics.height || ''} cm\n`;
            emrText += `  Weight: ${profileData.lifestyle.biometrics.weight || ''} kg\n`;
            emrText += `  BMI: ${profileData.lifestyle.biometrics.bmi || ''}\n`;
            emrText += `  Health Score: ${profileData.lifestyle.biometrics.health_score || ''}\n`;
        }
        if (profileData.lifestyle) {
            emrText += "\nLIFESTYLE:\n";
            emrText += `  Circadian Preference: ${profileData.lifestyle.circadian_preference || ''}\n`;
            emrText += `  Dietary Patterns: ${profileData.lifestyle.dietary_patterns || ''}\n`;
            emrText += `  Movement Profile: ${profileData.lifestyle.movement_profile || ''}\n`;
            emrText += `  Social History: ${profileData.lifestyle.social_history?.join(', ') || ''}\n`;
        }
        if (profileData.clinical_status?.chronic_conditions) {
            emrText += "\nCLINICAL STATUS:\n";
            emrText += `  Chronic Conditions: ${profileData.clinical_status.chronic_conditions?.join(', ') || ''}\n`;
            emrText += `  Peculiarities: ${profileData.clinical_status.peculiarities?.join(', ') || ''}\n`;
            emrText += `  Medications: ${profileData.clinical_status.medications?.join(', ') || ''}\n`;
        }
        if (profileData.clinical_status?.care_team?.primary_doctor) {
            emrText += "\nCARE TEAM - PRIMARY DOCTOR:\n";
            emrText += `  Doctor ID: ${profileData.clinical_status.care_team.primary_doctor.id || ''}\n`;
            emrText += `  Name: ${profileData.clinical_status.care_team.primary_doctor.name || ''}\n`;
            emrText += `  Specialty: ${profileData.clinical_status.care_team.primary_doctor.specialty || ''}\n`;
            emrText += `  Clinic Name: ${profileData.clinical_status.care_team.primary_doctor.clinic_name || ''}\n`;
            emrText += `  Phone Number: ${profileData.clinical_status.care_team.primary_doctor.phone_number || ''}\n`;
        }
        if (profileData.temporal_context) {
            emrText += "\nTEMPORAL CONTEXT:\n";
            emrText += `  Current Time (UTC): ${profileData.temporal_context.current_time || ''}\n`;
            emrText += `  Patient Local Time: ${profileData.temporal_context.patient_local_time || ''}\n`;
            emrText += `  Timezone: ${profileData.temporal_context.timezone || ''}\n`;
        }
        return emrText;
    };

    // --- Suggestion Handling ---
    const handleLocalApplySuggestion = (field, value) => {
        setLocalData(prevData => {
            const updatedData = {...prevData};
            const parts = field.split('.'); // e.g., 'demographics.date_of_birth' -> ['demographics', 'date_of_birth']
            if (parts.length === 2) {
                const section = parts[0];
                const subField = parts[1];
                if (updatedData[section]) {
                    updatedData[section] = {...updatedData[section], [subField]: value};
                }
            } else if (parts.length === 3) { // for nested like location.country_code
                const section = parts[0];
                const subsection = parts[1];
                const subField = parts[2];
                if (updatedData[section] && updatedData[section][subsection]) {
                    updatedData[section][subsection] = {...updatedData[section][subsection], [subField]: value};
                }
            }
             else if (parts.length === 1) { // for top level properties if any
                updatedData[field] = value;
            }
            return updatedData;
        });
        onApplySuggestion('profile', {[field]: value}); // Call parent's onApplySuggestion to update parent state
    };


    const renderSuggestionItem = (suggestionValue, currentValue, applySuggestionHandler, fieldName) => {
        if (suggestionValue && suggestionValue !== currentValue && !appliedSuggestions?.[fieldName]) {
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

    const renderSuggestions = () => {
        if (!suggestion || Object.keys(suggestion).length === 0) return null;

        const suggestionData = suggestion;

        return (
            <Box sx={{ mt: 3, border: '1px solid #ccc', padding: 2, borderRadius: 1, bgcolor: '#f9f9f9' }}>
                <Typography variant="h6" gutterBottom>Suggestion</Typography>
                {renderSuggestionItem(
                    suggestionData.profile_data?.demographics?.date_of_birth ? format(new Date(suggestionData.profile_data.demographics.date_of_birth), 'MM/dd/yyyy') : null,
                    localData?.demographics?.date_of_birth ? format(new Date(localData.demographics.date_of_birth), 'MM/dd/yyyy') : null,
                    (fieldName, suggestionValue) => handleLocalApplySuggestion(fieldName, suggestionValue),
                    'demographics.date_of_birth'
                )}
                {renderSuggestionItem(
                    suggestionData.profile_data?.genetic_proxies?.blood_type,
                    localData?.genetic_proxies?.blood_type,
                    (fieldName, suggestionValue) => handleLocalApplySuggestion(fieldName, suggestionValue),
                    'genetic_proxies.blood_type'
                )}
                 {renderSuggestionItem(
                    suggestionData.profile_data?.demographics?.location?.country_code,
                    localData?.demographics?.location?.country_code,
                    (fieldName, suggestionValue) => handleLocalApplySuggestion(fieldName, suggestionValue),
                    'demographics.location.country_code'
                )}
                {/* Add renderSuggestionItem for other relevant fields in PatientProfileTab as needed */}
            </Box>
        );
    };

    const renderHeaderButtons = () => {
        return (
            <Box>

                <Button
                    variant="outlined"
                    startIcon={<ContentCopyIcon />}
                    onClick={handleCopyProfile}
                    sx={{ mr: 1}}
                >
                    Copy Profile
                </Button>
                {isEditing ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Button
                            variant="outlined"
                            startIcon={<VisibilityIcon />}
                            sx={{ mb: 1 }}
                            onClick={cancelEditing}
                        >
                            View Profile
                        </Button>

                        <Button
                            variant="contained"
                            color="primary"
                            onClick={saveChanges}
                            startIcon={<SaveIcon />}
                            disabled={isSaving}
                        >
                            Save Profile
                        </Button>
                    </Box>
                ) : (
                    <>

                        <Button
                            variant="contained"
                            color="primary"
                            onClick={startEditing}
                            startIcon={<EditIcon />}
                        >
                            Edit Profile
                        </Button>
                    </>
                )}
            </Box>
        );
    };

    return (
        <Paper elevation={2} sx={{ padding: 3, mt: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h5">Patient Profile</Typography>
                {renderHeaderButtons()}
            </Box>

            <Grid container spacing={3}>
                {/* ... (rest of PatientProfileTab UI code, same as before) ... */}
                 <Grid item xs={12}>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>Demographics</Typography>
                    <Grid container spacing={2}>
                        <Grid item xs={4}>
                            <Typography variant="subtitle2" color="text.secondary">ID</Typography>
                            {isEditing ? (
                                <TextField
                                    fullWidth
                                    value={localData?.demographics?.id || ''}
                                    onChange={(e) => handleInputChange('demographics', 'id', e.target.value)}
                                    variant="outlined"
                                    size="small"
                                />
                            ) : (
                                <Typography variant="body1">
                                    {localData?.demographics?.id || ''}
                                </Typography>
                            )}
                        </Grid>
                        <Grid item xs={4}>
                            <Typography variant="subtitle2" color="text.secondary">First Name</Typography>
                            {isEditing ? (
                                <TextField
                                    fullWidth
                                    value={localData?.demographics?.first_name || ''}
                                    onChange={(e) => handleInputChange('demographics', 'first_name', e.target.value)}
                                    variant="outlined"
                                    size="small"
                                />
                            ) : (
                                <Typography variant="body1">
                                    {localData?.demographics?.first_name || ''}
                                </Typography>
                            )}
                        </Grid>
                        <Grid item xs={4}>
                            <Typography variant="subtitle2" color="text.secondary">Last Name</Typography>
                            {isEditing ? (
                                <TextField
                                    fullWidth
                                    value={localData?.demographics?.last_name || ''}
                                    onChange={(e) => handleInputChange('demographics', 'last_name', e.target.value)}
                                    variant="outlined"
                                    size="small"
                                />
                            ) : (
                                <Typography variant="body1">
                                    {localData?.demographics?.last_name || ''}
                                </Typography>
                            )}
                        </Grid>
                        <Grid item xs={4}>
                            <Typography variant="subtitle2" color="text.secondary">Date of Birth</Typography>
                            {isEditing ? (
                                <TextField
                                    fullWidth
                                    type="date"
                                    value={localData?.demographics?.date_of_birth ? format(new Date(localData.demographics.date_of_birth), 'yyyy-MM-dd') : ''}
                                    onChange={(e) => handleInputChange('demographics', 'date_of_birth', e.target.value)}
                                    InputLabelProps={{ shrink: true }}
                                    variant="outlined"
                                    size="small"
                                />
                            ) : (
                                <Typography variant="body1">
                                    {localData?.demographics?.date_of_birth
                                        ? format(new Date(localData.demographics.date_of_birth), 'MMMM d, yyyy')
                                        : ''}
                                </Typography>
                            )}
                        </Grid>
                        <Grid item xs={4}>
                            <Typography variant="subtitle2" color="text.secondary">Age</Typography>
                            {isEditing ? (
                                <TextField
                                    fullWidth
                                    value={localData?.demographics?.age || ''}
                                    onChange={(e) => handleInputChange('demographics', 'age', e.target.value)}
                                    variant="outlined"
                                    size="small"
                                />
                            ) : (
                                <Typography variant="body1">{localData?.demographics?.age || ''}</Typography>
                            )}
                        </Grid>
                        <Grid item xs={4}>
                            <Typography variant="subtitle2" color="text.secondary">Gender</Typography>
                            {isEditing ? (
                                <TextField
                                    fullWidth
                                    value={localData?.demographics?.gender || ''}
                                    onChange={(e) => handleInputChange('demographics', 'gender', e.target.value)}
                                    variant="outlined"
                                    size="small"
                                />
                            ) : (
                                <Typography variant="body1">{localData?.demographics?.gender || ''}</Typography>
                            )}
                        </Grid>
                        <Grid item xs={4}>
                            <Typography variant="subtitle2" color="text.secondary">Country Code</Typography>
                            {isEditing ? (
                                <TextField
                                    fullWidth
                                    value={localData?.demographics?.location?.country_code || ''}
                                    onChange={(e) => handleNestedInputChange('demographics', 'location', 'country_code', e.target.value)}
                                    variant="outlined"
                                    size="small"
                                />
                            ) : (
                                <Typography variant="body1">{localData?.demographics?.location?.country_code || ''}</Typography>
                            )}
                        </Grid>
                    </Grid>
                </Grid>

                <Grid item xs={12}>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>Genetic Information</Typography>
                    {/* ... rest of the Genetic Information, Environment, Biometrics, Lifestyle, Clinical Status, Temporal Context sections remain the same ... */}
                    <Grid container spacing={2}>
                        <Grid item xs={6}>
                            <Typography variant="subtitle2" color="text.secondary">Blood Type</Typography>
                            {isEditing ? (
                                <TextField
                                    fullWidth
                                    value={localData?.genetic_proxies?.blood_type || ''}
                                    onChange={(e) => handleInputChange('genetic_proxies', 'blood_type', e.target.value)}
                                    variant="outlined"
                                    size="small"
                                />
                            ) : (
                                <Typography variant="body1">{localData?.genetic_proxies?.blood_type || ''}</Typography>
                            )}
                        </Grid>
                        <Grid item xs={6}>
                            <Typography variant="subtitle2" color="text.secondary">Family History</Typography>
                            {isEditing ? (
                                <TextField
                                    fullWidth
                                    value={localData?.genetic_proxies?.family_history?.join(', ') || ''}
                                    onChange={(e) => handleInputChange('genetic_proxies', 'family_history',
                                        e.target.value.split(',').map(item => item.trim()))}
                                    helperText="Comma-separated list"
                                    variant="outlined"
                                    size="small"
                                />
                            ) : (
                                <Typography variant="body1">
                                    {localData?.genetic_proxies?.family_history?.length
                                        ? localData.genetic_proxies.family_history.join(', ')
                                        : 'None'}
                                </Typography>
                            )}
                        </Grid>
                         <Grid item xs={6}>
                            <Typography variant="subtitle2" color="text.secondary">Phenotypic Markers</Typography>
                            {isEditing ? (
                                <TextField
                                    fullWidth
                                    value={localData?.genetic_proxies?.phenotypic_markers?.join(', ') || ''}
                                    onChange={(e) => handleInputChange('genetic_proxies', 'phenotypic_markers',
                                        e.target.value.split(',').map(item => item.trim()))}
                                    helperText="Comma-separated list"
                                    variant="outlined"
                                    size="small"
                                />
                            ) : (
                                <Typography variant="body1">
                                    {localData?.genetic_proxies?.phenotypic_markers?.length
                                        ? localData.genetic_proxies.phenotypic_markers.join(', ')
                                        : 'None'}
                                </Typography>
                            )}
                        </Grid>
                        <Grid item xs={6}>
                            <Typography variant="subtitle2" color="text.secondary">Medication Sensitivities</Typography>
                            {isEditing ? (
                                <TextField
                                    fullWidth
                                    value={localData?.genetic_proxies?.medication_sensitivities?.join(', ') || ''}
                                    onChange={(e) => handleInputChange('genetic_proxies', 'medication_sensitivities',
                                        e.target.value.split(',').map(item => item.trim()))}
                                    helperText="Comma-separated list"
                                    variant="outlined"
                                    size="small"
                                />
                            ) : (
                                <Typography variant="body1">
                                    {localData?.genetic_proxies?.medication_sensitivities?.length
                                        ? localData.genetic_proxies.medication_sensitivities.join(', ')
                                        : 'None'}
                                </Typography>
                            )}
                        </Grid>
                    </Grid>
                </Grid>

                <Grid item xs={12}>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>Environment</Typography>
                    <Grid container spacing={2}>
                        <Grid item xs={6}>
                            <Typography variant="subtitle2" color="text.secondary">Environmental Risks</Typography>
                            {isEditing ? (
                                <TextField
                                    fullWidth
                                    value={localData?.environment?.environmental_risks?.join(', ') || ''}
                                    onChange={(e) => handleInputChange('environment', 'environmental_risks',
                                        e.target.value.split(',').map(item => item.trim()))}
                                    helperText="Comma-separated list"
                                    variant="outlined"
                                    size="small"
                                />
                            ) : (
                                <Typography variant="body1">
                                    {localData?.environment?.environmental_risks?.length
                                        ? localData.environment.environmental_risks.join(', ')
                                        : 'None'}
                                </Typography>
                            )}
                        </Grid>
                        <Grid item xs={6}>
                            <Typography variant="subtitle2" color="text.secondary">Geographic Risk Factors</Typography>
                            {isEditing ? (
                                <TextField
                                    fullWidth
                                    value={localData?.environment?.geographic_risk_factors?.join(', ') || ''}
                                    onChange={(e) => handleInputChange('environment', 'geographic_risk_factors',
                                        e.target.value.split(',').map(item => item.trim()))}
                                    helperText="Comma-separated list"
                                    variant="outlined"
                                    size="small"
                                />
                            ) : (
                                <Typography variant="body1">
                                    {localData?.environment?.geographic_risk_factors?.length
                                        ? localData.environment.geographic_risk_factors.join(', ')
                                        : 'None'}
                                </Typography>
                            )}
                        </Grid>
                    </Grid>
                </Grid>

                <Grid item xs={12}>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>Biometrics</Typography>
                    <Grid container spacing={2}>
                        <Grid item xs={3}>
                            <Typography variant="subtitle2" color="text.secondary">Height</Typography>
                            {isEditing ? (
                                <TextField
                                    fullWidth
                                    type="number"
                                    value={localData?.lifestyle?.biometrics?.height || ''}
                                    onChange={(e) => handleNestedInputChange('lifestyle', 'biometrics', 'height', parseFloat(e.target.value))}
                                    variant="outlined"
                                    size="small"
                                />
                            ) : (
                                <Typography variant="body1">{localData?.lifestyle?.biometrics?.height || ''} cm</Typography>
                            )}
                        </Grid>
                        <Grid item xs={3}>
                            <Typography variant="subtitle2" color="text.secondary">Weight</Typography>
                            {isEditing ? (
                                <TextField
                                    fullWidth
                                    type="number"
                                    value={localData?.lifestyle?.biometrics?.weight || ''}
                                    onChange={(e) => handleNestedInputChange('lifestyle', 'biometrics', 'weight', parseFloat(e.target.value))}
                                    variant="outlined"
                                    size="small"
                                />
                            ) : (
                                <Typography variant="body1">{localData?.lifestyle?.biometrics?.weight || ''} kg</Typography>
                            )}
                        </Grid>
                        <Grid item xs={3}>
                            <Typography variant="subtitle2" color="text.secondary">BMI</Typography>
                            {isEditing ? (
                                <TextField
                                    fullWidth
                                    type="number"
                                    value={localData?.lifestyle?.biometrics?.bmi || ''}
                                    InputProps={{ readOnly: true }}
                                    variant="outlined"
                                    size="small"
                                />
                            ) : (
                                <Typography variant="body1">{localData?.lifestyle?.biometrics?.bmi || ''}</Typography>
                            )}
                        </Grid>
                        <Grid item xs={3}>
                            <Typography variant="subtitle2" color="text.secondary">Health Score</Typography>
                            {isEditing ? (
                                <TextField
                                    fullWidth
                                    type="number"
                                    value={localData?.lifestyle?.biometrics?.health_score || ''}
                                    onChange={(e) => handleNestedInputChange('lifestyle', 'biometrics', 'health_score', parseFloat(e.target.value))}
                                    variant="outlined"
                                    size="small"
                                />
                            ) : (
                                <Typography variant="body1">{localData?.lifestyle?.biometrics?.health_score || ''}/100</Typography>
                            )}
                        </Grid>
                    </Grid>
                </Grid>

                <Grid item xs={12}>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>Lifestyle</Typography>
                    <Grid container spacing={2}>
                        <Grid item xs={6}>
                            <Typography variant="subtitle2" color="text.secondary">Circadian Preference</Typography>
                            {isEditing ? (
                                <TextField
                                    fullWidth
                                    value={localData?.lifestyle?.circadian_preference || ''}
                                    onChange={(e) => handleInputChange('lifestyle', 'circadian_preference', e.target.value)}
                                    variant="outlined"
                                    size="small"
                                />
                            ) : (
                                <Typography variant="body1">{localData?.lifestyle?.circadian_preference || ''}</Typography>
                            )}
                        </Grid>
                        <Grid item xs={6}>
                            <Typography variant="subtitle2" color="text.secondary">Dietary Patterns</Typography>
                            {isEditing ? (
                                <TextField
                                    fullWidth
                                    value={localData?.lifestyle?.dietary_patterns || ''}
                                    onChange={(e) => handleInputChange('lifestyle', 'dietary_patterns', e.target.value)}
                                    variant="outlined"
                                    size="small"
                                />
                            ) : (
                                <Typography variant="body1">{localData?.lifestyle?.dietary_patterns || ''}</Typography>
                            )}
                        </Grid>
                         <Grid item xs={6}>
                            <Typography variant="subtitle2" color="text.secondary">Movement Profile</Typography>
                            {isEditing ? (
                                <TextField
                                    fullWidth
                                    value={localData?.lifestyle?.movement_profile || ''}
                                    onChange={(e) => handleInputChange('lifestyle', 'movement_profile', e.target.value)}
                                    variant="outlined"
                                    size="small"
                                />
                            ) : (
                                <Typography variant="body1">{localData?.lifestyle?.movement_profile || ''}</Typography>
                            )}
                        </Grid>
                        <Grid item xs={6}>
                            <Typography variant="subtitle2" color="text.secondary">Social History</Typography>
                            {isEditing ? (
                                <TextField
                                    fullWidth
                                    value={localData?.lifestyle?.social_history?.join(', ') || ''}
                                    onChange={(e) => handleInputChange('lifestyle', 'social_history',
                                        e.target.value.split(',').map(item => item.trim()))}
                                    helperText="Comma-separated list"
                                    variant="outlined"
                                    size="small"
                                />
                            ) : (
                                <Typography variant="body1">
                                    {localData?.lifestyle?.social_history?.length
                                        ? localData.lifestyle.social_history.join(', ')
                                        : 'None'}
                                </Typography>
                            )}
                        </Grid>
                    </Grid>
                </Grid>

                <Grid item xs={12}>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>Clinical Status</Typography>
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <Typography variant="subtitle2" color="text.secondary">Chronic Conditions</Typography>
                            {isEditing ? (
                                <TextField
                                    fullWidth
                                    value={localData?.clinical_status?.chronic_conditions?.join(', ') || ''}
                                    onChange={(e) => handleInputChange('clinical_status', 'chronic_conditions',
                                        e.target.value.split(',').map(item => item.trim()))}
                                    helperText="Comma-separated list"
                                    variant="outlined"
                                    size="small"
                                />
                            ) : (
                                <Typography variant="body1">
                                    {localData?.clinical_status?.chronic_conditions?.length
                                        ? localData.clinical_status.chronic_conditions.join(', ')
                                        : 'None'}
                                </Typography>
                            )}
                        </Grid>
                         <Grid item xs={12}>
                            <Typography variant="subtitle2" color="text.secondary">Peculiarities</Typography>
                            {isEditing ? (
                                <TextField
                                    fullWidth
                                    value={localData?.clinical_status?.peculiarities?.join(', ') || ''}
                                    onChange={(e) => handleInputChange('clinical_status', 'peculiarities',
                                        e.target.value.split(',').map(item => item.trim()))}
                                    helperText="Comma-separated list"
                                    variant="outlined"
                                    size="small"
                                />
                            ) : (
                                <Typography variant="body1">
                                    {localData?.clinical_status?.peculiarities?.length
                                        ? localData.clinical_status.peculiarities.join(', ')
                                        : 'None'}
                                </Typography>
                            )}
                        </Grid>
                         <Grid item xs={12}>
                            <Typography variant="subtitle2" color="text.secondary">Medications</Typography>
                            {isEditing ? (
                                <TextField
                                    fullWidth
                                    value={localData?.clinical_status?.medications?.join(', ') || ''}
                                    onChange={(e) => handleInputChange('clinical_status', 'medications',
                                        e.target.value.split(',').map(item => item.trim()))}
                                    helperText="Comma-separated list"
                                    variant="outlined"
                                    size="small"
                                />
                            ) : (
                                <Typography variant="body1">
                                    {localData?.clinical_status?.medications?.length
                                        ? localData.clinical_status.medications.join(', ')
                                        : 'None'}
                                </Typography>
                            )}
                        </Grid>
                    </Grid>

                    <Typography variant="subtitle1" sx={{ mt: 2, mb: 1, fontWeight: 'bold' }}>Primary Doctor</Typography>
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                            <Typography variant="subtitle2" color="text.secondary">Doctor ID</Typography>
                            {isEditing ? (
                                <TextField
                                    fullWidth
                                    type="number"
                                    value={localData?.clinical_status?.care_team?.primary_doctor?.id || ''}
                                    onChange={(e) => handleDoctorInputChange('id', parseInt(e.target.value))}
                                    variant="outlined"
                                    size="small"
                                />
                            ) : (
                                <Typography variant="body1">
                                    {localData?.clinical_status?.care_team?.primary_doctor?.id || ''}
                                </Typography>
                            )}
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Typography variant="subtitle2" color="text.secondary">Doctor Name</Typography>
                            {isEditing ? (
                                <TextField
                                    fullWidth
                                    value={localData?.clinical_status?.care_team?.primary_doctor?.name || ''}
                                    onChange={(e) => handleDoctorInputChange('name', e.target.value)}
                                    variant="outlined"
                                    size="small"
                                />
                            ) : (
                                <Typography variant="body1">
                                    {localData?.clinical_status?.care_team?.primary_doctor?.name || ''}
                                </Typography>
                            )}
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Typography variant="subtitle2" color="text.secondary">Specialty</Typography>
                            {isEditing ? (
                                <TextField
                                    fullWidth
                                    value={localData?.clinical_status?.care_team?.primary_doctor?.specialty || ''}
                                    onChange={(e) => handleDoctorInputChange('specialty', e.target.value)}
                                    variant="outlined"
                                    size="small"
                                />
                            ) : (
                                <Typography variant="body1">
                                    {localData?.clinical_status?.care_team?.primary_doctor?.specialty || ''}
                                </Typography>
                            )}
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Typography variant="subtitle2" color="text.secondary">Clinic Name</Typography>
                            {isEditing ? (
                                <TextField
                                    fullWidth
                                    value={localData?.clinical_status?.care_team?.primary_doctor?.clinic_name || ''}
                                    onChange={(e) => handleDoctorInputChange('clinic_name', e.target.value)}
                                    variant="outlined"
                                    size="small"
                                />
                            ) : (
                                <Typography variant="body1">
                                    {localData?.clinical_status?.care_team?.primary_doctor?.clinic_name || ''}
                                </Typography>
                            )}
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Typography variant="subtitle2" color="text.secondary">Phone Number</Typography>
                            {isEditing ? (
                                <TextField
                                    fullWidth
                                    value={localData?.clinical_status?.care_team?.primary_doctor?.phone_number || ''}
                                    onChange={(e) => handleDoctorInputChange('phone_number', e.target.value)}
                                    variant="outlined"
                                    size="small"
                                />
                            ) : (
                                <Typography variant="body1">
                                    {localData?.clinical_status?.care_team?.primary_doctor?.phone_number || ''}
                                </Typography>
                            )}
                        </Grid>
                    </Grid>
                </Grid>

                 <Grid item xs={12}>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>Temporal Context</Typography>
                    <Grid container spacing={2}>
                        <Grid item xs={4}>
                            <Typography variant="subtitle2" color="text.secondary">Current Time (UTC)</Typography>
                            <Typography variant="body1">
                                {localData?.temporal_context?.current_time || ''}
                            </Typography>
                        </Grid>
                        <Grid item xs={4}>
                            <Typography variant="subtitle2" color="text.secondary">Patient Local Time</Typography>
                            <Typography variant="body1">
                                {localData?.temporal_context?.patient_local_time || ''}
                            </Typography>
                        </Grid>
                        <Grid item xs={4}>
                            <Typography variant="subtitle2" color="text.secondary">Timezone</Typography>
                            <Typography variant="body1">{localData?.temporal_context?.timezone || ''}</Typography>
                        </Grid>
                    </Grid>
                </Grid>
            </Grid>

            {renderSuggestions()}
        </Paper>
    );
}

export default PatientProfileTab;