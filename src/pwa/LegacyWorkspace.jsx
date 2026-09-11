import React from 'react';
import { NavLink } from 'react-router-dom';
import { ProcessingStatusProvider } from '../contexts/ProcessingStatusContext';
import ReviewsHome from '../components/ReviewsHome';
export default function LegacyWorkspace() { return <ProcessingStatusProvider><div className="doctor-legacy"><NavLink to="/app/queue">Back to your workspace</NavLink><ReviewsHome /></div></ProcessingStatusProvider>; }
