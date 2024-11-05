import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, Sparkles } from "lucide-react";
import { login } from "../api/auth";

function Login() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState(""); // New state for email
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      // Updated to include email in login function
      const user = await login(username, email, password);
      if (user) {
        console.log("Login successful:", user);
        navigate("/dashboard");
      } else {
        setError("Invalid credentials");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError(
        err.message || "An error occurred during login. Please try again."
      );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-blue-700 to-black">
      <div className="w-full max-w-md bg-white/90 backdrop-blur-sm shadow-xl rounded-lg p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-blue-700">
            PESU Fest - LOGIN
          </h2>
          <p className="text-blue-600">Register for various events!</p>
        </div>
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-blue-700"
              >
                Username
              </label>
              <input
                id="username"
                type="text"
                required
                className="mt-1 block w-full px-3 py-2 bg-white border border-blue-300 rounded-md text-sm shadow-sm placeholder-gray-400
                          focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            {/* New Email Field */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-blue-700"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                className="mt-1 block w-full px-3 py-2 bg-white border border-blue-300 rounded-md text-sm shadow-sm placeholder-gray-400
                          focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-blue-700"
              >
                Password
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  className="block w-full px-3 py-2 bg-white border border-blue-300 rounded-md text-sm shadow-sm placeholder-gray-400
                            focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-blue-500" />
                  ) : (
                    <Eye className="h-4 w-4 text-blue-500" />
                  )}
                </button>
              </div>
            </div>
          </div>
          <button
            type="submit"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 mt-6"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Login
          </button>
        </form>
        <div className="mt-8 text-sm text-center">
          <p className="text-blue-600">New here?</p>
          <Link
            to="/signup"
            className="mt-2 w-full inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Create account
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Login;
