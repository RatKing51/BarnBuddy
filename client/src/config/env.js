function normalizeApiUrl(value) {
  const rawUrl = (value || "http://localhost:5000").trim();

  if (/^https?:\/\//i.test(rawUrl)) {
    return rawUrl.replace(/\/$/, "");
  }

  return `https://${rawUrl.replace(/^\/+/, "").replace(/\/$/, "")}`;
}

export const API_URL = normalizeApiUrl(import.meta.env.VITE_API_URL);
export const API_BASE_URL = `${API_URL}/api`;
export const CLERK_PREMIUM_PLAN_ID = (import.meta.env.VITE_CLERK_PREMIUM_PLAN_ID || "").trim();
export const CLERK_PREMIUM_PLAN_SLUG = (import.meta.env.VITE_CLERK_PREMIUM_PLAN_SLUG || "premium").trim();
export const CLERK_PREMIUM_FEATURE_SLUG = (import.meta.env.VITE_CLERK_PREMIUM_FEATURE_SLUG || "premium_access").trim();
export const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS || "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);
export const ADMIN_CLERK_USER_IDS = (import.meta.env.VITE_ADMIN_CLERK_USER_IDS || "")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean);
