import { updateAnimal, deleteAnimal } from "../api/animal";
import React, { useState, useEffect } from "react";
import { toast, ToastContainer } from "react-toastify";

export default function AnimalGeneralData({ animal, setRefreshFlag, setSelectedAnimal, herds, selectedHerd }) {
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [age, setAge] = useState("");
  const [weight, setWeight] = useState("");
  const [sex, setSex] = useState("");
  const [tag, setTag] = useState("");
  const [notes, setNotes] = useState("");
  const [species, setSpecies] = useState("");
  const [behavior, setBehavior] = useState("");
  const [herdId, setHerdId] = useState("");
  const [animalId, setAnimalId] = useState("");
  const sexOptionsBySpecies = {
    Cow: ["Cow", "Heifer", "Steer", "Bull", "Calf"],
    Sheep: ["Ewe", "Ram", "Lamb", "Wether"],
    Goat: ["Doe", "Buck", "Wether", "Yearling"],
    Swine: ["Gilt", "Sow", "Boar", "Barrow", "Stag"],
  };


  function calculateAge(dob) {
    if (!dob) return "";
    const birthDate = new Date(dob);
    const today = new Date();
    let years = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    const dayDiff = today.getDate() - birthDate.getDate();

    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
      years--;
    }
    return years;
  }


  // Setting values when animal changes
  useEffect(() => {
    if (!animal) return;

    setName(animal.name || "");
    setDob(animal.birthdate ? animal.birthdate.slice(0, 10) : "");
    setAge(animal.birthdate ? calculateAge(animal.birthdate) : animal.age || "");
    setSex(animal.sex || "");
    setNotes(animal.comments || "");
    setSpecies(animal.species || "");
    setWeight(animal.weight || "");
    setTag(animal.tag_id || "");
    setBehavior(animal.behavior || "");
    setHerdId(animal.herd_id === null ? "unassigned" : String(animal.herd_id));
    setAnimalId(animal.id || "");
  }, [animal]);

  // Save Animal to DB
  async function saveAnimal(updatedData = {}) {
    if (!animal) return;

    try {
      const payload = {
        herd_id: herdId === "unassigned" ? null : herdId,
        name,
        species,
        sex,
        birthdate: dob,
        age,
        comments: notes,
        weight,
        behavior,
        tag_id: tag,
        ...updatedData, // merge in changes like herdId
      };

      await updateAnimal(payload, animalId);
      toast.success("Animal Data Saved!");
      setRefreshFlag((prev) => !prev);
    } catch (err) {
      console.error("Failed to update animal:", err.response?.data || err.message);
      toast.error("Failed to save animal data!");
    }
  }

  async function handleDelete() {
    if (!animal) return;

    try {
      await deleteAnimal(animal.id);
      
      // Show confirmation dialog
      const confirmDelete = window.confirm(
        `Are you sure you want to delete ${animal.name}? This action cannot be undone!`
      );

      if (!confirmDelete) return; // If user cancels, stop here

      setSelectedAnimal(null);
      setName("");
      setDob("");
      setAge("");
      setSex("");
      setNotes("");
      setSpecies("");
      setWeight("");
      setTag("");
      setBehavior("");
      setHerdId("");
      setAnimalId("");

      setRefreshFlag((prev) => !prev);
    } catch (err) {
      console.error("Failed to delete animal:", err.response?.data || err.message);
      toast.error("Failed to delete animal!");
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
            onBlur={() => saveAnimal()}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-gray-700 text-gray-100 border border-gray-600 rounded-lg px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-gray-400 text-sm mb-1">Date of Birth</label>
          <input
            type="date"
            value={dob}
            onBlur={() => saveAnimal()}
            onChange={(e) => {
              setDob(e.target.value);
              setAge(calculateAge(e.target.value));

            }}
            className="w-full bg-gray-700 text-gray-100 border border-gray-600 rounded-lg px-3 py-2"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-gray-400 text-sm mb-1">Age</label>
            <input
              value={age}
              disabled
              onChange={(e) => setAge(e.target.value)}
              className="w-full bg-gray-700 text-gray-100 border border-gray-600 rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-gray-400 text-sm mb-1">Weight</label>
            <input
              value={weight}
              onBlur={() => saveAnimal()}
              onChange={(e) => setWeight(e.target.value)}
              className="w-full bg-gray-700 text-gray-100 border border-gray-600 rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-gray-400 text-sm mb-1">Sex</label>
            <select
              value={sex}
              onChange={(e) => setSex(e.target.value)}
              onBlur={() => saveAnimal()}
              className="w-full bg-gray-700 text-gray-100 border border-gray-600 rounded-lg px-3 py-2"
            >
              <option value="">Select Sex</option>

              {(sexOptionsBySpecies[species] || []).map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-gray-400 text-sm mb-1">Tag #</label>
          <input
            value={tag}
            onBlur={() => saveAnimal()}
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
            onBlur={() => saveAnimal()}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full bg-gray-700 text-gray-100 border border-gray-600 rounded-lg px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-gray-400 text-sm mb-1">Species</label>
          <select
            value={species}
            onChange={(e) => {
              setSpecies(e.target.value); 
              setSex("")}
            }
            onBlur={() => saveAnimal()}
            className="w-full bg-gray-700 text-gray-100 border border-gray-600 rounded-lg px-3 py-2"
          >
            <option value="Cow">Cow</option>
            <option value="Sheep">Sheep</option>
            <option value="Goat">Goat</option>
            <option value="Swine">Swine</option>
          </select>
        </div>

        <div>
          <label className="block text-gray-400 text-sm mb-1">Temperament</label>
          <input
            value={behavior}
            onBlur={() => saveAnimal()}
            onChange={(e) => setBehavior(e.target.value)}
            className="w-full bg-gray-700 text-gray-100 border border-gray-600 rounded-lg px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-gray-400 text-sm mb-1">Herd</label>
          <select
              value={herdId}
              onChange={async (e) => {
                const newHerdId = e.target.value;
                setHerdId(newHerdId);

                // Save the animal first
                await saveAnimal({ herd_id: newHerdId === "unassigned" ? null : newHerdId });

                // If the new herd doesn't match the current selected herd in the dashboard, clear selection
                if (
                  (newHerdId === "unassigned" && selectedHerd?.id !== "unassigned") ||
                  (newHerdId !== "unassigned" && selectedHerd?.id !== newHerdId)
                ) {
                  setSelectedAnimal(null);
                  toast.info("Animal moved to another herd, selection cleared.");
                }
              }}
              className="w-full bg-gray-700 text-gray-100 border border-gray-600 rounded-lg px-3 py-2"
            >
              <option value="unassigned">Unassigned</option>
              {herds.map((herd) => (
                <option key={herd.id} value={String(herd.id)}>
                  {herd.name}
                </option>
              ))}
          </select>
        </div>

        <div>
          <label className="block text-gray-400 text-sm mb-1">Delete Animal</label>
          <button
            className="w-full bg-red-500 text-gray-300 border-red-600 rounded-lg px-3 py-2 hover:bg-red-400 transition"
            onClick={handleDelete}
          >
            Delete {animal.name}
          </button>
        </div>
      </div>
      <ToastContainer autoClose="1000" />
    </div>
  );
}
