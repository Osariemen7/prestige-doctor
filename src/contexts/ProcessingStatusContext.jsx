import React, { createContext, useContext, useState, useCallback } from 'react';

const ProcessingStatusContext = createContext();

export const ProcessingStatusProvider = ({ children }) => {
  // State structure: { [reviewId]: 'uploading' | 'processing' | null }
  const [processingStatuses, setProcessingStatuses] = useState({});

  const setStatus = useCallback((reviewId, status) => {
    setProcessingStatuses(prev => ({
      ...prev,
      [reviewId]: status
    }));
  }, []);

  const getStatus = useCallback((reviewId) => {
    return processingStatuses[reviewId] || null;
  }, [processingStatuses]);

  const clearStatus = useCallback((reviewId) => {
    setProcessingStatuses(prev => {
      const newStatuses = { ...prev };
      delete newStatuses[reviewId];
      return newStatuses;
    });
  }, []);

  const isProcessing = useCallback((reviewId) => {
    const status = processingStatuses[reviewId];
    return status === 'uploading' || status === 'processing';
  }, [processingStatuses]);

  const value = {
    processingStatuses,
    setStatus,
    getStatus,
    clearStatus,
    isProcessing
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
