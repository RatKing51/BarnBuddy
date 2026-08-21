import { useEffect, useRef, useState } from "react";
import { UserButton, useAuth as useClerkAuth, useUser } from "@clerk/react";
import { Link, NavLink, useLocation } from "react-router";
import { ADMIN_CLERK_USER_IDS, ADMIN_EMAILS } from "../config/env";
import { useAuth as useBarnBuddyAuth } from "../context/AuthContext";
import PremiumExpiryBadge from "./PremiumExpiryBadge";

const publicLinks = [
  { to: "/aboutus", label: "About" },
  { to: "/pricing", label: "Pricing" },
  { to: "/news", label: "News" },
  { to: "/help", label: "Help" },
];

function Brand() {
  return (
    <span className="flex items-center">
      <span className="leading-none">
        <span className="block text-2xl font-bold sm:text-3xl">
          <span className="text-blue-500">Barn</span>
          <span className="text-gray-300">Buddy.</span>
        </span>
        <span className="mt-1 block text-[10px] font-bold text-slate-400 sm:text-xs">
          Doing for the Small
        </span>
      </span>
    </span>
  );
}

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const menuButtonRef = useRef(null);
  const location = useLocation();
  const { isLoaded, isSignedIn } = useClerkAuth();
  const { backendUser, subscription } = useBarnBuddyAuth();
  const { user } = useUser();
  const showSignedIn = isLoaded && isSignedIn;
  const primaryEmail = user?.primaryEmailAddress?.emailAddress?.toLowerCase() || "";
  const showAdmin = Boolean(
    showSignedIn &&
      ((primaryEmail && ADMIN_EMAILS.includes(primaryEmail)) ||
        (user?.id && ADMIN_CLERK_USER_IDS.includes(user.id)))
  );
  const showAdvisor = Boolean(
    showSignedIn &&
      (backendUser?.ffa?.isAdvisor === true ||
        backendUser?.isFfaAdvisor === true ||
        backendUser?.ffaAdvisorChapter?.isAdvisor === true ||
        backendUser?.ffaChapter?.isAdvisor === true)
  );

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!open) return undefined;

    function handleEscape(event) {
      if (event.key === "Escape") {
        setOpen(false);
        menuButtonRef.current?.focus();
      }
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open]);

  const desktopLinkClass = ({ isActive }) =>
    `inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold transition-colors ${
      isActive
        ? "bg-white/10 text-white"
        : "text-slate-300 hover:bg-white/6 hover:text-white"
    }`;

  const mobileLinkClass = ({ isActive }) =>
    `flex min-h-12 items-center justify-between rounded-xl border px-4 text-base font-semibold transition-colors ${
      isActive
        ? "border-blue-400/35 bg-blue-500/15 text-white"
        : "border-transparent text-slate-200 hover:border-white/10 hover:bg-white/6"
    }`;

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0b1730]/95 text-white shadow-lg shadow-black/15 backdrop-blur-xl">
      <nav aria-label="Primary navigation">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-[4.5rem] items-center justify-between gap-5">
            <Link to="/" aria-label="BarnBuddy home" className="shrink-0 rounded-xl">
              <Brand />
            </Link>

            <div className="hidden items-center gap-1 lg:flex">
              {publicLinks.map((link) => (
                <NavLink key={link.to} to={link.to} className={desktopLinkClass}>
                  {link.label}
                </NavLink>
              ))}
            </div>

            <div className="hidden shrink-0 items-center gap-2 lg:flex">
              {showSignedIn ? (
                <>
                  {showAdmin && (
                    <NavLink to="/admin" className={desktopLinkClass}>
                      Admin
                    </NavLink>
                  )}
                  {showAdvisor && (
                    <NavLink to="/advisor" className={desktopLinkClass}>
                      Advisor
                    </NavLink>
                  )}
                  <PremiumExpiryBadge subscription={subscription} className="hidden xl:inline-flex" />
                  <Link
                    to="/dashboard"
                    className="inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-bold text-white shadow-lg shadow-blue-950/25 transition hover:bg-blue-500"
                  >
                    Dashboard
                  </Link>
                  <div className="ml-1 grid min-h-11 min-w-11 place-items-center rounded-full border border-white/10 bg-white/5">
                    <UserButton afterSignOutUrl="/" />
                  </div>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold text-slate-200 transition hover:bg-white/6 hover:text-white"
                  >
                    Log in
                  </Link>
                  <Link
                    to="/signup"
                    className="inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-600 px-5 text-sm font-bold text-white shadow-lg shadow-blue-950/25 transition hover:bg-blue-500"
                  >
                    Get started free
                  </Link>
                </>
              )}
            </div>

            <button
              ref={menuButtonRef}
              type="button"
              onClick={() => setOpen((current) => !current)}
              aria-expanded={open}
              aria-controls="mobile-primary-menu"
              aria-label={open ? "Close navigation menu" : "Open navigation menu"}
              className="grid min-h-11 min-w-11 place-items-center rounded-xl border border-white/10 bg-white/5 text-white transition hover:bg-white/10 focus:outline-none lg:hidden"
            >
              <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
              <span aria-hidden="true" className="text-2xl font-light leading-none">
                {open ? "×" : "≡"}
              </span>
            </button>
          </div>
        </div>

        {open && (
          <div id="mobile-primary-menu" className="border-t border-white/10 bg-[#0b1730] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 lg:hidden">
            <div className="mx-auto max-w-7xl space-y-1">
              {publicLinks.map((link) => (
                <NavLink key={link.to} to={link.to} className={mobileLinkClass}>
                  <span>{link.label}</span>
                  <span aria-hidden="true" className="text-blue-300">→</span>
                </NavLink>
              ))}

              <div className="my-3 border-t border-white/10" />

              {showSignedIn ? (
                <div className="space-y-2">
                  {showAdmin && (
                    <NavLink to="/admin" className={mobileLinkClass}>
                      <span>Admin</span>
                      <span aria-hidden="true" className="text-blue-300">→</span>
                    </NavLink>
                  )}
                  {showAdvisor && (
                    <NavLink to="/advisor" className={mobileLinkClass}>
                      <span>Advisor dashboard</span>
                      <span aria-hidden="true" className="text-blue-300">→</span>
                    </NavLink>
                  )}
                  <Link
                    to="/settings/account"
                    className="flex min-h-12 items-center justify-between rounded-xl px-4 font-semibold text-slate-200 hover:bg-white/6"
                  >
                    <span>Account settings</span>
                    <span aria-hidden="true" className="text-blue-300">→</span>
                  </Link>
                  <Link
                    to="/dashboard"
                    className="flex min-h-12 items-center justify-center rounded-xl bg-blue-600 px-4 font-bold text-white shadow-lg shadow-blue-950/25 hover:bg-blue-500"
                  >
                    Open dashboard
                  </Link>
                  <div className="flex min-h-14 items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4">
                    <div>
                      <p className="text-sm font-semibold text-white">Signed in</p>
                      <p className="max-w-[14rem] truncate text-xs text-slate-400">{primaryEmail || "BarnBuddy account"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <PremiumExpiryBadge subscription={subscription} />
                      <UserButton afterSignOutUrl="/" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Link
                    to="/login"
                    className="flex min-h-12 items-center justify-center rounded-xl border border-white/12 bg-white/5 font-semibold text-white hover:bg-white/10"
                  >
                    Log in
                  </Link>
                  <Link
                    to="/signup"
                    className="flex min-h-12 items-center justify-center rounded-xl bg-blue-600 font-bold text-white hover:bg-blue-500"
                  >
                    Get started free
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
