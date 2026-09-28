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
      // Kept close to public/_headers so a policy violation shows up in
      // development rather than on the day it ships. Vite's dev client needs
      // inline scripts and a websocket, which production does not.
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data:",
        "connect-src 'self' ws: wss:",
        "frame-src https://verify.didit.me",
        "base-uri 'none'",
        "object-src 'none'",
      ].join('; '),
    },
    proxy: {
      '/graphql': 'http://localhost:3000',
      '/verification-session': 'http://localhost:3000',
      '/verification-status': 'http://localhost:3000',
      '/didit-webhook': 'http://localhost:3000',
    },
  },
})
