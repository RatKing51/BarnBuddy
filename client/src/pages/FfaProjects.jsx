import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "react-toastify";
import { getAnimalsForUser } from "../api/animal";
import {
  addFfaProjectActivity,
  addFfaProjectAnimals,
  addFfaProjectFinance,
  createFfaProject,
  deleteFfaProject,
  deleteFfaProjectActivity,
  deleteFfaProjectFinance,
  getFfaProject,
  getFfaProjects,
  removeFfaProjectAnimal,
  updateFfaProject,
  updateFfaProjectAnimal,
} from "../api/ffaProjects";
import FfaProjectSharingPanel from "../components/FfaProjectSharingPanel";
import { getAnimalDisplayName } from "../utils/animalLabel";
import { normalizeProjectSharing } from "../utils/ffaProjectSharing";

const activityCategories = [
  "Feeding and nutrition",
  "Health and treatment",
  "Grooming",
  "Exercise and handling",
  "Cleaning and facilities",
  "Weight monitoring",
  "Breeding and reproduction",
  "Marketing and sales",
  "Recordkeeping",
  "Showing",
  "Equipment maintenance",
  "Research and education",
  "Other",
];

const saeTypes = [
  { value: "entrepreneurship", label: "Entrepreneurship", help: "You own the project and track its risks, work, income, and expenses." },
  { value: "placement", label: "Placement", help: "You work for a farm, employer, school, or other agricultural operation." },
  { value: "combined", label: "Combined", help: "Your project includes both ownership and placement experience." },
  { value: "agriscience", label: "Agriscience research", help: "You investigate a question using a documented research process." },
];

const tabs = ["Overview", "Journal", "Finances", "Setup"];
const fieldClass = "bb-field mt-1";
const labelClass = "text-sm font-medium text-slate-200";
const panelClass = "bb-record-panel";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function schoolYear() {
  const now = new Date();
  const firstYear = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  return `${firstYear}-${firstYear + 1}`;
}

function formatDate(value) {
  if (!value) return "No end date";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })
    .format(new Date(`${String(value).slice(0, 10)}T00:00:00Z`));
}

function money(value) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(Number(value || 0));
}

function apiError(error, fallback) {
  return error?.response?.data?.error || fallback;
}

function responseList(data, label) {
  if (Array.isArray(data)) return data;
  throw new Error(`BarnBuddy returned an invalid ${label} response.`);
}

function EmptyState({ title, body, action }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 px-6 py-14 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-blue-500/10 text-2xl text-blue-300" aria-hidden="true">★</div>
      <h2 className="mt-5 text-xl font-medium text-white">{title}</h2>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-400">{body}</p>
      {action}
    </div>
  );
}

function StatCard({ label, value, note, tone = "slate" }) {
  const tones = {
    slate: "",
    green: "text-emerald-300",
    blue: "text-blue-300",
    red: "text-rose-300",
  };
  return (
    <div className="bb-record-panel p-4">
      <p className="text-sm text-slate-400">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${tones[tone]}`}>{value}</p>
      {note && <p className="mt-1 text-xs text-slate-400">{note}</p>}
    </div>
  );
}

function ProjectModal({ animals, onClose, onCreated, returnFocusRef }) {
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  const savingRef = useRef(false);
  const onCloseRef = useRef(onClose);
  const [saving, setSaving] = useState(false);

  useEffect(() => { savingRef.current = saving; }, [saving]);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    const trigger = returnFocusRef.current;
    const focusFrame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !savingRef.current) {
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = [...(dialogRef.current?.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
      ) || [])].filter((element) => element.getClientRects().length > 0);
      if (!focusable.length) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !dialogRef.current?.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialogRef.current?.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleKeyDown);
      trigger?.focus({ preventScroll: true });
    };
  }, [returnFocusRef]);
  const [selectedAnimals, setSelectedAnimals] = useState([]);
  const [form, setForm] = useState({
    name: "",
    school_year: schoolYear(),
    sae_type: "entrepreneurship",
    chapter_name: "",
    advisor_name: "",
    advisor_email: "",
    description: "",
    start_date: today(),
    end_date: "",
    goals: "",
  });

  const change = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const toggleAnimal = (animalId) => setSelectedAnimals((current) =>
    current.includes(animalId) ? current.filter((id) => id !== animalId) : [...current, animalId]
  );

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await createFfaProject({
        ...form,
        goals: form.goals.split("\n").map((goal) => goal.trim()).filter(Boolean),
        animals: selectedAnimals.map((animalId) => ({
          animal_id: animalId,
          ownership_percentage: 100,
        })),
      });
      toast.success("FFA project created");
      onCreated(response.data);
    } catch (error) {
      toast.error(apiError(error, "Could not create the project."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div ref={dialogRef} className="bb-project-overlay bb-mobile-overlay fixed inset-0 z-50 overflow-y-auto bg-black/75 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="new-project-title">
      <form onSubmit={submit} className="bb-project-form mx-auto w-full max-w-3xl rounded-3xl border border-slate-700 bg-slate-900 shadow-2xl shadow-black/40">
        <div className="bb-project-dialog-heading flex items-start justify-between border-b border-slate-800 p-5 sm:p-7">
          <div>
            <h2 id="new-project-title" className="text-2xl font-semibold text-white">Start a project</h2>
            <p className="mt-1 text-sm text-slate-400">Link animals you already use—BarnBuddy will not duplicate them.</p>
          </div>
          <button ref={closeButtonRef} type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-slate-400 hover:bg-slate-800 hover:text-white" aria-label="Close">✕</button>
        </div>

        <div className="bb-project-dialog-fields grid gap-5 p-5 sm:grid-cols-2 sm:p-7">
          <label className={`${labelClass} sm:col-span-2`}>Project name
            <input className={fieldClass} name="name" value={form.name} onChange={change} maxLength="160" required placeholder="2026 Market Steer SAE" autoFocus />
          </label>
          <label className={labelClass}>School year
            <input className={fieldClass} name="school_year" value={form.school_year} onChange={change} maxLength="40" required />
          </label>
          <label className={labelClass}>SAE type
            <select className={fieldClass} name="sae_type" value={form.sae_type} onChange={change}>
              {saeTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
            </select>
            <span className="mt-2 block text-xs font-normal leading-5 text-slate-500">{saeTypes.find((type) => type.value === form.sae_type)?.help}</span>
          </label>
          <label className={labelClass}>Start date
            <input className={fieldClass} type="date" name="start_date" value={form.start_date} onChange={change} required />
          </label>
          <label className={labelClass}>End date <span className="font-normal text-slate-500">(optional)</span>
            <input className={fieldClass} type="date" name="end_date" min={form.start_date} value={form.end_date} onChange={change} />
          </label>
          <label className={labelClass}>FFA chapter
            <input className={fieldClass} name="chapter_name" value={form.chapter_name} onChange={change} maxLength="180" placeholder="Central FFA" />
          </label>
          <label className={labelClass}>Advisor name
            <input className={fieldClass} name="advisor_name" value={form.advisor_name} onChange={change} maxLength="160" />
          </label>
          <label className={`${labelClass} sm:col-span-2`}>Advisor email
            <input className={fieldClass} type="email" name="advisor_email" value={form.advisor_email} onChange={change} maxLength="254" />
          </label>
          <label className={`${labelClass} sm:col-span-2`}>Project description
            <textarea className={fieldClass} name="description" value={form.description} onChange={change} rows="3" maxLength="4000" placeholder="What will you raise, learn, improve, or investigate?" />
          </label>
          <label className={`${labelClass} sm:col-span-2`}>Goals <span className="font-normal text-slate-500">(one per line)</span>
            <textarea className={fieldClass} name="goals" value={form.goals} onChange={change} rows="3" placeholder={"Reach target show weight\nLearn daily ration balancing\nTrack every project expense"} />
          </label>

          <fieldset className="sm:col-span-2">
            <legend className={labelClass}>Link existing animals</legend>
            <p className="mt-1 text-xs leading-5 text-slate-500">Their current profile and normal health, weight, feed, and finance records remain the source of truth.</p>
            {animals.length ? (
              <div className="bb-project-animal-choices mt-3 grid max-h-52 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                {animals.map((animal) => (
                  <label key={animal.id} className={`flex min-w-0 cursor-pointer items-center gap-3 overflow-hidden rounded-xl border p-3 transition ${selectedAnimals.includes(animal.id) ? "border-blue-400 bg-blue-500/10" : "border-slate-700 bg-slate-950 hover:border-slate-600"}`}>
                    <input type="checkbox" className="h-4 w-4 shrink-0 accent-blue-500" checked={selectedAnimals.includes(animal.id)} onChange={() => toggleAnimal(animal.id)} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-white">{getAnimalDisplayName(animal, { prefixTag: true })}</span>
                      <span className="block truncate text-xs text-slate-500">{animal.species || "Animal"}{animal.tag_id ? ` · Tag ${animal.tag_id}` : ""}</span>
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="mt-3 rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-400">No animals yet. You can create the project now and link animals later.</p>
            )}
          </fieldset>
        </div>

        <div className="bb-project-dialog-actions flex flex-col-reverse gap-3 border-t border-slate-800 p-5 sm:flex-row sm:justify-end sm:p-7">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-700 px-5 py-2.5 font-medium text-slate-200 hover:bg-slate-800">Cancel</button>
          <button disabled={saving} className="rounded-xl bg-blue-600 px-5 py-2.5 font-semibold text-white hover:bg-blue-500 disabled:cursor-wait disabled:opacity-60">{saving ? "Creating…" : "Create FFA project"}</button>
        </div>
      </form>
    </div>
  );
}

function Overview({ details }) {
  const { project, summary, animals, linkedRecordSummary } = details;
  const recordLabels = [
    ["weight_records", "Weight records"],
    ["vaccinations", "Vaccinations"],
    ["health_events", "Health events"],
    ["vet_visits", "Vet visits"],
    ["feed_records", "Feed records"],
    ["finance_records", "Animal finance records"],
  ];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Linked animals" value={summary.animalCount} />
        <StatCard label="Project hours" value={summary.totalHours} note={`${summary.totalMinutes} minutes`} tone="blue" />
        <StatCard label="Income" value={money(summary.income)} tone="green" />
        <StatCard label="Expenses" value={money(summary.expenses)} tone="red" />
        <StatCard label="Net profit" value={money(summary.profit)} tone={summary.profit >= 0 ? "green" : "red"} />
        <StatCard label="Starting value" value={money(summary.startingInvestment)} note="adjusted for ownership" />
      </div>

      <section className={`${panelClass} p-5 sm:p-6`}>
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <h3 className="text-lg font-semibold text-white">Project plan</h3>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-300">{project.description || "Add a project description in Setup."}</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Goals</h3>
            {project.goals?.length ? (
              <ul className="mt-3 space-y-2">
                {project.goals.map((goal, index) => <li key={`${goal}-${index}`} className="flex gap-3 text-sm leading-6 text-slate-300"><span className="text-blue-300">✓</span>{goal}</li>)}
              </ul>
            ) : <p className="mt-3 text-sm text-slate-400">Add measurable goals in Setup.</p>}
          </div>
        </div>
      </section>

      <section className={`${panelClass} p-5 sm:p-6`}>
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h3 className="text-lg font-semibold text-white">Linked BarnBuddy records</h3>
            <p className="mt-1 text-sm text-slate-400">All existing and future records stay connected while the animal is linked.</p>
          </div>
          <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">Live connection</span>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {recordLabels.map(([key, label]) => (
            <div key={key} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 px-4 py-3">
              <span className="text-sm text-slate-400">{label}</span>
              <strong className="text-white">{linkedRecordSummary[key] || 0}</strong>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Project animals</h3>
          <p className="text-xs text-slate-500">Starting snapshots stay unchanged unless you edit them.</p>
        </div>
        {animals.length ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {animals.map((animal) => (
              <article key={animal.id} className={`${panelClass} min-w-0 overflow-hidden p-5`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h4 className="truncate font-semibold text-white">{getAnimalDisplayName(animal, { prefixTag: true })}</h4>
                    <p className="mt-1 truncate text-xs text-slate-500">{animal.species || "Animal"}{animal.tag_id ? ` · Tag ${animal.tag_id}` : ""}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${animal.animal_id ? "bg-emerald-500/10 text-emerald-300" : "bg-slate-800 text-slate-400"}`}>{animal.animal_id ? "Linked" : "Snapshot only"}</span>
                </div>
                <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
                  <div><dt className="text-slate-500">Starting weight</dt><dd className="mt-1 font-medium text-white">{animal.starting_weight ? `${Number(animal.starting_weight).toLocaleString()} lb` : "Not set"}</dd></div>
                  <div><dt className="text-slate-500">Current weight</dt><dd className="mt-1 font-medium text-white">{animal.current_weight ? `${Number(animal.current_weight).toLocaleString()} lb` : "Not set"}</dd></div>
                  <div><dt className="text-slate-500">Starting value</dt><dd className="mt-1 font-medium text-white">{money(animal.starting_value)}</dd></div>
                  <div><dt className="text-slate-500">Ownership</dt><dd className="mt-1 font-medium text-white">{Number(animal.ownership_percentage)}%</dd></div>
                </dl>
              </article>
            ))}
          </div>
        ) : <EmptyState title="No animals linked yet" body="Open Setup to attach animals you already manage in BarnBuddy." />}
      </section>
    </div>
  );
}

function Journal({ details, onChanged }) {
  const [saving, setSaving] = useState(false);
  const blank = useMemo(() => ({ activity_date: today(), category: activityCategories[0], title: "", description: "", duration_minutes: "", animal_id: "", skills_learned: "", reflection: "" }), []);
  const [form, setForm] = useState(blank);
  const change = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await addFfaProjectActivity(details.project.id, { ...form, animal_id: form.animal_id || null });
      onChanged(response.data);
      setForm({ ...blank, activity_date: today() });
      toast.success("Activity added");
    } catch (error) {
      toast.error(apiError(error, "Could not add the activity."));
    } finally { setSaving(false); }
  }

  async function remove(activityId) {
    if (!window.confirm("Delete this project activity?")) return;
    try {
      const response = await deleteFfaProjectActivity(details.project.id, activityId);
      onChanged(response.data);
      toast.success("Activity deleted");
    } catch (error) { toast.error(apiError(error, "Could not delete the activity.")); }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.25fr)]">
      <form onSubmit={submit} className={`${panelClass} h-fit p-5 sm:p-6`}>
        <h3 className="text-lg font-semibold text-white">Add journal activity</h3>
        <p className="mt-1 text-sm text-slate-400">Record the work, time, skills, and reflection—not only the result.</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className={labelClass}>Date<input className={fieldClass} type="date" name="activity_date" min={String(details.project.start_date).slice(0, 10)} max={details.project.end_date ? String(details.project.end_date).slice(0, 10) : undefined} value={form.activity_date} onChange={change} required /></label>
          <label className={labelClass}>Time in minutes<input className={fieldClass} type="number" name="duration_minutes" min="1" max="1440" value={form.duration_minutes} onChange={change} required placeholder="45" /></label>
          <label className={labelClass}>Category<select className={fieldClass} name="category" value={form.category} onChange={change}>{activityCategories.map((category) => <option key={category}>{category}</option>)}</select></label>
          <label className={labelClass}>Animal <span className="font-normal text-slate-500">(optional)</span><select className={fieldClass} name="animal_id" value={form.animal_id} onChange={change}><option value="">Whole project</option>{details.animals.filter((animal) => animal.animal_id).map((animal) => <option key={animal.animal_id} value={animal.animal_id}>{getAnimalDisplayName(animal, { prefixTag: true })}</option>)}</select></label>
          <label className={`${labelClass} sm:col-span-2`}>Activity title<input className={fieldClass} name="title" value={form.title} onChange={change} maxLength="180" required placeholder="Worked on leading and setting up" /></label>
          <label className={`${labelClass} sm:col-span-2`}>What did you do?<textarea className={fieldClass} name="description" value={form.description} onChange={change} rows="3" maxLength="4000" /></label>
          <label className={`${labelClass} sm:col-span-2`}>Skills learned or practiced<textarea className={fieldClass} name="skills_learned" value={form.skills_learned} onChange={change} rows="2" maxLength="1200" /></label>
          <label className={`${labelClass} sm:col-span-2`}>Reflection / next step<textarea className={fieldClass} name="reflection" value={form.reflection} onChange={change} rows="2" maxLength="2400" /></label>
        </div>
        <button disabled={saving} className="mt-5 w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-500 disabled:opacity-60">{saving ? "Saving…" : "Add to journal"}</button>
      </form>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <div><h3 className="text-lg font-semibold text-white">Activity history</h3><p className="mt-1 text-sm text-slate-400">{details.summary.totalHours} total project hours</p></div>
        </div>
        {details.activities.length ? (
          <div className="space-y-3">
            {details.activities.map((activity) => (
              <article key={activity.id} className={`${panelClass} p-5`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-300">{activity.category}</span><span className="text-xs text-slate-500">{formatDate(activity.activity_date)} · {activity.duration_minutes} min</span></div>
                    <h4 className="mt-3 font-semibold text-white">{activity.title}</h4>
                    {activity.animal_id && <p className="mt-1 text-xs font-medium text-sky-300">Animal: {getAnimalDisplayName(activity, { prefixTag: true })}</p>}
                  </div>
                  <button type="button" onClick={() => remove(activity.id)} className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:bg-rose-500/10 hover:text-rose-300">Delete</button>
                </div>
                {activity.description && <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-300">{activity.description}</p>}
                {(activity.skills_learned || activity.reflection) && <div className="mt-4 grid gap-3 border-t border-slate-800 pt-4 sm:grid-cols-2">{activity.skills_learned && <div><p className="text-xs font-medium uppercase tracking-wider text-slate-500">Skills</p><p className="mt-1 text-sm leading-6 text-slate-300">{activity.skills_learned}</p></div>}{activity.reflection && <div><p className="text-xs font-medium uppercase tracking-wider text-slate-500">Reflection</p><p className="mt-1 text-sm leading-6 text-slate-300">{activity.reflection}</p></div>}</div>}
              </article>
            ))}
          </div>
        ) : <EmptyState title="Your journal is ready" body="Add your first work session, observation, or learning activity. Consistent entries make the final report much easier." />}
      </section>
    </div>
  );
}

function Finances({ details, onChanged }) {
  const [saving, setSaving] = useState(false);
  const blank = useMemo(() => ({ transaction_date: today(), transaction_type: "expense", category: "", amount: "", vendor: "", animal_id: "", notes: "" }), []);
  const [form, setForm] = useState(blank);
  const change = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await addFfaProjectFinance(details.project.id, { ...form, animal_id: form.animal_id || null });
      onChanged(response.data);
      setForm({ ...blank, transaction_date: today(), transaction_type: form.transaction_type });
      toast.success("Finance entry added");
    } catch (error) { toast.error(apiError(error, "Could not add the finance entry.")); }
    finally { setSaving(false); }
  }

  async function remove(financeId) {
    if (!window.confirm("Delete this project finance entry?")) return;
    try {
      const response = await deleteFfaProjectFinance(details.project.id, financeId);
      onChanged(response.data);
      toast.success("Finance entry deleted");
    } catch (error) { toast.error(apiError(error, "Could not delete the entry.")); }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Project income" value={money(details.summary.income)} tone="green" />
        <StatCard label="Project expenses" value={money(details.summary.expenses)} tone="red" />
        <StatCard label="Net profit" value={money(details.summary.profit)} tone={details.summary.profit >= 0 ? "green" : "red"} />
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.35fr)]">
        <form onSubmit={submit} className={`${panelClass} h-fit p-5 sm:p-6`}>
          <h3 className="text-lg font-semibold text-white">Add income or expense</h3>
          <p className="mt-1 text-sm text-slate-400">These entries belong to this FFA project and do not alter the animal’s regular finance history.</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className={labelClass}>Type<select className={fieldClass} name="transaction_type" value={form.transaction_type} onChange={change}><option value="expense">Expense</option><option value="income">Income</option></select></label>
            <label className={labelClass}>Date<input className={fieldClass} type="date" name="transaction_date" min={String(details.project.start_date).slice(0, 10)} max={details.project.end_date ? String(details.project.end_date).slice(0, 10) : undefined} value={form.transaction_date} onChange={change} required /></label>
            <label className={labelClass}>Amount<input className={fieldClass} type="number" name="amount" min="0.01" step="0.01" value={form.amount} onChange={change} required placeholder="0.00" /></label>
            <label className={labelClass}>Category<input className={fieldClass} name="category" value={form.category} onChange={change} maxLength="120" required placeholder="Feed, purchase, sale…" /></label>
            <label className={labelClass}>Vendor / buyer<input className={fieldClass} name="vendor" value={form.vendor} onChange={change} maxLength="180" /></label>
            <label className={labelClass}>Animal <span className="font-normal text-slate-500">(optional)</span><select className={fieldClass} name="animal_id" value={form.animal_id} onChange={change}><option value="">Whole project</option>{details.animals.filter((animal) => animal.animal_id).map((animal) => <option key={animal.animal_id} value={animal.animal_id}>{getAnimalDisplayName(animal, { prefixTag: true })}</option>)}</select></label>
            <label className={`${labelClass} sm:col-span-2`}>Notes<textarea className={fieldClass} name="notes" value={form.notes} onChange={change} rows="2" maxLength="2400" /></label>
          </div>
          <button disabled={saving} className="mt-5 w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-500 disabled:opacity-60">{saving ? "Saving…" : "Add finance entry"}</button>
        </form>

        <section>
          <h3 className="mb-3 text-lg font-semibold text-white">Project ledger</h3>
          {details.finances.length ? (
            <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80">
              <div className="overflow-x-auto">
                <table className="bb-stacked-table w-full min-w-[680px] text-left text-sm" role="table">
                  <thead className="border-b border-slate-800 bg-slate-950/60 text-xs uppercase tracking-wider text-slate-500"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Animal / party</th><th className="px-4 py-3 text-right">Amount</th><th className="px-4 py-3"><span className="sr-only">Actions</span></th></tr></thead>
                  <tbody className="divide-y divide-slate-800">
                    {details.finances.map((entry) => (
                      <tr key={entry.id} role="row" className="hover:bg-slate-800/40">
                        <td role="cell" className="px-4 py-4 text-slate-400">{formatDate(entry.transaction_date)}</td>
                        <td role="cell" className="bb-ledger-category px-4 py-4"><p className="font-medium text-white">{entry.category}</p>{entry.notes && <p className="bb-ledger-notes mt-1 max-w-xs truncate text-xs text-slate-500">{entry.notes}</p>}</td>
                        <td role="cell" className="px-4 py-4 text-slate-400">{entry.animal_id ? getAnimalDisplayName(entry, { prefixTag: true }) : entry.vendor || "Whole project"}</td>
                        <td role="cell" className={`bb-ledger-amount px-4 py-4 text-right font-semibold ${entry.transaction_type === "income" ? "text-emerald-300" : "text-rose-300"}`}>{entry.transaction_type === "income" ? "+" : "−"}{money(entry.amount)}</td>
                        <td role="cell" className="bb-cell-wide px-4 py-4 text-right"><button type="button" onClick={() => remove(entry.id)} className="rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-rose-500/10 hover:text-rose-300">Delete</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : <EmptyState title="No project finances yet" body="Record purchases, supplies, income, and sales to build a clear project profit-and-loss history." />}
        </section>
      </div>
    </div>
  );
}

function AnimalSetupCard({ projectId, animal, onChanged }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    starting_weight: animal.starting_weight || "",
    starting_value: animal.starting_value || "0",
    ownership_percentage: animal.ownership_percentage || "100",
  });
  const change = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  async function save() {
    setSaving(true);
    try {
      const response = await updateFfaProjectAnimal(projectId, animal.id, form);
      onChanged(response.data);
      toast.success("Animal starting snapshot updated");
    } catch (error) { toast.error(apiError(error, "Could not update the animal snapshot.")); }
    finally { setSaving(false); }
  }
  async function remove() {
    if (!window.confirm(`Remove ${getAnimalDisplayName(animal, { prefixTag: true })} from this project? The animal and its normal BarnBuddy records will not be deleted.`)) return;
    try {
      const response = await removeFfaProjectAnimal(projectId, animal.id);
      onChanged(response.data);
      toast.success("Animal removed from project only");
    } catch (error) { toast.error(apiError(error, "Could not remove the animal.")); }
  }
  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
      <div className="flex min-w-0 items-start justify-between gap-3"><div className="min-w-0 flex-1"><h4 className="truncate font-semibold text-white">{getAnimalDisplayName(animal, { prefixTag: true })}</h4><p className="mt-1 truncate text-xs text-slate-500">{animal.species || "Animal"}{animal.tag_id ? ` · Tag ${animal.tag_id}` : ""}</p></div><button type="button" onClick={remove} className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-rose-500/10 hover:text-rose-300">Remove</button></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-medium text-slate-400">Starting weight<input className={fieldClass} type="number" name="starting_weight" min="0.01" step="0.01" value={form.starting_weight} onChange={change} /></label>
        <label className="text-xs font-medium text-slate-400">Starting value<input className={fieldClass} type="number" name="starting_value" min="0" step="0.01" value={form.starting_value} onChange={change} /></label>
        <label className="text-xs font-medium text-slate-400">Ownership %<input className={fieldClass} type="number" name="ownership_percentage" min="0.01" max="100" step="0.01" value={form.ownership_percentage} onChange={change} /></label>
      </div>
      <button type="button" disabled={saving} onClick={save} className="mt-4 rounded-xl border border-blue-400/40 px-4 py-2 text-sm font-semibold text-blue-300 hover:bg-blue-500/10 disabled:opacity-60">{saving ? "Saving…" : "Save snapshot"}</button>
    </article>
  );
}

function Setup({ details, allAnimals, onChanged, onDeleted }) {
  const project = details.project;
  const [saving, setSaving] = useState(false);
  const [addingAnimals, setAddingAnimals] = useState(false);
  const [selectedAnimals, setSelectedAnimals] = useState([]);
  const [form, setForm] = useState({
    name: project.name,
    school_year: project.school_year,
    sae_type: project.sae_type,
    chapter_name: project.chapter_name || "",
    advisor_name: project.advisor_name || "",
    advisor_email: project.advisor_email || "",
    description: project.description || "",
    start_date: String(project.start_date).slice(0, 10),
    end_date: project.end_date ? String(project.end_date).slice(0, 10) : "",
    status: project.status,
    goals: (project.goals || []).join("\n"),
  });
  useEffect(() => {
    setForm({ name: project.name, school_year: project.school_year, sae_type: project.sae_type, chapter_name: project.chapter_name || "", advisor_name: project.advisor_name || "", advisor_email: project.advisor_email || "", description: project.description || "", start_date: String(project.start_date).slice(0, 10), end_date: project.end_date ? String(project.end_date).slice(0, 10) : "", status: project.status, goals: (project.goals || []).join("\n") });
    setSelectedAnimals([]);
  }, [project]);
  const change = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const linkedIds = new Set(details.animals.map((animal) => Number(animal.animal_id)).filter(Boolean));
  const availableAnimals = allAnimals.filter((animal) => !linkedIds.has(Number(animal.id)));

  async function saveProject(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await updateFfaProject(project.id, { ...form, goals: form.goals.split("\n").map((goal) => goal.trim()).filter(Boolean) });
      onChanged(response.data);
      toast.success("Project settings saved");
    } catch (error) { toast.error(apiError(error, "Could not update the project.")); }
    finally { setSaving(false); }
  }

  async function addAnimals() {
    if (!selectedAnimals.length) return;
    setAddingAnimals(true);
    try {
      const response = await addFfaProjectAnimals(project.id, selectedAnimals.map((animalId) => ({ animal_id: animalId, ownership_percentage: 100 })));
      onChanged(response.data);
      setSelectedAnimals([]);
      toast.success("Animals linked to project");
    } catch (error) { toast.error(apiError(error, "Could not link the animals.")); }
    finally { setAddingAnimals(false); }
  }

  async function deleteProjectNow() {
    if (!window.confirm(`Delete “${project.name}”? This removes its project journal and project finances. Your animals and their normal BarnBuddy records stay safe.`)) return;
    try {
      await deleteFfaProject(project.id);
      toast.success("FFA project deleted; animals were kept");
      onDeleted(project.id);
    } catch (error) { toast.error(apiError(error, "Could not delete the project.")); }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={saveProject} className={`${panelClass} p-5 sm:p-6`}>
        <h3 className="text-lg font-semibold text-white">Project details</h3>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className={`${labelClass} sm:col-span-2`}>Project name<input className={fieldClass} name="name" value={form.name} onChange={change} required /></label>
          <label className={labelClass}>School year<input className={fieldClass} name="school_year" value={form.school_year} onChange={change} required /></label>
          <label className={labelClass}>SAE type<select className={fieldClass} name="sae_type" value={form.sae_type} onChange={change}>{saeTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></label>
          <label className={labelClass}>Start date<input className={fieldClass} type="date" name="start_date" value={form.start_date} onChange={change} required /></label>
          <label className={labelClass}>End date<input className={fieldClass} type="date" name="end_date" min={form.start_date} value={form.end_date} onChange={change} /></label>
          <label className={labelClass}>Status<select className={fieldClass} name="status" value={form.status} onChange={change}><option value="active">Active</option><option value="completed">Completed</option><option value="archived">Archived</option></select></label>
          <label className={labelClass}>FFA chapter<input className={fieldClass} name="chapter_name" value={form.chapter_name} onChange={change} /></label>
          <label className={labelClass}>Advisor name<input className={fieldClass} name="advisor_name" value={form.advisor_name} onChange={change} /></label>
          <label className={labelClass}>Advisor email<input className={fieldClass} type="email" name="advisor_email" value={form.advisor_email} onChange={change} /></label>
          <label className={`${labelClass} sm:col-span-2`}>Description<textarea className={fieldClass} name="description" rows="3" value={form.description} onChange={change} /></label>
          <label className={`${labelClass} sm:col-span-2`}>Goals <span className="font-normal text-slate-500">(one per line)</span><textarea className={fieldClass} name="goals" rows="3" value={form.goals} onChange={change} /></label>
        </div>
        <button disabled={saving} className="mt-5 rounded-xl bg-blue-600 px-5 py-2.5 font-semibold text-white hover:bg-blue-500 disabled:opacity-60">{saving ? "Saving…" : "Save project details"}</button>
      </form>

      <FfaProjectSharingPanel details={details} onChanged={onChanged} />

      <section className={`${panelClass} p-5 sm:p-6`}>
        <div><h3 className="text-lg font-semibold text-white">Animals and starting snapshots</h3><p className="mt-1 text-sm leading-6 text-slate-400">A snapshot captures where the project began. Removing a link never deletes the animal.</p></div>
        <div className="mt-5 grid gap-3 lg:grid-cols-2">{details.animals.map((animal) => <AnimalSetupCard key={animal.id} projectId={project.id} animal={animal} onChanged={onChanged} />)}</div>
        <div className="mt-6 border-t border-slate-800 pt-5">
          <h4 className="font-semibold text-white">Add existing animals</h4>
          {availableAnimals.length ? <><div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{availableAnimals.map((animal) => <label key={animal.id} className={`flex min-w-0 cursor-pointer items-center gap-3 overflow-hidden rounded-xl border p-3 ${selectedAnimals.includes(animal.id) ? "border-blue-400 bg-blue-500/10" : "border-slate-700 bg-slate-950"}`}><input type="checkbox" className="shrink-0 accent-blue-500" checked={selectedAnimals.includes(animal.id)} onChange={() => setSelectedAnimals((current) => current.includes(animal.id) ? current.filter((id) => id !== animal.id) : [...current, animal.id])} /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-white">{getAnimalDisplayName(animal, { prefixTag: true })}</span><span className="block truncate text-xs text-slate-500">{animal.species || "Animal"}{animal.tag_id ? ` · ${animal.tag_id}` : ""}</span></span></label>)}</div><button type="button" onClick={addAnimals} disabled={!selectedAnimals.length || addingAnimals} className="mt-4 rounded-xl border border-blue-400/40 px-4 py-2.5 text-sm font-semibold text-blue-300 hover:bg-blue-500/10 disabled:cursor-not-allowed disabled:opacity-40">{addingAnimals ? "Linking…" : `Link selected (${selectedAnimals.length})`}</button></> : <p className="mt-3 text-sm text-slate-500">All of your current animals are already linked to this project.</p>}
        </div>
      </section>

      <section className="rounded-2xl border border-rose-500/25 bg-rose-500/5 p-5 sm:p-6">
        <h3 className="font-semibold text-white">Delete this project</h3>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">This deletes only the project setup, project journal, and project ledger. Linked animals and all regular BarnBuddy animal records remain.</p>
        <button type="button" onClick={deleteProjectNow} className="mt-4 rounded-xl border border-rose-500/40 px-4 py-2.5 text-sm font-semibold text-rose-300 hover:bg-rose-500/10">Delete FFA project</button>
      </section>
    </div>
  );
}

function PrintReport({ details }) {
  const {
    project,
    summary,
    animals = [],
    activities = [],
    finances = [],
    linkedRecordSummary = {},
  } = details;
  const saeLabel = saeTypes.find((type) => type.value === project.sae_type)?.label || project.sae_type;
  const recordCounts = [
    ["Weight", linkedRecordSummary.weight_records],
    ["Vaccination", linkedRecordSummary.vaccinations],
    ["Health", linkedRecordSummary.health_events],
    ["Veterinary", linkedRecordSummary.vet_visits],
    ["Feed", linkedRecordSummary.feed_records],
    ["Animal finance", linkedRecordSummary.finance_records],
  ];

  return (
    <article className="ffa-print-report hidden print:block">
      <header className="ffa-document-header">
        <div>
          <p className="ffa-document-eyebrow">BarnBuddy · FFA / SAE Project Record</p>
          <h1>{project.name}</h1>
          <p className="ffa-document-subtitle">Complete project summary and supporting record</p>
        </div>
        <div className="ffa-document-status">
          <span>{project.status}</span>
          <small>{project.school_year}</small>
        </div>
      </header>

      <section className="ffa-document-meta" aria-label="Project information">
        <div><span>SAE type</span><strong>{saeLabel}</strong></div>
        <div><span>Project period</span><strong>{formatDate(project.start_date)} – {project.end_date ? formatDate(project.end_date) : "Ongoing"}</strong></div>
        <div><span>FFA chapter</span><strong>{project.chapter_name || "Not provided"}</strong></div>
        <div><span>Advisor</span><strong>{project.advisor_name || "Not provided"}</strong></div>
      </section>

      <section className="ffa-document-section">
        <h2>Project overview</h2>
        <div className="ffa-document-plan">
          <div>
            <h3>Description</h3>
            <p>{project.description || "No project description provided."}</p>
          </div>
          <div>
            <h3>Goals</h3>
            {project.goals?.length ? (
              <ol>{project.goals.map((goal, index) => <li key={`${goal}-${index}`}>{goal}</li>)}</ol>
            ) : <p>No project goals provided.</p>}
          </div>
        </div>
      </section>

      <section className="ffa-document-section">
        <h2>Project summary</h2>
        <dl className="ffa-document-metrics">
          <div><dt>Project animals</dt><dd>{summary.animalCount}</dd></div>
          <div><dt>Documented time</dt><dd>{summary.totalHours} hr</dd><small>{summary.totalMinutes} minutes</small></div>
          <div><dt>Starting value</dt><dd>{money(summary.startingInvestment)}</dd></div>
          <div><dt>Income</dt><dd>{money(summary.income)}</dd></div>
          <div><dt>Expenses</dt><dd>{money(summary.expenses)}</dd></div>
          <div><dt>Net result</dt><dd>{money(summary.profit)}</dd></div>
        </dl>
      </section>

      <section className="ffa-document-section">
        <h2>Project animals</h2>
        {animals.length ? (
          <table className="ffa-document-table">
            <thead><tr><th>Animal</th><th>Species / tag</th><th>Starting weight</th><th>Current weight</th><th>Starting value</th><th>Ownership</th></tr></thead>
            <tbody>{animals.map((animal) => (
              <tr key={animal.id}>
                <td><strong>{getAnimalDisplayName(animal, { prefixTag: true })}</strong></td>
                <td>{animal.species || "Animal"}{animal.tag_id ? ` · ${animal.tag_id}` : ""}</td>
                <td>{animal.starting_weight ? `${Number(animal.starting_weight).toLocaleString()} lb` : "—"}</td>
                <td>{animal.current_weight ? `${Number(animal.current_weight).toLocaleString()} lb` : "—"}</td>
                <td>{money(animal.starting_value)}</td>
                <td>{Number(animal.ownership_percentage)}%</td>
              </tr>
            ))}</tbody>
          </table>
        ) : <p className="ffa-document-empty">No animals are linked to this project.</p>}

        <h3 className="ffa-document-minor-heading">Connected BarnBuddy records</h3>
        <div className="ffa-document-record-counts">
          {recordCounts.map(([label, count]) => <div key={label}><strong>{Number(count || 0)}</strong><span>{label}</span></div>)}
        </div>
      </section>

      <section className="ffa-document-section ffa-document-journal">
        <div className="ffa-document-section-heading">
          <h2>Activity journal</h2>
          <p>{summary.totalHours} hours · {activities.length} entr{activities.length === 1 ? "y" : "ies"}</p>
        </div>
        {activities.length ? activities.map((activity, index) => (
          <article key={activity.id} className="ffa-document-activity">
            <div className="ffa-document-activity-number">{String(index + 1).padStart(2, "0")}</div>
            <div>
              <div className="ffa-document-activity-heading">
                <h3>{activity.title}</h3>
                <strong>{formatDate(activity.activity_date)} · {activity.duration_minutes} min</strong>
              </div>
              <p className="ffa-document-activity-meta">{activity.category}{activity.animal_id ? ` · Animal: ${getAnimalDisplayName(activity, { prefixTag: true })}` : ""}</p>
              {activity.description && <p>{activity.description}</p>}
              {(activity.skills_learned || activity.reflection) && (
                <dl className="ffa-document-activity-notes">
                  {activity.skills_learned && <div><dt>Skills practiced</dt><dd>{activity.skills_learned}</dd></div>}
                  {activity.reflection && <div><dt>Reflection / next step</dt><dd>{activity.reflection}</dd></div>}
                </dl>
              )}
            </div>
          </article>
        )) : <p className="ffa-document-empty">No project activities recorded.</p>}
      </section>

      <section className="ffa-document-section">
        <h2>Project financial ledger</h2>
        {finances.length ? (
          <table className="ffa-document-table ffa-document-ledger">
            <thead><tr><th>Date</th><th>Type</th><th>Category</th><th>Animal / vendor</th><th>Notes</th><th>Amount</th></tr></thead>
            <tbody>{finances.map((entry) => (
              <tr key={entry.id}>
                <td>{formatDate(entry.transaction_date)}</td>
                <td className="capitalize">{entry.transaction_type}</td>
                <td>{entry.category}</td>
                <td>{entry.animal_id ? getAnimalDisplayName(entry, { prefixTag: true }) : entry.vendor || "Whole project"}</td>
                <td>{entry.notes || "—"}</td>
                <td>{money(entry.amount)}</td>
              </tr>
            ))}</tbody>
          </table>
        ) : <p className="ffa-document-empty">No project finances recorded.</p>}
        <dl className="ffa-document-totals">
          <div><dt>Total income</dt><dd>{money(summary.income)}</dd></div>
          <div><dt>Total expenses</dt><dd>{money(summary.expenses)}</dd></div>
          <div><dt>Net result</dt><dd>{money(summary.profit)}</dd></div>
        </dl>
      </section>

      <section className="ffa-document-certification">
        <h2>Record certification</h2>
        <p>I certify that this record accurately represents the project work, learning, and financial activity documented above.</p>
        <div className="ffa-document-signatures">
          <div><span>Student signature</span><small>Date</small></div>
          <div><span>Parent / guardian signature</span><small>Date</small></div>
          <div><span>FFA advisor signature</span><small>Date</small></div>
        </div>
      </section>

      <footer className="ffa-document-footer">
        <span>Generated by BarnBuddy FFA Project Mode</span>
        <span>{formatDate(today())}</span>
      </footer>
    </article>
  );
}

export default function FfaProjects() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [animals, setAnimals] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const newProjectButtonRef = useRef(null);
  const [activeTab, setActiveTab] = useState("Overview");

  const loadProjects = useCallback(async (preferredId) => {
    const response = await getFfaProjects();
    const projectList = responseList(response.data, "FFA projects");
    setProjects(projectList);
    setSelectedId((current) => {
      const target = preferredId || current;
      if (target && projectList.some((project) => Number(project.id) === Number(target))) return Number(target);
      return projectList[0]?.id || null;
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [projectResponse, animalResponse] = await Promise.all([getFfaProjects(), getAnimalsForUser()]);
        if (cancelled) return;
        const projectList = responseList(projectResponse.data, "FFA projects");
        const animalList = responseList(animalResponse.data, "animals");
        setProjects(projectList);
        setAnimals(animalList);
        setSelectedId(projectList[0]?.id || null);
      } catch (error) {
        if (!cancelled) toast.error(apiError(error, "Could not load FFA Project Mode."));
      } finally { if (!cancelled) setLoading(false); }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!selectedId) { setDetails(null); return undefined; }
    let cancelled = false;
    setLoadingDetails(true);
    getFfaProject(selectedId)
      .then((response) => { if (!cancelled) setDetails(response.data); })
      .catch((error) => { if (!cancelled) toast.error(apiError(error, "Could not load that project.")); })
      .finally(() => { if (!cancelled) setLoadingDetails(false); });
    return () => { cancelled = true; };
  }, [selectedId]);

  async function changed(nextDetails) {
    setDetails((current) => ({
      ...nextDetails,
      advisorSharing: nextDetails.advisorSharing ?? current?.advisorSharing,
      sharing: nextDetails.sharing ?? current?.sharing,
    }));
    await loadProjects(nextDetails.project.id);
  }

  async function created(nextDetails) {
    setNewProjectOpen(false);
    setDetails(nextDetails);
    setActiveTab("Overview");
    await loadProjects(nextDetails.project.id);
  }

  async function deleted(projectId) {
    setDetails(null);
    setSelectedId(null);
    await loadProjects();
    if (Number(selectedId) === Number(projectId)) setActiveTab("Overview");
  }

  const selectedProject = Array.isArray(projects)
    ? projects.find((project) => Number(project.id) === Number(selectedId))
    : null;

  return (
    <main className="bb-livestock bb-ffa min-h-screen print:bg-white print:text-black">
      <header className="bb-workbar print:hidden">
        <div className="bb-work-container bb-workbar-row">
          <div className="bb-work-actions">
            <button type="button" onClick={() => navigate("/dashboard")} className="bb-action">← Dashboard</button>
          </div>
          <div className="bb-work-actions print:hidden">
            {details && <button type="button" onClick={() => window.print()} className="bb-action">Print summary</button>}
            <button ref={newProjectButtonRef} type="button" onClick={() => setNewProjectOpen(true)} className="bb-action bb-action-primary">New project</button>
          </div>
        </div>
      </header>

      <header className="bb-work-container print:hidden"><div className="bb-view-header"><h1>FFA Project Mode</h1></div></header>
      <div className="bb-work-container grid gap-5 pb-8 xl:grid-cols-[270px_minmax(0,1fr)] xl:gap-7 print:block print:max-w-none print:p-0">
        <aside className={`${panelClass} h-fit overflow-hidden print:hidden`}>
          <div className="border-b border-slate-800 p-4"><h2 className="font-semibold text-white">Your projects</h2><p className="mt-1 text-xs text-slate-500">{projects.length} total</p></div>
          {loading ? <div className="space-y-3 p-4">{[0, 1, 2].map((item) => <div key={item} className="h-20 animate-pulse rounded-xl bg-slate-800" />)}</div> : projects.length ? (
            <div className="max-h-[65vh] space-y-2 overflow-y-auto p-3">
              {projects.map((project) => {
                const isSelected = Number(project.id) === Number(selectedId);
                const profit = Number(project.income || 0) - Number(project.expenses || 0);
                return <button key={project.id} type="button" onClick={() => { setSelectedId(project.id); setActiveTab("Overview"); }} className={`w-full rounded-xl border p-3 text-left transition ${isSelected ? "border-blue-400 bg-blue-500/10" : "border-transparent bg-slate-950 hover:border-slate-700"}`}><div className="flex items-start justify-between gap-2"><strong className="text-sm font-semibold text-white">{project.name}</strong><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${project.status === "active" ? "bg-emerald-500/10 text-emerald-300" : "bg-slate-800 text-slate-400"}`}>{project.status}</span></div><p className="mt-2 text-xs text-slate-500">{project.school_year} · {project.animal_count} animal{Number(project.animal_count) === 1 ? "" : "s"}</p><p className={`mt-1 text-xs font-medium ${profit >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{money(profit)} net</p></button>;
              })}
            </div>
          ) : <div className="p-5 text-sm leading-6 text-slate-400">Create your first project to begin a structured SAE record.</div>}
        </aside>

        <section className="min-w-0">
          {loading ? <div className="h-80 animate-pulse rounded-2xl bg-slate-900" /> : !projects.length ? (
            <EmptyState title="Start your first FFA project" body="Use animals you already have, take a starting snapshot, and build an organized record of hours, skills, reflections, and finances." action={<button type="button" onClick={() => setNewProjectOpen(true)} className="mt-6 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-500">Create first project</button>} />
          ) : loadingDetails || !details || Number(details.project.id) !== Number(selectedId) ? (
            <div className="space-y-4"><div className="h-32 animate-pulse rounded-2xl bg-slate-900" /><div className="h-72 animate-pulse rounded-2xl bg-slate-900" /></div>
          ) : (
            <>
              <section className="bb-record-panel bb-panel-inset print:hidden">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="max-w-3xl">
                    <h2 className="font-semibold text-white print:text-black">{details.project.name}</h2>
                    <p className="mt-1 text-sm text-slate-400">{saeTypes.find((type) => type.value === details.project.sae_type)?.label || details.project.sae_type} · {details.project.school_year}</p>
                    <p className="mt-2 text-sm text-slate-400 print:text-black">{formatDate(details.project.start_date)} → {formatDate(details.project.end_date)}{details.project.chapter_name ? ` · ${details.project.chapter_name}` : ""}{details.project.advisor_name ? ` · Advisor: ${details.project.advisor_name}` : ""}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wider ${normalizeProjectSharing(details).effective ? "border-blue-400/25 bg-blue-500/10 text-blue-200" : "border-slate-700 bg-slate-950 text-slate-400"}`}>
                      {normalizeProjectSharing(details).effective ? "Advisor shared" : "Private"}
                    </span>
                    <span className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wider ${details.project.status === "active" ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300" : "border-slate-700 bg-slate-800 text-slate-300"}`}>{details.project.status}</span>
                  </div>
                </div>
              </section>

              <nav className="my-4 flex flex-wrap gap-1 border-b border-slate-800 print:hidden" aria-label="FFA project sections">
                {tabs.map((tab) => <button key={tab} type="button" aria-pressed={activeTab === tab} onClick={() => setActiveTab(tab)} className="bb-work-tab">{tab}</button>)}
              </nav>

              <div className="print:hidden">
                {activeTab === "Overview" && <Overview details={details} />}
                {activeTab === "Journal" && <Journal key={`journal-${details.project.id}`} details={details} onChanged={changed} />}
                {activeTab === "Finances" && <Finances key={`finances-${details.project.id}`} details={details} onChanged={changed} />}
                {activeTab === "Setup" && <Setup key={`setup-${details.project.id}`} details={details} allAnimals={animals} onChanged={changed} onDeleted={deleted} />}
              </div>
              <PrintReport details={details} />
            </>
          )}
        </section>
      </div>
      {newProjectOpen && <ProjectModal animals={animals} onClose={() => setNewProjectOpen(false)} onCreated={created} returnFocusRef={newProjectButtonRef} />}
      {selectedProject && <span className="sr-only">Selected project: {selectedProject.name}</span>}
    </main>
  );
}
