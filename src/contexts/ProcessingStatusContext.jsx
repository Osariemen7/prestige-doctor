import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { getAccessToken } from '../api';

const ProcessingStatusContext = createContext();

const POLL_INTERVAL_MS = 7000;
const STATUS_CLEAR_DELAY_MS = 4000;

export const ProcessingStatusProvider = ({ children }) => {
  // State structure: { [reviewId]: 'queued' | 'processing' | 'completed' | 'failed' }
  const [processingStatuses, setProcessingStatuses] = useState({});

  const statusDataRef = useRef({});
  const encounterMapRef = useRef({});
  const pollingTimersRef = useRef({});
  const callbackRef = useRef({});
  const clearTimersRef = useRef({});

  const setStatus = useCallback((reviewId, status) => {
    if (!reviewId) return;
    setProcessingStatuses(prev => ({
      ...prev,
      [reviewId]: status
    }));
  }, []);

  const clearStatus = useCallback((reviewId) => {
    if (!reviewId) return;
    setProcessingStatuses(prev => {
      if (!(reviewId in prev)) {
        return prev;
      }
      const updated = { ...prev };
      delete updated[reviewId];
      return updated;
    });
    delete statusDataRef.current[reviewId];
    delete encounterMapRef.current[reviewId];
    delete callbackRef.current[reviewId];
    if (clearTimersRef.current[reviewId]) {
      clearTimeout(clearTimersRef.current[reviewId]);
      delete clearTimersRef.current[reviewId];
    }
  }, []);

  const stopEncounterPolling = useCallback((reviewId, options = {}) => {
    if (!reviewId) return;

    if (pollingTimersRef.current[reviewId]) {
      console.log(`[Polling] Clearing active polling timer for review ${reviewId}`);
      clearTimeout(pollingTimersRef.current[reviewId]);
      delete pollingTimersRef.current[reviewId];
    }

    const { keepStatus = false, clearDelay = 0 } = options;

    if (!keepStatus) {
      clearStatus(reviewId);
    } else if (clearDelay > 0) {
      if (clearTimersRef.current[reviewId]) {
        clearTimeout(clearTimersRef.current[reviewId]);
      }
      clearTimersRef.current[reviewId] = setTimeout(() => {
        console.log(`[Polling] Status clear delay expired for review ${reviewId}, clearing status`);
        clearStatus(reviewId);
        delete clearTimersRef.current[reviewId];
      }, clearDelay);
    }
  }, [clearStatus]);

  const getStatus = useCallback((reviewId) => {
    return processingStatuses[reviewId] || null;
  }, [processingStatuses]);

  const getStatusData = useCallback((reviewId) => {
    return statusDataRef.current[reviewId] || null;
  }, []);

  const handlePollingError = useCallback((reviewId, message) => {
    console.error(`[Polling Error] Review ${reviewId}: ${message}`);
    setStatus(reviewId, 'failed');
    const callbacks = callbackRef.current[reviewId];
    if (callbacks?.onError) {
      callbacks.onError(message);
    }
    console.log(`[Polling] Stopping polling for review ${reviewId}, clearing timer and scheduling 4s status clear`);
    stopEncounterPolling(reviewId, { keepStatus: true, clearDelay: STATUS_CLEAR_DELAY_MS });
  }, [setStatus, stopEncounterPolling]);

  const handlePollingCompletion = useCallback((reviewId, data) => {
    setStatus(reviewId, 'completed');
    const callbacks = callbackRef.current[reviewId];
    if (callbacks?.onComplete) {
      callbacks.onComplete(data);
    }
    stopEncounterPolling(reviewId, { keepStatus: true, clearDelay: STATUS_CLEAR_DELAY_MS });
  }, [setStatus, stopEncounterPolling]);

  const startEncounterPolling = useCallback(async ({
    reviewId,
    encounterId,
    initialState = 'queued',
    onStatus,
    onComplete,
    onError
  } = {}) => {
    if (!reviewId || !encounterId) {
      return;
    }

    console.log(`[Polling] Attempting to start polling for review ${reviewId}, encounter ${encounterId}, initialState: ${initialState}`);

    const previousEncounterId = encounterMapRef.current[reviewId];
    const previousStatus = processingStatuses[reviewId];
    const lastStatusData = statusDataRef.current[reviewId];
    const lastState = lastStatusData?.state || lastStatusData?.status;
    const alreadyFailed = lastState === 'failed' || previousStatus === 'failed';
    const alreadyCompleted = lastState === 'completed' || previousStatus === 'completed';
    
    // If already polling for the same encounter, just update callbacks
    if (previousEncounterId === encounterId && pollingTimersRef.current[reviewId]) {
      console.log(`[Polling] Already polling for review ${reviewId}, updating callbacks only`);
      callbackRef.current[reviewId] = {
        onStatus,
        onComplete,
        onError
      };
      setStatus(reviewId, processingStatuses[reviewId] || initialState);
      return;
    }

    // If already failed or completed for this review/encounter, don't restart polling
    if ((alreadyFailed || alreadyCompleted) && previousEncounterId === encounterId) {
      console.log(`[Polling] Review ${reviewId} already ${alreadyFailed ? 'failed' : 'completed'} (encounter ${encounterId}), skipping restart`);
      return;
    }    // Stop any existing polling for this review and register the new encounter
    stopEncounterPolling(reviewId);
    encounterMapRef.current[reviewId] = encounterId;
    callbackRef.current[reviewId] = {
      onStatus,
      onComplete,
      onError
    };
    statusDataRef.current[reviewId] = null;
    setStatus(reviewId, initialState);

    const poll = async () => {
      const activeEncounterId = encounterMapRef.current[reviewId];
      if (activeEncounterId !== encounterId) {
        console.log(`[Polling] Skipping poll for review ${reviewId}: encounter mismatch`);
        return;
      }

      // Check if we should still be polling
      const currentStatus = processingStatuses[reviewId];
      if (currentStatus === 'completed' || currentStatus === 'failed') {
        console.log(`[Polling] Skipping poll for review ${reviewId}: already ${currentStatus}`);
        return;
      }

      console.log(`[Polling] Polling review ${reviewId}, encounter ${encounterId}`);

      const token = await getAccessToken();
      if (!token) {
        handlePollingError(reviewId, 'Authentication required. Please sign in again.');
        return;
      }

      try {
        const response = await fetch(
          `https://service.prestigedelta.com/in-person-encounters/${encounterId}/processing-status/`,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );

        const responseData = await response.json().catch(() => ({}));

        if (!response.ok) {
          const message = responseData.detail || responseData.error || 'Failed to check processing status.';
          handlePollingError(reviewId, message);
          return;
        }

        const state = responseData.state || responseData.status || 'processing';
        console.log(`[Polling] Review ${reviewId} state: ${state}`);

        statusDataRef.current[reviewId] = responseData;
        setStatus(reviewId, state);

        const callbacks = callbackRef.current[reviewId];
        if (callbacks?.onStatus) {
          callbacks.onStatus(state, responseData);
        }

        if (state === 'completed') {
          console.log(`[Polling] Review ${reviewId} completed, stopping poll`);
          handlePollingCompletion(reviewId, responseData);
          return;
        }

        if (state === 'failed') {
          const message = responseData.error || 'Audio processing failed. Please try again.';
          console.warn(`Polling stopped for review ${reviewId}: ${message}`);
          handlePollingError(reviewId, message);
          return;
        }

        // Continue polling until completion or failure
        console.log(`[Polling] Scheduling next poll for review ${reviewId} in ${POLL_INTERVAL_MS}ms`);
        pollingTimersRef.current[reviewId] = setTimeout(poll, POLL_INTERVAL_MS);
      } catch (error) {
        const message = error instanceof Error && error.message
          ? error.message
          : 'Failed to check processing status. Please try again.';
        handlePollingError(reviewId, message);
      }
    };

    // First poll after the configured interval (per product requirement)
    pollingTimersRef.current[reviewId] = setTimeout(poll, POLL_INTERVAL_MS);
  }, [handlePollingCompletion, handlePollingError, processingStatuses, setStatus, stopEncounterPolling]);

  const isProcessing = useCallback((reviewId) => {
    const status = processingStatuses[reviewId];
    return status === 'queued' || status === 'processing';
  }, [processingStatuses]);

  const value = {
    processingStatuses,
    setStatus,
    getStatus,
    clearStatus,
    isProcessing,
    startEncounterPolling,
    stopEncounterPolling,
    getStatusData
  };

  return (
    <ProcessingStatusContext.Provider value={value}>
      {children}
    </ProcessingStatusContext.Provider>
  );
};

export const useProcessingStatus = () => {
  const context = useContext(ProcessingStatusContext);
  if (!context) {
    throw new Error('useProcessingStatus must be used within a ProcessingStatusProvider');
  }
  return context;
};

export default ProcessingStatusContext;
