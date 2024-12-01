import React, { useState, useEffect, useRef } from 'react';
import { FaWallet, FaMoneyBillWave } from "react-icons/fa";
import { FaHome, FaRobot, FaSignOutAlt, FaBars, FaTimes } from 'react-icons/fa';
import './sidebar.css';

const Sidebar = ({ navigate, handleLogout }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState('');
  const sidebarRef = useRef(null);
 

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };
  const handleClickOutside = (event) => {
    if (sidebarRef.current && !sidebarRef.current.contains(event.target)) {
      setIsSidebarOpen(false);
    }
  };

useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <>
    <div className='mobile-view'>
    <div className="hamburger" onClick={toggleSidebar}>
        {isSidebarOpen ? <FaTimes size={24} color="#003366" /> : <FaBars size={24} color="#003366" />}
      </div>

      {/* Sidebar */}
      <div className={`sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
        <div className="menu-item" onClick={() => navigate('/dashboard')}>
          <FaHome size={24} color="#003366" />
          <p className="menu-text">Home</p>
        </div>
        <div className="menu-item" onClick={() => navigate('/consult-ai')}>
          <FaRobot size={24} color="#003366" />
          <p className="menu-text">Consult AI</p>
        </div>
        <div className="menu-item" onClick={() => navigate('/account')}>
        <FaWallet size={24} color="#003366" />
          <p className="menu-text">Account</p>
        </div>
        <div className="menu-item" onClick={handleLogout}>
          <FaSignOutAlt size={24} color="#d32f2f" />
          <p className="menu-text">Log Out</p>
        </div>
      </div>
    </div>
    <div className='desktop-view'>
    <div className='sidebar'>
    <div className="menu-item" onClick={() => navigate('/dashboard')}>
          <FaHome size={24} color="#003366" />
          <p className="menu-text">Home</p>
        </div>
        <div className="menu-item" onClick={() => navigate('/consult-ai')}>
          <FaRobot size={24} color="#003366" />
          <p className="menu-text">Consult AI</p>
        </div>
        <div className="menu-item" onClick={() => navigate('/account')}>
        <FaWallet size={24} color="#003366" />
          <p className="menu-text">Account</p>
        </div>
        <div className="menu-item" onClick={handleLogout}>
          <FaSignOutAlt size={24} color="#d32f2f" />
          <p className="menu-text">Log Out</p>
        </div>
        </div>
    </div>
      {/* Hamburger Icon */}
      
    </>
  );
};

export default Sidebar;
