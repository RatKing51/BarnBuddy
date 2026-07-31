const { createReadStream } = require("node:fs");
const { stat } = require("node:fs/promises");
const http = require("node:http");
const path = require("node:path");

const buildRoot = path.resolve(__dirname, "build");
const port = Number.parseInt(process.env.PORT, 10) || 3000;
const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
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
  ".webmanifest": "application/manifest+json",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".xml": "application/xml; charset=utf-8",
};

function setSecurityHeaders(res) {
  res.setHeader("Content-Security-Policy", "default-src 'self'; base-uri 'self'; connect-src 'self'; font-src 'self' data:; frame-ancestors 'none'; img-src 'self' data:; object-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'");
  res.setHeader("Permissions-Policy", "camera=(), geolocation=(), microphone=(), payment=(), usb=()");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
}

function resolveRequestPath(rawUrl) {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(rawUrl, "http://localhost").pathname);
  } catch {
    return null;
  }

  if (pathname.includes("\0")) return null;
  const relativePath = pathname.replace(/^[/\\]+/, "");
  const candidate = path.resolve(buildRoot, relativePath);
  if (candidate !== buildRoot && !candidate.startsWith(`${buildRoot}${path.sep}`)) return null;
  return candidate;
}

async function findFile(candidate) {
  try {
    const details = await stat(candidate);
    if (details.isDirectory()) {
      const indexPath = path.join(candidate, "index.html");
      const indexDetails = await stat(indexPath);
      return indexDetails.isFile() ? { filePath: indexPath, details: indexDetails } : null;
    }
    return details.isFile() ? { filePath: candidate, details } : null;
  } catch {
    return null;
  }
}

async function sendFile(req, res, filePath, details, statusCode = 200) {
  const extension = path.extname(filePath).toLowerCase();
  const immutableAsset = filePath.includes(`${path.sep}assets${path.sep}`);
  res.statusCode = statusCode;
  res.setHeader("Content-Type", mimeTypes[extension] || "application/octet-stream");
  res.setHeader("Content-Length", details.size);
  res.setHeader("Cache-Control", immutableAsset
    ? "public, max-age=31536000, immutable"
    : extension === ".html"
      ? "no-cache"
      : "public, max-age=3600");

  if (req.method === "HEAD") return res.end();
  createReadStream(filePath).on("error", () => res.destroy()).pipe(res);
}

const server = http.createServer(async (req, res) => {
  setSecurityHeaders(res);
  if (!['GET', 'HEAD'].includes(req.method)) {
    res.setHeader("Allow", "GET, HEAD");
    res.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
    return res.end("Method not allowed");
  }

  const candidate = resolveRequestPath(req.url || "/");
  if (!candidate) {
    res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    return res.end("Bad request");
  }

  const requestedFile = await findFile(candidate);
  if (requestedFile) return sendFile(req, res, requestedFile.filePath, requestedFile.details);

  const notFoundPath = path.join(buildRoot, "404.html");
  const notFoundFile = await findFile(notFoundPath);
  if (notFoundFile) return sendFile(req, res, notFoundFile.filePath, notFoundFile.details, 404);

  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  return res.end("Not found");
});

server.listen(port, "0.0.0.0", () => {
  console.log(`BarnBuddy docs listening on port ${port}`);
});
