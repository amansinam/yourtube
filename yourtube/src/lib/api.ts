import axios from "axios";

// Keep API requests same-origin so session cookies work across browsers that
// block third-party cookies. Next.js rewrites this path to the backend.
export const BACKEND_URL = "/api/backend";

const api = axios.create({
  baseURL: BACKEND_URL,
  withCredentials: true,
});

export default api;
