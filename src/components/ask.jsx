import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
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
  Icon,
  Tooltip,
  Menu,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper as MuiPaper
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Skeleton from '@mui/material/Skeleton';
import Sidebar from './sidebar';
import { useNavigate, useLocation } from 'react-router-dom';
import { getAccessToken } from './api';
import PatientProfileDisplay from './document';
import ImageIcon from '@mui/icons-material/Image';
import SwipeableDrawer from '@mui/material/SwipeableDrawer';
import ListItemText from '@mui/material/ListItemText';
import ListItemButton from '@mui/material/ListItemButton';
import ChatIcon from '@mui/icons-material/Chat';
import DeleteIcon from '@mui/icons-material/Delete';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { useTheme, useMediaQuery } from '@mui/material';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import MobileMessageInput from './ask/MobileMessageInput';
import SuggestionPanel from './ask/SuggestionPanel';
import ThreadPanel from './ask/ThreadPanel';
import ThoughtAccordion from './ask/ThoughtAccordion';
import CitationLink from './ask/CitationLink';
import FollowUpQuestionsPanel from './ask/FollowUpQuestionsPanel';
import PersonIcon from '@mui/icons-material/Person';

// ----------------------------------------------------
// Utility: preprocess citations in markdown
// ----------------------------------------------------
function preprocessCitations(markdown, citations) {
  if (!citations || citations.length === 0) return markdown;
  // Replace [n] with [n](url) if url exists
  return markdown.replace(/\[(\d+)\]/g, (match, number) => {
    const idx = parseInt(number, 10) - 1;
    if (citations[idx]) {
      return `[${number}](${citations[idx]})`;
    }
    return match;
  });
}

// ----------------------------------------------------
// CustomText: converts citation markers like [1], [2], etc. into clickable links.
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
          <Box component="span" sx={{ display: 'inline-block', mx: 0.5 }}>[
          <Link
            key={match.index}
            href={citations[citationIndex]}
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              color: '#1565c0',
              cursor: 'pointer',
              textDecoration: 'underline',
              fontWeight: 700,
              backgroundColor: 'rgba(21, 101, 192, 0.13)',
              borderRadius: '6px',
              px: '6px',
              mx: '3px',
              fontSize: '1em',
              boxShadow: '0 1px 4px rgba(21,101,192,0.10)',
              border: '1px solid #90caf9',
              transition: 'background 0.2s, box-shadow 0.2s',
              '&:hover': {
                backgroundColor: 'rgba(21, 101, 192, 0.22)',
                textDecoration: 'underline',
                boxShadow: '0 2px 8px rgba(21,101,192,0.18)',
              },
            }}
          >
            {citationNumber}
          </Link>
          ]</Box>
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

const getDomainFromUrl = (url) => {
  try {
    const domain = new URL(url);
    return domain.hostname.replace('www.', '');
  } catch (error) {
    return url; // Return the original URL if parsing fails
  }
};

const SearchBox = () => {
  const examplePlaceholders = [
    "What are the causes of chest pain?",
    "Interpret this X-ray image",
    "Suggest a diagnosis for persistent cough",
    "What does this skin rash indicate?",
    "Summarize the latest diabetes guidelines",
    "Upload a lab result and ask for interpretation",
    "What are the side effects of metformin?",
    "How to manage hypertension in pregnancy?"
  ];
  // Shuffle placeholders on component load
  const shuffledExamples = useMemo(() => {
    const arr = [...examplePlaceholders];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, []);
  const defaultPlaceholder = "Ask anything or upload image...";
  const [placeholder, setPlaceholder] = useState("");
  const [animating, setAnimating] = useState(true);

  useEffect(() => {
    let idx = 0;
    let charIdx = 0;
    let direction = 1; // 1: typing, -1: deleting
    let elapsed = 0;
    const interval = 50; // ms per character
    const maxTime = 15000; // 15 seconds
    let current = shuffledExamples[0];
    let timer;

    function animate() {
      if (elapsed >= maxTime) {
        setPlaceholder(defaultPlaceholder);
        setAnimating(false);
        return;
      }
      if (direction === 1) {
        // Typing
        setPlaceholder(current.slice(0, charIdx + 1));
        charIdx++;
        if (charIdx > current.length) {
          direction = -1;
          setTimeout(animate, 700); // Pause before deleting
          return;
        }
      } else {
        // Deleting
        setPlaceholder(current.slice(0, charIdx - 1));
        charIdx--;
        if (charIdx === 0) {
          direction = 1;
          idx = (idx + 1) % shuffledExamples.length;
          current = shuffledExamples[idx];
        }
      }
      elapsed += interval;
      timer = setTimeout(animate, interval);
    }
    animate();
    return () => clearTimeout(timer);
  }, [shuffledExamples]);

  const [message, setMessage] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [threadId, setThreadId] = useState(null);
  const [isSourcesVisible, setIsSourcesVisible] = useState(false);
  const [isResponseLoading, setIsResponseLoading] = useState(false);
  const [datalist, setDataList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expertLevel, setExpertLevel] = useState('basic');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('error');
  const [isSidebarMinimized, setIsSidebarMinimized] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedImagePreview, setSelectedImagePreview] = useState(null);
  const [isExpertLevelLocked, setIsExpertLevelLocked] = useState(false);
  const fileInputRef = useRef(null);
  const chatEndRef = useRef(null);
  const [threads, setThreads] = useState([]);
  const [selectedThread, setSelectedThread] = useState(null);
  const [isThreadPanelOpen, setIsThreadPanelOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [isLoadingThreadMessages, setIsLoadingThreadMessages] = useState(false);
  const [isDesktopThreadPanelOpen, setIsDesktopThreadPanelOpen] = useState(false);

  // New state for suggested questions
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState([]);

  // New state for follow-up questions
  const [followUpQuestions, setFollowUpQuestions] = useState([]);
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [isLoadingFollowUp, setIsLoadingFollowUp] = useState(false);

  // Initialize expandedCategories with the first two categories when suggestions are loaded
  useEffect(() => {
    if (suggestions.length > 0) {
      const initialCategories = suggestions.map(cat => cat.category_name);
      setExpandedCategories(initialCategories);
    }
  }, [suggestions]);

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

      setExpertLevel('advanced'); // Automatically set to advanced on image upload
      setIsExpertLevelLocked(true); // Lock the dropdown
    } else {
      setSelectedImage(null);
      setSelectedImagePreview(null);
      setIsExpertLevelLocked(false);
      setExpertLevel('basic'); // Reset to default if image selection is cancelled
    }
  };

  const handleCancelImage = () => {
    setSelectedImage(null);
    setSelectedImagePreview(null);
    setIsExpertLevelLocked(false);
    setExpertLevel('basic');
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

      let payload = { expertise_level: expertLevel === 'basic' ? 'medium' : 'high' };
      if (window.location.search.includes('retry=true')) {
        payload.retry = true;
      }
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
        id: `query-${Date.now()}` // Add unique id to each user message
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

      let assistantMessage = { 
        role: "assistant", 
        content: "", 
        citations: [], 
        queryId: userMessage.id // Link to the parent query
      };
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
    // Prevent selecting a thread that no longer exists
    const stillExists = threads.find(t => t.id === thread.id);
    if (!stillExists) return;
    setSelectedThread(thread);
    setThreadId(thread.id);
    // Auto-select patient if present and not null
    if (thread.patient) {
      // patient may be an id or object; try to find in datalist
      const patientObj = datalist.find(p => p.id === thread.patient || p.id === thread.patient?.id);
      if (patientObj) {
        setSelectedPatient(patientObj);
      }
    }
    fetchThreadMessages(thread.id);
    if (isMobile) {
      setIsThreadPanelOpen(false);
    }
  }, [isMobile, fetchThreadMessages, datalist, threads]);

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
        setChatMessages([]); // Clear chat messages if deleted thread was selected
      }
      showSnackbar('Thread deleted successfully', 'success');
      refreshThreads(); // Refresh thread list after deletion
    } catch (error) {
      showSnackbar('Failed to delete thread', 'error');
    }
  }, [threads, selectedThread, showSnackbar, refreshThreads]);

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

  // Fetch suggested questions
  const fetchSuggestions = useCallback(async () => {
    try {
      const token = await getAccessToken();
      if (!token) return;
      
      const payload = {
        user_type: "doctor"
      };
      
      // Add patient_id only if a patient is selected
      if (selectedPatient) {
        payload.patient_id = selectedPatient.id;
      }
      
      const response = await fetch('https://health.prestigedelta.com/suggestions/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch suggestions');
      }
      
      const data = await response.json();
      setSuggestions(data);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    }
  }, [selectedPatient]);

  // Preload suggestions on mount or when selected patient changes
  useEffect(() => {
    fetchSuggestions();
  }, [selectedPatient, fetchSuggestions]);

  // Handle category expand/collapse
  const toggleCategory = (categoryName) => {
    setExpandedCategories(prev => {
      if (prev.includes(categoryName)) {
        return prev.filter(name => name !== categoryName);
      } else {
        return [...prev, categoryName];
      }
    });
  };

  // Handle question click
  const handleQuestionClick = (question) => {
    setMessage(question);
    setShowSuggestions(false);
  };

  // Helper: Get all user questions in the thread
  const getAskedQuestions = () => chatMessages.filter(m => m.role === 'user').map(m => m.content);

  // Fetch follow-up questions after sending a message
  const fetchFollowUpQuestions = useCallback(async () => {
    // Do NOT turn off follow-up panel while loading
    // Only avoid the fetch operation if currently loading a response
    if (isResponseLoading) {
      return; // Just return without changing showFollowUp state
    }

    setIsLoadingFollowUp(true);
    const asked_questions = getAskedQuestions();
    if (asked_questions.length === 0) {
      setIsLoadingFollowUp(false);
      setShowFollowUp(false); // Hide only if there are no questions at all
      return;
    }
    try {
      const token = await getAccessToken();
      const payload = {
        asked_questions,
        user_type: 'doctor',
        // Conditionally add patient_id only if a patient is selected
        ...(selectedPatient ? { patient_id: selectedPatient.id } : {})
      };
      const response = await fetch('https://health.prestigedelta.com/followupquestions/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        // Don't show error, just don't display follow-ups if fetch fails
        setFollowUpQuestions([]);
        // Keep the panel visible with a "no questions available" state instead of hiding
        setIsLoadingFollowUp(false);
        return;
      }
      const data = await response.json();
      setFollowUpQuestions(data.questions || []);
      // Keep the panel visible even if no questions are returned
      // This will show an empty state or "no questions available" message
    } catch (e) {
      console.error("Error fetching follow-up questions:", e);
      setFollowUpQuestions([]);
      // Don't hide the panel on error, show an error state instead
    } finally {
      setIsLoadingFollowUp(false);
    }
  }, [chatMessages, selectedPatient, isResponseLoading]);

  // When a response finishes, trigger follow-up fetch and show panel
  useEffect(() => {
    // Only run when a new assistant message is added and not loading
    if (
      chatMessages.length > 0 &&
      !isResponseLoading &&
      chatMessages[chatMessages.length - 1].role === 'assistant'
    ) {
      setShowFollowUp(true); // Show the follow-up panel immediately
      fetchFollowUpQuestions(); // Fetch follow-up questions
    }
    // Only hide follow-up if no messages (not when loading)
    if (chatMessages.length === 0) {
      setShowFollowUp(false);
      setFollowUpQuestions([]);
    }
  }, [chatMessages, isResponseLoading, fetchFollowUpQuestions]);

  // Scroll to bottom effect
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages]); // Scroll when messages change

  const renderers = {
    table: ({ children }) => (
      <TableContainer component={MuiPaper} sx={{ my: 2, borderRadius: 2, boxShadow: 1 }}>
        <Table size="small" sx={{ minWidth: 300 }}>
          {children}
        </Table>
      </TableContainer>
    ),
    thead: ({ children }) => <TableHead>{children}</TableHead>,
    tbody: ({ children }) => <TableBody>{children}</TableBody>,
    tr: ({ children }) => <TableRow>{children}</TableRow>,
    th: ({ children }) => <TableCell sx={{ fontWeight: 700, background: '#e3f2fd', color: '#1976d2' }}>{children}</TableCell>,
    td: ({ children }) => <TableCell>{children}</TableCell>,
  };

  return (
    <div className="dashboard-container" style={{ margin: isMobile ? 0 : undefined, padding: isMobile ? 0 : undefined }}>
      <Sidebar
        onToggleSidebar={(minimized) => setIsSidebarMinimized(minimized)}
        onNavigate={(path) => navigate(path)}
        onLogout={handleLogout}
      />
      
      {/* Main content area - Adjust margin based on sidebar AND thread panel state */}
      <div 
        className={`flex-1 transition-all duration-300`} 
        style={{
          marginLeft: isMobile ? 0 : 
            (isSidebarMinimized ? 
              (isDesktopThreadPanelOpen ? `calc(4rem + 320px)` : `4rem`) : // Sidebar minimized: add space for thread panel
              (isDesktopThreadPanelOpen ? `calc(16rem + 320px)` : `16rem`) // Sidebar expanded
            ),
          transition: theme.transitions.create('margin-left', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        }}
      >
        <ThemeProvider theme={theme}>
          <Box 
            sx={{ 
              display: 'flex', 
              height: '100vh',
              width: '100%',
              position: 'relative', // Needed for positioning the toggle button
              [theme.breakpoints.down('md')]: {
                marginLeft: 0,
                padding: 0
              }
            }}
          >
            {/* Desktop Thread Panel - Render outside the main content flow for animation */}
            {!isMobile && (
              <>
                <Box sx={{ 
                  position: 'fixed',
                  left: isSidebarMinimized ? '4rem' : '16rem',
                  top: 0,
                  height: '100vh',
                  zIndex: 1200,
                  transition: theme.transitions.create('left', {
                    easing: theme.transitions.easing.sharp,
                    duration: theme.transitions.duration.enteringScreen,
                  }),
                }}>
                  <ThreadPanel
                    threads={threads}
                    selectedThread={selectedThread}
                    onSelectThread={handleSelectThread}
                    onDeleteThread={handleDeleteThread}
                    onNewChat={handleNewChat}
                    isMobile={false}
                    showPanel={isDesktopThreadPanelOpen}
                    onTogglePanel={() => setIsDesktopThreadPanelOpen(v => !v)}
                  />
                </Box>
                {/* Floating button to open thread panel when closed */}
                {!isDesktopThreadPanelOpen && (
                  <Box
                    sx={{
                      position: 'fixed',
                      top: 40,
                      left: isSidebarMinimized ? 80 : 260,
                      zIndex: 1301,
                      transition: theme.transitions.create('left', {
                        easing: theme.transitions.easing.sharp,
                        duration: theme.transitions.duration.enteringScreen,
                      }),
                    }}
                  >
                    <IconButton
                      onClick={() => setIsDesktopThreadPanelOpen(true)}
                      sx={{
                        backgroundColor: 'white',
                        border: '1px solid #e3e8ee',
                        boxShadow: 2,
                        '&:hover': { backgroundColor: '#f5f5f5' },
                        width: 36,
                        height: 36,
                      }}
                    >
                      <ChatIcon />
                    </IconButton>
                  </Box>
                )}
              </>
            )}

            {/* Main Chat Area - Takes remaining space */}
            <Box 
              sx={{ 
                flex: 1, 
                display: 'flex', 
                flexDirection: 'column',
                width: '100%', // Ensure it tries to take full width initially
                // No padding here, handled within the content box
              }}
            >
              {/* Mobile Thread Panel Button & Drawer */}
              {isMobile && (
                <IconButton
                  onClick={() => setIsThreadPanelOpen((prev) => !prev)}
                  sx={{ 
                    position: 'absolute', 
                    top: 16, 
                    left: 16, 
                    zIndex: theme.zIndex.drawer + 1, // Above drawer backdrop
                    backgroundColor: 'white',
                    '&:hover': { backgroundColor: '#f5f5f5' }
                  }}
                >
                  <ChatIcon />
                </IconButton>
              )}
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
                    setIsThreadPanelOpen(false); // Close drawer on selection
                  }}
                  onDeleteThread={handleDeleteThread}
                  onNewChat={() => {
                    handleNewChat();
                    setIsThreadPanelOpen(false); // Close drawer on new chat
                  }}
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
                  padding: { xs: '0', md: '20px' }, // Keep vertical padding
                  backgroundColor: '#f5f5f5', // Keep light grey background
                  justifyContent: (chatMessages.length > 0 || showSuggestions) ? 'flex-start' : 'center', 
                }}
              >
                {/* ... rest of the chat content ... */}
                <Typography
                  variant="h5"
                  align="center"
                  mb={2}
                  sx={{
                    fontWeight: 700, // Bolder
                    color: 'transparent', // Make text transparent
                    background: 'linear-gradient(45deg, #1976d2 30%, #2196f3 90%)', // Blue gradient
                    backgroundClip: 'text', // Clip background to text
                    WebkitBackgroundClip: 'text', // For Safari
                    letterSpacing: 0.5, // Slightly more spacing
                    marginTop: (chatMessages.length > 0 || showSuggestions) ? '20px' : '0',
                    py: 1, // Adjust vertical padding if needed
                    width: 'fit-content', // Fit to content width
                    px: 3, // Add horizontal padding for effect
                  }}
                >
                  Ask Dr House AI
                </Typography>

                {/* Suggestion Panel */} 
                {showSuggestions && (
                  <Box sx={{ width: '100%', maxWidth: 700, maxHeight: '60vh', overflowY: 'auto', mb: 2, bgcolor: 'white', borderRadius: 3, boxShadow: '0 2px 12px rgba(33,150,243,0.07)' }}>
                    <SuggestionPanel 
                      suggestions={suggestions}
                      expandedCategories={expandedCategories}
                      toggleCategory={toggleCategory}
                      handleQuestionClick={handleQuestionClick}
                    />
                  </Box>
                )}

                {/* Chat Messages List */}
                <Box
                  ref={chatEndRef} // Add ref here
                  sx={{
                    overflowY: 'auto',
                    width: '100%',
                    maxWidth: '840px',
                    flexGrow: (chatMessages.length > 0 || showSuggestions) ? 1 : 0, 
                    mb: 2,
                    px: { xs: 2, md: 0 }, // Add horizontal padding for mobile
                  }}
                >
                  <List>
                    {chatMessages.map((chat, index) => {
                      // ... existing user/assistant message rendering ...
                      if (chat.role === 'assistant') {
                        const { thinkContent, remainingContent } = extractThinkContent(chat.content);
                        return (
                          <ListItem
                            key={index}
                            sx={{
                              flexDirection: 'row',
                              justifyContent: 'flex-start',
                              background: 'none',
                              border: 'none',
                              boxShadow: 'none',
                              p: 0,
                              mb: 2, // Add margin between messages
                            }}
                          >
                            <Paper
                              elevation={0} // Use elevation 0 and control shadow/border manually
                              sx={{
                                p: { xs: 1.5, sm: 2 }, // Adjust padding
                                borderRadius: '20px 20px 20px 4px', // Match assistant bubble style
                                background: 'linear-gradient(135deg, #f8fafc 0%, #e3f2fd 100%)', // Softer gradient
                                boxShadow: '0 1px 3px rgba(0,0,0,0.05)', // Subtle shadow
                                maxWidth: '95%', // Slightly adjust max width
                                width: 'fit-content', // Fit content width
                                position: 'relative',
                                overflow: 'visible',
                                border: '1px solid #e0e0e0', // Lighter border
                                transition: 'box-shadow 0.2s',
                                '&:hover': { boxShadow: '0 2px 6px rgba(33, 150, 243, 0.1)' }, // Subtle hover shadow
                              }}
                            >
                              {thinkContent && (
                                <ThoughtAccordion thinkContent={preprocessCitations(thinkContent, chat.citations)} citations={chat.citations} />
                              )}
                              <ReactMarkdown
                                skipHtml={true}
                                remarkPlugins={[remarkGfm]}
                                components={{ a: CitationLink, ...renderers }}
                              >
                                {preprocessCitations(remainingContent, chat.citations)}
                              </ReactMarkdown>
                              {renderCitations(chat)}
                            </Paper>
                          </ListItem>
                        );
                      } else {
                        // User message styling
                        return (
                          <ListItem
                            key={index}
                            sx={{
                              flexDirection: 'row',
                              justifyContent: 'flex-end', // Align user messages to the right
                              p: 0,
                              mb: 2, // Add margin between messages
                            }}
                          >
                            <Box
                              sx={{
                                backgroundColor: '#e8f5e9', // Light green like doctor message in PatientMessages
                                padding: { xs: '10px 14px', sm: '12px 16px' }, // Adjust padding
                                borderRadius: '20px 4px 20px 20px', // Match doctor bubble style
                                maxWidth: '85%', // Adjust max width
                                wordWrap: 'break-word',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.08)', // Subtle shadow
                                border: '1px solid #dcedc8', // Light green border
                              }}
                            >
                              {chat.isImage ? (
                                <Box sx={{ maxWidth: 300 }}>
                                  <img
                                    src={chat.content}
                                    alt="Uploaded"
                                    style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 8 }}
                                  />
                                  {chat.text && <Typography sx={{ mt: 1, color: '#333' }}>{chat.text}</Typography>}
                                </Box>
                              ) : (
                                <Typography variant="body1" sx={{ color: '#333' }}>{chat.content}</Typography> // Ensure text color is readable
                              )}
                            </Box>
                          </ListItem>
                        );
                      }
                    })}
                    {isResponseLoading && (
                      <ListItem sx={{ justifyContent: 'flex-start', p: 0, mb: 2 }}>
                        <Paper elevation={0} sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: '20px 20px 20px 4px', background: 'linear-gradient(135deg, #f8fafc 0%, #e3f2fd 100%)', border: '1px solid #e0e0e0', width: 'fit-content' }}>
                          <Skeleton animation="wave" height={20} width="80px" sx={{ mb: 1 }} />
                          <Skeleton animation="wave" height={20} width="150px" sx={{ mb: 1 }}/>
                          <Skeleton animation="wave" height={20} width="120px" />
                        </Paper>
                      </ListItem>
                    )}
                  </List>
                  {/* Follow-up Questions Panel - Conditionally render based on showFollowUp AND !isResponseLoading */}
                  {!isResponseLoading && showFollowUp && ( // Check !isResponseLoading here
                    <Box sx={{ width: '100%', maxWidth: 700, mx: 'auto', mb: 2 }}>
                      {isLoadingFollowUp ? (
                        <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
                          <CircularProgress size={24} />
                          <Typography variant="body2" sx={{ mt: 1 }}>Loading follow-up questions...</Typography>
                        </Box>
                      ) : followUpQuestions.length > 0 ? (
                        <FollowUpQuestionsPanel questions={followUpQuestions} onQuestionClick={setMessage} />
                      ) : (
                        null // Render nothing if no questions
                      )}
                    </Box>
                  )}
                </Box>

                {/* Input Box (Mobile and Desktop) - Positioned at the bottom */}
                {isMobile ? (
                  <MobileMessageInput
                    message={message}
                    setMessage={setMessage}
                    handleSendMessage={handleSendMessage}
                    isResponseLoading={isResponseLoading}
                    selectedImage={selectedImage}
                    selectedImagePreview={selectedImagePreview}
                    handleImageUploadClick={handleImageUploadClick}
                    handleImageSelect={handleImageSelect}
                    handleCancelImage={handleCancelImage}
                    expertLevel={expertLevel}
                    setExpertLevel={setExpertLevel}
                    isExpertLevelLocked={isExpertLevelLocked}
                    datalist={datalist}
                    selectedPatient={selectedPatient}
                    setSelectedPatient={setSelectedPatient}
                    placeholder={placeholder}
                  />
                ) : (
                  <Box
                    sx={{
                      width: '100%',
                      maxWidth: { xs: '100%', md: '700px' }, // Center input area
                      mx: 'auto', // Center horizontally
                      borderRadius: '999px', // Rounded pill shape
                      boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
                      background: 'linear-gradient(90deg, #f8fafc 80%, #e3f2fd 100%)',
                      p: 1,
                      mt: (chatMessages.length > 0 || showSuggestions) ? 'auto' : 0, 
                      mb: '20px', // Margin bottom
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 1,
                      zIndex: 10, // Ensure it's above chat content if overlapping
                    }}
                  >
                    {/* ... existing desktop input content ... */}
                    {selectedImagePreview && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pl: 1, mb: 1 }}>
                        <Paper elevation={1} sx={{
                          display: 'flex', alignItems: 'center', gap: 1, p: 0.5, borderRadius: 2, background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', maxWidth: 120, position: 'relative',
                        }}>
                          <img
                            src={selectedImagePreview}
                            alt="Preview"
                            style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6 }}
                          />
                          <IconButton
                            aria-label="Remove image"
                            onClick={handleCancelImage}
                            size="medium"
                            sx={{
                              color: 'error.main',
                              backgroundColor: 'rgba(244,67,54,0.08)',
                              ml: 0.5,
                              '&:hover': { backgroundColor: 'rgba(244,67,54,0.18)' },
                              borderRadius: 1.5,
                              p: 0.5,
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Paper>
                      </Box>
                    )}
                    {/* Top Row: Input and Send Button */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 1 }}>
                      {/* Attach file button */}
                      <IconButton
                        color="primary"
                        onClick={handleImageUploadClick}
                        aria-label="attach file"
                        disabled={isResponseLoading}
                        sx={{
                          width: 36, height: 36, borderRadius: '50%', background: '#f0f4f8', color: '#1976d2', boxShadow: 'none', transition: 'background 0.2s', '&:hover': { background: '#e3f2fd' }, flexShrink: 0,
                        }}
                      >
                        <AttachFileIcon sx={{ fontSize: 20 }} />
                      </IconButton>
                      <input
                        type="file" accept="image/*" style={{ display: 'none' }} ref={fileInputRef} onChange={handleImageSelect} disabled={isResponseLoading}
                      />
                      <TextField
                        fullWidth
                        placeholder={placeholder}
                        variant="standard"
                        multiline
                        minRows={1}
                        maxRows={4}
                        InputProps={{
                          disableUnderline: true,
                          style: { fontSize: '15px', background: 'none', borderRadius: '999px', paddingLeft: 10, paddingRight: 10 },
                        }}
                        sx={{
                          background: 'none', borderRadius: '999px', boxShadow: 'none', mx: 0.5, my: 0, minHeight: 38, '& textarea': { padding: 0, lineHeight: 1.6 },
                        }}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                      />
                      <IconButton
                        color="primary"
                        onClick={handleSendMessage}
                        disabled={(!message.trim() && !selectedImage) || isResponseLoading}
                        sx={{
                          width: 36, height: 36, borderRadius: '50%', background: '#1976d2', color: 'white', ml: 0.5, boxShadow: 'none', '&:hover': { background: '#125ea2' }, flexShrink: 0,
                        }}
                      >
                        {isResponseLoading ? <CircularProgress size={22} sx={{ color: 'white' }} /> : <SendIcon sx={{ fontSize: 20 }} />}
                      </IconButton>
                    </Box>
                    {/* Bottom Row: Selects and Suggestions Toggle */}
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-start', gap: 1, alignItems: 'center', pl: 1, pb: 0.5 }}>
                       {/* Suggestions toggle button */}
                       <IconButton
                        color={(showSuggestions || (showFollowUp && !isResponseLoading)) ? "primary" : "default"} // Only primary if follow-ups are actually shown
                        onClick={() => {
                          if (chatMessages.length === 0) { setShowSuggestions(!showSuggestions); } else { setShowFollowUp(!showFollowUp); }
                        }}
                        aria-label="show suggestions/follow-ups"
                        size="small" // Make smaller
                        disabled={isResponseLoading} // Disable toggle while loading
                        sx={{
                          backgroundColor: (showSuggestions || (showFollowUp && !isResponseLoading)) ? 'rgba(25, 118, 210, 0.1)' : 'transparent',
                          padding: '6px', // Adjust padding
                          '&:hover': { backgroundColor: (showSuggestions || (showFollowUp && !isResponseLoading)) ? 'rgba(25, 118, 210, 0.2)' : 'rgba(0, 0, 0, 0.04)' }
                        }}
                      >
                        <LightbulbIcon fontSize="small" />
                      </IconButton>
                      {/* Patient Select */}
                      <FormControl variant="standard" sx={{ minWidth: 90, mr: 0.5, '.MuiOutlinedInput-root': { borderRadius: '999px', background: '#f0f4f8', height: 32, pl: 0.5, pr: 1, fontSize: 13, boxShadow: 'none' } }} size="small">
                        <Select
                          value={selectedPatient ? selectedPatient.id : ''}
                          onChange={(e) => {
                            const patientId = e.target.value;
                            const patient = datalist.find((p) => p.id === patientId);
                            setSelectedPatient(patient || null);
                          }}
                          displayEmpty
                          startAdornment={<PersonIcon sx={{ color: '#1976d2', fontSize: 16, mr: 0.5, ml: 1 }} />} // Icon inside
                          renderValue={(selected) =>
                            selected
                              ? (datalist.find((p) => p.id === selected)?.full_name?.split(' ')[0] || `Patient`)
                              : 'Patient'
                          }
                          sx={{
                            borderRadius: '999px', fontSize: 13, color: '#1976d2', fontWeight: 500, minWidth: 70, height: 32, pl: 0, pr: 0, background: '#f0f4f8', boxShadow: 'none', '.MuiSelect-icon': { color: '#1976d2', fontSize: 18 },
                          }}
                          MenuProps={{ PaperProps: { style: { zIndex: 1302 } } }} // Ensure dropdown is above other elements
                        >
                          <MenuItem value=""><em>Choose Patient</em></MenuItem>
                          {datalist.map((patient) => (
                            <MenuItem key={patient.id} value={patient.id}>
                              {patient.full_name ? `${patient.full_name} (${patient.id})` : `Patient (${patient.id})`}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      {/* Expertise Select */}
                      <FormControl variant="standard" sx={{ minWidth: 90, '.MuiOutlinedInput-root': { borderRadius: '999px', background: '#f0f4f8', height: 32, pl: 0.5, pr: 1, fontSize: 13, boxShadow: 'none' } }} size="small">
                        <Select
                          value={expertLevel}
                          onChange={(e) => setExpertLevel(e.target.value)}
                          disabled={isExpertLevelLocked || isResponseLoading}
                          displayEmpty // Allows showing placeholder
                          renderValue={(selected) => {
                            if (selected === 'basic') return 'Basic';
                            if (selected === 'advanced') return 'Advanced';
                            return 'Expertise'; // Placeholder if needed
                          }}
                          sx={{
                            borderRadius: '999px', fontSize: 13, color: '#1976d2', fontWeight: 500, minWidth: 70, height: 32, pl: 1, pr: 0, background: '#f0f4f8', boxShadow: 'none', '.MuiSelect-icon': { color: '#1976d2', fontSize: 18 },
                          }}
                          MenuProps={{ PaperProps: { style: { zIndex: 1302 } } }} // Ensure dropdown is above other elements
                        >
                          <MenuItem value="basic" disabled={isExpertLevelLocked || isResponseLoading}>Basic $0.1</MenuItem>
                          <MenuItem value="advanced">Advanced $0.5</MenuItem>
                        </Select>
                      </FormControl>
                    </Box>
                    {expertLevel === 'advanced' && (
                      <Typography variant="caption" color="textSecondary" sx={{ pl: 1.5, pt: 0.5 }}>
                        Advanced responses might take a few minutes.
                      </Typography>
                    )}
                  </Box>
                )}
              </Box>
            </Box>
          </Box>
        </ThemeProvider>
      </div>

      {/* Snackbar */} 
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
