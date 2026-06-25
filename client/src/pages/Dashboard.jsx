import React, { useState, useEffect } from "react";
import AnimalGeneralData from "../components/AnimalGeneralData";
import BulkEntry from "../components/BulkEntry";
import DashboardOverview from "../components/DashboardOverview";
import HealthRecords from "../components/HealthRecords";
import HerdFeedRecords from "../components/HerdFeedRecords";
import HerdFinanceRecords from "../components/HerdFinanceRecords";
import HerdInventory from "../components/HerdInventory";
import PremiumRecords from "../components/PremiumRecords";
import VetVisits from "../components/VetVisits";
import WeightRecords from "../components/WeightRecords";
import { SkeletonBlock } from "../components/LoadingSpinner";
import { useNavigate, useParams } from "react-router-dom";
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
import { UserButton, useUser } from "@clerk/clerk-react";
import { usePreferences } from "../context/PreferencesContext";
import { useAuth as useBarnBuddyAuth } from "../context/AuthContext";

const getAnimalCareSignature = (items) =>
  items
    .map((animal) => `${animal.id}:${animal.status || "active"}:${animal.deceased_date || ""}`)
    .join("|");

const getCareSummaryKey = (herd, items, careWindow, refreshKey) =>
  `${herd?.id || "none"}:${careWindow}:${refreshKey}:${getAnimalCareSignature(items)}`;

export default function Dashboard() {
  const { animalId: linkedAnimalId } = useParams();
  const [activeTab, setActiveTab] = useState("general");
  const [dateTime, setDateTime] = useState("");
  const [selectedHerd, setSelectedHerd] = useState(null);
  const [herds, setHerds] = useState([]);
  const [animals, setAnimals] = useState([]);
  const [, setHasUnassignedAnimals] = useState(false);
  const [selectedAnimal, setSelectedAnimal] = useState(null);
  const [vaccinationsDue, setVaccinationsDue] = useState(0);
  const [vaccinationsDueSoon, setVaccinationsDueSoon] = useState(0);
  const [vaccinationRefresh, setVaccinationRefresh] = useState(0);
  const [animalUrgencies, setAnimalUrgencies] = useState({});
  const [upcomingVetVisits, setUpcomingVetVisits] = useState(0);
  const [loadingHerds, setLoadingHerds] = useState(true);
  const [loadingAnimals, setLoadingAnimals] = useState(false);
  const [addingAnimal, setAddingAnimal] = useState(false);
  const [exportMode, setExportMode] = useState("farm");
  const [exportLoading, setExportLoading] = useState(false);
  const [animalExportData, setAnimalExportData] = useState(null);
  const [herdFinanceExportData, setHerdFinanceExportData] = useState(null);

  const handleFarmOverviewClick = () => {
    setActiveTab("general");
    setSelectedAnimal(null);
  };

  const handleHerdFeedClick = () => {
    setActiveTab("feed");
    setSelectedAnimal(null);
  };

  const handleHerdFinanceClick = () => {
    setActiveTab("herd-finance");
    setSelectedAnimal(null);
  };

  const handleBulkEntryClick = () => {
    setActiveTab("bulk-entry");
    setSelectedAnimal(null);
  };

  const handleInventoryClick = () => {
    setActiveTab("inventory");
    setSelectedAnimal(null);
  };

  const { user } = useUser();
  const { preferences } = usePreferences();
  const { subscription } = useBarnBuddyAuth();
  const loadedHerdIdRef = React.useRef(null);
  const loadedCareSummaryKeyRef = React.useRef("");
  const loadedLinkedAnimalRef = React.useRef(null);
  const navigate = useNavigate();
  const isCompact = preferences.dashboardDensity === "compact";
  const primaryAnimalIdentifier = preferences.animalPrimaryIdentifier === "tag" ? "tag" : "name";
  const getAnimalPrimaryLabel = (animal) => {
    if (primaryAnimalIdentifier === "tag") return animal.tag_id || animal.name || "Unnamed animal";
    return animal.name || animal.tag_id || "Unnamed animal";
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

  // Update clock every second
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setDateTime(
        now.toLocaleString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const applyCareSummary = (careSummary = {}) => {
    setAnimalUrgencies(careSummary.animalUrgencies || {});
    setVaccinationsDue(Number(careSummary.vaccinationsDue) || 0);
    setVaccinationsDueSoon(Number(careSummary.vaccinationsDueSoon) || 0);
    setUpcomingVetVisits(Number(careSummary.upcomingVetVisits) || 0);
  };

  // Load dashboard startup data in one API call.
  useEffect(() => {
    let cancelled = false;

    async function loadDashboardBootstrap() {
      try {
        setLoadingHerds(true);
        setLoadingAnimals(true);
        const res = await getDashboardBootstrap(Number(preferences.careWindow) || 7);
        if (cancelled) return;

        const loadedHerds = Array.isArray(res.data?.herds) ? res.data.herds : [];
        const loadedAnimals = Array.isArray(res.data?.animals) ? res.data.animals : [];
        const nextSelectedHerd = res.data?.selectedHerd || null;

        loadedHerdIdRef.current = nextSelectedHerd?.id || null;
        loadedCareSummaryKeyRef.current = getCareSummaryKey(
          nextSelectedHerd,
          loadedAnimals,
          preferences.careWindow,
          0
        );
        setHerds(loadedHerds);
        setAnimals(loadedAnimals);
        setHasUnassignedAnimals(Boolean(res.data?.hasUnassignedAnimals));
        setSelectedHerd(nextSelectedHerd);
        applyCareSummary(res.data?.careSummary);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load dashboard data");
      } finally {
        if (!cancelled) {
          setLoadingHerds(false);
          setLoadingAnimals(false);
        }
      }
    }

    loadDashboardBootstrap();

    return () => {
      cancelled = true;
    };
  }, [preferences.careWindow]);

  // Load animals when the herd changes. Individual edits patch local state below.
  useEffect(() => {
    async function loadAnimals() {
      if (!selectedHerd) return;
      if (loadedHerdIdRef.current === selectedHerd.id) return;

      try {
        setLoadingAnimals(true);
        let animalsData = [];
        if (selectedHerd.id === "unassigned") {
          const res = await getAnimalsUnassigned(); // always use dedicated unassigned endpoint
          animalsData = Array.isArray(res.data) ? res.data : [];
          setHasUnassignedAnimals(animalsData.length > 0);
        } else {
          const res = await getAnimalsForHerd(selectedHerd.id);
          animalsData = Array.isArray(res.data) ? res.data : [];
        }
        loadedHerdIdRef.current = selectedHerd.id;
        setAnimals(animalsData);
      } catch (err) {
        console.error(err.response?.data || err.message);
        toast.error("Animals failed to load");
      } finally {
        setLoadingAnimals(false);
      }
    }

    loadAnimals();
  }, [selectedHerd]);

  useEffect(() => {
    if (!linkedAnimalId) setSelectedAnimal(null);
  }, [selectedHerd, linkedAnimalId]);

  useEffect(() => {
    if (!linkedAnimalId || loadingHerds || loadedLinkedAnimalRef.current === linkedAnimalId) return;

    let cancelled = false;
    async function openLinkedAnimal() {
      try {
        const response = await getAnimalByID(linkedAnimalId);
        if (cancelled) return;
        const linkedAnimal = response.data;
        const linkedHerd = linkedAnimal.herd_id
          ? herds.find((herd) => String(herd.id) === String(linkedAnimal.herd_id))
          : { id: "unassigned", name: "Unassigned" };

        if (!linkedHerd) {
          toast.error("This animal's herd is no longer available.");
          navigate("/dashboard", { replace: true });
          return;
        }

        loadedLinkedAnimalRef.current = linkedAnimalId;
        loadedHerdIdRef.current = null;
        setSelectedHerd(linkedHerd);
        setSelectedAnimal(linkedAnimal);
        setActiveTab("general");
      } catch (err) {
        console.error(err);
        toast.error(err.response?.status === 404 ? "Animal not found or unavailable." : "Failed to open animal profile.");
        navigate("/dashboard", { replace: true });
      }
    }

    openLinkedAnimal();
    return () => {
      cancelled = true;
    };
  }, [herds, linkedAnimalId, loadingHerds, navigate]);

  const animalCareSignature = getAnimalCareSignature(animals);

  // Load herd-wide care status in one request instead of per-animal vaccination/vet calls.
  useEffect(() => {
    const computeHerdStatus = async () => {
      const herdAnimals = Array.isArray(animals) ? animals : [];
      if (!selectedHerd || herdAnimals.length === 0) {
        setVaccinationsDue(0);
        setVaccinationsDueSoon(0);
        setAnimalUrgencies({});
        setUpcomingVetVisits(0);
        return;
      }

      try {
        const careWindowDays = Number(preferences.careWindow) || 7;
        const careSummaryKey = getCareSummaryKey(selectedHerd, herdAnimals, preferences.careWindow, vaccinationRefresh);
        if (loadedCareSummaryKeyRef.current === careSummaryKey) return;

        const res = await getHerdCareSummary(selectedHerd.id, careWindowDays);
        loadedCareSummaryKeyRef.current = careSummaryKey;
        applyCareSummary(res.data || {});
      } catch (err) {
        console.error("Error fetching herd care summary:", err);
        setAnimalUrgencies(
          Object.fromEntries(herdAnimals.map((animal) => [animal.id, animal.status === "deceased" ? "deceased" : "green"]))
        );
        setVaccinationsDue(0);
        setVaccinationsDueSoon(0);
        setUpcomingVetVisits(0);
      }
    };

    computeHerdStatus();
  }, [animalCareSignature, selectedHerd, vaccinationRefresh, preferences.careWindow, animals]);

  const totalAnimals = animals.length;
  const activeAnimals = animals.filter((animal) => animal.status !== "deceased");
  const deceasedAnimals = animals.filter((animal) => animal.status === "deceased");
  const totalActiveAnimals = activeAnimals.length;
  const deceasedCount = deceasedAnimals.length;
  const careDueCount = vaccinationsDueSoon + upcomingVetVisits;
  const attentionAnimalsAll = animals
    .filter((animal) => animal.status !== "deceased" && animalUrgencies[animal.id] !== "green")
    .sort((a, b) => {
      const priority = { red: 0, yellow: 1, green: 2 };
      return (
        priority[animalUrgencies[a.id] || "green"] -
        priority[animalUrgencies[b.id] || "green"]
      );
    });
  const attentionAnimals = attentionAnimalsAll.slice(0, 3);
  const issueCount = attentionAnimalsAll.length;
  const animalsStable = Math.max(0, totalActiveAnimals - issueCount);
  const careStatusCounts = animals.reduce(
    (counts, animal) => {
      if (animal.status === "deceased") {
        counts.deceased += 1;
        return counts;
      }
      const urgency = animalUrgencies[animal.id] || "green";
      if (urgency === "red") counts.needsAttention += 1;
      else if (urgency === "yellow") counts.dueSoon += 1;
      else counts.current += 1;
      return counts;
    },
    { current: 0, dueSoon: 0, needsAttention: 0, deceased: 0 }
  );
  const careStatusSegments = [
    { key: "current", label: "Good", value: careStatusCounts.current, color: "#10b981" },
    { key: "dueSoon", label: "Due soon", value: careStatusCounts.dueSoon, color: "#f59e0b" },
    { key: "needsAttention", label: "Needs attention", value: careStatusCounts.needsAttention, color: "#ef4444" },
    { key: "deceased", label: "Deceased", value: careStatusCounts.deceased, color: "#6b7280" },
  ];
  const generatedDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const getStatusLabel = (urgency) => {
    if (urgency === "deceased") return "Deceased";
    if (urgency === "red") return "Needs attention";
    if (urgency === "yellow") return "Due soon";
    return "Current";
  };

  const getAnimalStatus = (animal) => {
    if (animal.status === "deceased") return "deceased";
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
      return animalBelongsToCurrentHerd(updatedAnimal) ? updatedAnimal : null;
    });
  };

  const handleAnimalDeleted = (animalId) => {
    setAnimals((current) => current.filter((animal) => animal.id !== animalId));
    setSelectedAnimal((current) => (current?.id === animalId ? null : current));
    if (linkedAnimalId && String(linkedAnimalId) === String(animalId)) {
      navigate("/dashboard", { replace: true });
    }
  };

  // Add new animal
  const handleAddAnimal = async () => {
    if (!selectedHerd) return;

    try {
      setAddingAnimal(true);
      const filler = {
        herd_id: selectedHerd.id === "unassigned" ? null : selectedHerd.id,
        name: "NewAnimal",
        species: "Cow",
        sex: "Male",
        birthdate: new Date().toISOString().slice(0, 10),
        age: 0,
        comments: "None",
        weight: "0.00",
        behavior: "None",
        tag_id: "0000",
        status: "active",
        deceased_date: null,
        deceased_notes: null,
      };

      const res = await createAnimal(filler);
      if (res.data) {
        setAnimals((current) => [res.data, ...current]);
        setSelectedAnimal(res.data);
        setActiveTab("general");
      }
      toast.success("Created new animal!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to create new animal!");
    } finally {
      setAddingAnimal(false);
    }
  };

  const handleSelectAnimal = (animal) => {
    if (["feed", "herd-finance", "bulk-entry", "inventory"].includes(activeTab)) setActiveTab("general");
    if (selectedAnimal?.id === animal.id && linkedAnimalId) {
      navigate("/dashboard", { replace: true });
    }
    setSelectedAnimal((current) =>
      current?.id === animal.id ? null : animal
    );
  };

  const handleCloseAnimal = () => {
    setSelectedAnimal(null);
    if (linkedAnimalId) navigate("/dashboard", { replace: true });
  };

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        setSelectedAnimal(null);
      }
    };

    window.addEventListener("keydown", handleEsc);

    return () => {
      window.removeEventListener("keydown", handleEsc);
    };
  }, []);

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

  const animalRecordTabs = [
    { key: "general", label: "General", mobileLabel: "General" },
    { key: "weight", label: "Weight", mobileLabel: "Weight" },
    { key: "health", label: "Health", mobileLabel: "Health" },
    { key: "vet", label: "Vet", mobileLabel: "Vet" },
    { key: "reproduction", label: "Reproduction", mobileLabel: "Repro", compact: true },
    { key: "finance", label: "Money", mobileLabel: "Money" },
  ];

  const setHerdFromValue = (value) => {
    if (value === "unassigned") {
      setSelectedHerd({ id: "unassigned", name: "Unassigned" });
      return;
    }

    const herd = herds.find((h) => String(h.id) === value);
    setSelectedHerd(herd);
  };

  const currentViewTitle = selectedAnimal
    ? getAnimalPrimaryLabel(selectedAnimal)
    : activeTab === "feed"
    ? "Herd Feed"
    : activeTab === "herd-finance"
    ? "Herd Finances"
    : activeTab === "bulk-entry"
    ? "Bulk Entry"
    : activeTab === "inventory"
    ? "Inventory"
    : "Farm Overview";

  const currentViewSubtitle = selectedAnimal
    ? `${selectedAnimal.species || "Animal"} - ${getAnimalSecondaryLabel(selectedAnimal)}`
    : selectedHerd?.name || "Select a herd";

  return (
    <div className={`dashboard-page flex min-h-screen flex-col bg-gray-950 text-gray-100 xl:h-screen xl:flex-row xl:overflow-hidden ${isCompact ? "dashboard-compact" : "dashboard-comfortable"}`}>
      {/* SIDEBAR */}
      <aside className="hidden w-full flex-shrink-0 flex-col border-b border-gray-700 bg-gray-800 shadow-lg xl:flex xl:h-screen xl:w-72 xl:border-b-0 xl:border-r">
        <div className="px-6 py-6 border-b border-gray-700">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="text-left text-2xl font-bold tracking-tight cursor-pointer hover:opacity-85 transition"
            aria-label="Go to BarnBuddy home"
          >
            <span className="text-blue-500">Barn</span>Buddy.
          </button>
          <p className="text-sm text-gray-400 mt-1">Dashboard</p>
        </div>


        <div className="px-4 py-3 border-b border-gray-700">
          <select
            value={selectedHerd ? selectedHerd.id : ""}
            disabled={loadingHerds}
            onChange={(e) => setHerdFromValue(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-gray-100 outline-none cursor-pointer disabled:cursor-wait disabled:opacity-70"
          >
            <option value="" disabled>
              {loadingHerds ? "Loading herds..." : "Select Herd"}
            </option>
            <option value="unassigned">Unassigned Animals</option>
            {herds.map((herd) => (
              <option key={herd.id} value={String(herd.id)}>
                {herd.name}
              </option>
            ))}
          </select>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-3 overflow-y-auto">
          <button
            type="button"
            onClick={handleFarmOverviewClick}
            className={`w-full text-left px-4 py-3 rounded-xl font-semibold transition border cursor-pointer ${
              !selectedAnimal && !["feed", "herd-finance", "bulk-entry", "inventory"].includes(activeTab)
                ? "bg-blue-600 border-blue-500 text-white shadow"
                : "border-gray-600 hover:bg-gray-700 text-gray-200"
            }`}
          >
            Farm Overview
          </button>

          <button
            type="button"
            onClick={handleHerdFeedClick}
            className={`w-full text-left px-4 py-3 rounded-xl font-semibold transition border cursor-pointer ${
              !selectedAnimal && activeTab === "feed"
                ? "bg-blue-600 border-blue-500 text-white shadow"
                : "border-gray-600 hover:bg-gray-700 text-gray-200"
            }`}
          >
            Herd Feed
          </button>

          <button
            type="button"
            onClick={handleHerdFinanceClick}
            className={`w-full text-left px-4 py-3 rounded-xl font-semibold transition border cursor-pointer ${
              !selectedAnimal && activeTab === "herd-finance"
                ? "bg-blue-600 border-blue-500 text-white shadow"
                : "border-gray-600 hover:bg-gray-700 text-gray-200"
            }`}
          >
            Herd Finances
          </button>

          <button
            type="button"
            onClick={handleBulkEntryClick}
            className={`w-full text-left px-4 py-3 rounded-xl font-semibold transition border cursor-pointer ${
              !selectedAnimal && activeTab === "bulk-entry"
                ? "bg-blue-600 border-blue-500 text-white shadow"
                : "border-gray-600 hover:bg-gray-700 text-gray-200"
            }`}
          >
            Bulk Entry
          </button>

          <button
            type="button"
            onClick={handleInventoryClick}
            className={`w-full text-left px-4 py-3 rounded-xl font-semibold transition border cursor-pointer ${
              !selectedAnimal && activeTab === "inventory"
                ? "bg-blue-600 border-blue-500 text-white shadow"
                : "border-gray-600 hover:bg-gray-700 text-gray-200"
            }`}
          >
            Inventory
          </button>

          <div className="mt-4 px-4 text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
            Animals
          </div>

        <div className="mt-2 space-y-2">
            {loadingAnimals ? (
              <div className="space-y-2">
                {[0, 1, 2, 3, 4].map((item) => (
                  <SkeletonBlock key={item} className="h-10 w-full border border-gray-700" />
                ))}
              </div>
            ) : animals.map((animal) => {
              const urgency = getAnimalStatus(animal);
              return (
                <button
                  key={animal.id}
                  onClick={() => handleSelectAnimal(animal)}
                  className={`w-full text-left px-4 py-2 rounded-lg transition border cursor-pointer ${
                    selectedAnimal?.id === animal.id
                      ? "bg-blue-600 border-blue-500 text-white shadow"
                      : "border-gray-600 hover:bg-gray-700 text-gray-200"
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    <span
                      className={`inline-block w-2 h-2 rounded-full ${
                        urgency === "red"
                          ? "bg-red-400"
                          : urgency === "yellow"
                          ? "bg-yellow-400"
                          : urgency === "deceased"
                          ? "bg-gray-500"
                          : "bg-emerald-400"
                      }`}
                    ></span>
                    <span className="min-w-0">
                      <span className="block truncate">{getAnimalPrimaryLabel(animal)}</span>
                      <span className="block truncate text-xs text-gray-400">{getAnimalSecondaryLabel(animal)}</span>
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex flex-col gap-2 px-4">
            <button
              onClick={handleAddAnimal}
              disabled={!selectedHerd || addingAnimal}
              className="w-full px-3 py-2 bg-blue-600 rounded-lg text-white font-semibold hover:bg-blue-500 disabled:cursor-wait disabled:opacity-70"
            >
              {addingAnimal ? "Adding..." : "Add"}
            </button>
          </div>
        </nav>
      </aside>

      {/* MAIN AREA */}
      <main className={`dashboard-main min-h-screen flex-1 overflow-y-auto bg-gray-950 pb-24 xl:min-h-0 xl:pb-0 ${isCompact ? "xl:p-5" : "xl:p-8"}`}>
        {/* MOBILE + TABLET APP HEADER */}
        <section className="dashboard-app-header sticky top-0 z-30 border-b border-gray-800 bg-gray-950/95 px-3 pb-3 pt-3 shadow-lg shadow-black/20 backdrop-blur md:px-6 md:pb-4 md:pt-4 xl:hidden">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="text-left text-xl font-bold tracking-tight"
              aria-label="Go to BarnBuddy home"
            >
              <span className="text-blue-400">Barn</span>Buddy.
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportDashboardPdf}
                disabled={exportLoading}
                className="rounded-full border border-gray-700 bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
              >
                {exportLoading ? "..." : "Export"}
              </button>
              <button
                type="button"
                onClick={() => navigate("/settings/account")}
                className="rounded-full border border-gray-700 bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white"
              >
                Settings
              </button>
              <div className="rounded-full border border-gray-700 bg-gray-900 p-1">
                <UserButton afterSignOutUrl="/" />
              </div>
            </div>
          </div>

          <div className="mt-3 md:grid md:grid-cols-[minmax(0,1fr)_minmax(240px,340px)] md:items-end md:gap-5">
            <div className="mb-2 flex items-end justify-between gap-3">
              <div className="min-w-0">
                <h1 className="truncate text-lg font-semibold text-white">{currentViewTitle}</h1>
                <p className="truncate text-xs text-gray-400">{currentViewSubtitle}</p>
              </div>
              {selectedAnimal ? (
                <button
                  type="button"
                  onClick={handleCloseAnimal}
                  className="shrink-0 rounded-full bg-gray-800 px-3 py-1.5 text-xs font-semibold text-gray-200"
                >
                  Close
                </button>
              ) : !subscription.isPremium ? (
                <span className="shrink-0 rounded-full bg-blue-500/15 px-2.5 py-1 text-[11px] font-semibold text-blue-100">
                  {subscription.planName}
                </span>
              ) : null}
            </div>
            <select
              value={selectedHerd ? selectedHerd.id : ""}
              disabled={loadingHerds}
              onChange={(e) => setHerdFromValue(e.target.value)}
              className="w-full rounded-xl border border-gray-700 bg-gray-900 px-3 py-2.5 text-base text-gray-100 outline-none disabled:opacity-70 md:self-end"
            >
              <option value="" disabled>
                {loadingHerds ? "Loading herds..." : "Select Herd"}
              </option>
              <option value="unassigned">Unassigned Animals</option>
              {herds.map((herd) => (
                <option key={herd.id} value={String(herd.id)}>
                  {herd.name}
                </option>
              ))}
            </select>
          </div>
        </section>

        {!selectedAnimal && (
        <section className="dashboard-animal-strip border-b border-gray-800 bg-gray-950 px-3 py-2.5 md:px-6 md:py-4 xl:hidden">
          <div>
            <button
              type="button"
              onClick={handleAddAnimal}
              disabled={!selectedHerd || addingAnimal}
              className="w-full rounded-xl bg-emerald-500 px-3 py-2 text-sm font-semibold text-gray-950 disabled:opacity-60"
            >
              {addingAnimal ? "Adding animal" : "Add animal"}
            </button>
          </div>

          {!["bulk-entry", "inventory"].includes(activeTab) && (
          <div className="mt-2.5 flex gap-2 overflow-x-auto pb-1 md:gap-3">
            {loadingAnimals ? (
              [0, 1, 2].map((item) => (
                <SkeletonBlock key={item} className="h-14 w-32 shrink-0 rounded-xl" />
              ))
            ) : animals.length === 0 ? (
              <div className="w-full rounded-xl border border-dashed border-gray-700 bg-gray-900 p-3 text-sm text-gray-400">
                No animals in this herd yet.
              </div>
            ) : animals.map((animal) => {
              const urgency = getAnimalStatus(animal);
              return (
                <button
                  key={animal.id}
                  type="button"
                  onClick={() => handleSelectAnimal(animal)}
                  className={`min-w-32 max-w-40 shrink-0 rounded-xl border p-2.5 text-left md:min-w-44 md:max-w-52 md:p-3 ${
                    selectedAnimal?.id === animal.id
                      ? "border-blue-400 bg-blue-600/25"
                      : "border-gray-800 bg-gray-900"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        urgency === "red"
                          ? "bg-red-400"
                          : urgency === "yellow"
                          ? "bg-yellow-300"
                          : urgency === "deceased"
                          ? "bg-gray-500"
                          : "bg-emerald-400"
                      }`}
                    />
                    <span className="truncate text-sm font-semibold text-white">{getAnimalPrimaryLabel(animal)}</span>
                  </div>
                  <p className="mt-1 truncate text-xs text-gray-400">{animal.species || "Unknown"} - {getAnimalSecondaryLabel(animal)}</p>
                </button>
              );
            })}
          </div>
          )}
        </section>
        )}

        {/* HEADER */}
        <header className={`hidden flex-col sm:flex-row items-start sm:items-center justify-between xl:flex ${isCompact ? "mb-4" : "mb-6"}`}>
          <div className="mb-4 sm:mb-0">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-semibold">Welcome back</h2>
              {!subscription.isPremium && (
                <span className="rounded-full bg-gray-800 px-3 py-1 text-xs font-semibold text-gray-300 ring-1 ring-gray-700">
                  {subscription.planName}
                </span>
              )}
            </div>
            <p className="text-gray-400">{dateTime}</p>
          </div>
          <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto sm:justify-end">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm font-semibold text-gray-100">
                {user?.firstName || user?.primaryEmailAddress?.emailAddress || "Profile"}
              </span>
              <span className="text-xs text-gray-400">Farm account</span>
            </div>
            <div className="rounded-full border border-gray-700 bg-gray-800 p-1">
              <UserButton afterSignOutUrl="/" />
            </div>
            <button
              type="button"
              onClick={handleExportDashboardPdf}
              disabled={exportLoading}
              className="rounded-xl border border-gray-700 bg-gray-800 px-4 py-2 text-white shadow transition hover:bg-gray-700"
            >
              {exportLoading ? "Preparing..." : subscription.isPremium && selectedAnimal ? "Export Animal" : subscription.isPremium ? "Export Farm" : "Export PDF - Premium"}
            </button>
            <button
              className="px-5 py-2 bg-blue-600 text-white rounded-xl shadow hover:bg-blue-500 transition"
              onClick={() => navigate("/settings/account")}
            >
              Settings
            </button>
          </div>
        </header>

        {/* QUICK STATS */}
        <section className={`hidden grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 xl:grid ${isCompact ? "gap-3 mb-4" : "gap-4 mb-6"}`}>
          {[
            { title: "Animals", value: animals.length },
            { title: "Active", value: totalActiveAnimals },
            { title: "Vaccine Care", value: vaccinationsDue },
            { title: "Vet Care Upcoming", value: upcomingVetVisits },
          ].map((stat) => (
            <div
              key={stat.title}
              className={`bg-gray-900 shadow-md border border-gray-800 rounded-2xl flex flex-col items-start justify-between ${isCompact ? "min-h-20 p-4" : "min-h-28 p-4 sm:p-6"}`}
            >
              {loadingHerds || loadingAnimals ? (
                <>
                  <SkeletonBlock className="h-4 w-28 rounded" />
                  <SkeletonBlock className="mt-3 h-8 w-16 rounded" />
                </>
              ) : (
                <>
                  <p className="text-gray-400 text-sm">{stat.title}</p>
                  <h3 className="text-2xl sm:text-3xl font-bold mt-1">{stat.value}</h3>
                </>
              )}
            </div>
          ))}
        </section>

        {/* ANIMAL DATA */}
        <div className="dashboard-content-card bg-gray-950 md:rounded-2xl md:border md:border-gray-800 md:bg-gray-900 md:shadow-md">
          {!selectedAnimal && activeTab === "feed" ? (
            <div className="p-3 sm:p-6">
              <HerdFeedRecords
                selectedHerd={selectedHerd}
                isPremium={subscription.isPremium}
                automaticReminders={Boolean(preferences.automaticReminders)}
              />
            </div>
          ) : !selectedAnimal && activeTab === "herd-finance" ? (
            <div className="p-3 sm:p-6">
              <HerdFinanceRecords
                selectedHerd={selectedHerd}
                animals={animals}
                isPremium={subscription.isPremium}
                onExportFinanceReport={handleExportHerdFinancePdf}
              />
            </div>
          ) : !selectedAnimal && activeTab === "bulk-entry" ? (
            <div className="p-3 sm:p-6">
              <BulkEntry
                animals={animals}
                selectedHerd={selectedHerd}
                primaryAnimalIdentifier={primaryAnimalIdentifier}
                isPremium={subscription.isPremium}
                onSaved={() => setVaccinationRefresh((current) => current + 1)}
              />
            </div>
          ) : !selectedAnimal && activeTab === "inventory" ? (
            <div className="p-3 sm:p-6">
              <HerdInventory
                selectedHerd={selectedHerd}
                isPremium={subscription.isPremium}
              />
            </div>
          ) : !selectedAnimal ? (
            <DashboardOverview
              loading={loadingHerds || loadingAnimals}
              animals={animals}
              selectedHerd={selectedHerd}
              totalAnimals={totalAnimals}
              totalActiveAnimals={totalActiveAnimals}
              deceasedCount={deceasedCount}
              vaccinationsDue={vaccinationsDue}
              upcomingVetVisits={upcomingVetVisits}
              careDueCount={careDueCount}
              attentionAnimals={attentionAnimals}
              issueCount={issueCount}
              animalsStable={animalsStable}
              animalUrgencies={animalUrgencies}
              primaryAnimalIdentifier={primaryAnimalIdentifier}
              isPremium={subscription.isPremium}
              handleSelectAnimal={handleSelectAnimal}
            />
          ) : (
            <>
              {/* TABS */}
              <div className="hidden border-b border-gray-700 xl:flex xl:flex-wrap">
                {animalRecordTabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex-1 py-3 font-medium transition rounded-t-2xl ${
                      activeTab === tab.key
                        ? "bg-blue-600 text-white shadow-inner"
                        : "text-gray-400 hover:bg-gray-700"
                    } ${tab.compact ? "text-xs" : "text-sm"}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* TAB CONTENT */}
              <div className="p-3 text-gray-300 sm:p-6 md:overflow-auto">
                {activeTab === "general" && (
                  <AnimalGeneralData
                    animal={selectedAnimal}
                    setSelectedAnimal={setSelectedAnimal}
                    setActiveTab={setActiveTab}
                    onAnimalSaved={handleAnimalSaved}
                    onAnimalDeleted={handleAnimalDeleted}
                    herds={herds}
                    selectedHerd={selectedHerd}
                  />
                )}
                {activeTab === "health" && (
                  <HealthRecords
                    animal={selectedAnimal}
                    selectedHerd={selectedHerd}
                    isPremium={subscription.isPremium}
                    onVaccinationUpdate={() => setVaccinationRefresh(prev => prev + 1)}
                  />
                )}
                {activeTab === "weight" && (
                  <WeightRecords
                    animal={selectedAnimal}
                    onAnimalSaved={handleAnimalSaved}
                  />
                )}
                {activeTab === "vet" && <VetVisits animal={selectedAnimal} onVetVisitUpdate={() => setVaccinationRefresh(prev => prev + 1)} />}
                {activeTab === "reproduction" && (
                  <PremiumRecords
                    animal={selectedAnimal}
                    animals={animals}
                    isPremium={subscription.isPremium}
                    onExportAnimal={handleExportAnimalPdf}
                    exportLoading={exportLoading}
                    onAnimalSaved={handleAnimalSaved}
                    onAnimalDeleted={handleAnimalDeleted}
                    view="reproduction"
                  />
                )}
                {activeTab === "finance" && (
                  <PremiumRecords
                    animal={selectedAnimal}
                    animals={animals}
                    isPremium={subscription.isPremium}
                    onExportAnimal={handleExportAnimalPdf}
                    exportLoading={exportLoading}
                    view="finance"
                  />
                )}
              </div>
            </>
          )}
        </div>
        <nav className="dashboard-bottom-nav fixed inset-x-0 bottom-0 z-40 border-t border-gray-800 bg-gray-950/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-12px_28px_rgba(0,0,0,0.3)] backdrop-blur xl:hidden">
          {selectedAnimal ? (
            <div className="flex overflow-x-auto px-1">
              {animalRecordTabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  aria-label={tab.label}
                  className={`relative min-h-14 min-w-[4.4rem] flex-1 shrink-0 px-2 text-[11px] font-semibold leading-none transition ${
                    activeTab === tab.key ? "text-blue-300" : "text-gray-500"
                  }`}
                >
                  {activeTab === tab.key && (
                    <span className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-blue-400" />
                  )}
                  {tab.mobileLabel}
                </button>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-5">
              <button
                type="button"
                onClick={handleFarmOverviewClick}
                className={`relative min-h-14 px-1 text-[11px] font-semibold leading-none transition ${
                  !["feed", "herd-finance", "bulk-entry", "inventory"].includes(activeTab) ? "text-blue-300" : "text-gray-500"
                }`}
              >
                {!["feed", "herd-finance", "bulk-entry", "inventory"].includes(activeTab) && (
                  <span className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-blue-400" />
                )}
                Home
              </button>
              <button
                type="button"
                onClick={handleHerdFeedClick}
                className={`relative min-h-14 px-1 text-[11px] font-semibold leading-none transition ${
                  activeTab === "feed" ? "text-blue-300" : "text-gray-500"
                }`}
              >
                {activeTab === "feed" && (
                  <span className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-blue-400" />
                )}
                Feed
              </button>
              <button
                type="button"
                onClick={handleHerdFinanceClick}
                className={`relative min-h-14 px-1 text-[11px] font-semibold leading-none transition ${
                  activeTab === "herd-finance" ? "text-blue-300" : "text-gray-500"
                }`}
              >
                {activeTab === "herd-finance" && (
                  <span className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-blue-400" />
                )}
                Money
              </button>
              <button
                type="button"
                onClick={handleBulkEntryClick}
                className={`relative min-h-14 px-1 text-[11px] font-semibold leading-none transition ${
                  activeTab === "bulk-entry" ? "text-blue-300" : "text-gray-500"
                }`}
              >
                {activeTab === "bulk-entry" && (
                  <span className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-blue-400" />
                )}
                Bulk
              </button>
              <button
                type="button"
                onClick={handleInventoryClick}
                className={`relative min-h-14 px-0.5 text-[10px] font-semibold leading-none transition ${
                  activeTab === "inventory" ? "text-blue-300" : "text-gray-500"
                }`}
              >
                {activeTab === "inventory" && (
                  <span className="absolute inset-x-2 top-0 h-0.5 rounded-full bg-blue-400" />
                )}
                Inventory
              </button>
            </div>
          )}
        </nav>
      </main>

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
                  <tr><th>Age</th><td>{selectedAnimal.age || ""}</td></tr>
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
