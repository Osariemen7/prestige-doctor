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
  Paper
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

const ChatScreen = ({
  phoneNumber,
  setChatMessages,
  chatMessages,
  sendOobRequest
}) => {
  const [message, setMessage] = useState('');
  const [apiResponse, setApiResponse] = useState(null);
  const [threadId, setThreadId] = useState(null);
  const [isSourcesVisible, setIsSourcesVisible] = useState(false);
  const [isResponseLoading, setIsResponseLoading] = useState(false);
  const [error, setError] = useState('');
  const theme = createTheme();

  const handleSendMessage = useCallback(async () => {
    if (!message.trim()) return;

    const currentMessage = message;
    setMessage('');
    setIsResponseLoading(true);

    try {
      const token = await getAccessToken();
      const apiUrl = 'https://health.prestigedelta.com/research/';
      const payload = { query: currentMessage, expertise_level: 'high' };
      if (threadId) {
        payload.thread_id = threadId;
      }

      // Add user message to chat.
      const userMessage = { role: 'user', content: currentMessage };
      setChatMessages((prevMessages) => [...prevMessages, userMessage]);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      console.log('API Response:', data);

      setApiResponse(data);
      if (data.thread_id) {
        setThreadId(data.thread_id);
      }
      setIsSourcesVisible(false);

      if (data.assistant_response) {
        const assistantMessage = {
          role: 'assistant',
          content: data.assistant_response,
          citations: data.citations
        };
        setChatMessages((prevMessages) => [...prevMessages, assistantMessage]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Sorry, I encountered an error. Please try again later.');
      setApiResponse({
        assistant_response: 'Sorry, I encountered an error. Please try again later.',
        citations: []
      });
      setChatMessages((prevMessages) => [
        ...prevMessages,
        { role: 'assistant', content: 'Sorry, I encountered an error. Please try again later.' }
      ]);
    } finally {
      setIsResponseLoading(false);
    }
  }, [message, phoneNumber, threadId, setChatMessages]);

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
    if (event.target.value.trim() !== '') {
      sendOobRequest();
    }
  };

  const extractThinkContent = (text) => {
    const thinkMatch = text.match(/<think>([\s\S]*?)<\/think>/i);
    const thinkContent = thinkMatch ? thinkMatch[1].trim() : null;
    const remainingContent = text.replace(/<think>[\s\S]*?<\/think>/i, '').trim();
    return { thinkContent, remainingContent };
  };

  return (
    <ThemeProvider theme={theme}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          fontFamily: 'sans-serif'
        }}
      >
        {/* Header */}
        <Box
          sx={{
            backgroundColor: '#1976d2',
            padding: '10px',
            color: 'white',
            textAlign: 'center'
          }}
        >
          <Typography variant="h6" component="h2">
            What do you want to know?
          </Typography>
        </Box>

        {/* Chat messages */}
        <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2 }}>
          <List>
            {chatMessages.map((chat, index) => (
              <ListItem
                key={index}
                alignItems="flex-start"
                sx={{
                  flexDirection: chat.role === 'user' ? 'row-reverse' : 'row',
                  justifyContent: 'flex-start'
                }}
              >
                <ListItemText
                  primary={
                    chat.role === 'assistant' && isResponseLoading && index === chatMessages.length - 1 ? (
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
                                mr: 1
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
                                      sx={{ ml: 0.5, fontSize: '0.75rem', color: '#2b6cb0', textDecoration: 'underline' }}
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
                    textAlign: chat.role === 'user' ? 'right' : 'left',
                    backgroundColor: chat.role === 'user' ? '#e0f7fa' : '#f0f0f0',
                    padding: '10px',
                    borderRadius: '8px',
                    display: 'inline-block',
                    maxWidth: '80%',
                    wordWrap: 'break-word'
                  }}
                />
              </ListItem>
            ))}
            {isResponseLoading && chatMessages.length > 0 && (
              <ListItem alignItems="flex-start" sx={{ justifyContent: 'flex-start' }}>
                <ListItemText primary={<Skeleton variant="text" width={200} height={24} />} sx={{ textAlign: 'left' }} />
              </ListItem>
            )}
          </List>
        </Box>

        {/* Chat input at the bottom */}
        <Paper
          elevation={3}
          sx={{
            padding: '10px',
            display: 'flex',
            alignItems: 'center',
            borderTop: '1px solid #ccc'
          }}
        >
          <TextField
            fullWidth
            placeholder="Message Assistant"
            variant="outlined"
            value={message}
            onChange={handleTyping}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSendMessage();
              }
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

      {/* Error Toast */}
      <Snackbar
        open={Boolean(error)}
        autoHideDuration={6000}
        onClose={() => setError('')}
        message={error}
      />
    </ThemeProvider>
  );
};

export default ChatScreen;
