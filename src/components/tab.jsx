import React from 'react';
import { Tabs, Tab, Box, IconButton, Menu, MenuItem, useMediaQuery } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DescriptionIcon from '@mui/icons-material/Description';
import PersonIcon from '@mui/icons-material/Person';
import FlagIcon from '@mui/icons-material/Flag';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import HelpIcon from '@mui/icons-material/Help';

function NavigationBar({ activeTab, onTabChange }) {
    const isMobile = useMediaQuery('(max-width: 768px)');
    const isSmallMobile = useMediaQuery('(max-width: 480px)');
    const [anchorEl, setAnchorEl] = React.useState(null);
    
    const handleMenuClick = (event) => {
        setAnchorEl(event.currentTarget);
    };
    
    const handleMenuClose = () => {
        setAnchorEl(null);
    };
    
    const handleMenuItemClick = (tab) => {
        onTabChange(tab);
        handleMenuClose();
    };
      // Map tabs to icons for mobile view
    const tabIcons = {
        transcript: <DescriptionIcon />,
        suggestedQuestions: <HelpIcon />,
        medicalReview: <MedicalServicesIcon />
    };
    
    // Map tabs to readable names
    const tabNames = {
        transcript: "Transcript",
        suggestedQuestions: "Suggested Questions",
        medicalReview: "Doctor Note"
    };

    // Shorter names for small mobile screens
    const shortTabNames = {
        transcript: "Trans",
        suggestedQuestions: "Q&A",
        medicalReview: "Note"
    };

    if (isMobile) {
        // Mobile view: scrollable tabs with icons and selective text
        return (
            <Box sx={{ width: '100%', position: 'relative' }}>
                <Tabs 
                    value={activeTab} 
                    onChange={(event, newValue) => onTabChange(newValue)}
                    variant="scrollable"
                    scrollButtons="auto"
                    allowScrollButtonsMobile
                    aria-label="navigation tabs"
                    sx={{
                        '& .MuiTabs-scrollButtons': {
                            color: 'primary.main',
                        },                        '& .MuiTab-root': {
                            minWidth: isSmallMobile ? '40px' : 'unset',
                            py: isSmallMobile ? 0.25 : 0.5, // Reduced vertical padding
                            px: isSmallMobile ? 0.5 : 1, // Reduced horizontal padding
                            fontSize: isSmallMobile ? '0.625rem' : '0.75rem',
                            minHeight: isSmallMobile ? '36px' : '42px' // Reduced height
                        },
                        '& .MuiTabs-flexContainer': {
                            justifyContent: isSmallMobile ? 'space-between' : 'flex-start',
                            width: isSmallMobile ? '100%' : 'auto'
                        }
                    }}
                >
                    {Object.keys(tabNames).map((tab) => (
                        <Tab 
                            key={tab}
                            value={tab} 
                            icon={tabIcons[tab]} 
                            label={isSmallMobile ? "" : (isMobile ? shortTabNames[tab] : tabNames[tab])}
                            aria-label={tabNames[tab]}
                            sx={{ 
                                minWidth: isSmallMobile ? 36 : (isMobile ? 48 : 'auto'), 
                                '& .MuiSvgIcon-root': { 
                                    fontSize: isSmallMobile ? '1.1rem' : '1.25rem',
                                    mb: isSmallMobile ? 0 : 0.5 
                                } 
                            }}
                        />
                    ))}
                </Tabs>
                <Box
                    sx={{
                        position: 'absolute',
                        right: 0,
                        top: 0,
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.9) 30%, rgba(255,255,255,1) 100%)',
                        px: 1,
                        zIndex: 1
                    }}
                >
                    <IconButton 
                        onClick={handleMenuClick}
                        size="small"
                        sx={{ ml: 'auto' }}
                    >
                        <MenuIcon fontSize="small" />
                    </IconButton>
                </Box>
                <Menu
                    anchorEl={anchorEl}
                    open={Boolean(anchorEl)}
                    onClose={handleMenuClose}
                >
                    {Object.keys(tabNames).map((tab) => (
                        <MenuItem 
                            key={tab} 
                            onClick={() => handleMenuItemClick(tab)}
                            selected={activeTab === tab}
                            sx={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: 1,
                                fontSize: '0.875rem',
                                py: 0.75
                            }}
                        >
                            {tabIcons[tab]}
                            {tabNames[tab]}
                        </MenuItem>
                    ))}
                </Menu>
            </Box>
        );
    }
      // Desktop view: regular tabs
    return (
        <Tabs 
            value={activeTab} 
            onChange={(event, newValue) => onTabChange(newValue)} 
            aria-label="navigation tabs"            sx={{
                '& .MuiTab-root': {
                    fontSize: '0.875rem',
                    minHeight: '42px', // Reduced height for desktop tabs
                    py: 0.5 // Add vertical padding
                }
            }}
        >
            <Tab value="transcript" label="Transcript" />
            <Tab value="suggestedQuestions" label="Suggested Questions" />
            <Tab value="medicalReview" label="Doctor Note" />
        </Tabs>
    );
}

export default NavigationBar;