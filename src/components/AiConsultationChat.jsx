import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Badge,
  Drawer,
  Button,
  Fab,
  Collapse,
  Avatar,
  Divider,
  CircularProgress,
  Alert,
  TextField,
  InputAdornment,
  LinearProgress,
  Chip,
  useTheme,
  useMediaQuery,
  alpha,
  Slide,
} from '@mui/material';
import {
  SmartToy as AiIcon,
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  DragIndicator as DragIcon,
  Circle as CircleIcon,
  AttachFile as AttachFileIcon,
  Send as SendIcon,
  Delete as DeleteIcon,
  Description as FileIcon,
  Image as ImageIcon,
} from '@mui/icons-material';
import { getAccessToken } from '../api';

// SSE parser helper
function parseSSEText(sseText, onChunk) {
  const events = sseText.split('\n\n');
  events.forEach(ev => {
    const line = ev.trim();
    if (!line) return;
    const dataLines = line.split('\n').filter(l => l.startsWith('data:'));
    if (!dataLines.length) return;
    const dataString = dataLines.map(l => l.replace(/^data:\s*/, '')).join('\n');
    try {
      const parsed = JSON.parse(dataString);
      onChunk(parsed);
    } catch (e) {
      console.warn('SSE parsing error', e, dataString);
    }
  });
}

const AiConsultationChat = ({ reviewPublicId, enabled = false, requireExistingThread = false, patientId }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(!requireExistingThread);
  const [messages, setMessages] = useState([]);
  const [threadData, setThreadData] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [position, setPosition] = useState({ x: 20, y: 20 }); // For desktop dragging
  const [isDragging, setIsDragging] = useState(false);
  
  // Input state
  const [inputText, setInputText] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const fileInputRef = useRef(null);

  const pollingIntervalRef = useRef(null);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const lastMessageCountRef = useRef(0);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const containerRef = useRef(null);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const [isAtBottom, setIsAtBottom] = useState(false);

  const handleScroll = useCallback((e) => {
    const el = e?.target || messagesContainerRef.current;
    if (!el) return;
    const threshold = 40; // px from bottom to consider as bottom
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;
    setIsAtBottom(atBottom);
    if (atBottom) {
      // Mark messages as read when scrolled to bottom
      setUnreadCount(0);
    }
  }, []);

  // Fetch thread data
  const fetchThreadData = useCallback(async () => {
    if (!reviewPublicId || !enabled) return;

    try {
      const token = await getAccessToken();
      const response = await fetch(
        `https://service.prestigedelta.com/medical-reviews/${reviewPublicId}/doctor-thread/`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          // Thread doesn't exist yet
          if (requireExistingThread) {
            setIsVisible(false);
            // Stop polling if we require an existing thread and didn't find one
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
          }
          return;
        }
        throw new Error('Failed to fetch thread data');
      }

      const data = await response.json();
      
      // Check visibility logic based on thread existence and messages
      if (requireExistingThread) {
        const hasMessages = data.messages && data.messages.length > 0;
        if (hasMessages) {
          setIsVisible(true);
        } else {
          setIsVisible(false);
          // Stop polling if we require an existing thread with messages and didn't find one
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          return;
        }
      } else {
        // If not requiring existing thread (e.g. just uploaded), always show
        setIsVisible(true);
      }

      setThreadData(data.thread);
      setMessages(data.messages || []);
      
      // Check for new messages
      const newMessageCount = data.message_count || 0;
      if (lastMessageCountRef.current > 0 && newMessageCount > lastMessageCountRef.current) {
        const newMessages = newMessageCount - lastMessageCountRef.current;
        // Do not auto-scroll; always mark as unread until user reads (scrolls down or clicks jump)
        setUnreadCount(prev => prev + newMessages);
      }
      lastMessageCountRef.current = newMessageCount;
      
      setError(null);
    } catch (err) {
      console.error('Error fetching thread data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [reviewPublicId, enabled, isExpanded, requireExistingThread]);

  // Start polling
  useEffect(() => {
    if (!enabled || !reviewPublicId) return;

    // Reset visibility state when props change
    if (requireExistingThread) {
      setIsVisible(false);
    } else {
      setIsVisible(true);
    }

    // Initial fetch
    setLoading(true);
    fetchThreadData();

    // Set up polling interval (7 seconds)
    // Clear any existing interval first
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    
    pollingIntervalRef.current = setInterval(() => {
      fetchThreadData();
    }, 7000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [enabled, reviewPublicId, requireExistingThread, fetchThreadData]);

  // Ensure we have scroll handler attached when expanded and element exists
  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [isExpanded, handleScroll]);

  // Handle dragging for desktop
  const handleMouseDown = (e) => {
    if (isMobile) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };

  const handleMouseMove = useCallback((e) => {
    if (!isDragging || isMobile) return;
    
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    const newX = e.clientX - dragStartRef.current.x;
    const newY = e.clientY - dragStartRef.current.y;
    
    // Constrain to keep entire window visible
    const windowWidth = 400;
    const windowHeight = 600;
    
    setPosition({
      x: Math.max(0, Math.min(newX, vw - windowWidth)),
      y: Math.max(0, Math.min(newY, vh - windowHeight - 50)), // Extra 50px buffer for taskbar
    });
  }, [isDragging, isMobile]);

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove]);

  // File upload handler
  const uploadFile = async (file) => {
    const token = await getAccessToken();
    const formData = new FormData();
    formData.append('file', file);
    
    const ext = file.name.split('.').pop() || '';
    formData.append('file_extension', ext);
    
    // Determine file category
    let category = 'document';
    if (file.type.startsWith('image/')) category = 'image';
    else if (file.type.startsWith('audio/')) category = 'audio';
    else if (file.type.startsWith('video/')) category = 'video';
    formData.append('file_category', category);

    const resp = await fetch('https://service.prestigedelta.com/ai-processing/upload-file/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData,
    });

    if (!resp.ok) {
      throw new Error('File upload failed: ' + await resp.text());
    }
    const data = await resp.json();
    if (!data.success) throw new Error('Upload failed: ' + (data.error || JSON.stringify(data)));
    return data; // contains s3_url and google_file_id
  };

  // SSE streaming handler
  const startAgentStream = async ({ publicId, query, googleFileIds }) => {
    const token = await getAccessToken();
    const payload = {
      public_id: publicId,
      query,
      google_file_ids: googleFileIds || [],
      planner_role: 'doctor_copilot',
      store_conversation: true
    };

    const res = await fetch('https://service.prestigedelta.com/health-diary/agent-process-stream/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error('SSE start failed: ' + res.status);
    if (!res.body) throw new Error('Readable stream not available');

    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        if (buffer.indexOf('\n\n') !== -1) {
          const events = buffer.split(/\n\n/);
          for (let i = 0; i < events.length - 1; i++) {
            const ev = events[i];
            parseSSEText(ev, handleSSEChunk);
          }
          buffer = events[events.length - 1];
        }
      }
      // Flush remaining buffer
      if (buffer) {
        parseSSEText(buffer, handleSSEChunk);
      }
    } catch (err) {
      console.error('SSE stream error', err);
      throw err;
    }
  };

  // Handle individual SSE chunks
  const handleSSEChunk = (chunk) => {
    switch (chunk.type) {
      case 'thread_info':
        console.log('Thread info:', chunk);
        break;
      case 'synthesis_text':
      case 'synthesis_chunk':
        setStreamingContent(prev => prev + (chunk.content || chunk.accumulated_text || ''));
        break;
      case 'complete':
        // Stream complete - refresh messages from server
        setStreamingContent('');
        fetchThreadData();
        break;
      case 'error':
        setError('Stream processing error: ' + chunk.error);
        setStreamingContent('');
        setIsSending(false);
        break;
      default:
        console.log('Unhandled SSE chunk', chunk);
    }
  };

  // Handle file selection
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  // Remove selected file
  const handleRemoveFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Send message
  const handleSendMessage = async () => {
    if (!inputText.trim() && selectedFiles.length === 0) return;
    if (!threadData?.public_id) {
      setError('Thread not available');
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      // Upload files first if any
      const uploadedFileIds = [];
      for (const file of selectedFiles) {
        const result = await uploadFile(file);
        if (result.google_file_id) {
          uploadedFileIds.push(result.google_file_id);
        }
      }

      // Start streaming
      await startAgentStream({
        publicId: threadData.public_id,
        query: inputText.trim(),
        googleFileIds: uploadedFileIds
      });

      // Clear input
      setInputText('');
      setSelectedFiles([]);
    } catch (err) {
      console.error('Send message error:', err);
      setError(err.message || 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Don't render if not enabled or not visible
  if (!enabled || !reviewPublicId || !isVisible) return null;

  // Format timestamp
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  // Render message
  const renderMessage = (message) => {
    const isAi = message.role === 'assistant' && !message.from_doctor;
    const isDoctor = message.from_doctor;
    const fromMe = message.role === 'user'; // Fixed context: in AiConsultationChat (Patient View or Doctor View?)
    
    // In this component, usually user (Doctor/Patient) is on the right, AI/Other on the left
    const onRight = fromMe;
    
    return (
      <Box
        key={message.id || message.message_id}
        sx={{
          display: 'flex',
          justifyContent: onRight ? 'flex-end' : 'flex-start',
          mb: 2,
        }}
      >
        <Box
          sx={{
            maxWidth: '75%',
            display: 'flex',
            flexDirection: onRight ? 'row-reverse' : 'row',
            gap: 1,
          }}
        >
          <Avatar
            sx={{
              width: 32,
              height: 32,
              bgcolor: isAi ? 'primary.main' : isDoctor ? 'primary.dark' : 'grey.400',
              fontSize: 16
            }}
          >
            {isAi ? <AiIcon sx={{ fontSize: 18 }} /> : isDoctor ? 'D' : 'P'}
          </Avatar>
          <Box>
            <Paper
              elevation={0}
              sx={{
                p: 1.5,
                bgcolor: isAi 
                  ? alpha(theme.palette.primary.main, 0.08) 
                  : isDoctor 
                    ? theme.palette.primary.main 
                    : 'grey.100',
                color: isDoctor ? 'white' : 'inherit',
                borderRadius: 2,
                border: '1px solid',
                borderColor: isAi ? alpha(theme.palette.primary.main, 0.2) : isDoctor ? 'transparent' : 'grey.300',
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  fontWeight: isDoctor ? 500 : 400
                }}
              >
                {message.message || message.message_value}
              </Typography>
            </Paper>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mt: 0.5, px: 1, display: 'block', textAlign: onRight ? 'right' : 'left' }}
            >
              {(isDoctor ? 'Doctor • ' : isAi ? 'AI • ' : 'Patient • ') + formatTime(message.created)}
            </Typography>
          </Box>
        </Box>
      </Box>
    );
  };

  // Render streaming message (not yet persisted)
  const renderStreamingMessage = () => {
    if (!streamingContent) return null;
    
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'flex-start',
          mb: 2,
        }}
      >
        <Box
          sx={{
            maxWidth: '75%',
            display: 'flex',
            gap: 1,
          }}
        >
          <Avatar
            sx={{
              width: 32,
              height: 32,
              bgcolor: 'primary.main',
            }}
          >
            <AiIcon sx={{ fontSize: 18 }} />
          </Avatar>
          <Box sx={{ width: '100%' }}>
            <Paper
              elevation={0}
              sx={{
                p: 1.5,
                bgcolor: alpha(theme.palette.primary.main, 0.08),
                borderRadius: 2,
                border: '1px solid',
                borderColor: alpha(theme.palette.primary.main, 0.2),
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {streamingContent}
              </Typography>
            </Paper>
            <Box sx={{ mt: 0.5, px: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <CircularProgress size={10} />
              <Typography variant="caption" color="text.secondary">
                AI is responding...
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>
    );
  };

  // Render input area
  const renderInputArea = () => {
    return (
      <Box
        sx={{
          p: 2,
          borderTop: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        {isSending && <LinearProgress sx={{ mb: 1 }} />}
        
        {/* File chips */}
        {selectedFiles.length > 0 && (
          <Box sx={{ mb: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {selectedFiles.map((file, index) => (
              <Chip
                key={index}
                size="small"
                icon={file.type.startsWith('image/') ? <ImageIcon /> : <FileIcon />}
                label={file.name.length > 20 ? file.name.substring(0, 20) + '...' : file.name}
                onDelete={() => handleRemoveFile(index)}
                deleteIcon={<DeleteIcon />}
              />
            ))}
          </Box>
        )}

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,audio/*,video/*,.pdf,.doc,.docx"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />
          <IconButton
            size="small"
            onClick={() => fileInputRef.current?.click()}
            disabled={isSending}
            sx={{ mb: 0.5 }}
          >
            <AttachFileIcon />
          </IconButton>
          
          <TextField
            fullWidth
            multiline
            maxRows={3}
            size="small"
            placeholder="Type your message..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isSending}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
              }
            }}
          />
          
          <IconButton
            color="primary"
            onClick={handleSendMessage}
            disabled={isSending || (!inputText.trim() && selectedFiles.length === 0)}
            sx={{
              mb: 0.5,
              bgcolor: 'primary.main',
              color: 'white',
              '&:hover': {
                bgcolor: 'primary.dark',
              },
              '&.Mui-disabled': {
                bgcolor: 'grey.300',
              }
            }}
          >
            <SendIcon />
          </IconButton>
        </Box>
      </Box>
    );
  };

  // Collapsed button/indicator
  const CollapsedIndicator = () => (
    <Badge
      badgeContent={unreadCount}
      color="error"
      overlap="circular"
      sx={{
        '& .MuiBadge-badge': {
          animation: unreadCount > 0 ? 'pulse 2s infinite' : 'none',
          '@keyframes pulse': {
            '0%': { transform: 'scale(1)' },
            '50%': { transform: 'scale(1.1)' },
            '100%': { transform: 'scale(1)' },
          },
        },
      }}
    >
      <Fab
        color="primary"
        onClick={() => setIsExpanded(true)}
        sx={{
          background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
          boxShadow: 4,
          '&:hover': {
            boxShadow: 6,
          },
        }}
      >
        <AiIcon />
      </Fab>
    </Badge>
  );

  // Mobile: Bottom sheet
  if (isMobile) {
    return (
      <>
        {!isExpanded && (
          <Box
            sx={{
              position: 'fixed',
              bottom: 16,
              right: 16,
              zIndex: 1300,
            }}
          >
            <CollapsedIndicator />
          </Box>
        )}

        <Drawer
          anchor="bottom"
          open={isExpanded}
          onClose={() => setIsExpanded(false)}
          PaperProps={{
            sx: {
              borderRadius: '20px 20px 0 0',
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
            },
          }}
        >
          {/* Header */}
          <Box
            sx={{
              p: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Avatar
                sx={{
                  width: 36,
                  height: 36,
                  bgcolor: 'primary.main',
                }}
              >
                <AiIcon />
              </Avatar>
              <Box>
                <Typography variant="subtitle1" fontWeight={600}>
                  AI Consultation
                </Typography>
                {threadData && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <CircleIcon sx={{ fontSize: 8, color: 'success.main' }} />
                    <Typography variant="caption" color="text.secondary">
                      Active
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
            <Box>
              {patientId && (
                <IconButton 
                  onClick={() => navigate(`/patient/${patientId}/media`)} 
                  size="small" 
                  sx={{ mr: 1 }}
                  title="View Patient Media"
                >
                  <ImageIcon />
                </IconButton>
              )}
              <IconButton onClick={() => setIsExpanded(false)} size="small">
                <CloseIcon />
              </IconButton>
            </Box>
          </Box>

          {/* Messages */}
          <Box
            ref={messagesContainerRef}
            onScroll={handleScroll}
            sx={{
              flex: 1,
              overflow: 'auto',
              p: 2,
              bgcolor: 'grey.50',
            }}
          >
            {loading && messages.length === 0 ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : error ? (
              <Alert severity="error">{error}</Alert>
            ) : messages.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <AiIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
                <Typography variant="body2" color="text.secondary">
                  AI is analyzing your recording...
                </Typography>
              </Box>
            ) : (
              <>
                {messages.map(renderMessage)}
                {renderStreamingMessage()}
                <div ref={messagesEndRef} />
                {unreadCount > 0 && (
                  <Box sx={{ position: 'sticky', bottom: 8, display: 'flex', justifyContent: 'center' }}>
                    <Button variant="contained" size="small" onClick={() => { scrollToBottom(); setUnreadCount(0); }}>
                      {unreadCount} new message{unreadCount !== 1 ? 's' : ''} — Jump to latest
                    </Button>
                  </Box>
                )}
              </>
            )}
          </Box>

          {/* Input Area */}
          {renderInputArea()}
        </Drawer>
      </>
    );
  }

  // Desktop: Draggable floating window
  return (
    <>
      {!isExpanded && (
        <Box
          sx={{
            position: 'fixed',
            bottom: 20,
            right: 20,
            zIndex: 1300,
          }}
        >
          <CollapsedIndicator />
        </Box>
      )}

      {isExpanded && (
        <Paper
          ref={containerRef}
          elevation={8}
          sx={{
            position: 'fixed',
            left: position.x,
            top: position.y,
            width: 400,
            maxHeight: 480,
            display: 'flex',
            flexDirection: 'column',
            zIndex: 1300,
            borderRadius: 3,
            overflow: 'hidden',
            cursor: isDragging ? 'grabbing' : 'default',
          }}
        >
          {/* Header - Draggable */}
          <Box
            onMouseDown={handleMouseDown}
            sx={{
              p: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              color: 'white',
              cursor: 'grab',
              '&:active': {
                cursor: 'grabbing',
              },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <DragIcon sx={{ fontSize: 18, opacity: 0.7 }} />
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  bgcolor: 'white',
                  color: 'primary.main',
                }}
              >
                <AiIcon />
              </Avatar>
              <Box>
                <Typography variant="subtitle2" fontWeight={600}>
                  AI Consultation
                </Typography>
                {threadData && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <CircleIcon sx={{ fontSize: 6, color: '#10b981' }} />
                    <Typography variant="caption" sx={{ opacity: 0.9 }}>
                      Active
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
            <Box>
              {patientId && (
                <IconButton 
                  onClick={() => navigate(`/patient/${patientId}/media`)} 
                  size="small" 
                  sx={{ color: 'white', mr: 1 }}
                  title="View Patient Media"
                >
                  <ImageIcon />
                </IconButton>
              )}
              <IconButton
                onClick={() => setIsExpanded(false)}
                size="small"
                sx={{ color: 'white' }}
              >
                <CloseIcon />
              </IconButton>
            </Box>
          </Box>

          {/* Messages */}
          <Box
            ref={messagesContainerRef}
            onScroll={handleScroll}
            sx={{
              flex: 1,
              overflow: 'auto',
              p: 2,
              bgcolor: 'grey.50',
            }}
          >
            {loading && messages.length === 0 ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : error ? (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            ) : messages.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <AiIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
                <Typography variant="body2" color="text.secondary">
                  AI is analyzing your recording...
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  This may take a few moments
                </Typography>
              </Box>
            ) : (
              <>
                {messages.map(renderMessage)}
                {renderStreamingMessage()}
                <div ref={messagesEndRef} />
                {unreadCount > 0 && (
                  <Box sx={{ position: 'sticky', bottom: 8, display: 'flex', justifyContent: 'center' }}>
                    <Button variant="contained" size="small" onClick={() => { scrollToBottom(); setUnreadCount(0); }}>
                      {unreadCount} new message{unreadCount !== 1 ? 's' : ''} — Jump to latest
                    </Button>
                  </Box>
                )}
              </>
            )}
          </Box>

          {/* Input Area */}
          {renderInputArea()}
        </Paper>
      )}
    </>
  );
};

export default AiConsultationChat;
