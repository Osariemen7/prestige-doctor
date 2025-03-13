import React from 'react';
import { Paper, Typography, Box } from '@mui/material';

function TranscriptTab({ transcript }) {
    return (
        <Paper elevation={2} sx={{ padding: 2, mt: 2 }}>
            <Typography variant="h6">Conversation Transcript</Typography>
            <Box sx={{ mt: 2, whiteSpace: 'pre-line' }}> {/* Use pre-line to respect new lines */}
                {transcript}
            </Box>
        </Paper>
    );
}

export default TranscriptTab;