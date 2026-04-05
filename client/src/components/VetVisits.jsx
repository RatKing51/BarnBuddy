import React, { useState, useEffect } from "react";
import { getVetVisitsForAnimal, createVetVisit, updateVetVisit, deleteVetVisit } from "../api/vetVisits";
import { toast, ToastContainer } from "react-toastify";
export default function VetVisits({ animal, onVetVisitUpdate }) {
  const [visits, setVisits] = useState([]);
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [upcomingView, setUpcomingView] = useState("visit");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (animal?.id) {
      fetchVisits();
    }
  }, [animal]);

  const fetchVisits = async () => {
    try {
      const response = await getVetVisitsForAnimal(animal.id);
      const normalizedVisits = response.data.map(normalizeVisit);
      setVisits(normalizedVisits);
      if (normalizedVisits.length > 0) {
        setSelectedVisit(normalizedVisits[0]);
      }
    } catch (error) {
      console.error("Error fetching vet visits:", error);
      toast.error("Failed to load vet visits. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddVisit = () => {
    const newVisit = {
      animal_id: animal.id,
      vet_name: "N/A",
      visit_date: new Date().toISOString().split("T")[0],
      reason: "N/A",
      treatment: "",
      medications: "",
      follow_up_date: new Date().toISOString().split("T")[0],
      cost: "1",
      notes: "New vet visit"
    };
    setSelectedVisit(newVisit);
  };

  const isVisitHasData = (visit) => {
    if (!visit) return false;
    return Boolean(
      visit.vet_name?.trim() ||
      visit.reason?.trim() ||
      visit.treatment?.trim() ||
      visit.medications?.trim() ||
      visit.follow_up_date ||
      visit.cost ||
      visit.notes?.trim() ||
      visit.visit_date
    );
  };

  const parseLocalDate = (value) => {
    if (!value) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year, month, day] = value.split("-").map(Number);
      return new Date(year, month - 1, day);
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return "";
    const date = parseLocalDate(dateValue);
    if (!date) return dateValue;
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const normalizeDate = (value) => {
    if (!value) return "";
    const date = parseLocalDate(value);
    if (!date) return value;
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  };

  const normalizeVisit = (visit) => ({
    ...visit,
    visit_date: normalizeDate(visit.visit_date),
    follow_up_date: normalizeDate(visit.follow_up_date),
  });

  const saveVisit = async (visit) => {
    if (!visit || (!visit.id && !isVisitHasData(visit))) {
      return;
    }

    try {
      if (visit.id) {
        const response = await updateVetVisit(visit.id, visit);
        const normalizedVisit = normalizeVisit(response.data);
        setVisits(visits.map((v) => (v.id === visit.id ? normalizedVisit : v)));
        setSelectedVisit(normalizedVisit);
        toast.success("Vet visit updated successfully!");
      } else {
        const response = await createVetVisit(visit);
        const normalizedVisit = normalizeVisit(response.data);
        setVisits([normalizedVisit, ...visits]);
        setSelectedVisit(normalizedVisit);
        toast.success("Vet visit created successfully!");
      }
      onVetVisitUpdate?.();
    } catch (error) {
      console.error("Error saving vet visit:", error);
      toast.error("Failed to save vet visit. Please try again.");
    }
  };

  const handleBlurSave = async () => {
    if (!selectedVisit) return;
    await saveVisit(selectedVisit);
  };

  const handleDeleteVisit = async () => {
    if (!selectedVisit) return;

    if (!selectedVisit.id) {
      const remainingVisits = visits;
      setSelectedVisit(remainingVisits[0] || null);
      return;
    }

    try {
      await deleteVetVisit(selectedVisit.id);
      const remainingVisits = visits.filter((v) => v.id !== selectedVisit.id);
      setVisits(remainingVisits);
      setSelectedVisit(remainingVisits[0] || null);
      toast.success("Vet visit deleted successfully!");
      onVetVisitUpdate?.();
    } catch (error) {
      console.error("Error deleting vet visit:", error);
      toast.error("Failed to delete vet visit. Please try again.");
    }
  };

  const handleInputChange = (field, value) => {
    setSelectedVisit({ ...selectedVisit, [field]: value });
  };

  const sortedVisits = [...visits].sort(
    (a, b) => parseLocalDate(b.visit_date) - parseLocalDate(a.visit_date)
  );

  const getDateOnly = (value) => {
    const date = parseLocalDate(value);
    if (Number.isNaN(date.getTime())) return null;
    date.setHours(0, 0, 0, 0);
    return date;
  };

  const today = getDateOnly(new Date());
  const upcomingWindowEnd = new Date(today);
  upcomingWindowEnd.setDate(today.getDate() + 10);

  const upcomingVisitsByDate = sortedVisits
    .filter((visit) => {
      const visitDate = getDateOnly(visit.visit_date);
      return visitDate && visitDate > today && visitDate <= upcomingWindowEnd;
    })
    .sort((a, b) => getDateOnly(a.visit_date) - getDateOnly(b.visit_date));

  const upcomingVisitsByFollowUp = sortedVisits
    .filter((visit) => {
      const followUpDate = getDateOnly(visit.follow_up_date);
      return followUpDate && followUpDate > today && followUpDate <= upcomingWindowEnd;
    })
    .sort((a, b) => getDateOnly(a.follow_up_date) - getDateOnly(b.follow_up_date));

  const visitUpcomingCount = upcomingVisitsByDate.length;
  const followUpUpcomingCount = upcomingVisitsByFollowUp.length;
  const upcomingVisits = upcomingView === "visit" ? upcomingVisitsByDate : upcomingVisitsByFollowUp;

  const pastVisits = sortedVisits.filter((visit) => {
    const visitDate = getDateOnly(visit.visit_date);
    return visitDate && visitDate <= today;
  });

  if (loading) {
    return <div className="text-gray-400">Loading vet visits...</div>;
  }

  return (
    <div className="flex flex-col lg:flex-row h-full gap-6 min-h-screen">

      {/* Left Panel */}
      <div className="w-full lg:w-1/4 flex flex-col gap-4">

        {/* Upcoming visits */}
        <div className="bg-gray-800 p-5 rounded-2xl border border-gray-700 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h3 className="text-gray-400 font-semibold text-base">
              Upcoming Visits (next 10 days)
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => setUpcomingView("visit")}
                className={`px-3 py-1 rounded-lg text-sm transition ${
                  upcomingView === "visit"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                Visit Date ({visitUpcomingCount})
              </button>
              <button
                onClick={() => setUpcomingView("followUp")}
                className={`px-3 py-1 rounded-lg text-sm transition ${
                  upcomingView === "followUp"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                Follow-Up Date ({followUpUpcomingCount})
              </button>
            </div>
          </div>

          <ul className="space-y-2 text-sm">
            {upcomingVisits.map((visit, idx) => (
              <li
                key={visit.id || idx}
                onClick={() => setSelectedVisit(normalizeVisit(visit))}
                className={`cursor-pointer p-3 rounded-lg transition ${
                  visit.id === selectedVisit?.id
                    ? "bg-blue-600 text-white"
                    : "bg-gray-700 hover:bg-gray-600"
                }`}
              >
                <span>
                  {formatDate(
                    upcomingView === "visit"
                      ? visit.visit_date
                      : visit.follow_up_date
                  )}
                </span>
                <span className="block text-xs">
                  {upcomingView === "visit" ? "Visit" : "Follow-up"} • {visit.vet_name || "Untitled visit"}
                </span>
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
                key={visit.id || idx}
                onClick={() => setSelectedVisit(normalizeVisit(visit))}
                className={`cursor-pointer p-3 rounded-lg transition ${
                  visit.id === selectedVisit?.id
                    ? "bg-blue-600 text-white"
                    : "bg-gray-700 hover:bg-gray-600"
                }`}
              >
                <span>{formatDate(visit.visit_date)}</span>
                <span className="block text-xs">
                  {visit.vet_name || "Untitled visit"}
                </span>
              </li>
            ))}
          </ul>

          <button
            onClick={handleAddVisit}
            className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-500 transition"
          >
            Add Visit
          </button>
        </div>
      </div>

      {/* Right Panel: Visit Details */}
      <div className="w-full lg:w-3/4 bg-gray-800 p-6 rounded-2xl border border-gray-700 space-y-5 h-min">
        {selectedVisit ? (
          <>
            <div className="flex justify-between items-center">
              <h3 className="text-gray-400 font-semibold mb-1 text-lg">
                Visit Details
              </h3>
              <div className="space-x-2">
                {selectedVisit?.id && (
                  <button
                    onClick={handleDeleteVisit}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-500 transition"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-1">Date</label>
              <input
                type="date"
                value={selectedVisit.visit_date || ""}
                onChange={(e) => handleInputChange("visit_date", e.target.value)}
                onBlur={handleBlurSave}
                className="w-full bg-gray-700 text-gray-100 border border-gray-600 rounded-lg px-3 py-3 text-base"
              />
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-1">Vet Name</label>
              <input
                value={selectedVisit.vet_name || ""}
                onChange={(e) => handleInputChange("vet_name", e.target.value)}
                onBlur={handleBlurSave}
                className="w-full bg-gray-700 text-gray-100 border border-gray-600 rounded-lg px-3 py-3 text-base"
              />
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-1">Reason</label>
              <input
                value={selectedVisit.reason || ""}
                onChange={(e) => handleInputChange("reason", e.target.value)}
                onBlur={handleBlurSave}
                className="w-full bg-gray-700 text-gray-100 border border-gray-600 rounded-lg px-3 py-3 text-base"
              />
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-1">Treatment</label>
              <textarea
                value={selectedVisit.treatment || ""}
                onChange={(e) => handleInputChange("treatment", e.target.value)}
                onBlur={handleBlurSave}
                className="w-full bg-gray-700 text-gray-100 border border-gray-600 rounded-lg px-3 py-3 text-base h-24"
              />
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-1">Medications</label>
              <textarea
                value={selectedVisit.medications || ""}
                onChange={(e) => handleInputChange("medications", e.target.value)}
                onBlur={handleBlurSave}
                className="w-full bg-gray-700 text-gray-100 border border-gray-600 rounded-lg px-3 py-3 text-base h-24"
              />
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-1">Follow-up Date</label>
              <input
                type="date"
                value={selectedVisit.follow_up_date || ""}
                onChange={(e) => handleInputChange("follow_up_date", e.target.value)}
                onBlur={handleBlurSave}
                className="w-full bg-gray-700 text-gray-100 border border-gray-600 rounded-lg px-3 py-3 text-base"
              />
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-1">Cost</label>
              <input
                type="number"
                value={selectedVisit.cost || ""}
                onChange={(e) => handleInputChange("cost", e.target.value)}
                onBlur={handleBlurSave}
                className="w-full bg-gray-700 text-gray-100 border border-gray-600 rounded-lg px-3 py-3 text-base"
              />
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-1">Notes</label>
              <textarea
                value={selectedVisit.notes || ""}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                onBlur={handleBlurSave}
                className="w-full bg-gray-700 text-gray-100 border border-gray-600 rounded-lg px-3 py-3 text-base h-32"
              />
            </div>
          </>
        ) : (
          <div className="text-gray-400 text-center py-8">
            No vet visits found. Click "Add Visit" to create one.
          </div>
        )}
      </div>
      <ToastContainer autoClose="1000" />
    </div>
  );
}
