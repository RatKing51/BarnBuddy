import React, { useState } from "react";

export default function AnimalGeneralData() {
  const [name, setName] = useState("Bella");
  const [dob, setDob] = useState("2021-05-14");
  const [age, setAge] = useState("4");
  const [weight, setWeight] = useState("450 lbs");
  const [sex, setSex] = useState("Female");
  const [tag, setTag] = useState("A123");

  const [notes, setNotes] = useState("Very calm, loves attention.");
  const [feedType, setFeedType] = useState("Hay, Grain");
  const [behavior, setBehavior] = useState("Playful");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      
      {/* Top Left - Basic Info */}
      <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 space-y-4">
        <h3 className="text-gray-400 font-semibold mb-2">Basic Info</h3>
        <div>
          <label className="block text-gray-400 text-sm mb-1">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-gray-700 text-gray-100 border border-gray-600 rounded-lg px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-gray-400 text-sm mb-1">Date of Birth</label>
          <input
            type="date"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            className="w-full bg-gray-700 text-gray-100 border border-gray-600 rounded-lg px-3 py-2"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-gray-400 text-sm mb-1">Age</label>
            <input
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className="w-full bg-gray-700 text-gray-100 border border-gray-600 rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-gray-400 text-sm mb-1">Weight</label>
            <input
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="w-full bg-gray-700 text-gray-100 border border-gray-600 rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-gray-400 text-sm mb-1">Sex</label>
            <input
              value={sex}
              onChange={(e) => setSex(e.target.value)}
              className="w-full bg-gray-700 text-gray-100 border border-gray-600 rounded-lg px-3 py-2"
            />
          </div>
        </div>

        <div>
          <label className="block text-gray-400 text-sm mb-1">Tag #</label>
          <input
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            className="w-full bg-gray-700 text-gray-100 border border-gray-600 rounded-lg px-3 py-2"
          />
        </div>
      </div>

      {/* Top Right - Picture */}
      <div className="bg-gray-800 p-0 rounded-2xl border border-gray-700 overflow-hidden">
        <div className="w-full h-full relative group">
          <img
            src="https://via.placeholder.com/600"
            alt="Animal"
            className="w-full h-full object-cover transition duration-300 group-hover:opacity-70"
          />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-300 bg-black bg-opacity-30 text-white text-lg font-semibold">
            Change Picture
          </div>
        </div>
      </div>

      {/* Bottom Left - Quick Dates */}
      <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 space-y-4">
        <h4 className="text-gray-400 font-semibold mb-2">Upcoming Quick Dates</h4>
        <p className="bg-gray-700 p-3 rounded-lg">Vaccination: 12/05/2025</p>
        <p className="bg-gray-700 p-3 rounded-lg">Vet Visit: 01/10/2026</p>
      </div>

      {/* Bottom Right - Other Info */}
      <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 space-y-4">
        <h4 className="text-gray-400 font-semibold mb-2">Other Info</h4>

        <div>
          <label className="block text-gray-400 text-sm mb-1">Notes</label>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full bg-gray-700 text-gray-100 border border-gray-600 rounded-lg px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-gray-400 text-sm mb-1">Feed Type</label>
          <input
            value={feedType}
            onChange={(e) => setFeedType(e.target.value)}
            className="w-full bg-gray-700 text-gray-100 border border-gray-600 rounded-lg px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-gray-400 text-sm mb-1">Temperament</label>
          <input
            value={behavior}
            onChange={(e) => setBehavior(e.target.value)}
            className="w-full bg-gray-700 text-gray-100 border border-gray-600 rounded-lg px-3 py-2"
          />
        </div>
      </div>
    </div>
  );
}
