import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Search,
  Plus,
  Send,
  Paperclip,
  Image,
  FileText,
  Video,
  Mic,
  Bot,
  User,
  Phone,
  X,
  RefreshCw,
  ArrowLeftRight,
  ArrowLeft,
  Check
} from 'lucide-react';
import './DoctorMessaging.css';
import {
  getAllPatients,
  getConversationList,
  getConversation,
  sendTemplateMessage,
  sendMessage,
  createPatient,
  uploadFile,
  switchResponder,
  previewTemplateMessage
} from '../services/messagingApi';

const DoctorMessaging = () => {
  const [patients, setPatients] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [showNewPatientModal, setShowNewPatientModal] = useState(false);
  const [selectedPatientForTemplate, setSelectedPatientForTemplate] = useState(null);
  const [templatePreview, setTemplatePreview] = useState(null);
  const [activeTab, setActiveTab] = useState('all'); // 'all' or 'patients'
  const [selectedConditions, setSelectedConditions] = useState([]);
  const [customCondition, setCustomCondition] = useState('');
  const [clinicalHistory, setClinicalHistory] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Common chronic conditions list
  const chronicConditionsList = [
    'Hypertension',
    'Diabetes Type 1',
    'Diabetes Type 2',
    'Asthma',
    'COPD',
    'Heart Disease',
    'Arthritis',
    'Cancer',
    'Chronic Kidney Disease',
    'Obesity',
    'Depression',
    'Anxiety',
    'High Cholesterol',
    'Thyroid Disease',
    'Epilepsy',
    'HIV/AIDS',
    'Hepatitis',
    'Tuberculosis',
    'Pregnancy',
    'Elderly Care',
    'Under 5',
    'Other'
  ];

  // Format phone number to international format
  const formatPhoneNumber = (phone) => {
    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '');
    
    // If it starts with 0, assume it's Nigerian and convert to +234
    if (cleaned.startsWith('0')) {
      return '+234' + cleaned.substring(1);
    }
    
    // If it doesn't start with +, add +234 (assuming Nigerian)
    if (!cleaned.startsWith('234')) {
      return '+234' + cleaned;
    }
    
    // If it starts with 234, add +
    if (cleaned.startsWith('234')) {
      return '+' + cleaned;
    }
    
    // Otherwise return with + if not present
    return phone.startsWith('+') ? phone : '+' + cleaned;
  };

  // Load initial data
  useEffect(() => {
    loadPatients();
    loadConversations();
    // Poll for new messages every 30 seconds
    const interval = setInterval(loadConversations, 30000);
    return () => clearInterval(interval);
  }, []);

  // Mobile detection with better accuracy
  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = window.innerWidth <= 768 || 
                           ('ontouchstart' in window) || 
                           (navigator.maxTouchPoints > 0);
      setIsMobile(isMobileDevice);
      if (window.innerWidth > 768) {
        setShowSidebar(true);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Prevent iOS bounce scrolling and improve mobile UX
  useEffect(() => {
    if (isMobile) {
      // Prevent overscroll on iOS
      document.body.style.overscrollBehavior = 'none';
      document.documentElement.style.overscrollBehavior = 'none';
      
      // Prevent zoom on double tap
      let lastTouchEnd = 0;
      const handleTouchEnd = (e) => {
        const now = Date.now();
        if (now - lastTouchEnd <= 300) {
          e.preventDefault();
        }
        lastTouchEnd = now;
      };
      
      document.addEventListener('touchend', handleTouchEnd, false);
      
      return () => {
        document.body.style.overscrollBehavior = '';
        document.documentElement.style.overscrollBehavior = '';
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isMobile]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadPatients = async () => {
    try {
      const data = await getAllPatients();
      setPatients(data);
      return data;
    } catch (error) {
      console.error('Error loading patients:', error);
      return [];
    }
  };

  const loadConversations = async () => {
    try {
      const data = await getConversationList();
      setConversations(data);
      
      // Update selected conversation if it exists
      if (selectedConversation) {
        const updated = data.find(c => c.public_id === selectedConversation.public_id);
        if (updated) {
          setSelectedConversation(updated);
        }
      }
      return data;
    } catch (error) {
      console.error('Error loading conversations:', error);
      return [];
    }
  };

  const handleSelectConversation = async (conversation) => {
    try {
      setLoading(true);
      setSelectedPatientForTemplate(null);
      setTemplatePreview(null);
      setMessageInput('');
      setSelectedMedia(null);

      // Map API fields to component expected fields
      const mappedConversation = {
        ...conversation,
        interlocutor_name: conversation.patient_name || conversation.interlocutor_name,
        interlocutor_phone: conversation.patient_phone || conversation.interlocutor_phone,
        patient_id: conversation.patient || conversation.patient_id,
        // Keep all other fields as they are
      };

      setSelectedConversation(mappedConversation);

      // Hide sidebar on mobile when conversation is selected
      if (isMobile) {
        setShowSidebar(false);
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
      alert('Failed to load conversation');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToList = () => {
    setShowSidebar(true);
    setSelectedConversation(null);
    setSelectedPatientForTemplate(null);
    setTemplatePreview(null);
    setMessageInput('');
    setSelectedMedia(null);
  };

  const handleCreatePatient = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const firstName = formData.get('first_name')?.trim();
    const lastName = formData.get('last_name')?.trim();
    const phoneNumber = formData.get('phone_number')?.trim();

    // Validation: At least one name and phone number required
    if (!firstName && !lastName) {
      alert('Please provide at least a first name or last name');
      return;
    }

    if (!phoneNumber) {
      alert('Phone number is required');
      return;
    }

    // Validation: Either clinical history must be filled or chronic conditions must be selected
    const hasClinicalHistory = clinicalHistory.trim().length > 0;
    const hasChronicConditions = selectedConditions.length > 0;

    if (!hasClinicalHistory && !hasChronicConditions) {
      alert('Please provide either clinical history or select at least one chronic condition');
      return;
    }

    // Process chronic conditions - replace "Other" with custom condition if provided
    let finalConditions = [...selectedConditions];
    if (selectedConditions.includes('Other') && customCondition.trim()) {
      finalConditions = finalConditions.filter(c => c !== 'Other');
      finalConditions.push(customCondition.trim());
    } else if (selectedConditions.includes('Other') && !customCondition.trim()) {
      alert('Please specify the other condition');
      return;
    }

    try {
      setLoading(true);
      const patientData = {
        phone_number: formatPhoneNumber(phoneNumber),
        chronic_conditions: finalConditions
      };

      // Add names only if provided
      if (firstName) patientData.first_name = firstName;
      if (lastName) patientData.last_name = lastName;

      // Add clinical history if provided
      if (clinicalHistory.trim()) {
        patientData.notes = clinicalHistory.trim();
      }
      await createPatient(patientData);
      await loadPatients();
      setActiveTab('patients');
      setSearchTerm(patientData.phone_number || '');
      setShowSidebar(true);
      setShowNewPatientModal(false);
      setSelectedConditions([]);
      setCustomCondition('');
      setClinicalHistory('');
      setSelectedPatientForTemplate(null);
      setSelectedConversation(null);
      setTemplatePreview(null);
      setMessageInput('');
      setSelectedMedia(null);
      alert('Patient created successfully!');
    } catch (error) {
      console.error('Error creating patient:', error);
      alert(error.message || 'Failed to create patient');
    } finally {
      setLoading(false);
    }
  };

  const handleStartTemplateConversation = (patient) => {
    setSelectedConversation(null);
    setSelectedPatientForTemplate(patient);
    setTemplatePreview(null);
    setMessageInput('');
    setSelectedMedia(null);
    if (isMobile) {
      setShowSidebar(false);
    }
  };

  const handleTemplatePreview = async () => {
    if (!selectedPatientForTemplate) {
      alert('Select a patient to preview a template message');
      return;
    }

    if (!messageInput.trim()) {
      alert('Please enter a message');
      return;
    }

    try {
      setLoading(true);
      const preview = await previewTemplateMessage(
        selectedPatientForTemplate.patient_id,
        messageInput.trim()
      );
      setTemplatePreview(preview);
    } catch (error) {
      console.error('Error previewing template:', error);
      alert(error.message || 'Failed to preview template');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!selectedConversation) {
      alert('Please select a conversation before attaching files.');
      e.target.value = '';
      return;
    }

    try {
      setLoading(true);
      const uploadResult = await uploadFile(file);
      
      setSelectedMedia({
        url: uploadResult.s3_url,
        type: uploadResult.file_info.category,
        filename: file.name,
        mime_type: uploadResult.file_info.mime_type,
        size: uploadResult.file_info.size
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    const isTemplateMode = Boolean(selectedPatientForTemplate && !selectedConversation);

    if (!messageInput.trim() && !selectedMedia) {
      return;
    }

    // Create optimistic message object
    const optimisticMessage = {
      message_id: `temp-${Date.now()}`, // Temporary ID
      message_value: messageInput.trim(),
      role: 'assistant', // Doctor messages appear as assistant role
      from_doctor: true,
      created: new Date().toISOString(),
      media_url: selectedMedia?.url,
      media_type: selectedMedia?.type,
      media_filename: selectedMedia?.filename,
      media_mime_type: selectedMedia?.mime_type,
      isOptimistic: true // Flag to identify optimistic messages
    };

    // Add optimistic message to conversation immediately
    if (selectedConversation) {
      setSelectedConversation(prev => ({
        ...prev,
        messages: [...(prev.messages || []), optimisticMessage]
      }));
    }

    // Clear input immediately
    const messageToSend = messageInput.trim();
    const mediaToSend = selectedMedia;
    setMessageInput('');
    setSelectedMedia(null);

    try {
      setSending(true);

      if (isTemplateMode) {
        if (!selectedPatientForTemplate) {
          // Remove optimistic message on error
          if (selectedConversation) {
            setSelectedConversation(prev => ({
              ...prev,
              messages: prev.messages.filter(msg => msg.message_id !== optimisticMessage.message_id)
            }));
          }
          alert('Select a patient before sending a message');
          return;
        }

        if (mediaToSend) {
          // Remove optimistic message on error
          if (selectedConversation) {
            setSelectedConversation(prev => ({
              ...prev,
              messages: prev.messages.filter(msg => msg.message_id !== optimisticMessage.message_id)
            }));
          }
          alert('File attachments are only available after a conversation has started.');
          return;
        }

        await sendTemplateMessage(selectedPatientForTemplate.patient_id, messageToSend);

        // Store patient info before clearing
        const sentPatientId = selectedPatientForTemplate.patient_id;
        const sentPatient = selectedPatientForTemplate;

        // Clear template state
        setSelectedPatientForTemplate(null);
        setTemplatePreview(null);

        // Refresh data after successful send
        await loadPatients();
        const conversationsData = await loadConversations();
        setActiveTab('all');

        // Find the most recently created conversation for this patient
        // The API returns 'patient' field, not 'patient_id'
        const patientConversations = conversationsData.filter(
          (conv) => conv.patient === sentPatientId
        );

        if (patientConversations.length > 0) {
          // Conversation was created successfully, but don't auto-select it
          // Just refresh the conversations list to show the new conversation in the sidebar
          console.log('Template message sent successfully, conversation created');
        } else {
          // If no conversation found, this is unexpected since backend should create one
          console.error('No conversation found for patient after sending template message');
        }

        // Stay in the current view (patient list) instead of selecting the conversation
      } else {
        if (!selectedConversation) {
          // Remove optimistic message on error
          setSelectedConversation(prev => ({
            ...prev,
            messages: prev.messages.filter(msg => msg.message_id !== optimisticMessage.message_id)
          }));
          alert('Please select a conversation');
          return;
        }

        const messageData = {
          public_id: selectedConversation.public_id,
        };

        if (messageToSend) {
          messageData.message = messageToSend;
        }

        if (mediaToSend) {
          messageData.media_url = mediaToSend.url;
          messageData.media_type = mediaToSend.type;
          if (mediaToSend.filename) {
            messageData.media_filename = mediaToSend.filename;
          }
          if (mediaToSend.mime_type) {
            messageData.media_mime_type = mediaToSend.mime_type;
          }
        }

        await sendMessage(messageData);

        // Refresh conversation data after successful send
        const updatedConversation = await getConversation(selectedConversation.public_id);
        setSelectedConversation(updatedConversation);
      }
    } catch (error) {
      console.error('Error sending message:', error);

      // Remove optimistic message on error
      if (selectedConversation) {
        setSelectedConversation(prev => ({
          ...prev,
          messages: prev.messages.filter(msg => msg.message_id !== optimisticMessage.message_id)
        }));
      }

      alert(error.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleSwitchToDoctor = async () => {
    if (!selectedConversation) return;

    try {
      setLoading(true);
      await switchResponder(selectedConversation.public_id, {
        responder: 'doctor',
        provider_id: selectedConversation.doctor_id,
        send_handoff_message: true,
        handoff_message: "I'm taking over this conversation to provide personalized care."
      });
      await loadConversations();
      alert('Successfully took over conversation');
    } catch (error) {
      console.error('Error switching responder:', error);
      alert(error.message || 'Failed to switch responder');
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchToAI = async () => {
    if (!selectedConversation) return;

    try {
      setLoading(true);
      await switchResponder(selectedConversation.public_id, {
        responder: 'assistant',
        send_handoff_message: true,
        handoff_message: "Our AI assistant will continue helping you. I'm available if you need me."
      });
      await loadConversations();
      alert('Successfully delegated to AI');
    } catch (error) {
      console.error('Error switching responder:', error);
      alert(error.message || 'Failed to switch responder');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) {
      return date.toLocaleDateString('en-US', { weekday: 'short', hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const getInitials = (name) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const renderMedia = (message) => {
    if (!message.media_url) return null;

    const mediaType = message.media_type;

    if (mediaType === 'image') {
      return (
        <div className="message-media">
          <img src={message.media_url} alt="Shared image" />
        </div>
      );
    }

    if (mediaType === 'video') {
      return (
        <div className="message-media">
          <video controls>
            <source src={message.media_url} />
          </video>
        </div>
      );
    }

    if (mediaType === 'audio') {
      return (
        <div className="message-media">
          <audio controls>
            <source src={message.media_url} />
          </audio>
        </div>
      );
    }

    if (mediaType === 'document') {
      return (
        <div className="message-document" onClick={() => window.open(message.media_url, '_blank')}>
          <div className="document-icon">
            <FileText size={20} />
          </div>
          <div className="document-info">
            <div className="document-name">{message.media_filename || 'Document'}</div>
            <div className="document-size">Click to open</div>
          </div>
        </div>
      );
    }

    return null;
  };

  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = (conv.patient_name || conv.interlocutor_name)?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          conv.interlocutor_phone?.includes(searchTerm);
    return matchesSearch;
  });

  const patientsWithoutConversations = patients; // Show all patients for template conversations

  const filteredPatients = patientsWithoutConversations.filter(patient => {
    const matchesSearch = patient.patient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          patient.patient_phone?.includes(searchTerm);
    return matchesSearch;
  });

  const isTemplateMode = Boolean(selectedPatientForTemplate && !selectedConversation);
  const composerEnabled = Boolean(selectedConversation || selectedPatientForTemplate);

  return (
    <div className="messaging-container">
      {/* Patient List Sidebar */}
      <div className={`patient-list-sidebar ${!showSidebar && isMobile ? 'hidden' : ''}`}>
        <div className="patient-list-header">
          <h2>Messages</h2>
          <div className="patient-search">
            <input
              type="text"
              placeholder={activeTab === 'all' ? "Search conversations..." : "Search patients..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button 
              className="add-patient-btn" 
              onClick={() => setShowNewPatientModal(true)}
              style={{
                backgroundColor: '#2563eb',
                color: 'white',
                border: 'none',
                padding: isMobile ? '10px 12px' : '8px 16px',
                borderRadius: '8px',
                fontWeight: 'bold',
                fontSize: isMobile ? '13px' : '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: isMobile ? 'center' : 'flex-start',
                gap: '6px',
                boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)',
                transition: 'all 0.2s ease',
                width: isMobile ? '100%' : 'auto',
                minWidth: isMobile ? '100%' : 'auto'
              }}
            >
              <Plus size={16} />
              {isMobile ? <span>Add new patient</span> : <span>Add Patient</span>}
            </button>
          </div>
        </div>

        <div className="conversation-tabs">
          <button
            className={`conversation-tab ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            <MessageSquare size={14} style={{ display: 'inline', marginRight: '4px' }} />
            Conversations
          </button>
          <button
            className={`conversation-tab ${activeTab === 'patients' ? 'active' : ''}`}
            onClick={() => setActiveTab('patients')}
          >
            <User size={14} style={{ display: 'inline', marginRight: '4px' }} />
            Patients
          </button>
        </div>

        <div className="patient-list">
          {activeTab === 'all' ? (
            // Show conversations
            filteredConversations.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
                <MessageSquare size={40} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                <p>No conversations yet</p>
              </div>
            ) : (
              filteredConversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`patient-item ${selectedConversation?.id === conv.id ? 'active' : ''}`}
                  onClick={() => handleSelectConversation(conv)}
                >
                  <div className="patient-item-header">
                    <div className="patient-name">{conv.patient_name || conv.interlocutor_name || 'Unknown'}</div>
                    {conv.responder === 'assistant' && <span className="unread-badge" />}
                  </div>
                  <div className="patient-phone">{conv.interlocutor_phone}</div>
                  {conv.messages && conv.messages.length > 0 && (
                    <div className="patient-last-message">
                      {conv.messages[conv.messages.length - 1].message_value}
                    </div>
                  )}
                  <div className="patient-meta">
                    <span className={`responder-badge ${conv.responder}`}>
                      {conv.responder === 'assistant' ? (
                        <><Bot size={12} /> AI</>
                      ) : (
                        <><User size={12} /> Doctor</>
                      )}
                    </span>
                    <span className="timestamp">{formatTime(conv.updated)}</span>
                  </div>
                </div>
              ))
            )
          ) : (
            // Show patients without conversations
            patientsWithoutConversations.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
                <User size={40} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                <p>All patients have conversations</p>
              </div>
            ) : filteredPatients.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
                <Search size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                <p>No patients match your search</p>
              </div>
            ) : (
              filteredPatients.map((patient) => (
                <div
                  key={patient.patient_id}
                  className={`patient-item ${selectedPatientForTemplate?.patient_id === patient.patient_id ? 'active' : ''}`}
                  onClick={() => handleStartTemplateConversation(patient)}
                >
                  <div className="patient-item-header">
                    <div className="patient-name">{patient.patient_name}</div>
                  </div>
                  <div className="patient-phone">{patient.patient_phone}</div>
                  <div className="patient-meta">
                    <span className="responder-badge">
                      {patient.subscription_status || 'Added by doctor'}
                    </span>
                  </div>
                </div>
              ))
            )
          )}
        </div>
      </div>

      {/* Conversation Area */}
      <div className="conversation-area">
        {selectedConversation ? (
          <>
            <div className="conversation-header">
              <div className="conversation-header-left">
                {isMobile && (
                  <button className="mobile-back-btn" onClick={handleBackToList}>
                    <ArrowLeft size={18} />
                    Back
                  </button>
                )}
                <div className="patient-avatar">
                  {getInitials(selectedConversation.interlocutor_name || 'U')}
                </div>
                <div className="conversation-header-info">
                  <h3>{selectedConversation.interlocutor_name || 'Unknown Patient'}</h3>
                  <p>
                    <Phone size={12} style={{ display: 'inline', marginRight: '4px' }} />
                    {selectedConversation.interlocutor_phone}
                  </p>
                </div>
              </div>
              <div className="conversation-actions">
                {!isMobile && (
                  <button className="action-btn" onClick={loadConversations}>
                    <RefreshCw size={16} />
                    Refresh
                  </button>
                )}
                {selectedConversation.responder === 'assistant' ? (
                  <button className="action-btn primary" onClick={handleSwitchToDoctor}>
                    <ArrowLeftRight size={16} />
                    {!isMobile && 'Take Over'}
                  </button>
                ) : (
                  <button className="action-btn" onClick={handleSwitchToAI}>
                    <Bot size={16} />
                    {!isMobile && 'Delegate to AI'}
                  </button>
                )}
              </div>
            </div>

            <div className="messages-container">
              {selectedConversation.messages && selectedConversation.messages.map((message, index) => {
                const showDateDivider = index === 0 || 
                  new Date(message.created).toDateString() !== 
                  new Date(selectedConversation.messages[index - 1].created).toDateString();

                return (
                  <React.Fragment key={message.message_id}>
                    {showDateDivider && (
                      <div className="message-date-divider">
                        <span>{new Date(message.created).toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}</span>
                      </div>
                    )}
                    <div className={`message ${message.role} ${message.isOptimistic ? 'optimistic' : ''}`}>
                      <div className="message-content">
                        {message.message_value && (
                          <div className="message-text">{message.message_value}</div>
                        )}
                        {renderMedia(message)}
                        <div className="message-meta">
                          <span className="message-sender">
                            {message.role === 'user' ? 'Patient' : 
                             message.from_doctor ? 'You' : 'AI Assistant'}
                          </span>
                          <span>•</span>
                          <span>{formatTime(message.created)}</span>
                        </div>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          </>
        ) : isTemplateMode && selectedPatientForTemplate ? (
          <>
            <div className="conversation-header">
              <div className="conversation-header-left">
                {isMobile && (
                  <button className="mobile-back-btn" onClick={handleBackToList}>
                    <ArrowLeft size={18} />
                    Back
                  </button>
                )}
                <div className="patient-avatar">
                  {getInitials(selectedPatientForTemplate.patient_name || 'Patient')}
                </div>
                <div className="conversation-header-info">
                  <h3>{selectedPatientForTemplate.patient_name || 'New Patient'}</h3>
                  <p>
                    <Phone size={12} style={{ display: 'inline', marginRight: '4px' }} />
                    {selectedPatientForTemplate.patient_phone}
                  </p>
                </div>
              </div>
              <div className="conversation-actions">
                {!isMobile && (
                  <span className="responder-badge doctor">
                    <MessageSquare size={14} />
                    Template Message
                  </span>
                )}
              </div>
            </div>

            <div className="messages-container">
              <div className="template-intro">
                <h3>Craft the first message</h3>
                <p>
                  Send a template introduction to kick off care for this patient. Once sent,
                  the conversation thread will appear here.
                </p>
              </div>
            </div>
          </>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">
              <MessageSquare size={60} />
            </div>
            <h3>Welcome to Patient Messaging</h3>
            <p>
              Select a patient from the sidebar to start chatting, or add a new patient to begin.
            </p>
          </div>
        )}

        <div className="message-composer">
          {selectedMedia && (
            <div className="composer-media-preview">
              <div className="media-preview-content">
                {selectedMedia.type === 'image' && (
                  <img src={selectedMedia.url} alt="Preview" className="media-preview-thumbnail" />
                )}
                {selectedMedia.type !== 'image' && (
                  <div className="media-preview-thumbnail" style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center' 
                  }}>
                    {selectedMedia.type === 'video' && <Video size={24} />}
                    {selectedMedia.type === 'audio' && <Mic size={24} />}
                    {selectedMedia.type === 'document' && <FileText size={24} />}
                  </div>
                )}
                <div className="media-preview-info">
                  <div className="media-preview-name">{selectedMedia.filename}</div>
                  <div className="media-preview-meta">
                    {selectedMedia.type} • {formatFileSize(selectedMedia.size)}
                  </div>
                </div>
              </div>
              <button className="remove-media-btn" onClick={() => setSelectedMedia(null)}>
                <X size={14} />
              </button>
            </div>
          )}

          {isTemplateMode && templatePreview && (
            <div className="template-preview">
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '8px' }}>
                PREVIEW
              </div>
              <div style={{ fontSize: '14px', color: '#1e293b', lineHeight: '1.6' }}>
                {templatePreview.preview?.message || 'Preview unavailable'}
              </div>
            </div>
          )}

          <div className="composer-input-area">
            <textarea
              className="composer-textarea"
              placeholder={
                isTemplateMode
                  ? `Write the first message for ${selectedPatientForTemplate?.patient_name || 'this patient'}...`
                  : composerEnabled
                    ? 'Type your message...'
                    : 'Select or add a patient to start messaging...'
              }
              value={messageInput}
              onChange={(e) => {
                setMessageInput(e.target.value);
                if (isTemplateMode && templatePreview) {
                  setTemplatePreview(null);
                }
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && composerEnabled) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              onFocus={(e) => {
                // Prevent iOS zoom on focus and scroll into view
                if (isMobile) {
                  setTimeout(() => {
                    e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }, 300);
                }
              }}
              disabled={!composerEnabled || sending}
              autoComplete="off"
              autoCorrect="on"
              autoCapitalize="sentences"
              spellCheck="true"
            />
            <div className="composer-actions">
              <input
                ref={fileInputRef}
                type="file"
                style={{ display: 'none' }}
                onChange={handleFileSelect}
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
              />
              <button 
                className="composer-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={sending || !selectedConversation}
                title={selectedConversation ? 'Attach file' : 'Attachments available after starting a conversation'}
              >
                <Paperclip size={20} />
              </button>
              {isTemplateMode && (
                <button
                  className="composer-btn"
                  onClick={handleTemplatePreview}
                  disabled={sending || loading || !messageInput.trim()}
                  title="Preview template message"
                >
                  {loading ? <div className="loading-spinner" /> : <Check size={20} />}
                </button>
              )}
              <button
                className="composer-btn send"
                onClick={handleSendMessage}
                disabled={
                  sending ||
                  (!messageInput.trim() && !selectedMedia) ||
                  !composerEnabled
                }
              >
                {sending ? (
                  <div className="loading-spinner" />
                ) : (
                  <Send size={20} />
                )}
              </button>
            </div>
          </div>
          {!composerEnabled && (
            <p className="composer-hint">
              Select a conversation or patient from the sidebar to begin messaging.
            </p>
          )}
        </div>
      </div>

      {/* New Patient Modal */}
      {showNewPatientModal && (
        <div 
          className="modal-overlay" 
          onClick={() => setShowNewPatientModal(false)}
          style={{
            alignItems: isMobile ? 'flex-end' : 'center',
            padding: isMobile ? '0' : '20px'
          }}
        >
          <div 
            className="modal-content" 
            onClick={(e) => e.stopPropagation()}
            style={{
              width: isMobile ? '100%' : '500px',
              maxWidth: isMobile ? '100%' : '500px',
              height: isMobile ? 'auto' : 'auto',
              maxHeight: isMobile ? '90vh' : '90vh',
              borderRadius: isMobile ? '20px 20px 0 0' : '12px',
              margin: isMobile ? '0' : 'auto',
              position: isMobile ? 'relative' : 'relative',
              bottom: isMobile ? '0' : 'auto',
              animation: isMobile ? 'slideUp 0.3s ease-out' : 'fadeIn 0.3s ease-out'
            }}
          >
            <div className="modal-header">
              <h2>Add New Patient</h2>
              <p>Create a new patient profile to start messaging</p>
              <small style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                <strong>Note:</strong> You must provide either clinical history or select at least one chronic condition to create a patient.
              </small>
            </div>
            <form onSubmit={handleCreatePatient}>
              <div className="form-group">
                <label>First Name</label>
                <input type="text" name="first_name" placeholder="Optional if last name provided" />
              </div>
              <div className="form-group">
                <label>Last Name</label>
                <input type="text" name="last_name" placeholder="Optional if first name provided" />
              </div>
              <div className="form-group">
                <label>Phone Number *</label>
                <input 
                  type="tel" 
                  name="phone_number" 
                  placeholder="e.g., 08012345678 or +2348012345678"
                  required
                />
                <small style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                  Enter in national (08012345678) or international (+234...) format
                </small>
              </div>
              <div className="form-group">
                <label>Chronic Conditions</label>
                <div style={{ 
                  display: 'flex', 
                  flexWrap: 'wrap', 
                  gap: '8px', 
                  marginTop: '8px',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  padding: '8px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px'
                }}>
                  {chronicConditionsList.map((condition) => (
                    <button
                      key={condition}
                      type="button"
                      onClick={() => {
                        if (selectedConditions.includes(condition)) {
                          setSelectedConditions(selectedConditions.filter(c => c !== condition));
                          // Clear custom condition if "Other" is deselected
                          if (condition === 'Other') {
                            setCustomCondition('');
                          }
                        } else {
                          setSelectedConditions([...selectedConditions, condition]);
                        }
                      }}
                      style={{
                        padding: '6px 12px',
                        border: selectedConditions.includes(condition) 
                          ? '2px solid #2563eb' 
                          : '1px solid #e2e8f0',
                        borderRadius: '6px',
                        background: selectedConditions.includes(condition) 
                          ? '#dbeafe' 
                          : 'white',
                        color: selectedConditions.includes(condition) 
                          ? '#1e40af' 
                          : '#64748b',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: selectedConditions.includes(condition) ? '600' : '500',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {condition}
                    </button>
                  ))}
                </div>
                {selectedConditions.length > 0 && (
                  <div style={{ marginTop: '8px', fontSize: '13px', color: '#2563eb' }}>
                    Selected: {selectedConditions.map(c => c === 'Other' && customCondition.trim() ? customCondition.trim() : c).join(', ')}
                  </div>
                )}
                {selectedConditions.includes('Other') && (
                  <div style={{ marginTop: '12px' }}>
                    <label style={{ fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '4px', display: 'block' }}>
                      Specify Other Condition *
                    </label>
                    <input
                      type="text"
                      value={customCondition}
                      onChange={(e) => setCustomCondition(e.target.value)}
                      placeholder="Enter the specific condition..."
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        fontSize: '14px',
                        marginTop: '4px'
                      }}
                      required
                    />
                  </div>
                )}
              </div>
              <div className="form-group">
                <label>Clinical History</label>
                <textarea
                  value={clinicalHistory}
                  onChange={(e) => setClinicalHistory(e.target.value)}
                  placeholder="Describe the patient's condition in detail, treatment goals, and current routine medications (e.g., daily medications, dosages, frequency)..."
                  style={{
                    width: '100%',
                    minHeight: '120px',
                    padding: '12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '14px',
                    resize: 'vertical',
                    fontFamily: 'inherit'
                  }}
                />
                <small style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                  Include condition details, care goals, and <strong>current routine medications</strong> to help set up the patient's care plan. This information is crucial for providing comprehensive care.
                </small>
              </div>
              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowNewPatientModal(false);
                    setSelectedConditions([]);
                    setCustomCondition('');
                    setClinicalHistory('');
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? <div className="loading-spinner" /> : 'Create Patient'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorMessaging;
