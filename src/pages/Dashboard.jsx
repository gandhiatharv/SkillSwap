import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getMatches, getCurrentUser, logoutUser, startConversationFromMatch } from "../auth";
import websocketService from "../services/websocket";
import useVideoCall from "../hooks/useVideoCall";
import VideoCall from "../components/VideoCall";
import IncomingCall from "../components/IncomingCall";
import ActiveUsers from "../components/ActiveUsers";

const inspiringQuotes = [
  "The beautiful thing about learning is that no one can take it away from you. - B.B. King",
  "Live as if you were to die tomorrow. Learn as if you were to live forever. - Mahatma Gandhi",
  "Education is the most powerful weapon which you can use to change the world. - Nelson Mandela",
  "The capacity to learn is a gift; the ability to learn is a skill; the willingness to learn is a choice. - Brian Herbert",
  "Anyone who stops learning is old, whether at twenty or eighty. - Henry Ford",
  "Learning is not attained by chance, it must be sought for with ardor and attended to with diligence. - Abigail Adams",
  "The more that you read, the more things you will know. The more that you learn, the more places you'll go. - Dr. Seuss",
  "An investment in knowledge pays the best interest. - Benjamin Franklin",
  "Tell me and I forget, teach me and I may remember, involve me and I learn. - Benjamin Franklin",
  "Learning never exhausts the mind. - Leonardo da Vinci",
  "The expert in anything was once a beginner. - Helen Hayes",
  "Education is not preparation for life; education is life itself. - John Dewey",
  "In learning you will teach, and in teaching you will learn. - Phil Collins",
  "The best time to plant a tree was 20 years ago. The second best time is now. - Chinese Proverb",
  "You don't learn to walk by following rules. You learn by doing, and by falling over. - Richard Branson",
  "Knowledge is power. Information is liberating. Education is the premise of progress. - Kofi Annan",
  "Learning is a treasure that will follow its owner everywhere. - Chinese Proverb",
  "The only person who is educated is the one who has learned how to learn and change. - Carl Rogers",
  "Change is the end result of all true learning. - Leo Buscaglia",
  "The beautiful thing about learning is nobody can take it away from you. - B.B. King",
  "Wisdom is not a product of schooling but of the lifelong attempt to acquire it. - Albert Einstein",
  "The mind is not a vessel to be filled, but a fire to be kindled. - Plutarch",
  "Education is the kindling of a flame, not the filling of a vessel. - Socrates",
  "Learning is the only thing the mind never exhausts, never fears, and never regrets. - Leonardo da Vinci",
  "I am always doing that which I cannot do, in order that I may learn how to do it. - Pablo Picasso",
  "The more I live, the more I learn. The more I learn, the more I realize, the less I know. - Michel Legrand",
  "Develop a passion for learning. If you do, you will never cease to grow. - Anthony J. D'Angelo",
  "Learning is experience. Everything else is just information. - Albert Einstein",
  "A person who never made a mistake never tried anything new. - Albert Einstein",
  "Education is what remains after one has forgotten what one has learned in school. - Albert Einstein"
];

export default function Dashboard() {
  const [matches, setMatches] = useState([]);
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [dailyQuote] = useState(() => inspiringQuotes[Math.floor(Math.random() * inspiringQuotes.length)]);
  const mountedRef = useRef(true);
  const navigate = useNavigate();

  const {
    currentCall,
    isVideoCallOpen,
    incomingCall,
    initiateCall,
    acceptIncomingCall,
    declineIncomingCall,
    endCall
  } = useVideoCall();

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const loadUser = async () => {
    if (!mountedRef.current) return;
    
    try {
      const data = await getCurrentUser();
      if (mountedRef.current) {
        setUser(data);
        
        if (data) {
          try {
            await websocketService.connect();
            console.log('WebSocket connected successfully');
          } catch (wsError) {
            console.error('WebSocket connection failed:', wsError);
          }
        }
      }
    } catch (err) {
      console.error("Failed to load user:", err);
      if (mountedRef.current) {
        setError("Failed to load user data");
      }
    }
  };

  const loadMatches = async () => {
    if (!mountedRef.current) return;
    
    try {
      const data = await getMatches();
      if (mountedRef.current) {
        setMatches(data || []);
      }
    } catch (err) {
      console.error("Failed to load matches:", err);
      if (mountedRef.current) {
        setError("Failed to load matches");
      }
    }
  };

  const handleStartConversation = async (matchId) => {
    console.log('Starting conversation for match:', matchId);
    try {
      const result = await startConversationFromMatch(matchId);
      console.log('Conversation result:', result);
      
      if (result && result.conversation && result.conversation.id) {
        console.log('Navigating to conversation ID:', result.conversation.id);
        navigate(`/messages/${result.conversation.id}`);
      } else {
        console.error('Invalid conversation data:', result);
        alert("Failed to start conversation. Invalid response from server.");
      }
    } catch (err) {
      console.error("Failed to start conversation:", err);
      const errorMsg = err.response?.data?.error || err.message || "Unknown error";
      alert(`Failed to start conversation: ${errorMsg}. Please try again.`);
    }
  };

  const handleLogout = () => {
    websocketService.disconnect();
    logoutUser();
    window.location.href = "/login";
  };

  useEffect(() => {
    mountedRef.current = true;
    
    const initializeDashboard = async () => {
      if (!mountedRef.current) return;
      setLoading(true);
      
      await loadUser();
      await loadMatches();
      
      if (mountedRef.current) {
        setLoading(false);
      }
    };

    initializeDashboard();

    return () => {
      console.log('Dashboard unmounting, cleaning up');
      mountedRef.current = false;
      websocketService.disconnect();
    };
  }, []);

  const formatDateTime = (date) => {
    const options = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return date.toLocaleDateString('en-US', options);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-white text-xl">Loading your dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Daily Quote and Time */}
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-6 backdrop-blur-md shadow-xl">
              <div className="flex items-start gap-4">
                <div className="text-4xl">💡</div>
                <div className="flex-1">
                  <p className="text-white text-lg italic mb-3">"{dailyQuote}"</p>
                  <p className="text-purple-200 text-sm">{formatDateTime(currentTime)}</p>
                </div>
              </div>
            </div>

            {/* Matches Section */}
            <div className="bg-white bg-opacity-10 rounded-2xl p-6 backdrop-blur-md">
              <h2 className="text-xl font-semibold text-white mb-4">Your Matches</h2>
              
              {matches.length > 0 ? (
                <div className="space-y-6">
                  {['exact', 'subcategory', 'category'].map(tier => {
                    const tierMatches = matches.filter(m => m.match_tier === tier);
                    if (tierMatches.length === 0) return null;
                    
                    const tierInfo = {
                      exact: { icon: '⭐', label: 'Exact Matches', color: 'border-yellow-400', bgColor: 'bg-yellow-500' },
                      subcategory: { icon: '🎯', label: 'Subcategory Matches', color: 'border-blue-400', bgColor: 'bg-blue-500' },
                      category: { icon: '📂', label: 'Category Matches', color: 'border-purple-400', bgColor: 'bg-purple-500' }
                    };
                    
                    return (
                      <div key={tier}>
                        <h3 className="text-lg font-medium text-white mb-3 flex items-center gap-2">
                          <span>{tierInfo[tier].icon}</span>
                          <span>{tierInfo[tier].label}</span>
                          <span className="text-purple-300 text-sm">({tierMatches.length})</span>
                        </h3>
                        <div className="grid gap-3">
                          {tierMatches.map((match, index) => {
                            const learner = match.learner;
                            const teacher = match.teacher;
                            const skill = match.skill;
                            const teacherSkill = match.teacher_skill;
                            
                            // Determine if current user is learner or teacher
                            const isCurrentUserLearner = user && learner && Number(learner.id) === Number(user.id);
                            const isCurrentUserTeacher = user && teacher && Number(teacher.id) === Number(user.id);
                            
                            // Determine partner and display text
                            let partner = null;
                            let displayText = "";
                            
                            if (isCurrentUserLearner) {
                              partner = teacher;
                              displayText = `Learn ${skill?.name || 'Unknown'} from ${teacher?.username || 'Unknown'}`;
                            } else if (isCurrentUserTeacher) {
                              partner = learner;
                              displayText = `Teach ${teacherSkill?.name || skill?.name || 'Unknown'} to ${learner?.username || 'Unknown'}`;
                            } else {
                              // Fallback
                              partner = teacher;
                              displayText = `Learn ${skill?.name || 'Unknown'} from ${teacher?.username || 'Unknown'}`;
                            }
                            
                            return (
                              <div 
                                key={match.id || index}
                                className={`bg-white bg-opacity-20 rounded-lg p-4 hover:bg-opacity-30 transition border-l-4 ${tierInfo[tier].color}`}
                              >
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <h4 className="text-white font-medium">{displayText}</h4>
                                    
                                    {teacherSkill && skill && teacherSkill.id !== skill.id && (
                                      <p className="text-purple-200 text-sm mt-1">
                                        {isCurrentUserTeacher 
                                          ? `They want to learn: ${skill.name}`
                                          : `They specialize in: ${teacherSkill.name}`
                                        }
                                      </p>
                                    )}
                                    
                                    {teacherSkill && skill && teacherSkill.subcategory === skill.subcategory && tier === 'subcategory' && (
                                      <p className="text-purple-200 text-xs mt-1">
                                        Both in: {skill.subcategory}
                                      </p>
                                    )}
                                    {teacherSkill && skill && teacherSkill.category === skill.category && tier === 'category' && (
                                      <p className="text-purple-200 text-xs mt-1">
                                        Both in: {skill.category}
                                      </p>
                                    )}
                                    <div className="flex items-center gap-2 mt-2">
                                      {match.is_mutual && (
                                        <span className="text-xs bg-green-500 bg-opacity-30 border border-green-400 text-green-200 px-2 py-1 rounded">
                                          Mutual Match ⭐
                                        </span>
                                      )}
                                      <span className={`text-xs ${tierInfo[tier].bgColor} bg-opacity-20 border ${tierInfo[tier].color} text-white px-2 py-1 rounded`}>
                                        {tierInfo[tier].icon} {tierInfo[tier].label.replace(' Matches', '')}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                    <button 
                                      onClick={() => handleStartConversation(match.id)}
                                      className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded text-sm transition"
                                    >
                                      Message
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">🔍</div>
                  <p className="text-purple-200">No matches yet</p>
                  <p className="text-purple-300 text-sm mt-2">
                    Head to the Skills tab to add skills and find learning partners!
                  </p>
                  <button
                    onClick={() => navigate('/skills')}
                    className="mt-4 bg-purple-600 hover:bg-purple-500 text-white px-6 py-2 rounded-lg transition"
                  >
                    Browse Skills
                  </button>
                </div>
              )}
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white bg-opacity-10 rounded-2xl p-6 backdrop-blur-md text-center">
                <div className="text-2xl font-bold text-white">{matches.length}</div>
                <div className="text-purple-200 text-sm">Total Matches</div>
              </div>
              <div className="bg-white bg-opacity-10 rounded-2xl p-6 backdrop-blur-md text-center">
                <div className="text-2xl font-bold text-white">
                  {matches.filter(m => m.is_mutual).length}
                </div>
                <div className="text-purple-200 text-sm">Mutual Matches</div>
              </div>
              <div className="bg-white bg-opacity-10 rounded-2xl p-6 backdrop-blur-md text-center">
                <div className="text-2xl font-bold text-white">
                  {matches.filter(m => m.match_tier === 'exact').length}
                </div>
                <div className="text-purple-200 text-sm">Exact Matches</div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            
            {/* Active Users with Video Call */}
            <ActiveUsers onVideoCall={initiateCall} />

            {/* Connection Status */}
            <div className="bg-white bg-opacity-10 rounded-2xl p-6 backdrop-blur-md">
              <h3 className="text-lg font-semibold text-white mb-4">Connection Status</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${
                    websocketService.isActivityConnected() ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                  }`}></div>
                  <span className="text-purple-200 text-sm">
                    Activity: {websocketService.isActivityConnected() ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${
                    websocketService.isVideoCallConnected() ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                  }`}></div>
                  <span className="text-purple-200 text-sm">
                    Video Call: {websocketService.isVideoCallConnected() ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
              </div>
              
              {!websocketService.isConnected() && (
                <button 
                  onClick={() => websocketService.connect()}
                  className="mt-3 w-full bg-purple-600 hover:bg-purple-500 text-white py-2 rounded-lg transition text-sm"
                >
                  Reconnect
                </button>
              )}
            </div>

            {/* Match Tier Legend */}
            <div className="bg-white bg-opacity-10 rounded-2xl p-6 backdrop-blur-md">
              <h3 className="text-lg font-semibold text-white mb-4">Match Types</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <span className="text-lg">⭐</span>
                  <div>
                    <div className="text-white font-medium">Exact Match</div>
                    <div className="text-purple-200 text-xs">They teach exactly what you want to learn</div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-lg">🎯</span>
                  <div>
                    <div className="text-white font-medium">Subcategory Match</div>
                    <div className="text-purple-200 text-xs">Similar skills in the same subcategory</div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-lg">📂</span>
                  <div>
                    <div className="text-white font-medium">Category Match</div>
                    <div className="text-purple-200 text-xs">Related skills in the same category</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Video Call Components */}
      {incomingCall && (
        <IncomingCall 
          callData={incomingCall}
          onAccept={acceptIncomingCall}
          onDecline={declineIncomingCall}
        />
      )}

      {isVideoCallOpen && currentCall && (
        <VideoCall
          isOpen={isVideoCallOpen}
          onClose={endCall}
          callId={currentCall.id}
          isInitiator={currentCall.isInitiator}
          remoteUserId={currentCall.remoteUserId}
          remoteUsername={currentCall.remoteUsername}
        />
      )}
    </div>
  );
}