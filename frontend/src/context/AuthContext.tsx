"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";

import axios from "axios";
import API from "@/lib/api";

export type UserRole = "user" | "admin";

export interface AuthUser {
  id?: string;
  _id?: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  credits?: number;
}

export interface UserConsents {
  termsAndPrivacyAccepted: boolean;
  analyticsConsent: boolean;
  marketingConsent: boolean;
}

export interface AuthResult {
  success: boolean;
  message?: string;
  data?: unknown;
}

interface AuthApiResponse {
  success?: boolean;
  message?: string;
  user?: AuthUser;
  data?: {
    user?: AuthUser;
  };
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;

  loginUser: (
    email: string,
    password: string
  ) => Promise<AuthResult>;

  signupUser: (
    fullName: string,
    email: string,
    password: string,
    consents: UserConsents
  ) => Promise<AuthResult>;

  verifyOtp: (
    email: string,
    otp: string
  ) => Promise<AuthResult>;

  resendOtp: (
    email: string
  ) => Promise<AuthResult>;

  logoutUser: () => Promise<void>;

  checkAuth: () => Promise<AuthUser | null>;

  // Compatibility with existing components
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<
  AuthContextType | undefined
>(undefined);

function getErrorMessage(
  error: unknown,
  fallback: string
): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | {
          message?: string;
          error?: {
            message?: string;
          };
        }
      | undefined;

    return (
      data?.error?.message ||
      data?.message ||
      (error.response?.status === 401
        ? "Invalid email or password."
        : undefined) ||
      fallback
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}

function extractUser(
  response: AuthApiResponse
): AuthUser | null {
  const candidate =
    response.user ??
    response.data?.user;

  if (
    !candidate ||
    typeof candidate !== "object" ||
    (candidate.role !== "user" &&
      candidate.role !== "admin")
  ) {
    return null;
  }

  return candidate;
}

function getDashboardPath(
  role: UserRole
): string {
  return role === "admin"
    ? "/admin/dashboard"
    : "/dashboard";
}

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [user, setUser] =
    useState<AuthUser | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const initialCheckStarted =
    useRef(false);

  const isAuthenticated =
    user !== null;

  // ==================================
  // Restore session
  // ==================================

  const checkAuth =
    useCallback(async (): Promise<
      AuthUser | null
    > => {
      setLoading(true);

      try {
        const response =
          await API.get<AuthApiResponse>(
            "/api/v1/users/me"
          );

        const currentUser =
          extractUser(response.data);

        setUser(currentUser);

        return currentUser;
      } catch (err: unknown) {
        setUser(null);

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

  useEffect(() => {
    if (initialCheckStarted.current) return;
    initialCheckStarted.current = true;

    // Public pages support guest use and do not need an initial
    // protected /users/me request.
    const path = window.location.pathname;
    const isPublicPage =
      path === "/" ||
      path === "/login" ||
      path === "/signup" ||
      path === "/verify-otp" ||
      path === "/tools" ||
      path.startsWith("/tools/");

    if (isPublicPage) {
      queueMicrotask(() => {
        setLoading(false);
      });
      return;
    }

    queueMicrotask(() => {
      if (initialCheckStarted.current) {
        void checkAuth();
      }
    });
  }, [checkAuth]);

  // ==================================
  // Login
  // ==================================

  const loginUser = async (
    email: string,
    password: string
  ): Promise<AuthResult> => {
    setLoading(true);
    setError(null);

    try {
      const response =
        await API.post<AuthApiResponse>(
          "/api/v1/auth/login",
          {
            email:
              email.trim().toLowerCase(),
            password,
          }
        );

      if (response.data.success === false) {
        throw new Error(
          response.data.message ||
            "Login failed."
        );
      }

      const loggedInUser =
        extractUser(response.data);

      if (!loggedInUser) {
        throw new Error(
          "Login response did not include valid user data."
        );
      }

      setUser(loggedInUser);

      window.location.replace(
        getDashboardPath(
          loggedInUser.role
        )
      );

      return {
        success: true,
        message:
          response.data.message,
      };
    } catch (err: unknown) {
      const message = getErrorMessage(
        err,
        "Login failed. Please try again."
      );

      setError(message);
      setUser(null);

      return {
        success: false,
        message,
      };
    } finally {
      setLoading(false);
    }
  };

  // ==================================
  // Signup
  // ==================================

  const signupUser = async (
    fullName: string,
    email: string,
    password: string,
    consents: UserConsents
  ): Promise<AuthResult> => {
    setLoading(true);
    setError(null);

    try {
      if (!consents.termsAndPrivacyAccepted) {
        throw new Error(
          "You must accept the Terms and Privacy Policy"
        );
      }

      const response = await API.post<AuthApiResponse>(
        "/api/v1/auth/register",
        {
          name: fullName.trim(),
          email:
            email.trim().toLowerCase(),
          password,

          consents: {
            essentialCookies: true,
            termsAndPrivacyAccepted:
              consents.termsAndPrivacyAccepted,
            analyticsConsent:
              consents.analyticsConsent,
            marketingConsent:
              consents.marketingConsent,
          },
        }
      );

      if (response.data.success === false) {
        throw new Error(
          response.data.message || "Registration failed."
        );
      }

      return {
        success: true,
        message: response.data.message,
        data: response.data,
      };
    } catch (err: unknown) {
      const message = getErrorMessage(
        err,
        "Registration failed."
      );

      setError(message);

      return {
        success: false,
        message,
      };
    } finally {
      setLoading(false);
    }
  };

  // ==================================
  // Verify OTP
  // ==================================

  const verifyOtp = async (
    email: string,
    otp: string
  ): Promise<AuthResult> => {
    setLoading(true);
    setError(null);

    try {
      const response =
        await API.post<AuthApiResponse>(
          "/api/v1/auth/verify-otp",
          {
            email:
              email.trim().toLowerCase(),
            otp: otp.trim(),
          }
        );

      if (response.data.success === false) {
        throw new Error(
          response.data.message ||
            "OTP verification failed."
        );
      }

      // Check whether verification also
      // established an authenticated session.
      const currentUser =
        await checkAuth();

      if (currentUser) {
        window.location.replace(
          getDashboardPath(
            currentUser.role
          )
        );
      } else {
        window.location.replace(
          "/login"
        );
      }

      return {
        success: true,
        message:
          response.data.message ||
          "Email verified successfully.",
      };
    } catch (err: unknown) {
      const message = getErrorMessage(
        err,
        "OTP verification failed."
      );

      setError(message);

      return {
        success: false,
        message,
      };
    } finally {
      setLoading(false);
    }
  };

  // ==================================
  // Resend OTP
  // ==================================

  const resendOtp = async (
    email: string
  ): Promise<AuthResult> => {
    setLoading(true);
    setError(null);

    try {
      const response = await API.post(
        "/api/v1/auth/resend-otp",
        {
          email:
            email.trim().toLowerCase(),
        }
      );

      return {
        success: true,
        message:
          response.data?.message ||
          "OTP resent successfully.",
      };
    } catch (err: unknown) {
      const message = getErrorMessage(
        err,
        "Failed to resend OTP."
      );

      setError(message);

      return {
        success: false,
        message,
      };
    } finally {
      setLoading(false);
    }
  };

  // ==================================
  // Logout
  // ==================================

  const logoutUser =
    useCallback(async (): Promise<void> => {
      setLoading(true);
      setError(null);

      try {
        await API.post(
          "/api/v1/auth/logout",
          {}
        );

        setUser(null);

        window.location.replace(
          "/login"
        );
      } catch (err: unknown) {
        const message = getErrorMessage(
          err,
          "Logout failed."
        );

        setError(message);

        console.error(
          "Logout failed:",
          message
        );
      } finally {
        setLoading(false);
      }
    }, []);

  const refreshUser =
    useCallback(async (): Promise<void> => {
      await checkAuth();
    }, [checkAuth]);

  return (
    <AuthContext.Provider
      value={{
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
        refreshUser,
        logout: logoutUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context =
    useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used within an AuthProvider"
    );
  }

  return context;
}