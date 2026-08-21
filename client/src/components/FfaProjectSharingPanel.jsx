import { useMemo, useState } from "react";
import { toast } from "react-toastify";
import { updateFfaProjectSharing } from "../api/ffaProjects";
import { normalizeProjectSharing } from "../utils/ffaProjectSharing";

function responseWithSharing(details, data, fallback) {
  const source = data?.sharing || data?.advisorSharing || data?.advisor_sharing;
  const sharing = source || fallback;

  if (data?.project && data?.summary && Array.isArray(data?.animals)) {
    return { ...data, sharing };
  }

  return {
    ...details,
    sharing,
    project: {
      ...details.project,
      sharing,
    },
  };
}

export default function FfaProjectSharingPanel({ details, onChanged }) {
  const sharing = useMemo(() => normalizeProjectSharing(details), [details]);
  const [saving, setSaving] = useState(false);
  const projectId = details?.project?.id;
  const canEnable = sharing.available && !sharing.optedIn;
  const canDisable = sharing.optedIn;

  async function updateSharing() {
    if (!projectId || (!canEnable && !canDisable)) return;
    const nextShared = !sharing.optedIn;

    try {
      setSaving(true);
      const response = await updateFfaProjectSharing(projectId, nextShared);
      const fallback = {
        ...sharing,
        optedIn: nextShared,
        effective: nextShared && sharing.available,
        sharedAt: nextShared ? sharing.sharedAt : "",
      };
      onChanged(responseWithSharing(details, response.data, fallback));
      toast.success(nextShared
        ? "This FFA project is now shared with your chapter advisor."
        : "This FFA project is private again.");
    } catch (error) {
      toast.error(error?.response?.data?.error || "BarnBuddy could not update project sharing.");
    } finally {
      setSaving(false);
    }
  }

  const state = sharing.effective
    ? {
      label: "Shared with advisor",
      classes: "border-emerald-400/25 bg-emerald-500/10 text-emerald-200",
    }
    : sharing.optedIn
      ? {
        label: "Sharing paused",
        classes: "border-amber-300/25 bg-amber-400/10 text-amber-100",
      }
      : {
        label: "Private",
        classes: "border-slate-700 bg-slate-950 text-slate-300",
      };

  return (
    <section className="rounded-2xl border border-blue-400/20 bg-blue-500/5 p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-300">Advisor sharing</p>
          <h3 className="mt-2 text-lg font-black text-white">You choose which projects your advisor can see</h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
            Sharing applies only to this FFA project. Your chapter&apos;s current verified advisor can see its plan,
            goals, starting animal snapshots, project journal, and project finances while sharing is active.
          </p>
        </div>
        <span className={`w-fit shrink-0 rounded-full border px-3 py-1.5 text-xs font-black ${state.classes}`}>
          {state.label}
        </span>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-emerald-400/15 bg-emerald-500/5 p-4">
          <p className="text-sm font-black text-emerald-200">Included when you share</p>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Project details and goals, saved starting snapshots, journal activities and reflections, and this
            project&apos;s income, expenses, vendors, and notes.
          </p>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-950 p-4">
          <p className="text-sm font-black text-white">Always stays private</p>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Your regular animal profiles, live weights, health and vet records, feed records, general finances,
            account details, and every FFA project you have not separately shared.
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 rounded-xl border border-slate-700 bg-slate-950 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-bold text-white">
            {sharing.chapterName || "Your FFA chapter"}
          </p>
          <p className="mt-1 text-sm text-slate-400">
            {sharing.available
              ? sharing.optedIn
                ? "You can stop sharing this project at any time."
                : "Your advisor allows students to share selected FFA projects."
              : sharing.optedIn
                ? "Your advisor has paused chapter project sharing. Remove your consent if you want this project to remain unshared if availability returns."
                : "Sharing is unavailable until you are in an eligible chapter and its advisor enables project sharing."}
          </p>
        </div>
        <button
          type="button"
          onClick={updateSharing}
          disabled={saving || (!canEnable && !canDisable)}
          aria-pressed={sharing.optedIn}
          className={`min-h-11 shrink-0 rounded-xl px-4 py-2.5 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-50 ${
            sharing.optedIn
              ? "border border-rose-400/30 text-rose-200 hover:bg-rose-500/10"
              : "bg-blue-600 text-white hover:bg-blue-500"
          }`}
        >
          {saving ? "Saving..." : sharing.optedIn ? "Stop sharing" : "Share this project"}
        </button>
      </div>
    </section>
  );
}
