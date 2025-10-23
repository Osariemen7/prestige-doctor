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
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedPatientForTemplate, setSelectedPatientForTemplate] = useState(null);
  const [templateSnippet, setTemplateSnippet] = useState('');
  const [templatePreview, setTemplatePreview] = useState(null);
  const [activeTab, setActiveTab] = useState('all'); // 'all' or 'patients'
  const [selectedConditions, setSelectedConditions] = useState([]);
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

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
      if (window.innerWidth > 768) {
        setShowSidebar(true);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [selectedConversation]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadPatients = async () => {
    try {
      const data = await getAllPatients();
      setPatients(data);
    } catch (error) {
      console.error('Error loading patients:', error);
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
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  const handleSelectConversation = async (conversation) => {
    try {
      setLoading(true);
      const fullConversation = await getConversation(conversation.public_id);
      setSelectedConversation(fullConversation);
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

    try {
      setLoading(true);
      const patientData = {
        phone_number: formatPhoneNumber(phoneNumber),
        chronic_conditions: selectedConditions
      };

      // Add names only if provided
      if (firstName) patientData.first_name = firstName;
      if (lastName) patientData.last_name = lastName;

      await createPatient(patientData);
      await loadPatients();
      setShowNewPatientModal(false);
      setSelectedConditions([]);
      alert('Patient created successfully!');
    } catch (error) {
      console.error('Error creating patient:', error);
      alert(error.message || 'Failed to create patient');
    } finally {
      setLoading(false);
    }
  };

  const handleStartTemplateConversation = (patient) => {
    setSelectedPatientForTemplate(patient);
    setShowTemplateModal(true);
    setTemplateSnippet('');
    setTemplatePreview(null);
  };

  const handlePreviewTemplate = async () => {
    if (!templateSnippet.trim()) {
      alert('Please enter a message');
      return;
    }

    try {
      setLoading(true);
      const preview = await previewTemplateMessage(
        selectedPatientForTemplate.patient_id,
        templateSnippet
      );
      setTemplatePreview(preview);
    } catch (error) {
      console.error('Error previewing template:', error);
      alert('Failed to preview template');
    } finally {
      setLoading(false);
    }
  };

  const handleSendTemplate = async () => {
    if (!templateSnippet.trim()) {
      alert('Please enter a message');
      return;
    }

    try {
      setSending(true);
      await sendTemplateMessage(
        selectedPatientForTemplate.patient_id,
        templateSnippet
      );
      await loadConversations();
      setShowTemplateModal(false);
      setTemplateSnippet('');
      setTemplatePreview(null);
      setSelectedPatientForTemplate(null);
      alert('Template message sent successfully!');
    } catch (error) {
      console.error('Error sending template:', error);
      alert(error.message || 'Failed to send template message');
    } finally {
      setSending(false);
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

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
    if (!messageInput.trim() && !selectedMedia) {
      return;
    }

    if (!selectedConversation) {
      alert('Please select a conversation');
      return;
    }

    try {
      setSending(true);
      
      const messageData = {
        public_id: selectedConversation.public_id,
      };

      if (messageInput.trim()) {
        messageData.message = messageInput.trim();
      }

      if (selectedMedia) {
        messageData.media_url = selectedMedia.url;
        messageData.media_type = selectedMedia.type;
        if (selectedMedia.filename) {
          messageData.media_filename = selectedMedia.filename;
        }
        if (selectedMedia.mime_type) {
          messageData.media_mime_type = selectedMedia.mime_type;
        }
      }

      await sendMessage(messageData);
      setMessageInput('');
      setSelectedMedia(null);
      await loadConversations();
    } catch (error) {
      console.error('Error sending message:', error);
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
    const matchesSearch = conv.interlocutor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          conv.interlocutor_phone?.includes(searchTerm);
    return matchesSearch;
  });

  const patientsWithoutConversations = patients.filter(patient => 
    !conversations.some(conv => conv.patient_id === patient.patient_id)
  );

  const displayList = activeTab === 'all' ? filteredConversations : patientsWithoutConversations;

  return (
    <div className="messaging-container">
      {/* Patient List Sidebar */}
      <div className={`patient-list-sidebar ${!showSidebar && isMobile ? 'hidden' : ''}`}>
        <div className="patient-list-header">
          <h2>Messages</h2>
          <div className="patient-search">
            <input
              type="text"
              placeholder="Search patients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button className="add-patient-btn" onClick={() => setShowNewPatientModal(true)}>
              <Plus size={16} />
              {!isMobile && <span>New</span>}
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
                    <div className="patient-name">{conv.interlocutor_name || 'Unknown'}</div>
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
            ) : (
              patientsWithoutConversations.map((patient) => (
                <div
                  key={patient.patient_id}
                  className="patient-item"
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
                    <div className={`message ${message.role}`}>
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
              
              <div className="composer-input-area">
                <textarea
                  className="composer-textarea"
                  placeholder="Type your message..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  disabled={sending}
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
                    disabled={sending}
                  >
                    <Paperclip size={20} />
                  </button>
                  <button
                    className="composer-btn send"
                    onClick={handleSendMessage}
                    disabled={sending || (!messageInput.trim() && !selectedMedia)}
                  >
                    {sending ? (
                      <div className="loading-spinner" />
                    ) : (
                      <Send size={20} />
                    )}
                  </button>
                </div>
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
              Select a conversation from the list to view messages, or start a new conversation
              with a patient.
            </p>
          </div>
        )}
      </div>

      {/* New Patient Modal */}
      {showNewPatientModal && (
        <div className="modal-overlay" onClick={() => setShowNewPatientModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add New Patient</h2>
              <p>Create a new patient profile to start messaging</p>
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
                    Selected: {selectedConditions.join(', ')}
                  </div>
                )}
              </div>
              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowNewPatientModal(false);
                    setSelectedConditions([]);
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

      {/* Template Message Modal */}
      {showTemplateModal && selectedPatientForTemplate && (
        <div className="modal-overlay" onClick={() => setShowTemplateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Start Conversation</h2>
              <p>Send a template message to {selectedPatientForTemplate.patient_name}</p>
            </div>
            <div className="form-group">
              <label>Your Message</label>
              <textarea
                value={templateSnippet}
                onChange={(e) => setTemplateSnippet(e.target.value)}
                placeholder="Enter your message here..."
                style={{ minHeight: '120px' }}
              />
            </div>
            
            {templatePreview && (
              <div style={{
                padding: '16px',
                background: '#f8fafc',
                borderRadius: '10px',
                marginBottom: '16px',
                border: '1px solid #e2e8f0'
              }}>
                <div style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '8px' }}>
                  PREVIEW:
                </div>
                <div style={{ fontSize: '14px', color: '#1e293b', lineHeight: '1.6' }}>
                  {templatePreview.preview.message}
                </div>
              </div>
            )}

            <div className="form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setShowTemplateModal(false);
                  setTemplatePreview(null);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handlePreviewTemplate}
                disabled={loading || !templateSnippet.trim()}
              >
                {loading ? <div className="loading-spinner" /> : 'Preview'}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSendTemplate}
                disabled={sending || !templateSnippet.trim()}
              >
                {sending ? <div className="loading-spinner" /> : 'Send Message'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorMessaging;
