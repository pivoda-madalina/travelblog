/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// In Docker Compose the backend is reachable by its service name; locally it is on port 8000.
const backend = process.env.BACKEND_URL ?? 'http://localhost:8000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Docker Compose turns this on, because file change events from the host do not reach it.
    watch: { usePolling: process.env.VITE_USE_POLLING === 'true' },
    // Keep the browser's Host header, so Django sees localhost:5173 for ALLOWED_HOSTS and CSRF.
    proxy: {
      '/api': { target: backend, changeOrigin: false },
      '/media': { target: backend, changeOrigin: false },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
});
