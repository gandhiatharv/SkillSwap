// src/components/MessageList.jsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getConversations } from "../auth";

export default function MessageList() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadConversations();
    const interval = setInterval(() => {
      loadConversation();
    }, 7000);
    
    return () => clearInterval(interval);
  }, []);

    

  const loadConversations = async () => {
    setLoading(true);
    try {
      const data = await getConversations();
      setConversations(data || []);
    } catch (err) {
      setError("Failed to load conversations");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 24 * 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-purple-600">Loading conversations...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-600 p-4">
        {error}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="text-center text-gray-500 p-8">
        <h3 className="text-lg font-semibold mb-2">No conversations yet</h3>
        <p>Start chatting with your skill swap matches!</p>
        <Link 
          to="/skills" 
          className="inline-block mt-4 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition"
        >
          Find Matches
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h2 className="text-2xl font-bold mb-4">Messages</h2>
      {conversations.map((conversation) => (
        <Link
          key={conversation.id}
          to={`/messages/${conversation.id}`}
          className="block"
        >
          <div className="bg-white border rounded-lg p-4 hover:bg-gray-50 transition-colors">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900">
                    {conversation.other_user?.username || 'Unknown User'}
                  </h3>
                  {conversation.unread_count > 0 && (
                    <span className="bg-purple-600 text-white text-xs px-2 py-1 rounded-full">
                      {conversation.unread_count}
                    </span>
                  )}
                </div>
                {conversation.last_message && (
                  <p className="text-gray-600 text-sm mt-1 truncate">
                    {conversation.last_message.sender.username === conversation.other_user?.username 
                      ? conversation.last_message.content 
                      : `You: ${conversation.last_message.content}`
                    }
                  </p>
                )}
              </div>
              <div className="text-xs text-gray-500 ml-4">
                {conversation.last_message 
                  ? formatDate(conversation.last_message.created_at)
                  : formatDate(conversation.created_at)
                }
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}