import React from 'react';
import { Box, IconButton, TextField, FormControl, Select, MenuItem, Icon, CircularProgress } from '@mui/material';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import SendIcon from '@mui/icons-material/Send';
import PersonIcon from '@mui/icons-material/Person';

const MobileMessageInput = ({
  message,
  setMessage,
  handleSendMessage,
  isResponseLoading,
  selectedImage,
  handleImageUploadClick,
  fileInputRef,
  handleImageSelect,
  placeholder,
  selectedImagePreview,
  handleCancelImage,
  datalist,
  selectedPatient,
  setSelectedPatient,
  expertLevel,
  setExpertLevel,
  isExpertLevelLocked,
  showSuggestions,
  setShowSuggestions
}) => (
  <Box
    sx={{
      position: 'fixed',
      left: 0,
      bottom: 0,
      width: '100vw',
      bgcolor: 'white',
      boxShadow: '0 -2px 10px rgba(0,0,0,0.08)',
      zIndex: 1200,
      p: 1,
      borderTopLeftRadius: 12,
      borderTopRightRadius: 12,
    }}
  >
    {selectedImagePreview && (
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <img
          src={selectedImagePreview}
          alt="Preview"
          style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 8, marginRight: 8 }}
        />
        <IconButton size="small" onClick={handleCancelImage}>
          <Icon>cancel</Icon>
        </IconButton>
      </Box>
    )}
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {/* Suggestions icon button */}
      <IconButton
        color={showSuggestions ? "primary" : "default"}
        onClick={() => setShowSuggestions(!showSuggestions)}
        aria-label="show suggestions"
        sx={{
          backgroundColor: showSuggestions ? '#e3f2fd' : 'transparent',
          p: 1,
          '&:hover': { backgroundColor: showSuggestions ? '#bbdefb' : '#f5f5f5' }
        }}
      >
        <LightbulbIcon fontSize="small" />
      </IconButton>
      {/* Attach icon button */}
      <IconButton
        color="primary"
        onClick={handleImageUploadClick}
        aria-label="attach file"
        disabled={isResponseLoading}
        sx={{ bgcolor: '#e3f2fd', p: 1, '&:hover': { bgcolor: '#bbdefb' } }}
      >
        <AttachFileIcon fontSize="small" />
      </IconButton>
      <input
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        ref={fileInputRef}
        onChange={handleImageSelect}
        disabled={isResponseLoading}
      />
      <TextField
        fullWidth
        placeholder={placeholder}
        variant="standard"
        multiline
        minRows={1}
        maxRows={3}
        InputProps={{ disableUnderline: true, style: { fontSize: '16px' } }}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyPress={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
          }
        }}
        sx={{ bgcolor: '#f5f5f5', borderRadius: 2, px: 1, py: 0.5 }}
      />
      <IconButton
        color="primary"
        onClick={handleSendMessage}
        disabled={(!message.trim() && !selectedImage) || isResponseLoading}
        sx={{
          width: 36, height: 36, borderRadius: '50%', background: '#1976d2', color: 'white', ml: 0.5, boxShadow: 'none', '&:hover': { background: '#125ea2' }, flexShrink: 0,
        }}
      >
        {isResponseLoading ? <CircularProgress size={22} sx={{ color: 'white' }} /> : <SendIcon sx={{ fontSize: 20 }} />}
      </IconButton>
    </Box>
    <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
      {/* Patient Select */}
      <FormControl variant="standard" sx={{ minWidth: 90, '.MuiOutlinedInput-root': { borderRadius: '999px', background: '#f0f4f8', height: 32, pl: 0.5, pr: 1, fontSize: 13, boxShadow: 'none' } }} size="small">
        <Select
          value={selectedPatient ? selectedPatient.id : ''}
          onChange={(e) => {
            const patientId = e.target.value;
            const patient = datalist.find((p) => p.id === patientId);
            setSelectedPatient(patient);
          }}
          displayEmpty
          startAdornment={<PersonIcon sx={{ color: '#1976d2', fontSize: 16, mr: 0.5, ml: 1 }} />}
          renderValue={(selected) =>
            selected
              ? (datalist.find((p) => p.id === selected)?.full_name?.split(' ')[0] || `Patient`)
              : 'Patient'
          }
          sx={{
            borderRadius: '999px', fontSize: 13, color: '#1976d2', fontWeight: 500, minWidth: 70, height: 32, pl: 0, pr: 0, background: '#f0f4f8', boxShadow: 'none', '.MuiSelect-icon': { color: '#1976d2', fontSize: 18 },
          }}
          MenuProps={{ PaperProps: { style: { zIndex: 1302 } } }}
        >
          <MenuItem value=""><em>Choose Patient</em></MenuItem>
          {datalist.map((patient) => (
            <MenuItem key={patient.id} value={patient.id}>
              {patient.full_name ? `${patient.full_name} (${patient.id})` : `Patient (${patient.id})`}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      {/* Expertise Select */}
      <FormControl variant="standard" sx={{ minWidth: 90, '.MuiOutlinedInput-root': { borderRadius: '999px', background: '#f0f4f8', height: 32, pl: 0.5, pr: 1, fontSize: 13, boxShadow: 'none' } }} size="small">
        <Select
          value={expertLevel}
          onChange={(e) => setExpertLevel(e.target.value)}
          disabled={isExpertLevelLocked || isResponseLoading}
          displayEmpty
          renderValue={(selected) => {
            if (selected === 'basic') return 'Basic $0.1';
            if (selected === 'advanced') return 'Advanced $0.5';
            return <em>Expertise</em>;
          }}
          sx={{
            borderRadius: '999px', fontSize: 13, color: '#1976d2', fontWeight: 500, minWidth: 70, height: 32, pl: 1, pr: 0, background: '#f0f4f8', boxShadow: 'none', '.MuiSelect-icon': { color: '#1976d2', fontSize: 18 },
          }}
          MenuProps={{ PaperProps: { style: { zIndex: 1302 } } }}
        >
          <MenuItem value="basic" disabled={isExpertLevelLocked || isResponseLoading}>Basic $0.1</MenuItem>
          <MenuItem value="advanced">Advanced $0.5</MenuItem>
        </Select>
      </FormControl>
    </Box>
  </Box>
);

export default MobileMessageInput;
