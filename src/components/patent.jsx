import React from 'react';
import { Box, Typography, Button, Grid, Paper, List, ListItem, ListItemText, Divider } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

// Mock data based on the PatientPreVisitReviewProfile schema
const mockPreVisitData = {
  patient_id: "MRN123456789",
  demographics: {
    full_name: {
      first_name: "John",
      last_name: "Doe",
    },
    age: 45,
    gender: "Male",
  },
  reason_for_visit: "Annual check-up and follow-up on hypertension.",
  medical_history_summary: {
    allergies_adverse_reactions: [
      { substance: "Penicillin", reaction_details: "Hives and rash", severity: "moderate" },
      { substance: "Peanuts", reaction_details: "Anaphylaxis", severity: "severe" },
    ],
    current_medications: [
      { name: "Lisinopril", dosage: "10mg", frequency: "Once daily" },
      { name: "Amlodipine", dosage: "5mg", frequency: "Once daily" },
    ],
    key_chronic_conditions: [
      { condition_name: "Hypertension", status: "Controlled" },
      { condition_name: "Type 2 Diabetes", status: "Fair control" },
    ],
  },
  latest_vitals: {
    date_recorded: "2025-05-09T10:30:00Z",
    blood_pressure: {
      systolic_mmhg: 130,
      diastolic_mmhg: 80,
    },
    heart_rate_bpm: 72,
    bmi: 26.5,
    temperature_celsius: 36.8,
  },
  lifestyle_highlights: {
    smoking_status: "Former Smoker",
    alcohol_consumption_status: "Current Drinker (Socially)",
    relevant_substance_use_note: "Occasional social drinker, 1-2 units per week.",
  },
  primary_care_physician_summary: {
    name: "Dr. Emily Carter",
    specialty: "Internal Medicine",
  },
};

function PatientPreVisitReviewTab({ data = mockPreVisitData, isMobile }) {
    // Helper to display a value or a placeholder
    const displayValue = (value, placeholder = 'N/A') => value || placeholder;

    const handleCopyProfile = () => {
        // Basic copy to clipboard (can be enhanced)
        navigator.clipboard.writeText(JSON.stringify(data, null, 2))
            .then(() => console.log("Profile copied to clipboard"))
            .catch(err => console.error("Failed to copy profile: ", err));
    };

    const renderHeaderButtons = () => {
        return (
            <Box sx={{ display: 'flex', justifyContent: isMobile ? 'center' : 'flex-end', width: '100%', mb: 2 }}>
                <Button
                    variant="outlined"
                    startIcon={<ContentCopyIcon />}
                    onClick={handleCopyProfile}
                    size="small"
                >
                    Copy Summary
                </Button>
            </Box>
        );
    };

    return (
        <Paper elevation={2} sx={{ padding: isMobile ? 2 : 3, mt: 2 }}>
            {renderHeaderButtons()}

            <Typography variant="h5" gutterBottom sx={{ textAlign: isMobile ? 'center' : 'left' }}>
                Patient Pre-Visit Summary
            </Typography>
            <Typography variant="subtitle1" gutterBottom sx={{ textAlign: isMobile ? 'center' : 'left', color: 'text.secondary' }}>
                Patient ID: {displayValue(data.patient_id)}
            </Typography>

            <Divider sx={{ my: 2 }} />

            {/* Demographics Section */}
            <Box mb={3}>
                <Typography variant="h6" gutterBottom>Demographics</Typography>
                <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="text.secondary">Full Name:</Typography>
                        <Typography variant="body1">
                            {displayValue(data.demographics?.full_name?.first_name)} {displayValue(data.demographics?.full_name?.last_name)}
                        </Typography>
                    </Grid>
                    <Grid item xs={12} sm={3}>
                        <Typography variant="body2" color="text.secondary">Age:</Typography>
                        <Typography variant="body1">{displayValue(data.demographics?.age)}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={3}>
                        <Typography variant="body2" color="text.secondary">Gender:</Typography>
                        <Typography variant="body1">{displayValue(data.demographics?.gender)}</Typography>
                    </Grid>
                </Grid>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Reason for Visit */}
            <Box mb={3}>
                <Typography variant="h6" gutterBottom>Reason for Visit</Typography>
                <Typography variant="body1">{displayValue(data.reason_for_visit)}</Typography>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Medical History Summary */}
            <Box mb={3}>
                <Typography variant="h6" gutterBottom>Medical History Summary</Typography>
                <Box mb={2}>
                    <Typography variant="subtitle1" gutterBottom>Allergies & Adverse Reactions:</Typography>
                    {data.medical_history_summary?.allergies_adverse_reactions?.length > 0 ? (
                        <List dense disablePadding>
                            {data.medical_history_summary.allergies_adverse_reactions.map((allergy, index) => (
                                <ListItem key={index} disableGutters>
                                    <ListItemText
                                        primary={`${displayValue(allergy.substance)} (${displayValue(allergy.severity)})`}
                                        secondary={displayValue(allergy.reaction_details)}
                                    />
                                </ListItem>
                            ))}
                        </List>
                    ) : <Typography variant="body2">None reported.</Typography>}
                </Box>
                <Box mb={2}>
                    <Typography variant="subtitle1" gutterBottom>Current Medications:</Typography>
                    {data.medical_history_summary?.current_medications?.length > 0 ? (
                        <List dense disablePadding>
                            {data.medical_history_summary.current_medications.map((med, index) => (
                                <ListItem key={index} disableGutters>
                                    <ListItemText
                                        primary={displayValue(med.name)}
                                        secondary={`Dosage: ${displayValue(med.dosage)}, Frequency: ${displayValue(med.frequency)}`}
                                    />
                                </ListItem>
                            ))}
                        </List>
                    ) : <Typography variant="body2">None reported.</Typography>}
                </Box>
                <Box>
                    <Typography variant="subtitle1" gutterBottom>Key Chronic Conditions:</Typography>
                    {data.medical_history_summary?.key_chronic_conditions?.length > 0 ? (
                        <List dense disablePadding>
                            {data.medical_history_summary.key_chronic_conditions.map((condition, index) => (
                                <ListItem key={index} disableGutters>
                                    <ListItemText
                                        primary={displayValue(condition.condition_name)}
                                        secondary={`Status: ${displayValue(condition.status)}`}
                                    />
                                </ListItem>
                            ))}
                        </List>
                    ) : <Typography variant="body2">None reported.</Typography>}
                </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Latest Vitals */}
            {data.latest_vitals && (
                <Box mb={3}>
                    <Typography variant="h6" gutterBottom>
                        Latest Vitals (as of {data.latest_vitals.date_recorded ? new Date(data.latest_vitals.date_recorded).toLocaleDateString() : 'N/A'})
                    </Typography>
                    <Grid container spacing={2}>
                        <Grid item xs={6} sm={3}>
                            <Typography variant="body2" color="text.secondary">Blood Pressure:</Typography>
                            <Typography variant="body1">
                                {displayValue(data.latest_vitals.blood_pressure?.systolic_mmhg)}/{displayValue(data.latest_vitals.blood_pressure?.diastolic_mmhg)} mmHg
                            </Typography>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                            <Typography variant="body2" color="text.secondary">Heart Rate:</Typography>
                            <Typography variant="body1">{displayValue(data.latest_vitals.heart_rate_bpm)} bpm</Typography>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                            <Typography variant="body2" color="text.secondary">BMI:</Typography>
                            <Typography variant="body1">{displayValue(data.latest_vitals.bmi)}</Typography>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                            <Typography variant="body2" color="text.secondary">Temperature:</Typography>
                            <Typography variant="body1">{displayValue(data.latest_vitals.temperature_celsius)} °C</Typography>
                        </Grid>
                    </Grid>
                </Box>
            )}

            <Divider sx={{ my: 2 }} />

            {/* Lifestyle Highlights */}
            {data.lifestyle_highlights && (
                <Box mb={3}>
                    <Typography variant="h6" gutterBottom>Lifestyle Highlights</Typography>
                    <Grid container spacing={1}>
                        <Grid item xs={12} sm={4}>
                            <Typography variant="body2" color="text.secondary">Smoking:</Typography>
                            <Typography variant="body1">{displayValue(data.lifestyle_highlights.smoking_status)}</Typography>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <Typography variant="body2" color="text.secondary">Alcohol:</Typography>
                            <Typography variant="body1">{displayValue(data.lifestyle_highlights.alcohol_consumption_status)}</Typography>
                        </Grid>
                         {data.lifestyle_highlights.relevant_substance_use_note &&
                            <Grid item xs={12} sm={4}>
                                <Typography variant="body2" color="text.secondary">Substance Use Note:</Typography>
                                <Typography variant="body1">{displayValue(data.lifestyle_highlights.relevant_substance_use_note)}</Typography>
                            </Grid>
                        }
                    </Grid>
                </Box>
            )}
            
            <Divider sx={{ my: 2 }} />

            {/* Primary Care Physician Summary */}
            {data.primary_care_physician_summary && (
                <Box>
                    <Typography variant="h6" gutterBottom>Primary Care Physician</Typography>
                    <Typography variant="body1">
                        Name: {displayValue(data.primary_care_physician_summary.name)}
                    </Typography>
                    <Typography variant="body1">
                        Specialty: {displayValue(data.primary_care_physician_summary.specialty)}
                    </Typography>
                </Box>
            )}

        </Paper>
    );
}

export default PatientPreVisitReviewTab;