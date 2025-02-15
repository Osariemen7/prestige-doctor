import React, { useState, useCallback, useEffect } from 'react';
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
  Alert
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Skeleton from '@mui/material/Skeleton';
import Sidebar from './sidebar';
import { useNavigate } from 'react-router-dom';
import { getAccessToken } from './api';


// ----------------------------------------------------
// 1. CustomText: converts citation markers like [1], [2], etc. into clickable links.
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
                  textDecoration: 'none',
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
// 2. ThoughtAccordion: displays the model thought at the top with toggle label
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

const SearchBox = () => {
  const [message, setMessage] = useState('');
  const [apiResponse, setApiResponse] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [threadId, setThreadId] = useState(null);
  const [isSourcesVisible, setIsSourcesVisible] = useState(false);
  const [isResponseLoading, setIsResponseLoading] = useState(false);
  const [error, setError] = useState('');
  const [datalist, setDataList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const theme = createTheme();
  const navigate = useNavigate();
  const [snackbarOpen, setSnackbarOpen] = useState(false); // State for Snackbar open/close
  const [snackbarMessage, setSnackbarMessage] = useState(''); // State for Snackbar message
  const [snackbarSeverity, setSnackbarSeverity] = useState('error'); // State for Snackbar severity

  const showSnackbar = useCallback((newMessage, newSeverity) => {
    setSnackbarMessage(newMessage);
    setSnackbarSeverity(newSeverity);
    setSnackbarOpen(true);
  }, [setSnackbarMessage, setSnackbarSeverity, setSnackbarOpen]);

  const handleSnackbarClose = useCallback((event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbarOpen(false);
  }, [setSnackbarOpen]);


  const handleSendMessage = useCallback(async () => {
    if (!message.trim()) return;

    // Clear the input immediately.
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

      // If a patient is selected, add either patient_phone or patient_id to the payload.
      if (selectedPatient) {
        if (selectedPatient.phone_number && selectedPatient.phone_number.trim() !== '') {
          payload.patient_phone = selectedPatient.phone_number;
        } else {
          payload.patient_id = selectedPatient.id;
        }
      }

      // Optimistically add the user's message.
      const userMessage = { role: 'user', content: currentMessage };
      setChatMessages((prev) => [...prev, userMessage]);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (data.thread_id) {
        setThreadId(data.thread_id);
      }
      setIsSourcesVisible(false);

      // Append the assistant's response.
      if (data.assistant_response) {
        const assistantMessage = {
          role: 'assistant',
          content: data.assistant_response,
          citations: data.citations,
        };
        setChatMessages((prev) => [...prev, assistantMessage]);
      }
      if (!response.ok) {
        showSnackbar(data.error || 'Request failed due to an error.', 'error');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Sorry, I encountered an error. Please try again later.');
      setApiResponse({
        assistant_response: 'Sorry, I encountered an error. Please try again later.',
        citations: [],
      });
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again later.',
        },
      ]);
    } finally {
      setIsResponseLoading(false);
    }
  }, [message, threadId, selectedPatient, showSnackbar]);

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

  useEffect(() => {
    const fetchData = async () => {
      const accessToken = await getAccessToken();
      if (!accessToken) return;

      try {
        const response = await fetch('https://health.prestigedelta.com/patientlist/', {
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
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

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
  };

  return (
    <div className="dashboard-container">
      {/* Persistent Sidebar */}
      <Sidebar navigate={navigate} handleLogout={handleLogout} />

      {/* Main Content */}
      <div className="main-content">
        <ThemeProvider theme={theme}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              minHeight: '100vh',
              padding: '20px',
              backgroundColor: '#f5f5f5',
              justifyContent: chatMessages.length > 0 ? 'flex-start' : 'center',
            }}
          >
            <Typography
              variant="h5"
              align="center"
              mb={2}
              sx={{
                fontWeight: 500,
                color: '#333',
                marginTop: chatMessages.length > 0 ? '20px' : '0',
              }}
            >
              What do you want to know?
            </Typography>

            <Box
              sx={{
                overflowY: 'auto',
                width: '100%',
                maxWidth: '600px',
                mb: 2,
              }}
            >
              <List>
                {chatMessages.map((chat, index) => {
                  if (chat.role === 'assistant') {
                    // Separate <think> from the visible portion.
                    const { thinkContent, remainingContent } = extractThinkContent(chat.content);

                    return (
                      <ListItem
                        key={index}
                        sx={{
                          flexDirection: 'row',
                          justifyContent: 'flex-start',
                        }}
                      >
                        <Box
                          sx={{
                            backgroundColor: '#f0f0f0',
                            padding: '10px',
                            borderRadius: '8px',
                            maxWidth: '80%',
                            wordWrap: 'break-word',
                          }}
                        >
                          {/* If thinkContent exists, show ThoughtAccordion at the top */}
                          {thinkContent && (
                            <ThoughtAccordion thinkContent={thinkContent} citations={chat.citations} />
                          )}

                          {/* Main assistant response */}
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

                          {chat.citations && chat.citations.length > 0 && (
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
                                  <Typography
                                    variant="caption"
                                    color="textSecondary"
                                    sx={{ display: 'block', mb: 0.5 }}
                                  >
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
                        </Box>
                      </ListItem>
                    );
                  } else {
                    // Render user messages.
                    return (
                      <ListItem
                        key={index}
                        sx={{
                          flexDirection: 'row-reverse',
                          justifyContent: 'flex-start',
                        }}
                      >
                        <Box
                          sx={{
                            backgroundColor: '#e0f7fa',
                            padding: '10px',
                            borderRadius: '8px',
                            maxWidth: '80%',
                            wordWrap: 'break-word',
                          }}
                        >
                          <Typography variant="body1">{chat.content}</Typography>
                        </Box>
                      </ListItem>
                    );
                  }
                })}
                {isResponseLoading && (
                  <ListItem sx={{ justifyContent: 'flex-start' }}>
                    <Skeleton variant="text" width={200} height={24} />
                  </ListItem>
                )}
              </List>
            </Box>

            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                width: '100%',
                maxWidth: '600px',
                borderRadius: '24px',
                boxShadow: '0px 2px 10px rgba(0,0,0,0.1)',
                backgroundColor: 'white',
                padding: '8px 16px',
                marginTop: chatMessages.length > 0 ? 'auto' : '0',
                position: chatMessages.length > 0 ? 'sticky' : 'relative',
                bottom: chatMessages.length > 0 ? '20px' : 'auto',
              }}
            >
              <TextField
                fullWidth
                placeholder="Ask anything..."
                variant="standard"
                multiline
                minRows={1}
                maxRows={4}
                InputProps={{
                  disableUnderline: true,
                  style: { fontSize: '16px' },
                  // Dropdown added as a start adornment inside the TextField.
                  startAdornment: (
                    <Select
                      value={selectedPatient ? selectedPatient.id : ''}
                      onChange={(e) => {
                        const patientId = e.target.value;
                        const patient = datalist.find((p) => p.id === patientId);
                        setSelectedPatient(patient);
                      }}
                      displayEmpty
                      sx={{
                        marginRight: '8px',
                        fontSize: '16px',
                        '& .MuiSelect-select': {
                          padding: '0 4px',
                        },
                      }}
                    >
                      <MenuItem value="">
                        <em>Choose Patient</em>
                      </MenuItem>
                      {datalist.map((patient) => (
                        <MenuItem key={patient.id} value={patient.id}>
                          {patient.full_name
                            ? `${patient.full_name} (${patient.id})`
                            : `Patient (${patient.id})`}
                        </MenuItem>
                      ))}
                    </Select>
                  ),
                }}
                sx={{
                  flex: 1,
                  fontSize: '16px',
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
              <IconButton color="primary" onClick={handleSendMessage} disabled={!message.trim()}>
                <SendIcon />
              </IconButton>
            </Box>
          </Box>
        </ThemeProvider>
      </div>

      {/* Snackbar for error messages */}
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

      {/* Existing Error Snackbar - consider removing if you only want one Snackbar */}
      {/* <Snackbar
        open={Boolean(error)}
        autoHideDuration={6000}
        onClose={() => setError('')}
        message={error}
      /> */}
    </div>
  );
};

export default SearchBox;