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
  Alert,
  FormControl
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
import PatientProfileDisplay from './document';

// ----------------------------------------------------
// 1. CustomText: converts citation markers like [1], [2], etc. into clickable links.
// ----------------------------------------------------
const CustomText = ({ children, citations }) => {
  const text = React.Children.toArray(children).join("");
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
                  color: '#87CEFA', // light sky blue
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
  const [chatMessages, setChatMessages] = useState([]);
  const [threadId, setThreadId] = useState(null);
  const [isSourcesVisible, setIsSourcesVisible] = useState(false);
  const [isResponseLoading, setIsResponseLoading] = useState(false);
  const [datalist, setDataList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expertLevel, setExpertLevel] = useState('low');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const theme = createTheme();
  const navigate = useNavigate();
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('error');
  const [isSidebarMinimized, setIsSidebarMinimized] = useState(false);

  const showSnackbar = useCallback((newMessage, newSeverity) => {
    setSnackbarMessage(newMessage);
    setSnackbarSeverity(newSeverity);
    setSnackbarOpen(true);
  }, []);

  const handleSnackbarClose = useCallback((event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbarOpen(false);
  }, []);

  const handleSendMessage = useCallback(async () => {
    if (!message.trim()) return;

    const currentMessage = message;
    setMessage("");
    setIsResponseLoading(true);

    try {
      const token = await getAccessToken();
      const apiUrl = "https://health.prestigedelta.com/research/";
      const payload = { query: currentMessage, expertise_level: expertLevel };
      if (threadId) {
        payload.thread_id = threadId;
      }

      if (selectedPatient) {
        if (selectedPatient.phone_number && selectedPatient.phone_number.trim() !== "") {
          payload.patient_phone = selectedPatient.phone_number;
        } else {
          payload.patient_id = selectedPatient.id;
        }
      }

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
  }, [message, threadId, selectedPatient, expertLevel, showSnackbar]);

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
        showSnackbar("Failed to fetch patient list.", 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate, showSnackbar]);

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
      <Sidebar
        onToggleSidebar={(minimized) => setIsSidebarMinimized(minimized)}
        onNavigate={(path) => navigate(path)}
        onLogout={handleLogout}
      />
      <div className={`${isSidebarMinimized ? 'ml-0 md:ml-76' : 'ml-0 md:ml-64'} flex-1 transition-all duration-300`}>
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
                maxWidth: '840px',
                mb: 2,
              }}
            >
              <List>
                {chatMessages.map((chat, index) => {
                  if (chat.role === 'assistant') {
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
                            maxWidth: '98%',
                            wordWrap: 'break-word',
                          }}
                        >
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
                        </Box>
                      </ListItem>
                    );
                  } else {
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
                            maxWidth: '90%',
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

            {/* Input Box */}
            <Box
              sx={{
                width: '100%',
                maxWidth: '700px',
                borderRadius: '24px',
                boxShadow: '0px 2px 10px rgba(0,0,0,0.1)',
                backgroundColor: 'white',
                padding: '8px 16px',
                marginTop: chatMessages.length > 0 ? 'auto' : '0',
                position: chatMessages.length > 0 ? 'sticky' : 'relative',
                bottom: chatMessages.length > 0 ? '20px' : 'auto',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Top Row: Text input and Send Button */}
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
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
                  }}
                  sx={{ marginBottom: '8px' }}
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

              {/* Bottom Row: Styled Selects */}
              <Box sx={{ display: 'flex', justifyContent: 'flex-start', gap: '10px' }}>
                <FormControl variant="standard">
                  <Select
                    value={selectedPatient ? selectedPatient.id : ''}
                    onChange={(e) => {
                      const patientId = e.target.value;
                      const patient = datalist.find((p) => p.id === patientId);
                      setSelectedPatient(patient);
                    }}
                    displayEmpty
                    sx={{
                      fontSize: '14px',
                      backgroundColor: '#1E90FF',
                      color: 'white',
                      borderRadius: '4px',
                      padding: '4px 12px',
                      '& .MuiSelect-icon': { color: 'white' },
                      '&:hover': { backgroundColor: '#187bcd' },
                    }}
                    renderValue={(selected) =>
                      selected
                        ? datalist.find((p) => p.id === selected)?.full_name || `Patient (${selected})`
                        : 'Choose Patient'
                    }
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
                </FormControl>
                <FormControl variant="standard">
                  <Select
                    value={expertLevel}
                    onChange={(e) => setExpertLevel(e.target.value)}
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
                  
                  <MenuItem value="">
                      <em>AI Level</em>
                    </MenuItem>
                    <MenuItem value="low">Basic ₦50</MenuItem>
                    <MenuItem value="medium">Intermediate ₦200</MenuItem>
                    <MenuItem value="high">Advanced ₦500</MenuItem>
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
        </ThemeProvider>
      </div>

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
    </div>
  );
};

export default SearchBox;
