import React, { useState } from "react";
import { updateHerd, deleteHerd } from "../api/herds";

export default function HerdCard({ herd, onRefresh }) {
  const [name, setName] = useState(herd.name);
  const [location, setLocation] = useState(herd.location || "");
  const [description, setDescription] = useState(herd.description || "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await updateHerd(herd.id, { name, location, description });
    setSaving(false);
    onRefresh();
  }

  async function handleDelete() {
    if (!window.confirm("Delete this herd? This cannot be undone.")) return;
    await deleteHerd(herd.id);
    onRefresh();
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
          className="px-4 py-2 bg-blue-600 rounded-xl hover:bg-blue-500 disabled:opacity-50"
        >
          Save
        </button>

        <button
          onClick={handleDelete}
          className="px-4 py-2 bg-red-600 rounded-xl hover:bg-red-500"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
