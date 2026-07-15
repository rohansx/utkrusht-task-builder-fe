import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// When VITE_API_BASE is empty (local dev), the app calls relative /api/* and
// this dev-server proxy forwards them to the backend — same-origin in the
// browser, so no CORS needed while developing. In a production build you set
// VITE_API_BASE to the deployed backend URL and calls go cross-origin (the
// backend sends CORS headers).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const proxyTarget = env.VITE_DEV_PROXY_TARGET || 'http://127.0.0.1:8000'
  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': { target: proxyTarget, changeOrigin: true },
      },
    },
  }
})
