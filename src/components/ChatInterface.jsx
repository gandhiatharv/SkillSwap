// src/components/ChatInterface.jsx
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  getConversationDetails, 
  sendMessage, 
  markConversationAsRead,
  getCurrentUser
} from "../auth";

export default function ChatInterface() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [error, setError] = useState("");
  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadCurrentUser();
    loadConversation();
  }, [conversationId]);

  useEffect(() => {
    if (conversationId) {
      markConversationAsRead(conversationId);
    }
  }, [conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadCurrentUser = async () => {
    try {
      const user = await getCurrentUser();
      setCurrentUser(user);
    } catch (err) {
      console.error("Failed to load current user:", err);
    }
  };

  const loadConversation = async () => {
    if (!conversationId) return;
    
    setLoading(true);
    try {
      const data = await getConversationDetails(conversationId);
      if (data) {
        setConversation(data);
        setMessages(data.messages || []);
      } else {
        setError("Conversation not found");
      }
    } catch (err) {
      setError("Failed to load conversation");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      const messageData = await sendMessage(conversationId, newMessage.trim());
      if (messageData) {
        setMessages(prev => [...prev, messageData]);
        setNewMessage("");
        if (conversation) {
          setConversation(prev => ({
            ...prev,
            updated_at: messageData.created_at
          }));
        }
      }
    } catch (err) {
      console.error("Failed to send message:", err);
      setError("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit', 
        minute: '2-digit'
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="text-purple-600">Loading conversation...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <div className="text-red-600 mb-4">{error}</div>
        <button
          onClick={() => navigate('/messages')}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition"
        >
          Back to Messages
        </button>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="text-center text-gray-500 p-8">
        Conversation not found
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-h-[80vh]">
      {/* Header WITHOUT Video Call Button */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/messages')}
            className="text-purple-600 hover:text-purple-800 font-medium"
          >
            ← Back
          </button>
          <div>
            <h2 className="font-semibold text-lg">
              {conversation.other_user?.username || 'Unknown User'}
            </h2>
            <p className="text-sm text-gray-500">
              Started {new Date(conversation.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
        
        {/* Info about video calling */}
        <div className="text-sm text-gray-500 italic">
          💡 Tip: Reload the page to check for new messages, and visit Dashboard or Skills to start a video call
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => {
            const isOwn = currentUser && message.sender.id === currentUser.id;
            return (
              <div
                key={message.id}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    isOwn
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-200 text-gray-900'
                  }`}
                >
                  <p className="break-words">{message.content}</p>
                  <p
                    className={`text-xs mt-1 ${
                      isOwn ? 'text-purple-200' : 'text-gray-500'
                    }`}
                  >
                    {formatTime(message.created_at)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="bg-white border-t px-4 py-4">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? 'Sending...' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  );
}