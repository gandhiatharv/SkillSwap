// src/api.js
import axios from "axios";
import { API_BASE_URL } from './config';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000, // 10 second timeout
});

// Request interceptor: Attach access token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Only log in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[API] ${config.method.toUpperCase()} ${config.url}`, config.data);
    }
    
    return config;
  },
  (error) => {
    console.error("[API] Request error:", error);
    return Promise.reject(error);
  }
);

// Response interceptor: Handle 401 by refreshing token
api.interceptors.response.use(
  (response) => {
    // Only log in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[API] Response from ${response.config.url}:`, response.status);
    }
    return response;
  },
  async (error) => {
    console.error("[API] Response error:", error);
    
    // Check if error response exists
    if (!error.response) {
      console.error("[API] Network error - no response from server");
      console.error(`[API] Make sure Django server is running at ${API_BASE_URL}`);
      return Promise.reject(new Error("Network error: Cannot connect to server. Is Django running?"));
    }

    const originalRequest = error.config;

    // Only attempt refresh if 401, not already retried, and refresh token exists
    if (
      error.response.status === 401 &&
      !originalRequest._retry &&
      localStorage.getItem("refresh_token")
    ) {
      originalRequest._retry = true;
      try {
        console.log("[API] Attempting to refresh token...");
        const refreshToken = localStorage.getItem("refresh_token");
        const res = await axios.post(`${API_BASE_URL}auth/token/refresh/`, {
          refresh: refreshToken,
        });
        localStorage.setItem("access_token", res.data.access);
        originalRequest.headers.Authorization = `Bearer ${res.data.access}`;
        console.log("[API] Token refreshed successfully, retrying request");
        return api(originalRequest); // retry original request
      } catch (refreshError) {
        console.error("[API] Token refresh failed:", refreshError);
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        window.location.href = "/login"; // redirect to login
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;