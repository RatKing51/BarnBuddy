import { UserButton } from "@clerk/clerk-react";
import { Link, useLocation } from "react-router";
import { useAuth } from "../context/AuthContext";
import PremiumExpiryBadge from "./PremiumExpiryBadge";

const settingsLinks = [
  { to: "/settings/account", label: "Account" },
  { to: "/settings/herd", label: "Herds" },
  { to: "/settings/import-assistant", label: "Import Assistant", mobileLabel: "Import" },
];

export default function SettingsHeader() {
  const location = useLocation();
  const { subscription } = useAuth();

  return (
    <header className="border-b border-white/10 bg-[#101D42] text-white shadow-lg shadow-black/10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
          <Link
            to="/dashboard"
            aria-label="BarnBuddy dashboard"
            className="group flex min-h-11 w-fit items-center gap-3 rounded-xl"
          >
            <span className="text-3xl font-bold leading-none">
              <span className="text-blue-500 transition-colors group-hover:text-blue-400">Barn</span>
              <span className="text-gray-300">Buddy.</span>
            </span>
            <span className="border-l border-white/20 pl-3 text-xs font-bold leading-tight text-white/90 sm:text-sm">
              Doing for<br className="sm:hidden" /> the Small
            </span>
          </Link>

          <div className="flex min-h-11 w-full items-center justify-between gap-3 sm:w-auto sm:justify-end">
            <PremiumExpiryBadge subscription={subscription} />
            <div className="ml-auto flex items-center gap-3">
              <Link
                to="/dashboard"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3.5 text-sm font-semibold text-white transition hover:border-blue-300/60 hover:bg-white/15 sm:px-4"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h18M9 6l-6 6 6 6" />
                </svg>
                Dashboard
              </Link>
              <UserButton afterSignOutUrl="/" />
            </div>
          </div>
        </div>

        <nav aria-label="Settings navigation" className="grid grid-cols-3 gap-1 sm:flex sm:gap-2">
          {settingsLinks.map((item) => {
            const isCurrent = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);

            return (
              <Link
                key={item.to}
                to={item.to}
                aria-current={isCurrent ? "page" : undefined}
                className={`relative inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-t-xl px-2 text-sm font-semibold transition sm:px-4 ${
                  isCurrent
                    ? "bg-white/10 text-white after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-blue-400"
                    : "text-blue-100/70 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span className={item.mobileLabel ? "sm:hidden" : undefined}>{item.mobileLabel || item.label}</span>
                {item.mobileLabel && <span className="hidden sm:inline">{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
