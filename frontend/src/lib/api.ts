
import axios from "axios";

// Express backend URL
// Development fallback: http://localhost:5000
const BACKEND_URL = (
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://localhost:5000"
).replace(/\/$/, "");

// Central Axios instance
const API = axios.create({
  baseURL: BACKEND_URL,

  // HttpOnly cookies automatically send hon gi
  withCredentials: true,

  timeout: 30000,

  headers: {
    Accept: "application/json",
  },
});

export default API;
