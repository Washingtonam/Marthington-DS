import axios from "axios";

const api = axios.create({
  baseURL: "https://xcombinator.onrender.com",
});

api.interceptors.request.use((config) => {

  const email = localStorage.getItem("email");

  if (email) {
    config.headers.email = email;
  }

  return config;
});

export default api;