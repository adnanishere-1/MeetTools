
"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

import axios from "axios";
import API from "@/lib/api";

// User data from Express backend
interface AuthUser {
  id?: string;
  _id?: string;
  name?: string;
  email?: string;
  role: "user" | "admin";
  avatar?: string;
  credits?: number;
}

// Context interface
interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<
  AuthContextType | undefined
>(undefined);

// Auth Provider
export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [user, setUser] =
    useState<AuthUser | null>(null);

  const [loading, setLoading] = useState(true);

  // Verify session with backend using HttpOnly cookie
  const refreshUser = useCallback(async () => {
    setLoading(true);

    try {
      const response = await API.get(
        "/api/v1/users/me",
        {
          withCredentials: true,
        }
      );

      const userData =
        response.data?.user || response.data;

      if (
        !userData ||
        (userData.role !== "user" &&
          userData.role !== "admin")
      ) {
        setUser(null);
        return;
      }

      setUser(userData);
    } catch (error: unknown) {
      setUser(null);

      // A 401 is normal for a visitor who is not logged in
      if (
        !axios.isAxiosError(error) ||
        error.response?.status !== 401
      ) {
        console.error(
          "Failed to verify user session:",
          error
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Restore user session from backend on page load
  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  // Logout and clear HttpOnly cookie through backend
  const logout = useCallback(async (): Promise<void> => {
    try {
      await API.post(
        "/api/v1/auth/logout",
        {},
        {
          withCredentials: true,
        }
      );

      setUser(null);

      // Redirect after successful backend logout
      window.location.replace("/login");
    } catch (error: unknown) {
      console.error(
        "Logout failed. Please try again:",
        error
      );

      // Don't claim logout succeeded if the
      // server did not clear the session cookie.
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Access authentication context
export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used within an AuthProvider"
    );
  }

  return context;
}
