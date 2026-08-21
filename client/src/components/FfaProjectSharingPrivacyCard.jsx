import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  getFfaProjectAdvisorShares,
  updateFfaProjectSharing,
} from "../api/ffaProjects";
import { SkeletonBlock } from "./LoadingSpinner";

function firstDefined(...values) {
  return values.find((value) => value !== undefined && value !== null);
}

function firstText(...values) {
  const match = values.find((value) => typeof value === "string" && value.trim());
  return match ? match.trim() : "";
}

function normalizeShares(data) {
  const candidates = Array.isArray(data)
    ? data
    : firstDefined(
      data?.shares,
      data?.advisorShares,
      data?.advisor_shares,
      data?.projects,
      []
    );
  if (!Array.isArray(candidates)) return [];

  const uniqueShares = new Map();
  candidates.forEach((item) => {
    const project = item?.project || {};
    const chapter = item?.chapter || {};
    const projectId = firstDefined(
      item?.projectId,
      item?.project_id,
      project.id,
      item?.id
    );
    const key = String(projectId ?? "").trim();
    if (!key) return;

    uniqueShares.set(key, {
      key,
      projectId,
      name: firstText(item?.name, item?.projectName, item?.project_name, project.name, "FFA project"),
      chapterName: firstText(
        item?.chapterName,
        item?.chapter_name,
        chapter.chapterName,
        chapter.chapter_name,
        chapter.name,
        "FFA chapter"
      ),
      sharedAt: firstDefined(item?.sharedAt, item?.shared_at, project.sharedAt, project.shared_at),
    });
  });

  return [...uniqueShares.values()];
}

function formatSharedDate(value) {
  if (!value) return "Share date unavailable";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Share date unavailable";
  return `Shared ${new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsed)}`;
}

function errorMessage(error, fallback = "BarnBuddy could not load your shared FFA projects.") {
  const candidate = error?.response?.data?.error || error?.response?.data?.message;
  return typeof candidate === "string" && candidate.trim()
    ? candidate.trim()
    : fallback;
}

export default function FfaProjectSharingPrivacyCard() {
  const [shares, setShares] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revokingId, setRevokingId] = useState("");

  const loadShares = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await getFfaProjectAdvisorShares();
      setShares(normalizeShares(response.data));
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError("");
        const response = await getFfaProjectAdvisorShares();
        if (active) setShares(normalizeShares(response.data));
      } catch (requestError) {
        if (active) setError(errorMessage(requestError));
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => { active = false; };
  }, []);

  async function stopSharing(share) {
    if (!window.confirm(
      `Stop sharing “${share.name}” with ${share.chapterName}? Advisor access to this project will end immediately. The project and your records will stay in BarnBuddy.`
    )) return;

    try {
      setRevokingId(share.key);
      await updateFfaProjectSharing(share.projectId, false);
      setShares((current) => current.filter((item) => item.key !== share.key));
      toast.success(`${share.name} is private again.`);
    } catch (requestError) {
      toast.error(errorMessage(requestError, "BarnBuddy could not stop sharing that FFA project."));
    } finally {
      setRevokingId("");
    }
  }

  return (
    <section className="rounded-2xl border border-blue-400/20 bg-gray-800 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-300">Privacy</p>
          <h2 className="mt-2 text-xl font-semibold text-white">FFA project sharing</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-400">
            Review projects you explicitly shared with an FFA chapter advisor. This list is available even without
            Premium so you can stop sharing at any time. It never exposes project details here.
          </p>
        </div>
        <span className="w-fit rounded-full border border-gray-600 bg-gray-900 px-3 py-1.5 text-xs font-semibold text-gray-300">
          Revoke only
        </span>
      </div>

      {loading ? (
        <div className="mt-5 space-y-3" aria-label="Loading shared FFA projects" aria-busy="true">
          {[0, 1].map((item) => (
            <div key={item} className="rounded-xl border border-gray-700 bg-gray-900 p-4">
              <SkeletonBlock className="h-4 w-48" />
              <SkeletonBlock className="mt-3 h-3 w-64 max-w-full" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="mt-5 rounded-xl border border-amber-300/25 bg-amber-400/10 p-4" role="status">
          <p className="text-sm text-amber-100">{error}</p>
          <button
            type="button"
            onClick={loadShares}
            className="mt-3 min-h-11 rounded-lg border border-amber-200/30 px-4 py-2.5 text-sm font-semibold text-amber-100 transition hover:bg-amber-400/10"
          >
            Try again
          </button>
        </div>
      ) : shares.length ? (
        <div className="mt-5 divide-y divide-gray-700 overflow-hidden rounded-xl border border-gray-700 bg-gray-900">
          {shares.map((share) => (
            <article key={share.key} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate font-semibold text-white">{share.name}</p>
                <p className="mt-1 text-sm text-gray-400">
                  {share.chapterName} · {formatSharedDate(share.sharedAt)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => stopSharing(share)}
                disabled={Boolean(revokingId)}
                className="min-h-11 shrink-0 rounded-lg border border-red-400/30 px-4 py-2.5 text-sm font-semibold text-red-200 transition hover:bg-red-500/10 disabled:cursor-wait disabled:opacity-55"
              >
                {revokingId === share.key ? "Stopping..." : "Stop sharing"}
              </button>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-xl border border-dashed border-gray-700 bg-gray-900 px-5 py-6 text-center">
          <p className="font-semibold text-white">No FFA projects are shared</p>
          <p className="mt-1 text-sm text-gray-400">Your advisor cannot view any of your FFA projects.</p>
        </div>
      )}

      <p className="mt-4 text-xs leading-5 text-gray-500">
        Sharing cannot be started from Account Settings. To opt in, your advisor must first allow project sharing,
        then you must choose an individual project from its FFA Project Setup screen.
      </p>
    </section>
  );
}
