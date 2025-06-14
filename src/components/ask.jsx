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
  Tooltip, // Added Tooltip
  Menu,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper as MuiPaper,
  Dialog,
  DialogContent
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ShareIcon from '@mui/icons-material/Share'; // Added ShareIcon
import WhatsAppIcon from '@mui/icons-material/WhatsApp'; // Added WhatsAppIcon
import TwitterIcon from '@mui/icons-material/Twitter'; // Added TwitterIcon (for X)
import LinkedInIcon from '@mui/icons-material/LinkedIn'; // Added LinkedInIcon
import RedditIcon from '@mui/icons-material/Reddit'; // Added RedditIcon
import ContentCopyIcon from '@mui/icons-material/ContentCopy'; // Added ContentCopyIcon
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Skeleton from '@mui/material/Skeleton';
import Sidebar from './sidebar';
import { useNavigate, useLocation } from 'react-router-dom';
import { getAccessToken, balanceCheck, isAuthenticated } from './api';
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
import FollowUpQuestionsPanel from './ask/FollowUpQuestionsPanel';
import ThoughtAccordion from './ask/ThoughtAccordion';
import ThreadPanel from './ask/ThreadPanel';
import CitationLink from './ask/CitationLink';
import BuyCreditsModal from './BuyCreditsModal';
import PersonIcon from '@mui/icons-material/Person';
import DownloadIcon from '@mui/icons-material/Download';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import InfoIcon from '@mui/icons-material/Info';
import WarningIcon from '@mui/icons-material/Warning';
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
  const [expandedImage, setExpandedImage] = useState(null);

  // New state for suggested questions
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState([]);

  // State for share menu
  const [shareMenuAnchorEl, setShareMenuAnchorEl] = useState(null);
  const openShareMenu = Boolean(shareMenuAnchorEl);

  // Share menu handler functions
  const handleShareMenuOpen = (event) => {
    setShareMenuAnchorEl(event.currentTarget);
  };

  const handleShareMenuClose = () => {
    setShareMenuAnchorEl(null);
  };
  const handleCopyLink = () => {
    // Get the current URL for sharing
    const shareUrl = window.location.href;
    
    // Copy to clipboard
    navigator.clipboard.writeText(shareUrl)
      .then(() => {
        showSnackbar('Link copied to clipboard!', 'success');
        handleShareMenuClose();
      })
      .catch(err => {
        console.error('Failed to copy link: ', err);
        showSnackbar('Failed to copy link', 'error');
      });
  };

  // Social media share functions
  const handleShareToWhatsApp = () => {
    const shareUrl = encodeURIComponent(window.location.href);
    window.open(`https://wa.me/?text=${shareUrl}`, '_blank');
    handleShareMenuClose();
  };

  const handleShareToTwitter = () => {
    const shareUrl = encodeURIComponent(window.location.href);
    const text = encodeURIComponent('Check out this interesting conversation on Dr. House AI:');
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${shareUrl}`, '_blank');
    handleShareMenuClose();
  };

  const handleShareToLinkedIn = () => {
    const shareUrl = encodeURIComponent(window.location.href);
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`, '_blank');
    handleShareMenuClose();
  };
  const handleShareToReddit = () => {
    const shareUrl = encodeURIComponent(window.location.href);
    const title = encodeURIComponent('Interesting conversation on Dr. House AI');
    window.open(`https://www.reddit.com/submit?url=${shareUrl}&title=${title}`, '_blank');
    handleShareMenuClose();
  };

  // Track if the user is authenticated
  const [isUserAuthenticated, setIsUserAuthenticated] = useState(false);
  // Track if this is a public thread
  const [isPublicThread, setIsPublicThread] = useState(false);
  // Store all messages (user + assistant) to send in requests for unauthenticated users
  const [threadMessages, setThreadMessages] = useState([]);  // Add useEffect to check authentication status on component mount and path changes
  useEffect(() => {
    // Use our improved authentication checking function
    const checkAuthStatus = async () => {
      // Determine authentication status via token
      let authStatus = false;
      try {
        const token = await getAccessToken();
        authStatus = !!token;
      } catch (e) {
        console.error("Error fetching access token:", e);
      }
      const previousStatus = isUserAuthenticated;
      setIsUserAuthenticated(authStatus);
      if (previousStatus !== authStatus) {
        console.log("Authentication status changed:", authStatus ? "Authenticated" : "Not authenticated");
      }
      // Determine thread type
      const pathParts = location.pathname.split('/');
      const currentPath = pathParts[1];
      const hasThreadId = pathParts.length > 2 && !!pathParts[2];
      const isPublic = (currentPath === 'public-research') || (!authStatus && hasThreadId);
      setIsPublicThread(isPublic);
    };
    checkAuthStatus();
    const handleStorageChange = (e) => {
      if (e.key === 'user-info' || e.key === 'access-token') checkAuthStatus();
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [location.pathname, isUserAuthenticated]);

  // Track if the user is authenticated and whether this is a public thread
  useEffect(() => {
    const checkAuth = async () => {
      let token = null;
      try {
        token = await getAccessToken();
      } catch (e) {
        console.error('Error fetching access token:', e);
      }
      const authStatus = !!token;
      setIsUserAuthenticated(authStatus);
      // Determine public thread status
      const pathParts = location.pathname.split('/');
      const currentPath = pathParts[1]; // 'ask' or 'public-research'
      const hasThreadId = pathParts.length > 2 && !!pathParts[2];
      const isPublic = (currentPath === 'public-research') || (!authStatus && hasThreadId);
      setIsPublicThread(isPublic);
      console.log('Auth status:', authStatus, 'Public thread:', isPublic);
    };
    checkAuth();
    // Listen for changes in other tabs
    const handleStorage = (e) => {
      if (e.key === 'access-token' || e.key === 'user-info') {
        checkAuth();
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [location.pathname]);

  // New state for follow-up questions
  const [followUpQuestions, setFollowUpQuestions] = useState([]);
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [isLoadingFollowUp, setIsLoadingFollowUp] = useState(false);

  // Add state for uploaded image URL and loading
  const [uploadedImageUrl, setUploadedImage] = useState(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // New state for buy credits modal
  const [buyCreditsModalOpen, setBuyCreditsModalOpen] = useState(false);
  const [buyCreditsBalance, setBuyCreditsBalance] = useState(null);
  const [buyCreditsRequiredAmount, setBuyCreditsRequiredAmount] = useState(null);

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

  const handleImageSelect = async (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedImage(file);
      setUploadedImage(null); // Reset previous upload
      setIsUploadingImage(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImagePreview(reader.result); // Set image preview URL
      };
      reader.readAsDataURL(file);
      setExpertLevel('advanced');
      setIsExpertLevelLocked(true);
      // Upload image to server
      try {
        const token = await getAccessToken();
        const formData = new FormData();
        formData.append('image', file);
        const response = await fetch('https://service.prestigedelta.com/research/upload-image/', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        });
        if (!response.ok) throw new Error('Image upload failed');
        const data = await response.json();
        setUploadedImage(data.image_url);
      } catch (e) {
        setUploadedImage(null);
        showSnackbar('Image upload failed. Please try again.', 'error');
      } finally {
        setIsUploadingImage(false);
      }
    } else {
      setSelectedImage(null);
      setSelectedImagePreview(null);
      setUploadedImage(null);
      setIsExpertLevelLocked(false);
      setExpertLevel('basic');
    }
  };

  const handleCancelImage = () => {
    setSelectedImage(null);
    setSelectedImagePreview(null);
    setUploadedImage(null);
    setIsExpertLevelLocked(false);
    setExpertLevel('basic');
  };

  // In refreshThreads, set threadId and selectedThread using public_id
  const refreshThreads = useCallback(async () => {
    try {
      const token = await getAccessToken();
      const response = await fetch('https://service.prestigedelta.com/research/', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch threads');
      const data = await response.json();
      setThreads(data);
      if (threadId) {
        // Find by public_id if available, fallback to id
        const currentThreadFromServer = data.find(t => String(t.public_id || t.id) === String(threadId));
        if (currentThreadFromServer) {
          setSelectedThread(currentThreadFromServer);
        } else if (String(threadId).startsWith('temp-') || !currentThreadFromServer) {
          if (data.length > 0) {
            const newestThread = data[0];
            setThreadId(newestThread.public_id || newestThread.id);
            setSelectedThread(newestThread);
          }
        }
      }
    } catch (error) {
      console.error('Error refreshing threads:', error);
    }
  }, [threadId]);
  const handleSendMessage = useCallback(async () => {
    // Require text if image is present
    if ((selectedImage || uploadedImageUrl) && !message.trim()) return;
    if (!message.trim() && !selectedImage && !uploadedImageUrl) return;

    const currentMessage = message;
    setMessage("");
    setIsResponseLoading(true);
    setIsSourcesVisible(false);

    // Get the current thread ID (real or temporary)
    const currentThreadId = threadId;
    
    // Track if this is a new conversation with a temporary ID
    const isTemporaryThread = currentThreadId && String(currentThreadId).startsWith('temp-');

    // Only create a temporary thread if authenticated and no thread ID exists
    if (isUserAuthenticated && !currentThreadId) {
      const tempId = `temp-${Date.now()}`; // new temporary id
      const tempThread = {
        id: tempId,
        public_id: tempId,
        created_at: new Date().toISOString(),
        messages: [{
          role: 'user',
          content: selectedImagePreview || currentMessage
        }]
      };
      setThreadId(tempId); // <-- new: update threadId state
      setThreads(prev => [tempThread, ...prev]);
      setSelectedThread(tempThread);
    }    try {
      // Define API URL based on authentication status and thread type
      let apiUrl;
      let headers = {};
      let payload = { expertise_level: expertLevel === 'basic' ? 'medium' : 'high' };
      
      if (isUserAuthenticated) {
        // Authenticated user flow
        const token = await getAccessToken();
        headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        };
        
        apiUrl = "https://service.prestigedelta.com/research/";
        
        // Use perplexityThread if available from navigation state
        if (location.state?.perplexityThread) {
          payload.public_id = location.state.perplexityThread;
        } else if (currentThreadId && !isTemporaryThread) {
          payload.public_id = currentThreadId;
        } else if (selectedThread && selectedThread.public_id) {
          payload.public_id = selectedThread.public_id;
        } else if (selectedPatient) {
          // Only include patient_id if there's no real thread_id
          payload.patient_id = selectedPatient.id;
        }
        
        if (window.location.search.includes('retry=true')) {
          payload.retry = true;
        }
      } else {
        // Unauthenticated user flow
        headers = {
          'Content-Type': 'application/json'
        };        // For unauthenticated users with a public thread ID
        if (isPublicThread && currentThreadId) {
          // This is the API endpoint for public threads
          // The API endpoint is /public-research/ regardless of the URL path
          apiUrl = `https://service.prestigedelta.com/public-research/${currentThreadId}/continue/`;
          
          console.log("Using public research API endpoint:", apiUrl);
          
          // For follow-up messages, include all previous messages
          if (threadMessages.length > 0) {
            payload.messages = threadMessages.map(msg => ({
              role: msg.role,
              content: msg.content, 
              created_at: msg.created_at || new Date().toISOString()
            }));
          }
        } else {
          // Should not happen, but handle gracefully
          console.error("Unauthenticated user without public thread ID");
          showSnackbar('Cannot send message - please log in or use a shared link', 'error');
          setIsResponseLoading(false);
          return;
        }
      }
      
      let requestBody;

      const userMessageContent = uploadedImageUrl ? uploadedImageUrl : selectedImagePreview ? selectedImagePreview : currentMessage;
      const userTextMessage = uploadedImageUrl || selectedImage ? (currentMessage.trim() ? currentMessage : "Uploaded Image") : currentMessage;      const userMessage = {
        role: "user",
        content: userMessageContent,
        isImage: !!(uploadedImageUrl || selectedImagePreview), // Flag as image message
        text: userTextMessage, // Store text content separately for image messages
        id: `query-${Date.now()}`, // Add unique id to each user message
        created_at: new Date().toISOString() // Add timestamp for unauthenticated requests
      };
      
      // Update chat messages UI
      setChatMessages((prev) => [...prev, userMessage]);
      
      // For unauthenticated users, we need to track all messages for future requests
      if (!isUserAuthenticated) {
        setThreadMessages((prev) => [...prev, userMessage]);
      }if (uploadedImageUrl) {
        // Image uploads only supported for authenticated users
        if (!isUserAuthenticated) {
          showSnackbar('Image uploads require login', 'error');
          setIsResponseLoading(false);
          return;
        }
        
        // Send JSON body with image URL and caption
        payload.image = uploadedImageUrl;
        payload.caption = currentMessage;
        if (selectedPatient) payload.patient_id = selectedPatient.id;
        requestBody = JSON.stringify(payload);
      } else if (selectedImage) {
        // Should not happen, but fallback
        showSnackbar('Image not uploaded yet.', 'error');
        setIsResponseLoading(false);
        return;
      } else {
        // Both authenticated and unauthenticated users can send text queries
        payload.query = currentMessage;
        requestBody = JSON.stringify(payload);
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
      setUploadedImage(null);
      setIsExpertLevelLocked(false);      let assistantMessage = { 
        role: "assistant", 
        content: "", 
        citations: [], 
        queryId: userMessage.id, // Link to the parent query
        created_at: new Date().toISOString() // Add timestamp for unauthenticated requests
      };
      setChatMessages((prev) => [...prev, assistantMessage]);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;

      if (uploadedImageUrl) {
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
              (t.id === currentThreadId) ? { ...t, id: newThreadId } : t
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
          
          // For unauthenticated users, track messages for future requests
          if (!isUserAuthenticated) {
            setThreadMessages(prev => {
              const updated = [...prev];
              // Replace the last message which should be the assistant's message
              if (updated.length > 0 && updated[updated.length - 1].role === 'assistant') {
                updated[updated.length - 1] = { ...assistantMessage };
              } else {
                updated.push({ ...assistantMessage });
              }
              return updated;
            });
          }
          // If we received a new thread ID, ensure it's properly saved
          if (newThreadId) {
            console.log("Thread ID after image processing:", newThreadId);
            // For authenticated users, update threads list & URL path
            if (isUserAuthenticated) {
              // Explicitly trigger a refresh to ensure state consistency
              setTimeout(() => refreshThreads(), 500);
              // Update the browser URL to /ask/{public_id}
              if (newThreadId !== location.pathname.split('/').pop()) {
                navigate(`/ask/${newThreadId}`, { replace: true });
              }
            } else if (isPublicThread) {
              // For unauthenticated users, update the URL to public path
              if (newThreadId !== location.pathname.split('/').pop()) {
                // App.js confirms /public-research/:public_id is the correct URL path for public threads
                navigate(`/public-research/${newThreadId}`, { replace: true });
              }
            }
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
                      (t.id === currentThreadId) ? { ...t, id: newThreadId } : t
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
                  
                  // For unauthenticated users, track messages for future requests
                  if (!isUserAuthenticated) {
                    setThreadMessages(prev => {
                      const updated = [...prev];
                      // Replace the last message which should be the assistant's message
                      if (updated.length > 0 && updated[updated.length - 1].role === 'assistant') {
                        updated[updated.length - 1] = { ...assistantMessage };
                      } else {
                        updated.push({ ...assistantMessage });
                      }
                      return updated;
                    });
                  }
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
          
          // For authenticated users, update threads list & URL path
          if (isUserAuthenticated) {
            // Explicitly trigger a refresh after small delay to ensure state consistency
            setTimeout(() => refreshThreads(), 500);
            // Update the browser URL to /ask/{public_id}
            if (newThreadId !== location.pathname.split('/').pop()) {
              navigate(`/ask/${newThreadId}`, { replace: true });
            }
          }          // For unauthenticated users, update the URL to public path
          else if (isPublicThread) {
            if (newThreadId !== location.pathname.split('/').pop()) {
              // App.js confirms this is the correct public URL path
              navigate(`/public-research/${newThreadId}`, { replace: true });
            }
          }
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
      // Balance check on error
      try {
        const expertiseLevel = expertLevel === 'basic' ? 'medium' : 'high';
        const balanceResult = await balanceCheck(expertiseLevel);
        if (balanceResult && balanceResult.sufficient_funds === false) {
          setBuyCreditsBalance(balanceResult);
          setBuyCreditsRequiredAmount(balanceResult.required_amount);
          setBuyCreditsModalOpen(true);
        }
      } catch (balanceError) {
        console.error('Error checking balance:', balanceError);
      }
    } finally {
      setIsResponseLoading(false);
    }
  }, [message, threadId, selectedPatient, expertLevel, showSnackbar, selectedImage, selectedImagePreview, uploadedImageUrl, isExpertLevelLocked, location.state, refreshThreads, selectedThread, isUserAuthenticated, isPublicThread, threadMessages, navigate]);

  const handleSourcesToggle = () => {
    setIsSourcesVisible((prev) => !prev);
  };

  useEffect(() => {
    const fetchData = async () => {
      const accessToken = await getAccessToken();
      if (!accessToken) return;

      try {
        const response = await fetch('https://service.prestigedelta.com/patientlist/', {
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
  };  const fetchThreadMessages = useCallback(async (threadId) => {
    setIsLoadingThreadMessages(true);
    try {
      const token = await getAccessToken();
      const response = await fetch(`https://service.prestigedelta.com/research/${threadId}/`, {
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
        citations: msg.citations || [],
        image: msg.image || null
      }));
      
      setChatMessages(formattedMessages);
    } catch (error) {
      console.error('Error fetching thread messages:', error);
      showSnackbar('Failed to load conversation messages', 'error');
    } finally {
      setIsLoadingThreadMessages(false);
    }  }, [showSnackbar]);
  // In handleSelectThread, set threadId to thread.public_id
  const handleSelectThread = useCallback((thread) => {
    const stillExists = threads.find(t => (t.public_id || t.id) === (thread.public_id || thread.id));
    if (!stillExists) return;
    setSelectedThread(thread);
    const publicId = thread.public_id || thread.id;
    setThreadId(publicId);
    
    // Navigate to the URL using public_id for user-facing URLs
    navigate(`/ask/${publicId}`, { replace: true });
    
    if (thread.patient) {
      const patientObj = datalist.find(p => p.id === thread.patient || p.id === thread.patient?.id);
      if (patientObj) setSelectedPatient(patientObj);
    }
    fetchThreadMessages(thread.id);
    if (isMobile) setIsThreadPanelOpen(false);
  }, [isMobile, fetchThreadMessages, datalist, threads, navigate]);

  const handleDeleteThread = useCallback(async (threadId) => {
    try {
      const token = await getAccessToken();
      await fetch(`https://service.prestigedelta.com/research/${threadId}/`, {
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
        const response = await fetch('https://service.prestigedelta.com/research/', {
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
    }    return null;
  }, [handleSourcesToggle, isSourcesVisible]);
  
  // Function to fetch suggested questions
  const fetchSuggestions = useCallback(async () => {
    try {
      const token = await getAccessToken();
      
      const payload = {
        user_type: "doctor"
      };
      
      // Add patient_id only if a patient is selected
      if (selectedPatient) {
        payload.patient_id = selectedPatient.id;
      }
      
      const response = await fetch('https://service.prestigedelta.com/suggestions/', {
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
      // Balance check on error
      try {
        const balanceResult = await balanceCheck('expert');
        if (balanceResult && balanceResult.sufficient_funds === false) {
          setBuyCreditsBalance(balanceResult);
          setBuyCreditsRequiredAmount(balanceResult.required_amount);
          setBuyCreditsModalOpen(true);
        }
      } catch (balanceError) {
        console.error('Error checking balance:', balanceError);
      }
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
      const response = await fetch('https://service.prestigedelta.com/followupquestions/', {
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
  
  // Add useEffect to extract public_id from URL and load the thread
  useEffect(() => {
    // Check if the current path matches /ask/{public_id}
    const pathParts = location.pathname.split('/');
    const urlPublicId = pathParts[2]; // Extract public_id from the URL
      if (urlPublicId && urlPublicId !== threadId) {
      console.log("Loading thread from URL:", urlPublicId);
      setThreadId(urlPublicId);
      
      // Check if the thread is already loaded in the threads list
      const found = threads.find(t => t.public_id === urlPublicId || t.id === urlPublicId);
      if (found) {
        // Select the thread if found
        setSelectedThread(found);
        fetchThreadMessages(found.id);
      } else if (threads.length > 0) {
        // If thread not found but threads are loaded, refresh threads to try to find it
        refreshThreads().then(() => {
          // After refreshing, check again for the thread
          const refreshedThread = threads.find(t => t.public_id === urlPublicId || t.id === urlPublicId);
          if (refreshedThread) {
            setSelectedThread(refreshedThread);
            fetchThreadMessages(refreshedThread.id);
          }
        });
      } else {
        // If threads aren't loaded yet, wait for them to load first
        // The thread will be loaded when threads are available
      }
    }
  }, [location.pathname, threadId, threads, fetchThreadMessages, refreshThreads, setThreadId, setSelectedThread]);

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
      {/* Only show sidebar for authenticated users */}
      {isUserAuthenticated && (
        <Sidebar
          onToggleSidebar={(minimized) => setIsSidebarMinimized(minimized)}
          onNavigate={(path) => navigate(path)}
          onLogout={handleLogout}
        />
      )}
      
      {/* Main content area - Adjust margin based on sidebar AND thread panel state */}      <div 
        className={`flex-1 transition-all duration-300`} 
        style={{
          marginLeft: !isUserAuthenticated ? 0 : // No margin if unauthenticated
            (isMobile ? 0 : 
              (isSidebarMinimized ? 
                (isDesktopThreadPanelOpen ? `calc(4rem + 320px)` : `4rem`) : // Sidebar minimized: add space for thread panel
                (isDesktopThreadPanelOpen ? `calc(16rem + 320px)` : `16rem`) // Sidebar expanded
              )
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
          >            {/* Desktop Thread Panel - Render outside the main content flow for animation, only for authenticated users */}
            {!isMobile && isUserAuthenticated && (
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
            >              {/* Mobile Thread Panel Button & Drawer - only for authenticated users */}
              {isMobile && isUserAuthenticated && (
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
                  <ChatIcon />                </IconButton>
              )}
              
              {/* SwipeableDrawer for thread panel - only for authenticated users */}
              {isUserAuthenticated && (
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
              )}

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
                {/* ... rest of the chat content ... */}                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: '840px' }}>
                  <Box sx={{ 
                    display: 'flex', 
                    flexDirection: 'row', 
                    alignItems: 'center',
                    justifyContent: 'center', /* Center the header content */
                    position: 'relative', /* For absolute positioning of icons */
                    width: '100%',
                    mb: 2,
                    mt: (chatMessages.length > 0 || showSuggestions) ? 3 : 0, /* Consistent margin top */
                    px: isMobile ? 6 : 2 /* Add padding on mobile to avoid menu button overlap */
                  }}>
                    {/* Left placeholder for mobile to balance the layout */}
                    {isMobile && isUserAuthenticated && (
                      <Box sx={{ width: 40 }} /> /* Width matches the menu IconButton */
                    )}
                    
                    <Typography
                      variant="h5"
                      sx={{
                        fontWeight: 700, // Bolder
                        color: 'transparent', // Make text transparent
                        background: 'linear-gradient(45deg, #1976d2 30%, #2196f3 90%)', // Blue gradient
                        backgroundClip: 'text', // Clip background to text
                        WebkitBackgroundClip: 'text', // For Safari
                        letterSpacing: 0.5, // Slightly more spacing
                        py: 1, // Adjust vertical padding if needed
                        textAlign: 'center', // Ensure text is centered
                      }}
                    >
                      Ask Dr House AI
                    </Typography>
                    
                    {/* Share Button - Only show when there are messages */}
                    {chatMessages.length > 0 && (
                      <Tooltip title="Share this conversation">
                        <IconButton 
                          onClick={handleShareMenuOpen}
                          sx={{ 
                            color: 'primary.main', 
                            bgcolor: 'rgba(25, 118, 210, 0.08)',
                            '&:hover': { bgcolor: 'rgba(25, 118, 210, 0.15)' },
                            position: isMobile ? 'absolute' : 'relative',
                            right: isMobile ? 0 : 'auto',
                          }}
                          aria-label="share conversation"
                          aria-controls={openShareMenu ? 'share-menu' : undefined}
                          aria-haspopup="true"
                          aria-expanded={openShareMenu ? 'true' : undefined}
                        >
                          <ShareIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                    
                    {/* Share Menu */}
                    <Menu
                      id="share-menu"
                      anchorEl={shareMenuAnchorEl}
                      open={openShareMenu}
                      onClose={handleShareMenuClose}
                      MenuListProps={{
                        'aria-labelledby': 'share-button',
                      }}
                      anchorOrigin={{
                        vertical: 'bottom',
                        horizontal: 'right',
                      }}
                      transformOrigin={{
                        vertical: 'top',
                        horizontal: 'right',
                      }}
                    >
                      <MenuItem onClick={handleCopyLink} dense>
                        <ContentCopyIcon fontSize="small" sx={{ mr: 1.5 }} />
                        Copy link
                      </MenuItem>
                      <MenuItem onClick={handleShareToWhatsApp} dense>
                        <WhatsAppIcon fontSize="small" sx={{ mr: 1.5, color: '#25D366' }} />
                        Share on WhatsApp
                      </MenuItem>
                      <MenuItem onClick={handleShareToTwitter} dense>
                        <TwitterIcon fontSize="small" sx={{ mr: 1.5, color: '#1DA1F2' }} />
                        Share on X (Twitter)
                      </MenuItem>
                      <MenuItem onClick={handleShareToLinkedIn} dense>
                        <LinkedInIcon fontSize="small" sx={{ mr: 1.5, color: '#0A66C2' }} />
                        Share on LinkedIn
                      </MenuItem>
                      <MenuItem onClick={handleShareToReddit} dense>
                        <RedditIcon fontSize="small" sx={{ mr: 1.5, color: '#FF4500' }} />
                        Share on Reddit
                      </MenuItem>
                    </Menu>
                  </Box>
                  {/* Show login prompt for unauthenticated users */}
                  {!isUserAuthenticated && isPublicThread && (
                    <Paper 
                      elevation={3} 
                      sx={{ 
                        p: 2.5, // Increased padding
                        mb: 2, 
                        borderRadius: 2, // Consistent border radius
                        bgcolor: 'background.paper', // Use theme background
                        maxWidth: { xs: '95%', sm: '500px' }, // Responsive max width
                        width: '100%',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)', // Softer shadow
                        textAlign: 'center' // Center align content
                      }}
                    >
                      <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main', mb: 1 }}>
                        Join the Conversation
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                        To ask your own questions, save chat history, and access all features, please log in or create an account.
                      </Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                        <Button 
                          variant="contained"
                          size="medium" // Slightly larger button
                          onClick={() => {
                            navigate('/login', { 
                              state: { 
                                returnUrl: location.pathname,
                                message: "Log in to continue and access all features." 
                              }
                            });
                          }}
                          sx={{ borderRadius: '999px', textTransform: 'none', px: 3 }} // Pill shape
                        >
                          Log In
                        </Button>
                        <Button 
                          variant="outlined" // Outlined for secondary action
                          size="medium"
                          onClick={() => {
                            navigate('/register', { // Navigate to registration page
                              state: { 
                                returnUrl: location.pathname 
                              }
                            });
                          }}
                          sx={{ borderRadius: '999px', textTransform: 'none', px: 3 }}
                        >
                          Sign Up
                        </Button>
                      </Box>
                    </Paper>
                  )}
                </Box>

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
                              {/* Show image if present (for user or assistant) */}
                              {chat.image && (
                                <Box sx={{ maxWidth: 300, mb: 1, position: 'relative' }}>
                                  <img
                                    src={chat.image}
                                    alt="Uploaded"
                                    style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 8, cursor: 'pointer' }}
                                    onClick={() => setExpandedImage(chat.image)}
                                  />
                                  <IconButton
                                    component="a"
                                    href={chat.image}
                                    download
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    sx={{
                                      position: 'absolute',
                                      top: 4,
                                      right: 4,
                                      background: 'rgba(255,255,255,0.7)',
                                      zIndex: 2,
                                      p: 0.5,
                                    }}
                                    onClick={e => e.stopPropagation()}
                                  >
                                    <DownloadIcon fontSize="small" />
                                  </IconButton>
                                </Box>
                              )}
                              {chat.isImage && !chat.image ? (
                                <Box sx={{ maxWidth: 300 }}>
                                  <img
                                    src={chat.content}
                                    alt="Uploaded"
                                    style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 8 }}
                                  />
                                  {chat.text && <Typography sx={{ mt: 1, color: '#333' }}>{chat.text}</Typography>}
                                </Box>
                              ) : (
                                <Typography variant="body1" sx={{ color: '#333' }}>{chat.content}</Typography>
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
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pl: 1, mb: 1, position: 'relative' }}>
                        <Paper elevation={1} sx={{
                          display: 'flex', alignItems: 'center', gap: 1, p: 0.5, borderRadius: 2, background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', maxWidth: 120, position: 'relative',
                        }}>
                          <img
                            src={selectedImagePreview}
                            alt="Preview"
                            style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6 }}
                          />
                          {isUploadingImage && (
                            <Box sx={{
                              position: 'absolute',
                              top: 0, left: 0, width: '100%', height: '100%',
                              bgcolor: 'rgba(255,255,255,0.7)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              borderRadius: 2,
                              zIndex: 2
                            }}>
                              <CircularProgress size={24} />
                            </Box>
                          )}
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
                            disabled={isUploadingImage}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Paper>
                      </Box>
                    )}
                    {/* Top Row: Input and Send Button */}
                    <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 1.5, px: 1 }}>
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
                        placeholder={selectedImage || uploadedImageUrl ? 'Type your instruction for the image (required)' : placeholder}
                        variant="standard"
                        multiline
                        minRows={1}
                        maxRows={4}
                        InputProps={{
                          disableUnderline: true,
                          style: { fontSize: '15px', background: 'none', borderRadius: '999px', paddingLeft: 10, paddingRight:  10 },
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
                        disabled={
                          isResponseLoading ||
                          ((selectedImage || uploadedImageUrl) ? !message.trim() || isUploadingImage : !message.trim())
                        }
                        sx={{
                          width: 36, height: 36, borderRadius: '50%', background: '#1976d2', color: 'white', ml: 0.5, boxShadow: 'none', '&:hover': { background: '#125ea2' }, flexShrink: 0,
                        }}
                      >
                        {isResponseLoading ? <CircularProgress size={22} sx={{ color: 'white' }} /> : <SendIcon sx={{ fontSize: 20 }} />}
                      </IconButton>
                    </Box>                    {/* Bottom Row: Selects and Suggestions Toggle */}
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-start', gap: 1, alignItems: 'center', pl: 1, pb: 0.5 }}>
                       {/* Suggestions toggle button - available for all users */}
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
                      
                      {/* Patient Select - Only for authenticated users */}
                      {isUserAuthenticated && (
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
                      )}
                      
                      {/* Expertise Select - Available for all users */}
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
                          <MenuItem value="basic" disabled={isExpertLevelLocked || isResponseLoading}>Basic</MenuItem>
                          <MenuItem value="advanced">Advanced</MenuItem>
                        </Select>
                      </FormControl>
                        {/* Login Button for Unauthenticated Users */}
                      {!isUserAuthenticated && (
                        <Button
                          variant="contained"
                          size="small"
                          onClick={() => navigate('/login', { 
                            state: { 
                              returnUrl: location.pathname,
                              message: "Log in to use all features or continue as guest" 
                            } 
                          })}
                          sx={{
                            borderRadius: '999px',
                            ml: 'auto',
                            textTransform: 'none',
                            height: 32,
                            fontSize: 13,
                            backgroundColor: '#1976d2',
                            '&:hover': { backgroundColor: '#125ea2' }
                          }}
                          startIcon={<PersonIcon />}
                        >
                          Login for full access
                        </Button>
                      )}
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

      {/* Image expand dialog */}
      <Dialog open={!!expandedImage} onClose={() => setExpandedImage(null)} maxWidth="md">
        <DialogContent sx={{ p: 0, background: '#222' }}>
          {expandedImage && (
            <img
              src={expandedImage}
              alt="Expanded"
              style={{ width: '100%', height: 'auto', display: 'block', maxHeight: '80vh', objectFit: 'contain', background: '#222' }}
              onClick={() => setExpandedImage(null)}
            />
          )}
        </DialogContent>
      </Dialog>

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
      {isUserAuthenticated && (
        <BuyCreditsModal
          open={buyCreditsModalOpen}
          onClose={() => setBuyCreditsModalOpen(false)}
          balance={buyCreditsBalance}
          requiredAmount={buyCreditsRequiredAmount}
        />
      )}
    </div>
  );
};

export default SearchBox;
