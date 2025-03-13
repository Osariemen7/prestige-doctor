import React, { useState, useEffect } from 'react';
import { Paper, Typography, Grid, TextField, Button, Box, IconButton } from '@mui/material';
import { format } from 'date-fns';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import VisibilityIcon from '@mui/icons-material/Visibility';

function PatientProfileTab({ data, editableData, schema, onDataChange, suggestion, onApplySuggestion, onSaveProfile, isSaving }) {
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
        onSaveProfile();
        setIsEditing(false);
    };

    const cancelEditing = () => {
        setLocalData(editableData);
        setIsEditing(false);
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
            emrText += `  Name: ${profileData.demographics.name || ''}\n`;
            emrText += `  Date of Birth: ${profileData.demographics.date_of_birth ? format(new Date(profileData.demographics.date_of_birth), 'MM/dd/yyyy') : ''}\n`;
            emrText += `  Gender: ${profileData.demographics.gender || ''}\n`;
            emrText += `  Location: ${profileData.demographics.location?.country_code || ''}\n`;
        }
        if (profileData.genetic_proxies) {
            emrText += "\nGENETIC INFORMATION:\n";
            emrText += `  Blood Type: ${profileData.genetic_proxies.blood_type || ''}\n`;
            emrText += `  Medication Sensitivities: ${profileData.genetic_proxies.medication_sensitivities?.join(', ') || ''}\n`;
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
            emrText += `  Circadian Rhythm: ${profileData.lifestyle.circadian_rhythm || ''}\n`;
        }
        if (profileData.clinical_status?.chronic_conditions) {
            emrText += `  Chronic Conditions: ${profileData.clinical_status.chronic_conditions?.join(', ') || ''}\n`;
        }
        if (profileData.clinical_status?.care_team?.primary_doctor) {
            emrText += "\nCLINICAL STATUS:\n";
            emrText += `  Primary Doctor: ${profileData.clinical_status.care_team.primary_doctor.name || ''}\n`;
            emrText += `  Specialty: ${profileData.clinical_status.care_team.primary_doctor.specialty || ''}\n`;
            emrText += `  Clinic Name: ${profileData.clinical_status.care_team.primary_doctor.clinic_name || ''}\n`;
            emrText += `  Phone Number: ${profileData.clinical_status.care_team.primary_doctor.phone_number || ''}\n`;
        }
        return emrText;
    };

    const renderSuggestions = () => {
        if (!suggestion) return null;
      
        const suggestedDob = suggestion.demographics?.date_of_birth;
        const dobDate = new Date(suggestedDob);
        
        return (
          <Box sx={{ mt: 3, border: '1px solid #ccc', padding: 2, borderRadius: 1, bgcolor: '#f9f9f9' }}>
            <Typography variant="h6" gutterBottom>Suggestion</Typography>
            {suggestion.demographics && 
              suggestedDob &&
              suggestedDob !== editableData.demographics?.date_of_birth && (
              <Typography variant="body2">
                Suggested Date of Birth:{" "}
                {isValidDate(dobDate) ? format(dobDate, 'MM/dd/yyyy') : 'Invalid Date'}
              </Typography>
            )}
            {suggestion.genetic_proxies && 
              suggestion.genetic_proxies.blood_type !== editableData.genetic_proxies?.blood_type && (
              <Typography variant="body2">
                Suggested Blood Type: {suggestion.genetic_proxies.blood_type}
              </Typography>
            )}
            <Button variant="contained" color="secondary" onClick={onApplySuggestion} sx={{ mt: 1 }}>
              Apply Suggestion
            </Button>
          </Box>
        );
      };
      
    // Render non-editing view
    if (!isEditing) {
        return (
            <Paper elevation={2} sx={{ padding: 3, mt: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h5">Patient Profile</Typography>
                    <Box>
                        <Button 
                            variant="outlined" 
                            startIcon={<ContentCopyIcon />} 
                            onClick={handleCopyProfile} 
                            sx={{ mr: 1 }}
                        >
                            Copy Profile
                        </Button>
                        
                        <Button 
                            variant="contained" 
                            color="primary" 
                            onClick={startEditing} 
                            startIcon={<EditIcon />}
                        >
                            Edit Profile
                        </Button>
                    </Box>
                </Box>

                <Grid container spacing={3}>
                    <Grid item xs={12}>
                        <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>Demographics</Typography>
                        <Grid container spacing={2}>
                        <Grid item xs={4}>
    <Typography variant="subtitle2" color="text.secondary">Name</Typography>
    <Typography variant="body1">
      {localData?.demographics?.name || ''}
    </Typography>
  </Grid>
                            <Grid item xs={4}>
                                <Typography variant="subtitle2" color="text.secondary">Date of Birth</Typography>
                                <Typography variant="body1">
                                    {localData?.demographics?.date_of_birth 
                                        ? format(new Date(localData.demographics.date_of_birth), 'MMMM d, yyyy') 
                                        : ''}
                                </Typography>
                            </Grid>
                            <Grid item xs={4}>
                                <Typography variant="subtitle2" color="text.secondary">Gender</Typography>
                                <Typography variant="body1">{localData?.demographics?.gender || ''}</Typography>
                            </Grid>
                            <Grid item xs={4}>
                                <Typography variant="subtitle2" color="text.secondary">Location</Typography>
                                <Typography variant="body1">{localData?.demographics?.location?.country_code || ''}</Typography>
                            </Grid>
                        </Grid>
                    </Grid>

                    <Grid item xs={12}>
                        <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>Genetic Information</Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={6}>
                                <Typography variant="subtitle2" color="text.secondary">Blood Type</Typography>
                                <Typography variant="body1">{localData?.genetic_proxies?.blood_type || ''}</Typography>
                            </Grid>
                            <Grid item xs={6}>
                                <Typography variant="subtitle2" color="text.secondary">Medication Sensitivities</Typography>
                                <Typography variant="body1">
                                    {localData?.genetic_proxies?.medication_sensitivities?.length 
                                        ? localData.genetic_proxies.medication_sensitivities.join(', ') 
                                        : 'None'}
                                </Typography>
                            </Grid>
                        </Grid>
                    </Grid>

                    <Grid item xs={12}>
                        <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>Biometrics</Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={3}>
                                <Typography variant="subtitle2" color="text.secondary">Height</Typography>
                                <Typography variant="body1">{localData?.lifestyle?.biometrics?.height || ''} cm</Typography>
                            </Grid>
                            <Grid item xs={3}>
                                <Typography variant="subtitle2" color="text.secondary">Weight</Typography>
                                <Typography variant="body1">{localData?.lifestyle?.biometrics?.weight || ''} kg</Typography>
                            </Grid>
                            <Grid item xs={3}>
                                <Typography variant="subtitle2" color="text.secondary">BMI</Typography>
                                <Typography variant="body1">{localData?.lifestyle?.biometrics?.bmi || ''}</Typography>
                            </Grid>
                            <Grid item xs={3}>
                                <Typography variant="subtitle2" color="text.secondary">Health Score</Typography>
                                <Typography variant="body1">{localData?.lifestyle?.biometrics?.health_score || ''}/100</Typography>
                            </Grid>
                        </Grid>
                    </Grid>

                    <Grid item xs={12}>
                        <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>Lifestyle</Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={12}>
                                <Typography variant="subtitle2" color="text.secondary">Circadian Rhythm</Typography>
                                <Typography variant="body1">{localData?.lifestyle?.circadian_rhythm || ''}</Typography>
                            </Grid>
                        </Grid>
                    </Grid>

                    <Grid item xs={12}>
                        <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>Clinical Status</Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={12}>
                                <Typography variant="subtitle2" color="text.secondary">Chronic Conditions</Typography>
                                <Typography variant="body1">
                                    {localData?.clinical_status?.chronic_conditions?.length 
                                        ? localData.clinical_status.chronic_conditions.join(', ') 
                                        : 'None'}
                                </Typography>
                            </Grid>
                        </Grid>
                        
                        <Typography variant="subtitle1" sx={{ mt: 2, mb: 1, fontWeight: 'bold' }}>Primary Doctor</Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="subtitle2" color="text.secondary">Doctor Name</Typography>
                                <Typography variant="body1">
                                    {localData?.clinical_status?.care_team?.primary_doctor?.name || ''}
                                </Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="subtitle2" color="text.secondary">Specialty</Typography>
                                <Typography variant="body1">
                                    {localData?.clinical_status?.care_team?.primary_doctor?.specialty || ''}
                                </Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="subtitle2" color="text.secondary">Clinic Name</Typography>
                                <Typography variant="body1">
                                    {localData?.clinical_status?.care_team?.primary_doctor?.clinic_name || ''}
                                </Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="subtitle2" color="text.secondary">Phone Number</Typography>
                                <Typography variant="body1">
                                    {localData?.clinical_status?.care_team?.primary_doctor?.phone_number || ''}
                                </Typography>
                            </Grid>
                        </Grid>
                    </Grid>
                </Grid>

                {renderSuggestions()}
            </Paper>
        );
    }
    const renderHeaderButtons = () => {
        return (
          <Box>
          
            <Button 
              variant="outlined" 
              startIcon={<ContentCopyIcon />} 
              onClick={handleCopyProfile} 
              sx={{ mr: 1, mb: 2 }}
            >
              Copy Profile
            </Button>
            {isEditing ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>   
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
    // Render editing view
    return (
        <Paper elevation={2} sx={{ padding: 3, mt: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h5">Patient Profile</Typography>
                {renderHeaderButtons()}
            </Box>

            <Grid container spacing={3}>
                <Grid item xs={12}>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>Demographics</Typography>
                    <Grid container spacing={2}>
                    <Grid item xs={12} md={4}>
    <TextField
      label="Name"
      fullWidth
      value={localData?.demographics?.name || ''}
      onChange={(e) => handleInputChange('demographics', 'name', e.target.value)}
    />
  </Grid>
                        <Grid item xs={12} md={4}>
                            <TextField
                                label="Date of Birth"
                                fullWidth
                                type="date"
                                value={localData?.demographics?.date_of_birth 
                                    ? format(new Date(localData.demographics.date_of_birth), 'yyyy-MM-dd') 
                                    : ''}
                                onChange={(e) => handleInputChange('demographics', 'date_of_birth', e.target.value)}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <TextField
                                label="Gender"
                                fullWidth
                                value={localData?.demographics?.gender || ''}
                                onChange={(e) => handleInputChange('demographics', 'gender', e.target.value)}
                            />
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <TextField
                                label="Location"
                                fullWidth
                                value={localData?.demographics?.location?.country_code || ''}
                                onChange={(e) => handleInputChange('demographics', 'location', 
                                    { ...localData?.demographics?.location, country_code: e.target.value })}
                            />
                        </Grid>
                    </Grid>
                </Grid>

                <Grid item xs={12}>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>Genetic Information</Typography>
                    <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                            <TextField
                                label="Blood Type"
                                fullWidth
                                value={localData?.genetic_proxies?.blood_type || ''}
                                onChange={(e) => handleInputChange('genetic_proxies', 'blood_type', e.target.value)}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                label="Medication Sensitivities"
                                fullWidth
                                value={localData?.genetic_proxies?.medication_sensitivities?.join(', ') || ''}
                                onChange={(e) => handleInputChange('genetic_proxies', 'medication_sensitivities', 
                                    e.target.value.split(',').map(item => item.trim()))}
                                helperText="Comma-separated list"
                            />
                        </Grid>
                    </Grid>
                </Grid>

                <Grid item xs={12}>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>Biometrics</Typography>
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6} md={3}>
                            <TextField
                                label="Height (cm)"
                                fullWidth
                                type="number"
                                value={localData?.lifestyle?.biometrics?.height || ''}
                                onChange={(e) => handleNestedInputChange('lifestyle', 'biometrics', 'height', 
                                    parseFloat(e.target.value))}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <TextField
                                label="Weight (kg)"
                                fullWidth
                                type="number"
                                value={localData?.lifestyle?.biometrics?.weight || ''}
                                onChange={(e) => handleNestedInputChange('lifestyle', 'biometrics', 'weight', 
                                    parseFloat(e.target.value))}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <TextField
                                label="BMI"
                                fullWidth
                                type="number"
                                value={localData?.lifestyle?.biometrics?.bmi || ''}
                                InputProps={{ readOnly: true }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <TextField
                                label="Health Score"
                                fullWidth
                                type="number"
                                value={localData?.lifestyle?.biometrics?.health_score || ''}
                                onChange={(e) => handleNestedInputChange('lifestyle', 'biometrics', 'health_score', 
                                    parseFloat(e.target.value))}
                            />
                        </Grid>
                    </Grid>
                </Grid>

                <Grid item xs={12}>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>Lifestyle</Typography>
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <TextField
                                label="Circadian Rhythm"
                                fullWidth
                                value={localData?.lifestyle?.circadian_rhythm || ''}
                                onChange={(e) => handleInputChange('lifestyle', 'circadian_rhythm', e.target.value)}
                            />
                        </Grid>
                    </Grid>
                </Grid>

                <Grid item xs={12}>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>Clinical Status</Typography>
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <TextField
                                label="Chronic Conditions"
                                fullWidth
                                value={localData?.clinical_status?.chronic_conditions?.join(', ') || ''}
                                onChange={(e) => handleInputChange('clinical_status', 'chronic_conditions', 
                                    e.target.value.split(',').map(item => item.trim()))}
                                helperText="Comma-separated list"
                            />
                        </Grid>
                    </Grid>
                    
                    <Typography variant="subtitle1" sx={{ mt: 2, mb: 1, fontWeight: 'bold' }}>Primary Doctor</Typography>
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                label="Doctor Name"
                                fullWidth
                                value={localData?.clinical_status?.care_team?.primary_doctor?.name || ''}
                                onChange={(e) => handleDoctorInputChange('name', e.target.value)}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                label="Specialty"
                                fullWidth
                                value={localData?.clinical_status?.care_team?.primary_doctor?.specialty || ''}
                                onChange={(e) => handleDoctorInputChange('specialty', e.target.value)}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                label="Clinic Name"
                                fullWidth
                                value={localData?.clinical_status?.care_team?.primary_doctor?.clinic_name || ''}
                                onChange={(e) => handleDoctorInputChange('clinic_name', e.target.value)}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                label="Phone Number"
                                fullWidth
                                value={localData?.clinical_status?.care_team?.primary_doctor?.phone_number || ''}
                                onChange={(e) => handleDoctorInputChange('phone_number', e.target.value)}
                            />
                        </Grid>
                    </Grid>
                </Grid>
            </Grid>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
                <Button 
                    onClick={cancelEditing} 
                    sx={{ mr: 1 }}
                    disabled={isSaving}
                >
                    Cancel
                </Button>
                <Button 
                    variant="contained" 
                    color="primary" 
                    onClick={saveChanges}
                    disabled={isSaving}
                >
                    Save Profile
                </Button>
            </Box>

            {renderSuggestions()}
        </Paper>
    );
}

export default PatientProfileTab;