// Sidebar.js
import React from 'react';
import { FaHome, FaRobot, FaSignOutAlt } from 'react-icons/fa';
import './sidebar.css';

const Sidebar = ({ navigate, handleLogout }) => {
  return (
    <div className="sidebar">
      <div className="menu-item" onClick={() => navigate('/dashboard')}>
        <FaHome size={24} color="#003366" />
        <p className="menu-text">Home</p>
      </div>
      <div className="menu-item" onClick={() => navigate('/consult-ai')}>
        <FaRobot size={24} color="#003366" />
        <p className="menu-text">Consult AI</p>
      </div>
      <div className="menu-item" onClick={handleLogout}>
        <FaSignOutAlt size={24} color="#d32f2f" />
        <p className="menu-text">Log Out</p>
      </div>
    </div>
  );
};

export default Sidebar;
