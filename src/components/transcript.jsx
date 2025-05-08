import React from 'react';
import { Paper, Typography, Box, TextField } from '@mui/material';

function TranscriptTab({ transcript, onTranscriptChange }) {
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
            <Paper elevation={2} sx={{ padding: 2, mt: 2 }}>
                <Typography variant="h6">Conversation Transcript</Typography>
                <Typography sx={{ mt: 2 }}>No transcript available yet.</Typography>
            </Paper>
        );
    }

    return (
        <Paper elevation={2} sx={{ padding: 2, mt: 2, maxHeight: '500px', overflowY: 'auto' }}>
            <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>Conversation Transcript</Typography>
            {transcript.map((entry, index) => (
                <Box 
                    key={index} 
                    sx={{ 
                        mb: 2, 
                        p: 1.5, 
                        border: '1px solid #e0e0e0', 
                        borderRadius: '8px', 
                        backgroundColor: index % 2 === 0 ? '#f9f9f9' : '#ffffff',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                    }}
                >
                    <Typography 
                        variant="caption" 
                        color="textSecondary" 
                        display="block" 
                        sx={{ mb: 0.5, fontSize: '0.75rem', fontWeight: 'medium' }}
                    >
                        Time: {formatDisplayTime(entry.time)}
                    </Typography>
                    <TextField
                        fullWidth
                        multiline
                        variant="outlined"
                        value={entry.content}
                        onChange={(e) => handleContentChange(index, e.target.value)}
                        InputProps={{
                            sx: {
                                fontSize: '0.9rem',
                                lineHeight: 1.5,
                            }
                        }}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                backgroundColor: 'white',
                                '& fieldset': {
                                    borderColor: '#ccc',
                                },
                                '&:hover fieldset': {
                                    borderColor: '#bbb',
                                },
                                '&.Mui-focused fieldset': {
                                    borderColor: 'primary.main',
                                },
                            },
                        }}
                    />
                </Box>
            ))}
        </Paper>
    );
}

export default TranscriptTab;