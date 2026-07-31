import { API_BASE_URL, API_URL } from "./env";

const publicR2BaseUrl = (import.meta.env.VITE_R2_PUBLIC_BASE_URL || "").replace(/\/+$/, "");
const bundledFilenameOverrides = {
  "img_5761.jpeg": "IMG_5761.JPEG",
};

function sanitizeFilename(filename) {
  return String(filename || "image")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "image";
}

export function getSiteAssetUrl(filename) {
  const sanitizedFilename = sanitizeFilename(filename);
  const key = `site/assets/${sanitizedFilename}`;
  if (import.meta.env.DEV && !publicR2BaseUrl) {
    return `/${bundledFilenameOverrides[sanitizedFilename] || sanitizedFilename}`;
  }
  return publicR2BaseUrl
    ? `${publicR2BaseUrl}/${key}`
    : `${API_BASE_URL}/site-content/assets/${sanitizedFilename}`;
}

export function resolveSiteImageUrl(value, fallbackFilename = "bblogo.png") {
  const source = String(value || "").trim();
  if (!source) return getSiteAssetUrl(fallbackFilename);
  if (/^(?:https?:|data:|blob:)/i.test(source)) return source;
  if (source.startsWith("/api/site-content/assets/") && import.meta.env.DEV && !publicR2BaseUrl) {
    return getSiteAssetUrl(source.split("/").pop());
  }
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
    branding: content?.branding
      ? Object.fromEntries(
          Object.entries(content.branding).map(([key, value]) => [key, resolveSiteImageUrl(value)])
        )
      : content?.branding,
  };
}
