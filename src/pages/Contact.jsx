// src/pages/Contact.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export default function Contact() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    rating: 5,
    feedback: '',
    category: 'general'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'rating' ? parseInt(value) : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus(null);
    setErrorMessage('');

    try {
      console.log('Submitting feedback:', formData);
      const response = await api.post('feedback/', formData);
      console.log('Feedback submitted successfully:', response.data);
      
      setSubmitStatus('success');
      setFormData({
        name: '',
        email: '',
        rating: 5,
        feedback: '',
        category: 'general'
      });
      
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (err) {
      console.error('Failed to submit feedback:', err);
      console.error('Error response:', err.response?.data);
      
      setSubmitStatus('error');
      
      // Extract error message
      if (err.response?.data) {
        const errors = err.response.data;
        if (typeof errors === 'object') {
          const errorMessages = Object.entries(errors)
            .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
            .join('; ');
          setErrorMessage(errorMessages);
        } else {
          setErrorMessage(errors.toString());
        }
      } else {
        setErrorMessage('Network error. Please check your connection.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-800 to-indigo-900 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-3 drop-shadow-lg">
            We'd Love to Hear From You
          </h1>
          <p className="text-purple-200 text-lg">
            Your feedback helps us make SkillSwap better for everyone
          </p>
        </div>

        {/* Main Form Card */}
        <div className="bg-white bg-opacity-10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white border-opacity-20">
          
          {submitStatus === 'success' && (
            <div className="mb-6 bg-green-500 bg-opacity-20 border border-green-400 rounded-xl p-4 text-green-100 flex items-center gap-3">
              <span className="text-2xl">✓</span>
              <div>
                <p className="font-semibold">Thank you for your feedback!</p>
                <p className="text-sm">Redirecting you to dashboard...</p>
              </div>
            </div>
          )}

          {submitStatus === 'error' && (
            <div className="mb-6 bg-red-500 bg-opacity-20 border border-red-400 rounded-xl p-4 text-red-100 flex items-start gap-3">
              <span className="text-2xl">⚠</span>
              <div>
                <p className="font-semibold">Oops! Something went wrong</p>
                <p className="text-sm">{errorMessage || 'Please try again later'}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Name Field */}
            <div>
              <label className="block text-white font-medium mb-2">
                Your Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-white bg-opacity-20 border border-white border-opacity-30 rounded-xl text-white placeholder-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition"
                placeholder="John Doe"
              />
            </div>

            {/* Email Field */}
            <div>
              <label className="block text-white font-medium mb-2">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-white bg-opacity-20 border border-white border-opacity-30 rounded-xl text-white placeholder-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition"
                placeholder="john@example.com"
              />
            </div>

            {/* Category Dropdown */}
            <div>
              <label className="block text-white font-medium mb-2">
                Feedback Category
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white bg-opacity-20 border border-white border-opacity-30 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition"
              >
                <option value="general" className="text-gray-900">General Feedback</option>
                <option value="bug" className="text-gray-900">Bug Report</option>
                <option value="feature" className="text-gray-900">Feature Request</option>
                <option value="matching" className="text-gray-900">Matching Algorithm</option>
                <option value="ui" className="text-gray-900">User Interface</option>
                <option value="other" className="text-gray-900">Other</option>
              </select>
            </div>

            {/* Rating */}
            <div>
              <label className="block text-white font-medium mb-3">
                How would you rate your experience?
              </label>
              <div className="flex gap-3 justify-center">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, rating: star }))}
                    className="transition-transform hover:scale-110"
                  >
                    <span 
                      className={`text-4xl ${
                        star <= formData.rating 
                          ? 'text-yellow-400 drop-shadow-lg' 
                          : 'text-gray-400 opacity-50'
                      }`}
                    >
                      ★
                    </span>
                  </button>
                ))}
              </div>
              <p className="text-center text-purple-200 text-sm mt-2">
                {formData.rating === 5 && "Excellent! 🎉"}
                {formData.rating === 4 && "Great! 👍"}
                {formData.rating === 3 && "Good 👌"}
                {formData.rating === 2 && "Needs improvement 🔧"}
                {formData.rating === 1 && "Poor 😔"}
              </p>
            </div>

            {/* Feedback Text */}
            <div>
              <label className="block text-white font-medium mb-2">
                Your Feedback
              </label>
              <textarea
                name="feedback"
                value={formData.feedback}
                onChange={handleChange}
                required
                rows="6"
                className="w-full px-4 py-3 bg-white bg-opacity-20 border border-white border-opacity-30 rounded-xl text-white placeholder-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition resize-none"
                placeholder="Tell us what you think, what we can improve, or report any issues..."
              />
            </div>

            {/* Submit Button */}
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="flex-1 py-3 px-6 bg-white bg-opacity-10 hover:bg-opacity-20 text-white rounded-xl font-semibold transition border border-white border-opacity-30"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-3 px-6 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl font-semibold transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Sending...
                  </span>
                ) : (
                  'Submit Feedback'
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Footer Info */}
        <div className="text-center mt-6 text-purple-200 text-sm">
          <p>Thank you for helping us improve SkillSwap! 💜</p>
        </div>
      </div>
    </div>
  );
}