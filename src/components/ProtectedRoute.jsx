import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { isAuthenticated } from '../api';

/**
 * Route guard for clinician-only surfaces. Redirects unauthenticated
 * visitors to /login while preserving the intended destination so it can
 * be restored after sign-in.
 */
const ProtectedRoute = ({ children }) => {
  const location = useLocation();

  if (!isAuthenticated()) {
    const intended = `${location.pathname}${location.search || ''}`;
    return <Navigate to="/login" state={{ from: intended }} replace />;
  }

  return children;
};

export default ProtectedRoute;
