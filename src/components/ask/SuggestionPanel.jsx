import React from 'react';
import { Box, Typography, Collapse } from '@mui/material';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';

const SuggestionPanel = ({ suggestions, expandedCategories, toggleCategory, handleQuestionClick }) => {
  if (!suggestions || suggestions.length === 0) return null;
  return (
    <Box sx={{ width: '100%', maxWidth: '700px', mt: 2, mb: 2, bgcolor: 'white', borderRadius: 3, overflow: 'hidden', boxShadow: '0 2px 12px rgba(33,150,243,0.07)' }}>
      <Box sx={{ p: 2, borderBottom: '1px solid #edf2f7', display: 'flex', alignItems: 'center', bgcolor: '#f8fafc' }}>
        <LightbulbIcon sx={{ color: '#1976d2', mr: 1 }} />
        <Typography variant="subtitle1" fontWeight="medium">
          Suggested Questions
        </Typography>
      </Box>
      <Box sx={{ maxHeight: '400px', overflowY: 'auto' }}>
        {suggestions.map((category, index) => (
          <Box key={category.category_name} sx={{ borderBottom: index < suggestions.length - 1 ? '1px solid #edf2f7' : 'none' }}>
            <Box 
              onClick={() => toggleCategory(category.category_name)}
              sx={{ 
                p: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                bgcolor: expandedCategories.includes(category.category_name) ? 'rgba(37, 99, 235, 0.05)' : 'transparent',
                '&:hover': {
                  bgcolor: 'rgba(37, 99, 235, 0.05)'
                }
              }}
            >
              <Typography fontWeight="medium" color="textPrimary">
                {category.category_name}
              </Typography>
              {expandedCategories.includes(category.category_name) ? 
                <KeyboardArrowDownIcon /> : 
                <KeyboardArrowRightIcon />
              }
            </Box>
            <Collapse in={expandedCategories.includes(category.category_name)}>
              <Box sx={{ p: 2, pt: 0 }}>
                {category.sample_questions.map((question, qIndex) => (
                  <Box 
                    key={qIndex}
                    onClick={() => handleQuestionClick(question)}
                    sx={{ 
                      p: 2, 
                      mb: 1,
                      borderRadius: 1,
                      bgcolor: '#f8fafc',
                      cursor: 'pointer',
                      border: '1px solid #edf2f7',
                      '&:hover': {
                        bgcolor: '#f1f5f9',
                        borderColor: '#e2e8f0'
                      }
                    }}
                  >
                    <Typography variant="body2">{question}</Typography>
                  </Box>
                ))}
              </Box>
            </Collapse>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default SuggestionPanel;
