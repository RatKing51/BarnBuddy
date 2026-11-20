import { createReadStream, existsSync, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const clientDirectory = path.dirname(fileURLToPath(import.meta.url));
const outputDirectory = path.join(clientDirectory, "dist");
const port = Number(process.env.PORT || 4173);
const siteApiUrl = (process.env.VITE_API_URL || "https://api.barnbuddy.pro").replace(/\/$/, "");
const siteApiOrigin = new URL(siteApiUrl.includes("://") ? siteApiUrl : `https://${siteApiUrl}`).origin;
let publicNewsCache = null;
let publicNewsCacheUntil = 0;
let publicNewsUnavailableUntil = 0;
let publicNewsRequest = null;

if (!existsSync(path.join(outputDirectory, "index.html"))) {
  throw new Error("client/dist is missing. Run npm run build before starting BarnBuddy.");
}

const publicRoutes = new Set([
  "/",
  "/aboutus",
  "/pricing",
  "/news",
  "/contact",
  "/help",
  "/terms",
  "/privacy",
  "/refunds",
  "/cancellation",
  "/cookies",
  "/data-retention",
  "/accessibility",
  "/security",
  "/status",
  "/login",
  "/signup",
  "/docs",
  "/termsofserviceandprivacypolicy",
]);

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".xml": "application/xml; charset=utf-8",
};

function normalizeRoute(pathname) {
  if (pathname === "/") return pathname;
  return pathname.replace(/\/+$/, "") || "/";
}

function isPrivateRoute(route) {
  return ["/dashboard", "/admin", "/advisor", "/settings"].some(
    (prefix) => route === prefix || route.startsWith(`${prefix}/`)
  );
}

function routeHtmlPath(route) {
  if (publicRoutes.has(route)) {
    return route === "/" ? path.join(outputDirectory, "index.html") : path.join(outputDirectory, route.slice(1), "index.html");
  }

  if (/^\/news\/[^/]+$/.test(route)) {
    const articleIndex = path.join(outputDirectory, route.slice(1), "index.html");
    return existsSync(articleIndex) ? articleIndex : path.join(outputDirectory, "news", "index.html");
  }
  if (route.startsWith("/login/")) return path.join(outputDirectory, "login", "index.html");
  if (route.startsWith("/signup/")) return path.join(outputDirectory, "signup", "index.html");
  if (isPrivateRoute(route)) {
    const exactPrivateIndex = path.join(outputDirectory, route.slice(1), "index.html");
    return existsSync(exactPrivateIndex) ? exactPrivateIndex : path.join(outputDirectory, "dashboard", "index.html");
  }
  return path.join(outputDirectory, "404", "index.html");
}

function securityHeaders() {
  return {
    "Content-Security-Policy": [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'self' https://*.clerk.accounts.dev https://*.clerk.com https://clerk.barnbuddy.pro https://checkout.stripe.com",
      "script-src 'self' https://*.clerk.accounts.dev https://*.clerk.com https://clerk.barnbuddy.pro https://js.stripe.com https://challenges.cloudflare.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data: https:",
      `connect-src 'self' ${siteApiOrigin} https://clerk.accounts.dev https://*.clerk.accounts.dev https://*.clerk.com https://clerk.barnbuddy.pro https://api.stripe.com wss://*.clerk.accounts.dev wss://*.clerk.com`,
      "frame-src 'self' https://clerk.accounts.dev https://*.clerk.accounts.dev https://*.clerk.com https://clerk.barnbuddy.pro https://checkout.stripe.com https://js.stripe.com https://challenges.cloudflare.com",
      "worker-src 'self' blob:",
    ].join("; "),
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "Permissions-Policy": "camera=(), geolocation=(), microphone=(), usb=()",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
  };
}

function sendFile(request, response, filePath, statusCode = 200, noindex = false) {
  const extension = path.extname(filePath).toLowerCase();
  const isAsset = filePath.includes(`${path.sep}assets${path.sep}`);
  const headers = {
    ...securityHeaders(),
    "Content-Type": mimeTypes[extension] || "application/octet-stream",
    "Cache-Control": isAsset ? "public, max-age=31536000, immutable" : extension === ".html" ? "no-cache" : "public, max-age=3600",
  };

  if (noindex) headers["X-Robots-Tag"] = "noindex, nofollow, noarchive";
  response.writeHead(statusCode, headers);
  if (request.method === "HEAD") return response.end();
  return createReadStream(filePath).pipe(response);
}

async function getPublishedNews() {
  if (publicNewsCache && Date.now() < publicNewsCacheUntil) {
    return { posts: publicNewsCache, authoritative: true };
  }
  if (Date.now() < publicNewsUnavailableUntil) return { posts: null, authoritative: false };
  if (!publicNewsRequest) {
    publicNewsRequest = fetch(`${siteApiUrl}/api/site-content`, { signal: AbortSignal.timeout(2500) })
      .then(async (result) => {
        if (!result.ok) throw new Error(`Public content request returned ${result.status}`);
        const content = await result.json();
        publicNewsCache = Array.isArray(content.newsPosts)
          ? content.newsPosts.filter((post) => post?.published !== false && typeof post.id === "string")
          : [];
        publicNewsCacheUntil = Date.now() + 5 * 60 * 1000;
        return { posts: publicNewsCache, authoritative: true };
      })
      .catch(() => {
        publicNewsUnavailableUntil = Date.now() + 30 * 1000;
        return { posts: null, authoritative: false };
      })
      .finally(() => { publicNewsRequest = null; });
  }
  return publicNewsRequest;
}

async function sendSitemap(response) {
  const filePath = path.join(outputDirectory, "sitemap.xml");
  let sitemap = await readFile(filePath, "utf8");
  const { posts, authoritative } = await getPublishedNews();
  if (authoritative) {
    sitemap = sitemap
      .replace(/^\s*<url><loc>https:\/\/barnbuddy\.pro\/news\/[^<]+<\/loc><\/url>\r?\n/gm, "")
      .replace("</urlset>", `${posts.map((post) => `  <url><loc>https://barnbuddy.pro/news/${encodeURIComponent(post.id)}</loc></url>`).join("\n")}\n</urlset>`);
  }
  response.writeHead(200, {
    ...securityHeaders(),
    "Content-Type": "application/xml; charset=utf-8",
    "Cache-Control": "public, max-age=300",
  });
  response.end(sitemap);
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function replaceSeoTag(html, pattern, replacement) {
  return html.replace(pattern, replacement);
}

async function sendDynamicNewsArticle(response, route, article) {
  try {
    const template = await readFile(path.join(outputDirectory, "news", "index.html"), "utf8");
    const title = `${article.title} | BarnBuddy News`;
    const description = article.excerpt || "A BarnBuddy product update.";
    const canonical = `https://barnbuddy.pro${route}`;
    const meta = (attribute, name, content) => `<meta ${attribute}="${escapeHtml(name)}" content="${escapeHtml(content)}" data-barnbuddy-seo="true">`;
    let html = template
      .replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(title)}</title>`)
      .replace(/<link rel="canonical"[^>]*data-barnbuddy-seo="true">/, `<link rel="canonical" href="${canonical}" data-barnbuddy-seo="true">`)
      .replace(/<div id="root">[\s\S]*?<\/div>/, `<div id="root"><main><article><h1>${escapeHtml(article.title)}</h1><p>${escapeHtml(description)}</p>${(article.body || "").trim().split(/\n\s*\n/).filter(Boolean).map((block) => block.startsWith("## ") ? `<h2>${escapeHtml(block.slice(3))}</h2>` : `<p>${escapeHtml(block)}</p>`).join("")}</article></main></div>`);

    const replacements = [
      [/\<meta name="description"[^>]*data-barnbuddy-seo="true">/, meta("name", "description", description)],
      [/\<meta name="robots"[^>]*data-barnbuddy-seo="true">/, meta("name", "robots", "index, follow")],
      [/\<meta property="og:title"[^>]*data-barnbuddy-seo="true">/, meta("property", "og:title", title)],
      [/\<meta property="og:description"[^>]*data-barnbuddy-seo="true">/, meta("property", "og:description", description)],
      [/\<meta property="og:url"[^>]*data-barnbuddy-seo="true">/, meta("property", "og:url", canonical)],
      [/\<meta property="og:type"[^>]*data-barnbuddy-seo="true">/, meta("property", "og:type", "article")],
      [/\<meta name="twitter:title"[^>]*data-barnbuddy-seo="true">/, meta("name", "twitter:title", title)],
      [/\<meta name="twitter:description"[^>]*data-barnbuddy-seo="true">/, meta("name", "twitter:description", description)],
    ];
    for (const [pattern, replacement] of replacements) html = replaceSeoTag(html, pattern, replacement);

    response.writeHead(200, {
      ...securityHeaders(),
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-cache",
    });
    response.end(html);
    return true;
  } catch {
    return false;
  }
}

const server = createServer(async (request, response) => {
  if (!request.url || !["GET", "HEAD"].includes(request.method || "")) {
    response.writeHead(405, { ...securityHeaders(), Allow: "GET, HEAD" });
    return response.end("Method not allowed");
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  } catch {
    response.writeHead(400, securityHeaders());
    return response.end("Bad request");
  }

  if (pathname === "/sitemap.xml") {
    return sendSitemap(response).catch(() => {
      response.writeHead(503, { ...securityHeaders(), "Content-Type": "text/plain; charset=utf-8" });
      response.end("Sitemap temporarily unavailable");
    });
  }

  const requestedPath = path.resolve(outputDirectory, `.${pathname}`);
  const isWithinOutput = requestedPath === outputDirectory || requestedPath.startsWith(`${outputDirectory}${path.sep}`);

  if (isWithinOutput && existsSync(requestedPath) && statSync(requestedPath).isFile()) {
    return sendFile(request, response, requestedPath);
  }

  const route = normalizeRoute(pathname);
  const privateRoute = isPrivateRoute(route);
  let knownNewsArticle = false;
  let dynamicNewsArticle = null;
  const newsMatch = route.match(/^\/news\/([^/]+)$/);
  if (newsMatch) {
    const news = await getPublishedNews();
    dynamicNewsArticle = news.authoritative ? news.posts.find((post) => post.id === newsMatch[1]) : null;
    knownNewsArticle = news.authoritative ? Boolean(dynamicNewsArticle) : true;
    if (dynamicNewsArticle && !existsSync(path.join(outputDirectory, route.slice(1), "index.html"))) {
      const sent = await sendDynamicNewsArticle(response, route, dynamicNewsArticle);
      if (sent) return;
    }
  }
  const knownRoute = knownNewsArticle || publicRoutes.has(route) || route.startsWith("/login/") || route.startsWith("/signup/") || privateRoute;
  const hasFileExtension = Boolean(path.extname(route));

  if (hasFileExtension) {
    response.writeHead(404, { ...securityHeaders(), "Content-Type": "text/plain; charset=utf-8" });
    return response.end("Not found");
  }

  return sendFile(request, response, routeHtmlPath(route), knownRoute ? 200 : 404, privateRoute || !knownRoute);
});

server.listen(port, "0.0.0.0", () => {
  console.log(`BarnBuddy client listening on port ${port}`);
});
