import React, { useId } from "react";

function EmptyStateAction({ action, primary = false }) {
  if (!action?.label) return null;

  const className = `inline-flex min-h-11 items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 disabled:cursor-wait disabled:opacity-60 ${
    primary
      ? "bg-blue-600 text-white hover:bg-blue-500"
      : "border border-gray-600 bg-gray-800 text-gray-200 hover:border-gray-500 hover:bg-gray-700"
  }`;

  if (action.href) {
    return (
      <a className={className} href={action.href} onClick={action.onClick}>
        {action.label}
      </a>
    );
  }

  return (
    <button
      type={action.type || "button"}
      className={className}
      onClick={action.onClick}
      disabled={action.disabled}
    >
      {action.label}
    </button>
  );
}

export default function EmptyState({
  title,
  description,
  variant = "compact",
  icon,
  primaryAction,
  secondaryAction,
  className = "",
}) {
  const titleId = useId();
  const descriptionId = useId();
  const isFull = variant === "full";

  return (
    <section
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      aria-live="polite"
      aria-atomic="true"
      className={`flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-700 bg-gray-900/70 text-center ${
        isFull ? "min-h-64 px-5 py-8 sm:p-10" : "p-4 sm:p-5"
      } ${className}`}
    >
      <span
        aria-hidden="true"
        className={`grid place-items-center rounded-xl border border-blue-400/20 bg-blue-500/10 text-blue-200 ${
          isFull ? "h-12 w-12" : "h-10 w-10"
        }`}
      >
        {icon || (
          <svg className={isFull ? "h-6 w-6" : "h-5 w-5"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 4.75h9A2.75 2.75 0 0 1 19.25 7.5v9a2.75 2.75 0 0 1-2.75 2.75h-9a2.75 2.75 0 0 1-2.75-2.75v-9A2.75 2.75 0 0 1 7.5 4.75Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.5 12h7M12 8.5v7" />
          </svg>
        )}
      </span>

      <h3 id={titleId} className={`${isFull ? "mt-4 text-lg" : "mt-3 text-base"} font-semibold text-white`}>
        {title}
      </h3>
      {description && (
        <p id={descriptionId} className="mt-1.5 max-w-md text-sm leading-relaxed text-gray-400">
          {description}
        </p>
      )}

      {(primaryAction || secondaryAction) && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <EmptyStateAction action={primaryAction} primary />
          <EmptyStateAction action={secondaryAction} />
        </div>
      )}
    </section>
  );
}
