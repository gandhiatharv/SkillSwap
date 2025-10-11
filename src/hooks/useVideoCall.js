import { useState, useEffect, useCallback, useRef } from 'react';
import websocketService from '../services/websocket';

export default function useVideoCall() {
  const [currentCall, setCurrentCall] = useState(null);
  const [isVideoCallOpen, setIsVideoCallOpen] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);
  
  // Track if we're cleaning up to prevent state updates during cleanup
  const isCleaningUp = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    console.log('useVideoCall: Setting up listeners');
    mountedRef.current = true;

    // Listen for call initiation confirmation
    const unsubscribeInitiated = websocketService.onCallInitiated((data) => {
      console.log('useVideoCall: Call initiated confirmation:', data);
      if (mountedRef.current && currentCall && !isCleaningUp.current) {
        setCurrentCall(prev => ({
          ...prev,
          id: data.call_id,
          status: 'waiting_for_response'
        }));
      }
    });

    // Listen for call responses when we initiate calls
    const unsubscribeResponse = websocketService.onCallResponse((data) => {
      console.log('useVideoCall: Call response:', data);
      if (mountedRef.current && !isCleaningUp.current && currentCall && data.call_id === currentCall.id) {
        if (data.accepted) {
          console.log('useVideoCall: Call accepted, opening video interface');
          setCurrentCall(prev => ({
            ...prev,
            status: 'accepted'
          }));
          setIsVideoCallOpen(true);
        } else {
          console.log('useVideoCall: Call declined');
          alert(`${data.responder_username} declined your call`);
          cleanupCall();
        }
      }
    });

    // Listen for incoming calls
    const unsubscribeIncoming = websocketService.onIncomingCall((callData) => {
      console.log('useVideoCall: Incoming call:', callData);
      if (mountedRef.current && !isCleaningUp.current) {
        // Only accept incoming calls if we're not already in a call
        if (!currentCall && !isVideoCallOpen) {
          setIncomingCall(callData);
        } else {
          // Automatically decline if already in a call
          console.log('Already in a call, auto-declining incoming call');
          if (websocketService.isVideoCallConnected()) {
            websocketService.respondToCall(callData.call_id, false);
          }
        }
      }
    });

    // Listen for call ended
    const unsubscribeEnded = websocketService.onCallEnded((data) => {
      console.log('useVideoCall: Call ended by remote user');
      if (mountedRef.current && !isCleaningUp.current) {
        cleanupCall();
      }
    });

    return () => {
      console.log('useVideoCall: Cleaning up listeners');
      mountedRef.current = false;
      unsubscribeInitiated();
      unsubscribeResponse();
      unsubscribeIncoming();
      unsubscribeEnded();
    };
  }, [currentCall]); // Dependencies carefully managed to prevent infinite loops

  const cleanupCall = useCallback(() => {
    if (isCleaningUp.current) return;
    isCleaningUp.current = true;
    
    console.log('useVideoCall: Cleaning up call state');
    
    setCurrentCall(null);
    setIsVideoCallOpen(false);
    setIncomingCall(null);
    
    // Reset cleanup flag after a short delay
    setTimeout(() => {
      if (mountedRef.current) {
        isCleaningUp.current = false;
      }
    }, 100);
  }, []);

  const initiateCall = useCallback(async (user) => {
    console.log('useVideoCall: Initiating call to:', user);
    
    // Prevent multiple simultaneous calls
    if (isCleaningUp.current || currentCall || isVideoCallOpen) {
      console.warn('Already in a call or cleaning up');
      alert('You are already in a call');
      return;
    }

    // Validate user object
    if (!user || !user.id) {
      console.error('Invalid user object:', user);
      alert('Invalid user selected');
      return;
    }

    try {
      // Ensure WebSocket connection
      if (!websocketService.isVideoCallConnected()) {
        console.log('Video call WebSocket not connected, attempting to connect...');
        await websocketService.connect();
        
        // Wait for connection to stabilize
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        if (!websocketService.isVideoCallConnected()) {
          throw new Error('Failed to establish video call connection');
        }
      }

      console.log('useVideoCall: Sending call initiation...');
      const success = websocketService.initiateCall(user.id);
      
      if (success) {
        console.log('useVideoCall: Call initiation sent successfully');
        setCurrentCall({
          id: null, // Will be set when we get confirmation
          isInitiator: true,
          remoteUserId: user.id,
          remoteUsername: user.username,
          status: 'initiating'
        });
      } else {
        throw new Error('Failed to send call initiation');
      }
    } catch (error) {
      console.error('useVideoCall: Call initiation failed:', error);
      alert('Failed to initiate call. Please check your connection and try again.');
      cleanupCall();
    }
  }, [currentCall, isVideoCallOpen, cleanupCall]);

  const acceptIncomingCall = useCallback(async (callData) => {
    console.log('useVideoCall: Accepting incoming call:', callData);
    
    if (isCleaningUp.current) {
      console.log('Ignoring accept - currently cleaning up');
      return;
    }
    
    try {
      // Ensure WebSocket connection
      if (!websocketService.isVideoCallConnected()) {
        console.log('Video call WebSocket not connected, attempting to connect...');
        await websocketService.connect();
        
        // Wait for connection to stabilize
        await new Promise(resolve => setTimeout(resolve, 500));
        
        if (!websocketService.isVideoCallConnected()) {
          throw new Error('Connection error. Cannot accept call.');
        }
      }

      // Send acceptance via WebSocket
      const success = websocketService.respondToCall(callData.call_id, true);
      
      if (success) {
        setCurrentCall({
          id: callData.call_id,
          isInitiator: false,
          remoteUserId: callData.caller_id,
          remoteUsername: callData.caller_username,
          status: 'accepted'
        });
        setIncomingCall(null);
        setIsVideoCallOpen(true);
      } else {
        throw new Error('Failed to send call acceptance');
      }
    } catch (error) {
      console.error('Failed to accept call:', error);
      alert(error.message || 'Failed to accept call. Connection error.');
      setIncomingCall(null);
    }
  }, []);

  const declineIncomingCall = useCallback((callData) => {
    console.log('useVideoCall: Declining incoming call');
    
    if (callData && websocketService.isVideoCallConnected()) {
      websocketService.respondToCall(callData.call_id, false);
    }
    
    setIncomingCall(null);
  }, []);

  const endCall = useCallback(() => {
    console.log('useVideoCall: Ending call');
    
    if (currentCall && websocketService.isVideoCallConnected()) {
      websocketService.endCall(currentCall.id, currentCall.remoteUserId);
    }
    
    cleanupCall();
  }, [currentCall, cleanupCall]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('useVideoCall: Component unmounting, cleaning up');
      mountedRef.current = false;
      if (currentCall && websocketService.isVideoCallConnected()) {
        websocketService.endCall(currentCall.id, currentCall.remoteUserId);
      }
    };
  }, []); // Run only on unmount

  return {
    currentCall,
    isVideoCallOpen,
    incomingCall,
    initiateCall,
    acceptIncomingCall,
    declineIncomingCall,
    endCall
  };
}