import axios from "axios";

// =====================================
// API Base URL Configuration
// =====================================

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "development"
    ? "http://localhost:5000/api/v1"
    : "https://api.meetools.online/api/v1");

// =====================================
// Validate and Normalize API URL
// =====================================

const normalizedBaseURL = API_BASE_URL.trim().replace(/\/+$/, "");

if (
  !normalizedBaseURL.startsWith("http://") &&
  !normalizedBaseURL.startsWith("https://")
) {
  throw new Error("Invalid API_BASE_URL configuration.");
}

// =====================================
// Axios Instance
// =====================================

const API = axios.create({
  baseURL: normalizedBaseURL,
  withCredentials: true,
  // Render free instances can take longer to respond after sleeping.
  timeout: 60000,
  headers: {
    Accept: "application/json",
  },
});

// =====================================
// Auth Scope Header
// Admin pages use the admin session cookie,


API.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const path = window.location.pathname;

    const scope =
      path === "/admin" || path.startsWith("/admin/")
        ? "admin"
        : "user";

    config.headers.set("X-Auth-Scope", scope);
  }

  return config;
});

export default API;