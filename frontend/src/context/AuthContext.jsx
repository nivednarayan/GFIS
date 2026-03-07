import React, { createContext, useContext, useState, useEffect } from "react";
import { authService } from "../services/authService";

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      const currentUser = await authService.verifyToken();
      if (currentUser) {
        setUser(currentUser);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  // Login function
  const login = async (aadhaar, fullName, mobileNumber) => {
    try {
      const response = await authService.login(aadhaar, fullName, mobileNumber);
      if (response.success) {
        setUser(response.user);
        setIsAuthenticated(true);
        return { success: true, user: response.user };
      } else {
        return { success: false, message: response.message };
      }
    } catch (error) {
      return { success: false, message: error.message };
    }
  };

  // Sign up function
  const signup = async (aadhaar, fullName, mobileNumber, email, district, state) => {
    try {
      const response = await authService.signup(
        aadhaar,
        fullName,
        mobileNumber,
        email,
        district,
        state
      );
      if (response.success) {
        setUser(response.user);
        setIsAuthenticated(true);
        return { success: true, user: response.user };
      } else {
        return { success: false, message: response.message };
      }
    } catch (error) {
      return { success: false, message: error.message };
    }
  };

  // Logout function
  const logout = () => {
    authService.logout();
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ user, loading, isAuthenticated, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

