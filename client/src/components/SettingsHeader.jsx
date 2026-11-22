import { UserButton } from "@clerk/react";
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
    <header className="bb-workbar">
      <div className="bb-work-container">
        <div className="bb-workbar-row">
          <Link to="/dashboard" aria-label="BarnBuddy dashboard" className="bb-work-brand"><span>Barn</span>Buddy.</Link>
          <div className="bb-work-actions">
            <PremiumExpiryBadge subscription={subscription} />
            <Link to="/dashboard" className="bb-action">Dashboard</Link>
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>

        <nav aria-label="Settings navigation" className="flex gap-1 sm:gap-2">
          {settingsLinks.map((item) => {
            const isCurrent = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);

            return (
              <Link
                key={item.to}
                to={item.to}
                aria-current={isCurrent ? "page" : undefined}
                aria-label={item.label}
                className="bb-work-tab"
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
