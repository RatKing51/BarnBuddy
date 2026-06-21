import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import * as premiumRecordsAPI from "../api/premiumRecords";
import { SkeletonBlock } from "./LoadingSpinner";

const EXPENSE_CATEGORIES = [
  "Feed",
  "Veterinary",
  "Supplies",
  "Equipment",
  "Labor",
  "Breeding",
  "Transportation",
  "Facilities",
  "Insurance",
  "Utilities",
  "Other expense",
];

const INCOME_CATEGORIES = [
  "Animal sales",
  "Product sales",
  "Breeding fees",
  "Services",
  "Grants",
  "Other income",
];

const CATEGORY_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#14b8a6", "#f97316", "#64748b"];

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

function numeric(value) {
  const number = Number.parseFloat(value);
  return Number.isFinite(number) ? number : 0;
}

function monthKey(value) {
  if (!value) return "No date";
  return String(value).slice(0, 7);
}

function monthLabel(key) {
  if (key === "No date") return key;
  const date = new Date(`${key}-01T00:00:00`);
  if (Number.isNaN(date.getTime())) return key;
  return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

function getHerdFinancePayload(record, selectedHerd) {
  return {
    animal_id: record.animal_id || null,
    herd_id: selectedHerd?.id === "unassigned" ? null : selectedHerd?.id || null,
    record_date: record.record_date || null,
    category: record.category || "Other expense",
    amount: record.amount || 0,
    vendor: record.vendor || "",
    notes: record.notes || "",
  };
}

function asLedgerItem(record) {
  const amount = numeric(record.amount);
  const isIncome = INCOME_CATEGORIES.includes(record.category) || record.category === "Income";
  return {
    id: `finance-${record.id}`,
    source: "Ledger",
    date: record.record_date,
    category: record.category || (isIncome ? "Other income" : "Other expense"),
    amount,
    signedAmount: isIncome ? amount : -amount,
    vendor: record.vendor || "",
    notes: record.notes || "",
    animal: record.animal_name || record.animal_tag || "",
  };
}

function PieChart({ segments, total }) {
  let offset = 25;

  return (
    <div className="grid grid-cols-[112px_1fr] items-center gap-4">
      <svg viewBox="0 0 36 36" className="h-28 w-28 -rotate-90 overflow-visible" role="img" aria-label="Expense category pie chart">
        <circle cx="18" cy="18" r="15.9155" fill="transparent" stroke="#1f2937" strokeWidth="6" />
        {segments.map((segment) => {
          const percent = total > 0 ? (segment.value / total) * 100 : 0;
          const dashOffset = offset;
          offset -= percent;
          if (percent <= 0) return null;
          return (
            <circle
              key={segment.label}
              cx="18"
              cy="18"
              r="15.9155"
              fill="transparent"
              stroke={segment.color}
              strokeWidth="6"
              strokeDasharray={`${percent} ${100 - percent}`}
              strokeDashoffset={dashOffset}
            />
          );
        })}
      </svg>
      <div className="space-y-2">
        {segments.length === 0 ? (
          <p className="text-sm text-gray-400">No expenses yet.</p>
        ) : segments.map((segment) => (
          <div key={segment.label} className="grid grid-cols-[10px_minmax(0,1fr)_auto] items-center gap-2 text-sm">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: segment.color }} />
            <span className="truncate text-gray-300">{segment.label}</span>
            <span className="font-semibold text-white">{money(segment.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CashflowChart({ months }) {
  const maxValue = Math.max(1, ...months.flatMap((item) => [item.income, item.expense]));

  return (
    <div className="space-y-3">
      {months.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-700 bg-gray-900 p-4 text-sm text-gray-400">No monthly cashflow yet.</div>
      ) : months.map((item) => (
        <div key={item.key} className="grid grid-cols-[72px_1fr_88px] items-center gap-3 text-sm">
          <span className="text-gray-400">{monthLabel(item.key)}</span>
          <div className="space-y-1">
            <div className="h-2 rounded-full bg-gray-900">
              <div className="h-2 rounded-full bg-emerald-400" style={{ width: `${Math.max(2, (item.income / maxValue) * 100)}%` }} />
            </div>
            <div className="h-2 rounded-full bg-gray-900">
              <div className="h-2 rounded-full bg-red-400" style={{ width: `${Math.max(2, (item.expense / maxValue) * 100)}%` }} />
            </div>
          </div>
          <span className={`text-right font-semibold ${item.net < 0 ? "text-red-200" : "text-emerald-200"}`}>{money(item.net)}</span>
        </div>
      ))}
    </div>
  );
}

function HerdFinanceSkeleton() {
  const panelClass = "rounded-2xl border border-gray-700 bg-gray-900 p-5 shadow-md";
  const surfaceClass = "rounded-2xl border border-gray-700 bg-gray-800 p-5 shadow-md";

  return (
    <div className="space-y-6" aria-busy="true">
      <SkeletonBlock className="h-8 w-56" />

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className={panelClass}>
            <SkeletonBlock className="h-3 w-28" />
            <SkeletonBlock className="mt-3 h-8 w-32" />
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {[0, 1].map((panel) => (
          <div key={panel} className={surfaceClass}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <SkeletonBlock className="h-5 w-36" />
              <div className="flex gap-2">
                <SkeletonBlock className="h-7 w-24" />
                <SkeletonBlock className="h-7 w-24" />
              </div>
            </div>
            <div className="grid grid-cols-[112px_1fr] items-center gap-4">
              <SkeletonBlock className="h-28 w-28 rounded-full" />
              <div className="space-y-3">
                {[0, 1, 2, 3].map((item) => (
                  <SkeletonBlock key={item} className="h-4 w-full" />
                ))}
              </div>
            </div>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[380px_1fr]">
        <div className={surfaceClass}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <SkeletonBlock className="h-5 w-28" />
            <SkeletonBlock className="h-9 w-16" />
          </div>
          <SkeletonBlock className="mt-4 h-20 w-full rounded-xl" />
          <SkeletonBlock className="mt-3 h-20 w-full rounded-xl" />
          <SkeletonBlock className="mt-3 h-20 w-full rounded-xl" />
        </div>
        <div className="space-y-6">
          <div className={surfaceClass}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {[0, 1, 2, 3, 4, 5].map((item) => (
                <div key={item}>
                  <SkeletonBlock className="mb-2 h-3 w-24" />
                  <SkeletonBlock className="h-10 w-full" />
                </div>
              ))}
            </div>
            <SkeletonBlock className="mt-5 h-24 w-full" />
            <div className="mt-4 flex gap-2">
              <SkeletonBlock className="h-10 w-32" />
              <SkeletonBlock className="h-10 w-20" />
            </div>
          </div>
          <div className={surfaceClass}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <SkeletonBlock className="h-5 w-40" />
              <div className="flex gap-2">
                <SkeletonBlock className="h-7 w-20" />
                <SkeletonBlock className="h-7 w-20" />
              </div>
            </div>
            <div className="rounded-xl border border-gray-700">
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
      </section>
    </div>
  );
}

export default function HerdFinanceRecords({ selectedHerd, animals = [], isPremium = false, onExportFinanceReport }) {
  const [financeRecords, setFinanceRecords] = useState([]);
  const [feedRecords, setFeedRecords] = useState([]);
  const [vetVisits, setVetVisits] = useState([]);
  const [selectedFinance, setSelectedFinance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [addingFinance, setAddingFinance] = useState(false);
  const [deletingFinance, setDeletingFinance] = useState(false);
  const [saveStatus, setSaveStatus] = useState("idle");
  const lastFinanceSignatures = useRef(new Map());
  const saveStatusTimer = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function loadFinance() {
      if (!selectedHerd || !isPremium) return;

      try {
        setLoading(true);
        const res = await premiumRecordsAPI.getHerdFinanceSummary(selectedHerd.id);
        const nextFinanceRecords = Array.isArray(res.data?.financeRecords) ? res.data.financeRecords : [];
        if (!cancelled) {
          setFinanceRecords(nextFinanceRecords);
          setFeedRecords(Array.isArray(res.data?.feedRecords) ? res.data.feedRecords : []);
          setVetVisits(Array.isArray(res.data?.vetVisits) ? res.data.vetVisits : []);
          lastFinanceSignatures.current = new Map(
            nextFinanceRecords.map((record) => [record.id, JSON.stringify(getHerdFinancePayload(record, selectedHerd))])
          );
          setSelectedFinance(nextFinanceRecords[0] || null);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) toast.error("Failed to load herd finances.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadFinance();

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

  const ledger = useMemo(() => {
    const financeItems = financeRecords.map(asLedgerItem);
    const feedItems = feedRecords.map((record) => ({
      id: `feed-${record.id}`,
      source: "Feed",
      date: record.record_date,
      category: "Feed",
      amount: numeric(record.cost),
      signedAmount: -numeric(record.cost),
      vendor: record.feed_type || "",
      notes: record.notes || "",
      animal: "",
    }));
    const vetItems = vetVisits
      .filter((visit) => numeric(visit.cost) > 0)
      .map((visit) => ({
        id: `vet-${visit.id}`,
        source: "Vet",
        date: visit.visit_date,
        category: "Veterinary",
        amount: numeric(visit.cost),
        signedAmount: -numeric(visit.cost),
        vendor: visit.vet_name || "",
        notes: visit.reason || visit.notes || "",
        animal: visit.animal_name || visit.animal_tag || "",
      }));

    return [...financeItems, ...feedItems, ...vetItems].sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  }, [financeRecords, feedRecords, vetVisits]);

  const totals = useMemo(() => {
    const income = ledger.filter((item) => item.signedAmount > 0).reduce((sum, item) => sum + item.signedAmount, 0);
    const expenses = ledger.filter((item) => item.signedAmount < 0).reduce((sum, item) => sum + Math.abs(item.signedAmount), 0);
    const feed = feedRecords.reduce((sum, record) => sum + numeric(record.cost), 0);
    const vet = vetVisits.reduce((sum, visit) => sum + numeric(visit.cost), 0);
    return { income, expenses, net: income - expenses, feed, vet };
  }, [feedRecords, ledger, vetVisits]);

  const expenseSegments = useMemo(() => {
    const grouped = new Map();
    ledger
      .filter((item) => item.signedAmount < 0)
      .forEach((item) => grouped.set(item.category, (grouped.get(item.category) || 0) + Math.abs(item.signedAmount)));

    return [...grouped.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([label, value], index) => ({ label, value, color: CATEGORY_COLORS[index % CATEGORY_COLORS.length] }));
  }, [ledger]);

  const expenseLedger = useMemo(
    () => ledger.filter((item) => item.signedAmount < 0),
    [ledger]
  );
  const incomeLedger = useMemo(
    () => ledger.filter((item) => item.signedAmount > 0),
    [ledger]
  );

  const monthlyCashflow = useMemo(() => {
    const grouped = new Map();
    ledger.forEach((item) => {
      const key = monthKey(item.date);
      const current = grouped.get(key) || { key, income: 0, expense: 0, net: 0 };
      if (item.signedAmount >= 0) current.income += item.signedAmount;
      else current.expense += Math.abs(item.signedAmount);
      current.net += item.signedAmount;
      grouped.set(key, current);
    });

    return [...grouped.values()].sort((a, b) => a.key.localeCompare(b.key)).slice(-6);
  }, [ledger]);

  if (!isPremium) {
    return (
      <div className="rounded-2xl border border-amber-300/30 bg-amber-400/10 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-200">Premium</p>
        <h2 className="mt-2 text-xl font-semibold text-white">Herd finances is a Premium feature</h2>
        <p className="mt-2 max-w-2xl text-sm text-gray-300">Upgrade to track farm-wide income, expenses, feed costs, vet costs, and profit trends.</p>
        <a href="/pricing" className="mt-5 inline-flex rounded-lg bg-amber-300 px-4 py-2 font-semibold text-gray-950 hover:bg-amber-200">
          View Premium
        </a>
      </div>
    );
  }

  if (loading) {
    return <HerdFinanceSkeleton />;
  }

  const addFinance = async () => {
    if (!selectedHerd || addingFinance) return;

    try {
      setAddingFinance(true);
      const res = await premiumRecordsAPI.createFinanceRecord({
        animal_id: null,
        herd_id: selectedHerd.id === "unassigned" ? null : selectedHerd.id,
        record_date: today(),
        category: "Other expense",
        amount: 0,
        vendor: "",
        notes: "",
      });
      lastFinanceSignatures.current.set(res.data.id, JSON.stringify(getHerdFinancePayload(res.data, selectedHerd)));
      setFinanceRecords((current) => [res.data, ...current]);
      setSelectedFinance(res.data);
      toast.success("Herd finance record created.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to create herd finance record.");
    } finally {
      setAddingFinance(false);
    }
  };

  const exportFinancePdf = () => {
    if (ledger.length === 0) {
      toast.info("No finance activity to export yet.");
      return;
    }

    if (!onExportFinanceReport) {
      toast.error("Finance export is not available here.");
      return;
    }

    onExportFinanceReport({
      selectedHerd,
      totals,
      ledger,
      incomeLedger,
      expenseLedger,
      expenseSegments,
      monthlyCashflow,
    });
  };

  const saveFinance = async () => {
    if (!selectedFinance?.id) return;

    const payload = getHerdFinancePayload(selectedFinance, selectedHerd);
    const signature = JSON.stringify(payload);
    if (signature === lastFinanceSignatures.current.get(selectedFinance.id)) return;

    try {
      setSaveStatus("saving");
      const res = await premiumRecordsAPI.updateFinanceRecord(selectedFinance.id, payload);
      lastFinanceSignatures.current.set(res.data.id, JSON.stringify(getHerdFinancePayload(res.data, selectedHerd)));
      setFinanceRecords((current) => current.map((record) => (record.id === res.data.id ? res.data : record)));
      setSelectedFinance(res.data);
      markSaved();
    } catch (err) {
      setSaveStatus("idle");
      console.error(err);
      toast.error("Failed to save herd finance record.");
    }
  };

  const deleteFinance = async () => {
    if (!selectedFinance?.id || deletingFinance) return;

    try {
      setDeletingFinance(true);
      await premiumRecordsAPI.deleteFinanceRecord(selectedFinance.id);
      setFinanceRecords((current) => current.filter((record) => record.id !== selectedFinance.id));
      setSelectedFinance(null);
      toast.success("Herd finance record deleted.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete herd finance record.");
    } finally {
      setDeletingFinance(false);
    }
  };

  const selectedIsIncome = selectedFinance && (INCOME_CATEGORIES.includes(selectedFinance.category) || selectedFinance.category === "Income");
  const categoryOptions = selectedIsIncome ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const saveBadgeText = saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? "Saved" : "Auto-saves on blur";
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-white">{selectedHerd?.name || "Herd"} finances</h2>
      </div>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-gray-700 bg-gray-900 p-5">
          <p className="text-xs uppercase tracking-[0.14em] text-gray-500">Net</p>
          <p className={`mt-3 text-3xl font-bold ${totals.net < 0 ? "text-red-200" : "text-emerald-200"}`}>{money(totals.net)}</p>
        </div>
        <div className="rounded-2xl border border-gray-700 bg-gray-900 p-5">
          <p className="text-xs uppercase tracking-[0.14em] text-gray-500">Income</p>
          <p className="mt-3 text-3xl font-bold text-emerald-200">{money(totals.income)}</p>
        </div>
        <div className="rounded-2xl border border-gray-700 bg-gray-900 p-5">
          <p className="text-xs uppercase tracking-[0.14em] text-gray-500">Expenses</p>
          <p className="mt-3 text-3xl font-bold text-red-200">{money(totals.expenses)}</p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-gray-700 bg-gray-800 p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-white">Expense mix</h3>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-lg bg-gray-900 px-3 py-1 text-xs font-semibold text-gray-300">{expenseLedger.length} expenses</span>
              <button
                type="button"
                onClick={exportFinancePdf}
                className="rounded-lg border border-blue-400/40 bg-blue-500/10 px-3 py-1.5 text-xs font-semibold text-blue-100 hover:bg-blue-500/20"
              >
                Export PDF
              </button>
            </div>
          </div>
          <PieChart segments={expenseSegments} total={totals.expenses} />
        </div>

        <div className="rounded-2xl border border-gray-700 bg-gray-800 p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-white">Monthly cashflow</h3>
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-400" />Income</span>
              <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-400" />Expense</span>
            </div>
          </div>
          <CashflowChart months={monthlyCashflow} />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[380px_1fr]">
        <div className="rounded-2xl border border-gray-700 bg-gray-800 p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-white">Herd ledger</h3>
            <button
              onClick={addFinance}
              disabled={addingFinance}
              className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-wait disabled:opacity-60"
            >
              {addingFinance ? "Adding..." : "Add"}
            </button>
          </div>

          <div className="space-y-2">
            {financeRecords.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-700 bg-gray-900 p-4 text-sm text-gray-400">No manual finance records yet.</div>
            ) : financeRecords.map((record) => (
              <button
                key={record.id}
                type="button"
                onClick={() => setSelectedFinance(record)}
                className={`w-full rounded-xl border p-3 text-left transition ${selectedFinance?.id === record.id ? "border-blue-400 bg-blue-500/20" : "border-gray-700 bg-gray-900 hover:border-blue-400"}`}
              >
                <p className="font-semibold text-white">{record.category || "Other expense"} - {money(record.amount)}</p>
                <p className="mt-1 text-xs text-gray-400">{formatDate(record.record_date) || "No date"} {record.vendor ? `- ${record.vendor}` : ""}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-700 bg-gray-800 p-5">
            {!selectedFinance ? (
              <div className="rounded-xl border border-dashed border-gray-700 bg-gray-900 p-6 text-sm text-gray-400">Select or add a ledger record.</div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <label className="block text-xs text-gray-400">
                    Type
                    <select
                      value={selectedIsIncome ? "Income" : "Expense"}
                      onChange={(e) => setSelectedFinance({ ...selectedFinance, category: e.target.value === "Income" ? "Animal sales" : "Other expense" })}
                      onBlur={saveFinance}
                      className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white"
                    >
                      <option>Expense</option>
                      <option>Income</option>
                    </select>
                  </label>
                  <label className="block text-xs text-gray-400">
                    Category
                    <select value={selectedFinance.category || "Other expense"} onChange={(e) => setSelectedFinance({ ...selectedFinance, category: e.target.value })} onBlur={saveFinance} className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white">
                      {categoryOptions.map((category) => <option key={category}>{category}</option>)}
                    </select>
                  </label>
                  <label className="block text-xs text-gray-400">
                    Record date
                    <input type="date" value={formatDate(selectedFinance.record_date)} onChange={(e) => setSelectedFinance({ ...selectedFinance, record_date: e.target.value })} onBlur={saveFinance} className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white" />
                  </label>
                  <label className="block text-xs text-gray-400">
                    Amount
                    <input type="number" step="0.01" value={selectedFinance.amount || ""} onChange={(e) => setSelectedFinance({ ...selectedFinance, amount: e.target.value })} onBlur={saveFinance} placeholder="0.00" className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white" />
                  </label>
                  <label className="block text-xs text-gray-400">
                    Vendor, buyer, or payee
                    <input value={selectedFinance.vendor || ""} onChange={(e) => setSelectedFinance({ ...selectedFinance, vendor: e.target.value })} onBlur={saveFinance} placeholder="Co-op, buyer, supplier..." className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white" />
                  </label>
                  <label className="block text-xs text-gray-400">
                    Animal
                    <select value={selectedFinance.animal_id || ""} onChange={(e) => setSelectedFinance({ ...selectedFinance, animal_id: e.target.value || null })} onBlur={saveFinance} className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white">
                      <option value="">Whole herd</option>
                      {animals.map((animal) => (
                        <option key={animal.id} value={animal.id}>{animal.name || animal.tag_id || "Unnamed animal"}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <textarea rows="4" value={selectedFinance.notes || ""} onChange={(e) => setSelectedFinance({ ...selectedFinance, notes: e.target.value })} onBlur={saveFinance} placeholder="Notes" className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white" />
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-lg px-4 py-2 text-sm font-semibold ${saveStatus === "saved" ? "bg-emerald-500/15 text-emerald-200" : "bg-gray-700 text-gray-300"}`}>{saveBadgeText}</span>
                  <button onClick={deleteFinance} disabled={deletingFinance} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:cursor-wait disabled:opacity-60">
                    {deletingFinance ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-gray-700 bg-gray-800 p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-white">All finance activity</h3>
              <div className="flex flex-wrap gap-2 text-xs font-semibold">
                <span className="rounded-lg bg-gray-900 px-3 py-1 text-gray-300">Feed {money(totals.feed)}</span>
                <span className="rounded-lg bg-gray-900 px-3 py-1 text-gray-300">Vet {money(totals.vet)}</span>
                <button
                  type="button"
                  onClick={exportFinancePdf}
                  className="rounded-lg border border-blue-400/40 bg-blue-500/10 px-3 py-1 text-blue-100 hover:bg-blue-500/20"
                >
                  Export PDF
                </button>
              </div>
            </div>
            <div className="max-h-[26rem] overflow-auto rounded-xl border border-gray-700">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead className="sticky top-0 bg-gray-900 text-xs uppercase tracking-[0.12em] text-gray-500">
                  <tr>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Source</th>
                    <th className="px-3 py-2">Category</th>
                    <th className="px-3 py-2">Detail</th>
                    <th className="px-3 py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.length === 0 ? (
                    <tr><td colSpan="5" className="px-3 py-6 text-center text-gray-400">No finance activity yet.</td></tr>
                  ) : ledger.map((item) => (
                    <tr key={item.id} className="border-t border-gray-700">
                      <td className="px-3 py-2 text-gray-300">{formatDate(item.date) || "No date"}</td>
                      <td className="px-3 py-2 text-gray-300">{item.source}</td>
                      <td className="px-3 py-2 text-white">{item.category}</td>
                      <td className="px-3 py-2 text-gray-400">{item.vendor || item.animal || item.notes || "-"}</td>
                      <td className={`px-3 py-2 text-right font-semibold ${item.signedAmount < 0 ? "text-red-200" : "text-emerald-200"}`}>{money(item.signedAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
      <ToastContainer autoClose="1000" />
    </div>
  );
}
