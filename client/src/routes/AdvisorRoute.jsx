import { useCallback, useEffect, useRef, useState } from "react";
import { Link, Navigate, Outlet, useLocation } from "react-router";
import { getAdvisorFfaChapter, getFfaApiError } from "../api/ffaChapters";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { useAuth } from "../context/AuthContext";

const ADVISOR_SYNC_RETRY_DELAYS_MS = [700, 1_400, 2_500];

function wait(milliseconds) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

export default function AdvisorRoute() {
  const location = useLocation();
  const { refreshBackendUser } = useAuth();
  const verificationRun = useRef(0);
  const [advisorBootstrap, setAdvisorBootstrap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState("");

  const verifyAdvisor = useCallback(async function verifyAdvisor({ retryMembershipSync = true } = {}) {
    const runId = ++verificationRun.current;
    setLoading(true);
    setStatus(null);
    setError("");

    const attempts = retryMembershipSync ? ADVISOR_SYNC_RETRY_DELAYS_MS.length + 1 : 1;
    let lastError = null;

    for (let attempt = 0; attempt < attempts; attempt += 1) {
      try {
        const response = await getAdvisorFfaChapter();
        if (verificationRun.current !== runId) return;
        setAdvisorBootstrap(response.data);
        setStatus(null);
        setError("");
        setLoading(false);
        refreshBackendUser().catch(() => {});
        return;
      } catch (requestError) {
        lastError = requestError;
        const requestStatus = requestError?.response?.status || null;
        const shouldRetry = requestStatus === 403 && attempt < attempts - 1;
        if (!shouldRetry) break;
        await wait(ADVISOR_SYNC_RETRY_DELAYS_MS[attempt]);
        if (verificationRun.current !== runId) return;
      }
    }

    if (verificationRun.current !== runId) return;
    setStatus(lastError?.response?.status || null);
    setError(getFfaApiError(lastError, "BarnBuddy could not verify advisor access."));
    setAdvisorBootstrap(null);
    setLoading(false);
  }, [refreshBackendUser]);

  useEffect(() => {
    verifyAdvisor();
    return () => {
      verificationRun.current += 1;
    };
  }, [verifyAdvisor]);

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-gray-950 px-4 text-gray-100">
        <LoadingSpinner label="Checking advisor access..." />
      </main>
    );
  }

  if (status === 401) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ returnTo: `${location.pathname}${location.search}${location.hash}` }}
      />
    );
  }

  if (status === 403 || status === 404) {
    return (
      <main className="grid min-h-screen place-items-center bg-gray-950 px-4 text-gray-100">
        <section className="w-full max-w-lg rounded-2xl border border-amber-300/25 bg-amber-400/10 p-6 text-center sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-200">FFA Chapters</p>
          <h1 className="mt-3 text-2xl font-semibold text-white">Advisor access required</h1>
          <p className="mt-3 text-sm leading-relaxed text-amber-100/80">
            This dashboard is available only to advisors of an FFA chapter connected to BarnBuddy.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-amber-100/70">
            If you just accepted an advisor invitation, Clerk may need a few seconds to finish adding the membership.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => verifyAdvisor()}
              className="min-h-11 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
            >
              Check Again
            </button>
            <Link
              to="/dashboard"
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
            >
              Back to Dashboard
            </Link>
            <Link
              to="/settings/account"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-600 bg-gray-900 px-4 py-2.5 text-sm font-semibold text-gray-200 transition hover:bg-gray-800"
            >
              Account Settings
            </Link>
          </div>
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <main className="grid min-h-screen place-items-center bg-gray-950 px-4 text-gray-100">
        <section className="w-full max-w-lg rounded-2xl border border-red-400/25 bg-red-500/10 p-6 text-center sm:p-8">
          <h1 className="text-2xl font-semibold text-white">Advisor dashboard unavailable</h1>
          <p className="mt-3 text-sm leading-relaxed text-red-100/80">{error}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={verifyAdvisor}
              className="min-h-11 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
            >
              Try again
            </button>
            <Link
              to="/dashboard"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-600 bg-gray-900 px-4 py-2.5 text-sm font-semibold text-gray-200 transition hover:bg-gray-800"
            >
              Back to Dashboard
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return <Outlet context={{ advisorBootstrap }} />;
}
