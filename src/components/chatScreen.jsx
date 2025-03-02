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
  useMediaQuery
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
// 3. ChatScreen: Now supports two message sources and lets the user choose which AI to chat with.
// ----------------------------------------------------
const ChatScreen = ({
  phoneNumber,
  ws,          // WebSocket reference (passed in from parent)
  wsStatus,
  reviewId,
  sendOobRequest,
  chatMessages,   // WebSocket messages state (prop)
  setChatMessages // Setter for WebSocket messages (prop)
}) => {
  // Local state for researcher API messages
  const [researcherMessages, setResearcherMessages] = useState([]); // Renamed to researcherMessages
  const [message, setMessage] = useState('');
  const [threadId, setThreadId] = useState(null);
  const [isSourcesVisible, setIsSourcesVisible] = useState(false);
  const [isResponseLoading, setIsResponseLoading] = useState(false);
  const [error, setError] = useState('');
  // New state to track which AI to send messages to: 'researcher' or 'websocket'
  const [activeAI, setActiveAI] = useState('researcher');
  const theme = createTheme();

  const isMobile = useMediaQuery('(max-width: 768px)')

  const handleSendMessage = useCallback(async () => {
    if (!message.trim()) return;
    const currentMessage = message;
    setMessage('');
    const timestamp = Date.now();

    if (activeAI === 'researcher') {
      // Researcher API flow:
      setIsResponseLoading(true);
      try {
        const token = await getAccessToken();
        const apiUrl = 'https://health.prestigedelta.com/research/';
        const payload = { query: currentMessage, expertise_level: 'high' };
        if (threadId) payload.thread_id = threadId;

        // Add user's message to the researcher conversation - using setResearcherMessages
        const userMessage = { role: 'user', content: currentMessage, timestamp, source: 'researcher' };
        setResearcherMessages((prev) => [...prev, userMessage]); // Using setResearcherMessages

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
        const data = await response.json();
        console.log("Researcher API Response:", data); // Log the response for debugging
        if (data.thread_id) setThreadId(data.thread_id);
        setIsSourcesVisible(false);

        if (data.assistant_response) {
          const assistantMessage = {
            role: 'assistant',
            content: data.assistant_response,
            citations: data.citations,
            timestamp: Date.now(),
            source: 'researcher'
          };
          setResearcherMessages((prev) => [...prev, assistantMessage]); // Using setResearcherMessages
        }
      } catch (error) {
        console.error('Error sending message to Researcher API:', error);
        setError('Sorry, I encountered an error with Researcher AI. Please try again later.');
        const errorMessage = {
          role: 'assistant',
          content: 'Sorry, I encountered an error with Researcher AI. Please try again later.',
          timestamp: Date.now(),
          source: 'researcher'
        };
        setResearcherMessages((prev) => [...prev, errorMessage]); // Using setResearcherMessages
      } finally {
        setIsResponseLoading(false);
      }
    } else if (activeAI === 'websocket') {
      // WebSocket flow:
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        const userMessage = { role: 'user', content: currentMessage, timestamp, source: 'websocket' };
        setChatMessages((prev) => [...prev, userMessage]); // Using setChatMessages for websocket messages
        ws.current.send(JSON.stringify({ type: 'chat_message', message: currentMessage })); // Changed type to 'chat_message'
      } else {
        setError('WebSocket is not connected.');
      }
    }
  }, [message, activeAI, threadId, ws, setChatMessages, setResearcherMessages]); // Added setResearcherMessages to useCallback dependencies

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

  const handleTyping = (event) => {
    setMessage(event.target.value);
    // Optionally, trigger an out-of-band request here
    // if (event.target.value.trim() !== '') sendOobRequest();
  };

  const extractThinkContent = (text) => {
    const thinkMatch = text.match(/<think>([\s\S]*?)<\/think>/i);
    const thinkContent = thinkMatch ? thinkMatch[1].trim() : null;
    const remainingContent = text.replace(/<think>[\s\S]*?<\/think>/i, '').trim();
    return { thinkContent, remainingContent };
  };

  // Combine both message arrays and sort by timestamp so that conversation flows naturally
  const combinedMessages = [...chatMessages, ...researcherMessages].sort((a, b) => a.timestamp - b.timestamp); // Using researcherMessages

  // A simple function to determine the styling based on message source and role.
  const getMessageStyle = (message) => {
    if (message.role === 'user') {
      return {
        backgroundColor: '#d1e7dd', // Light green for user
        textAlign: 'right',
      };
    } else if (message.role === 'assistant') {
      // Use different colors for the two AIs:
      if (message.source === 'researcher') {
        return {
          backgroundColor: '#f8d7da', // Light red for researcher AI
          textAlign: 'left',
        };
      } else if (message.source === 'websocket') {
        return {
          backgroundColor: '#cff4fc', // Light blue for websocket AI
          textAlign: 'left',
        };
      }
    }
    return {};
  };

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
            {/* <ToggleButton value="websocket" sx={{ color: '#1976d2', borderColor: '#1976d2' }}>
              Consult AI
            </ToggleButton> */}
          </ToggleButtonGroup>
        </Box>

        {/* Chat messages */}
        <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2, }}>
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
                    ) :  chat.role !== 'assistant' ? (
                      chat.content // Display user message here directly
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
                                      {getDomainFromUrl(citation)}
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
              if (e.key === 'Enter') handleSendMessage();
            }}
          />
          <IconButton
            color="primary"
            aria-label="send"
            onClick={handleSendMessage}
            disabled={!message.trim()}
          >
            <SendIcon />
          </IconButton>
        </Paper>
      </Box>
      <Snackbar open={Boolean(error)} autoHideDuration={6000} onClose={() => setError('')} message={error} />
    </ThemeProvider>
  );
};

export default ChatScreen;