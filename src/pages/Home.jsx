import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser } from "../auth";

export default function Home() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await getCurrentUser();
        setUser(userData);
      } catch (err) {
        console.error("Failed to load user:", err);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  const features = [
    {
      number: "01",
      icon: "🎯",
      title: "Select Your Skills",
      description: "Choose skills you want to learn and skills you can teach. Browse from 300+ skills across technology, arts, business, and more.",
      action: "Browse Skills",
      link: "/skills"
    },
    {
      number: "02",
      icon: "✨",
      title: "Get Matched",
      description: "Our smart matching system finds people who can teach what you want to learn and want to learn what you can teach. Get exact, subcategory, and category matches.",
      action: "View Matches",
      link: "/skills"
    },
    {
      number: "03",
      icon: "💬",
      title: "Connect & Learn",
      description: "Message your matches, schedule sessions, and start video calls. Build meaningful learning partnerships with people around the world.",
      action: "Go to Dashboard",
      link: "/dashboard"
    }
  ];

  const stats = [
    { label: "Skills Available", value: "335+", icon: "📚" },
    { label: "Categories", value: "15+", icon: "🗂️" },
    { label: "Match Tiers", value: "3", icon: "⭐" },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
          <div className="absolute top-40 left-40 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
        </div>

        <div className="relative container mx-auto px-6 pt-20 pb-32">
          <div className="text-center max-w-4xl mx-auto">
            {user && (
              <div className="mb-6 animate-fade-in">
                <p className="text-purple-200 text-lg">Welcome back,</p>
                <h2 className="text-3xl font-bold text-white">{user.username}! 👋</h2>
              </div>
            )}
            
            <h1 className="text-6xl md:text-7xl font-extrabold text-white mb-6 leading-tight">
              Learn Anything.
              <br />
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 text-transparent bg-clip-text">
                Teach Anything.
              </span>
            </h1>
            
            <p className="text-xl text-purple-100 mb-12 max-w-2xl mx-auto leading-relaxed">
              Connect with people who can teach you what you want to learn, and teach them what you know. 
              No money. No courses. Just pure knowledge exchange.
            </p>

            <div className="flex flex-wrap gap-4 justify-center">
              <button
                onClick={() => navigate("/skills")}
                className="bg-white text-purple-900 px-8 py-4 rounded-full font-bold text-lg hover:bg-purple-100 transition transform hover:scale-105 shadow-2xl"
              >
                Get Started
              </button>
              <button
                onClick={() => navigate("/dashboard")}
                className="bg-purple-600 bg-opacity-30 backdrop-blur-sm border-2 border-purple-400 text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-opacity-40 transition transform hover:scale-105"
              >
                View Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="relative -mt-20">
        <div className="container mx-auto px-6">
          <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-3xl p-8 shadow-2xl border border-white border-opacity-20">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-4xl mb-2">{stat.icon}</div>
                  <div className="text-4xl font-bold text-white mb-1">{stat.value}</div>
                  <div className="text-purple-200">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="container mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-white mb-4">How It Works</h2>
          <p className="text-xl text-purple-200">Three simple steps to start your learning journey</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <div
              key={index}
              className="relative bg-white bg-opacity-10 backdrop-blur-md rounded-2xl p-8 hover:bg-opacity-15 transition transform hover:scale-105 border border-white border-opacity-20 shadow-xl"
            >
              <div className="absolute -top-6 -left-6 w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-lg transform rotate-12">
                {feature.number}
              </div>
              
              <div className="text-5xl mb-4 mt-4">{feature.icon}</div>
              <h3 className="text-2xl font-bold text-white mb-3">{feature.title}</h3>
              <p className="text-purple-200 mb-6 leading-relaxed">{feature.description}</p>
              
              <button
                onClick={() => navigate(feature.link)}
                className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-full font-semibold transition w-full"
              >
                {feature.action} →
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Match Tiers Explanation */}
      <div className="bg-white bg-opacity-5 py-24">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold text-white mb-4">Smart Matching System</h2>
            <p className="text-xl text-purple-200">We find the perfect learning partners for you at three levels</p>
          </div>

          <div className="max-w-5xl mx-auto space-y-6">
            <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-2xl p-8 border-l-4 border-yellow-400">
              <div className="flex items-start gap-4">
                <div className="text-4xl">⭐</div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-white mb-2">Exact Matches</h3>
                  <p className="text-purple-200 text-lg">
                    Find people who teach exactly what you want to learn. If you want to learn Unity 3D, 
                    we connect you with people who specifically teach Unity 3D.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-2xl p-8 border-l-4 border-blue-400">
              <div className="flex items-start gap-4">
                <div className="text-4xl">🎯</div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-white mb-2">Subcategory Matches</h3>
                  <p className="text-purple-200 text-lg">
                    Discover people who teach related skills in the same subcategory. Want Unity 3D? 
                    We also show you experts in Blender, Maya, and other 3D & Animation tools.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-2xl p-8 border-l-4 border-purple-400">
              <div className="flex items-start gap-4">
                <div className="text-4xl">📂</div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-white mb-2">Category Matches</h3>
                  <p className="text-purple-200 text-lg">
                    Expand your horizons with matches in the broader category. Interested in Unity 3D? 
                    Connect with people teaching Graphic Design, UI/UX, and other Arts & Design skills.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="container mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-white mb-4">Why SkillSwap?</h2>
          <p className="text-xl text-purple-200">Everything you need for collaborative learning</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {[
            { icon: "💬", title: "Real-Time Chat", desc: "Instant messaging with your learning partners" },
            { icon: "📹", title: "Video Calls", desc: "Face-to-face learning sessions anytime" },
            { icon: "🔄", title: "Mutual Swaps", desc: "Fair exchange - teach and learn together" },
            { icon: "🌍", title: "Global Network", desc: "Connect with learners worldwide" },
            { icon: "🎨", title: "335+ Skills", desc: "From coding to cooking, art to analytics" },
            { icon: "⚡", title: "Instant Matching", desc: "Find partners as soon as you add skills" },
            { icon: "🔒", title: "Private & Safe", desc: "Secure connections, verified users" },
            { icon: "📊", title: "Track Progress", desc: "See your learning journey unfold" }
          ].map((item, index) => (
            <div
              key={index}
              className="bg-white bg-opacity-10 backdrop-blur-md rounded-2xl p-6 text-center hover:bg-opacity-15 transition border border-white border-opacity-20"
            >
              <div className="text-4xl mb-3">{item.icon}</div>
              <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
              <p className="text-purple-200 text-sm">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 py-20">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-5xl font-bold text-white mb-6">
            Ready to Start Learning?
          </h2>
          <p className="text-2xl text-purple-100 mb-8 max-w-2xl mx-auto">
            Join thousands of learners exchanging knowledge every day. Your next skill is just a match away.
          </p>
          <button
            onClick={() => navigate("/skills")}
            className="bg-white text-purple-900 px-12 py-5 rounded-full font-bold text-xl hover:bg-purple-100 transition transform hover:scale-105 shadow-2xl"
          >
            Start Matching Now
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-black bg-opacity-30 py-8">
        <div className="container mx-auto px-6 text-center">
          <p className="text-purple-300">
            © 2025 SkillSwap — Learn together, grow together 💜
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(20px, -20px) scale(1.1); }
          50% { transform: translate(-20px, 20px) scale(0.9); }
          75% { transform: translate(20px, 20px) scale(1.05); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }
      `}</style>
    </div>
  );
}