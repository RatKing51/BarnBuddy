import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import * as premiumRecordsAPI from "../api/premiumRecords";
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

function daysUntil(value) {
  if (!value) return null;
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
}

function getFeedPayload(record, herd) {
  return {
    ...record,
    herd_id: herd?.id === "unassigned" ? null : herd?.id,
    record_date: record.record_date || null,
    next_purchase_date: record.next_purchase_date || null,
  };
}

function HerdFeedRecordsSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-blue-400/20 bg-blue-500/10 p-5 lg:col-span-2">
          <SkeletonBlock className="h-4 w-24" />
          <SkeletonBlock className="mt-3 h-6 w-48" />
          <SkeletonBlock className="mt-3 h-4 w-full max-w-lg" />
        </div>
        {[0, 1].map((item) => (
          <div key={item} className="rounded-2xl border border-gray-700 bg-gray-900 p-5">
            <SkeletonBlock className="h-3 w-28" />
            <SkeletonBlock className="mt-3 h-8 w-24" />
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_1fr]">
        <div className="rounded-2xl border border-gray-700 bg-gray-800 p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <SkeletonBlock className="h-5 w-32" />
            <SkeletonBlock className="h-9 w-16" />
          </div>
          {[0, 1, 2, 3].map((item) => (
            <SkeletonBlock key={item} className="mb-2 h-20 w-full rounded-xl" />
          ))}
        </div>
        <div className="space-y-4 rounded-2xl border border-gray-700 bg-gray-800 p-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {[0, 1, 2, 3, 4, 5].map((item) => (
              <div key={item}>
                <SkeletonBlock className="mb-2 h-3 w-24" />
                <SkeletonBlock className="h-10 w-full" />
              </div>
            ))}
          </div>
          <SkeletonBlock className="h-24 w-full" />
          <div className="flex gap-2">
            <SkeletonBlock className="h-10 w-36" />
            <SkeletonBlock className="h-10 w-20" />
          </div>
        </div>
      </section>
    </div>
  );
}

export default function HerdFeedRecords({ selectedHerd, isPremium = false, automaticReminders = false }) {
  const [feedRecords, setFeedRecords] = useState([]);
  const [selectedFeed, setSelectedFeed] = useState(null);
  const [loading, setLoading] = useState(false);
  const [addingFeed, setAddingFeed] = useState(false);
  const [deletingFeed, setDeletingFeed] = useState(false);
  const [saveStatus, setSaveStatus] = useState("idle");
  const lastFeedSignatures = useRef(new Map());
  const saveStatusTimer = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function loadFeed() {
      if (!selectedHerd || !isPremium) return;

      try {
        setLoading(true);
        const res = selectedHerd.id === "unassigned"
          ? await premiumRecordsAPI.getUnassignedFeedRecords()
          : await premiumRecordsAPI.getHerdFeedRecords(selectedHerd.id);
        const data = Array.isArray(res.data) ? res.data : [];
        if (!cancelled) {
          setFeedRecords(data);
          lastFeedSignatures.current = new Map(data.map((record) => [record.id, JSON.stringify(getFeedPayload(record, selectedHerd))]));
          setSelectedFeed(data[0] || null);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) toast.error("Failed to load herd feed records.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadFeed();

    return () => {
      cancelled = true;
    };
  }, [isPremium, selectedHerd]);

  useEffect(() => () => {
    if (saveStatusTimer.current) clearTimeout(saveStatusTimer.current);
  }, []);

  const markSaved = () => {
    setSaveStatus("saved");
    if (saveStatusTimer.current) clearTimeout(saveStatusTimer.current);
    saveStatusTimer.current = setTimeout(() => setSaveStatus("idle"), 1600);
  };

  const feedTotal = feedRecords.reduce((sum, record) => {
    const cost = Number.parseFloat(record.cost);
    return Number.isFinite(cost) ? sum + cost : sum;
  }, 0);
  const feedAmount = feedRecords.reduce((sum, record) => {
    const amount = Number.parseFloat(record.amount);
    return Number.isFinite(amount) ? sum + amount : sum;
  }, 0);
  const reminders = useMemo(() => {
    if (!automaticReminders) return [];
    return feedRecords
      .map((record) => ({ record, days: daysUntil(record.next_purchase_date) }))
      .filter((item) => item.days !== null && item.days <= 14)
      .sort((a, b) => a.days - b.days);
  }, [automaticReminders, feedRecords]);

  if (!isPremium) {
    return (
      <div className="rounded-2xl border border-amber-300/30 bg-amber-400/10 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-200">Premium</p>
        <h2 className="mt-2 text-xl font-semibold text-white">Herd feed is a Premium feature</h2>
        <p className="mt-2 text-sm text-gray-300">Upgrade to track feed purchases, feed costs, and herd-level feed reminders.</p>
        <a href="/pricing" className="mt-5 inline-flex rounded-lg bg-amber-300 px-4 py-2 font-semibold text-gray-950 hover:bg-amber-200">
          View Premium
        </a>
      </div>
    );
  }

  if (loading) {
    return <HerdFeedRecordsSkeleton />;
  }

  const addFeed = async () => {
    if (!selectedHerd || addingFeed) return;

    try {
      setAddingFeed(true);
      const res = await premiumRecordsAPI.createFeedRecord({
        herd_id: selectedHerd.id === "unassigned" ? null : selectedHerd.id,
        animal_id: null,
        record_date: today(),
        feed_type: "",
        amount: 0,
        unit: "lb",
        cost: 0,
        next_purchase_date: "",
        notes: "",
      });
      lastFeedSignatures.current.set(res.data.id, JSON.stringify(getFeedPayload(res.data, selectedHerd)));
      setFeedRecords((current) => [res.data, ...current]);
      setSelectedFeed(res.data);
      toast.success("Feed record created.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to create feed record.");
    } finally {
      setAddingFeed(false);
    }
  };

  const saveFeed = async () => {
    if (!selectedFeed?.id) return;

    const payload = getFeedPayload(selectedFeed, selectedHerd);
    const signature = JSON.stringify(payload);
    if (signature === lastFeedSignatures.current.get(selectedFeed.id)) return;

    try {
      setSaveStatus("saving");
      const res = await premiumRecordsAPI.updateFeedRecord(selectedFeed.id, payload);
      lastFeedSignatures.current.set(res.data.id, JSON.stringify(getFeedPayload(res.data, selectedHerd)));
      setFeedRecords((current) => current.map((record) => (record.id === res.data.id ? res.data : record)));
      markSaved();
    } catch (err) {
      setSaveStatus("idle");
      console.error(err);
      toast.error("Failed to save feed record.");
    }
  };

  const deleteFeed = async () => {
    if (!selectedFeed?.id || deletingFeed) return;

    try {
      setDeletingFeed(true);
      await premiumRecordsAPI.deleteFeedRecord(selectedFeed.id);
      setFeedRecords((current) => current.filter((record) => record.id !== selectedFeed.id));
      setSelectedFeed(null);
      toast.success("Feed deleted.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete feed record.");
    } finally {
      setDeletingFeed(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-blue-400/30 bg-blue-500/10 p-5 lg:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-300">Premium</p>
          <h2 className="mt-2 text-xl font-semibold text-white">{selectedHerd?.name || "Herd"} feed</h2>
          <p className="mt-2 text-sm text-gray-300">Track feed purchases, quantities, costs, and next purchase dates for the selected herd.</p>
        </div>
        <div className="rounded-2xl border border-gray-700 bg-gray-900 p-5">
          <p className="text-xs uppercase tracking-[0.14em] text-gray-500">Total feed cost</p>
          <p className="mt-3 text-3xl font-bold text-white">{money(feedTotal)}</p>
        </div>
        <div className="rounded-2xl border border-gray-700 bg-gray-900 p-5">
          <p className="text-xs uppercase tracking-[0.14em] text-gray-500">Total amount</p>
          <p className="mt-3 text-3xl font-bold text-white">{feedAmount.toLocaleString()}</p>
        </div>
      </section>

      {automaticReminders && (
        <section className="rounded-2xl border border-gray-700 bg-gray-800 p-5">
          <h3 className="text-lg font-semibold text-white">Feed reminders</h3>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {reminders.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-700 bg-gray-900 p-4 text-sm text-gray-400">No feed purchases due soon.</div>
            ) : reminders.map(({ record, days }) => (
              <div key={record.id} className={`rounded-xl border p-4 ${days < 0 ? "border-red-400/30 bg-red-500/10" : "border-amber-300/30 bg-amber-400/10"}`}>
                <p className="font-semibold text-white">{record.feed_type || "Feed purchase"}</p>
                <p className="mt-1 text-sm text-gray-300">
                  {days < 0 ? "Overdue by" : "Needed in"} {Math.abs(days)} day{Math.abs(days) === 1 ? "" : "s"}
                </p>
                <p className="mt-2 text-xs text-gray-500">{formatDate(record.next_purchase_date)}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_1fr]">
        <div className="rounded-2xl border border-gray-700 bg-gray-800 p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-white">Feed records</h3>
            <button
              onClick={addFeed}
              disabled={addingFeed}
              className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-wait disabled:opacity-60"
            >
              {addingFeed ? "Adding..." : "Add"}
            </button>
          </div>
          {feedRecords.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-700 bg-gray-900 p-4 text-sm text-gray-400">No feed records yet.</div>
          ) : feedRecords.map((record) => (
            <button
              key={record.id}
              type="button"
              onClick={() => setSelectedFeed(record)}
              className={`mb-2 w-full rounded-xl border p-3 text-left transition ${selectedFeed?.id === record.id ? "border-blue-400 bg-blue-500/20" : "border-gray-700 bg-gray-900 hover:border-blue-400"}`}
            >
              <p className="font-semibold text-white">{record.feed_type || "Feed"} - {record.amount || 0} {record.unit || "lb"}</p>
              <p className="mt-1 text-xs text-gray-400">{formatDate(record.record_date) || "No date"} - {money(record.cost)}</p>
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-gray-700 bg-gray-800 p-5">
          {!selectedFeed ? (
            <div className="rounded-xl border border-dashed border-gray-700 bg-gray-900 p-6 text-sm text-gray-400">Select or add a feed record.</div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="block text-xs text-gray-400">
                  Record date
                  <input type="date" value={formatDate(selectedFeed.record_date)} onChange={(e) => setSelectedFeed({ ...selectedFeed, record_date: e.target.value })} onBlur={saveFeed} className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white" />
                </label>
                <label className="block text-xs text-gray-400">
                  Feed type
                  <input value={selectedFeed.feed_type || ""} onChange={(e) => setSelectedFeed({ ...selectedFeed, feed_type: e.target.value })} onBlur={saveFeed} placeholder="Hay, grain, mineral..." className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white" />
                </label>
                <label className="block text-xs text-gray-400">
                  Amount
                  <input type="number" step="0.01" value={selectedFeed.amount || ""} onChange={(e) => setSelectedFeed({ ...selectedFeed, amount: e.target.value })} onBlur={saveFeed} className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white" />
                </label>
                <label className="block text-xs text-gray-400">
                  Unit
                  <select value={selectedFeed.unit || "lb"} onChange={(e) => setSelectedFeed({ ...selectedFeed, unit: e.target.value })} onBlur={saveFeed} className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white">
                    <option>lb</option>
                    <option>bag</option>
                    <option>bale</option>
                    <option>oz</option>
                    <option>kg</option>
                  </select>
                </label>
                <label className="block text-xs text-gray-400">
                  Cost
                  <input type="number" step="0.01" value={selectedFeed.cost || ""} onChange={(e) => setSelectedFeed({ ...selectedFeed, cost: e.target.value })} onBlur={saveFeed} className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white" />
                </label>
                <label className="block text-xs text-gray-400">
                  Next purchase date
                  <input type="date" value={formatDate(selectedFeed.next_purchase_date)} onChange={(e) => setSelectedFeed({ ...selectedFeed, next_purchase_date: e.target.value })} onBlur={saveFeed} className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white" />
                </label>
              </div>
              <textarea rows="4" value={selectedFeed.notes || ""} onChange={(e) => setSelectedFeed({ ...selectedFeed, notes: e.target.value })} onBlur={saveFeed} placeholder="Notes" className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white" />
              <div className="flex items-center gap-2">
                <span className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                  saveStatus === "saved" ? "bg-emerald-500/15 text-emerald-200" : "bg-gray-700 text-gray-300"
                }`}>
                  {saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? "Saved" : "Auto-saves on blur"}
                </span>
                <button
                  onClick={deleteFeed}
                  disabled={deletingFeed}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:cursor-wait disabled:opacity-60"
                >
                  {deletingFeed ? "Deleting..." : "Delete"}
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
