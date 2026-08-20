import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: true,
    // Mirrors public/_headers so framing behaves the same in dev as in
    // production: everything is deny, /embed/* is the exception.
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
    proxy: {
      '/graphql': 'http://localhost:3000',
      '/verification-session': 'http://localhost:3000',
      '/verification-status': 'http://localhost:3000',
      '/didit-webhook': 'http://localhost:3000',
    },
  },
})
