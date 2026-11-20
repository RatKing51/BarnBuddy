import { defineConfig, loadEnv } from 'vite'
import process from 'node:process'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const loadedEnv = loadEnv(mode, process.cwd(), "");
  const apiUrl = (loadedEnv.VITE_API_URL || process.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "");
  const apiOrigin = new URL(apiUrl.includes("://") ? apiUrl : `https://${apiUrl}`).origin;
  const contentSecurityPolicy = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self' https://*.clerk.accounts.dev https://*.clerk.com https://clerk.barnbuddy.pro https://checkout.stripe.com",
    "script-src 'self' https://*.clerk.accounts.dev https://*.clerk.com https://clerk.barnbuddy.pro https://js.stripe.com https://challenges.cloudflare.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https:",
    `connect-src 'self' ${apiOrigin} https://clerk.accounts.dev https://*.clerk.accounts.dev https://*.clerk.com https://clerk.barnbuddy.pro https://api.stripe.com wss://*.clerk.accounts.dev wss://*.clerk.com`,
    "frame-src 'self' https://clerk.accounts.dev https://*.clerk.accounts.dev https://*.clerk.com https://clerk.barnbuddy.pro https://checkout.stripe.com https://js.stripe.com https://challenges.cloudflare.com",
    "worker-src 'self' blob:",
  ].join('; ');

  return {
    plugins: [react(), tailwindcss()],
    preview: {
      host: "0.0.0.0",
      headers: {
        "Content-Security-Policy": contentSecurityPolicy,
        "Permissions-Policy": "camera=(), geolocation=(), microphone=(), usb=()",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
      },
      allowedHosts: ["barnbuddy.pro", "www.barnbuddy.pro"],
    },
  };
});
