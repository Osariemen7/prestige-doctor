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
  ImageListItem
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PersonIcon from '@mui/icons-material/Person';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ImageIcon from '@mui/icons-material/Image'; // Import ImageIcon
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getAccessToken } from './api';

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
          <ExpandMoreIcon sx={{ color: theme.palette.primary.main, fontSize: '1.2rem' }} />
        }
        sx={{
          padding: '0 8px',
          minHeight: '36px',
          '& .MuiAccordionSummary-content': {
            margin: '6px 0',
          }
        }}
      >
        <Typography
          variant="subtitle2"
          sx={{
            fontSize: '0.75rem',
            color: theme.palette.text.secondary,
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
          }}
        >
          <MenuBookIcon sx={{ fontSize: '1rem' }} />
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
          gap: 1.5,
          padding: '8px 0',
        }}
      >
        {/* Avatar for sender */}
        <Avatar
          sx={{
            width: 36,
            height: 36,
            bgcolor: isUser ? 'primary.light' : 'secondary.light',
            mt: 0.5,
          }}
        >
          {isUser ? <PersonIcon /> : <SmartToyIcon />}
        </Avatar>

        {/* Message content */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
             width: '100%',
          }}
        >
          {/* Message bubble */}
          <Paper
              elevation={0}
    sx={{
        p: 2,
        borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
        backgroundColor: isUser ? 'primary.light' : 'grey.100',
        color: isUser ? 'white' : 'text.primary',
        position: 'relative',
        wordBreak: 'break-word',
        maxWidth: '100%',
        minWidth: '50px' // Added minWidth to prevent layout issues with images
    }}
          >
            {isResponseLoading && isLatest ? (
              <CircularProgress size={24} thickness={4} sx={{ color: isUser ? 'white' : 'primary.main' }} />
            ) : isUser ? (
              chat.isImage ? (
                <Box sx={{ maxWidth: 300 }}> {/* Adjust maxWidth as needed */}
                  <img
                    src={chat.content} // Assuming chat.content is base64 or URL
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
          {!isUser && chat.citations && Array.isArray(chat.citations) && chat.citations.length > 0 && !isResponseLoading && (
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

                  {Array.isArray(chat.citations) && chat.citations.map((citation, citationIndex) => {
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
  patient
}) => {
  // Local state
  const [message, setMessage] = useState('');
  const [threadId, setThreadId] = useState(null);
  const [isSourcesVisible, setIsSourcesVisible] = useState(false);
  const [isResponseLoading, setIsResponseLoading] = useState(false);
  const [error, setError] = useState('');
  const [expertLevel, setExpertLevel] = useState('low');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [suggestions, setSuggestion] = useState([]); // Step 4: Initial state is [] - empty array
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null); // State for selected image file
  const [selectedImagePreview, setSelectedImagePreview] = useState(null); // State for image preview URL
  const [isExpertLevelLocked, setIsExpertLevelLocked] = useState(false); // State to lock expert level
  const isMobile = useMediaQuery('(max-width: 768px)');
  const fileInputRef = useRef(null); // Ref for hidden file input

  // Handle input changes
  const handleTyping = (e) => {
    setMessage(e.target.value);
  };

  const handleSourcesToggle = () => {
    setIsSourcesVisible((prev) => !prev);
  };

  // Use chatMessages directly (or merge with any additional messages as needed)
  const combinedMessages = chatMessages;

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


  // Handle sending a message
  const handleSendMessage = useCallback(async () => {
    if (!message.trim() && !selectedImage) return; // Don't send empty messages or without image

    const currentMessage = message;
    setMessage('');
    setIsResponseLoading(true);
    setIsSourcesVisible(false); // Reset sources visibility on new message
    setError(''); // Clear any previous errors
    setSelectedImagePreview(null); // Clear image preview after sending

    try {
      const token = await getAccessToken();
      const apiUrl = "https://health.prestigedelta.com/research/";

      const formData = new FormData();

      if (threadId) {
        formData.append('thread_id', threadId);
      } else {
        formData.append('thread_id', thread);
      }
      formData.append('patient_number', `+234${phoneNumber.slice(1)}`);
      if (selectedPatient) {
        if (selectedPatient.phone_number && selectedPatient.phone_number.trim() !== "") {
          formData.append('patient_phone', selectedPatient.phone_number);
        } else {
          formData.append('patient_id', selectedPatient.id);
        }
      }
      formData.append('expertise_level', expertLevel); // Use current expertLevel, will be 'high' if image is uploaded
      if (selectedImage) {
        formData.append('image', selectedImage);
        formData.append('caption', currentMessage.trim() ? currentMessage : "Analyze this image"); // Use caption if text is present
      } else {
        formData.append('query', currentMessage); // Send text query if no image
      }

      if (transcript) {
        const currentTime = new Date().toISOString();
        formData.append('transcript', JSON.stringify([
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
        ]));
      }

      // Append user's message
      const userMessageContent = selectedImagePreview ? selectedImagePreview : currentMessage;
      const userTextMessage = selectedImage ? (currentMessage.trim() ? currentMessage : "Uploaded Image") : currentMessage;

      const userMessage = {
        role: "user",
        content: userMessageContent,
        isImage: !!selectedImagePreview, // Flag as image message
        text: userTextMessage, // Store text content separately for image messages
      };
      setChatMessages((prev) => [...prev, userMessage]);

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.body) {
        throw new Error("No response body");
      }

      // Reset selected image and preview after sending
      setSelectedImage(null);
      setSelectedImagePreview(null);
      setIsExpertLevelLocked(false); // Unlock dropdown after image sent and response started

      // Append a placeholder for assistant response
      let assistantMessage = { role: "assistant", content: "", citations: [] };
      setChatMessages((prev) => [...prev, assistantMessage]);
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let buffer = "";

      if (selectedImage) {
        // Handle plain text response for image upload
        let accumulatedResponse = '';
        while (!done) {
          const { value, done: doneReading } = await reader.read();
          done = doneReading;
          const chunkText = decoder.decode(value);
          accumulatedResponse += chunkText;
        }
        assistantMessage.content = accumulatedResponse.trim();
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
  }, [message, threadId, selectedPatient, expertLevel, setChatMessages, phoneNumber, transcript, selectedImage, isExpertLevelLocked, selectedImagePreview]);

  const handleSuggestion = async () => {
    setIsLoadingSuggestions(true);
    const formData = {
      user_type: 'doctor',
      patient_id: patient,
    };
    const accessToken = await getAccessToken();
    try {
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
      if (response.status !== 200) {
        setError("Failed to load suggestions.");
      } else {
        setSuggestion(result);
        console.log("Suggestions after fetch (Success):", result); // Debug log after successful fetch
      }
    } catch (error) {
      console.error(error);
      setError("Failed to load suggestions.");
      setSuggestion(null); // Or set to an empty array [] if you prefer a default array in error case
      console.log("Suggestions fetch failed, setting to null/[]"); // Debug log on failure
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  useEffect(() => {
    handleSuggestion();
  }, [patient]);

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
          <CircularProgress />
          <Typography sx={{ mt: 2 }} variant="body2" color="text.secondary">
            Loading suggestions...
          </Typography>
        </Box>
      </ThemeProvider>
    );
  }

  console.log("Suggestions before render:", suggestions); // Debug log before rendering suggestions

  return (
    <ThemeProvider theme={theme}>
      <Box
  sx={{
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    overflow: 'hidden', // Prevent outer scrolling
  }}
>
        {/* Main content area with messages */}
        <Box
    sx={{
      flexGrow: 1,
      overflowY: 'auto',
      px: { xs: 2, sm: 3 },
      py: 2,
      scrollbarWidth: 'thin', // Firefox
      '&::-webkit-scrollbar': { width: '6px' }, // Webkit browsers
      '&::-webkit-scrollbar-thumb': {
        backgroundColor: theme.palette.primary.main,
        borderRadius: '3px',
      },
    }}
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
                  {/* Step 3: Defensive check - only map if suggestions is an array */}
                  {Array.isArray(suggestions) ? suggestions.map((suggestion) => (
                    <Chip
                      key={suggestion}
                      label={suggestion}
                      onClick={() => setMessage(suggestion)}
                      sx={{
                        bgcolor: 'grey.100',
                        '&:hover': {
                          bgcolor: 'primary.light',
                          color: 'white',
                        },
                      }}
                    />
                  )) : (
                    <Typography variant="body2" color="text.secondary">
                      Failed to load suggestions.
                    </Typography>
                  )}
                </Box>
              </Paper>
            </Box>
          )}

          {combinedMessages.length > 0 && (
            <Box sx={{ maxWidth: '900px', mx: 'auto', width: '100%' }}>
              <List>
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
            </Box>
          )}
        </Box>

        {/* Footer: Input area styled as per provided snippet */}
        <Box sx={{ flexShrink: 0, borderTop: '1px solid', borderColor: 'grey.200', backgroundColor: 'background.paper' }}>
    <Box sx={{ p: 2, width: '100%' }}>
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
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <TextField
          fullWidth
          placeholder="Ask anything or upload image..."
          variant="standard"
          multiline
          minRows={1}
          maxRows={4}
          InputProps={{ disableUnderline: true, style: { fontSize: '16px' } }}
          value={message}
          onChange={handleTyping}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          sx={{ marginBottom: '8px' }}
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
            <Box sx={{ display: 'flex', justifyContent: 'flex-start', gap: '10px' }}>
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
                  <MenuItem value="low" disabled={isExpertLevelLocked || isResponseLoading}>Basic $0.05</MenuItem>
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

        <Snackbar
          open={Boolean(error)}
          autoHideDuration={6000}
          onClose={() => setError('')}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
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