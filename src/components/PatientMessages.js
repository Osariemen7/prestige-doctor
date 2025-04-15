import React, { useState, useEffect, useRef } from 'react'; // Add useRef
import { Paper, Typography, List, ListItem, ListItemText, Divider, Box, CircularProgress, Drawer, Button, useMediaQuery, TextField, Select, MenuItem, FormControl, InputLabel, IconButton, Switch, FormControlLabel, Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import RefreshIcon from '@mui/icons-material/Refresh'; // Add RefreshIcon import
import Sidebar from '../components/sidebar';
import { useNavigate, useLocation } from 'react-router-dom'; // Add useLocation
import { getAccessToken } from './api'; // Add this import
import AskQuestionIcon from '@mui/icons-material/Psychology'; // Add this import

const PatientMessages = () => {
  const navigate = useNavigate();
  const { state } = useLocation(); // Get navigation state params
  const initialPatientId = state?.selectedPatientId;
  const initialPatientName = state?.patientName;

  const [sidebarMinimized, setSidebarMinimized] = useState(false);
  const handleNavigate = (path) => navigate(path);
  const handleToggleSidebar = (newState) => setSidebarMinimized(newState);

  // State for messages, selected thread, loading and bottom sheet
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedThread, setSelectedThread] = useState(null);
  const [isBottomSheetOpen, setBottomSheetOpen] = useState(false);
  
  // Check if mobile view (lg breakpoint is 1024px)
  const isMobile = useMediaQuery('(max-width:1024px)');

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [conversationId, setConversationId] = useState(''); // empty => new conversation
  const [datalist, setDataList] = useState([]); // Replace patients state with datalist
  const [selectedPatient, setSelectedPatient] = useState('');
  const [isNewConversation, setIsNewConversation] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('error');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hoveredMessageId, setHoveredMessageId] = useState(null);
  const [customSnippet, setCustomSnippet] = useState('');
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);

  const messageContainerRef = useRef(null);

  const scrollToBottom = () => {
    if (messageContainerRef.current) {
      messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
    }
  };

  // Add effect to scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [selectedThread, messages]);

  const showSnackbar = (message, severity = 'error') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const handleSnackbarClose = (event, reason) => {
    if (reason === 'clickaway') return;
    setSnackbarOpen(false);
  };

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const accessToken = await getAccessToken();
        if (!accessToken) {
          navigate('/');
          return;
        }

        const response = await fetch('https://health.prestigedelta.com/providermessages/', {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
        });

        if (response.status === 401) {
          navigate('/');
          return;
        }

        const data = await response.json();
        if (!Array.isArray(data)) {
          console.error('Fetched data is not an array:', data);
          setThreads([]);
        } else {
          setThreads(data);
          if(data.length > 0) {
            setSelectedThread(data[0]);
            setIsNewConversation(false);
          }
        }
      } catch (err) {
        console.error('Error fetching messages:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, [navigate]);

  useEffect(() => {
    const fetchData = async () => {
      const accessToken = await getAccessToken();
      if (!accessToken) return;

      try {
        const response = await fetch('https://health.prestigedelta.com/patientlist/', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            accept: 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
        });
        if (response.status === 401) {
          navigate('/');
        } else {
          const result = await response.json();
          setDataList(result);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  // Handle initial state if coming from patient details page
  useEffect(() => {
    if (state?.newConversation && initialPatientId) {
      setIsNewConversation(true);
      setSelectedPatient(initialPatientId);
      setSelectedThread(null);
      setMessages([]);
    }
  }, [state]);

  const generateTemplatePreview = () => {
    // Get doctor name from stored user info
    const userInfo = JSON.parse(localStorage.getItem('user-info') || '{}');
    const doctorName = userInfo?.user ? 
      `${userInfo.user.first_name} ${userInfo.user.last_name}`.trim() : 
      'Doctor';
      
    const patient = datalist.find(p => p.id === selectedPatient);
    const patientName = patient?.full_name || `Patient (${selectedPatient})`;
    
    // Otherwise use the template with the doctor's full name
    return `Hi ${patientName}, this is Dr. ${doctorName} reaching out to you. ${customSnippet} If you have any questions or need further assistance, feel free to respond. Best regards, Dr. ${doctorName}`;
  };

  const doSendMessage = async (messageText) => {
    // For display purposes only, use full template if it's a new conversation
    const displayMessage = messageText;

    // Set temporary message with display version
    if (selectedThread) {
      setSelectedThread(prev => ({
        ...prev,
        messages: [...prev.messages, {
          role: 'doctor',
          message_value: displayMessage,
          created: new Date().toISOString(),
          pending: true,
          temp_id: Date.now()
        }]
      }));
    } else {
      setMessages([{
        role: 'doctor',
        message_value: displayMessage,
        created: new Date().toISOString(),
        pending: true,
        temp_id: Date.now()
      }]);
    }

    setIsSending(true);

    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        throw new Error('Authentication failed');
      }

      // Always send as doctor
      const payload = {
        patient: selectedThread ? selectedThread.patient : selectedPatient,
        doctor_message: messageText,
        responder: 'doctor'
      };

      if (selectedThread) {
        payload.conversation_id = selectedThread.thread_id;
      }

      const response = await fetch('https://health.prestigedelta.com/providermessages/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = Array.isArray(errorData) 
          ? errorData[0]
          : (errorData.message || 'Failed to send message');
        throw new Error(errorMessage);
      }

      const data = await response.json();

      // Update with confirmed message
      const confirmedMessage = {
        role: 'doctor',
        message_value: messageText,
        created: new Date().toISOString(),
      };

      if (isNewConversation) {
        const newThread = {
          id: data.id,
          thread_id: data.thread_id,
          patient: selectedPatient,
          messages: [confirmedMessage],
          patient_name: datalist.find(p => p.id === selectedPatient)?.full_name
        };
        setThreads(prev => [newThread, ...prev]);
        setSelectedThread(newThread);
        setIsNewConversation(false);
        setConversationId(data.thread_id);
      } else {
        setSelectedThread(prev => ({
          ...prev,
          messages: prev.messages.filter(msg => !msg.pending)
            .concat([{ ...confirmedMessage, message_id: data.id }])
        }));
      }

      // Refresh threads
      const threadsResponse = await fetch('https://health.prestigedelta.com/providermessages/', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        }
      });
      if (threadsResponse.ok) {
        const updatedThreads = await threadsResponse.json();
        setThreads(updatedThreads);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = error.message || 'Failed to send message';
      showSnackbar(errorMessage);
      const errorDisplayMessage = {
        role: 'error',
        message_value: errorMessage,
        created: new Date().toISOString()
      };
      if (selectedThread) {
        setSelectedThread(prev => ({
          ...prev,
          messages: prev.messages.map(msg => 
            msg.pending ? errorDisplayMessage : msg
          )
        }));
      } else {
        setMessages(prev => prev.map(msg => 
          msg.pending ? errorDisplayMessage : msg
        ));
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleSendMessage = async () => {
    if (isNewConversation) {
      if (!selectedPatient) {
        showSnackbar('Please select a patient first');
        return;
      }
      if (!newMessage.trim()) {
        showSnackbar('Please enter a message');
        return;
      }
      setPreviewDialogOpen(true);
      return;
    }
    const messageText = newMessage;
    setNewMessage('');
    doSendMessage(messageText);
  };

  const handleConfirmPreview = () => {
    setPreviewDialogOpen(false);
    const messageText = newMessage;
    setNewMessage('');
    doSendMessage(messageText);
  };

  const handleCancelPreview = () => {
    setPreviewDialogOpen(false);
  };

  const handleThreadSelect = (thread) => {
    setSelectedThread(thread);
    setIsNewConversation(false);
    if(isMobile) setBottomSheetOpen(false);
  };

  const handleNewConversation = () => {
    setSelectedThread(null);
    setIsNewConversation(true);
    setSelectedPatient('');
    setMessages([]);
    if(isMobile) setBottomSheetOpen(false);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) return;

      const response = await fetch('https://health.prestigedelta.com/providermessages/', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setThreads(data);
        // Update selected thread if it exists
        if (selectedThread) {
          const updatedThread = data.find(t => t.thread_id === selectedThread.thread_id);
          if (updatedThread) {
            setSelectedThread(updatedThread);
          }
        }
        showSnackbar('Messages refreshed', 'success');
      }
    } catch (error) {
      console.error('Error refreshing messages:', error);
      showSnackbar('Failed to refresh messages', 'error');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleAskAI = (threadId, patientId, perplexityThread) => {
    navigate('/ask', {
      state: {
        initialQuery: "Please advise on how best to manage the patient?",
        selectedPatientId: patientId,
        threadId: threadId,
        perplexityThread: perplexityThread
      }
    });
  };

  const getLastMessageTime = (thread) => {
    if (!thread.messages || thread.messages.length === 0) return '';
    const lastMessage = thread.messages[thread.messages.length - 1];
    return new Date(lastMessage.created).toLocaleString();
  };

  const renderConversationList = () => (
    <Paper 
      sx={{ 
        width: isMobile ? '100%' : '300px',
        height: 'calc(100vh - 2rem)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      {/* Header section */}
      <Box 
        sx={{ 
          p: 2,
          borderBottom: '1px solid rgba(0,0,0,0.12)',
          backgroundColor: 'white',
        }}
      >
        <Button
          variant="contained"
          color="primary"
          onClick={handleNewConversation}
          sx={{ width: '100%', mb: 2 }}
        >
          New Conversation
        </Button>
        
        <Typography variant="h6">
          Conversations
        </Typography>
      </Box>

      {/* Scrollable list section */}
      <Box 
        sx={{ 
          overflowY: 'auto',
          flex: 1,
          p: 2
        }}
      >
        {threads.length === 0 && !isNewConversation ? (
          <Box sx={{ textAlign: 'center', mt: 4 }}>
            <Typography variant="body1" color="text.secondary">
              No conversations available.
            </Typography>
          </Box>
        ) : (
          <List>
            {threads.map((thread) => (
              <ListItem 
                key={thread.id} 
                button 
                selected={selectedThread && selectedThread.id === thread.id}
                onClick={() => handleThreadSelect(thread)}
              >
                <ListItemText 
                  primary={
                    <Typography
                      component="div"
                      variant="subtitle1"
                      sx={{ 
                        fontWeight: 500,
                        color: '#1976d2'
                      }}
                    >
                      {thread.patient_name || `Patient (${thread.patient})`}
                    </Typography>
                  }
                  secondary={
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: 'block', mt: 0.5 }}
                    >
                      {getLastMessageTime(thread)}
                    </Typography>
                  }
                />
              </ListItem>
            ))}
          </List>
        )}
      </Box>
    </Paper>
  );

  const renderInputBox = () => (
    <Box
      sx={{
        width: '100%',
        maxWidth: '700px',
        borderRadius: '24px',
        boxShadow: '0px 2px 10px rgba(0,0,0,0.1)',
        backgroundColor: 'white',
        padding: '8px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {isNewConversation ? (
            <>
              <TextField
                fullWidth
                placeholder="Enter custom snippet for message..."
                variant="standard"
                multiline
                minRows={1}
                maxRows={4}
                InputProps={{
                  disableUnderline: true,
                  style: { fontSize: '16px' }
                }}
                sx={{ marginBottom: '8px' }}
                value={customSnippet}
                onChange={(e) => setCustomSnippet(e.target.value)}
                disabled={isSending}
              />
              <IconButton 
                color="primary" 
                onClick={handleSendMessage} 
                disabled={!customSnippet.trim() || isSending}
              >
                {isSending ? (
                  <CircularProgress size={24} />
                ) : (
                  <SendIcon />
                )}
              </IconButton>
            </>
          ) : (
            <>
              <TextField
                fullWidth
                placeholder="Type your message here..."
                variant="standard"
                multiline
                minRows={1}
                maxRows={4}
                InputProps={{
                  disableUnderline: true,
                  style: { fontSize: '16px' },
                  maxLength: isNewConversation ? 150 : undefined,
                }}
                inputProps={{
                  maxLength: isNewConversation ? 150 : undefined,
                }}
                sx={{ marginBottom: '8px' }}
                value={newMessage}
                onChange={(e) => {
                  if (isNewConversation && e.target.value.length <= 150) {
                    setNewMessage(e.target.value);
                  } else if (!isNewConversation) {
                    setNewMessage(e.target.value);
                  }
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                disabled={isSending}
              />
              <IconButton 
                color="primary" 
                onClick={handleSendMessage} 
                disabled={(!newMessage.trim()) || (isNewConversation && !selectedPatient) || (isNewConversation && newMessage.length > 150) || isSending}
              >
                {isSending ? (
                  <CircularProgress size={24} />
                ) : (
                  <SendIcon />
                )}
              </IconButton>
            </>
          )}
        </Box>
        {isNewConversation && (
          <>
            <Typography variant="caption" sx={{ mt: 1, alignSelf: 'flex-start' }}>
              Preview:
            </Typography>
            <Paper sx={{ p: 1, backgroundColor: '#f5f5f5' }}>
              <Typography variant="body2">
                {generateTemplatePreview()}
              </Typography>
            </Paper>
          </>
        )}
        {isNewConversation && (
          <Typography 
            variant="caption" 
            color={newMessage.length > 150 ? "error" : "textSecondary"}
            sx={{ alignSelf: 'flex-end', mr: 6 }}
          >
            {newMessage.length}/150 characters
          </Typography>
        )}
      </Box>
      
      {/* Bottom Row: Controls */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        gap: '10px' 
      }}>
        {/* Patient dropdown (only for new conversations) */}
        {isNewConversation ? (
          <FormControl variant="standard">
            <Select
              value={selectedPatient || ""}
              onChange={(e) => setSelectedPatient(e.target.value)}
              displayEmpty
              renderValue={(selected) =>
                selected
                  ? (datalist.find((p) => p.id === selected)?.full_name || `Patient (${selected})`)
                  : 'Choose Patient'
              }
              sx={{
                fontSize: '14px',
                backgroundColor: '#1E90FF',
                color: 'white',
                borderRadius: '4px',
                padding: '4px 12px',
                '& .MuiSelect-icon': { color: 'white' },
                '&:hover': { backgroundColor: '#187bcd' },
              }}
            >
              <MenuItem value="">
                <em>Choose Patient</em>
              </MenuItem>
              {datalist.map((patient) => (
                <MenuItem key={patient.id} value={patient.id}>
                  {patient.full_name
                    ? `${patient.full_name} (${patient.id})`
                    : `Patient (${patient.id})`}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        ) : (
          // If not a new conversation and a doctor message exists, show the Ask button
          selectedThread &&
          selectedThread.messages.some(msg => msg.role === 'doctor') && (
            <Button
              variant="contained"
              color="primary"
              onClick={() => handleAskAI(selectedThread.thread_id, selectedThread.patient, selectedThread.perplexity_thread)}
            >
              Ask Dr House AI
            </Button>
          )
        )}
      </Box>
    </Box>
  );

  const getMessageStyle = (role) => {
    switch (role) {
      case 'user':
        return {
          justifyContent: 'flex-start',
          backgroundColor: '#f0f0f0',  // Light gray for patient
          borderRadius: '20px 20px 20px 4px'
        };
      case 'assistant':
        return {
          justifyContent: 'flex-end',
          backgroundColor: '#e3f2fd', // Light blue for AI
          borderRadius: '20px 4px 20px 20px'
        };
      case 'doctor':
        return {
          justifyContent: 'flex-end',
          backgroundColor: '#e8f5e9', // Light green for doctor
          borderRadius: '20px 4px 20px 20px'
        };
      case 'error':
        return {
          justifyContent: 'center',
          backgroundColor: '#ffebee', // Light red for errors
          borderRadius: '20px',
          color: '#c62828'
        };
      default:
        return {};
    }
  };

  const getRoleName = (role) => {
    switch (role) {
      case 'user': return 'Patient';
      case 'assistant': return 'AI Assistant';
      case 'doctor': return 'Doctor';
      case 'error': return 'Error';
      default: return role;
    }
  };

  const renderMessage = (msg, thread) => (
    <Box
      key={msg.message_id || msg.temp_id}
      sx={{
        display: 'flex',
        justifyContent: getMessageStyle(msg.role).justifyContent,
        width: '100%',
        my: 1,
        position: 'relative'
      }}
      onMouseEnter={() => setHoveredMessageId(msg.message_id)}
      onMouseLeave={() => setHoveredMessageId(null)}
    >
      <Box
        sx={{
          maxWidth: '80%',
          padding: '12px 16px',
          borderRadius: getMessageStyle(msg.role).borderRadius,
          backgroundColor: getMessageStyle(msg.role).backgroundColor,
          color: getMessageStyle(msg.role).color || 'text.primary',
          boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
          opacity: msg.pending ? 0.7 : 1,
          position: 'relative'
        }}
      >
        <Typography variant="caption" sx={{ /* ...existing styles... */ }}>
          {getRoleName(msg.role)}
        </Typography>
        {msg.image && (
          <Box sx={{ mt: 1, mb: 1, textAlign: 'center' }}>
            <img
              src={msg.image}
              alt="Attached"
              style={{
                maxWidth: '220px',
                maxHeight: '180px',
                borderRadius: 8,
                display: 'inline-block',
                boxShadow: '0 1px 4px rgba(0,0,0,0.08)'
              }}
            />
          </Box>
        )}
        <Typography variant="body1">
          {msg.message_value}
        </Typography>
        <Typography variant="caption" sx={{ /* ...existing styles... */ }}>
          {new Date(msg.created).toLocaleTimeString()}
        </Typography>
      </Box>
    </Box>
  );

  const renderConversationDetail = () => (
    <Paper sx={{ 
      flex: 1, 
      height: 'calc(100vh - 2rem)',
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      width: isMobile ? '100%' : 'auto'
    }}>
      {selectedThread || isNewConversation ? (
        <>
          <Box 
            sx={{ 
              position: 'sticky',
              top: 0,
              bgcolor: 'background.paper',
              zIndex: 1,
              p: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid rgba(0,0,0,0.12)'
            }}
          >
            {selectedThread && (
              <Typography variant="h5" sx={{ color: '#1976d2', fontWeight: 500 }}>
                {selectedThread.patient_name || `Patient (${selectedThread.patient})`}
              </Typography>
            )}
            <IconButton 
              onClick={handleRefresh} 
              disabled={isRefreshing}
              sx={{ ml: 'auto' }}
            >
              <RefreshIcon 
                sx={{ 
                  animation: isRefreshing ? 'spin 1s linear infinite' : 'none',
                  '@keyframes spin': {
                    '0%': { transform: 'rotate(0deg)' },
                    '100%': { transform: 'rotate(360deg)' },
                  }
                }} 
              />
            </IconButton>
          </Box>
          {/* Scrollable content area with ref */}
          <Box 
            ref={messageContainerRef}
            sx={{ 
              flex: 1,
              overflowY: 'auto',
              p: { xs: 2, lg: 4 },
              mb: '180px', // Increased bottom margin to ensure last message is visible
              scrollBehavior: 'smooth', // Add smooth scrolling
            }}
          >
            {/* Messages */}
            <Box sx={{ 
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}>
              {/* Show either thread messages or new conversation messages */}
              {((selectedThread && Array.isArray(selectedThread.messages)) ? selectedThread.messages : Array.isArray(messages) ? messages : []).map((msg) => 
                renderMessage(msg, selectedThread)
              )}
            </Box>
          </Box>

          {/* Fixed input box at bottom */}
          <Box sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            bgcolor: 'background.paper',
            borderTop: '1px solid rgba(0,0,0,0.12)',
            p: 2,
            maxHeight: '170px', // Fixed height for input box
            zIndex: 1,
          }}>
            {renderInputBox()}
          </Box>
        </>
      ) : (
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Typography variant="h6" color="text.secondary">
            No messages to display.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Please select a conversation.
          </Typography>
        </Box>
      )}
    </Paper>
  );

  const renderDesktopLayout = () => (
    <div className="flex flex-col lg:flex-row gap-4">
      {renderConversationList()}
      <div className="flex-1">
        {renderConversationDetail()}
      </div>
    </div>
  );

  return (
    <div className="flex">
      <Sidebar onNavigate={handleNavigate} onLogout={() => {}} onToggleSidebar={handleToggleSidebar} />
      <div style={{ marginLeft: isMobile ? '0' : (sidebarMinimized ? '4rem' : '16rem') }} className="flex-1 p-4 transition-all duration-300">
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {isMobile ? (
              <>
                {/* On Mobile, add a button to open the bottom sheet conversation list */}
                <Box sx={{ mb: 2, textAlign: 'center' }}>
                  <Button variant="contained" onClick={() => setBottomSheetOpen(true)}>
                    Show Conversations
                  </Button>
                </Box>
                {renderConversationDetail()}
                <Drawer 
                  anchor="bottom" 
                  open={isBottomSheetOpen} 
                  onClose={() => setBottomSheetOpen(false)}
                  PaperProps={{ sx: { height: '50vh' } }}
                >
                  {renderConversationList()}
                </Drawer>
              </>
            ) : (
              renderDesktopLayout()
            )}
          </>
        )}
      </div>
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleSnackbarClose} 
          severity={snackbarSeverity}
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
      <Dialog 
        open={previewDialogOpen} 
        onClose={handleCancelPreview}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white' }}>
          Message Preview
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <DialogContentText sx={{ mb: 2 }}>
            Message as seen by the Patient:
          </DialogContentText>
          <Paper sx={{ p: 2, bgcolor: '#f5f5f5', mb: 3 }}>
            <Typography variant="body2" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
              {`Hi ${selectedThread?.patient_name || datalist.find(p => p.id === selectedPatient)?.full_name || 'Patient'}, this is Dr. ${JSON.parse(localStorage.getItem('user-info') || '{}')?.user?.first_name || ''} ${JSON.parse(localStorage.getItem('user-info') || '{}')?.user?.last_name || ''} reaching out to you. ${newMessage || customSnippet} If you have any questions or need further assistance, feel free to respond. Best regards, Dr. ${JSON.parse(localStorage.getItem('user-info') || '{}')?.user?.last_name || ''}`}
            </Typography>
          </Paper>
          
          <DialogContentText sx={{ mb: 2 }}>
            Your message that will be sent:
          </DialogContentText>
          <Paper sx={{ p: 2, bgcolor: '#e3f2fd' }}>
            <Typography variant="body1">
              {newMessage || customSnippet}
            </Typography>
          </Paper>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCancelPreview} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleConfirmPreview} variant="contained" color="primary">
            Send Message
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default PatientMessages;