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
  CardHeader,
  Button,
  Alert,
  CircularProgress,
  TextField
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SubjectIcon from '@mui/icons-material/Subject';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AssessmentIcon from '@mui/icons-material/Assessment';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import WarningIcon from '@mui/icons-material/Warning';
import EditIcon from '@mui/icons-material/Edit';
import { getAccessToken } from '../api';

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

// New EditableNoteItem component to allow editing note fields
const EditableNoteItem = ({ section, field, label, value, isEditMode, onUpdateNote }) => (
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
    
    {isEditMode ? (
      <TextField
        fullWidth
        multiline
        variant="outlined"
        size="small"
        value={value || ''}
        onChange={(e) => onUpdateNote(section, field, e.target.value)}
        sx={{ 
          pl: 2,
          '& .MuiOutlinedInput-root': {
            fontSize: { xs: '0.9rem', sm: '1rem' },
          }
        }}
      />
    ) : (
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
    )}
  </Box>
);

const DoctorNoteDisplay = ({ initialNote, medicalHistory, currentConsultId, pendingAIreviewId }) => {
  const [selectedNoteId, setSelectedNoteId] = useState(currentConsultId);
  const [currentNote, setCurrentNote] = useState(initialNote);
  const [isApproving, setIsApproving] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedNote, setEditedNote] = useState(null);

  useEffect(() => {
    // If the selectedNoteId changes, find the corresponding note in medicalHistory
    if (selectedNoteId === currentConsultId) {
      setCurrentNote(initialNote);
      // Reset editedNote with a deep copy of initialNote when switching notes
      setEditedNote(JSON.parse(JSON.stringify(initialNote)));
    } else {
      const foundNote = medicalHistory.find(note => note.id === selectedNoteId)?.doctor_note;
      setCurrentNote(foundNote || initialNote); // Fallback to initialNote if not found
      // Reset editedNote with a deep copy of the found note when switching notes
      setEditedNote(JSON.parse(JSON.stringify(foundNote || initialNote)));
    }
    
    // Exit edit mode when switching notes
    setIsEditMode(false);

    // Log for debugging
    console.log("Current Note:", initialNote);
    console.log("Medical History:", medicalHistory);
    console.log("Pending AI Review ID:", pendingAIreviewId);
  }, [selectedNoteId, medicalHistory, initialNote, currentConsultId, pendingAIreviewId]);

  const handleNoteChange = (event) => {
    setSelectedNoteId(event.target.value);
  };

  // Toggle edit mode
  const toggleEditMode = () => {
    if (isEditMode) {
      // If exiting edit mode, apply changes by updating currentNote
      setCurrentNote(editedNote);
      // Automatically save changes when exiting edit mode
      handleApproveReview();
    }
    setIsEditMode(!isEditMode);
  };

  // Update specific field in the edited note
  const updateEditedNote = (section, field, value) => {
    if (!isEditMode || !editedNote) return;
    
    setEditedNote(prevNote => {
      const newNote = {...prevNote};
      if (!newNote[section]) {
        newNote[section] = {};
      }
      newNote[section][field] = value;
      return newNote;
    });
  };

  // Function to approve AI review
  const handleApproveReview = async () => {
    if (!pendingAIreviewId || !currentConsultId) return;
    
    setIsApproving(true);
    try {
      const token = await getAccessToken();
      const noteToSave = isEditMode ? editedNote : currentNote;
      
      const response = await fetch(
        `https://health.prestigedelta.com/review-note/${currentConsultId}/save_doctor_note/`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            doctor_note: noteToSave
          }),
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        console.log("Doctor note saved successfully:", data);
        // Update current note with the response data
        setCurrentNote(data.doctor_note);
        setEditedNote(JSON.parse(JSON.stringify(data.doctor_note)));
        setIsEditMode(false);
        
        // Show success message or trigger a callback to refresh data
        alert("Doctor note saved and approved successfully!");
        
        // Refresh the page to reflect the changes
        window.location.reload();
      } else {
        const errorText = await response.text();
        throw new Error(`Failed to approve review: ${errorText}`);
      }
    } catch (error) {
      console.error("Error approving review:", error);
      alert("Error approving review: " + error.message);
    } finally {
      setIsApproving(false);
    }
  };
  
  // No need for reject functionality as per requirements
  
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
    <Box>
      {/* Pending AI Review Alert */}
      {pendingAIreviewId && selectedNoteId === pendingAIreviewId && (
        <Alert 
          severity="warning" 
          icon={<WarningIcon />}
          sx={{ 
            mb: 3, 
            borderRadius: 2,
            '& .MuiAlert-message': {
              width: '100%'
            }
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                AI Review Pending
              </Typography>
              <Typography variant="body2">
                This note was generated by AI and requires your review and approval.
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, ml: 2 }}>
              <Button
                variant="contained"
                color={isEditMode ? "primary" : "info"}
                size="small"
                startIcon={isEditMode ? <CheckCircleIcon /> : <EditIcon />}
                onClick={toggleEditMode}
                disabled={isApproving}
                sx={{ minWidth: 'auto' }}
              >
                {isEditMode ? 'Save Changes' : 'Edit Note'}
              </Button>
              {!isEditMode && (
                <Button
                  variant="contained"
                  color="success"
                  size="small"
                  startIcon={isApproving ? <CircularProgress size={16} color="inherit" /> : <CheckCircleIcon />}
                  onClick={handleApproveReview}
                  disabled={isApproving}
                  sx={{ minWidth: 'auto' }}
                >
                  {isApproving ? 'Approving...' : 'Approve'}
                </Button>
              )}
            </Box>
          </Box>
        </Alert>
      )}

      {Array.isArray(medicalHistory) && medicalHistory.length > 0 && (
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
                  <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                    <Typography sx={{ flex: 1 }}>
                      {`Note from ${formatDate(item.updated || item.created)} (ID: ${item.id}) - ${item.chief_complaint?.substring(0,30) || 'N/A'}...`}
                    </Typography>
                    {pendingAIreviewId && item.id === pendingAIreviewId && (
                      <Chip 
                        size="small" 
                        label="Pending Review" 
                        color="warning" 
                        variant="outlined"
                        sx={{ ml: 1, fontSize: '0.75rem' }}
                      />
                    )}
                  </Box>
                </MenuItem>
              ))}
          </Select>
        </FormControl>
      )}

      <Grid container spacing={{ xs: 2, md: 3 }}>
        <Grid item xs={12} md={6}>
          <Section title="Subjective">
            {isEditMode ? (
              <>
                <EditableNoteItem 
                  section="subjective" 
                  field="chief_complaint" 
                  label="Chief Complaint" 
                  value={editedNote?.subjective?.chief_complaint}
                  isEditMode={isEditMode}
                  onUpdateNote={updateEditedNote}
                />
                <EditableNoteItem 
                  section="subjective" 
                  field="history_of_present_illness" 
                  label="History of Present Illness" 
                  value={editedNote?.subjective?.history_of_present_illness}
                  isEditMode={isEditMode}
                  onUpdateNote={updateEditedNote}
                />
              </>
            ) : (
              <>
                <NoteItem label="Chief Complaint" value={subjective?.chief_complaint} />
                <NoteItem label="History of Present Illness" value={subjective?.history_of_present_illness} />
              </>
            )}
          </Section>

          <Section title="Objective">
            {isEditMode ? (
              <>
                <EditableNoteItem 
                  section="objective" 
                  field="examination_findings" 
                  label="Examination Findings" 
                  value={editedNote?.objective?.examination_findings}
                  isEditMode={isEditMode}
                  onUpdateNote={updateEditedNote}
                />
                <EditableNoteItem 
                  section="objective" 
                  field="investigations" 
                  label="Investigations Summary" 
                  value={editedNote?.objective?.investigations}
                  isEditMode={isEditMode}
                  onUpdateNote={updateEditedNote}
                />
              </>
            ) : (
              <>
                <NoteItem label="Examination Findings" value={objective?.examination_findings} />
                <NoteItem label="Investigations Summary" value={objective?.investigations} />
              </>
            )}
          </Section>
        </Grid>

        <Grid item xs={12} md={6}>
          <Section title="Assessment">
            {isEditMode ? (
              <>
                <EditableNoteItem 
                  section="assessment" 
                  field="primary_diagnosis" 
                  label="Primary Diagnosis" 
                  value={editedNote?.assessment?.primary_diagnosis}
                  isEditMode={isEditMode}
                  onUpdateNote={updateEditedNote}
                />
                <EditableNoteItem 
                  section="assessment" 
                  field="differential_diagnosis" 
                  label="Differential Diagnosis" 
                  value={editedNote?.assessment?.differential_diagnosis}
                  isEditMode={isEditMode}
                  onUpdateNote={updateEditedNote}
                />
                <EditableNoteItem 
                  section="assessment" 
                  field="diagnosis_reasoning" 
                  label="Diagnosis Reasoning" 
                  value={editedNote?.assessment?.diagnosis_reasoning}
                  isEditMode={isEditMode}
                  onUpdateNote={updateEditedNote}
                />
              </>
            ) : (
              <>
                <NoteItem label="Primary Diagnosis" value={assessment?.primary_diagnosis} />
                <NoteItem label="Differential Diagnosis" value={assessment?.differential_diagnosis} />
                <NoteItem label="Diagnosis Reasoning" value={assessment?.diagnosis_reasoning} />
              </>
            )}
            
            {assessment?.status && !isEditMode && (
              <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: { xs: 1, sm: 0 } }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 'medium', mr: 1, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>Status:</Typography>
                <Chip label={assessment.status} color={assessment.status === 'worsening' ? 'error' : assessment.status === 'stable' ? 'success' : 'info'} size="small" />
              </Box>
            )}
            
            {isEditMode && (
              <Box sx={{ mt: 2, mb: 1 }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ 
                  fontWeight: 'medium', 
                  fontSize: { xs: '0.8rem', sm: '0.875rem' },
                  mb: 0.5
                }}>
                  Status:
                </Typography>
                <FormControl fullWidth size="small" variant="outlined" sx={{ pl: 2 }}>
                  <Select
                    value={editedNote?.assessment?.status || ''}
                    onChange={(e) => updateEditedNote('assessment', 'status', e.target.value)}
                  >
                    <MenuItem value="stable">Stable</MenuItem>
                    <MenuItem value="improving">Improving</MenuItem>
                    <MenuItem value="worsening">Worsening</MenuItem>
                    <MenuItem value="resolved">Resolved</MenuItem>
                    <MenuItem value="unknown">Unknown</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            )}
          </Section>

          <Section title="Plan">
            {isEditMode ? (
              <>
                <EditableNoteItem 
                  section="plan" 
                  field="management" 
                  label="Management" 
                  value={editedNote?.plan?.management}
                  isEditMode={isEditMode}
                  onUpdateNote={updateEditedNote}
                />
                <EditableNoteItem 
                  section="plan" 
                  field="lifestyle_advice" 
                  label="Lifestyle Advice" 
                  value={editedNote?.plan?.lifestyle_advice}
                  isEditMode={isEditMode}
                  onUpdateNote={updateEditedNote}
                />
                <EditableNoteItem 
                  section="plan" 
                  field="follow_up" 
                  label="Follow-Up" 
                  value={editedNote?.plan?.follow_up}
                  isEditMode={isEditMode}
                  onUpdateNote={updateEditedNote}
                />
                <EditableNoteItem 
                  section="plan" 
                  field="patient_education" 
                  label="Patient Education" 
                  value={editedNote?.plan?.patient_education}
                  isEditMode={isEditMode}
                  onUpdateNote={updateEditedNote}
                />
                <EditableNoteItem 
                  section="plan" 
                  field="treatment_goal" 
                  label="Treatment Goal" 
                  value={editedNote?.plan?.treatment_goal}
                  isEditMode={isEditMode}
                  onUpdateNote={updateEditedNote}
                />
                <EditableNoteItem 
                  section="plan" 
                  field="plan_reasoning" 
                  label="Plan Reasoning" 
                  value={editedNote?.plan?.plan_reasoning}
                  isEditMode={isEditMode}
                  onUpdateNote={updateEditedNote}
                />
              </>
            ) : (
              <>
                <NoteItem label="Management" value={plan?.management} />
                <NoteItem label="Lifestyle Advice" value={plan?.lifestyle_advice} />
                <NoteItem label="Follow-Up" value={plan?.follow_up} />
                <NoteItem label="Patient Education" value={plan?.patient_education} />
                <NoteItem label="Treatment Goal" value={plan?.treatment_goal} />
                <NoteItem label="Plan Reasoning" value={plan?.plan_reasoning} />
                {next_review && <NoteItem label="Next Review Date" value={formatDate(next_review)} />}
              </>
            )}
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
