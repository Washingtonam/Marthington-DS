import axios from "axios";

const api = axios.create({
  baseURL: "https://xcombinator.onrender.com/api", // Base points directly to /api
});

// Automatically inject JWT Token on every single outgoing network call
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;