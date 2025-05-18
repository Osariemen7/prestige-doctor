import React, { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  Paper,
  TextField,
  Button,
  Avatar,
  Chip,
  CircularProgress,
  Alert,
  Popover
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { getAccessToken } from '../api'; // Changed to correct path

// Helper function to format date/time
const formatDateTime = (dateTimeString) => {
  if (!dateTimeString) return 'N/A';
  try {
    return new Date(dateTimeString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    return 'Invalid Date';
  }
};

const CollaborationView = ({ messages: initialMessages = [], publicId, onMessageSent }) => { // Added onMessageSent prop
  const [messages, setMessages] = useState(initialMessages); // This will now primarily reflect prop changes
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  const [popoverAnchorEl, setPopoverAnchorEl] = useState(null);
  const [selectedCollaborator, setSelectedCollaborator] = useState(null);

  const uniqueCollaborators = useMemo(() => {
    if (!messages || messages.length === 0) return [];
    const collaboratorsMap = new Map();
    messages.forEach(msg => {
      const key = `${msg.sender_name}_${msg.sender_type}`;
      if (msg.sender_name && !collaboratorsMap.has(key)) {
        collaboratorsMap.set(key, {
          id: key,
          name: msg.sender_name,
          type: msg.sender_type,
        });
      }
    });
    return Array.from(collaboratorsMap.values());
  }, [messages]);

  // Update messages state if initialMessages prop changes (e.g., after parent refetches)
  React.useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  const handleOpenCollaboratorDetails = (event, collaborator) => {
    setPopoverAnchorEl(event.currentTarget);
    setSelectedCollaborator(collaborator);
  };

  const handleCloseCollaboratorDetails = () => {
    setPopoverAnchorEl(null);
    setSelectedCollaborator(null);
  };

  const openPopover = Boolean(popoverAnchorEl);

  const handleSendMessage = useCallback(async () => {
    if (!newMessage.trim()) return;
    setSending(true);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error('Authentication required.');

      const response = await fetch(`https://health.prestigedelta.com/review-note/${publicId}/send_collaboration_message/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ message: newMessage, message_type: 'note' }),
      });

      if (!response.ok) {
        let errData;
        try {
          errData = await response.json();
        } catch (e) {
          const errText = await response.text();
          throw new Error(errText || 'Failed to send message. Status: ' + response.status);
        }
        throw new Error(errData.detail || errData.message || 'Failed to send message');
      }
      // const sentMessageFromApi = await response.json(); // We don't need to process it here anymore
      await response.json(); // Still need to consume the response body

      setNewMessage(''); // Clear the input field
      if (onMessageSent) {
        onMessageSent(); // Call the callback to trigger data refresh in parent
      }
      // setMessages(prevMessages => [...prevMessages, newLocalMessage]); // Removed: Parent will refresh data
    } catch (e) {
      console.error("Error sending message:", e);
      setError(e.message);
    } finally {
      setSending(false);
    }
  }, [newMessage, publicId, onMessageSent]);

  return (
    <Paper elevation={2} sx={{ 
      p: { xs: 1.5, md: 3 }, 
      borderRadius: 2,
      display: 'flex',
      flexDirection: 'column',
    }}>
      <Typography variant="h6" gutterBottom sx={{ 
        fontWeight: 'bold', 
        color: 'primary.dark',
        fontSize: { xs: '1rem', sm: '1.25rem' },
        px: { xs: 0.5, sm: 0 },
        flexShrink: 0
      }}>
        Collaboration Space
      </Typography>

      {/* Collaborators Bar */}
      {uniqueCollaborators.length > 0 && (
        <Box sx={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          alignItems: 'center',
          gap: 1, 
          mb: 2, 
          p: 1, 
          borderBottom: '1px solid', 
          borderColor: 'divider',
          flexShrink: 0
        }}>
          <Typography variant="overline" sx={{ mr: 1, color: 'text.secondary', lineHeight: 'normal' }}>
            Participants:
          </Typography>
          {uniqueCollaborators.map((collab) => (
            <Chip
              key={collab.id}
              avatar={
                <Avatar sx={{ 
                  width: 24, 
                  height: 24, 
                  fontSize: '0.75rem',
                  bgcolor: collab.type === 'doctor' ? 'primary.main' : 'secondary.main',
                  color: collab.type === 'doctor' ? 'primary.contrastText' : 'secondary.contrastText'
                }}>
                  {collab.name ? collab.name.charAt(0).toUpperCase() : '?'}
                </Avatar>
              }
              label={collab.name}
              onClick={(event) => handleOpenCollaboratorDetails(event, collab)}
              size="small"
              sx={{ cursor: 'pointer' }}
            />
          ))}
        </Box>
      )}

      {error && <Alert severity="error" sx={{ mb: 2, flexShrink: 0 }}>{error}</Alert>}
      
      {/* Messages Area */}
      <Box sx={{ 
        flexGrow: 1, 
        height: { xs: '300px', sm: '350px', md: '400px' }, 
        overflowY: 'auto', 
        mb: 2, 
        p: { xs: 0.5, sm: 1 }, 
        border: '1px solid', 
        borderColor: 'divider', 
        borderRadius: 1 
      }}>
        {messages.length === 0 ? (
          <Typography color="text.secondary" textAlign="center" sx={{ py: 2 }}>
            No collaboration messages yet.
          </Typography>
        ) : (
          <List sx={{ p: 0 }}>
            {messages.map((msg) => {
              const msgSenderKey = `${msg.sender_name}_${msg.sender_type}`;
              const collaboratorForMsg = uniqueCollaborators.find(c => c.id === msgSenderKey) || 
                                       { name: msg.sender_name, type: msg.sender_type, id: msgSenderKey };

              return (
                <ListItem key={msg.id} sx={{ 
                  display: 'flex', 
                  flexDirection: msg.sender_type === 'doctor' ? 'row-reverse' : 'row',
                  mb: 1,
                  pr: msg.sender_type === 'doctor' ? { xs: 0, sm: 2 } : 0,
                  pl: msg.sender_type === 'doctor' ? 0 : { xs: 0, sm: 2 },
                  px: { xs: 0.5, sm: 'inherit' }
                }}>
                  <Avatar 
                    sx={{ 
                      bgcolor: msg.sender_type === 'doctor' ? 'primary.main' : 'secondary.main', 
                      mx: { xs: 0.5, sm: 1 },
                      width: { xs: 28, sm: 40 },
                      height: { xs: 28, sm: 40 },
                      fontSize: { xs: '0.8rem', sm: '1rem' },
                      cursor: 'pointer' 
                    }}
                    onClick={(event) => handleOpenCollaboratorDetails(event, collaboratorForMsg)}
                  >
                    {msg.sender_name ? msg.sender_name.charAt(0).toUpperCase() : (msg.sender_type === 'doctor' ? 'D' : 'P')}
                  </Avatar>
                  <Paper 
                    elevation={1} 
                    sx={{
                      p: { xs: 1, sm: 1.5 },
                      borderRadius: '10px',
                      bgcolor: msg.sender_type === 'doctor' ? 'primary.light' : 'grey.200',
                      color: msg.sender_type === 'doctor' ? 'primary.contrastText' : 'text.primary',
                      maxWidth: { xs: '85%', sm: '75%' }
                    }}
                  >
                    <ListItemText
                      primary={msg.content}
                      secondary={`${msg.sender_name || msg.sender_type} - ${formatDateTime(msg.created_at)}`}
                      primaryTypographyProps={{ 
                        fontSize: { xs: '0.875rem', sm: '1rem' }
                      }}
                      secondaryTypographyProps={{ 
                        variant: 'caption', 
                        color: msg.sender_type === 'doctor' ? 'rgba(255,255,255,0.7)' : 'text.secondary',
                        mt: 0.5,
                        fontSize: { xs: '0.7rem', sm: '0.75rem' }
                      }}
                    />
                  </Paper>
                </ListItem>
              );
            })}
          </List>
        )}
      </Box>

      {/* Input Area */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        flexDirection: { xs: 'column', sm: 'row' },
        gap: { xs: 1, sm: 0 },
        flexShrink: 0
      }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Type your message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && !sending && handleSendMessage()}
          disabled={sending}
          sx={{ 
            mr: { xs: 0, sm: 1 },
            '& .MuiInputBase-input': {
              fontSize: { xs: '0.875rem', sm: '1rem' },
              py: { xs: 1, sm: 'inherit' }
            }
          }}
        />
        <Button
          variant="contained"
          color="primary"
          onClick={handleSendMessage}
          disabled={sending || !newMessage.trim()}
          endIcon={sending ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
          sx={{ 
            width: { xs: '100%', sm: 'auto' },
            py: { xs: 0.75, sm: 1 },
            fontSize: { xs: '0.8rem', sm: '0.875rem' }
          }}
        >
          Send
        </Button>
      </Box>

      {/* Collaborator Details Popover */}
      {selectedCollaborator && (
        <Popover
          open={openPopover}
          anchorEl={popoverAnchorEl}
          onClose={handleCloseCollaboratorDetails}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'center',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'center',
          }}
          PaperProps={{
            elevation: 3,
            sx: { borderRadius: '8px', mt: 0.5 } // Added small margin-top
          }}
        >
          <Box sx={{ p: 2, minWidth: 280, maxWidth: 320 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Avatar sx={{ 
                width: 56, 
                height: 56, 
                mr: 2, 
                fontSize: '1.5rem',
                bgcolor: selectedCollaborator.type === 'doctor' ? 'primary.dark' : 'secondary.dark',
                color: selectedCollaborator.type === 'doctor' ? 'primary.contrastText' : 'secondary.contrastText'
              }}>
                {selectedCollaborator.name ? selectedCollaborator.name.charAt(0).toUpperCase() : '?'}
              </Avatar>
              <Box>
                <Typography variant="h6" component="div" sx={{ fontWeight: 'medium' }}>
                  {selectedCollaborator.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                  {selectedCollaborator.type}
                </Typography>
              </Box>
            </Box>
            <Typography variant="subtitle2" gutterBottom>Details</Typography>
            <Typography variant="body2" sx={{ mb: 0.5 }}>
              Role: <Chip label={selectedCollaborator.type === 'doctor' ? 'Consulting Doctor' : 'Participant'} size="small" 
                        color={selectedCollaborator.type === 'doctor' ? 'primary' : 'secondary'} variant="outlined" />
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontSize: '0.8rem' }}>
              <i>More detailed information can be presented here when available.</i>
            </Typography>
          </Box>
        </Popover>
      )}
    </Paper>
  );
};

export default CollaborationView;
