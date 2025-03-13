import React, { useState, useEffect } from 'react';
import { Paper, Typography, Grid, TextField, Button, Box, Chip, IconButton, FormControl, InputLabel, Select, MenuItem } from '@mui/material';

import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import format from 'date-fns/format';


function HealthGoalsTab({ data, schema, onDataChange, suggestion, onApplySuggestion }) {
    const [localData, setLocalData] = useState(data);
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        setLocalData(data);
    }, [data]);

    const handleInputChange = (field, value) => {
        setLocalData(prevData => ({
            ...prevData,
            [field]: value
        }));
    };

    const handleMetricChange = (index, field, value) => {
        const updatedMetrics = [...localData.metrics];
        updatedMetrics[index] = {
            ...updatedMetrics[index],
            [field]: field === 'target_value' || field === 'interval' ? Number(value) : value
        };
        setLocalData(prevData => ({
            ...prevData,
            metrics: updatedMetrics
        }));
    };

    const handleActionChange = (index, field, value) => {
        const updatedActions = [...localData.actions];
        updatedActions[index] = {
            ...updatedActions[index],
            [field]: field === 'interval' ? Number(value) : value
        };
        setLocalData(prevData => ({
            ...prevData,
            actions: updatedActions
        }));
    };

    const addMetric = () => {
        const newMetric = {
            metric_name: "",
            unit: "",
            interval: 0,
            target_value: 0
        };
        setLocalData(prevData => ({
            ...prevData,
            metrics: [...prevData.metrics, newMetric]
        }));
    };

    const removeMetric = (index) => {
        const updatedMetrics = [...localData.metrics];
        updatedMetrics.splice(index, 1);
        setLocalData(prevData => ({
            ...prevData,
            metrics: updatedMetrics
        }));
    };

    const addAction = () => {
        const newAction = {
            name: "",
            description: "",
            interval: 0,
            action_end_date: localData.target_date
        };
        setLocalData(prevData => ({
            ...prevData,
            actions: [...prevData.actions, newAction]
        }));
    };

    const removeAction = (index) => {
        const updatedActions = [...localData.actions];
        updatedActions.splice(index, 1);
        setLocalData(prevData => ({
            ...prevData,
            actions: updatedActions
        }));
    };

    const handleEditClick = () => {
        setIsEditing(true);
    };

    const handleSaveClick = () => {
        onDataChange(localData);
        setIsEditing(false);
    };

    const handleCancelClick = () => {
        setLocalData(data); // Revert to original data
        setIsEditing(false);
    };

    const handleCopyGoals = () => {
        // Format and copy goals data in EMR-friendly format
        const goalsText = formatGoalsForEMR(localData);
        navigator.clipboard.writeText(goalsText).then(() => {
            alert('Health Goals copied to clipboard!');
        });
    };

    const formatGoalsForEMR = (goalsData) => {
        // Function to format goals data into EMR-friendly text format
        let emrText = "HEALTH GOALS:\n";
        emrText += `  Goal Name: ${goalsData.goal_name || ''}\n`;
        emrText += `  Target Date: ${goalsData.target_date ? format(new Date(goalsData.target_date), 'MM/dd/yyyy') : ''}\n`;
        emrText += `  Comments: ${goalsData.comments || ''}\n`;
        
        if (goalsData.metrics && goalsData.metrics.length > 0) {
            emrText += "\nMETRICS:\n";
            goalsData.metrics.forEach((metric, index) => {
                emrText += `  ${index + 1}. ${metric.metric_name || ''}: Target ${metric.target_value || ''} ${metric.unit || ''}\n`;
                emrText += `     Measurement Interval: Every ${metric.interval || ''} hours\n`;
            });
        }
        
        if (goalsData.actions && goalsData.actions.length > 0) {
            emrText += "\nACTIONS:\n";
            goalsData.actions.forEach((action, index) => {
                emrText += `  ${index + 1}. ${action.name || ''}\n`;
                emrText += `     Description: ${action.description || ''}\n`;
                emrText += `     Frequency: Every ${action.interval || 'as needed'} hours\n`;
                emrText += `     End Date: ${action.action_end_date ? format(new Date(action.action_end_date), 'MM/dd/yyyy') : ''}\n`;
            });
        }
        
        return emrText;
    };

    return (
        <Paper elevation={2} sx={{ padding: 3, mt: 2 }}>
            <Typography variant="h5" gutterBottom>Health Goals</Typography>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                {isEditing ? (
                    <>
                        <Button variant="contained" color="primary" onClick={handleSaveClick} sx={{ mr: 1 }}>Save Goals</Button>
                        <Button onClick={handleCancelClick}>Cancel</Button>
                    </>
                ) : (
                    <>
                        <Button variant="outlined" onClick={handleCopyGoals} sx={{ mr: 1 }}>Copy Goals</Button>
                        <Button variant="contained" onClick={handleEditClick}>Edit Goals</Button>
                    </>
                )}
            </Box>

            <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                    <TextField
                        label="Goal Name"
                        fullWidth
                        margin="normal"
                        value={localData?.goal_name || ''}
                        disabled={!isEditing}
                        onChange={(e) => handleInputChange('goal_name', e.target.value)}
                    />
                </Grid>
                <Grid item xs={12} md={6}>
                    <TextField
                        label="Target Date"
                        type="date"
                        fullWidth
                        margin="normal"
                        value={localData?.target_date ? localData.target_date.split('T')[0] : ''}
                        disabled={!isEditing}
                        onChange={(e) => handleInputChange('target_date', e.target.value)}
                        InputLabelProps={{ shrink: true }}
                    />
                </Grid>
                <Grid item xs={12}>
                    <TextField
                        label="Comments"
                        fullWidth
                        multiline
                        rows={3}
                        margin="normal"
                        value={localData?.comments || ''}
                        disabled={!isEditing}
                        onChange={(e) => handleInputChange('comments', e.target.value)}
                    />
                </Grid>
            </Grid>

            <Box sx={{ mt: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6" gutterBottom>Metrics</Typography>
                    {isEditing && (
                        <Button variant="outlined" startIcon={<AddIcon />} onClick={addMetric}>
                            Add Metric
                        </Button>
                    )}
                </Box>
                
                {localData?.metrics?.map((metric, index) => (
                    <Box key={index} sx={{ border: '1px solid #eee', p: 2, mb: 2, borderRadius: 1, position: 'relative' }}>
                        {isEditing && (
                            <IconButton 
                                size="small" 
                                sx={{ position: 'absolute', top: 5, right: 5 }} 
                                onClick={() => removeMetric(index)}
                            >
                                <DeleteIcon />
                            </IconButton>
                        )}
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    label="Metric Name"
                                    fullWidth
                                    margin="normal"
                                    value={metric.metric_name || ''}
                                    disabled={!isEditing}
                                    onChange={(e) => handleMetricChange(index, 'metric_name', e.target.value)}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    label="Unit"
                                    fullWidth
                                    margin="normal"
                                    value={metric.unit || ''}
                                    disabled={!isEditing}
                                    onChange={(e) => handleMetricChange(index, 'unit', e.target.value)}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    label="Target Value"
                                    fullWidth
                                    margin="normal"
                                    type="number"
                                    value={metric.target_value || 0}
                                    disabled={!isEditing}
                                    onChange={(e) => handleMetricChange(index, 'target_value', e.target.value)}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    label="Measurement Interval (hours)"
                                    fullWidth
                                    margin="normal"
                                    type="number"
                                    value={metric.interval || 0}
                                    disabled={!isEditing}
                                    onChange={(e) => handleMetricChange(index, 'interval', e.target.value)}
                                />
                            </Grid>
                        </Grid>
                    </Box>
                ))}
            </Box>

            <Box sx={{ mt: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6" gutterBottom>Actions</Typography>
                    {isEditing && (
                        <Button variant="outlined" startIcon={<AddIcon />} onClick={addAction}>
                            Add Action
                        </Button>
                    )}
                </Box>
                
                {localData?.actions?.map((action, index) => (
                    <Box key={index} sx={{ border: '1px solid #eee', p: 2, mb: 2, borderRadius: 1, position: 'relative' }}>
                        {isEditing && (
                            <IconButton 
                                size="small" 
                                sx={{ position: 'absolute', top: 5, right: 5 }} 
                                onClick={() => removeAction(index)}
                            >
                                <DeleteIcon />
                            </IconButton>
                        )}
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    label="Action Name"
                                    fullWidth
                                    margin="normal"
                                    value={action.name || ''}
                                    disabled={!isEditing}
                                    onChange={(e) => handleActionChange(index, 'name', e.target.value)}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    label="Interval (hours, 0 for as needed)"
                                    fullWidth
                                    margin="normal"
                                    type="number"
                                    value={action.interval || 0}
                                    disabled={!isEditing}
                                    onChange={(e) => handleActionChange(index, 'interval', e.target.value)}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    label="End Date"
                                    type="date"
                                    fullWidth
                                    margin="normal"
                                    value={action.action_end_date ? action.action_end_date.split('T')[0] : ''}
                                    disabled={!isEditing}
                                    onChange={(e) => handleActionChange(index, 'action_end_date', e.target.value)}
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    label="Description"
                                    fullWidth
                                    multiline
                                    rows={2}
                                    margin="normal"
                                    value={action.description || ''}
                                    disabled={!isEditing}
                                    onChange={(e) => handleActionChange(index, 'description', e.target.value)}
                                />
                            </Grid>
                        </Grid>
                    </Box>
                ))}
            </Box>

            {suggestion && (
                <Box sx={{ mt: 3, border: '1px solid #ccc', padding: 2, borderRadius: 1, bgcolor: '#f9f9f9' }}>
                    <Typography variant="h6" gutterBottom>Suggestions</Typography>
                    <Grid container spacing={2}>
                        {suggestion.goal_name_suggestion && (
                            <Grid item xs={12}>
                                <Typography variant="subtitle2">Goal Name Suggestion:</Typography>
                                <Typography variant="body2" sx={{ mb: 1 }}>{suggestion.goal_name_suggestion}</Typography>
                            </Grid>
                        )}
                        
                        {suggestion.target_date_suggestion && (
                            <Grid item xs={12}>
                                <Typography variant="subtitle2">Target Date Suggestion:</Typography>
                                <Typography variant="body2" sx={{ mb: 1 }}>
                                    {format(new Date(suggestion.target_date_suggestion), 'MM/dd/yyyy')}
                                </Typography>
                            </Grid>
                        )}
                        
                        {suggestion.comments_suggestion && (
                            <Grid item xs={12}>
                                <Typography variant="subtitle2">Comments Suggestion:</Typography>
                                <Typography variant="body2" sx={{ mb: 1 }}>{suggestion.comments_suggestion}</Typography>
                            </Grid>
                        )}
                        
                        {suggestion.metrics_suggestion && suggestion.metrics_suggestion.length > 0 && (
                            <Grid item xs={12}>
                                <Typography variant="subtitle2">Metrics Suggestions:</Typography>
                                {suggestion.metrics_suggestion.map((metric, index) => (
                                    <Box key={index} sx={{ pl: 2, mb: 1 }}>
                                        <Typography variant="body2">
                                            <strong>{metric.metric_name}</strong>: Target {metric.target_value} {metric.unit}, 
                                            every {metric.interval} hours
                                        </Typography>
                                    </Box>
                                ))}
                            </Grid>
                        )}
                        
                        {suggestion.actions_suggestion && suggestion.actions_suggestion.length > 0 && (
                            <Grid item xs={12}>
                                <Typography variant="subtitle2">Actions Suggestions:</Typography>
                                {suggestion.actions_suggestion.map((action, index) => (
                                    <Box key={index} sx={{ pl: 2, mb: 1 }}>
                                        <Typography variant="body2">
                                            <strong>{action.name}</strong>: {action.description}
                                        </Typography>
                                    </Box>
                                ))}
                            </Grid>
                        )}
                        
                        {suggestion.suggestion_rational && (
                            <Grid item xs={12}>
                                <Typography variant="subtitle2">Rationale:</Typography>
                                <Typography variant="body2">{suggestion.suggestion_rational}</Typography>
                            </Grid>
                        )}
                    </Grid>
                    
                    <Button variant="contained" color="secondary" onClick={onApplySuggestion} sx={{ mt: 2 }}>
                        Apply All Suggestions
                    </Button>
                </Box>
            )}
        </Paper>
    );
}

export default HealthGoalsTab;