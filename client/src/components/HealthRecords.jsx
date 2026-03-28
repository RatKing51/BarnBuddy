import React, { useEffect, useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import * as healthEventsAPI from "../api/healthEvents";
import * as vaccinationsAPI from "../api/vaccinations";
import * as birthDataAPI from "../api/birthData";

export default function HealthRecords({ animal }) {

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

  // Helper to format dates from API (ISO string) to input format (YYYY-MM-DD)
  const formatDateForInput = (dateStr) => {
    if (!dateStr) return "";
    return dateStr.slice(0, 10);
  };

  const handleAddEvent = () => {
    const newEvent = {
      date: "",
      type: "",
      severity: "",
      description: "",
      notes: "",
      resolved: false
    };

    setHealthEvents([...healthEvents, newEvent]);
    setSelectedEventIndex(healthEvents.length);
  };

  const handleAddVaccine = () => {
    const newVaccine = {
      date: "",
      type: "",
      notes: "",
      next_due_date: "",
      dosage: ""
    };

    setVaccinations([...vaccinations, newVaccine]);
    setSelectedVaccineIndex(vaccinations.length);
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
        const transformedEvents = (eventsRes.data || []).map(event => ({
          id: event.id,
          date: event.event_date ? event.event_date.slice(0, 10) : "",
          type: event.type || "",
          severity: event.severity || "",
          description: event.description || "",
          resolved: event.resolved || false,
          notes: event.notes || ""
        }));
        
        const transformedVaccinations = (vaccinationsRes.data || []).map(vac => ({
          id: vac.id,
          date: vac.date_given ? vac.date_given.slice(0, 10) : "",
          type: vac.vaccine_name || "",
          notes: vac.notes || "",
          next_due_date: vac.next_due_date ? vac.next_due_date.slice(0, 10) : "",
          dosage: vac.dosage || ""
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

  const saveHealthEvent = async (idx) => {
    if (!animal || idx === null) return;
    const event = healthEvents[idx];
    
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
        
        const updated = [...healthEvents];
        updated[idx].id = res.data.id;
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
    } catch (err) {
      console.error("Error deleting health event:", err);
      alert("Failed to delete health event");
    }
  };

  const saveVaccination = async (idx) => {
    if (!animal || idx === null) return;
    const vaccine = vaccinations[idx];
    
    console.log("Saving vaccination:", vaccine);
    
    setSavingVaccine(idx);
    try {
      if (vaccine.id) {
        // Update existing
        console.log("Updating vaccine ID:", vaccine.id);
        await vaccinationsAPI.updateVaccination(vaccine.id, {
          vaccine_name: vaccine.type || "",
          date_given: vaccine.date || null,
          next_due_date: vaccine.next_due_date || null,
          dosage: vaccine.dosage || null,
          notes: vaccine.notes
        });
        toast.success("Vaccination saved");
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
          next_due_date: vaccine.next_due_date || null,
          dosage: vaccine.dosage || null,
          notes: vaccine.notes
        });
        
        const updated = [...vaccinations];
        updated[idx].id = res.data.id;
        setVaccinations(updated);
        toast.success("Vaccination created");
      }
    } catch (err) {
      console.error("Error saving vaccination:", err);
      toast.error("Failed to save vaccination: " + (err.response?.data?.error || err.message));
    } finally {
      setSavingVaccine(null);
    }
  };

  const deleteVaccinationAPI = async (idx) => {
    const vaccine = vaccinations[idx];
    if (!vaccine.id) {
      handleDeleteVaccine(idx);
      return;
    }
    
    try {
      await vaccinationsAPI.deleteVaccination(vaccine.id);
      handleDeleteVaccine(idx);
    } catch (err) {
      console.error("Error deleting vaccination:", err);
      alert("Failed to delete vaccination");
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-2">

      {/* HEALTH EVENTS */}
      <div className="lg:col-span-2 bg-gray-800 border border-gray-700 rounded-xl p-5">

        <div className="flex justify-between items-center mb-4">
          <h2 className="text-gray-200 font-semibold text-lg">Health Events</h2>

          <button
            onClick={handleAddEvent}
            className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg text-sm font-medium"
          >
            + Add Event
          </button>
        </div>

        <div className="grid grid-cols-3 gap-6">

          {/* EVENT LIST */}
          <div className="col-span-1 space-y-2 max-h-[360px] overflow-y-auto">

            {healthEvents.length === 0 && (
              <div className="text-gray-400 text-sm">
                No health events recorded
              </div>
            )}

            {healthEvents.map((event, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <button
                  onClick={() => setSelectedEventIndex(idx)}
                  className={`flex-1 text-left p-3 rounded-lg border transition ${
                    selectedEventIndex === idx
                      ? "bg-blue-600 border-blue-500"
                      : "bg-gray-700 border-gray-600 hover:bg-gray-650"
                  }`}
                >
                  <div className="text-sm font-medium">
                    {event.type || "Health Event"}
                  </div>

                  <div className="text-xs text-gray-400">
                    {event.date || "No date"}
                  </div>
                </button>
                <button
                  onClick={() => deleteHealthEventAPI(idx)}
                  className="bg-red-600 hover:bg-red-500 px-3 py-2 rounded-lg text-sm font-medium"
                  title="Delete event"
                >
                  ×
                </button>
              </div>
            ))}

          </div>

          {/* EVENT FORM */}
          <div className="col-span-2 space-y-4">

            {selectedEventIndex === null ? (
              <div className="text-gray-400 text-sm">
                Select or add a health event to edit
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-4">

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
                      className="mt-1 w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm"
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
                      className="mt-1 w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm"
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
                      className="mt-1 w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="">Select</option>
                      <option>Low</option>
                      <option>Medium</option>
                      <option>High</option>
                    </select>
                  </div>

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
                    className="mt-1 w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm"
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
                    className="mt-1 w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm"
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
                    }}
                    onBlur={() => saveHealthEvent(selectedEventIndex)}
                  />
                  Mark as resolved
                </label>
              </>
            )}

          </div>

        </div>
      </div>

      {/* VACCINATIONS */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">

        <div className="flex justify-between mb-4">
          <h2 className="text-gray-200 font-semibold">Vaccinations</h2>

          <button
            onClick={handleAddVaccine}
            className="bg-blue-600 hover:bg-blue-500 px-3 py-1 rounded-lg text-sm"
          >
            + Add
          </button>
        </div>

        <div className="space-y-3 max-h-[320px] overflow-y-auto">

          {vaccinations.map((v, idx) => (
            <div
              key={idx}
              className="bg-gray-700 border border-gray-600 p-3 rounded-lg"
            >
              <div className="flex justify-between items-start gap-2 mb-2">
                <input
                  type="date"
                  value={v.date}
                  onChange={(e) => {
                    const updated = [...vaccinations];
                    updated[idx].date = e.target.value;
                    setVaccinations(updated);
                  }}
                  onBlur={() => saveVaccination(idx)}
                  className="bg-gray-600 border border-gray-500 rounded px-2 py-1 text-sm flex-1"
                />
                <button
                  onClick={() => deleteVaccinationAPI(idx)}
                  className="bg-red-600 hover:bg-red-500 px-2 py-1 rounded text-sm font-medium whitespace-nowrap"
                  title="Delete vaccine"
                >
                  ×
                </button>
              </div>

              <input
                placeholder="Vaccine Type"
                value={v.type}
                onChange={(e) => {
                  const updated = [...vaccinations];
                  updated[idx].type = e.target.value;
                  setVaccinations(updated);
                }}
                onBlur={() => saveVaccination(idx)}
                className="bg-gray-600 border border-gray-500 rounded px-2 py-1 text-sm w-full mb-2"
              />

              <input
                type="date"
                placeholder="Next Due Date"
                value={v.next_due_date || ""}
                onChange={(e) => {
                  const updated = [...vaccinations];
                  updated[idx].next_due_date = e.target.value;
                  setVaccinations(updated);
                }}
                onBlur={() => saveVaccination(idx)}
                className="bg-gray-600 border border-gray-500 rounded px-2 py-1 text-sm w-full mb-2"
              />

              <input
                placeholder="Dosage"
                value={v.dosage || ""}
                onChange={(e) => {
                  const updated = [...vaccinations];
                  updated[idx].dosage = e.target.value;
                  setVaccinations(updated);
                }}
                onBlur={() => saveVaccination(idx)}
                className="bg-gray-600 border border-gray-500 rounded px-2 py-1 text-sm w-full mb-2"
              />

              <textarea
                rows="2"
                placeholder="Notes"
                value={v.notes}
                onChange={(e) => {
                  const updated = [...vaccinations];
                  updated[idx].notes = e.target.value;
                  setVaccinations(updated);
                }}
                onBlur={() => saveVaccination(idx)}
                className="bg-gray-600 border border-gray-500 rounded px-2 py-1 text-sm w-full"
              />
            </div>
          ))}

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
            className="mt-1 w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm"
            disabled
          />
        </div>

        <div>
          <label className="text-xs text-gray-400">Birth Weight</label>
          <input
            value={birthWeight}
            onChange={(e) => setBirthWeight(e.target.value)}
            onBlur={saveBirthData}
            className="mt-1 w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="text-xs text-gray-400">Notes</label>
          <textarea
            rows="4"
            value={birthNotes}
            onChange={(e) => setBirthNotes(e.target.value)}
            onBlur={saveBirthData}
            className="mt-1 w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm"
          />
        </div>

      </div>

    </div>
  );
}