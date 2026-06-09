import React, { useState } from "react";
import { updateHerd, deleteHerd } from "../api/herd";
import { toast } from "react-toastify";

export default function HerdCard({ herd, onRefresh }) {
  const [name, setName] = useState(herd.name);
  const [location, setLocation] = useState(herd.location || "");
  const [description, setDescription] = useState(herd.description || "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    try {
      await updateHerd(herd.id, { name, location, description });
      onRefresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (deleting) return;
    if (!window.confirm("Delete this herd? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await deleteHerd(herd.id);
      toast.success(`${herd.name || "Herd"} deleted.`);
      onRefresh();
    } catch (err) {
      console.error("Failed to delete herd:", err.response?.data || err.message);
      toast.error("Failed to delete herd.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="bg-gray-700 border border-gray-600 rounded-xl p-4 space-y-3 h-screen">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2"
      />

      <input
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        placeholder="Location"
        className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2"
      />

      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description"
        className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 resize-none"
      />

      <div className="flex justify-between">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-blue-600 rounded-xl hover:bg-blue-500 disabled:cursor-wait disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>

        <button
          onClick={handleDelete}
          disabled={deleting}
          className="px-4 py-2 bg-red-600 rounded-xl hover:bg-red-500 disabled:cursor-wait disabled:opacity-50"
        >
          {deleting ? "Deleting..." : "Delete"}
        </button>
      </div>
    </div>
  );
}
