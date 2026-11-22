import { useState } from "react";
import { Link, Navigate, useLocation } from "react-router";
import { toast } from "react-toastify";
import { API_URL } from "../config/env";
import { useAuth } from "../context/AuthContext";

const steps = [
  {
    key: "userType",
    title: "What best describes you?",
    type: "single",
    options: ["Small breeder", "FFA / 4-H student", "Hobby farm", "Larger herd", "School or chapter", "Just trying it out"],
  },
  {
    key: "primarySpecies",
    title: "What animals do you work with?",
    type: "multi",
    options: ["Cattle", "Goats", "Sheep", "Pigs", "Horses", "Poultry", "Rabbits", "Other"],
  },
  {
    key: "herdSizeRange",
    title: "About how many animals do you currently track?",
    type: "single",
    options: ["1-5", "6-20", "21-50", "51-100", "100+"],
  },
  {
    key: "mainGoal",
    title: "What do you mainly want BarnBuddy to help with?",
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
    title: "How do you want to get started?",
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

const setupHelp = {
  "Add one animal now": "Create a starter profile and open it.",
  "Import existing records": "Open the Import Assistant.",
  "Explore the dashboard first": "Take a tour of the dashboard.",
};

function destinationForSetupMode(setupMode) {
  if (setupMode === "Import existing records") return "/settings/import-assistant";
  if (setupMode === "Add one animal now") return "/dashboard?start=add-animal&tour=1";
  return "/dashboard?tour=1";
}

export default function Onboarding() {
  const location = useLocation();
  const { authFetch, backendUser, refreshBackendUser } = useAuth();
  const advisorReturnTo = location.state?.returnTo === "/advisor" ? "/advisor" : "";
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
  const [completionDestination, setCompletionDestination] = useState("");
  const currentStep = steps[stepIndex];
  const selectedValue = answers[currentStep.key];
  const canContinue = Array.isArray(selectedValue) ? selectedValue.length > 0 : Boolean(selectedValue);
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
        setCompletionDestination(advisorReturnTo || destinationForSetupMode(answers.setupMode));
        await refreshBackendUser();
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
      setCompletionDestination(advisorReturnTo || "/dashboard");
      await refreshBackendUser();
    } catch (err) {
      toast.error(err.message || "Onboarding could not be skipped.");
    } finally {
      setSaving(false);
    }
  }

  if (!saved.required || saved.completed) {
    return <Navigate to={completionDestination || advisorReturnTo || "/dashboard"} replace />;
  }

  return (
    <main className="bb-livestock min-h-screen">
      <header className="bb-workbar">
        <div className="bb-work-container bb-workbar-row">
          <Link className="bb-work-brand" to="/" aria-label="BarnBuddy home"><span>Barn</span>Buddy.</Link>
          <button type="button" className="bb-action" onClick={skipOnboarding} disabled={saving}>Skip setup</button>
        </div>
      </header>
      <div className="bb-setup-container bb-work-container">
        <div className="bb-record-panel bb-panel-inset">
          <p className="bb-work-muted mb-3 text-sm">Setup step {stepIndex + 1} of {steps.length}</p>
          <progress className="bb-setup-progress" aria-label="Setup progress" value={stepIndex + 1} max={steps.length} />
          <h1 className="mt-5 text-2xl sm:text-4xl">{currentStep.title}</h1>
          {currentStep.type === "multi" && <p className="mt-2 bb-work-muted">You can choose more than one.</p>}
          <div className="bb-setup-options">
            {currentStep.options.map(option => {
              const selected = Array.isArray(selectedValue) ? selectedValue.includes(option) : selectedValue === option;
              return (
                <button key={option} type="button" className="bb-setup-option" aria-pressed={selected} onClick={() => selectOption(option)} disabled={saving}>
                  <strong>{option}</strong>
                  {setupHelp[option] && <span>{setupHelp[option]}</span>}
                </button>
              );
            })}
          </div>
          <div className="mt-6 flex justify-between gap-3">
            <button type="button" className="bb-action" disabled={stepIndex === 0 || saving}
              onClick={() => setStepIndex(current => Math.max(0, current - 1))}>Back</button>
            <button type="button" className="bb-action bb-action-primary" onClick={continueStep} disabled={!canContinue || saving}>
              {saving ? "Saving…" : stepIndex === steps.length - 1 ? "Finish setup" : "Continue"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
