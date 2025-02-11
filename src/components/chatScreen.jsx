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
  AccordionDetails
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

const ChatScreen = ({ phoneNumber, setChatMessages, chatMessages, sendOobRequest, isModal = false }) => {
  const [message, setMessage] = useState('');
  const [apiResponse, setApiResponse] = useState(null);
  const [threadId, setThreadId] = useState(null);
  const [isSourcesVisible, setIsSourcesVisible] = useState(false);
  const theme = createTheme();
  const [isResponseLoading, setIsResponseLoading] = useState(false);

  const handleSendMessage = useCallback(async () => {
    try {
      const token = await getAccessToken();

      if (message.trim()) {
        let apiUrl = 'https://health.prestigedelta.com/research/';
        if (threadId) {
          apiUrl = `https://health.prestigedelta.com/research/?thread_id=${threadId}`;
        }

        const userMessage = { role: 'user', content: message };
        setChatMessages(prevMessages => [...prevMessages, userMessage]);
        setIsResponseLoading(true);

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ query: message, patient_phone: phoneNumber, expertise_level: "high" }),
        });

        const data = await response.json();
        console.log('API Response:', data);

        setApiResponse(data);
        if (data.thread_id) {
          setThreadId(data.thread_id);
        }
        setIsSourcesVisible(false);

        if (data.assistant_response) {
          const assistantMessage = { role: 'assistant', content: data.assistant_response, citations: data.citations };
          setChatMessages(prevMessages => [...prevMessages, assistantMessage]);
        }
      }

      setMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      setApiResponse({
        assistant_response: "Sorry, I encountered an error. Please try again later.",
        citations: []
      });
      setChatMessages(prevMessages => [
        ...prevMessages,
        { role: 'assistant', content: "Sorry, I encountered an error. Please try again later." }
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
    setIsSourcesVisible(!isSourcesVisible);
  };

  const handleTyping = (event) => {
    setMessage(event.target.value);
    if (event.target.value.trim() !== "") {
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

  // Optionally remove the <think> tags entirely.
  const formatAssistantResponse = (text) => {
    if (!text) return '';
    return text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
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
                      {chat.role === 'assistant' && chat.content && !isResponseLoading && (
                        // Render the assistant response with collapsible <think> content.
                        (() => {
                          const { thinkContent, remainingContent } = extractThinkContent(chat.content);
                          return (
                            <Box sx={{ mt: 1, mb: 1 }}>
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {remainingContent}
                              </ReactMarkdown>
                              {thinkContent && (
                                <Accordion sx={{ mt: 1 }}>
                                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                    <Typography variant="subtitle1">Model Thoughts</Typography>
                                  </AccordionSummary>
                                  <AccordionDetails>
                                    <Typography variant="body2" color="textSecondary">
                                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {thinkContent}
                                      </ReactMarkdown>
                                    </Typography>
                                  </AccordionDetails>
                                </Accordion>
                              )}
                            </Box>
                          );
                        })()
                      )}
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
                                  <Typography key={citationIndex} variant="caption" color="textSecondary" sx={{ display: 'block', mb: 0.5 }}>
                                    {citationIndex + 1}.{' '}
                                    <Link
                                      href={citation}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      sx={{ ml: 0.5, fontSize: '0.75rem' }}
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
    </ThemeProvider>
  );
};

export default ChatScreen;
