import React, { useMemo, useState } from "react";
import { toast } from "react-toastify";
import * as healthEventsAPI from "../api/healthEvents";
import * as vaccinationsAPI from "../api/vaccinations";

function today() {
  return new Date().toISOString().slice(0, 10);
}

const initialVaccination = () => ({
  vaccine_name: "",
  date_given: today(),
  next_due_date: "",
  dosage: "",
  notes: "",
});

const initialHealthEvent = () => ({
  event_date: today(),
  type: "Treatment",
  description: "",
  severity: "Low",
  resolved: false,
  notes: "",
});

export default function BulkEntry({
  animals = [],
  selectedHerd,
  primaryAnimalIdentifier = "name",
  onSaved,
}) {
  const availableAnimals = useMemo(
    () => animals.filter((animal) => animal.status !== "deceased"),
    [animals]
  );
  const [recordType, setRecordType] = useState("vaccination");
  const [selectedIds, setSelectedIds] = useState([]);
  const [search, setSearch] = useState("");
  const [vaccination, setVaccination] = useState(initialVaccination);
  const [healthEvent, setHealthEvent] = useState(initialHealthEvent);
  const [saving, setSaving] = useState(false);

  const filteredAnimals = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return availableAnimals;
    return availableAnimals.filter((animal) =>
      [animal.name, animal.tag_id, animal.species]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [availableAnimals, search]);

  const getPrimaryLabel = (animal) =>
    primaryAnimalIdentifier === "tag"
      ? animal.tag_id || animal.name || "Unnamed animal"
      : animal.name || animal.tag_id || "Unnamed animal";

  const getSecondaryLabel = (animal) =>
    primaryAnimalIdentifier === "tag"
      ? animal.name || "Name not set"
      : animal.tag_id || "Tag not set";

  const toggleAnimal = (animalId) => {
    setSelectedIds((current) =>
      current.includes(animalId)
        ? current.filter((id) => id !== animalId)
        : [...current, animalId]
    );
  };

  const selectVisible = () => {
    const visibleIds = filteredAnimals.map((animal) => animal.id);
    setSelectedIds((current) => [...new Set([...current, ...visibleIds])]);
  };

  const clearSelection = () => setSelectedIds([]);

  const submit = async (event) => {
    event.preventDefault();
    if (!selectedIds.length) {
      toast.error("Select at least one animal.");
      return;
    }

    try {
      setSaving(true);
      const response =
        recordType === "vaccination"
          ? await vaccinationsAPI.createBulkVaccinations({
              animal_ids: selectedIds,
              ...vaccination,
            })
          : await healthEventsAPI.createBulkHealthEvents({
              animal_ids: selectedIds,
              ...healthEvent,
            });

      const count = response.data?.count || selectedIds.length;
      toast.success(`${recordType === "vaccination" ? "Vaccination" : "Health event"} added to ${count} animal${count === 1 ? "" : "s"}.`);
      if (recordType === "vaccination") setVaccination(initialVaccination());
      else setHealthEvent(initialHealthEvent());
      setSelectedIds([]);
      onSaved?.();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || "Bulk entry failed.");
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-400";

  return (
    <div className="space-y-3 sm:space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-blue-300 sm:text-sm sm:normal-case sm:tracking-normal">
          {selectedHerd?.name || "Current herd"}
        </p>
        <h2 className="mt-1 text-xl font-semibold text-white sm:text-2xl">Bulk entry</h2>
      </div>

      <form onSubmit={submit} className="grid grid-cols-1 gap-3 sm:gap-5 xl:grid-cols-[360px_1fr]">
        <section className="rounded-2xl border border-gray-700 bg-gray-800 p-3 sm:p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold text-white">Choose animals</h3>
            <span className="rounded-full bg-blue-500/15 px-3 py-1 text-xs font-semibold text-blue-100">
              {selectedIds.length} selected
            </span>
          </div>

          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, tag, or species"
            className={`${inputClass} mt-4`}
          />

          <div className="mt-2.5 grid grid-cols-2 gap-2 sm:flex">
            <button type="button" onClick={selectVisible} className="rounded-lg border border-gray-600 px-2 py-2 text-xs font-semibold text-gray-200 hover:bg-gray-700 sm:px-3">
              Select visible
            </button>
            <button type="button" onClick={clearSelection} className="rounded-lg border border-gray-600 px-2 py-2 text-xs font-semibold text-gray-200 hover:bg-gray-700 sm:px-3">
              Clear
            </button>
          </div>

          <div className="mt-3 max-h-[300px] space-y-1.5 overflow-y-auto pr-1 sm:mt-4 sm:max-h-[480px] sm:space-y-2">
            {filteredAnimals.length ? (
              filteredAnimals.map((animal) => (
                <label
                  key={animal.id}
                  className={`flex cursor-pointer items-start gap-2.5 rounded-xl border p-2.5 transition sm:gap-3 sm:p-3 ${
                    selectedIds.includes(animal.id)
                      ? "border-blue-400 bg-blue-500/15"
                      : "border-gray-700 bg-gray-900 hover:border-gray-500"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(animal.id)}
                    onChange={() => toggleAnimal(animal.id)}
                    className="mt-1 h-4 w-4 accent-blue-500"
                  />
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-white">{getPrimaryLabel(animal)}</span>
                    <span className="mt-1 block truncate text-xs text-gray-400">
                      {animal.species || "Unknown species"} - {getSecondaryLabel(animal)}
                    </span>
                  </span>
                </label>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-gray-700 p-4 text-sm text-gray-400">
                No active animals match this search.
              </div>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-gray-700 bg-gray-800 p-3 sm:p-5">
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-gray-900 p-1">
            {[
              ["vaccination", "Vaccination"],
              ["health", "Health event"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setRecordType(value)}
                className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                  recordType === value ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {recordType === "vaccination" ? (
            <div className="mt-4 grid grid-cols-1 gap-3 sm:mt-5 sm:gap-4 md:grid-cols-2">
              <label className="text-xs text-gray-400">
                Vaccine name
                <input required value={vaccination.vaccine_name} onChange={(e) => setVaccination({ ...vaccination, vaccine_name: e.target.value })} placeholder="Example: CDT" className={inputClass} />
              </label>
              <label className="text-xs text-gray-400">
                Date given
                <input required type="date" value={vaccination.date_given} onChange={(e) => setVaccination({ ...vaccination, date_given: e.target.value })} className={inputClass} />
              </label>
              <label className="text-xs text-gray-400">
                Next due date
                <input type="date" value={vaccination.next_due_date} onChange={(e) => setVaccination({ ...vaccination, next_due_date: e.target.value })} className={inputClass} />
              </label>
              <label className="text-xs text-gray-400">
                Dosage
                <input value={vaccination.dosage} onChange={(e) => setVaccination({ ...vaccination, dosage: e.target.value })} placeholder="Example: 2 mL" className={inputClass} />
              </label>
              <label className="text-xs text-gray-400 md:col-span-2">
                Notes
                <textarea rows="3" value={vaccination.notes} onChange={(e) => setVaccination({ ...vaccination, notes: e.target.value })} placeholder="Lot number, injection location, or other notes" className={inputClass} />
              </label>
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-3 sm:mt-5 sm:gap-4 md:grid-cols-2">
              <label className="text-xs text-gray-400">
                Event type
                <select value={healthEvent.type} onChange={(e) => setHealthEvent({ ...healthEvent, type: e.target.value })} className={inputClass}>
                  <option>Treatment</option>
                  <option>Checkup</option>
                  <option>Medication</option>
                  <option>Injury</option>
                  <option>Illness</option>
                  <option>Procedure</option>
                  <option>Other</option>
                </select>
              </label>
              <label className="text-xs text-gray-400">
                Event date
                <input required type="date" value={healthEvent.event_date} onChange={(e) => setHealthEvent({ ...healthEvent, event_date: e.target.value })} className={inputClass} />
              </label>
              <label className="text-xs text-gray-400">
                Severity
                <select value={healthEvent.severity} onChange={(e) => setHealthEvent({ ...healthEvent, severity: e.target.value })} className={inputClass}>
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                </select>
              </label>
              <label className="flex items-end gap-3 rounded-lg border border-gray-700 bg-gray-900 px-3 py-2.5 text-sm text-gray-300">
                <input type="checkbox" checked={healthEvent.resolved} onChange={(e) => setHealthEvent({ ...healthEvent, resolved: e.target.checked })} className="h-4 w-4 accent-blue-500" />
                Mark resolved
              </label>
              <label className="text-xs text-gray-400 md:col-span-2">
                Description
                <input value={healthEvent.description} onChange={(e) => setHealthEvent({ ...healthEvent, description: e.target.value })} placeholder="What was observed or performed?" className={inputClass} />
              </label>
              <label className="text-xs text-gray-400 md:col-span-2">
                Notes
                <textarea rows="3" value={healthEvent.notes} onChange={(e) => setHealthEvent({ ...healthEvent, notes: e.target.value })} placeholder="Medication, dosage, follow-up, or other details" className={inputClass} />
              </label>
            </div>
          )}

          <div className="mt-4 flex flex-col gap-2 rounded-xl border border-gray-700 bg-gray-900 p-3 sm:mt-6 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:p-4">
            <p className="text-xs text-gray-400 sm:text-sm">
              This will create {selectedIds.length} separate record{selectedIds.length === 1 ? "" : "s"}.
            </p>
            <button
              type="submit"
              disabled={saving || !selectedIds.length}
              className="w-full rounded-lg bg-blue-600 px-5 py-2.5 font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {saving ? "Saving..." : `Add to ${selectedIds.length || 0} animal${selectedIds.length === 1 ? "" : "s"}`}
            </button>
          </div>
        </section>
      </form>
    </div>
  );
}
