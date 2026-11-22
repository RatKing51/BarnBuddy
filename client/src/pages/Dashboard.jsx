import React, { useState, useEffect } from "react";
import AnimalGeneralData from "../components/AnimalGeneralData";
import BulkEntry from "../components/BulkEntry";
import DashboardOverview from "../components/DashboardOverview";
import AnimalDirectory from "../components/AnimalDirectory";
import AnimalShortcuts from "../components/AnimalShortcuts";
import HealthRecords from "../components/HealthRecords";
import HerdFeedRecords from "../components/HerdFeedRecords";
import HerdFinanceRecords from "../components/HerdFinanceRecords";
import HerdInventory from "../components/HerdInventory";
import PremiumRecords from "../components/PremiumRecords";
import VetVisits from "../components/VetVisits";
import WeightRecords from "../components/WeightRecords";
import { LoadingSpinner } from "../components/LoadingSpinner";
import PremiumExpiryBadge from "../components/PremiumExpiryBadge";
import { Link, useLocation, useNavigate, useNavigationType, useParams } from "react-router";
import {
  createAnimal,
  getAnimalByID,
  getDashboardBootstrap,
  getAnimalsForHerd,
  getAnimalsUnassigned,
  getHerdCareSummary,
} from "../api/animal";
import * as healthEventsAPI from "../api/healthEvents";
import * as premiumRecordsAPI from "../api/premiumRecords";
import * as reproductionsAPI from "../api/reproductions";
import * as vaccinationsAPI from "../api/vaccinations";
import * as vetVisitsAPI from "../api/vetVisits";
import { toast } from "react-toastify";
import { UserButton, useUser } from "@clerk/react";
import { usePreferences } from "../context/PreferencesContext";
import { useAuth as useBarnBuddyAuth } from "../context/AuthContext";
import { API_URL } from "../config/env";
import { formatAnimalAge } from "../utils/age";
import { getAnimalDisplayName } from "../utils/animalLabel";
import { getOnboardingDefaultSpecies } from "../config/onboardingSpecies";
import { getMyFfaChapter } from "../api/ffaChapters";

const getAnimalCareSignature = (items) =>
  items
    .map((animal) => `${animal.id}:${animal.status || "active"}:${animal.deceased_date || ""}`)
    .join("|");

const isInactiveAnimalStatus = (status) => ["archived", "deceased"].includes(status);

const getCareSummaryKey = (herd, items, careWindow, refreshKey) =>
  `${herd?.id || "none"}:${careWindow}:${refreshKey}:${getAnimalCareSignature(items)}`;

const noAnimals = [];
const noCare = {};
const unassignedHerd = { id: "unassigned", name: "Unassigned" };
const herdViews = [
  { key: "general", label: "Farm Overview", mobileLabel: "Home" },
  { key: "animals", label: "Animals" },
  { key: "feed", label: "Feed" },
  { key: "herd-finance", label: "Money" },
  { key: "bulk-entry", label: "Bulk Entry" },
  { key: "inventory", label: "Inventory" },
];
const animalRecordTabs = [
  { key: "general", label: "General" },
  { key: "weight", label: "Weight" },
  { key: "health", label: "Health" },
  { key: "vet", label: "Vet" },
  { key: "reproduction", label: "Reproduction" },
  { key: "finance", label: "Money" },
];

function withQuery(path, params) {
  const search = params.toString();
  return search ? `${path}?${search}` : path;
}

function getVisibleTourTarget(target) {
  if (!target) return null;
  const matches = Array.from(document.querySelectorAll(`[data-tour="${target}"]`));
  return matches.find((element) => {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
  }) || null;
}

function DashboardTour({ open, steps, onClose, onStepAction }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const [completedSteps, setCompletedSteps] = useState({});
  const [runningAction, setRunningAction] = useState(false);
  const activeStep = steps[activeIndex];

  const updateTarget = React.useCallback(() => {
    if (!open || !activeStep) return;
    const element = getVisibleTourTarget(activeStep.target) || getVisibleTourTarget(activeStep.fallbackTarget);

    if (!element) {
      setTargetRect(null);
      return;
    }

    const rect = element.getBoundingClientRect();
    setTargetRect({
      top: Math.max(4, rect.top - 4),
      left: Math.max(4, rect.left - 4),
      width: rect.width + 8,
      height: rect.height + 8,
    });
  }, [activeStep, open]);

  useEffect(() => {
    if (!open) return undefined;
    setActiveIndex(0);
    setCompletedSteps({});
    return undefined;
  }, [open]);

  useEffect(() => {
    if (!open || !activeStep) return undefined;
    const target = (getVisibleTourTarget(activeStep.target) || getVisibleTourTarget(activeStep.fallbackTarget))?.getBoundingClientRect();
    if (target && (target.top < 0 || target.bottom > window.innerHeight)) {
      const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth";
      window.scrollTo({ top: Math.max(0, window.scrollY + target.top - window.innerHeight / 3), behavior });
    }
    updateTarget();
    window.addEventListener("resize", updateTarget);
    window.addEventListener("scroll", updateTarget, true);
    return () => {
      window.removeEventListener("resize", updateTarget);
      window.removeEventListener("scroll", updateTarget, true);
    };
  }, [activeStep, open, updateTarget]);

  if (!open || !activeStep) return null;

  const isLastStep = activeIndex === steps.length - 1;
  const actionComplete = completedSteps[activeStep.key] === true || !activeStep.requiresAction;
  const tooltipClass = targetRect && targetRect.top > window.innerHeight / 2
    ? "top-4 sm:top-auto sm:bottom-8"
    : "bottom-4 sm:bottom-8";

  const runStepAction = async () => {
    if (!activeStep || runningAction) return;

    try {
      setRunningAction(true);
      if (await onStepAction(activeStep) === false) return;
      setCompletedSteps((current) => ({ ...current, [activeStep.key]: true }));
      window.setTimeout(updateTarget, 250);
    } finally {
      setRunningAction(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      <div className="absolute inset-0 bg-black/65" />
      {targetRect && (
        <div
          className="absolute rounded-lg border-2 border-blue-400 bg-blue-500/10"
          style={{
            top: targetRect.top,
            left: targetRect.left,
            width: targetRect.width,
            height: targetRect.height,
          }}
        />
      )}

      <section aria-label="Dashboard tour" className={`pointer-events-auto absolute left-4 right-4 mx-auto max-h-[85dvh] max-w-md overflow-y-auto bb-record-panel p-5 shadow-2xl sm:left-auto sm:right-8 ${tooltipClass}`}>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold bb-work-muted">
            Dashboard tour {activeIndex + 1} of {steps.length}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="bb-action"
          >
            Skip
          </button>
        </div>
        <h2 className="mt-3 text-xl font-semibold">{activeStep.title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">{activeStep.body}</p>
        {activeStep.action && (
          <p className="mt-3 text-sm bb-work-muted">
            {activeStep.action}
          </p>
        )}
        {activeStep.requiresAction && (
          <div className="mt-4">
            <button
              type="button"
              onClick={runStepAction}
              disabled={runningAction || actionComplete}
              className="bb-action bb-action-primary mt-2 w-full"
            >
              {runningAction ? "Working..." : actionComplete ? "Done" : activeStep.actionLabel}
            </button>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              {actionComplete ? activeStep.completionText : "Complete this quick action to unlock the next step."}
            </p>
          </div>
        )}

        <div className="mt-5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setActiveIndex((current) => Math.max(0, current - 1))}
            disabled={activeIndex === 0}
            className="bb-action"
          >
            Back
          </button>
          <button
            type="button"
            onClick={() => {
              if (isLastStep) {
                onClose();
                return;
              }
              setActiveIndex((current) => current + 1);
            }}
            disabled={!actionComplete}
            className="bb-action bb-action-primary"
          >
            {isLastStep ? "Finish tour" : "Next"}
          </button>
        </div>
      </section>
    </div>
  );
}

export default function Dashboard() {
  const { animalId: linkedAnimalId } = useParams();
  const isProfile = Boolean(linkedAnimalId);
  const location = useLocation();
  const navigate = useNavigate();
  const navigationType = useNavigationType();
  const params = React.useMemo(() => new URLSearchParams(location.search), [location.search]);
  const isDirectory = /^\/dashboard\/animals\/?$/i.test(location.pathname);
  const requestedTab = params.get(linkedAnimalId ? "record" : "view");
  const availableTabs = linkedAnimalId ? animalRecordTabs : herdViews.slice(2);
  const activeTab = isDirectory ? "animals" : availableTabs.some(tab => tab.key === requestedTab) ? requestedTab : "general";
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const moreButtonRef = React.useRef(null);
  const toolbarRef = React.useRef(null);
  const [greeting] = useState(() => {
    const hour = new Date().getHours();
    return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  });
  const [herds, setHerds] = useState([]);
  const [defaultHerd, setDefaultHerd] = useState(null);
  const [herdRecords, setHerdRecords] = useState(null);
  const [openedAnimal, setSelectedAnimal] = useState(null);
  const [vaccinationRefresh, setVaccinationRefresh] = useState(0);
  const [care, setCare] = useState(null);
  const [loadingHerds, setLoadingHerds] = useState(true);
  const [bootstrapError, setBootstrapError] = useState(false);
  const [addingAnimal, setAddingAnimal] = useState(false);
  const [exportMode, setExportMode] = useState("farm");
  const [exportLoading, setExportLoading] = useState(false);
  const [animalExportData, setAnimalExportData] = useState(null);
  const [herdFinanceExportData, setHerdFinanceExportData] = useState(null);

  const { user } = useUser();
  const { preferences, loadingPreferences } = usePreferences();
  const { subscription, authFetch, refreshBackendUser, backendUser } = useBarnBuddyAuth();
  const selectedAnimal = linkedAnimalId && String(openedAnimal?.id) === linkedAnimalId ? openedAnimal : null;
  const herdParam = params.get("herd");
  const requestedHerdId = selectedAnimal ? String(selectedAnimal.herd_id ?? "unassigned") : herdParam;
  const selectedHerd = requestedHerdId === "unassigned"
    ? unassignedHerd
    : herds.find(herd => String(herd.id) === requestedHerdId) || defaultHerd;
  const selectedHerdId = selectedHerd?.id ?? null;
  const matchingHerdRecords = herdRecords?.herdId === selectedHerdId ? herdRecords : null;
  const animals = matchingHerdRecords?.animals || noAnimals;
  const loadingAnimals = Boolean(selectedHerdId && !matchingHerdRecords);
  const animalsError = bootstrapError || Boolean(matchingHerdRecords?.error);

  const setAnimals = React.useCallback(update => {
    setHerdRecords(current => current?.herdId === selectedHerdId
      ? { ...current, animals: update(current.animals) }
      : current);
  }, [selectedHerdId]);

  const returnTo = location.pathname + location.search;
  const tour = params.get("tour");
  const viewPath = React.useCallback(view => {
    const next = new URLSearchParams();
    if (herdParam || selectedHerdId && selectedHerdId !== defaultHerd?.id) next.set("herd", selectedHerdId || herdParam);
    if (tour) next.set("tour", tour);
    if (view !== "general" && view !== "animals") next.set("view", view);
    return withQuery(view === "animals" ? "/dashboard/animals" : "/dashboard", next);
  }, [defaultHerd?.id, herdParam, selectedHerdId, tour]);
  const profilePath = React.useCallback((animal, record = "general") => {
    const next = new URLSearchParams();
    if (record !== "general") next.set("record", record);
    if (tour) next.set("tour", tour);
    return withQuery("/dashboard/animal/" + animal.id, next);
  }, [tour]);
  const profileCameFrom = /^\/dashboard(?:\/animals)?(?:\?|$)/.test(location.state?.returnTo || "")
    ? location.state.returnTo : "";
  const directoryPath = isDirectory ? returnTo : profileCameFrom.startsWith("/dashboard/animals") ? profileCameFrom : viewPath("animals");
  const canGoBackToDirectory = Boolean(profileCameFrom && location.state?.canGoBack !== false);
  const returnFromAnimal = React.useCallback(() => {
    setMobileMoreOpen(false);
    if (canGoBackToDirectory && !tour) navigate(-1);
    else navigate(directoryPath, { replace: true });
  }, [canGoBackToDirectory, directoryPath, navigate, tour]);

  useEffect(() => {
    if (navigationType !== "POP") window.scrollTo({ top: 0, behavior: "instant" });
  }, [activeTab, location.pathname, navigationType]);

  useEffect(() => {
    const toolbar = toolbarRef.current;
    const main = toolbar.parentElement;
    const observer = new ResizeObserver(() => {
      main.style.setProperty("--dashboard-toolbar-desktop", `${toolbar.offsetHeight}px`);
    });
    observer.observe(toolbar);
    return () => observer.disconnect();
  }, []);

  const backendAdvisorDashboardAvailable = Boolean(
    backendUser?.ffa?.isAdvisor === true ||
    backendUser?.ffa?.hasAdvisorMembership === true
  );
  const [advisorDashboardAvailable, setAdvisorDashboardAvailable] = useState(
    backendAdvisorDashboardAvailable
  );
  const handledOnboardingStartRef = React.useRef(false);
  const handleFfaProjectsClick = () => {
    setMobileMoreOpen(false);
    navigate("/dashboard/ffa-projects");
  };
  const handleAdvisorDashboardClick = () => {
    setMobileMoreOpen(false);
    navigate("/advisor");
  };
  const isCompact = preferences.dashboardDensity === "compact";
  const primaryAnimalIdentifier = preferences.animalPrimaryIdentifier === "tag" ? "tag" : "name";
  const onboardingDefaultSpecies = React.useMemo(
    () => getOnboardingDefaultSpecies(backendUser?.onboarding),
    [backendUser?.onboarding]
  );

  useEffect(() => {
    if (backendAdvisorDashboardAvailable) {
      setAdvisorDashboardAvailable(true);
    }
  }, [backendAdvisorDashboardAvailable]);

  useEffect(() => {
    if (backendAdvisorDashboardAvailable) return undefined;

    let cancelled = false;
    getMyFfaChapter()
      .then((response) => {
        if (cancelled || response.data?.advisorDashboardAvailable !== true) return;
        setAdvisorDashboardAvailable(true);
        refreshBackendUser().catch(() => {});
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [backendAdvisorDashboardAvailable, refreshBackendUser]);
  const getAnimalPrimaryLabel = (animal) => {
    return getAnimalDisplayName(animal, { preferTag: primaryAnimalIdentifier === "tag" });
  };
  const getAnimalSecondaryLabel = (animal) => {
    if (primaryAnimalIdentifier === "tag") return animal.name ? `Name ${animal.name}` : "Name not set";
    return animal.tag_id ? `Tag ${animal.tag_id}` : "Tag not set";
  };
  const formatReportDate = (value) => (value ? String(value).slice(0, 10) : "");
  const formatReportMoney = (value) => {
    const number = Number.parseFloat(value);
    return Number.isFinite(number) ? `$${number.toFixed(2)}` : "";
  };
  const formatSignedReportMoney = (value) => {
    const number = Number.parseFloat(value);
    return Number.isFinite(number) ? `$${number.toFixed(2)}` : "$0.00";
  };
  const formatReportMonth = (key) => {
    if (!key || key === "No date") return key || "No date";
    const date = new Date(`${key}-01T00:00:00`);
    if (Number.isNaN(date.getTime())) return key;
    return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
  };
  const getReportAnimalLabel = (animalId) => {
    const match = animals.find((animal) => String(animal.id) === String(animalId));
    return match ? getAnimalPrimaryLabel(match) : "";
  };
  const careWindow = Number(preferences.careWindow) || 7;
  useEffect(() => {
    if (loadingPreferences) return undefined;
    let cancelled = false;

    async function loadDashboardBootstrap() {
      setLoadingHerds(true);
      setBootstrapError(false);
      try {
        const { data } = await getDashboardBootstrap(careWindow);
        if (cancelled) return;
        const nextHerd = data.selectedHerd || null;
        const items = Array.isArray(data.animals) ? data.animals : [];
        setHerds(Array.isArray(data.herds) ? data.herds : []);
        setDefaultHerd(nextHerd);
        setHerdRecords({ herdId: nextHerd?.id ?? null, animals: items });
        if (data.careSummary) {
          setCare({ key: getCareSummaryKey(nextHerd, items, careWindow, 0), summary: data.careSummary });
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Dashboard data failed to load:", error);
          setBootstrapError(true);
        }
      } finally {
        if (!cancelled) setLoadingHerds(false);
      }
    }

    loadDashboardBootstrap();
    return () => { cancelled = true; };
  }, [careWindow, loadingPreferences]);

  useEffect(() => {
    if (!selectedHerdId || loadingHerds || matchingHerdRecords) return undefined;
    let cancelled = false;
    const request = selectedHerdId === "unassigned" ? getAnimalsUnassigned() : getAnimalsForHerd(selectedHerdId);
    request.then(({ data }) => {
      if (!cancelled) setHerdRecords({ herdId: selectedHerdId, animals: Array.isArray(data) ? data : [] });
    }).catch(error => {
      if (!cancelled) {
        console.error("Animal records failed to load:", error);
        setHerdRecords({ herdId: selectedHerdId, animals: [], error: true });
      }
    });
    return () => { cancelled = true; };
  }, [loadingHerds, matchingHerdRecords, selectedHerdId]);

  useEffect(() => {
    if (!linkedAnimalId) return undefined;
    let cancelled = false;
    getAnimalByID(linkedAnimalId).then(({ data }) => {
      if (!cancelled) setSelectedAnimal(data);
    }).catch(error => {
      if (cancelled) return;
      toast.error(error.response?.status === 404 ? "Animal not found or unavailable." : "Failed to open animal profile.");
      navigate("/dashboard", { replace: true });
    });
    return () => { cancelled = true; };
  }, [linkedAnimalId, navigate]);

  const careKey = getCareSummaryKey(selectedHerd, animals, careWindow, vaccinationRefresh);
  const careIsCurrent = care?.key === careKey;
  useEffect(() => {
    if (loadingHerds || loadingAnimals || animalsError || !animals.length || careIsCurrent) return undefined;
    let cancelled = false;
    getHerdCareSummary(selectedHerdId, careWindow).then(({ data }) => {
      if (!cancelled) setCare({ key: careKey, summary: data });
    }).catch(error => {
      if (cancelled) return;
      console.error("Herd care summary failed to load:", error);
      setCare({ key: careKey, error: true });
    });
    return () => { cancelled = true; };
  }, [animals.length, animalsError, careIsCurrent, careKey, careWindow, loadingAnimals, loadingHerds, selectedHerdId]);

  const careSummary = careIsCurrent ? care.summary : null;
  const careState = animalsError || careIsCurrent && care.error
    ? "error" : loadingHerds || loadingAnimals || !careSummary && animals.length ? "loading" : "ready";
  const animalUrgencies = careSummary?.animalUrgencies || noCare;
  const animalCare = careSummary?.animalCare || noCare;
  const vaccinationsDue = Number(careSummary?.vaccinationsDue) || 0;
  const vaccinationsDueSoon = Number(careSummary?.vaccinationsDueSoon) || 0;
  const upcomingVetVisits = Number(careSummary?.upcomingVetVisits) || 0;
  const totalAnimals = animals.length;
  const totalActiveAnimals = animals.filter(animal => !isInactiveAnimalStatus(animal.status)).length;
  const deceasedCount = animals.filter(animal => animal.status === "deceased").length;
  const archivedCount = animals.filter(animal => animal.status === "archived").length;
  const overdueAnimals = animals.filter(animal => animalUrgencies[animal.id] === "red");
  const attentionAnimals = [...overdueAnimals, ...animals.filter(animal => animalUrgencies[animal.id] === "yellow")].slice(0, 3);
  const careStatusCounts = animals.reduce(
    (counts, animal) => {
      if (animal.status === "deceased") {
        counts.deceased += 1;
        return counts;
      }
      if (animal.status === "archived") {
        counts.archived += 1;
        return counts;
      }
      const urgency = animalUrgencies[animal.id] || "green";
      if (urgency === "red") counts.needsAttention += 1;
      else if (urgency === "yellow") counts.dueSoon += 1;
      else counts.current += 1;
      return counts;
    },
    { current: 0, dueSoon: 0, needsAttention: 0, deceased: 0, archived: 0 }
  );
  const careStatusSegments = [
    { key: "current", label: "Good", value: careStatusCounts.current, color: "#10b981" },
    { key: "dueSoon", label: "Due soon", value: careStatusCounts.dueSoon, color: "#f59e0b" },
    { key: "needsAttention", label: "Needs attention", value: careStatusCounts.needsAttention, color: "#ef4444" },
    { key: "deceased", label: "Deceased", value: careStatusCounts.deceased, color: "#6b7280" },
    { key: "archived", label: "Archived", value: careStatusCounts.archived, color: "#9ca3af" },
  ];
  const generatedDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const getStatusLabel = (urgency) => {
    if (urgency === "deceased") return "Deceased";
    if (urgency === "archived") return "Archived";
    if (urgency === "red") return "Needs attention";
    if (urgency === "yellow") return "Due soon";
    return "Current";
  };

  const getAnimalStatus = (animal) => {
    if (animal.status === "deceased") return "deceased";
    if (animal.status === "archived") return "archived";
    return animalUrgencies[animal.id] || "green";
  };

  const collectAnimalExportData = async (animal) => {
    const arrayData = (response) => (Array.isArray(response?.data) ? response.data : []);
    const safeExportRequest = async (request, label) => {
      try {
        return await request;
      } catch (err) {
        const status = err?.response?.status;
        const message = err?.response?.data?.error || err?.message || "Request failed";
        console.warn(`Skipping ${label} during animal export:`, { status, message });
        return { data: [], skipped: true, status, message, label };
      }
    };
    const feedRequest = selectedHerd?.id === "unassigned"
      ? premiumRecordsAPI.getUnassignedFeedRecords()
      : selectedHerd?.id
      ? premiumRecordsAPI.getHerdFeedRecords(selectedHerd.id)
      : Promise.resolve({ data: [] });

    const [
      healthEventsRes,
      vaccinationsRes,
      vetVisitsRes,
      reproductionsRes,
      financeRes,
      animalFeedRes,
      herdFeedRes,
    ] = await Promise.all([
      safeExportRequest(healthEventsAPI.getHealthEvents(animal.id), "health events"),
      safeExportRequest(vaccinationsAPI.getVaccinations(animal.id), "vaccinations"),
      safeExportRequest(vetVisitsAPI.getVetVisitsForAnimal(animal.id), "vet visits"),
      safeExportRequest(reproductionsAPI.getAnimalReproductions(animal.id), "reproduction records"),
      safeExportRequest(premiumRecordsAPI.getFinanceRecords(animal.id), "finance records"),
      safeExportRequest(premiumRecordsAPI.getFeedRecords(animal.id), "animal feed records"),
      safeExportRequest(feedRequest, "herd feed records"),
    ]);
    const skipped = [
      healthEventsRes,
      vaccinationsRes,
      vetVisitsRes,
      reproductionsRes,
      financeRes,
      animalFeedRes,
      herdFeedRes,
    ]
      .filter((response) => response?.skipped)
      .map((response) => ({
        label: response.label,
        status: response.status,
        message: response.message,
      }));

    return {
      healthEvents: arrayData(healthEventsRes),
      vaccinations: arrayData(vaccinationsRes),
      vetVisits: arrayData(vetVisitsRes),
      reproductions: arrayData(reproductionsRes),
      financeRecords: arrayData(financeRes),
      animalFeed: arrayData(animalFeedRes),
      herdFeed: arrayData(herdFeedRes),
      skipped,
    };
  };

  const handleExportDashboardPdf = async () => {
    if (!subscription.isPremium) {
      toast.info("Premium exports are almost ready. Review plans to unlock advanced exports.");
      navigate("/pricing");
      return;
    }

    if (selectedAnimal) {
      await handleExportAnimalPdf();
      return;
    }

    setAnimalExportData(null);
    setHerdFinanceExportData(null);
    setExportMode("farm");
    window.setTimeout(() => window.print(), 50);
  };

  const handleExportHerdFinancePdf = (financeReportData) => {
    if (!subscription.isPremium) {
      toast.info("Herd finance exports are Premium.");
      navigate("/pricing");
      return;
    }

    setAnimalExportData(null);
    setHerdFinanceExportData(financeReportData);
    setExportMode("herd-finance");
    window.setTimeout(() => window.print(), 50);
  };

  const handleExportAnimalPdf = async () => {
    if (!subscription.isPremium) {
      toast.info("Animal-level exports are Premium.");
      navigate("/pricing");
      return;
    }

    if (!selectedAnimal) {
      toast.info("Select an animal to export.");
      return;
    }

    try {
      setExportLoading(true);
      const fullHistory = await collectAnimalExportData(selectedAnimal);
      setAnimalExportData(fullHistory);
      setHerdFinanceExportData(null);
      setExportMode("animal");
      if (fullHistory.skipped?.length) {
        toast.info(`Export prepared, but skipped ${fullHistory.skipped.length} blocked section${fullHistory.skipped.length === 1 ? "" : "s"}.`);
      }
      window.setTimeout(() => window.print(), 150);
    } catch (err) {
      console.error(err);
      toast.error("Failed to prepare the full animal export.");
    } finally {
      setExportLoading(false);
    }
  };

  const animalBelongsToCurrentHerd = (animal) => {
    if (!selectedHerd) return false;
    if (selectedHerd.id === "unassigned") return animal.herd_id === null || animal.herd_id === undefined;
    return String(animal.herd_id) === String(selectedHerd.id);
  };

  const handleAnimalSaved = (updatedAnimal) => {
    if (!updatedAnimal?.id) return;

    setAnimals((current) => {
      if (!animalBelongsToCurrentHerd(updatedAnimal)) {
        return current.filter((animal) => animal.id !== updatedAnimal.id);
      }

      const exists = current.some((animal) => animal.id === updatedAnimal.id);
      if (!exists) return [updatedAnimal, ...current];
      return current.map((animal) => (animal.id === updatedAnimal.id ? updatedAnimal : animal));
    });

    setSelectedAnimal((current) => {
      if (current?.id !== updatedAnimal.id) return current;
      return updatedAnimal;
    });
    if (selectedAnimal?.id === updatedAnimal.id && !animalBelongsToCurrentHerd(updatedAnimal)) returnFromAnimal();
  };

  const handleAnimalDeleted = (animalId) => {
    setAnimals((current) => current.filter((animal) => animal.id !== animalId));
    setSelectedAnimal((current) => (current?.id === animalId ? null : current));
    if (linkedAnimalId && String(linkedAnimalId) === String(animalId)) {
      returnFromAnimal();
    }
  };

  // Add new animal
  const handleAddAnimal = React.useCallback(async () => {
    if (!selectedHerd) return null;

    try {
      setAddingAnimal(true);
      const filler = {
        herd_id: selectedHerd.id === "unassigned" ? null : selectedHerd.id,
        name: "",
        species: onboardingDefaultSpecies,
        sex: "",
        birthdate: null,
        age: "",
        comments: "",
        weight: "",
        behavior: "",
        tag_id: "",
        status: "active",
        deceased_date: null,
        deceased_notes: null,
      };

      const res = await createAnimal(filler);
      if (res.data) {
        setAnimals((current) => [res.data, ...current]);
        try {
          const onboardingRes = await authFetch(`${API_URL}/auth/onboarding`, {
            method: "PATCH",
            body: JSON.stringify({ createdFirstAnimal: true }),
          });
          if (onboardingRes.ok) await refreshBackendUser();
        } catch (err) {
          console.warn("Could not mark first animal onboarding step complete:", err.message);
        }
        toast.success("Created new animal!");
        return res.data;
      }
      return null;
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || "Failed to create new animal!");
      return null;
    } finally {
      setAddingAnimal(false);
    }
  }, [authFetch, onboardingDefaultSpecies, refreshBackendUser, selectedHerd, setAnimals]);

  const openAnimal = React.useCallback((animal, record = "general", replace = false) => {
    setMobileMoreOpen(false);
    setSelectedAnimal(animal);
    navigate(profilePath(animal, record), {
      replace: replace || Boolean(linkedAnimalId),
      state: linkedAnimalId
        ? { returnTo: profileCameFrom || directoryPath, canGoBack: canGoBackToDirectory }
        : { returnTo, canGoBack: !replace },
    });
  }, [canGoBackToDirectory, directoryPath, linkedAnimalId, navigate, profileCameFrom, profilePath, returnTo]);

  const addAndOpenAnimal = async () => {
    const animal = await handleAddAnimal();
    if (animal) openAnimal(animal);
  };

  const onboardingStart = params.get("start");
  useEffect(() => {
    if (onboardingStart !== "add-animal" || handledOnboardingStartRef.current ||
        !selectedHerd || loadingHerds || loadingAnimals) return;
    handledOnboardingStartRef.current = true;
    handleAddAnimal().then(animal => {
      if (animal) openAnimal(animal, "general", true);
      else navigate(viewPath("animals"), { replace: true });
    });
  }, [handleAddAnimal, loadingAnimals, loadingHerds, navigate, onboardingStart, openAnimal, selectedHerd, viewPath]);

  useEffect(() => {
    if (!mobileMoreOpen) return undefined;
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        setMobileMoreOpen(false);
        moreButtonRef.current?.focus();
      }
    };
    const handleOutside = event => {
      if (!moreButtonRef.current?.parentElement?.contains(event.target)) setMobileMoreOpen(false);
    };

    window.addEventListener("keydown", handleEsc);
    window.addEventListener("pointerdown", handleOutside);

    return () => {
      window.removeEventListener("keydown", handleEsc);
      window.removeEventListener("pointerdown", handleOutside);
    };
  }, [mobileMoreOpen]);

  const exportHealthEvents = animalExportData?.healthEvents || [];
  const exportVaccinations = animalExportData?.vaccinations || [];
  const exportVetVisits = animalExportData?.vetVisits || [];
  const exportReproductions = animalExportData?.reproductions || [];
  const exportFinanceRecords = animalExportData?.financeRecords || [];
  const exportAnimalFeed = animalExportData?.animalFeed || [];
  const exportHerdFeed = animalExportData?.herdFeed || [];
  const exportSkippedSections = animalExportData?.skipped || [];
  const exportVetCostTotal = exportVetVisits.reduce((sum, visit) => {
    const cost = Number.parseFloat(visit.cost);
    return Number.isFinite(cost) ? sum + cost : sum;
  }, 0);
  const exportFinanceTotal = exportFinanceRecords.reduce((sum, record) => {
    const amount = Number.parseFloat(record.amount);
    if (!Number.isFinite(amount)) return sum;
    return record.category === "Income" ? sum + amount : sum - amount;
  }, 0);
  const exportFeedCostTotal = [...exportAnimalFeed, ...exportHerdFeed].reduce((sum, record) => {
    const cost = Number.parseFloat(record.cost);
    return Number.isFinite(cost) ? sum + cost : sum;
  }, 0);
  const herdFinanceLedger = herdFinanceExportData?.ledger || [];
  const herdFinanceIncomeLedger = herdFinanceExportData?.incomeLedger || [];
  const herdFinanceExpenseLedger = herdFinanceExportData?.expenseLedger || [];
  const herdFinanceExpenseSegments = herdFinanceExportData?.expenseSegments || [];
  const herdFinanceMonthlyCashflow = herdFinanceExportData?.monthlyCashflow || [];
  const herdFinanceTotals = herdFinanceExportData?.totals || {};
  const renderHerdFinanceRows = (items) => items.map((item) => (
    <tr key={item.id}>
      <td>{formatReportDate(item.date) || "No date"}</td>
      <td>{item.source}</td>
      <td>{item.category}</td>
      <td>{item.vendor || item.animal || item.notes || "-"}</td>
      <td>{item.notes || ""}</td>
      <td className="report-amount">{formatSignedReportMoney(item.signedAmount)}</td>
    </tr>
  ));

  const handleAnimalTabClick = tabKey => {
    if (mobileMoreOpen) moreButtonRef.current?.focus({ preventScroll: true });
    setMobileMoreOpen(false);
    if (!selectedAnimal || tabKey === activeTab) return;
    navigate(profilePath(selectedAnimal, tabKey), { replace: true, state: location.state });
  };

  function setHerdFromValue(value) {
    const next = new URLSearchParams(params);
    next.set("herd", value);
    if (linkedAnimalId) next.delete("record");
    navigate(withQuery(linkedAnimalId ? "/dashboard" : location.pathname, next), { replace: !linkedAnimalId });
  }

  const isOverview = !linkedAnimalId && activeTab === "general";
  const Greeting = isOverview ? "h1" : "p";
  const dayRange = careWindow === 1 ? "the next day" : `the next ${careWindow} days`;
  const firstName = user?.firstName?.trim();
  let careMessage;
  let careLink;
  let careAnimal;
  if (animalsError) {
    careMessage = "Animal records couldn’t load.";
  } else if (careState === "loading") {
    careMessage = "Checking herd records…";
  } else if (careState === "error") {
    careMessage = "Care records couldn’t load.";
  } else if (!selectedHerd) {
    careMessage = "Choose a herd to get started.";
  } else if (!animals.length) {
    careMessage = selectedHerd.id === "unassigned" ? "There are no unassigned animals." : `${selectedHerd.name} has no animals yet.`;
  } else if (overdueAnimals.length) {
    careMessage = `${overdueAnimals.length} ${overdueAnimals.length === 1 ? "animal needs" : "animals need"} overdue care in ${selectedHerd.name}.`;
    careLink = "#herd-care";
  } else if (vaccinationsDueSoon) {
    careMessage = `${vaccinationsDueSoon} ${vaccinationsDueSoon === 1 ? "vaccination is" : "vaccinations are"} due in ${dayRange} in ${selectedHerd.name}.`;
    const matches = animals.filter(animal => animalCare[animal.id]?.vaccinations);
    if (matches.length === 1) careAnimal = { animal: matches[0], record: "health" };
    else careLink = "#herd-care";
  } else if (upcomingVetVisits) {
    careMessage = `${upcomingVetVisits} vet ${upcomingVetVisits === 1 ? "appointment or follow-up" : "appointments or follow-ups"} in the next 30 days in ${selectedHerd.name}.`;
    const matches = animals.filter(animal => animalCare[animal.id]?.upcomingVet);
    if (matches.length === 1) careAnimal = { animal: matches[0], record: "vet" };
    else if (attentionAnimals.length) careLink = "#herd-care";
  } else {
    careMessage = `No upcoming or overdue care in ${selectedHerd.name}.`;
  }
  const pageTitle = linkedAnimalId
    ? selectedAnimal ? getAnimalPrimaryLabel(selectedAnimal) : "Animal profile"
    : herdViews.find(view => view.key === activeTab)?.label || "Farm Overview";
  const primaryAnimalTabs = animalRecordTabs.slice(0, 4);
  const moreAnimalTabs = animalRecordTabs.slice(4);
  const primaryHerdViews = herdViews.slice(0, 4);
  const moreHerdViews = herdViews.slice(4);

  const dashboardTourSteps = React.useMemo(() => [
    {
      key: "overview",
      target: "records-area",
      title: "Start on Farm Overview",
      body: "This is your home base. It gives you the broad view before you jump into a specific animal or record type.",
      action: "BarnBuddy will reset the dashboard to Farm Overview so you can see the default layout.",
      actionLabel: "Show Farm Overview",
      completionText: "You are on Farm Overview now.",
      requiresAction: true,
    },
    {
      key: "herd",
      target: "herd-switcher",
      title: "Choose the herd you are working in",
      body: "Use this selector when you have more than one herd or need to view unassigned animals.",
      action: "Start here before adding records so new animals land in the right place.",
      actionLabel: "Check current herd",
      completionText: "Good. You know where herd switching lives.",
      requiresAction: true,
    },
    {
      key: "animal",
      target: "add-animal",
      title: "Create or open your first animal",
      body: "Animal profiles are where you keep names, tag IDs, species, birth info, notes, and all animal-level records.",
      action: "If you already have an animal, BarnBuddy will open it. If not, it will create a blank starter animal.",
      actionLabel: animals.length > 0 ? "Open first animal" : "Create starter animal",
      completionText: "Animal profile opened. This is where the detailed records start.",
      requiresAction: true,
    },
    {
      key: "list",
      target: "animals-navigation",
      title: "Find records in Animals",
      body: "Search by name, tag ID, or species, or filter by status.",
      action: "Open Animals to see the directory for this herd.",
      actionLabel: "Show Animals",
      completionText: "Select any animal to open its records.",
      requiresAction: true,
    },
    {
      key: "health",
      target: "records-area",
      title: "Open a real record tab",
      body: "Once an animal is selected, the record tabs become the main workflow: general info, weight, health, vet visits, reproduction, and money.",
      action: "BarnBuddy will open the Health tab because it is one of the most common first records.",
      actionLabel: "Open Health tab",
      completionText: "Health is open. This is where treatments and notes can live.",
      requiresAction: true,
    },
    {
      key: "stats",
      target: "quick-stats",
      fallbackTarget: "herd-attention",
      title: "Check your herd on Farm Overview",
      body: "See which animals need care and open their records.",
      actionLabel: "Return to Farm Overview",
      completionText: "Pick an animal from Needs attention to check its care records.",
      requiresAction: true,
    },
    {
      key: "workspace",
      target: "records-area",
      title: "This is the main work area",
      body: "Farm Overview, feed, finances, bulk entry, inventory, and animal record tabs all load in this panel.",
      action: "BarnBuddy will briefly show Herd Feed so you can see how farm-wide tools replace the overview.",
      actionLabel: "Open Herd Feed",
      completionText: "Now you have seen how the main panel changes by workflow.",
      requiresAction: true,
    },
    {
      key: "settings",
      target: "settings",
      title: "Settings is where setup lives",
      body: "Use Settings for herds, imports, preferences, subscription tools, and restarting this onboarding tour later.",
      action: "You are ready to use BarnBuddy. Add a record whenever something happens on the farm.",
      actionLabel: "Finish setup tour",
      completionText: "Tour complete. You can restart it later from Account Settings.",
      requiresAction: true,
    },
  ], [animals.length]);

  const handleDashboardTourAction = React.useCallback(async step => {
    setMobileMoreOpen(false);
    if (step.key === "herd") return;
    if (step.key === "animal" || step.key === "health") {
      const animal = selectedAnimal || animals.find(item => !isInactiveAnimalStatus(item.status)) || animals[0] || await handleAddAnimal();
      if (!animal) return false;
      openAnimal(animal, step.key === "health" ? "health" : "general", true);
      return;
    }
    const view = step.key === "list" ? "animals" : step.key === "workspace" ? "feed" : "general";
    navigate(viewPath(view), { replace: true });
  }, [animals, handleAddAnimal, navigate, openAnimal, selectedAnimal, viewPath]);

  const closeDashboardTour = React.useCallback(() => {
    const next = new URLSearchParams(location.search);
    next.delete("tour");
    navigate(withQuery(location.pathname, next), { replace: true, state: location.state });
  }, [location.pathname, location.search, location.state, navigate]);

  const listLoading = loadingHerds || loadingAnimals;
  const profileLoading = Boolean(linkedAnimalId && !selectedAnimal);
  const shortcutsReady = !listLoading && !profileLoading;
  const switchableAnimals = selectedAnimal && !animals.some(animal => animal.id === selectedAnimal.id)
    ? [selectedAnimal, ...animals] : animals;
  const shortcutProps = {
    animals, careState, urgencies: animalUrgencies, primaryIdentifier: primaryAnimalIdentifier,
    profilePath, directoryPath, selectedAnimalId: linkedAnimalId,
    returnTo: linkedAnimalId ? profileCameFrom || directoryPath : returnTo,
    canGoBack: !linkedAnimalId || canGoBackToDirectory,
    showDirectoryLink: !isDirectory,
  };
  const stats = [
    { label: "Animals", value: animalsError || listLoading ? null : totalAnimals },
    { label: "Active", value: animalsError || listLoading ? null : totalActiveAnimals },
    { label: "Vaccine Care", value: careState === "ready" ? vaccinationsDue : null },
    { label: "Vet Care Upcoming", value: careState === "ready" ? upcomingVetVisits : null },
  ];

  const renderHerdLink = (view, mobile = false, inMenu = false) => (
    <Link
      key={view.key}
      to={view.key === "animals" ? directoryPath : viewPath(view.key)}
      aria-current={!linkedAnimalId && activeTab === view.key ? "page" : undefined}
      aria-label={view.mobileLabel && mobile ? view.label : undefined}
      onClick={() => setMobileMoreOpen(false)}
      data-tour={view.key === "general" ? "farm-overview" : view.key === "animals" ? "animals-navigation" : undefined}
      className={inMenu ? "bb-more-item" : "bb-work-tab"}
    >
      {mobile ? view.mobileLabel || view.label : view.label}
    </Link>
  );

  const renderRecordButton = (tab, className = "bb-work-tab") => (
    <button
      key={tab.key}
      type="button"
      onClick={() => handleAnimalTabClick(tab.key)}
      aria-pressed={activeTab === tab.key}
      className={className}
    >
      {tab.label}
    </button>
  );

  const herdPicker = (
    <label className="bb-herd-picker">
      <span>Herd</span>
      <select className="bb-field" data-tour="herd-switcher" value={selectedHerdId ?? ""} disabled={loadingHerds}
        onChange={event => setHerdFromValue(event.target.value)}>
        <option value="" disabled>{loadingHerds ? "Loading herds…" : "Select a herd"}</option>
        {herds.map(herd => <option key={herd.id} value={herd.id}>{herd.name}</option>)}
        <option value="unassigned">Unassigned Animals</option>
      </select>
    </label>
  );
  const backLabel = canGoBackToDirectory && !profileCameFrom.startsWith("/dashboard/animals") ? "Back to farm" : "Back to animals";
  const moreRecord = linkedAnimalId && moreAnimalTabs.find(tab => tab.key === activeTab);
  const moreMenu = (
    <div className="bb-more">
      <button type="button" ref={moreButtonRef} className="bb-work-tab" onClick={() => setMobileMoreOpen(open => !open)}
        aria-expanded={mobileMoreOpen} aria-controls={mobileMoreOpen ? "dashboard-more" : undefined}
        data-current={moreRecord ? true : undefined} aria-description={moreRecord ? `${moreRecord.label} is selected` : undefined}>
        More
      </button>
      {mobileMoreOpen && (
        <div id="dashboard-more" role="group" aria-label={linkedAnimalId ? "More animal records" : "More farm tools"} className="bb-more-menu">
          {linkedAnimalId ? moreAnimalTabs.map(tab => renderRecordButton(tab, "bb-more-item")) : moreHerdViews.map(view => renderHerdLink(view, true, true))}
          <button type="button" onClick={handleFfaProjectsClick} className="bb-more-item">FFA Projects</button>
          {advisorDashboardAvailable && <button type="button" onClick={handleAdvisorDashboardClick} className="bb-more-item">Advisor Dashboard</button>}
        </div>
      )}
    </div>
  );
  return (
    <div className={`dashboard-page bb-livestock bb-dashboard ${isCompact ? "dashboard-compact" : "dashboard-comfortable"}`}>
      <aside className="bb-farm-sidebar">
        <Link className="bb-work-brand" to="/" aria-label="BarnBuddy home"><span>Barn</span>Buddy.</Link>
        {herdPicker}
        <nav aria-label="Farm navigation" className="bb-farm-nav">
          {herdViews.map(view => renderHerdLink(view))}
          <Link className="bb-work-tab" to="/dashboard/ffa-projects">FFA Projects</Link>
          {advisorDashboardAvailable && <Link className="bb-work-tab" to="/advisor">Advisor Dashboard</Link>}
        </nav>
        {shortcutsReady && <AnimalShortcuts {...shortcutProps} compact />}
      </aside>
      <main className="dashboard-main">
        <header ref={toolbarRef} className="bb-dashboard-toolbar" aria-label="Dashboard controls">
          <div className="bb-work-container">
            <div className="bb-dashboard-toolbar-row">
              <div className="bb-dashboard-toolbar-title">
                <Greeting className="bb-dashboard-greeting">{[greeting, firstName].filter(Boolean).join(", ")}</Greeting>
                <Link className="bb-work-brand bb-dashboard-mobile-brand" to="/" aria-label="BarnBuddy home"><span>Barn</span>Buddy.</Link>
              </div>
              <div className="bb-work-actions">
                <PremiumExpiryBadge subscription={subscription} />
                <button className="bb-action" type="button" onClick={handleExportDashboardPdf} disabled={exportLoading || profileLoading}
                  title={!subscription.isPremium ? "PDF export requires Premium" : undefined}>
                  {exportLoading ? "Preparing…" : "Export"}
                </button>
                <Link to="/settings/account" className="bb-action" data-tour="settings">Settings</Link>
                <button className="bb-action bb-action-primary" type="button" data-tour="add-animal" onClick={addAndOpenAnimal}
                  disabled={!selectedHerd || !shortcutsReady || addingAnimal || animalsError}>
                  {addingAnimal ? "Adding…" : "Add animal"}
                </button>
                <div className="bb-dashboard-account"><UserButton afterSignOutUrl="/" /></div>
              </div>
            </div>
            <section className="bb-quick-facts" aria-label="Herd quick facts" data-tour="quick-stats">
              <dl>
                {stats.map(({ label, value }) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd aria-label={profileLoading || value === null ? "Unavailable" : undefined}>{profileLoading ? "—" : value ?? "—"}</dd>
                  </div>
                ))}
              </dl>
            </section>
            {isProfile && (
              <div className="bb-profile-heading">
                <div className="bb-profile-identity">
                  <button type="button" className="bb-action bb-profile-back" onClick={returnFromAnimal} aria-label={backLabel} title={backLabel}>
                    <span aria-hidden="true">←</span>
                    <span className="bb-profile-back-label">{backLabel}</span>
                  </button>
                  <div className="bb-profile-title">
                    <h1>{pageTitle}</h1>
                    {selectedAnimal && (
                      <p className="bb-work-muted">{[selectedAnimal.species || "Animal", getAnimalSecondaryLabel(selectedAnimal), selectedHerd?.name].filter(Boolean).join(" · ")}</p>
                    )}
                  </div>
                  {shortcutsReady && switchableAnimals.length > 1 && (
                    <label className="bb-profile-switcher">
                      <span className="sr-only">Switch animal</span>
                      <select className="bb-field" value={linkedAnimalId} onChange={event => {
                        const animal = switchableAnimals.find(item => String(item.id) === event.target.value);
                        if (animal) openAnimal(animal);
                      }}>
                        {switchableAnimals.map(animal => <option key={animal.id} value={animal.id}>{getAnimalPrimaryLabel(animal)}</option>)}
                      </select>
                    </label>
                  )}
                </div>
                {selectedAnimal && (
                  <nav className="bb-animal-nav" aria-label="Animal records">
                    {primaryAnimalTabs.map(tab => renderRecordButton(tab))}
                    {moreAnimalTabs.map(tab => renderRecordButton(tab, "bb-work-tab bb-profile-desktop-tab"))}
                    {moreMenu}
                  </nav>
                )}
              </div>
            )}
          </div>
        </header>

        <div className="bb-work-container bb-dashboard-content">
          {!linkedAnimalId && (
            <header className="bb-view-header bb-herd-heading">
              {isOverview ? (
                <p className="bb-herd-message" aria-live="polite">
                  {careAnimal ? <Link className="bb-text-link" to={profilePath(careAnimal.animal, careAnimal.record)} state={{ returnTo }}>{careMessage}</Link>
                    : careLink ? <a className="bb-text-link" href={careLink}>{careMessage}</a> : careMessage}
                </p>
              ) : <h1>{pageTitle}</h1>}
              <div className="bb-dashboard-mobile-picker">{herdPicker}</div>
            </header>
          )}

          {(isOverview || isDirectory) && shortcutsReady && (
            <div className="bb-dashboard-mobile-shortcuts"><AnimalShortcuts {...shortcutProps} /></div>
          )}

          <div data-tour="records-area" key={linkedAnimalId ? "profile" : activeTab}
            className={linkedAnimalId ? "bb-records-area" : "bb-records-area bb-view-enter"}>
            {linkedAnimalId && !selectedAnimal ? <LoadingSpinner label="Opening animal profile…" />
              : linkedAnimalId ? (
              <section className="bb-record-panel bb-profile-panel">
                <div className="bb-record-content bb-view-enter" key={`${selectedAnimal.id}:${activeTab}`}>
                  {activeTab === "general" && (
                    <AnimalGeneralData animal={selectedAnimal} setSelectedAnimal={setSelectedAnimal} setActiveTab={handleAnimalTabClick}
                      onAnimalSaved={handleAnimalSaved} onAnimalDeleted={handleAnimalDeleted} herds={herds} selectedHerd={selectedHerd} />
                  )}
                  {activeTab === "health" && (
                    <HealthRecords animal={selectedAnimal} selectedHerd={selectedHerd} isPremium={subscription.isPremium}
                      onVaccinationUpdate={() => setVaccinationRefresh(current => current + 1)} />
                  )}
                  {activeTab === "weight" && <WeightRecords animal={selectedAnimal} onAnimalSaved={handleAnimalSaved} />}
                  {activeTab === "vet" && <VetVisits animal={selectedAnimal} onVetVisitUpdate={() => setVaccinationRefresh(current => current + 1)} />}
                  {["reproduction", "finance"].includes(activeTab) && (
                    <PremiumRecords animal={selectedAnimal} animals={animals} isPremium={subscription.isPremium}
                      onExportAnimal={handleExportAnimalPdf} exportLoading={exportLoading} onAnimalSaved={handleAnimalSaved}
                      onAnimalDeleted={handleAnimalDeleted} view={activeTab} />
                  )}
                </div>
              </section>
            ) : isDirectory ? (
              <AnimalDirectory animals={animals} careState={careState} urgencies={animalUrgencies}
                primaryIdentifier={primaryAnimalIdentifier} profilePath={profilePath} returnTo={returnTo} loading={listLoading} error={animalsError} />
            ) : isOverview ? (
              <DashboardOverview animals={animals} loading={listLoading} error={animalsError} careState={careState}
                attentionAnimals={attentionAnimals} urgencies={animalUrgencies} animalCare={animalCare} primaryIdentifier={primaryAnimalIdentifier}
                profilePath={profilePath} directoryPath={directoryPath} returnTo={returnTo} />
            ) : (
              <section className="bb-record-panel bb-record-content">
                {activeTab === "feed" && <HerdFeedRecords selectedHerd={selectedHerd} isPremium={subscription.isPremium} automaticReminders={Boolean(preferences.automaticReminders)} />}
                {activeTab === "herd-finance" && (
                  <HerdFinanceRecords selectedHerd={selectedHerd} animals={animals} isPremium={subscription.isPremium}
                    onExportFinanceReport={handleExportHerdFinancePdf} onAnimalSaved={handleAnimalSaved} />
                )}
                {activeTab === "bulk-entry" && (
                  <BulkEntry animals={animals} selectedHerd={selectedHerd} primaryAnimalIdentifier={primaryAnimalIdentifier}
                    isPremium={subscription.isPremium} onSaved={() => setVaccinationRefresh(current => current + 1)} />
                )}
                {activeTab === "inventory" && <HerdInventory key={selectedHerdId} selectedHerd={selectedHerd} isPremium={subscription.isPremium} />}
              </section>
            )}
          </div>
          <footer className="bb-work-footer"><a href="/contact?topic=Bug%20report">Report a bug</a></footer>
        </div>

        {!linkedAnimalId && (
          <nav aria-label="Farm navigation" className="bb-bottom-nav">
            <div className="bb-mobile-tabs">
              {primaryHerdViews.map(view => renderHerdLink(view, true))}
              {moreMenu}
            </div>
          </nav>
        )}
      </main>
      <DashboardTour
        open={tour === "1"}
        steps={dashboardTourSteps}
        onClose={closeDashboardTour}
        onStepAction={handleDashboardTourAction}
      />

      <section id="dashboard-pdf" className="hidden">
        <header>
          <p className="report-eyebrow">
            {exportMode === "animal" ? "BarnBuddy Animal Report" : exportMode === "herd-finance" ? "BarnBuddy Finance Report" : "BarnBuddy Farm Report"}
          </p>
          <h1>
            {exportMode === "animal"
              ? `${getAnimalPrimaryLabel(selectedAnimal || {})} Record Summary`
              : exportMode === "herd-finance"
              ? `${herdFinanceExportData?.selectedHerd?.name || selectedHerd?.name || "Herd"} Finances`
              : `${selectedHerd?.name || "Farm"} Dashboard Summary`}
          </h1>
          <p>
            Generated {generatedDate}
            {user?.primaryEmailAddress?.emailAddress
              ? ` for ${user.primaryEmailAddress.emailAddress}`
              : ""}
          </p>
        </header>

        {exportMode === "herd-finance" && herdFinanceExportData ? (
          <>
            <section>
              <h2>Farm Finance Summary</h2>
              <dl className="report-metrics">
                <div><dt>Net</dt><dd>{formatSignedReportMoney(herdFinanceTotals.net)}</dd></div>
                <div><dt>Income</dt><dd>{formatSignedReportMoney(herdFinanceTotals.income)}</dd></div>
                <div><dt>Expenses</dt><dd>{formatSignedReportMoney(herdFinanceTotals.expenses)}</dd></div>
                <div><dt>Ledger entries</dt><dd>{herdFinanceLedger.length}</dd></div>
                <div><dt>Feed costs</dt><dd>{formatSignedReportMoney(herdFinanceTotals.feed)}</dd></div>
                <div><dt>Vet costs</dt><dd>{formatSignedReportMoney(herdFinanceTotals.vet)}</dd></div>
                <div><dt>Income rows</dt><dd>{herdFinanceIncomeLedger.length}</dd></div>
                <div><dt>Expense rows</dt><dd>{herdFinanceExpenseLedger.length}</dd></div>
              </dl>
            </section>

            <section className="report-two-col">
              <div>
                <h2>Expense Categories</h2>
                <table>
                  <thead><tr><th>Category</th><th className="report-amount">Total</th></tr></thead>
                  <tbody>
                    {herdFinanceExpenseSegments.length === 0 ? (
                      <tr><td colSpan="2">No expenses recorded.</td></tr>
                    ) : herdFinanceExpenseSegments.map((segment) => (
                      <tr key={segment.label}><td>{segment.label}</td><td className="report-amount">{formatSignedReportMoney(segment.value)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div>
                <h2>Monthly Cashflow</h2>
                <table>
                  <thead><tr><th>Month</th><th className="report-amount">Income</th><th className="report-amount">Expenses</th><th className="report-amount">Net</th></tr></thead>
                  <tbody>
                    {herdFinanceMonthlyCashflow.length === 0 ? (
                      <tr><td colSpan="4">No cashflow recorded.</td></tr>
                    ) : herdFinanceMonthlyCashflow.map((item) => (
                      <tr key={item.key}>
                        <td>{formatReportMonth(item.key)}</td>
                        <td className="report-amount report-income">{formatSignedReportMoney(item.income)}</td>
                        <td className="report-amount report-expense">{formatSignedReportMoney(item.expense)}</td>
                        <td className={`report-amount ${item.net < 0 ? "report-expense" : "report-income"}`}>{formatSignedReportMoney(item.net)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h2>Income Detail</h2>
              <table>
                <thead><tr><th>Date</th><th>Source</th><th>Category</th><th>Detail</th><th>Notes</th><th className="report-amount">Amount</th></tr></thead>
                <tbody>
                  {herdFinanceIncomeLedger.length === 0 ? <tr><td colSpan="6">No income recorded.</td></tr> : renderHerdFinanceRows(herdFinanceIncomeLedger)}
                </tbody>
              </table>
            </section>

            <section>
              <h2>Expense Detail</h2>
              <table>
                <thead><tr><th>Date</th><th>Source</th><th>Category</th><th>Detail</th><th>Notes</th><th className="report-amount">Amount</th></tr></thead>
                <tbody>
                  {herdFinanceExpenseLedger.length === 0 ? <tr><td colSpan="6">No expenses recorded.</td></tr> : renderHerdFinanceRows(herdFinanceExpenseLedger)}
                </tbody>
              </table>
            </section>

            <section>
              <h2>Full Ledger</h2>
              <table>
                <thead><tr><th>Date</th><th>Source</th><th>Category</th><th>Detail</th><th>Notes</th><th className="report-amount">Amount</th></tr></thead>
                <tbody>{renderHerdFinanceRows(herdFinanceLedger)}</tbody>
              </table>
            </section>
          </>
        ) : exportMode === "animal" && selectedAnimal ? (
          <>
            <section>
              <h2>Animal Details</h2>
              <dl className="report-metrics">
                <div>
                  <dt>{primaryAnimalIdentifier === "tag" ? "Tag ID" : "Name"}</dt>
                  <dd>{getAnimalPrimaryLabel(selectedAnimal)}</dd>
                </div>
                <div>
                  <dt>Species</dt>
                  <dd>{selectedAnimal.species || "Unknown"}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>{getStatusLabel(getAnimalStatus(selectedAnimal))}</dd>
                </div>
              </dl>
            </section>
            <section>
              <h2>Core Record</h2>
              <table>
                <tbody>
                  <tr><th>{primaryAnimalIdentifier === "tag" ? "Name" : "Tag ID"}</th><td>{primaryAnimalIdentifier === "tag" ? selectedAnimal.name || "" : selectedAnimal.tag_id || ""}</td></tr>
                  <tr><th>Sex</th><td>{selectedAnimal.sex || ""}</td></tr>
                  <tr><th>Birth Date</th><td>{selectedAnimal.birthdate ? selectedAnimal.birthdate.slice(0, 10) : ""}</td></tr>
                  <tr><th>Birth Weight</th><td>{selectedAnimal.birth_weight || ""}</td></tr>
                  <tr><th>Birth Notes</th><td>{selectedAnimal.birth_notes || ""}</td></tr>
                  <tr><th>Age</th><td>{formatAnimalAge(selectedAnimal)}</td></tr>
                  <tr><th>Weight</th><td>{selectedAnimal.weight || ""}</td></tr>
                  <tr><th>Temperament</th><td>{selectedAnimal.behavior || ""}</td></tr>
                  <tr><th>Deceased Date</th><td>{formatReportDate(selectedAnimal.deceased_date)}</td></tr>
                  <tr><th>Deceased Notes</th><td>{selectedAnimal.deceased_notes || ""}</td></tr>
                  <tr><th>Notes</th><td>{selectedAnimal.comments || ""}</td></tr>
                </tbody>
              </table>
            </section>

            <section>
              <h2>Animal History Summary</h2>
              <dl className="report-metrics">
                <div><dt>Health events</dt><dd>{exportHealthEvents.length}</dd></div>
                <div><dt>Vaccinations</dt><dd>{exportVaccinations.length}</dd></div>
                <div><dt>Vet visits</dt><dd>{exportVetVisits.length}</dd></div>
                <div><dt>Breeding records</dt><dd>{exportReproductions.length}</dd></div>
                <div><dt>Finance net</dt><dd>{formatReportMoney(exportFinanceTotal) || "$0.00"}</dd></div>
                <div><dt>Vet costs</dt><dd>{formatReportMoney(exportVetCostTotal) || "$0.00"}</dd></div>
                <div><dt>Feed costs</dt><dd>{formatReportMoney(exportFeedCostTotal) || "$0.00"}</dd></div>
              </dl>
              {exportSkippedSections.length > 0 && (
                <p>
                  Some sections could not be loaded:{" "}
                  {exportSkippedSections.map((section) => section.label).join(", ")}.
                </p>
              )}
            </section>

            <section>
              <h2>Health Events</h2>
              {exportHealthEvents.length === 0 ? (
                <p>No health events recorded.</p>
              ) : (
                <table>
                  <thead>
                    <tr><th>Date</th><th>Type</th><th>Severity</th><th>Resolved</th><th>Description</th><th>Notes</th></tr>
                  </thead>
                  <tbody>
                    {exportHealthEvents.map((event) => (
                      <tr key={event.id}>
                        <td>{formatReportDate(event.event_date)}</td>
                        <td>{event.type || ""}</td>
                        <td>{event.severity || ""}</td>
                        <td>{event.resolved ? "Yes" : "No"}</td>
                        <td>{event.description || ""}</td>
                        <td>{event.notes || ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            <section>
              <h2>Vaccinations</h2>
              {exportVaccinations.length === 0 ? (
                <p>No vaccinations recorded.</p>
              ) : (
                <table>
                  <thead>
                    <tr><th>Date Given</th><th>Vaccine</th><th>Dosage</th><th>Next Due</th><th>Notes</th></tr>
                  </thead>
                  <tbody>
                    {exportVaccinations.map((vaccination) => (
                      <tr key={vaccination.id}>
                        <td>{formatReportDate(vaccination.date_given)}</td>
                        <td>{vaccination.vaccine_name || ""}</td>
                        <td>{vaccination.dosage || ""}</td>
                        <td>{formatReportDate(vaccination.next_due_date)}</td>
                        <td>{vaccination.notes || ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            <section>
              <h2>Vet Visits</h2>
              {exportVetVisits.length === 0 ? (
                <p>No vet visits recorded.</p>
              ) : (
                <table>
                  <thead>
                    <tr><th>Visit Date</th><th>Vet</th><th>Reason</th><th>Treatment</th><th>Medications</th><th>Follow-up</th><th>Cost</th><th>Notes</th></tr>
                  </thead>
                  <tbody>
                    {exportVetVisits.map((visit) => (
                      <tr key={visit.id}>
                        <td>{formatReportDate(visit.visit_date)}</td>
                        <td>{visit.vet_name || ""}</td>
                        <td>{visit.reason || ""}</td>
                        <td>{visit.treatment || ""}</td>
                        <td>{visit.medications || ""}</td>
                        <td>{formatReportDate(visit.follow_up_date)}</td>
                        <td>{formatReportMoney(visit.cost)}</td>
                        <td>{visit.notes || ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            <section>
              <h2>Reproduction</h2>
              {exportReproductions.length === 0 ? (
                <p>No reproduction records recorded.</p>
              ) : (
                <table>
                  <thead>
                    <tr><th>Dam / Mother</th><th>Sire / Father</th><th>Method</th><th>Breeding Date</th><th>Due Date</th><th>Status</th><th>Pregnancy Check</th><th>Pregnancy Status</th><th>Birth Date</th><th>Offspring</th><th>Birth Outcome</th><th>Notes</th></tr>
                  </thead>
                  <tbody>
                    {exportReproductions.map((record) => (
                      <tr key={record.id}>
                        <td>{getReportAnimalLabel(record.dam_id)}</td>
                        <td>{getReportAnimalLabel(record.sire_id)}</td>
                        <td>{record.breeding_method || ""}</td>
                        <td>{formatReportDate(record.breeding_date)}</td>
                        <td>{formatReportDate(record.due_date)}</td>
                        <td>{record.outcome || ""}</td>
                        <td>{formatReportDate(record.pregnancy_check_date)}</td>
                        <td>{record.pregnancy_status || ""}</td>
                        <td>{formatReportDate(record.birth_date)}</td>
                        <td>{record.offspring_count || ""}</td>
                        <td>{record.birth_outcome || ""}</td>
                        <td>{record.notes || ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            <section>
              <h2>Finance</h2>
              {exportFinanceRecords.length === 0 ? (
                <p>No finance records recorded.</p>
              ) : (
                <table>
                  <thead>
                    <tr><th>Date</th><th>Category</th><th>Amount</th><th>Vendor / Buyer</th><th>Notes</th></tr>
                  </thead>
                  <tbody>
                    {exportFinanceRecords.map((record) => (
                      <tr key={record.id}>
                        <td>{formatReportDate(record.record_date)}</td>
                        <td>{record.category || ""}</td>
                        <td>{formatReportMoney(record.amount)}</td>
                        <td>{record.vendor || ""}</td>
                        <td>{record.notes || ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            <section>
              <h2>Feed Records</h2>
              {[...exportAnimalFeed, ...exportHerdFeed].length === 0 ? (
                <p>No feed records recorded.</p>
              ) : (
                <table>
                  <thead>
                    <tr><th>Scope</th><th>Date</th><th>Feed Type</th><th>Amount</th><th>Cost</th><th>Next Purchase</th><th>Notes</th></tr>
                  </thead>
                  <tbody>
                    {exportAnimalFeed.map((record) => (
                      <tr key={`animal-feed-${record.id}`}>
                        <td>Animal</td>
                        <td>{formatReportDate(record.record_date)}</td>
                        <td>{record.feed_type || ""}</td>
                        <td>{record.amount || ""} {record.unit || ""}</td>
                        <td>{formatReportMoney(record.cost)}</td>
                        <td>{formatReportDate(record.next_purchase_date)}</td>
                        <td>{record.notes || ""}</td>
                      </tr>
                    ))}
                    {exportHerdFeed.map((record) => (
                      <tr key={`herd-feed-${record.id}`}>
                        <td>Herd</td>
                        <td>{formatReportDate(record.record_date)}</td>
                        <td>{record.feed_type || ""}</td>
                        <td>{record.amount || ""} {record.unit || ""}</td>
                        <td>{formatReportMoney(record.cost)}</td>
                        <td>{formatReportDate(record.next_purchase_date)}</td>
                        <td>{record.notes || ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </>
        ) : (
          <>
        <section>
          <h2>Animal Count</h2>
          <dl className="report-metrics">
            <div>
              <dt>Total animals</dt>
              <dd>{totalAnimals}</dd>
            </div>
            <div>
              <dt>Active animals</dt>
              <dd>{totalActiveAnimals}</dd>
            </div>
            <div>
              <dt>Deceased</dt>
              <dd>{deceasedCount}</dd>
            </div>
            <div>
              <dt>Archived</dt>
              <dd>{archivedCount}</dd>
            </div>
          </dl>
        </section>

        <section>
          <h2>Care Status</h2>
          <div className="report-chart-row">
            <svg viewBox="0 0 36 36" className="report-pie-chart" role="img" aria-label="Care status pie chart">
              <circle cx="18" cy="18" r="15.9155" fill="transparent" stroke="#e5e7eb" strokeWidth="6" />
              {careStatusSegments.reduce(
                (segments, segment) => {
                  const percent = totalAnimals > 0 ? (segment.value / totalAnimals) * 100 : 0;
                  const currentOffset = segments.offset;
                  if (percent > 0) {
                    segments.items.push(
                      <circle
                        key={segment.key}
                        cx="18"
                        cy="18"
                        r="15.9155"
                        fill="transparent"
                        stroke={segment.color}
                        strokeWidth="6"
                        strokeDasharray={`${percent} ${100 - percent}`}
                        strokeDashoffset={25 - currentOffset}
                      />
                    );
                  }
                  segments.offset += percent;
                  return segments;
                },
                { offset: 0, items: [] }
              ).items}
            </svg>
            <div className="report-chart-legend">
              {careStatusSegments.map((segment) => (
                <div key={segment.key}>
                  <span style={{ backgroundColor: segment.color }}></span>
                  <strong>{segment.label}</strong>
                  <em>{segment.value}</em>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section>
          <h2>Animal Roster</h2>
          {animals.length === 0 ? (
            <p>No animals are listed for this herd yet.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>{primaryAnimalIdentifier === "tag" ? "Tag ID" : "Name"}</th>
                  <th>{primaryAnimalIdentifier === "tag" ? "Name" : "Tag ID"}</th>
                  <th>Species</th>
                  <th>Sex</th>
                  <th>Birth Date</th>
                  <th>Weight</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {animals.map((animal) => (
                  <tr key={animal.id}>
                    <td>{getAnimalPrimaryLabel(animal)}</td>
                    <td>{primaryAnimalIdentifier === "tag" ? animal.name || "" : animal.tag_id || ""}</td>
                    <td>{animal.species || ""}</td>
                    <td>{animal.sex || ""}</td>
                    <td>{animal.birthdate ? animal.birthdate.slice(0, 10) : ""}</td>
                    <td>{animal.weight || ""}</td>
                    <td>{getStatusLabel(getAnimalStatus(animal))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
          </>
        )}
      </section>
    </div>
  );
}
