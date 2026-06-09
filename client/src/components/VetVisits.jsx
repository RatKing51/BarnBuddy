import React, { useEffect, useMemo, useRef, useState } from "react";
import { getVetVisitsForAnimal, createVetVisit, updateVetVisit, deleteVetVisit } from "../api/vetVisits";
import { toast, ToastContainer } from "react-toastify";

const emptyVisit = (animalId) => ({
  animal_id: animalId,
  vet_name: "",
  visit_date: new Date().toISOString().split("T")[0],
  reason: "",
  treatment: "",
  medications: "",
  follow_up_date: "",
  cost: "",
  notes: "",
  completed: false,
  visit_completed: false,
  follow_up_completed: false,
});

function SkeletonBlock({ className = "" }) {
  return <div className={`animate-pulse rounded-lg bg-gray-700/70 ${className}`} />;
}

function VetVisitsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(280px,360px)_1fr]" aria-busy="true">
      <aside className="space-y-4">
        <div className="rounded-2xl border border-gray-700 bg-gray-800 p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <SkeletonBlock className="h-5 w-28" />
              <SkeletonBlock className="h-4 w-44" />
            </div>
            <SkeletonBlock className="h-9 w-16" />
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2">
            {[0, 1, 2].map((item) => (
              <div key={item} className="rounded-lg bg-gray-700/50 p-3">
                <SkeletonBlock className="h-6 w-8" />
                <SkeletonBlock className="mt-2 h-3 w-12" />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-700 bg-gray-800 p-4">
          <div className="grid grid-cols-3 gap-2">
            {[0, 1, 2].map((item) => (
              <SkeletonBlock key={item} className="h-10 w-full" />
            ))}
          </div>
        </div>
      </aside>

      <section className="rounded-2xl border border-gray-700 bg-gray-800 p-5">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div className="space-y-2">
            <SkeletonBlock className="h-5 w-40" />
            <SkeletonBlock className="h-4 w-64" />
          </div>
          <SkeletonBlock className="h-8 w-24" />
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="rounded-xl border border-gray-700 bg-gray-900/70 p-4">
              <div className="mb-4 flex justify-between gap-4">
                <SkeletonBlock className="h-5 w-32" />
                <SkeletonBlock className="h-6 w-20 rounded-full" />
              </div>
              <SkeletonBlock className="h-4 w-full" />
              <SkeletonBlock className="mt-3 h-4 w-3/4" />
              <SkeletonBlock className="mt-5 h-9 w-full" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default function VetVisits({ animal, onVetVisitUpdate }) {
  const [visits, setVisits] = useState([]);
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingVisit, setDeletingVisit] = useState(false);
  const [saveStatus, setSaveStatus] = useState("idle");
  const lastVisitSignatures = useRef(new Map());
  const saveStatusTimer = useRef(null);

  useEffect(() => {
    if (animal?.id) {
      fetchVisits();
    }
  }, [animal]);

  useEffect(() => () => {
    if (saveStatusTimer.current) clearTimeout(saveStatusTimer.current);
  }, []);

  const markSaved = () => {
    setSaveStatus("saved");
    if (saveStatusTimer.current) clearTimeout(saveStatusTimer.current);
    saveStatusTimer.current = setTimeout(() => setSaveStatus("idle"), 1600);
  };

  const parseLocalDate = (value) => {
    if (!value) return null;
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year, month, day] = value.split("-").map(Number);
      return new Date(year, month - 1, day);
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const normalizeDate = (value) => {
    const date = parseLocalDate(value);
    if (!date) return "";
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  };

  const normalizeVisit = (visit) => ({
    ...visit,
    visit_date: normalizeDate(visit.visit_date),
    follow_up_date: normalizeDate(visit.follow_up_date),
    completed: Boolean(visit.completed),
    visit_completed: Boolean(visit.visit_completed || visit.completed),
    follow_up_completed: Boolean(visit.follow_up_completed || visit.completed),
  });

  const formatDate = (dateValue) => {
    const date = parseLocalDate(dateValue);
    if (!date) return "No date";
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getDateOnly = (value) => {
    const date = parseLocalDate(value);
    if (!date) return null;
    date.setHours(0, 0, 0, 0);
    return date;
  };

  const getVisitStatus = (visit) => {
    const today = getDateOnly(new Date());
    const visitDate = getDateOnly(visit.visit_date);
    const followUpDate = getDateOnly(visit.follow_up_date);

    const visitDone = Boolean(visit.visit_completed || visit.completed);
    const followUpDone = Boolean(visit.follow_up_completed || visit.completed);

    if (visitDone && (!visit.follow_up_date || followUpDone)) {
      return {
        label: "Complete",
        tone: "green",
        dateLabel: "Visit date",
        displayDate: visit.visit_date,
      };
    }

    if (visitDate && visitDate < today && !visitDone) {
      return {
        label: "Overdue",
        tone: "red",
        dateLabel: "Visit date",
        displayDate: visit.visit_date,
      };
    }

    if (visitDate && visitDate > today && !visitDone) {
      return {
        label: "Upcoming",
        tone: "blue",
        dateLabel: "Visit date",
        displayDate: visit.visit_date,
      };
    }

    if (followUpDate && followUpDate < today && !followUpDone) {
      return {
        label: "Follow-up due",
        tone: "red",
        dateLabel: "Follow-up date",
        displayDate: visit.follow_up_date,
      };
    }

    if (followUpDate && followUpDate >= today && !followUpDone) {
      return {
        label: "Follow-up",
        tone: "amber",
        dateLabel: "Follow-up date",
        displayDate: visit.follow_up_date,
      };
    }

    return {
      label: "Complete",
      tone: "green",
      dateLabel: "Visit date",
      displayDate: visit.visit_date,
    };
  };

  const fetchVisits = async () => {
    setLoading(true);
    try {
      const response = await getVetVisitsForAnimal(animal.id);
      const normalizedVisits = Array.isArray(response.data) ? response.data.map(normalizeVisit) : [];
      const sorted = normalizedVisits.sort((a, b) => {
        const aDate = getDateOnly(a.visit_date)?.getTime() || 0;
        const bDate = getDateOnly(b.visit_date)?.getTime() || 0;
        return bDate - aDate;
      });

      setVisits(sorted);
      setSelectedVisit(sorted[0] || emptyVisit(animal.id));
      lastVisitSignatures.current = new Map(sorted.map((visit) => [visit.id, JSON.stringify(getVisitPayload(visit))]));
    } catch (error) {
      console.error("Error fetching vet visits:", error);
      toast.error("Failed to load vet visits. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  };

  const hasVisitData = (visit) => {
    if (!visit) return false;
    return Boolean(
      visit.vet_name?.trim() ||
      visit.reason?.trim() ||
      visit.treatment?.trim() ||
      visit.medications?.trim() ||
      visit.follow_up_date ||
      visit.cost ||
      visit.notes?.trim() ||
      visit.visit_date
    );
  };

  const getVisitPayload = (visit) => ({
    ...visit,
    visit_date: visit.visit_date || null,
    follow_up_date: visit.follow_up_date || null,
  });

  const handleAddVisit = () => {
    setSelectedVisit(emptyVisit(animal.id));
  };

  const handleSelectVisit = (visit) => {
    setSelectedVisit(normalizeVisit(visit));
  };

  const handleInputChange = (field, value) => {
    setSelectedVisit((current) => ({ ...current, [field]: value }));
  };

  const saveVisit = async (visitToSave = selectedVisit) => {
    if (!visitToSave || (!visitToSave.id && !hasVisitData(visitToSave))) return;

    const payload = getVisitPayload(visitToSave);
    const signature = JSON.stringify(payload);
    if (visitToSave.id && signature === lastVisitSignatures.current.get(visitToSave.id)) return;

    setSaving(true);
    setSaveStatus("saving");
    try {
      if (visitToSave.id) {
        const response = await updateVetVisit(visitToSave.id, payload);
        const normalizedVisit = normalizeVisit(response.data);
        lastVisitSignatures.current.set(normalizedVisit.id, JSON.stringify(getVisitPayload(normalizedVisit)));
        setVisits((current) => current.map((visit) => (visit.id === visitToSave.id ? normalizedVisit : visit)));
        setSelectedVisit(normalizedVisit);
      } else {
        const response = await createVetVisit(payload);
        const normalizedVisit = normalizeVisit(response.data);
        lastVisitSignatures.current.set(normalizedVisit.id, JSON.stringify(getVisitPayload(normalizedVisit)));
        setVisits((current) => [normalizedVisit, ...current]);
        setSelectedVisit(normalizedVisit);
        toast.success("Vet visit added.");
      }
      markSaved();
      onVetVisitUpdate?.();
    } catch (error) {
      setSaveStatus("idle");
      console.error("Error saving vet visit:", error);
      toast.error("Failed to save vet visit. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleBlurSave = () => {
    saveVisit();
  };

  const handleDeleteVisit = async () => {
    if (!selectedVisit || deletingVisit) return;

    if (!selectedVisit.id) {
      setSelectedVisit(visits[0] || emptyVisit(animal.id));
      return;
    }

    try {
      setDeletingVisit(true);
      await deleteVetVisit(selectedVisit.id);
      const remainingVisits = visits.filter((visit) => visit.id !== selectedVisit.id);
      setVisits(remainingVisits);
      setSelectedVisit(remainingVisits[0] || emptyVisit(animal.id));
      toast.success("Vet visit deleted.");
      onVetVisitUpdate?.();
    } catch (error) {
      console.error("Error deleting vet visit:", error);
      toast.error("Failed to delete vet visit. Please try again.");
    } finally {
      setDeletingVisit(false);
    }
  };

  const visitGroups = useMemo(() => {
    const today = getDateOnly(new Date());
    const nextTenDays = new Date(today);
    nextTenDays.setDate(today.getDate() + 10);

    const upcoming = [];
    const followUps = [];
    const past = [];

    visits.forEach((visit) => {
      const visitDate = getDateOnly(visit.visit_date);
      const followUpDate = getDateOnly(visit.follow_up_date);

      const visitDone = Boolean(visit.visit_completed || visit.completed);
      const followUpDone = Boolean(visit.follow_up_completed || visit.completed);

      if (visitDone && (!visit.follow_up_date || followUpDone)) {
        past.push(visit);
      } else if (visitDate && visitDate > today && visitDate <= nextTenDays && !visitDone) {
        upcoming.push(visit);
      } else if (followUpDate && followUpDate >= today && followUpDate <= nextTenDays && !followUpDone) {
        followUps.push(visit);
      } else if (!visitDate || visitDate <= today) {
        past.push(visit);
      }
    });

    return { upcoming, followUps, past };
  }, [visits]);

  const filteredVisits = useMemo(() => {
    if (filter === "upcoming") return [...visitGroups.upcoming, ...visitGroups.followUps];
    if (filter === "past") return visitGroups.past;
    return visits;
  }, [filter, visitGroups, visits]);

  const fieldClass =
    "w-full bg-gray-700 text-gray-100 border border-gray-600 rounded-lg px-3 py-3 text-base outline-none focus:border-blue-400";

  if (loading) {
    return <VetVisitsSkeleton />;
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(280px,360px)_1fr] gap-6">
      <aside className="space-y-4">
        <div className="rounded-2xl border border-gray-700 bg-gray-800 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-white">Vet Visits</h3>
              <p className="mt-1 text-sm text-gray-400">{animal?.name || "This animal"} care timeline</p>
            </div>
            <button
              onClick={handleAddVisit}
              className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500"
            >
              + Add
            </button>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2">
            <div className="rounded-lg bg-gray-700 p-3">
              <p className="text-xl font-bold text-white">{visits.length}</p>
              <p className="text-xs text-gray-400">Total</p>
            </div>
            <div className="rounded-lg bg-blue-500/15 p-3">
              <p className="text-xl font-bold text-white">{visitGroups.upcoming.length}</p>
              <p className="text-xs text-blue-200">Visits</p>
            </div>
            <div className="rounded-lg bg-amber-500/15 p-3">
              <p className="text-xl font-bold text-white">{visitGroups.followUps.length}</p>
              <p className="text-xs text-amber-200">Follow-ups</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-700 bg-gray-800 p-4">
          <div className="grid grid-cols-3 gap-2">
            {[
              ["all", "All"],
              ["upcoming", "Soon"],
              ["past", "Past"],
            ].map(([value, label]) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  filter === value ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="mt-4 max-h-[32rem] space-y-2 overflow-y-auto pr-1">
            {filteredVisits.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-600 p-5 text-center text-sm text-gray-400">
                No visits in this view.
              </div>
            ) : (
              filteredVisits.map((visit) => {
                const status = getVisitStatus(visit);
                const isSelected = visit.id && visit.id === selectedVisit?.id;

                return (
                  <button
                    key={visit.id}
                    onClick={() => handleSelectVisit(visit)}
                    className={`w-full rounded-xl border p-4 text-left transition ${
                      isSelected
                        ? "border-blue-400 bg-blue-600/22"
                        : "border-gray-700 bg-gray-700/70 hover:border-gray-500 hover:bg-gray-700"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-white">{visit.reason || "Vet visit"}</p>
                      <span
                        className={`rounded-full px-2 py-1 text-xs ${
                          status.tone === "blue"
                            ? "bg-blue-400/15 text-blue-100"
                            : status.tone === "amber"
                            ? "bg-amber-400/15 text-amber-100"
                            : status.tone === "red"
                            ? "bg-red-400/15 text-red-100"
                            : "bg-green-400/15 text-green-100"
                        }`}
                      >
                        {status.label}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-gray-300">
                      {status.dateLabel}: {formatDate(status.displayDate)}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">{visit.vet_name || "No vet name yet"}</p>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </aside>

      <section className="rounded-2xl border border-gray-700 bg-gray-800 p-5 sm:p-6">
        {selectedVisit ? (
          <>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-blue-300">
                  {selectedVisit.id ? "Edit visit" : "New visit"}
                </p>
                <h3 className="mt-1 text-2xl font-semibold text-white">
                  {selectedVisit.reason || "Vet visit details"}
                </h3>
                <p className="mt-1 text-sm text-gray-400">
                  Add the basics first. Extra notes can come later.
                </p>
              </div>
              <div className="flex gap-2">
                {selectedVisit?.id && (
                  <button
                    onClick={handleDeleteVisit}
                    disabled={deletingVisit}
                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:cursor-wait disabled:opacity-60"
                  >
                    {deletingVisit ? "Deleting..." : "Delete"}
                  </button>
                )}
                <span className="rounded-lg bg-gray-700 px-4 py-2 text-sm font-semibold text-gray-300">
                  {saving || saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? "Saved" : "Auto-saves"}
                </span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
              <label className="block">
                <div className="mb-1 flex items-center justify-between gap-3">
                  <span className="block text-sm text-gray-400">Visit date</span>
                  <span className="flex items-center gap-2 text-xs text-gray-300">
                    Done
                    <input
                      type="checkbox"
                      checked={Boolean(selectedVisit.visit_completed || selectedVisit.completed)}
                      onChange={(e) => {
                        const updatedVisit = { ...selectedVisit, visit_completed: e.target.checked };
                        setSelectedVisit(updatedVisit);
                        saveVisit(updatedVisit);
                      }}
                      className="h-4 w-4 accent-blue-600"
                    />
                  </span>
                </div>
                <input type="date" value={selectedVisit.visit_date || ""} onChange={(e) => handleInputChange("visit_date", e.target.value)} onBlur={handleBlurSave} className={fieldClass} />
              </label>

              <label className="block">
                <div className="mb-1 flex items-center justify-between gap-3">
                  <span className="block text-sm text-gray-400">Follow-up date</span>
                  <span className="flex items-center gap-2 text-xs text-gray-300">
                    Done
                    <input
                      type="checkbox"
                      checked={Boolean(selectedVisit.follow_up_completed || selectedVisit.completed)}
                      onChange={(e) => {
                        const updatedVisit = { ...selectedVisit, follow_up_completed: e.target.checked };
                        setSelectedVisit(updatedVisit);
                        saveVisit(updatedVisit);
                      }}
                      className="h-4 w-4 accent-blue-600"
                    />
                  </span>
                </div>
                <input type="date" value={selectedVisit.follow_up_date || ""} onChange={(e) => handleInputChange("follow_up_date", e.target.value)} onBlur={handleBlurSave} className={fieldClass} />
              </label>

              <label className="block">
                <span className="block text-sm text-gray-400 mb-1">Vet name</span>
                <input
                  value={selectedVisit.vet_name || ""}
                  onChange={(e) => handleInputChange("vet_name", e.target.value)}
                  onBlur={handleBlurSave}
                  placeholder="Dr. Smith"
                  className={fieldClass}
                />
              </label>

              <label className="block">
                <span className="block text-sm text-gray-400 mb-1">Cost</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={selectedVisit.cost || ""}
                  onChange={(e) => handleInputChange("cost", e.target.value)}
                  onBlur={handleBlurSave}
                  placeholder="0.00"
                  className={fieldClass}
                />
              </label>

              <label className="block lg:col-span-2">
                <span className="block text-sm text-gray-400 mb-1">Reason</span>
                <input
                  value={selectedVisit.reason || ""}
                  onChange={(e) => handleInputChange("reason", e.target.value)}
                  onBlur={handleBlurSave}
                  placeholder="Checkup, injury, pregnancy check..."
                  className={fieldClass}
                />
              </label>

              <label className="block">
                <span className="block text-sm text-gray-400 mb-1">Treatment</span>
                <textarea
                  value={selectedVisit.treatment || ""}
                  onChange={(e) => handleInputChange("treatment", e.target.value)}
                  onBlur={handleBlurSave}
                  placeholder="What did the vet do?"
                  className={`${fieldClass} min-h-32`}
                />
              </label>

              <label className="block">
                <span className="block text-sm text-gray-400 mb-1">Medications</span>
                <textarea
                  value={selectedVisit.medications || ""}
                  onChange={(e) => handleInputChange("medications", e.target.value)}
                  onBlur={handleBlurSave}
                  placeholder="Medication name, dosage, withdrawal notes..."
                  className={`${fieldClass} min-h-32`}
                />
              </label>

              <label className="block lg:col-span-2">
                <span className="block text-sm text-gray-400 mb-1">Notes</span>
                <textarea
                  value={selectedVisit.notes || ""}
                  onChange={(e) => handleInputChange("notes", e.target.value)}
                  onBlur={handleBlurSave}
                  placeholder="Anything else to remember about this visit."
                  className={`${fieldClass} min-h-32`}
                />
              </label>
            </div>
          </>
        ) : (
          <div className="flex min-h-96 flex-col items-center justify-center rounded-xl border border-dashed border-gray-600 p-8 text-center">
            <h3 className="text-xl font-semibold text-white">No vet visit selected</h3>
            <p className="mt-2 max-w-md text-sm text-gray-400">
              Select a visit from the timeline or add a new one to start tracking care.
            </p>
            <button
              onClick={handleAddVisit}
              className="mt-5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
            >
              Add first visit
            </button>
          </div>
        )}
      </section>

      <ToastContainer autoClose="1000" />
    </div>
  );
}
