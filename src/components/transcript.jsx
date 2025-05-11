import React, { useState } from 'react';
import { 
  Paper, 
  Typography, 
  Box, 
  TextField, 
  Chip, 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  IconButton,
  Tooltip
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DoneIcon from '@mui/icons-material/Done';

function TranscriptTab({ transcript, onTranscriptChange, isMobile }) {
    const [editIndex, setEditIndex] = useState(null);
    const [editContent, setEditContent] = useState('');

    const handleContentChange = (index, newContent) => {
        const updatedTranscript = transcript.map((item, i) =>
            i === index ? { ...item, content: newContent, speaker: "" } : item
        );
        if (onTranscriptChange) {
            onTranscriptChange(updatedTranscript);
        }
    };

    const startEditing = (index, content) => {
        setEditIndex(index);
        setEditContent(content);
    };

    const saveEdit = (index) => {
        handleContentChange(index, editContent);
        setEditIndex(null);
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
                <Typography variant="h6" color="primary.main" sx={{ mb: 1, fontWeight: 500 }}>Consultation Transcript</Typography>
                <Typography sx={{ color: 'text.secondary', fontSize: '0.95rem' }}>No transcript available yet.</Typography>
            </Paper>
        );
    }
    
    return (
        <Paper 
            elevation={0} 
            sx={{ 
                padding: 0, 
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: '#fcfcfc',
                borderRadius: '4px',
                border: '1px solid #eaeaea'
            }}
        >
            <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                padding: isMobile ? '12px 16px' : '16px 24px',
                borderBottom: '1px solid #f0f0f0',
                backgroundColor: '#f5f7fa'
            }}>
                <Typography 
                    variant="h6" 
                    color="primary.main" 
                    sx={{ 
                        fontWeight: 500,
                        fontSize: isMobile ? '1.1rem' : '1.25rem'
                    }}
                >
                    Consultation Transcript
                </Typography>
                <Chip 
                    label={`${transcript.length} entries`} 
                    size="small"
                    color="primary"
                    variant="outlined"
                    sx={{ fontSize: '0.75rem' }}
                />
            </Box>
            
            <Table 
                stickyHeader 
                size={isMobile ? "small" : "medium"} 
                sx={{ 
                    tableLayout: 'fixed',
                    '& .MuiTableCell-root': {
                        borderBottom: '1px solid rgba(224, 224, 224, 0.3)'
                    }
                }}
            >
                <TableHead>
                    <TableRow>
                        <TableCell width="20%" sx={{ 
                            fontWeight: 600, 
                            backgroundColor: '#f5f7fa', 
                            color: '#475569' 
                        }}>Time</TableCell>
                        <TableCell width="65%" sx={{ 
                            fontWeight: 600, 
                            backgroundColor: '#f5f7fa', 
                            color: '#475569' 
                        }}>Content</TableCell>
                        <TableCell width="15%" sx={{ 
                            fontWeight: 600, 
                            backgroundColor: '#f5f7fa', 
                            color: '#475569',
                            textAlign: 'center'
                        }}>Edit</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {transcript.map((entry, index) => {
                        const isEditing = editIndex === index;
                        
                        return (
                            <TableRow 
                                key={index} 
                                sx={{ 
                                    backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8fafc',
                                    '&:hover': {
                                        backgroundColor: '#f1f5f9'
                                    }
                                }}
                            >
                                <TableCell sx={{ 
                                    color: 'text.secondary',
                                    fontSize: '0.8rem',
                                    verticalAlign: 'top',
                                    pt: 2
                                }}>
                                    {formatDisplayTime(entry.time)}
                                </TableCell>
                                <TableCell sx={{
                                    py: 1.5,
                                    verticalAlign: 'top'
                                }}>
                                    {isEditing ? (
                                        <TextField
                                            fullWidth
                                            multiline
                                            variant="outlined"
                                            value={editContent}
                                            onChange={(e) => setEditContent(e.target.value)}
                                            size="small"
                                            autoFocus
                                            sx={{
                                                '& .MuiOutlinedInput-root': {
                                                    backgroundColor: '#ffffff',
                                                    fontSize: '0.9rem'
                                                }
                                            }}
                                        />
                                    ) : (
                                        <Typography 
                                            variant="body2" 
                                            sx={{ 
                                                whiteSpace: 'pre-wrap',
                                                fontSize: '0.9rem',
                                                lineHeight: 1.6,
                                                color: 'text.primary'
                                            }}
                                        >
                                            {entry.content}
                                        </Typography>
                                    )}
                                </TableCell>
                                <TableCell sx={{ textAlign: 'center', verticalAlign: 'top', pt: 1.5 }}>
                                    {isEditing ? (
                                        <Tooltip title="Save">
                                            <IconButton 
                                                size="small" 
                                                onClick={() => saveEdit(index)}
                                                color="primary"
                                            >
                                                <DoneIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    ) : (
                                        <Tooltip title="Edit">
                                            <IconButton 
                                                size="small" 
                                                onClick={() => startEditing(index, entry.content)}
                                            >
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    )}
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </Paper>
    );
}

export default TranscriptTab;