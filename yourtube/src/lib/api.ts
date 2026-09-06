import axios from "axios";

// NEXT_PUBLIC_BACKEND_URL must point directly at the Render backend, e.g.
// https://youtube2-0-backend-ucpm.onrender.com
// There is no need for a Next.js API proxy route (/api/video.js) - the
// frontend calls the backend directly through this axios instance.
export const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

const api = axios.create({
  baseURL: BACKEND_URL,
});

export default api;
