"tsx"
"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import axios from "axios";

interface AuthContextType {
  user: any;
  loading: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem("meettools_token");
      if (!token) {
        setLoading(false);
        return;
      }

      // Real backend profile verification endpoint
      const response = await axios.get("/api/v1/users/me", {
        headers: { Authorization: `Bearer ${token}` }
      });

      setUser(response.data?.user || response.data);
    } catch (error) {
      console.error("Session expired or invalid token:", error);
      localStorage.removeItem("meettools_token");
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const logout = async () => {
    try {
      await axios.post("/api/v1/auth/logout");
    } catch (e) {
      console.error("Logout error:", e);
    }
    localStorage.removeItem("meettools_token");
    setUser(null);
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}