// src/components/Navbar.jsx
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { logoutUser, getConversations } from '../auth';
import websocketService from '../services/websocket';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = !!localStorage.getItem('access_token');
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (isAuthenticated) {
      loadUnreadCount();
      // Refresh unread count every 30 seconds
      const interval = setInterval(loadUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, location.pathname]);

  const loadUnreadCount = async () => {
    try {
      const conversations = await getConversations();
      const totalUnread = conversations.reduce(
        (sum, conv) => sum + (conv.unread_count || 0), 
        0
      );
      setUnreadCount(totalUnread);
    } catch (err) {
      console.error('Failed to load unread count:', err);
    }
  };

  const handleLogout = () => {
    websocketService.disconnect();
    logoutUser();
    navigate('/');
  };

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  // Logged-out navigation
  if (!isAuthenticated) {
    const publicLinks = [
      { path: '/', label: 'Home', icon: '🏡' },
      { path: '/login', label: 'Login', icon: '🔑' },
      { path: '/register', label: 'Register', icon: '📝' },
    ];

    return (
      <nav className="bg-gradient-to-r from-purple-900 via-indigo-900 to-blue-900 shadow-xl sticky top-0 z-50 border-b border-white border-opacity-10">
        <div className="container mx-auto px-6">
          <div className="flex justify-between items-center py-4">
            
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 group">
              <span className="text-3xl group-hover:scale-110 transition-transform">🔄</span>
              <span className="text-2xl font-bold text-white">SkillSwap</span>
            </Link>

            {/* Public Navigation Links */}
            <div className="flex items-center gap-2">
              {publicLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    isActive(link.path)
                      ? 'bg-white bg-opacity-20 text-white shadow-lg'
                      : 'text-purple-200 hover:bg-white hover:bg-opacity-10 hover:text-white'
                  }`}
                >
                  <span className="mr-2">{link.icon}</span>
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </nav>
    );
  }

  // Logged-in navigation
  const navLinks = [
    { path: '/home', label: 'Home', icon: '🏡' },
    { path: '/dashboard', label: 'Dashboard', icon: '🏠' },
    { path: '/skills', label: 'Skills', icon: '🎯' },
    { path: '/messages', label: 'Messages', icon: '💬', badge: unreadCount },
    { path: '/contact', label: 'Contact', icon: '📧' },
  ];

  return (
    <nav className="bg-gradient-to-r from-purple-900 via-indigo-900 to-blue-900 shadow-xl sticky top-0 z-50 border-b border-white border-opacity-10">
      <div className="container mx-auto px-6">
        <div className="flex justify-between items-center py-4">
          
          {/* Logo */}
          <Link to="/home" className="flex items-center gap-2 group">
            <span className="text-3xl group-hover:scale-110 transition-transform">🔄</span>
            <span className="text-2xl font-bold text-white">SkillSwap</span>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-4 py-2 rounded-lg font-medium transition-all relative ${
                  isActive(link.path)
                    ? 'bg-white bg-opacity-20 text-white shadow-lg'
                    : 'text-purple-200 hover:bg-white hover:bg-opacity-10 hover:text-white'
                }`}
              >
                <span className="mr-2">{link.icon}</span>
                {link.label}
                {link.badge > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                    {link.badge > 99 ? '99+' : link.badge}
                  </span>
                )}
              </Link>
            ))}

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="ml-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-all shadow-lg flex items-center gap-2"
            >
              <span>🚪</span>
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}