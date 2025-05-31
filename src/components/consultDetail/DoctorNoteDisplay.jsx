import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  TextField,
  IconButton,
  Tooltip
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
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import { getAccessToken } from '../api';

// Optimized deep clone function for note data
const deepCloneNote = (note) => {
  if (!note) return null;
  
  return {
    ...note,
    prescription: Array.isArray(note.prescription) ? note.prescription.map(p => ({ ...p })) : [],
    investigation: Array.isArray(note.investigation) ? note.investigation.map(i => ({ ...i })) : [],
    subjective: note.subjective ? { ...note.subjective } : {},
    objective: note.objective ? { ...note.objective } : {},
    assessment: note.assessment ? { ...note.assessment } : {},
    plan: note.plan ? { ...note.plan } : {},
  };
};

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

const DoctorNoteDisplay = React.memo(({ initialNote, medicalHistory, currentConsultId, pendingAIreviewId }) => {
  // Initialize selectedNoteId to the first available medical history note, or currentConsultId if no history
  const getInitialSelectedId = () => {
    if (Array.isArray(medicalHistory) && medicalHistory.length > 0) {
      const firstNote = medicalHistory.find(item => item.doctor_note);
      return firstNote ? firstNote.id : currentConsultId;
    }
    return currentConsultId;
  };

  const [selectedNoteId, setSelectedNoteId] = useState(getInitialSelectedId());
  const [currentNote, setCurrentNote] = useState(initialNote);
  const [isApproving, setIsApproving] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedNote, setEditedNote] = useState(null);

  useEffect(() => {
    if (Array.isArray(medicalHistory) && medicalHistory.length > 0) {
      const firstNote = medicalHistory.find(item => item.doctor_note);
      if (firstNote && selectedNoteId === currentConsultId) {
        setSelectedNoteId(firstNote.id);
      }
    }

    let noteToDisplay;
    if (selectedNoteId === currentConsultId) {
      noteToDisplay = initialNote;
    } else {
      const foundItem = medicalHistory.find(item => item.id === selectedNoteId);
      noteToDisplay = foundItem?.doctor_note || initialNote;
    }
    
    setCurrentNote(noteToDisplay);

    // Guard against null noteToDisplay before spreading
    if (noteToDisplay) {
        const sanitizedNote = {
            ...noteToDisplay,
            prescription: Array.isArray(noteToDisplay.prescription) ? noteToDisplay.prescription : [],
            investigation: Array.isArray(noteToDisplay.investigation) ? noteToDisplay.investigation : [],
        };        setEditedNote(deepCloneNote(sanitizedNote));
    } else {
        // Handle case where noteToDisplay is null (e.g., set editedNote to a default structure or null)
        setEditedNote(null); // Or a default empty note structure
    }
    
    setIsEditMode(false);
  }, [selectedNoteId, medicalHistory, initialNote, currentConsultId]);

  const handleNoteChange = useCallback((event) => {
    setSelectedNoteId(event.target.value);
  }, []);

  const handleApproveReview = useCallback(async () => {
    if (!pendingAIreviewId || !currentConsultId) return;
    
    setIsApproving(true);
    try {
      const token = await getAccessToken();
      // Use editedNote if in edit mode and it exists, otherwise use currentNote
      const noteToSave = (isEditMode && editedNote) ? editedNote : currentNote;

      if (!noteToSave) {
          throw new Error("No note data to save.");
      }
      
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
        setCurrentNote(data.doctor_note);
        if (data.doctor_note) {
            setEditedNote(deepCloneNote(data.doctor_note));
        } else {
            setEditedNote(null);
        }
        setIsEditMode(false);
        
        alert("Doctor note saved and approved successfully!");
        window.location.reload();
      } else {
        const errorText = await response.text();
        throw new Error(`Failed to approve review: ${errorText}`);
      }
    } catch (error) {
      alert("Error approving review: " + error.message);
    } finally {
      setIsApproving(false);
    }
  }, [pendingAIreviewId, currentConsultId, isEditMode, editedNote, currentNote]);
  
  const toggleEditMode = useCallback(() => {
    if (isEditMode) {
      // Save changes when exiting edit mode
      setCurrentNote(editedNote);
      
      // Only call handleApproveReview if there's a pending AI review
      if (pendingAIreviewId && currentConsultId) {
        handleApproveReview();
      }
    } else if (currentNote) { // Only enter edit mode if there's a current note
        // Deep clone currentNote to editedNote when entering edit mode
        const noteToEdit = deepCloneNote(currentNote);
        
        // Ensure prescription and investigation fields are properly initialized
        if (!noteToEdit.prescription) noteToEdit.prescription = [];
        if (!noteToEdit.investigation) noteToEdit.investigation = [];
        
        setEditedNote(noteToEdit);
    }
    setIsEditMode(!isEditMode);
  }, [isEditMode, editedNote, currentNote, pendingAIreviewId, currentConsultId, handleApproveReview]);

  const updateEditedNote = useCallback((section, field, value) => {
    if (!isEditMode || !editedNote) return;
    
    setEditedNote(prevNote => {
      const newNote = {...prevNote};
      if (section === 'prescription' || section === 'investigation') {
        return prevNote; 
      }
      if (!newNote[section]) {
        newNote[section] = {};
      }      newNote[section][field] = value;
      return newNote;
    });
  }, [isEditMode, editedNote]);  const handleAddPrescription = useCallback(() => {
    if (!editedNote) return;
    
    setEditedNote(prev => {
      const newNote = {
        ...prev,
        prescription: [
          ...(prev.prescription || []),
          { 
            medication_name: '', 
            dosage: '', 
            interval: '', 
            route: '', 
            end_date: '' 
          }        ]
      };
      return newNote;
    });
  }, [editedNote]);const handleRemovePrescription = useCallback((index) => {
    if (!editedNote) return;
    
    setEditedNote(prev => ({
      ...prev,
      prescription: (prev.prescription || []).filter((_, i) => i !== index)
    }));
  }, [editedNote]);  const handleUpdatePrescriptionField = useCallback((index, field, value) => {
    if (!editedNote) return;
    
    setEditedNote(prev => ({
      ...prev,
      prescription: (prev.prescription || []).map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  }, [editedNote]);  const handleAddInvestigation = useCallback(() => {
    if (!editedNote) return;
    
    setEditedNote(prev => ({
      ...prev,
      investigation: [
        ...(prev.investigation || []),
        { test_type: '', reason: '' }
      ]
    }));
  }, [editedNote]);  const handleRemoveInvestigation = useCallback((index) => {
    if (!editedNote) return;
    
    setEditedNote(prev => ({
      ...prev,
      investigation: (prev.investigation || []).filter((_, i) => i !== index)
    }));
  }, [editedNote]);const handleUpdateInvestigationField = useCallback((index, field, value) => {
    if (!editedNote) return;
    
    // Add validation for specific fields
    if (field === 'scheduled_time' && value) {
      // Validate that the scheduled time is in the future
      const scheduledTime = new Date(value);
      const now = new Date();
      
      if (isNaN(scheduledTime.getTime())) {
        alert('Please enter a valid date and time.');
        return;
      }
    }
    
    setEditedNote(prev => {
      // If investigation doesn't exist or isn't an array, initialize it
      if (!Array.isArray(prev.investigation)) {
        return {
          ...prev,
          investigation: [{[field]: value}]
        };
      }
        return {
        ...prev,
        investigation: prev.investigation.map((item, i) =>
          i === index ? { ...item, [field]: value } : item
        )
      };
    });
  }, [editedNote]);
  
  // Memoize expensive computations for better performance (must be before early returns)
  const filteredMedicalHistory = useMemo(() => {
    return Array.isArray(medicalHistory) ? medicalHistory.filter(item => item.doctor_note) : [];
  }, [medicalHistory]);

  const prescription = useMemo(() => 
    (isEditMode && editedNote?.prescription) ? editedNote.prescription : (currentNote?.prescription || [])
  , [isEditMode, editedNote?.prescription, currentNote?.prescription]);
  
  const investigation = useMemo(() => 
    (isEditMode && editedNote?.investigation) ? editedNote.investigation : (currentNote?.investigation || [])
  , [isEditMode, editedNote?.investigation, currentNote?.investigation]);
  
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

  const { subjective, objective, assessment, plan, next_review } = currentNote;

  return (
    <Box>
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
            <Box sx={{ display: 'flex', gap: 1, ml: 2 }}>              <Button
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
      
      {/* Always show edit button */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button
          variant="contained"
          color={isEditMode ? "primary" : "info"}
          size="medium"
          startIcon={isEditMode ? <SaveIcon /> : <EditIcon />}
          onClick={toggleEditMode}
          disabled={isApproving}
          sx={{ minWidth: 'auto' }}
        >
          {isEditMode ? 'Save Changes' : 'Edit Note'}
        </Button>
      </Box>      {filteredMedicalHistory.length > 0 && (
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
            {filteredMedicalHistory.map((item) => (
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
      </Grid>      <Accordion 
        expanded={isEditMode || prescription?.length > 0}
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
            backgroundColor: (theme) => theme.palette.primary.light + '20', 
            '&.Mui-expanded': {
              backgroundColor: (theme) => theme.palette.primary.light + '30', 
            }
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box sx={{ mr: 1 }}>
              {/* Corrected SVG attributes */}
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
            >              Prescriptions ({isEditMode && editedNote?.prescription ? editedNote.prescription.length : (prescription?.length || 0)})
            </Typography>
          </Box>
        </AccordionSummary>        <AccordionDetails sx={{ backgroundColor: 'grey.50', p: { xs: 1.5, sm: 2.5 } }}>
          {/* Show edit mode when in edit mode (toggleEditMode already handles the restrictions) */}
          {isEditMode ? (
            <>
              <Typography variant="h6" sx={{ mb: 2 }}>Edit Prescriptions</Typography>
                {/* Simple list of prescriptions with add/remove */}
              {(editedNote?.prescription || []).map((p, index) => (
                <Paper key={index} elevation={1} sx={{ mb: 2, p: 2, borderRadius: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ flex: 1 }}>
                      <TextField
                        label="Medication Name"
                        value={p.medication_name || ''}
                        onChange={(e) => handleUpdatePrescriptionField(index, 'medication_name', e.target.value)}
                        fullWidth
                        sx={{ mb: 1 }}
                      />
                      <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
                        <TextField
                          label="Dosage"
                          value={p.dosage || ''}
                          onChange={(e) => handleUpdatePrescriptionField(index, 'dosage', e.target.value)}
                          sx={{ flex: 1 }}
                        />
                        <TextField
                          label="Frequency"
                          value={p.interval || ''}
                          onChange={(e) => handleUpdatePrescriptionField(index, 'interval', e.target.value)}
                          sx={{ flex: 1 }}
                        />
                      </Box>
                      <Box sx={{ display: 'flex', gap: 2 }}>
                        <TextField
                          label="Route"
                          value={p.route || ''}
                          onChange={(e) => handleUpdatePrescriptionField(index, 'route', e.target.value)}
                          sx={{ flex: 1 }}
                        />
                        <TextField
                          label="End Date"
                          type="date"
                          value={p.end_date || ''}
                          onChange={(e) => handleUpdatePrescriptionField(index, 'end_date', e.target.value)}
                          sx={{ flex: 1 }}
                          InputLabelProps={{
                            shrink: true,
                          }}
                        />
                      </Box>
                    </Box>
                    <IconButton onClick={() => handleRemovePrescription(index)} color="error" sx={{ ml: 2 }}>
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </Paper>
              ))}
              
              <Button
                startIcon={<AddIcon />}
                onClick={handleAddPrescription}
                variant="outlined"
                sx={{ mt: 2 }}
              >
                Add Prescription</Button>
            </>
          ) : (
            prescription && prescription.length > 0 ? (
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
            )
          )}
        </AccordionDetails>
      </Accordion>
      
      {/* Second accordion for investigations */}      <Accordion 
        expanded={isEditMode || investigation?.length > 0}
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
            backgroundColor: (theme) => theme.palette.info.light + '20', 
            '&.Mui-expanded': {
              backgroundColor: (theme) => theme.palette.info.light + '30', 
            }
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box sx={{ mr: 1 }}>
              {/* Corrected SVG attributes */}
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
            >              Investigations Ordered ({isEditMode && editedNote?.investigation ? editedNote.investigation.length : (investigation?.length || 0)})
            </Typography>
          </Box>
        </AccordionSummary>        <AccordionDetails sx={{ backgroundColor: 'grey.50', p: { xs: 1.5, sm: 2.5 } }}>
          {/* Show edit mode when in edit mode (toggleEditMode already handles the restrictions) */}
          {isEditMode ? (
            <>
              <Typography variant="h6" sx={{ mb: 2 }}>Edit Investigations</Typography>
              
              {/* Simple list of investigations with add/remove */}
              {(editedNote?.investigation || []).map((inv, index) => (
                <Paper key={index} elevation={1} sx={{ mb: 2, p: 2, borderRadius: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ flex: 1 }}>
                      <TextField
                        label="Test Type"
                        value={inv.test_type || ''}
                        onChange={(e) => handleUpdateInvestigationField(index, 'test_type', e.target.value)}
                        fullWidth
                        sx={{ mb: 1 }}
                      />
                      <TextField
                        label="Reason"
                        value={inv.reason || ''}
                        onChange={(e) => handleUpdateInvestigationField(index, 'reason', e.target.value)}
                        fullWidth
                        multiline
                        rows={2}
                      />
                    </Box>
                    <IconButton onClick={() => handleRemoveInvestigation(index)} color="error" sx={{ ml: 2 }}>
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </Paper>
              ))}
              
              <Button
                startIcon={<AddIcon />}
                onClick={handleAddInvestigation}
                variant="outlined"
                sx={{ mt: 2 }}
              >
                Add Investigation
              </Button>
            </>
          ) : (
            investigation && investigation.length > 0 ? (
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
            )
          )}
        </AccordionDetails>
      </Accordion>
    </Box>  );
});

export default DoctorNoteDisplay;