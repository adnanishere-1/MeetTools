
import axios from "axios";

const API = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
  timeout: 15000,

  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

export default API;
