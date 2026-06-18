import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import * as weightRecordsAPI from "../api/weightRecords";
import { SkeletonBlock } from "./LoadingSpinner";

const getTodayDate = () => new Date().toISOString().slice(0, 10);

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

function WeightChart({ records }) {
  const points = useMemo(() => {
    return records
      .map((record) => ({
        ...record,
        value: Number.parseFloat(record.weight),
      }))
      .filter((record) => Number.isFinite(record.value));
  }, [records]);

  if (points.length === 0) {
    return (
      <div className="grid min-h-72 place-items-center rounded-2xl border border-dashed border-gray-700 bg-gray-900/70 p-6 text-center">
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
          {formatNumber(points[points.length - 1].value)} {points[points.length - 1].unit}
        </p>
      </div>

      <div className="overflow-x-auto">
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
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]" aria-busy="true">
      <div className="space-y-4 rounded-2xl border border-gray-700 bg-gray-800 p-5">
        <SkeletonBlock className="h-6 w-40" />
        <SkeletonBlock className="h-72 w-full rounded-2xl bg-gray-700" />
      </div>
      <div className="space-y-4 rounded-2xl border border-gray-700 bg-gray-800 p-5">
        <SkeletonBlock className="h-6 w-36" />
        {[0, 1, 2, 3].map((item) => (
          <SkeletonBlock key={item} className="h-11 w-full bg-gray-700" />
        ))}
      </div>
    </div>
  );
}

export default function WeightRecords({ animal, onAnimalSaved }) {
  const [records, setRecords] = useState([]);
  const [draft, setDraft] = useState({
    recorded_date: getTodayDate(),
    weight: "",
    unit: "lb",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [saveStatus, setSaveStatus] = useState("idle");
  const signatures = useRef(new Map());
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
        toast.error("Failed to load weight records");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadRecords();
    return () => {
      cancelled = true;
    };
  }, [animal?.id]);

  const sortedRecords = useMemo(
    () => [...records].sort((a, b) => new Date(`${a.recorded_date}T00:00:00`) - new Date(`${b.recorded_date}T00:00:00`)),
    [records]
  );
  const latestRecord = sortedRecords[sortedRecords.length - 1] || null;
  const previousRecord = sortedRecords[sortedRecords.length - 2] || null;
  const firstRecord = sortedRecords[0] || null;
  const changeFromPrevious = latestRecord && previousRecord
    ? Number.parseFloat(latestRecord.weight) - Number.parseFloat(previousRecord.weight)
    : null;
  const totalChange = latestRecord && firstRecord && latestRecord.id !== firstRecord.id
    ? Number.parseFloat(latestRecord.weight) - Number.parseFloat(firstRecord.weight)
    : null;
  const averageWeight = sortedRecords.length
    ? sortedRecords.reduce((sum, record) => sum + Number.parseFloat(record.weight || 0), 0) / sortedRecords.length
    : null;
  const unit = latestRecord?.unit || draft.unit || "lb";

  const markSaved = () => {
    setSaveStatus("saved");
    if (saveStatusTimer.current) clearTimeout(saveStatusTimer.current);
    saveStatusTimer.current = setTimeout(() => setSaveStatus("idle"), 1600);
  };

  const handleAnimalResponse = (response) => {
    if (response?.data?.animal) onAnimalSaved?.(response.data.animal);
  };

  const addRecord = async () => {
    const weight = Number.parseFloat(draft.weight);
    if (!Number.isFinite(weight) || weight <= 0) {
      toast.error("Enter a positive weight.");
      return;
    }

    try {
      setAdding(true);
      const res = await weightRecordsAPI.createWeightRecord(animal.id, getRecordPayload(draft));
      const savedRecord = normalizeRecord(res.data.record);
      setRecords((current) => [...current, savedRecord]);
      signatures.current.set(savedRecord.id, JSON.stringify(getRecordPayload(savedRecord)));
      setDraft((current) => ({ ...current, recorded_date: getTodayDate(), weight: "", notes: "" }));
      handleAnimalResponse(res);
      toast.success("Weight recorded");
    } catch (err) {
      console.error("Error creating weight record:", err);
      toast.error(err.response?.data?.error || "Failed to add weight record");
    } finally {
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

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-blue-400/20 bg-blue-500/10 p-4">
          <p className="text-sm text-blue-100">Current</p>
          <p className="mt-2 text-3xl font-bold text-white">
            {latestRecord ? `${formatNumber(latestRecord.weight)} ${unit}` : animal?.weight ? `${formatNumber(animal.weight)} lb` : "-"}
          </p>
        </div>
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
          <p className="text-sm text-emerald-100">Since Last</p>
          <p className="mt-2 text-3xl font-bold text-white">
            {changeFromPrevious === null ? "-" : `${changeFromPrevious >= 0 ? "+" : ""}${formatNumber(changeFromPrevious)} ${unit}`}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-700 bg-gray-800 p-4">
          <p className="text-sm text-gray-400">Average</p>
          <p className="mt-2 text-3xl font-bold text-white">
            {averageWeight === null ? "-" : `${formatNumber(averageWeight)} ${unit}`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <WeightChart records={sortedRecords} />

        <div className="rounded-2xl border border-gray-700 bg-gray-800 p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-100">Add Weigh-In</h2>
              <p className="text-sm text-gray-500">
                {totalChange === null ? "Track this animal over time." : `Total change: ${totalChange >= 0 ? "+" : ""}${formatNumber(totalChange)} ${unit}`}
              </p>
            </div>
            <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-semibold text-emerald-200">
              Free
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-400">Date</label>
              <input
                type="date"
                value={draft.recorded_date}
                onChange={(e) => setDraft((current) => ({ ...current, recorded_date: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-gray-100"
              />
            </div>

            <div className="grid grid-cols-[minmax(0,1fr)_96px] gap-3">
              <div>
                <label className="text-xs text-gray-400">Weight</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={draft.weight}
                  onChange={(e) => setDraft((current) => ({ ...current, weight: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-gray-100"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400">Unit</label>
                <select
                  value={draft.unit}
                  onChange={(e) => setDraft((current) => ({ ...current, unit: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-gray-100"
                >
                  <option value="lb">lb</option>
                  <option value="kg">kg</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-400">Notes</label>
              <textarea
                rows="3"
                value={draft.notes}
                onChange={(e) => setDraft((current) => ({ ...current, notes: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-gray-100"
              />
            </div>

            <button
              type="button"
              onClick={addRecord}
              disabled={adding}
              className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-wait disabled:opacity-60"
            >
              {adding ? "Adding..." : "Add Weight"}
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-700 bg-gray-800 p-5">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-100">History</h2>
            <p className="text-sm text-gray-500">
              {saveStatus === "saving" || savingId ? "Saving..." : saveStatus === "saved" ? "Saved" : "Edits save when you leave a field."}
            </p>
          </div>
          <span className="text-sm text-gray-400">{records.length} record{records.length === 1 ? "" : "s"}</span>
        </div>

        {sortedRecords.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-700 bg-gray-900 p-5 text-sm text-gray-400">
            No weight history recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
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
                  <tr key={record.id} className="hover:bg-gray-700/40">
                    <td className="px-3 py-3">
                      <input
                        type="date"
                        value={record.recorded_date}
                        onChange={(e) => updateRecord(record.id, "recorded_date", e.target.value)}
                        onBlur={() => saveRecord(record)}
                        className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-gray-100"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={record.weight}
                        onChange={(e) => updateRecord(record.id, "weight", e.target.value)}
                        onBlur={() => saveRecord(record)}
                        className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-gray-100"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <select
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
                    <td className="px-3 py-3">
                      <input
                        value={record.notes}
                        onChange={(e) => updateRecord(record.id, "notes", e.target.value)}
                        onBlur={() => saveRecord(record)}
                        className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-gray-100"
                      />
                    </td>
                    <td className="px-3 py-3 text-right">
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

      <ToastContainer autoClose="1000" />
    </div>
  );
}
