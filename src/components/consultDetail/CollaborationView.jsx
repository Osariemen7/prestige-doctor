import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  Avatar,
  Chip,
  CircularProgress,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Select,
  FormControl,
  InputLabel,
  AvatarGroup,
  Tooltip,
  Alert,
  Checkbox,
  OutlinedInput,
  Stack, // Added Stack for layout
  List, // Added List for messages
  ListItem, // Added ListItem for messages
  ListItemAvatar, // Added ListItemAvatar for messages
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import ImageIcon from '@mui/icons-material/Image';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import CloseIcon from '@mui/icons-material/Close';
import SmartToyIcon from '@mui/icons-material/SmartToy'; // For AI
import GroupIcon from '@mui/icons-material/Group'; // For Tag Everyone
import PersonIcon from '@mui/icons-material/Person'; // For individual users
import { getAccessToken } from '../api'; // Fixed import path
import { format, parseISO } from 'date-fns';
import { keyframes } from '@emotion/react'; // Import keyframes for animation

// Define enhanced typing animation
const typingAnimation = keyframes`
  0% { opacity: 0.3; transform: translateY(0px); }
  28% { opacity: 1; transform: translateY(-5px); }
  44% { opacity: 1; transform: translateY(0px); }
  100% { opacity: 0.3; transform: translateY(0px); }
`;

// Define pulse animation for the AI typing indicator container
const pulseAnimation = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(25, 118, 210, 0.4); }
  70% { box-shadow: 0 0 0 10px rgba(25, 118, 210, 0); }
  100% { box-shadow: 0 0 0 0 rgba(25, 118, 210, 0); }
`;

// Menu item styling for multiple select
const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250,
    },
  },
};

const CollaborationView = ({ publicId, initialCollaboratingProviders = [] }) => {
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [aiTyping, setAiTyping] = useState(false);
  const [currentProviderId, setCurrentProviderId] = useState(null); // State to store the fetched provider ID
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const selectRef = useRef(null);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [tagSelection, setTagSelection] = useState(['TAG_EVERYONE']);
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
  
  // Add fetchMessages implementation
  const fetchMessages = useCallback(async () => {
    if (!publicId) {
      console.error('Missing publicId, cannot fetch messages');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const token = await getAccessToken();
      if (!token) {
        setError("Authentication required to fetch messages.");
        return;
      }
      
      const response = await fetch(`https://health.prestigedelta.com/review-note/${publicId}/messages/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setMessages(data);
      console.log(`Fetched ${data.length} messages`);
      
    } catch (e) {
      console.error("Failed to fetch messages:", e);
      setError(`Failed to load messages: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, [publicId]);
  
  // Fetch the current provider ID if it's not already set
  const fetchCurrentProvider = useCallback(async () => {
    try {
      const token = await getAccessToken();
      if (!token) {
        setError("Authentication required to fetch provider details.");
        return;
      }

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      };

      const response = await fetch('https://health.prestigedelta.com/provider/', { headers });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`HTTP error! Failed to fetch current provider: ${response.status}, body: ${errorBody}`);
      }
      
      const providerData = await response.json();
      
      // Log the entire response to debug the structure
      console.log('Provider API response:', providerData);
      
      // Check for ID in different possible locations in the response
      // The API might return either a single provider object or an array
      if (Array.isArray(providerData) && providerData.length > 0) {
        // If response is an array, use the first provider's ID
        setCurrentProviderId(providerData[0].id);
        console.log('Current provider fetched successfully (from array):', providerData[0].id);
      } else if (providerData.id) {
        // Direct ID field on the provider object
        setCurrentProviderId(providerData.id);
        console.log('Current provider fetched successfully:', providerData.id);
      } else if (providerData.provider_id) {
        // Alternative ID field name
        setCurrentProviderId(providerData.provider_id);
        console.log('Current provider fetched successfully (from provider_id):', providerData.provider_id);
      } else if (providerData.user && providerData.user.id) {
        // Nested user ID
        setCurrentProviderId(providerData.user.id);
        console.log('Current provider fetched successfully (from user.id):', providerData.user.id);
      } else {
        // No ID found in expected locations
        console.error('Provider ID not found in response:', providerData);
        throw new Error('Provider ID not found in the API response');
      }
    } catch (e) {
      console.error("Failed to fetch current provider:", e);
      setError("Failed to identify current user. Some features may be limited.");
    }
  }, []);

  // Add House AI to the list of collaborating providers
  const houseAIProvider = { id: 0, first_name: 'House', last_name: 'AI', full_name: 'House AI', profile_image_url: null, is_ai: true };
  
  // Parse the incoming providers based on the new structure
  const collaboratingProviders = [
    houseAIProvider,
    ...(initialCollaboratingProviders?.map(provider => {
      // Split full_name into first_name and last_name
      let firstName = 'Unknown';
      let lastName = 'Provider';
      
      if (provider.full_name) {
        const nameParts = provider.full_name.trim().split(' ');
        if (nameParts.length >= 2) {
          firstName = nameParts[0];
          lastName = nameParts.slice(1).join(' '); // Combine any remaining parts as last name
        } else if (nameParts.length === 1) {
          firstName = nameParts[0];
        }
      }
      
      return {
        ...provider,
        first_name: firstName,
        last_name: lastName
      };
    }) || [])
  ];

  // Fetch current provider on component mount if not already set
  useEffect(() => {
    if (currentProviderId === null) {
      fetchCurrentProvider();
    }
  }, [fetchCurrentProvider, currentProviderId]);

  // Load messages when component mounts
  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Safety timeout for AI typing indicator
  useEffect(() => {
    let typingTimeout;
    if (aiTyping) {
      // Auto-hide typing indicator after 20 seconds if no response
      typingTimeout = setTimeout(() => {
        setAiTyping(false);
      }, 20000);
    }
    return () => {
      if (typingTimeout) clearTimeout(typingTimeout);
    };
  }, [aiTyping]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleOpenMenu = (event, provider) => {
    setAnchorEl(event.currentTarget);
    setSelectedProvider(provider);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
    setSelectedProvider(null);
  };
  // Find provider by ID in the collaborating providers list
  const findProviderById = (id) => {
    return collaboratingProviders.find(provider => provider.id === id) || null;
  };
    // Log for debugging purposes - remove in production
  useEffect(() => {
    if (currentProviderId) {
      console.log('Current provider ID:', currentProviderId); // Debug logging enabled
    } else {
      console.log('Warning: currentProviderId is not defined or null');
    }
  }, [currentProviderId]);

  // Debug the incoming providers
  useEffect(() => {
    // console.log('Initial collaborating providers:', initialCollaboratingProviders); // Keep for debugging if needed
  }, [initialCollaboratingProviders]);

  // Update the handleTagSelectionChange function for better performance
  const handleTagSelectionChange = (event) => {
    const selectedValues = event.target.value;
    
    // Protection against non-array values
    if (!Array.isArray(selectedValues)) {
      console.error("Expected array for tag selection, got:", selectedValues);
      return;
    }
    
    // Get the newly selected value by comparing with current selection
    const newValue = selectedValues.find(val => !tagSelection.includes(val));
    
    // If we detected a new selection (rather than deselection)
    if (newValue) {
      // Handle group tags
      if (newValue === 'TAG_EVERYONE') {
        setTagSelection(['TAG_EVERYONE']);
      } else if (newValue === 'TAG_ALL_HUMANS') {
        setTagSelection(['TAG_ALL_HUMANS']);
      } else {
        // For individual selections, add to existing selection
        // but remove any group tags
        const currentIndividuals = tagSelection.filter(
          val => val !== 'TAG_EVERYONE' && val !== 'TAG_ALL_HUMANS'
        );
        
        // If this value isn't already in the selection, add it
        if (!currentIndividuals.includes(newValue)) {
          setTagSelection([...currentIndividuals, newValue]);
        }
      }
      
      // Close the dropdown by blurring the select element
      if (selectRef.current) {
        setTimeout(() => {
          selectRef.current.blur();
        }, 100);
      }
    } else {
      // Handle deselection (user clicked an already selected item)
      const deselectedValue = tagSelection.find(val => !selectedValues.includes(val));
      
      // Don't allow deselecting the last item - default to TAG_EVERYONE
      if (selectedValues.length === 0) {
        setTagSelection(['TAG_EVERYONE']);
      } else {
        setTagSelection(selectedValues);
      }
    }
  };

  // Get a list of provider names who were tagged in a message
  const getTaggedNames = (taggedIds) => {
    if (!taggedIds || taggedIds.length === 0) return null;
    
    const taggedProviders = taggedIds.map(id => findProviderById(id)).filter(Boolean);
    
    if (taggedProviders.length === 0) return null;

    // Check if it matches the "TAG_EVERYONE" criteria (all collaborators except self)
    const allCollaboratorsIncludingSelf = collaboratingProviders.map(p => p.id);
    if (tagSelection.includes('TAG_EVERYONE') && taggedIds.length === allCollaboratorsIncludingSelf.filter(id => id !== currentProviderId).length) {
        return "To: Everyone";
    }

    // Check if it matches the "TAG_ALL_HUMANS" criteria (all non-AI collaborators except self)
    const allHumansIncludingSelf = collaboratingProviders.filter(p => !p.is_ai).map(p => p.id);
    if (tagSelection.includes('TAG_ALL_HUMANS') && taggedIds.length === allHumansIncludingSelf.filter(id => id !== currentProviderId).length) {
        return "To: All Humans";
    }

    if (taggedProviders.length === 1) {
      const provider = taggedProviders[0];
      return `To: ${provider.full_name || `${provider.first_name} ${provider.last_name}`}`;
    }
    // Generic fallback
    return `To: ${taggedProviders.length} participants`;
  };

  // Handle image file selection
  const handleImageSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Only image files are allowed.');
      return;
    }

    // Validate file size (limit to 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size should be less than 5MB.');
      return;
    }

    setUploadedImage(file);
    
    // Preview the image
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      setImageUrl(dataUrl); // For preview purposes
    };
    reader.readAsDataURL(file);
  };

  // Upload image to server
  const uploadImage = async (file) => {
    if (!file) return null;
    
    setUploadingImage(true);
    setError(null);
    
    try {
      const token = await getAccessToken();
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await fetch('https://health.prestigedelta.com/research/upload-image/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Image upload failed with status: ${response.status}`);
      }
      
      const data = await response.json();
      return data.image_url;
    } catch (err) {
      setError(`Failed to upload image: ${err.message}`);
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  // Clear selected image
  const handleClearImage = () => {
    setUploadedImage(null);
    setImageUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };  const handleSendMessage = async () => {
    // Check if currentProviderId is still null - could be loading
    if (currentProviderId === null) {
      setError('Unable to identify your account. Please refresh the page.');
      return;
    }

    if (!newMessage.trim() && !uploadedImage) {
      setError('Message cannot be empty and you must include text even when sending an image.');
      return;
    }
    if (tagSelection.length === 0) {
      setError('Please select who to tag.');
      return;
    }

    setSending(true);
    setError(null);

    let resolved_tagged_ids = [];
    if (tagSelection.includes('TAG_EVERYONE')) {
      resolved_tagged_ids = collaboratingProviders
        .map(p => p.id)
        .filter(id => id !== currentProviderId); // Everyone except self
    } else if (tagSelection.includes('TAG_ALL_HUMANS')) { // Updated from TAG_ALL_CONSULTANTS
      resolved_tagged_ids = collaboratingProviders
        .filter(p => !p.is_ai && p.id !== currentProviderId) // All humans except self
        .map(p => p.id);
    } else {
      // Individual selections - ensure currentProviderId is not in this list either, though UI should prevent it.
      resolved_tagged_ids = tagSelection
        .map(id => typeof id === 'string' && !isNaN(id) ? Number(id) : id)
        .filter(id => id !== currentProviderId);
    }
    
    // Check if House AI is tagged (either directly or via TAG_EVERYONE)
    const isAITagged = resolved_tagged_ids.includes(0) || 
                       tagSelection.includes('TAG_EVERYONE');
    
    if (isAITagged) {
      // Show AI typing indicator immediately when message is sent
      setAiTyping(true);
      // Scroll to make typing indicator visible
      setTimeout(() => scrollToBottom(), 100);
    }

    try {
      // First upload image if there is any
      let uploadedImageUrl = null;
      if (uploadedImage) {
        uploadedImageUrl = await uploadImage(uploadedImage);
        if (!uploadedImageUrl) {
          throw new Error('Image upload failed');
        }
      }

      const token = await getAccessToken();
      const payload = { 
        message: newMessage.trim(), 
        message_type: 'note', 
        tagged: resolved_tagged_ids // Use the resolved list
      };

      // Add image_url to payload if available
      if (uploadedImageUrl) {
        payload.image_url = uploadedImageUrl;
      }

      const response = await fetch(`https://health.prestigedelta.com/review-note/${publicId}/send_collaboration_message/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }
        // Hide AI typing indicator immediately upon receiving response
      if (isAITagged) {
        setAiTyping(false);
      }
      
      // Fetch all messages after sending to get the complete updated list including AI response
      await fetchMessages();
      
      // Ensure UI updates properly after receiving new messages, especially AI responses
      setTimeout(() => {
        scrollToBottom();
      }, 500);
      setNewMessage('');
      handleClearImage(); // Clear image after sending

    } catch (e) {
      console.error("Failed to send message:", e);
      setError(e.message);
    } finally {
      setSending(false);
    }
  };
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 120px)', // Adjust height as needed, considering header/footer
        backgroundColor: (theme) => theme.palette.grey[100],
      }}
    >
      {/* Header with Avatars */}
      <Paper 
        elevation={2} 
        sx={{ 
          p: 1.5, 
          borderBottom: (theme) => `1px solid ${theme.palette.divider}`, 
          backgroundColor: 'background.default',
          display: 'flex',
          alignItems: 'center'
        }}
      >
        <Typography variant="subtitle2" sx={{ mr: 1.5, fontWeight: 'medium', color: 'text.secondary' }}>
          Team Members: {/* Changed from "Chatting with:" */}
        </Typography>
        <AvatarGroup max={5}>
          {collaboratingProviders.map((provider) => (
            <Tooltip 
              key={provider.id} 
              title={provider.full_name || `${provider.first_name} ${provider.last_name}${provider.specialty ? ` - ${provider.specialty}` : ''}`}
            >
              <Avatar 
                alt={provider.full_name || `${provider.first_name} ${provider.last_name}`} 
                src={provider.profile_image_url || undefined}
                sx={{ 
                  width: 32, 
                  height: 32,
                  bgcolor: provider.id === 0 
                    ? 'primary.light' 
                    : provider.is_primary 
                      ? 'secondary.light' 
                      : 'grey.300',
                  color: provider.id === 0 ? 'primary.contrastText' : 'text.primary'
                }}
              >
                {provider.id === 0 
                  ? <SmartToyIcon fontSize="small" /> 
                  : `${provider.first_name?.charAt(0) || ''}${provider.last_name?.charAt(0) || ''}`}
              </Avatar>
            </Tooltip>
          ))}
        </AvatarGroup>
        {/* Menu for selected provider - can be re-integrated if needed */}
        <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleCloseMenu}
            // ... (MenuProps and other props if needed)
        >
            {selectedProvider && (
                <MenuItem onClick={handleCloseMenu}>
                    View Profile ({selectedProvider.full_name})
                </MenuItem>
            )}
        </Menu>
      </Paper>

      {/* Message Display Area */}
      <Box
        sx={{
          flexGrow: 1,
          overflowY: 'auto',
          p: { xs: 1, md: 2 },
        }}
      >
        {loading && messages.length === 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <CircularProgress />
            <Typography sx={{ ml: 2 }}>Loading messages...</Typography>
          </Box>
        )}
        <List>
          {messages.map((msg, index) => {
            // ONLY messages with sender=null are AI messages (per API spec)        
            const isAI = msg.sender === null;            
            
            // Get sender first to avoid the reference error
            // For AI messages, always use houseAIProvider as the sender
            const sender = isAI 
              ? houseAIProvider 
              : findProviderById(msg.sender);
              
            console.log(`Message ${index}:`, { 
              id: msg.id,
              sender: msg.sender, 
              isAI: isAI,
              name: isAI ? "House AI" : (sender?.full_name || "Unknown"),
              content: msg.message?.substring(0, 30) + '...',
              tagged: msg.tagged
            });
            
            const isCurrentUser = !isAI && msg.sender === currentProviderId;
            const taggedNamesString = getTaggedNames(msg.tagged);
            const hasTagged = msg.tagged && msg.tagged.length > 0;

            return (
              <ListItem
                key={msg.id || index}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isCurrentUser ? 'flex-end' : 'flex-start',
                  mb: 1.5,
                  width: '100%',
                  paddingLeft: isCurrentUser ? 2 : 0,
                  paddingRight: !isCurrentUser ? 2 : 0,
                }}
              >
                <Stack 
                  direction="row" 
                  alignItems="flex-start"
                  spacing={1} 
                  sx={{ 
                    maxWidth: '75%', 
                    width: 'auto',
                    marginLeft: isCurrentUser ? 'auto' : 0, // Push current user messages to the right
                    marginRight: !isCurrentUser ? 'auto' : 0, // Keep AI/others messages on left
                    flexDirection: isCurrentUser ? 'row-reverse' : 'row', // Reverse order for current user to place avatar on right
                  }}
                >
                  <Tooltip title={isAI ? "House AI" : isCurrentUser ? "You" : (sender?.full_name || msg.sender_name || "Unknown User")}>
                    <Avatar
                      alt={isAI ? "House AI" : isCurrentUser ? "You" : (sender?.full_name || msg.sender_name || "Unknown User")}
                      src={sender?.profile_image_url || undefined}
                      sx={{ 
                        width: 32, 
                        height: 32, 
                        mt: 0.5,
                        bgcolor: isAI 
                          ? 'primary.main' // Blue for AI
                          : isCurrentUser 
                            ? 'primary.main' 
                            : 'grey.300',
                        color: isAI ? 'white' : 'text.primary',
                        boxShadow: isAI 
                          ? '0 0 8px rgba(25, 118, 210, 0.5)' // Blue glow for avatar
                          : 'none',
                        // No need for order property as we use flexDirection in parent Stack
                      }}
                    >
                      {isAI 
                        ? <SmartToyIcon fontSize="small"/> 
                        : <PersonIcon fontSize="small"/>}
                    </Avatar>
                  </Tooltip>
                  <Paper
                    elevation={isAI ? 2 : 1}
                    sx={{
                      p: 1.5,
                      borderRadius: isCurrentUser ? '20px 20px 5px 20px' : '20px 20px 20px 5px',
                      backgroundColor: isCurrentUser 
                        ? '#c7e1ff' // Lighter sky blue for current user
                        : isAI 
                          ? 'primary.main' // Blue for AI messages
                          : '#ffffff',  // White for other human users
                      color: isCurrentUser 
                        ? 'rgba(0,0,0,0.75)' // Darker text for better readability on light blue
                        : isAI
                          ? 'white' 
                          : 'text.primary',
                      // Other styles remain the same
                    }}
                  >                    {/* Tagged indicator at top of bubble if tagged */}
                    {hasTagged && (
                      <Box 
                        sx={{
                          position: 'absolute',
                          top: -8,
                          right: isCurrentUser ? 12 : 'auto',
                          left: isCurrentUser ? 'auto' : 12,
                          backgroundColor: isCurrentUser 
                            ? 'primary.light' 
                            : isAI
                              ? 'primary.main'
                              : 'grey.700', // Darker shade for other human users
                          color: 'white',
                          fontSize: '0.7rem',
                          px: 1,
                          py: 0.1,
                          borderRadius: 8,
                          fontWeight: 'bold'
                        }}
                      >
                        {msg.tagged.length === 1 && msg.tagged[0] === 0 ? 'AI' : 'Tagged'}
                      </Box>
                    )}
                       {!isCurrentUser && (
                      <Typography 
                        variant="caption" 
                        component="div" 
                        sx={{ 
                          fontWeight: 'bold', 
                          mb: 0.5, 
                          color: isAI ? 'rgba(255,255,255,0.95)' : 'text.secondary' 
                        }}
                      >
                        {isAI ? (msg.ai_assistant_name || "House AI") : (sender?.full_name || `${sender?.first_name || ''} ${sender?.last_name || ''}`)}
                      </Typography>
                    )}
                    
                    {msg.image_url && (
                      <Box sx={{ mt: 0.5, mb: 1, cursor: 'pointer' }} onClick={() => window.open(msg.image_url, '_blank')}>
                        <img
                          src={msg.image_url}
                          alt="Uploaded content"
                          style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px' }}
                        />
                      </Box>
                    )}
                    
                    <Typography variant="body2" component="div" style={{ whiteSpace: 'pre-wrap' }}>
                      {msg.message}
                    </Typography>
                    
                    {taggedNamesString && (
                      <Box sx={{ 
                        mt: 1, 
                        pt: 0.5, 
                        borderTop: '1px solid', 
                        borderColor: isCurrentUser || isAI ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'
                      }}>
                        <Typography 
                          variant="caption" 
                          display="block" 
                          sx={{ 
                            fontStyle: 'italic', 
                            fontWeight: 'medium',
                            color: isCurrentUser 
                              ? 'rgba(0,0,0,0.75)' // Dark text for current user messages
                              : isAI 
                                ? 'rgba(255,255,255,0.9)' // Keep white for AI messages
                                : 'text.secondary' // Use default for other users
                          }}
                        >
                          {taggedNamesString}
                        </Typography>
                      </Box>
                    )}
                  </Paper>                  {/* Avatar is now shown for all users directly in the Stack */}
                </Stack>                <Typography 
                  variant="caption" 
                  sx={{ 
                    alignSelf: isCurrentUser ? 'flex-end' : 'flex-start', // Align timestamp with message direction
                    ml: !isCurrentUser ? '40px' : 0,
                    mr: isCurrentUser ? '40px' : 0,
                    mt: 0.5, 
                    color: 'text.secondary' 
                  }}
                >
                  {msg.created_at ? format(parseISO(msg.created_at), 'p') : 'Sending...'}
                </Typography>
              </ListItem>
            );
          })}
          <div ref={messagesEndRef} />
          
          {/* AI Typing indicator */}
          {aiTyping && (
            <ListItem
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                mb: 1.5,
                width: '100%',
                paddingRight: 2,
                paddingLeft: 0,
                animation: `${pulseAnimation} 2s infinite`, // Add subtle pulse animation to the entire container
              }}
            >                <Stack direction="row" alignItems="flex-start" spacing={1}>
                <Tooltip title="House AI">
                  <Avatar
                    alt="House AI"
                    sx={{ 
                      width: 32, 
                      height: 32, 
                      mt: 0.5,
                      bgcolor: 'primary.main', // Blue for AI
                      color: 'white',
                      boxShadow: '0 0 8px rgba(25, 118, 210, 0.5)', // Blue glow for avatar
                    }}
                  >
                    <SmartToyIcon fontSize="small" />
                  </Avatar>
                </Tooltip>
                  <Paper
                  elevation={2}
                  sx={{
                    p: 1.5,
                    borderRadius: '20px 20px 20px 5px',
                    backgroundColor: 'primary.main', // Blue for AI
                    color: 'white',
                    border: '1px solid',
                    borderColor: 'primary.dark',
                    position: 'relative',
                    minWidth: 80,
                    boxShadow: '0 2px 10px rgba(25, 118, 210, 0.3)', // Blue glow
                  }}
                >
                  <Typography variant="caption" component="div" sx={{ fontWeight: 'bold', mb: 0.5, color: 'rgba(255,255,255,0.95)' }}>
                    House AI
                  </Typography>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {[0, 1, 2].map((dot) => (                      <Box
                        key={dot}
                        sx={{
                          width: 10,
                          height: 10,
                          mx: 0.5,
                          borderRadius: '50%',
                          backgroundColor: 'white',
                          display: 'inline-block',
                          animation: `${typingAnimation} 1.4s infinite ease-in-out both`,
                          animationDelay: `${dot * 0.16}s`,
                          boxShadow: '0 0 5px rgba(255, 255, 255, 0.7)', // Add glow effect to dots
                        }}
                      />
                    ))}
                  </Box>
                </Paper>
              </Stack>
                <Typography 
                variant="caption" 
                sx={{ 
                  alignSelf: 'flex-start',
                  ml: '40px',
                  mt: 0.5, 
                  color: 'primary.main', // Blue for AI indicator text
                  fontWeight: 'bold' 
                }}
              >
                House AI is thinking...
              </Typography>
            </ListItem>
          )}
        </List>
        {error && messages.length === 0 && ( // Only show big error if loading completely failed
          <Alert severity="error" sx={{ m: 2 }}>Error loading messages: {error}. Please try refreshing.</Alert>
        )}
      </Box>

      {/* Message Input Area - Fixed to Bottom */}
      <Paper
        elevation={3}
        sx={{
          p: { xs: 1, md: 1.5 },
          borderTop: (theme) => `1px solid ${theme.palette.divider}`,
          backgroundColor: 'background.default',
        }}
      >
        {imageUrl && ( // Image preview section
          <Box sx={{ mb: 1, ml:1, display: 'flex', alignItems: 'center', position: 'relative' }}>
            <Paper elevation={1} sx={{ p:0.5, display:'inline-block', position: 'relative' }}>
              <img src={imageUrl} alt="Preview" style={{ width: '80px', height: 'auto', borderRadius: '4px', display: 'block' }} />
              <IconButton
                size="small"
                onClick={handleClearImage}
                sx={{
                  position: 'absolute',
                  top: -10,
                  right: -10,
                  backgroundColor: 'rgba(0,0,0,0.6)',
                  color: 'white',
                  '&:hover': { backgroundColor: 'rgba(0,0,0,0.8)' },
                  width: 20, height: 20,
                  zIndex: 1 // Ensure it's above the image
                }}
              >
                <CloseIcon fontSize="inherit" />
              </IconButton>
            </Paper>
          </Box>
        )}
        <Stack direction="column" spacing={1.5}> {/* Outer stack for vertical arrangement */}
            <Stack direction="row" spacing={1} alignItems="center"> {/* Row for input + buttons */}
                {/* Attach File Button */}
                <Tooltip title="Attach Image">
                    <IconButton color="primary" component="label" disabled={uploadingImage || sending} size="medium">
                    <AttachFileIcon />
                    <input type="file" hidden accept="image/*" onChange={handleImageSelect} ref={fileInputRef} />
                    </IconButton>
                </Tooltip>
                
                {/* Message Text Field */}
                <TextField
                    fullWidth
                    variant="outlined"
                    size="small"
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                    }
                    }}
                    multiline
                    minRows={1}
                    maxRows={4}
                    disabled={sending || uploadingImage}
                    sx={{ flexGrow: 1 }}
                />
                {/* Send Button */}
                <Tooltip title="Send Message">
                    <IconButton 
                    color="primary" 
                    onClick={handleSendMessage} 
                    disabled={sending || uploadingImage || (!newMessage.trim() && !uploadedImage)} 
                    size="medium"
                    >
                    {sending || uploadingImage ? <CircularProgress size={24} color="inherit"/> : <SendIcon />}
                    </IconButton>
                </Tooltip>
            </Stack>
            
            {/* Tag Selection Dropdown - Positioned to the left below input */}
            <Stack direction="row" justifyContent="flex-start" sx={{ mt: 1 }}>
              <FormControl sx={{ minWidth: { xs: 180, sm: 220 } }} size="small">
                <InputLabel id="tag-select-label">Tag</InputLabel>                  <Select
                  ref={selectRef}
                  labelId="tag-select-label"
                  id="tag-select"
                  multiple
                  value={tagSelection}
                  onChange={handleTagSelectionChange}
                  input={<OutlinedInput label="Tag" />}
                  sx={{
                    '& .MuiMenuItem-root.Mui-selected': {
                      backgroundColor: '#1a237e', // Much darker shade for selected dropdown items
                      color: 'white', // White text for better contrast
                    },
                    '& .MuiMenuItem-root.Mui-selected:hover': {
                      backgroundColor: '#283593', // Slightly lighter shade on hover
                      color: 'white', // Keep white text
                    },
                    '& .MuiSelect-select': {
                      padding: '8px 14px' // Better padding for dropdown
                    }
                  }}renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => {
                        if (value === 'TAG_EVERYONE') return <Chip key={value} label="Everyone" size="small" color="primary" />;
                        if (value === 'TAG_ALL_HUMANS') return <Chip key={value} label="Humans" size="small" color="primary" />;
                        const provider = findProviderById(value);
                        return provider ? (
                          <Chip 
                            key={value} 
                            label={provider.first_name || provider.full_name || 'User'} 
                            size="small"
                            color={provider.is_ai ? "secondary" : "primary"}
                          />
                        ) : null;
                      }).filter(Boolean)}
                    </Box>
                  )}
                  MenuProps={{
                    PaperProps: {
                      style: {
                        maxHeight: 48 * 4.5 + 8,
                        width: 250,
                      },
                    },
                    // This is critical for performance - prevents excessive rerenders
                    anchorOrigin: {
                      vertical: 'bottom',
                      horizontal: 'left',
                    },
                    transformOrigin: {
                      vertical: 'top',
                      horizontal: 'left',
                    },
                    // This ensures proper behavior on mobile
                    slotProps: {
                      paper: {
                        elevation: 8,
                      }
                    },
                  }}
                >                  <MenuItem 
                    value="TAG_EVERYONE"
                    sx={{
                      '&.Mui-selected': {
                        backgroundColor: '#1a237e', // Consistent dark shade
                        color: 'white',
                      },
                      '&.Mui-selected:hover': {
                        backgroundColor: '#283593', // Slightly lighter on hover
                        color: 'white', // Keep white text
                      }
                    }}
                  >
                    <ListItemIcon>
                      <GroupIcon fontSize="small" sx={{ color: tagSelection.includes('TAG_EVERYONE') ? 'white' : 'inherit' }} />
                    </ListItemIcon>
                    <ListItemText primary="Tag Everyone (except you)" />
                  </MenuItem>                  <MenuItem 
                    value="TAG_ALL_HUMANS"
                    sx={{
                      '&.Mui-selected': {
                        backgroundColor: '#1a237e', // Consistent dark shade
                        color: 'white',
                      },
                      '&.Mui-selected:hover': {
                        backgroundColor: '#283593', // Slightly lighter on hover
                        color: 'white', // Keep white text
                      }
                    }}
                  >
                    <ListItemIcon>
                      <PersonIcon fontSize="small" sx={{ color: tagSelection.includes('TAG_ALL_HUMANS') ? 'white' : 'inherit' }} />
                    </ListItemIcon>
                    <ListItemText primary="Tag All Humans (except you)" />
                  </MenuItem>
                  <Divider />
                  {collaboratingProviders
                    .filter(provider => provider.id !== currentProviderId)
                    .map((provider) => (
                      <MenuItem 
                        key={provider.id} 
                        value={provider.id}
                        sx={{
                          '&.Mui-selected': {
                            backgroundColor: '#1a237e',
                            color: 'white',
                          },
                          '&.Mui-selected:hover': {
                            backgroundColor: '#283593',
                          }
                        }}
                      >
                        <ListItemIcon>
                          {provider.is_ai ? 
                            <SmartToyIcon 
                              fontSize="small" 
                              sx={{ color: tagSelection.includes(provider.id) ? 'white' : 'inherit' }}
                            /> : 
                            <PersonIcon 
                              fontSize="small"
                              sx={{ color: tagSelection.includes(provider.id) ? 'white' : 'inherit' }}
                            />
                          }
                        </ListItemIcon>
                        <ListItemText primary={provider.full_name || `${provider.first_name} ${provider.last_name}`} />
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            </Stack>
        </Stack>
        {/* Error Alert */}
        {error && (
            <Alert 
                severity="error" 
                sx={{mt:1, fontSize: '0.8rem', p: '2px 8px'}} 
                onClose={() => setError(null)} // Allow dismissing the error
            >
                {error}
            </Alert>
        )}
      </Paper>
    </Box>
  );
};

export default CollaborationView;
