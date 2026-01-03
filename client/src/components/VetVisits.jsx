import React, { useState } from "react";

export default function VetVisits({ animal }) {
  const [selectedVisit, setSelectedVisit] = useState({
    date: "",
    vet: "",
    reason: "",
    notes: "",
  });

  const upcomingVisits = [];

  const pastVisits = [];

  const addVisit = () => {
    const newVisit = { date: "New Date", vet: "New Vet" };
    pastVisits.push(newVisit);
    setSelectedVisit(newVisit);
  };

  return (
    <div className="flex flex-col lg:flex-row h-full gap-6">

      {/* Left Panel */}
      <div className="w-full lg:w-1/4 flex flex-col gap-4">

        {/* Upcoming visits */}
        <div className="bg-gray-800 p-5 rounded-2xl border border-gray-700 space-y-3">
          <h3 className="text-gray-400 font-semibold mb-1 text-base">
            Upcoming Visits
          </h3>

          <ul className="space-y-2 text-sm">
            {upcomingVisits.map((visit, idx) => (
              <li
                key={idx}
                className="bg-gray-700 p-3 rounded-lg flex justify-between"
              >
                <span>{visit.date}</span>
                <span>{visit.vet}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Past visits */}
        <div className="bg-gray-800 p-5 rounded-2xl border border-gray-700 flex flex-col">
          <h3 className="text-gray-400 font-semibold mb-2 text-base">
            Past Visits
          </h3>

          <ul className="flex-1 space-y-2 overflow-y-auto text-sm max-h-64 lg:max-h-full">
            {pastVisits.map((visit, idx) => (
              <li
                key={idx}
                onClick={() => setSelectedVisit(visit)}
                className={`cursor-pointer p-3 rounded-lg transition ${
                  visit.date === selectedVisit.date
                    ? "bg-blue-600 text-white"
                    : "bg-gray-700 hover:bg-gray-600"
                }`}
              >
                {visit.date} - {visit.vet}
              </li>
            ))}
          </ul>

          <button
            onClick={addVisit}
            className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-500 transition"
          >
            Add Visit
          </button>
        </div>
      </div>

      {/* Right Panel: Visit Details */}
      <div className="w-full lg:w-3/4 bg-gray-800 p-6 rounded-2xl border border-gray-700 space-y-5">
        <h3 className="text-gray-400 font-semibold mb-1 text-lg">
          Visit Details
        </h3>

        <div>
          <label className="block text-gray-400 text-sm mb-1">Date</label>
          <input
            value={selectedVisit.date}
            onChange={(e) =>
              setSelectedVisit({ ...selectedVisit, date: e.target.value })
            }
            className="w-full bg-gray-700 text-gray-100 border border-gray-600 rounded-lg px-3 py-3 text-base"
          />
        </div>

        <div>
          <label className="block text-gray-400 text-sm mb-1">Vet</label>
          <input
            value={selectedVisit.vet}
            onChange={(e) =>
              setSelectedVisit({ ...selectedVisit, vet: e.target.value })
            }
            className="w-full bg-gray-700 text-gray-100 border border-gray-600 rounded-lg px-3 py-3 text-base"
          />
        </div>

        <div>
          <label className="block text-gray-400 text-sm mb-1">Reason</label>
          <input
            value={selectedVisit.reason}
            onChange={(e) =>
              setSelectedVisit({ ...selectedVisit, reason: e.target.value })
            }
            className="w-full bg-gray-700 text-gray-100 border border-gray-600 rounded-lg px-3 py-3 text-base"
          />
        </div>

        <div>
          <label className="block text-gray-400 text-sm mb-1">Notes</label>
          <textarea
            value={selectedVisit.notes}
            onChange={(e) =>
              setSelectedVisit({ ...selectedVisit, notes: e.target.value })
            }
            className="w-full bg-gray-700 text-gray-100 border border-gray-600 rounded-lg px-3 py-3 text-base h-32"
          />
        </div>
      </div>
    </div>
  );
}
