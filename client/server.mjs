import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const clientDirectory = path.dirname(fileURLToPath(import.meta.url));
const outputDirectory = path.join(clientDirectory, "dist");
const port = Number(process.env.PORT || 4173);

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
    "Content-Security-Policy": "base-uri 'self'; frame-ancestors 'none'; object-src 'none'",
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

const server = createServer((request, response) => {
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

  const requestedPath = path.resolve(outputDirectory, `.${pathname}`);
  const isWithinOutput = requestedPath === outputDirectory || requestedPath.startsWith(`${outputDirectory}${path.sep}`);

  if (isWithinOutput && existsSync(requestedPath) && statSync(requestedPath).isFile()) {
    return sendFile(request, response, requestedPath);
  }

  const route = normalizeRoute(pathname);
  const privateRoute = isPrivateRoute(route);
  const knownRoute = publicRoutes.has(route) || route.startsWith("/login/") || route.startsWith("/signup/") || privateRoute;
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
