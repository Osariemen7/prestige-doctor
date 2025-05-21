import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogActions, DialogContent, DialogTitle, TextField, Button, Grid, Typography,
  Select, MenuItem, InputLabel, FormControl, Chip, Box, IconButton, Tabs, Tab,
  useMediaQuery, Autocomplete
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';

// List of common chronic conditions (from original AddPatientModal.jsx)
const commonChronicConditions = [
  { value: 'Hypertension', label: 'Hypertension' },
  { value: 'Diabetes', label: 'Diabetes' },
  { value: 'Asthma', label: 'Asthma' },
  { value: 'COPD', label: 'COPD (Chronic Obstructive Pulmonary Disease)' },
  { value: 'Arthritis', label: 'Arthritis' },
  { value: 'Heart Disease', label: 'Heart Disease' },
  { value: 'Cancer', label: 'Cancer' },
  { value: 'Stroke', label: 'Stroke' },
  { value: 'Depression', label: 'Depression' },
  { value: 'Anxiety', label: 'Anxiety' },
  { value: 'Bipolar Disorder', label: 'Bipolar Disorder' },
  { value: 'Schizophrenia', label: 'Schizophrenia' },
  { value: 'Epilepsy', label: 'Epilepsy' },
  { value: "Parkinson's Disease", label: "Parkinson's Disease" },
  { value: 'Multiple Sclerosis', label: 'Multiple Sclerosis' },
  { value: 'HIV/AIDS', label: 'HIV/AIDS' },
  { value: 'Kidney Disease', label: 'Kidney Disease' },
  { value: 'Liver Disease', label: 'Liver Disease' },
  { value: 'GERD', label: 'GERD (Gastroesophageal Reflux Disease)' },
  { value: 'IBS', label: 'IBS (Irritable Bowel Syndrome)' },
  { value: "Crohn's Disease", label: "Crohn's Disease" },
  { value: 'Ulcerative Colitis', label: 'Ulcerative Colitis' },
  { value: 'Celiac Disease', label: 'Celiac Disease' },
  { value: 'Fibromyalgia', label: 'Fibromyalgia' },
  { value: 'Lupus', label: 'Lupus' },
  { value: 'Sickle Cell Disease', label: 'Sickle Cell Disease' },
  { value: 'Thyroid Disorders', label: 'Thyroid Disorders' },
  { value: 'Osteoporosis', label: 'Osteoporosis' },
  { value: 'Chronic Fatigue Syndrome', label: 'Chronic Fatigue Syndrome' },
  { value: 'Sleep Apnea', label: 'Sleep Apnea' },
];

// Common health metrics (from original AddPatientModal.jsx)
const commonMetrics = [
  { name: 'Blood Pressure (Systolic)', unit: 'mmHg' },
  { name: 'Blood Pressure (Diastolic)', unit: 'mmHg' },
  { name: 'Blood Sugar', unit: 'mg/dL' },
  { name: 'Weight', unit: 'kg' },
  { name: 'Body Mass Index (BMI)', unit: 'kg/m²' },
  { name: 'Heart Rate', unit: 'bpm' },
  { name: 'Cholesterol (Total)', unit: 'mg/dL' },
  { name: 'LDL Cholesterol', unit: 'mg/dL' },
  { name: 'HDL Cholesterol', unit: 'mg/dL' },
  { name: 'Triglycerides', unit: 'mg/dL' },
  { name: 'A1C', unit: '%' },
  { name: 'Steps', unit: 'steps/day' },
  { name: 'Sleep Duration', unit: 'hours' },
  { name: 'Oxygen Saturation', unit: '%' },
  { name: 'Respiratory Rate', unit: 'breaths/min' },
];

const intervalOptions = [
  { value: 1, label: 'Hourly' },
  { value: 24, label: 'Daily' },
  { value: 168, label: 'Weekly' },
  { value: 336, label: 'Every 2 Weeks' },
  { value: 720, label: 'Monthly' }, // Approx 30 days
  { value: 1440, label: 'Every 2 Months' }, // Approx 60 days
  { value: 2160, label: 'Every 3 Months' }, // Approx 90 days
];

// Function to validate international phone number format
const isValidPhoneNumber = (phoneNumber) => {
  const phoneRegex = /^\+[1-9]\d{1,14}$/;
  return phoneRegex.test(phoneNumber.replace(/[\s-]/g, ''));
};

const AddPatientModalMui = ({ isOpen, onClose, onAddPatient, isLoading }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [activeTab, setActiveTab] = useState(0);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [chronicConditions, setChronicConditions] = useState([]);
  const [customCondition, setCustomCondition] = useState('');
  const [message, setMessage] = useState('');

  const [withHealthGoal, setWithHealthGoal] = useState(false);
  const [healthGoal, setHealthGoal] = useState({
    goal_name: '',
    target_date: '',
    comments: '',
    doctor_instructions: '',
    metrics: [],
    actions: []
  });
  const [newMetric, setNewMetric] = useState({ metric_name: '', unit: '', interval: 24, target_value: '' });
  const [newAction, setNewAction] = useState({ name: '', description: '', interval: 24, action_end_date: '' });

  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setPhoneNumber('');
    setChronicConditions([]);
    setCustomCondition('');
    setMessage('');
    setActiveTab(0);
    setWithHealthGoal(false);
    setHealthGoal({
      goal_name: '', target_date: '', comments: '', doctor_instructions: '', // context and checkin_interval removed
      metrics: [], actions: []
    });
    setNewMetric({ metric_name: '', unit: '', interval: 24, target_value: '' });
    setNewAction({ name: '', description: '', interval: 24, action_end_date: '' });
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleSubmit = () => {
    if (!firstName || !lastName || !phoneNumber) {
      setMessage('First Name, Last Name, and Phone Number are required.');
      setActiveTab(0); // Switch to patient details tab
      return;
    }
    if (!isValidPhoneNumber(phoneNumber)) {
      setMessage('Invalid phone number format. Please use international format (e.g., +1234567890).');
      setActiveTab(0); // Switch to patient details tab
      return;
    }

    if (withHealthGoal) {
      if (!healthGoal.goal_name) {
        setMessage('Goal Name is required when adding a health goal.');
        setActiveTab(1); // Switch to health goal tab
        return;
      }
      if (!healthGoal.target_date) {
        setMessage('Target Date is required when adding a health goal.');
        setActiveTab(1);
        return;
      }
      if (healthGoal.metrics.length === 0) {
        setMessage('At least one Metric is required when adding a health goal.');
        setActiveTab(1);
        return;
      }
      if (healthGoal.actions.length === 0) {
        setMessage('At least one Action is required when adding a health goal.');
        setActiveTab(1);
        return;
      }
    }

    setMessage('');
    const patientData = {
      first_name: firstName,
      last_name: lastName,
      phone_number: phoneNumber,
      chronic_conditions: chronicConditions.map(c => c.value),
    };
    if (withHealthGoal) {
      patientData.health_goal = {
        goal_name: healthGoal.goal_name,
        target_date: healthGoal.target_date,
        comments: healthGoal.comments,
        doctor_instructions: healthGoal.doctor_instructions,
        metrics: healthGoal.metrics.map(m => ({ ...m, interval: parseInt(m.interval, 10) })),
        actions: healthGoal.actions.map(a => ({ ...a, interval: parseInt(a.interval, 10) })),
      };
    }
    onAddPatient(patientData, resetForm);
  };

  const addChronicCondition = (conditionValue) => {
    if (conditionValue && !chronicConditions.find(c => c.value === conditionValue)) {
      const conditionObj = commonChronicConditions.find(c => c.value === conditionValue);
      if (conditionObj) {
        setChronicConditions([...chronicConditions, conditionObj]);
      }
    }
  };
  
  const handleCustomConditionAdd = () => {
    if (customCondition && !chronicConditions.find(c => c.value.toLowerCase() === customCondition.toLowerCase())) {
      setChronicConditions([...chronicConditions, { value: customCondition, label: customCondition }]);
      setCustomCondition('');
    }
  };

  const removeChronicCondition = (conditionValue) => {
    setChronicConditions(chronicConditions.filter(c => c.value !== conditionValue));
  };

  const addMetric = () => {
    if (newMetric.metric_name && newMetric.unit && newMetric.target_value) {
      setHealthGoal(prev => ({ ...prev, metrics: [...prev.metrics, { ...newMetric }] }));
      setNewMetric({ metric_name: '', unit: '', interval: 24, target_value: '' });
    }
  };

  const removeMetric = (index) => {
    setHealthGoal(prev => ({ ...prev, metrics: prev.metrics.filter((_, i) => i !== index) }));
  };

  const addAction = () => {
    if (newAction.name && newAction.description) {
      setHealthGoal(prev => ({ ...prev, actions: [...prev.actions, { ...newAction }] }));
      setNewAction({ name: '', description: '', interval: 24, action_end_date: '' });
    }
  };

  const removeAction = (index) => {
    setHealthGoal(prev => ({ ...prev, actions: prev.actions.filter((_, i) => i !== index) }));
  };
  
  const getIntervalText = (hours) => {
    const option = intervalOptions.find(opt => opt.value === hours);
    return option ? option.label : `${hours} hours`;
  };


  return (
    <Dialog open={isOpen} onClose={onClose} fullWidth maxWidth="md" fullScreen={isMobile}>
      <DialogTitle sx={{ backgroundColor: theme.palette.primary.main, color: theme.palette.primary.contrastText, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Add New Patient
        <IconButton onClick={onClose} sx={{ color: theme.palette.primary.contrastText }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ bgcolor: theme.palette.background.default, p: isMobile ? 2 : 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange} centered={!isMobile} variant={isMobile ? "fullWidth" : "standard"} sx={{mb: 2}}>
          <Tab label="Patient Details" />
          <Tab label="Health Goals (Optional)" />
        </Tabs>

        {activeTab === 0 && (
          <Box component="form" noValidate autoComplete="off" sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="First Name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  fullWidth
                  required
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Last Name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  fullWidth
                  required
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Phone Number (e.g. +1234567890)"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  fullWidth
                  required
                  variant="outlined"
                  type="tel"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth variant="outlined">
                  <InputLabel>Chronic Conditions (Optional)</InputLabel>
                  <Select
                    multiple
                    value={chronicConditions.map(c => c.value)}
                    onChange={(e) => {
                      const selectedValues = e.target.value;
                      const newConditions = commonChronicConditions.filter(option => selectedValues.includes(option.value));
                      // Preserve custom conditions already added
                      const customAddedConditions = chronicConditions.filter(cc => !commonChronicConditions.some(common => common.value === cc.value));
                      setChronicConditions([...newConditions, ...customAddedConditions]);
                    }}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => {
                            const condition = chronicConditions.find(c => c.value === value);
                            return <Chip key={value} label={condition ? condition.label : value} onDelete={() => removeChronicCondition(value)} sx={{mr: 0.5, mb: 0.5}}/>;
                        })}
                      </Box>
                    )}
                    label="Chronic Conditions (Optional)"
                  >
                    {commonChronicConditions.map((condition) => (
                      <MenuItem key={condition.value} value={condition.value}>
                        {condition.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={9}>
                <TextField
                  label="Add Custom Condition"
                  value={customCondition}
                  onChange={(e) => setCustomCondition(e.target.value)}
                  fullWidth
                  variant="outlined"
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <Button onClick={handleCustomConditionAdd} variant="outlined" fullWidth startIcon={<AddIcon />} sx={{height: '100%'}}>
                  Add
                </Button>
              </Grid>
            </Grid>
          </Box>
        )}

        {activeTab === 1 && (
          <Box sx={{ mt: 2 }}>
            <FormControl fullWidth margin="normal">
                <InputLabel id="with-health-goal-label">Create Health Goal?</InputLabel>
                <Select
                    labelId="with-health-goal-label"
                    value={withHealthGoal}
                    label="Create Health Goal?"
                    onChange={(e) => setWithHealthGoal(e.target.value)}
                >
                    <MenuItem value={false}>No, skip health goal</MenuItem>
                    <MenuItem value={true}>Yes, add health goal</MenuItem>
                </Select>
            </FormControl>

            {withHealthGoal && (
              <Grid container spacing={2} sx={{mt: 1}}>
                <Grid item xs={12}>
                  <TextField label="Goal Name" value={healthGoal.goal_name} onChange={(e) => setHealthGoal({...healthGoal, goal_name: e.target.value})} fullWidth variant="outlined"/>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField label="Target Date" type="date" value={healthGoal.target_date} onChange={(e) => setHealthGoal({...healthGoal, target_date: e.target.value})} fullWidth InputLabelProps={{ shrink: true }} variant="outlined"/>
                </Grid>
                <Grid item xs={12}>
                  <TextField 
                    label="Instructions for AI Co-pilot (e.g., 'Alert me if BP > 160/100')" 
                    value={healthGoal.doctor_instructions} 
                    onChange={(e) => setHealthGoal({...healthGoal, doctor_instructions: e.target.value})} 
                    fullWidth 
                    multiline 
                    rows={2} 
                    variant="outlined"
                    helperText="These instructions will guide the AI agent in co-managing the patient with you."
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField label="Comments (Optional)" value={healthGoal.comments} onChange={(e) => setHealthGoal({...healthGoal, comments: e.target.value})} fullWidth multiline rows={2} variant="outlined"/>
                </Grid>

                {/* Metrics Section */}
                <Grid item xs={12}><Typography variant="h6" sx={{mt:2}}>Metrics to Track</Typography></Grid>
                {healthGoal.metrics.map((metric, index) => (
                  <Grid item xs={12} key={index} container spacing={1} alignItems="center" sx={{border: '1px solid lightgray', p:1, borderRadius: 1, mb:1}}>
                    <Grid item xs={12} sm={4}><Typography >{metric.metric_name}</Typography></Grid> {/* Adjusted sm for better spacing */}
                    <Grid item xs={12} sm={3}><Typography >Target: {metric.target_value} {metric.unit}</Typography></Grid> {/* Adjusted sm */}
                    <Grid item xs={12} sm={3}><Typography >Interval: {getIntervalText(metric.interval)}</Typography></Grid> {/* Adjusted sm */}
                    <Grid item xs={12} sm={2}><Button onClick={() => removeMetric(index)} color="error" size="small">Remove</Button></Grid>
                  </Grid>
                ))}
                <Grid item xs={12} sm={4}>
                  <Autocomplete
                    freeSolo
                    options={commonMetrics.map(option => option.name)}
                    value={newMetric.metric_name}
                    onChange={(event, newValue) => { // Corrected from onInputChange to onChange for Autocomplete
                      const commonMetric = commonMetrics.find(m => m.name === newValue);
                      if (commonMetric) {
                        setNewMetric(prev => ({ ...prev, metric_name: newValue, unit: commonMetric.unit }));
                      } else {
                        setNewMetric(prev => ({ ...prev, metric_name: newValue || '', unit: '' }));
                      }
                    }}
                    inputValue={newMetric.metric_name} // Control the input value for freeSolo
                    onInputChange={(event, newInputValue) => {
                        // This is needed if you want to react to typing for custom entries
                        // but primary logic for selection/custom entry is in onChange
                        if (event && event.type === 'change') { // Ensure it's a deliberate input change
                             const commonMetric = commonMetrics.find(m => m.name === newInputValue);
                             if (!commonMetric) { // If typing a custom metric name
                                setNewMetric(prev => ({ ...prev, metric_name: newInputValue, unit: ''}));
                             } else {
                                setNewMetric(prev => ({ ...prev, metric_name: newInputValue, unit: commonMetric.unit}));
                             }
                        }
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Metric Name"
                        variant="outlined"
                        size="small"
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={2}>
                  <TextField 
                    label="Unit" 
                    value={newMetric.unit} 
                    onChange={(e) => setNewMetric({...newMetric, unit: e.target.value})} 
                    fullWidth 
                    variant="outlined" 
                    size="small" 
                    disabled={commonMetrics.some(m => m.name === newMetric.metric_name && m.unit && m.unit !== '')}
                  /> 
                </Grid>
                <Grid item xs={12} sm={2}> <TextField label="Target Value" value={newMetric.target_value} onChange={(e) => setNewMetric({...newMetric, target_value: e.target.value})} fullWidth variant="outlined" size="small"/> </Grid>
                <Grid item xs={12} sm={2}>
                    <FormControl fullWidth variant="outlined" size="small">
                        <InputLabel>Interval</InputLabel>
                        <Select value={newMetric.interval} onChange={(e) => setNewMetric({...newMetric, interval: e.target.value})} label="Interval">
                            {intervalOptions.map(option => (
                              <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>
                <Grid item xs={12} sm={2}> <Button onClick={addMetric} variant="outlined" fullWidth startIcon={<AddIcon />} size="small" sx={{height: '100%'}}>Add Metric</Button> </Grid>

                {/* Actions Section */}
                <Grid item xs={12}><Typography variant="h6" sx={{mt:2}}>Actions / Tasks</Typography></Grid>
                 {healthGoal.actions.map((action, index) => (
                  <Grid item xs={12} key={index} container spacing={1} alignItems="center" sx={{border: '1px solid lightgray', p:1, borderRadius: 1, mb:1}}>
                    <Grid item xs={12} sm={3}><Typography >{action.name}</Typography></Grid>
                    <Grid item xs={12} sm={3}><Typography >Desc: {action.description}</Typography></Grid>
                    <Grid item xs={12} sm={2}><Typography >Interval: {getIntervalText(action.interval)}</Typography></Grid>
                    <Grid item xs={12} sm={2}><Typography >End: {action.action_end_date || 'Ongoing'}</Typography></Grid>
                    <Grid item xs={12} sm={2}><Button onClick={() => removeAction(index)} color="error" size="small">Remove</Button></Grid>
                  </Grid>
                ))}
                <Grid item xs={12} sm={3}> <TextField label="Action Name" value={newAction.name} onChange={(e) => setNewAction({...newAction, name: e.target.value})} fullWidth variant="outlined" size="small"/> </Grid>
                <Grid item xs={12} sm={3}> <TextField label="Description" value={newAction.description} onChange={(e) => setNewAction({...newAction, description: e.target.value})} fullWidth variant="outlined" size="small"/> </Grid>
                <Grid item xs={12} sm={2}>
                    <FormControl fullWidth variant="outlined" size="small">
                        <InputLabel>Interval</InputLabel>
                        <Select value={newAction.interval} onChange={(e) => setNewAction({...newAction, interval: e.target.value})} label="Interval">
                            {intervalOptions.map(option => (
                              <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>
                <Grid item xs={12} sm={2}> <TextField label="End Date (Optional)" type="date" value={newAction.action_end_date} onChange={(e) => setNewAction({...newAction, action_end_date: e.target.value})} InputLabelProps={{ shrink: true }} fullWidth variant="outlined" size="small"/> </Grid>
                <Grid item xs={12} sm={2}> <Button onClick={addAction} variant="outlined" fullWidth startIcon={<AddIcon />} size="small" sx={{height: '100%'}}>Add Action</Button> </Grid>
              </Grid>
            )}
          </Box>
        )}

        {message && (
          <Typography color="error" sx={{ mt: 2, textAlign: 'center' }}>
            {message}
          </Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ p: isMobile ? 2 : 3, borderTop: `1px solid ${theme.palette.divider}` }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant="contained" color="primary" disabled={isLoading} sx={{minWidth: '100px'}}>
          {isLoading ? 'Adding...' : 'Add Patient'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddPatientModalMui;
