import { updateAnimal, deleteAnimal, uploadAnimalImage, removeAnimalImage } from "../api/animal";
import * as vaccinationsAPI from "../api/vaccinations";
import * as vetVisitsAPI from "../api/vetVisits";
import React, { useState, useEffect, useRef } from "react";
import { toast, ToastContainer } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import { usePreferences } from "../context/PreferencesContext";
import { API_URL } from "../config/env";
import { SkeletonBlock } from "./LoadingSpinner";

function AnimalGeneralDataSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2" aria-busy="true">
      <div className="space-y-4 rounded-2xl border border-gray-700 bg-gray-800 p-6">
        <div className="flex items-center justify-between gap-3">
          <SkeletonBlock className="h-5 w-28" />
          <SkeletonBlock className="h-7 w-24" />
        </div>
        {[0, 1, 2, 3, 4, 5].map((item) => (
          <div key={item}>
            <SkeletonBlock className="mb-2 h-3 w-24" />
            <SkeletonBlock className="h-10 w-full" />
          </div>
        ))}
        <SkeletonBlock className="h-24 w-full" />
      </div>

      <div className="space-y-4 rounded-2xl border border-gray-700 bg-gray-800 p-6">
        <div className="grid min-h-64 place-items-center rounded-xl border border-gray-700 bg-gray-900">
          <SkeletonBlock className="h-40 w-40 rounded-full" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <SkeletonBlock className="h-10 w-full" />
          <SkeletonBlock className="h-10 w-full" />
        </div>
        {[0, 1, 2].map((item) => (
          <div key={item} className="rounded-xl border border-gray-700 bg-gray-900 p-4">
            <SkeletonBlock className="h-4 w-32" />
            <SkeletonBlock className="mt-3 h-3 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AnimalGeneralData({
  animal,
  setSelectedAnimal,
  setActiveTab,
  onAnimalSaved,
  onAnimalDeleted,
  herds,
  selectedHerd,
}) {
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
  const [status, setStatus] = useState("active");
  const [deceasedDate, setDeceasedDate] = useState("");
  const [deceasedNotes, setDeceasedNotes] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageBlobUrl, setImageBlobUrl] = useState("");
  const [imageRefreshKey, setImageRefreshKey] = useState(0);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isRemovingImage, setIsRemovingImage] = useState(false);
  const [isDeletingAnimal, setIsDeletingAnimal] = useState(false);
  const [upcomingVaccinations, setUpcomingVaccinations] = useState([]);
  const [upcomingVetVisitDates, setUpcomingVetVisitDates] = useState([]);
  const [loadingVaccinationSummary, setLoadingVaccinationSummary] = useState(false);
  const [loadingVetSummary, setLoadingVetSummary] = useState(false);
  const [saveStatus, setSaveStatus] = useState("idle");
  const lastSavedAnimalSignature = useRef("");
  const saveStatusTimer = useRef(null);
  const { authFetch } = useAuth();
  const { preferences } = usePreferences();
  const selectedAnimalRecordId = animal?.id;
  const primaryAnimalIdentifier = preferences.animalPrimaryIdentifier === "tag" ? "tag" : "name";
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
    setStatus(animal.status === "deceased" ? "deceased" : "active");
    setDeceasedDate(animal.deceased_date ? animal.deceased_date.slice(0, 10) : "");
    setDeceasedNotes(animal.deceased_notes || "");
    lastSavedAnimalSignature.current = JSON.stringify({
      herd_id: animal.herd_id === null || animal.herd_id === undefined ? null : String(animal.herd_id),
      name: animal.name || "",
      species: animal.species || "",
      sex: animal.sex || "",
      birthdate: animal.birthdate ? animal.birthdate.slice(0, 10) : "",
      age: animal.birthdate ? calculateAge(animal.birthdate) : animal.age || "",
      comments: animal.comments || "",
      weight: animal.weight || "",
      behavior: animal.behavior || "",
      tag_id: animal.tag_id || "",
      status: animal.status === "deceased" ? "deceased" : "active",
      deceased_date: animal.status === "deceased" && animal.deceased_date ? animal.deceased_date.slice(0, 10) : null,
      deceased_notes: animal.status === "deceased" ? animal.deceased_notes || null : null,
    });
    // Image is now retrieved from database, use animal.id as a flag
    setImageUrl(animal.id ? `stored` : "");
  }, [animal]);

  useEffect(() => () => {
    if (saveStatusTimer.current) clearTimeout(saveStatusTimer.current);
  }, []);

  const markSaved = () => {
    setSaveStatus("saved");
    if (saveStatusTimer.current) clearTimeout(saveStatusTimer.current);
    saveStatusTimer.current = setTimeout(() => setSaveStatus("idle"), 1600);
  };

  // Load image from database when animal changes or after a new upload.
  useEffect(() => {
    let objectUrl = "";

    const loadImage = async () => {
      if (!animal?.id || !imageUrl) {
        setImageBlobUrl("");
        return;
      }

      try {
        const response = await authFetch(`${API_URL}/api/animals/${animal.id}/image?refresh=${imageRefreshKey}`);
        
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
  }, [animal?.id, imageRefreshKey, imageUrl, authFetch]);

  useEffect(() => {
    const loadUpcomingVaccinations = async () => {
      if (!selectedAnimalRecordId) {
        setUpcomingVaccinations([]);
        return;
      }

      try {
        setLoadingVaccinationSummary(true);
        const res = await vaccinationsAPI.getVaccinations(selectedAnimalRecordId);
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
      } finally {
        setLoadingVaccinationSummary(false);
      }
    };

    loadUpcomingVaccinations();
  }, [selectedAnimalRecordId]);

  useEffect(() => {
    const loadUpcomingVetVisits = async () => {
      if (!selectedAnimalRecordId) {
        setUpcomingVetVisitDates([]);
        return;
      }

      try {
        setLoadingVetSummary(true);
        const res = await vetVisitsAPI.getVetVisitsForAnimal(selectedAnimalRecordId);
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
      } finally {
        setLoadingVetSummary(false);
      }
    };

    loadUpcomingVetVisits();
  }, [selectedAnimalRecordId]);

  // Save Animal to DB
  async function saveAnimal(updatedData = {}) {
    if (!animal) return;

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
      status,
      deceased_date: status === "deceased" ? deceasedDate || null : null,
      deceased_notes: status === "deceased" ? deceasedNotes || null : null,
      ...updatedData,
    };
    const signature = JSON.stringify(payload);

    if (signature === lastSavedAnimalSignature.current) return;

    try {
      setSaveStatus("saving");
      const res = await updateAnimal(payload, animalId);
      lastSavedAnimalSignature.current = signature;
      onAnimalSaved?.(res.data || { ...animal, ...payload, id: animalId });
      markSaved();
    } catch (err) {
      setSaveStatus("idle");
      console.error("Failed to update animal:", err.response?.data || err.message);
      toast.error("Failed to save animal data!");
    }
  }



  const upcomingQuickDates = status === "deceased"
    ? []
    : [...upcomingVaccinations, ...upcomingVetVisitDates].sort(
        (a, b) => new Date(a.date) - new Date(b.date)
      );

  const hasAnimalImage = Boolean(imageBlobUrl);
  const animalInitial = (name || tag || species || "B").trim().charAt(0).toUpperCase();
  const imageSrc = hasAnimalImage
    ? imageBlobUrl
    : `data:image/svg+xml,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">
        <defs>
          <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stop-color="#111827"/>
            <stop offset="55%" stop-color="#1f2937"/>
            <stop offset="100%" stop-color="#172554"/>
          </linearGradient>
        </defs>
        <rect width="800" height="600" fill="url(#bg)"/>
        <circle cx="400" cy="255" r="76" fill="#2563eb" fill-opacity="0.28" stroke="#93c5fd" stroke-opacity="0.42" stroke-width="4"/>
        <text x="400" y="282" text-anchor="middle" font-family="Arial, sans-serif" font-size="76" font-weight="700" fill="#dbeafe">${animalInitial}</text>
        <text x="400" y="380" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" font-weight="700" fill="#ffffff">No photo yet</text>
        <text x="400" y="424" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" fill="#9ca3af">Upload a clear ID photo</text>
      </svg>
    `)}`;
  const nameField = (
    <div>
      <label className="block text-gray-400 text-sm mb-1">
        Name <span className="text-gray-500">(required)</span>
      </label>
      <input
        value={name}
        onBlur={() => saveAnimal()}
        onChange={(e) => setName(e.target.value)}
        className="w-full bg-gray-700 text-gray-100 border border-gray-600 rounded-lg px-3 py-2"
      />
    </div>
  );
  const tagField = (
    <div>
      <label className="block text-gray-400 text-sm mb-1">Tag #</label>
      <input
        value={tag}
        onBlur={() => saveAnimal()}
        onChange={(e) => setTag(e.target.value)}
        className="w-full bg-gray-700 text-gray-100 border border-gray-600 rounded-lg px-3 py-2"
      />
    </div>
  );

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
      const previewUrl = URL.createObjectURL(file);
      setImageBlobUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return previewUrl;
      });
      await uploadAnimalImage(animal.id, file);
      setImageUrl("stored"); // Set flag to indicate image is stored
      setImageRefreshKey((current) => current + 1);
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
      setImageBlobUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return "";
      });
      setImageRefreshKey((current) => current + 1);
      toast.success("Image removed successfully.");
    } catch (err) {
      console.error("Image removal failed:", err.response?.data || err.message);
      toast.error("Failed to remove image.");
    } finally {
      setIsRemovingImage(false);
    }
  }

  async function handleDelete() {
    if (!animal || isDeletingAnimal) return;

    const confirmDelete = window.confirm(
      `Are you sure you want to delete ${animal.name}? This action cannot be undone!`
    );

    if (!confirmDelete) return;

    try {
      setIsDeletingAnimal(true);
      await deleteAnimal(animal.id);

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
      setStatus("active");
      setDeceasedDate("");
      setDeceasedNotes("");

      onAnimalDeleted?.(animal.id);
    } catch (err) {
      console.error("Failed to delete animal:", err.response?.data || err.message);
      toast.error("Failed to delete animal!");
    } finally {
      setIsDeletingAnimal(false);
    }
  }

  if (!animal || (animal?.id && String(animalId) !== String(animal.id))) {
    return <AnimalGeneralDataSkeleton />;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
      {/* Top Left - Basic Info */}
      <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 space-y-4">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h3 className="text-gray-400 font-semibold">Basic Info</h3>
          <span className={`rounded-lg px-3 py-1 text-xs font-semibold ${
            saveStatus === "saved" ? "bg-emerald-500/15 text-emerald-200" : "bg-gray-700 text-gray-300"
          }`}>
            {saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? "Saved" : "Auto-saves"}
          </span>
        </div>
        {primaryAnimalIdentifier === "tag" ? tagField : nameField}

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

        {primaryAnimalIdentifier === "tag" ? nameField : tagField}
      </div>

      {/* Top Right - Picture */}
      <div className="min-h-80 bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden shadow-lg">
        <label className="w-full h-full min-h-80 relative group block cursor-pointer">
          <img
            src={imageSrc}
            alt={`${name || "Animal"} profile`}
            className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-[1.02] group-hover:opacity-80"
            onError={() => setImageBlobUrl("")}
          />
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
            disabled={isUploadingImage}
          />
          <div className="absolute left-4 top-4 rounded-full border border-white/10 bg-black/55 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur">
            Max 5MB · JPG/PNG only
          </div>
          <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 bg-gradient-to-t from-black/85 via-black/55 to-transparent p-5 text-white transition duration-300 sm:opacity-0 sm:group-hover:opacity-100">
            <span className="text-lg font-semibold">{isUploadingImage ? "Uploading..." : hasAnimalImage ? "Change photo" : "Upload photo"}</span>
            <span className="text-sm text-white/75">Use a clear side profile, tag photo, or ID shot.</span>
            {hasAnimalImage && (
              <button
                type="button"
                className="w-fit px-3 py-1 text-sm font-medium rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-60"
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
        {loadingVaccinationSummary || loadingVetSummary ? (
          <div className="space-y-2" aria-busy="true">
            {[0, 1, 2].map((item) => (
              <SkeletonBlock key={item} className="h-14 w-full rounded-lg bg-gray-700" />
            ))}
          </div>
        ) : upcomingQuickDates.length === 0 ? (
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
      </div>

      {/* Full Width - Life Status */}
      <div className="lg:col-span-2 bg-gray-800 p-6 rounded-2xl border border-gray-700 space-y-4">
        <div className="flex flex-col gap-1">
          <h4 className="text-gray-400 font-semibold">Life Status</h4>
          <p className="text-sm text-gray-500">
            Mark animals deceased to keep records without counting them as active care.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(260px,360px)]">
          <div className="space-y-4">
            <div>
              <label className="block text-gray-400 text-sm mb-1">Status</label>
              <select
                value={status}
                onChange={async (e) => {
                  const nextStatus = e.target.value;
                  const defaultDate = new Date().toISOString().slice(0, 10);
                  setStatus(nextStatus);
                  if (nextStatus === "deceased" && !deceasedDate) {
                    setDeceasedDate(defaultDate);
                  }
                  await saveAnimal({
                    status: nextStatus,
                    deceased_date: nextStatus === "deceased" ? deceasedDate || defaultDate : null,
                    deceased_notes: nextStatus === "deceased" ? deceasedNotes : null,
                  });
                }}
                className="w-full bg-gray-700 text-gray-100 border border-gray-600 rounded-lg px-3 py-2"
              >
                <option value="active">Active</option>
                <option value="deceased">Deceased</option>
              </select>
            </div>

            {status === "deceased" && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,220px)_1fr]">
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Date of Death</label>
                  <input
                    type="date"
                    value={deceasedDate}
                    onChange={(e) => setDeceasedDate(e.target.value)}
                    onBlur={() => saveAnimal()}
                    className="w-full bg-gray-700 text-gray-100 border border-gray-600 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Death Notes</label>
                  <textarea
                    rows="3"
                    value={deceasedNotes}
                    onChange={(e) => setDeceasedNotes(e.target.value)}
                    onBlur={() => saveAnimal()}
                    placeholder="Cause, treatment history, disposal notes, or other farm records"
                    className="w-full bg-gray-700 text-gray-100 border border-gray-600 rounded-lg px-3 py-2"
                  />
                </div>
              </div>
            )}
          </div>

          <div className={`rounded-xl border p-4 ${
            status === "deceased"
              ? "border-gray-600 bg-gray-900/70"
              : "border-emerald-400/20 bg-emerald-400/10"
          }`}>
            <div className="flex items-center gap-3">
              <span className={`h-3 w-3 rounded-full ${status === "deceased" ? "bg-gray-400" : "bg-emerald-300"}`} />
              <p className="font-semibold text-white">
                {status === "deceased" ? "Record kept as deceased" : "Active animal"}
              </p>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-gray-400">
              {status === "deceased"
                ? "This animal stays in your records and exports, but is excluded from active care counts and upcoming quick dates."
                : "This animal is included in active care counts, dashboard status, and upcoming quick dates."}
            </p>
            {status === "deceased" && deceasedDate && (
              <p className="mt-3 rounded-lg bg-gray-800 px-3 py-2 text-sm text-gray-300">
                Date recorded: {deceasedDate}
              </p>
            )}
          </div>
        </div>

        <div className="border-t border-gray-700 pt-4">
          <label className="block text-gray-400 text-sm mb-1">Delete Animal</label>
          <button
            className="w-full bg-red-500 text-gray-300 border-red-600 rounded-lg px-3 py-2 hover:bg-red-400 transition disabled:cursor-wait disabled:opacity-60 sm:w-auto"
            onClick={handleDelete}
            disabled={isDeletingAnimal}
          >
            {isDeletingAnimal ? "Deleting..." : `Delete ${animal.name}`}
          </button>
        </div>
      </div>
      <ToastContainer autoClose="1000" />
    </div>
  );
}
