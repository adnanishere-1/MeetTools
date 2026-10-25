"use client";

import { useState, useEffect } from "react";
import API from "@/lib/api";

export function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("meettools_user");
    const storedToken = localStorage.getItem("meettools_token");

    if (storedUser && storedToken) {
      try {
        setUser(JSON.parse(storedUser));
        setIsAuthenticated(true);
      } catch (err) {
        console.error("Failed to parse user data from localStorage", err);
        logoutUser();
      }
    } else {
      setIsAuthenticated(false);
    }
    setLoading(false);
  }, []);

  // 1. Login Function
  const loginUser = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await API.post("/api/v1/auth/login", { email, password });
      
      const { user: userData, token } = response.data;

      localStorage.setItem("meettools_user", JSON.stringify(userData));
      localStorage.setItem("meettools_token", token);
      
      setUser(userData);
      setIsAuthenticated(true);
      setLoading(false);
      
      window.location.href = "/dashboard";
      return { success: true };
    } catch (err: any) {
      setLoading(false);
      const errorMsg = err.response?.data?.error?.message || err.response?.data?.message || err.message || "Login failed";
      setError(errorMsg);
      return { success: false, message: errorMsg };
    }
  };

  // 2. Register / Signup Function (Updated with user consents)
  const signupUser = async (
    fullName: string, 
    email: string, 
    password: string,
    consents: {
      termsAndPrivacyAccepted: boolean;
      analyticsConsent: boolean;
      marketingConsent: boolean;
    }
  ) => {
    setLoading(true);
    setError(null);
    try {
      const response = await API.post("/api/v1/auth/register", { 
        name: fullName, 
        email, 
        password,
        termsAndPrivacyAccepted: consents.termsAndPrivacyAccepted,
        essentialCookies: true,
        analyticsConsent: consents.analyticsConsent,
        marketingConsent: consents.marketingConsent
      });
      setLoading(false);
      return { success: true, data: response.data };
    } catch (err: any) {
      setLoading(false);
      const errorMsg = err.response?.data?.error?.message || err.response?.data?.message || err.message || "Registration failed";
      setError(errorMsg);
      return { success: false, message: errorMsg };
    }
  };

  // 3. Verify OTP Function
  const verifyOtp = async (email: string, otp: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await API.post("/api/v1/auth/verify-otp", { email, otp });
      const { user: userData, token } = response.data;

      localStorage.setItem("meettools_user", JSON.stringify(userData));
      localStorage.setItem("meettools_token", token);

      setUser(userData);
      setIsAuthenticated(true);
      setLoading(false);

      window.location.href = "/dashboard";
      return { success: true };
    } catch (err: any) {
      setLoading(false);
      const errorMsg = err.response?.data?.error?.message || err.response?.data?.message || err.message || "OTP Verification failed";
      setError(errorMsg);
      return { success: false, message: errorMsg };
    }
  };

  // 4. Resend OTP Function
  const resendOtp = async (email: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await API.post("/api/v1/auth/resend-otp", { email });
      setLoading(false);
      return { success: true, message: response.data.message || "OTP resent successfully" };
    } catch (err: any) {
      setLoading(false);
      const errorMsg = err.response?.data?.error?.message || err.response?.data?.message || err.message || "Failed to resend OTP";
      setError(errorMsg);
      return { success: false, message: errorMsg };
    }
  };

  // 5. Logout Function
  const logoutUser = async () => {
    try {
      await API.post("/api/v1/auth/logout");
    } catch (err) {
      console.error("Logout API error", err);
    } finally {
      localStorage.removeItem("meettools_user");
      localStorage.removeItem("meettools_token");
      setUser(null);
      setIsAuthenticated(false);
      window.location.href = "/login";
    }
  };

  return {
    user,
    isAuthenticated,
    loading,
    error,
    loginUser,
    signupUser,
    verifyOtp,
    resendOtp,
    logoutUser,
  };
}