
import axios from "axios";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "development"
    ? "http://localhost:5000/api/v1"
    : "https://api.meetools.online/api/v1");

const API = axios.create({
  baseURL: API_BASE_URL.replace(/\/+$/, ""),
  withCredentials: true,
  timeout: 15000,
  headers: {
    Accept: "application/json",
  },
});

export default API;
