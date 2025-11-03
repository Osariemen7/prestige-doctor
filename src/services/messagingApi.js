// Messaging API Client for Doctor-Patient Communication
import { getAccessToken } from '../api';

const BASE_URL = 'https://service.prestigedelta.com';

const getAuthHeaders = async () => {
  const token = await getAccessToken();
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
};

// Patient Management
export const createPatient = async (patientData) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${BASE_URL}/appointments/create-patient/`, {
    method: 'POST',
    headers,
    body: JSON.stringify(patientData)
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create patient');
  }
  return response.json();
};

export const getAllPatients = async () => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${BASE_URL}/provider/all-patients/`, {
    headers
  });
  if (!response.ok) throw new Error('Failed to fetch patients');
  return response.json();
};

// Conversation Management
export const getConversationList = async () => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${BASE_URL}/providermessages/`, {
    headers
  });
  if (!response.ok) throw new Error('Failed to fetch conversations');
  return response.json();
};

export const getConversation = async (publicId) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${BASE_URL}/providermessages/${publicId}/`, {
    headers
  });
  if (!response.ok) throw new Error('Failed to fetch conversation');
  return response.json();
};

export const getOrganizationThreads = async () => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${BASE_URL}/providermessages/organization-threads/`, {
    headers
  });
  if (!response.ok) throw new Error('Failed to fetch organization threads');
  return response.json();
};

// Message Sending
export const previewTemplateMessage = async (patientId, customSnippet) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${BASE_URL}/providermessages/preview-template-message/`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      patient_id: patientId,
      custom_snippet: customSnippet
    })
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to preview template');
  }
  return response.json();
};

export const sendTemplateMessage = async (patientId, customSnippet) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${BASE_URL}/providermessages/send-template-message/`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      patient_id: patientId,
      custom_snippet: customSnippet
    })
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to send template message');
  }
  return response.json();
};

export const sendMessage = async (messageData) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${BASE_URL}/providermessages/send-message/`, {
    method: 'POST',
    headers,
    body: JSON.stringify(messageData)
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to send message');
  }
  return response.json();
};

// Responder Switching
export const switchResponder = async (publicId, responderConfig) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${BASE_URL}/gptthreads/${publicId}/switch-responder/`, {
    method: 'POST',
    headers,
    body: JSON.stringify(responderConfig)
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || error.detail || 'Failed to switch responder');
  }
  return response.json();
};

// Media Upload
export const uploadFile = async (file) => {
  const token = await getAccessToken();
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${BASE_URL}/ai-processing/upload-file/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to upload file');
  }
  return response.json();
};
