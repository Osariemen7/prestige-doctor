import React from 'react';
import { Paper, Typography, Box, TextField, Chip, Divider, Avatar } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';

function TranscriptTab({ transcript, onTranscriptChange, isMobile }) {
    const handleContentChange = (index, newContent) => {
        const updatedTranscript = transcript.map((item, i) =>
            i === index ? { ...item, content: newContent } : item
        );
        if (onTranscriptChange) {
            onTranscriptChange(updatedTranscript);
        }
    };

    const formatDisplayTime = (isoString) => {
        if (!isoString) return '';
        try {
            const date = new Date(isoString);
            if (isNaN(date.getTime())) {
                return "Invalid time";
            }
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
        } catch (e) {
            console.error("Error formatting time:", e);
            return isoString;
        }
    };

    if (!Array.isArray(transcript) || transcript.length === 0) {
        return (
            <Paper elevation={0} sx={{ 
                padding: isMobile ? 2 : 3, 
                mt: 2, 
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '200px',
                border: '1px dashed #cbd5e1'
            }}>
                <Typography variant="h6" color="primary.main" sx={{ mb: 1, fontWeight: 500 }}>Conversation Transcript</Typography>
                <Typography sx={{ color: 'text.secondary', fontSize: '0.95rem' }}>No transcript available yet.</Typography>
            </Paper>
        );
    }    return (
        <Paper 
            elevation={0} 
            sx={{ 
                padding: isMobile ? 2 : 3, 
                mt: 0, 
                maxHeight: '80vh',
                overflowY: 'auto',
                backgroundColor: '#fcfcfc',
                borderRadius: '4px',
                border: '1px solid #eaeaea'
            }}
        >
            <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                mb: 3,
                pb: 1,
                borderBottom: '1px solid #f0f0f0'
            }}>
                <Typography 
                    variant="h6" 
                    color="primary.main" 
                    sx={{ 
                        fontWeight: 500,
                        fontSize: isMobile ? '1.1rem' : '1.25rem'
                    }}
                >
                    Conversation Transcript
                </Typography>
                <Chip 
                    label={`${transcript.length} entries`} 
                    size="small"
                    color="primary"
                    variant="outlined"
                    sx={{ fontSize: '0.75rem' }}
                />
            </Box>

            {transcript.map((entry, index) => {
                const isPatient = entry.speaker?.toLowerCase() === 'patient';
                return (
                    <Box 
                        key={index} 
                        sx={{ 
                            mb: 2.5, 
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: isPatient ? 'flex-start' : 'flex-end'
                        }}
                    >
                        <Box sx={{
                            display: 'flex',
                            alignItems: 'center',
                            mb: 0.5,
                            gap: 1
                        }}>
                            <Avatar 
                                sx={{ 
                                    width: 28, 
                                    height: 28,
                                    bgcolor: isPatient ? 'secondary.light' : 'primary.light',
                                    fontSize: '0.875rem'
                                }}
                            >
                                {isPatient ? <PersonIcon fontSize="small" /> : <MedicalServicesIcon fontSize="small" />}
                            </Avatar>
                            <Typography 
                                variant="caption" 
                                color="text.secondary" 
                                sx={{ 
                                    fontSize: '0.75rem', 
                                    fontWeight: 500 
                                }}
                            >
                                {isPatient ? 'Patient' : 'Doctor'} • {formatDisplayTime(entry.time)}
                            </Typography>
                        </Box>

                        <Box sx={{
                            maxWidth: '85%',
                            alignSelf: isPatient ? 'flex-start' : 'flex-end',
                            backgroundColor: isPatient ? '#f0f7ff' : '#f0f9f6',
                            borderRadius: '12px',
                            borderBottomLeftRadius: isPatient ? '4px' : '12px',
                            borderBottomRightRadius: isPatient ? '12px' : '4px',
                            p: 2,
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                        }}>
                            <TextField
                                fullWidth
                                multiline
                                variant="standard"
                                value={entry.content}
                                onChange={(e) => handleContentChange(index, e.target.value)}
                                InputProps={{
                                    disableUnderline: true,
                                    sx: {
                                        fontSize: '0.9rem',
                                        lineHeight: 1.6,
                                        color: 'text.primary',
                                        padding: 0
                                    }
                                }}
                                sx={{
                                    '& .MuiInputBase-root': {
                                        padding: 0
                                    }
                                }}
                            />
                        </Box>
                    </Box>
                );
            })}
        </Paper>
    );
}

export default TranscriptTab;