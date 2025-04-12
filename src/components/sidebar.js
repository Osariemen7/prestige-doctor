import React, { useState, useEffect } from 'react';
import { 
  Home, 
  Users, 
  Activity, 
  DollarSign, 
  FileText, 
  Settings,
  Search,
  LogOut,
  Menu,
  MessageSquare
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const Sidebar = ({ onNavigate, onLogout, onToggleSidebar }) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();
  
  const menuItems = [
    { icon: <Home size={20} />, text: 'Home', path: '/dashboard' },
    { icon: <MessageSquare size={20} />, text: 'Patient Messages', path: '/patient-messages' },
    { icon: <Users size={20} />, text: 'Physical Consultation', path: '/consult-ai' },
    { icon: <Activity size={20} />, text: 'Virtual Consultation', path: '/virtual' },
    { icon: <Search size={20} />, text: 'Dr House AI', path: '/ask' },
    { icon: <DollarSign size={20} />, text: 'Earnings', path: '/account' },
    { icon: <FileText size={20} />, text: 'Dashboard', path: '/doctor' },
    { icon: <Settings size={20} />, text: 'Settings', path: '/setting' },
  ];

  // Close mobile sidebar when route changes
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  const toggleSidebar = () => {
    setIsMinimized((prev) => {
      const newState = !prev;
      onToggleSidebar(newState);
      return newState;
    });
  };

  const toggleMobile = () => {
    setIsMobileOpen(!isMobileOpen);
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button 
        className="fixed top-4 right-4 z-50 p-2 rounded-lg hover:bg-gray-100 
                   active:scale-95 transition-all duration-200 lg:hidden
                   bg-white shadow-md"
        onClick={toggleMobile}
        aria-label="Toggle Menu"
      >
        <Menu size={24} />
      </button>

      {/* Sidebar Backdrop */}
      {isMobileOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-40 
                     transition-opacity duration-300"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed top-0 left-0 h-screen bg-white shadow-lg flex flex-col z-50
        transition-all duration-300 ease-in-out
        ${isMinimized ? 'w-20' : 'w-72'}
        lg:translate-x-0
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          {!isMinimized && (
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 
                          bg-clip-text text-transparent">
              PrestigeHealth
            </h1>
          )}
          <button 
            onClick={toggleSidebar}
            className="p-2 rounded-lg hover:bg-gray-100 hidden lg:block
                     active:scale-95 transition-all duration-200"
            aria-label="Toggle Sidebar"
          >
            <Menu size={20} className="text-gray-600" />
          </button>
        </div>
        
        {/* Navigation */}
        <div className="overflow-y-auto flex-1 py-4">
          <nav className="space-y-1 px-3">
            {menuItems.map((item, index) => {
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={index}
                  onClick={() => onNavigate(item.path)}
                  className={`
                    w-full px-4 py-3 flex items-center rounded-lg
                    transition-all duration-200
                    ${isActive 
                      ? 'bg-blue-50 text-blue-600' 
                      : 'text-gray-600 hover:bg-gray-50 hover:text-blue-600'}
                    ${isActive && !isMinimized ? 'shadow-sm' : ''}
                    group relative
                  `}
                  title={isMinimized ? item.text : ''}
                >
                  <span className={`
                    transition-colors duration-200
                    ${isActive ? 'text-blue-600' : 'text-gray-500 group-hover:text-blue-600'}
                  `}>
                    {item.icon}
                  </span>
                  {!isMinimized && (
                    <span className="ml-3 text-sm font-medium">{item.text}</span>
                  )}
                  {isActive && (
                    <span className="absolute inset-y-0 left-0 w-1 bg-blue-600 rounded-full" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Logout Button */}
        <div className="p-3 border-t border-gray-100">
          <button
            onClick={onLogout}
            className="w-full px-4 py-3 flex items-center rounded-lg text-red-600
                     hover:bg-red-50 transition-all duration-200 group
                     active:scale-98"
            title={isMinimized ? 'Logout' : ''}
          >
            <LogOut size={20} className="group-hover:scale-110 transition-transform duration-200" />
            {!isMinimized && (
              <span className="ml-3 text-sm font-medium">Log Out</span>
            )}
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;