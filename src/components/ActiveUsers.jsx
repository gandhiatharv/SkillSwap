import { useState, useEffect, useRef } from 'react';
import websocketService from '../services/websocket';

export default function ActiveUsers({ onVideoCall }) {
  const [activeUsers, setActiveUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    console.log('ActiveUsers: Setting up listeners');
    mountedRef.current = true;
    
    // Listen for active users updates
    const unsubscribeActiveUsers = websocketService.onActiveUsers((users) => {
      console.log('ActiveUsers: Received active users update:', users);
      if (mountedRef.current) {
        setActiveUsers(users || []);
        setLoading(false);
        setError(null);
      }
    });

    // Listen for individual activity updates
    const unsubscribeActivity = websocketService.onUserActivity((userId, isOnline, username) => {
      console.log(`ActiveUsers: User ${username} (${userId}) is now ${isOnline ? 'online' : 'offline'}`);
      
      if (mountedRef.current) {
        setActiveUsers(prevUsers => {
          if (isOnline) {
            // Add user if not already in list
            const exists = prevUsers.some(user => user.id === userId);
            if (!exists) {
              return [...prevUsers, { id: userId, username }];
            }
            return prevUsers;
          } else {
            // Remove user from list
            return prevUsers.filter(user => user.id !== userId);
          }
        });
      }
    });

    // Check if WebSocket is already connected and has active users
    if (websocketService.isActivityConnected()) {
      const currentActiveUsers = websocketService.getActiveUsers();
      if (currentActiveUsers.length > 0 && mountedRef.current) {
        setActiveUsers(currentActiveUsers);
        setLoading(false);
      }
    }

    // Check connection status periodically
    const checkConnection = () => {
      if (!mountedRef.current) return;
      
      if (!websocketService.isActivityConnected()) {
        setError('Not connected to activity service');
        setLoading(false);
      } else {
        setError(null);
      }
    };

    // Check connection immediately and then periodically
    checkConnection();
    const connectionCheckInterval = setInterval(checkConnection, 5000);

    return () => {
      console.log('ActiveUsers: Cleaning up listeners');
      mountedRef.current = false;
      unsubscribeActiveUsers();
      unsubscribeActivity();
      clearInterval(connectionCheckInterval);
    };
  }, []);

  const handleVideoCall = (user) => {
    console.log('ActiveUsers: Initiating video call to:', user);
    
    if (!websocketService.isVideoCallConnected()) {
      alert('Video call service not connected. Please refresh the page.');
      return;
    }
    
    if (!onVideoCall) {
      console.error('onVideoCall callback not provided');
      return;
    }
    
    onVideoCall(user);
  };

  const handleReconnect = async () => {
    console.log('ActiveUsers: Attempting to reconnect');
    setLoading(true);
    setError(null);
    
    try {
      await websocketService.connect();
      console.log('Reconnection successful');
    } catch (error) {
      console.error('Reconnection failed:', error);
      setError('Reconnection failed. Please try again.');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white bg-opacity-10 rounded-2xl p-6 backdrop-blur-md">
        <h3 className="text-lg font-semibold text-white mb-4">Active Users</h3>
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
          <span className="ml-3 text-purple-200">Loading active users...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white bg-opacity-10 rounded-2xl p-6 backdrop-blur-md">
        <h3 className="text-lg font-semibold text-white mb-4">Active Users</h3>
        <div className="text-center py-4">
          <p className="text-red-300 mb-3">{error}</p>
          <button 
            onClick={handleReconnect}
            className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg transition text-sm"
          >
            Reconnect
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white bg-opacity-10 rounded-2xl p-6 backdrop-blur-md">
      <h3 className="text-lg font-semibold text-white mb-4">
        Active Users 
        <span className="text-sm font-normal text-purple-200 ml-2">
          ({activeUsers.length} online)
        </span>
      </h3>
      
      {activeUsers.length > 0 ? (
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {activeUsers.map((user) => (
            <div 
              key={user.id} 
              className="flex items-center justify-between bg-white bg-opacity-20 rounded-lg p-3 hover:bg-opacity-30 transition"
            >
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <div>
                  <p className="text-white font-medium">{user.username}</p>
                  <p className="text-purple-200 text-xs">Online now</p>
                </div>
              </div>
              
              <button
                onClick={() => handleVideoCall(user)}
                className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-2 rounded-lg transition text-sm font-medium flex items-center gap-2"
                title={`Video call ${user.username}`}
                disabled={!websocketService.isVideoCallConnected()}
              >
                <span>📹</span>
                <span className="hidden sm:inline">Call</span>
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="text-3xl mb-3">👥</div>
          <p className="text-purple-200">No active users right now</p>
          <p className="text-purple-300 text-sm mt-1">
            Check back later or invite friends!
          </p>
        </div>
      )}

      {/* Connection status indicator */}
      <div className="mt-4 pt-3 border-t border-white border-opacity-20">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              websocketService.isActivityConnected() ? 'bg-green-500 animate-pulse' : 'bg-red-500'
            }`}></div>
            <span className="text-purple-200">
              {websocketService.isActivityConnected() ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          
          {!websocketService.isActivityConnected() && (
            <button 
              onClick={handleReconnect}
              className="text-purple-300 hover:text-white transition underline"
            >
              Reconnect
            </button>
          )}
        </div>
      </div>
    </div>
  );
}