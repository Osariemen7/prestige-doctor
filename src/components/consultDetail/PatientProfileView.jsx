import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Avatar,
  Chip,
  Divider,
  Card,
  CardContent,
  CardHeader,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  useMediaQuery,
  useTheme
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import CakeIcon from '@mui/icons-material/Cake';
import WcIcon from '@mui/icons-material/Wc';
import ContactPhoneIcon from '@mui/icons-material/ContactPhone';
import EmailIcon from '@mui/icons-material/Email';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import MedicalInformationIcon from '@mui/icons-material/MedicalInformation';
import HealingIcon from '@mui/icons-material/Healing';
import SmokingRoomsIcon from '@mui/icons-material/SmokingRooms';
import NoDrinksIcon from '@mui/icons-material/NoDrinks'; // Changed from NoSmoking to NoDrinks
import SportsKabaddiIcon from '@mui/icons-material/SportsKabaddi'; // For activity level
import FamilyRestroomIcon from '@mui/icons-material/FamilyRestroom';

// Helper function to format date strings
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (error) {
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
      <Paper elevation={2} sx={{ p: 3, textAlign: 'center', borderRadius: 2 }}>
        <PersonIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
        <Typography variant="h6" color="text.secondary">
          Patient Profile Not Available
        </Typography>
      </Paper>
    );
  }

  const { demographics, contact, address, medical_conditions, allergies, medications, lifestyle, family_history } = profile;

  const fullName = demographics ? `${demographics.first_name || ''} ${demographics.last_name || ''}`.trim() : 'N/A';

  return (
    <Box>
      <Paper elevation={3} sx={{ 
        p: { xs: 2, md: 3 }, 
        borderRadius: 2, 
        mb: 3, 
        display: 'flex', 
        alignItems: 'center', 
        flexDirection: { xs: 'column', sm: 'row' },
        textAlign: { xs: 'center', sm: 'left' }
      }}>
        <Avatar sx={{ 
          width: { xs: 70, sm: 80 }, 
          height: { xs: 70, sm: 80 }, 
          mr: { sm: 3 }, 
          mb: { xs: 2, sm: 0 }, 
          bgcolor: 'primary.main', 
          fontSize: { xs: '1.8rem', sm: '2.5rem' } 
        }}>
          {fullName !== 'N/A' ? `${demographics.first_name[0]}${demographics.last_name[0]}` : <PersonIcon sx={{ fontSize: { xs: '2rem', sm: '2.5rem' } }}/>
          }
        </Avatar>
        <Box>
          <Typography variant="h4" component="div" sx={{ 
            fontWeight: 'bold',
            fontSize: { xs: '1.5rem', sm: '2.125rem' }
          }}>
            {fullName}
          </Typography>
          {demographics?.date_of_birth && (
            <Typography variant="subtitle1" color="text.secondary" sx={{ 
              fontSize: { xs: '0.875rem', sm: '1rem' }
            }}>
              Born: {formatDate(demographics.date_of_birth)}
            </Typography>
          )}
        </Box>
      </Paper>

      <Grid container spacing={{ xs: 2, md: 3 }}>
        <Grid item xs={12} sm={6} lg={4}>
          <SectionCard title="Demographics" icon={<PersonIcon color="primary" />}>
            <List dense>
              <ProfileItem icon={<CakeIcon fontSize="small" />} label="Date of Birth" value={formatDate(demographics?.date_of_birth)} />
              <ProfileItem icon={<WcIcon fontSize="small" />} label="Gender" value={demographics?.gender} />
              <ProfileItem icon={<PersonIcon fontSize="small" />} label="Preferred Language" value={demographics?.preferred_language} />
            </List>
          </SectionCard>
        </Grid>

        <Grid item xs={12} sm={6} lg={4}>
          <SectionCard title="Contact Information" icon={<ContactPhoneIcon color="primary" />}>
            <List dense>
              <ProfileItem icon={<EmailIcon fontSize="small" />} label="Email" value={contact?.email} />
              <ProfileItem icon={<ContactPhoneIcon fontSize="small" />} label="Phone" value={contact?.phone_number} />
              {address && (
                <ProfileItem 
                  icon={<LocationOnIcon fontSize="small" />} 
                  label="Address" 
                  value={`${address.street || ''}, ${address.city || ''}, ${address.state || ''} ${address.zip_code || ''}, ${address.country || ''}`.replace(/ ,|^, |, $/g, '') || 'N/A'}
                />
              )}
            </List>
          </SectionCard>
        </Grid>

        <Grid item xs={12} sm={6} lg={4}>
          <SectionCard title="Lifestyle" icon={<SportsKabaddiIcon color="primary" />}>
            <List dense>              <ProfileItem 
                icon={lifestyle?.smoking_status === 'non_smoker' ? <NoDrinksIcon fontSize="small" /> : <SmokingRoomsIcon fontSize="small" />} 
                label="Smoking Status" 
                value={lifestyle?.smoking_status}
              />
              <ProfileItem label="Alcohol Consumption" value={lifestyle?.alcohol_consumption} />
              <ProfileItem label="Activity Level" value={lifestyle?.activity_level} />
              <ProfileItem label="Dietary Habits" value={lifestyle?.dietary_habits} />
            </List>
          </SectionCard>
        </Grid>

        <Grid item xs={12} sm={6}>
          <SectionCard title="Medical Conditions" icon={<MedicalInformationIcon color="primary" />}>
            {medical_conditions && medical_conditions.length > 0 ? (
              <List dense sx={{ 
                maxHeight: { xs: '200px', sm: '250px' },
                overflowY: 'auto'
              }}>
                {medical_conditions.map((condition, index) => (
                  <ListItem key={index} sx={{ py: { xs: 0.5, sm: 1 } }}>
                    <ListItemText 
                      primary={condition.condition_name}
                      secondary={`Diagnosed: ${formatDate(condition.diagnosis_date)} - Severity: ${condition.severity || 'N/A'}`}
                      primaryTypographyProps={{ 
                        fontSize: { xs: '0.875rem', sm: '1rem' },
                        fontWeight: 'medium' 
                      }}
                      secondaryTypographyProps={{ 
                        fontSize: { xs: '0.75rem', sm: '0.875rem' } 
                      }}
                    />
                  </ListItem>
                ))}
              </List>
            ) : <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>No significant medical conditions reported.</Typography>}
          </SectionCard>
        </Grid>

        <Grid item xs={12} sm={6}>
          <SectionCard title="Allergies" icon={<HealingIcon color="primary" />}>
            {allergies && allergies.length > 0 ? (
              <List dense sx={{ 
                maxHeight: { xs: '200px', sm: '250px' },
                overflowY: 'auto'
              }}>
                {allergies.map((allergy, index) => (
                  <ListItem key={index} sx={{ py: { xs: 0.5, sm: 1 } }}>
                    <ListItemText 
                      primary={allergy.allergen}
                      secondary={`Reaction: ${allergy.reaction || 'N/A'} - Severity: ${allergy.severity || 'N/A'}`}
                      primaryTypographyProps={{ 
                        fontSize: { xs: '0.875rem', sm: '1rem' },
                        fontWeight: 'medium'  
                      }}
                      secondaryTypographyProps={{ 
                        fontSize: { xs: '0.75rem', sm: '0.875rem' } 
                      }}
                    />
                  </ListItem>
                ))}
              </List>
            ) : <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>No known allergies.</Typography>}
          </SectionCard>
        </Grid>
        
        <Grid item xs={12}>
          <SectionCard title="Current Medications" icon={<HealingIcon color="primary" />}>
            {medications && medications.length > 0 ? (
              <List dense sx={{ 
                maxHeight: { xs: 'none', md: '300px' },
                overflowY: { xs: 'visible', md: 'auto' }
              }}>
                {medications.map((med, index) => (
                  <ListItem key={index} sx={{ 
                    py: { xs: 0.5, sm: 1 },
                    flexDirection: { xs: 'column', sm: 'row' },
                    alignItems: { xs: 'flex-start', sm: 'center' },
                    mb: { xs: 1, sm: 0 }
                  }}>
                    <ListItemText 
                      primary={`${med.medication_name} ${med.dosage}`}
                      secondary={`Route: ${med.route} | Frequency: ${med.frequency} | Started: ${formatDate(med.start_date)}`}
                      primaryTypographyProps={{ 
                        fontSize: { xs: '0.875rem', sm: '1rem' },
                        fontWeight: 'medium' 
                      }}
                      secondaryTypographyProps={{ 
                        fontSize: { xs: '0.75rem', sm: '0.875rem' },
                        display: 'block', // Ensure secondary text wraps properly on mobile
                        mt: { xs: 0.5, sm: 0 }
                      }}
                    />
                  </ListItem>
                ))}
              </List>
            ) : <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>No current medications reported.</Typography>}
          </SectionCard>
        </Grid>

        <Grid item xs={12}>
          <SectionCard title="Family History" icon={<FamilyRestroomIcon color="primary" />}>
            {family_history && family_history.length > 0 ? (
              <List dense sx={{ 
                maxHeight: { xs: 'none', md: '300px' },
                overflowY: { xs: 'visible', md: 'auto' }
              }}>
                {family_history.map((item, index) => (
                  <ListItem key={index} sx={{ py: { xs: 0.5, sm: 1 } }}>
                    <ListItemText 
                      primary={`${item.condition} (${item.relationship})`}
                      secondary={`Notes: ${item.notes || 'N/A'}`}
                      primaryTypographyProps={{ 
                        fontSize: { xs: '0.875rem', sm: '1rem' },
                        fontWeight: 'medium' 
                      }}
                      secondaryTypographyProps={{ 
                        fontSize: { xs: '0.75rem', sm: '0.875rem' } 
                      }}
                    />
                  </ListItem>
                ))}
              </List>
            ) : <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>No family history reported.</Typography>}
          </SectionCard>
        </Grid>
      </Grid>
    </Box>
  );
};

export default PatientProfileView;
