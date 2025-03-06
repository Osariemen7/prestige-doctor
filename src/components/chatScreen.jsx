import React, { useState, useEffect, useCallback } from 'react';
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
  ListItemText,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Snackbar,
  Paper,
  ToggleButton,
  ToggleButtonGroup,
  useMediaQuery,
  Button,
  FormControl,
  Select,
  MenuItem,
  Alert,
  Avatar,
  Chip,
  Tooltip,
  Divider,
  Fade
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PersonIcon from '@mui/icons-material/Person';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import VerifiedIcon from '@mui/icons-material/Verified';
import LocalAtmIcon from '@mui/icons-material/LocalAtm';
import Skeleton from '@mui/material/Skeleton';
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
          boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
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
    MuiToggleButton: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          textTransform: 'none',
          fontWeight: 500,
          padding: '6px 16px',
          '&.Mui-selected': {
            backgroundColor: '#2563eb',
            color: 'white',
            '&:hover': {
              backgroundColor: '#1d4ed8',
              color: 'white',
            },
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
            maxWidth: '75%',
            display: 'flex',
            flexDirection: 'column',
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
            }}
          >
            {isResponseLoading && isLatest ? (
              <CircularProgress size={24} thickness={4} sx={{ color: isUser ? 'white' : 'primary.main' }} />
            ) : isUser ? (
              <Typography>{chat.content}</Typography>
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
// 4. ExpertLevelSelector: Improved pricing tier selection
// ----------------------------------------------------
const ExpertLevelSelector = ({ expertLevel, setExpertLevel }) => {
  const levels = [
    { value: 'low', label: 'Basic', price: '₦50', description: 'Quick general answers' },
    { value: 'medium', label: 'Intermediate', price: '₦200', description: 'Detailed answers with citations' },
    { value: 'high', label: 'Advanced', price: '₦500', description: 'Expert-level analysis with comprehensive research' },
  ];

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        border: '1px solid',
        borderColor: 'grey.200',
        borderRadius: 2,
      }}
    >
      <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 500 }}>
        Expertise Level
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        {levels.map((level) => (
          <Paper
            key={level.value}
            elevation={0}
            onClick={() => setExpertLevel(level.value)}
            sx={{
              p: 1.5,
              border: '1px solid',
              borderColor: expertLevel === level.value ? 'primary.main' : 'grey.200',
              borderRadius: 1.5,
              flex: '1 1 0',
              minWidth: '110px',
              cursor: 'pointer',
              backgroundColor: expertLevel === level.value ? 'rgba(37, 99, 235, 0.05)' : 'background.paper',
              transition: 'all 0.2s ease',
              position: 'relative',
              overflow: 'hidden',
              '&:hover': {
                borderColor: 'primary.main',
                backgroundColor: 'rgba(37, 99, 235, 0.03)',
              },
            }}
          >
            {expertLevel === level.value && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  color: 'primary.main',
                }}
              >
                <VerifiedIcon fontSize="small" />
              </Box>
            )}

            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 600,
                mb: 0.5,
                color: expertLevel === level.value ? 'primary.main' : 'text.primary'
              }}
            >
              {level.label}
            </Typography>

            <Typography
              variant="body2"
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                color: 'text.secondary',
                fontWeight: 500,
                mb: 1
              }}
            >
              <LocalAtmIcon sx={{ fontSize: '1rem' }} /> {level.price}
            </Typography>

            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {level.description}
            </Typography>
          </Paper>
        ))}
      </Box>

      {expertLevel === 'high' && (
        <Alert severity="info" sx={{ mt: 2, borderRadius: 1 }}>
          Advanced responses may take a few minutes to compile comprehensive research.
        </Alert>
      )}
    </Paper>
  );
};

// ----------------------------------------------------
// 5. Main ChatScreen Component
// ----------------------------------------------------
const ChatScreen = ({
  phoneNumber,
  ws,          // WebSocket reference (passed in from parent)
  wsStatus,
  chatMessages,
  setChatMessages
}) => {
  // Local state
  const [message, setMessage] = useState('');
  const [threadId, setThreadId] = useState(null);
  const [isSourcesVisible, setIsSourcesVisible] = useState(false);
  const [isResponseLoading, setIsResponseLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeAI, setActiveAI] = useState('researcher');
  const [expertLevel, setExpertLevel] = useState('low');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showExpertSelector, setShowExpertSelector] = useState(false);

  const isMobile = useMediaQuery('(max-width: 768px)');

  // Handle input changes
  const handleTyping = (e) => {
    setMessage(e.target.value);
  };

  const handleSourcesToggle = () => {
    setIsSourcesVisible((prev) => !prev);
  };

  // Use chatMessages directly (or merge with any additional messages as needed)
  const combinedMessages = chatMessages;

  // Handle sending a message
  const handleSendMessage = useCallback(async () => {
    if (!message.trim()) return;

    const currentMessage = message;
    setMessage('');
    setIsResponseLoading(true);

    try {
      const token = await getAccessToken();
      const apiUrl = "https://health.prestigedelta.com/research/";
      const payload = { query: currentMessage, expertise_level: expertLevel };
      if (threadId) {
        payload.thread_id = threadId;
      }
      payload.phone_number = phoneNumber;
      if (selectedPatient) {
        if (selectedPatient.phone_number && selectedPatient.phone_number.trim() !== "") {
          payload.patient_phone = selectedPatient.phone_number;
        } else {
          payload.patient_id = selectedPatient.id;
        }
      }

      // Append user's message
      const userMessage = { role: "user", content: currentMessage };
      setChatMessages((prev) => [...prev, userMessage]);

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.body) {
        throw new Error("No response body");
      }

      // Append a placeholder for assistant response
      let assistantMessage = { role: "assistant", content: "", citations: [] };
      setChatMessages((prev) => [...prev, assistantMessage]);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let buffer = "";

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
  }, [message, threadId, selectedPatient, expertLevel, setChatMessages, phoneNumber]);

  return (
    <ThemeProvider theme={theme}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          backgroundColor: 'background.default',
        }}
      >
        {/* Header with AI selection */}
        <Paper
          elevation={2}
          sx={{
            py: 2,
            px: 3,
            color: 'text.primary',
            position: 'sticky',
            top: 0,
            zIndex: 10,
            borderRadius: 0,
          }}
        >
          <Box sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 2,
          }}>
            <Typography
              variant="h6"
              component="h1"
              sx={{
                fontWeight: 600,
                fontSize: { xs: '1.1rem', sm: '1.25rem' },
              }}
            >
              Health Research Assistant
            </Typography>

            <ToggleButtonGroup
              value={activeAI}
              exclusive
              onChange={(e, newAI) => {
                if (newAI !== null) setActiveAI(newAI);
              }}
              size={isMobile ? "small" : "medium"}
            >
              <ToggleButton value="researcher">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <MenuBookIcon fontSize="small" />
                  <Typography
                    sx={{
                      display: { xs: 'none', sm: 'block' }
                    }}
                  >
                    Researcher AI
                  </Typography>
                </Box>
              </ToggleButton>
              {/* Uncomment the below ToggleButton if you implement Consult AI */}
              {/* <ToggleButton value="websocket">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <SmartToyIcon fontSize="small" />
                  <Typography
                    sx={{
                      display: { xs: 'none', sm: 'block' }
                    }}
                  >
                    Consult AI
                  </Typography>
                </Box>
              </ToggleButton> */}
            </ToggleButtonGroup>
          </Box>

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mt: 1,
              display: { xs: 'none', sm: 'block' },
            }}
          >
            Ask any medical or health-related question for evidence-based answers
          </Typography>
        </Paper>

        {/* Main content area with messages */}
        <Box
          sx={{
            flexGrow: 1,
            overflowY: 'auto',
            px: { xs: 2, sm: 4 },
            py: 2,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Welcome message if no messages yet */}
          {combinedMessages.length === 0 && (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                maxWidth: '600px',
                mx: 'auto',
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
                  Ask any health-related question. I can provide research-backed information on medical conditions, treatments, nutrition, and more.
                </Typography>

                <Divider sx={{ mb: 3 }} />

                <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 500 }}>
                  Try asking about:
                </Typography>

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center' }}>
                  {[
                    "Symptoms of diabetes",
                    "Latest COVID treatments",
                    "Benefits of intermittent fasting",
                    "Managing hypertension",
                  ].map((suggestion) => (
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
                  ))}
                </Box>
              </Paper>

              <Button
                variant="outlined"
                color="primary"
                sx={{ mt: 3 }}
                onClick={() => setShowExpertSelector(!showExpertSelector)}
              >
                {showExpertSelector ? "Hide Expertise Options" : "Choose Expertise Level"}
              </Button>

              <Collapse in={showExpertSelector} sx={{ width: '100%', mt: 2 }}>
                <ExpertLevelSelector
                  expertLevel={expertLevel}
                  setExpertLevel={setExpertLevel}
                />
              </Collapse>
            </Box>
          )}

          {/* Chat messages */}
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

        {/* Footer with input and settings */}
        <Box
          sx={{
            borderTop: '1px solid',
            borderColor: 'grey.200',
            backgroundColor: 'background.paper',
          }}
        >
          {/* Expert level selection (collapsed by default on mobile) */}
          {combinedMessages.length > 0 && (
            <Collapse in={showExpertSelector}>
              <Box sx={{ px: { xs: 2, sm: 4 }, py: 2, maxWidth: '900px', mx: 'auto' }}>
                <ExpertLevelSelector
                  expertLevel={expertLevel}
                  setExpertLevel={setExpertLevel}
                />
              </Box>
            </Collapse>
          )}

          {/* Message input */}
          <Box
            sx={{
              p: 2,
              maxWidth: '900px',
              mx: 'auto',
              display: 'flex',
              flexDirection: 'column',
              width: '100%',
            }}
          >
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}>
              <TextField
                fullWidth
                placeholder={`Ask a health question...`}
                variant="outlined"
                value={message}
                onChange={handleTyping}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              <IconButton
                color="primary"
                aria-label="send"
                onClick={handleSendMessage}
                disabled={!message.trim()}
                sx={{ ml: 1 }}
              >
                <SendIcon />
              </IconButton>
            </Box>

            <Button
              variant="outlined"
              size="small"
              onClick={() => setShowExpertSelector(!showExpertSelector)}
              sx={{
                mt: 1,
                alignSelf: 'flex-start',
                textTransform: 'none',
                fontSize: '0.8rem',
                borderColor: 'grey.300',
                color: 'text.secondary',
                '&:hover': {
                  borderColor: 'primary.main',
                  color: 'primary.main',
                },
              }}
            >
              {showExpertSelector ? "Hide Expertise Options" : "Choose Expertise Level"}
            </Button>
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