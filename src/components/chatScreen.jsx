import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTheme, ThemeProvider, createTheme } from '@mui/material/styles';
import {
  Box,
  Typography,
  TextField,
  Icon, // Note: Icon component is imported but not explicitly used. Material UI icons are used directly.
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
  MenuItem, // Note: MenuItem component is imported but not explicitly used.
  Alert,
  Avatar,
  Chip,
  Tooltip,
  Divider,
  Fade,
  FormControl, // Note: FormControl component is imported but not explicitly used.
  Select,      // Note: Select component is imported but not explicitly used for expertLevel.
  ImageList,   // Note: ImageList component is imported but not explicitly used.
  ImageListItem, // Note: ImageListItem component is imported but not explicitly used.
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
import { getAccessToken, balanceCheck } from './api';
import BuyCreditsModal from './BuyCreditsModal';
import './chatScreen.css'; // Import chat screen styles

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
                    color: 'primary.main',
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
          <ExpandMoreIcon sx={{ color: 'primary.main', fontSize: { xs: '1rem', sm: '1.2rem' } }} />
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
            color: 'text.secondary',
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
          color: 'text.secondary',
          padding: '0 12px 12px 12px',
          backgroundColor: 'rgba(245, 247, 250, 0.9)',
        }}
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            // The 'text' prop for ReactMarkdown components was incorrectly named 'text'.
            // It should be 'p' for paragraphs, or use a custom renderer for inline text if needed.
            // However, CustomText is designed to parse citation markers *within* text blocks.
            // A more common approach for custom text rendering is to use the `children` prop of `ReactMarkdown`
            // or to customize specific element renderers like `p`, `a`, etc.
            // For now, assuming `text` was intended to target generic text nodes for citation parsing.
            // If this is meant to replace paragraph rendering, it should be `p`.
            // If it's for *all* text, this structure is okay, but `CustomText` will be called for every text segment.
            text: ({ node, children }) => ( // Keep as 'text' if specifically targeting raw text nodes for this citation logic
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
  const theme = useTheme();
  const isMobile = useMediaQuery('(max-width:900px)'); // Responsive check without theme.breakpoints

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
          position: 'relative', 
        }}
      >
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

        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            width: { xs: '95%', sm: '100%' },
            maxWidth: '100%',
            position: 'relative', 
            overflow: 'hidden',
          }}
        >
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
  transcript,
  wsStatus, // Note: wsStatus is passed but not used in this component
  chatMessages,
  setChatMessages,
  thread,
  patient,
  hideInput,
  onlyInput,
  disableOuterScroll,
  setStatus // Note: setStatus is passed but not used in this component
}) => {
  const [message, setMessage] = useState('');
  const [threadId, setThreadId] = useState(null);
  const [isSourcesVisible, setIsSourcesVisible] = useState(false);
  const [isResponseLoading, setIsResponseLoading] = useState(false);
  const [error, setError] = useState('');
  const [expertLevel, setExpertLevel] = useState('low');
  const [selectedPatient, setSelectedPatient] = useState(null); // Note: selectedPatient is set but not used. Assuming it's for future use or handled elsewhere.
  const [suggestions, setSuggestion] = useState([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedImagePreview, setSelectedImagePreview] = useState(null);
  const [isExpertLevelLocked, setIsExpertLevelLocked] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [buyCreditsModalOpen, setBuyCreditsModalOpen] = useState(false);
  const [buyCreditsBalance, setBuyCreditsBalance] = useState(null);
  const [buyCreditsRequiredAmount, setBuyCreditsRequiredAmount] = useState(null);
  
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const innerScrollerRef = useRef(null);
  // const buyCreditsModalListenerRef = useRef(); // Removed: This ref was not used.
  
  const theme = useTheme();
  const isMobile = useMediaQuery('(max-width:900px)');

  const initialSuggestions = [
    "What are the symptoms of hypertension?",
    "How to manage diabetes?",
    "Common causes of chronic fatigue",
    "Best practices for preventive care"
  ];

  const handleTyping = (e) => {
    setMessage(e.target.value);
  };

  const handleSourcesToggle = () => {
    setIsSourcesVisible((prev) => !prev);
  };

  const combinedMessages = chatMessages || [];

  // Scroll to top on mount if messages exist
  useEffect(() => {
    if (combinedMessages.length > 0 && innerScrollerRef.current) {
      innerScrollerRef.current.scrollTop = 0;
    }
  }, []); // Runs once on mount

  // Scroll to bottom of messages when new messages arrive
  useEffect(() => {
    if (!onlyInput && !disableOuterScroll && messagesEndRef.current && combinedMessages.length > 0) {
      const timer = setTimeout(() => {
        if (messagesEndRef.current) { // Check again in case component unmounted
          messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
      }, 100); // Delay to allow rendering, especially for markdown
      return () => clearTimeout(timer);
    }
  }, [chatMessages, onlyInput, disableOuterScroll, combinedMessages.length]);


  const handleImageUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleImageSelect = async (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedImage(file);
      setUploadedImageUrl(null); 
      setIsUploadingImage(true);

      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 300;
          const MAX_HEIGHT = 200;
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
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          const resizedImageUrl = canvas.toDataURL('image/jpeg', 0.85);
          setSelectedImagePreview(resizedImageUrl);
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);

      setExpertLevel('high'); 
      setIsExpertLevelLocked(true); 

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
      setExpertLevel('low'); 
    }
  };
  const handleCancelImage = () => {
    setSelectedImage(null);
    setSelectedImagePreview(null);
    setUploadedImageUrl(null);
    setIsExpertLevelLocked(false);
    setExpertLevel('low');
    if (fileInputRef.current) { // Reset file input value
        fileInputRef.current.value = "";
    }
  };

  const handleOpenPreviewModal = () => {
    setPreviewModalOpen(true);
  };

  const handleClosePreviewModal = () => {
    setPreviewModalOpen(false);
  };
  
  const stripJsonPrefix = (text) => {
    if (typeof text !== 'string') return text;
    return text.replace(/^\s*\{[^}]*\}\s*/, '');
  };

  const handleSendMessage = useCallback(async () => {
    if ((!message.trim() && !selectedImage && !uploadedImageUrl) || isUploadingImage) return;
    if ((selectedImage || uploadedImageUrl) && !message.trim()) {
        // Optionally, set an error or prompt user to add text
        // setError("Please add a caption or question for the image.");
        return;
    }

    const currentMessage = message;
    setMessage('');
    setIsResponseLoading(true);
    setIsSourcesVisible(false); 
    setError(''); 
    // Keep selectedImagePreview until response starts or is confirmed, then clear
    // setSelectedImagePreview(null); // Clearing this too early removes UI feedback

    try {
      const token = await getAccessToken();
      const apiUrl = "https://health.prestigedelta.com/research/";

      let payload = {};
      let formData = null;
      let headers = {
        'Authorization': `Bearer ${token}`,
      };
      let requestBody = null;
      
      if (threadId) {
        payload.thread_id = threadId;
      } else if (thread) {
        payload.thread_id = thread;
      }
      
      if (phoneNumber) {
        payload.patient_number = `+234${phoneNumber.slice(1)}`;
      }
      
      // Assuming selectedPatient state is managed elsewhere if this component doesn't set it.
      // If selectedPatient is meant to be used from props (e.g. `patient` prop), it should be used here.
      // For now, using the local `selectedPatient` state.
      if (selectedPatient) { 
        if (selectedPatient.phone_number && selectedPatient.phone_number.trim() !== "") {
          payload.patient_phone = selectedPatient.phone_number;
        } else {
          payload.patient_id = selectedPatient.id;
        }
      }
      
      payload.expertise_level = expertLevel;

      if (transcript) {
        const currentTime = new Date().toISOString();
        const transcriptData = JSON.stringify([
          { time: currentTime, speaker: "patient", content: "" },
          { time: currentTime, speaker: "doctor", content: transcript }
        ]);
        payload.transcript = JSON.parse(transcriptData);
      }

      const userMessageText = currentMessage.trim() || (uploadedImageUrl || selectedImage ? "Uploaded Image" : "");
      const userMessageDisplayContent = uploadedImageUrl || selectedImagePreview || currentMessage;
      
      const userMessage = {
        role: "user",
        content: userMessageDisplayContent,
        isImage: !!(uploadedImageUrl || selectedImagePreview),
        text: userMessageText,
        id: `query-${Date.now()}`
      };
      setChatMessages((prev) => [...prev, userMessage]);
      
      // Clear preview *after* adding user message to UI
      if (selectedImagePreview) setSelectedImagePreview(null);


      if (uploadedImageUrl) {
        payload.image = uploadedImageUrl;
        payload.caption = currentMessage.trim() ? currentMessage : "Analyze this image";
        headers['Content-Type'] = 'application/json';
        requestBody = JSON.stringify(payload);
      } else if (selectedImage) {
        formData = new FormData();
        Object.keys(payload).forEach(key => {
          formData.append(key, payload[key]);
        });
        formData.append('image', selectedImage);
        formData.append('caption', currentMessage.trim() ? currentMessage : "Analyze this image");
      } else {
        payload.query = currentMessage;
        headers['Content-Type'] = 'application/json';
        requestBody = JSON.stringify(payload);
      }

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: headers,
        body: formData || requestBody,
      });

      if (!response.body) {
        throw new Error("No response body");
      }
      
      // Reset image related states after successful submission initiation
      setSelectedImage(null);
      // setSelectedImagePreview(null); // Already cleared above
      setUploadedImageUrl(null);
      setIsExpertLevelLocked(false);

      let assistantMessage = { role: "assistant", content: "", citations: [], id: `response-${Date.now()}` };
      setChatMessages((prev) => [...prev, assistantMessage]);
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let buffer = "";

      if (uploadedImageUrl || formData) {
        let accumulatedResponse = '';
        try {
          while (!done) {
            const { value, done: doneReading } = await reader.read();
            done = doneReading;
            const chunkText = decoder.decode(value);
            accumulatedResponse += chunkText;
          }
          
          try {
            const jsonResponse = JSON.parse(accumulatedResponse.trim());
            assistantMessage.content = jsonResponse.assistant_response || accumulatedResponse.trim();
            assistantMessage.citations = jsonResponse.citations || [];
          } catch (e) {
            assistantMessage.content = accumulatedResponse.trim();
          }
        } catch (error) {
          console.error("Error processing image response:", error);
          assistantMessage.content = "Sorry, I had trouble processing the image. Please try again.";
        }
        
        assistantMessage.content = stripJsonPrefix(assistantMessage.content);
        setChatMessages((prev) => prev.map(msg => msg.id === assistantMessage.id ? { ...assistantMessage } : msg));

      } else {
        while (!done) {
          const { value, done: doneReading } = await reader.read();
          done = doneReading;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n");
          buffer = parts.pop() || ""; // Ensure buffer is always a string
          parts.forEach((part) => {
            if (part.trim()) {
              try {
                const parsed = JSON.parse(part);
                if (parsed.thread_id) {
                  setThreadId(parsed.thread_id);
                }
                if (parsed.assistant_response_chunk || parsed.accumulated_response) { // Check for both
                  assistantMessage.content = parsed.accumulated_response || assistantMessage.content + parsed.assistant_response_chunk;
                  assistantMessage.citations = parsed.citations || assistantMessage.citations;
                  setChatMessages((prev) => prev.map(msg => msg.id === assistantMessage.id ? { ...assistantMessage } : msg));
                }
              } catch (error) {
                console.error("Error parsing JSON chunk:", error, "Chunk:", part);
              }
            }
          });
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
      try {
        const balanceResult = await balanceCheck(expertLevel);
        if (balanceResult && balanceResult.sufficient_funds === false) {
          setBuyCreditsBalance(balanceResult.available_balance);
          setBuyCreditsRequiredAmount(balanceResult.required_amount);
          setBuyCreditsModalOpen(true);
        }
      } catch (balanceError) {
        console.error('Balance check failed:', balanceError);
      }
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again later.",
          id: `error-${Date.now()}`
        },
      ]);
      setError("Sorry, I encountered an error. Please try again later.");
    } finally {
      setIsResponseLoading(false);
      // Ensure image states are reset if not done already (e.g. early exit or error before API call)
      setSelectedImage(null);
      setSelectedImagePreview(null); 
      setUploadedImageUrl(null);
      setIsExpertLevelLocked(false);
      if (fileInputRef.current) { // Reset file input for next selection
          fileInputRef.current.value = "";
      }
    }
  }, [
    message, threadId, selectedPatient, expertLevel, setChatMessages, phoneNumber, transcript, 
    selectedImage, selectedImagePreview, uploadedImageUrl, isUploadingImage, thread, // Removed isExpertLevelLocked as it's set within
    setError, setThreadId, setIsResponseLoading, setIsSourcesVisible, 
    setBuyCreditsBalance, setBuyCreditsRequiredAmount, setBuyCreditsModalOpen,
    // Add other state setters if they are used from closure and cause lint warnings
  ]);

  const handleSuggestion = useCallback(async () => {
    console.log('handleSuggestion called with patient prop:', patient);
    
    const patientId = patient ? String(patient).trim() : null; // Use patient prop
    if (!patientId) {
      console.log('No valid patient ID available from prop');
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
      
      if (!response.ok) { // Check response.ok instead of response.status !== 200 for more general success check
        throw new Error(result.detail || "Failed to load suggestions");
      }

      const suggestionsData = Array.isArray(result) ? result : [];
      console.log('Setting suggestions:', suggestionsData);
      setSuggestion(suggestionsData);
      
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setError(error.message || "Failed to load suggestions.");
      setSuggestion([]);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, [patient, setError, setSuggestion, setIsLoadingSuggestions]); // Dependencies for useCallback

  useEffect(() => {
    console.log('useEffect triggered with patient prop:', patient);
    const patientId = patient ? String(patient).trim() : null;
    
    if (patientId) {
      console.log('Valid patient ID detected from prop, fetching suggestions...');
      handleSuggestion();
    } else {
      console.log('No valid patient ID from prop, resetting suggestions');
      setSuggestion([]);
      setIsLoadingSuggestions(false); // Ensure loading is false if no patient
    }
  }, [patient, handleSuggestion]); // Correct dependencies for useEffect

  if (isLoadingSuggestions) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: '100vh', // Consider '100%' if it's part of a larger layout
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'background.default',
          px: 2
        }}
      >
        <CircularProgress />
        <Typography sx={{ mt: 2 }} variant="body2" color="text.secondary">
          Loading suggestions...
        </Typography>
      </Box>
    );
  }

  // renderSuggestions function was defined but not called. 
  // If it's meant to be used, ensure it's called in the JSX.
  // For now, I'll assume the initial suggestions are the primary ones displayed on empty chat.
  /*
  const renderSuggestions = () => {
    if (!suggestions || suggestions.length === 0) return null;
    // ... implementation
  };
  */

  const localTheme = createTheme();
  
  return (
    <ThemeProvider theme={localTheme}>
      <> {/* Using Fragment shorthand */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            overflow: 'hidden',
            position: 'relative',
          }}
          className="chat-container"
        >
          {!onlyInput && (
            <Box
              sx={{
                flexGrow: 1,
                overflowY: disableOuterScroll ? 'hidden' : 'auto',
                px: { xs: 1, sm: 2 },
                py: 1,
                scrollbarWidth: 'thin',
                '&::-webkit-scrollbar': { width: '4px' },
                '&::-webkit-scrollbar-thumb': {
                  backgroundColor: 'primary.main',
                  borderRadius: '2px',
                },
                position: 'relative',
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                justifyContent: 'flex-start',
              }}
              className="outer-scroller" // This classname seems unused for scrolling logic now
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
                    height: '100%',
                    overflow: 'hidden', // Let inner scroller handle scroll
                    flexGrow: 1, 
                    display: 'flex', 
                    flexDirection: 'column',
                    justifyContent: 'flex-start', 
                  }}
                  className="inner-scroll-container" // This classname seems unused for scrolling logic
                >
                  <Box
                    ref={innerScrollerRef}
                    sx={{
                      height: '100%',
                      overflowY: 'auto',
                      scrollbarWidth: 'thin',
                      '&::-webkit-scrollbar': { width: '4px' },
                      '&::-webkit-scrollbar-thumb': {
                        backgroundColor: 'primary.main',
                        borderRadius: '2px',
                      },
                      pr: 1,
                      flexGrow: 1, 
                      display: 'flex',
                      flexDirection: 'column', 
                      paddingTop: '10px', 
                      paddingBottom: '20px' 
                    }}
                    className="inner-scroller chat-scroll-container" // This class is used by messagesEndRef.closest
                  >
                    <List sx={{ 
                      pt: 0, 
                      px: { xs: 0.5, sm: 1 }, 
                      width: '100%', 
                      // mb: 2, // Margin might push messagesEndRef too far if list is short
                      display: 'flex',
                      flexDirection: 'column',
                      flexGrow: 1 // Allow list to grow and push messagesEndRef down
                    }}>
                      {combinedMessages.map((chat, index) => (
                        <ChatMessage
                          key={chat.id || index} // Prefer unique ID if available
                          chat={chat}
                          isResponseLoading={isResponseLoading && index === combinedMessages.length - 1 && chat.role === 'assistant'}
                          isSourcesVisible={isSourcesVisible}
                          handleSourcesToggle={handleSourcesToggle}
                          isLatest={index === combinedMessages.length - 1}
                        />
                      ))}
                    </List>
                    <div ref={messagesEndRef} style={{ height: '1px', paddingTop: '20px' }} /> {/* paddingTop to ensure space for scrollIntoView */}
                  </Box>
                </Box>
              )}
            </Box> 
          )}
          {!hideInput && (
            <Box 
              sx={{ 
                flexShrink: 0, 
                position: 'relative', 
                zIndex: 5, 
                // mt: 'auto', // Removed, as parent flexbox structure should handle positioning
                borderTop: (theme) => `1px solid ${theme.palette.divider}`,
              }}
            >
              <Paper
                elevation={2}
                sx={{
                  p: { xs: 1, sm: 1.5 },
                  borderRadius: 0,
                  backgroundColor: 'rgba(248, 249, 250, 0.95)', // Slightly transparent background
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
                {previewModalOpen && (
                  <Modal
                    open={previewModalOpen}
                    onClose={handleClosePreviewModal}
                    closeAfterTransition
                    slots={{ backdrop: Backdrop }} // Updated for MUI v5
                    slotProps={{ // Updated for MUI v5
                      backdrop: {
                        timeout: 500,
                      },
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
                          overflow: 'auto', // Ensure modal content is scrollable if too large
                        }}
                      >
                        <img
                          src={selectedImagePreview} // This should be the original image URL if possible for full preview
                          alt="Full Preview"
                          style={{
                            width: '100%', // Or use maxWidth/maxHeight for better control
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
                  sx={{ gap: { xs: 0.5, sm: 1} }}
                >
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                  />
                  <Tooltip title="Attach Image">
                    <IconButton 
                      onClick={handleImageUploadClick} 
                      color="primary"
                      size={isMobile ? "small" : "medium"}
                      sx={{ 
                        p: { xs: '6px', sm: '8px' }, 
                        flexShrink: 0 
                      }}
                      disabled={isUploadingImage || isResponseLoading} // Disable while uploading/responding
                    >
                      <ImageIcon fontSize={isMobile ? "small" : "medium"} />
                    </IconButton>
                  </Tooltip>
                  <TextField
                    fullWidth
                    variant="outlined"
                    placeholder="Type your message..."
                    value={message}
                    onChange={handleTyping}
                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && (handleSendMessage(), e.preventDefault())} // Prevent default to avoid newline on enter
                    multiline
                    maxRows={4}
                    disabled={isResponseLoading || isUploadingImage}
                    className="chat-input-field"
                    sx={{
                      flexGrow: 1,
                      mx: { xs: 0.5, sm: 1 }, 
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '20px', 
                        fontSize: { xs: '0.875rem', sm: '1rem' },
                        py: { xs: 0.8, sm: 1 }, 
                        pr: { xs: 1, sm: 1.5 }, // Padding right for inner content
                        pl: { xs: 1.5, sm: 2 }, // Padding left for inner content
                      },
                    }}
                  />
                  <Tooltip title="Send Message">
                    <span> {/* Tooltip needs a DOM element child when button is disabled */}
                    <IconButton 
                      color="primary" 
                      onClick={handleSendMessage} 
                      disabled={(!message.trim() && !selectedImage && !uploadedImageUrl) || isResponseLoading || isUploadingImage}
                      size={isMobile ? "small" : "medium"}
                      sx={{ 
                        bgcolor: 'primary.main',
                        color: 'white',
                        '&:hover': {
                          bgcolor: 'primary.dark',
                        },
                        p: { xs: '6px', sm: '8px' },
                        '&.Mui-disabled': { // Style for disabled state
                            bgcolor: 'grey.300',
                        }
                      }}
                    >
                      <SendIcon fontSize={isMobile ? "small" : "medium"} />
                    </IconButton>
                    </span>
                  </Tooltip>
                </Box>
              </Paper>
            </Box>
          )}
        </Box>
        <Snackbar
          open={Boolean(error)}
          autoHideDuration={6000}
          onClose={() => setError('')}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          // TransitionProps={{ appear: false }} // appear is not a standard prop for TransitionProps here
        >
          <Alert onClose={() => setError('')} severity="error" sx={{ width: '100%' }}>
            {error}
          </Alert>
        </Snackbar>
        <BuyCreditsModal
          open={buyCreditsModalOpen}
          onClose={() => setBuyCreditsModalOpen(false)}
          balance={buyCreditsBalance}
          requiredAmount={buyCreditsRequiredAmount}
        />
      </>
    </ThemeProvider>
  );
};

export default ChatScreen;