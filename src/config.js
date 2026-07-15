// Backend API base URL.
//
// Empty in local dev → the app calls relative /api/* and the Vite dev proxy
// forwards to the backend (same-origin, no CORS). In a production build,
// VITE_API_BASE is baked in and points at the deployed backend (cross-origin;
// the backend sends CORS headers). Trailing slash trimmed so `${API_BASE}/api`
// is always well-formed.
export const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/+$/, '')
