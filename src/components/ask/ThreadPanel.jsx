import React, { useState } from 'react';
import { Box, Typography, List, ListItem, ListItemText, IconButton, Button, Paper, Menu, MenuItem, useTheme } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DeleteIcon from '@mui/icons-material/Delete';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

const ThreadPanel = ({ threads, selectedThread, onSelectThread, onDeleteThread, onNewChat, isMobile, showPanel = true, onTogglePanel }) => {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState(null);
  const [menuThreadId, setMenuThreadId] = useState(null);
  const handleMenuOpen = (event, threadId) => {
    setAnchorEl(event.currentTarget);
    setMenuThreadId(threadId);
  };
  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuThreadId(null);
  };

  return (
    <Paper
      elevation={6}
      sx={{
        width: isMobile ? '90vw' : (showPanel ? 320 : 0),
        minWidth: isMobile ? 220 : (showPanel ? 220 : 0),
        maxWidth: 360,
        height: '100vh',
        borderRadius: { xs: 3, md: '24px 0 0 24px' },
        boxShadow: isMobile ? 3 : 6,
        display: 'flex',
        flexDirection: 'column',
        position: isMobile ? 'relative' : 'sticky',
        top: 0,
        left: 0,
        zIndex: 1201,
        bgcolor: 'white',
        borderRight: isMobile ? 'none' : (showPanel ? '1.5px solid #e3e8ee' : 'none'),
        transition: theme.transitions.create(['width', 'min-width', 'border-right'], {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.leavingScreen,
        }),
        overflow: 'hidden',
        ...(showPanel && {
          transition: theme.transitions.create(['width', 'min-width', 'border-right'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        }),
      }}
    >
      {(showPanel || isMobile) && (
        <>
          {!isMobile && (
            <IconButton
              onClick={onTogglePanel}
              sx={{
                position: 'absolute',
                top: 16,
                right: showPanel ? -18 : 'auto',
                left: showPanel ? 'auto' : 10,
                zIndex: 1300,
                background: 'white',
                border: '1px solid #e3e8ee',
                boxShadow: 2,
                '&:hover': { background: '#f5f5f5' },
                width: 36,
                height: 36,
                transition: theme.transitions.create(['right', 'left'], {
                  easing: theme.transitions.easing.sharp,
                  duration: theme.transitions.duration.enteringScreen,
                }),
              }}
            >
              {showPanel ? <ChevronLeftIcon /> : <ChevronRightIcon />}
            </IconButton>
          )}
          <Box sx={{ p: 2, borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: '#f8fafc', boxShadow: 1, flexShrink: 0 }}>
            <Typography variant="h6" fontWeight="bold" sx={{ color: '#1976d2', letterSpacing: 0.5 }}>Conversations</Typography>
            <Button variant="contained" size="small" onClick={onNewChat} sx={{ ml: 1, borderRadius: 2, textTransform: 'none', bgcolor: '#1976d2', color: 'white', boxShadow: 1, '&:hover': { bgcolor: '#125ea2' } }}>New</Button>
          </Box>
          <List sx={{ p: 1, flex: 1, overflowY: 'auto', bgcolor: '#f8fafc' }}>
            {threads.length === 0 && (
              <Typography variant="body2" color="textSecondary" sx={{ p: 2, textAlign: 'center' }}>No conversations yet.</Typography>
            )}
            {threads.map((thread) => (
              <ListItem
                key={thread.id}
                disablePadding
                selected={selectedThread?.id === thread.id}
                onClick={() => onSelectThread(thread)}
                sx={{
                  mb: 1,
                  borderRadius: 2,
                  bgcolor: selectedThread?.id === thread.id ? '#e3f2fd' : 'transparent',
                  boxShadow: selectedThread?.id === thread.id ? 2 : 'none',
                  transition: 'background 0.2s, box-shadow 0.2s',
                  '&:hover': { bgcolor: '#e3f2fd' },
                  cursor: 'pointer',
                  px: 1.5,
                }}
                secondaryAction={
                  <>
                    <IconButton 
                      edge="end" 
                      onClick={(e) => { e.stopPropagation(); handleMenuOpen(e, thread.id); }}
                      sx={{ color: 'grey.600' }}
                    >
                      <MoreVertIcon />
                    </IconButton>
                    <Menu
                      anchorEl={anchorEl}
                      open={Boolean(anchorEl) && menuThreadId === thread.id}
                      onClose={handleMenuClose}
                      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                      onClick={(e) => e.stopPropagation()} // Stop propagation at the menu level
                    >
                      <MenuItem
                        onClick={(e) => {
                          e.stopPropagation(); // Stop propagation to prevent thread selection
                          onDeleteThread(thread.id);
                          handleMenuClose();
                        }}
                        sx={{ color: 'error.main', display: 'flex', alignItems: 'center', gap: 1 }}
                      >
                        <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
                        Delete Conversation
                      </MenuItem>
                    </Menu>
                  </>
                }
              >
                <ListItemText
                  primary={<Typography sx={{ fontWeight: 500, color: '#222', fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {(() => {
                      const firstUserMsg = Array.isArray(thread.messages)
                        ? thread.messages.find(msg => msg.role === 'user' && msg.content)
                        : null;
                      const content = firstUserMsg ? firstUserMsg.content : '';
                      if (content) {
                        return content.length > 25 ? content.slice(0, 25) + '...' : content;
                      }
                      return thread.title || `Conversation ${thread.id}`;
                    })()}
                  </Typography>}
                  secondary={thread.created_at ? <Typography sx={{ fontSize: 12, color: '#607d8b', whiteSpace: 'nowrap' }}>{new Date(thread.created_at).toLocaleString()}</Typography> : ''}
                  sx={{ cursor: 'pointer', mr: 4 }}
                />
              </ListItem>
            ))}
          </List>
        </>
      )}
    </Paper>
  );
};

export default ThreadPanel;
