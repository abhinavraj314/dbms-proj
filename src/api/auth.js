// auth.js

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

export const signup = async (userData) => {
  try {
    console.log("Attempting signup with data:", userData); // Debug log

    const response = await fetch(`${API_BASE_URL}/api/signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userData),
      credentials: "include",
    });

    // Log the raw response for debugging
    console.log("Response status:", response.status);

    const responseData = await response.json();
    console.log("Response data:", responseData);

    if (!response.ok) {
      throw new Error(responseData.message || "Signup failed");
    }

    return responseData;
  } catch (error) {
    console.error("Signup error:", error);
    throw error;
  }
};
export const login = async (username, email, password) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, email, password }),
      credentials: "include", // This ensures cookies are sent with the request
    });

    const responseData = await response.json();

    if (!response.ok) {
      throw new Error(responseData.message || "Login failed");
    }

    console.log("Login successful:", responseData);
    return responseData.user;
  } catch (error) {
    console.error("Login error:", error);
    throw error; // Re-throw the error for the component to handle
  }
};

export const logout = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/logout`, {
      method: "POST",
      credentials: "include", // This ensures cookies are sent with the request
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Logout failed");
    }

    console.log("Logout successful");
  } catch (error) {
    console.error("Logout error:", error);
    throw error;
  }
};
