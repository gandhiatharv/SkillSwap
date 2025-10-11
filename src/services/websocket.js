// src/services/websocket.js
import { WS_BASE_URL } from '../config';

class WebSocketService {
  constructor() {
    this.activitySocket = null;
    this.videoCallSocket = null;
    this.listeners = {
      activity: [],
      activeUsers: [],
      incomingCall: [],
      callResponse: [],
      callEnded: [],
      webrtcSignal: [],
      callInitiated: []
    };
    this.reconnectAttempts = {
      activity: 0,
      videoCall: 0
    };
    this.maxReconnectAttempts = 3;
    this.reconnectDelay = 2000;
    this.activeUsers = new Map();
    this.isConnecting = false;
    this.connectionPromise = null;
    this.reconnectTimeouts = {
      activity: null,
      videoCall: null
    };
  }

  async connect() {
    // If already connecting, return the existing promise
    if (this.isConnecting && this.connectionPromise) {
      console.log('Already connecting, waiting for existing connection...');
      return this.connectionPromise;
    }

    // If already connected, return immediately
    if (this.isConnected()) {
      console.log('Already connected');
      return Promise.resolve();
    }

    const token = localStorage.getItem('access_token');
    if (!token) {
      console.error('No access token found');
      return Promise.reject(new Error('No access token'));
    }

    this.isConnecting = true;
    this.connectionPromise = this._connect(token);
    
    try {
      await this.connectionPromise;
      console.log('WebSocket connection completed successfully');
    } catch (error) {
      console.error('WebSocket connection failed:', error);
      throw error;
    } finally {
      this.isConnecting = false;
      this.connectionPromise = null;
    }
  }

  async _connect(token) {
    console.log('Connecting WebSocket services...');
    
    // Clear any existing reconnect timeouts
    this.clearReconnectTimeouts();
    
    // Connect both sockets with better error handling
    const results = await Promise.allSettled([
      this.connectActivitySocket(token),
      this.connectVideoCallSocket(token)
    ]);
    
    // Check results
    const activityResult = results[0];
    const videoCallResult = results[1];
    
    if (activityResult.status === 'rejected') {
      console.error('Activity socket failed:', activityResult.reason);
    }
    
    if (videoCallResult.status === 'rejected') {
      console.error('Video call socket failed:', videoCallResult.reason);
    }
    
    // At least one connection should succeed for basic functionality
    if (activityResult.status === 'rejected' && videoCallResult.status === 'rejected') {
      throw new Error('All WebSocket connections failed');
    }
    
    console.log('WebSocket connections established');
  }

  connectActivitySocket(token) {
    return new Promise((resolve, reject) => {
      // Don't create duplicate connections
      if (this.activitySocket && this.activitySocket.readyState === WebSocket.OPEN) {
        console.log('Activity socket already connected');
        resolve();
        return;
      }

      // Close existing socket if it exists
      this.closeActivitySocket();

      try {
        const wsUrl = `${WS_BASE_URL}activity/?token=${token}`;
        console.log('Connecting to activity WebSocket:', wsUrl);
        this.activitySocket = new WebSocket(wsUrl);

        const connectTimeout = setTimeout(() => {
          if (this.activitySocket && this.activitySocket.readyState !== WebSocket.OPEN) {
            console.error('Activity WebSocket connection timeout');
            this.activitySocket.close();
            reject(new Error('Activity WebSocket connection timeout'));
          }
        }, 10000);

        this.activitySocket.onopen = () => {
          console.log('Activity WebSocket connected successfully');
          clearTimeout(connectTimeout);
          this.reconnectAttempts.activity = 0;
          resolve();
        };

        this.activitySocket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('Activity message received:', data);
            
            if (data.type === 'activity_update') {
              // Update local active users map
              if (data.is_online) {
                this.activeUsers.set(data.user_id, {
                  id: data.user_id,
                  username: data.username
                });
              } else {
                this.activeUsers.delete(data.user_id);
              }
              
              // Broadcast activity updates
              this.listeners.activity.forEach(callback => 
                callback(data.user_id, data.is_online, data.username)
              );
              
              // Broadcast updated active users list
              this.listeners.activeUsers.forEach(callback => 
                callback(Array.from(this.activeUsers.values()))
              );
              
            } else if (data.type === 'active_users_list') {
              // Initial list of active users when connecting
              console.log('Received active users list:', data.active_users);
              this.activeUsers.clear();
              (data.active_users || []).forEach(user => {
                this.activeUsers.set(user.id, user);
              });
              
              // Broadcast to active users listeners
              this.listeners.activeUsers.forEach(callback => 
                callback(Array.from(this.activeUsers.values()))
              );
            }
          } catch (error) {
            console.error('Error parsing activity message:', error);
          }
        };

        this.activitySocket.onclose = (event) => {
          console.log('Activity WebSocket closed:', event.code, event.reason);
          clearTimeout(connectTimeout);
          
          // Only attempt reconnect if it wasn't a normal closure and we haven't exceeded attempts
          if (event.code !== 1000 && this.reconnectAttempts.activity < this.maxReconnectAttempts) {
            this.scheduleReconnect('activity', token);
          } else if (this.reconnectAttempts.activity >= this.maxReconnectAttempts) {
            console.error('Max reconnection attempts reached for activity socket');
          }
        };

        this.activitySocket.onerror = (error) => {
          console.error('Activity WebSocket error:', error);
          clearTimeout(connectTimeout);
          reject(new Error('Activity WebSocket connection failed'));
        };

      } catch (error) {
        console.error('Error creating activity WebSocket:', error);
        reject(error);
      }
    });
  }

  connectVideoCallSocket(token) {
    return new Promise((resolve, reject) => {
      // Don't create duplicate connections
      if (this.videoCallSocket && this.videoCallSocket.readyState === WebSocket.OPEN) {
        console.log('Video call socket already connected');
        resolve();
        return;
      }

      // Close existing socket if it exists
      this.closeVideoCallSocket();

      try {
        const wsUrl = `${WS_BASE_URL}video-call/?token=${token}`;
        console.log('Connecting to video call WebSocket:', wsUrl);
        this.videoCallSocket = new WebSocket(wsUrl);

        const connectTimeout = setTimeout(() => {
          if (this.videoCallSocket && this.videoCallSocket.readyState !== WebSocket.OPEN) {
            console.error('Video call WebSocket connection timeout');
            this.videoCallSocket.close();
            reject(new Error('Video call WebSocket connection timeout'));
          }
        }, 10000);

        this.videoCallSocket.onopen = () => {
          console.log('Video call WebSocket connected successfully');
          clearTimeout(connectTimeout);
          this.reconnectAttempts.videoCall = 0;
          resolve();
        };

        this.videoCallSocket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('Video call message received:', data);
            this.handleVideoCallMessage(data);
          } catch (error) {
            console.error('Error parsing video call message:', error);
          }
        };

        this.videoCallSocket.onclose = (event) => {
          console.log('Video call WebSocket closed:', event.code, event.reason);
          clearTimeout(connectTimeout);
          
          // Only attempt reconnect if it wasn't a normal closure and we haven't exceeded attempts
          if (event.code !== 1000 && this.reconnectAttempts.videoCall < this.maxReconnectAttempts) {
            this.scheduleReconnect('videoCall', token);
          } else if (this.reconnectAttempts.videoCall >= this.maxReconnectAttempts) {
            console.error('Max reconnection attempts reached for video call socket');
          }
        };

        this.videoCallSocket.onerror = (error) => {
          console.error('Video call WebSocket error:', error);
          clearTimeout(connectTimeout);
          reject(new Error('Video call WebSocket connection failed'));
        };

      } catch (error) {
        console.error('Error creating video call WebSocket:', error);
        reject(error);
      }
    });
  }

  scheduleReconnect(socketType, token) {
    // Clear any existing timeout
    if (this.reconnectTimeouts[socketType]) {
      clearTimeout(this.reconnectTimeouts[socketType]);
    }

    this.reconnectAttempts[socketType]++;
    console.log(`Scheduling reconnect for ${socketType} socket (attempt ${this.reconnectAttempts[socketType]})`);
    
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts[socketType] - 1);
    
    this.reconnectTimeouts[socketType] = setTimeout(async () => {
      try {
        if (socketType === 'activity') {
          await this.connectActivitySocket(token);
        } else if (socketType === 'videoCall') {
          await this.connectVideoCallSocket(token);
        }
      } catch (error) {
        console.error(`Reconnection failed for ${socketType}:`, error);
      }
    }, delay);
  }

  clearReconnectTimeouts() {
    Object.values(this.reconnectTimeouts).forEach(timeout => {
      if (timeout) {
        clearTimeout(timeout);
      }
    });
    this.reconnectTimeouts = {
      activity: null,
      videoCall: null
    };
  }

  closeActivitySocket() {
    if (this.activitySocket) {
      try {
        this.activitySocket.close(1000, 'Closing existing connection');
      } catch (error) {
        console.warn('Error closing activity socket:', error);
      }
      this.activitySocket = null;
    }
  }

  closeVideoCallSocket() {
    if (this.videoCallSocket) {
      try {
        this.videoCallSocket.close(1000, 'Closing existing connection');
      } catch (error) {
        console.warn('Error closing video call socket:', error);
      }
      this.videoCallSocket = null;
    }
  }

  handleVideoCallMessage(data) {
    switch (data.type) {
      case 'incoming_call':
        console.log('Incoming call received:', data);
        this.listeners.incomingCall.forEach(callback => callback(data));
        break;
      case 'call_response':
        console.log('Call response received:', data);
        this.listeners.callResponse.forEach(callback => callback(data));
        break;
      case 'call_initiated':
        console.log('Call initiated confirmation:', data);
        this.listeners.callInitiated.forEach(callback => callback(data));
        break;
      case 'call_ended':
        console.log('Call ended:', data);
        this.listeners.callEnded.forEach(callback => callback(data));
        break;
      case 'webrtc_signal':
        console.log('WebRTC signal received:', data);
        this.listeners.webrtcSignal.forEach(callback => callback(data));
        break;
      case 'error':
        console.error('WebSocket error:', data.message);
        break;
      default:
        console.log('Unknown video call message type:', data.type);
    }
  }

  // Activity listeners
  onUserActivity(callback) {
    this.listeners.activity.push(callback);
    return () => {
      this.listeners.activity = this.listeners.activity.filter(cb => cb !== callback);
    };
  }

  onActiveUsers(callback) {
    this.listeners.activeUsers.push(callback);
    // Immediately call with current active users if available
    if (this.activeUsers.size > 0) {
      callback(Array.from(this.activeUsers.values()));
    }
    return () => {
      this.listeners.activeUsers = this.listeners.activeUsers.filter(cb => cb !== callback);
    };
  }

  // Video call listeners
  onIncomingCall(callback) {
    this.listeners.incomingCall.push(callback);
    return () => {
      this.listeners.incomingCall = this.listeners.incomingCall.filter(cb => cb !== callback);
    };
  }

  onCallInitiated(callback) {
    this.listeners.callInitiated.push(callback);
    return () => {
      this.listeners.callInitiated = this.listeners.callInitiated.filter(cb => cb !== callback);
    };
  }

  onCallResponse(callback) {
    this.listeners.callResponse.push(callback);
    return () => {
      this.listeners.callResponse = this.listeners.callResponse.filter(cb => cb !== callback);
    };
  }

  onCallEnded(callback) {
    this.listeners.callEnded.push(callback);
    return () => {
      this.listeners.callEnded = this.listeners.callEnded.filter(cb => cb !== callback);
    };
  }

  onWebRTCSignal(callback) {
    this.listeners.webrtcSignal.push(callback);
    return () => {
      this.listeners.webrtcSignal = this.listeners.webrtcSignal.filter(cb => cb !== callback);
    };
  }

  // Video call actions with enhanced error handling
  initiateCall(receiverId) {
    console.log('Initiating call to user:', receiverId);
    
    if (!this.isVideoCallConnected()) {
      console.error('Video call socket not connected');
      return false;
    }

    try {
      this.videoCallSocket.send(JSON.stringify({
        type: 'call_initiate',
        receiver_id: receiverId
      }));
      console.log('Call initiation sent successfully');
      return true;
    } catch (error) {
      console.error('Failed to send call initiation:', error);
      return false;
    }
  }

  respondToCall(callId, accepted) {
    console.log('Responding to call:', callId, 'accepted:', accepted);
    
    if (!this.isVideoCallConnected()) {
      console.error('Video call socket not connected');
      return false;
    }

    try {
      this.videoCallSocket.send(JSON.stringify({
        type: 'call_response',
        call_id: callId,
        accepted: accepted
      }));
      return true;
    } catch (error) {
      console.error('Failed to send call response:', error);
      return false;
    }
  }

  sendWebRTCSignal(targetUserId, signalData) {
    if (!this.isVideoCallConnected()) {
      console.error('Video call socket not connected');
      return false;
    }

    try {
      this.videoCallSocket.send(JSON.stringify({
        type: 'webrtc_signal',
        target_user_id: targetUserId,
        signal_data: signalData
      }));
      return true;
    } catch (error) {
      console.error('Failed to send WebRTC signal:', error);
      return false;
    }
  }

  endCall(callId, targetUserId) {
    console.log('Ending call:', callId);
    
    if (!this.isVideoCallConnected()) {
      console.error('Video call socket not connected');
      return false;
    }

    try {
      this.videoCallSocket.send(JSON.stringify({
        type: 'call_end',
        call_id: callId,
        target_user_id: targetUserId
      }));
      return true;
    } catch (error) {
      console.error('Failed to send call end:', error);
      return false;
    }
  }

  // Utility methods
  getActiveUsers() {
    return Array.from(this.activeUsers.values());
  }

  isUserActive(userId) {
    return this.activeUsers.has(userId);
  }

  disconnect() {
    console.log('Disconnecting WebSocket service');
    
    // Clear reconnect timeouts
    this.clearReconnectTimeouts();
    
    // Close sockets
    this.closeActivitySocket();
    this.closeVideoCallSocket();
    
    // Clear all listeners
    Object.keys(this.listeners).forEach(key => {
      this.listeners[key] = [];
    });
    
    // Clear active users
    this.activeUsers.clear();
    
    // Reset state
    this.isConnecting = false;
    this.connectionPromise = null;
    this.reconnectAttempts = {
      activity: 0,
      videoCall: 0
    };
  }

  isConnected() {
    return this.isActivityConnected() && this.isVideoCallConnected();
  }

  isActivityConnected() {
    return this.activitySocket && this.activitySocket.readyState === WebSocket.OPEN;
  }

  isVideoCallConnected() {
    return this.videoCallSocket && this.videoCallSocket.readyState === WebSocket.OPEN;
  }

  // Get connection status for debugging
  getConnectionStatus() {
    return {
      activity: {
        connected: this.isActivityConnected(),
        readyState: this.activitySocket ? this.activitySocket.readyState : 'null',
        reconnectAttempts: this.reconnectAttempts.activity
      },
      videoCall: {
        connected: this.isVideoCallConnected(),
        readyState: this.videoCallSocket ? this.videoCallSocket.readyState : 'null',
        reconnectAttempts: this.reconnectAttempts.videoCall
      },
      activeUsersCount: this.activeUsers.size,
      isConnecting: this.isConnecting
    };
  }
}

const websocketService = new WebSocketService();
export default websocketService;