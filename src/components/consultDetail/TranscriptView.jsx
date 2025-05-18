import React, { useState } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  Paper,
  TextField,
  InputAdornment,
  IconButton,
  Chip,
  useMediaQuery,
  useTheme
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';

// Helper function to format time
const formatTime = (timeString) => {
  if (!timeString) return 'N/A';
  try {
    return new Date(timeString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch (error) {
    console.error("Error formatting time:", timeString, error);
    return 'Invalid Time';
  }
};

const TranscriptView = ({ transcript }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const filteredTranscript = transcript.filter(item => 
    item.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.speaker && item.speaker.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const highlightMatch = (text, term) => {
    if (!term) return text;
    const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, index) => 
      regex.test(part) ? <mark key={index} style={{ backgroundColor: '#ffff00', padding: '0' }}>{part}</mark> : part
    );
  };

  return (
    <Box>
      <TextField
        fullWidth
        variant="outlined"
        placeholder="Search transcript..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        sx={{ 
          mb: 2,
          '.MuiInputBase-root': {
            height: { xs: '40px', sm: 'auto' },
            fontSize: { xs: '0.875rem', sm: '1rem' }
          }
        }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize={isMobile ? "small" : "medium"} />
            </InputAdornment>
          ),
          endAdornment: searchTerm && (
            <InputAdornment position="end">
              <IconButton 
                onClick={() => setSearchTerm('')} 
                edge="end"
                size={isMobile ? "small" : "medium"}
              >
                <ClearIcon fontSize={isMobile ? "small" : "medium"} />
              </IconButton>
            </InputAdornment>
          )
        }}
      />
      {filteredTranscript.length === 0 && (
        <Typography color="text.secondary" textAlign="center" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
          No matching entries found.
        </Typography>
      )}
      <Paper 
        elevation={0} 
        sx={{ 
          maxHeight: { xs: '50vh', sm: '60vh' }, 
          overflowY: 'auto', 
          border: '1px solid', 
          borderColor: 'divider', 
          borderRadius: 1 
        }}
      >
        <List dense disablePadding>
          {filteredTranscript.map((item, index) => (
            <ListItem 
              key={index} 
              divider 
              sx={{ 
                alignItems: 'flex-start', 
                py: { xs: 1, sm: 1.5 }, 
                px: { xs: 1.5, sm: 2 },
                flexDirection: { xs: 'column', sm: 'row' }
              }}
            >
              <ListItemText
                primaryTypographyProps={{ 
                  variant: 'body2',
                  fontSize: { xs: '0.85rem', sm: '0.875rem' },
                  lineHeight: { xs: 1.4, sm: 1.6 }
                }}
                primary={highlightMatch(item.content, searchTerm)}
                secondaryTypographyProps={{ component: 'div' }}
                secondary={
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: { xs: 'flex-start', sm: 'space-between' }, 
                    alignItems: 'center', 
                    mt: { xs: 0.75, sm: 0.5 },
                    flexWrap: { xs: 'wrap', sm: 'nowrap' },
                    gap: { xs: 0.5, sm: 0 }
                  }}>
                    <Chip 
                      label={item.speaker || 'System'} 
                      size="small" 
                      color={item.speaker ? 'primary' : 'default'}
                      variant="outlined"
                      sx={{ 
                        mr: 1, 
                        fontWeight: 'medium',
                        fontSize: { xs: '0.7rem', sm: '0.75rem' },
                        height: { xs: '22px', sm: '24px' }
                      }}
                    />
                    <Typography 
                      variant="caption" 
                      color="text.secondary"
                      sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}
                    >
                      {formatTime(item.time)}
                    </Typography>
                  </Box>
                }
              />
            </ListItem>
          ))}
        </List>
      </Paper>
    </Box>
  );
};

export default TranscriptView;
