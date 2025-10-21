// src/config.js
console.log('=== CONFIG.JS LOADED ===');
console.log('process.env.NODE_ENV:', process.env.NODE_ENV);
console.log('process.env.REACT_APP_API_URL:', process.env.REACT_APP_API_URL);
console.log('process.env.REACT_APP_WS_URL:', process.env.REACT_APP_WS_URL);

const isDevelopment = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';

export const API_BASE_URL = isDevelopment 
  ? 'http://localhost:8000/api/'
  : process.env.REACT_APP_API_URL || 'https://skillswap-2-dkwj.onrender.com/api/';

export const WS_BASE_URL = isDevelopment
  ? 'ws://localhost:8000/ws/'
  : process.env.REACT_APP_WS_URL || 'wss://skillswap-2-dkwj.onrender.com/ws/';

console.log('🌍 Environment:', isDevelopment ? 'DEVELOPMENT' : 'PRODUCTION');
console.log('🔗 Final API_BASE_URL:', API_BASE_URL);
console.log('🔌 Final WS_BASE_URL:', WS_BASE_URL);

export default {
  API_BASE_URL,
  WS_BASE_URL,
  isDevelopment
};