import axios from "axios";

const api = axios.create({
  baseURL: "https://xcombinator.onrender.com",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");
  const email = localStorage.getItem("email");

  // 1. Pass the Auth Bearer token if your backend requires it
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // 2. Pass the role so the backend can verify permissions
  if (role) {
    config.headers["X-User-Role"] = role; // Custom header for roles
  }

  // 3. Fallback/Verification Email header for your current middleware
  if (email) {
    config.headers["X-Email-Verification"] = email;
  }

  return config;
}, (error) => {
  return Promise.reject(error);
});

export default api;