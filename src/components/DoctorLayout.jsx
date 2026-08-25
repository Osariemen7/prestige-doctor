import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, Drawer, IconButton, Typography } from '@mui/material';
import {
  AutoAwesomeRounded,
  Groups2Rounded,
  HomeRounded,
  LogoutRounded,
  MarkUnreadChatAltRounded,
  MenuRounded,
  QueueRounded,
} from '@mui/icons-material';
import { getUser, logout } from '../api';
import './DoctorHome.css';

const navigationItems = [
  { label: 'Overview', description: 'Your practice at a glance', path: '/', icon: HomeRounded },
  { label: 'Work queue', description: 'AI-prepared clinical work', path: '/work', icon: QueueRounded },
  { label: 'Patients', description: 'Continuity and recurring care', path: '/patients', icon: Groups2Rounded },
  { label: 'Care inbox', description: 'High-touch follow-through', path: '/care', icon: MarkUnreadChatAltRounded },
];

const pageMeta = (pathname) => {
  if (pathname.startsWith('/work')) return { title: 'Work queue', context: 'AI-prepared clinical work' };
  if (pathname.startsWith('/patients')) return { title: 'Patients', context: 'Continuity and recurring care' };
  if (pathname.startsWith('/care')) return { title: 'Care inbox', context: 'High-touch follow-through' };
  return { title: 'Overview', context: 'Your practice at a glance' };
};

const getUserName = (user) => user?.full_name || [user?.first_name, user?.last_name].filter(Boolean).join(' ') || 'Doctor';

const getInitials = (user) => getUserName(user)
  .split(' ')
  .filter(Boolean)
  .slice(0, 2)
  .map((part) => part[0])
  .join('')
  .toUpperCase() || 'DR';

function Logo() {
  return (
    <Box className="doctor-logo">
      <Box className="doctor-logo-mark"><AutoAwesomeRounded /></Box>
      <Box>
        <Typography className="doctor-logo-name">prestige</Typography>
        <Typography className="doctor-logo-label">Doctor OS</Typography>
      </Box>
    </Box>
  );
}

function DoctorNav({ pathname, onNavigate, onLogout, compact = false }) {
  return (
    <Box className={`doctor-nav ${compact ? 'doctor-nav-compact' : ''}`}>
      <Box className="doctor-nav-links">
        {navigationItems.map(({ label, description, path, icon: Icon }) => {
          const active = path === '/' ? pathname === '/' : pathname.startsWith(path);
          return (
            <Box
              key={path}
              className={`doctor-nav-item ${active ? 'doctor-nav-item-active' : ''}`}
              onClick={() => onNavigate(path)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') onNavigate(path);
              }}
            >
              <Box className="doctor-nav-icon"><Icon /></Box>
              <Box className="doctor-nav-copy">
                <Typography className="doctor-nav-label">{label}</Typography>
                <Typography className="doctor-nav-description">{description}</Typography>
              </Box>
            </Box>
          );
        })}
      </Box>
      <Box className="doctor-nav-footer">
        <Box className="doctor-nav-item doctor-nav-item-muted doctor-nav-logout" role="button" tabIndex={0} onClick={onLogout}>
          <Box className="doctor-nav-icon"><LogoutRounded /></Box>
          <Box className="doctor-nav-copy"><Typography className="doctor-nav-label">Sign out</Typography></Box>
        </Box>
      </Box>
    </Box>
  );
}

export default function DoctorLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useMemo(() => getUser() || {}, []);
  const [mobileOpen, setMobileOpen] = useState(false);
  const meta = pageMeta(location.pathname);

  const handleNavigate = (path) => {
    setMobileOpen(false);
    navigate(path);
  };

  const handleLogout = () => {
    logout();
    setMobileOpen(false);
    navigate('/login', { replace: true });
  };

  return (
    <Box className="doctor-shell">
      <Box component="aside" className="doctor-rail">
        <Logo />
        <Box className="doctor-rail-rule" />
        <DoctorNav pathname={location.pathname} onNavigate={handleNavigate} onLogout={handleLogout} />
        <Box className="doctor-rail-user">
          <Box className="doctor-topbar-avatar">{getInitials(user)}</Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography className="doctor-rail-user-name">Dr. {getUserName(user)}</Typography>
            <Typography className="doctor-rail-user-role">Clinician workspace</Typography>
          </Box>
        </Box>
      </Box>

      <Drawer
        anchor="left"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        className="doctor-mobile-drawer"
        PaperProps={{ className: 'doctor-mobile-drawer-paper' }}
      >
        <Logo />
        <Box className="doctor-rail-rule" />
        <DoctorNav pathname={location.pathname} onNavigate={handleNavigate} onLogout={handleLogout} compact />
      </Drawer>

      <Box component="main" className="doctor-main">
        <Box component="header" className="doctor-topbar">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <IconButton className="doctor-mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Open navigation">
              <MenuRounded />
            </IconButton>
            <Box>
              <Typography className="doctor-topbar-title">{meta.title}</Typography>
              <Typography className="doctor-topbar-context">{meta.context}</Typography>
            </Box>
          </Box>
          <Box className="doctor-topbar-state">
            <Box className="doctor-topbar-ai"><Box className="doctor-live-dot" /> AI care team active</Box>
            <Box className="doctor-topbar-avatar">{getInitials(user)}</Box>
          </Box>
        </Box>
        {children}
      </Box>
    </Box>
  );
}
