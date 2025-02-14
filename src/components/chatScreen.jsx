import React, { useState, useEffect, useCallback } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import {
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  Link,
  Collapse,
  List,
  ListItem,
  ListItemText,
  Divider,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Snackbar
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';
import ImageIcon from '@mui/icons-material/Image';
import DescriptionIcon from '@mui/icons-material/Description';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
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
                  color: '#87CEFA', // Light sky blue
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
// 2. ThoughtAccordion: Displays the model thought at the top with a toggle label.
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
  sendOobRequest,
  isModal = false
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

    // Clear the input immediately for UX.
    const currentMessage = message;
    setMessage('');
    setIsResponseLoading(true);

    try {
      const token = await getAccessToken();
      const apiUrl = 'https://health.prestigedelta.com/research/';

      // Prepare payload with thread_id if available.
      const payload = { query: currentMessage, expertise_level: 'high' };
      if (threadId) {
        payload.thread_id = threadId;
      }

      // Add user message to chat.
      const userMessage = { role: 'user', content: currentMessage };
      setChatMessages((prevMessages) => [...prevMessages, userMessage]);

      // Make the API request.
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

  // Extract the <think> section from the response text.
  const extractThinkContent = (text) => {
    const thinkMatch = text.match(/<think>([\s\S]*?)<\/think>/i);
    const thinkContent = thinkMatch ? thinkMatch[1].trim() : null;
    const remainingContent = text.replace(/<think>[\s\S]*?<\/think>/i, '').trim();
    return { thinkContent, remainingContent };
  };

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: 'sans-serif' }}>
        {isModal && (
          <Typography variant="h6" component="h2" align="center" mb={2}>
            What do you want to know?
          </Typography>
        )}

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
                    // If the assistant message is loading, show a spinner in primary.
                    chat.role === 'assistant' && isResponseLoading && index === chatMessages.length - 1 ? (
                      <CircularProgress size={24} />
                    ) : chat.role !== 'assistant' ? (
                      chat.content
                    ) : null
                  }
                  secondary={
                    <React.Fragment>
                      {chat.role === 'assistant' && chat.content && !isResponseLoading && (() => {
                        const { thinkContent, remainingContent } = extractThinkContent(chat.content);
                        return (
                          <Box sx={{ mt: 1, mb: 1 }}>
                            {/* Render ThoughtAccordion at the top if there is thinkContent */}
                            {thinkContent && (
                              <ThoughtAccordion thinkContent={thinkContent} citations={chat.citations} />
                            )}
                            <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                              text: ({ node, children }) => (
                                <CustomText citations={chat.citations} children={children} />
                              ),
                            }}>
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
                                mr: 1
                              }}
                            >
                              Sources
                              <sup style={{ marginLeft: '5px', fontSize: '0.7em' }}>
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
                    </React.Fragment>
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
                <ListItemText
                  primary={<Skeleton variant="text" width={200} height={24} />}
                  sx={{ textAlign: 'left' }}
                />
              </ListItem>
            )}
          </List>
        </Box>

        <Box
          sx={{
            borderTop: '1px solid #ccc',
            padding: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'white'
          }}
        >
          <Box sx={{ flexGrow: 1, mr: 1 }}>
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
          </Box>

          <IconButton
            color="primary"
            aria-label="send"
            onClick={handleSendMessage}
            disabled={!message.trim()}
          >
            <SendIcon />
          </IconButton>
        </Box>
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
