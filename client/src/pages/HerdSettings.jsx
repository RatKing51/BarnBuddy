import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import axios from "../api/axios"; // your axios instance

export default function HerdSettings() {
  const [herds, setHerds] = useState([]);
  const [selectedHerd, setSelectedHerd] = useState(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creatingHerd, setCreatingHerd] = useState(false);
  const [savingHerd, setSavingHerd] = useState(false);
  const [deletingHerd, setDeletingHerd] = useState(false);

  const navigate = useNavigate();

  // fetch herds
  useEffect(() => {
    fetchHerds();
  }, []);

  const fetchHerds = async () => {
    try {
      const res = await axios.get("/herds");
      setHerds(res.data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load herds.");
    }
  };

  const selectHerd = (herd) => {
    setSelectedHerd(herd);
    setName(herd.name);
    setDescription(herd.description || "");
  };

  const saveHerd = async () => {
    if (!selectedHerd || savingHerd) return;

    try {
      setSavingHerd(true);
      await axios.put(`/herds/${selectedHerd.id}`, {
        name,
        description,
      });
      toast.success("Saved Herd!");
      fetchHerds();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || "Failed to save herd.");
    } finally {
      setSavingHerd(false);
    }
  };

  const deleteHerd = async () => {
    if (!selectedHerd || deletingHerd) return;

    if (!window.confirm("Delete this herd? Animals in this herd will be moved to Unassigned.")) return;

    try {
      setDeletingHerd(true);
      const res = await axios.delete(`/herds/${selectedHerd.id}`);

      setSelectedHerd(null);
      setName("");
      setDescription("");
      toast.success(`Deleted herd. Moved ${res.data.unassignedAnimals || 0} animal(s) to Unassigned.`);
      fetchHerds();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || "Failed to delete herd.");
    } finally {
      setDeletingHerd(false);
    }
  };

  const createHerd = async () => {
    if (creatingHerd) return;

    try {
      setCreatingHerd(true);
      const res = await axios.post("/herds", {
        name: "New Herd",
        description: "",
      });

      fetchHerds();
      toast.success("Created Herd!");
      selectHerd(res.data);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || "Failed to create herd.");
    } finally {
      setCreatingHerd(false);
    }
  };

  return (
    <div className="flex bg-gray-900 text-gray-100 w-full h-screen">
      
      {/* Sidebar */}
      <div className="w-64 border-r border-gray-700 p-4">
        <h2 className="text-lg font-semibold mb-4">Herds</h2>
        <button
            className="px-5 py-2 bg-blue-600 text-white rounded-xl shadow hover:bg-blue-500 transition m-5"
            onClick={() => navigate("/dashboard")}
          >
            Back to Dashboard
          </button>
        <div className="space-y-2">
          {herds.map((herd) => (
            <div
              key={herd.id}
              onClick={() => selectHerd(herd)}
              className={`p-2 rounded-xl cursor-pointer ${
                selectedHerd?.id === herd.id
                  ? "bg-blue-600"
                  : "hover:bg-gray-700"
              }`}
            >
              {herd.name}
            </div>
          ))}
        </div>

        <button
          onClick={createHerd}
          disabled={creatingHerd}
          className="mt-4 w-full bg-green-600 hover:bg-green-700 py-2 rounded-xl disabled:cursor-wait disabled:opacity-60"
        >
          {creatingHerd ? "Creating..." : "+ New Herd"}
        </button>
      </div>

      {/* Main */}
      <div className="flex-1 p-6">
        {!selectedHerd ? (
          <div className="text-gray-400">
            Select a herd to edit settings
          </div>
        ) : (
          <>
            <h2 className="text-xl font-semibold mb-6">
              Edit Herd
            </h2>

            <div className="space-y-4 max-w-lg">
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Herd Name
                </label>
                <input
                  value={name}
                  onFocus={(e) => {
                    if (e.target.value === "New Herd") setName("");
                  }}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Herd name"
                  className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2"
                  rows={4}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={saveHerd}
                  disabled={savingHerd}
                  className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded disabled:cursor-wait disabled:opacity-60"
                >
                  {savingHerd ? "Saving..." : "Save Changes"}
                </button>

                <button
                  onClick={deleteHerd}
                  disabled={deletingHerd}
                  className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded disabled:cursor-wait disabled:opacity-60"
                >
                  {deletingHerd ? "Deleting..." : "Delete Herd"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
      <ToastContainer autoClose="1000" />
    </div>
  );
}
