import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { toast } from "react-toastify";
import { getFfaApiError, getMyFfaChapter, joinFfaChapter } from "../api/ffaChapters";
import { useAuth } from "../context/AuthContext";
import { SkeletonBlock } from "./LoadingSpinner";

const genericJoinError = "That chapter code is invalid or unavailable.";

function firstDefined(...values) {
  return values.find((value) => value !== undefined && value !== null);
}

function normalizeChapterResponse(data) {
  const membership = data?.membership || data?.ffaMembership || null;
  const source = data?.chapter || data?.ffaChapter || membership?.chapter || null;
  if (!source || data?.member === false || data?.isMember === false) return null;

  const premium = source.premium || data?.premium || {};
  const role = String(firstDefined(membership?.role, data?.role, source.role, "org:member"));

  return {
    chapterName: String(firstDefined(source.chapterName, source.chapter_name, source.name, "FFA Chapter")),
    schoolName: String(firstDefined(source.schoolName, source.school_name, "")),
    state: String(firstDefined(source.state, "")),
    role,
    isAdvisor: firstDefined(data?.isAdvisor, membership?.isAdvisor, source.isAdvisor, role === "org:admin") === true,
    advisorDashboardAvailable: firstDefined(
      data?.advisorDashboardAvailable,
      data?.hasAdvisorMembership,
      source.advisorDashboardAvailable,
      source.hasAdvisorMembership,
      role === "org:admin"
    ) === true,
    premiumActive: firstDefined(
      source.premiumActive,
      source.premium_active,
      premium.active,
      data?.chapterPremiumActive,
      false
    ) === true,
    premiumExpiresAt: String(firstDefined(
      source.premiumExpiresAt,
      source.premium_expires_at,
      premium.expiresAt,
      premium.expires_at,
      data?.chapterPremiumExpiresAt,
      ""
    )),
  };
}

function formatChapterDate(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
}

function chapterPremiumIsCurrent(chapter) {
  if (!chapter?.premiumActive) return false;
  if (!chapter.premiumExpiresAt) return true;
  const expiresAt = Date.parse(chapter.premiumExpiresAt);
  return Number.isFinite(expiresAt) && expiresAt > Date.now();
}

function cleanCodeInput(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "")
    .slice(0, 24);
}

export default function FfaChapterSettingsCard() {
  const { refreshBackendUser } = useAuth();
  const [chapter, setChapter] = useState(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [loadError, setLoadError] = useState("");

  const loadChapter = useCallback(async function loadChapter() {
    try {
      setLoading(true);
      setLoadError("");
      const response = await getMyFfaChapter();
      setChapter(normalizeChapterResponse(response.data));
    } catch (error) {
      setLoadError(getFfaApiError(error, "BarnBuddy could not load your FFA chapter status."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadChapter();
  }, [loadChapter]);

  async function handleJoin(event) {
    event.preventDefault();
    const normalizedCode = code.trim();
    if (!normalizedCode) {
      toast.error(genericJoinError);
      return;
    }

    try {
      setJoining(true);
      const response = await joinFfaChapter(normalizedCode);
      let joinedChapter = normalizeChapterResponse(response.data);

      if (!joinedChapter) {
        const chapterResponse = await getMyFfaChapter();
        joinedChapter = normalizeChapterResponse(chapterResponse.data);
      }

      setChapter(joinedChapter);
      setCode("");

      try {
        await refreshBackendUser({ refreshFfaAccess: true });
      } catch {
        // The membership is already complete; the next authenticated refresh will reconcile access state.
      }

      toast.success(
        joinedChapter?.chapterName
          ? `You're now a member of ${joinedChapter.chapterName}.`
          : "You joined the FFA chapter."
      );
    } catch (error) {
      const status = error?.response?.status;
      const message = [400, 403, 404].includes(status)
        ? genericJoinError
        : getFfaApiError(error, genericJoinError);
      toast.error(message);
    } finally {
      setJoining(false);
    }
  }

  if (loading) {
    return (
      <section
        className="rounded-2xl border border-gray-700 bg-gray-800 p-6"
        aria-label="Loading FFA chapter status"
        aria-busy="true"
      >
        <SkeletonBlock className="h-6 w-36" />
        <SkeletonBlock className="mt-3 h-4 w-full max-w-md" />
        <SkeletonBlock className="mt-5 h-12 w-full rounded-xl" />
      </section>
    );
  }

  if (loadError) {
    return (
      <section className="rounded-2xl border border-amber-400/25 bg-amber-400/10 p-6">
        <h2 className="text-xl font-semibold text-white">FFA Chapter</h2>
        <p className="mt-2 text-sm text-amber-100/80">{loadError}</p>
        <button
          type="button"
          onClick={loadChapter}
          className="mt-5 min-h-11 rounded-lg border border-amber-300/30 px-4 py-2.5 text-sm font-semibold text-amber-100 transition hover:bg-amber-300/10"
        >
          Try again
        </button>
      </section>
    );
  }

  if (chapter) {
    const premiumCurrent = chapterPremiumIsCurrent(chapter);
    const premiumDate = formatChapterDate(chapter.premiumExpiresAt);

    return (
      <section className="rounded-2xl border border-blue-400/25 bg-blue-500/10 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-300">FFA Chapter</p>
            <h2 className="mt-2 text-xl font-semibold text-white">{chapter.chapterName}</h2>
            {(chapter.schoolName || chapter.state) && (
              <p className="mt-1 text-sm text-blue-100/75">
                {[chapter.schoolName, chapter.state].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
          <span className="w-fit rounded-full border border-blue-300/25 bg-blue-400/10 px-3 py-1 text-xs font-semibold text-blue-100">
            {chapter.advisorDashboardAvailable ? "Advisor access" : "Student member"}
          </span>
        </div>

        <div className="mt-5 rounded-xl border border-blue-300/15 bg-gray-950/35 p-4">
          <p className="font-semibold text-white">Your account is connected to this chapter</p>
          <p className="mt-2 text-sm leading-6 text-blue-100/70">
            {chapter.advisorDashboardAvailable
              ? "Use the Advisor Dashboard to manage student joining, watch the chapter roster, and review only the FFA projects students choose to share."
              : "Your chapter membership may provide Premium tools. Your advisor cannot see your regular BarnBuddy records, and an FFA project stays private unless you choose to share that project."}
          </p>
        </div>

        {premiumCurrent && (
          <div className="mt-5 rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-3">
            <p className="font-semibold text-emerald-100">Premium provided by chapter</p>
            <p className="mt-1 text-sm text-emerald-100/75">
              {premiumDate ? `Active through ${premiumDate}` : "Active"}
            </p>
          </div>
        )}

        {chapter.advisorDashboardAvailable ? (
          <Link
            to="/advisor"
            className="mt-5 inline-flex min-h-11 items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
          >
            Open Advisor Dashboard
          </Link>
        ) : (
          <div className="mt-5 flex flex-col gap-3 rounded-xl border border-gray-700/80 bg-gray-950/35 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-white">Ready to use your chapter connection?</p>
              <p className="mt-1 text-sm text-gray-400">Create or open an FFA project, then choose whether that individual project is shared.</p>
            </div>
            <Link
              to="/dashboard/ffa-projects"
              className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
            >
              Open FFA Projects
            </Link>
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-gray-700 bg-gray-800 p-6">
      <h2 className="text-xl font-semibold text-white">FFA Chapter</h2>
      <p className="mt-2 text-sm leading-relaxed text-gray-400">
        Students can enter the private code shared by their advisor to connect their BarnBuddy account. Advisors join through the secure email invitation sent for their chapter.
      </p>

      <form onSubmit={handleJoin} className="mt-5" autoComplete="off">
        <label className="block" htmlFor="ffa-chapter-code">
          <span className="text-sm text-gray-400">Chapter code</span>
          <input
            id="ffa-chapter-code"
            name="ffaChapterCode"
            value={code}
            onChange={(event) => setCode(cleanCodeInput(event.target.value))}
            placeholder="K7PM-XQ4T-9WRC"
            inputMode="text"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck="false"
            disabled={joining}
            className="mt-2 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-3 font-mono uppercase tracking-[0.12em] text-white outline-none placeholder:tracking-normal placeholder:text-gray-500 focus:border-blue-400 disabled:cursor-wait disabled:opacity-65"
          />
        </label>

        <button
          type="submit"
          disabled={joining || !code.trim()}
          className="mt-4 min-h-11 rounded-lg bg-blue-600 px-5 py-2.5 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-wait disabled:opacity-60"
        >
          {joining ? "Joining chapter..." : "Join as a Student"}
        </button>
      </form>
    </section>
  );
}
