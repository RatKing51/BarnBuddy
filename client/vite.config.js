import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  preview: {
    host: "0.0.0.0",
    headers: {
      "Content-Security-Policy": "base-uri 'self'; frame-ancestors 'none'; object-src 'none'",
      "Permissions-Policy": "camera=(), geolocation=(), microphone=(), usb=()",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
    },
    allowedHosts: [
      "barnbuddy.pro",
      "www.barnbuddy.pro"
    ]
  }
})
