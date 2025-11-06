// Provider Dashboard API Client
import { getAccessToken } from '../api';

const BASE_URL = 'https://service.prestigedelta.com';

const getAuthHeaders = async () => {
  const token = await getAccessToken();
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
};

/**
 * Fetch provider dashboard overview data
 * @returns {Promise<Object>} Dashboard data with provider info and patient lists
 */
export const getProviderDashboard = async () => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${BASE_URL}/providerdashboard/`, {
    headers
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch provider dashboard');
  }

  return response.json();
};

/**
 * Fetch detailed patient information for provider dashboard
 * @param {number} patientId - The patient ID to fetch details for
 * @returns {Promise<Object>} Detailed patient data including profile, medical reviews, care plan, and metrics
 */
export const getPatientDetails = async (patientId) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${BASE_URL}/providerdashboard/${patientId}/`, {
    headers
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch patient details');
  }

  return response.json();
};

/**
 * Get all patients for the provider
 * @returns {Promise<Array>} List of all patients
 */
export const getAllPatients = async () => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${BASE_URL}/provider/all-patients/`, {
    headers
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch patients');
  }

  return response.json();
};

/**
 * Fetch provider reviews
 * @param {number} hours - Number of hours to look back (default 168 = 7 days)
 * @returns {Promise<Array>} Array of review objects
 */
export const getProviderReviews = async (hours = 168) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${BASE_URL}/provider-reviews/?hours=${hours}`, {
    headers
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch provider reviews');
  }

  return response.json();
};

/**
 * Fetch current provider information
 * @returns {Promise<Object>} Provider data including id, user info, clinic details, etc.
 */
export const getProviderInfo = async () => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${BASE_URL}/provider/`, {
    headers
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch provider information');
  }

  return response.json();
};