import React, { useEffect, useState } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import {Eye, EyeOff  } from "lucide-react" // Import icons from Heroicons

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false); // State for toggling password visibility
<EyeOff />
  useEffect(() => {
    if (Cookies.get("token")) {
      if (Cookies.get("role") === "Admin") {
        window.location.href = "/";
      }
      if (Cookies.get("role") === "User") {
        window.location.href = "/User";
      }
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Enter all the fields");
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post(`${process.env.REACT_APP_HOST}/login`, {
        email,
        password,
      });

      const { token, role, location } = response.data.data;
      Cookies.set("token", token, { expires: 7 });
      Cookies.set("role", role, { expires: 7 });
      Cookies.set("selectedLocation", location);

      window.location.href = role === "Admin" ? "/" : "/User";
    } catch (error) {
      console.error("Error signing up:", error);
      setError("Invalid login credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row items-center justify-start px-4 pt-8 bg-gray-900 relative overflow-hidden">
      {/* Background with gradient overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-70"
        style={{ backgroundImage: "url('https://res.cloudinary.com/dky72aehn/image/upload/v1740747416/2151896739_zlpzrv.jpg')" }}
      ></div>
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900/90 to-blue-900/70"></div>

      {/* Floating particles for background effect */}
      <div className="absolute inset-0">
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1.5 h-1.5 bg-white/20 rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDuration: `${10 + Math.random() * 20}s`,
              animationDelay: `${Math.random() * 5}s`,
            }}
          />
        ))}
      </div>

      {/* Content Container */}
      <div className="relative z-10 flex flex-col md:flex-row items-center justify-center w-full max-w-6xl mx-auto">
        {/* Left Side - Details */}
        <div className="w-full md:w-1/2 text-center md:text-left px-6 mb-8 md:mb-0">
          <h1 className="text-5xl font-bold text-white mb-6 animate-fade-in">
            Re4billion<span className="text-blue-400">.</span>AI
          </h1>
          <p className="text-gray-300 md:text-lg text-sm mb-8 max-w-md animate-fade-in animate-delay-200">
            Access your dashboard and manage sustainable energy solutions effortlessly.
          </p>
          <div className="flex justify-center md:justify-start space-x-8 animate-fade-in animate-delay-400">
            <div className="text-center bg-white/10 p-4 rounded-xl backdrop-blur-sm">
              <p className="md:text-3xl text-xl font-bold text-blue-400">500+</p>
              <p className="text-gray-300">Solar Installations</p>
            </div>
            <div className="text-center bg-white/10 p-4 rounded-xl backdrop-blur-sm">
              <p className="md:text-3xl text-xl font-bold text-blue-400">1M+</p>
              <p className="text-gray-300">CO2 Reduced</p>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-full md:w-1/3 bg-white/10 backdrop-blur-sm p-8 rounded-2xl shadow-lg border border-white/10 relative animate-fade-in animate-delay-600">
          <h2 className="text-center text-3xl font-bold text-white mb-6">Login</h2>
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-red-400 text-sm text-center">{error}</p>
            </div>
          )}
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full bg-white/10 border border-white/10 text-white placeholder-gray-400 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                required
              />
            </div>
            <div className="relative">
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <input
                type={showPassword ? "text" : "password"} // Toggle input type
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full bg-white/10 border border-white/10 text-white placeholder-gray-400 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all pr-12"
                required
              />
              {/* Toggle Password Visibility Button */}
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-blue-400 transition-all mt-7"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-3.5 rounded-lg font-semibold hover:bg-blue-700 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>
      </div>

      {/* Animations */}
      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) translateX(0); }
          25% { transform: translateY(-20px) translateX(40px); }
          50% { transform: translateY(10px) translateX(-40px); }
          75% { transform: translateY(-10px) translateX(-15px); }
        }

        @keyframes fade-in {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }

        .animate-float {
          animation: float 10s infinite ease-in-out;
        }

        .animate-fade-in {
          animation: fade-in 1s ease-out forwards;
        }

        .animate-delay-200 {
          animation-delay: 0.2s;
        }

        .animate-delay-400 {
          animation-delay: 0.4s;
        }

        .animate-delay-600 {
          animation-delay: 0.6s;
        }
      `}</style>
    </div>
  );
};

export default Login;