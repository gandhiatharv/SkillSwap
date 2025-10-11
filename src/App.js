import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Skills from "./pages/Skills";
import Messages from "./pages/Messages";
import Chat from "./pages/Chat";
import Contact from "./pages/Contact";
import PrivateRoute from "./components/PrivateRoute";
import Navbar from "./components/Navbar";
import VideoCall from "./components/VideoCall";
import IncomingCall from "./components/IncomingCall";
import useVideoCall from "./hooks/useVideoCall";
import './styles/App.css';
import './styles/index.css';

export default function App() {
  const {
    currentCall,
    incomingCall,
    isVideoCallOpen,
    acceptCall,
    declineCall,
    endCall
  } = useVideoCall();

  return (
    <div>
      {/* Navigation Bar - Only shows when authenticated */}
      <Navbar />

      {/* Routing */}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        
        {/* Protected Routes */}
        <Route
          path="/home"
          element={
            <PrivateRoute>
              <Home />
            </PrivateRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/skills"
          element={
            <PrivateRoute>
              <Skills />
            </PrivateRoute>
          }
        />
        <Route
          path="/messages"
          element={
            <PrivateRoute>
              <Messages />
            </PrivateRoute>
          }
        />
        <Route
          path="/messages/:conversationId"
          element={
            <PrivateRoute>
              <Chat />
            </PrivateRoute>
          }
        />
        <Route
          path="/contact"
          element={
            <PrivateRoute>
              <Contact />
            </PrivateRoute>
          }
        />
      </Routes>

      {/* Video Call Components */}
      {incomingCall && (
        <IncomingCall
          isVisible={!!incomingCall}
          callerUsername={incomingCall.callerUsername}
          onAccept={acceptCall}
          onDecline={declineCall}
        />
      )}

      {currentCall && (
        <VideoCall
          isOpen={isVideoCallOpen}
          onClose={endCall}
          callId={currentCall.callId}
          isInitiator={currentCall.isInitiator}
          remoteUserId={currentCall.remoteUserId}
          remoteUsername={currentCall.remoteUsername}
        />
      )}
    </div>
  );
}