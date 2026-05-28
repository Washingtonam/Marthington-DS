import axios from "axios";

const apiUrl = import.meta.env.VITE_API_URL;
if (!apiUrl) {
  throw new Error(
    "Missing required environment variable VITE_API_URL. Set it to your backend API URL."
  );
}

const api = axios.create({
  // Ensure this points to the root URL (without /api)
  // because your server.js routes all start with /api
  baseURL: apiUrl,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// 1. Request Interceptor: Automatically injects JWT Token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      // Remove potential quotes if saved as a string in localStorage
      config.headers.Authorization = `Bearer ${token.replace(/['"]+/g, '')}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 2. Response Interceptor: Globally handle session expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // If the server responds with 401 (Unauthorized) or 403 (Forbidden), 
    // it likely means the token has expired or is invalid.
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      // Clear local storage and redirect to login
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      
      // Redirect to login page
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;