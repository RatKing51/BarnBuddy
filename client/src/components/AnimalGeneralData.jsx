import { updateAnimal, deleteAnimal, uploadAnimalImage, removeAnimalImage } from "../api/animal";
import * as vaccinationsAPI from "../api/vaccinations";
import * as vetVisitsAPI from "../api/vetVisits";
import React, { useState, useEffect } from "react";
import { toast, ToastContainer } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import { API_URL } from "../config/env";

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
  const [upcomingVetVisitDates, setUpcomingVetVisitDates] = useState([]);
  const { authFetch } = useAuth();
  const sexOptionsBySpecies = {
    Cow: ["Cow", "Heifer", "Steer", "Bull", "Calf"],
    Sheep: ["Ewe", "Ram", "Lamb", "Wether"],
    Goat: ["Doe", "Buck", "Wether", "Yearling"],
    Swine: ["Gilt", "Sow", "Boar", "Barrow", "Stag"],
  };

  const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB limit

  function getReadableFileSize(size) {
    return `${(size / (1024 * 1024)).toFixed(1)}MB`;
  }


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
    let objectUrl = "";

    const loadImage = async () => {
      if (!animal?.id || !imageUrl) {
        setImageBlobUrl("");
        return;
      }

      try {
        const response = await authFetch(`${API_URL}/api/animals/${animal.id}/image`);
        
        if (!response.ok) {
          throw new Error('Failed to load image');
        }

        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);
        setImageBlobUrl(objectUrl);
      } catch (err) {
        console.error('Error loading image:', err);
        setImageBlobUrl("");
      }
    };

    loadImage();

    // Cleanup blob URL on unmount
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [animal?.id, imageUrl, authFetch]);

  useEffect(() => {
    const loadUpcomingVaccinations = async () => {
      if (!animal || !animal.id) {
        setUpcomingVaccinations([]);
        return;
      }

      try {
        const res = await vaccinationsAPI.getVaccinations(animal.id);
        const now = new Date();

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
              type: "vaccination",
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

  useEffect(() => {
    const loadUpcomingVetVisits = async () => {
      if (!animal || !animal.id) {
        setUpcomingVetVisitDates([]);
        return;
      }

      try {
        const res = await vetVisitsAPI.getVetVisitsForAnimal(animal.id);
        const now = new Date();
        const today = new Date(now);
        today.setHours(0, 0, 0, 0);

        const upcoming = (res.data || [])
          .flatMap((visit) => {
            const nextItems = [];
            const visitDate = visit.visit_date ? new Date(visit.visit_date) : null;
            const followUpDate = visit.follow_up_date ? new Date(visit.follow_up_date) : null;
            const visitDone = Boolean(visit.completed || visit.visit_completed);
            const followUpDone = Boolean(visit.completed || visit.follow_up_completed);

            const buildItem = (date, label, suffix) => {
              const diffMs = date - now;
              const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
              let urgency = "green";
              let dueLabel = "";

              if (diffDays < 0) {
                urgency = "red";
                dueLabel = `${label} overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? "" : "s"}`;
              } else if (diffDays <= 7) {
                urgency = "yellow";
                dueLabel = `${label} in ${diffDays} day${diffDays === 1 ? "" : "s"}`;
              } else {
                dueLabel = `${label} in ${diffDays} day${diffDays === 1 ? "" : "s"}`;
              }

              return {
                id: `${visit.id}-${suffix}`,
                date: date.toISOString().split("T")[0],
                name: `${label} with ${visit.vet_name || "Vet"}`,
                urgency,
                dueLabel,
                type: "vet",
              };
            };

            if (!visitDone && visitDate && !Number.isNaN(visitDate.getTime()) && visitDate >= today) {
              nextItems.push(buildItem(visitDate, "Vet Visit", "visit"));
            }
            if (!followUpDone && followUpDate && !Number.isNaN(followUpDate.getTime()) && followUpDate >= today) {
              nextItems.push(buildItem(followUpDate, "Follow-up", "followup"));
            }

            return nextItems;
          })
          .sort((a, b) => new Date(a.date) - new Date(b.date));

        setUpcomingVetVisitDates(upcoming);
      } catch (err) {
        console.error("Error loading upcoming vet visits:", err);
        setUpcomingVetVisitDates([]);
      }
    };

    loadUpcomingVetVisits();
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



  const upcomingQuickDates = [...upcomingVaccinations, ...upcomingVetVisitDates].sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );

  const imageSrc = imageBlobUrl || "https://via.placeholder.com/600";

  async function handleImageUpload(e) {
    const file = e.target.files?.[0];
    if (!file || !animal?.id) {
      if (!animal?.id) toast.error("Save the animal first, then upload an image.");
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload a valid image file (JPG, PNG, etc.).");
      e.target.value = "";
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      toast.error(`Image is too large. Max file size is ${getReadableFileSize(MAX_IMAGE_SIZE)}.`);
      e.target.value = "";
      return;
    }

    try {
      setIsUploadingImage(true);
      await uploadAnimalImage(animal.id, file);
      setImageUrl("stored"); // Set flag to indicate image is stored
      setImageBlobUrl("");
      setRefreshFlag((prev) => !prev);
      toast.success("Image uploaded successfully!");
    } catch (err) {
      console.error("Image upload failed:", err.response?.data || err.message);
      const message = err.response?.data?.error || err.message || "Failed to upload image.";
      toast.error(message);
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
            onError={() => setImageBlobUrl("")}
          />
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
            disabled={isUploadingImage}
          />
          <div className="absolute bottom-4 left-4 rounded-md bg-black/60 px-3 py-1 text-xs text-white/90">
            Max 5MB · JPG/PNG only
          </div>
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
        {upcomingQuickDates.length === 0 ? (
          <p className="bg-gray-700 p-3 rounded-lg text-gray-300">No upcoming dates</p>
        ) : (
          upcomingQuickDates.slice(0, 5).map((item) => (
            <button
              key={item.id}
              onClick={() => {
                if (setSelectedAnimal) setSelectedAnimal(animal);
                if (setActiveTab) setActiveTab(item.type === "vet" ? "vet" : "health");
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
