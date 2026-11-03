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

// FIXED: Tell the backend which session (admin or user) this
// request belongs to, so the correct cookie is read when both
// accounts are logged in on the same browser.
API.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const pathname = window.location.pathname;

    const isAdminArea =
      pathname === "/admin" ||
      pathname.startsWith("/admin/");

    config.headers["X-Active-Role"] =
      isAdminArea ? "admin" : "user";
  }

  return config;
});

export default API;