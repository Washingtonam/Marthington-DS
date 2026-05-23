import axios from "axios";

const api = axios.create({
  baseURL: "https://xcombinator.onrender.com/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Automatically inject JWT Token on every outgoing network call
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    // Only set header if token exists
    if (token) {
      // Remove potential quotes if saved as a string in localStorage
      config.headers.Authorization = `Bearer ${token.replace(/['"]+/g, '')}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;