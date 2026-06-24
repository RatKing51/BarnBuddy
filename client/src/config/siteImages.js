import { API_BASE_URL, API_URL } from "./env";

const publicR2BaseUrl = (import.meta.env.VITE_R2_PUBLIC_BASE_URL || "").replace(/\/+$/, "");

function sanitizeFilename(filename) {
  return String(filename || "image")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "image";
}

export function getSiteAssetUrl(filename) {
  const key = `site/assets/${sanitizeFilename(filename)}`;
  return publicR2BaseUrl
    ? `${publicR2BaseUrl}/${key}`
    : `${API_BASE_URL}/site-content/assets/${sanitizeFilename(filename)}`;
}

export function resolveSiteImageUrl(value, fallbackFilename = "bblogo.png") {
  const source = String(value || "").trim();
  if (!source) return getSiteAssetUrl(fallbackFilename);
  if (/^(?:https?:|data:|blob:)/i.test(source)) return source;
  if (source.startsWith("/api/")) return `${API_URL}${source}`;
  return getSiteAssetUrl(source.split("/").pop());
}

export function normalizeSiteContentImages(content) {
  return {
    ...content,
    newsPosts: Array.isArray(content?.newsPosts)
      ? content.newsPosts.map((post) => ({ ...post, image: resolveSiteImageUrl(post.image) }))
      : content?.newsPosts,
    carouselSlides: Array.isArray(content?.carouselSlides)
      ? content.carouselSlides.map((slide) => ({ ...slide, image: resolveSiteImageUrl(slide.image) }))
      : content?.carouselSlides,
  };
}
