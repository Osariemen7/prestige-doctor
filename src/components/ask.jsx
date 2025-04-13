import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import {
  Box,
  Typography,
  TextField,
  IconButton,
  Link,
  Collapse,
  List,
  ListItem,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
  Snackbar,
  Select,
  MenuItem,
  Alert,
  FormControl,
  CircularProgress,
  Paper,
  Icon // Import Icon
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Skeleton from '@mui/material/Skeleton';
import Sidebar from './sidebar';
import { useNavigate, useLocation } from 'react-router-dom'; // Add useLocation
import { getAccessToken } from './api';
import PatientProfileDisplay from './document';
import ImageIcon from '@mui/icons-material/Image'; // Import ImageIcon
import SwipeableDrawer from '@mui/material/SwipeableDrawer';
import ListItemText from '@mui/material/ListItemText';
import ListItemButton from '@mui/material/ListItemButton';
import ChatIcon from '@mui/icons-material/Chat';
import DeleteIcon from '@mui/icons-material/Delete';
import { useTheme, useMediaQuery } from '@mui/material';

// ----------------------------------------------------
// 1. CustomText: converts citation markers like [1], [2], etc. into clickable links.
// ----------------------------------------------------
const CustomText = ({ children, citations }) => {
  const text = React.Children.toArray(children).join("");
  const regex = /\[(\d+)\]/g;
  const parts = [];
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    const citationNumber = match[1];
    const citationIndex = parseInt(citationNumber, 10) - 1;
    if (citations && citations[citationIndex]) {
      parts.push(
        <>
          [
          <Link
            key={match.index}
            href={citations[citationIndex]}
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              color: '#1976d2',
              cursor: 'pointer',
              textDecoration: 'none',
              '&:hover': { textDecoration: 'underline' }
            }}
          >
            {citationNumber}
          </Link>
          ]
        </>
      );
    } else {
      parts.push(match[0]);
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }
  return <>{parts}</>;
};

// ----------------------------------------------------
// 2. ThoughtAccordion: displays the model thought at the top with toggle label
// ----------------------------------------------------
const ThoughtAccordion = ({ thinkContent, citations }) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <Accordion
      expanded={expanded}
      onChange={() => setExpanded((prev) => !prev)}
      sx={{ mt: 1 }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="subtitle2" sx={{ fontSize: '0.75rem' }}>
          {expanded ? 'Hide Thought' : 'Show Thought'}
        </Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ fontSize: '0.75rem', color: 'grey' }}>
        <ReactMarkdown
          skipHtml={true}  // <-- new prop
          remarkPlugins={[remarkGfm]}
          components={{
            text: ({ node, children }) => (
            <CustomText citations={citations} children={children} />
            ),
          }}
        >
          {thinkContent}
        </ReactMarkdown>
      </AccordionDetails>
    </Accordion>
  );
};

const ThreadPanel = ({ threads, selectedThread, onSelectThread, onDeleteThread, onNewChat, isMobile }) => {
  const getConversationTitle = (thread) => {
    if (thread.title) return thread.title;
    if (thread.messages && thread.messages.length > 0) {
      const firstUserMessage = thread.messages.find(msg => msg.role === 'user');
      if (firstUserMessage) {
        const content = firstUserMessage.content;
        return content.length > 12 ? `${content.substring(0, 12)}...` : content;
      }
    }
    return 'Conversation';
  };

  return (
    <Paper
      elevation={3}
      sx={{
        width: isMobile ? '100%' : '280px',
        height: isMobile ? 'auto' : '100vh',
        overflowY: 'auto',
        borderRadius: isMobile ? 0 : '0 12px 12px 0',
        backgroundColor: '#f8f9fa',
      }}
    >
      <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0' }}>
        <Typography variant="h6" sx={{ color: '#1976d2', fontWeight: 500 }}>
          Conversations
        </Typography>
        {selectedThread && (
          <Button
            fullWidth
            variant="outlined"
            startIcon={<ChatIcon />}
            onClick={onNewChat}
            sx={{ mt: 1 }}
          >
            New Chat
          </Button>
        )}
      </Box>
      <List sx={{ p: 1 }}>
        {threads.map((thread) => (
          <ListItem
            key={thread.id}
            disablePadding
            secondaryAction={
              <IconButton 
                edge="end" 
                onClick={() => onDeleteThread(thread.id)}
                sx={{ color: 'error.light' }}
              >
                <DeleteIcon />
              </IconButton>
            }
          >
            <ListItemButton
              selected={selectedThread?.id === thread.id}
              onClick={() => onSelectThread(thread)}
              sx={{
                borderRadius: '8px',
                mb: 0.5,
                '&.Mui-selected': {
                  backgroundColor: '#e3f2fd',
                  '&:hover': {
                    backgroundColor: '#bbdefb',
                  },
                },
              }}
            >
              <ChatIcon sx={{ mr: 2, color: '#1976d2' }} />
              <ListItemText
                primary={getConversationTitle(thread)}
                secondary={new Date(thread.created_at).toLocaleDateString()}
                primaryTypographyProps={{
                  noWrap: true,
                  sx: { fontWeight: selectedThread?.id === thread.id ? 500 : 400 }
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Paper>
  );
};

const SearchBox = () => {
  const [message, setMessage] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [threadId, setThreadId] = useState(null);
  const [isSourcesVisible, setIsSourcesVisible] = useState(false);
  const [isResponseLoading, setIsResponseLoading] = useState(false);
  const [datalist, setDataList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expertLevel, setExpertLevel] = useState('low');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const navigate = useNavigate();
  const location = useLocation(); // Add this line
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('error');
  const [isSidebarMinimized, setIsSidebarMinimized] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null); // State for selected image file
  const [selectedImagePreview, setSelectedImagePreview] = useState(null); // State for image preview URL
  const [isExpertLevelLocked, setIsExpertLevelLocked] = useState(false); // State to lock expert level
  const fileInputRef = useRef(null); // Ref for hidden file input
  const [threads, setThreads] = useState([]);
  const [selectedThread, setSelectedThread] = useState(null);
  const [isThreadPanelOpen, setIsThreadPanelOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [isLoadingThreadMessages, setIsLoadingThreadMessages] = useState(false);

  const showSnackbar = useCallback((newMessage, newSeverity) => {
    setSnackbarMessage(newMessage);
    setSnackbarSeverity(newSeverity);
    setSnackbarOpen(true);
  }, []);

  const handleSnackbarClose = useCallback((event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbarOpen(false);
  }, []);

  const handleImageUploadClick = () => {
    fileInputRef.current.click(); // Programmatically click the hidden file input
  };

  const handleImageSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedImage(file);

      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImagePreview(reader.result); // Set image preview URL
      };
      reader.readAsDataURL(file);

      setExpertLevel('high'); // Automatically set to high on image upload
      setIsExpertLevelLocked(true); // Lock the dropdown
    } else {
      setSelectedImage(null);
      setSelectedImagePreview(null);
      setIsExpertLevelLocked(false);
      setExpertLevel('low'); // Reset to default if image selection is cancelled
    }
  };

  const handleCancelImage = () => {
    setSelectedImage(null);
    setSelectedImagePreview(null);
    setIsExpertLevelLocked(false);
    setExpertLevel('low');
  };

  const refreshThreads = useCallback(async () => {
    try {
      const token = await getAccessToken();
      const response = await fetch('https://health.prestigedelta.com/research/', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch threads');
      const data = await response.json();
      
      // Log the current thread ID before updates
      console.log("Current threadId before refresh:", threadId);
      
      // Update threads with fresh data
      setThreads(data);
      
      // If we have a current thread ID, find and update it
      if (threadId) {
        // First try to find exact match
        const currentThreadFromServer = data.find(t => String(t.id) === String(threadId));
        
        if (currentThreadFromServer) {
          console.log("Found matching thread in refresh:", currentThreadFromServer.id);
          setSelectedThread(currentThreadFromServer);
        }
        // If current thread is temporary or not found, check for newest thread
        else if (String(threadId).startsWith('temp-') || !currentThreadFromServer) {
          if (data.length > 0) {
            console.log("Using newest thread instead:", data[0].id);
            const newestThread = data[0];
            setThreadId(newestThread.id); 
            setSelectedThread(newestThread);
          }
        }
      }
      
      console.log("Threads refreshed, current threadId:", threadId);
    } catch (error) {
      console.error('Error refreshing threads:', error);
    }
  }, [threadId]);

  const handleSendMessage = useCallback(async () => {
    if (!message.trim() && !selectedImage) return;

    const currentMessage = message;
    setMessage("");
    setIsResponseLoading(true);
    setIsSourcesVisible(false);

    // Get the current thread ID (real or temporary)
    const currentThreadId = threadId;
    
    // Track if this is a new conversation with a temporary ID
    const isTemporaryThread = currentThreadId && String(currentThreadId).startsWith('temp-');

    // Modified: Always assign a temporary thread id if none exists
    if (!currentThreadId) {
      const tempId = `temp-${Date.now()}`; // new temporary id
      const tempThread = {
        id: tempId,
        created_at: new Date().toISOString(),
        messages: [{
          role: 'user',
          content: selectedImagePreview || currentMessage
        }]
      };
      setThreadId(tempId); // <-- new: update threadId state
      setThreads(prev => [tempThread, ...prev]);
      setSelectedThread(tempThread);
    }

    try {
      const token = await getAccessToken();
      console.log("Access Token:", token);

      const apiUrl = "https://health.prestigedelta.com/research/";

      let payload = { expertise_level: expertLevel };
      let requestBody;
      let headers;

      // Use perplexityThread if available from navigation state
      if (location.state?.perplexityThread) {
        payload.thread_id = location.state.perplexityThread;
      } else if (currentThreadId && !isTemporaryThread) {
        // Only send thread_id if it's a real ID (not temporary)
        payload.thread_id = currentThreadId;
        console.log("Using thread_id in request:", currentThreadId);
      } else if (selectedPatient) {
        // Only include patient_id if there's no real thread_id
        payload.patient_id = selectedPatient.id;
      }

      const userMessageContent = selectedImagePreview ? selectedImagePreview : currentMessage;
      const userTextMessage = selectedImage ? (currentMessage.trim() ? currentMessage : "Uploaded Image") : currentMessage;

      const userMessage = {
        role: "user",
        content: userMessageContent,
        isImage: !!selectedImagePreview, // Flag as image message
        text: userTextMessage, // Store text content separately for image messages
      };
      setChatMessages((prev) => [...prev, userMessage]);

      if (selectedImage) {
        const formData = new FormData();
        for (const key in payload) {
          formData.append(key, payload[key]);
        }
        formData.append('image', selectedImage);
        formData.append('caption', currentMessage.trim() ? currentMessage : "Analyze this image");
        requestBody = formData;
        headers = {
          "Authorization": `Bearer ${token}`, // FormData handles content-type
        };
        console.log("Image request with payload:", Object.fromEntries(formData.entries()));
      } else {
        payload.query = currentMessage;
        requestBody = JSON.stringify(payload);
        headers = {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        };
        console.log("Text request with payload:", payload);
      }

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: headers,
        body: requestBody,
      });

      if (!response.body) {
        throw new Error("No response body");
      }

      // Reset selected image and preview after sending
      setSelectedImage(null);
      setSelectedImagePreview(null);
      setIsExpertLevelLocked(false);

      let assistantMessage = { role: "assistant", content: "", citations: [] };
      setChatMessages((prev) => [...prev, assistantMessage]);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;

      if (selectedImage) {
        // Handle image response - we need to parse the complete response
        let accumulatedResponse = '';
        while (!done) {
          const { value, done: doneReading } = await reader.read();
          done = doneReading;
          const chunkText = decoder.decode(value);
          accumulatedResponse += chunkText;
        }
        
        try {
          // Check if the response starts with a JSON object containing thread_id
          let jsonHeader = null;
          let cleanedResponse = accumulatedResponse;
          
          // Look for JSON at the beginning of the response
          const jsonMatch = accumulatedResponse.match(/^\s*(\{.*?\})/);
          if (jsonMatch) {
            try {
              jsonHeader = JSON.parse(jsonMatch[1]);
              // Remove the JSON from the displayed response
              cleanedResponse = accumulatedResponse.substring(jsonMatch[0].length).trim();
              console.log("Extracted JSON header:", jsonHeader);
            } catch (jsonError) {
              console.warn("Found potential JSON header but couldn't parse it:", jsonMatch[1]);
            }
          }
          
          // First try to get thread_id from JSON header if found
          let newThreadId = jsonHeader?.thread_id;
          
          // If not found in header, try parsing the entire response as JSON as fallback
          if (!newThreadId) {
            try {
              const parsed = JSON.parse(accumulatedResponse);
              if (parsed.thread_id) {
                newThreadId = parsed.thread_id;
                // If the entire response was JSON, we don't want to display it
                cleanedResponse = parsed.accumulated_response || '';
              }
            } catch (e) {
              // Not valid JSON, continue with the original response
            }
          }
          
          if (newThreadId) {
            console.log("Received new thread_id from image response:", newThreadId);
            
            // Critical update: Immediately update thread ID state with the real ID
            setThreadId(newThreadId);
            
            // Update threads list - replace temp thread with real one
            setThreads(prev => prev.map(t => 
              (t.id === currentThreadId) 
                ? { ...t, id: newThreadId } 
                : t
            ));
            
            // Update selected thread
            if (selectedThread?.id === currentThreadId) {
              setSelectedThread(prev => ({ ...prev, id: newThreadId }));
            }
          } else {
            console.warn("No thread_id received in image response");
          }
          
          // Use the cleaned response for display
          assistantMessage.content = cleanedResponse.trim();
          
          // Force an update of chat messages with the latest content
          setChatMessages(prev => {
            const updated = [...prev];
            updated[updated.length - 1] = { ...assistantMessage };
            return updated;
          });
          
          // If we received a new thread ID, ensure it's properly saved
          if (newThreadId) {
            console.log("Thread ID after image processing:", newThreadId);
            // Explicitly trigger a refresh to ensure state consistency
            setTimeout(() => refreshThreads(), 500);
          }
        } catch(e) {
          console.error("Error processing image response:", e);
          assistantMessage.content = accumulatedResponse.trim();
          setChatMessages(prev => {
            const updated = [...prev];
            updated[updated.length - 1] = { ...assistantMessage };
            return updated;
          });
        }
      } else {
        // Handle text responses with streaming
        let buffer = "";
        let newThreadId = null;
        
        while (!done) {
          const { value, done: doneReading } = await reader.read();
          done = doneReading;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n");
          buffer = parts.pop();
          
          for (const part of parts) {
            if (part.trim()) {
              try {
                const parsed = JSON.parse(part);
                
                if (parsed.thread_id) {
                  newThreadId = parsed.thread_id;
                  console.log("Received thread_id from text response:", newThreadId);
                  
                  // Only update thread references if this was a new conversation or had a temporary ID
                  if (!currentThreadId || isTemporaryThread) {
                    // Critical: Update thread ID state immediately
                    setThreadId(newThreadId);
                    
                    // Update threads list
                    setThreads(prev => prev.map(t => 
                      (t.id === currentThreadId) 
                        ? { ...t, id: newThreadId } 
                        : t
                    ));
                    
                    // Update selected thread
                    if (selectedThread?.id === currentThreadId) {
                      setSelectedThread(prev => ({ ...prev, id: newThreadId }));
                    }
                  }
                }
                
                if (parsed.assistant_response_chunk) {
                  assistantMessage.content = parsed.accumulated_response;
                  assistantMessage.citations = parsed.citations;
                  setChatMessages(prev => {
                    const updated = [...prev];
                    updated[updated.length - 1] = { ...assistantMessage };
                    return updated;
                  });
                }
              } catch (error) {
                console.error("Error parsing JSON chunk:", error);
              }
            }
          }
        }
        
        // After processing all chunks, log the final thread ID and refresh
        if (newThreadId) {
          console.log("Final thread ID after text response:", newThreadId);
          // Explicitly trigger a refresh after small delay to ensure state consistency
          setTimeout(() => refreshThreads(), 500);
        }
      }

    } catch (error) {
      console.error("Error sending message:", error);
      if (!currentThreadId || isTemporaryThread) {
        // Only remove temporary thread on error if this was a new conversation
        setThreads(prev => prev.filter(t => t.id !== currentThreadId));
      }
      const errorMessage = error?.message || "Sorry, I encountered an error. Please try again later.";
      showSnackbar(errorMessage, 'error');
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: errorMessage,
        },
      ]);
    } finally {
      setIsResponseLoading(false);
    }
  }, [message, threadId, selectedPatient, expertLevel, showSnackbar, selectedImage, selectedImagePreview, isExpertLevelLocked, location.state, refreshThreads, selectedThread]);

  const getDomainFromUrl = (url) => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch (e) {
      return url;
    }
  };

  const handleSourcesToggle = () => {
    setIsSourcesVisible((prev) => !prev);
  };

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
        showSnackbar("Failed to fetch patient list.", 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate, showSnackbar]);

  // Add useEffect to handle initial query and patient selection
  useEffect(() => {
    if (location.state?.initialQuery) {
      setMessage(location.state.initialQuery);
    }
    if (location.state?.selectedPatientId && datalist.length > 0) {
      const patient = datalist.find(p => p.id === location.state.selectedPatientId);
      if (patient) {
        setSelectedPatient(patient);
      }
    }
  }, [datalist, location.state]);

  // Extract the <think> block from the assistant response.
  const extractThinkContent = (text) => {
    const thinkMatch = text.match(/<think>([\s\S]*?)<\/think>/i);
    const thinkContent = thinkMatch ? thinkMatch[1].trim() : null;
    const remainingContent = text.replace(/<think>[\s\S]*?<\/think>/i, '').trim();
    return { thinkContent, remainingContent };
  };

  const handleLogout = () => {
    localStorage.removeItem('user-info');
    navigate('/');
  };

  const fetchThreadMessages = useCallback(async (threadId) => {
    setIsLoadingThreadMessages(true);
    try {
      const token = await getAccessToken();
      const response = await fetch(`https://health.prestigedelta.com/research/${threadId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch thread messages');
      const data = await response.json();
      
      // Transform messages to match your chat format
      const formattedMessages = data.messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        citations: msg.citations || []
      }));
      
      setChatMessages(formattedMessages);
    } catch (error) {
      console.error('Error fetching thread messages:', error);
      showSnackbar('Failed to load conversation messages', 'error');
    } finally {
      setIsLoadingThreadMessages(false);
    }
  }, [showSnackbar]);

  const handleSelectThread = useCallback((thread) => {
    setSelectedThread(thread);
    setThreadId(thread.id);
    fetchThreadMessages(thread.id);
    if (isMobile) {
      setIsThreadPanelOpen(false);
    }
  }, [isMobile, fetchThreadMessages]);

  const handleDeleteThread = useCallback(async (threadId) => {
    try {
      const token = await getAccessToken();
      await fetch(`https://health.prestigedelta.com/research/${threadId}/`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setThreads(threads.filter(t => t.id !== threadId));
      if (selectedThread?.id === threadId) {
        setSelectedThread(null);
        setThreadId(null);
      }
      showSnackbar('Thread deleted successfully', 'success');
    } catch (error) {
      showSnackbar('Failed to delete thread', 'error');
    }
  }, [threads, selectedThread, showSnackbar]);

  useEffect(() => {
    const fetchThreads = async () => {
      try {
        const token = await getAccessToken();
        const response = await fetch('https://health.prestigedelta.com/research/', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!response.ok) throw new Error('Failed to fetch threads');
        const data = await response.json();
        setThreads(data);
      } catch (error) {
        console.error('Error fetching threads:', error);
        showSnackbar('Failed to load conversations', 'error');
      }
    };
    fetchThreads();
  }, [showSnackbar]);

  const handleNewChat = useCallback(() => {
    setSelectedThread(null);
    setThreadId(null);
    setChatMessages([]);
  }, []);

  const renderCitations = useCallback((chat) => {
    // Show citations whenever they exist, regardless of AI level
    if (chat.citations?.length > 0) {
      return (
        <Box sx={{ mt: 1 }}>
          <Button
            variant="outlined"
            onClick={handleSourcesToggle}
            startIcon={<FactCheckIcon />}
            size="small"
            sx={{
              borderRadius: '20px',
              textTransform: 'none',
              padding: '2px 10px',
              borderColor: '#ccc',
              backgroundColor: 'white',
              '&:hover': { backgroundColor: '#f0f0f0' },
              mr: 1,
            }}
          >
            Sources
            <sup style={{ marginLeft: '5px', fontSize: '0.7rem' }}>
              {chat.citations.length}
            </sup>
          </Button>
          <Collapse in={isSourcesVisible} timeout="auto" unmountOnExit>
            <Box sx={{ mt: 1, pl: 2, borderLeft: '2px solid #ccc' }}>
              <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 0.5 }}>
                Citations:
              </Typography>
              {chat.citations.map((citation, citationIndex) => (
                <Typography
                  key={citationIndex}
                  variant="caption"
                  color="textSecondary"
                  sx={{ display: 'block', mb: 0.5 }}
                >
                  {citationIndex + 1}.{' '}
                  <Link
                    href={citation}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{
                      ml: 0.5,
                      fontSize: '0.75rem',
                      color: '#2b6cb0',
                      textDecoration: 'underline',
                    }}
                  >
                    {getDomainFromUrl(citation)}
                  </Link>
                </Typography>
              ))}
            </Box>
          </Collapse>
        </Box>
      );
    }
    return null;
  }, [isSourcesVisible, handleSourcesToggle]);

  return (
    <div className="dashboard-container" style={{ margin: isMobile ? 0 : undefined, padding: isMobile ? 0 : undefined }}>
      <Sidebar
        onToggleSidebar={(minimized) => setIsSidebarMinimized(minimized)}
        onNavigate={(path) => navigate(path)}
        onLogout={handleLogout}
      />
      
      <div className={`${!isMobile ? (isSidebarMinimized ? 'ml-16' : 'ml-64') : ''} flex-1 transition-all duration-300`}>
        <ThemeProvider theme={theme}>
          <Box 
            sx={{ 
              display: 'flex', 
              height: '100vh',
              width: '100%',
              [theme.breakpoints.down('md')]: {
                marginLeft: 0,
                padding: 0
              }
            }}
          >
            {/* Desktop Thread Panel */}
            {!isMobile && (
              <ThreadPanel
                threads={threads}
                selectedThread={selectedThread}
                onSelectThread={handleSelectThread}
                onDeleteThread={handleDeleteThread}
                onNewChat={handleNewChat}
                isMobile={false}
              />
            )}

            {/* Main Chat Area */}
            <Box 
              sx={{ 
                flex: 1, 
                display: 'flex', 
                flexDirection: 'column',
                width: '100%',
                [theme.breakpoints.down('md')]: {
                  padding: '0 16px'
                }
              }}
            >
              {/* Mobile Thread Panel Button */}
              {isMobile && (
                <IconButton
                  onClick={() => setIsThreadPanelOpen((prev) => !prev)}
                  sx={{ 
                    position: 'absolute', 
                    top: 16, 
                    left: 16, 
                    zIndex: theme.zIndex.drawer + 1, // increased z-index
                    backgroundColor: 'white',
                    '&:hover': { backgroundColor: '#f5f5f5' }
                  }}
                >
                  <ChatIcon />
                </IconButton>
              )}

              {/* Updated SwipeableDrawer for mobile */}
              <SwipeableDrawer
                anchor="left"
                open={isThreadPanelOpen}
                onClose={() => setIsThreadPanelOpen(false)}
                onOpen={() => setIsThreadPanelOpen(true)}
              >
                <ThreadPanel
                  threads={threads}
                  selectedThread={selectedThread}
                  onSelectThread={(thread) => {
                    handleSelectThread(thread);
                    setIsThreadPanelOpen(false);
                  }}
                  onDeleteThread={handleDeleteThread}
                  onNewChat={handleNewChat}
                  isMobile={true}
                />
              </SwipeableDrawer>

              {/* Chat Content Area */}
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  minHeight: '100vh',
                  width: '100%',
                  padding: { xs: '0', md: '20px' }, // Removed horizontal padding on mobile
                  backgroundColor: '#f5f5f5',
                  justifyContent: chatMessages.length > 0 ? 'flex-start' : 'center',
                }}
              >
                <Typography
                  variant="h5"
                  align="center"
                  mb={2}
                  sx={{
                    fontWeight: 500,
                    color: '#333',
                    marginTop: chatMessages.length > 0 ? '20px' : '0',
                  }}
                >
                  What do you want to know?
                </Typography>

                <Box
                  sx={{
                    overflowY: 'auto',
                    width: '100%',
                    maxWidth: '840px',
                    mb: 2,
                  }}
                >
                  <List>
                    {chatMessages.map((chat, index) => {
                      if (chat.role === 'assistant') {
                        const { thinkContent, remainingContent } = extractThinkContent(chat.content);
                        return (
                          <ListItem
                            key={index}
                            sx={{
                              flexDirection: 'row',
                              justifyContent: 'flex-start',
                            }}
                          >
                            <Box
                              sx={{
                                backgroundColor: '#f0f0f0',
                                padding: '10px',
                                borderRadius: '8px',
                                maxWidth: '98%',
                                wordWrap: 'break-word',
                              }}
                            >
                              {thinkContent && (
                                <ThoughtAccordion thinkContent={thinkContent} citations={chat.citations} />
                              )}
                              <ReactMarkdown
                                skipHtml={true}  // <-- new prop added here too
                                remarkPlugins={[remarkGfm]}
                                components={{
                                  text: ({ node, children }) => (
                                    <CustomText citations={chat.citations} children={children} />
                                  ),
                                }}
                              >
                                {remainingContent}
                              </ReactMarkdown>
                              {renderCitations(chat)}
                            </Box>
                          </ListItem>
                        );
                      } else {
                        return (
                          <ListItem
                            key={index}
                            sx={{
                              flexDirection: 'row-reverse',
                              justifyContent: 'flex-start',
                            }}
                          >
                            <Box
                              sx={{
                                backgroundColor: '#e0f7fa',
                                padding: '10px',
                                borderRadius: '8px',
                                maxWidth: '90%',
                                wordWrap: 'break-word',
                              }}
                            >
                              {chat.isImage ? (
                                <Box sx={{ maxWidth: 300 }}> {/* Adjust maxWidth as needed */}
                                  <img
                                    src={chat.content} // Assuming chat.content is base64 or URL
                                    alt="Uploaded"
                                    style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 8 }}
                                  />
                                  {chat.text && <Typography sx={{ mt: 1 }}>{chat.text}</Typography>}
                                </Box>
                              ) : (
                                <Typography variant="body1">{chat.content}</Typography>
                              )}
                            </Box>
                          </ListItem>
                        );
                      }
                    })}
                    {isResponseLoading && (
                      <ListItem sx={{ justifyContent: 'flex-start' }}>
                        <Skeleton variant="text" width={200} height={24} />
                      </ListItem>
                    )}
                  </List>
                </Box>

                {/* Input Box */}
                <Box
                  sx={{
                    width: '100%',
                    maxWidth: '700px',
                    borderRadius: '24px',
                    boxShadow: '0px 2px 10px rgba(0,0,0,0.1)',
                    backgroundColor: 'white',
                    padding: '8px 16px',
                    marginTop: chatMessages.length > 0 ? 'auto' : '0',
                    position: chatMessages.length > 0 ? 'sticky' : 'relative',
                    bottom: chatMessages.length > 0 ? '20px' : 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  {selectedImagePreview && (
                    <Paper elevation={1} sx={{ p: 1, mb: 1, borderRadius: 2, display: 'inline-block', maxWidth: '100%' }}>
                      <Box sx={{ position: 'relative', maxWidth: 50, maxHeight: 50, overflow: 'hidden' }}> {/* Reduced maxWidth and maxHeight */}
                        <img
                          src={selectedImagePreview}
                          alt="Image Preview"
                          style={{
                            display: 'block',
                            width: '50px',     // Fixed width
                            height: '50px',    // Fixed height
                            objectFit: 'cover' // Maintain aspect ratio and cover the container
                          }}
                        />
                         <IconButton
                          aria-label="cancel"
                          onClick={handleCancelImage}
                          sx={{
                            position: 'absolute',
                            top: -10,
                            right: -10,
                            color: 'error.main',
                            backgroundColor: 'background.paper',
                            '&:hover': {
                              backgroundColor: 'grey.100',
                            },
                          }}
                        >
                          <Icon>cancel</Icon>
                        </IconButton>
                      </Box>
                    </Paper>
                  )}
                  {/* Top Row: Text input and Send Button */}
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <TextField
                      fullWidth
                      placeholder="Ask anything or upload image..."
                      variant="standard"
                      multiline
                      minRows={1}
                      maxRows={4}
                      InputProps={{
                        disableUnderline: true,
                        style: { fontSize: '16px' },
                      }}
                      sx={{ marginBottom: '8px' }}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                    />
                     <IconButton color="secondary" onClick={handleImageUploadClick} aria-label="upload image" disabled={isResponseLoading}>
                        <ImageIcon />
                      </IconButton>
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        ref={fileInputRef}
                        onChange={handleImageSelect}
                        disabled={isResponseLoading}
                      />
                    <IconButton color="primary" onClick={handleSendMessage} disabled={(!message.trim() && !selectedImage) || isResponseLoading}>
                      <SendIcon />
                    </IconButton>
                  </Box>

                  {/* Bottom Row: Styled Selects */}
                  <Box sx={{ display: 'flex', justifyContent: 'flex-start', gap: '10px' }}>
                    <FormControl variant="standard">
                      <Select
                        value={selectedPatient ? selectedPatient.id : ''}
                        onChange={(e) => {
                          const patientId = e.target.value;
                          const patient = datalist.find((p) => p.id === patientId);
                          setSelectedPatient(patient);
                        }}
                        displayEmpty
                        sx={{
                          fontSize: '14px',
                          backgroundColor: '#1E90FF',
                          color: 'white',
                          borderRadius: '4px',
                          padding: '4px 12px',
                          '& .MuiSelect-icon': { color: 'white' },
                          '&:hover': { backgroundColor: '#187bcd' },
                        }}
                        renderValue={(selected) =>
                          selected
                            ? datalist.find((p) => p.id === selected)?.full_name || `Patient (${selected})`
                            : 'Choose Patient'
                        }
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
                    <FormControl variant="standard">
                      <Select
                        value={expertLevel}
                        onChange={(e) => setExpertLevel(e.target.value)}
                        disabled={isExpertLevelLocked || isResponseLoading}
                        sx={{
                          fontSize: '14px',
                          backgroundColor: '#F0F8FF',
                          color: '#1E90FF',
                          borderRadius: '4px',
                          padding: '4px 12px',
                          '& .MuiSelect-icon': { color: '#187bcd' },
                          '&:hover': { backgroundColor: 'white' },
                        }}
                      >

                      <MenuItem value="low">
                          <em>Expertise Level</em>
                        </MenuItem>
                        <MenuItem value="low" disabled={isExpertLevelLocked || isResponseLoading}>Basic $0.0</MenuItem>
                        <MenuItem value="medium" disabled={isExpertLevelLocked || isResponseLoading}>Intermediate $0.2</MenuItem>
                        <MenuItem value="high">Advanced $0.5</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                  {expertLevel === 'high' && (
                    <Typography variant="caption" color="textSecondary" sx={{ marginTop: '8px' }}>
                      Advanced responses might take a few minutes.
                    </Typography>
                  )}
                </Box>
              </Box>
            </Box>
          </Box>
        </ThemeProvider>
      </div>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default SearchBox;
