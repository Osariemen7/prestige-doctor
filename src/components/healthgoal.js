import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Grid,
  TextField,
  Button,
  Box,
  IconButton,
  Divider
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CheckCircleIcon from '@mui/icons-material/CheckCircle'; // Import CheckCircleIcon
import { format } from 'date-fns';

const HealthGoalsTab = ({
  data,
  editableData,
  schema,
  onDataChange,
  suggestion,
  appliedSuggestions,
  onApplySuggestion,
  onSaveGoals,
  isSaving
}) => {
  const [localData, setLocalData] = useState(() => {
    return editableData || data || { // Initialize with editableData if available, else data, else default
        goal_name: '',
        target_date: null,
        comments: '',
        metrics: [],
        actions: []
    };
  });
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (isEditing) {
        setLocalData(editableData ? JSON.parse(JSON.stringify(editableData)) : localData);
    }
    // Do not update localData when not editing so that saved edits remain visible
}, [editableData, isEditing]);

  // Basic change handlers
  const handleInputChange = (field, value) => {
    setLocalData(prevData => ({
      ...prevData,
      [field]: value
    }));
  };

  const handleMetricChange = (index, field, value) => {
    const updatedMetrics = [...(localData.metrics || [])];
    updatedMetrics[index] = {
      ...updatedMetrics[index],
      [field]:
        field === 'target_value' || field === 'interval'
          ? Number(value)
          : value
    };
    setLocalData(prevData => ({
      ...prevData,
      metrics: updatedMetrics
    }));
  };

  const handleActionChange = (index, field, value) => {
    const updatedActions = [...(localData.actions || [])];
    updatedActions[index] = {
      ...updatedActions[index],
      [field]: field === 'interval' ? Number(value) : value
    };
    setLocalData(prevData => ({
      ...prevData,
      actions: updatedActions
    }));
  };

  // Add / remove for metrics and actions
  const addMetric = () => {
    const newMetric = {
      metric_name: '',
      unit: '',
      interval: 0,
      target_value: 0
    };
    setLocalData(prevData => ({
      ...prevData,
      metrics: [...(prevData.metrics || []), newMetric]
    }));
  };

  const removeMetric = index => {
    const updatedMetrics = [...(localData.metrics || [])];
    updatedMetrics.splice(index, 1);
    setLocalData(prevData => ({
      ...prevData,
      metrics: updatedMetrics
    }));
  };

  const addAction = () => {
    const newAction = {
      name: '',
      description: '',
      interval: 0,
      action_end_date: localData.target_date // Using target_date as a default
    };
    setLocalData(prevData => ({
      ...prevData,
      actions: [...(prevData.actions || []), newAction]
    }));
  };

  const removeAction = index => {
    const updatedActions = [...(localData.actions || [])];
    updatedActions.splice(index, 1);
    setLocalData(prevData => ({
      ...prevData,
      actions: updatedActions
    }));
  };

  // Editing controls
  const startEditing = () => setIsEditing(true);
  const saveChanges = () => {
    onDataChange(localData); // update parent state
    // Removed API call for saving; only update state and switch mode
    setIsEditing(false);
  };
  const cancelEditing = () => {
    setIsEditing(false); // isEditing state change will trigger useEffect to reset localData
  };

  // Copy health goals text to clipboard
  const handleCopyGoals = () => {
    const goalsText = formatGoalsForEMR(localData);
    navigator.clipboard
      .writeText(goalsText)
      .then(() => alert('Health Goals copied to clipboard!'))
      .catch(err => console.error('Could not copy text: ', err));
  };

  const formatGoalsForEMR = goalsData => {
    let emrText = 'HEALTH GOALS:\n';
    emrText += `  Goal Name: ${goalsData.goal_name || ''}\n`;
    emrText += `  Target Date: ${
      goalsData.target_date ? format(new Date(goalsData.target_date), 'MM/dd/yyyy') : ''
    }\n`;
    emrText += `  Comments: ${goalsData.comments || ''}\n`;

    if (goalsData.metrics && goalsData.metrics.length > 0) {
      emrText += '\nMETRICS:\n';
      goalsData.metrics.forEach((metric, index) => {
        emrText += `  ${index + 1}. ${metric.metric_name || ''}: Target ${
          metric.target_value || ''
        } ${metric.unit || ''}\n`;
        emrText += `     Measurement Interval: Every ${metric.interval || ''} hours\n`;
      });
    }

    if (goalsData.actions && goalsData.actions.length > 0) {
      emrText += '\nACTIONS:\n';
      goalsData.actions.forEach((action, index) => {
        emrText += `  ${index + 1}. ${action.name || ''}\n`;
        emrText += `     Description: ${action.description || ''}\n`;
        emrText += `     Frequency: Every ${action.interval || 0} hours\n`;
        emrText += `     End Date: ${
          action.action_end_date ? format(new Date(action.action_end_date), 'MM/dd/yyyy') : ''
        }\n`;
      });
    }
    return emrText;
  };

  // Render header buttons – copy and either edit or (when editing) view/save
  const renderHeaderButtons = () => (
    <Box>
      <Button
        variant="outlined"
        startIcon={<ContentCopyIcon />}
        onClick={handleCopyGoals}
        sx={{ mr: 1, mb: 1 }}
      >
        Copy Goals
      </Button>
      {isEditing ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <Button
            variant="outlined"
            startIcon={<VisibilityIcon />}
            sx={{ mb: 1 }}
            onClick={cancelEditing}
          >
            View Goals
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={saveChanges}
            startIcon={<SaveIcon />}
            disabled={isSaving}
          >
            Save Goals
          </Button>
        </Box>
      ) : (
        <Button
          variant="contained"
          color="primary"
          onClick={startEditing
          }
          startIcon={<EditIcon />}
          sx={{ mb: 1 }}
        >
          Edit Goals
        </Button>
      )}
    </Box>
  );

  const renderSuggestionItem = (suggestionValue, currentValue, applySuggestionHandler, fieldName) => {
    if (suggestionValue && suggestionValue !== currentValue && !appliedSuggestions[fieldName]) {
      return (
        <Box sx={{
            mt: 1,
            bgcolor: '#f5f5dc',
            p: 1,
            borderRadius: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
        }}>
          <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mr: 1 }}>
            Suggestion: {suggestionValue}
          </Typography>
          <Button
              variant="outlined"
              color="primary"
              size="small"
              onClick={() => applySuggestionHandler(fieldName, suggestionValue)}
          >
              Apply
          </Button>
        </Box>
      );
    }
    return null;
  };

  const handleLocalApplySuggestion = (field, value) => {
    setLocalData(prevData => {
      const updatedData = {...prevData};
      if (field.startsWith('metrics[')) {
          const parts = field.match(/metrics\[(\d+)\]\.(\w+)/);
          if (parts) {
              const index = parseInt(parts[1], 10);
              const metricField = parts[2];
              if (updatedData.metrics && updatedData.metrics[index]) {
                  updatedData.metrics[index] = {...updatedData.metrics[index], [metricField]: value};
              }
          }
      } else if (field.startsWith('actions[')) {
          const parts = field.match(/actions\[(\d+)\]\.(\w+)/);
          if (parts) {
              const index = parseInt(parts[1], 10);
              const actionField = parts[2];
              if (updatedData.actions && updatedData.actions[index]) {
                  updatedData.actions[index] = {...updatedData.actions[index], [actionField]: value};
              }
          }
      }
      else {
          updatedData[field] = value;
      }
      return updatedData;
    });
    onApplySuggestion(field, value);
  };


  const renderSuggestions = () => {
    if (!suggestion || Object.keys(suggestion).length === 0) return null;

    return (
        <Box sx={{ mt: 3, border: '1px solid #ccc', padding: 2, borderRadius: 1, bgcolor: '#f9f9f9' }}>
            <Typography variant="h6" gutterBottom>Suggestions</Typography>

            {suggestion.goal_name_suggestion && renderSuggestionItem(
                suggestion.goal_name_suggestion,
                localData.goal_name,
                handleLocalApplySuggestion, // Use local handler
                'goal_name'
            )}

            {suggestion.target_date_suggestion && renderSuggestionItem(
                suggestion.target_date_suggestion ? format(new Date(suggestion.target_date_suggestion), 'MMMM d, yyyy') : null,
                localData.target_date ? format(new Date(localData.target_date), 'MMMM d, yyyy') : null,
                handleLocalApplySuggestion, // Use local handler
                'target_date'
            )}

            {suggestion.comments_suggestion && renderSuggestionItem(
                suggestion.comments_suggestion,
                localData.comments,
                handleLocalApplySuggestion, // Use local handler
                'comments'
            )}
             {suggestion.metrics_suggestion && suggestion.metrics_suggestion.length > 0 && (
                <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle1">Metrics Suggestions:</Typography>
                    {suggestion.metrics_suggestion.map((metricSuggestion, index) => {
                        const currentMetric = editableData.metrics?.[index] || {};
                        return (
                            <Box key={index} sx={{ ml: 2, mb: 1, borderLeft: '2px solid primary.main', pl: 1 }}>
                                {metricSuggestion.metric_name && renderSuggestionItem(
                                    metricSuggestion.metric_name,
                                    currentMetric.metric_name,
                                    (value) => handleLocalApplySuggestion(`metrics[${index}].metric_name`, value), // Use local handler
                                    `metrics[${index}].metric_name`
                                )}
                                {metricSuggestion.unit && renderSuggestionItem(
                                    metricSuggestion.unit,
                                    currentMetric.unit,
                                    (value) => handleLocalApplySuggestion(`metrics[${index}].unit`, value), // Use local handler
                                    `metrics[${index}].unit`
                                )}
                                {metricSuggestion.target_value !== undefined && renderSuggestionItem(
                                    String(metricSuggestion.target_value),
                                    String(currentMetric.target_value),
                                    (value) => handleLocalApplySuggestion(`metrics[${index}].target_value`, value), // Use local handler
                                    `metrics[${index}].target_value`
                                )}
                                {metricSuggestion.interval !== undefined && renderSuggestionItem(
                                    String(metricSuggestion.interval),
                                    String(currentMetric.interval),
                                    (value) => handleLocalApplySuggestion(`metrics[${index}].interval`, value), // Use local handler
                                    `metrics[${index}].interval`
                                )}
                            </Box>
                        );
                    })}
                </Box>
            )}

            {suggestion.actions_suggestion && suggestion.actions_suggestion.length > 0 && (
                <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle1">Actions Suggestions:</Typography>
                    {suggestion.actions_suggestion.map((actionSuggestion, index) => {
                        const currentAction = editableData.actions?.[index] || {};
                        return (
                            <Box key={index} sx={{ ml: 2, mb: 1, borderLeft: '2px solid primary.main', pl: 1 }}>
                                {actionSuggestion.name && renderSuggestionItem(
                                    actionSuggestion.name,
                                    currentAction.name,
                                    (value) => handleLocalApplySuggestion(`actions[${index}].name`, value), // Use local handler
                                    `actions[${index}].name`
                                )}
                                {actionSuggestion.description && renderSuggestionItem(
                                    actionSuggestion.description,
                                    currentAction.description,
                                    (value) => handleLocalApplySuggestion(`actions[${index}].description`, value), // Use local handler
                                    `actions[${index}].description`
                                )}
                                {actionSuggestion.interval !== undefined && renderSuggestionItem(
                                    String(actionSuggestion.interval),
                                    String(currentAction.interval),
                                    (value) => handleLocalApplySuggestion(`actions[${index}].interval`, value), // Use local handler
                                    `actions[${index}].interval`
                                )}
                                {actionSuggestion.action_end_date && renderSuggestionItem(
                                    actionSuggestion.action_end_date ? format(new Date(actionSuggestion.action_end_date), 'MMMM d, yyyy') : null,
                                    actionSuggestion.action_end_date ? format(new Date(actionSuggestion.action_end_date), 'MMMM d, yyyy') : null, // Corrected here as well
                                    (value) => handleLocalApplySuggestion(`actions[${index}].action_end_date`, value), // Use local handler
                                    `actions[${index}].action_end_date`
                                )}
                            </Box>
                        );
                    })}
                </Box>
            )}


        </Box>
    );
};


  // --- Non-Editing (View) Mode ---
  if (!isEditing) {
    return (
      <Paper elevation={2} sx={{ padding: 3, mt: 2 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 3
          }}
        >
          <Typography variant="h5">Health Goals</Typography>
          {renderHeaderButtons()}
        </Box>
        <Grid container spacing={3}>
          {/* Goal Information */}
          <Grid item xs={12}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
              Goal Information
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={4}>
                <Typography variant="subtitle2" color="text.secondary">
                  Goal Name
                </Typography>
                <Typography variant="body1">
                  {localData?.goal_name || '-'}
                </Typography>
                {renderSuggestionItem( // Suggestion placed below Typography
                    suggestion?.goal_name_suggestion,
                    localData?.goal_name,
                    handleLocalApplySuggestion, // Use local handler
                    'goal_name'
                )}
              </Grid>
              <Grid item xs={4}>
                <Typography variant="subtitle2" color="text.secondary">
                  Target Date
                </Typography>
                <Typography variant="body1">
                  {localData?.target_date
                    ? format(new Date(localData.target_date), 'MMMM d, yyyy')
                    : '-'}
                </Typography>
                {renderSuggestionItem( // Suggestion placed below Typography
                    suggestion?.target_date_suggestion ? format(new Date(suggestion.target_date_suggestion), 'yyyy-MM-dd') : null,
                    localData?.target_date ? format(new Date(localData.target_date), 'yyyy-MM-dd') : null,
                    handleLocalApplySuggestion, // Use local handler
                    'target_date'
                )}
              </Grid>
              <Grid item xs={4}>
                <Typography variant="subtitle2" color="text.secondary">
                  Comments
                </Typography>
                <Typography variant="body1">
                  {localData?.comments || '-'}
                </Typography>
                 {renderSuggestionItem( // Suggestion placed below Typography
                    suggestion?.comments_suggestion,
                    localData?.comments,
                    handleLocalApplySuggestion, // Use local handler
                    'comments'
                )}
              </Grid>
            </Grid>
          </Grid>

          {/* Metrics */}
          <Grid item xs={12}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
              Metrics
            </Typography>
            {localData?.metrics && localData.metrics.length > 0 ? (
              localData.metrics.map((metric, index) => (
                <Box
                  key={index}
                  sx={{
                    border: '1px solid #eee',
                    borderRadius: 1,
                    p: 2,
                    mb: 2
                  }}
                >
                  <Typography variant="body1">
                    <strong>Metric Name:</strong> {metric.metric_name || '-'}
                  </Typography>
                  {renderSuggestionItem( // Suggestion placed below Typography
                      suggestion?.metrics_suggestion && suggestion.metrics_suggestion[index]?.metric_name,
                      metric.metric_name,
                      handleLocalApplySuggestion, // Use local handler
                      `metrics[${index}].metric_name`
                  )}
                  <Typography variant="body1">
                    <strong>Unit:</strong> {metric.unit || '-'}
                  </Typography>
                   {renderSuggestionItem( // Suggestion placed below Typography
                      suggestion?.metrics_suggestion && suggestion.metrics_suggestion[index]?.unit,
                      metric.unit,
                      handleLocalApplySuggestion, // Use local handler
                      `metrics[${index}].unit`
                  )}
                  <Typography variant="body1">
                    <strong>Target Value:</strong> {metric.target_value || 0}
                  </Typography>
                   {renderSuggestionItem( // Suggestion placed below Typography
                      suggestion?.metrics_suggestion && suggestion.metrics_suggestion[index]?.target_value !== undefined ? String(suggestion.metrics_suggestion[index].target_value) : undefined,
                      String(metric.target_value),
                      handleLocalApplySuggestion, // Use local handler
                      `metrics[${index}].target_value`
                  )}
                  <Typography variant="body1">
                    <strong>Interval:</strong> {metric.interval || 0} hours
                  </Typography>
                   {renderSuggestionItem( // Suggestion placed below Typography
                      suggestion?.metrics_suggestion && suggestion.metrics_suggestion[index]?.interval !== undefined ? String(suggestion.metrics_suggestion[index].interval) : undefined,
                      String(metric.interval),
                      handleLocalApplySuggestion, // Use local handler
                      `metrics[${index}].interval`
                  )}
                </Box>
              ))
            ) : (
              <Typography variant="body1">No metrics available.</Typography>
            )}
          </Grid>

          {/* Actions */}
          <Grid item xs={12}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
              Actions
            </Typography>
            {localData?.actions && localData.actions.length > 0 ? (
              localData.actions.map((action, index) => (
                <Box
                  key={index}
                  sx={{
                    border: '1px solid #eee',
                    borderRadius: 1,
                    p: 2,
                    mb: 2
                  }}
                >
                  <Typography variant="body1">
                    <strong>Action Name:</strong> {action.name || '-'}
                  </Typography>
                   {renderSuggestionItem( // Suggestion placed below Typography
                      suggestion?.actions_suggestion && suggestion.actions_suggestion[index]?.name,
                      action.name,
                      handleLocalApplySuggestion, // Use local handler
                      `actions[${index}].name`
                  )}
                  <Typography variant="body1">
                    <strong>Description:</strong> {action.description || '-'}
                  </Typography>
                   {renderSuggestionItem( // Suggestion placed below Typography
                      suggestion?.actions_suggestion && suggestion.actions_suggestion[index]?.description,
                      action.description,
                      handleLocalApplySuggestion, // Use local handler
                      `actions[${index}].description`
                  )}
                  <Typography variant="body1">
                    <strong>Interval:</strong> {action.interval || 0} hours
                  </Typography>
                   {renderSuggestionItem( // Suggestion placed below Typography
                      suggestion?.actions_suggestion && suggestion.actions_suggestion[index]?.interval !== undefined ? String(suggestion.actions_suggestion[index].interval) : undefined,
                      String(action.interval),
                      handleLocalApplySuggestion, // Use local handler
                      `actions[${index}].interval`
                  )}
                  <Typography variant="body1">
                    <strong>End Date:</strong>{' '}
                    {action.action_end_date
                      ? format(new Date(action.action_end_date), 'MMMM d, yyyy')
                      : '-'}
                  </Typography>
                   {renderSuggestionItem( // Suggestion placed below Typography
                      suggestion?.actions_suggestion && suggestion.actions_suggestion[index]?.action_end_date ? format(new Date(suggestion.actions_suggestion[index].action_end_date), 'yyyy-MM-dd') : null,
                      action.action_end_date ? format(new Date(action.action_end_date), 'yyyy-MM-dd') : null,
                      handleLocalApplySuggestion, // Use local handler
                      `actions[${index}].action_end_date`
                  )}
                </Box>
              ))
            ) : (
              <Typography variant="body1">No actions available.</Typography>
            )}
          </Grid>
        </Grid>
      </Paper>
    );
  }

  // --- Editing Mode ---
  return (
    <Paper elevation={2} sx={{ padding: 3, mt: 2 }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3
        }}
      >
        <Typography variant="h5">Health Goals</Typography>
        {renderHeaderButtons()}
      </Box>
      <Grid container spacing={3}>
        {/* Goal Information */}
        <Grid item xs={12}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
            Goal Information
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={4}>
              <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                <TextField
                  label="Goal Name"
                  fullWidth
                  value={localData?.goal_name || ''}
                  onChange={e => handleInputChange('goal_name', e.target.value)}
                />
                {renderSuggestionItem(
                    suggestion?.goal_name_suggestion,
                    localData?.goal_name,
                    handleLocalApplySuggestion, // Use local handler
                    'goal_name'
                )}
              </Box>
            </Grid>
            <Grid item xs={4}>
              <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                <TextField
                  label="Target Date"
                  type="date"
                  fullWidth
                  value={
                    localData?.target_date
                      ? format(new Date(localData.target_date), 'yyyy-MM-dd')
                      : ''
                  }
                  onChange={e => handleInputChange('target_date', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
                 {renderSuggestionItem(
                    suggestion?.target_date_suggestion ? format(new Date(suggestion.target_date_suggestion), 'yyyy-MM-dd') : null,
                    localData?.target_date ? format(new Date(localData.target_date), 'yyyy-MM-dd') : null,
                    handleLocalApplySuggestion, // Use local handler
                    'target_date'
                )}
              </Box>
            </Grid>
            <Grid item xs={4}>
              <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                <TextField
                  label="Comments"
                  fullWidth
                  value={localData?.comments || ''}
                  onChange={e => handleInputChange('comments', e.target.value)}
                />
                 {renderSuggestionItem(
                    suggestion?.comments_suggestion,
                    localData?.comments,
                    handleLocalApplySuggestion, // Use local handler
                    'comments'
                )}
              </Box>
            </Grid>
          </Grid>
        </Grid>

        {/* Metrics Editing */}
        <Grid item xs={12}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
            Metrics
          </Typography>
          {localData?.metrics && localData.metrics.length > 0 ? (
            localData.metrics.map((metric, index) => (
              <Box
                key={index}
                sx={{
                  border: '1px solid #eee',
                  borderRadius: 1,
                  p: 2,
                  mb: 2,
                  position: 'relative'
                }}
              >
                <IconButton
                  aria-label="delete metric"
                  size="small"
                  onClick={() => removeMetric(index)}
                  sx={{ position: 'absolute', top: 8, right: 8 }}
                >
                  <DeleteIcon />
                </IconButton>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={3}>
                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                      <TextField
                        label="Metric Name"
                        fullWidth
                        value={metric.metric_name || ''}
                        onChange={e => handleMetricChange(index, 'metric_name', e.target.value)}
                      />
                      {suggestion?.metrics_suggestion && suggestion.metrics_suggestion[index]?.metric_name && renderSuggestionItem(
                          suggestion.metrics_suggestion[index].metric_name,
                          metric.metric_name,
                          handleLocalApplySuggestion, // Use local handler
                          `metrics[${index}].metric_name`
                      )}
                    </Box>
                  </Grid>
                  <Grid item xs={3}>
                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                      <TextField
                        label="Unit"
                        fullWidth
                        value={metric.unit || ''}
                        onChange={e => handleMetricChange(index, 'unit', e.target.value)}
                      />
                      {suggestion?.metrics_suggestion && suggestion.metrics_suggestion[index]?.unit && renderSuggestionItem(
                          suggestion.metrics_suggestion[index].unit,
                          metric.unit,
                          handleLocalApplySuggestion, // Use local handler
                          `metrics[${index}].unit`
                      )}
                    </Box>
                  </Grid>
                  <Grid item xs={3}>
                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                      <TextField
                        label="Target Value"
                        fullWidth
                        type="number"
                        value={metric.target_value || 0}
                        onChange={e => handleMetricChange(index, 'target_value', e.target.value)}
                      />
                      {suggestion?.metrics_suggestion && suggestion.metrics_suggestion[index]?.target_value !== undefined && renderSuggestionItem(
                          String(suggestion.metrics_suggestion[index].target_value),
                          String(metric.target_value),
                          handleLocalApplySuggestion, // Use local handler
                          `metrics[${index}].target_value`
                      )}
                    </Box>
                  </Grid>
                  <Grid item xs={3}>
                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                      <TextField
                        label="Interval (hours)"
                        fullWidth
                        type="number"
                        value={metric.interval || 0}
                        onChange={e => handleMetricChange(index, 'interval', e.target.value)}
                      />
                      {suggestion?.metrics_suggestion && suggestion.metrics_suggestion[index]?.interval !== undefined && renderSuggestionItem(
                          String(suggestion.metrics_suggestion[index].interval),
                          String(metric.interval),
                          handleLocalApplySuggestion, // Use local handler
                          `metrics[${index}].interval`
                      )}
                    </Box>
                  </Grid>
                </Grid>
              </Box>
            ))
          ) : (
            <Typography variant="body1">No metrics available.</Typography>
          )}
          <Button
            startIcon={<AddCircleOutlineIcon />}
            onClick={addMetric}
            variant="outlined"
            sx={{ mb: 2 }}
          >
            Add Metric
          </Button>
        </Grid>

        {/* Actions Editing */}
        <Grid item xs={12}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
            Actions
          </Typography>
          {localData?.actions && localData.actions.length > 0 ? (
            localData.actions.map((action, index) => (
              <Box
                key={index}
                sx={{
                  border: '1px solid #eee',
                  borderRadius: 1,
                  p: 2,
                  mb: 2,
                  position: 'relative'
                }}
              >
                <IconButton
                  aria-label="delete action"
                  size="small"
                  onClick={() => removeAction(index)}
                  sx={{ position: 'absolute', top: 8, right: 8 }}
                >
                  <DeleteIcon />
                </IconButton>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={4}>
                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                      <TextField
                        label="Action Name"
                        fullWidth
                        value={action.name || ''}
                        onChange={e => handleActionChange(index, 'name', e.target.value)}
                      />
                      {suggestion?.actions_suggestion && suggestion.actions_suggestion[index]?.name && renderSuggestionItem(
                          suggestion.actions_suggestion[index].name,
                          action.name,
                          handleLocalApplySuggestion, // Use local handler
                          `actions[${index}].name`
                      )}
                    </Box>
                  </Grid>
                  <Grid item xs={4}>
                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                      <TextField
                        label="Description"
                        fullWidth
                        value={action.description || ''}
                        onChange={e => handleActionChange(index, 'description', e.target.value)}
                      />
                      {suggestion?.actions_suggestion && suggestion.actions_suggestion[index]?.description && renderSuggestionItem(
                          suggestion.actions_suggestion[index].description,
                          action.description,
                          handleLocalApplySuggestion, // Use local handler
                          `actions[${index}].description`
                      )}
                    </Box>
                  </Grid>
                  <Grid item xs={2}>
                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                      <TextField
                        label="Interval (hours)"
                        fullWidth
                        type="number"
                        value={action.interval || 0}
                        onChange={e => handleActionChange(index, 'interval', e.target.value)}
                      />
                      {suggestion?.actions_suggestion && suggestion.actions_suggestion[index]?.interval !== undefined && renderSuggestionItem(
                          String(suggestion.actions_suggestion[index].interval),
                          String(action.interval),
                          handleLocalApplySuggestion, // Use local handler
                          `actions[${index}].interval`
                      )}
                    </Box>
                  </Grid>
                  <Grid item xs={2}>
                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                      <TextField
                        label="End Date"
                        type="date"
                        fullWidth
                        value={
                          action.action_end_date
                            ? format(new Date(action.action_end_date), 'yyyy-MM-dd')
                            : ''
                        }
                        onChange={e => handleActionChange(index, 'action_end_date', e.target.value)}
                        InputLabelProps={{ shrink: true }}
                      />
                      {suggestion?.actions_suggestion && suggestion.actions_suggestion[index]?.action_end_date && renderSuggestionItem(
                          suggestion.actions_suggestion[index].action_end_date ? format(new Date(suggestion.actions_suggestion[index].action_end_date), 'yyyy-MM-dd') : null,
                          action.action_end_date ? format(new Date(action.action_end_date), 'yyyy-MM-dd') : null,
                          handleLocalApplySuggestion, // Use local handler
                          `actions[${index}].action_end_date`
                      )}
                    </Box>
                  </Grid>
                </Grid>
              </Box>
            ))
          ) : (
            <Typography variant="body1">No actions available.</Typography>
          )}
          <Button
            startIcon={<AddCircleOutlineIcon />}
            onClick={addAction}
            variant="outlined"
            sx={{ mb: 2 }}
          >
            Add Action
          </Button>
        </Grid>
      </Grid>
      {renderSuggestions()}
    </Paper>
  );
};

export default HealthGoalsTab