function normalizeApiUrl(value) {
  const rawUrl = (value || "http://localhost:5000").trim();

  if (/^https?:\/\//i.test(rawUrl)) {
    return rawUrl.replace(/\/$/, "");
  }

  return `https://${rawUrl.replace(/^\/+/, "").replace(/\/$/, "")}`;
}

export const API_URL = normalizeApiUrl(import.meta.env.VITE_API_URL);
export const API_BASE_URL = `${API_URL}/api`;
