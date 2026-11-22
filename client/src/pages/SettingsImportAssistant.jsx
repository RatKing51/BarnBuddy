import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "react-toastify";
import ImportAssistant from "../components/ImportAssistant";
import { getAnimalsForUser } from "../api/animal";
import SettingsHeader from "../components/SettingsHeader";

export default function SettingsImportAssistant() {
  const navigate = useNavigate();
  const [animals, setAnimals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadAnimals() {
      try {
        setLoading(true);
        const res = await getAnimalsForUser();
        if (!cancelled) setAnimals(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load animals for duplicate checks.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadAnimals();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleImported = (importedAnimals = []) => {
    if (!Array.isArray(importedAnimals) || importedAnimals.length === 0) return;
    setAnimals((current) => {
      const ids = new Set(current.map((animal) => animal.id));
      return [...importedAnimals.filter((animal) => animal?.id && !ids.has(animal.id)), ...current];
    });
  };

  return (
    <div className="bb-livestock bb-settings min-h-screen">
      <SettingsHeader />

      <main className="bb-work-container pb-8">
        {loading ? (
          <div className="rounded-2xl border border-gray-700 bg-gray-800 p-8 text-gray-300">
            Loading import tools…
          </div>
        ) : (
          <ImportAssistant
            animals={animals}
            onImported={handleImported}
            onViewAnimals={() => navigate("/dashboard/animals")}
          />
        )}
      </main>

    </div>
  );
}
