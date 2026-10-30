
import axios from "axios";

const API = axios.create({
  baseURL: "/",
  withCredentials: true,
  timeout: 15000,

  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

export default API;
