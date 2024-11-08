import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, Sparkles } from "lucide-react";
import { signup } from "../api/auth";

function SignUp() {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    studentId: "",
    phone: "",
    department: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // List of departments
  const departments = [
    "Computer Science",
    "Electronics",
    "Mechanical",
    "Civil",
    "Biotechnology",
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Phone number validation
    if (name === "phone") {
      // Only allow digits and limit to 10 characters
      const sanitizedValue = value.replace(/\D/g, "").slice(0, 10);
      setFormData((prev) => ({ ...prev, phone: sanitizedValue }));
      return;
    }

    // Student ID validation
    if (name === "studentId") {
      // Allow only alphanumeric characters
      const sanitizedValue = value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 20);
      setFormData((prev) => ({ ...prev, studentId: sanitizedValue }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    if (!formData.phone.match(/^\d{10}$/)) {
      setError("Please enter a valid 10-digit phone number");
      return false;
    }
    if (!formData.studentId) {
      setError("Student ID is required");
      return false;
    }
    if (!formData.department) {
      setError("Please select your department");
      return false;
    }
    return true;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validateForm()) return;

    try {
      const user = await signup({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        studentId: formData.studentId,
        phone: formData.phone,
        department: formData.department,
      });

      if (user) {
        console.log("Sign up successful:", user);
        navigate("/dashboard");
      } else {
        setError("Sign up failed. Please try again.");
      }
    } catch (err) {
      console.error("Sign up error:", err);
      setError(
        err.message || "An error occurred during sign up. Please try again."
      );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-blue-700 to-black">
      <div className="w-full max-w-md bg-white/90 backdrop-blur-sm shadow-xl rounded-lg p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-blue-700">
            PESU Fest - SIGN UP
          </h2>
          <p className="text-blue-600">Create your account</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Username field */}
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-blue-700"
              >
                Full Name
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="mt-1 block w-full px-3 py-2 bg-white border border-blue-300 rounded-md text-sm shadow-sm placeholder-gray-400
                          focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="Enter your full name"
                value={formData.username}
                onChange={handleChange}
              />
            </div>

            {/* Student ID field */}
            <div>
              <label
                htmlFor="studentId"
                className="block text-sm font-medium text-blue-700"
              >
                Student ID
              </label>
              <input
                id="studentId"
                name="studentId"
                type="text"
                required
                className="mt-1 block w-full px-3 py-2 bg-white border border-blue-300 rounded-md text-sm shadow-sm placeholder-gray-400
                          focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="Enter your student ID"
                value={formData.studentId}
                onChange={handleChange}
              />
            </div>

            {/* Email field */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-blue-700"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="mt-1 block w-full px-3 py-2 bg-white border border-blue-300 rounded-md text-sm shadow-sm placeholder-gray-400
                          focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            {/* Phone field */}
            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-medium text-blue-700"
              >
                Phone Number
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                required
                className="mt-1 block w-full px-3 py-2 bg-white border border-blue-300 rounded-md text-sm shadow-sm placeholder-gray-400
                          focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="Enter 10-digit phone number"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>

            {/* Department field */}
            <div>
              <label
                htmlFor="department"
                className="block text-sm font-medium text-blue-700"
              >
                Department
              </label>
              <select
                id="department"
                name="department"
                required
                className="mt-1 block w-full px-3 py-2 bg-white border border-blue-300 rounded-md text-sm shadow-sm
                          focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={formData.department}
                onChange={handleChange}
              >
                <option value="">Select your department</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            {/* Password field */}
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
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  className="block w-full px-3 py-2 bg-white border border-blue-300 rounded-md text-sm shadow-sm placeholder-gray-400
                            focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="Create a password"
                  value={formData.password}
                  onChange={handleChange}
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

          {error && <p className="mt-2 text-red-600 text-sm">{error}</p>}

          <button
            type="submit"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 mt-6"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Create Account
          </button>
        </form>

        <p className="mt-8 text-sm text-center text-blue-600">
          Already have an account?{" "}
          <Link
            to="/"
            className="font-medium text-blue-600 hover:text-blue-500"
          >
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default SignUp;
