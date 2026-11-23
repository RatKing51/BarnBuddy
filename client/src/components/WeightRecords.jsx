import React, { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { toast } from "react-toastify";
import * as weightRecordsAPI from "../api/weightRecords";
import { SkeletonBlock } from "./LoadingSpinner";
import { getAnimalByID } from "../api/animal";
import { getAnimalIdentifiers } from "../utils/animalCare";
import { MobileIcon, MobileRow, MobileSheet } from "./MobileDashboard";

const getTodayDate = () => new Date().toLocaleDateString("sv-SE");
const mobileQuery = "(max-width: 1023px)";
const isMobileViewport = () => window.matchMedia(mobileQuery).matches;

function subscribeToViewport(onChange) {
  const query = window.matchMedia(mobileQuery);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function weightInUnit(record, unit) {
  const weight = Number.parseFloat(record.weight);
  if (record.unit === unit) return weight;
  return unit === "lb" ? weight / 0.45359237 : weight * 0.45359237;
}

function normalizeRecord(record) {
  return {
    id: record.id,
    recorded_date: record.recorded_date ? record.recorded_date.slice(0, 10) : getTodayDate(),
    weight: record.weight === null || record.weight === undefined ? "" : String(record.weight),
    unit: record.unit || "lb",
    notes: record.notes || "",
  };
}

function getRecordPayload(record) {
  return {
    recorded_date: record.recorded_date || getTodayDate(),
    weight: record.weight,
    unit: record.unit || "lb",
    notes: record.notes || "",
  };
}

function formatNumber(value, digits = 1) {
  const number = Number.parseFloat(value);
  if (!Number.isFinite(number)) return "-";
  return number.toFixed(digits).replace(/\.0$/, "");
}

function getDateLabel(value) {
  if (!value) return "No date";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function WeightChart({ records, unit }) {
  const points = useMemo(() => {
    return records
      .map((record) => ({
        ...record,
        value: weightInUnit(record, unit),
      }))
      .filter((record) => Number.isFinite(record.value));
  }, [records, unit]);

  if (points.length === 0) {
    return (
      <div className="bb-weight-chart-empty grid min-h-72 place-items-center rounded-2xl border border-dashed border-gray-700 bg-gray-900/70 p-6 text-center">
        <div>
          <p className="font-semibold text-gray-200">No weights yet</p>
          <p className="mt-1 text-sm text-gray-500">Add a record to start the trend line.</p>
        </div>
      </div>
    );
  }

  const width = 720;
  const height = 280;
  const padding = { top: 28, right: 28, bottom: 44, left: 54 };
  const values = points.map((point) => point.value);
  const minValueRaw = Math.min(...values);
  const maxValueRaw = Math.max(...values);
  const range = Math.max(1, maxValueRaw - minValueRaw);
  const minValue = Math.max(0, minValueRaw - range * 0.18);
  const maxValue = maxValueRaw + range * 0.18;
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const getX = (index) =>
    padding.left + (points.length === 1 ? chartWidth / 2 : (index / (points.length - 1)) * chartWidth);
  const getY = (value) =>
    padding.top + ((maxValue - value) / Math.max(1, maxValue - minValue)) * chartHeight;
  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${getX(index).toFixed(2)} ${getY(point.value).toFixed(2)}`)
    .join(" ");
  const areaPath = `${linePath} L ${getX(points.length - 1).toFixed(2)} ${height - padding.bottom} L ${getX(0).toFixed(2)} ${height - padding.bottom} Z`;
  const yTicks = [0, 0.5, 1].map((ratio) => minValue + (maxValue - minValue) * ratio);

  return (
    <div className="rounded-2xl border border-gray-700 bg-gray-900 p-3 sm:p-5">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Weight Trend</h3>
          <p className="text-sm text-gray-500">{points.length} recorded weigh-in{points.length === 1 ? "" : "s"}</p>
        </div>
        <p className="text-sm font-semibold text-blue-200">
          {formatNumber(points[points.length - 1].value)} {unit}
        </p>
      </div>

      <div className="bb-weight-chart overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="min-w-[620px]">
          <defs>
            <linearGradient id="weightArea" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.32" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.04" />
            </linearGradient>
          </defs>
          {yTicks.map((tick) => {
            const y = getY(tick);
            return (
              <g key={tick}>
                <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke="#374151" strokeDasharray="5 6" />
                <text x={padding.left - 12} y={y + 4} textAnchor="end" fill="#9ca3af" fontSize="12">
                  {formatNumber(tick)}
                </text>
              </g>
            );
          })}
          <path d={areaPath} fill="url(#weightArea)" />
          <path d={linePath} fill="none" stroke="#60a5fa" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
          {points.map((point, index) => (
            <g key={point.id || `${point.recorded_date}-${index}`}>
              <circle cx={getX(index)} cy={getY(point.value)} r="6" fill="#0f172a" stroke="#93c5fd" strokeWidth="3" />
              {(index === 0 || index === points.length - 1 || points.length <= 4) && (
                <text x={getX(index)} y={height - 16} textAnchor="middle" fill="#9ca3af" fontSize="12">
                  {getDateLabel(point.recorded_date)}
                </text>
              )}
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

function WeightRecordsSkeleton() {
  const panelClass = "rounded-2xl border border-gray-700 bg-gray-900 p-4";
  const surfaceClass = "space-y-4 rounded-2xl border border-gray-700 bg-gray-800 p-4 sm:p-5";

  return (
    <div className="space-y-6" aria-busy="true">
      <div className="bb-mobile-totals grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className={panelClass}>
            <SkeletonBlock className="h-4 w-20" />
            <SkeletonBlock className="mt-2 h-8 w-24" />
          </div>
        ))}
      </div>

      <div className="bb-weight-entry grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <div className="rounded-2xl border border-gray-700 bg-gray-900 p-3 sm:p-5">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <SkeletonBlock className="h-5 w-32" />
              <SkeletonBlock className="h-4 w-44" />
            </div>
            <SkeletonBlock className="h-5 w-20" />
          </div>
          <SkeletonBlock className="h-72 w-full rounded-xl" />
        </div>
        <div className={surfaceClass}>
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="space-y-2">
              <SkeletonBlock className="h-5 w-28" />
              <SkeletonBlock className="h-4 w-44" />
            </div>
            <SkeletonBlock className="h-7 w-14 rounded-full" />
          </div>
          {[0, 1, 2].map((item) => (
            <div key={item}>
              <SkeletonBlock className="mb-2 h-3 w-20" />
              <SkeletonBlock className="h-10 w-full" />
            </div>
          ))}
          <SkeletonBlock className="h-20 w-full" />
          <SkeletonBlock className="h-10 w-full rounded-xl" />
        </div>
      </div>

      <div className={surfaceClass}>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <SkeletonBlock className="h-5 w-20" />
            <SkeletonBlock className="h-4 w-52" />
          </div>
          <SkeletonBlock className="h-4 w-16" />
        </div>
        <div className="overflow-hidden rounded-xl border border-gray-700">
          {[0, 1, 2, 3, 4].map((row) => (
            <div key={row} className="grid grid-cols-5 gap-3 border-t border-gray-700 px-3 py-3 first:border-t-0">
              {[0, 1, 2, 3, 4].map((cell) => (
                <SkeletonBlock key={cell} className="h-4 w-full" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function WeightRecords({ animal, onAnimalSaved, openEntryKey, primaryIdentifier }) {
  const mobile = useSyncExternalStore(subscribeToViewport, isMobileViewport);
  const [editor, setEditor] = useState({ key: null, open: false });
  const editorOpen = editor.key === openEntryKey ? editor.open : Boolean(openEntryKey);
  const setEditorOpen = open => setEditor({ key: openEntryKey, open });
  const [editingId, setEditingId] = useState(null);
  const [formError, setFormError] = useState("");
  const [invalidField, setInvalidField] = useState(null);
  const [uncertainSave, setUncertainSave] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [records, setRecords] = useState([]);
  const [draft, setDraft] = useState({
    recorded_date: getTodayDate(),
    weight: "",
    unit: "lb",
    notes: "",
  });
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [saveStatus, setSaveStatus] = useState("idle");
  const signatures = useRef(new Map());
  const createPending = useRef(false);
  const openEditorButton = useRef(null);
  const weightInput = useRef(null);
  const dateInput = useRef(null);
  const saveStatusTimer = useRef(null);

  useEffect(() => () => {
    if (saveStatusTimer.current) clearTimeout(saveStatusTimer.current);
  }, []);

  useEffect(() => {
    if (!animal?.id) return;
    let cancelled = false;

    const loadRecords = async () => {
      try {
        setLoading(true);
        setLoadError(false);
        const res = await weightRecordsAPI.getWeightRecords(animal.id);
        if (cancelled) return;
        const nextRecords = (Array.isArray(res.data) ? res.data : []).map(normalizeRecord);
        setRecords(nextRecords);
        signatures.current = new Map(
          nextRecords.map((record) => [record.id, JSON.stringify(getRecordPayload(record))])
        );
        setDraft((current) => ({
          ...current,
          weight: "",
          recorded_date: getTodayDate(),
          unit: nextRecords[nextRecords.length - 1]?.unit || current.unit || "lb",
        }));
      } catch (err) {
        console.error("Error loading weight records:", err);
        if (!cancelled) {
          setLoadError(true);
          toast.error("Failed to load weight records");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadRecords();
    return () => {
      cancelled = true;
    };
  }, [animal?.id, loadAttempt]);

  const sortedRecords = useMemo(
    () => [...records].sort((a, b) => new Date(`${a.recorded_date}T00:00:00`) - new Date(`${b.recorded_date}T00:00:00`)),
    [records]
  );
  const latestRecord = sortedRecords[sortedRecords.length - 1] || null;
  const previousRecord = sortedRecords[sortedRecords.length - 2] || null;
  const firstRecord = sortedRecords[0] || null;
  const unit = latestRecord?.unit || draft.unit || "lb";
  const changeFromPrevious = latestRecord && previousRecord
    ? weightInUnit(latestRecord, unit) - weightInUnit(previousRecord, unit)
    : null;
  const totalChange = latestRecord && firstRecord && latestRecord.id !== firstRecord.id
    ? weightInUnit(latestRecord, unit) - weightInUnit(firstRecord, unit)
    : null;
  const averageWeight = sortedRecords.length
    ? sortedRecords.reduce((sum, record) => sum + (weightInUnit(record, unit) || 0), 0) / sortedRecords.length
    : null;

  const markSaved = () => {
    setSaveStatus("saved");
    if (saveStatusTimer.current) clearTimeout(saveStatusTimer.current);
    saveStatusTimer.current = setTimeout(() => setSaveStatus("idle"), 1600);
  };

  const handleAnimalResponse = (response) => {
    if (response?.data?.animal) onAnimalSaved?.(response.data.animal);
  };

  const finishAdd = (record, updatedAnimal) => {
    const savedRecord = normalizeRecord(record);
    setRecords(current => [...current.filter(item => item.id !== savedRecord.id), savedRecord]);
    signatures.current.set(savedRecord.id, JSON.stringify(getRecordPayload(savedRecord)));
    setDraft(current => ({ ...current, recorded_date: getTodayDate(), weight: "", notes: "" }));
    if (updatedAnimal) onAnimalSaved?.(updatedAnimal);
    setFormError("");
    setUncertainSave(null);
    setEditorOpen(false);
    if (mobile) requestAnimationFrame(() => openEditorButton.current?.focus({ preventScroll: true }));
    toast.success("Weight recorded");
  };

  const reconcileAdd = async (attempt) => {
    try {
      const { data } = await weightRecordsAPI.getWeightRecords(animal.id);
      const matches = data.map(normalizeRecord).filter(record => (
        !attempt.knownIds.has(record.id) && record.recorded_date === attempt.payload.recorded_date &&
        Number(record.weight).toFixed(2) === Number(attempt.payload.weight).toFixed(2) &&
        record.unit === attempt.payload.unit && record.notes === attempt.payload.notes
      ));
      if (matches.length === 1) {
        const { data: updatedAnimal } = await getAnimalByID(animal.id);
        finishAdd(matches[0], updatedAnimal);
        return;
      }
    } catch (error) {
      console.error("Could not verify the weight save:", error);
    }
    setUncertainSave(attempt);
    setFormError("We couldn’t confirm the save. Check history before logging this weight again.");
  };

  const closeEditor = () => {
    setEditorOpen(false);
    requestAnimationFrame(() => openEditorButton.current?.focus({ preventScroll: true }));
  };

  const updateDraft = (field, value) => {
    if (!invalidField || invalidField === field) {
      setInvalidField(null);
      setFormError("");
    }
    setDraft(current => ({ ...current, [field]: value }));
  };

  const addRecord = async (event) => {
    event?.preventDefault();
    if (createPending.current) return;
    const weight = Number.parseFloat(draft.weight);
    if (!uncertainSave && (!Number.isFinite(weight) || weight < 0.01)) {
      if (mobile) {
        setInvalidField("weight");
        setFormError("Enter a weight of at least 0.01.");
        weightInput.current?.focus();
      } else toast.error("Enter a positive weight.");
      return;
    }
    if (!uncertainSave && mobile && !draft.recorded_date) {
      setInvalidField("recorded_date");
      setFormError("Enter a date.");
      dateInput.current?.focus();
      return;
    }

    createPending.current = true;
    const attempt = uncertainSave || { payload: getRecordPayload(draft), knownIds: new Set(records.map(record => record.id)) };
    try {
      setFormError("");
      setInvalidField(null);
      setAdding(true);
      if (uncertainSave) await reconcileAdd(attempt);
      else {
        const res = await weightRecordsAPI.createWeightRecord(animal.id, attempt.payload);
        finishAdd(res.data.record, res.data.animal);
      }
    } catch (err) {
      console.error("Error creating weight record:", err);
      if (mobile && (!err.response || err.response.status >= 500)) await reconcileAdd(attempt);
      else if (mobile) setFormError(err.response?.data?.error || "Failed to add weight record. Try again.");
      else toast.error(err.response?.data?.error || "Failed to add weight record");
    } finally {
      createPending.current = false;
      setAdding(false);
    }
  };

  const saveRecord = async (record) => {
    const signature = JSON.stringify(getRecordPayload(record));
    if (signature === signatures.current.get(record.id)) return;

    const weight = Number.parseFloat(record.weight);
    if (!Number.isFinite(weight) || weight <= 0) {
      toast.error("Enter a positive weight.");
      return;
    }

    try {
      setSavingId(record.id);
      setSaveStatus("saving");
      const res = await weightRecordsAPI.updateWeightRecord(animal.id, record.id, getRecordPayload(record));
      const savedRecord = normalizeRecord(res.data.record);
      signatures.current.set(savedRecord.id, JSON.stringify(getRecordPayload(savedRecord)));
      setRecords((current) => current.map((item) => (item.id === savedRecord.id ? savedRecord : item)));
      handleAnimalResponse(res);
      markSaved();
    } catch (err) {
      setSaveStatus("idle");
      console.error("Error saving weight record:", err);
      toast.error(err.response?.data?.error || "Failed to save weight record");
    } finally {
      setSavingId(null);
    }
  };

  const deleteRecord = async (recordId) => {
    if (!window.confirm("Delete this weight record?")) return;

    try {
      setDeletingId(recordId);
      const res = await weightRecordsAPI.deleteWeightRecord(animal.id, recordId);
      signatures.current.delete(recordId);
      setRecords((current) => current.filter((record) => record.id !== recordId));
      handleAnimalResponse(res);
      toast.success("Weight record deleted");
    } catch (err) {
      console.error("Error deleting weight record:", err);
      toast.error("Failed to delete weight record");
    } finally {
      setDeletingId(null);
    }
  };

  const updateRecord = (recordId, field, value) => {
    setRecords((current) =>
      current.map((record) => (record.id === recordId ? { ...record, [field]: value } : record))
    );
  };

  if (loading) return <WeightRecordsSkeleton />;

  const { primary, secondary } = getAnimalIdentifiers(animal, primaryIdentifier);
  const addForm = (
    <form id="weigh-in-form" className="bb-weigh-in-fields space-y-4" onSubmit={addRecord} noValidate>
      <fieldset className="bb-weigh-in-fields space-y-4" disabled={adding || Boolean(uncertainSave)}>
        <div className="bb-weigh-in-date">
          <label htmlFor="weigh-in-date" className="text-xs text-gray-400">Date</label>
          <input ref={dateInput} id="weigh-in-date" type="date" required value={draft.recorded_date}
            aria-invalid={invalidField === "recorded_date" || undefined} aria-describedby={invalidField === "recorded_date" ? "weigh-in-error" : undefined}
            onChange={event => updateDraft("recorded_date", event.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-gray-100" />
        </div>
        <div className="bb-weigh-in-value grid grid-cols-[minmax(0,1fr)_96px] gap-3">
          <div>
            <label htmlFor="weigh-in-weight" className="text-xs text-gray-400">Weight</label>
            <input ref={weightInput} id="weigh-in-weight" type="number" inputMode="decimal" min="0.01" step="0.01" required
              value={draft.weight} onChange={event => updateDraft("weight", event.target.value)}
              aria-invalid={invalidField === "weight" || undefined} aria-describedby={invalidField === "weight" ? "weigh-in-error" : undefined}
              className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-gray-100" />
          </div>
          <div>
            <label htmlFor="weigh-in-unit" className="text-xs text-gray-400">Unit</label>
            <select id="weigh-in-unit" value={draft.unit} onChange={event => updateDraft("unit", event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-gray-100">
              <option value="lb">lb</option><option value="kg">kg</option>
            </select>
          </div>
        </div>
        <div className="bb-weigh-in-notes">
          <label htmlFor="weigh-in-notes" className="text-xs text-gray-400">Notes</label>
          <textarea id="weigh-in-notes" rows="3" value={draft.notes}
            onChange={event => updateDraft("notes", event.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-gray-100" />
        </div>
      </fieldset>
      {formError && <p id="weigh-in-error" role="alert" className="bb-weigh-in-error">{formError}</p>}
      {!mobile && <button type="submit" disabled={adding}
        className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-wait disabled:opacity-60">
        {adding ? "Adding..." : uncertainSave ? "Check history" : "Add Weight"}
      </button>}
    </form>
  );

  return (
    <div className="bb-weight-workspace space-y-6">
      {mobile && loadError && <p role="alert" className="bb-mobile-empty">Weight history couldn’t load. <button type="button"
        className="bb-text-link" onClick={() => setLoadAttempt(current => current + 1)}>Try again</button></p>}
      {mobile && editorOpen && !loadError && (
        <MobileSheet parentTitle="Weight history" title="Log weight" busy={adding} onClose={closeEditor}
          footer={<button type="submit" form="weigh-in-form" className="bb-mobile-primary" disabled={adding}>
            {adding ? uncertainSave ? "Checking history…" : "Saving weight…" : uncertainSave ? "Check history" : "Save weight"}
          </button>}>
          <div className="bb-mobile-identity">
            <span className="bb-mobile-row-icon"><MobileIcon name="tag" /></span>
            <span className="bb-mobile-row-copy"><strong>{primary}</strong><small>{[
              secondary, latestRecord ? `Last weight ${formatNumber(latestRecord.weight)} ${unit}` :
                Number(animal.weight) > 0 ? `Last weight ${formatNumber(animal.weight)} ${animal.weight_unit || "lb"}` : null,
            ].filter(Boolean).join(" · ")}</small></span>
          </div>
          {addForm}
        </MobileSheet>
      )}
      <div className="bb-weight-metrics bb-mobile-totals grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-blue-400/20 bg-blue-500/10 p-4">
          <p className="text-sm text-blue-100">{mobile ? "Latest" : "Current"}</p>
          <p className="mt-2 text-3xl font-bold text-white">
            {latestRecord ? `${formatNumber(latestRecord.weight)} ${unit}` : animal?.weight ? `${formatNumber(animal.weight)} ${animal.weight_unit || "lb"}` : "-"}
          </p>
        </div>
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
          <p className="text-sm text-emerald-100">{mobile ? "Change" : "Since Last"}</p>
          <p className="mt-2 text-3xl font-bold text-white">
            {(mobile ? totalChange : changeFromPrevious) === null ? "—" :
              `${(mobile ? totalChange : changeFromPrevious) >= 0 ? "+" : ""}${formatNumber(mobile ? totalChange : changeFromPrevious)} ${unit}`}
          </p>
        </div>
        <div className="bb-desktop-only rounded-2xl border border-gray-700 bg-gray-800 p-4">
          <p className="text-sm text-gray-400">Average</p>
          <p className="mt-2 text-3xl font-bold text-white">
            {averageWeight === null ? "-" : `${formatNumber(averageWeight)} ${unit}`}
          </p>
        </div>
      </div>

      <div className="bb-weight-entry grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <WeightChart records={sortedRecords} unit={unit} />

        {!mobile && <div className="bb-weight-form rounded-2xl border border-gray-700 bg-gray-800 p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-100">Add Weigh-In</h2>
              {totalChange !== null && <p className="text-sm text-gray-500">
                Total change: {totalChange >= 0 ? "+" : ""}{formatNumber(totalChange)} {unit}
              </p>}
            </div>
            <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-semibold text-emerald-200">
              Free
            </span>
          </div>

          {addForm}
        </div>}
      </div>

      <div className="bb-weight-history rounded-2xl border border-gray-700 bg-gray-800 p-5">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-100">{mobile ? "Recent weigh-ins" : "History"}</h2>
            <p className={`text-sm text-gray-500 ${mobile && editingId === null ? "sr-only" : ""}`}>
              {saveStatus === "saving" || savingId ? "Saving..." : saveStatus === "saved" ? "Saved" : "Edits save when you leave a field."}
            </p>
          </div>
          <span className={mobile ? "sr-only" : "text-sm text-gray-400"}>{records.length} record{records.length === 1 ? "" : "s"}</span>
        </div>

        {mobile && sortedRecords.length > 0 && (
          <ul className="bb-mobile-rows">
            {[...sortedRecords].reverse().map(record => (
              <MobileRow key={record.id} icon="weight" title={`${Number(record.weight).toLocaleString(undefined, { maximumFractionDigits: 2 })} ${record.unit}`} subtitle={getDateLabel(record.recorded_date)}
                pressed={editingId === record.id} onClick={() => {
                  setEditingId(editingId === record.id ? null : record.id);
                  if (editingId !== record.id) requestAnimationFrame(() => {
                    document.querySelector(".bb-weight-history [data-editing] input")?.focus();
                  });
                }}>
                {record.notes && <small>{record.notes}</small>}
              </MobileRow>
            ))}
          </ul>
        )}
        {sortedRecords.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-700 bg-gray-900 p-5 text-sm text-gray-400">
            No weight history recorded yet.
          </div>
        ) : (
          <div className={`overflow-x-auto ${mobile && !records.some(record => record.id === editingId) ? "hidden" : ""}`}>
            <table className="bb-stacked-table w-full min-w-[760px] text-left text-sm" role="table">
              <thead className="bg-gray-900 text-xs uppercase tracking-[0.08em] text-gray-500">
                <tr>
                  <th className="px-3 py-3">Date</th>
                  <th className="px-3 py-3">Weight</th>
                  <th className="px-3 py-3">Unit</th>
                  <th className="px-3 py-3">Notes</th>
                  <th className="px-3 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {[...sortedRecords].reverse().map((record) => (
                  <tr key={record.id} data-editing={editingId === record.id || undefined} className="hover:bg-gray-700/40">
                    <td className="bb-cell-wide px-3 py-3">
                      <span className="bb-cell-label" aria-hidden="true">Date</span>
                      <input
                        aria-label="Recorded date"
                        type="date"
                        value={record.recorded_date}
                        onChange={(e) => updateRecord(record.id, "recorded_date", e.target.value)}
                        onBlur={() => saveRecord(record)}
                        className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-gray-100"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <span className="bb-cell-label" aria-hidden="true">Weight</span>
                      <input
                        aria-label="Recorded weight"
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.01"
                        value={record.weight}
                        onChange={(e) => updateRecord(record.id, "weight", e.target.value)}
                        onBlur={() => saveRecord(record)}
                        className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-gray-100"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <span className="bb-cell-label" aria-hidden="true">Unit</span>
                      <select
                        aria-label="Recorded weight unit"
                        value={record.unit}
                        onChange={(e) => {
                          const nextRecord = { ...record, unit: e.target.value };
                          updateRecord(record.id, "unit", e.target.value);
                          saveRecord(nextRecord);
                        }}
                        className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-gray-100"
                      >
                        <option value="lb">lb</option>
                        <option value="kg">kg</option>
                      </select>
                    </td>
                    <td className="bb-cell-wide px-3 py-3">
                      <span className="bb-cell-label" aria-hidden="true">Notes</span>
                      <input
                        aria-label="Recorded weight notes"
                        value={record.notes}
                        onChange={(e) => updateRecord(record.id, "notes", e.target.value)}
                        onBlur={() => saveRecord(record)}
                        className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-gray-100"
                      />
                    </td>
                    <td className="bb-cell-wide px-3 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => deleteRecord(record.id)}
                        disabled={deletingId === record.id}
                        className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-500 disabled:cursor-wait disabled:opacity-60"
                      >
                        {deletingId === record.id ? "Deleting..." : "Delete"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {mobile && averageWeight !== null && <p className="bb-work-muted text-sm">Average weight · {formatNumber(averageWeight)} {unit}</p>}
      {mobile && (
        <div className="bb-mobile-weight-action">
          <button ref={openEditorButton} type="button" className="bb-mobile-primary" disabled={loadError}
            aria-haspopup="dialog" onClick={() => setEditorOpen(true)}><MobileIcon name="add" /> Log weight</button>
        </div>
      )}
    </div>
  );
}
