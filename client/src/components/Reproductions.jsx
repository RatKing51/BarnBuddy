import React, { useState } from "react";

export default function Reproductions({ animals=[] }) {
  const [record, setRecord] = useState({
    damId: animals[0]?.id || "",
    sireId: animals[0]?.id || "",
    breedingDate: "",
    dueDate: "",
    outcome: "",
    notes: "",
  });

  const [history, setHistory] = useState([]);

  const addRecord = () => {
    setHistory([...history, record]);
    // Reset form
    setRecord({
      damId: animals[0]?.id || "",
      sireId: animals[0]?.id || "",
      breedingDate: "",
      dueDate: "",
      outcome: "",
      notes: "",
    });
  };

  return (
    <div className="flex flex-col gap-6 h-full">
      {/* Top Grid */}
      <div className="grid grid-cols-2 gap-6">
        {/* Left Panel: Dam, Sire, Breeding, Due */}
        <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 space-y-4">
          <div>
            <label className="block text-gray-400 text-sm mb-1">Dam</label>
            <select
              value={record.damId}
              onChange={(e) => setRecord({ ...record, damId: e.target.value })}
              className="w-full bg-gray-700 text-gray-100 border border-gray-600 rounded-lg px-3 py-2"
            >
              {animals.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-1">Sire</label>
            <select
              value={record.sireId}
              onChange={(e) => setRecord({ ...record, sireId: e.target.value })}
              className="w-full bg-gray-700 text-gray-100 border border-gray-600 rounded-lg px-3 py-2"
            >
              {animals.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-1">Breeding Date</label>
            <input
              type="date"
              value={record.breedingDate}
              onChange={(e) =>
                setRecord({ ...record, breedingDate: e.target.value })
              }
              className="w-full bg-gray-700 text-gray-100 border border-gray-600 rounded-lg px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-1">Due Date</label>
            <input
              type="date"
              value={record.dueDate}
              onChange={(e) => setRecord({ ...record, dueDate: e.target.value })}
              className="w-full bg-gray-700 text-gray-100 border border-gray-600 rounded-lg px-3 py-2"
            />
          </div>
        </div>

        {/* Right Panel: Outcome + Notes */}
        <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 flex flex-col space-y-4">
          <div>
            <label className="block text-gray-400 text-sm mb-1">Outcome</label>
            <input
              type="text"
              value={record.outcome}
              onChange={(e) => setRecord({ ...record, outcome: e.target.value })}
              className="w-full bg-gray-700 text-gray-100 border border-gray-600 rounded-lg px-3 py-2"
            />
          </div>

          <div className="flex-1">
            <label className="block text-gray-400 text-sm mb-1">Notes</label>
            <textarea
              value={record.notes}
              onChange={(e) => setRecord({ ...record, notes: e.target.value })}
              className="w-full h-full bg-gray-700 text-gray-100 border border-gray-600 rounded-lg px-3 py-2 resize-none"
            />
          </div>
        </div>
      </div>

      {/* Bottom: History Table */}
      <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 overflow-x-auto">
        <h3 className="text-gray-400 font-semibold mb-4">Reproduction History</h3>
        <table className="w-full text-sm text-gray-200">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="py-2 px-3 text-left">Dam</th>
              <th className="py-2 px-3 text-left">Sire</th>
              <th className="py-2 px-3 text-left">Breeding Date</th>
              <th className="py-2 px-3 text-left">Due Date</th>
              <th className="py-2 px-3 text-left">Outcome</th>
              <th className="py-2 px-3 text-left">Notes</th>
            </tr>
          </thead>
          <tbody>
            {history.map((h, idx) => (
              <tr key={idx} className="border-b border-gray-700">
                <td className="py-2 px-3">{animals.find(a => a.id === h.damId)?.name}</td>
                <td className="py-2 px-3">{animals.find(a => a.id === h.sireId)?.name}</td>
                <td className="py-2 px-3">{h.breedingDate}</td>
                <td className="py-2 px-3">{h.dueDate}</td>
                <td className="py-2 px-3">{h.outcome}</td>
                <td className="py-2 px-3">{h.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <button
          onClick={addRecord}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition"
        >
          Add Record
        </button>
      </div>
    </div>
  );
}
