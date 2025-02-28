import React, { useState } from 'react';
import { 
  Home, 
  Users, 
  Activity, 
  DollarSign, 
  FileText, 
  Settings,
  Search,
  LogOut,
  Menu
} from 'lucide-react';

const Sidebar = ({ onNavigate, onLogout, onToggleSidebar }) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  
  const menuItems = [
    { icon: <Home size={20} />, text: 'Home', path: '/dashboard' },
    { icon: <Users size={20} />, text: 'Physical Consultation', path: '/consult-ai' },
    { icon: <Activity size={20} />, text: 'Virtual Consultations', path: '/virtual' },
    { icon: <Search size={20} />, text: 'Researcher', path: '/ask' },
    { icon: <DollarSign size={20} />, text: 'Earnings', path: '/account' },
    { icon: <FileText size={20} />, text: 'Dashboard', path: '/doctor' },
    { icon: <Settings size={20} />, text: 'Settings', path: '/setting' },
  ];

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
      {/* Mobile Menu Button - Positioned at top-right */}
      <button 
        className="fixed top-4 right-4 z-50 p-2 rounded-md hover:bg-gray-100 lg:hidden"
        onClick={toggleMobile}
      >
        <Menu size={24} />
      </button>

      {/* Sidebar Backdrop for Mobile */}
      {isMobileOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed top-0 left-0 h-screen bg-white shadow-md flex flex-col z-40
        transition-all duration-300 ease-in-out
        ${isMinimized ? 'w-16' : 'w-64'}
        lg:translate-x-0
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          {!isMinimized && (
            <h1 className="text-xl font-semibold text-blue-600">PrestigeHealth</h1>
          )}
          <button 
            onClick={toggleSidebar}
            className="p-2 rounded-md hover:bg-gray-100 hidden lg:block"
          >
            <Menu size={20} />
          </button>
        </div>
        
        {/* Navigation Container */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 120px)' }}>
          <nav className="pt-4">
            {menuItems.map((item, index) => (
              <button
                key={index}
                onClick={() => onNavigate(item.path)}
                className="w-full px-4 py-3 flex items-center text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                title={isMinimized ? item.text : ''}
              >
                <span className="text-gray-500">
                  {item.icon}
                </span>
                {!isMinimized && (
                  <span className="ml-3 text-sm font-medium">{item.text}</span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Logout Button (inside the sidebar) */}
        <button
          onClick={onLogout}
          className="w-full px-4 py-3 flex items-center text-red-600 hover:bg-red-50 transition-colors border-t border-gray-100"
          title={isMinimized ? 'Logout' : ''}
        >
          <LogOut size={20} />
          {!isMinimized && (
            <span className="ml-3 text-sm font-medium">Log Out</span>
          )}
        </button>
      </div>
    </>
  );
};

export default Sidebar;
