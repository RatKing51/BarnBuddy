import { useCallback, useEffect, useMemo, useState } from "react";
import { UserButton } from "@clerk/react";
import { Link, useOutletContext } from "react-router";
import { toast } from "react-toastify";
import {
  getAdvisorFfaChapter,
  getFfaApiError,
  regenerateAdvisorJoinCode,
  removeAdvisorMember,
  updateAdvisorJoining,
} from "../api/ffaChapters";
import EmptyState from "../components/EmptyState";
import AdvisorSharedProjects from "../components/AdvisorSharedProjects";
import { SkeletonBlock, SkeletonCard } from "../components/LoadingSpinner";

function firstDefined(...values) {
  return values.find((value) => value !== undefined && value !== null);
}

function firstText(...values) {
  const match = values.find((value) => typeof value === "string" && value.trim());
  return match ? match.trim() : "";
}

function asNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeMember(member, index) {
  const profile = member?.user || member?.publicUserData || member?.public_user_data || {};
  const role = String(firstDefined(member?.role, profile.role, "org:member"));
  const userId = String(firstDefined(
    member?.userId,
    member?.user_id,
    profile.userId,
    profile.user_id,
    ""
  ));
  const firstName = String(firstDefined(member?.firstName, member?.first_name, profile.firstName, profile.first_name, ""));
  const lastName = String(firstDefined(member?.lastName, member?.last_name, profile.lastName, profile.last_name, ""));
  const email = String(firstDefined(member?.email, member?.emailAddress, member?.email_address, profile.email, profile.identifier, ""));
  const displayName = firstText(
    member?.name,
    member?.fullName,
    member?.full_name,
    profile.name,
    [firstName, lastName].filter(Boolean).join(" "),
    email,
    "Chapter member"
  ) || "Chapter member";

  return {
    key: String(member?.membershipId || member?.membership_id || userId || `member-${index}`),
    userId,
    displayName,
    email,
    role,
    isAdvisor: role === "org:admin" || member?.isAdvisor === true,
  };
}

function normalizeAdvisorData(data) {
  const source = data?.chapter || data?.ffaChapter || data?.advisorChapter || data || {};
  const premium = source.premium || data?.premium || {};
  const memberSource = firstDefined(data?.members, source.members, []);
  const members = Array.isArray(memberSource)
    ? memberSource.map(normalizeMember)
    : [];

  return {
    chapter: {
      chapterName: String(firstDefined(source.chapterName, source.chapter_name, source.name, "FFA Chapter")),
      schoolName: String(firstDefined(source.schoolName, source.school_name, "")),
      state: String(firstDefined(source.state, "")),
      status: String(firstDefined(source.status, "ACTIVE")).toUpperCase(),
      joinCode: String(firstDefined(source.joinCode, source.join_code, data?.joinCode, data?.join_code, "")),
      joinEnabled: firstDefined(source.joinEnabled, source.join_enabled, data?.joinEnabled, false) === true,
      projectSharingEnabled: firstDefined(
        source.projectSharingEnabled,
        source.project_sharing_enabled,
        data?.projectSharingEnabled,
        data?.project_sharing_enabled,
        false
      ) === true,
      premiumActive: firstDefined(
        source.premiumActive,
        source.premium_active,
        premium.active,
        data?.premiumActive,
        false
      ) === true,
      premiumExpiresAt: String(firstDefined(
        source.premiumExpiresAt,
        source.premium_expires_at,
        premium.expiresAt,
        premium.expires_at,
        data?.premiumExpiresAt,
        ""
      )),
      maxMembers: Math.max(1, asNumber(firstDefined(source.maxMembers, source.max_members, data?.maxMembers), 20)),
      memberCount: Math.max(0, asNumber(firstDefined(source.memberCount, source.member_count, data?.memberCount), members.length)),
    },
    members,
  };
}

function formatDate(value) {
  if (!value) return "No expiration date";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Expiration unavailable";
  return new Intl.DateTimeFormat(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
}

function getPremiumState(chapter) {
  const expiresAt = Date.parse(chapter.premiumExpiresAt || "");
  const expired = Number.isFinite(expiresAt) && expiresAt <= Date.now();
  if (chapter.premiumActive && !expired) {
    return {
      label: "ACTIVE",
      detail: chapter.premiumExpiresAt ? `Through ${formatDate(chapter.premiumExpiresAt)}` : "No expiration date",
      classes: "border-emerald-400/25 bg-emerald-400/10 text-emerald-100",
    };
  }
  if (chapter.premiumActive && expired) {
    return {
      label: "EXPIRED",
      detail: `Expired ${formatDate(chapter.premiumExpiresAt)}. Contact BarnBuddy to renew.`,
      classes: "border-amber-300/25 bg-amber-400/10 text-amber-100",
    };
  }
  return {
    label: "INACTIVE",
    detail: "Chapter Premium is not active.",
    classes: "border-gray-700 bg-gray-900 text-gray-300",
  };
}

function AdvisorHeader() {
  return (
    <header className="border-b border-gray-800 bg-gray-900/95 px-4 py-4 shadow-xl shadow-black/20 backdrop-blur sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/dashboard"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-700 px-3.5 py-2 text-sm font-semibold text-gray-200 transition hover:bg-gray-800 hover:text-white"
          >
            Back to Dashboard
          </Link>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-300">BarnBuddy FFA</p>
            <h1 className="mt-1 text-xl font-semibold text-white">Advisor Dashboard</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/settings/account"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-700 px-3.5 py-2 text-sm font-semibold text-gray-300 transition hover:bg-gray-800 hover:text-white"
          >
            Account Settings
          </Link>
          <div className="rounded-full border border-gray-700 bg-gray-800 p-1">
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </div>
    </header>
  );
}

function AdvisorSkeleton() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6" aria-busy="true" aria-label="Loading advisor dashboard">
      <SkeletonCard>
        <SkeletonBlock className="h-4 w-32" />
        <SkeletonBlock className="mt-3 h-9 w-64" />
        <SkeletonBlock className="mt-3 h-4 w-48" />
      </SkeletonCard>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <SkeletonCard key={item}>
            <SkeletonBlock className="h-4 w-24" />
            <SkeletonBlock className="mt-4 h-8 w-32" />
            <SkeletonBlock className="mt-3 h-4 w-full" />
          </SkeletonCard>
        ))}
      </div>
      <SkeletonCard>
        <SkeletonBlock className="h-6 w-36" />
        <SkeletonBlock className="mt-5 h-16 w-full" />
        <SkeletonBlock className="mt-3 h-16 w-full" />
      </SkeletonCard>
    </div>
  );
}

export default function AdvisorDashboard() {
  const routeContext = useOutletContext();
  const initialData = routeContext?.advisorBootstrap || null;
  const [advisorData, setAdvisorData] = useState(() => initialData ? normalizeAdvisorData(initialData) : null);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState("");
  const [action, setAction] = useState("");

  const loadAdvisor = useCallback(async function loadAdvisor({ showLoading = false } = {}) {
    try {
      if (showLoading) setLoading(true);
      setError("");
      const response = await getAdvisorFfaChapter();
      setAdvisorData(normalizeAdvisorData(response.data));
      return true;
    } catch (requestError) {
      setError(getFfaApiError(requestError, "BarnBuddy could not load the advisor dashboard."));
      return false;
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialData) loadAdvisor({ showLoading: true });
  }, [initialData, loadAdvisor]);

  const premiumState = useMemo(
    () => advisorData ? getPremiumState(advisorData.chapter) : null,
    [advisorData]
  );

  async function copyJoinCode() {
    const joinCode = advisorData?.chapter.joinCode;
    if (!joinCode || !navigator.clipboard) {
      toast.error("Copy is unavailable. Select the code and copy it manually.");
      return;
    }

    try {
      await navigator.clipboard.writeText(joinCode);
      toast.success("Chapter code copied.");
    } catch {
      toast.error("Copy is unavailable. Select the code and copy it manually.");
    }
  }

  async function regenerateCode() {
    if (!window.confirm("Regenerate the student join code? The current code will stop working immediately.")) return;

    try {
      setAction("regenerate");
      const response = await regenerateAdvisorJoinCode();
      const returnedCode = String(firstDefined(
        response.data?.joinCode,
        response.data?.join_code,
        response.data?.chapter?.joinCode,
        response.data?.chapter?.join_code,
        ""
      ));
      if (returnedCode) {
        setAdvisorData((current) => current ? {
          ...current,
          chapter: { ...current.chapter, joinCode: returnedCode },
        } : current);
      }
      await loadAdvisor();
      toast.success("A new chapter code is active. The old code no longer works.");
    } catch (requestError) {
      toast.error(getFfaApiError(requestError, "BarnBuddy could not regenerate the chapter code."));
    } finally {
      setAction("");
    }
  }

  async function toggleJoining() {
    if (!advisorData) return;
    const nextEnabled = !advisorData.chapter.joinEnabled;

    try {
      setAction("joining");
      await updateAdvisorJoining(nextEnabled);
      setAdvisorData((current) => current ? {
        ...current,
        chapter: { ...current.chapter, joinEnabled: nextEnabled },
      } : current);
      await loadAdvisor();
      toast.success(nextEnabled ? "Student joining enabled." : "Student joining disabled.");
    } catch (requestError) {
      toast.error(getFfaApiError(requestError, "BarnBuddy could not update student joining."));
    } finally {
      setAction("");
    }
  }

  async function removeMember(member) {
    if (!member.userId || member.isAdvisor) return;
    if (!window.confirm(`Remove ${member.displayName} from this FFA chapter? Their BarnBuddy account and records will remain.`)) return;

    try {
      setAction(`remove:${member.userId}`);
      await removeAdvisorMember(member.userId);
      await loadAdvisor();
      toast.success(`${member.displayName} was removed from the chapter.`);
    } catch (requestError) {
      toast.error(getFfaApiError(requestError, "BarnBuddy could not remove that chapter member."));
    } finally {
      setAction("");
    }
  }

  function projectSharingChanged(enabled) {
    setAdvisorData((current) => current ? {
      ...current,
      chapter: { ...current.chapter, projectSharingEnabled: enabled === true },
    } : current);
  }

  return (
    <div className="dashboard-page min-h-screen bg-gray-950 text-gray-100">
      <AdvisorHeader />

      {loading ? (
        <AdvisorSkeleton />
      ) : error && !advisorData ? (
        <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
          <section className="rounded-2xl border border-red-400/25 bg-red-500/10 p-6 text-center">
            <h2 className="text-2xl font-semibold text-white">Advisor dashboard unavailable</h2>
            <p className="mt-3 text-sm text-red-100/80">{error}</p>
            <button
              type="button"
              onClick={() => loadAdvisor({ showLoading: true })}
              className="mt-6 min-h-11 rounded-xl bg-blue-600 px-5 py-2.5 font-semibold text-white transition hover:bg-blue-500"
            >
              Try again
            </button>
          </section>
        </main>
      ) : advisorData && premiumState ? (
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          {error && (
            <p className="mb-5 rounded-xl border border-amber-300/25 bg-amber-400/10 px-4 py-3 text-sm text-amber-100" role="status">
              {error}
            </p>
          )}

          <section className="rounded-2xl border border-blue-400/20 bg-gradient-to-br from-blue-500/10 via-gray-900 to-gray-900 p-6 shadow-xl shadow-black/15 sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-300">FFA Chapter</p>
                <h2 className="mt-2 text-3xl font-semibold text-white">{advisorData.chapter.chapterName}</h2>
                {(advisorData.chapter.schoolName || advisorData.chapter.state) && (
                  <p className="mt-2 text-gray-400">
                    {[advisorData.chapter.schoolName, advisorData.chapter.state].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>
              <span className={`w-fit rounded-full border px-3 py-1.5 text-xs font-semibold ${
                advisorData.chapter.status === "ACTIVE"
                  ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-100"
                  : "border-red-400/25 bg-red-400/10 text-red-100"
              }`}>
                {advisorData.chapter.status}
              </span>
            </div>
          </section>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <section className={`rounded-2xl border p-5 ${premiumState.classes}`}>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] opacity-75">Premium</p>
              <p className="mt-3 text-2xl font-semibold">{premiumState.label}</p>
              <p className="mt-2 text-sm opacity-80">{premiumState.detail}</p>
            </section>

            <section className="rounded-2xl border border-gray-700 bg-gray-900 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Members</p>
              <p className="mt-3 text-2xl font-semibold text-white">
                {advisorData.chapter.memberCount} / {advisorData.chapter.maxMembers}
              </p>
              <p className="mt-2 text-sm text-gray-400">Current chapter membership</p>
            </section>

            <section className={`rounded-2xl border p-5 ${
              advisorData.chapter.joinEnabled
                ? "border-blue-400/25 bg-blue-500/10"
                : "border-gray-700 bg-gray-900"
            }`}>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Student joining</p>
              <p className="mt-3 text-2xl font-semibold text-white">
                {advisorData.chapter.joinEnabled ? "ENABLED" : "DISABLED"}
              </p>
              <button
                type="button"
                onClick={toggleJoining}
                disabled={action === "joining" || advisorData.chapter.status !== "ACTIVE"}
                className="mt-4 min-h-11 rounded-xl border border-gray-600 px-4 py-2.5 text-sm font-semibold text-gray-200 transition hover:border-blue-400 hover:bg-blue-500/10 disabled:cursor-wait disabled:opacity-55"
              >
                {action === "joining"
                  ? "Saving..."
                  : advisorData.chapter.joinEnabled
                  ? "Disable Joining"
                  : "Enable Joining"}
              </button>
            </section>
          </div>

          <section className="mt-6 rounded-2xl border border-gray-700 bg-gray-900 p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-300">Student join code</p>
                <h3 className="mt-2 text-xl font-semibold text-white">Share privately with chapter students</h3>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-400">
                  Regenerating immediately invalidates the current code. Do not post this code publicly.
                </p>
              </div>
              <span className={`w-fit rounded-full border px-3 py-1 text-xs font-semibold ${
                advisorData.chapter.joinEnabled
                  ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-100"
                  : "border-gray-700 bg-gray-800 text-gray-300"
              }`}>
                {advisorData.chapter.joinEnabled ? "Joining enabled" : "Joining disabled"}
              </span>
            </div>

            <div className="mt-5 flex flex-col gap-3 rounded-xl border border-gray-700 bg-gray-950 p-4 sm:flex-row sm:items-center sm:justify-between">
              <code className="select-all break-all font-mono text-xl font-semibold tracking-[0.14em] text-white">
                {advisorData.chapter.joinCode || "Code unavailable"}
              </code>
              <div className="flex shrink-0 flex-wrap gap-2">
                <button
                  type="button"
                  onClick={copyJoinCode}
                  disabled={!advisorData.chapter.joinCode}
                  className="min-h-11 rounded-xl border border-gray-600 px-4 py-2.5 text-sm font-semibold text-gray-200 transition hover:border-blue-400 hover:bg-gray-800 disabled:opacity-50"
                >
                  Copy Code
                </button>
                <button
                  type="button"
                  onClick={regenerateCode}
                  disabled={action === "regenerate"}
                  className="min-h-11 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-wait disabled:opacity-60"
                >
                  {action === "regenerate" ? "Regenerating..." : "Regenerate Code"}
                </button>
              </div>
            </div>
          </section>

          <AdvisorSharedProjects
            enabled={advisorData.chapter.projectSharingEnabled}
            chapterStatus={advisorData.chapter.status}
            onEnabledChanged={projectSharingChanged}
          />

          <section className="mt-6 rounded-2xl border border-gray-700 bg-gray-900 p-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-300">Members</p>
                <h3 className="mt-2 text-xl font-semibold text-white">Chapter roster</h3>
              </div>
              <span className="text-sm text-gray-400">
                {advisorData.chapter.memberCount} of {advisorData.chapter.maxMembers} members
              </span>
            </div>

            {advisorData.members.length ? (
              <div className="mt-5 divide-y divide-gray-800 overflow-hidden rounded-xl border border-gray-700 bg-gray-950">
                {advisorData.members.map((member) => (
                  <article key={member.key} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-semibold text-white">{member.displayName}</p>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          member.isAdvisor
                            ? "bg-blue-500/15 text-blue-200"
                            : "bg-gray-800 text-gray-300"
                        }`}>
                          {member.isAdvisor ? "Advisor" : "Student"}
                        </span>
                      </div>
                      {member.email && <p className="mt-1 truncate text-sm text-gray-400">{member.email}</p>}
                    </div>
                    {!member.isAdvisor && member.userId && (
                      <button
                        type="button"
                        onClick={() => removeMember(member)}
                        disabled={action === `remove:${member.userId}`}
                        className="min-h-11 shrink-0 rounded-xl border border-red-400/25 px-4 py-2.5 text-sm font-semibold text-red-200 transition hover:bg-red-500/10 disabled:cursor-wait disabled:opacity-60"
                      >
                        {action === `remove:${member.userId}` ? "Removing..." : "Remove"}
                      </button>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState
                className="mt-5"
                title="No chapter members yet"
                description="Enable joining and share the private code when students are ready to join."
              />
            )}
          </section>
        </main>
      ) : null}
    </div>
  );
}
