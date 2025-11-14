// Investigation Management API Service
import { getAccessToken } from '../api';

const BASE_URL = 'https://service.prestigedelta.com';

// Helper function to make authenticated requests
const makeRequest = async (url, options = {}) => {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${BASE_URL}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || error.message || 'Request failed');
  }

  return response.json();
};

// Get available investigation tests and pricing
export const getDefaultListings = async () => {
  return makeRequest('/provider-investigations/default_listings/');
};

// Get pending investigation requests (not yet associated with orders)
export const getPendingInvestigations = async (days = 7) => {
  return makeRequest(`/provider-investigations/pending_investigations/?days=${days}`);
};

// Create or update investigation request (unified endpoint)
export const manageInvestigationRequest = async (data) => {
  return makeRequest('/provider-investigations/manage/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

// Get all investigation orders with payment status
export const getInvestigationOrders = async (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  const url = queryString ? `/investigation-orders/?${queryString}` : '/investigation-orders/';
  return makeRequest(url);
};

// Get specific investigation order details
export const getInvestigationOrderById = async (orderId) => {
  return makeRequest(`/investigation-orders/${orderId}/`);
};

// Legacy endpoints (still available)
export const getInvestigations = async (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  const url = queryString ? `/investigations/?${queryString}` : '/investigations/';
  return makeRequest(url);
};

export const getInvestigationRequests = async (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  const url = queryString ? `/investigation-requests/?${queryString}` : '/investigation-requests/';
  return makeRequest(url);
};

// Helper function to create a new investigation request
export const createInvestigationRequest = async ({
  patientId,
  investigations,
  createOrder = false,
  paymentMethod = 'out_of_pocket',
}) => {
  return manageInvestigationRequest({
    patient_id: patientId,
    investigations: investigations.map((inv) => ({
      test_type: inv.testType,
      reason: inv.reason,
      scheduled_time: inv.scheduledTime,
      listing: {
        code: inv.listing.code,
        price: inv.listing.price,
        currency: inv.listing.currency || 'NGN',
      },
    })),
    create_order: createOrder,
    payment_method: paymentMethod,
  });
};

// Helper function to update an existing investigation request
export const updateInvestigationRequest = async ({
  investigationRequestId,
  patientId,
  investigations,
  createOrder = false,
  paymentMethod = 'out_of_pocket',
}) => {
  return manageInvestigationRequest({
    investigation_request_id: investigationRequestId,
    patient_id: patientId,
    investigations: investigations.map((inv) => {
      const payload = {
        test_type: inv.testType,
        reason: inv.reason,
        scheduled_time: inv.scheduledTime,
        listing: {
          code: inv.listing.code,
          price: inv.listing.price,
          currency: inv.listing.currency || 'NGN',
        },
      };
      // Include ID if it exists (for updating existing investigations)
      if (inv.id) {
        payload.id = inv.id;
      }
      return payload;
    }),
    create_order: createOrder,
    payment_method: paymentMethod,
  });
};

// Get all patients for the provider
export const getAllPatients = async () => {
  return makeRequest('/provider/all-patients/');
};

// Create a new patient
export const createPatient = async (patientData) => {
  return makeRequest('/patients/', {
    method: 'POST',
    body: JSON.stringify(patientData),
  });
};

// Helper to format currency
export const formatCurrency = (amount, currency = 'NGN') => {
  const numAmount = parseFloat(amount);
  if (isNaN(numAmount)) return `${currency} 0.00`;
  
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
  }).format(numAmount);
};

// Helper to format date/time
export const formatDateTime = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Helper to get status badge color
export const getStatusColor = (status) => {
  const statusColors = {
    pending: '#f59e0b',
    paid: '#10b981',
    failed: '#ef4444',
    refunded: '#6b7280',
    processing: '#3b82f6',
    completed: '#059669',
    cancelled: '#dc2626',
  };
  return statusColors[status?.toLowerCase()] || '#6b7280';
};

export default {
  getDefaultListings,
  getPendingInvestigations,
  manageInvestigationRequest,
  getInvestigationOrders,
  getInvestigationOrderById,
  getInvestigations,
  getInvestigationRequests,
  createInvestigationRequest,
  updateInvestigationRequest,
  formatCurrency,
  formatDateTime,
  getStatusColor,
};
