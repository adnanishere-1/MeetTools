
"use client";

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import API from "@/lib/api";

type UserRole = "user" | "admin";

interface AuthUser {
  id: string;
  _id?: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  credits?: number;
}

interface UserConsents {
  termsAndPrivacyAccepted: boolean;
  analyticsConsent: boolean;
  marketingConsent: boolean;
}

interface AuthResult {
  success: boolean;
  message?: string;
  data?: unknown;
}

interface AuthResponse {
  success?: boolean;
  message?: string;
  user?: AuthUser;
}

function getErrorMessage(
  error: unknown,
  fallback: string
): string {
  if (axios.isAxiosError(error)) {
    return (
      error.response?.data?.error?.message ||
      error.response?.data?.message ||
      error.message ||
      fallback
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}

function getDashboardPath(role: UserRole): string {
  return role === "admin"
    ? "/admin/dashboard"
    : "/dashboard";
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);

  const [isAuthenticated, setIsAuthenticated] =
    useState(false);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  // Check current session using HttpOnly cookie
  const checkAuth = useCallback(async () => {
    setLoading(true);

    try {
      const response = await API.get<AuthResponse>(
        "/api/v1/users/me",
        {
          withCredentials: true,
        }
      );

      const currentUser = response.data.user;

      if (!currentUser) {
        setUser(null);
        setIsAuthenticated(false);
        return null;
      }

      setUser(currentUser);
      setIsAuthenticated(true);

      return currentUser;
    } catch (err) {
      setUser(null);
      setIsAuthenticated(false);

      // 401 is expected when a visitor is not logged in
      if (
        !axios.isAxiosError(err) ||
        err.response?.status !== 401
      ) {
        console.error(
          "Session verification failed:",
          getErrorMessage(
            err,
            "Unable to verify session"
          )
        );
      }

      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Restore authentication from backend, not browser storage
  useEffect(() => {
    void checkAuth();
  }, [checkAuth]);

  // 1. Login
  const loginUser = async (
    email: string,
    password: string
  ): Promise<AuthResult> => {
    setLoading(true);
    setError(null);

    try {
      const response = await API.post<AuthResponse>(
        "/api/v1/auth/login",
        {
          email: email.trim().toLowerCase(),
          password,
        },
        {
          withCredentials: true,
        }
      );

      const loggedInUser = response.data.user;

      if (!loggedInUser) {
        throw new Error(
          "Login response did not include user data."
        );
      }

      // Backend sets meettools_token as HttpOnly cookie
      // No JWT is stored in JavaScript
      setUser(loggedInUser);
      setIsAuthenticated(true);

      window.location.replace(
        getDashboardPath(loggedInUser.role)
      );

      return {
        success: true,
        message: response.data.message,
      };
    } catch (err: unknown) {
      const errorMessage = getErrorMessage(
        err,
        "Login failed"
      );

      setError(errorMessage);
      setUser(null);
      setIsAuthenticated(false);

      return {
        success: false,
        message: errorMessage,
      };
    } finally {
      setLoading(false);
    }
  };

  // 2. Signup / Register
  const signupUser = async (
    fullName: string,
    email: string,
    password: string,
    consents: UserConsents
  ): Promise<AuthResult> => {
    setLoading(true);
    setError(null);

    try {
      const response = await API.post(
        "/api/v1/auth/register",
        {
          name: fullName.trim(),
          email: email.trim().toLowerCase(),
          password,
          termsAndPrivacyAccepted:
            consents.termsAndPrivacyAccepted,
          essentialCookies: true,
          analyticsConsent: consents.analyticsConsent,
          marketingConsent: consents.marketingConsent,
        },
        {
          withCredentials: true,
        }
      );

      return {
        success: true,
        message: response.data.message,
        data: response.data,
      };
    } catch (err: unknown) {
      const errorMessage = getErrorMessage(
        err,
        "Registration failed"
      );

      setError(errorMessage);

      return {
        success: false,
        message: errorMessage,
      };
    } finally {
      setLoading(false);
    }
  };

  // 3. Verify OTP
  const verifyOtp = async (
    email: string,
    otp: string
  ): Promise<AuthResult> => {
    setLoading(true);
    setError(null);

    try {
      const response = await API.post<AuthResponse>(
        "/api/v1/auth/verify-otp",
        {
          email: email.trim().toLowerCase(),
          otp: otp.trim(),
        },
        {
          withCredentials: true,
        }
      );

      // Verification and login are separate operations.
      // Only mark user authenticated if a valid session
      // has actually been established by the backend.
      const verifiedUser = response.data.user;

      if (verifiedUser) {
        const currentUser = await checkAuth();

        if (currentUser) {
          window.location.replace(
            getDashboardPath(currentUser.role)
          );

          return {
            success: true,
            message: response.data.message,
          };
        }
      }

      // If verify-otp does not set an auth cookie,
      // redirect user to login after verification.
      window.location.replace("/login");

      return {
        success: true,
        message:
          response.data.message ||
          "Email verified. Please log in.",
      };
    } catch (err: unknown) {
      const errorMessage = getErrorMessage(
        err,
        "OTP verification failed"
      );

      setError(errorMessage);

      return {
        success: false,
        message: errorMessage,
      };
    } finally {
      setLoading(false);
    }
  };

  // 4. Resend OTP
  const resendOtp = async (
    email: string
  ): Promise<AuthResult> => {
    setLoading(true);
    setError(null);

    try {
      const response = await API.post(
        "/api/v1/auth/resend-otp",
        {
          email: email.trim().toLowerCase(),
        },
        {
          withCredentials: true,
        }
      );

      return {
        success: true,
        message:
          response.data.message ||
          "OTP resent successfully",
      };
    } catch (err: unknown) {
      const errorMessage = getErrorMessage(
        err,
        "Failed to resend OTP"
      );

      setError(errorMessage);

      return {
        success: false,
        message: errorMessage,
      };
    } finally {
      setLoading(false);
    }
  };

  // 5. Logout
  const logoutUser = async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      await API.post(
        "/api/v1/auth/logout",
        {},
        {
          withCredentials: true,
        }
      );

      setUser(null);
      setIsAuthenticated(false);

      window.location.replace("/login");
    } catch (err: unknown) {
      const errorMessage = getErrorMessage(
        err,
        "Logout failed"
      );

      setError(errorMessage);
      console.error("Logout API error:", errorMessage);

      // Do not claim logout succeeded if the
      // backend failed to clear the auth cookie.
    } finally {
      setLoading(false);
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
    checkAuth,
  };
}
