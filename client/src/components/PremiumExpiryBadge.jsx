import { useEffect, useMemo, useState } from "react";

function getTimeLeft(expiresAt, now) {
  const expiresTime = Date.parse(expiresAt || "");
  const remainingMs = expiresTime - now;
  if (!Number.isFinite(expiresTime) || remainingMs <= 0) return null;

  const minutes = Math.max(1, Math.ceil(remainingMs / 60000));
  if (minutes < 60) return `${minutes}m left`;

  const hours = Math.ceil(remainingMs / 3600000);
  if (hours <= 24) return `${hours}h left`;

  const days = Math.ceil(remainingMs / 86400000);
  return `${days}d left`;
}

export default function PremiumExpiryBadge({ subscription, className = "" }) {
  const [now, setNow] = useState(Date.now());
  const expiresAt = subscription?.premiumExpiresAt || "";

  useEffect(() => {
    if (!expiresAt) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(timer);
  }, [expiresAt]);

  const timeLeft = getTimeLeft(expiresAt, now);
  const accessibleTimeLeft = timeLeft?.replace("d", " days").replace("h", " hours").replace("m", " minutes").replace(" left", "");
  const exactExpiration = useMemo(() => {
    if (!expiresAt) return "";
    const parsed = new Date(expiresAt);
    if (Number.isNaN(parsed.getTime())) return "";
    return parsed.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
  }, [expiresAt]);

  if (!subscription?.isPremium || !timeLeft) return null;

  return (
    <span
      className={`whitespace-nowrap rounded-full border border-amber-300/25 bg-amber-300/10 px-2.5 py-1 text-[11px] font-semibold text-amber-100 ${className}`}
      title={`Premium expires ${exactExpiration}`}
      aria-label={`Premium expires in ${accessibleTimeLeft}`}
    >
      Premium - {timeLeft}
    </span>
  );
}
