// src/pages/Login.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser } from "../auth";

export default function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      console.log('🔐 Attempting login for:', username);
      
      // Use the loginUser function from auth.js which uses api.js with config
      await loginUser(username, password);
      
      console.log('✅ Login successful!');
      
      // Notify parent if needed
      if (onLogin) onLogin();

      // Navigate to dashboard
      navigate("/dashboard");
    } catch (err) {
      console.error("❌ Login error:", err);
      
      // Better error handling
      let errorMessage = "Login failed. Try again.";
      
      if (err.response?.data) {
        const data = err.response.data;
        errorMessage = data.detail || data.error || data.message || errorMessage;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-800 to-indigo-900 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="bg-white bg-opacity-10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white border-opacity-20">
          <h2 className="text-4xl font-bold text-white mb-2 text-center">Welcome Back</h2>
          <p className="text-purple-200 text-center mb-8">Login to continue learning</p>
          
          {error && (
            <div className="mb-6 bg-red-500 bg-opacity-20 border border-red-400 rounded-xl p-4 text-red-100">
              <p className="font-semibold">⚠️ {error}</p>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-white font-medium mb-2">Username</label>
              <input
                type="text"
                placeholder="Username"
                className="w-full px-4 py-3 bg-white bg-opacity-20 border border-white border-opacity-30 rounded-xl text-white placeholder-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="username"
              />
            </div>
            
            <div>
              <label className="block text-white font-medium mb-2">Password</label>
              <input
                type="password"
                placeholder="Password"
                className="w-full px-4 py-3 bg-white bg-opacity-20 border border-white border-opacity-30 rounded-xl text-white placeholder-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="current-password"
              />
            </div>
            
            <button
              type="submit"
              className="w-full py-3 px-6 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl font-semibold transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Logging in...
                </span>
              ) : (
                'Login'
              )}
            </button>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-purple-200">
              Don't have an account?{' '}
              <button
                onClick={() => navigate('/register')}
                className="text-white font-semibold hover:underline"
              >
                Register here
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}