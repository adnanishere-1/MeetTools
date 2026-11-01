
import axios from "axios";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "development"
    ? "http://localhost:5000/api/v1"
    : "")
).replace(/\/+$/, "");

if (!API_BASE_URL) {
  throw new Error(
    "NEXT_PUBLIC_API_URL is missing. Please configure your backend API URL."
  );
}

const API = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 15000,

  headers: {
    Accept: "application/json",
  },
});

export default API;
