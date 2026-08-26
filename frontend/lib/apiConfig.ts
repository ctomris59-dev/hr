/**
 * Central place for the backend API base URL.
 *
 * Local development: falls back to the FastAPI dev server at 127.0.0.1:8000.
 * Deployed (Vercel, etc.): set NEXT_PUBLIC_API_URL in the environment to the
 * public URL of your deployed backend, e.g. https://your-backend.onrender.com
 *
 * NOTE: this must be prefixed with NEXT_PUBLIC_ because it is read in
 * client-side ("use client") components/pages, not just on the server.
 */
export const API_BASE_URL: string =
  (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");
