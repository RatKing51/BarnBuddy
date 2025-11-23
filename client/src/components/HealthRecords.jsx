import React, { useState } from "react";

export default function HealthRecords() {
  // ------------------ Basic Health Info ------------------
  const [weight, setWeight] = useState("450 lbs");
  const [bodyCondition, setBodyCondition] = useState("Good");
  const [temperature, setTemperature] = useState("101°F");

  // ------------------ Health Events ------------------
  const [healthEventsData, setHealthEventsData] = useState([
    { description: "Rabies Vaccine", resolved: "Yes", notes: "No issues", type: "Vaccination", severity: "Low", date: "12/05/2025" },
    { description: "Deworming", resolved: "Yes", notes: "Normal procedure", type: "Treatment", severity: "Low", date: "12/20/2025" },
    { description: "Pregnancy Check", resolved: "Pending", notes: "", type: "Checkup", severity: "Medium", date: "01/10/2026" },
  ]);
  const [selectedEventIndex, setSelectedEventIndex] = useState(0);

  const handleAddEvent = () => {
    const newEvent = { description: "", resolved: "No", notes: "", type: "", severity: "Low", date: "" };
    setHealthEventsData([...healthEventsData, newEvent]);
    setSelectedEventIndex(healthEventsData.length);
  };

  // ------------------ Vaccination History ------------------
  const [vaccinations, setVaccinations] = useState([
    { date: "01/10/2025", type: "Rabies", notes: "Normal" },
    { date: "03/15/2025", type: "Tetanus", notes: "Slight soreness" },
    { date: "06/20/2025", type: "Deworming", notes: "All good" },
  ]);
  const [selectedVaccineIndex, setSelectedVaccineIndex] = useState(0);

  const handleAddVaccine = () => {
    const newVaccine = { date: "", type: "", notes: "" };
    setVaccinations([...vaccinations, newVaccine]);
    setSelectedVaccineIndex(vaccinations.length);
  };

  // ------------------ Birth Info ------------------
  const [birthDate, setBirthDate] = useState("05/20/2025");
  const [birthWeight, setBirthWeight] = useState("50 lbs");
  const [birthNotes, setBirthNotes] = useState("Healthy birth, no complications");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full overflow-auto p-2">
      {/* ------------------ Basic Health Info ------------------ */}
      <div className="bg-gray-800 p-4 md:p-6 rounded-2xl border border-gray-700 space-y-4 overflow-auto">
        <h3 className="text-gray-400 font-semibold mb-2">Basic Health Info</h3>
        <div>
          <label className="block text-gray-400 text-sm mb-1">Weight</label>
          <input
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="w-full bg-gray-700 text-gray-100 border border-gray-600 rounded-lg px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-gray-400 text-sm mb-1">Body Condition</label>
          <input
            value={bodyCondition}
            onChange={(e) => setBodyCondition(e.target.value)}
            className="w-full bg-gray-700 text-gray-100 border border-gray-600 rounded-lg px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-gray-400 text-sm mb-1">Temperature</label>
          <input
            value={temperature}
            onChange={(e) => setTemperature(e.target.value)}
            className="w-full bg-gray-700 text-gray-100 border border-gray-600 rounded-lg px-3 py-2"
          />
        </div>
      </div>

      {/* ------------------ Health Events ------------------ */}
      <div className="bg-gray-800 p-4 md:p-6 rounded-2xl border border-gray-700 flex flex-col md:flex-row overflow-auto">
        {/* Selector */}
        <div className="w-full md:w-1/4 pr-0 md:pr-4 border-b md:border-b-0 md:border-r border-gray-700 flex flex-row md:flex-col gap-2 overflow-auto">
          {healthEventsData.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedEventIndex(idx)}
              className={`px-3 py-2 rounded-lg border text-xs md:text-sm ${
                selectedEventIndex === idx
                  ? "bg-blue-600 border-blue-500 text-white"
                  : "bg-gray-700 border-gray-600 text-gray-100 hover:bg-gray-600"
              }`}
            >
              {healthEventsData[idx].date || "New"}
            </button>
          ))}
          <button
            onClick={handleAddEvent}
            className="px-3 py-2 rounded-lg border border-gray-600 bg-gray-700 text-gray-100 hover:bg-gray-600 mt-2"
          >
            + Add New
          </button>
        </div>

        {/* Details */}
        <div className="w-full md:w-3/4 pl-0 md:pl-4 mt-2 md:mt-0 space-y-2 overflow-auto">
          {["description", "resolved", "notes", "type", "severity", "date"].map((field) => (
            <div key={field}>
              <label className="block text-gray-400 text-sm mb-1">
                {field.charAt(0).toUpperCase() + field.slice(1)}
              </label>
              {field === "notes" ? (
                <textarea
                  value={healthEventsData[selectedEventIndex][field]}
                  onChange={(e) => {
                    const updated = [...healthEventsData];
                    updated[selectedEventIndex][field] = e.target.value;
                    setHealthEventsData(updated);
                  }}
                  className="w-full bg-gray-700 text-gray-100 border border-gray-600 rounded-lg px-3 py-2"
                />
              ) : (
                <input
                  value={healthEventsData[selectedEventIndex][field]}
                  onChange={(e) => {
                    const updated = [...healthEventsData];
                    updated[selectedEventIndex][field] = e.target.value;
                    setHealthEventsData(updated);
                  }}
                  className="w-full bg-gray-700 text-gray-100 border border-gray-600 rounded-lg px-3 py-2"
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ------------------ Vaccinations ------------------ */}
      <div className="bg-gray-800 p-4 md:p-6 rounded-2xl border border-gray-700 flex flex-col md:flex-row overflow-auto">
        <div className="w-full md:w-1/4 pr-0 md:pr-4 border-b md:border-b-0 md:border-r border-gray-700 flex flex-row md:flex-col gap-2 overflow-auto">
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

        <div className="w-full md:w-3/4 pl-0 md:pl-4 mt-2 md:mt-0 space-y-2 overflow-auto">
          {["date", "type", "notes"].map((field) => (
            <div key={field}>
              <label className="block text-gray-400 text-sm mb-1">{field.charAt(0).toUpperCase() + field.slice(1)}</label>
              {field === "notes" ? (
                <textarea
                  value={vaccinations[selectedVaccineIndex][field]}
                  onChange={(e) => {
                    const updated = [...vaccinations];
                    updated[selectedVaccineIndex][field] = e.target.value;
                    setVaccinations(updated);
                  }}
                  className="w-full bg-gray-700 text-gray-100 border border-gray-600 rounded-lg px-3 py-2"
                />
              ) : (
                <input
                  value={vaccinations[selectedVaccineIndex][field]}
                  onChange={(e) => {
                    const updated = [...vaccinations];
                    updated[selectedVaccineIndex][field] = e.target.value;
                    setVaccinations(updated);
                  }}
                  className="w-full bg-gray-700 text-gray-100 border border-gray-600 rounded-lg px-3 py-2"
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ------------------ Birth Info ------------------ */}
      <div className="bg-gray-800 p-4 md:p-6 rounded-2xl border border-gray-700 space-y-4 overflow-auto">
        <h3 className="text-gray-400 font-semibold mb-2">Birth Info</h3>
        <div>
          <label className="block text-gray-400 text-sm mb-1">Birth Date</label>
          <input
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            className="w-full bg-gray-700 text-gray-100 border border-gray-600 rounded-lg px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-gray-400 text-sm mb-1">Birth Weight</label>
          <input
            value={birthWeight}
            onChange={(e) => setBirthWeight(e.target.value)}
            className="w-full bg-gray-700 text-gray-100 border border-gray-600 rounded-lg px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-gray-400 text-sm mb-1">Notes</label>
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
