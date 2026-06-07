import React, { useEffect, useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import * as healthEventsAPI from "../api/healthEvents";
import * as vaccinationsAPI from "../api/vaccinations";
import * as birthDataAPI from "../api/birthData";

function SkeletonBlock({ className = "" }) {
  return <div className={`animate-pulse rounded-lg bg-gray-800 ${className}`} />;
}

function HealthRecordsSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch" aria-busy="true">
      <div className="lg:col-span-2 bg-gray-800 border border-gray-700 rounded-xl p-5">
        <div className="flex justify-between items-center mb-4">
          <div className="space-y-1">
            <SkeletonBlock className="h-5 w-44" />
            <SkeletonBlock className="h-3 w-64" />
          </div>
          <div className="flex items-center gap-3">
            <SkeletonBlock className="h-9 w-20" />
            <SkeletonBlock className="h-9 w-9 rounded-full" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
          {/* Event list (left) */}
          <div className="space-y-3 max-h-[360px] overflow-y-auto md:col-span-1">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="flex gap-3 items-center p-3 rounded-lg bg-gray-700 border border-gray-600">
                <SkeletonBlock className="h-10 w-10 rounded-full" />
                <div className="flex-1">
                  <SkeletonBlock className="h-4 w-32 mb-2" />
                  <div className="flex items-center justify-between">
                    <SkeletonBlock className="h-3 w-20" />
                    <SkeletonBlock className="h-3 w-16" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Event form (right) */}
          <div className="space-y-4 md:col-span-2">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <SkeletonBlock className="h-5 w-48" />
                  <SkeletonBlock className="h-3 w-56 mt-2" />
                </div>
                <SkeletonBlock className="h-9 w-20" />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <SkeletonBlock className="h-3 w-24 mb-2" />
                  <SkeletonBlock className="h-10 w-full" />
                </div>
                <div>
                  <SkeletonBlock className="h-3 w-24 mb-2" />
                  <SkeletonBlock className="h-10 w-full" />
                </div>
              </div>

              <div>
                <SkeletonBlock className="h-3 w-24 mb-2" />
                <SkeletonBlock className="h-20 w-full" />
              </div>

              <div className="flex items-center gap-4">
                <SkeletonBlock className="h-4 w-28" />
                <SkeletonBlock className="h-4 w-28" />
              </div>
            </div>

            {/* Secondary cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4">
                <SkeletonBlock className="h-5 w-36 mb-3" />
                <SkeletonBlock className="h-10 w-full" />
              </div>
              <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4">
                <SkeletonBlock className="h-5 w-36 mb-3" />
                <SkeletonBlock className="h-10 w-full" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Vaccinations card */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
        <div className="flex justify-between items-center mb-4">
          <SkeletonBlock className="h-5 w-36" />
          <SkeletonBlock className="h-9 w-20" />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
          <div className="space-y-3 max-h-[320px] overflow-y-auto md:col-span-1">
            {[0, 1, 2].map((i) => (
              <div key={i} className="p-3 rounded-lg bg-gray-700 border border-gray-600">
                <SkeletonBlock className="h-4 w-28 mb-2" />
                <SkeletonBlock className="h-3 w-20" />
              </div>
            ))}
          </div>

          <div className="space-y-4 md:col-span-2">
            {[0, 1].map((i) => (
              <div key={i} className="bg-gray-900 border border-gray-700 rounded-2xl p-4">
                <SkeletonBlock className="h-5 w-48 mb-3" />
                <SkeletonBlock className="h-10 w-full" />
                <SkeletonBlock className="h-10 w-full mt-3" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HealthRecords({ animal, onVaccinationUpdate }) {

  const [healthEvents, setHealthEvents] = useState([]);
  const [selectedEventIndex, setSelectedEventIndex] = useState(null);

  const [vaccinations, setVaccinations] = useState([]);
  const [selectedVaccineIndex, setSelectedVaccineIndex] = useState(null);

  const [birthDate, setBirthDate] = useState("");
  const [birthWeight, setBirthWeight] = useState("");
  const [birthNotes, setBirthNotes] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [savingBirth, setSavingBirth] = useState(false);
  const [savingEvent, setSavingEvent] = useState(null);
  const [savingVaccine, setSavingVaccine] = useState(null);

  // Helper to get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().slice(0, 10);
  };

  const getSeverityClasses = (severity) => {
    if (severity === "High") return "bg-red-500 text-white";
    if (severity === "Medium") return "bg-yellow-500 text-black";
    return "bg-emerald-500 text-white";
  };

  const formatDate = (value) => value || "Not recorded";

  const handleExportPdf = () => {
    window.print();
  };

  const handleAddEvent = () => {
    const newEvent = {
      date: getTodayDate(),
      type: "Checkup",
      severity: "Low",
      description: "",
      notes: "",
      resolved: false
    };

    const updatedEvents = [...healthEvents, newEvent];
    setHealthEvents(updatedEvents);
    setSelectedEventIndex(updatedEvents.length - 1);
    saveHealthEvent(updatedEvents.length - 1, newEvent);
  };

  const handleAddVaccine = () => {
    const newVaccine = {
      date: getTodayDate(),
      type: "Routine",
      notes: "",
      next_due_date: "",
      dosage: "",
      completed: false
    };

    const updatedVaccinations = [...vaccinations, newVaccine];
    setVaccinations(updatedVaccinations);
    setSelectedVaccineIndex(updatedVaccinations.length - 1);
    saveVaccination(updatedVaccinations.length - 1, newVaccine);
  };

  const handleDeleteEvent = (idx) => {
    const updated = healthEvents.filter((_, i) => i !== idx);
    setHealthEvents(updated);
    setSelectedEventIndex(null);
  };

  const handleDeleteVaccine = (idx) => {
    const updated = vaccinations.filter((_, i) => i !== idx);
    setVaccinations(updated);
    setSelectedVaccineIndex(null);
  };

  useEffect(() => {
    if (!animal) return;
    
    setBirthDate(animal.birthdate ? animal.birthdate.slice(0, 10) : "");
    setBirthNotes(animal.birth_notes || "");
    setBirthWeight(animal.birth_weight || "");
    
    // Fetch health events and vaccinations
    const fetchData = async () => {
      setLoading(true);
      try {
        const [eventsRes, vaccinationsRes] = await Promise.all([
          healthEventsAPI.getHealthEvents(animal.id),
          vaccinationsAPI.getVaccinations(animal.id)
        ]);
        
        // Transform API data to match component field names
        const transformedEvents = (Array.isArray(eventsRes.data) ? eventsRes.data : []).map(event => ({
          id: event.id,
          date: event.event_date ? event.event_date.slice(0, 10) : "",
          type: event.type || "",
          severity: event.severity || "",
          description: event.description || "",
          resolved: event.resolved || false,
          notes: event.notes || ""
        }));
        
        const transformedVaccinations = (Array.isArray(vaccinationsRes.data) ? vaccinationsRes.data : []).map(vac => ({
          id: vac.id,
          date: vac.date_given ? vac.date_given.slice(0, 10) : "",
          type: vac.vaccine_name || "",
          notes: vac.notes || "",
          next_due_date: vac.next_due_date ? vac.next_due_date.slice(0, 10) : "",
          dosage: vac.dosage || "",
          completed: !vac.next_due_date
        }));
        
        setHealthEvents(transformedEvents);
        setVaccinations(transformedVaccinations);
      } catch (err) {
        console.error("Error fetching health data:", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [animal]);

  if (loading) return <HealthRecordsSkeleton />;

  const saveBirthData = async () => {
    if (!animal) return;
    
    setSavingBirth(true);
    try {
      await birthDataAPI.updateBirthData(animal.id, {
        birth_weight: birthWeight || null,
        birth_notes: birthNotes
      });
      toast.success("Birth data saved");
    } catch (err) {
      console.error("Error saving birth data:", err);
      toast.error("Failed to save birth data");
    } finally {
      setSavingBirth(false);
    }
  };

  const saveHealthEvent = async (idx, eventData = null) => {
    if (!animal || idx === null) return;
    const updated = [...healthEvents];
    const event = eventData || updated[idx];
    if (!event) return;
    
    console.log("Saving health event:", event);
    
    setSavingEvent(idx);
    try {
      if (event.id) {
        // Update existing
        console.log("Updating event ID:", event.id);
        await healthEventsAPI.updateHealthEvent(event.id, {
          event_date: event.date || null,
          type: event.type,
          description: event.description,
          severity: event.severity,
          resolved: event.resolved,
          notes: event.notes
        });
        toast.success("Health event saved");
      } else {
        // Create new
        if (!event.date || !event.type) {
          toast.error("Date and type are required");
          setSavingEvent(null);
          return;
        }
        console.log("Creating new event");
        const res = await healthEventsAPI.createHealthEvent({
          animal_id: animal.id,
          event_date: event.date,
          type: event.type,
          description: event.description,
          severity: event.severity,
          resolved: event.resolved,
          notes: event.notes
        });
        
        updated[idx] = { ...event, id: res.data.id };
        setHealthEvents(updated);
        toast.success("Health event created");
      }
    } catch (err) {
      console.error("Error saving health event:", err);
      toast.error("Failed to save health event: " + (err.response?.data?.error || err.message));
    } finally {
      setSavingEvent(null);
    }
  };

  const deleteHealthEventAPI = async (idx) => {
    const event = healthEvents[idx];
    if (!event.id) {
      handleDeleteEvent(idx);
      return;
    }
    
    try {
      await healthEventsAPI.deleteHealthEvent(event.id);
      handleDeleteEvent(idx);
      toast.success("Health event deleted");
    } catch (err) {
      console.error("Error deleting health event:", err);
      toast.error("Failed to delete health event");
    }
  };

  const saveVaccination = async (idx, vaccineData = null) => {
    if (!animal || idx === null) return;
    const updated = [...vaccinations];
    const vaccine = vaccineData || updated[idx];
    if (!vaccine) return;
    
    console.log("Saving vaccination:", vaccine);
    
    setSavingVaccine(idx);
    try {
      if (vaccine.id) {
        // Update existing
        console.log("Updating vaccine ID:", vaccine.id);
        await vaccinationsAPI.updateVaccination(vaccine.id, {
          vaccine_name: vaccine.type || "",
          date_given: vaccine.date || null,
          next_due_date: vaccine.completed ? null : vaccine.next_due_date || null,
          dosage: vaccine.dosage || null,
          notes: vaccine.notes
        });
        toast.success("Vaccination saved");
        if (onVaccinationUpdate) onVaccinationUpdate();
      } else {
        // Create new
        if (!vaccine.date || !vaccine.type) {
          toast.error("Date and vaccine type are required");
          setSavingVaccine(null);
          return;
        }
        console.log("Creating new vaccination");
        const res = await vaccinationsAPI.createVaccination({
          animal_id: animal.id,
          vaccine_name: vaccine.type,
          date_given: vaccine.date,
          next_due_date: vaccine.completed ? null : vaccine.next_due_date || null,
          dosage: vaccine.dosage || null,
          notes: vaccine.notes
        });
        
        updated[idx] = { ...vaccine, id: res.data.id };
        setVaccinations(updated);
        toast.success("Vaccination created");
      }
    } catch (err) {
      console.error("Error saving vaccination:", err);
      toast.error("Failed to save vaccination: " + (err.response?.data?.error || err.message));
    } finally {
      setSavingVaccine(null);
    }

    if (onVaccinationUpdate) onVaccinationUpdate();
  };

  const deleteVaccinationAPI = async (idx) => {
    const vaccine = vaccinations[idx];
    if (!vaccine.id) {
      handleDeleteVaccine(idx);
      if (onVaccinationUpdate) onVaccinationUpdate();
      return;
    }
    
    try {
      await vaccinationsAPI.deleteVaccination(vaccine.id);
      handleDeleteVaccine(idx);
      toast.success("Vaccination deleted");
      if (onVaccinationUpdate) onVaccinationUpdate();
    } catch (err) {
      console.error("Error deleting vaccination:", err);
      toast.error("Failed to delete vaccination");
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">

      {/* HEALTH EVENTS */}
      <div className="lg:col-span-2 bg-gray-800 border border-gray-700 rounded-xl p-5">

        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-gray-200">Health Events</h2>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={handleExportPdf}
              className="cursor-pointer rounded-lg border border-gray-600 bg-gray-700 px-4 py-2 text-sm font-medium text-gray-100 hover:bg-gray-600"
            >
              Export PDF
            </button>
            <button
              onClick={handleAddEvent}
              className="cursor-pointer bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg text-sm font-medium"
            >
              + Add Event
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">

          {/* EVENT LIST */}
          <div className="space-y-2 max-h-[360px] overflow-y-auto md:col-span-1">

            {healthEvents.length === 0 && (
              <div className="text-gray-400 text-sm">
                No health events recorded
              </div>
            )}

            {healthEvents.map((event, idx) => (
              <div key={idx} className="flex gap-2 items-start">
                <button
                  onClick={() => setSelectedEventIndex(selectedEventIndex === idx ? null : idx)}
                  className={`cursor-pointer flex-1 text-left p-3 rounded-lg border transition ${
                    selectedEventIndex === idx
                      ? "bg-blue-600 border-blue-500"
                      : "bg-gray-700 border-gray-600 hover:bg-gray-650"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">
                      {event.type || "Health Event"}
                    </span>
                    <span className={`text-[10px] px-2 py-1 rounded-full ${getSeverityClasses(event.severity)}`}>
                      {event.severity || "Low"}
                    </span>
                  </div>

                  <div className="mt-1 text-xs text-gray-300 flex items-center justify-between gap-2">
                    <span>{event.date || "No date"}</span>
                    {event.resolved && (
                      <span className="text-[10px] rounded-full bg-emerald-500 px-2 py-1 text-white uppercase tracking-[0.15em]">
                        Resolved
                      </span>
                    )}
                  </div>
                </button>
              </div>
            ))}

          </div>

          {/* EVENT FORM */}
          <div className="space-y-4 md:col-span-2">
            {selectedEventIndex === null ? (
              <div className="text-gray-400 text-sm">
                Select or add a health event to edit
              </div>
            ) : (
              <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4 space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-gray-100 font-semibold">Event Details</h3>
                    <p className="text-xs text-gray-500">Save updates when you're done editing.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteHealthEventAPI(selectedEventIndex)}
                    className="cursor-pointer rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-white hover:bg-red-500"
                  >
                    Delete
                  </button>
                </div>

                <div>
                  <label className="text-xs text-gray-400">Date</label>
                  <input
                    type="date"
                    value={healthEvents[selectedEventIndex].date}
                    onChange={(e) => {
                      const updated = [...healthEvents];
                      updated[selectedEventIndex].date = e.target.value;
                      setHealthEvents(updated);
                    }}
                    onBlur={() => saveHealthEvent(selectedEventIndex)}
                    className="cursor-text mt-1 w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-400">Type</label>
                  <select
                    value={healthEvents[selectedEventIndex].type}
                    onChange={(e) => {
                      const updated = [...healthEvents];
                      updated[selectedEventIndex].type = e.target.value;
                      setHealthEvents(updated);
                    }}
                    onBlur={() => saveHealthEvent(selectedEventIndex)}
                    className="cursor-pointer mt-1 w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">Select</option>
                    <option>Illness</option>
                    <option>Injury</option>
                    <option>Checkup</option>
                    <option>Treatment</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-gray-400">Severity</label>
                  <select
                    value={healthEvents[selectedEventIndex].severity}
                    onChange={(e) => {
                      const updated = [...healthEvents];
                      updated[selectedEventIndex].severity = e.target.value;
                      setHealthEvents(updated);
                    }}
                    onBlur={() => saveHealthEvent(selectedEventIndex)}
                    className="cursor-pointer mt-1 w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">Select</option>
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-gray-400">Description</label>
                  <input
                    value={healthEvents[selectedEventIndex].description}
                    onChange={(e) => {
                      const updated = [...healthEvents];
                      updated[selectedEventIndex].description = e.target.value;
                      setHealthEvents(updated);
                    }}
                    onBlur={() => saveHealthEvent(selectedEventIndex)}
                    className="cursor-text mt-1 w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-400">Notes</label>
                  <textarea
                    rows="4"
                    value={healthEvents[selectedEventIndex].notes}
                    onChange={(e) => {
                      const updated = [...healthEvents];
                      updated[selectedEventIndex].notes = e.target.value;
                      setHealthEvents(updated);
                    }}
                    onBlur={() => saveHealthEvent(selectedEventIndex)}
                    className="cursor-text mt-1 w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm"
                  />
                </div>

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={healthEvents[selectedEventIndex].resolved}
                    onChange={(e) => {
                      const updated = [...healthEvents];
                      updated[selectedEventIndex].resolved = e.target.checked;
                      setHealthEvents(updated);
                      saveHealthEvent(selectedEventIndex);
                    }}
                    className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-blue-500"
                  />
                  Mark as resolved
                </label>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* VACCINATIONS */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">

        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-gray-200">Vaccinations</h2>

          <button
            onClick={handleAddVaccine}
            className="cursor-pointer bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg text-sm font-medium"
          >
            + Add Vaccination
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">

          {/* VACCINE LIST */}
          <div className="space-y-2 max-h-[360px] overflow-y-auto md:col-span-1">

            {vaccinations.length === 0 && (
              <div className="text-gray-400 text-sm">
                No vaccinations recorded
              </div>
            )}

            {vaccinations.map((vaccine, idx) => (
              <div key={idx} className="flex gap-2 items-start">
                <button
                  onClick={() => setSelectedVaccineIndex(selectedVaccineIndex === idx ? null : idx)}
                  className={`cursor-pointer flex-1 text-left p-3 rounded-lg border transition ${
                    selectedVaccineIndex === idx
                      ? "bg-blue-600 border-blue-500"
                      : "bg-gray-700 border-gray-600 hover:bg-gray-650"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">
                      {vaccine.type || "Vaccination"}
                    </span>
                    <span className={`text-[10px] rounded-full px-2 py-1 ${vaccine.completed ? "bg-emerald-500 text-white" : "bg-yellow-500 text-black"}`}>
                      {vaccine.completed ? "Completed" : "Pending"}
                    </span>
                  </div>

                  <div className="mt-1 text-xs text-gray-300 flex items-center justify-between gap-2">
                    <span>{vaccine.date || "No date"}</span>
                    <span>{vaccine.next_due_date ? `Next: ${vaccine.next_due_date}` : "No follow-up"}</span>
                  </div>
                </button>
              </div>
            ))}

          </div>

          {/* VACCINE FORM */}
          <div className="space-y-4 md:col-span-2">
            {selectedVaccineIndex === null ? (
              <div className="text-gray-400 text-sm">
                Select or add a vaccination to edit
              </div>
            ) : (
              <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4 space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-gray-100 font-semibold">Vaccination Details</h3>
                    <p className="text-xs text-gray-500">Save changes when you're done editing.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteVaccinationAPI(selectedVaccineIndex)}
                    className="cursor-pointer rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-white hover:bg-red-500"
                  >
                    Delete
                  </button>
                </div>

                <div>
                  <label className="text-xs text-gray-400">Vaccination Date</label>
                  <input
                    type="date"
                    value={vaccinations[selectedVaccineIndex].date}
                    onChange={(e) => {
                      const updated = [...vaccinations];
                      updated[selectedVaccineIndex].date = e.target.value;
                      setVaccinations(updated);
                    }}
                    onBlur={() => saveVaccination(selectedVaccineIndex)}
                    className="cursor-text mt-1 w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-400">Vaccine Type</label>
                  <input
                    placeholder="Vaccine Type"
                    value={vaccinations[selectedVaccineIndex].type}
                    onChange={(e) => {
                      const updated = [...vaccinations];
                      updated[selectedVaccineIndex].type = e.target.value;
                      setVaccinations(updated);
                    }}
                    onBlur={() => saveVaccination(selectedVaccineIndex)}
                    className="cursor-text mt-1 w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-400">Next Due Date</label>
                  <input
                    type="date"
                    value={vaccinations[selectedVaccineIndex].next_due_date || ""}
                    onChange={(e) => {
                      const updated = [...vaccinations];
                      updated[selectedVaccineIndex].next_due_date = e.target.value;
                      updated[selectedVaccineIndex].completed = e.target.value === "" ? updated[selectedVaccineIndex].completed : false;
                      setVaccinations(updated);
                    }}
                    onBlur={() => saveVaccination(selectedVaccineIndex)}
                    disabled={vaccinations[selectedVaccineIndex].completed}
                    className="cursor-text mt-1 w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-400">Dosage</label>
                  <input
                    placeholder="Dosage"
                    value={vaccinations[selectedVaccineIndex].dosage || ""}
                    onChange={(e) => {
                      const updated = [...vaccinations];
                      updated[selectedVaccineIndex].dosage = e.target.value;
                      setVaccinations(updated);
                    }}
                    onBlur={() => saveVaccination(selectedVaccineIndex)}
                    className="cursor-text mt-1 w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm"
                  />
                </div>

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={vaccinations[selectedVaccineIndex].completed || false}
                    onChange={(e) => {
                      const updated = [...vaccinations];
                      updated[selectedVaccineIndex].completed = e.target.checked;
                      if (e.target.checked) {
                        updated[selectedVaccineIndex].next_due_date = "";
                      }
                      setVaccinations(updated);
                      saveVaccination(selectedVaccineIndex);
                    }}
                    className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-blue-500"
                  />
                  Mark as complete (no next due date)
                </label>

                <div>
                  <label className="text-xs text-gray-400">Notes</label>
                  <textarea
                    rows="4"
                    value={vaccinations[selectedVaccineIndex].notes}
                    onChange={(e) => {
                      const updated = [...vaccinations];
                      updated[selectedVaccineIndex].notes = e.target.value;
                      setVaccinations(updated);
                    }}
                    onBlur={() => saveVaccination(selectedVaccineIndex)}
                    className="cursor-text mt-1 w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* BIRTH INFO */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-4">

        <h2 className="text-gray-200 font-semibold">Birth Information</h2>

        <div>
          <label className="text-xs text-gray-400">Birth Date</label>
          <input
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            className="cursor-text mt-1 w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm"
            disabled
          />
        </div>

        <div>
          <label className="text-xs text-gray-400">Birth Weight</label>
          <input
            value={birthWeight}
            onChange={(e) => setBirthWeight(e.target.value)}
            onBlur={saveBirthData}
            className="cursor-text mt-1 w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="text-xs text-gray-400">Notes</label>
          <textarea
            rows="4"
            value={birthNotes}
            onChange={(e) => setBirthNotes(e.target.value)}
            onBlur={saveBirthData}
            className="cursor-text mt-1 w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm"
          />
        </div>

      </div>
      <section id="health-records-pdf" className="pdf-export-report hidden">
        <header>
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            BarnBuddy Health Report
          </p>
          <h1>{animal?.name || "Animal"} Health Records</h1>
          <p>Generated {new Date().toLocaleDateString()}</p>
        </header>

        <section>
          <h2>Animal Summary</h2>
          <dl>
            <div>
              <dt>Name</dt>
              <dd>{animal?.name || "Not recorded"}</dd>
            </div>
            <div>
              <dt>Species</dt>
              <dd>{animal?.species || "Not recorded"}</dd>
            </div>
            <div>
              <dt>Tag</dt>
              <dd>{animal?.tag_id || "Not recorded"}</dd>
            </div>
            <div>
              <dt>Birth Date</dt>
              <dd>{formatDate(birthDate)}</dd>
            </div>
            <div>
              <dt>Birth Weight</dt>
              <dd>{birthWeight || "Not recorded"}</dd>
            </div>
          </dl>
          {birthNotes && <p className="pdf-notes">{birthNotes}</p>}
        </section>

        <section>
          <h2>Health Events</h2>
          {healthEvents.length === 0 ? (
            <p>No health events recorded.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {healthEvents.map((event, idx) => (
                  <tr key={`event-${event.id || idx}`}>
                    <td>{formatDate(event.date)}</td>
                    <td>{event.type || "Health Event"}</td>
                    <td>{event.severity || "Low"}</td>
                    <td>{event.resolved ? "Resolved" : "Open"}</td>
                    <td>{event.notes || event.description || ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section>
          <h2>Vaccinations</h2>
          {vaccinations.length === 0 ? (
            <p>No vaccinations recorded.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Vaccine</th>
                  <th>Dosage</th>
                  <th>Next Due</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {vaccinations.map((vaccine, idx) => (
                  <tr key={`vaccine-${vaccine.id || idx}`}>
                    <td>{formatDate(vaccine.date)}</td>
                    <td>{vaccine.type || "Vaccination"}</td>
                    <td>{vaccine.dosage || ""}</td>
                    <td>{vaccine.completed ? "Completed" : formatDate(vaccine.next_due_date)}</td>
                    <td>{vaccine.notes || ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </section>
      <ToastContainer autoClose="1000" />
    </div>
  );
}
