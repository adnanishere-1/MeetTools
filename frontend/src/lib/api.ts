import axios from "axios";

// Environment variable se Backend URL uthayega (Fallback: localhost:5000)
const API = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Cookies / Sessions ke liye
});

// Request interceptor (JWT Token automatic attach karne ke liye)
API.interceptors.request.use((config) => {
  const token = typeof window !== "undefined" ? localStorage.getItem("meettools_token") : null;
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default API;