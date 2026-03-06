const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const authService = {
  // Login with Aadhaar
  login: async (aadhaar, fullName, mobileNumber) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          aadhaar,
          fullName,
          mobileNumber,
        }),
      });

      const data = await response.json();
      if (data.success) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
      }
      return data;
    } catch (error) {
      console.error("Login service error:", error);
      return {
        success: false,
        message: "Unable to connect to server. Please check your connection.",
      };
    }
  },

  // Sign up new user
  signup: async (aadhaar, fullName, mobileNumber, email, district, state) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          aadhaar,
          fullName,
          mobileNumber,
          email,
          district,
          state,
        }),
      });

      const data = await response.json();
      if (data.success) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
      }
      return data;
    } catch (error) {
      console.error("Signup service error:", error);
      return {
        success: false,
        message: "Unable to connect to server. Please check your connection.",
      };
    }
  },

  // Logout
  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  },

  // Verify token and get current user
  verifyToken: async () => {
    const token = localStorage.getItem("token");
    if (!token) return null;

    try {
      const response = await fetch(`${API_BASE_URL}/auth/verify`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        localStorage.setItem("user", JSON.stringify(data.user));
        return data.user;
      } else {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        return null;
      }
    } catch (error) {
      console.error("Token verification error:", error);
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      return null;
    }
  },

  // Get stored user
  getUser: () => {
    const user = localStorage.getItem("user");
    return user ? JSON.parse(user) : null;
  },

  // Get stored token
  getToken: () => localStorage.getItem("token"),

  // Check if user is authenticated
  isAuthenticated: () => {
    return !!localStorage.getItem("token");
  },

  // Get user by Aadhaar
  getUserByAadhaar: async (aadhaar) => {
    const response = await fetch(`${API_BASE_URL}/auth/user/${aadhaar}`);
    return await response.json();
  },
};

export default authService;


