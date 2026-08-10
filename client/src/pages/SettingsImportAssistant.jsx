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
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <SettingsHeader />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {loading ? (
          <div className="rounded-2xl border border-gray-700 bg-gray-800 p-8 text-gray-300">
            Loading BarnBuddy Import Assistant...
          </div>
        ) : (
          <ImportAssistant
            animals={animals}
            onAddCurrentAnimal={() => navigate("/dashboard")}
            onImported={handleImported}
            onViewAnimals={() => navigate("/dashboard")}
          />
        )}
      </main>

    </div>
  );
}
