import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import {
  Box,
  Typography,
  TextField,
  Icon,
  IconButton,
  Link,
  Collapse,
  List,
  ListItem,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Snackbar,
  Paper,
  useMediaQuery,
  Button,
  MenuItem,
  Alert,
  Avatar,
  Chip,
  Tooltip,
  Divider,
  Fade,
  FormControl,
  Select,
  ImageList,
  ImageListItem,
  Modal,
  Backdrop
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PersonIcon from '@mui/icons-material/Person';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ImageIcon from '@mui/icons-material/Image';
import CancelIcon from '@mui/icons-material/Cancel';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getAccessToken } from './api';
import './chatScreen.css'; // Import chat screen styles

// Custom theme with better color palette
const theme = createTheme({
  palette: {
    primary: {
      main: '#2563eb',
      light: '#3b82f6',
      dark: '#1d4ed8',
    },
    secondary: {
      main: '#059669',
      light: '#10b981',
      dark: '#047857',
    },
    background: {
      default: '#f9fafb',
      paper: '#ffffff',
    },
    text: {
      primary: '#1f2937',
      secondary: '#4b5563',
    },
    grey: {
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    button: {
      textTransform: 'none',
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow:
            '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 20,
          },
        },
      },
    },
  },
});

// ----------------------------------------------------
// 1. CustomText: Converts citation markers like [1], [2], etc. into clickable links.
// ----------------------------------------------------
const CustomText = ({ children, citations }) => {
  const text = React.Children.toArray(children).join('');
  const parts = text.split(/(\[\d+\])/g);
  return (
    <>
      {parts.map((part, index) => {
        const match = part.match(/^\[(\d+)\]$/);
        if (match) {
          const citationIndex = parseInt(match[1], 10) - 1;
          if (citations && citations[citationIndex]) {
            return (
              <Tooltip key={index} title={new URL(citations[citationIndex]).hostname}>
                <Link
                  href={citations[citationIndex]}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    color: theme.palette.primary.main,
                    textDecoration: 'none',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    padding: '0 4px',
                    borderRadius: 1,
                    fontWeight: 500,
                    '&:hover': {
                      textDecoration: 'underline',
                      backgroundColor: 'rgba(37, 99, 235, 0.15)',
                    },
                  }}
                >
                  {part}
                </Link>
              </Tooltip>
            );
          }
        }
        return <React.Fragment key={index}>{part}</React.Fragment>;
      })}
    </>
  );
};

// ----------------------------------------------------
// 2. ThoughtAccordion: Displays the model thought with a toggle label.
// ----------------------------------------------------
const ThoughtAccordion = ({ thinkContent, citations }) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <Accordion
      expanded={expanded}
      onChange={() => setExpanded((prev) => !prev)}
      sx={{
        mt: 1,
        mb: 2,
        backgroundColor: 'rgba(245, 247, 250, 0.7)',
        border: '1px solid rgba(209, 213, 219, 0.5)',
        boxShadow: 'none',
      }}
    >
      <AccordionSummary
        expandIcon={
          <ExpandMoreIcon sx={{ color: theme.palette.primary.main, fontSize: { xs: '1rem', sm: '1.2rem' } }} />
        }
        sx={{
          padding: { xs: '0 6px', sm: '0 8px' },
          minHeight: { xs: '32px', sm: '36px' },
          '& .MuiAccordionSummary-content': {
            margin: { xs: '4px 0', sm: '6px 0' },
          }
        }}
      >
        <Typography
          variant="subtitle2"
          sx={{
            fontSize: { xs: '0.7rem', sm: '0.75rem' },
            color: theme.palette.text.secondary,
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
          }}
        >
          <MenuBookIcon sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }} />
          {expanded ? 'Hide Reasoning Process' : 'Show Reasoning Process'}
        </Typography>
      </AccordionSummary>
      <AccordionDetails
        sx={{
          fontSize: '0.8rem',
          color: theme.palette.text.secondary,
          padding: '0 12px 12px 12px',
          backgroundColor: 'rgba(245, 247, 250, 0.9)',
        }}
      >
        <ReactMarkdown
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

// ----------------------------------------------------
// 3. ChatMessage Component: Renders a single message
// ----------------------------------------------------
const ChatMessage = ({ chat, isResponseLoading, isSourcesVisible, handleSourcesToggle, isLatest }) => {
  const isUser = chat.role === 'user';
  const isMobile = useMediaQuery('(max-width: 768px)');

  // Extract <think> block from the assistant's response, if any
  const extractThinkContent = (text) => {
    const thinkMatch = text.match(/<think>([\s\S]*?)<\/think>/i);
    const thinkContent = thinkMatch ? thinkMatch[1].trim() : null;
    const remainingContent = text.replace(/<think>[\s\S]*?<\/think>/i, '').trim();
    return { thinkContent, remainingContent };
  };

  return (
    <Fade in={true} timeout={300}>
      <ListItem
        alignItems="flex-start"
        sx={{
          flexDirection: isUser ? 'row-reverse' : 'row',
          gap: { xs: 0.5, sm: 1 },
          padding: { xs: '2px 0', sm: '8px 0' },
          width: '100%',
          position: 'relative', // Add relative positioning for containing content
        }}
      >
        {/* Avatar for sender */}
        <Avatar
          sx={{
            width: { xs: 30, sm: 36 },
            height: { xs: 30, sm: 36 },
            bgcolor: isUser ? 'primary.light' : 'secondary.light',
            mt: 0.5,
            display: { xs: 'none', sm: 'flex' },
          }}
        >
          {isUser ? <PersonIcon /> : <SmartToyIcon />}
        </Avatar>

        {/* Message content */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            width: { xs: '95%', sm: '100%' },
            maxWidth: '100%',
            position: 'relative', // Ensure proper nesting of recommendations
            overflow: 'hidden', // Prevent content from overflowing
          }}
        >
          {/* Message bubble */}
          <Paper
            elevation={0}
            sx={{
              p: { xs: 1.5, sm: 2 },
              borderRadius: isUser 
                ? { xs: '16px 16px 4px 16px', sm: '18px 18px 4px 18px' }
                : { xs: '16px 16px 16px 4px', sm: '18px 18px 18px 4px' },
              backgroundColor: isUser ? 'primary.light' : 'grey.100',
              color: isUser ? 'white' : 'text.primary',
              position: 'relative',
              wordBreak: 'break-word',
              maxWidth: { xs: '100%', sm: '95%' },
              minWidth: '50px'
            }}
            className="chat-message-bubble"
          >
            {isResponseLoading && isLatest ? (
              <CircularProgress size={24} thickness={4} sx={{ color: isUser ? 'white' : 'primary.main' }} />
            ) : isUser ? (
              chat.isImage ? (
                <Box sx={{ maxWidth: 300 }}>
                  <img
                    src={chat.content}
                    alt="Uploaded"
                    style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 8 }}
                  />
                  {chat.text && <Typography sx={{ mt: 1 }}>{chat.text}</Typography>}
                </Box>
              ) : (
                <Typography>{chat.content}</Typography>
              )
            ) : (() => {
              const { thinkContent, remainingContent } = extractThinkContent(chat.content);
              return (
                <Box sx={{ mt: 0.5, mb: 0.5 }}>
                  {thinkContent && (
                    <ThoughtAccordion thinkContent={thinkContent} citations={chat.citations} />
                  )}
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      text: ({ node, children }) => (
                        <CustomText citations={chat.citations} children={children} />
                      ),
                    }}
                  >
                    {remainingContent}
                  </ReactMarkdown>
                </Box>
              );
            })()}

            {/* Timestamp (optional) */}
            <Typography
              variant="caption"
              sx={{
                position: 'absolute',
                bottom: -20,
                right: isUser ? 0 : 'auto',
                left: isUser ? 'auto' : 0,
                color: 'text.secondary',
                fontSize: '0.65rem',
              }}
            >
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Typography>
          </Paper>

          {/* Citations section */}
          {!isUser && chat.citations && chat.citations.length > 0 && !isResponseLoading && (
            <Box sx={{ mt: 1.5, ml: isUser ? 'auto' : 0 }}>
              <Button
                onClick={handleSourcesToggle}
                size="small"
                variant="text"
                startIcon={<FactCheckIcon />}
                endIcon={<ArrowDropDownIcon />}
                sx={{
                  textTransform: 'none',
                  fontSize: '0.75rem',
                  color: 'text.secondary',
                  padding: '2px 8px',
                  borderRadius: '16px',
                  backgroundColor: 'rgba(0, 0, 0, 0.04)',
                }}
              >
                {isSourcesVisible ? 'Hide Sources' : `${chat.citations.length} Sources`}
              </Button>

              <Collapse in={isSourcesVisible} timeout="auto" unmountOnExit>
                <Box
                  sx={{
                    mt: 1,
                    pl: 2,
                    borderLeft: `2px solid ${theme.palette.primary.light}`,
                    backgroundColor: 'rgba(245, 247, 250, 0.7)',
                    p: 1.5,
                    borderRadius: '0 8px 8px 0',
                  }}
                >
                  <Typography
                    variant="caption"
                    color="textSecondary"
                    sx={{
                      display: 'block',
                      mb: 1,
                      fontWeight: 500,
                    }}
                  >
                    Sources:
                  </Typography>

                  {chat.citations.map((citation, citationIndex) => {
                    const hostname = new URL(citation).hostname;
                    return (
                      <Box
                        key={citationIndex}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          mb: 0.75,
                          padding: '4px 8px',
                          borderRadius: '8px',
                          backgroundColor: 'white',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                        }}
                      >
                        <Typography
                          variant="caption"
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                          }}
                        >
                          <Chip
                            label={citationIndex + 1}
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: '0.65rem',
                              backgroundColor: theme.palette.primary.main,
                              color: 'white',
                            }}
                          />
                          <Link
                            href={citation}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{
                              color: theme.palette.primary.main,
                              textDecoration: 'none',
                              fontSize: '0.75rem',
                              '&:hover': {
                                textDecoration: 'underline',
                              },
                              display: 'flex',
                              alignItems: 'center',
                              gap: 0.5,
                            }}
                          >
                            {hostname}
                          </Link>
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>
              </Collapse>
            </Box>
          )}
        </Box>
      </ListItem>
    </Fade>
  );
};

// ----------------------------------------------------
// 4. Main ChatScreen Component
// ----------------------------------------------------
const ChatScreen = ({
  phoneNumber,
  transcript, // WebSocket reference (passed in from parent)
  wsStatus,
  chatMessages,
  setChatMessages,
  thread,
  patient,
  hideInput, // ADDED
  onlyInput, // ADDED
  disableOuterScroll, // ADDED
  setStatus
}) => {
  // Local state
  const [message, setMessage] = useState('');
  const [threadId, setThreadId] = useState(null);
  const [isSourcesVisible, setIsSourcesVisible] = useState(false);
  const [isResponseLoading, setIsResponseLoading] = useState(false);
  const [error, setError] = useState('');
  const [expertLevel, setExpertLevel] = useState('low');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [suggestions, setSuggestion] = useState([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null); // State for selected image file
  const [selectedImagePreview, setSelectedImagePreview] = useState(null); // State for image preview URL
  const [isExpertLevelLocked, setIsExpertLevelLocked] = useState(false); // State to lock expert level
  const [previewModalOpen, setPreviewModalOpen] = useState(false); // State for image preview modal
  const [uploadedImageUrl, setUploadedImageUrl] = useState(null); // State for uploaded image URL
  const [isUploadingImage, setIsUploadingImage] = useState(false); // State for image upload loading
  const isMobile = useMediaQuery('(max-width: 768px)');
  const fileInputRef = useRef(null); // Ref for hidden file input
  const messagesEndRef = useRef(null); // For scrolling
  const innerScrollerRef = useRef(null); // Ref for inner scroller

  // Initial example suggestions for the welcome screen
  const initialSuggestions = [
    "What are the symptoms of hypertension?",
    "How to manage diabetes?",
    "Common causes of chronic fatigue",
    "Best practices for preventive care"
  ];

  // Handle input changes
  const handleTyping = (e) => {
    setMessage(e.target.value);
  };

  const handleSourcesToggle = () => {
    setIsSourcesVisible((prev) => !prev);
  };

  // Use chatMessages directly (or merge with any additional messages as needed)
  const combinedMessages = chatMessages || [];

  const handleImageUploadClick = () => {
    fileInputRef.current.click(); // Programmatically click the hidden file input
  };
  const handleImageSelect = async (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedImage(file);
      setUploadedImageUrl(null); // Reset previous upload
      setIsUploadingImage(true);

      // Create a resized preview image
      const reader = new FileReader();
      reader.onloadend = () => {
        // Create an image object to get dimensions
        const img = new Image();
        img.onload = () => {
          // Create canvas for resizing
          const canvas = document.createElement('canvas');
          // Set max dimensions for preview (thumbnail size)
          const MAX_WIDTH = 300;
          const MAX_HEIGHT = 200;
          
          // Calculate new dimensions while maintaining aspect ratio
          let width = img.width;
          let height = img.height;
          
          if (width > height) {
            if (width > MAX_WIDTH) {
              height = Math.round(height * (MAX_WIDTH / width));
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width = Math.round(width * (MAX_HEIGHT / height));
              height = MAX_HEIGHT;
            }
          }
          
          // Resize the image
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          // Get the resized image as Data URL and set as preview
          const resizedImageUrl = canvas.toDataURL('image/jpeg', 0.85);
          setSelectedImagePreview(resizedImageUrl);
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);

      setExpertLevel('high'); // Automatically set to high on image upload
      setIsExpertLevelLocked(true); // Lock the dropdown

      // Upload image to server
      try {
        const token = await getAccessToken();
        const formData = new FormData();
        formData.append('image', file);
        const response = await fetch('https://health.prestigedelta.com/research/upload-image/', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        });
        
        if (!response.ok) throw new Error('Image upload failed');
        const data = await response.json();
        setUploadedImageUrl(data.image_url);
      } catch (error) {
        console.error("Error uploading image:", error);
        setUploadedImageUrl(null);
        if (error.message.includes("Failed to fetch") || error.message.includes("Network")) {
          setError("Network error while uploading image. Check your connection and try again.");
        } else {
          setError("Image upload failed. The server couldn't process this image. Please try a different image or format.");
        }
      } finally {
        setIsUploadingImage(false);
      }
    } else {
      setSelectedImage(null);
      setSelectedImagePreview(null);
      setUploadedImageUrl(null);
      setIsExpertLevelLocked(false);
      setExpertLevel('low'); // Reset to default if image selection is cancelled
    }
  };
  const handleCancelImage = () => {
    setSelectedImage(null);
    setSelectedImagePreview(null);
    setUploadedImageUrl(null);
    setIsExpertLevelLocked(false);
    setExpertLevel('low');
  };

  const handleOpenPreviewModal = () => {
    setPreviewModalOpen(true);
  };

  const handleClosePreviewModal = () => {
    setPreviewModalOpen(false);
  };

  useEffect(() => {
    // Scroll to bottom of messages when new messages arrive or component updates,
    // but only if messages are visible and not in 'onlyInput' mode.
    if (!onlyInput && !disableOuterScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, onlyInput, disableOuterScroll]);

  useEffect(() => {
    // Scroll to bottom of inner scroller when new messages arrive
    if (combinedMessages.length > 0 && innerScrollerRef.current) {
      innerScrollerRef.current.scrollTop = innerScrollerRef.current.scrollHeight;
    }
  }, [chatMessages, combinedMessages.length]);

  // Helper to strip leading JSON prefix from AI messages
  const stripJsonPrefix = (text) => {
    if (typeof text !== 'string') return text;
    return text.replace(/^\s*\{[^}]*\}\s*/, '');
  };

  const handleSendMessage = useCallback(async () => {
    // Skip if no message and no image, or if in the process of uploading an image
    if ((!message.trim() && !selectedImage && !uploadedImageUrl) || isUploadingImage) return;

    // Require text if image is present
    if ((selectedImage || uploadedImageUrl) && !message.trim()) return;

    const currentMessage = message;
    setMessage('');
    setIsResponseLoading(true);
    setIsSourcesVisible(false); // Reset sources visibility on new message
    setError(''); // Clear any previous errors
    setSelectedImagePreview(null); // Clear image preview after sending

    try {
      const token = await getAccessToken();
      const apiUrl = "https://health.prestigedelta.com/research/";

      let payload = {};
      let formData = null;
      let headers = {
        'Authorization': `Bearer ${token}`,
      };
      let requestBody = null;
      
      // Configure payload/headers based on whether we're sending an image
      if (threadId) {
        payload.thread_id = threadId;
      } else if (thread) {
        payload.thread_id = thread;
      }
      
      // Add patient info to payload
      if (phoneNumber) {
        payload.patient_number = `+234${phoneNumber.slice(1)}`;
      }
      
      if (selectedPatient) {
        if (selectedPatient.phone_number && selectedPatient.phone_number.trim() !== "") {
          payload.patient_phone = selectedPatient.phone_number;
        } else {
          payload.patient_id = selectedPatient.id;
        }
      }
      
      payload.expertise_level = expertLevel; // Use current expertLevel, will be 'high' if image is uploaded

      if (transcript) {
        const currentTime = new Date().toISOString();
        const transcriptData = JSON.stringify([
          {
            time: currentTime,
            speaker: "patient",
            content: ""
          },
          {
            time: currentTime,
            speaker: "doctor",
            content: transcript
          }
        ]);
        payload.transcript = JSON.parse(transcriptData);
      }
      // Handle uploads differently based on whether we have an uploaded URL or need to send the file directly
      if (uploadedImageUrl) {
        // Use the pre-uploaded image URL
        payload.image = uploadedImageUrl;
        payload.caption = currentMessage.trim() ? currentMessage : "Analyze this image";
        headers['Content-Type'] = 'application/json';
        requestBody = JSON.stringify(payload);
      } else if (selectedImage) {
        // If we have a selected image but no uploaded URL (upload may have failed),
        // fall back to direct form upload
        formData = new FormData();
        
        // Add all payload fields to formData
        Object.keys(payload).forEach(key => {
          formData.append(key, payload[key]);
        });
        
        formData.append('image', selectedImage);
        formData.append('caption', currentMessage.trim() ? currentMessage : "Analyze this image");
      } else {
        // Text-only query
        payload.query = currentMessage;
        headers['Content-Type'] = 'application/json';
        requestBody = JSON.stringify(payload);
      }

      // Prepare user message for display
      const userMessageContent = uploadedImageUrl ? uploadedImageUrl : selectedImagePreview ? selectedImagePreview : currentMessage;
      const userTextMessage = (uploadedImageUrl || selectedImage) ? (currentMessage.trim() ? currentMessage : "Uploaded Image") : currentMessage;

      const userMessage = {
        role: "user",
        content: userMessageContent,
        isImage: !!(uploadedImageUrl || selectedImagePreview), // Flag as image message
        text: userTextMessage, // Store text content separately for image messages
        id: `query-${Date.now()}` // Add unique ID to each message
      };
      setChatMessages((prev) => [...prev, userMessage]);

      // Make the API request
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: headers,
        body: formData || requestBody,
      });

      if (!response.body) {
        throw new Error("No response body");
      }

      // Reset selected image and preview after sending
      setSelectedImage(null);
      setSelectedImagePreview(null);
      setUploadedImageUrl(null);
      setIsExpertLevelLocked(false); // Unlock dropdown after image sent and response started
      // Append a placeholder for assistant response
      let assistantMessage = { role: "assistant", content: "", citations: [] };
      setChatMessages((prev) => [...prev, assistantMessage]);
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let buffer = "";

      if (uploadedImageUrl || formData) {
        // Handle response for image upload (either with URL or direct upload)
        let accumulatedResponse = '';
        try {
          while (!done) {
            const { value, done: doneReading } = await reader.read();
            done = doneReading;
            const chunkText = decoder.decode(value);
            accumulatedResponse += chunkText;
          }
          
          // Try to parse as JSON if possible (might be structured response)
          try {
            const jsonResponse = JSON.parse(accumulatedResponse.trim());
            if (jsonResponse.assistant_response) {
              assistantMessage.content = jsonResponse.assistant_response;
            } else {
              assistantMessage.content = accumulatedResponse.trim();
            }
            if (jsonResponse.citations) {
              assistantMessage.citations = jsonResponse.citations;
            }
          } catch (e) {
            // Not JSON, use as plain text
            assistantMessage.content = accumulatedResponse.trim();
          }
        } catch (error) {
          console.error("Error processing image response:", error);
          assistantMessage.content = "Sorry, I had trouble processing the image. Please try again.";
        }
        
        // Strip out any leading JSON prefix
        assistantMessage.content = stripJsonPrefix(assistantMessage.content);

        setChatMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { ...assistantMessage };
          return updated;
        });

      } else {
        // Handle JSON stream for text messages
        while (!done) {
          const { value, done: doneReading } = await reader.read();
          done = doneReading;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n");
          buffer = parts.pop();
          parts.forEach((part) => {
            if (part.trim()) {
              try {
                const parsed = JSON.parse(part);
                if (parsed.thread_id) {
                  setThreadId(parsed.thread_id);
                }
                if (parsed.assistant_response_chunk) {
                  assistantMessage.content = parsed.accumulated_response;
                  assistantMessage.citations = parsed.citations;
                  setChatMessages((prev) => {
                    const updated = [...prev];
                    updated[updated.length - 1] = { ...assistantMessage };
                    return updated;
                  });
                }
              } catch (error) {
                console.error("Error parsing JSON chunk:", error);
              }
            }
          });
        }
      }


    } catch (error) {
      console.error("Error sending message:", error);
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again later.",
        },
      ]);
      setError("Sorry, I encountered an error. Please try again later.");
    } finally {
      setIsResponseLoading(false);
    }
  }, [message, threadId, selectedPatient, expertLevel, setChatMessages, phoneNumber, transcript, selectedImage, isExpertLevelLocked, selectedImagePreview, uploadedImageUrl, isUploadingImage, thread]);

  const handleSuggestion = async () => {
    console.log('handleSuggestion called with patient:', patient);
    
    // Validate patient ID is a non-empty string or number
    const patientId = String(patient).trim();
    if (!patientId) {
      console.log('No valid patient ID available');
      setSuggestion([]);
      setIsLoadingSuggestions(false);
      return;
    }

    setIsLoadingSuggestions(true);
    const formData = {
      user_type: 'doctor',
      patient_id: patientId,
    };

    try {
      const accessToken = await getAccessToken();
      console.log('Fetching suggestions for patient ID:', patientId);
      
      const response = await fetch('https://health.prestigedelta.com/suggestions/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          accept: 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(formData),
      });
      
      const result = await response.json();
      console.log('Suggestions API response:', result);
      
      if (response.status !== 200) {
        throw new Error("Failed to load suggestions");
      }

      // Ensure result is an array and not empty
      const suggestions = Array.isArray(result) ? result : [];
      console.log('Setting suggestions:', suggestions);
      setSuggestion(suggestions);
      
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setError("Failed to load suggestions.");
      setSuggestion([]);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  useEffect(() => {
    console.log('useEffect triggered with patient:', patient);
    const patientId = String(patient).trim();
    
    if (patientId) {
      console.log('Valid patient ID detected, fetching suggestions...');
      handleSuggestion();
    } else {
      console.log('No valid patient ID, resetting suggestions');
      setSuggestion([]);
      setIsLoadingSuggestions(false);
    }
  }, [patient]); // Only depend on patient ID changes

  if (isLoadingSuggestions) {
    return (
      <ThemeProvider theme={theme}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            height: '100vh',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'background.default',
            px: 2
          }}
        >
          <Box display="flex" justifyContent="center" alignItems="center">
            <CircularProgress />
          </Box>
          <Typography sx={{ mt: 2 }} variant="body2" color="text.secondary">
            Loading suggestions...
          </Typography>
        </Box>
      </ThemeProvider>
    );
  }

  const renderSuggestions = () => {
    if (!suggestions || suggestions.length === 0) return null;

    return (
      <Box sx={{ mt: 2 }}>
        {suggestions.map((category, index) => (
          <Box key={`category-${index}`} sx={{ mb: 2 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              {category.category_name}
            </Typography>
            <Box sx={{ pl: 2 }}>
              {category.sample_questions.map((question, qIndex) => (
                <Typography 
                  key={`question-${index}-${qIndex}`} 
                  variant="body2" 
                  sx={{ mb: 1 }}
                >
                  • {question}
                </Typography>
              ))}
            </Box>
          </Box>
        ))}
      </Box>
    );
  };

  return (
    <ThemeProvider theme={theme}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%', // Changed from 100vh to 100% to better fit in container
          overflow: 'hidden',
          position: 'relative',
        }}
        className="chat-container"
      >
        {!onlyInput && (
          <Box
            sx={{
              flexGrow: 1,
              overflowY: 'scroll',
              px: { xs: 1, sm: 2 },
              py: 1,
              scrollbarWidth: 'thin',
              '&::-webkit-scrollbar': { width: '4px' },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: theme.palette.primary.main,
                borderRadius: '2px',
              },
              position: 'relative',
              height: '100%', // Ensure full height
              display: 'flex', // Add flex display
              flexDirection: 'column', // Stack children vertically
            }}
            className="outer-scroller"
          >
            {combinedMessages.length === 0 && (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  mx: 'auto',
                  width: '100%',
                  textAlign: 'center',
                  px: 2,
                }}
              >
                <Paper
                  elevation={0}
                  sx={{
                    p: 4,
                    borderRadius: 4,
                    backgroundColor: 'background.paper',
                    border: '1px dashed',
                    borderColor: 'grey.300',
                    width: '100%',
                  }}
                >
                  <Box
                    sx={{
                      backgroundColor: 'primary.light',
                      width: 60,
                      height: 60,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mb: 2,
                      mx: 'auto',
                    }}
                  >
                    <SmartToyIcon sx={{ fontSize: 32, color: 'white' }} />
                  </Box>
                  <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
                    How can I help you today?
                  </Typography>
                  <Typography color="text.secondary" sx={{ mb: 3 }}>
                    Ask any health-related question. I can provide research-backed
                    information on medical conditions, treatments, nutrition, and more. You can also upload medical images for analysis.
                  </Typography>
                  <Divider sx={{ mb: 3 }} />
                  <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 500 }}>
                    Try asking about:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center' }}>
                    {initialSuggestions.map((suggestionItem, index) => (
                      <Chip
                        key={`initial-suggestion-${index}`}
                        label={suggestionItem}
                        onClick={() => setMessage(suggestionItem)}
                        sx={{
                          bgcolor: 'grey.100',
                          '&:hover': {
                            bgcolor: 'primary.light',
                            color: 'white',
                          },
                        }}
                      />
                    ))}
                  </Box>
                </Paper>
              </Box>
            )}
            {combinedMessages.length > 0 && (
              <Box
                sx={{
                  maxWidth: { xs: '100%', sm: '900px' },
                  mx: 'auto',
                  width: '100%',
                  height: '100%', // Ensure full height
                  overflow: 'hidden',
                  flexGrow: 1, // Add flex grow to take available space
                  display: 'flex', // Add flex display
                  flexDirection: 'column', // Stack children vertically
                }}
                className="inner-scroll-container"
              >
                <Box
                  ref={innerScrollerRef}
                  sx={{
                    height: '100%',
                    overflowY: 'auto',
                    scrollbarWidth: 'thin',
                    '&::-webkit-scrollbar': { width: '4px' },
                    '&::-webkit-scrollbar-thumb': {
                      backgroundColor: theme.palette.primary.main,
                      borderRadius: '2px',
                    },
                    pr: 1,
                    flexGrow: 1, // Add flex grow to take available space
                  }}
                  className="inner-scroller chat-scroll-container"
                >
                  <List sx={{ pt: 0, px: { xs: 0.5, sm: 1 } }}>
                    {combinedMessages.map((chat, index) => (
                      <ChatMessage
                        key={index}
                        chat={chat}
                        isResponseLoading={isResponseLoading && index === combinedMessages.length - 1}
                        isSourcesVisible={isSourcesVisible}
                        handleSourcesToggle={handleSourcesToggle}
                        isLatest={index === combinedMessages.length - 1}
                      />
                    ))}
                  </List>
                  <div ref={messagesEndRef} />
                </Box>
              </Box>
            )}
          </Box>
        )}

        {!hideInput && (
          <Box 
            sx={{ 
              flexShrink: 0, // Prevent shrinking
              position: 'relative', // Add positioning context
              zIndex: 5, // Ensure it's above other content
              mt: 'auto', // Push to bottom
              borderTop: (theme) => `1px solid ${theme.palette.divider}`,
            }}
          >
            <Paper
              elevation={2}
              sx={{
                p: { xs: 1, sm: 1.5 },
                borderRadius: 0,
                backgroundColor: 'rgba(248, 249, 250, 0.95)',
              }}
            >
              {selectedImagePreview && (
                <Box
                  mb={1}
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                  sx={{
                    padding: { xs: '4px 8px', sm: '6px 10px' },
                    backgroundColor: 'rgba(0,0,0,0.03)',
                    borderRadius: '8px',
                    border: '1px solid rgba(0,0,0,0.08)',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  }}
                  className="chat-image-preview"
                >
                  <Box 
                    display="flex" 
                    alignItems="center" 
                    overflow="hidden"
                    onClick={handleOpenPreviewModal}
                    sx={{ 
                      cursor: 'pointer',
                      '&:hover': { opacity: 0.85 }
                    }}
                  >
                    <Box
                      sx={{
                        width: { xs: '48px', sm: '60px' },
                        height: { xs: '48px', sm: '60px' },
                        marginRight: '10px',
                        borderRadius: '4px',
                        overflow: 'hidden',
                        border: '1px solid rgba(0,0,0,0.1)',
                        position: 'relative',
                      }}
                    >
                      <img
                        src={selectedImagePreview}
                        alt="Preview"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                      {isUploadingImage && (
                        <Box 
                          sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: 'rgba(255,255,255,0.7)',
                          }}
                        >
                          <CircularProgress size={24} thickness={5} />
                        </Box>
                      )}
                    </Box>
                    <Box>
                      <Typography
                        variant="body2"
                        color="text.primary"
                        noWrap
                        sx={{ 
                          maxWidth: '200px',
                          fontWeight: 500,
                          fontSize: { xs: '0.75rem', sm: '0.85rem' }
                        }}
                      >
                        {selectedImage?.name || 'Attached Image'}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ 
                          fontSize: { xs: '0.65rem', sm: '0.7rem' },
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        {isUploadingImage ? (
                          <span>Uploading image...</span>
                        ) : uploadedImageUrl ? (
                          <span>✓ Ready to send</span>
                        ) : (
                          <>
                            <span style={{ 
                              display: 'inline-block', 
                              width: '14px', 
                              height: '14px', 
                              backgroundColor: 'rgba(37, 99, 235, 0.1)', 
                              borderRadius: '50%', 
                              position: 'relative' 
                            }}>
                              <span style={{ 
                                position: 'absolute', 
                                left: '4px', 
                                top: '4px', 
                                width: '6px', 
                                height: '6px', 
                                backgroundColor: '#2563eb', 
                                borderRadius: '50%' 
                              }}></span>
                            </span>
                            Click to view full size
                          </>
                        )}
                      </Typography>
                    </Box>
                  </Box>
                  <IconButton 
                    onClick={handleCancelImage} 
                    size="small" 
                    sx={{ 
                      padding: { xs: '4px', sm: '6px' },
                      backgroundColor: 'rgba(0,0,0,0.05)',
                      '&:hover': {
                        backgroundColor: 'rgba(0,0,0,0.1)',
                      }
                    }}
                  >
                    <CancelIcon fontSize="small" />
                  </IconButton>
                </Box>
              )}
              {/* Image Preview Modal */}
              {previewModalOpen && (
                <Modal
                  open={previewModalOpen}
                  onClose={handleClosePreviewModal}
                  closeAfterTransition
                  BackdropComponent={Backdrop}
                  BackdropProps={{
                    timeout: 500,
                  }}
                >
                  <Fade in={previewModalOpen}>
                    <Box
                      sx={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        bgcolor: 'background.paper',
                        boxShadow: 24,
                        p: 2,
                        borderRadius: 2,
                        maxWidth: '90%',
                        maxHeight: '90%',
                        overflow: 'auto',
                      }}
                    >
                      <img
                        src={selectedImagePreview}
                        alt="Full Preview"
                        style={{
                          width: '100%',
                          height: 'auto',
                          display: 'block',
                          borderRadius: 8,
                        }}
                      />
                    </Box>
                  </Fade>
                </Modal>
              )}
              <Box 
                display="flex" 
                alignItems="center" 
                flexDirection="row"
                className="chat-input-container"
                sx={{ gap: { xs: 0.5, sm: 1} }} // Add gap between items
              >
                {/* Hidden file input, triggered by IconButton */}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                />

                {/* Attach Image Button - Now on the left */}
                <Tooltip title="Attach Image">
                  <IconButton 
                    onClick={handleImageUploadClick} 
                    color="primary"
                    size={isMobile ? "small" : "medium"}
                    sx={{ 
                      p: { xs: '6px', sm: '8px' }, // Adjust padding for touch targets
                      flexShrink: 0 // Prevent shrinking
                    }}
                  >
                    <ImageIcon fontSize={isMobile ? "small" : "medium"} />
                  </IconButton>
                </Tooltip>

                {/* Message Input Field - In the middle */}
                <TextField
                  fullWidth
                  variant="outlined"
                  placeholder="Type your message..."
                  value={message}
                  onChange={handleTyping}
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                  multiline
                  maxRows={4}
                  disabled={isResponseLoading || isUploadingImage}
                  className="chat-input-field"
                  sx={{
                    flexGrow: 1,
                    mx: { xs: 0.5, sm: 1 }, // Add margin on both sides to separate from buttons
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '20px', // Keep rounded corners
                      fontSize: { xs: '0.875rem', sm: '1rem' },
                      py: { xs: 0.8, sm: 1 }, // Vertical padding for the input itself
                    },
                  }}
                />
                
                {/* Send Button - Now on the right */}
                <Tooltip title="Send Message">
                  <IconButton 
                    color="primary" 
                    onClick={handleSendMessage} 
                    disabled={!message.trim() || isResponseLoading || isUploadingImage}
                    size={isMobile ? "small" : "medium"}
                    sx={{ 
                      bgcolor: 'primary.main',
                      color: 'white',
                      '&:hover': {
                        bgcolor: 'primary.dark',
                      },
                      p: { xs: '6px', sm: '8px' } // Adjust padding
                    }}
                  >
                    <SendIcon fontSize={isMobile ? "small" : "medium"} />
                  </IconButton>
                </Tooltip>
              </Box>
            </Paper>
          </Box>
        )}
        <Snackbar
          open={Boolean(error)}
          autoHideDuration={6000}
          onClose={() => setError('')}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          TransitionProps={{ appear: false }}
        >
          <Alert onClose={() => setError('')} severity="error" sx={{ width: '100%' }}>
            {error}
          </Alert>
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
};

export default ChatScreen;