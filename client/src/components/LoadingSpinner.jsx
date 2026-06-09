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
    <div className="flex min-h-48 items-center justify-center rounded-xl border border-gray-800 bg-gray-900/80">
      <LoadingSpinner label={label} />
    </div>
  );
}

export function SkeletonBlock({ className = "" }) {
  return <div className={`animate-pulse rounded-lg bg-gray-800 ${className}`} />;
}

export function SkeletonCard({ children, className = "" }) {
  return (
    <div className={`rounded-2xl border border-gray-800 bg-gray-900 p-5 ${className}`}>
      {children}
    </div>
  );
}

export function DashboardOverviewSkeleton({ label = "Loading dashboard..." }) {
  return (
    <div className="space-y-6 bg-gray-950 p-5 sm:p-6" aria-busy="true">
      <section className="flex flex-col gap-5 rounded-2xl border border-gray-800 bg-gray-900 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="w-full max-w-2xl space-y-3">
          <SkeletonBlock className="h-4 w-36" />
          <SkeletonBlock className="h-8 w-full max-w-md" />
          <SkeletonBlock className="h-4 w-full max-w-xl" />
        </div>
        <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-4 lg:w-[560px]">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="rounded-xl border border-gray-800 bg-gray-950 px-4 py-3">
              <SkeletonBlock className="h-3 w-20" />
              <SkeletonBlock className="mt-3 h-8 w-14" />
              <SkeletonBlock className="mt-2 h-3 w-24" />
            </div>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <SkeletonCard>
          <div className="mb-5 flex items-center justify-between gap-4">
            <div className="space-y-2">
              <SkeletonBlock className="h-5 w-28" />
              <SkeletonBlock className="h-4 w-56" />
            </div>
            <SkeletonBlock className="h-8 w-32 rounded-full" />
          </div>
          <div className="flex flex-col items-center gap-5 sm:flex-row">
            <div className="grid h-44 w-44 shrink-0 place-items-center rounded-full bg-gray-800">
              <div className="h-28 w-28 rounded-full bg-gray-900" />
            </div>
            <div className="grid w-full gap-3">
              {[0, 1, 2].map((item) => (
                <SkeletonBlock key={item} className="h-12 w-full rounded-xl" />
              ))}
            </div>
          </div>
        </SkeletonCard>

        <SkeletonCard>
          <div className="mb-5 space-y-2">
            <SkeletonBlock className="h-5 w-32" />
            <SkeletonBlock className="h-4 w-48" />
          </div>
          <div className="space-y-3">
            {[0, 1, 2, 3].map((item) => (
              <SkeletonBlock key={item} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        </SkeletonCard>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {[0, 1, 2].map((card) => (
          <SkeletonCard key={card}>
            <div className="mb-5 space-y-2">
              <SkeletonBlock className="h-5 w-32" />
              <SkeletonBlock className="h-4 w-52" />
            </div>
            <div className="space-y-4">
              {[0, 1, 2, 3].map((item) => (
                <div key={item} className="space-y-2">
                  <div className="flex justify-between gap-3">
                    <SkeletonBlock className="h-4 w-24" />
                    <SkeletonBlock className="h-4 w-12" />
                  </div>
                  <SkeletonBlock className="h-3 w-full rounded-full" />
                </div>
              ))}
            </div>
          </SkeletonCard>
        ))}
      </section>

      <section className="rounded-2xl border border-gray-800 bg-gray-900">
        <div className="flex flex-col gap-4 border-b border-gray-800 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <SkeletonBlock className="h-5 w-32" />
            <SkeletonBlock className="h-4 w-64" />
          </div>
          <div className="flex gap-2">
            {[0, 1, 2, 3].map((item) => (
              <SkeletonBlock key={item} className="h-9 w-20" />
            ))}
          </div>
        </div>
        <div className="space-y-0 p-5">
          {[0, 1, 2, 3, 4].map((item) => (
            <div key={item} className="grid grid-cols-4 gap-4 border-b border-gray-800 py-4 last:border-b-0">
              <SkeletonBlock className="h-4 w-full" />
              <SkeletonBlock className="h-4 w-full" />
              <SkeletonBlock className="hidden h-4 w-full sm:block" />
              <SkeletonBlock className="hidden h-4 w-full sm:block" />
            </div>
          ))}
        </div>
      </section>

      <div className="flex justify-center">
        <LoadingSpinner label={label} />
      </div>
    </div>
  );
}
