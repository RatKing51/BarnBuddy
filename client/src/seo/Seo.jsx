import { useEffect, useState } from "react";
import { useLocation } from "react-router";
import { buildSiteStructuredData, getSeoMetadata, SITE_NAME } from "./siteMetadata";

const SEO_ATTRIBUTE = "data-barnbuddy-seo";

function appendMeta(attribute, name, content) {
  const element = document.createElement("meta");
  element.setAttribute(attribute, name);
  element.setAttribute("content", content);
  element.setAttribute(SEO_ATTRIBUTE, "true");
  document.head.appendChild(element);
}

export default function Seo() {
  const location = useLocation();
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    const metadata = getSeoMetadata(location.pathname, location.hash);

    document.title = metadata.title;
    document.querySelectorAll(`[${SEO_ATTRIBUTE}]`).forEach((element) => element.remove());

    appendMeta("name", "description", metadata.description);
    appendMeta("name", "robots", metadata.robots);
    appendMeta("property", "og:site_name", SITE_NAME);
    appendMeta("property", "og:title", metadata.title);
    appendMeta("property", "og:description", metadata.description);
    appendMeta("property", "og:url", metadata.canonical);
    appendMeta("property", "og:type", metadata.type);
    appendMeta("property", "og:image", metadata.image);
    appendMeta("property", "og:image:width", "1200");
    appendMeta("property", "og:image:height", "1200");
    appendMeta("property", "og:image:alt", "BarnBuddy logo");
    appendMeta("name", "twitter:card", "summary_large_image");
    appendMeta("name", "twitter:title", metadata.title);
    appendMeta("name", "twitter:description", metadata.description);
    appendMeta("name", "twitter:image", metadata.image);
    appendMeta("name", "twitter:image:alt", "BarnBuddy logo");

    const canonical = document.createElement("link");
    canonical.setAttribute("rel", "canonical");
    canonical.setAttribute("href", metadata.canonical);
    canonical.setAttribute(SEO_ATTRIBUTE, "true");
    document.head.appendChild(canonical);

    if (metadata.structuredData) {
      const script = document.createElement("script");
      script.setAttribute("type", "application/ld+json");
      script.setAttribute(SEO_ATTRIBUTE, "true");
      script.textContent = JSON.stringify(buildSiteStructuredData());
      document.head.appendChild(script);
    }

    const frame = window.requestAnimationFrame(() => setAnnouncement(metadata.title));
    return () => window.cancelAnimationFrame(frame);
  }, [location.hash, location.pathname]);

  return (
    <p className="sr-only" aria-live="polite" aria-atomic="true">
      {announcement ? `${announcement} loaded` : ""}
    </p>
  );
}
