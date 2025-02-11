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
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getAccessToken } from './api';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Skeleton from '@mui/material/Skeleton';
import Sidebar from './sidebar';
import { useNavigate } from 'react-router-dom';


const SearchBox = () => {
  const [message, setMessage] = useState('');
  const [apiResponse, setApiResponse] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [threadId, setThreadId] = useState(null);
  const [isSourcesVisible, setIsSourcesVisible] = useState(false);
  // Added state for tracking whether the API response is loading.
  const [isResponseLoading, setIsResponseLoading] = useState(false);
  const theme = createTheme();
  const navigate = useNavigate();

  const handleSendMessage = useCallback(async () => {
    // Only proceed if there is a nonempty message.
    if (!message.trim()) return;
    setIsResponseLoading(true);

    try {
      const token = await getAccessToken();

      let apiUrl = 'https://health.prestigedelta.com/research/';
      if (threadId) {
        apiUrl = `https://health.prestigedelta.com/research/?thread_id=${threadId}`;
      }

      // Optimistically update with the user's message.
      const userMessage = { role: 'user', content: message };
      setChatMessages(prevMessages => [...prevMessages, userMessage]);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ query: message, expertise_level: "high" }),
      });

      const data = await response.json();
      console.log('API Response:', data);

      setApiResponse(data);
      if (data.thread_id) {
        setThreadId(data.thread_id);
      }
      setIsSourcesVisible(false);

      // Append the assistant's response.
      if (data.assistant_response) {
        const assistantMessage = {
          role: 'assistant',
          content: data.assistant_response,
          citations: data.citations
        };
        setChatMessages(prevMessages => [...prevMessages, assistantMessage]);
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
  }, [message, threadId]);

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

  // Extract the <think> block (if present) from the assistant response.
  // Returns an object with 'thinkContent' and 'remainingContent'.
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
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          minHeight: "100vh",
          padding: "20px",
          backgroundColor: "#f5f5f5",
          justifyContent: chatMessages.length > 0 ? "flex-start" : "center",
        }}
      >
        <Typography 
          variant="h5" 
          align="center" 
          mb={2} 
          sx={{ 
            fontWeight: 500, 
            color: "#333",
            marginTop: chatMessages.length > 0 ? "20px" : "0"
          }}
        >
          What do you want to know?
        </Typography>

        <Box
        sx={{
            overflowY: "auto",
            width: "100%",
            maxWidth: "600px",
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
                      flexDirection: "row",
                      justifyContent: "flex-start",
                    }}
                  >
                    <Box
                      sx={{
                        backgroundColor: "#f0f0f0",
                        padding: "10px",
                        borderRadius: "8px",
                        maxWidth: "80%",
                        wordWrap: "break-word",
                      }}
                    >
                      {/* Render the assistant’s message as markdown */}
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {remainingContent}
                      </ReactMarkdown>
                      {thinkContent && (
                        <Accordion sx={{ mt: 1 }}>
                          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography variant="subtitle2" sx={{ fontSize: "0.75rem" }}>
                              Model Thoughts
                            </Typography>
                          </AccordionSummary>
                          <AccordionDetails>
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {thinkContent}
                            </ReactMarkdown>
                          </AccordionDetails>
                        </Accordion>
                      )}
                      {chat.citations && chat.citations.length > 0 && (
                        <Box sx={{ mt: 1 }}>
                          <Button
                            variant="outlined"
                            onClick={handleSourcesToggle}
                            startIcon={<FactCheckIcon />}
                            size="small"
                            sx={{
                              borderRadius: "20px",
                              textTransform: "none",
                              padding: "2px 10px",
                              borderColor: "#ccc",
                              backgroundColor: "white",
                              "&:hover": { backgroundColor: "#f0f0f0" },
                              mr: 1,
                            }}
                          >
                            Sources
                            <sup style={{ marginLeft: "5px", fontSize: "0.7rem" }}>
                              {chat.citations.length}
                            </sup>
                          </Button>
                          <Collapse in={isSourcesVisible} timeout="auto" unmountOnExit>
                            <Box sx={{ mt: 1, pl: 2, borderLeft: "2px solid #ccc" }}>
                              <Typography variant="caption" color="textSecondary" sx={{ display: "block", mb: 0.5 }}>
                                Citations:
                              </Typography>
                              {chat.citations.map((citation, citationIndex) => (
                                <Typography key={citationIndex} variant="caption" color="textSecondary" sx={{ display: "block", mb: 0.5 }}>
                                  {citationIndex + 1}.{" "}
                                  <Link href={citation} target="_blank" rel="noopener noreferrer" sx={{ ml: 0.5, fontSize: "0.75rem" }}>
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
                // Render user messages
                return (
                  <ListItem
                    key={index}
                    sx={{
                      flexDirection: "row-reverse",
                      justifyContent: "flex-start",
                    }}
                  >
                    <Box
                      sx={{
                        backgroundColor: "#e0f7fa",
                        padding: "10px",
                        borderRadius: "8px",
                        maxWidth: "80%",
                        wordWrap: "break-word",
                      }}
                    >
                      <Typography variant="body1">{chat.content}</Typography>
                    </Box>
                  </ListItem>
                );
              }
            })}
            {isResponseLoading && (
              <ListItem sx={{ justifyContent: "flex-start" }}>
                <Skeleton variant="text" width={200} height={24} />
              </ListItem>
            )}
          </List>
        </Box>

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            width: "100%",
            maxWidth: "600px",
            borderRadius: "24px",
            boxShadow: "0px 2px 10px rgba(0,0,0,0.1)",
            backgroundColor: "white",
            padding: "8px 16px",
            marginTop: chatMessages.length > 0 ? "auto" : "0",
            position: chatMessages.length > 0 ? "sticky" : "relative",
            bottom: chatMessages.length > 0 ? "20px" : "auto",
          }}
        >
          <TextField
            fullWidth
            placeholder="Ask anything..."
            variant="standard"
            InputProps={{
              disableUnderline: true,
              style: {
                fontSize: "16px",
              },
            }}
            sx={{
              flex: 1,
              fontSize: "16px",
            }}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter") {
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
    </div>
  );
};

export default SearchBox;
