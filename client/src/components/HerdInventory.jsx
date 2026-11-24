import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import * as premiumRecordsAPI from "../api/premiumRecords";
import { LoadingSpinner } from "./LoadingSpinner";

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
    expiration_date: dateValue(item.expiration_date) || null,
    use_for_vaccinations: Boolean(item.use_for_vaccinations),
    use_for_health_events: Boolean(item.use_for_health_events),
    notes: item.notes || "",
  };
}

export default function HerdInventory({ selectedHerd, isPremium = false }) {
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(Boolean(selectedHerd && isPremium));
  const [loadError, setLoadError] = useState(false);
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
        setLoadError(false);
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
        if (!cancelled) setLoadError(true);
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
      <div className="bb-record-panel bb-panel-inset">
        <h2>Inventory tracking is a Premium feature</h2>
        <p className="mt-1 text-sm bb-work-muted">
          Upgrade to track farm supplies, medicine, feed stock, reorder levels, costs, and expiration dates.
        </p>
        <a href="/pricing" className="bb-action bb-action-primary mt-4">
          View Premium
        </a>
      </div>
    );
  }

  if (loading) {
    return <div className="bb-record-panel bb-panel-inset"><LoadingSpinner label="Loading inventory…" /></div>;
  }
  if (loadError || !selectedHerd) {
    return (
      <div className="bb-record-panel bb-panel-inset">
        <p role={loadError ? "alert" : "status"} className="bb-work-muted">
          {loadError ? "Inventory couldn’t load. Refresh the page to try again." : "Select a herd to view its inventory."}
        </p>
      </div>
    );
  }

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
      setSearch("");
      toast.success("Inventory item added.");
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || "Failed to add inventory item.");
    } finally {
      setAdding(false);
    }
  };

  const saveItem = async (itemOverride = null) => {
    const editingItem = selectedItem;
    const item = itemOverride?.id ? itemOverride : editingItem;
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
      setSelectedItem(current => current === item || current === editingItem ? saved : current);
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

  const fieldClass = "bb-field mt-1";
  const labelClass = "block text-sm bb-work-muted";
  const quantity = number(selectedItem?.quantity);
  const reorderLevel = number(selectedItem?.reorder_level);
  const unit = selectedItem?.unit || "each";
  const updateDraft = (field, value) => setSelectedItem(current => ({ ...current, [field]: value }));
  const addButton = (
    <button type="button" onClick={addItem} disabled={adding} className="bb-action bb-action-primary">
      {adding ? "Adding…" : "Add item"}
    </button>
  );

  if (!items.length) {
    return (
      <section className="bb-record-panel bb-panel-inset flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2>No inventory items yet</h2>
          <p className="mt-1 text-sm bb-work-muted">Add feed, medicine, or supplies to track what you have on hand.</p>
        </div>
        {addButton}
      </section>
    );
  }

  return (
    <div className="bb-inventory space-y-4 sm:space-y-5">
      <dl aria-label="Inventory summary" className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        {[
          ["Items", items.length],
          ["Low stock", summary.lowStock],
          ["Expiring soon", summary.expiring],
          ["Stock value", money(summary.value)],
        ].map(([label, value]) => (
          <div key={label} className="bb-record-panel px-3 py-2.5 tabular-nums sm:px-4">
            <dt className="text-xs bb-work-muted sm:text-sm">{label}</dt>
            <dd className="mt-1 text-lg font-semibold sm:text-xl">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="bb-inventory-panels">
        <section aria-labelledby="inventory-items-heading" className="bb-record-panel">
          <div className="bb-inventory-list-header">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="inventory-items-heading" className="text-base font-semibold">Stock list</h2>
              {addButton}
            </div>
            <input aria-label="Search inventory" type="search" value={search} onChange={event => setSearch(event.target.value)}
              placeholder="Name, category, or supplier" className="bb-field" />
          </div>
          {visibleItems.length ? (
            <ul className="bb-inventory-list">
              {visibleItems.map(item => {
                const onHand = number(item.quantity);
                const threshold = number(item.reorder_level);
                const expiration = item.expiration_date ? new Date(item.expiration_date) : null;
                const soon = new Date();
                soon.setDate(soon.getDate() + 30);
                const low = threshold > 0 && onHand <= threshold;
                const expiring = expiration && expiration <= soon;
                const status = low ? "Low stock" : onHand <= 0 ? "Out of stock" : expiring ? "Expiring" : "In stock";
                const tone = low || onHand <= 0 ? "red" : expiring ? "yellow" : "green";

                return (
                  <li key={item.id}>
                    <button type="button" aria-pressed={selectedItem?.id === item.id} onClick={() => setSelectedItem(item)}>
                      <span className="bb-directory-name">
                        <strong>{item.item_name || "Unnamed item"}</strong>
                        <span>{onHand.toLocaleString()} {item.unit || "each"} · {item.category || "Supplies"}</span>
                      </span>
                      <span className="bb-care-label" data-status={tone}>{status}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="p-4 text-sm">
              <p className="bb-work-muted">No inventory items match your search.</p>
              <button type="button" className="bb-text-link mt-1" onClick={() => setSearch("")}>Clear search</button>
            </div>
          )}
        </section>

        {selectedItem && (
          <section aria-labelledby="inventory-item-heading" className="bb-record-panel bb-panel-inset">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="inventory-item-heading" className="min-w-0 wrap-anywhere">{selectedItem.item_name || "Item details"}</h2>
              <p role="status" className="text-sm bb-work-muted">
                {saveStatus === "saving" ? "Saving…" : saveStatus === "saved" ? "Saved" : "Auto-saves"}
              </p>
            </div>

            <section aria-label="Stock adjustment" className="bb-inventory-stock">
              <dl className="flex flex-wrap gap-5">
                <div>
                  <dt className="text-sm bb-work-muted">On hand</dt>
                  <dd className="mt-0.5 font-semibold tabular-nums">{quantity.toLocaleString()} {unit}</dd>
                </div>
                <div>
                  <dt className="text-sm bb-work-muted">Reorder point</dt>
                  <dd className="mt-0.5 font-semibold tabular-nums">{reorderLevel ? `${reorderLevel.toLocaleString()} ${unit}` : "Off"}</dd>
                </div>
              </dl>
              <div className="bb-inventory-adjustment">
                <label className={labelClass}>
                  Adjustment amount
                  <input type="number" min="0.01" step="0.01" value={adjustmentAmount}
                    onChange={event => setAdjustmentAmount(event.target.value)} className={fieldClass} />
                </label>
                <button type="button" onClick={() => adjustStock("remove")} disabled={adjusting} className="bb-action">Use stock</button>
                <button type="button" onClick={() => adjustStock("add")} disabled={adjusting} className="bb-action bb-action-primary">Restock</button>
              </div>
            </section>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className={labelClass}>
                Item name
                <input value={selectedItem.item_name || ""} onFocus={event => { if (event.target.value === "New item") event.target.select(); }}
                  onChange={event => updateDraft("item_name", event.target.value)} onBlur={saveItem} className={fieldClass} />
              </label>
              <label className={labelClass}>
                Category
                <select value={selectedItem.category || "Supplies"} onChange={event => updateDraft("category", event.target.value)} onBlur={saveItem} className={fieldClass}>
                  {categories.map(category => <option key={category}>{category}</option>)}
                </select>
              </label>
              <label className={labelClass}>
                Quantity
                <input type="number" min="0" step="0.01" value={selectedItem.quantity ?? ""} onChange={event => updateDraft("quantity", event.target.value)}
                  onBlur={saveItem} className={fieldClass} />
              </label>
              <label className={labelClass}>
                Unit
                <select value={unit} onChange={event => updateDraft("unit", event.target.value)} onBlur={saveItem} className={fieldClass}>
                  {units.map(itemUnit => <option key={itemUnit}>{itemUnit}</option>)}
                </select>
              </label>
              <label className={labelClass}>
                Reorder point
                <input type="number" min="0" step="0.01" value={selectedItem.reorder_level ?? ""} onChange={event => updateDraft("reorder_level", event.target.value)}
                  onBlur={saveItem} className={fieldClass} />
                <span className="mt-1 block text-xs">Set to 0 to turn off low-stock warnings.</span>
              </label>
              <label className={labelClass}>
                Cost per unit
                <input type="number" min="0" step="0.01" value={selectedItem.cost_per_unit ?? ""} onChange={event => updateDraft("cost_per_unit", event.target.value)}
                  onBlur={saveItem} className={fieldClass} />
              </label>
              <label className={labelClass}>
                Supplier
                <input value={selectedItem.supplier || ""} onChange={event => updateDraft("supplier", event.target.value)}
                  onBlur={saveItem} className={fieldClass} />
              </label>
              <label className={labelClass}>
                Expiration date
                <input type="date" value={dateValue(selectedItem.expiration_date)} onChange={event => updateDraft("expiration_date", event.target.value)}
                  onBlur={saveItem} className={fieldClass} />
              </label>
              <label className={`${labelClass} sm:col-span-2`}>
                Notes
                <textarea rows="3" value={selectedItem.notes || ""} onChange={event => updateDraft("notes", event.target.value)}
                  onBlur={saveItem} className={fieldClass} />
              </label>
            </div>

            <fieldset className="bb-inventory-records">
              <legend className="font-semibold">Use this item in records</legend>
              <p className="text-sm bb-work-muted">Selected record types can subtract this item from stock.</p>
              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1">
                {[
                  ["use_for_vaccinations", "Vaccinations"],
                  ["use_for_health_events", "Health treatments"],
                ].map(([field, label]) => (
                  <label key={field} className="flex min-h-11 items-center gap-2 text-sm">
                    <input type="checkbox" checked={Boolean(selectedItem[field])} className="h-4 w-4 accent-blue-500"
                      onChange={event => {
                        const next = { ...selectedItem, [field]: event.target.checked };
                        setSelectedItem(next);
                        saveItem(next);
                      }} />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
            <button type="button" onClick={deleteItem} disabled={deleting} className="bb-action mt-3 text-red-300">
              {deleting ? "Deleting…" : "Delete item"}
            </button>
          </section>
        )}
      </div>
    </div>
  );
}
