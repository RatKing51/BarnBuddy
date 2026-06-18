import React, { useEffect, useRef, useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import { createAnimal, deleteAnimal, updateAnimal } from "../api/animal";
import * as birthsAPI from "../api/births";
import * as reproductionsAPI from "../api/reproductions";
import * as premiumRecordsAPI from "../api/premiumRecords";
import * as vetVisitsAPI from "../api/vetVisits";
import { SkeletonBlock } from "./LoadingSpinner";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(value) {
  return value ? String(value).slice(0, 10) : "";
}

function money(value) {
  const number = Number.parseFloat(value);
  return Number.isFinite(number) ? `$${number.toFixed(2)}` : "$0.00";
}

function getAnimalLabel(animal) {
  return animal?.name || animal?.tag_id || "Unnamed animal";
}

function getSexRole(animal) {
  const normalized = String(animal?.sex || "").toLowerCase();
  if (normalized.startsWith("m") || normalized.includes("bull") || normalized.includes("ram") || normalized.includes("buck") || normalized.includes("boar")) {
    return "male";
  }
  if (normalized.startsWith("f") || normalized.includes("cow") || normalized.includes("ewe") || normalized.includes("doe") || normalized.includes("sow")) {
    return "female";
  }
  return "unknown";
}

function canBeDam(animal) {
  const role = getSexRole(animal);
  return role !== "male";
}

function canBeSire(animal) {
  const role = getSexRole(animal);
  return role !== "female";
}

function getGestationDays(species) {
  const normalized = String(species || "").toLowerCase();
  if (normalized.includes("cow") || normalized.includes("cattle")) return 283;
  if (normalized.includes("sheep")) return 147;
  if (normalized.includes("goat")) return 150;
  if (normalized.includes("swine") || normalized.includes("pig")) return 114;
  return 150;
}

function addDays(dateValue, days) {
  if (!dateValue) return "";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "";
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function PremiumLocked({ label }) {
  return (
    <div className="rounded-2xl border border-amber-300/30 bg-amber-400/10 p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-200">Premium</p>
      <h2 className="mt-2 text-xl font-semibold text-white">{label} is a Premium feature</h2>
      <p className="mt-2 max-w-2xl text-sm text-gray-300">
        Upgrade to use advanced records, animal-level exports, and reminder settings.
      </p>
      <a href="/pricing" className="mt-5 inline-flex rounded-lg bg-amber-300 px-4 py-2 font-semibold text-gray-950 transition hover:bg-amber-200">
        View Premium
      </a>
    </div>
  );
}

function PremiumRecordsSkeleton({ view }) {
  const isReproduction = view === "reproduction";

  return (
    <div className="space-y-6" aria-busy="true">
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_auto]">
        <div className="rounded-2xl border border-blue-400/20 bg-blue-500/10 p-5">
          <SkeletonBlock className="h-4 w-24" />
          <SkeletonBlock className="mt-3 h-6 w-72 max-w-full" />
          <SkeletonBlock className="mt-3 h-4 w-full max-w-xl" />
        </div>
        <div className="flex flex-col gap-2 rounded-2xl border border-gray-700 bg-gray-900 p-5 sm:min-w-56">
          <SkeletonBlock className="h-10 w-full" />
          <SkeletonBlock className="h-10 w-full" />
        </div>
      </section>

      {isReproduction ? (
        <>
          <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {[0, 1, 2].map((item) => (
              <div key={item} className="rounded-2xl border border-gray-700 bg-gray-900 p-5">
                <SkeletonBlock className="h-3 w-28" />
                <SkeletonBlock className="mt-3 h-6 w-36" />
                <SkeletonBlock className="mt-2 h-4 w-full" />
              </div>
            ))}
          </section>
          <section className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_1fr]">
            <div className="rounded-2xl border border-gray-700 bg-gray-800 p-5">
              <SkeletonBlock className="mb-4 h-5 w-36" />
              {[0, 1, 2, 3].map((item) => (
                <SkeletonBlock key={item} className="mb-2 h-20 w-full rounded-xl" />
              ))}
            </div>
            <div className="space-y-4 rounded-2xl border border-gray-700 bg-gray-800 p-5">
              {[0, 1, 2].map((section) => (
                <div key={section} className="rounded-xl border border-gray-700 bg-gray-900 p-4">
                  <SkeletonBlock className="h-5 w-40" />
                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                    {[0, 1, 2].map((item) => (
                      <SkeletonBlock key={item} className="h-10 w-full" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : (
        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_420px]">
          <div className="rounded-2xl border border-gray-700 bg-gray-800 p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <SkeletonBlock className="h-5 w-28" />
              <SkeletonBlock className="h-9 w-16" />
            </div>
            {[0, 1, 2, 3].map((item) => (
              <SkeletonBlock key={item} className="mb-2 h-20 w-full rounded-xl" />
            ))}
          </div>
          <div className="rounded-2xl border border-gray-700 bg-gray-800 p-5">
            <SkeletonBlock className="h-5 w-32" />
            <SkeletonBlock className="mt-2 h-4 w-64" />
            {[0, 1, 2].map((item) => (
              <SkeletonBlock key={item} className="mt-4 h-20 w-full rounded-xl" />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function RecordList({ title, items, empty, selectedId, onSelect, renderMeta }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-gray-300">{title}</p>
      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-700 bg-gray-900 p-4 text-sm text-gray-400">{empty}</div>
      ) : (
        items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(selectedId === item.id ? null : item)}
            className={`w-full rounded-xl border p-3 text-left transition ${
              selectedId === item.id ? "border-blue-400 bg-blue-500/20" : "border-gray-700 bg-gray-900 hover:border-blue-400"
            }`}
          >
            {renderMeta(item)}
          </button>
        ))
      )}
    </div>
  );
}

export default function PremiumRecords({
  animal,
  animals = [],
  isPremium = false,
  onExportAnimal,
  exportLoading = false,
  onAnimalSaved,
  onAnimalDeleted,
  view = "reproduction",
}) {
  const [reproductions, setReproductions] = useState([]);
  const [birthRecords, setBirthRecords] = useState({ asOffspring: [], asDam: [], asSire: [] });
  const [financeRecords, setFinanceRecords] = useState([]);
  const [vetVisits, setVetVisits] = useState([]);
  const [selectedReproduction, setSelectedReproduction] = useState(null);
  const [selectedFinance, setSelectedFinance] = useState(null);
  const [animalDamId, setAnimalDamId] = useState("");
  const [animalSireId, setAnimalSireId] = useState("");
  const [newOffspring, setNewOffspring] = useState({
    name: "",
    tag_id: "",
    sex: "",
    birth_weight: "",
    birth_notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [addingReproduction, setAddingReproduction] = useState(false);
  const [deletingReproduction, setDeletingReproduction] = useState(false);
  const [addingFinance, setAddingFinance] = useState(false);
  const [deletingFinance, setDeletingFinance] = useState(false);
  const [addingOffspring, setAddingOffspring] = useState(false);
  const [removingOffspringId, setRemovingOffspringId] = useState(null);
  const [saveStatus, setSaveStatus] = useState("idle");
  const lastReproductionSignatures = useRef(new Map());
  const lastFinanceSignatures = useRef(new Map());
  const lastAnimalParentSignature = useRef("");
  const saveStatusTimer = useRef(null);

  useEffect(() => {
    setAnimalDamId(animal?.dam_id ? String(animal.dam_id) : "");
    setAnimalSireId(animal?.sire_id ? String(animal.sire_id) : "");
    if (animal?.id) {
      lastAnimalParentSignature.current = JSON.stringify({
        herd_id: animal.herd_id === null || animal.herd_id === undefined ? null : animal.herd_id,
        name: animal.name || "",
        species: animal.species || "",
        sex: animal.sex || "",
        birthdate: animal.birthdate ? formatDate(animal.birthdate) : null,
        age: animal.age ?? "",
        comments: animal.comments || "",
        weight: animal.weight || "",
        behavior: animal.behavior || "",
        tag_id: animal.tag_id || "",
        image_url: animal.image_url || null,
        status: animal.status || "active",
        deceased_date: animal.deceased_date ? formatDate(animal.deceased_date) : null,
        deceased_notes: animal.deceased_notes || null,
        dam_id: animal.dam_id || null,
        sire_id: animal.sire_id || null,
      });
    }
  }, [animal]);

  useEffect(() => {
    let cancelled = false;

    async function loadPremiumRecords() {
      if (!animal?.id || !isPremium) return;

      try {
        setLoading(true);
        const requests =
          view === "reproduction"
            ? [
                reproductionsAPI.getAnimalReproductions(animal.id),
                birthsAPI.getAnimalBirths(animal.id).catch(() => ({ data: { asOffspring: [], asDam: [], asSire: [] } })),
              ]
            : [premiumRecordsAPI.getFinanceRecords(animal.id), vetVisitsAPI.getVetVisitsForAnimal(animal.id)];
        const responses = await Promise.all(requests);

        if (cancelled) return;

        if (view === "reproduction") {
          const reproData = Array.isArray(responses[0].data) ? responses[0].data : [];
          const birthsData = responses[1]?.data || {};
          setReproductions(reproData);
          lastReproductionSignatures.current = new Map(reproData.map((record) => [record.id, JSON.stringify(getReproductionPayload(record))]));
          setBirthRecords({
            asOffspring: Array.isArray(birthsData.asOffspring) ? birthsData.asOffspring : [],
            asDam: Array.isArray(birthsData.asDam) ? birthsData.asDam : [],
            asSire: Array.isArray(birthsData.asSire) ? birthsData.asSire : [],
          });
          setSelectedReproduction(null);
        } else {
          const financeData = Array.isArray(responses[0].data) ? responses[0].data : [];
          const vetData = Array.isArray(responses[1].data) ? responses[1].data : [];
          setFinanceRecords(financeData);
          lastFinanceSignatures.current = new Map(financeData.map((record) => [record.id, JSON.stringify(getFinancePayload(record))]));
          setVetVisits(vetData);
          setSelectedFinance(financeData[0] || null);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) toast.error("Failed to load premium records.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadPremiumRecords();

    return () => {
      cancelled = true;
    };
  }, [animal?.id, isPremium, view]);

  useEffect(() => () => {
    if (saveStatusTimer.current) clearTimeout(saveStatusTimer.current);
  }, []);

  const markSaved = () => {
    setSaveStatus("saved");
    if (saveStatusTimer.current) clearTimeout(saveStatusTimer.current);
    saveStatusTimer.current = setTimeout(() => setSaveStatus("idle"), 1600);
  };

  const saveBadgeText = saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? "Saved" : "Auto-saves on blur";

  if (!isPremium) {
    return <PremiumLocked label={view === "reproduction" ? "Reproduction records" : "Finance records"} />;
  }

  if (loading) {
    return <PremiumRecordsSkeleton view={view} />;
  }

  function getReproductionPayload(record) {
    return {
      dam_id: record.dam_id || null,
      sire_id: record.sire_id || null,
      breeding_date: record.breeding_date || null,
      due_date: record.due_date || null,
      outcome: record.outcome || "Planned",
      breeding_method: record.breeding_method || "",
      pregnancy_check_date: record.pregnancy_check_date || null,
      pregnancy_status: record.pregnancy_status || "",
      birth_date: record.birth_date || null,
      offspring_count: record.offspring_count || null,
      birth_outcome: record.birth_outcome || "",
      notes: record.notes || "",
    };
  }

  function getFinancePayload(record) {
    return {
      record_date: record.record_date || null,
      category: record.category || "Expense",
      amount: record.amount || 0,
      vendor: record.vendor || "",
      notes: record.notes || "",
    };
  }

  const addReproduction = async () => {
    if (addingReproduction) return;

    try {
      setAddingReproduction(true);
      const breedingDate = today();
      const animalRole = getSexRole(animal);
      const res = await reproductionsAPI.createReproduction({
        dam_id: animalRole === "male" ? null : animal.id,
        sire_id: animalRole === "male" ? animal.id : null,
        breeding_date: breedingDate,
        due_date: addDays(breedingDate, getGestationDays(animal.species)),
        outcome: "Planned",
        breeding_method: "Natural",
        pregnancy_check_date: "",
        pregnancy_status: "Unknown",
        birth_date: "",
        offspring_count: "",
        birth_outcome: "",
        notes: "",
      });
      lastReproductionSignatures.current.set(res.data.id, JSON.stringify(getReproductionPayload(res.data)));
      setReproductions((current) => [res.data, ...current]);
      setSelectedReproduction(res.data);
      toast.success("Reproduction record created.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to create reproduction record.");
    } finally {
      setAddingReproduction(false);
    }
  };

  const saveReproduction = async () => {
    if (!selectedReproduction?.id) return;
    const payload = getReproductionPayload(selectedReproduction);
    const signature = JSON.stringify(payload);
    if (signature === lastReproductionSignatures.current.get(selectedReproduction.id)) return;

    try {
      setSaveStatus("saving");
      const res = await reproductionsAPI.updateReproduction(selectedReproduction.id, payload);
      lastReproductionSignatures.current.set(res.data.id, JSON.stringify(getReproductionPayload(res.data)));
      setReproductions((current) => current.map((record) => (record.id === res.data.id ? res.data : record)));
      markSaved();
    } catch (err) {
      setSaveStatus("idle");
      console.error(err);
      toast.error("Failed to save reproduction record.");
    }
  };

  const deleteReproduction = async () => {
    if (!selectedReproduction?.id || deletingReproduction) return;
    try {
      setDeletingReproduction(true);
      await reproductionsAPI.deleteReproduction(selectedReproduction.id);
      setReproductions((current) => current.filter((record) => record.id !== selectedReproduction.id));
      setSelectedReproduction(null);
      toast.success("Reproduction deleted.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete reproduction record.");
    } finally {
      setDeletingReproduction(false);
    }
  };

  const addFinance = async () => {
    if (addingFinance) return;

    try {
      setAddingFinance(true);
      const res = await premiumRecordsAPI.createFinanceRecord({
        animal_id: animal.id,
        record_date: today(),
        category: "Expense",
        amount: 0,
        vendor: "",
        notes: "",
      });
      lastFinanceSignatures.current.set(res.data.id, JSON.stringify(getFinancePayload(res.data)));
      setFinanceRecords((current) => [res.data, ...current]);
      setSelectedFinance(res.data);
      toast.success("Finance record created.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to create finance record.");
    } finally {
      setAddingFinance(false);
    }
  };

  const saveFinance = async () => {
    if (!selectedFinance?.id) return;
    const payload = getFinancePayload(selectedFinance);
    const signature = JSON.stringify(payload);
    if (signature === lastFinanceSignatures.current.get(selectedFinance.id)) return;

    try {
      setSaveStatus("saving");
      const res = await premiumRecordsAPI.updateFinanceRecord(selectedFinance.id, payload);
      lastFinanceSignatures.current.set(res.data.id, JSON.stringify(getFinancePayload(res.data)));
      setFinanceRecords((current) => current.map((record) => (record.id === res.data.id ? res.data : record)));
      markSaved();
    } catch (err) {
      setSaveStatus("idle");
      console.error(err);
      toast.error("Failed to save finance record.");
    }
  };

  const deleteFinance = async () => {
    if (!selectedFinance?.id || deletingFinance) return;
    try {
      setDeletingFinance(true);
      await premiumRecordsAPI.deleteFinanceRecord(selectedFinance.id);
      setFinanceRecords((current) => current.filter((record) => record.id !== selectedFinance.id));
      setSelectedFinance(null);
      toast.success("Finance deleted.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete finance record.");
    } finally {
      setDeletingFinance(false);
    }
  };

  const financeTotal = financeRecords.reduce((sum, record) => {
    const amount = Number.parseFloat(record.amount);
    if (!Number.isFinite(amount)) return sum;
    return record.category === "Income" ? sum + amount : sum - amount;
  }, 0);
  const vetCostTotal = vetVisits.reduce((sum, visit) => {
    const cost = Number.parseFloat(visit.cost);
    return Number.isFinite(cost) ? sum + cost : sum;
  }, 0);
  const selectedDam = animals.find((item) => String(item.id) === String(selectedReproduction?.dam_id));
  const selectedSire = animals.find((item) => String(item.id) === String(selectedReproduction?.sire_id));
  const selectedOffspring = [...birthRecords.asDam, ...birthRecords.asSire].filter((birth) => String(birth.reproduction_id) === String(selectedReproduction?.id));
  const animalParentage = birthRecords.asOffspring[0] || null;
  const currentAnimalDam = animals.find((item) => String(item.id) === String(animalDamId));
  const currentAnimalSire = animals.find((item) => String(item.id) === String(animalSireId));
  const damOptions = animals.filter((item) => canBeDam(item) || String(item.id) === String(selectedReproduction?.dam_id));
  const sireOptions = animals.filter((item) => canBeSire(item) || String(item.id) === String(selectedReproduction?.sire_id));
  const currentAnimalDamOptions = animals.filter((item) => String(item.id) !== String(animal.id) && (canBeDam(item) || String(item.id) === String(animalDamId)));
  const currentAnimalSireOptions = animals.filter((item) => String(item.id) !== String(animal.id) && (canBeSire(item) || String(item.id) === String(animalSireId)));
  const parentCards = [
    {
      key: "dam",
      label: "Dam / Mother",
      animal: selectedDam,
      fallback: "Select mother",
    },
    {
      key: "sire",
      label: "Sire / Father",
      animal: selectedSire,
      fallback: "Select father",
    },
  ];
  const setReproductionField = (field, value) => {
    setSelectedReproduction((current) => ({ ...current, [field]: value }));
  };
  const refreshBirthRecords = async () => {
    if (!animal?.id) return;
    try {
      const res = await birthsAPI.getAnimalBirths(animal.id);
      const data = res.data || {};
      setBirthRecords({
        asOffspring: Array.isArray(data.asOffspring) ? data.asOffspring : [],
        asDam: Array.isArray(data.asDam) ? data.asDam : [],
        asSire: Array.isArray(data.asSire) ? data.asSire : [],
      });
    } catch (err) {
      console.error(err);
    }
  };
  const saveAnimalParents = async () => {
    if (!animal?.id) return;

    try {
      const payload = {
        herd_id: animal.herd_id === null || animal.herd_id === undefined ? null : animal.herd_id,
        name: animal.name || "",
        species: animal.species || "",
        sex: animal.sex || "",
        birthdate: animal.birthdate ? formatDate(animal.birthdate) : null,
        age: animal.age ?? "",
        comments: animal.comments || "",
        weight: animal.weight || "",
        behavior: animal.behavior || "",
        tag_id: animal.tag_id || "",
        image_url: animal.image_url || null,
        status: animal.status || "active",
        deceased_date: animal.deceased_date ? formatDate(animal.deceased_date) : null,
        deceased_notes: animal.deceased_notes || null,
        dam_id: animalDamId || null,
        sire_id: animalSireId || null,
      };
      const signature = JSON.stringify(payload);
      if (signature === lastAnimalParentSignature.current) return;

      setSaveStatus("saving");
      const res = await updateAnimal(payload, animal.id);
      lastAnimalParentSignature.current = signature;
      onAnimalSaved?.(res.data);
      markSaved();
    } catch (err) {
      setSaveStatus("idle");
      console.error(err);
      toast.error("Failed to save animal parents.");
    }
  };
  const addOffspring = async () => {
    if (!selectedReproduction?.id || addingOffspring) return;

    const birthDate = formatDate(selectedReproduction.birth_date) || formatDate(selectedReproduction.due_date) || today();
    const species = selectedDam?.species || selectedSire?.species || animal.species || "";
    const offspringName = newOffspring.name.trim() || "New offspring";

    try {
      setAddingOffspring(true);
      const animalRes = await createAnimal({
        herd_id: animal.herd_id === null || animal.herd_id === undefined ? null : animal.herd_id,
        name: offspringName,
        species,
        sex: newOffspring.sex || "",
        birthdate: birthDate,
        age: 0,
        comments: newOffspring.birth_notes || "",
        weight: newOffspring.birth_weight || "0.00",
        behavior: "",
        tag_id: newOffspring.tag_id || "",
        status: "active",
        deceased_date: null,
        deceased_notes: null,
        dam_id: selectedReproduction.dam_id || null,
        sire_id: selectedReproduction.sire_id || null,
        birth_weight: newOffspring.birth_weight || null,
        birth_notes: newOffspring.birth_notes || "",
      });
      const createdAnimal = animalRes.data;

      await birthsAPI.createBirth({
        reproduction_id: selectedReproduction.id,
        offspring_id: createdAnimal.id,
        birth_date: birthDate,
        birth_weight: newOffspring.birth_weight || null,
        birth_notes: newOffspring.birth_notes || "",
      });

      const offspringCount = Number.parseInt(selectedReproduction.offspring_count, 10);
      const updatedReproduction = {
        ...selectedReproduction,
        birth_date: selectedReproduction.birth_date || birthDate,
        birth_outcome: selectedReproduction.birth_outcome || "Live birth",
        outcome: selectedReproduction.outcome === "Planned" || selectedReproduction.outcome === "Bred" || selectedReproduction.outcome === "Pregnant"
          ? "Birthed"
          : selectedReproduction.outcome || "Birthed",
        offspring_count: Number.isFinite(offspringCount) ? offspringCount + 1 : 1,
      };
      setSelectedReproduction(updatedReproduction);
      const res = await reproductionsAPI.updateReproduction(selectedReproduction.id, {
        dam_id: updatedReproduction.dam_id || null,
        sire_id: updatedReproduction.sire_id || null,
        breeding_date: updatedReproduction.breeding_date || null,
        due_date: updatedReproduction.due_date || null,
        outcome: updatedReproduction.outcome || "Birthed",
        breeding_method: updatedReproduction.breeding_method || "",
        pregnancy_check_date: updatedReproduction.pregnancy_check_date || null,
        pregnancy_status: updatedReproduction.pregnancy_status || "",
        birth_date: updatedReproduction.birth_date || null,
        offspring_count: updatedReproduction.offspring_count || 1,
        birth_outcome: updatedReproduction.birth_outcome || "Live birth",
        notes: updatedReproduction.notes || "",
      });
      setSelectedReproduction(res.data);
      setReproductions((current) => current.map((record) => (record.id === res.data.id ? res.data : record)));

      onAnimalSaved?.(createdAnimal);
      setNewOffspring({ name: "", tag_id: "", sex: "", birth_weight: "", birth_notes: "" });
      await refreshBirthRecords();
      toast.success("Offspring linked to this breeding.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to add offspring.");
    } finally {
      setAddingOffspring(false);
    }
  };
  const removeLinkedOffspring = async (birth) => {
    if (!birth?.id || removingOffspringId) return;

    try {
      setRemovingOffspringId(birth.id);
      if (birth.offspring_id) {
        await deleteAnimal(birth.offspring_id);
        onAnimalDeleted?.(birth.offspring_id);
      } else {
        await birthsAPI.deleteBirth(birth.id);
      }

      await refreshBirthRecords();

      const nextCount = Math.max(0, Number.parseInt(selectedReproduction.offspring_count, 10) || 0) - 1;
      const updatedReproduction = {
        ...selectedReproduction,
        offspring_count: nextCount,
      };
      setSelectedReproduction(updatedReproduction);
      const res = await reproductionsAPI.updateReproduction(selectedReproduction.id, {
        dam_id: updatedReproduction.dam_id || null,
        sire_id: updatedReproduction.sire_id || null,
        breeding_date: updatedReproduction.breeding_date || null,
        due_date: updatedReproduction.due_date || null,
        outcome: updatedReproduction.outcome || "Planned",
        breeding_method: updatedReproduction.breeding_method || "",
        pregnancy_check_date: updatedReproduction.pregnancy_check_date || null,
        pregnancy_status: updatedReproduction.pregnancy_status || "",
        birth_date: updatedReproduction.birth_date || null,
        offspring_count: nextCount,
        birth_outcome: updatedReproduction.birth_outcome || "",
        notes: updatedReproduction.notes || "",
      });
      setSelectedReproduction(res.data);
      setReproductions((current) => current.map((record) => (record.id === res.data.id ? res.data : record)));
      toast.success(birth.offspring_id ? "Offspring animal deleted." : "Stale offspring link removed.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to remove offspring.");
    } finally {
      setRemovingOffspringId(null);
    }
  };
  const estimateDueDate = () => {
    if (!selectedReproduction?.breeding_date) {
      toast.info("Set a breeding date first.");
      return;
    }

    const dam = animals.find((item) => String(item.id) === String(selectedReproduction.dam_id)) || animal;
    setReproductionField("due_date", addDays(selectedReproduction.breeding_date, getGestationDays(dam.species)));
  };

  if (view === "reproduction") {
    return (
      <div className="space-y-6">
        <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-2xl font-semibold text-white">Reproduction records</h2>
          <div className="flex flex-col gap-2 sm:min-w-48 sm:flex-row">
            <button
              onClick={addReproduction}
              disabled={addingReproduction}
              className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-wait disabled:opacity-60"
            >
              {addingReproduction ? "Adding..." : "Add breeding"}
            </button>
            <button
              type="button"
              onClick={onExportAnimal}
              disabled={exportLoading}
              className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-wait disabled:opacity-60"
            >
              {exportLoading ? "Preparing..." : "Export Animal"}
            </button>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-gray-700 bg-gray-900 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-gray-500">This animal's mother</p>
            <select
              value={animalDamId}
              onChange={(e) => setAnimalDamId(e.target.value)}
              onBlur={saveAnimalParents}
              className="mt-2 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white"
            >
              <option value="">Mother not set</option>
              {currentAnimalDamOptions.map((item) => (
                <option key={item.id} value={item.id}>{getAnimalLabel(item)} - {item.species || "Unknown"}</option>
              ))}
            </select>
            <p className="mt-1 text-sm text-gray-400">
              {currentAnimalDam ? "Saved on this animal" : animalParentage?.dam_name ? `Birth history: ${animalParentage.dam_name}` : "For this animal's own parentage"}
            </p>
          </div>
          <div className="rounded-2xl border border-gray-700 bg-gray-900 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-gray-500">This animal's father</p>
            <select
              value={animalSireId}
              onChange={(e) => setAnimalSireId(e.target.value)}
              onBlur={saveAnimalParents}
              className="mt-2 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white"
            >
              <option value="">Father not set</option>
              {currentAnimalSireOptions.map((item) => (
                <option key={item.id} value={item.id}>{getAnimalLabel(item)} - {item.species || "Unknown"}</option>
              ))}
            </select>
            <p className="mt-1 text-sm text-gray-400">
              {currentAnimalSire ? "Saved on this animal" : animalParentage?.sire_name ? `Birth history: ${animalParentage.sire_name}` : "For this animal's own parentage"}
            </p>
          </div>
          <div className="rounded-2xl border border-gray-700 bg-gray-900 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-gray-500">Reproduction records</p>
            <p className="mt-2 text-2xl font-bold text-white">{reproductions.length}</p>
            <p className="mt-1 text-sm text-gray-400">Click a record to open or close it</p>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[340px_1fr]">
          <div className="rounded-2xl border border-gray-700 bg-gray-800 p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-white">Breeding timeline</h3>
                <p className="text-sm text-gray-400">{reproductions.length} record{reproductions.length === 1 ? "" : "s"}</p>
              </div>
            </div>
            <RecordList
              title="Reproduction timeline"
              items={reproductions}
              empty="No reproduction records yet."
              selectedId={selectedReproduction?.id}
              onSelect={setSelectedReproduction}
              renderMeta={(record) => (
                <>
                  <p className="font-semibold text-white">{record.outcome || "Breeding"}</p>
                  <p className="mt-1 text-xs text-gray-400">
                    {formatDate(record.breeding_date) || "No breeding date"} - due {formatDate(record.due_date) || "not set"}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    Dam {getAnimalLabel(animals.find((item) => String(item.id) === String(record.dam_id)))} / Sire {getAnimalLabel(animals.find((item) => String(item.id) === String(record.sire_id)))}
                  </p>
                </>
              )}
            />
          </div>

          <div className="rounded-2xl border border-gray-700 bg-gray-800 p-5">
            {!selectedReproduction ? (
              <div className="rounded-xl border border-dashed border-gray-700 bg-gray-900 p-6 text-sm text-gray-400">
                Select a breeding record or add a new one.
              </div>
            ) : (
              <div className="space-y-5">
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                  {parentCards.map((card) => (
                    <div key={card.key} className="rounded-xl border border-gray-700 bg-gray-900 p-4">
                      <p className="text-xs uppercase tracking-[0.14em] text-gray-500">{card.label}</p>
                      <p className="mt-2 text-lg font-semibold text-white">{getAnimalLabel(card.animal)}</p>
                      <p className="mt-1 text-sm text-gray-400">
                        {card.animal?.species || card.fallback}
                        {card.animal?.id === animal.id ? " - this animal" : ""}
                      </p>
                    </div>
                  ))}
                  <div className="rounded-xl border border-gray-700 bg-gray-900 p-4">
                    <p className="text-xs uppercase tracking-[0.14em] text-gray-500">Status</p>
                    <p className="mt-2 text-lg font-semibold text-white">{selectedReproduction.outcome || "Planned"}</p>
                    <p className="mt-1 text-sm text-gray-400">Due {formatDate(selectedReproduction.due_date) || "not set"}</p>
                  </div>
                </div>

                <section className="rounded-xl border border-gray-700 bg-gray-900 p-4">
                  <h4 className="font-semibold text-white">Parents</h4>
                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <label className="block text-xs text-gray-400">
                      Dam / mother
                      <select value={selectedReproduction.dam_id || ""} onChange={(e) => setReproductionField("dam_id", e.target.value || null)} onBlur={saveReproduction} className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white">
                        <option value="">Select mother</option>
                        {damOptions.map((item) => <option key={item.id} value={item.id}>{getAnimalLabel(item)} - {item.species || "Unknown"}{item.id === animal.id ? " (this animal)" : ""}</option>)}
                      </select>
                    </label>
                    <label className="block text-xs text-gray-400">
                      Sire / father
                      <select value={selectedReproduction.sire_id || ""} onChange={(e) => setReproductionField("sire_id", e.target.value || null)} onBlur={saveReproduction} className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white">
                        <option value="">Select father</option>
                        {sireOptions.map((item) => <option key={item.id} value={item.id}>{getAnimalLabel(item)} - {item.species || "Unknown"}{item.id === animal.id ? " (this animal)" : ""}</option>)}
                      </select>
                    </label>
                  </div>
                </section>

                <section className="rounded-xl border border-gray-700 bg-gray-900 p-4">
                  <h4 className="font-semibold text-white">Breeding</h4>
                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
                    <label className="block text-xs text-gray-400 md:col-span-1">
                      Method
                      <select value={selectedReproduction.breeding_method || "Natural"} onChange={(e) => setReproductionField("breeding_method", e.target.value)} onBlur={saveReproduction} className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white">
                        <option>Natural</option>
                        <option>AI</option>
                        <option>Embryo transfer</option>
                        <option>Pasture exposed</option>
                        <option>Other</option>
                      </select>
                    </label>
                    <label className="block text-xs text-gray-400">
                      Breeding date
                      <input type="date" value={formatDate(selectedReproduction.breeding_date)} onChange={(e) => setReproductionField("breeding_date", e.target.value)} onBlur={saveReproduction} className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white" />
                    </label>
                    <label className="block text-xs text-gray-400">
                      Expected due date
                      <input type="date" value={formatDate(selectedReproduction.due_date)} onChange={(e) => setReproductionField("due_date", e.target.value)} onBlur={saveReproduction} className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white" />
                    </label>
                    <div className="flex items-end">
                      <button type="button" onClick={estimateDueDate} className="w-full rounded-lg border border-blue-400/40 bg-blue-500/10 px-3 py-2 text-sm font-semibold text-blue-100 hover:bg-blue-500/20">
                        Estimate due
                      </button>
                    </div>
                  </div>
                </section>

                <section className="rounded-xl border border-gray-700 bg-gray-900 p-4">
                  <h4 className="font-semibold text-white">Pregnancy and outcome</h4>
                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                    <label className="block text-xs text-gray-400">
                      Record status
                      <select value={selectedReproduction.outcome || "Planned"} onChange={(e) => setReproductionField("outcome", e.target.value)} onBlur={saveReproduction} className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white">
                        <option>Planned</option>
                        <option>Bred</option>
                        <option>Pregnant</option>
                        <option>Open</option>
                        <option>Birthed</option>
                        <option>Missed</option>
                        <option>Aborted</option>
                      </select>
                    </label>
                    <label className="block text-xs text-gray-400">
                      Pregnancy check date
                      <input type="date" value={formatDate(selectedReproduction.pregnancy_check_date)} onChange={(e) => setReproductionField("pregnancy_check_date", e.target.value)} onBlur={saveReproduction} className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white" />
                    </label>
                    <label className="block text-xs text-gray-400">
                      Pregnancy status
                      <select value={selectedReproduction.pregnancy_status || "Unknown"} onChange={(e) => setReproductionField("pregnancy_status", e.target.value)} onBlur={saveReproduction} className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white">
                        <option>Unknown</option>
                        <option>Confirmed pregnant</option>
                        <option>Open</option>
                        <option>Recheck needed</option>
                      </select>
                    </label>
                    <label className="block text-xs text-gray-400">
                      Birth date
                      <input type="date" value={formatDate(selectedReproduction.birth_date)} onChange={(e) => setReproductionField("birth_date", e.target.value)} onBlur={saveReproduction} className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white" />
                    </label>
                    <label className="block text-xs text-gray-400">
                      Offspring count
                      <input type="number" min="0" value={selectedReproduction.offspring_count || ""} onChange={(e) => setReproductionField("offspring_count", e.target.value)} onBlur={saveReproduction} className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white" />
                    </label>
                    <label className="block text-xs text-gray-400">
                      Birth outcome
                      <select value={selectedReproduction.birth_outcome || ""} onChange={(e) => setReproductionField("birth_outcome", e.target.value)} onBlur={saveReproduction} className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white">
                        <option value="">Not recorded</option>
                        <option>Live birth</option>
                        <option>Stillborn</option>
                        <option>Assisted birth</option>
                        <option>Retained</option>
                        <option>Other</option>
                      </select>
                    </label>
                  </div>
                </section>

                <section className="rounded-xl border border-gray-700 bg-gray-900 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h4 className="font-semibold text-white">Offspring from this breeding</h4>
                      <p className="mt-1 text-sm text-gray-400">Create a child animal and link it back to this dam/sire pair.</p>
                    </div>
                    <span className="rounded-lg bg-gray-800 px-3 py-1 text-xs font-semibold text-gray-300">
                      {selectedOffspring.length} linked
                    </span>
                  </div>

                  {selectedOffspring.length > 0 && (
                    <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
                      {selectedOffspring.map((birth) => (
                        <div key={birth.id} className="rounded-lg border border-gray-700 bg-gray-800 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-white">{birth.offspring_name || "Deleted offspring"}</p>
                              {!birth.offspring_id && <p className="mt-1 text-xs text-amber-200">Animal was deleted. Remove this stale link.</p>}
                            </div>
                              <button
                              type="button"
                              onClick={() => removeLinkedOffspring(birth)}
                              disabled={removingOffspringId === birth.id}
                              className="rounded-lg bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-500 disabled:cursor-wait disabled:opacity-60"
                            >
                              {removingOffspringId === birth.id ? (birth.offspring_id ? "Deleting..." : "Removing...") : birth.offspring_id ? "Delete animal" : "Remove link"}
                            </button>
                          </div>
                          <p className="mt-1 text-xs text-gray-400">
                            Born {formatDate(birth.birth_date) || "date not set"} {birth.birth_weight ? `- ${birth.birth_weight} lb` : ""}
                          </p>
                          {birth.birth_notes && <p className="mt-2 text-xs text-gray-400">{birth.birth_notes}</p>}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-5">
                    <label className="block text-xs text-gray-400 md:col-span-2">
                      Offspring name
                      <input
                        value={newOffspring.name}
                        onChange={(e) => setNewOffspring((current) => ({ ...current, name: e.target.value }))}
                        placeholder="Calf, lamb, kid..."
                        className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white"
                      />
                    </label>
                    <label className="block text-xs text-gray-400">
                      Tag
                      <input
                        value={newOffspring.tag_id}
                        onChange={(e) => setNewOffspring((current) => ({ ...current, tag_id: e.target.value }))}
                        placeholder="Tag"
                        className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white"
                      />
                    </label>
                    <label className="block text-xs text-gray-400">
                      Sex
                      <select
                        value={newOffspring.sex}
                        onChange={(e) => setNewOffspring((current) => ({ ...current, sex: e.target.value }))}
                        className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white"
                      >
                        <option value="">Unknown</option>
                        <option>Male</option>
                        <option>Female</option>
                      </select>
                    </label>
                    <label className="block text-xs text-gray-400">
                      Birth weight
                      <input
                        type="number"
                        step="0.01"
                        value={newOffspring.birth_weight}
                        onChange={(e) => setNewOffspring((current) => ({ ...current, birth_weight: e.target.value }))}
                        placeholder="0.00"
                        className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white"
                      />
                    </label>
                  </div>
                  <textarea
                    rows="3"
                    value={newOffspring.birth_notes}
                    onChange={(e) => setNewOffspring((current) => ({ ...current, birth_notes: e.target.value }))}
                    placeholder="Birth notes, markings, condition, twin info, or keep/cull notes."
                    className="mt-4 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white"
                  />
                  <button
                    type="button"
                    onClick={addOffspring}
                    disabled={addingOffspring || (!selectedReproduction.dam_id && !selectedReproduction.sire_id)}
                    className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {addingOffspring ? "Adding..." : "Add linked offspring"}
                  </button>
                </section>

                <section className="rounded-xl border border-gray-700 bg-gray-900 p-4">
                  <h4 className="font-semibold text-white">Farm notes</h4>
                  <textarea rows="5" value={selectedReproduction.notes || ""} onChange={(e) => setReproductionField("notes", e.target.value)} onBlur={saveReproduction} placeholder="Heat signs, bull exposure dates, AI straw info, vet notes, complications, or weaning follow-up." className="mt-4 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white" />
                </section>

                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                    saveStatus === "saved" ? "bg-emerald-500/15 text-emerald-200" : "bg-gray-700 text-gray-300"
                  }`}>{saveBadgeText}</span>
                  <button
                    onClick={deleteReproduction}
                    disabled={deletingReproduction}
                    className="rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:cursor-wait disabled:opacity-60"
                  >
                    {deletingReproduction ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
        <ToastContainer autoClose="1000" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-white">Money</h2>
      </div>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-gray-700 bg-gray-900 p-5">
          <p className="text-xs uppercase tracking-[0.14em] text-gray-500">Finance net</p>
          <p className={`mt-3 text-3xl font-bold ${financeTotal < 0 ? "text-red-200" : "text-emerald-200"}`}>{money(financeTotal)}</p>
        </div>
        <div className="rounded-2xl border border-gray-700 bg-gray-900 p-5">
          <p className="text-xs uppercase tracking-[0.14em] text-gray-500">Vet visit cost</p>
          <p className="mt-3 text-3xl font-bold text-white">{money(vetCostTotal)}</p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_420px]">
        <div className="rounded-2xl border border-gray-700 bg-gray-800 p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-white">Finances</h3>
            <button
              onClick={addFinance}
              disabled={addingFinance}
              className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-wait disabled:opacity-60"
            >
              {addingFinance ? "Adding..." : "Add"}
            </button>
          </div>
          <RecordList title="Ledger" items={financeRecords} empty="No finance records yet." selectedId={selectedFinance?.id} onSelect={setSelectedFinance} renderMeta={(record) => (
            <>
              <p className="font-semibold text-white">{record.category || "Expense"} - {money(record.amount)}</p>
              <p className="mt-1 text-xs text-gray-400">{formatDate(record.record_date) || "No date"} {record.vendor ? `- ${record.vendor}` : ""}</p>
            </>
          )} />
          {selectedFinance && (
            <div className="mt-4 space-y-3 rounded-xl border border-gray-700 bg-gray-900 p-4">
              <input type="date" value={formatDate(selectedFinance.record_date)} onChange={(e) => setSelectedFinance({ ...selectedFinance, record_date: e.target.value })} onBlur={saveFinance} className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white" />
              <select value={selectedFinance.category || "Expense"} onChange={(e) => setSelectedFinance({ ...selectedFinance, category: e.target.value })} onBlur={saveFinance} className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white">
                <option>Expense</option>
                <option>Income</option>
              </select>
              <input type="number" step="0.01" value={selectedFinance.amount || ""} onChange={(e) => setSelectedFinance({ ...selectedFinance, amount: e.target.value })} onBlur={saveFinance} placeholder="Amount" className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white" />
              <input value={selectedFinance.vendor || ""} onChange={(e) => setSelectedFinance({ ...selectedFinance, vendor: e.target.value })} onBlur={saveFinance} placeholder="Vendor or buyer" className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white" />
              <textarea rows="3" value={selectedFinance.notes || ""} onChange={(e) => setSelectedFinance({ ...selectedFinance, notes: e.target.value })} onBlur={saveFinance} placeholder="Notes" className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white" />
              <div className="flex items-center gap-2">
                <span className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                  saveStatus === "saved" ? "bg-emerald-500/15 text-emerald-200" : "bg-gray-700 text-gray-300"
                }`}>{saveBadgeText}</span>
                <button
                  onClick={deleteFinance}
                  disabled={deletingFinance}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:cursor-wait disabled:opacity-60"
                >
                  {deletingFinance ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-gray-700 bg-gray-800 p-5">
          <h3 className="text-lg font-semibold text-white">Vet visit costs</h3>
          <p className="mt-1 text-sm text-gray-400">Costs entered in Vet Visits are included here automatically.</p>
          <div className="mt-4 space-y-2">
            {vetVisits.filter((visit) => Number.parseFloat(visit.cost) > 0).length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-700 bg-gray-900 p-4 text-sm text-gray-400">No vet visit costs recorded yet.</div>
            ) : (
              vetVisits
                .filter((visit) => Number.parseFloat(visit.cost) > 0)
                .map((visit) => (
                  <div key={visit.id} className="rounded-xl border border-gray-700 bg-gray-900 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-white">{visit.reason || "Vet visit"}</p>
                      <p className="font-semibold text-white">{money(visit.cost)}</p>
                    </div>
                    <p className="mt-1 text-xs text-gray-400">{formatDate(visit.visit_date)} {visit.vet_name ? `- ${visit.vet_name}` : ""}</p>
                  </div>
                ))
            )}
          </div>
        </div>
      </section>
      <ToastContainer autoClose="1000" />
    </div>
  );
}
