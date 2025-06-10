import React, { useState, useEffect, useRef } from 'react'; // Add useRef
import { Paper, Typography, List, ListItem, ListItemText, Divider, Box, CircularProgress, Drawer, Button, useMediaQuery, TextField, Select, MenuItem, FormControl, InputLabel, IconButton, Switch, FormControlLabel, Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import RefreshIcon from '@mui/icons-material/Refresh'; // Add RefreshIcon import
import AttachFileIcon from '@mui/icons-material/AttachFile'; // Add AttachFileIcon for image uploads
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import DownloadIcon from '@mui/icons-material/Download';
import Sidebar from '../components/sidebar';
import { useNavigate, useLocation } from 'react-router-dom'; // Add useLocation
import { getAccessToken } from './api'; // Add this import
import AskQuestionIcon from '@mui/icons-material/Psychology'; // Add this import
import PersonIcon from '@mui/icons-material/Person';
import PatientProfile from './write.jsx'; // Import consultation component

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
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [messages, setMessages] = useState([]); // Add messages state for new conversations
  const [expandedImage, setExpandedImage] = useState(null);
  // Add consultation mode states
  const [isConsultationMode, setIsConsultationMode] = useState(false);
  const [isDocumentationSaved, setIsDocumentationSaved] = useState(false);
  const patientProfileRef = useRef(null);

  const messageContainerRef = useRef(null);
  const fileInputRef = useRef(null);
  const messageInputRef = useRef(null);

  // Add state for per-thread input
  const [threadInputState, setThreadInputState] = useState({});
  const prevThreadKeyRef = useRef();

  // Helper to get thread key (thread_id for existing, patient id for new)
  const getThreadKey = (thread, patient) => {
    if (thread && thread.thread_id) return thread.thread_id;
    if (patient) return `new_${patient}`;
    return 'new';
  };

  // Save input state for previous thread before switching
  useEffect(() => {
    const prevKey = prevThreadKeyRef.current;
    if (prevKey) {
      setThreadInputState(prev => ({
        ...prev,
        [prevKey]: {
          newMessage,
          imageFile,
          imagePreview,
        }
      }));
    }
    // Restore input state for new thread
    const newKey = getThreadKey(selectedThread, selectedPatient);
    const state = threadInputState[newKey] || {};
    setNewMessage(state.newMessage || '');
    setImageFile(state.imageFile || null);
    setImagePreview(state.imagePreview || null);
    prevThreadKeyRef.current = newKey;
    // eslint-disable-next-line
  }, [selectedThread, selectedPatient]);

  const scrollToBottom = () => {
    if (messageContainerRef.current) {
      messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
    }
  };
  // Add effect to scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [selectedThread, messages]);  // Check if selectedThread has review_id but don't automatically switch to consultation mode
  // Messages view should always be the default when navigating to the page
  useEffect(() => {
    if (selectedThread) {
      console.log('Selected thread data:', selectedThread);
      console.log('Review ID:', selectedThread.review_id);
      // Always keep consultation mode false unless explicitly activated by user
      setIsConsultationMode(false);
    } else {
      setIsConsultationMode(false);
    }
  }, [selectedThread]);

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
          // Only auto-select most recent thread if not in new conversation mode
          if (data.length > 0 && !(state?.newConversation && initialPatientId)) {
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
      // Focus the message input after a short delay to ensure render
      setTimeout(() => {
        if (messageInputRef.current) messageInputRef.current.focus();
      }, 200);
    } else if (!state?.selectedPatientId) {
      setIsNewConversation(true);
      setSelectedPatient("");
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
    // Check if caption is provided when uploading an image
    if (imageFile && !messageText.trim()) {
      showSnackbar('Please add a caption for your image', 'error');
      return;
    }

    // For display purposes only, use full template if it's a new conversation
    const displayMessage = messageText;

    // Set temporary message with display version and image preview
    if (selectedThread) {
      setSelectedThread(prev => ({
        ...prev,
        messages: [...prev.messages, {
          role: 'doctor',
          message_value: displayMessage,
          created: new Date().toISOString(),
          pending: true,
          temp_id: Date.now(),
          image: imagePreview // Add image preview
        }]
      }));
    } else {
      setMessages([{
        role: 'doctor',
        message_value: displayMessage,
        created: new Date().toISOString(),
        pending: true,
        temp_id: Date.now(),
        image: imagePreview // Add image preview
      }]);
    }

    setIsSending(true);

    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        throw new Error('Authentication failed');
      }

      let response;
      
      // Check if we need to upload an image
      if (imageFile) {
        // Use FormData for image uploads
        const formData = new FormData();
        
        // Add the required fields
        formData.append('patient', selectedThread ? selectedThread.patient : selectedPatient);
        formData.append('doctor_message', messageText);
        formData.append('responder', 'doctor');
        
        // Add conversation_id for follow-up messages
        if (selectedThread) {
          formData.append('conversation_id', selectedThread.thread_id);
        }
        
        // Add the image file
        formData.append('image', imageFile);
        
        // Send the FormData request
        response = await fetch('https://health.prestigedelta.com/providermessages/', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            // Note: Don't set Content-Type here, it will be set automatically with boundary
          },
          body: formData
        });
      } else {
        // Regular JSON request for text-only messages
        const payload = {
          patient: selectedThread ? selectedThread.patient : selectedPatient,
          doctor_message: messageText,
          responder: 'doctor'
        };

        if (selectedThread) {
          payload.conversation_id = selectedThread.thread_id;
        }

        response = await fetch('https://health.prestigedelta.com/providermessages/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify(payload)
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = Array.isArray(errorData) 
          ? errorData[0]
          : (errorData.message || 'Failed to send message');
        throw new Error(errorMessage);
      }

      const data = await response.json();

      // Get image URL from response if available
      const imageUrl = data.image_url || null;

      // Update with confirmed message
      const confirmedMessage = {
        role: 'doctor',
        message_value: messageText,
        created: new Date().toISOString(),
        image: imageUrl
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

      // Clear the image after sending
      handleClearImage();

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

  const clearInputForThread = () => {
    setNewMessage('');
    setImageFile(null);
    setImagePreview(null);
    const key = getThreadKey(selectedThread, selectedPatient);
    setThreadInputState(prev => ({
      ...prev,
      [key]: { newMessage: '', imageFile: null, imagePreview: null }
    }));
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
    clearInputForThread();
  };

  const handleConfirmPreview = () => {
    setPreviewDialogOpen(false);
    const messageText = newMessage;
    setNewMessage('');
    doSendMessage(messageText);
    clearInputForThread();
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

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (limit to 5MB)
      if (file.size > 5 * 1024 * 1024) {
        showSnackbar("Image size should be less than 5MB", "error");
        return;
      }
      
      // Check file type
      if (!file.type.startsWith('image/')) {
        showSnackbar("Please select an image file", "error");
        return;
      }
      
      setImageFile(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };
  
  const handleClearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  const getLastMessageTime = (thread) => {
    if (!thread.messages || thread.messages.length === 0) return '';
    const lastMessage = thread.messages[thread.messages.length - 1];
    return new Date(lastMessage.created).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Transform messages from selectedThread.messages format to transcript component format
  const transformMessagesToTranscript = (messages) => {
    if (!Array.isArray(messages)) {
      return [];
    }
    
    return messages.map((message) => ({
      time: message.created || new Date().toISOString(),
      content: message.message_value || '',
      // Optional: Include speaker info as a prefix to content if needed
      // content: `${getRoleName(message.role)}: ${message.message_value || ''}`,
    }));
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
                      {(() => {
                        const name = thread.patient_name || `Patient (${thread.patient})`;
                        return name.length > 15 ? name.slice(0, 15) + '…' : name;
                      })()}
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
        borderRadius: isMobile ? '24px' : '999px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
        background: 'linear-gradient(90deg, #f8fafc 80%, #e3f2fd 100%)',
        px: 2,
        py: 1,
        display: 'flex',
        flexDirection: 'column', // allow stacking preview above controls
        alignItems: 'stretch',
        gap: 1,
        position: 'relative',
        mt: 0,
        mb: 0,
      }}
    >
      {/* Image preview (if any) at the top of the input area */}
      {imagePreview && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1, mt: 0.5 }}>
          <Paper elevation={1} sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            p: 1,
            borderRadius: 2,
            background: '#fff',
            boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
            maxWidth: 180,
          }}>
            <img
              src={imagePreview}
              alt="Preview"
              style={{
                width: 60,
                height: 60,
                objectFit: 'cover',
                borderRadius: 6,
                boxShadow: '0 1px 4px rgba(0,0,0,0.10)'
              }}
            />
            <Button
              variant="outlined"
              color="error"
              size="small"
              onClick={handleClearImage}
              sx={{ minWidth: 0, px: 1.5, fontSize: 13 }}
            >
              Clear
            </Button>
          </Paper>
        </Box>
      )}
      {/* Controls row */}
      <Box sx={{ display: 'flex', flexDirection:'row', alignItems: 'center', gap: 1.5 }}>
        {/* Patient dropdown only visible on desktop, not mobile */}
        {isNewConversation && !isMobile && (
          <FormControl
            variant="outlined"
            sx={{
              minWidth: 90,
              mr: 0.5,
              '.MuiOutlinedInput-root': {
                borderRadius: '999px',
                background: '#f0f4f8',
                height: 38,
                pl: 0.5,
                pr: 1,
                fontSize: 13,
                boxShadow: 'none',
              },
            }}
            size="small"
          >
            <Select
              value={selectedPatient || ""}
              onChange={(e) => setSelectedPatient(e.target.value)}
              displayEmpty
              startAdornment={<PersonIcon sx={{ color: '#1976d2', fontSize: 18, mr: 0.5 }} />}
              renderValue={(selected) =>
                selected
                  ? (datalist.find((p) => p.id === selected)?.full_name?.split(' ')[0] || `Patient`)
                  : 'Patient'
              }
              sx={{
                borderRadius: '999px',
                fontSize: 13,
                color: '#1976d2',
                fontWeight: 500,
                minWidth: 70,
                height: 38,
                pl: 0,
                pr: 0,
                background: 'none',
                boxShadow: 'none',
                '.MuiSelect-icon': { color: '#1976d2', fontSize: 18 },
              }}
              MenuProps={{
                PaperProps: {
                  style: { zIndex: 1302 },
                },
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
        )}
        <IconButton onClick={triggerFileInput} sx={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          background: '#f0f4f8',
          color: '#1976d2',
          boxShadow: 'none',
          transition: 'background 0.2s',
          '&:hover': { background: '#e3f2fd' },
          flexShrink: 0,
        }}>
          <AttachFileIcon sx={{ fontSize: 20 }} />
        </IconButton>
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          accept="image/*"
          onChange={handleImageSelect}
        />
        <TextField
          fullWidth
          placeholder={isNewConversation ? "Type a message..." : "Type your message here..."}
          variant="standard"
          multiline
          minRows={1}
          maxRows={4}
          InputProps={{
            disableUnderline: true,
            style: {
              fontSize: '15px',
              background: 'none',
              borderRadius: '999px',
              paddingLeft: 10,
              paddingRight: 10,
            },
          }}
          sx={{
            background: 'none',
            borderRadius: '999px',
            boxShadow: 'none',
            mx: 0.5,
            my: 0,
            minHeight: 38,
            '& textarea': { padding: 0, lineHeight: 1.6 },
          }}
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          disabled={isSending}
          inputRef={messageInputRef}
        />
        <IconButton
          color="primary"
          onClick={handleSendMessage}
          disabled={
            isNewConversation
              ? (!selectedPatient || !newMessage.trim() || isSending)
              : (!newMessage.trim() || isSending)
          }
          sx={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: '#1976d2',
            color: 'white',
            ml: 0.5,
            boxShadow: 'none',
            '&:hover': { background: '#125ea2' },
            flexShrink: 0,
          }}
        >
          {isSending ? <CircularProgress size={22} sx={{ color: 'white' }} /> : <SendIcon sx={{ fontSize: 20 }} />}
        </IconButton>
      </Box>
      
      {/* Patient dropdown for mobile only - displayed below input field */}
      {isNewConversation && isMobile && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1.5, mb: 0.5 }}>
          <FormControl
            variant="outlined"
            sx={{
              width: '100%',
              '.MuiOutlinedInput-root': {
                borderRadius: '999px',
                background: '#f0f4f8',
                height: 38,
                pl: 0.5,
                pr: 1,
                fontSize: 13,
                boxShadow: 'none',
              },
            }}
            size="small"
          >
            <Select
              value={selectedPatient || ""}
              onChange={(e) => setSelectedPatient(e.target.value)}
              displayEmpty
              startAdornment={<PersonIcon sx={{ color: '#1976d2', fontSize: 18, mr: 0.5 }} />}
              renderValue={(selected) =>
                selected
                  ? (datalist.find((p) => p.id === selected)?.full_name?.split(' ')[0] || `Patient`)
                  : 'Select Patient'
              }
              sx={{
                borderRadius: '999px',
                fontSize: 13,
                color: '#1976d2',
                fontWeight: 500,
                height: 38,
                pl: 0,
                pr: 0,
                background: '#f0f4f8',
                boxShadow: 'none',
                '.MuiSelect-icon': { color: '#1976d2', fontSize: 18 },
              }}
              MenuProps={{
                PaperProps: {
                  style: { zIndex: 1302 },
                },
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
        </Box>
      )}
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
        {/* Display image if present at the top, clickable for expand */}
        {msg.image && typeof msg.image === 'string' && msg.image.startsWith('http') && (
          <Box sx={{ mb: 1, textAlign: 'center', position: 'relative' }}>
            <img
              src={msg.image}
              alt="attachment"
              style={{
                maxWidth: '220px',
                maxHeight: '180px',
                borderRadius: 8,
                boxShadow: '0 1px 6px rgba(0,0,0,0.13)',
                display: 'inline-block',
                cursor: 'pointer',
                transition: 'box-shadow 0.2s',
              }}
              onClick={() => setExpandedImage(msg.image)}
            />
            <IconButton
              size="small"
              sx={{ position: 'absolute', top: 6, right: 6, background: 'rgba(255,255,255,0.7)' }}
              onClick={() => setExpandedImage(msg.image)}
              aria-label="Expand image"
            >
              <ZoomInIcon fontSize="small" />
            </IconButton>
          </Box>
        )}
        <Typography variant="body1">
          {msg.message_value}
        </Typography>
        <Typography variant="caption" sx={{ /* ...existing styles... */ }}>
          {(() => {
            const date = new Date(msg.created);
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          })()}
        </Typography>
      </Box>
    </Box>
  );
  const handleSaveAndExitConsultation = async () => {
    if (patientProfileRef.current && patientProfileRef.current.saveAllDocumentation) {
      try {
        await patientProfileRef.current.saveAllDocumentation();
        setIsDocumentationSaved(true);
        setIsConsultationMode(false); // Switch back to messages view
        showSnackbar('Documentation saved successfully!', 'success');
      } catch (error) {
        showSnackbar('Failed to save documentation. Please try again.', 'error');
      }
    } else {
      setIsConsultationMode(false); // Fallback: just exit
    }
  };

  const renderConversationDetail = () => {
    // If in consultation mode (thread has review_id), show PatientProfile component
    if (isConsultationMode && selectedThread && selectedThread.review_id) {
      return (
        <Paper sx={{ 
          flex: 1, 
          height: 'calc(100vh - 2rem)',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          width: isMobile ? '100%' : 'auto',
        }}>
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
            <Typography variant="h5" sx={{ color: '#1976d2', fontWeight: 500 }}>
              {selectedThread?.patient_name || `Patient (${selectedThread.patient})`} - Consultation
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setIsConsultationMode(false)}
                sx={{ textTransform: 'none' }}
              >
                View Messages
              </Button>
              <Button
                variant="contained"
                color="success"
                size="small"
                onClick={handleSaveAndExitConsultation}
                sx={{ textTransform: 'none' }}
              >
                Save & Exit
              </Button>
              <IconButton 
                onClick={handleRefresh} 
                disabled={isRefreshing}
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
          </Box>          {/* Double Scroller: Outer container for PatientProfile */}
          <Box 
            sx={{ 
              flex: 1, 
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              position: 'relative',
              height: `calc(100vh - ${isMobile && isNewConversation ? '330px' : isMobile ? '270px' : '310px'})`,
            }}
          >
            {/* Inner scrollable container for PatientProfile */}
            <Box
              sx={{
                flex: 1,
                overflowY: 'auto',
                overflowX: 'hidden',
                minHeight: '100%',
              }}
            >
              {console.log('Rendering PatientProfile with reviewid:', selectedThread.review_id, 'thread:', selectedThread.thread_id)}
              <PatientProfile
                ref={patientProfileRef}
                reviewid={selectedThread.review_id}
                thread={selectedThread.thread_id}
                transcript={transformMessagesToTranscript(selectedThread.messages || [])}
                setIsDocumentationSaved={setIsDocumentationSaved}
                isMobile={isMobile}
                hideSaveAllButton={false}
              />
            </Box>
          </Box>
        </Paper>
      );
    }

    // Default message view
    return (    <Paper sx={{ 
      flex: 1, 
      height: 'calc(100vh - 2rem)',
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      width: isMobile ? '100%' : 'auto',
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
            {/* Show patient name for new conversation if selected, or thread name for existing */}            <Typography variant="h5" sx={{ color: '#1976d2', fontWeight: 500 }}>
              {isNewConversation && selectedPatient
                ? datalist.find(p => p.id === selectedPatient)?.full_name || `Patient (${selectedPatient})`
                : selectedThread?.patient_name || (selectedThread ? `Patient (${selectedThread.patient})` : '')}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              {/* Show consultation button if thread has review_id */}
              {selectedThread && selectedThread.review_id && (
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => setIsConsultationMode(true)}
                  sx={{ 
                    textTransform: 'none',
                    bgcolor: '#4caf50',
                    '&:hover': { bgcolor: '#45a049' }
                  }}
                >
                  View Consultation
                </Button>
              )}
              <IconButton 
                onClick={handleRefresh} 
                disabled={isRefreshing}
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
          </Box>          {/* Double Scroller: Outer container for layout control */}
          <Box 
            sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              position: 'relative',
              height: `calc(100vh - ${isMobile && isNewConversation ? '330px' : isMobile ? '270px' : '310px'})`,
            }}
          >
            {/* Inner scrollable container for messages */}
            <Box 
              ref={messageContainerRef}
              sx={{
                flex: 1,
                overflowY: 'auto',
                overflowX: 'hidden',
                p: { xs: 2, lg: 4 },
                scrollBehavior: 'smooth',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: (isNewConversation && messages.length === 0) ? 'center' : 'flex-start',
                minHeight: '100%',
              }}
            >
              {/* If new conversation and no messages, show instructions centered */}
              {isNewConversation && messages.length === 0 ? (
                <Box sx={{ textAlign: 'center', width: '100%', maxWidth: 340 }}>
                  <Paper elevation={0} sx={{
                    background: '#f5f7fa',
                    color: '#607D8B',
                    p: 2,
                    borderRadius: 2,
                    fontSize: 15,
                    textAlign: 'center',
                    lineHeight: 1.6,
                    wordBreak: 'break-word',
                    maxWidth: '100%',
                    minHeight: 36,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                  }}>
                    <span style={{ opacity: 0.9 }}>
                      To start a conversation, select a patient, type your message, and optionally attach an image. The patient will receive your message on WhatsApp as a secure chat.
                    </span>
                  </Paper>
                </Box>
              ) : (
                <Box sx={{ 
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                  width: '100%',
                  alignItems: 'flex-start',
                  pb: 2, // Small padding at bottom for better spacing
                }}>
                  {/* Show either thread messages or new conversation messages */}
                  {((selectedThread && Array.isArray(selectedThread.messages)) ? selectedThread.messages : Array.isArray(messages) ? messages : []).map((msg) => 
                    renderMessage(msg, selectedThread)
                  )}
                </Box>
              )}
            </Box>
          </Box>          {/* Fixed input box at bottom */}
          <Box sx={{
            position: 'sticky',
            bottom: 0,
            bgcolor: 'background.paper',
            borderTop: '1px solid rgba(0,0,0,0.12)',
            p: 2,
            zIndex: 10,
            boxShadow: '0 -2px 10px rgba(0,0,0,0.1)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}>
            {renderInputBox()}
          </Box></>
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
  };

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
                  <Button 
                    variant="contained" 
                    onClick={() => setBottomSheetOpen(true)}
                    sx={{ 
                      height: '48px',  // Make button taller
                      fontSize: '16px',
                      fontWeight: 500,
                      px: 3
                    }}
                  >
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
      {/* Hidden file input for image uploads */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept="image/*"
        onChange={handleImageSelect}
      />
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
      {/* Image expand modal */}
      <Dialog open={!!expandedImage} onClose={() => setExpandedImage(null)} maxWidth="md" fullWidth>
        <Box sx={{ position: 'relative', bgcolor: 'black', p: 0 }}>
          {expandedImage && (
            <img
              src={expandedImage}
              alt="Expanded"
              style={{
                width: '100%',
                maxHeight: '80vh',
                objectFit: 'contain',
                background: 'black',
                display: 'block',
              }}
            />
          )}
          <IconButton
            onClick={() => setExpandedImage(null)}
            sx={{ position: 'absolute', top: 8, right: 8, color: 'white', background: 'rgba(0,0,0,0.4)' }}
            aria-label="Close"
          >
            ×
          </IconButton>
          {expandedImage && (
            <IconButton
              component="a"
              href={expandedImage}
              download
              target="_blank"
              rel="noopener noreferrer"
              sx={{ position: 'absolute', top: 8, left: 8, color: 'white', background: 'rgba(0,0,0,0.4)' }}
              aria-label="Download image"
            >
              <DownloadIcon fontSize="medium" />
            </IconButton>
          )}
        </Box>
      </Dialog>
    </div>
  );
};

export default PatientMessages;
