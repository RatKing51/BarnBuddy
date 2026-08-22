import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import {
  getAdvisorSharedProject,
  getAdvisorSharedProjects,
  getFfaApiError,
  updateAdvisorProjectSharing,
} from "../api/ffaChapters";
import EmptyState from "./EmptyState";
import { SkeletonBlock, SkeletonCard } from "./LoadingSpinner";
import { useLiveRefresh } from "../hooks/useLiveRefresh";

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

function money(value) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" })
    .format(asNumber(value));
}

function formatDate(value, fallback = "Not set") {
  if (!value) return fallback;
  const parsed = new Date(String(value).length <= 10 ? `${value}T00:00:00Z` : value);
  if (Number.isNaN(parsed.getTime())) return fallback;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}

function normalizeProjectSummary(item) {
  const project = item?.project || item || {};
  const summary = item?.summary || project?.summary || {};
  const shareId = firstDefined(
    item?.shareId,
    item?.share_id,
    project.shareId,
    project.share_id
  );
  const normalizedShareId = typeof shareId === "string" ? shareId.trim() : "";
  return {
    key: normalizedShareId,
    shareId: normalizedShareId,
    name: firstText(project.name, "Shared FFA project"),
    schoolYear: firstText(project.schoolYear, project.school_year),
    saeType: firstText(project.saeType, project.sae_type),
    status: firstText(project.status, "active"),
    updatedAt: firstDefined(project.updatedAt, project.updated_at, item?.sharedAt, item?.shared_at),
    animalCount: asNumber(firstDefined(summary.animalCount, summary.animal_count, project.animalCount, project.animal_count)),
    totalMinutes: asNumber(firstDefined(summary.totalMinutes, summary.total_minutes, project.totalMinutes, project.total_minutes)),
    income: asNumber(firstDefined(summary.income, project.income)),
    expenses: asNumber(firstDefined(summary.expenses, project.expenses)),
  };
}

function normalizeProjectList(data) {
  const candidates = Array.isArray(data)
    ? data
    : firstDefined(data?.projects, data?.sharedProjects, data?.shared_projects, []);
  return Array.isArray(candidates)
    ? candidates.map(normalizeProjectSummary).filter((project) => project.shareId)
    : [];
}

function normalizeProjectDetails(data) {
  const wrappedProject = data?.project;
  const root = data?.details || data?.sharedProject || data?.shared_project
    || (wrappedProject && (
      wrappedProject.project
      || wrappedProject.student
      || wrappedProject.summary
      || wrappedProject.animals
      || wrappedProject.activities
      || wrappedProject.finances
    ) ? wrappedProject : data)
    || {};
  const project = root.project || root;
  const summary = root.summary || project.summary || {};
  const animals = firstDefined(root.animals, project.animals, root.projectAnimals, root.project_animals, []);
  const activities = firstDefined(root.activities, project.activities, root.journal, root.projectActivities, root.project_activities, []);
  const finances = firstDefined(root.finances, project.finances, root.projectFinances, root.project_finances, []);
  const income = asNumber(firstDefined(summary.income, project.income));
  const expenses = asNumber(firstDefined(summary.expenses, project.expenses));

  return {
    project: {
      name: firstText(project.name, "Shared FFA project"),
      schoolYear: firstText(project.schoolYear, project.school_year),
      saeType: firstText(project.saeType, project.sae_type),
      description: firstText(project.description),
      startDate: firstDefined(project.startDate, project.start_date),
      endDate: firstDefined(project.endDate, project.end_date),
      status: firstText(project.status, "active"),
      goals: Array.isArray(project.goals) ? project.goals.filter((goal) => typeof goal === "string" && goal.trim()) : [],
    },
    summary: {
      animalCount: asNumber(firstDefined(summary.animalCount, summary.animal_count, Array.isArray(animals) ? animals.length : 0)),
      totalMinutes: asNumber(firstDefined(summary.totalMinutes, summary.total_minutes)),
      income,
      expenses,
      profit: asNumber(firstDefined(summary.profit, income - expenses)),
    },
    animals: Array.isArray(animals) ? animals : [],
    activities: Array.isArray(activities) ? activities : [],
    finances: Array.isArray(finances) ? finances : [],
  };
}

function labelSaeType(value) {
  return String(value || "")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase()) || "FFA / SAE";
}

function DetailEmpty({ title, description }) {
  return (
    <div className="rounded-xl border border-dashed border-gray-700 bg-gray-950 px-4 py-6 text-center">
      <p className="font-semibold text-white">{title}</p>
      <p className="mt-1 text-sm text-gray-500">{description}</p>
    </div>
  );
}

function SharedProjectDetail({ details }) {
  const { project, summary, animals, activities, finances } = details;

  return (
    <article className="space-y-5">
      <div className="rounded-xl border border-blue-400/20 bg-blue-500/10 p-4 text-sm leading-6 text-blue-100">
        <strong className="text-white">Privacy boundary:</strong> this view contains only the FFA project that the
        student chose to share. BarnBuddy does not include their regular animal profiles, live weights, health or
        vet records, feed records, general finances, account details, or other projects.
      </div>

      <header>
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-blue-300">
          <span>{labelSaeType(project.saeType)}</span>
          {project.schoolYear && <span>{project.schoolYear}</span>}
        </div>
        <h4 className="mt-2 text-2xl font-semibold text-white">{project.name}</h4>
        <p className="mt-2 text-sm text-gray-400">
          {formatDate(project.startDate)} to {formatDate(project.endDate, "Ongoing")} · {project.status}
        </p>
      </header>

      <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ["Animals", summary.animalCount],
          ["Project hours", (summary.totalMinutes / 60).toFixed(1)],
          ["Income", money(summary.income)],
          ["Expenses", money(summary.expenses)],
          ["Net", money(summary.profit)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-gray-700 bg-gray-950 p-3">
            <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</dt>
            <dd className="mt-1 text-lg font-semibold text-white">{value}</dd>
          </div>
        ))}
      </dl>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-700 bg-gray-950 p-4">
          <h5 className="font-semibold text-white">Project plan</h5>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-400">
            {project.description || "No project description was shared."}
          </p>
        </div>
        <div className="rounded-xl border border-gray-700 bg-gray-950 p-4">
          <h5 className="font-semibold text-white">Goals</h5>
          {project.goals.length ? (
            <ul className="mt-2 space-y-2 text-sm leading-6 text-gray-400">
              {project.goals.map((goal, index) => <li key={`${goal}-${index}`}>• {goal}</li>)}
            </ul>
          ) : <p className="mt-2 text-sm text-gray-500">No goals were shared.</p>}
        </div>
      </section>

      <section>
        <h5 className="font-semibold text-white">Starting animal snapshots</h5>
        <p className="mt-1 text-sm text-gray-500">Saved project snapshots only; live animal records are not included.</p>
        {animals.length ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {animals.map((animal, index) => (
              <div key={`${firstText(animal.animalName, animal.animal_name, "animal")}-${index}`} className="rounded-xl border border-gray-700 bg-gray-950 p-4">
                <p className="font-semibold text-white">{firstText(animal.animalName, animal.animal_name, "Project animal")}</p>
                <p className="mt-1 text-xs text-gray-500">
                  {[firstText(animal.species), firstText(animal.tagId, animal.tag_id) ? `Tag ${firstText(animal.tagId, animal.tag_id)}` : ""].filter(Boolean).join(" · ")}
                </p>
                <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div><dt className="text-gray-500">Starting weight</dt><dd className="mt-1 text-white">{firstDefined(animal.startingWeight, animal.starting_weight) ? `${asNumber(firstDefined(animal.startingWeight, animal.starting_weight)).toLocaleString()} lb` : "Not set"}</dd></div>
                  <div><dt className="text-gray-500">Starting value</dt><dd className="mt-1 text-white">{money(firstDefined(animal.startingValue, animal.starting_value))}</dd></div>
                  <div><dt className="text-gray-500">Ownership</dt><dd className="mt-1 text-white">{asNumber(firstDefined(animal.ownershipPercentage, animal.ownership_percentage, 100))}%</dd></div>
                  <div><dt className="text-gray-500">Records from</dt><dd className="mt-1 text-white">{formatDate(firstDefined(animal.recordsFromDate, animal.records_from_date))}</dd></div>
                </dl>
              </div>
            ))}
          </div>
        ) : <div className="mt-3"><DetailEmpty title="No project animals" description="This shared project has no starting animal snapshots." /></div>}
      </section>

      <section>
        <h5 className="font-semibold text-white">Project journal</h5>
        {activities.length ? (
          <div className="mt-3 space-y-3">
            {activities.map((activity, index) => (
              <div key={`${firstText(activity.activityDate, activity.activity_date, "activity")}-${index}`} className="rounded-xl border border-gray-700 bg-gray-950 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div><p className="font-semibold text-white">{firstText(activity.title, "Project activity")}</p><p className="mt-1 text-xs text-blue-300">{firstText(activity.category, "Activity")}</p></div>
                  <span className="text-xs text-gray-500">{formatDate(firstDefined(activity.activityDate, activity.activity_date))} · {asNumber(firstDefined(activity.durationMinutes, activity.duration_minutes))} min</span>
                </div>
                {firstText(activity.description) && <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-400">{activity.description}</p>}
                {firstText(activity.skillsLearned, activity.skills_learned) && <p className="mt-3 text-sm text-gray-400"><strong className="text-gray-300">Skills:</strong> {firstText(activity.skillsLearned, activity.skills_learned)}</p>}
                {firstText(activity.reflection) && <p className="mt-2 whitespace-pre-wrap text-sm text-gray-400"><strong className="text-gray-300">Reflection:</strong> {activity.reflection}</p>}
              </div>
            ))}
          </div>
        ) : <div className="mt-3"><DetailEmpty title="No journal entries" description="The student has not added project activities yet." /></div>}
      </section>

      <section>
        <h5 className="font-semibold text-white">Project finances</h5>
        {finances.length ? (
          <div className="mt-3 overflow-x-auto rounded-xl border border-gray-700">
            <table className="min-w-full divide-y divide-gray-800 text-left text-sm">
              <thead className="bg-gray-950 text-xs uppercase tracking-wide text-gray-500"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Vendor / notes</th><th className="px-4 py-3 text-right">Amount</th></tr></thead>
              <tbody className="divide-y divide-gray-800 bg-gray-950/60">
                {finances.map((finance, index) => (
                  <tr key={`${firstText(finance.transactionDate, finance.transaction_date, "finance")}-${index}`}>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-400">{formatDate(firstDefined(finance.transactionDate, finance.transaction_date))}</td>
                    <td className="px-4 py-3 capitalize text-white">{firstText(finance.transactionType, finance.transaction_type, "Entry")}</td>
                    <td className="px-4 py-3 text-gray-400">{firstText(finance.category, "Other")}</td>
                    <td className="max-w-xs px-4 py-3 text-gray-400">{[firstText(finance.vendor), firstText(finance.notes)].filter(Boolean).join(" · ") || "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-white">{money(finance.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <div className="mt-3"><DetailEmpty title="No project finances" description="The student has not added project income or expenses yet." /></div>}
      </section>
    </article>
  );
}

function ProjectBrowserSkeleton() {
  return (
    <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(240px,0.36fr)_minmax(0,1fr)]" aria-label="Loading shared FFA projects" aria-busy="true">
      <SkeletonCard><SkeletonBlock className="h-5 w-36" />{[0, 1, 2].map((item) => <SkeletonBlock key={item} className="mt-3 h-24 w-full" />)}</SkeletonCard>
      <SkeletonCard><SkeletonBlock className="h-5 w-44" /><SkeletonBlock className="mt-4 h-10 w-2/3" /><SkeletonBlock className="mt-5 h-52 w-full" /></SkeletonCard>
    </div>
  );
}

export default function AdvisorSharedProjects({ enabled, chapterStatus = "ACTIVE", onEnabledChanged }) {
  const [sharingEnabled, setSharingEnabled] = useState(enabled === true);
  const [projects, setProjects] = useState([]);
  const [selectedShareId, setSelectedShareId] = useState(null);
  const [details, setDetails] = useState(null);
  const [loadingProjects, setLoadingProjects] = useState(enabled === true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [listError, setListError] = useState("");
  const [detailError, setDetailError] = useState("");
  const [savingGate, setSavingGate] = useState(false);
  const detailRequest = useRef(0);

  useEffect(() => setSharingEnabled(enabled === true), [enabled]);

  const loadProjects = useCallback(async ({ silent = false } = {}) => {
    try {
      if (!silent) {
        setLoadingProjects(true);
        setListError("");
      }
      const response = await getAdvisorSharedProjects();
      const nextProjects = normalizeProjectList(response.data);
      setProjects(nextProjects);
      setSelectedShareId((current) => nextProjects.some((project) => String(project.shareId) === String(current))
        ? current
        : nextProjects[0]?.shareId ?? null);
    } catch (error) {
      if (!silent) {
        setListError(getFfaApiError(error, "BarnBuddy could not load shared FFA projects."));
      }
    } finally {
      if (!silent) setLoadingProjects(false);
    }
  }, []);

  useEffect(() => {
    if (!sharingEnabled) {
      setProjects([]);
      setSelectedShareId(null);
      setDetails(null);
      setListError("");
      return;
    }
    loadProjects();
  }, [loadProjects, sharingEnabled]);

  const liveRefreshProjects = useCallback(
    () => loadProjects({ silent: true }),
    [loadProjects]
  );
  useLiveRefresh(liveRefreshProjects, { enabled: sharingEnabled });

  useEffect(() => {
    if (!sharingEnabled || !selectedShareId) {
      setDetails(null);
      setDetailError("");
      return;
    }

    const requestId = detailRequest.current + 1;
    detailRequest.current = requestId;
    setLoadingDetails(true);
    setDetailError("");
    getAdvisorSharedProject(selectedShareId)
      .then((response) => {
        if (detailRequest.current === requestId) setDetails(normalizeProjectDetails(response.data));
      })
      .catch((error) => {
        if (detailRequest.current === requestId) {
          setDetails(null);
          setDetailError(getFfaApiError(error, "BarnBuddy could not load that shared project."));
        }
      })
      .finally(() => {
        if (detailRequest.current === requestId) setLoadingDetails(false);
      });
  }, [selectedShareId, sharingEnabled]);

  async function toggleSharingAvailability() {
    const nextEnabled = !sharingEnabled;
    if (!nextEnabled && !window.confirm(
      "Turn off FFA project sharing? Advisor access will stop immediately. Students will need to choose their projects again if sharing is enabled later."
    )) return;

    try {
      setSavingGate(true);
      const response = await updateAdvisorProjectSharing(nextEnabled);
      const returnedEnabled = firstDefined(
        response.data?.projectSharingEnabled,
        response.data?.project_sharing_enabled,
        response.data?.chapter?.projectSharingEnabled,
        response.data?.chapter?.project_sharing_enabled,
        nextEnabled
      ) === true;
      setSharingEnabled(returnedEnabled);
      onEnabledChanged?.(returnedEnabled);
      toast.success(returnedEnabled
        ? "Students can now choose FFA projects to share."
        : "FFA project sharing is off, and advisor access has stopped.");
    } catch (error) {
      toast.error(getFfaApiError(error, "BarnBuddy could not update project sharing."));
    } finally {
      setSavingGate(false);
    }
  }

  return (
    <section className="mt-6 rounded-2xl border border-blue-400/20 bg-gray-900 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-300">Student-selected FFA projects</p>
          <h3 className="mt-2 text-xl font-semibold text-white">Project sharing</h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-400">
            You control whether project sharing is available, but each student controls which individual project
            they share. This area never provides access to regular animal profiles, health or vet records, feed
            records, general finances, account details, or unshared projects.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          <span className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${sharingEnabled ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-100" : "border-gray-700 bg-gray-950 text-gray-300"}`}>
            {sharingEnabled ? "AVAILABLE" : "OFF"}
          </span>
          <button
            type="button"
            onClick={toggleSharingAvailability}
            disabled={savingGate || (!sharingEnabled && chapterStatus !== "ACTIVE")}
            aria-pressed={sharingEnabled}
            className="min-h-11 rounded-xl border border-gray-600 px-4 py-2.5 text-sm font-semibold text-gray-200 transition hover:border-blue-400 hover:bg-blue-500/10 disabled:cursor-not-allowed disabled:opacity-55"
          >
            {savingGate ? "Saving..." : sharingEnabled ? "Turn Off" : "Allow Project Sharing"}
          </button>
        </div>
      </div>

      {!sharingEnabled ? (
        <EmptyState
          className="mt-5"
          title="Project sharing is off"
          description="Students cannot opt projects in, and advisors cannot view prior shares. Turn it on when your chapter is ready to use student-controlled project sharing."
        />
      ) : loadingProjects ? (
        <ProjectBrowserSkeleton />
      ) : listError ? (
        <div className="mt-5 rounded-xl border border-red-400/25 bg-red-500/10 p-5 text-center">
          <p className="text-sm text-red-100">{listError}</p>
          <button type="button" onClick={loadProjects} className="mt-4 min-h-11 rounded-xl border border-red-300/30 px-4 py-2.5 text-sm font-semibold text-red-100 hover:bg-red-500/10">Try again</button>
        </div>
      ) : !projects.length ? (
        <EmptyState
          className="mt-5"
          title="No projects shared yet"
          description="Sharing is available. A project will appear only after a chapter student explicitly chooses to share that individual FFA project."
        />
      ) : (
        <div className="mt-5 grid min-w-0 gap-4 lg:grid-cols-[minmax(240px,0.34fr)_minmax(0,1fr)]">
          <div className="h-fit overflow-hidden rounded-xl border border-gray-700 bg-gray-950">
            <div className="border-b border-gray-800 px-4 py-3">
              <p className="font-semibold text-white">Shared projects</p>
              <p className="mt-1 text-xs text-gray-500">{projects.length} student-selected project{projects.length === 1 ? "" : "s"}</p>
            </div>
            <div className="max-h-[42rem] space-y-2 overflow-y-auto p-2">
              {projects.map((project) => {
                const selected = String(project.shareId) === String(selectedShareId);
                return (
                  <button
                    key={project.key}
                    type="button"
                    onClick={() => setSelectedShareId(project.shareId)}
                    aria-current={selected ? "true" : undefined}
                    className={`w-full rounded-xl border p-3 text-left transition ${selected ? "border-blue-400 bg-blue-500/10" : "border-transparent bg-gray-900 hover:border-gray-700"}`}
                  >
                    <p className="truncate text-sm font-semibold text-white">{project.name}</p>
                    <p className="mt-2 text-xs text-gray-500">{[project.schoolYear, `${project.animalCount} animal${project.animalCount === 1 ? "" : "s"}`, `${(project.totalMinutes / 60).toFixed(1)} hr`].filter(Boolean).join(" · ")}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="min-w-0 rounded-xl border border-gray-700 bg-gray-900/70 p-4 sm:p-5">
            {loadingDetails ? (
              <div aria-label="Loading shared project" aria-busy="true"><SkeletonBlock className="h-5 w-40" /><SkeletonBlock className="mt-4 h-9 w-2/3" /><SkeletonBlock className="mt-5 h-56 w-full" /></div>
            ) : detailError ? (
              <div className="rounded-xl border border-red-400/25 bg-red-500/10 p-5 text-center"><p className="text-sm text-red-100">{detailError}</p><button type="button" onClick={() => { const retry = selectedShareId; setSelectedShareId(null); setTimeout(() => setSelectedShareId(retry), 0); }} className="mt-4 min-h-11 rounded-xl border border-red-300/30 px-4 py-2.5 text-sm font-semibold text-red-100">Try again</button></div>
            ) : details ? <SharedProjectDetail details={details} /> : null}
          </div>
        </div>
      )}
    </section>
  );
}
