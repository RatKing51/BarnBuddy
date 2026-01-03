import React, { useState } from "react";

export default function HealthRecords({ animal }) {
  // ------------------ Basic Health Info ------------------
  const [weight, setWeight] = useState("");
  const [bodyCondition, setBodyCondition] = useState("");
  const [temperature, setTemperature] = useState("");

  // ------------------ Health Events ------------------
  const [healthEvents, setHealthEvents] = useState([]);
  const [selectedEventIndex, setSelectedEventIndex] = useState(0);

  const handleAddEvent = () => {
    const newEvent = { description: "", resolved: "", notes: "", type: "", severity: "", date: "" };
    setHealthEvents([...healthEvents, newEvent]);
    setSelectedEventIndex(healthEvents.length);
  };

  // ------------------ Vaccinations ------------------
  const [vaccinations, setVaccinations] = useState([]);
  const [selectedVaccineIndex, setSelectedVaccineIndex] = useState(0);

  const handleAddVaccine = () => {
    const newVaccine = { date: "", type: "", notes: "" };
    setVaccinations([...vaccinations, newVaccine]);
    setSelectedVaccineIndex(vaccinations.length);
  };

  // ------------------ Birth Info ------------------
  const [birthDate, setBirthDate] = useState("");
  const [birthWeight, setBirthWeight] = useState("");
  const [birthNotes, setBirthNotes] = useState("");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full overflow-auto p-2">
      {/* ------------------ Basic Health Info ------------------ */}
      <div className="bg-gray-800 p-4 rounded-2xl border border-gray-700 flex flex-col h-[400px] overflow-y-auto space-y-4">
        <h3 className="text-gray-400 font-semibold">Basic Health Info</h3>
        {[
          { label: "Weight", value: weight, setter: setWeight },
          { label: "Body Condition", value: bodyCondition, setter: setBodyCondition },
          { label: "Temperature", value: temperature, setter: setTemperature },
        ].map(({ label, value, setter }) => (
          <div key={label}>
            <label className="block text-gray-400 text-sm mb-1 capitalize">{label}</label>
            <input
              value={value}
              onChange={(e) => setter(e.target.value)}
              className="w-full bg-gray-700 text-gray-100 border border-gray-600 rounded-lg px-3 py-2"
            />
          </div>
        ))}
      </div>

      {/* ------------------ Health Events ------------------ */}
      <div className="bg-gray-800 p-4 rounded-2xl border border-gray-700 flex flex-col h-[400px] overflow-y-auto">
        <h3 className="text-gray-400 font-semibold mb-4">Health Events</h3>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="md:w-1/4 flex flex-col gap-2">
            {healthEvents.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedEventIndex(idx)}
                className={`px-3 py-2 rounded-lg border text-xs md:text-sm ${
                  selectedEventIndex === idx
                    ? "bg-blue-600 border-blue-500 text-white"
                    : "bg-gray-700 border-gray-600 text-gray-100 hover:bg-gray-600"
                }`}
              >
                {healthEvents[idx].date || "New"}
              </button>
            ))}
            <button
              onClick={handleAddEvent}
              className="px-3 py-2 rounded-lg border border-gray-600 bg-gray-700 text-gray-100 hover:bg-gray-600 mt-2"
            >
              + Add New
            </button>
          </div>

          <div className="md:w-3/4 space-y-2">
            {["description", "resolved", "notes", "type", "severity", "date"].map((field) => (
              <div key={field}>
                <label className="block text-gray-400 text-sm mb-1 capitalize">{field}</label>
                {field === "notes" ? (
                  <textarea
                    value={healthEvents[selectedEventIndex]?.[field] || ""}
                    onChange={(e) => {
                      const updated = [...healthEvents];
                      updated[selectedEventIndex] = updated[selectedEventIndex] || {};
                      updated[selectedEventIndex][field] = e.target.value;
                      setHealthEvents(updated);
                    }}
                    className="w-full bg-gray-700 text-gray-100 border border-gray-600 rounded-lg px-3 py-2"
                  />
                ) : (
                  <input
                    value={healthEvents[selectedEventIndex]?.[field] || ""}
                    onChange={(e) => {
                      const updated = [...healthEvents];
                      updated[selectedEventIndex] = updated[selectedEventIndex] || {};
                      updated[selectedEventIndex][field] = e.target.value;
                      setHealthEvents(updated);
                    }}
                    className="w-full bg-gray-700 text-gray-100 border border-gray-600 rounded-lg px-3 py-2"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ------------------ Vaccinations ------------------ */}
      <div className="bg-gray-800 p-4 rounded-2xl border border-gray-700 flex flex-col h-[400px] overflow-y-auto">
        <h3 className="text-gray-400 font-semibold mb-4">Vaccinations</h3>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="md:w-1/4 flex flex-col gap-2">
            {vaccinations.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedVaccineIndex(idx)}
                className={`px-3 py-2 rounded-lg border text-xs md:text-sm ${
                  selectedVaccineIndex === idx
                    ? "bg-blue-600 border-blue-500 text-white"
                    : "bg-gray-700 border-gray-600 text-gray-100 hover:bg-gray-600"
                }`}
              >
                {vaccinations[idx].date || "New"}
              </button>
            ))}
            <button
              onClick={handleAddVaccine}
              className="px-3 py-2 rounded-lg border border-gray-600 bg-gray-700 text-gray-100 hover:bg-gray-600 mt-2"
            >
              + Add New
            </button>
          </div>

          <div className="md:w-3/4 space-y-2">
            {["date", "type", "notes"].map((field) => (
              <div key={field}>
                <label className="block text-gray-400 text-sm mb-1 capitalize">{field}</label>
                <input
                  value={vaccinations[selectedVaccineIndex]?.[field] || ""}
                  onChange={(e) => {
                    const updated = [...vaccinations];
                    updated[selectedVaccineIndex] = updated[selectedVaccineIndex] || {};
                    updated[selectedVaccineIndex][field] = e.target.value;
                    setVaccinations(updated);
                  }}
                  className="w-full bg-gray-700 text-gray-100 border border-gray-600 rounded-lg px-3 py-2"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ------------------ Birth Info ------------------ */}
      <div className="bg-gray-800 p-4 rounded-2xl border border-gray-700 flex flex-col h-[400px] overflow-y-auto space-y-4">
        <h3 className="text-gray-400 font-semibold">Birth Info</h3>
        {[
          { label: "Birth Date", value: birthDate, setter: setBirthDate },
          { label: "Birth Weight", value: birthWeight, setter: setBirthWeight },
        ].map(({ label, value, setter }) => (
          <div key={label}>
            <label className="block text-gray-400 text-sm mb-1 capitalize">{label}</label>
            <input
              value={value}
              onChange={(e) => setter(e.target.value)}
              className="w-full bg-gray-700 text-gray-100 border border-gray-600 rounded-lg px-3 py-2"
            />
          </div>
        ))}
        <div>
          <label className="block text-gray-400 text-sm mb-1 capitalize">Notes</label>
          <textarea
            value={birthNotes}
            onChange={(e) => setBirthNotes(e.target.value)}
            className="w-full bg-gray-700 text-gray-100 border border-gray-600 rounded-lg px-3 py-2"
          />
        </div>
      </div>
    </div>
  );
}