import React from "react";

export function LoadingSpinner({ label = "Loading..." }) {
  return (
    <div className="inline-flex items-center gap-2 text-sm text-gray-300">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
      <span>{label}</span>
    </div>
  );
}

export function PageLoadingBar({ active }) {
  if (!active) return null;

  return (
    <div className="fixed left-0 right-0 top-0 z-50 h-1 bg-blue-950">
      <div className="h-full w-2/3 animate-pulse rounded-r-full bg-blue-500" />
    </div>
  );
}

export function LoadingPanel({ label = "Loading..." }) {
  return (
    <div className="flex min-h-48 items-center justify-center rounded-xl border border-gray-700 bg-gray-800/70">
      <LoadingSpinner label={label} />
    </div>
  );
}
