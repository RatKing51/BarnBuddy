import { PLANS, PLAN_IDS } from "../config/subscription.js";

export const SITE_URL = "https://barnbuddy.pro";
export const SITE_NAME = "BarnBuddy";
export const DEFAULT_SOCIAL_IMAGE = `${SITE_URL}/bblogo.png`;

const DEFAULT_ROBOTS = "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1";
const NOINDEX_FOLLOW = "noindex, follow";
const PRIVATE_ROBOTS = "noindex, nofollow, noarchive";

export const PAGE_FAQS = {
  "/switch-to-barnbuddy": [
    { question: "Can I switch from another farm management app?", answer: "You can start using BarnBuddy for your records, but direct migration from another platform is not verified or guaranteed. Check the available CSV template and Import Assistant before you begin." },
    { question: "Can I bring over paper records or spreadsheets?", answer: "The Import Assistant can import a structured CSV directly and can create an editable draft from supported photos and documents. You must review and confirm the draft before anything is saved. You can also enter animals and records manually." },
    { question: "How much does BarnBuddy cost?", answer: "BarnBuddy has a Free plan for core animal, herd, health, and vet records. Premium is listed at $5 per month and adds tools such as exports, reminders, advanced reporting, and FFA Project Mode. Check the pricing page for current details." },
    { question: "How do I get started?", answer: "Create a BarnBuddy account, add an animal profile, then organize animals into herds and record weights or care as you go. Use the Import Assistant if your existing animal data is in a supported format." },
  ],
  "/ffa-livestock-records": [
    { question: "Can BarnBuddy keep records for an FFA livestock project?", answer: "Yes. Premium FFA Project Mode lets a student create a project, link an existing animal profile, set goals and dates, keep journal activities and project finances, and review associated animal records." },
    { question: "Does BarnBuddy replace an official FFA record book or SAE requirements?", answer: "No. BarnBuddy is an independent record-keeping platform. Follow your chapter, school, advisor, and official FFA requirements and use any required official forms or record books." },
    { question: "Do students need a paid account?", answer: "Core animal and herd records are available on the Free plan. FFA Project Mode is a Premium feature listed at $5 per month. Ask BarnBuddy about school or chapter pricing and check the current pricing page." },
    { question: "Can an FFA chapter or advisor use BarnBuddy with students?", answer: "Students use individual accounts and can join a participating chapter with a chapter code. They choose which projects to share with an advisor. Contact BarnBuddy about chapter pricing and confirm your school's account and privacy requirements before using it with students." },
  ],
};

export const PUBLIC_ROUTE_METADATA = {
  "/": {
    title: "BarnBuddy | Livestock Records for Small Farms",
    heading: "Livestock records made simple",
    description:
      "BarnBuddy helps small farms, FFA and 4-H members, and hobby livestock owners organize animal, herd, health, vaccination, vet, and breeding records.",
    robots: DEFAULT_ROBOTS,
    structuredData: true,
  },
  "/aboutus": {
    title: "About BarnBuddy | Built for Small Livestock Operations",
    heading: "About BarnBuddy",
    description:
      "Learn why BarnBuddy was built to give small farms, FFA and 4-H members, and hobby livestock owners practical digital record-keeping tools.",
    robots: DEFAULT_ROBOTS,
  },
  "/pricing": {
    title: "BarnBuddy Pricing | Free and $5 Monthly Plans",
    heading: "Choose your BarnBuddy plan",
    description:
      "Compare BarnBuddy Free with Premium at $5 per month, including exports, reminders, breeding, finance, feed, inventory, and FFA project tools.",
    robots: DEFAULT_ROBOTS,
  },
  "/switch-to-barnbuddy": {
    title: "Switch to BarnBuddy | Simple Livestock Record Keeping",
    heading: "Bring your livestock records together",
    description: "Ready for easier livestock record keeping? Discover how BarnBuddy helps small farms organize animals, herds, health records, and weights.",
    robots: DEFAULT_ROBOTS,
    structuredData: true,
  },
  "/ffa-livestock-records": {
    title: "FFA Livestock Record Keeping Software | BarnBuddy",
    heading: "Keep your FFA livestock project records together",
    description: "Organize FFA livestock project records with BarnBuddy. Track animal information, weights, health records, vaccinations, and more in one place.",
    robots: DEFAULT_ROBOTS,
    structuredData: true,
  },
  "/news": {
    title: "BarnBuddy News | Product Updates and Farm Record Tips",
    heading: "Updates from the barn",
    description:
      "Read BarnBuddy product updates, feature announcements, and practical news for small farms, livestock projects, FFA members, and 4-H families.",
    robots: DEFAULT_ROBOTS,
  },
  "/contact": {
    title: "Contact BarnBuddy | Product and Account Support",
    heading: "Talk to BarnBuddy",
    description:
      "Contact BarnBuddy with product questions, account support needs, bug reports, feedback, or school and chapter pricing inquiries.",
    robots: DEFAULT_ROBOTS,
  },
  "/help": {
    title: "BarnBuddy Help Center | Livestock Record-Keeping Guides",
    heading: "BarnBuddy support starts here",
    description:
      "Find help with BarnBuddy accounts, herds, animal records, health tracking, FFA Project Mode, and other livestock record-keeping workflows.",
    robots: DEFAULT_ROBOTS,
  },
  "/terms": {
    title: "Terms of Service | BarnBuddy",
    heading: "BarnBuddy Terms of Service",
    description:
      "Read the terms governing BarnBuddy accounts, subscriptions, livestock data, acceptable use, and access to the BarnBuddy web application.",
    robots: DEFAULT_ROBOTS,
  },
  "/privacy": {
    title: "Privacy Policy | BarnBuddy",
    heading: "BarnBuddy Privacy Policy",
    description:
      "Learn how BarnBuddy collects, uses, stores, shares, and protects account information, livestock records, uploaded files, and usage data.",
    robots: DEFAULT_ROBOTS,
  },
  "/refunds": {
    title: "Refund Policy | BarnBuddy",
    heading: "BarnBuddy Refund Policy",
    description: "How to ask BarnBuddy about a Premium subscription charge or refund.",
    robots: DEFAULT_ROBOTS,
  },
  "/cancellation": {
    title: "Subscription and Cancellation | BarnBuddy",
    heading: "BarnBuddy Subscription and Cancellation Policy",
    description: "Learn where to manage or cancel a BarnBuddy Premium subscription.",
    robots: DEFAULT_ROBOTS,
  },
  "/cookies": {
    title: "Cookie Policy | BarnBuddy",
    heading: "BarnBuddy Cookie Policy",
    description: "Learn about authentication storage and browser storage used by BarnBuddy.",
    robots: DEFAULT_ROBOTS,
  },
  "/data-retention": {
    title: "Data Retention and Deletion | BarnBuddy",
    heading: "BarnBuddy Data Retention and Deletion",
    description: "What happens to BarnBuddy account information and records when you delete an account.",
    robots: DEFAULT_ROBOTS,
  },
  "/accessibility": {
    title: "Accessibility Statement | BarnBuddy",
    heading: "BarnBuddy Accessibility Statement",
    description: "How to contact BarnBuddy about accessibility barriers and request assistance.",
    robots: DEFAULT_ROBOTS,
  },
  "/security": {
    title: "Security and Data Protection | BarnBuddy",
    heading: "BarnBuddy Security and Data Protection",
    description: "An overview of BarnBuddy's data providers and security controls visible in the service.",
    robots: DEFAULT_ROBOTS,
  },
  "/status": {
    title: "BarnBuddy Service Status",
    heading: "BarnBuddy service status",
    description: "View the current operational status of BarnBuddy web, account, record, and notification services.",
    robots: NOINDEX_FOLLOW,
  },
  "/login": {
    title: "Log In to BarnBuddy",
    heading: "Welcome back",
    description: "Log in to BarnBuddy to access your private livestock, herd, health, and farm records.",
    robots: PRIVATE_ROBOTS,
  },
  "/signup": {
    title: "Create a BarnBuddy Account",
    heading: "Create your account",
    description: "Create a BarnBuddy account to start organizing livestock, herd, health, and care records.",
    robots: PRIVATE_ROBOTS,
  },
  "/docs": {
    title: "BarnBuddy Documentation",
    heading: "BarnBuddy documentation",
    description: "Open BarnBuddy guides for accounts, animal records, herd workflows, Premium tools, and support.",
    robots: NOINDEX_FOLLOW,
    canonical: "https://doc.barnbuddy.pro/",
  },
};

export const PRIVATE_ROUTE_METADATA = {
  title: "BarnBuddy Account",
  heading: "BarnBuddy private account area",
  description: "Private BarnBuddy account and livestock management area.",
  robots: PRIVATE_ROBOTS,
};

export const NOT_FOUND_METADATA = {
  title: "Page Not Found | BarnBuddy",
  heading: "Page not found",
  description: "The requested BarnBuddy page could not be found.",
  robots: PRIVATE_ROBOTS,
};

export const STATIC_SEO_ROUTES = [
  ...Object.keys(PUBLIC_ROUTE_METADATA),
  "/termsofserviceandprivacypolicy",
  "/refunds",
  "/cancellation",
  "/cookies",
  "/data-retention",
  "/accessibility",
  "/security",
  "/dashboard",
  "/admin",
  "/advisor",
  "/settings/account",
  "/settings/herd",
  "/settings/import-assistant",
  "/404",
];

function normalizePathname(pathname = "/") {
  const normalized = `/${String(pathname).split("?")[0].split("#")[0]}`.replace(/\/{2,}/g, "/");
  return normalized.length > 1 ? normalized.replace(/\/$/, "") : normalized;
}

function isPrivatePath(pathname) {
  return ["/dashboard", "/admin", "/advisor", "/settings"].some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function getSeoMetadata(pathname = "/", hash = "") {
  const path = normalizePathname(pathname);
  let metadata = PUBLIC_ROUTE_METADATA[path];

  if (!metadata && path === "/termsofserviceandprivacypolicy") {
    metadata = hash === "#pp" ? PUBLIC_ROUTE_METADATA["/privacy"] : PUBLIC_ROUTE_METADATA["/terms"];
    return {
      ...metadata,
      pathname: path,
      robots: NOINDEX_FOLLOW,
      canonical: metadata.canonical || `${SITE_URL}${hash === "#pp" ? "/privacy" : "/terms"}`,
    };
  }

  if (!metadata && (path.startsWith("/login/") || path.startsWith("/signup/"))) {
    metadata = path.startsWith("/login/") ? PUBLIC_ROUTE_METADATA["/login"] : PUBLIC_ROUTE_METADATA["/signup"];
  }

  if (!metadata && isPrivatePath(path)) {
    metadata = PRIVATE_ROUTE_METADATA;
  }

  if (!metadata || path === "/404") {
    metadata = NOT_FOUND_METADATA;
  }

  return {
    ...metadata,
    pathname: path,
    canonical: metadata.canonical || `${SITE_URL}${path === "/404" ? "/" : path}`,
    image: metadata.image || DEFAULT_SOCIAL_IMAGE,
    type: metadata.type || "website",
  };
}

export function buildSiteStructuredData() {
  const premiumPrice = PLANS[PLAN_IDS.premium].price.replace(/[^0-9.]/g, "");

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: SITE_NAME,
        url: `${SITE_URL}/`,
        logo: {
          "@type": "ImageObject",
          "@id": `${SITE_URL}/#logo`,
          url: DEFAULT_SOCIAL_IMAGE,
          contentUrl: DEFAULT_SOCIAL_IMAGE,
          width: 1200,
          height: 1200,
          caption: "BarnBuddy",
        },
        sameAs: [
          "https://github.com/RatKing51/BarnBuddy",
          "https://www.facebook.com/share/14i7xVZnNJS/?mibextid=wwXIfr",
          "https://www.instagram.com/barnbuddypro/",
          "https://www.tiktok.com/@barnbuddypro",
        ],
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: `${SITE_URL}/`,
        name: SITE_NAME,
        description: PUBLIC_ROUTE_METADATA["/"].description,
        inLanguage: "en-US",
        publisher: { "@id": `${SITE_URL}/#organization` },
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${SITE_URL}/#software-application`,
        name: SITE_NAME,
        url: `${SITE_URL}/`,
        description: PUBLIC_ROUTE_METADATA["/"].description,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        image: { "@id": `${SITE_URL}/#logo` },
        provider: { "@id": `${SITE_URL}/#organization` },
        offers: [
          {
            "@type": "Offer",
            name: PLANS[PLAN_IDS.free].name,
            price: "0",
            priceCurrency: "USD",
            url: `${SITE_URL}/pricing`,
          },
          {
            "@type": "Offer",
            name: PLANS[PLAN_IDS.premium].name,
            price: premiumPrice,
            priceCurrency: "USD",
            url: `${SITE_URL}/pricing`,
            priceSpecification: {
              "@type": "UnitPriceSpecification",
              price: premiumPrice,
              priceCurrency: "USD",
              billingDuration: "P1M",
            },
          },
        ],
      },
    ],
  };
}

export function buildPageStructuredData(pathname) {
  const metadata = getSeoMetadata(pathname);
  const faqItems = PAGE_FAQS[metadata.pathname];
  if (!faqItems) return buildSiteStructuredData();

  const webPageId = `${metadata.canonical}#webpage`;
  return {
    ...buildSiteStructuredData(),
    "@graph": [
      ...buildSiteStructuredData()["@graph"],
      {
        "@type": "WebPage",
        "@id": webPageId,
        url: metadata.canonical,
        name: metadata.title,
        description: metadata.description,
        isPartOf: { "@id": `${SITE_URL}/#website` },
        about: { "@id": `${SITE_URL}/#software-application` },
        inLanguage: "en-US",
      },
      {
        "@type": "FAQPage",
        "@id": `${metadata.canonical}#faq`,
        url: metadata.canonical,
        mainEntity: faqItems.map(({ question, answer }) => ({
          "@type": "Question",
          name: question,
          acceptedAnswer: { "@type": "Answer", text: answer },
        })),
      },
    ],
  };
}
