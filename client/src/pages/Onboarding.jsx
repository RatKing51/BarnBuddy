import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { API_URL } from "../config/env";
import { useAuth } from "../context/AuthContext";

const steps = [
  {
    key: "userType",
    guide: "First, BarnBuddy learns what kind of workflow you need.",
    title: "What best describes you?",
    subtitle: "This helps the tour point you toward the tools that matter most.",
    type: "single",
    options: ["Small breeder", "FFA / 4-H student", "Hobby farm", "Larger herd", "School or chapter", "Just trying it out"],
  },
  {
    key: "primarySpecies",
    guide: "Next, choose the animals you want BarnBuddy to understand.",
    title: "What animals do you work with?",
    subtitle: "Choose as many as you need.",
    type: "multi",
    options: ["Cattle", "Goats", "Sheep", "Pigs", "Horses", "Poultry", "Rabbits", "Other"],
  },
  {
    key: "herdSizeRange",
    guide: "Now set the scale. A rough count is enough.",
    title: "About how many animals do you currently track?",
    subtitle: "A rough estimate is perfect.",
    type: "single",
    options: ["1-5", "6-20", "21-50", "51-100", "100+"],
  },
  {
    key: "mainGoal",
    guide: "Pick the job BarnBuddy should help with first.",
    title: "What do you mainly want BarnBuddy to help with?",
    subtitle: "The tour will explain where to go for that workflow.",
    type: "single",
    options: [
      "Remember health records",
      "Track breeding and birth records",
      "Track weights and growth",
      "Manage show animals",
      "Keep sale/buyer records",
      "Organize everything in one place",
      "Not sure yet",
    ],
  },
  {
    key: "setupMode",
    guide: "Last step: choose your first action.",
    title: "How do you want to get started?",
    subtitle: "You can change direction anytime.",
    type: "single",
    options: ["Add one animal now", "Import existing records", "Explore the dashboard first"],
  },
];

const initialAnswers = {
  userType: "",
  primarySpecies: [],
  herdSizeRange: "",
  mainGoal: "",
  setupMode: "",
};

const optionDescriptions = {
  "Small breeder": "Simple records for animals, breeding, health, births, and sales.",
  "FFA / 4-H student": "Project animals, weights, health records, and show prep.",
  "Hobby farm": "A clean way to keep everyday animal notes together.",
  "Larger herd": "Faster workflows for groups, feed, finances, and inventory.",
  "School or chapter": "Shared organization for chapter or classroom animals.",
  "Just trying it out": "A light setup so you can explore without pressure.",
  Cattle: "Set up cattle records and herd tracking.",
  Goats: "Track goats, breeding notes, health, and kids.",
  Sheep: "Track flock records, lambing, health, and weights.",
  Pigs: "Track pigs, weights, feed, and health records.",
  Horses: "Track horse profiles, care, and notes.",
  Poultry: "Keep poultry records organized.",
  Rabbits: "Track rabbit profiles, breeding, and care.",
  Other: "Use BarnBuddy for other livestock too.",
  "1-5": "Keep things simple and quick.",
  "6-20": "Balance detail with speed.",
  "21-50": "Set up for a growing herd.",
  "51-100": "Prioritize faster record entry.",
  "100+": "Focus on scalable herd tools.",
  "Remember health records": "We will point you to health, vaccines, vet visits, and reminders.",
  "Track breeding and birth records": "We will point you to reproduction and birth records.",
  "Track weights and growth": "We will point you to weight tracking and growth history.",
  "Manage show animals": "We will point you to profiles, weights, health, and notes.",
  "Keep sale/buyer records": "We will point you to finance and sale record tools.",
  "Organize everything in one place": "We will give you a broad tour of the main areas.",
  "Not sure yet": "We will keep it flexible.",
  "Add one animal now": "BarnBuddy will open the dashboard and create your first animal profile.",
  "Import existing records": "BarnBuddy will take you to the Import Assistant.",
  "Explore the dashboard first": "BarnBuddy will send you to the dashboard without adding anything yet.",
};

function formatAnswer(value, empty = "Not picked yet") {
  if (Array.isArray(value)) return value.length ? value.join(", ") : empty;
  return value || empty;
}

function destinationForSetupMode(setupMode) {
  if (setupMode === "Import existing records") return "/settings/import-assistant";
  if (setupMode === "Add one animal now") return "/dashboard?start=add-animal&tour=1";
  return "/dashboard?tour=1";
}

export default function Onboarding() {
  const navigate = useNavigate();
  const { authFetch, backendUser, refreshBackendUser } = useAuth();
  const saved = backendUser?.onboarding || {};
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState({
    ...initialAnswers,
    userType: saved.userType || "",
    primarySpecies: saved.primarySpecies || [],
    herdSizeRange: saved.herdSizeRange || "",
    mainGoal: saved.mainGoal || "",
    setupMode: saved.setupMode || "",
  });
  const [saving, setSaving] = useState(false);
  const currentStep = steps[stepIndex];
  const selectedValue = answers[currentStep.key];
  const canContinue = Array.isArray(selectedValue) ? selectedValue.length > 0 : Boolean(selectedValue);
  const progressPercent = useMemo(() => ((stepIndex + 1) / steps.length) * 100, [stepIndex]);
  const setupSummary = [
    { label: "Workflow", value: formatAnswer(answers.userType) },
    { label: "Animals", value: formatAnswer(answers.primarySpecies) },
    { label: "Size", value: formatAnswer(answers.herdSizeRange) },
    { label: "Main goal", value: formatAnswer(answers.mainGoal) },
    { label: "First action", value: formatAnswer(answers.setupMode) },
  ];
  const tourStops = steps.map((step, index) => ({
    label: step.title.replace("?", ""),
    state: index < stepIndex ? "done" : index === stepIndex ? "active" : "upcoming",
  }));

  function selectOption(option) {
    setAnswers((current) => {
      if (currentStep.type === "multi") {
        const values = current[currentStep.key] || [];
        return {
          ...current,
          [currentStep.key]: values.includes(option) ? values.filter((item) => item !== option) : [...values, option],
        };
      }

      return { ...current, [currentStep.key]: option };
    });
  }

  async function saveOnboarding(nextAnswers, completed = false) {
    const res = await authFetch(`${API_URL}/auth/onboarding`, {
      method: "PATCH",
      body: JSON.stringify({ ...nextAnswers, completed }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.error || data.message || "Failed to save onboarding.");
    }

    return data;
  }

  async function continueStep() {
    if (!canContinue || saving) return;

    try {
      setSaving(true);
      const completed = stepIndex === steps.length - 1;
      await saveOnboarding(answers, completed);

      if (completed) {
        await refreshBackendUser();
        navigate(destinationForSetupMode(answers.setupMode), { replace: true });
        return;
      }

      setStepIndex((current) => current + 1);
    } catch (err) {
      toast.error(err.message || "Onboarding could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  async function skipOnboarding() {
    if (saving) return;

    try {
      setSaving(true);
      const skippedAnswers = {
        ...answers,
        setupMode: "Explore the dashboard first",
      };
      await saveOnboarding(skippedAnswers, true);
      await refreshBackendUser();
      navigate("/dashboard", { replace: true });
    } catch (err) {
      toast.error(err.message || "Onboarding could not be skipped.");
    } finally {
      setSaving(false);
    }
  }

  const isSmallBreeder = answers.userType === "Small breeder";

  return (
    <main className="min-h-screen bg-[#0A1128] px-4 py-6 text-[#D9D9DD] sm:px-6 lg:px-8">
      <section className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-6xl flex-col justify-center">
        <div className="mb-8 flex items-center justify-between gap-4">
          <button type="button" onClick={() => navigate("/")} className="text-2xl font-bold tracking-tight text-white">
            <span className="text-[#5170FF]">Barn</span>Buddy.
          </button>
          <button
            type="button"
            onClick={skipOnboarding}
            disabled={saving}
            className="rounded-md border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-white/10 disabled:opacity-60"
          >
            Skip tour
          </button>
        </div>

        <div className="rounded-lg border border-white/10 bg-[#101D42] p-5 shadow-2xl shadow-black/30 sm:p-8">
          <div className="mb-8">
            <div className="flex items-center justify-between text-sm font-semibold text-slate-300">
              <span>Guided tour step {stepIndex + 1} of {steps.length}</span>
              <span>{Math.round(progressPercent)}%</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/30">
              <div className="h-full rounded-full bg-[#5170FF]" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[0.85fr_1.15fr]">
            <aside className="rounded-lg border border-white/10 bg-black/15 p-4 sm:p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8da0ff]">BarnBuddy Tour</p>
              <h2 className="mt-3 text-2xl font-semibold text-white">Your setup map</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">{currentStep.guide}</p>

              <div className="mt-5 space-y-3">
                {tourStops.map((stop, index) => (
                  <div
                    key={stop.label}
                    className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-sm ${
                      stop.state === "active"
                        ? "border-[#5170FF]/70 bg-[#5170FF]/15 text-white"
                        : stop.state === "done"
                        ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
                        : "border-white/10 bg-white/[0.03] text-slate-400"
                    }`}
                  >
                    <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${
                      stop.state === "done" ? "bg-emerald-400 text-[#07111f]" : stop.state === "active" ? "bg-[#5170FF] text-white" : "bg-white/10 text-slate-300"
                    }`}>
                      {index + 1}
                    </span>
                    <span>{stop.label}</span>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-lg border border-white/10 bg-[#0A1128] p-4">
                <p className="text-sm font-semibold text-white">Your path so far</p>
                <div className="mt-3 space-y-2">
                  {setupSummary.map((item) => (
                    <div key={item.label} className="flex gap-3 text-sm">
                      <span className="w-24 shrink-0 text-slate-500">{item.label}</span>
                      <span className="text-slate-200">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </aside>

            <div className="rounded-lg border border-white/10 bg-[#0A1128]/45 p-4 sm:p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8da0ff]">Current stop</p>
              <h1 className="mt-3 text-3xl font-semibold leading-tight text-white sm:text-4xl">{currentStep.title}</h1>
              <p className="mt-3 text-base leading-relaxed text-slate-300">{currentStep.subtitle}</p>

              {isSmallBreeder && (
                <div className="mt-6 rounded-lg border border-[#5170FF]/25 bg-[#5170FF]/10 p-4 text-sm leading-relaxed text-slate-100">
                  BarnBuddy does not have to be complicated. Even if you only have a few animals, it can help you remember breeding dates, health notes, birth records, and sales without keeping everything in your head.
                </div>
              )}
              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {currentStep.options.map((option) => {
                  const selected = Array.isArray(selectedValue) ? selectedValue.includes(option) : selectedValue === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => selectOption(option)}
                      className={`min-h-24 rounded-lg border p-4 text-left transition ${
                        selected
                          ? "border-[#5170FF] bg-[#5170FF]/20 text-white shadow-lg shadow-[#5170FF]/10"
                          : "border-white/10 bg-black/15 text-slate-200 hover:border-[#5170FF]/50 hover:bg-white/5"
                      }`}
                    >
                      <span className="block text-base font-semibold">{option}</span>
                      <span className="mt-2 block text-sm font-normal leading-relaxed text-slate-400">
                        {optionDescriptions[option]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() => setStepIndex((current) => Math.max(0, current - 1))}
              disabled={stepIndex === 0 || saving}
              className="rounded-md border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-200 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Back
            </button>
            <button
              type="button"
              onClick={continueStep}
              disabled={!canContinue || saving}
              className="rounded-md bg-[#5170FF] px-6 py-3 text-sm font-semibold text-white hover:bg-[#6f86ff] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : stepIndex === steps.length - 1 ? "Finish setup" : "Continue"}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
