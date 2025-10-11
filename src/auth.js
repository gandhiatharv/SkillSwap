import api from "./api";

// ----------------- Auth Functions -----------------

export const registerUser = async (username, email, password, password2) => {
  try {
    const response = await api.post("auth/register/", {
      username,
      email,
      password,
      password2,
    });
    return response.data;
  } catch (error) {
    console.error("Registration failed:", error.response?.data || error.message);
    throw error;
  }
};

export const loginUser = async (username, password) => {
  try {
    const response = await api.post("auth/token/", { username, password });
    localStorage.setItem("access_token", response.data.access);
    localStorage.setItem("refresh_token", response.data.refresh);
    return response.data;
  } catch (error) {
    console.error("Login failed:", error.response?.data || error.message);
    throw error;
  }
};

export const getCurrentUser = async () => {
  try {
    const token = localStorage.getItem('access_token');
    if (!token) {
      console.error('No access token found');
      return null;
    }
    
    const response = await api.get("users/me/");
    return response.data;
  } catch (error) {
    console.error("Fetching current user failed:", error.response?.data || error.message);
    
    // If token is invalid/expired, clear it
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
    }
    
    return null;
  }
};

export const logoutUser = () => {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
};

// ----------------- Skill Management -----------------

export const addUserSkill = async (skillId, type) => {
  try {
    const response = await api.post("user-skills/", { skill: skillId, type });
    return response.data;
  } catch (error) {
    console.error("Adding skill failed:", error.response?.data || error.message);
    throw error;
  }
};

export const getMatches = async () => {
  try {
    const response = await api.get("matches/");
    return response.data || [];
  } catch (error) {
    console.error("Fetching matches failed:", error.response?.data || error.message);
    return [];
  }
};

// ----------------- Messaging Functions -----------------

export const getConversations = async () => {
  try {
    const response = await api.get("conversations/");
    return response.data || [];
  } catch (error) {
    console.error("Fetching conversations failed:", error.response?.data || error.message);
    return [];
  }
};

export const getConversationDetails = async (conversationId) => {
  try {
    const response = await api.get(`conversations/${conversationId}/`);
    return response.data;
  } catch (error) {
    console.error("Fetching conversation details failed:", error.response?.data || error.message);
    throw error;
  }
};

export const sendMessage = async (conversationId, content) => {
  try {
    const response = await api.post("messages/", {
      conversation: conversationId,
      content: content,
    });
    return response.data;
  } catch (error) {
    console.error("Sending message failed:", error.response?.data || error.message);
    throw error;
  }
};

export const createConversation = async (otherUserId) => {
  try {
    const response = await api.post("conversations/", {
      other_user_id: otherUserId,
    });
    return response.data;
  } catch (error) {
    console.error("Creating conversation failed:", error.response?.data || error.message);
    throw error;
  }
};

export const startConversationFromMatch = async (matchId) => {
  try {
    console.log('[AUTH] Starting conversation for match ID:', matchId);
    
    const response = await api.post(`matches/${matchId}/start_conversation/`);
    
    console.log('[AUTH] Full response:', response);
    console.log('[AUTH] Response data:', response.data);
    console.log('[AUTH] Response status:', response.status);
    
    if (!response || !response.data) {
      throw new Error('No response data received from server');
    }
    
    if (!response.data.conversation) {
      console.error('[AUTH] Invalid response structure:', response.data);
      throw new Error('Server response missing conversation data');
    }
    
    if (!response.data.conversation.id) {
      console.error('[AUTH] Conversation missing ID:', response.data.conversation);
      throw new Error('Conversation data missing ID field');
    }
    
    console.log('[AUTH] Successfully got conversation:', response.data.conversation);
    return response.data;
    
  } catch (error) {
    console.error('[AUTH] Error in startConversationFromMatch:');
    console.error('[AUTH] Error object:', error);
    console.error('[AUTH] Error response:', error.response);
    console.error('[AUTH] Error response data:', error.response?.data);
    console.error('[AUTH] Error message:', error.message);
    
    // Construct a meaningful error message
    let errorMessage = 'Unknown error occurred';
    
    if (error.response) {
      // Server responded with error
      errorMessage = error.response.data?.error || 
                    error.response.data?.detail || 
                    `Server error: ${error.response.status}`;
    } else if (error.request) {
      // Request made but no response
      errorMessage = 'No response from server. Please check your connection.';
    } else {
      // Error in request setup
      errorMessage = error.message || 'Failed to send request';
    }
    
    // Create a new error with the meaningful message
    const meaningfulError = new Error(errorMessage);
    meaningfulError.originalError = error;
    meaningfulError.response = error.response;
    
    throw meaningfulError;
  }
};

export const markConversationAsRead = async (conversationId) => {
  try {
    const response = await api.post(`conversations/${conversationId}/mark_as_read/`);
    return response.data;
  } catch (error) {
    console.error("Marking conversation as read failed:", error.response?.data || error.message);
    return null;
  }
};

// ----------------- Video Call Functions -----------------
export const getOnlineMatches = async () => {
  try {
    const response = await api.get("user-activity/online_matches/");
    return response.data || [];
  } catch (error) {
    console.error("Fetching online matches failed:", error.response?.data || error.message);
    return [];
  }
};

export const getVideoCalls = async () => {
  try {
    const response = await api.get("video-calls/");
    return response.data || [];
  } catch (error) {
    console.error("Fetching video calls failed:", error.response?.data || error.message);
    return [];
  }
};

export const initiateVideoCall = async (receiverId) => {
  try {
    const response = await api.post("video-calls/", {
      receiver: receiverId,
      status: 'pending'
    });
    return response.data;
  } catch (error) {
    console.error("Initiating video call failed:", error.response?.data || error.message);
    throw error;
  }
};

export const acceptVideoCall = async (callId) => {
  try {
    const response = await api.post(`video-calls/${callId}/accept_call/`);
    return response.data;
  } catch (error) {
    console.error("Accepting video call failed:", error.response?.data || error.message);
    throw error;
  }
};

export const declineVideoCall = async (callId) => {
  try {
    const response = await api.post(`video-calls/${callId}/decline_call/`);
    return response.data;
  } catch (error) {
    console.error("Declining video call failed:", error.response?.data || error.message);
    throw error;
  }
};