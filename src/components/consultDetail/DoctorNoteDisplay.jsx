import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  List,
  ListItem,
  ListItemText,
  Divider,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Card,
  CardContent,
  CardHeader
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SubjectIcon from '@mui/icons-material/Subject';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AssessmentIcon from '@mui/icons-material/Assessment';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';

// Helper function to format date strings
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.error("Error formatting date:", dateString, error);
    return 'Invalid Date';
  }
};

const getSectionIcon = (title) => {
  switch(title) {
    case 'Subjective':
      return <SubjectIcon color="primary" />;
    case 'Objective':
      return <VisibilityIcon color="info" />;
    case 'Assessment':
      return <AssessmentIcon color="warning" />;
    case 'Plan':
      return <PlaylistAddCheckIcon color="success" />;
    default:
      return null;
  }
};

const Section = ({ title, children, icon }) => {
  const sectionIcon = icon || getSectionIcon(title);
  
  return (
    <Paper 
      elevation={2} 
      sx={{ 
        mb: 3, 
        borderRadius: 2, 
        overflow: 'hidden',
        transition: 'all 0.2s ease',
        '&:hover': {
          boxShadow: 3
        }
      }}
    >
      <CardHeader 
        avatar={sectionIcon}
        title={<Typography variant="h6" sx={{ 
          fontWeight: 'bold', 
          color: 'primary.main',
          fontSize: { xs: '1rem', sm: '1.1rem', md: '1.25rem' } 
        }}>{title}</Typography>}
        sx={{ 
          backgroundColor: 'grey.100', 
          borderBottom: '1px solid', 
          borderColor: 'divider',
          py: { xs: 1.5, sm: 2 }
        }}
      />
      <CardContent sx={{ p: { xs: 1.5, md: 2.5 } }}>
        {children}
      </CardContent>
    </Paper>
  );
};

const NoteItem = ({ label, value }) => (
  <Box sx={{ 
    mb: 2, 
    pb: 1.5,
    borderBottom: '1px dashed rgba(0, 0, 0, 0.1)', 
    '&:last-child': { 
      borderBottom: 'none',
      mb: 0,
      pb: 0
    }
  }}>
    <Typography 
      variant="subtitle2" 
      color="text.secondary" 
      sx={{ 
        fontWeight: 'medium', 
        fontSize: { xs: '0.8rem', sm: '0.875rem' },
        mb: 0.5, 
        display: 'flex',
        alignItems: 'center'
      }}
    >
      <Box 
        component="span" 
        sx={{ 
          width: 5, 
          height: 5, 
          borderRadius: '50%', 
          backgroundColor: 'primary.main', 
          mr: 1, 
          display: 'inline-block' 
        }} 
      />
      {label}:
    </Typography>
    <Typography 
      variant="body1" 
      sx={{ 
        whiteSpace: 'pre-wrap', 
        fontSize: { xs: '0.9rem', sm: '1rem' },
        pl: 2 // Indent the value to align with the label
      }}
    >
      {value || 'N/A'}
    </Typography>
  </Box>
);

const DoctorNoteDisplay = ({ initialNote, medicalHistory, currentConsultId }) => {
  const [selectedNoteId, setSelectedNoteId] = useState(currentConsultId);
  const [currentNote, setCurrentNote] = useState(initialNote);
  useEffect(() => {
    // If the selectedNoteId changes, find the corresponding note in medicalHistory
    if (selectedNoteId === currentConsultId) {
      setCurrentNote(initialNote);
    } else {
      const foundNote = medicalHistory.find(note => note.id === selectedNoteId)?.doctor_note;
      setCurrentNote(foundNote || initialNote); // Fallback to initialNote if not found
    }

    // Log for debugging
    console.log("Current Note:", initialNote);
    console.log("Medical History:", medicalHistory);
  }, [selectedNoteId, medicalHistory, initialNote, currentConsultId]);

  const handleNoteChange = (event) => {
    setSelectedNoteId(event.target.value);
  };
  if (!currentNote) {
    return (
      <Box sx={{ textAlign: 'center', p: 4 }}>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
          No doctor's note available for this selection.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          The doctor's note may not have been completed or is still being processed.
        </Typography>
      </Box>
    );
  }

  const { subjective, objective, assessment, plan, next_review, prescription, investigation } = currentNote;

  return (
    <Box>      {Array.isArray(medicalHistory) && medicalHistory.length > 0 && (
        <FormControl fullWidth sx={{ mb: 3 }}>
          <InputLabel id="medical-history-note-select-label">View Note From</InputLabel>
          <Select
            labelId="medical-history-note-select-label"
            id="medical-history-note-select"
            value={selectedNoteId}
            label="View Note From"
            onChange={handleNoteChange}
            sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
          >
            <MenuItem value={currentConsultId}>
              <em>Current Consultation Note</em>
            </MenuItem>
            {medicalHistory
              .filter(item => item.id !== currentConsultId && item.doctor_note) // Filter out current and notes without doctor_note
              .map((item) => (
                <MenuItem key={item.id} value={item.id} sx={{ flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
                  {`Note from ${formatDate(item.updated || item.created)} (ID: ${item.id}) - ${item.chief_complaint?.substring(0,30) || 'N/A'}...`}
                </MenuItem>
              ))}
          </Select>
        </FormControl>
      )}

      <Grid container spacing={{ xs: 2, md: 3 }}>
        <Grid item xs={12} md={6}>
          <Section title="Subjective">
            <NoteItem label="Chief Complaint" value={subjective?.chief_complaint} />
            <NoteItem label="History of Present Illness" value={subjective?.history_of_present_illness} />
          </Section>

          <Section title="Objective">
            <NoteItem label="Examination Findings" value={objective?.examination_findings} />
            <NoteItem label="Investigations Summary" value={objective?.investigations} />
          </Section>
        </Grid>

        <Grid item xs={12} md={6}>
          <Section title="Assessment">
            <NoteItem label="Primary Diagnosis" value={assessment?.primary_diagnosis} />
            <NoteItem label="Differential Diagnosis" value={assessment?.differential_diagnosis} />
            <NoteItem label="Diagnosis Reasoning" value={assessment?.diagnosis_reasoning} />
            {assessment?.status && (
              <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: { xs: 1, sm: 0 } }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 'medium', mr: 1, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>Status:</Typography>
                <Chip label={assessment.status} color={assessment.status === 'worsening' ? 'error' : assessment.status === 'stable' ? 'success' : 'info'} size="small" />
              </Box>
            )}
          </Section>

          <Section title="Plan">
            <NoteItem label="Management" value={plan?.management} />
            <NoteItem label="Lifestyle Advice" value={plan?.lifestyle_advice} />
            <NoteItem label="Follow-Up" value={plan?.follow_up} />
            <NoteItem label="Patient Education" value={plan?.patient_education} />
            <NoteItem label="Treatment Goal" value={plan?.treatment_goal} />
            <NoteItem label="Plan Reasoning" value={plan?.plan_reasoning} />
            {next_review && <NoteItem label="Next Review Date" value={formatDate(next_review)} />}
          </Section>
        </Grid>
      </Grid>

      {/* Detailed Prescriptions and Investigations are handled in separate tabs but can be summarized here if needed */}
      {/* For example, a quick summary or count */}      <Accordion 
        sx={{ 
          mt: 3, 
          borderRadius: 2, 
          boxShadow: 1, 
          '&:before': { display: 'none' },
          overflow: 'hidden',
          '&.Mui-expanded': {
            boxShadow: 3
          }
        }}
      >
        <AccordionSummary 
          expandIcon={<ExpandMoreIcon />} 
          aria-controls="panel-prescriptions-content" 
          id="panel-prescriptions-header"
          sx={{ 
            minHeight: { xs: '48px', sm: '56px' },
            backgroundColor: (theme) => theme.palette.primary.light + '20', // Light transparent background
            '&.Mui-expanded': {
              backgroundColor: (theme) => theme.palette.primary.light + '30', // Slightly darker when expanded
            }
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box sx={{ mr: 1 }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path>
              </svg>
            </Box>
            <Typography 
              variant="h6" 
              sx={{ 
                fontWeight: 'medium', 
                fontSize: { xs: '0.95rem', sm: '1.25rem' },
                color: 'primary.main'
              }}
            >
              Prescriptions ({prescription?.length || 0})
            </Typography>
          </Box>
        </AccordionSummary>        <AccordionDetails sx={{ backgroundColor: 'grey.50', p: { xs: 1.5, sm: 2.5 } }}>
          {prescription && prescription.length > 0 ? (
            <List disablePadding sx={{ overflowX: 'auto' }}>
              {prescription.map((p, index) => (
                <ListItem key={index} disableGutters divider={index < prescription.length - 1} 
                  sx={{ 
                    py: { xs: 1.5, sm: 2 },
                    px: { xs: 1.5, sm: 2.5 },
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    backgroundColor: index % 2 === 0 ? 'rgba(255,255,255,0.7)' : 'transparent',
                    borderRadius: 1,
                    '&:hover': {
                      backgroundColor: 'rgba(33, 150, 243, 0.04)'
                    },
                    transition: 'background-color 0.2s ease'
                  }}
                >
                  <Box sx={{ 
                    display: 'flex', 
                    flexDirection: { xs: 'column', sm: 'row' }, 
                    alignItems: { xs: 'flex-start', sm: 'center' },
                    width: '100%',
                    justifyContent: 'space-between',
                    mb: 1
                  }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'medium', fontSize: { xs: '0.95rem', sm: '1.1rem' }, color: 'primary.dark' }}>
                      {p.medication_name} {p.dosage}
                    </Typography>
                    <Chip 
                      size="small" 
                      label={`Every ${p.interval}h`} 
                      color="primary" 
                      variant="outlined" 
                      sx={{ fontWeight: 'medium', ml: { xs: 0, sm: 2 }, mt: { xs: 0.5, sm: 0 } }} 
                    />
                  </Box>
                  
                  <Grid container spacing={2} sx={{ mt: 0.5 }}>
                    <Grid item xs={12} sm={6} md={3}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1 }}>
                        <Box component="span" sx={{ color: 'text.secondary', fontSize: '0.875rem', mr: 1, minWidth: '60px' }}>Route:</Box>
                        <Box component="span" sx={{ fontWeight: 'medium', fontSize: '0.875rem' }}>{p.route || 'N/A'}</Box>
                      </Box>
                    </Grid>
                    
                    <Grid item xs={12} sm={6} md={3}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1 }}>
                        <Box component="span" sx={{ color: 'text.secondary', fontSize: '0.875rem', mr: 1, minWidth: '60px' }}>Start:</Box>
                        <Box component="span" sx={{ fontWeight: 'medium', fontSize: '0.875rem' }}>{p.start_date ? formatDate(p.start_date) : 'N/A'}</Box>
                      </Box>
                    </Grid>
                    
                    <Grid item xs={12} sm={6} md={3}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1 }}>
                        <Box component="span" sx={{ color: 'text.secondary', fontSize: '0.875rem', mr: 1, minWidth: '60px' }}>End:</Box>
                        <Box component="span" sx={{ fontWeight: 'medium', fontSize: '0.875rem' }}>{p.end_date ? formatDate(p.end_date) : 'N/A'}</Box>
                      </Box>
                    </Grid>
                    
                    <Grid item xs={12} sm={6} md={3}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1 }}>
                        <Box component="span" sx={{ color: 'text.secondary', fontSize: '0.875rem', mr: 1, minWidth: '60px' }}>Status:</Box>
                        <Box component="span" sx={{ fontWeight: 'medium', fontSize: '0.875rem' }}>{p.status || 'Active'}</Box>
                      </Box>
                    </Grid>
                    
                    <Grid item xs={12}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                        <Box component="span" sx={{ color: 'text.secondary', fontSize: '0.875rem', mr: 1, minWidth: '60px', alignSelf: 'flex-start' }}>Notes:</Box>
                        <Box component="span" sx={{ fontWeight: 'medium', fontSize: '0.875rem' }}>{p.instructions || 'No special instructions'}</Box>
                      </Box>
                    </Grid>
                  </Grid>
                </ListItem>
              ))}
            </List>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 3 }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#9e9e9e', marginBottom: '16px' }}>
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path>
              </svg>
              <Typography variant="body1" color="text.secondary">No prescriptions in this note.</Typography>
            </Box>
          )}
        </AccordionDetails>
      </Accordion>      <Accordion 
        sx={{ 
          mt: 2, 
          borderRadius: 2, 
          boxShadow: 1, 
          '&:before': { display: 'none' },
          overflow: 'hidden',
          '&.Mui-expanded': {
            boxShadow: 3
          }
        }}
      >
        <AccordionSummary 
          expandIcon={<ExpandMoreIcon />} 
          aria-controls="panel-investigations-content" 
          id="panel-investigations-header"
          sx={{ 
            minHeight: { xs: '48px', sm: '56px' },
            backgroundColor: (theme) => theme.palette.info.light + '20', // Light transparent background
            '&.Mui-expanded': {
              backgroundColor: (theme) => theme.palette.info.light + '30', // Slightly darker when expanded
            }
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box sx={{ mr: 1 }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
              </svg>
            </Box>
            <Typography 
              variant="h6" 
              sx={{ 
                fontWeight: 'medium', 
                fontSize: { xs: '0.95rem', sm: '1.25rem' },
                color: 'info.main'
              }}
            >
              Investigations Ordered ({investigation?.length || 0})
            </Typography>
          </Box>
        </AccordionSummary>        <AccordionDetails sx={{ backgroundColor: 'grey.50', p: { xs: 1.5, sm: 2.5 } }}>
          {investigation && investigation.length > 0 ? (
            <List disablePadding sx={{ overflowX: 'auto' }}>
              {investigation.map((inv, index) => (
                <ListItem key={index} disableGutters divider={index < investigation.length - 1}
                  sx={{ 
                    py: { xs: 1.5, sm: 2 },
                    px: { xs: 1.5, sm: 2.5 },
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    backgroundColor: index % 2 === 0 ? 'rgba(255,255,255,0.7)' : 'transparent',
                    borderRadius: 1,
                    mb: 1,
                    '&:hover': {
                      backgroundColor: 'rgba(3, 169, 244, 0.04)'
                    },
                    transition: 'background-color 0.2s ease'
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', mb: 1.5 }}>
                    <Typography variant="subtitle1" sx={{ 
                      fontWeight: 'medium', 
                      fontSize: { xs: '0.95rem', sm: '1.1rem' }, 
                      color: 'info.dark',
                      mr: 2,
                      flex: '1 1 auto' 
                    }}>
                      {inv.test_type}
                    </Typography>
                    {inv.scheduled_time && (
                      <Chip 
                        size="small" 
                        label={`Scheduled: ${formatDate(inv.scheduled_time)}`} 
                        color="info" 
                        variant="outlined" 
                        sx={{ fontWeight: 'medium' }} 
                      />
                    )}
                  </Box>
                  
                  <Box sx={{ width: '100%' }}>
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'flex-start',
                      mb: 1.5
                    }}>
                      <Box component="span" sx={{ 
                        color: 'text.secondary', 
                        fontSize: '0.875rem', 
                        mr: 1, 
                        minWidth: { xs: '60px', sm: '80px' },
                        alignSelf: 'flex-start'
                      }}>
                        Reason:
                      </Box>
                      <Box component="span" sx={{ 
                        fontWeight: 'medium', 
                        fontSize: '0.875rem',
                        flex: '1 1 auto'
                      }}>
                        {inv.reason || 'Not specified'}
                      </Box>
                    </Box>
                    
                    {inv.additional_instructions && (
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'flex-start'
                      }}>
                        <Box component="span" sx={{ 
                          color: 'text.secondary', 
                          fontSize: '0.875rem', 
                          mr: 1, 
                          minWidth: { xs: '60px', sm: '80px' },
                          alignSelf: 'flex-start'
                        }}>
                          Instructions:
                        </Box>
                        <Box component="span" sx={{ 
                          fontWeight: 'medium', 
                          fontSize: '0.875rem',
                          flex: '1 1 auto',
                          p: 1,
                          backgroundColor: 'rgba(3, 169, 244, 0.05)',
                          borderRadius: 1,
                          borderLeft: '3px solid',
                          borderLeftColor: 'info.main'
                        }}>
                          {inv.additional_instructions}
                        </Box>
                      </Box>
                    )}
                  </Box>
                </ListItem>
              ))}
            </List>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 3 }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#9e9e9e', marginBottom: '16px' }}>
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
              </svg>
              <Typography variant="body1" color="text.secondary">No investigations ordered in this note.</Typography>
            </Box>
          )}
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};

export default DoctorNoteDisplay;
