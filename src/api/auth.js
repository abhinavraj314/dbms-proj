// src/api/auth.js

export const login = async (username, password) => {
  try {
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (response.ok) {
      const data = await response.json();
      return data.user;
    }
    const errorData = await response.json();
    throw new Error(errorData.message || "Login failed");
  } catch (error) {
    console.error("Login error:", error);
    throw error;
  }
};

export const signup = async (username, password) => {
  try {
    const response = await fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (response.ok) {
      const data = await response.json();
      return data.user;
    }
    const errorData = await response.json();
    throw new Error(errorData.message || "Signup failed");
  } catch (error) {
    console.error("Signup error:", error);
    throw error;
  }
};

export const logout = async () => {
  try {
    const response = await fetch("/api/logout", { method: "POST" });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Logout failed");
    }
  } catch (error) {
    console.error("Logout error:", error);
    throw error;
  }
};

export const getUser = async () => {
  try {
    const response = await fetch("/api/user");
    if (response.ok) {
      const data = await response.json();
      return data.user;
    }
    return null;
  } catch (error) {
    console.error("Get user error:", error);
    return null;
  }
};
