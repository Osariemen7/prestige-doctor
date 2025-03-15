import React from 'react';
import { Tabs, Tab } from '@mui/material';

function NavigationBar({ activeTab, onTabChange }) {
    return (
        <Tabs value={activeTab} onChange={(event, newValue) => onTabChange(newValue)} aria-label="navigation tabs">
            <Tab value="transcript" label="Transcript" />
            <Tab value="patientProfile" label="Patient Profile" />
            <Tab value="healthGoals" label="Health Goals" />
            <Tab value="medicalReview" label="Doctor Note" />
        </Tabs>
    );
}

export default NavigationBar;