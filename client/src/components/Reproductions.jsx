import React, { useState } from "react";

export default function Reproductions({ animal }) {
  const [breedingEvents, setBreedingEvents] = useState([]);
  const [selectedBreedingIndex, setSelectedBreedingIndex] = useState(0);
  const [expandedKids, setExpandedKids] = useState(true); // toggle kids visibility

  const handleAddBreeding = () => {
    setBreedingEvents([
      ...breedingEvents,
      { dam: "", buck: "", breedingDate: "", dueDate: "", outcome: "", notes: "", kids: [] },
    ]);
    setSelectedBreedingIndex(breedingEvents.length);
  };

  const handleAddKid = () => {
    const updated = [...breedingEvents];
    updated[selectedBreedingIndex].kids.push({ name: "", sex: "", birthDate: "", birthWeight: "", health: "", notes: "" });
    setBreedingEvents(updated);
  };

  return (
    <div className="h-full grid grid-cols-1 lg:grid-cols-3 gap-4 p-2 min-h-screen">
      {/* Breeding Events Selector */}
      <div className="bg-gray-800 p-4 rounded-2xl border border-gray-700 flex flex-col gap-2 h-min">
        <h3 className="text-gray-400 font-semibold">Breeding Events</h3>
        {breedingEvents.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setSelectedBreedingIndex(idx)}
            className={`px-3 py-2 rounded-lg border text-xs md:text-sm ${
              selectedBreedingIndex === idx ? "bg-blue-600 border-blue-500 text-white" : "bg-gray-700 border-gray-600 text-gray-100 hover:bg-gray-600"
            }`}
          >
            Event {idx + 1}
          </button>
        ))}
        <button
          onClick={handleAddBreeding}
          className="px-3 py-2 mt-2 rounded-lg border border-gray-600 bg-gray-700 text-gray-100 hover:bg-gray-600"
        >
          + Add Breeding Event
        </button>
      </div>

      {/* Event Details */}
      <div className="col-span-2 bg-gray-800 p-4 rounded-2xl border border-gray-700 flex flex-col gap-4 h-min">
        {breedingEvents[selectedBreedingIndex] && (
          <>
            <h3 className="text-gray-400 font-semibold">Event Details</h3>
            {["dam", "buck", "breedingDate", "dueDate", "outcome", "notes"].map((field) => (
              <div key={field}>
                <label className="block text-gray-400 text-sm mb-1">{field.charAt(0).toUpperCase() + field.slice(1)}</label>
                {field === "notes" ? (
                  <textarea
                    value={breedingEvents[selectedBreedingIndex][field]}
                    onChange={(e) => {
                      const updated = [...breedingEvents];
                      updated[selectedBreedingIndex][field] = e.target.value;
                      setBreedingEvents(updated);
                    }}
                    className="w-full bg-gray-700 text-gray-100 border border-gray-600 rounded-lg px-3 py-2"
                  />
                ) : (
                  <input
                    value={breedingEvents[selectedBreedingIndex][field]}
                    onChange={(e) => {
                      const updated = [...breedingEvents];
                      updated[selectedBreedingIndex][field] = e.target.value;
                      setBreedingEvents(updated);
                    }}
                    className="w-full bg-gray-700 text-gray-100 border border-gray-600 rounded-lg px-3 py-2"
                  />
                )}
              </div>
            ))}

            {/* Kids Section */}
            <div className="mt-4">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-gray-400 font-semibold">Offspring / Kids</h4>
                <button
                  onClick={() => setExpandedKids(!expandedKids)}
                  className="px-2 py-1 text-xs bg-gray-700 rounded border border-gray-600 hover:bg-gray-600"
                >
                  {expandedKids ? "Collapse" : "Expand"}
                </button>
              </div>

              {expandedKids &&
                breedingEvents[selectedBreedingIndex].kids.map((kid, idx) => (
                  <div key={idx} className="bg-gray-700 p-3 rounded-lg mb-2 border border-gray-600">
                    {["name", "sex", "birthDate", "birthWeight", "health", "notes"].map((field) => (
                      <div key={field} className="mb-1">
                        <label className="block text-gray-300 text-xs">{field.charAt(0).toUpperCase() + field.slice(1)}</label>
                        <input
                          value={kid[field]}
                          onChange={(e) => {
                            const updated = [...breedingEvents];
                            updated[selectedBreedingIndex].kids[idx][field] = e.target.value;
                            setBreedingEvents(updated);
                          }}
                          className="w-full bg-gray-600 text-gray-100 border border-gray-500 rounded px-2 py-1 text-sm"
                        />
                      </div>
                    ))}
                  </div>
                ))}

              <button
                onClick={handleAddKid}
                className="px-3 py-2 mt-2 rounded-lg border border-gray-600 bg-gray-700 text-gray-100 hover:bg-gray-600"
              >
                + Add Kid
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
