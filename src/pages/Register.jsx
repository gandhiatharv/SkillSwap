// src/pages/Register.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { registerUser } from "../auth";

export default function Register() {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);

    try {
      console.log('📝 Attempting registration for:', formData.username);
      
      // Use registerUser from auth.js which uses api.js with config
      await registerUser(
        formData.username,
        formData.email,
        formData.password,
        formData.confirmPassword
      );
      
      console.log('✅ Registration successful!');
      alert("Registration successful! Please log in.");
      navigate("/login");
    } catch (err) {
      console.error("❌ Registration error:", err);
      
      // Better error handling
      let errorMessage = "Registration failed. Please check your info and try again.";
      
      if (err.response?.data) {
        const data = err.response.data;
        // Handle Django validation errors
        if (typeof data === 'object') {
          const errors = Object.entries(data)
            .map(([key, value]) => {
              const errorValue = Array.isArray(value) ? value[0] : value;
              return `${key}: ${errorValue}`;
            })
            .join(', ');
          errorMessage = errors;
        } else {
          errorMessage = data.detail || data.error || data.message || errorMessage;
        }
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
          <h2 className="text-4xl font-bold text-white mb-2 text-center">Join SkillSwap</h2>
          <p className="text-purple-200 text-center mb-8">Start your learning journey today</p>
          
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
                name="username"
                placeholder="Choose a username"
                value={formData.username}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white bg-opacity-20 border border-white border-opacity-30 rounded-xl text-white placeholder-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition"
                required
                disabled={isLoading}
                autoComplete="username"
              />
            </div>

            <div>
              <label className="block text-white font-medium mb-2">Email</label>
              <input
                type="email"
                name="email"
                placeholder="your@email.com"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white bg-opacity-20 border border-white border-opacity-30 rounded-xl text-white placeholder-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition"
                required
                disabled={isLoading}
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-white font-medium mb-2">Password</label>
              <input
                type="password"
                name="password"
                placeholder="At least 6 characters"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white bg-opacity-20 border border-white border-opacity-30 rounded-xl text-white placeholder-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition"
                required
                disabled={isLoading}
                autoComplete="new-password"
              />
            </div>

            <div>
              <label className="block text-white font-medium mb-2">Confirm Password</label>
              <input
                type="password"
                name="confirmPassword"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white bg-opacity-20 border border-white border-opacity-30 rounded-xl text-white placeholder-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition"
                required
                disabled={isLoading}
                autoComplete="new-password"
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
                  Creating Account...
                </span>
              ) : (
                'Register'
              )}
            </button>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-purple-200">
              Already have an account?{' '}
              <button
                onClick={() => navigate('/login')}
                className="text-white font-semibold hover:underline"
              >
                Login here
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}