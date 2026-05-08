import axios from "axios";

const API = axios.create({
  baseURL: "https://xcombinator.onrender.com/api",
});

export default API;