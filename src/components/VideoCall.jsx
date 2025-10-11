import { useState, useEffect, useRef } from "react";
import websocketService from '../services/websocket';

// Enhanced WebRTC implementation
class SimplePeer {
  constructor(options = {}) {
    this.isInitiator = options.initiator || false;
    this.stream = options.stream || null;
    this.destroyed = false;
    this.connected = false;
    
    // Create RTCPeerConnection with better STUN/TURN configuration
    this.pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' }
      ],
      iceCandidatePoolSize: 10
    });
    
    this.onSignalCallback = null;
    this.onStreamCallback = null;
    this.onErrorCallback = null;
    this.onConnectCallback = null;
    
    this.pendingCandidates = [];
    this.isSettingRemoteDescription = false;
    this.remoteDescriptionSet = false;
    
    this.setupPeerConnection();
  }

  setupPeerConnection() {
    if (this.destroyed) return;

    console.log('[SimplePeer] Setting up peer connection, isInitiator:', this.isInitiator);

    // Add local stream tracks
    if (this.stream) {
      this.stream.getTracks().forEach(track => {
        try {
          this.pc.addTrack(track, this.stream);
          console.log('[SimplePeer] Added track:', track.kind, 'enabled:', track.enabled);
        } catch (error) {
          console.error('[SimplePeer] Error adding track:', error);
        }
      });
    }

    // Handle ICE candidates
    this.pc.onicecandidate = (event) => {
      if (this.destroyed) return;
      
      if (event.candidate) {
        console.log('[SimplePeer] Generated ICE candidate:', event.candidate.type);
        if (this.onSignalCallback) {
          this.onSignalCallback({
            type: 'ice-candidate',
            candidate: event.candidate
          });
        }
      } else {
        console.log('[SimplePeer] ICE gathering complete');
      }
    };

    // Handle remote stream
    this.pc.ontrack = (event) => {
      if (this.destroyed) return;
      
      console.log('[SimplePeer] Received remote track:', event.track.kind, 'streams:', event.streams.length);
      if (this.onStreamCallback && event.streams[0]) {
        console.log('[SimplePeer] Forwarding stream to callback');
        this.onStreamCallback(event.streams[0]);
      }
    };

    // Handle ICE connection state
    this.pc.oniceconnectionstatechange = () => {
      if (this.destroyed) return;
      
      console.log('[SimplePeer] ICE connection state:', this.pc.iceConnectionState);
      
      switch (this.pc.iceConnectionState) {
        case 'connected':
        case 'completed':
          if (!this.connected) {
            this.connected = true;
            console.log('[SimplePeer] Connection established!');
            if (this.onConnectCallback) {
              this.onConnectCallback();
            }
          }
          break;
        case 'failed':
          console.error('[SimplePeer] ICE connection failed');
          if (this.onErrorCallback) {
            this.onErrorCallback(new Error('ICE connection failed'));
          }
          break;
        case 'disconnected':
          if (this.connected) {
            console.warn('[SimplePeer] ICE connection disconnected');
          }
          break;
        case 'closed':
          this.connected = false;
          break;
      }
    };

    // Handle connection state
    this.pc.onconnectionstatechange = () => {
      if (this.destroyed) return;
      console.log('[SimplePeer] Connection state:', this.pc.connectionState);
    };

    // Start negotiation if initiator
    if (this.isInitiator) {
      setTimeout(() => {
        if (!this.destroyed) {
          this.createOffer();
        }
      }, 100);
    }
  }

  async createOffer() {
    if (this.destroyed) return;
    
    try {
      console.log('[SimplePeer] Creating offer...');
      const offer = await this.pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      
      if (this.destroyed) return;
      
      await this.pc.setLocalDescription(offer);
      console.log('[SimplePeer] Local description set (offer)');
      
      if (this.onSignalCallback) {
        this.onSignalCallback({
          type: 'offer',
          offer: this.pc.localDescription
        });
      }
    } catch (error) {
      console.error('[SimplePeer] Error creating offer:', error);
      if (this.onErrorCallback) {
        this.onErrorCallback(error);
      }
    }
  }

  async createAnswer() {
    if (this.destroyed) return;
    
    try {
      console.log('[SimplePeer] Creating answer...');
      const answer = await this.pc.createAnswer();
      
      if (this.destroyed) return;
      
      await this.pc.setLocalDescription(answer);
      console.log('[SimplePeer] Local description set (answer)');
      
      if (this.onSignalCallback) {
        this.onSignalCallback({
          type: 'answer',
          answer: this.pc.localDescription
        });
      }
    } catch (error) {
      console.error('[SimplePeer] Error creating answer:', error);
      if (this.onErrorCallback) {
        this.onErrorCallback(error);
      }
    }
  }

  async signal(data) {
    if (this.destroyed) return;
    
    try {
      console.log('[SimplePeer] Processing signal:', data.type);
      
      if (data.type === 'offer') {
        if (this.pc.signalingState !== 'stable' && this.pc.signalingState !== 'have-local-offer') {
          console.warn('[SimplePeer] Ignoring offer - wrong signaling state:', this.pc.signalingState);
          return;
        }
        
        this.isSettingRemoteDescription = true;
        await this.pc.setRemoteDescription(new RTCSessionDescription(data.offer));
        this.remoteDescriptionSet = true;
        this.isSettingRemoteDescription = false;
        console.log('[SimplePeer] Remote description set (offer)');
        
        await this.processPendingCandidates();
        await this.createAnswer();
        
      } else if (data.type === 'answer') {
        if (this.pc.signalingState !== 'have-local-offer') {
          console.warn('[SimplePeer] Ignoring answer - wrong signaling state:', this.pc.signalingState);
          return;
        }
        
        this.isSettingRemoteDescription = true;
        await this.pc.setRemoteDescription(new RTCSessionDescription(data.answer));
        this.remoteDescriptionSet = true;
        this.isSettingRemoteDescription = false;
        console.log('[SimplePeer] Remote description set (answer)');
        
        await this.processPendingCandidates();
        
      } else if (data.type === 'ice-candidate') {
        await this.handleIceCandidate(data.candidate);
      }
      
    } catch (error) {
      console.error('[SimplePeer] Error handling signal:', error);
      this.isSettingRemoteDescription = false;
      if (this.onErrorCallback) {
        this.onErrorCallback(error);
      }
    }
  }

  async handleIceCandidate(candidate) {
    if (this.destroyed) return;
    
    // Queue candidates if remote description not set
    if (!this.remoteDescriptionSet || this.isSettingRemoteDescription) {
      console.log('[SimplePeer] Queueing ICE candidate (remote description not ready)');
      this.pendingCandidates.push(candidate);
      return;
    }
    
    try {
      await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
      console.log('[SimplePeer] Added ICE candidate');
    } catch (error) {
      if (!this.connected) {
        console.error('[SimplePeer] Error adding ICE candidate:', error);
      }
    }
  }

  async processPendingCandidates() {
    if (this.destroyed || this.pendingCandidates.length === 0) return;
    
    console.log(`[SimplePeer] Processing ${this.pendingCandidates.length} pending candidates`);
    
    for (const candidate of this.pendingCandidates) {
      try {
        await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
        console.log('[SimplePeer] Added queued candidate');
      } catch (error) {
        console.warn('[SimplePeer] Error adding queued candidate:', error);
      }
    }
    
    this.pendingCandidates = [];
  }

  on(event, callback) {
    if (event === 'signal') {
      this.onSignalCallback = callback;
    } else if (event === 'stream') {
      this.onStreamCallback = callback;
    } else if (event === 'error') {
      this.onErrorCallback = callback;
    } else if (event === 'connect') {
      this.onConnectCallback = callback;
    }
  }

  destroy() {
    if (this.destroyed) return;
    
    console.log('[SimplePeer] Destroying peer connection');
    this.destroyed = true;
    this.connected = false;
    this.pendingCandidates = [];
    
    if (this.pc) {
      try {
        this.pc.close();
      } catch (error) {
        console.warn('[SimplePeer] Error closing peer connection:', error);
      }
    }
    
    this.onSignalCallback = null;
    this.onStreamCallback = null;
    this.onErrorCallback = null;
    this.onConnectCallback = null;
  }
}

export default function VideoCall({ 
  isOpen, 
  onClose, 
  callId, 
  isInitiator, 
  remoteUserId, 
  remoteUsername 
}) {
  const [stream, setStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [peer, setPeer] = useState(null);
  const [callStatus, setCallStatus] = useState(isInitiator ? 'calling' : 'connecting');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [error, setError] = useState(null);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const callStartTime = useRef(null);
  const durationInterval = useRef(null);
  const cleanupExecuted = useRef(false);

  useEffect(() => {
    if (isOpen) {
      console.log('[VideoCall] Component opened, initializing...');
      cleanupExecuted.current = false;
      initializeCall();
    }

    return () => {
      if (!cleanupExecuted.current) {
        console.log('[VideoCall] Component unmounting, cleaning up...');
        cleanup();
      }
    };
  }, [isOpen]);

  useEffect(() => {
    if (!peer || !isOpen) return;

    const handleWebRTCSignal = (data) => {
      console.log('[VideoCall] Received WebRTC signal:', data.type, 'from:', data.from_user_id);
      if (data.from_user_id === remoteUserId && peer && !peer.destroyed) {
        peer.signal(data.signal_data);
      }
    };

    const handleCallEnded = (data) => {
      console.log('[VideoCall] Call ended by remote user');
      setCallStatus('ended');
      setTimeout(() => {
        cleanup();
        onClose();
      }, 2000);
    };

    const handleCallResponse = (data) => {
      console.log('[VideoCall] Call response received:', data);
      if (data.call_id === callId) {
        if (data.accepted) {
          setCallStatus('connecting');
        } else {
          setCallStatus('declined');
          setTimeout(() => {
            cleanup();
            onClose();
          }, 2000);
        }
      }
    };

    const unsubscribeSignal = websocketService.onWebRTCSignal(handleWebRTCSignal);
    const unsubscribeEnded = websocketService.onCallEnded(handleCallEnded);
    let unsubscribeResponse = null;
    
    if (isInitiator) {
      unsubscribeResponse = websocketService.onCallResponse(handleCallResponse);
    }

    return () => {
      unsubscribeSignal();
      unsubscribeEnded();
      if (unsubscribeResponse) unsubscribeResponse();
    };
  }, [peer, remoteUserId, onClose, callId, isInitiator, isOpen]);

  const initializeCall = async () => {
    try {
      console.log('[VideoCall] Requesting media permissions...');
      setCallStatus('requesting_media');
      setError(null);
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      console.log('[VideoCall] Media stream obtained');
      console.log('[VideoCall] Video tracks:', mediaStream.getVideoTracks().map(t => `${t.kind}: ${t.label} (enabled: ${t.enabled})`));
      console.log('[VideoCall] Audio tracks:', mediaStream.getAudioTracks().map(t => `${t.kind}: ${t.label} (enabled: ${t.enabled})`));
      
      setStream(mediaStream);
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = mediaStream;
        await localVideoRef.current.play();
      }

      console.log('[VideoCall] Creating peer connection, isInitiator:', isInitiator);
      const newPeer = new SimplePeer({
        initiator: isInitiator,
        stream: mediaStream
      });

      newPeer.on('signal', (signal) => {
        console.log('[VideoCall] Sending WebRTC signal:', signal.type);
        if (websocketService.isVideoCallConnected()) {
          websocketService.sendWebRTCSignal(remoteUserId, signal);
        } else {
          console.error('[VideoCall] WebSocket not connected for signaling');
          setError('Connection lost during call setup');
        }
      });

      newPeer.on('stream', (remoteStream) => {
        console.log('[VideoCall] Received remote stream');
        console.log('[VideoCall] Remote video tracks:', remoteStream.getVideoTracks().length);
        console.log('[VideoCall] Remote audio tracks:', remoteStream.getAudioTracks().length);
        
        setRemoteStream(remoteStream);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
          remoteVideoRef.current.play().catch(e => console.error('[VideoCall] Error playing remote video:', e));
        }
      });

      newPeer.on('connect', () => {
        console.log('[VideoCall] Peer connection established');
        setCallStatus('connected');
        callStartTime.current = Date.now();
        startDurationTimer();
      });

      newPeer.on('error', (err) => {
        console.error('[VideoCall] Peer error:', err);
        setError(err.message);
        setCallStatus('error');
      });

      setPeer(newPeer);
      setCallStatus(isInitiator ? 'calling' : 'connecting');

    } catch (error) {
      console.error('[VideoCall] Error accessing media devices:', error);
      setError(`Media access failed: ${error.message}`);
      setCallStatus('error');
    }
  };

  const startDurationTimer = () => {
    if (durationInterval.current) {
      clearInterval(durationInterval.current);
    }
    
    durationInterval.current = setInterval(() => {
      if (callStartTime.current) {
        const duration = Math.floor((Date.now() - callStartTime.current) / 1000);
        setCallDuration(duration);
      }
    }, 1000);
  };

  const cleanup = () => {
    if (cleanupExecuted.current) return;
    cleanupExecuted.current = true;
    
    console.log('[VideoCall] Cleaning up resources...');
    
    if (durationInterval.current) {
      clearInterval(durationInterval.current);
      durationInterval.current = null;
    }
    
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
        console.log('[VideoCall] Stopped track:', track.kind);
      });
      setStream(null);
    }
    
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    
    if (peer) {
      peer.destroy();
      setPeer(null);
    }

    setRemoteStream(null);
    setCallDuration(0);
    setError(null);
    callStartTime.current = null;
  };

  const endCall = () => {
    console.log('[VideoCall] Ending call manually...');
    
    if (callId && remoteUserId && websocketService.isVideoCallConnected()) {
      websocketService.endCall(callId, remoteUserId);
    }
    
    setCallStatus('ended');
    cleanup();
    onClose();
  };

  const toggleMute = () => {
    if (stream) {
      const audioTracks = stream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = isMuted;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (stream) {
      const videoTracks = stream.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = isVideoOff;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg w-full h-full max-w-6xl max-h-[90vh] relative">
        
        {/* Header */}
        <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-center text-white">
          <div>
            <h3 className="text-lg font-semibold">{remoteUsername}</h3>
            <p className="text-sm text-gray-300">
              {callStatus === 'requesting_media' && 'Requesting camera access...'}
              {callStatus === 'calling' && 'Calling...'}
              {callStatus === 'connecting' && 'Connecting...'}
              {callStatus === 'connected' && formatDuration(callDuration)}
              {callStatus === 'ended' && 'Call ended'}
              {callStatus === 'declined' && 'Call declined'}
              {callStatus === 'error' && (error || 'Connection error')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl w-10 h-10 flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        {/* Video containers */}
        <div className="relative w-full h-full flex items-center justify-center">
          
          {/* Remote video (main) */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="max-w-full max-h-full object-contain bg-gray-800"
          />
          
          {/* Local video (picture-in-picture) */}
          <div className="absolute bottom-24 right-4 w-64 h-48 bg-gray-800 rounded-lg overflow-hidden border-2 border-purple-500 shadow-2xl">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          </div>

          {/* Call status overlay */}
          {callStatus !== 'connected' && (
            <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center">
              <div className="text-white text-center">
                <div className="mb-4">
                  {callStatus === 'requesting_media' && (
                    <div>
                      <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-xl">Requesting camera access...</p>
                      <p className="text-sm text-gray-300 mt-2">Please allow camera and microphone access</p>
                    </div>
                  )}
                  {callStatus === 'calling' && (
                    <div className="animate-pulse">
                      <div className="w-16 h-16 bg-purple-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                        <span className="text-2xl">📞</span>
                      </div>
                      <p className="text-xl">Calling {remoteUsername}...</p>
                    </div>
                  )}
                  {callStatus === 'connecting' && (
                    <div>
                      <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-xl">Connecting...</p>
                      <p className="text-sm text-gray-300 mt-2">Setting up video call...</p>
                    </div>
                  )}
                  {callStatus === 'declined' && (
                    <div>
                      <div className="text-red-500 text-4xl mb-4">📞</div>
                      <p className="text-xl">Call declined</p>
                    </div>
                  )}
                  {callStatus === 'error' && (
                    <div>
                      <div className="text-red-500 text-4xl mb-4">⚠️</div>
                      <p className="text-xl">Connection failed</p>
                      {error && <p className="text-sm text-gray-300 mt-2">{error}</p>}
                    </div>
                  )}
                  {callStatus === 'ended' && (
                    <div>
                      <div className="text-gray-500 text-4xl mb-4">📞</div>
                      <p className="text-xl">Call ended</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-4">
          <button
            onClick={toggleMute}
            disabled={callStatus !== 'connected'}
            className={`w-14 h-14 rounded-full flex items-center justify-center text-xl transition ${
              callStatus !== 'connected' 
                ? 'bg-gray-600 cursor-not-allowed' 
                : isMuted 
                  ? 'bg-red-600 hover:bg-red-700' 
                  : 'bg-gray-700 hover:bg-gray-600'
            } text-white shadow-lg`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? '🔇' : '🎤'}
          </button>
          
          <button
            onClick={toggleVideo}
            disabled={callStatus !== 'connected'}
            className={`w-14 h-14 rounded-full flex items-center justify-center text-xl transition ${
              callStatus !== 'connected' 
                ? 'bg-gray-600 cursor-not-allowed' 
                : isVideoOff 
                  ? 'bg-red-600 hover:bg-red-700' 
                  : 'bg-gray-700 hover:bg-gray-600'
            } text-white shadow-lg`}
            title={isVideoOff ? 'Turn on video' : 'Turn off video'}
          >
            {isVideoOff ? '📹' : '📺'}
          </button>
          
          <button
            onClick={endCall}
            className="w-14 h-14 rounded-full bg-red-600 text-white flex items-center justify-center hover:bg-red-700 transition text-xl shadow-lg"
            title="End call"
          >
            📞
          </button>
        </div>
      </div>
    </div>
  );
}