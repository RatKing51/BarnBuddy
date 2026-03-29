import React, { useEffect, useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import * as healthEventsAPI from "../api/healthEvents";
import * as vaccinationsAPI from "../api/vaccinations";
import * as birthDataAPI from "../api/birthData";

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

  const handleAddEvent = () => {
    const newEvent = {
      date: getTodayDate(),
      type: "Checkup",
      severity: "Low",
      description: "",
      notes: "",
      resolved: false
    };

    // Auto-save the new event immediately - it will be added to state with ID
    saveHealthEvent(healthEvents.length, newEvent);
    // Removed auto-selection: setSelectedEventIndex(healthEvents.length);
  };

  const handleAddVaccine = () => {
    const newVaccine = {
      date: getTodayDate(),
      type: "Routine",
      notes: "",
      next_due_date: "",
      dosage: ""
    };

    // Auto-save the new vaccination immediately - it will be added to state with ID
    saveVaccination(vaccinations.length, newVaccine);
    // Removed auto-selection: setSelectedVaccineIndex(vaccinations.length);
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

  const saveHealthEvent = async (idx, eventData = null) => {
    if (!animal || idx === null) return;
    const event = eventData || healthEvents[idx];
    
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
        
        // For new events, add the ID and update state
        const newEventWithId = { ...event, id: res.data.id };
        const updated = [...healthEvents, newEventWithId];
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
    const vaccine = vaccineData || vaccinations[idx];
    
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
          next_due_date: vaccine.next_due_date || null,
          dosage: vaccine.dosage || null,
          notes: vaccine.notes
        });
        
        // For new vaccinations, add the ID and update state
        const newVaccineWithId = { ...vaccine, id: res.data.id };
        const updated = [...vaccinations, newVaccineWithId];
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
                      onBlur={healthEvents[selectedEventIndex].id ? () => saveHealthEvent(selectedEventIndex) : undefined}
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
                      onBlur={healthEvents[selectedEventIndex].id ? () => saveHealthEvent(selectedEventIndex) : undefined}
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
                      onBlur={healthEvents[selectedEventIndex].id ? () => saveHealthEvent(selectedEventIndex) : undefined}
                      className="mt-1 w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm"
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
                    onBlur={healthEvents[selectedEventIndex].id ? () => saveHealthEvent(selectedEventIndex) : undefined}
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
                    onBlur={healthEvents[selectedEventIndex].id ? () => saveHealthEvent(selectedEventIndex) : undefined}
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
                    onBlur={healthEvents[selectedEventIndex].id ? () => saveHealthEvent(selectedEventIndex) : undefined}
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

        <div className="flex justify-between items-center mb-4">
          <h2 className="text-gray-200 font-semibold text-lg">Vaccinations</h2>

          <button
            onClick={handleAddVaccine}
            className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg text-sm font-medium"
          >
            + Add Vaccination
          </button>
        </div>

        <div className="grid grid-cols-3 gap-6">

          {/* VACCINE LIST */}
          <div className="col-span-1 space-y-2 max-h-[360px] overflow-y-auto">

            {vaccinations.length === 0 && (
              <div className="text-gray-400 text-sm">
                No vaccinations recorded
              </div>
            )}

            {vaccinations.map((vaccine, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <button
                  onClick={() => setSelectedVaccineIndex(idx)}
                  className={`flex-1 text-left p-3 rounded-lg border transition ${
                    selectedVaccineIndex === idx
                      ? "bg-blue-600 border-blue-500"
                      : "bg-gray-700 border-gray-600 hover:bg-gray-650"
                  }`}
                >
                  <div className="text-sm font-medium">
                    {vaccine.type || "Vaccination"}
                  </div>

                  <div className="text-xs text-gray-400">
                    {vaccine.date || "No date"}
                  </div>
                </button>
                <button
                  onClick={() => deleteVaccinationAPI(idx)}
                  className="bg-red-600 hover:bg-red-500 px-3 py-2 rounded-lg text-sm font-medium"
                  title="Delete vaccination"
                >
                  ×
                </button>
              </div>
            ))}

          </div>

          {/* VACCINE FORM */}
          <div className="col-span-2 space-y-4">

            {selectedVaccineIndex === null ? (
              <div className="text-gray-400 text-sm">
                Select or add a vaccination to edit
              </div>
            ) : (
              <>
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
                    onBlur={vaccinations[selectedVaccineIndex].id ? () => saveVaccination(selectedVaccineIndex) : undefined}
                    className="mt-1 w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm"
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
                    onBlur={vaccinations[selectedVaccineIndex].id ? () => saveVaccination(selectedVaccineIndex) : undefined}
                    className="mt-1 w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm"
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
                      setVaccinations(updated);
                    }}
                    onBlur={vaccinations[selectedVaccineIndex].id ? () => saveVaccination(selectedVaccineIndex) : undefined}
                    className="mt-1 w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm"
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
                    onBlur={vaccinations[selectedVaccineIndex].id ? () => saveVaccination(selectedVaccineIndex) : undefined}
                    className="mt-1 w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm"
                  />
                </div>

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
                    onBlur={vaccinations[selectedVaccineIndex].id ? () => saveVaccination(selectedVaccineIndex) : undefined}
                    className="mt-1 w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm"
                  />
                </div>

              </>
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
      <ToastContainer autoClose="1000" />
    </div>
  );
}