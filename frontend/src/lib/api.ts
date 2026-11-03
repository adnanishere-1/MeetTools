
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
  timeout: 30000,
  headers: {
    Accept: "application/json",
  },
});

export default API;
