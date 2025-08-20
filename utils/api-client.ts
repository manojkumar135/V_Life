// utils/api-client.ts
import axios from "axios";

const api = axios.create({
  // This is the important part: we are calling a local path, not the backend directly.
  baseURL: "/api",
  withCredentials: true,
});

export default api;