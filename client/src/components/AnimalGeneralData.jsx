import { updateAnimal, deleteAnimal, uploadAnimalImage, removeAnimalImage } from "../api/animal";
import * as vaccinationsAPI from "../api/vaccinations";
import React, { useState, useEffect } from "react";
import { toast, ToastContainer } from "react-toastify";

export default function AnimalGeneralData({ animal, setRefreshFlag, setSelectedAnimal, setActiveTab, herds, selectedHerd }) {
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
  const [imageUrl, setImageUrl] = useState("");
  const [imageBlobUrl, setImageBlobUrl] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isRemovingImage, setIsRemovingImage] = useState(false);
  const [upcomingVaccinations, setUpcomingVaccinations] = useState([]);
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
    // Image is now retrieved from database, use animal.id as a flag
    setImageUrl(animal.id ? `stored` : "");
  }, [animal]);

  // Load image from database when animal changes
  useEffect(() => {
    const loadImage = async () => {
      if (!animal?.id || !imageUrl) {
        setImageBlobUrl("");
        return;
      }

      try {
        const token = localStorage.getItem("token");
        const response = await fetch(`http://localhost:5000/api/animals/${animal.id}/image`, {
          headers: {
            'Authorization': token ? `Bearer ${token}` : ''
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to load image');
        }

        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        setImageBlobUrl(blobUrl);
      } catch (err) {
        console.error('Error loading image:', err);
        setImageBlobUrl("");
      }
    };

    loadImage();

    // Cleanup blob URL on unmount
    return () => {
      if (imageBlobUrl) {
        URL.revokeObjectURL(imageBlobUrl);
      }
    };
  }, [animal?.id, imageUrl]);

  useEffect(() => {
    const loadUpcomingVaccinations = async () => {
      if (!animal || !animal.id) {
        setUpcomingVaccinations([]);
        return;
      }

      try {
        const res = await vaccinationsAPI.getVaccinations(animal.id);
        const now = new Date();
        const soonThreshold = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        const upcoming = (res.data || [])
          .filter((v) => v.next_due_date)
          .map((v) => {
            const dueDate = new Date(v.next_due_date);
            const diffMs = dueDate - now;
            const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
            let urgency = "green";
            let dueLabel = "";

            if (diffDays < 0) {
              urgency = "red";
              dueLabel = `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? "" : "s"}`;
            } else if (diffDays <= 7) {
              urgency = "yellow";
              dueLabel = `Due in ${diffDays} day${diffDays === 1 ? "" : "s"}`;
            } else {
              dueLabel = `Due in ${diffDays} day${diffDays === 1 ? "" : "s"}`;
            }

            return {
              id: v.id,
              date: v.next_due_date,
              name: v.vaccine_name || v.type || "Vaccine",
              urgency,
              dueLabel,
            };
          })
          .sort((a, b) => new Date(a.date) - new Date(b.date));

        setUpcomingVaccinations(upcoming);
      } catch (err) {
        console.error("Error loading upcoming vaccinations:", err);
        setUpcomingVaccinations([]);
      }
    };

    loadUpcomingVaccinations();
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



  const imageSrc = imageBlobUrl || "https://via.placeholder.com/600";

  async function handleImageUpload(e) {
    const file = e.target.files?.[0];
    if (!file || !animal?.id) return;

    try {
      setIsUploadingImage(true);
      await uploadAnimalImage(animal.id, file);
      setImageUrl("stored"); // Set flag to indicate image is stored
      // Force reload of image blob
      setImageBlobUrl("");
      setRefreshFlag((prev) => !prev);
      toast.success("Image uploaded successfully!");
    } catch (err) {
      console.error("Image upload failed:", err.response?.data || err.message);
      toast.error("Failed to upload image.");
    } finally {
      setIsUploadingImage(false);
      e.target.value = "";
    }
  }



  async function handleRemoveImage() {
    if (!animal?.id || !imageUrl) return;

    const confirmDeleteImage = window.confirm(`Remove image for ${animal.name}?`);
    if (!confirmDeleteImage) return;

    try {
      setIsRemovingImage(true);
      await removeAnimalImage(animal.id);
      setImageUrl("");
      setImageBlobUrl("");
      setRefreshFlag((prev) => !prev);
      toast.success("Image removed successfully.");
    } catch (err) {
      console.error("Image removal failed:", err.response?.data || err.message);
      toast.error("Failed to remove image.");
    } finally {
      setIsRemovingImage(false);
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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
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
      <div className="bg-gray-800  rounded-2xl border border-gray-700 overflow-hidden h-100 object-cover">
        <label className="w-full h-full relative group block cursor-pointer">
          <img
            src={imageSrc}
            alt={`${name || "Animal"} profile`}
            className="w-full h-full object-cover transition duration-300 group-hover:opacity-70"
          />
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
            disabled={isUploadingImage}
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition duration-300 bg-black/40 text-white text-lg font-semibold">
            <span>{isUploadingImage ? "Uploading..." : "Change Picture"}</span>
            {imageUrl && (
              <button
                type="button"
                className="px-3 py-1 text-sm font-medium rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-60"
                onClick={(e) => {
                  e.preventDefault();
                  handleRemoveImage();
                }}
                disabled={isRemovingImage}
              >
                {isRemovingImage ? "Removing..." : "Remove Image"}
              </button>
            )}
          </div>
        </label>
      </div>

      {/* Bottom Left - Quick Dates */}
      <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 space-y-4">
        <h4 className="text-gray-400 font-semibold mb-2">Upcoming Quick Dates</h4>
        {upcomingVaccinations.length === 0 ? (
          <p className="bg-gray-700 p-3 rounded-lg text-gray-300">No upcoming vaccination dates</p>
        ) : (
          upcomingVaccinations.slice(0, 5).map((item) => (
            <button
              key={item.id}
              onClick={() => {
                if (setSelectedAnimal) setSelectedAnimal(animal);
                if (setActiveTab) setActiveTab("health");
              }}
              className={`w-full cursor-pointer text-left p-3 rounded-lg border mb-1 ${
                item.urgency === "red"
                  ? "border-red-500 bg-red-900 text-red-100"
                  : item.urgency === "yellow"
                  ? "border-yellow-500 bg-yellow-900 text-yellow-100"
                  : "border-emerald-500 bg-emerald-900 text-emerald-100"
              }`}
            >
              <span className="font-medium">{item.name}</span>
              <br />
              <span className="text-xs text-gray-200">{item.dueLabel}</span>
            </button>
          ))
        )}
        <p className="bg-gray-700 p-3 rounded-lg">Vet Visit: (see Vet tab)</p>
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
