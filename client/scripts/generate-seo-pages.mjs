import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildSiteStructuredData,
  getSeoMetadata,
  SITE_URL,
  SITE_NAME,
  STATIC_SEO_ROUTES,
} from "../src/seo/siteMetadata.js";
import { newsPosts } from "../src/data/newsPosts.js";

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

function xmlEscape(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
}

const sitemapRoutes = STATIC_SEO_ROUTES.filter((route) =>
  getSeoMetadata(route).robots.startsWith("index") && route !== "/termsofserviceandprivacypolicy"
);
const sitemapUrls = [
  ...sitemapRoutes.map((route) => `${SITE_URL}${route === "/" ? "/" : route}`),
  ...newsPosts.filter((post) => post.published !== false).map((post) => `${SITE_URL}/news/${encodeURIComponent(post.id)}`),
];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...new Set(sitemapUrls)].map((url) => `  <url><loc>${xmlEscape(url)}</loc></url>`).join("\n")}\n</urlset>\n`;
await writeFile(path.join(outputDirectory, "sitemap.xml"), sitemap, "utf8");

const staticSections = {
  "/": [
    ["Livestock records", "Keep animal profiles, herd organization, weights, health history, vaccinations, vet visits, and breeding information together."],
    ["For small farms and livestock projects", "BarnBuddy is built for small livestock operations, FFA and 4-H members, families, and hobby herds."],
    ["Plans", "Start with the free plan or compare the monthly Premium tools and plan details."],
  ],
  "/aboutus": [
    ["Built from a small Kansas farm", "BarnBuddy was started by Gage Billinger after seeing animal health notes and project records scattered across notebooks and spreadsheets."],
    ["Product focus", "The app organizes animal and herd records, care dates, and student project information in one place."],
  ],
  "/pricing": [
    ["Free and Premium", "Free includes animal and herd records, health and vet tracking, and basic care status. Premium is listed at $5 per month and adds advanced reports, exports, reminders, breeding, finance, feed, inventory, and FFA Project Mode."],
    ["Billing", "Review the amount and subscription terms displayed by Clerk Billing checkout before confirming a purchase. Manage an existing subscription from Account Settings."],
  ],
  "/help": [
    ["Get started", "Find guidance for accounts, herds, animal profiles, care records, exports, and account settings."],
    ["Contact support", "For help with a specific account or workflow, contact BarnBuddy support."],
  ],
  "/contact": [
    ["Product and account support", "Use the contact form for product questions, account support, bug reports, feedback, or school and chapter pricing inquiries."],
  ],
  "/terms": [
    ["Using BarnBuddy", "These terms cover accounts, user-provided records, acceptable use, plan and payment details, and service availability."],
    ["Livestock records", "BarnBuddy is a record-keeping tool, not veterinary advice or an emergency service. Verify records and consult a qualified veterinarian for animal-health decisions."],
  ],
  "/privacy": [
    ["Information and providers", "BarnBuddy handles account details, onboarding choices, livestock and project records, uploaded files, support requests, and optional AI-assisted import requests using providers described in this policy."],
    ["Account choices", "Manage account preferences, newsletter subscription, and account deletion in Account Settings. The available record exports are not a full account-data export."],
  ],
  "/refunds": [["Ask about a charge", "The application does not define a refund procedure. Contact BarnBuddy support about a charge and review the terms shown by the billing provider before purchase."]],
  "/cancellation": [["Manage a subscription", "Sign in and open Account Settings to use the billing provider’s subscription management screen. Account deletion and subscription cancellation are separate actions."]],
  "/cookies": [["Browser storage", "The reviewed client code uses authentication storage, a service worker, and local storage for a contact-form cooldown. No analytics or advertising tracker was found in the reviewed client source."]],
  "/data-retention": [["Account deletion", "Account deletion removes linked BarnBuddy database records and requests removal of the Clerk sign-in. Uploaded-file cleanup is attempted separately; some independent chapter and admin history may remain."]],
  "/accessibility": [["Report a barrier", "Contact BarnBuddy with the affected page or workflow and, if comfortable, the assistive technology and browser used. Full WCAG 2.2 AA conformance has not been established."]],
  "/security": [["Data services", "BarnBuddy uses Clerk, PostgreSQL, Railway, Cloudflare R2, Resend, and optional OpenAI import processing. This overview is not a security certification or guarantee."]],
};

function renderStaticContent(metadata, newsArticle = null) {
  const sections = newsArticle
    ? (newsArticle.body || "").trim().split(/\n\s*\n/).filter(Boolean).slice(0, 4).map((paragraph) => ["", paragraph.replace(/^##\s+/, "")])
    : staticSections[metadata.pathname] || [];
  const sectionHtml = sections.map(([heading, body]) => `${heading ? `<h2>${escapeHtml(heading)}</h2>` : ""}<p>${escapeHtml(body)}</p>`).join("");
  const storyLinks = metadata.pathname === "/news"
    ? `<ul>${newsPosts.filter((post) => post.published !== false).map((post) => `<li><a href="/news/${encodeURIComponent(post.id)}">${escapeHtml(post.title)}</a> — ${escapeHtml(post.excerpt)}</li>`).join("")}</ul>`
    : "";
  const links = metadata.robots.startsWith("index")
    ? `
      <nav aria-label="BarnBuddy pages" style="display:flex;flex-wrap:wrap;gap:1rem;justify-content:center;margin-top:1.5rem">
        <a href="/aboutus">About</a><a href="/pricing">Pricing</a><a href="/help">Help</a><a href="/contact">Contact</a>
      </nav>`
    : "";

  return `<div id="root"><main aria-labelledby="static-page-title" style="background:#101d42;color:#fff;display:grid;min-height:100vh;place-content:center;padding:2rem;text-align:center">
    <article style="max-width:52rem;line-height:1.7;text-align:left"><h1 id="static-page-title">${escapeHtml(newsArticle?.title || metadata.heading)}</h1>
    <p>${escapeHtml(newsArticle?.excerpt || metadata.description)}</p>${sectionHtml}${storyLinks}</article>${links}
  </main></div>`;
}

const newsRoutes = newsPosts.filter((post) => post.published !== false).map((post) => `/news/${post.id}`);
const allRoutes = [...new Set([...STATIC_SEO_ROUTES, ...newsRoutes])];
for (const route of allRoutes) {
  const newsArticle = route.startsWith("/news/") ? newsPosts.find((post) => post.id === decodeURIComponent(route.slice("/news/".length))) : null;
  const metadata = getSeoMetadata(route);
  if (newsArticle) {
    metadata.title = `${newsArticle.title} | BarnBuddy News`;
    metadata.heading = newsArticle.title;
    metadata.description = newsArticle.excerpt;
    metadata.robots = "index, follow";
    metadata.type = "article";
  }
  const html = baseHtml
    .replace(seoBlockPattern, renderMetadata(metadata))
    .replace(rootPattern, renderStaticContent(metadata, newsArticle));
  const routeDirectory = route === "/" ? outputDirectory : path.join(outputDirectory, route.slice(1));
  const routeIndexPath = path.join(routeDirectory, "index.html");

  await mkdir(routeDirectory, { recursive: true });
  await writeFile(routeIndexPath, html, "utf8");
}

console.log(`Generated SEO HTML for ${allRoutes.length} BarnBuddy routes.`);
