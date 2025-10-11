// src/config.js
// Environment-based configuration for API and WebSocket URLs

const isDevelopment = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';

// API Configuration
export const API_BASE_URL = isDevelopment 
  ? 'http://localhost:8000/api/'
  : process.env.REACT_APP_API_URL || 'https://your-backend-url.railway.app/api/';

// WebSocket Configuration  
export const WS_BASE_URL = isDevelopment
  ? 'ws://localhost:8000/ws/'
  : process.env.REACT_APP_WS_URL || 'wss://your-backend-url.railway.app/ws/';

// Log configuration in development
if (isDevelopment) {
  console.log('Running in DEVELOPMENT mode');
  console.log('API Base URL:', API_BASE_URL);
  console.log('WebSocket Base URL:', WS_BASE_URL);
}

export default {
  API_BASE_URL,
  WS_BASE_URL,
  isDevelopment
};