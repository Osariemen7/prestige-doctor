import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Stack,
  useTheme,
  alpha,
  Tooltip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Article as ReviewsIcon,
  Assessment as DashboardIcon,
  Logout as LogoutIcon,
  LocalHospital as HospitalIcon,
  PersonAdd as PersonAddIcon,
} from '@mui/icons-material';
import InviteColleagueModal from './InviteColleagueModal';

const drawerWidthExpanded = 280;
const drawerWidthCollapsed = 72;

const DoctorLayout = ({ children }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const handleDrawerToggle = () => {
    setIsExpanded(!isExpanded);
  };

  const handleMobileToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleLogout = () => {
    localStorage.removeItem('user-info');
    navigate('/login');
  };

  const menuItems = [
    {
      text: 'Patient Reviews',
      description: 'View and manage medical reviews',
      icon: <ReviewsIcon />,
      path: '/reviews',
    },
    {
      text: 'Business Dashboard',
      description: 'Monitor practice performance',
      icon: <DashboardIcon />,
      path: '/provider-dashboard',
    },
  ];

  const drawer = (expanded) => (
    <Box
      sx={{
        height: '100%',
        background: 'linear-gradient(180deg, #ffffff 0%, #f8f9fa 100%)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.3s ease',
      }}
    >
      {/* Logo/Header with Toggle Button */}
      <Box
        sx={{
          p: expanded ? 3 : 2,
          background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
          color: 'white',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          minHeight: 88,
          transition: 'all 0.3s ease',
        }}
      >
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: expanded ? 'flex-start' : 'center',
        }}>
          {expanded ? (
            <Stack direction="row" spacing={2} alignItems="center" sx={{ width: '100%' }}>
              <Avatar
                sx={{
                  width: 48,
                  height: 48,
                  bgcolor: 'rgba(255,255,255,0.2)',
                }}
              >
                <HospitalIcon sx={{ fontSize: 28 }} />
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                  Prestige Doctor
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.9 }}>
                  Healthcare Portal
                </Typography>
              </Box>
            </Stack>
          ) : (
            <Avatar
              sx={{
                width: 40,
                height: 40,
                bgcolor: 'rgba(255,255,255,0.2)',
              }}
            >
              <HospitalIcon sx={{ fontSize: 24 }} />
            </Avatar>
          )}
        </Box>

        {/* Desktop Toggle Button at Top */}
        <Box sx={{ display: { xs: 'none', md: 'block' } }}>
          <Tooltip title={expanded ? 'Collapse sidebar' : 'Expand sidebar'} placement="right" arrow>
            <IconButton
              onClick={handleDrawerToggle}
              sx={{
                width: '100%',
                borderRadius: 2,
                color: 'white',
                bgcolor: 'rgba(255,255,255,0.1)',
                '&:hover': {
                  bgcolor: 'rgba(255,255,255,0.2)',
                },
              }}
            >
              <MenuIcon />
              {expanded && (
                <Typography variant="caption" sx={{ ml: 1, fontWeight: 600 }}>
                  {expanded ? 'Collapse' : 'Expand'}
                </Typography>
              )}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Navigation Menu */}
      <List sx={{ flex: 1, px: expanded ? 2 : 1, pt: 3 }}>
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          const button = (
            <ListItemButton
              onClick={() => {
                navigate(item.path);
                setMobileOpen(false);
              }}
              sx={{
                borderRadius: 2,
                py: 1.5,
                px: expanded ? 2 : 1.5,
                mb: 1,
                background: isActive 
                  ? `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`
                  : 'transparent',
                color: isActive ? 'white' : 'text.primary',
                transition: 'all 0.3s ease',
                justifyContent: expanded ? 'flex-start' : 'center',
                '&:hover': {
                  background: isActive
                    ? `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`
                    : alpha(theme.palette.primary.main, 0.08),
                  transform: expanded ? 'translateX(4px)' : 'scale(1.05)',
                },
                '& .MuiListItemIcon-root': {
                  color: isActive ? 'white' : theme.palette.primary.main,
                  minWidth: expanded ? 40 : 'auto',
                  justifyContent: 'center',
                },
              }}
            >
              <ListItemIcon>
                {item.icon}
              </ListItemIcon>
              {expanded && (
                <ListItemText
                  primary={item.text}
                  secondary={item.description}
                  primaryTypographyProps={{
                    fontWeight: isActive ? 600 : 500,
                    fontSize: '0.95rem',
                  }}
                  secondaryTypographyProps={{
                    fontSize: '0.75rem',
                    color: isActive ? 'rgba(255,255,255,0.7)' : 'text.secondary',
                  }}
                />
              )}
            </ListItemButton>
          );

          return (
            <ListItem key={item.path} disablePadding>
              {expanded ? (
                button
              ) : (
                <Tooltip title={item.text} placement="right" arrow>
                  {button}
                </Tooltip>
              )}
            </ListItem>
          );
        })}
      </List>

      <Divider />

      {/* Invite Colleague Button */}
      <Box sx={{ p: expanded ? 2 : 1 }}>
        {expanded ? (
          <ListItemButton
            onClick={() => setInviteModalOpen(true)}
            sx={{
              borderRadius: 2,
              py: 1.5,
              color: 'primary.main',
              animation: 'pulse 3s infinite',
              willChange: 'opacity',
              '&:hover': {
                bgcolor: alpha(theme.palette.primary.main, 0.08),
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 40, color: 'primary.main' }}>
              <PersonAddIcon />
            </ListItemIcon>
            <ListItemText
              primary="Invite Colleague"
              primaryTypographyProps={{
                fontWeight: 600,
                fontSize: '0.95rem',
              }}
            />
          </ListItemButton>
        ) : (
          <Tooltip title="Invite Colleague" placement="right" arrow>
            <IconButton
              onClick={() => setInviteModalOpen(true)}
              sx={{
                width: '100%',
                color: 'primary.main',
                animation: 'pulse 3s infinite',
                willChange: 'opacity',
                '&:hover': {
                  bgcolor: alpha(theme.palette.primary.main, 0.08),
                },
              }}
            >
              <PersonAddIcon />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      <Divider />

      {/* Logout Button */}
      <Box sx={{ p: expanded ? 2 : 1 }}>
        {expanded ? (
          <ListItemButton
            onClick={handleLogout}
            sx={{
              borderRadius: 2,
              py: 1.5,
              color: 'error.main',
              '&:hover': {
                bgcolor: alpha(theme.palette.error.main, 0.08),
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 40, color: 'error.main' }}>
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText
              primary="Logout"
              primaryTypographyProps={{
                fontWeight: 600,
                fontSize: '0.95rem',
              }}
            />
          </ListItemButton>
        ) : (
          <Tooltip title="Logout" placement="right" arrow>
            <IconButton
              onClick={handleLogout}
              sx={{
                width: '100%',
                color: 'error.main',
                '&:hover': {
                  bgcolor: alpha(theme.palette.error.main, 0.08),
                },
              }}
            >
              <LogoutIcon />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', position: 'relative' }}>
      {/* Floating Mobile Menu Button - Always Visible */}
      <IconButton
        onClick={handleMobileToggle}
        sx={{
          position: 'fixed',
          top: 16,
          left: 16,
          zIndex: 1300,
          bgcolor: 'primary.main',
          color: 'white',
          width: 56,
          height: 56,
          boxShadow: '0 4px 12px rgba(37, 99, 235, 0.4)',
          display: { xs: 'flex', md: 'none' },
          '&:hover': {
            bgcolor: 'primary.dark',
            boxShadow: '0 6px 16px rgba(37, 99, 235, 0.5)',
          },
        }}
      >
        <MenuIcon />
      </IconButton>

      {/* Mobile Drawer (Overlay) */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleMobileToggle}
        ModalProps={{
          keepMounted: true,
        }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: Math.min(drawerWidthExpanded, '85vw'),
            maxWidth: 320,
            boxShadow: '4px 0 24px rgba(0,0,0,0.12)',
          },
        }}
      >
        {drawer(true)}
      </Drawer>

      {/* Desktop Drawer - Collapsed state (permanent, no overlay) */}
      {!isExpanded && (
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidthCollapsed,
              transition: 'width 0.3s ease',
              borderRight: 'none',
              boxShadow: '2px 0 8px rgba(0,0,0,0.05)',
              overflowX: 'hidden',
            },
          }}
          open
        >
          {drawer(false)}
        </Drawer>
      )}

      {/* Desktop Drawer - Expanded state (temporary with backdrop) */}
      {isExpanded && (
        <Drawer
          variant="temporary"
          open={isExpanded}
          onClose={handleDrawerToggle}
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidthExpanded,
              transition: 'width 0.3s ease',
              borderRight: 'none',
              boxShadow: '4px 0 24px rgba(0,0,0,0.12)',
              overflowX: 'hidden',
            },
          }}
          ModalProps={{
            BackdropProps: {
              sx: {
                bgcolor: 'rgba(0, 0, 0, 0.3)',
              },
            },
          }}
        >
          {drawer(true)}
        </Drawer>
      )}

      {/* Main Content - Adjusts for collapsed sidebar only */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: '100%',
          minHeight: '100vh',
          bgcolor: 'background.default',
          marginLeft: { xs: 0, md: isExpanded ? 0 : `${drawerWidthCollapsed}px` },
          transition: 'margin 0.3s ease',
          // Mobile padding to avoid floating menu button
          pt: { xs: '80px', md: 0 },
          px: { xs: 0, md: 0 },
          overflowX: 'hidden',
          maxWidth: '100vw',
        }}
      >
        {children}
      </Box>

      {/* Invite Colleague Modal */}
      <InviteColleagueModal 
        open={inviteModalOpen} 
        handleClose={() => setInviteModalOpen(false)} 
      />
    </Box>
  );
};

export default DoctorLayout;
