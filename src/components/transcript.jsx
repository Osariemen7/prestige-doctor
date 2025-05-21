import React, { useState, useEffect } from 'react';
import { 
    Paper, 
    Typography, 
    Box, 
    TextField, 
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
import CloseIcon from '@mui/icons-material/Close';

function TranscriptTab({ transcript, onTranscriptChange, isMobile }) {
    const [editIndex, setEditIndex] = useState(null);
    const [editContent, setEditContent] = useState('');
    const [localTranscript, setLocalTranscript] = useState(transcript || []);

    useEffect(() => {
        setLocalTranscript(transcript || []);
    }, [transcript]);

    // Add keyboard event listeners for Escape key
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && editIndex !== null) {
                cancelEditing();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [editIndex]);

    const handleContentChange = (index, newContent) => {
        const updatedTranscript = JSON.parse(JSON.stringify(localTranscript));
        updatedTranscript[index] = {
            ...updatedTranscript[index],
            content: newContent
        };
        
        setLocalTranscript(updatedTranscript);
        if (onTranscriptChange) {
            onTranscriptChange(updatedTranscript);
        }
    };

    const startEditing = (index, content) => {
        setEditIndex(index);
        setEditContent(content);
    };

    const cancelEditing = () => {
        setEditIndex(null);
    };    

    const saveEdit = (index) => {
        if (editContent !== localTranscript[index].content) {
            handleContentChange(index, editContent);
        }
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

    if (!Array.isArray(localTranscript) || localTranscript.length === 0) {
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
                <Typography variant="h6" color="primary.main" sx={{ mb: 1, fontWeight: 500 }}>
                    Consultation Transcript
                </Typography>
                <Typography sx={{ color: 'text.secondary', fontSize: '0.95rem' }}>
                    No transcript available yet.
                </Typography>
            </Paper>
        );
    }
    
    return (
        <Paper elevation={0} sx={{ 
            padding: 0, 
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#fcfcfc',
            borderRadius: '4px',
            border: '1px solid #eaeaea'
        }}>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell width="15%" sx={{ fontWeight: 600 }}>Time</TableCell>
                        <TableCell width="70%" sx={{ fontWeight: 600 }}>Content</TableCell>
                        <TableCell width="15%" align="center" sx={{ fontWeight: 600 }}>Actions</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {localTranscript.map((entry, index) => (
                        <TableRow key={index}>
                            <TableCell sx={{ verticalAlign: 'top', pt: 1.5 }}>
                                {formatDisplayTime(entry.time)}
                            </TableCell>
                            <TableCell>
                                {editIndex === index ? (
                                    <TextField
                                        fullWidth
                                        multiline
                                        value={editContent}
                                        onChange={(e) => setEditContent(e.target.value)}
                                        onKeyPress={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                saveEdit(index);
                                            }
                                        }}
                                        autoFocus
                                        variant="outlined"
                                        size="small"
                                    />
                                ) : (
                                    <Typography
                                        component="div"
                                        sx={{
                                            whiteSpace: 'pre-wrap',
                                            wordBreak: 'break-word',
                                            color: 'text.primary'
                                        }}
                                    >
                                        {entry.content}
                                    </Typography>
                                )}
                            </TableCell>
                            <TableCell sx={{ textAlign: 'center', verticalAlign: 'top', pt: 1.5 }}>
                                {editIndex === index ? (
                                    <>
                                        <Tooltip title="Save (Enter)">
                                            <IconButton 
                                                size="small" 
                                                onClick={() => saveEdit(index)}
                                                color="primary"
                                            >
                                                <DoneIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Cancel (Escape)">
                                            <IconButton 
                                                size="small" 
                                                onClick={cancelEditing}
                                                color="secondary"
                                            >
                                                <CloseIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </>
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
                    ))}
                </TableBody>
            </Table>
        </Paper>
    );
}

export default TranscriptTab;