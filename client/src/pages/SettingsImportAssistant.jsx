import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserButton } from "@clerk/clerk-react";
import { ToastContainer, toast } from "react-toastify";
import ImportAssistant from "../components/ImportAssistant";
import { getAnimalsForUser } from "../api/animal";

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
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <header className="border-b border-gray-700 bg-gray-800">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div>
            <button
              type="button"
              onClick={() => navigate("/settings/account")}
              className="text-left text-2xl font-bold tracking-tight hover:opacity-85"
            >
              <span className="text-blue-500">Barn</span>Buddy
            </button>
            <p className="mt-1 text-sm text-gray-400">Settings / Import Assistant</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/settings/account")}
              className="rounded-xl bg-gray-700 px-4 py-2 font-semibold text-white hover:bg-gray-600"
            >
              Settings
            </button>
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-500"
            >
              Dashboard
            </button>
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>

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

      <ToastContainer autoClose="1000" />
    </div>
  );
}
