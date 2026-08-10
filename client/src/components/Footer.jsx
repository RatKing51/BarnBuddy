import { useState } from "react";
import { Link } from "react-router";
import { API_BASE_URL } from "../config/env";

const footerLinks = [
  {
    label: "Product",
    links: [
      ["Pricing", "/pricing"],
      ["Help Center", "/help"],
      ["Documentation", "https://doc.barnbuddy.pro"],
      ["Service status", "/status"],
    ],
  },
  {
    label: "Company",
    links: [
      ["About BarnBuddy", "/aboutus"],
      ["News", "/news"],
      ["Contact", "/contact"],
      ["Share feedback", "/contact?topic=Review%20or%20feedback"],
    ],
  },
];

const socialLinks = [
  ["GitHub", "https://github.com/RatKing51/BarnBuddy"],
  ["Instagram", "https://www.instagram.com/barnbuddypro/"],
  ["Facebook", "https://www.facebook.com/share/14i7xVZnNJS/?mibextid=wwXIfr"],
  ["TikTok", "https://www.tiktok.com/@barnbuddypro?is_from_webapp=1&sender_device=pc"],
];

function FooterLink({ href, children }) {
  const className = "inline-flex min-h-11 items-center text-sm text-slate-300 transition hover:text-white";

  if (href.startsWith("http")) {
    return (
      <a href={href} className={className}>
        {children}
      </a>
    );
  }

  return (
    <Link to={href} className={className}>
      {children}
    </Link>
  );
}

export default function Footer() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState({ type: "", message: "" });
  const [submitting, setSubmitting] = useState(false);

  async function handleNewsletterSubmit(event) {
    event.preventDefault();
    setStatus({ type: "", message: "" });

    try {
      setSubmitting(true);
      const response = await fetch(`${API_BASE_URL}/newsletter/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "footer" }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) throw new Error(data.error || "Could not subscribe right now.");

      setEmail("");
      setStatus({ type: "success", message: "You are on the list. Watch your inbox for BarnBuddy updates." });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <footer className="mt-auto border-t border-white/10 bg-[#07102a] text-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-14 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr] lg:gap-12">
          <div>
            <Link to="/" className="inline-flex rounded-xl" aria-label="BarnBuddy home">
              <span className="leading-none">
                <span className="block text-3xl font-bold">
                  <span className="text-blue-500">Barn</span>
                  <span className="text-gray-300">Buddy.</span>
                </span>
                <span className="mt-1 block text-xs font-bold text-slate-400">Doing for the Small</span>
              </span>
            </Link>
            <p className="mt-5 max-w-md text-sm leading-6 text-slate-300">
              Practical livestock records for small farms, FFA and 4-H projects, and hobby herds. Built from the farm for the farm.
            </p>
            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-1">
              {socialLinks.map(([label, href]) => (
                <a
                  key={label}
                  href={href}
                  className="inline-flex min-h-11 items-center text-sm font-semibold text-slate-400 transition hover:text-white"
                  aria-label={`BarnBuddy on ${label}`}
                >
                  {label}
                </a>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 sm:gap-8">
            {footerLinks.map((group) => (
              <div key={group.label}>
                <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-blue-300">{group.label}</h2>
                <ul className="mt-3 space-y-0.5">
                  {group.links.map(([label, href]) => (
                    <li key={label}>
                      <FooterLink href={href}>{label}</FooterLink>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="md:col-span-2 lg:col-span-1">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-6">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-300">From the barn</p>
              <h2 className="mt-2 text-xl font-bold">Useful updates, not inbox clutter.</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Get occasional product news, record-keeping tips, and practical guides for smaller operations.
              </p>
              <form className="mt-5 flex flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row" onSubmit={handleNewsletterSubmit}>
                <label className="sr-only" htmlFor="newsletter-email">Email address for BarnBuddy updates</label>
                <input
                  id="newsletter-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@farm.com"
                  autoComplete="email"
                  required
                  className="min-h-12 min-w-0 flex-1 rounded-xl border border-white/12 bg-[#0b1730] px-4 text-white placeholder:text-slate-500 focus:border-blue-400 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="min-h-12 shrink-0 rounded-xl bg-blue-600 px-5 font-bold text-white transition hover:bg-blue-500 disabled:cursor-wait disabled:opacity-70"
                >
                  {submitting ? "Joining..." : "Join updates"}
                </button>
              </form>
              {status.message && (
                <p
                  role={status.type === "error" ? "alert" : "status"}
                  aria-live="polite"
                  className={`mt-3 text-sm ${status.type === "success" ? "text-emerald-200" : "text-red-200"}`}
                >
                  {status.message}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-white/10 pt-6 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {new Date().getFullYear()} BarnBuddy. Built in Kansas for smaller livestock operations.</p>
          <div className="flex gap-5">
            <FooterLink href="/privacy">Privacy</FooterLink>
            <FooterLink href="/terms">Terms</FooterLink>
          </div>
        </div>
      </div>
    </footer>
  );
}
