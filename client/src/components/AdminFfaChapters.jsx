import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
  createAdminFfaChapter,
  deleteAdminFfaChapter,
  getAdminFfaChapter,
  getAdminFfaChapterMembers,
  getAdminFfaChapters,
  getFfaApiError,
  regenerateAdminJoinCode,
  removeAdminFfaChapterMember,
  updateAdminFfaChapter,
} from "../api/ffaChapters";
import EmptyState from "./EmptyState";
import { LoadingSpinner, SkeletonBlock } from "./LoadingSpinner";

const emptyChapterForm = {
  chapterName: "",
  schoolName: "",
  chapterNumber: "",
  state: "",
  advisorName: "",
  advisorEmail: "",
  maxMembers: "20",
  joinEnabled: false,
  premiumActive: false,
  premiumExpiresAt: "",
  status: "ACTIVE",
};

const fieldClass =
  "mt-2 min-h-11 w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3.5 py-2.5 text-base text-white outline-none transition placeholder:text-slate-500 focus:border-sky-300 focus:ring-2 focus:ring-sky-400/15 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm";

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

function toDateInput(value) {
  if (!value) return "";
  const match = String(value).match(/^\d{4}-\d{2}-\d{2}/);
  return match?.[0] || "";
}

function formatDate(value, fallback = "Not set") {
  if (!value) return fallback;
  const dateValue = /^\d{4}-\d{2}-\d{2}$/.test(String(value))
    ? `${value}T12:00:00`
    : value;
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return fallback;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
}

function expirationPayload(value) {
  return value ? `${value}T23:59:59.999Z` : null;
}

function normalizeChapter(raw = {}, response = {}) {
  const premium = raw.premium || response.premium || {};
  const memberCountValue = raw.memberCount !== undefined
    ? raw.memberCount
    : raw.member_count !== undefined
    ? raw.member_count
    : response.memberCount;
  return {
    id: String(firstDefined(raw.id, raw.chapterId, raw.chapter_id, "")),
    chapterName: String(firstDefined(raw.chapterName, raw.chapter_name, raw.name, "FFA Chapter")),
    schoolName: String(firstDefined(raw.schoolName, raw.school_name, "")),
    chapterNumber: String(firstDefined(raw.chapterNumber, raw.chapter_number, "")),
    state: String(firstDefined(raw.state, "")),
    advisorName: String(firstDefined(raw.advisorName, raw.advisor_name, "")),
    advisorEmail: String(firstDefined(raw.advisorEmail, raw.advisor_email, "")),
    maxMembers: Math.max(1, asNumber(firstDefined(raw.maxMembers, raw.max_members), 20)),
    memberCount: memberCountValue === null || memberCountValue === undefined
      ? null
      : Math.max(0, asNumber(memberCountValue, 0)),
    clerkOrganizationAvailable: firstDefined(
      raw.clerkOrganizationAvailable,
      raw.clerk_organization_available,
      response.clerkOrganizationAvailable,
      true
    ) !== false,
    status: String(firstDefined(raw.status, "ACTIVE")).toUpperCase(),
    joinEnabled: firstDefined(raw.joinEnabled, raw.join_enabled, false) === true,
    joinCode: String(firstDefined(raw.joinCode, raw.join_code, response.joinCode, response.join_code, "")),
    premiumActive: firstDefined(raw.premiumActive, raw.premium_active, premium.active, false) === true,
    premiumExpiresAt: String(firstDefined(
      raw.premiumExpiresAt,
      raw.premium_expires_at,
      premium.expiresAt,
      premium.expires_at,
      ""
    )),
    createdAt: String(firstDefined(raw.createdAt, raw.created_at, "")),
    updatedAt: String(firstDefined(raw.updatedAt, raw.updated_at, "")),
  };
}

function normalizeChapterResponse(data) {
  const source = data?.chapter || data?.ffaChapter || data || {};
  return normalizeChapter(source, data || {});
}

function normalizeChapterList(data) {
  const source = Array.isArray(data)
    ? data
    : firstDefined(data?.chapters, data?.items, data?.results, []);
  return Array.isArray(source) ? source.map((chapter) => normalizeChapter(chapter)) : [];
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
  const name = firstText(
    member?.name,
    member?.fullName,
    member?.full_name,
    profile.name,
    [firstName, lastName].filter(Boolean).join(" "),
    email
  ) || "Chapter member";

  return {
    key: String(member?.membershipId || member?.membership_id || userId || `member-${index}`),
    userId,
    name,
    email,
    role,
    isAdvisor: role === "org:admin" || member?.isAdvisor === true,
  };
}

function normalizeMemberList(data) {
  const source = Array.isArray(data)
    ? data
    : firstDefined(data?.members, data?.memberships, data?.items, []);
  return Array.isArray(source) ? source.map(normalizeMember) : [];
}

function chapterPremiumState(chapter) {
  const expiresAt = Date.parse(chapter.premiumExpiresAt || "");
  const expired = Number.isFinite(expiresAt) && expiresAt <= Date.now();
  if (chapter.premiumActive && !expired) return "active";
  if (chapter.premiumActive && expired) return "expired";
  return "inactive";
}

function memberCountLabel(chapter) {
  return chapter.memberCount === null
    ? `Unavailable / ${chapter.maxMembers}`
    : `${chapter.memberCount} / ${chapter.maxMembers}`;
}

function oneYearFromToday() {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1);
  return date.toISOString().slice(0, 10);
}

function Field({ label, required = false, children, span = "" }) {
  return (
    <label className={`block ${span}`}>
      <span className="text-xs font-bold uppercase tracking-[0.13em] text-slate-400">
        {label}{required && <span className="text-sky-300"> *</span>}
      </span>
      {children}
    </label>
  );
}

function StatusBadge({ children, tone = "slate" }) {
  const tones = {
    slate: "border-slate-700 bg-slate-800 text-slate-300",
    sky: "border-sky-300/25 bg-sky-400/10 text-sky-100",
    emerald: "border-emerald-300/25 bg-emerald-400/10 text-emerald-100",
    amber: "border-amber-300/25 bg-amber-400/10 text-amber-100",
    red: "border-red-300/25 bg-red-400/10 text-red-100",
  };
  return (
    <span className={`inline-flex w-fit rounded-full border px-2.5 py-1 text-xs font-semibold ${tones[tone] || tones.slate}`}>
      {children}
    </span>
  );
}

function ChapterForm({ initialValue = emptyChapterForm, includeStatus = false, saving, submitLabel, onSubmit, onCancel }) {
  const [form, setForm] = useState(() => ({ ...emptyChapterForm, ...initialValue }));

  useEffect(() => {
    setForm({ ...emptyChapterForm, ...initialValue });
  }, [initialValue]);

  function change(event) {
    const { name, value, checked, type } = event.target;
    setForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  }

  function submit(event) {
    event.preventDefault();
    onSubmit({
      chapterName: form.chapterName.trim(),
      schoolName: form.schoolName.trim(),
      chapterNumber: form.chapterNumber.trim(),
      state: form.state.trim(),
      advisorName: form.advisorName.trim(),
      advisorEmail: form.advisorEmail.trim(),
      maxMembers: Math.max(1, Number.parseInt(form.maxMembers, 10) || 20),
      joinEnabled: form.joinEnabled === true,
      premiumActive: form.premiumActive === true,
      premiumExpiresAt: expirationPayload(form.premiumExpiresAt),
      ...(includeStatus ? { status: form.status } : {}),
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <fieldset>
        <legend className="text-sm font-bold uppercase tracking-[0.16em] text-sky-300">Chapter</legend>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Chapter Name" required span="sm:col-span-2">
            <input className={fieldClass} name="chapterName" value={form.chapterName} onChange={change} required maxLength="160" />
          </Field>
          <Field label="School Name">
            <input className={fieldClass} name="schoolName" value={form.schoolName} onChange={change} maxLength="200" />
          </Field>
          <Field label="Chapter Number">
            <input className={fieldClass} name="chapterNumber" value={form.chapterNumber} onChange={change} maxLength="80" />
          </Field>
          <Field label="State">
            <input className={fieldClass} name="state" value={form.state} onChange={change} maxLength="80" />
          </Field>
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-bold uppercase tracking-[0.16em] text-sky-300">Advisor</legend>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Advisor Name" required>
            <input className={fieldClass} name="advisorName" value={form.advisorName} onChange={change} required maxLength="160" />
          </Field>
          <Field label="Advisor Email" required>
            <input className={fieldClass} type="email" name="advisorEmail" value={form.advisorEmail} onChange={change} required maxLength="254" disabled={includeStatus} />
            {includeStatus && (
              <span className="mt-2 block text-xs leading-relaxed text-slate-500">
                Advisor membership transfer is not available in version one.
              </span>
            )}
          </Field>
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-bold uppercase tracking-[0.16em] text-sky-300">Membership</legend>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Maximum Members">
            <input className={fieldClass} type="number" min="1" max="500" name="maxMembers" value={form.maxMembers} onChange={change} required />
          </Field>
          <label className="flex min-h-11 items-center justify-between gap-4 rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3 sm:self-end">
            <span>
              <span className="block text-sm font-semibold text-white">Allow Students to Join</span>
              <span className="mt-1 block text-xs text-slate-500">Uses the private chapter code.</span>
            </span>
            <input type="checkbox" name="joinEnabled" checked={form.joinEnabled} onChange={change} className="h-5 w-5 accent-sky-500" />
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-bold uppercase tracking-[0.16em] text-sky-300">Premium</legend>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="flex min-h-11 items-center justify-between gap-4 rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3">
            <span>
              <span className="block text-sm font-semibold text-white">Premium Active</span>
              <span className="mt-1 block text-xs text-slate-500">Managed manually by BarnBuddy.</span>
            </span>
            <input type="checkbox" name="premiumActive" checked={form.premiumActive} onChange={change} className="h-5 w-5 accent-sky-500" />
          </label>
          <Field label="Premium Expiration">
            <input className={fieldClass} type="date" name="premiumExpiresAt" value={form.premiumExpiresAt} onChange={change} required={form.premiumActive} />
          </Field>
        </div>
      </fieldset>

      <div className="flex flex-col-reverse gap-3 border-t border-slate-800 pt-5 sm:flex-row sm:justify-end">
        {onCancel && (
          <button type="button" onClick={onCancel} disabled={saving} className="min-h-11 rounded-xl border border-slate-700 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-800 disabled:opacity-50">
            Cancel
          </button>
        )}
        <button disabled={saving} className="min-h-11 rounded-xl bg-sky-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:cursor-wait disabled:opacity-60">
          {saving ? "Saving..." : submitLabel}
        </button>
      </div>
    </form>
  );
}

function ChapterListSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading FFA chapters">
      {[0, 1, 2].map((item) => (
        <div key={item} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <SkeletonBlock className="h-6 w-48" />
          <SkeletonBlock className="mt-3 h-4 w-64" />
          <div className="mt-5 flex gap-3">
            <SkeletonBlock className="h-7 w-24 rounded-full" />
            <SkeletonBlock className="h-7 w-28 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AdminFfaChapters() {
  const [chapters, setChapters] = useState([]);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [members, setMembers] = useState([]);
  const [view, setView] = useState("list");
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [action, setAction] = useState("");
  const [listError, setListError] = useState("");
  const [detailError, setDetailError] = useState("");
  const [membersError, setMembersError] = useState("");
  const [customExpiration, setCustomExpiration] = useState("");

  const loadChapters = useCallback(async function loadChapters({ showLoading = false } = {}) {
    try {
      if (showLoading) setLoadingList(true);
      setListError("");
      const response = await getAdminFfaChapters();
      setChapters(normalizeChapterList(response.data));
      return true;
    } catch (error) {
      setListError(getFfaApiError(error, "BarnBuddy could not load FFA chapters."));
      return false;
    } finally {
      if (showLoading) setLoadingList(false);
    }
  }, []);

  const loadChapter = useCallback(async function loadChapter(chapterId, { showLoading = false } = {}) {
    if (!chapterId) return false;
    try {
      if (showLoading) setLoadingDetail(true);
      setDetailError("");
      const response = await getAdminFfaChapter(chapterId);
      const chapter = normalizeChapterResponse(response.data);
      setSelectedChapter(chapter);
      setCustomExpiration(toDateInput(chapter.premiumExpiresAt));
      return true;
    } catch (error) {
      setDetailError(getFfaApiError(error, "BarnBuddy could not load that FFA chapter."));
      return false;
    } finally {
      if (showLoading) setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    loadChapters({ showLoading: true });
  }, [loadChapters]);

  async function openChapter(chapter) {
    setSelectedChapter(chapter);
    setMembers([]);
    setMembersError("");
    setMembersOpen(false);
    setView("detail");
    await loadChapter(chapter.id, { showLoading: true });
  }

  async function createChapter(payload) {
    try {
      setSaving(true);
      const response = await createAdminFfaChapter(payload);
      const chapter = normalizeChapterResponse(response.data);
      setSelectedChapter(chapter);
      setCustomExpiration(toDateInput(chapter.premiumExpiresAt));
      setView("detail");
      await loadChapters();
      toast.success(`${chapter.chapterName} was created and the advisor invitation was requested.`);
      const warning = firstText(response.data?.warning, response.data?.advisorInviteWarning);
      if (warning) toast.warn(warning);
    } catch (error) {
      toast.error(getFfaApiError(error, "BarnBuddy could not create the FFA chapter."));
    } finally {
      setSaving(false);
    }
  }

  async function saveChapter(payload) {
    if (!selectedChapter?.id) return;
    try {
      setSaving(true);
      const response = await updateAdminFfaChapter(selectedChapter.id, payload);
      const updated = normalizeChapterResponse(response.data);
      setSelectedChapter(updated.id ? updated : { ...selectedChapter, ...payload });
      setView("detail");
      await Promise.all([loadChapter(selectedChapter.id), loadChapters()]);
      toast.success("Chapter details updated.");
    } catch (error) {
      toast.error(getFfaApiError(error, "BarnBuddy could not update the FFA chapter."));
    } finally {
      setSaving(false);
    }
  }

  async function patchChapter(payload, successMessage, actionName) {
    if (!selectedChapter?.id) return false;
    try {
      setAction(actionName);
      await updateAdminFfaChapter(selectedChapter.id, payload);
      setSelectedChapter((current) => current ? { ...current, ...payload } : current);
      await Promise.all([loadChapter(selectedChapter.id), loadChapters()]);
      toast.success(successMessage);
      return true;
    } catch (error) {
      toast.error(getFfaApiError(error, "BarnBuddy could not update the FFA chapter."));
      return false;
    } finally {
      setAction("");
    }
  }

  async function regenerateCode() {
    if (!selectedChapter?.id) return;
    if (!window.confirm("Regenerate this chapter's join code? The current code will stop working immediately.")) return;
    try {
      setAction("regenerate");
      const response = await regenerateAdminJoinCode(selectedChapter.id);
      const returnedCode = String(firstDefined(
        response.data?.joinCode,
        response.data?.join_code,
        response.data?.chapter?.joinCode,
        response.data?.chapter?.join_code,
        ""
      ));
      if (returnedCode) {
        setSelectedChapter((current) => current ? { ...current, joinCode: returnedCode } : current);
      }
      await loadChapter(selectedChapter.id);
      toast.success("A new chapter code is active. The old code no longer works.");
    } catch (error) {
      toast.error(getFfaApiError(error, "BarnBuddy could not regenerate the chapter code."));
    } finally {
      setAction("");
    }
  }

  async function copyCode() {
    if (!selectedChapter?.joinCode || !navigator.clipboard) {
      toast.error("Copy is unavailable. Select the code and copy it manually.");
      return;
    }
    try {
      await navigator.clipboard.writeText(selectedChapter.joinCode);
      toast.success("Chapter code copied.");
    } catch {
      toast.error("Copy is unavailable. Select the code and copy it manually.");
    }
  }

  async function toggleJoining() {
    if (!selectedChapter) return;
    const joinEnabled = !selectedChapter.joinEnabled;
    await patchChapter(
      { joinEnabled },
      joinEnabled ? "Student joining enabled." : "Student joining disabled.",
      "joining"
    );
  }

  async function deleteChapter() {
    if (!selectedChapter?.id) return;
    const chapterName = selectedChapter.chapterName || "this chapter";
    const confirmation = window.prompt(
      `Permanently delete ${chapterName}? This removes the Clerk Organization, all chapter memberships, Premium access, and advisor sharing. Student BarnBuddy accounts and their farm/FFA project records will remain.\n\nType "${chapterName}" to confirm.`
    );
    if (confirmation !== chapterName) return;

    try {
      setAction("delete");
      await deleteAdminFfaChapter(selectedChapter.id);
      setSelectedChapter(null);
      setMembers([]);
      setMembersError("");
      setMembersOpen(false);
      setView("list");
      await loadChapters({ showLoading: true });
      toast.success(`${chapterName} was permanently deleted.`);
    } catch (error) {
      toast.error(getFfaApiError(error, "BarnBuddy could not delete the FFA chapter."));
    } finally {
      setAction("");
    }
  }

  async function activateForOneYear() {
    const premiumExpiresAt = oneYearFromToday();
    const saved = await patchChapter(
      { premiumActive: true, premiumExpiresAt: expirationPayload(premiumExpiresAt) },
      `Chapter Premium activated through ${formatDate(premiumExpiresAt)}.`,
      "premium"
    );
    if (saved) setCustomExpiration(premiumExpiresAt);
  }

  async function saveCustomExpiration() {
    if (!customExpiration) {
      toast.error("Select a Premium expiration date.");
      return;
    }
    await patchChapter(
      { premiumActive: true, premiumExpiresAt: expirationPayload(customExpiration) },
      `Chapter Premium activated through ${formatDate(customExpiration)}.`,
      "premium"
    );
  }

  async function disablePremium() {
    if (!window.confirm("Disable chapter Premium? Members will fall back to their personal BarnBuddy plan.")) return;
    await patchChapter(
      { premiumActive: false },
      "Chapter Premium disabled. Personal Premium accounts remain unchanged.",
      "premium"
    );
  }

  async function loadMembers() {
    if (!selectedChapter?.id) return;
    try {
      setMembersOpen(true);
      setLoadingMembers(true);
      setMembersError("");
      const response = await getAdminFfaChapterMembers(selectedChapter.id);
      const nextMembers = normalizeMemberList(response.data);
      setMembers(nextMembers);
      setSelectedChapter((current) => current ? {
        ...current,
        memberCount: asNumber(firstDefined(response.data?.memberCount, response.data?.member_count), nextMembers.length),
      } : current);
    } catch (error) {
      const message = getFfaApiError(error, "BarnBuddy could not load chapter members.");
      setMembersError(message);
      toast.error(message);
    } finally {
      setLoadingMembers(false);
    }
  }

  async function removeMember(member) {
    if (!selectedChapter?.id || !member.userId || member.isAdvisor) return;
    if (!window.confirm(`Remove ${member.name} from this FFA chapter? Their BarnBuddy account and records will remain.`)) return;
    try {
      setAction(`remove:${member.userId}`);
      await removeAdminFfaChapterMember(selectedChapter.id, member.userId);
      await Promise.all([loadMembers(), loadChapter(selectedChapter.id), loadChapters()]);
      toast.success(`${member.name} was removed from the chapter.`);
    } catch (error) {
      toast.error(getFfaApiError(error, "BarnBuddy could not remove that chapter member."));
    } finally {
      setAction("");
    }
  }

  const selectedPremiumState = useMemo(
    () => selectedChapter ? chapterPremiumState(selectedChapter) : "inactive",
    [selectedChapter]
  );

  const editInitialValue = useMemo(() => selectedChapter ? {
    chapterName: selectedChapter.chapterName,
    schoolName: selectedChapter.schoolName,
    chapterNumber: selectedChapter.chapterNumber,
    state: selectedChapter.state,
    advisorName: selectedChapter.advisorName,
    advisorEmail: selectedChapter.advisorEmail,
    maxMembers: String(selectedChapter.maxMembers),
    joinEnabled: selectedChapter.joinEnabled,
    premiumActive: selectedChapter.premiumActive,
    premiumExpiresAt: toDateInput(selectedChapter.premiumExpiresAt),
    status: selectedChapter.status,
  } : emptyChapterForm, [selectedChapter]);

  if (view === "create") {
    return (
      <div className="mt-6 space-y-5 sm:mt-8">
        <button type="button" onClick={() => setView("list")} className="min-h-11 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-sky-400/40 hover:bg-slate-800">
          Back to Chapters
        </button>
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-7">
          <div className="mb-6">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-400">FFA Chapters</p>
            <h3 className="mt-2 text-2xl font-semibold text-white">Create FFA Chapter</h3>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">
              BarnBuddy will create the Clerk Organization server-side, generate a secure code, and invite the advisor.
            </p>
          </div>
          <ChapterForm
            saving={saving}
            submitLabel="Create Chapter & Invite Advisor"
            onSubmit={createChapter}
            onCancel={() => setView("list")}
          />
        </section>
      </div>
    );
  }

  if (view === "edit" && selectedChapter) {
    return (
      <div className="mt-6 space-y-5 sm:mt-8">
        <button type="button" onClick={() => setView("detail")} className="min-h-11 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-sky-400/40 hover:bg-slate-800">
          Back to Chapter
        </button>
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-7">
          <div className="mb-6">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-400">FFA Chapters</p>
            <h3 className="mt-2 text-2xl font-semibold text-white">Edit {selectedChapter.chapterName}</h3>
          </div>
          <ChapterForm
            initialValue={editInitialValue}
            includeStatus
            saving={saving}
            submitLabel="Save Chapter"
            onSubmit={saveChapter}
            onCancel={() => setView("detail")}
          />
        </section>
      </div>
    );
  }

  if (view === "detail" && selectedChapter) {
    if (loadingDetail) {
      return (
        <div className="mt-8 grid min-h-64 place-items-center rounded-2xl border border-slate-800 bg-slate-900">
          <LoadingSpinner label="Loading chapter details..." />
        </div>
      );
    }

    return (
      <div className="mt-6 space-y-5 sm:mt-8 sm:space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button type="button" onClick={() => { setView("list"); setSelectedChapter(null); setMembersOpen(false); }} className="min-h-11 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-sky-400/40 hover:bg-slate-800">
            Back to Chapters
          </button>
          <button type="button" onClick={() => setView("edit")} className="min-h-11 rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-400">
            Edit Chapter
          </button>
        </div>

        {detailError && (
          <p className="rounded-xl border border-red-300/25 bg-red-400/10 px-4 py-3 text-sm text-red-100" role="status">{detailError}</p>
        )}

        {!selectedChapter.clerkOrganizationAvailable && (
          <p className="rounded-xl border border-amber-300/25 bg-amber-400/10 px-4 py-3 text-sm text-amber-100" role="status">
            Clerk membership data is currently unavailable. Chapter details remain available, but the member count may not be current.
          </p>
        )}

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-400">FFA Chapter</p>
              <h3 className="mt-2 text-3xl font-semibold text-white">{selectedChapter.chapterName}</h3>
              <p className="mt-2 text-sm text-slate-400">
                {[selectedChapter.schoolName, selectedChapter.state].filter(Boolean).join(" · ") || "School details not set"}
              </p>
              {selectedChapter.chapterNumber && <p className="mt-1 text-sm text-slate-500">Chapter {selectedChapter.chapterNumber}</p>}
            </div>
            <StatusBadge tone={selectedChapter.status === "ACTIVE" ? "emerald" : "red"}>{selectedChapter.status}</StatusBadge>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.13em] text-slate-500">Advisor</p>
              <p className="mt-2 font-semibold text-white">{selectedChapter.advisorName || "Not set"}</p>
              <p className="mt-1 break-all text-sm text-slate-400">{selectedChapter.advisorEmail || "No email"}</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.13em] text-slate-500">Members</p>
              <p className="mt-2 text-2xl font-semibold text-white">{memberCountLabel(selectedChapter)}</p>
              <button type="button" onClick={() => membersOpen ? setMembersOpen(false) : loadMembers()} className="mt-3 text-sm font-semibold text-sky-300 hover:text-sky-200">
                {membersOpen ? "Hide Members" : "View Members"}
              </button>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.13em] text-slate-500">Joining</p>
              <p className="mt-2 font-semibold text-white">{selectedChapter.joinEnabled ? "ENABLED" : "DISABLED"}</p>
              <button type="button" onClick={toggleJoining} disabled={action === "joining" || selectedChapter.status !== "ACTIVE"} className="mt-3 text-sm font-semibold text-sky-300 hover:text-sky-200 disabled:cursor-wait disabled:opacity-50">
                {action === "joining" ? "Saving..." : selectedChapter.joinEnabled ? "Disable Joining" : "Enable Joining"}
              </button>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.13em] text-slate-500">Premium</p>
              <p className="mt-2 font-semibold text-white">{selectedPremiumState.toUpperCase()}</p>
              <p className="mt-1 text-sm text-slate-400">{formatDate(selectedChapter.premiumExpiresAt, "No expiration")}</p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-400">Secret join code</p>
              <h4 className="mt-2 text-xl font-semibold text-white">Student access</h4>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400">Only BarnBuddy administrators and this chapter's advisor should receive this code.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <code className="select-all rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 font-mono text-lg font-semibold tracking-[0.12em] text-white">
                {selectedChapter.joinCode || "Code unavailable"}
              </code>
              <div className="flex gap-2">
                <button type="button" onClick={copyCode} disabled={!selectedChapter.joinCode} className="min-h-11 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-sky-400/40 hover:bg-slate-800 disabled:opacity-50">Copy</button>
                <button type="button" onClick={regenerateCode} disabled={action === "regenerate"} className="min-h-11 rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:cursor-wait disabled:opacity-60">
                  {action === "regenerate" ? "Regenerating..." : "Regenerate"}
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-400">Premium</p>
              <h4 className="mt-2 text-xl font-semibold text-white">Manual chapter access</h4>
              <p className="mt-2 text-sm text-slate-400">Chapter Premium never changes a member's personal BarnBuddy subscription.</p>
            </div>
            <StatusBadge tone={selectedPremiumState === "active" ? "emerald" : selectedPremiumState === "expired" ? "amber" : "slate"}>
              {selectedPremiumState.toUpperCase()}
            </StatusBadge>
          </div>

          <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-end">
            <button type="button" onClick={activateForOneYear} disabled={action === "premium"} className="min-h-11 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-gray-950 transition hover:bg-emerald-400 disabled:cursor-wait disabled:opacity-60">
              Activate for 1 Year
            </button>
            <label className="block flex-1">
              <span className="text-xs font-bold uppercase tracking-[0.13em] text-slate-400">Custom Expiration</span>
              <input type="date" value={customExpiration} onChange={(event) => setCustomExpiration(event.target.value)} className={fieldClass} />
            </label>
            <button type="button" onClick={saveCustomExpiration} disabled={action === "premium" || !customExpiration} className="min-h-11 rounded-xl border border-emerald-400/30 px-4 py-2.5 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-400/10 disabled:cursor-wait disabled:opacity-50">
              Save Expiration
            </button>
            <button type="button" onClick={disablePremium} disabled={action === "premium" || selectedPremiumState === "inactive"} className="min-h-11 rounded-xl border border-red-400/25 px-4 py-2.5 text-sm font-semibold text-red-200 transition hover:bg-red-400/10 disabled:cursor-wait disabled:opacity-50">
              Disable Premium
            </button>
          </div>
        </section>

        {membersOpen && (
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-400">Members</p>
                <h4 className="mt-2 text-xl font-semibold text-white">Chapter roster</h4>
              </div>
              <button type="button" onClick={loadMembers} disabled={loadingMembers} className="min-h-11 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-800 disabled:cursor-wait disabled:opacity-60">
                {loadingMembers ? "Refreshing..." : "Refresh"}
              </button>
            </div>

            {membersError ? (
              <div className="mt-5 rounded-xl border border-red-300/25 bg-red-400/10 p-4">
                <p className="text-sm text-red-100">{membersError}</p>
                <button type="button" onClick={loadMembers} disabled={loadingMembers} className="mt-3 min-h-11 rounded-xl border border-red-300/25 px-4 py-2.5 text-sm font-semibold text-red-100 transition hover:bg-red-400/10 disabled:cursor-wait disabled:opacity-60">
                  {loadingMembers ? "Retrying..." : "Try again"}
                </button>
              </div>
            ) : loadingMembers && !members.length ? (
              <div className="mt-6 flex min-h-32 items-center justify-center"><LoadingSpinner label="Loading members..." /></div>
            ) : members.length ? (
              <div className="mt-5 divide-y divide-slate-800 overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
                {members.map((member) => (
                  <article key={member.key} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-semibold text-white">{member.name}</p>
                        <StatusBadge tone={member.isAdvisor ? "sky" : "slate"}>{member.isAdvisor ? "Advisor" : "Student"}</StatusBadge>
                      </div>
                      {member.email && <p className="mt-1 truncate text-sm text-slate-400">{member.email}</p>}
                    </div>
                    {!member.isAdvisor && member.userId && (
                      <button type="button" onClick={() => removeMember(member)} disabled={action === `remove:${member.userId}`} className="min-h-11 shrink-0 rounded-xl border border-red-400/25 px-4 py-2.5 text-sm font-semibold text-red-200 transition hover:bg-red-400/10 disabled:cursor-wait disabled:opacity-60">
                        {action === `remove:${member.userId}` ? "Removing..." : "Remove"}
                      </button>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState className="mt-5" title="No members found" description="No Clerk Organization memberships were returned for this chapter." />
            )}
          </section>
        )}

        <section className="rounded-2xl border border-red-300/20 bg-red-400/[0.06] p-5 sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-red-300">Administrative actions</p>
          <h4 className="mt-2 text-xl font-semibold text-white">Delete chapter</h4>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-red-100/70">
            Permanently removes the Clerk Organization, chapter memberships, chapter Premium access, join code,
            and advisor project-sharing permissions. Student BarnBuddy accounts and their farm and FFA project records remain.
          </p>
          <button type="button" onClick={deleteChapter} disabled={action === "delete"} className="mt-5 min-h-11 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-wait disabled:opacity-60">
            {action === "delete" ? "Deleting..." : "Delete Chapter Permanently"}
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-5 sm:mt-8 sm:space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-xl font-semibold text-white">FFA Chapters</h3>
          <p className="mt-1 text-sm text-slate-400">Create chapters, manage memberships, and control manual Premium access.</p>
        </div>
        <button type="button" onClick={() => setView("create")} className="min-h-11 rounded-xl bg-sky-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-400">
          + Create Chapter
        </button>
      </div>

      {listError && (
        <div className="rounded-2xl border border-red-300/25 bg-red-400/10 p-5">
          <p className="text-sm text-red-100">{listError}</p>
          <button type="button" onClick={() => loadChapters({ showLoading: true })} className="mt-4 min-h-11 rounded-xl border border-red-300/25 px-4 py-2.5 text-sm font-semibold text-red-100 hover:bg-red-400/10">Try again</button>
        </div>
      )}

      {loadingList ? (
        <ChapterListSkeleton />
      ) : chapters.length ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {chapters.map((chapter) => {
            const premiumState = chapterPremiumState(chapter);
            return (
              <article key={chapter.id || chapter.chapterName} className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg shadow-black/10">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h4 className="truncate text-lg font-semibold text-white">{chapter.chapterName}</h4>
                    <p className="mt-1 truncate text-sm text-slate-400">{chapter.schoolName || "School not set"}</p>
                  </div>
                  <StatusBadge tone={chapter.status === "ACTIVE" ? "emerald" : "red"}>{chapter.status}</StatusBadge>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  <StatusBadge>{chapter.memberCount === null ? "Members unavailable" : `${memberCountLabel(chapter)} members`}</StatusBadge>
                  <StatusBadge tone={premiumState === "active" ? "emerald" : premiumState === "expired" ? "amber" : "slate"}>
                    Premium: {premiumState === "active" ? "Active" : premiumState === "expired" ? "Expired" : "Inactive"}
                  </StatusBadge>
                  <StatusBadge tone={chapter.joinEnabled ? "sky" : "slate"}>Joining: {chapter.joinEnabled ? "On" : "Off"}</StatusBadge>
                </div>
                {chapter.premiumExpiresAt && <p className="mt-3 text-xs text-slate-500">Premium date: {formatDate(chapter.premiumExpiresAt)}</p>}
                <button type="button" onClick={() => openChapter(chapter)} disabled={!chapter.id} className="mt-5 min-h-11 rounded-xl border border-sky-400/35 px-4 py-2.5 text-sm font-semibold text-sky-200 transition hover:bg-sky-400/10 disabled:cursor-not-allowed disabled:opacity-50">
                  Open
                </button>
              </article>
            );
          })}
        </div>
      ) : !listError ? (
        <EmptyState
          variant="full"
          title="No FFA chapters yet"
          description="Create the first chapter when its advisor and membership details are ready."
          primaryAction={{ label: "Create Chapter", onClick: () => setView("create") }}
        />
      ) : null}
    </div>
  );
}
