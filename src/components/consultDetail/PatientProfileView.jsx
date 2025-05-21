import React from 'react';
import { 
  useTheme, useMediaQuery, 
  Box, Typography, Grid,
  Card, CardHeader, CardContent,
  List, ListItem, ListItemIcon, ListItemText,
  Divider, Avatar, Chip
} from '@mui/material';
import {
  Person as PersonIcon,
  Cake as CakeIcon,
  Wc as GenderIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  Bloodtype as BloodtypeIcon,
  MedicalServices as MedicalIcon,
  Medication as MedicationIcon,
  Warning as WarningIcon,
  DirectionsRun as ActivityIcon,
  Restaurant as DietIcon,
  Nightlight as SleepIcon,
  Height as HeightIcon,
  Monitor as MonitorIcon
} from '@mui/icons-material';

// Helper function to format date strings
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch (error) {
    console.error("Error formatting date:", dateString, error);
    return 'Invalid Date';
  }
};

const ProfileItem = ({ icon, label, value }) => (
  <ListItem sx={{ py: { xs: 0.5, sm: 1 } }}>
    <ListItemIcon sx={{ minWidth: { xs: 30, sm: 36 } }}>{icon}</ListItemIcon>
    <ListItemText 
      primary={value || 'N/A'} 
      secondary={label} 
      primaryTypographyProps={{ 
        fontSize: { xs: '0.875rem', sm: '1rem' } 
      }}
      secondaryTypographyProps={{ 
        fontSize: { xs: '0.75rem', sm: '0.875rem' } 
      }}
    />
  </ListItem>
);

const SectionCard = ({ title, icon, children }) => (
  <Card elevation={2} sx={{ borderRadius: 2, height: '100%' }}>
    <CardHeader 
      avatar={icon}
      title={<Typography variant="h6" sx={{ 
        fontWeight: 'bold', 
        color: 'primary.main',
        fontSize: { xs: '0.9rem', sm: '1.25rem' }
      }}>{title}</Typography>}
      sx={{ 
        backgroundColor: 'grey.100', 
        borderBottom: '1px solid', 
        borderColor: 'divider',
        p: { xs: 1.5, sm: 2 }
      }}
    />
    <CardContent sx={{ p: { xs: 1, md: 2 } }}>
      {children}
    </CardContent>
  </Card>
);

const PatientProfileView = ({ profile }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  if (!profile) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">No patient data available</Typography>
      </Box>
    );
  }

  console.log("Profile data received:", profile); // Add this to debug

  // Extract all relevant sections from the profile data
  const { 
    demographics = {}, 
    genetic_proxies = {}, 
    environment = {},
    lifestyle = {},
    clinical_status = {}
  } = profile;

  const fullName = demographics ? `${demographics.first_name || ''} ${demographics.last_name || ''}`.trim() : 'N/A';
  
  // Convert API structure to the component's expected format
  const medications = clinical_status?.medications || [];
  const chronic_conditions = clinical_status?.chronic_conditions || [];
  const blood_type = genetic_proxies?.blood_type || 'N/A';
  const family_history = genetic_proxies?.family_history || [];
  const biometrics = lifestyle?.biometrics || {};
  const environmental_factors = environment?.environmental_risks || [];

  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="h5" sx={{ 
        mb: 3, 
        fontWeight: 'bold',
        color: 'primary.main',
        fontSize: { xs: '1.25rem', sm: '1.5rem' }
      }}>
        Patient Profile: {fullName}
      </Typography>
    
      <Grid container spacing={3}>
        {/* Personal Information */}
        <Grid item xs={12} md={6}>
          <SectionCard 
            title="Personal Information" 
            icon={<PersonIcon color="primary" />}
          >
            <List disablePadding>
              <ProfileItem 
                icon={<PersonIcon fontSize="small" />} 
                label="Full Name" 
                value={fullName} 
              />
              <ProfileItem 
                icon={<CakeIcon fontSize="small" />} 
                label="Date of Birth" 
                value={formatDate(demographics.date_of_birth)} 
              />
              <ProfileItem 
                icon={<GenderIcon fontSize="small" />} 
                label="Gender" 
                value={demographics.gender ? demographics.gender.charAt(0).toUpperCase() + demographics.gender.slice(1) : 'N/A'} 
              />
              <ProfileItem 
                icon={<PhoneIcon fontSize="small" />} 
                label="Phone Number" 
                value={demographics.phone_number} 
              />
              <ProfileItem 
                icon={<LocationIcon fontSize="small" />} 
                label="Country" 
                value={demographics.location?.country_code || 'N/A'} 
              />
              <ProfileItem 
                icon={<BloodtypeIcon fontSize="small" />} 
                label="Blood Type" 
                value={blood_type} 
              />
            </List>
          </SectionCard>
        </Grid>

        {/* Biometrics */}
        <Grid item xs={12} md={6}>
          <SectionCard 
            title="Biometrics" 
            icon={<HeightIcon color="primary" />}
          >
            <List disablePadding>
              <ProfileItem 
                icon={<HeightIcon fontSize="small" />} 
                label="Height" 
                value={biometrics.height ? `${biometrics.height} cm` : 'N/A'} 
              />
              <ProfileItem 
                icon={<MonitorIcon fontSize="small" />} 
                label="Weight" 
                value={biometrics.weight ? `${biometrics.weight} kg` : 'N/A'} 
              />
              <ProfileItem 
                icon={<ActivityIcon fontSize="small" />} 
                label="BMI" 
                value={biometrics.bmi || 'N/A'} 
              />
            </List>
          </SectionCard>
        </Grid>

        {/* Medical Conditions */}
        <Grid item xs={12} md={6}>
          <SectionCard 
            title="Medical Conditions" 
            icon={<MedicalIcon color="primary" />}
          >
            {chronic_conditions.length > 0 ? (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {chronic_conditions.map((condition, index) => (
                  <Chip 
                    key={index}
                    label={condition} 
                    color="primary" 
                    variant="outlined" 
                    size={isMobile ? "small" : "medium"}
                  />
                ))}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">No medical conditions recorded</Typography>
            )}
          </SectionCard>
        </Grid>

        {/* Medications */}
        <Grid item xs={12} md={6}>
          <SectionCard 
            title="Medications" 
            icon={<MedicationIcon color="primary" />}
          >
            {medications.length > 0 ? (
              <List disablePadding>
                {medications.map((medication, index) => (
                  <ListItem key={index} sx={{ py: 0.5 }}>
                    <ListItemIcon sx={{ minWidth: 30 }}>
                      <MedicationIcon fontSize="small" color="primary" />
                    </ListItemIcon>
                    <ListItemText 
                      primary={medication} 
                      primaryTypographyProps={{ 
                        fontSize: { xs: '0.875rem', sm: '1rem' } 
                      }}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="text.secondary">No medications recorded</Typography>
            )}
          </SectionCard>
        </Grid>

        {/* Environmental Factors */}
        <Grid item xs={12} md={6}>
          <SectionCard 
            title="Environmental Factors" 
            icon={<WarningIcon color="primary" />}
          >
            {environmental_factors.length > 0 ? (
              <List disablePadding>
                {environmental_factors.map((factor, index) => (
                  <ListItem key={index} sx={{ py: 0.5 }}>
                    <ListItemIcon sx={{ minWidth: 30 }}>
                      <WarningIcon fontSize="small" color="warning" />
                    </ListItemIcon>
                    <ListItemText 
                      primary={factor} 
                      primaryTypographyProps={{ 
                        fontSize: { xs: '0.875rem', sm: '1rem' } 
                      }}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="text.secondary">No environmental factors recorded</Typography>
            )}
          </SectionCard>
        </Grid>

        {/* Family History */}
        <Grid item xs={12} md={6}>
          <SectionCard 
            title="Family History" 
            icon={<PersonIcon color="primary" />}
          >
            {family_history.length > 0 ? (
              <List disablePadding>
                {family_history.map((item, index) => (
                  <ListItem key={index} sx={{ py: 0.5 }}>
                    <ListItemIcon sx={{ minWidth: 30 }}>
                      <PersonIcon fontSize="small" color="primary" />
                    </ListItemIcon>
                    <ListItemText 
                      primary={item} 
                      primaryTypographyProps={{ 
                        fontSize: { xs: '0.875rem', sm: '1rem' } 
                      }}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="text.secondary">No family history recorded</Typography>
            )}
          </SectionCard>
        </Grid>
      </Grid>
    </Box>
  );
};

export default PatientProfileView;
