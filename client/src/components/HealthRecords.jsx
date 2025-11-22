import React, { useState } from "react";

export default function HealthRecords() {
  // ------------------ Basic Health Info ------------------
  const [weight, setWeight] = useState("450 lbs");
  const [bodyCondition, setBodyCondition] = useState("Good");
  const [temperature, setTemperature] = useState("101°F");

  // ------------------ Upcoming Health ------------------
  const upcoming = [
    { name: "Rabies Vaccine", date: "12/05/2025" },
    { name: "Deworming", date: "12/20/2025" },
    { name: "Pregnancy Check", date: "01/10/2026" },
  ];

  // ------------------ Vaccination History ------------------
  const vaccinations = [
    { date: "01/10/2025", type: "Rabies", notes: "Normal" },
    { date: "03/15/2025", type: "Tetanus", notes: "Slight soreness" },
    { date: "06/20/2025", type: "Deworming", notes: "All good" },
  ];
  const [selectedVaccine, setSelectedVaccine] = useState(vaccinations[0]);

  // ------------------ Birth Info ------------------
  const [birthDate, setBirthDate] = useState("05/20/2025");
  const [birthWeight, setBirthWeight] = useState("50 lbs");
  const [notes, setNotes] = useState("Healthy birth, no complications");

  return (
    <div className="grid grid-cols-2 gap-6">
      
      {/* Top Left - Basic Health Info */}
      <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 space-y-4">
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

      {/* Top Right - Upcoming Health Info */}
      <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 space-y-4">
        <h3 className="text-gray-400 font-semibold mb-2">Upcoming Health</h3>
        <ul className="space-y-2">
          {upcoming.map((item, idx) => (
            <li key={idx} className="bg-gray-700 p-3 rounded-lg flex justify-between">
              <span>{item.name}</span>
              <span className="text-gray-400">{item.date}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Bottom Left - Vaccination History */}
      <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 flex">
        <div className="w-3/4 pr-4">
          <h3 className="text-gray-400 font-semibold mb-2">Vaccination History</h3>
          <div className="space-y-2">
            <p><strong>Date:</strong> {selectedVaccine.date}</p>
            <p><strong>Type:</strong> {selectedVaccine.type}</p>
            <p><strong>Notes:</strong> {selectedVaccine.notes}</p>
          </div>
        </div>
        <div className="w-1/4 border-l border-gray-700 pl-4">
          <label className="block text-gray-400 text-sm mb-1">Select Date</label>
          <select
            value={selectedVaccine.date}
            onChange={(e) =>
              setSelectedVaccine(vaccinations.find(v => v.date === e.target.value))
            }
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-gray-100 outline-none cursor-pointer"
          >
            {vaccinations.map((v, idx) => (
              <option key={idx} value={v.date} className="bg-gray-800 text-gray-100">
                {v.date}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Bottom Right - Birth Info */}
      <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 space-y-4">
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
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full bg-gray-700 text-gray-100 border border-gray-600 rounded-lg px-3 py-2"
          />
        </div>
      </div>
    </div>
  );
}
