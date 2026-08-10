import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildSiteStructuredData,
  getSeoMetadata,
  SITE_NAME,
  STATIC_SEO_ROUTES,
} from "../src/seo/siteMetadata.js";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const clientDirectory = path.resolve(scriptDirectory, "..");
const outputDirectory = path.join(clientDirectory, "dist");
const indexPath = path.join(outputDirectory, "index.html");
const baseHtml = await readFile(indexPath, "utf8");

const seoBlockPattern = /<meta name="barnbuddy-seo-start"[^>]*>[\s\S]*?<meta name="barnbuddy-seo-end"[^>]*>/;
const rootPattern = /<div id="root"><\/div>/;

if (!seoBlockPattern.test(baseHtml) || !rootPattern.test(baseHtml)) {
  throw new Error("Could not find the BarnBuddy SEO or root markers in the Vite output.");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function metaTag(attribute, name, content) {
  return `<meta ${attribute}="${escapeHtml(name)}" content="${escapeHtml(content)}" data-barnbuddy-seo="true">`;
}

function renderMetadata(metadata) {
  const tags = [
    '<meta name="barnbuddy-seo-start" content="" data-barnbuddy-seo="true">',
    `<title>${escapeHtml(metadata.title)}</title>`,
    metaTag("name", "description", metadata.description),
    metaTag("name", "robots", metadata.robots),
    `<link rel="canonical" href="${escapeHtml(metadata.canonical)}" data-barnbuddy-seo="true">`,
    metaTag("property", "og:site_name", SITE_NAME),
    metaTag("property", "og:title", metadata.title),
    metaTag("property", "og:description", metadata.description),
    metaTag("property", "og:url", metadata.canonical),
    metaTag("property", "og:type", metadata.type),
    metaTag("property", "og:image", metadata.image),
    metaTag("property", "og:image:width", "1200"),
    metaTag("property", "og:image:height", "1200"),
    metaTag("property", "og:image:alt", "BarnBuddy logo"),
    metaTag("name", "twitter:card", "summary_large_image"),
    metaTag("name", "twitter:title", metadata.title),
    metaTag("name", "twitter:description", metadata.description),
    metaTag("name", "twitter:image", metadata.image),
    metaTag("name", "twitter:image:alt", "BarnBuddy logo"),
  ];

  if (metadata.structuredData) {
    const json = JSON.stringify(buildSiteStructuredData()).replaceAll("<", "\\u003c");
    tags.push(`<script type="application/ld+json" data-barnbuddy-seo="true">${json}</script>`);
  }

  tags.push('<meta name="barnbuddy-seo-end" content="" data-barnbuddy-seo="true">');
  return tags.join("\n    ");
}

function renderStaticContent(metadata) {
  const links = metadata.robots.startsWith("index")
    ? `
      <nav aria-label="BarnBuddy pages" style="display:flex;flex-wrap:wrap;gap:1rem;justify-content:center;margin-top:1.5rem">
        <a href="/aboutus">About</a><a href="/pricing">Pricing</a><a href="/help">Help</a><a href="/contact">Contact</a>
      </nav>`
    : "";

  return `<div id="root"><main aria-labelledby="static-page-title" style="background:#101d42;color:#fff;display:grid;min-height:100vh;place-content:center;padding:2rem;text-align:center">
    <h1 id="static-page-title">${escapeHtml(metadata.heading)}</h1>
    <p style="max-width:48rem;line-height:1.7">${escapeHtml(metadata.description)}</p>${links}
  </main></div>`;
}

for (const route of STATIC_SEO_ROUTES) {
  const metadata = getSeoMetadata(route);
  const html = baseHtml
    .replace(seoBlockPattern, renderMetadata(metadata))
    .replace(rootPattern, renderStaticContent(metadata));
  const routeDirectory = route === "/" ? outputDirectory : path.join(outputDirectory, route.slice(1));
  const routeIndexPath = path.join(routeDirectory, "index.html");

  await mkdir(routeDirectory, { recursive: true });
  await writeFile(routeIndexPath, html, "utf8");
}

console.log(`Generated SEO HTML for ${STATIC_SEO_ROUTES.length} BarnBuddy routes.`);
