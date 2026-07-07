import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import * as premiumRecordsAPI from "../api/premiumRecords";
import { SkeletonBlock } from "./LoadingSpinner";

const categories = ["Feed", "Medicine", "Supplies", "Equipment", "Bedding", "Other"];
const units = ["each", "lb", "kg", "bag", "bale", "bottle", "box", "dose", "gallon"];

function number(value) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value) {
  return `$${number(value).toFixed(2)}`;
}

function dateValue(value) {
  return value ? String(value).slice(0, 10) : "";
}

function inventoryPayload(item, selectedHerd) {
  return {
    herd_id: selectedHerd?.id === "unassigned" ? null : selectedHerd?.id,
    item_name: item.item_name || "",
    category: item.category || "Supplies",
    quantity: item.quantity || 0,
    unit: item.unit || "each",
    reorder_level: item.reorder_level || 0,
    cost_per_unit: item.cost_per_unit || 0,
    supplier: item.supplier || "",
    expiration_date: item.expiration_date || null,
    use_for_vaccinations: Boolean(item.use_for_vaccinations),
    use_for_health_events: Boolean(item.use_for_health_events),
    notes: item.notes || "",
  };
}

function InventorySkeleton() {
  return (
    <div className="space-y-4">
      <SkeletonBlock className="h-8 w-52" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((item) => <SkeletonBlock key={item} className="h-24 rounded-2xl" />)}
      </div>
      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <SkeletonBlock className="h-96 rounded-2xl" />
        <SkeletonBlock className="h-96 rounded-2xl" />
      </div>
    </div>
  );
}

export default function HerdInventory({ selectedHerd, isPremium = false }) {
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [adjustmentAmount, setAdjustmentAmount] = useState("1");
  const [adjusting, setAdjusting] = useState(false);
  const [saveStatus, setSaveStatus] = useState("idle");
  const signatures = useRef(new Map());
  const saveTimer = useRef(null);

  useEffect(() => {
    let cancelled = false;
    async function loadInventory() {
      if (!selectedHerd || !isPremium) return;
      try {
        setLoading(true);
        const response = await premiumRecordsAPI.getHerdInventory(selectedHerd.id);
        const records = Array.isArray(response.data) ? response.data : [];
        if (!cancelled) {
          setItems(records);
          setSelectedItem(records[0] || null);
          signatures.current = new Map(
            records.map((item) => [item.id, JSON.stringify(inventoryPayload(item, selectedHerd))])
          );
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) toast.error("Failed to load inventory.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadInventory();
    return () => {
      cancelled = true;
    };
  }, [isPremium, selectedHerd]);

  useEffect(() => () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
  }, []);

  useEffect(() => {
    setAdjustmentAmount("1");
  }, [selectedItem?.id]);

  const summary = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expirationLimit = new Date(today);
    expirationLimit.setDate(expirationLimit.getDate() + 30);
    return items.reduce((result, item) => {
      const quantity = number(item.quantity);
      const reorderLevel = number(item.reorder_level);
      const expiration = item.expiration_date ? new Date(item.expiration_date) : null;
      result.value += quantity * number(item.cost_per_unit);
      if (reorderLevel > 0 && quantity <= reorderLevel) result.lowStock += 1;
      if (expiration && !Number.isNaN(expiration.getTime()) && expiration <= expirationLimit) result.expiring += 1;
      return result;
    }, { value: 0, lowStock: 0, expiring: 0 });
  }, [items]);

  const visibleItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;
    return items.filter((item) =>
      [item.item_name, item.category, item.supplier]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [items, search]);

  if (!isPremium) {
    return (
      <div className="rounded-2xl border border-amber-300/30 bg-amber-400/10 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-200">Premium</p>
        <h2 className="mt-2 text-xl font-semibold text-white">Inventory tracking is a Premium feature</h2>
        <p className="mt-2 text-sm text-gray-300">
          Upgrade to track farm supplies, medicine, feed stock, reorder levels, costs, and expiration dates.
        </p>
        <a href="/pricing" className="mt-5 inline-flex rounded-lg bg-amber-300 px-4 py-2 font-semibold text-gray-950 hover:bg-amber-200">
          View Premium
        </a>
      </div>
    );
  }

  if (loading) return <InventorySkeleton />;

  const addItem = async () => {
    if (!selectedHerd || adding) return;
    try {
      setAdding(true);
      const response = await premiumRecordsAPI.createInventoryItem({
        herd_id: selectedHerd.id === "unassigned" ? null : selectedHerd.id,
        item_name: "New item",
        category: "Supplies",
        quantity: 0,
        unit: "each",
        reorder_level: 0,
        cost_per_unit: 0,
        supplier: "",
        expiration_date: null,
        use_for_vaccinations: false,
        use_for_health_events: false,
        notes: "",
      });
      const item = response.data;
      signatures.current.set(item.id, JSON.stringify(inventoryPayload(item, selectedHerd)));
      setItems((current) => [item, ...current]);
      setSelectedItem(item);
      toast.success("Inventory item added.");
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || "Failed to add inventory item.");
    } finally {
      setAdding(false);
    }
  };

  const saveItem = async (itemOverride = null) => {
    const item = itemOverride?.id ? itemOverride : selectedItem;
    if (!item?.id) return false;
    const payload = inventoryPayload(item, selectedHerd);
    const signature = JSON.stringify(payload);
    if (signature === signatures.current.get(item.id)) return true;
    try {
      setSaveStatus("saving");
      const response = await premiumRecordsAPI.updateInventoryItem(item.id, payload);
      const saved = response.data;
      signatures.current.set(saved.id, JSON.stringify(inventoryPayload(saved, selectedHerd)));
      setItems((current) => current.map((item) => item.id === saved.id ? saved : item));
      setSelectedItem(saved);
      setSaveStatus("saved");
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => setSaveStatus("idle"), 1600);
      return true;
    } catch (err) {
      setSaveStatus("idle");
      console.error(err);
      toast.error(err.response?.data?.error || "Failed to save inventory item.");
      return false;
    }
  };

  const adjustStock = async (direction) => {
    if (!selectedItem?.id || adjusting) return;
    const amount = number(adjustmentAmount);
    if (amount <= 0) {
      toast.error("Enter an amount greater than zero.");
      return;
    }

    const currentQuantity = number(selectedItem.quantity);
    const nextQuantity = direction === "add"
      ? currentQuantity + amount
      : Math.max(0, currentQuantity - amount);

    try {
      setAdjusting(true);
      const saved = await saveItem({ ...selectedItem, quantity: nextQuantity });
      if (!saved) return;
      toast.success(
        direction === "add"
          ? `Added ${amount} ${selectedItem.unit || "each"} to stock.`
          : `Used ${Math.min(amount, currentQuantity)} ${selectedItem.unit || "each"} from stock.`
      );
    } finally {
      setAdjusting(false);
    }
  };

  const deleteItem = async () => {
    if (!selectedItem?.id || deleting) return;
    try {
      setDeleting(true);
      await premiumRecordsAPI.deleteInventoryItem(selectedItem.id);
      const remaining = items.filter((item) => item.id !== selectedItem.id);
      setItems(remaining);
      setSelectedItem(remaining[0] || null);
      toast.success("Inventory item deleted.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete inventory item.");
    } finally {
      setDeleting(false);
    }
  };

  const fieldClass = "mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-400";
  const statusFor = (item) => {
    const low = number(item.reorder_level) > 0 && number(item.quantity) <= number(item.reorder_level);
    const expiration = item.expiration_date ? new Date(item.expiration_date) : null;
    const soon = new Date();
    soon.setDate(soon.getDate() + 30);
    const expiring = expiration && !Number.isNaN(expiration.getTime()) && expiration <= soon;
    return low ? "Low stock" : expiring ? "Expiring" : "In stock";
  };
  const stockLevelFor = (item) => {
    const quantity = number(item.quantity);
    const reorderLevel = number(item.reorder_level);
    if (reorderLevel <= 0) {
      return {
        percent: quantity > 0 ? 100 : 0,
        message: "Set a reorder point to receive low-stock warnings.",
        tone: "bg-blue-400",
      };
    }

    const difference = quantity - reorderLevel;
    const target = Math.max(reorderLevel * 2, 1);
    return {
      percent: Math.max(0, Math.min(100, Math.round((quantity / target) * 100))),
      message: difference > 0
        ? `${difference.toLocaleString()} ${item.unit || "each"} above the reorder point`
        : difference === 0
        ? "At the reorder point"
        : `${Math.abs(difference).toLocaleString()} ${item.unit || "each"} below the reorder point`,
      tone: difference <= 0 ? "bg-red-400" : quantity <= reorderLevel * 1.25 ? "bg-amber-300" : "bg-emerald-400",
    };
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-blue-300">{selectedHerd?.name || "Herd"}</p>
          <h2 className="mt-1 text-2xl font-semibold text-white">Inventory</h2>
        </div>
        <button onClick={addItem} disabled={adding} className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60">
          {adding ? "Adding..." : "Add item"}
        </button>
      </div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["Items", items.length],
          ["Low stock", summary.lowStock],
          ["Expiring soon", summary.expiring],
          ["Stock value", money(summary.value)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-gray-700 bg-gray-900 p-3 sm:p-4">
            <p className="text-xs text-gray-500">{label}</p>
            <p className="mt-2 text-xl font-bold text-white sm:text-2xl">{value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <div className="rounded-2xl border border-gray-700 bg-gray-800 p-3 sm:p-4">
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search inventory" className={fieldClass} />
          <div className="mt-3 max-h-[420px] space-y-2 overflow-y-auto">
            {visibleItems.length ? visibleItems.map((item) => {
              const status = statusFor(item);
              const stockLevel = stockLevelFor(item);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedItem(item)}
                  className={`w-full rounded-xl border p-3 text-left transition ${
                    selectedItem?.id === item.id ? "border-blue-400 bg-blue-500/15" : "border-gray-700 bg-gray-900 hover:border-gray-500"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-white">{item.item_name || "Unnamed item"}</p>
                      <p className="mt-1 text-xs text-gray-400">{item.quantity || 0} {item.unit || "each"} - {item.category}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${
                      status === "Low stock" ? "bg-red-500/15 text-red-200" : status === "Expiring" ? "bg-amber-400/15 text-amber-100" : "bg-emerald-400/15 text-emerald-100"
                    }`}>{status}</span>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-700">
                    <div className={`h-full rounded-full ${stockLevel.tone}`} style={{ width: `${stockLevel.percent}%` }} />
                  </div>
                </button>
              );
            }) : (
              <div className="rounded-xl border border-dashed border-gray-700 p-5 text-center text-sm text-gray-400">No inventory items found.</div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-700 bg-gray-800 p-3 sm:p-5">
          {selectedItem ? (
            <>
              {(() => {
                const stockLevel = stockLevelFor(selectedItem);
                return (
                  <section className="mb-4 rounded-xl border border-gray-700 bg-gray-900 p-3 sm:p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">On hand</p>
                        <p className="mt-1 text-3xl font-bold text-white">
                          {number(selectedItem.quantity).toLocaleString()}{" "}
                          <span className="text-base font-medium text-gray-400">{selectedItem.unit || "each"}</span>
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Reorder at or below</p>
                        <p className="mt-1 font-semibold text-white">
                          {number(selectedItem.reorder_level).toLocaleString()} {selectedItem.unit || "each"}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-700">
                      <div className={`h-full rounded-full transition-all ${stockLevel.tone}`} style={{ width: `${stockLevel.percent}%` }} />
                    </div>
                    <p className="mt-2 text-xs text-gray-400">{stockLevel.message}</p>

                    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-[1fr_auto_auto]">
                      <label className="col-span-2 text-xs text-gray-400 sm:col-span-1">
                        Adjustment amount
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={adjustmentAmount}
                          onChange={(event) => setAdjustmentAmount(event.target.value)}
                          className={fieldClass}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => adjustStock("remove")}
                        disabled={adjusting}
                        className="self-end rounded-lg border border-amber-300/30 bg-amber-400/10 px-3 py-2.5 text-sm font-semibold text-amber-100 hover:bg-amber-400/20 disabled:opacity-60"
                      >
                        Use stock
                      </button>
                      <button
                        type="button"
                        onClick={() => adjustStock("add")}
                        disabled={adjusting}
                        className="self-end rounded-lg bg-emerald-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
                      >
                        Restock
                      </button>
                    </div>
                  </section>
                );
              })()}
              <div className="grid gap-3 md:grid-cols-2">
                <label className="text-xs text-gray-400">Item name<input value={selectedItem.item_name || ""} onFocus={(e) => { if (e.target.value === "New item") setSelectedItem({ ...selectedItem, item_name: "" }); }} onChange={(e) => setSelectedItem({ ...selectedItem, item_name: e.target.value })} onBlur={saveItem} placeholder="Item name" className={fieldClass} /></label>
                <label className="text-xs text-gray-400">Category<select value={selectedItem.category || "Supplies"} onChange={(e) => setSelectedItem({ ...selectedItem, category: e.target.value })} onBlur={saveItem} className={fieldClass}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
                <label className="text-xs text-gray-400">Current quantity on hand<input type="number" min="0" step="0.01" value={selectedItem.quantity || ""} onChange={(e) => setSelectedItem({ ...selectedItem, quantity: e.target.value })} onBlur={saveItem} className={fieldClass} /></label>
                <label className="text-xs text-gray-400">Unit<select value={selectedItem.unit || "each"} onChange={(e) => setSelectedItem({ ...selectedItem, unit: e.target.value })} onBlur={saveItem} className={fieldClass}>{units.map((unit) => <option key={unit}>{unit}</option>)}</select></label>
                <label className="text-xs text-gray-400">
                  Reorder when quantity is at or below
                  <input type="number" min="0" step="0.01" value={selectedItem.reorder_level || ""} onChange={(e) => setSelectedItem({ ...selectedItem, reorder_level: e.target.value })} onBlur={saveItem} className={fieldClass} />
                  <span className="mt-1 block text-[11px] text-gray-500">Set to 0 to turn off low-stock warnings.</span>
                </label>
                <label className="text-xs text-gray-400">Cost per unit<input type="number" min="0" step="0.01" value={selectedItem.cost_per_unit || ""} onChange={(e) => setSelectedItem({ ...selectedItem, cost_per_unit: e.target.value })} onBlur={saveItem} className={fieldClass} /></label>
                <label className="text-xs text-gray-400">Supplier<input value={selectedItem.supplier || ""} onChange={(e) => setSelectedItem({ ...selectedItem, supplier: e.target.value })} onBlur={saveItem} className={fieldClass} /></label>
                <label className="text-xs text-gray-400">Expiration date<input type="date" value={dateValue(selectedItem.expiration_date)} onChange={(e) => setSelectedItem({ ...selectedItem, expiration_date: e.target.value })} onBlur={saveItem} className={fieldClass} /></label>
                <div className="rounded-xl border border-gray-700 bg-gray-900 p-3 md:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">Use this item in records</p>
                  <p className="mt-1 text-xs text-gray-400">Selected record types can automatically subtract this item from stock.</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-gray-200">
                      <input
                        type="checkbox"
                        checked={Boolean(selectedItem.use_for_vaccinations)}
                        onChange={(event) => {
                          const next = { ...selectedItem, use_for_vaccinations: event.target.checked };
                          setSelectedItem(next);
                          saveItem(next);
                        }}
                        className="h-4 w-4 accent-blue-500"
                      />
                      Vaccinations
                    </label>
                    <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-gray-200">
                      <input
                        type="checkbox"
                        checked={Boolean(selectedItem.use_for_health_events)}
                        onChange={(event) => {
                          const next = { ...selectedItem, use_for_health_events: event.target.checked };
                          setSelectedItem(next);
                          saveItem(next);
                        }}
                        className="h-4 w-4 accent-blue-500"
                      />
                      Health treatments
                    </label>
                  </div>
                </div>
                <label className="text-xs text-gray-400 md:col-span-2">Notes<textarea rows="4" value={selectedItem.notes || ""} onChange={(e) => setSelectedItem({ ...selectedItem, notes: e.target.value })} onBlur={saveItem} className={fieldClass} /></label>
              </div>
              <div className="mt-4 flex items-center justify-between gap-3">
                <span className={`rounded-lg px-3 py-2 text-sm font-semibold ${saveStatus === "saved" ? "bg-emerald-500/15 text-emerald-200" : "bg-gray-700 text-gray-300"}`}>
                  {saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? "Saved" : "Auto-saves on blur"}
                </span>
                <button onClick={deleteItem} disabled={deleting} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-60">
                  {deleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </>
          ) : (
            <div className="grid min-h-72 place-items-center rounded-xl border border-dashed border-gray-700 text-sm text-gray-400">Add or select an inventory item.</div>
          )}
        </div>
      </section>
    </div>
  );
}
