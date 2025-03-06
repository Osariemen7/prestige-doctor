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
  Alert
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import Skeleton from '@mui/material/Skeleton';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getAccessToken } from './api';

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
              <Link
                key={index}
                href={citations[citationIndex]}
                target="_blank"
                rel="noopener noreferrer"
                sx={{
                  color: '#87CEFA',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                }}
              >
                {part}
              </Link>
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
      sx={{ mt: 1 }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="subtitle2" sx={{ fontSize: '0.75rem' }}>
          {expanded ? 'Hide Thought' : 'Show Thought'}
        </Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ fontSize: '0.75rem', color: 'grey' }}>
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
// 3. ChatScreen: Chat interface that supports multiple AI modes and expert level selection.
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
  // AI mode: 'researcher' or 'websocket' (only researcher enabled for now)
  const [activeAI, setActiveAI] = useState('researcher');
  // Expert level for AI responses
  const [expertLevel, setExpertLevel] = useState('low');
  // Dummy selectedPatient state (if needed in your API payload)
  const [selectedPatient, setSelectedPatient] = useState(null);

  // Dummy showSnackbar implementation
  const showSnackbar = (msg, severity) => {
    setError(msg);
  };

  const theme = createTheme();
  const isMobile = useMediaQuery('(max-width: 768px)');

  // Minimal styling helper for messages based on role
  const getMessageStyle = (chat) => {
    return chat.role === 'user'
      ? { backgroundColor: '#e0f7fa', alignSelf: 'flex-end' }
      : { backgroundColor: '#f0f0f0', alignSelf: 'flex-start' };
  };

  // Handle input changes
  const handleTyping = (e) => {
    setMessage(e.target.value);
  };

  // Extract <think> block from the assistant's response, if any
  const extractThinkContent = (text) => {
    const thinkMatch = text.match(/<think>([\s\S]*?)<\/think>/i);
    const thinkContent = thinkMatch ? thinkMatch[1].trim() : null;
    const remainingContent = text.replace(/<think>[\s\S]*?<\/think>/i, '').trim();
    return { thinkContent, remainingContent };
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
      showSnackbar("Sorry, I encountered an error. Please try again later.", 'error');
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again later.",
        },
      ]);
    } finally {
      setIsResponseLoading(false);
    }
  }, [message, threadId, selectedPatient, expertLevel, showSnackbar, setChatMessages]);

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: 'sans-serif' }}>
        {/* Header with AI selection */}
        <Box sx={{ backgroundColor: 'white', padding: '10px', color: '#000', textAlign: 'center' }}>
          <Typography variant="h6" component="h2">
            What do you want to know?
          </Typography>
          <ToggleButtonGroup
            value={activeAI}
            exclusive
            onChange={(e, newAI) => {
              if (newAI !== null) setActiveAI(newAI);
            }}
            sx={{ mt: 1 }}
          >
            <ToggleButton value="researcher" sx={{ color: '#1976d2', borderColor: '#1976d2' }}>
              Researcher AI
            </ToggleButton>
            {/* Uncomment the below ToggleButton if you implement Consult AI */}
            {/* <ToggleButton value="websocket" sx={{ color: '#1976d2', borderColor: '#1976d2' }}>
              Consult AI
            </ToggleButton> */}
          </ToggleButtonGroup>
        </Box>

        {/* Chat messages */}
        <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2 }}>
          <List>
            {combinedMessages.map((chat, index) => (
              <ListItem
                key={index}
                alignItems="flex-start"
                sx={{ flexDirection: chat.role === 'user' ? 'row-reverse' : 'row' }}
              >
                <ListItemText
                  primary={
                    chat.role === 'assistant' && isResponseLoading && index === combinedMessages.length - 1 ? (
                      <CircularProgress size={24} />
                    ) : chat.role !== 'assistant' ? (
                      chat.content
                    ) : null
                  }
                  secondary={
                    <>
                      {chat.role === 'assistant' && chat.content && !isResponseLoading && (() => {
                        const { thinkContent, remainingContent } = extractThinkContent(chat.content);
                        return (
                          <Box sx={{ mt: 1, mb: 1 }}>
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
                      {chat.role === 'assistant' &&
                        chat.citations &&
                        chat.citations.length > 0 &&
                        !isResponseLoading && (
                          <Box sx={{ mt: 1 }}>
                            <IconButton
                              onClick={handleSourcesToggle}
                              size="small"
                              sx={{
                                border: '1px solid #ccc',
                                borderRadius: '20px',
                                p: '2px',
                                mr: 1,
                              }}
                            >
                              <FactCheckIcon fontSize="small" />
                            </IconButton>
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
                                      {new URL(citation).hostname}
                                    </Link>
                                  </Typography>
                                ))}
                              </Box>
                            </Collapse>
                          </Box>
                        )}
                    </>
                  }
                  sx={{
                    ...getMessageStyle(chat),
                    padding: '10px',
                    borderRadius: '8px',
                    display: 'inline-block',
                    maxWidth: '80%',
                    wordWrap: 'break-word',
                  }}
                />
              </ListItem>
            ))}
            {isResponseLoading && combinedMessages.length > 0 && (
              <ListItem alignItems="flex-start" sx={{ justifyContent: 'flex-start' }}>
                <ListItemText
                  primary={<Skeleton variant="text" width={200} height={24} />}
                  sx={{ textAlign: 'left' }}
                />
              </ListItem>
            )}
          </List>
        </Box>

        {/* Chat input */}
        <Paper
          elevation={3}
          sx={{ padding: '10px', display: 'flex', alignItems: 'center', borderTop: '1px solid #ccc' }}
        >
          <TextField
            fullWidth
            placeholder={`Message ${activeAI === 'researcher' ? 'Researcher AI' : 'Consult AI'}`}
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
          <IconButton color="primary" aria-label="send" onClick={handleSendMessage} disabled={!message.trim()}>
            <SendIcon />
          </IconButton>
        </Paper>

        {/* Expert Level Selection */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '10px', p: 2 }}>
          <FormControl variant="standard" sx={{ minWidth: 120 }}>
            <Select
              value={expertLevel}
              onChange={(e) => setExpertLevel(e.target.value)}
              displayEmpty
            >
              <MenuItem value="low">
                <em>AI Level</em>
              </MenuItem>
              <MenuItem value="low">Basic ₦50</MenuItem>
              <MenuItem value="medium">Intermediate ₦200</MenuItem>
              <MenuItem value="high">Advanced ₦500</MenuItem>
            </Select>
          </FormControl>
          {expertLevel === 'high' && (
            <Typography variant="caption" color="textSecondary">
              Advanced responses might take a few minutes.
            </Typography>
          )}
        </Box>
      </Box>

      <Snackbar open={Boolean(error)} autoHideDuration={6000} onClose={() => setError('')}>
        <Alert onClose={() => setError('')} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
    </ThemeProvider>
  );
};

export default ChatScreen;
