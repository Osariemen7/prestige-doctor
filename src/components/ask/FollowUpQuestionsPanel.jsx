import React from 'react';
import { Box, Typography, Paper, Button } from '@mui/material';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer'; // Import an icon

const FollowUpQuestionsPanel = ({ questions, onQuestionClick }) => {
  if (!questions || questions.length === 0) return null;

  // Function to ensure sentence case (optional, CSS handles most)
  const toSentenceCase = (str) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  return (
    <Paper
      elevation={0} // Use border instead of shadow for subtlety
      sx={{
        mt: 2, // Reduced margin top
        mb: 2,
        p: { xs: 1.5, sm: 2 }, // Adjust padding
        borderRadius: 3,
        // Use a subtle background, maybe slightly different from chat bubbles
        background: 'linear-gradient(135deg, #ffffff 0%, #f0f4f8 100%)',
        border: '1px solid #e0e0e0', // Add a light border
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)', // Very subtle shadow
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
        <QuestionAnswerIcon sx={{ color: 'primary.main', mr: 1, fontSize: '1.2rem' }} />
        <Typography variant="subtitle2" sx={{ color: 'primary.dark', fontWeight: 600 }}>
          Suggested follow-up questions
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}> {/* Reduced gap */}
        {questions.slice(0, 5).map((q, idx) => (
          <Button
            key={idx}
            variant="text" // Use text variant for less emphasis
            color="primary"
            sx={{
              justifyContent: 'flex-start',
              textAlign: 'left',
              borderRadius: 1.5, // Slightly less rounded
              fontWeight: 400, // Normal weight
              textTransform: 'none', // Ensure sentence case from API is preserved
              p: '6px 12px', // Adjust padding
              color: 'text.primary', // Use primary text color
              backgroundColor: 'rgba(25, 118, 210, 0.04)', // Very subtle blue background
              '&:hover': {
                backgroundColor: 'rgba(25, 118, 210, 0.08)', // Slightly darker on hover
                textDecoration: 'underline', // Add underline on hover
              },
            }}
            onClick={() => onQuestionClick(q)}
            fullWidth
          >
            {toSentenceCase(q)} {/* Apply sentence case just in case */}
          </Button>
        ))}
      </Box>
    </Paper>
  );
};

export default FollowUpQuestionsPanel;
