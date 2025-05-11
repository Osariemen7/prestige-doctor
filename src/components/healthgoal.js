import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Button, Grid, Paper, List, ListItem, ListItemText, Divider, TextField,
    IconButton, Card, CardContent, CardHeader, Avatar, Tooltip, Chip, Select, MenuItem, InputLabel, FormControl
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import InfoIcon from '@mui/icons-material/Info';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import NotesIcon from '@mui/icons-material/Notes';
import EventNoteIcon from '@mui/icons-material/EventNote';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter'; // For actions
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart'; // For metrics
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn'; // For goals
import NotificationsIcon from '@mui/icons-material/Notifications'; // For alerts
import PersonIcon from '@mui/icons-material/Person';

// Mock data based on the RemoteMonitoringData schema
const mockRemoteMonitoringData = {
    patient_identifier: {
        full_name: "Jane RPM Doe",
        patient_id: "RPM987654321"
    },
    primary_health_goal: {
        goal_id: "gh_001",
        goal_name: "Improve Blood Pressure Management",
        goal_description: "Achieve and maintain blood pressure within the target range through lifestyle changes and medication adherence.",
        target_outcome: "Systolic BP < 130 mmHg, Diastolic BP < 80 mmHg for 2 consecutive weeks",
        start_date: "2025-04-01",
        target_end_date_review_date: "2025-07-01",
        overall_goal_status: "On Track",
        assigned_clinician: { name: "Dr. Alice Smith", role: "Cardiologist" }
    },
    monitored_metrics: [
        {
            metric_id: "mm_bp_001",
            metric_name: "Blood Pressure",
            unit: "mmHg",
            target_range_value: "Sys < 130, Dia < 80",
            baseline_value: "145/92",
            latest_reading: { value: "128/78", date_recorded: "2025-05-09T08:30:00Z" },
            trend_indicator: "Improving",
            historical_data_points: [ // Simplified for brevity
                { date: "2025-05-03T08:00:00Z", value: "135/85" },
                { date: "2025-05-06T08:15:00Z", value: "130/80" },
                { date: "2025-05-09T08:30:00Z", value: "128/78" }
            ],
            measurement_adherence: { percentage: 90, detail: "18/20 scheduled readings taken" }
        },
        {
            metric_id: "mm_weight_002",
            metric_name: "Weight",
            unit: "kg",
            target_range_value: "< 70 kg",
            baseline_value: 75,
            latest_reading: { value: 72, date_recorded: "2025-05-08T09:00:00Z" },
            trend_indicator: "Improving",
            historical_data_points: [
                { date: "2025-04-01T09:00:00Z", value: 75 },
                { date: "2025-04-15T09:00:00Z", value: 74 },
                { date: "2025-05-01T09:00:00Z", value: 73 },
                { date: "2025-05-08T09:00:00Z", value: 72 }
            ],
            measurement_adherence: { percentage: 100, detail: "Weekly weigh-ins completed" }
        }
    ],
    action_plan: [
        {
            action_id: "ap_med_001",
            action_description: "Take Lisinopril 10mg daily",
            frequency_schedule: "Once daily in AM",
            adherence_status: "Completed",
            last_reported_date: "2025-05-09T08:35:00Z",
            notes: "Patient confirms taking medication."
        },
        {
            action_id: "ap_diet_002",
            action_description: "Follow DASH diet plan",
            frequency_schedule: "Daily",
            adherence_status: "Partially Done",
            last_reported_date: "2025-05-08T18:00:00Z",
            notes: "Struggling with reducing sodium."
        },
        {
            action_id: "ap_ex_003",
            action_description: "30 minutes of moderate exercise",
            frequency_schedule: "5 times a week",
            adherence_status: "On Track",
            last_reported_date: "2025-05-09T17:00:00Z",
            notes: "Completed 3/5 sessions this week."
        }
    ],
    insights_alerts: [
        {
            insight_id: "ia_bp_good_001",
            type: "Automated Insight",
            severity: "Informational",
            message: "Blood pressure readings consistently improving and nearing target.",
            date_time_occurred: "2025-05-09T10:00:00Z",
            status: "Viewed",
            related_metric_id: "mm_bp_001"
        },
        {
            insight_id: "ia_diet_002",
            type: "Clinical Alert",
            severity: "Medium",
            message: "Patient reported difficulty adhering to DASH diet sodium restrictions. Consider dietician consult.",
            date_time_occurred: "2025-05-08T18:30:00Z",
            status: "Action Pending",
            clinician_notes: "Scheduled follow-up call to discuss."
        }
    ],
    patient_reported_data: {
        symptoms_log: [
            { log_id: "sym_001", symptom: "Occasional mild headache", severity: "Mild", date_logged: "2025-05-07T14:00:00Z", notes: "Usually in the afternoon." }
        ],
        journal_entries: [
            { entry_id: "journal_001", entry_text: "Feeling more energetic this week with the new exercise routine.", date_logged: "2025-05-09T20:00:00Z" }
        ]
    },
    communication_intervention_log_summary: [
        { log_id: "comm_001", type: "Secure Message", date_time: "2025-05-06T11:00:00Z", summary: "Patient asked about alternative low-sodium snacks. Provided list.", participants: "RN Davis, Patient" }
    ]
};


// Helper to display value or placeholder
const displayValue = (value, placeholder = 'N/A') => value === undefined || value === null || value === '' ? placeholder : value;

const formatDate = (dateString, includeTime = false) => {
    if (!dateString) return 'N/A';
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    if (includeTime) {
        options.hour = '2-digit';
        options.minute = '2-digit';
    }
    try {
        return new Date(dateString).toLocaleString(undefined, options);
    } catch (e) {
        return dateString; // Fallback if date is invalid
    }
};

const getTrendIcon = (trend) => {
    if (!trend) return null;
    switch (trend.toLowerCase()) {
        case 'improving': return <TrendingUpIcon color="success" />;
        case 'significantly improving': return <TrendingUpIcon color="success" sx={{ fontWeight: 'bold' }} />;
        case 'worsening': return <TrendingDownIcon color="error" />;
        case 'significantly worsening': return <TrendingDownIcon color="error" sx={{ fontWeight: 'bold' }} />;
        case 'stable': return <TrendingFlatIcon color="action" />;
        case 'fluctuating': return <Typography variant="caption" sx={{ fontStyle: 'italic' }}>~</Typography>; // Placeholder for fluctuating
        default: return null;
    }
};

const getStatusColor = (status) => {
    if (!status) return 'default';
    switch (status.toLowerCase()) {
        case 'on track': return 'success';
        case 'achieved': return 'success';
        case 'needs attention': return 'warning';
        case 'action pending': return 'warning';
        case 'revised': return 'info';
        case 'paused': return 'default';
        case 'not started': return 'default';
        case 'completed': return 'success';
        case 'partially done': return 'info';
        case 'missed': return 'error';
        case 'new': return 'primary';
        case 'viewed': return 'action';
        case 'resolved': return 'success';
        case 'dismissed': return 'default';
        default: return 'default';
    }
};

const getSeverityIcon = (severity) => {
    if (!severity) return <InfoIcon color="action" />;
    switch (severity.toLowerCase()) {
        case 'critical': return <WarningIcon color="error" sx={{ fontSize: 'large' }} />;
        case 'high': return <WarningIcon color="error" />;
        case 'medium': return <WarningIcon color="warning" />;
        case 'low': return <InfoIcon color="info" />;
        case 'informational': return <InfoIcon color="action" />;
        default: return <InfoIcon color="action" />;
    }
};


const RemoteMonitoringTab = ({
    data: initialData = mockRemoteMonitoringData, // Use mockData as default
    // schema, // Schema might be used for validation or dynamic form generation later
    // appliedSuggestions,
    // onDataChange, // Callback for when localData changes
    // suggestion,
    // onApplySuggestion,
    onSaveData, // Callback to save the entire remote monitoring data object
    isSaving,
    isMobile
}) => {
    const [localData, setLocalData] = useState(initialData);
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        setLocalData(initialData);
    }, [initialData]);

    const handleInputChange = (path, value) => {
        setLocalData(prevData => {
            const keys = path.split('.');
            let current = prevData;
            for (let i = 0; i < keys.length - 1; i++) {
                if (!current[keys[i]]) current[keys[i]] = {}; // Create nested objects if they don't exist
                current = current[keys[i]];
            }
            current[keys[keys.length - 1]] = value;
            return { ...prevData };
        });
    };
    
    const handleListItemChange = (listPath, index, field, value) => {
        setLocalData(prevData => {
            const list = prevData[listPath] ? [...prevData[listPath]] : [];
            if (list[index]) {
                list[index] = { ...list[index], [field]: value };
            }
            return { ...prevData, [listPath]: list };
        });
    };

    const addListItem = (listPath, newItemTemplate) => {
        setLocalData(prevData => ({
            ...prevData,
            [listPath]: [...(prevData[listPath] || []), { ...newItemTemplate, temp_id: `new_${Date.now()}` }] // Add a temporary ID for new items
        }));
    };

    const removeListItem = (listPath, index) => {
        setLocalData(prevData => ({
            ...prevData,
            [listPath]: (prevData[listPath] || []).filter((_, i) => i !== index)
        }));
    };


    const startEditing = () => setIsEditing(true);
    const cancelEditing = () => {
        setLocalData(initialData); // Reset changes
        setIsEditing(false);
    };
    const saveChanges = () => {
        if (onSaveData) {
            onSaveData(localData);
        }
        setIsEditing(false);
        // Potentially update initialData if save is successful outside this component
    };

    const handleCopyData = () => {
        navigator.clipboard.writeText(JSON.stringify(localData, null, 2))
            .then(() => console.log("Remote monitoring data copied"))
            .catch(err => console.error("Failed to copy data: ", err));
    };

    const renderHeaderButtons = () => (
        <Box sx={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: isMobile ? 'stretch' : 'center',
            justifyContent: 'space-between',
            mb: 2,
            gap: isMobile ? 1 : 0
        }}>
            <Typography variant={isMobile ? "h6" : "h5"} gutterBottom sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
                <MonitorHeartIcon sx={{ mr: 1, fontSize: isMobile ? '1.5rem' : '2rem' }} /> Remote Patient Monitoring
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 1 }}>
                <Button
                    variant="outlined"
                    startIcon={<ContentCopyIcon />}
                    onClick={handleCopyData}
                    size={isMobile ? "small" : "medium"}
                >
                    Copy Data
                </Button>
                {isEditing ? (
                    <>
                        <Button
                            variant="outlined"
                            startIcon={<VisibilityIcon />}
                            onClick={cancelEditing}
                            size={isMobile ? "small" : "medium"}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={saveChanges}
                            startIcon={<SaveIcon />}
                            disabled={isSaving}
                            size={isMobile ? "small" : "medium"}
                        >
                            Save Changes
                        </Button>
                    </>
                ) : (
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={startEditing}
                        startIcon={<EditIcon />}
                        size={isMobile ? "small" : "medium"}
                    >
                        Edit Data
                    </Button>
                )}
            </Box>
        </Box>
    );

    const renderPatientIdentifier = () => (
        <Card sx={{ mb: 2 }}>
            <CardHeader
                avatar={<Avatar><PersonIcon /></Avatar>}
                title={`Patient: ${displayValue(localData.patient_identifier?.full_name)}`}
                subheader={`ID: ${displayValue(localData.patient_identifier?.patient_id)}`}
            />
        </Card>
    );

    const renderPrimaryHealthGoal = () => {
        const goal = localData.primary_health_goal || {};
        return (
            <Card sx={{ mb: 2 }}>
                <CardHeader
                    avatar={<Avatar sx={{ bgcolor: getStatusColor(goal.overall_goal_status) + '.main' }}><AssignmentTurnedInIcon /></Avatar>}
                    title="Primary Health Goal"
                    subheader={isEditing ? null : displayValue(goal.goal_name)}
                    action={isEditing ? null : <Chip label={displayValue(goal.overall_goal_status)} color={getStatusColor(goal.overall_goal_status)} size="small" />}
                />
                <CardContent>
                    {isEditing ? (
                        <Grid container spacing={2}>
                            <Grid item xs={12} md={6}>
                                <TextField label="Goal Name" fullWidth value={displayValue(goal.goal_name, '')} onChange={(e) => handleInputChange('primary_health_goal.goal_name', e.target.value)} variant="outlined" size="small"/>
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <FormControl fullWidth size="small">
                                    <InputLabel>Overall Status</InputLabel>
                                    <Select
                                        value={displayValue(goal.overall_goal_status, '')}
                                        label="Overall Status"
                                        onChange={(e) => handleInputChange('primary_health_goal.overall_goal_status', e.target.value)}
                                    >
                                        {["On Track", "Needs Attention", "Achieved", "Revised", "Paused", "Not Started"].map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12}>
                                <TextField label="Goal Description" fullWidth multiline rows={2} value={displayValue(goal.goal_description, '')} onChange={(e) => handleInputChange('primary_health_goal.goal_description', e.target.value)} variant="outlined" size="small"/>
                            </Grid>
                            <Grid item xs={12}>
                                <TextField label="Target Outcome" fullWidth multiline rows={2} value={displayValue(goal.target_outcome, '')} onChange={(e) => handleInputChange('primary_health_goal.target_outcome', e.target.value)} variant="outlined" size="small"/>
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                                <TextField label="Start Date" type="date" fullWidth value={goal.start_date || ''} onChange={(e) => handleInputChange('primary_health_goal.start_date', e.target.value)} InputLabelProps={{ shrink: true }} variant="outlined" size="small"/>
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                                <TextField label="Target/Review Date" type="date" fullWidth value={goal.target_end_date_review_date || ''} onChange={(e) => handleInputChange('primary_health_goal.target_end_date_review_date', e.target.value)} InputLabelProps={{ shrink: true }} variant="outlined" size="small"/>
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                                <TextField label="Assigned Clinician" fullWidth value={displayValue(goal.assigned_clinician?.name, '')} onChange={(e) => handleInputChange('primary_health_goal.assigned_clinician.name', e.target.value)} variant="outlined" size="small"/>
                            </Grid>
                             <Grid item xs={12} sm={6} md={3}>
                                <TextField label="Clinician Role" fullWidth value={displayValue(goal.assigned_clinician?.role, '')} onChange={(e) => handleInputChange('primary_health_goal.assigned_clinician.role', e.target.value)} variant="outlined" size="small"/>
                            </Grid>
                        </Grid>
                    ) : (
                        <Grid container spacing={1}>
                            <Grid item xs={12}><Typography variant="body2" color="text.secondary">Description:</Typography><Typography variant="body1">{displayValue(goal.goal_description)}</Typography></Grid>
                            <Grid item xs={12}><Typography variant="body2" color="text.secondary">Target Outcome:</Typography><Typography variant="body1">{displayValue(goal.target_outcome)}</Typography></Grid>
                            <Grid item xs={6} sm={3}><Typography variant="body2" color="text.secondary">Start Date:</Typography><Typography variant="body1">{formatDate(goal.start_date)}</Typography></Grid>
                            <Grid item xs={6} sm={3}><Typography variant="body2" color="text.secondary">Target/Review Date:</Typography><Typography variant="body1">{formatDate(goal.target_end_date_review_date)}</Typography></Grid>
                            <Grid item xs={12} sm={6}><Typography variant="body2" color="text.secondary">Assigned Clinician:</Typography><Typography variant="body1">{displayValue(goal.assigned_clinician?.name)} ({displayValue(goal.assigned_clinician?.role)})</Typography></Grid>
                        </Grid>
                    )}
                </CardContent>
            </Card>
        );
    };

    const renderMonitoredMetrics = () => {
        const metrics = localData.monitored_metrics || [];
        return (
            <Box mb={2}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}><MonitorHeartIcon sx={{ mr: 1 }} /> Monitored Metrics</Typography>
                {isEditing && (
                    <Button startIcon={<AddCircleOutlineIcon />} onClick={() => addListItem('monitored_metrics', { metric_name: '', unit: '', target_range_value: '', baseline_value: '' })} size="small" sx={{ mb: 1 }}>
                        Add Metric
                    </Button>
                )}
                {metrics.length === 0 && !isEditing && <Typography variant="body2" color="text.secondary">No metrics being monitored.</Typography>}
                <Grid container spacing={2}>
                    {metrics.map((metric, index) => (
                        <Grid item xs={12} md={isEditing ? 12 : 6} key={metric.metric_id || metric.temp_id}>
                            <Card variant="outlined">
                                <CardHeader
                                    title={isEditing ? null : displayValue(metric.metric_name)}
                                    subheader={isEditing ? null : `Target: ${displayValue(metric.target_range_value)}`}
                                    action={isEditing ? (
                                        <IconButton onClick={() => removeListItem('monitored_metrics', index)} size="small"><DeleteIcon /></IconButton>
                                    ) : (
                                        <Tooltip title={displayValue(metric.trend_indicator)}>
                                            <span>{getTrendIcon(metric.trend_indicator)}</span>
                                        </Tooltip>
                                    )}
                                />
                                <CardContent>
                                    {isEditing ? (
                                        <Grid container spacing={1}>
                                            <Grid item xs={12} sm={6}><TextField label="Metric Name" fullWidth value={displayValue(metric.metric_name, '')} onChange={(e) => handleListItemChange('monitored_metrics', index, 'metric_name', e.target.value)} size="small" /></Grid>
                                            <Grid item xs={6} sm={3}><TextField label="Unit" fullWidth value={displayValue(metric.unit, '')} onChange={(e) => handleListItemChange('monitored_metrics', index, 'unit', e.target.value)} size="small" /></Grid>
                                            <Grid item xs={6} sm={3}><TextField label="Target" fullWidth value={displayValue(metric.target_range_value, '')} onChange={(e) => handleListItemChange('monitored_metrics', index, 'target_range_value', e.target.value)} size="small" /></Grid>
                                            <Grid item xs={6} sm={3}><TextField label="Baseline" fullWidth value={displayValue(metric.baseline_value, '')} onChange={(e) => handleListItemChange('monitored_metrics', index, 'baseline_value', e.target.value)} size="small" /></Grid>
                                            {/* Latest reading, trend, historical data, adherence are typically display-only from RPM system in edit mode */}
                                        </Grid>
                                    ) : (
                                        <Grid container spacing={1}>
                                            <Grid item xs={6} sm={4}><Typography variant="body2" color="text.secondary">Latest:</Typography><Typography variant="body1">{displayValue(metric.latest_reading?.value)} {metric.unit}</Typography><Typography variant="caption">{formatDate(metric.latest_reading?.date_recorded, true)}</Typography></Grid>
                                            <Grid item xs={6} sm={4}><Typography variant="body2" color="text.secondary">Baseline:</Typography><Typography variant="body1">{displayValue(metric.baseline_value)} {metric.unit}</Typography></Grid>
                                            <Grid item xs={12} sm={4}><Typography variant="body2" color="text.secondary">Adherence:</Typography><Typography variant="body1">{displayValue(metric.measurement_adherence?.percentage)}%</Typography><Typography variant="caption">{displayValue(metric.measurement_adherence?.detail)}</Typography></Grid>
                                            {/* Mini-chart for historical_data_points could be added here */}
                                        </Grid>
                                    )}
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            </Box>
        );
    };

    const renderActionPlan = () => {
        const actions = localData.action_plan || [];
        return (
            <Box mb={2}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}><FitnessCenterIcon sx={{ mr: 1 }} /> Action Plan</Typography>
                 {isEditing && (
                    <Button startIcon={<AddCircleOutlineIcon />} onClick={() => addListItem('action_plan', { action_description: '', frequency_schedule: '', adherence_status: 'Pending' })} size="small" sx={{ mb: 1 }}>
                        Add Action
                    </Button>
                )}
                {actions.length === 0 && !isEditing && <Typography variant="body2" color="text.secondary">No actions defined.</Typography>}
                <List dense disablePadding>
                    {actions.map((action, index) => (
                        <ListItem key={action.action_id || action.temp_id} divider sx={{ alignItems: 'flex-start', flexDirection: isMobile || isEditing ? 'column' : 'row', mb: isEditing ? 2 : 0, p: isEditing ? 2 : 1, border: isEditing ? '1px solid #eee' : 'none', borderRadius: isEditing ? 1 : 0 }}>
                            {isEditing ? (
                                <Box width="100%">
                                    <TextField label="Action Description" fullWidth multiline value={displayValue(action.action_description, '')} onChange={(e) => handleListItemChange('action_plan', index, 'action_description', e.target.value)} size="small" sx={{mb:1}}/>
                                    <Grid container spacing={1}>
                                        <Grid item xs={12} sm={6}><TextField label="Frequency/Schedule" fullWidth value={displayValue(action.frequency_schedule, '')} onChange={(e) => handleListItemChange('action_plan', index, 'frequency_schedule', e.target.value)} size="small" /></Grid>
                                        <Grid item xs={12} sm={4}>
                                            <FormControl fullWidth size="small">
                                                <InputLabel>Adherence Status</InputLabel>
                                                <Select
                                                    value={displayValue(action.adherence_status, '')}
                                                    label="Adherence Status"
                                                    onChange={(e) => handleListItemChange('action_plan', index, 'adherence_status', e.target.value)}
                                                >
                                                    {["Completed", "Partially Done", "Missed", "On Track", "Pending", "Not Required Today"].map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                                                </Select>
                                            </FormControl>
                                        </Grid>
                                         <Grid item xs={12} sm={2} sx={{display: 'flex', alignItems: 'center', justifyContent: 'flex-end'}}>
                                            <IconButton onClick={() => removeListItem('action_plan', index)} size="small"><DeleteIcon /></IconButton>
                                        </Grid>
                                    </Grid>
                                    <TextField label="Notes" fullWidth multiline rows={1} value={displayValue(action.notes, '')} onChange={(e) => handleListItemChange('action_plan', index, 'notes', e.target.value)} size="small" sx={{mt:1}}/>
                                </Box>
                            ) : (
                                <>
                                    <ListItemText
                                        primary={displayValue(action.action_description)}
                                        secondary={
                                            <>
                                                <Typography component="span" variant="body2" color="text.primary">Schedule: {displayValue(action.frequency_schedule)}</Typography>
                                                {action.notes && <><br/><Typography component="span" variant="caption">Notes: {displayValue(action.notes)}</Typography></>}
                                            </>
                                        }
                                        sx={{ flexGrow: 1, mr: 1 }}
                                    />
                                    <Box sx={{ textAlign: isMobile ? 'left' : 'right', minWidth: isMobile ? 'auto' : '180px', mt: isMobile ? 1 : 0 }}>
                                        <Chip label={displayValue(action.adherence_status)} color={getStatusColor(action.adherence_status)} size="small" />
                                        <Typography variant="caption" display="block">Last Reported: {formatDate(action.last_reported_date, true)}</Typography>
                                    </Box>
                                </>
                            )}
                        </ListItem>
                    ))}
                </List>
            </Box>
        );
    };

    const renderInsightsAlerts = () => {
        const insights = localData.insights_alerts || [];
        if (insights.length === 0) return null;
        return (
            <Box mb={2}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}><NotificationsIcon sx={{ mr: 1 }} /> Insights & Alerts</Typography>
                {insights.map((insight) => (
                    <Card variant="outlined" sx={{ mb: 1 }} key={insight.insight_id}>
                        <CardHeader
                            avatar={getSeverityIcon(insight.severity)}
                            title={displayValue(insight.type)}
                            subheader={`Occurred: ${formatDate(insight.date_time_occurred, true)}`}
                            action={<Chip label={displayValue(insight.status)} color={getStatusColor(insight.status)} size="small" />}
                            titleTypographyProps={{variant: 'subtitle1'}}
                        />
                        <CardContent sx={{pt:0}}>
                            <Typography variant="body2">{displayValue(insight.message)}</Typography>
                            {insight.clinician_notes && <Typography variant="caption" color="text.secondary">Clinician Notes: {insight.clinician_notes}</Typography>}
                        </CardContent>
                    </Card>
                ))}
            </Box>
        );
    };
    
    const renderPatientReportedData = () => {
        const prd = localData.patient_reported_data;
        if (!prd || (prd.symptoms_log?.length === 0 && prd.journal_entries?.length === 0)) return null;
        return (
            <Box mb={2}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}><NotesIcon sx={{ mr: 1 }} /> Patient Reported Data</Typography>
                {prd.symptoms_log?.length > 0 && (
                    <Box mb={1}>
                        <Typography variant="subtitle1" gutterBottom>Symptoms Log</Typography>
                        {prd.symptoms_log.map(log => (
                            <Typography variant="body2" key={log.log_id}>
                                - {formatDate(log.date_logged)}: {displayValue(log.symptom)} ({displayValue(log.severity)}) {log.notes ? ` - ${log.notes}` : ''}
                            </Typography>
                        ))}
                    </Box>
                )}
                {prd.journal_entries?.length > 0 && (
                     <Box>
                        <Typography variant="subtitle1" gutterBottom>Journal Entries</Typography>
                        {prd.journal_entries.map(entry => (
                            <Typography variant="body2" key={entry.entry_id}>
                                - {formatDate(entry.date_logged)}: {displayValue(entry.entry_text)}
                            </Typography>
                        ))}
                    </Box>
                )}
            </Box>
        );
    };

    const renderCommunicationLog = () => {
        const commLog = localData.communication_intervention_log_summary;
        if (!commLog || commLog.length === 0) return null;
        return (
            <Box mb={2}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}><EventNoteIcon sx={{ mr: 1 }} /> Communication Log</Typography>
                {commLog.map(log => (
                     <Typography variant="body2" key={log.log_id}>
                        - {formatDate(log.date_time, true)} ({displayValue(log.type)} with {displayValue(log.participants)}): {displayValue(log.summary)}
                    </Typography>
                ))}
            </Box>
        );
    };


    return (
        <Paper elevation={2} sx={{ padding: isMobile ? 2 : 3, mt: 2, width: '100%' }}>
            {renderHeaderButtons()}
            <Divider sx={{ my: 2 }} />

            {renderPatientIdentifier()}
            {renderPrimaryHealthGoal()}
            <Divider sx={{ my: 2 }} />
            {renderMonitoredMetrics()}
            <Divider sx={{ my: 2 }} />
            {renderActionPlan()}
            
            {(localData.insights_alerts?.length > 0 || localData.patient_reported_data || localData.communication_intervention_log_summary) && <Divider sx={{ my: 2 }} />}
            {renderInsightsAlerts()}
            {renderPatientReportedData()}
            {renderCommunicationLog()}

        </Paper>
    );
};

export default RemoteMonitoringTab; // Renamed export