// auth.js

const API_BASE_URL = "http://localhost:5000"; // Adjust this to match your backend URL

export const signup = async (username, email, password) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username,
        email,
        password,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Signup failed");
    }

    const responseData = await response.json();

    // Send welcome email
    try {
      await fetch(`${API_BASE_URL}/api/send-welcome-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          username,
        }),
      });
    } catch (emailError) {
      console.error("Error sending welcome email:", emailError);
      // Continue with signup even if email fails
    }

    return responseData;
  } catch (error) {
    console.error("Signup error:", error.message);
    throw new Error(error.message);
  }
};

export const login = async (username, email, password) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username,
        email,
        password,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Login failed");
    }

    const responseData = await response.json();
    return responseData;
  } catch (error) {
    console.error("Login error:", error.message);
    throw new Error(error.message);
  }
};
