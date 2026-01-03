import { updateAnimal } from "../api/animal";
import React, { useState, useEffect } from "react";

export default function AnimalGeneralData({ animal, setRefreshFlag }) {
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [age, setAge] = useState("");
  const [weight, setWeight] = useState("");
  const [sex, setSex] = useState("");
  const [tag, setTag] = useState("");
  const [notes, setNotes] = useState("");
  const [species, setSpecies] = useState("");
  const [behavior, setBehavior] = useState("");
  const [herdId, setHerdId] = useState("")
  const [animalId, setAnimalId] = useState("");

  
  // Setting values
  useEffect(() => {
    if (!animal) return;

    setName(animal.name || "");
    setDob(animal.birthdate ? animal.birthdate.slice(0, 10) : "");
    setAge(animal.age || "");
    setSex(animal.sex || "");
    setNotes(animal.comments || "");
    setSpecies(animal.species || "");
    setWeight(animal.weight || "");
    setTag(animal.tag_id || "");
    setBehavior(animal.behavior || "") ;
    setHerdId(animal.herd_id || "");
    setAnimalId(animal.id || "");

  }, [animal])


  // Saving Animal to DB
  async function saveAnimal() {
    if (!animal) return;

    try{
      const payload = {
        herdId,
        name,
        species,
        sex,
        birthdate: dob,
        age,
        comments: notes,
        weight, 
        behavior,
        tag_id: tag
      };
      await updateAnimal(payload, animalId);
      console.log("Animal updated successfully");

      setRefreshFlag(prev => !prev)
    } catch (err) {
      console.error("Failed to update animnal:", err.response?.data || err.message);
    }
  }



  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      
      {/* Top Left - Basic Info */}
      <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 space-y-4">
        <h3 className="text-gray-400 font-semibold mb-2">Basic Info</h3>
        <div>
          <label className="block text-gray-400 text-sm mb-1">Name</label>
          <input
            value={name}
            onBlur={saveAnimal}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-gray-700 text-gray-100 border border-gray-600 rounded-lg px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-gray-400 text-sm mb-1">Date of Birth</label>
          <input
            type="date"
            value={dob}
            onBlur={saveAnimal}
            onChange={(e) => setDob(e.target.value)}
            className="w-full bg-gray-700 text-gray-100 border border-gray-600 rounded-lg px-3 py-2"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-gray-400 text-sm mb-1">Age</label>
            <input
              value={age}
              onBlur={saveAnimal}
              onChange={(e) => setAge(e.target.value)}
              className="w-full bg-gray-700 text-gray-100 border border-gray-600 rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-gray-400 text-sm mb-1">Weight</label>
            <input
              value={weight}
              onBlur={saveAnimal}
              onChange={(e) => setWeight(e.target.value)}
              className="w-full bg-gray-700 text-gray-100 border border-gray-600 rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-gray-400 text-sm mb-1">Sex</label>
            <input
              value={sex}
              onBlur={saveAnimal}
              onChange={(e) => setSex(e.target.value)}
              className="w-full bg-gray-700 text-gray-100 border border-gray-600 rounded-lg px-3 py-2"
            />
          </div>
        </div>

        <div>
          <label className="block text-gray-400 text-sm mb-1">Tag #</label>
          <input
            value={tag}
            onBlur={saveAnimal}
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
        <p className="bg-gray-700 p-3 rounded-lg">Vaccination: </p>
        <p className="bg-gray-700 p-3 rounded-lg">Vet Visit: </p>
      </div>

      {/* Bottom Right - Other Info */}
      <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 space-y-4">
        <h4 className="text-gray-400 font-semibold mb-2">Other Info</h4>

        <div>
          <label className="block text-gray-400 text-sm mb-1">Notes</label>
          <input
            value={notes}
            onBlur={saveAnimal}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full bg-gray-700 text-gray-100 border border-gray-600 rounded-lg px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-gray-400 text-sm mb-1">Species</label>
          <input
            value={species}
            onBlur={saveAnimal}
            onChange={(e) => setSpecies(e.target.value)}
            className="w-full bg-gray-700 text-gray-100 border border-gray-600 rounded-lg px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-gray-400 text-sm mb-1">Temperament</label>
          <input
            value={behavior}
            onBlur={saveAnimal}
            onChange={(e) => setBehavior(e.target.value)}
            className="w-full bg-gray-700 text-gray-100 border border-gray-600 rounded-lg px-3 py-2"
          />
        </div>
      </div>
    </div>
  );
}
