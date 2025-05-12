import React from 'react';
import { Box, Typography, Paper, Chip, Tooltip, CircularProgress, Divider, Card, CardContent } from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import PriorityHighIcon from '@mui/icons-material/PriorityHigh';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';

const SuggestedQuestionsTab = ({ questions, isLoading, isMobile }) => {
  if (isLoading) {
    return (
      <Box sx={{ 
        p: 3, 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '250px',
        backgroundColor: '#fafafa',
        borderRadius: '8px',
      }}>
        <Box display="flex" justifyContent="center" alignItems="center" mb={2}>
          <CircularProgress size={36} sx={{ color: 'primary.main' }} />
        </Box>
        <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>
          Generating insightful questions...
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, maxWidth: '80%', textAlign: 'center' }}>
          Our AI is analyzing the patient data to create relevant clinical questions
        </Typography>
      </Box>
    );
  }
  
  if (!questions || questions.length === 0) {
    return (
      <Box sx={{ 
        p: 3, 
        textAlign: 'center', 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'center', 
        alignItems: 'center',
        minHeight: '250px',
        backgroundColor: '#fafafa',
        borderRadius: '8px',
      }}>
        <HelpOutlineIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 2, opacity: 0.7 }} />
        <Typography variant="body1" color="text.secondary" sx={{ mb: 1, fontWeight: 500 }}>
          No suggested questions available.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: '80%' }}>
          Click the "Generate Questions" button to help guide your consultation with AI-powered suggestions.
        </Typography>
      </Box>
    );  }
  return (
    <Box sx={{ 
      p: isMobile ? 2 : 3,
      pb: isMobile ? '70px' : 3,  // Add extra bottom padding on mobile to prevent overlap with tabs
      mb: isMobile ? 2 : 0  // Add bottom margin on mobile
    }}>
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        mb: 2.5,
        pb: 1.5,
        borderBottom: '1px solid #f0f0f0'
      }}>
        <LightbulbOutlinedIcon sx={{ mr: 1.5, color: 'primary.main' }} />
        <Box>
          <Typography 
            variant="h6" 
            gutterBottom 
            sx={{ 
              fontSize: isMobile ? '1.1rem' : '1.25rem',
              mb: 0.5,
              fontWeight: 500,
              color: 'primary.main'
            }}
          >
            Clinical Questions for Patient Assessment
          </Typography>
          <Typography 
            variant="body2" 
            color="text.secondary" 
            sx={{ fontSize: isMobile ? '0.8rem' : '0.85rem' }}
          >
            AI-generated questions based on patient history and clinical context
          </Typography>
        </Box>
      </Box>
      
      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(450px, 1fr))', 
        gap: 2.5
      }}>
        {questions.map((item, index) => {
          const isPriority = index < 3;
          return (
            <Card
              key={index}
              elevation={1}
              sx={{
                borderRadius: '8px',
                transition: 'transform 0.2s, box-shadow 0.2s',
                border: '1px solid',
                borderColor: isPriority ? 'primary.light' : 'secondary.light',
                backgroundColor: isPriority ? 'rgba(66, 133, 244, 0.03)' : 'rgba(237, 108, 2, 0.02)',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                }
              }}
            >
              <CardContent sx={{ p: isMobile ? 2 : 2.5 }}>
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'flex-start', 
                  mb: 1.5 
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box 
                      sx={{ 
                        mr: 1.5,
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: isPriority ? 'primary.main' : 'secondary.main',
                        color: 'white',
                        fontSize: '0.75rem',
                        fontWeight: 'bold'
                      }}
                    >
                      {index + 1}
                    </Box>
                    <Typography 
                      variant="subtitle1" 
                      sx={{ 
                        fontSize: isMobile ? '0.95rem' : '1rem',
                        fontWeight: 600,
                        color: 'text.primary',
                        lineHeight: 1.4
                      }}
                    >
                      {item.question}
                    </Typography>
                  </Box>
                  
                  <Chip 
                    icon={isPriority ? <PriorityHighIcon fontSize="small" /> : null}
                    label={isPriority ? "High Priority" : `Priority ${item.rank}`} 
                    size="small" 
                    color={isPriority ? "primary" : "secondary"}
                    variant={isPriority ? "filled" : "outlined"}
                    sx={{ 
                      ml: 1, 
                      height: 24,
                      fontSize: '0.7rem',
                      fontWeight: 500
                    }}
                  />
                </Box>
                
                <Divider sx={{ my: 1.5 }} />
                
                <Box sx={{ 
                  backgroundColor: 'background.paper', 
                  p: 1.5, 
                  borderRadius: '8px',
                  border: '1px solid',
                  borderColor: 'grey.200'
                }}>
                  <Typography 
                    variant="body2" 
                    color="text.secondary"
                    sx={{ 
                      fontSize: isMobile ? '0.8rem' : '0.85rem',
                      mb: 0.5,
                      fontWeight: 500
                    }}
                  >
                    Clinical Rationale:
                  </Typography>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      fontSize: isMobile ? '0.8rem' : '0.85rem',
                      color: 'text.primary',
                      lineHeight: 1.5
                    }}
                  >
                    {item.rationale}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          );
        })}
      </Box>
    </Box>
  );
};

export default SuggestedQuestionsTab;
