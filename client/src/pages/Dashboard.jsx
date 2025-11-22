import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import AnimalGeneralData from "../components/AnimalGeneralData"; // import the new component
import HealthRecords from "../components/HealthRecords";

export default function Dashboard() {
  const { logout } = useAuth();

  const [activeTab, setActiveTab] = useState("general");
  const [dateTime, setDateTime] = useState("");
  const [selectedHerd, setSelectedHerd] = useState("Default Herd");
  const herds = ["Default Herd", "North Pasture", "Goat Pen", "Show Herd"];

  // Live clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setDateTime(
        now.toLocaleString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex min-h-screen bg-gray-900 text-gray-100">
      {/* ---------------------- SIDEBAR ---------------------- */}
      <aside className="w-64 bg-gray-800 shadow-lg border-r border-gray-700 flex flex-col">
        <div className="px-6 py-6 border-b border-gray-700">
          <h1 className="text-2xl font-bold tracking-tight">
            <span className="text-blue-500">Barn</span>Buddy
          </h1>
          <p className="text-sm text-gray-400 mt-1">Dashboard</p>
        </div>

        {/* Herd Selector */}
        <div className="px-4 py-3 border-b border-gray-700">
          <select
            value={selectedHerd}
            onChange={(e) => setSelectedHerd(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-gray-100 outline-none cursor-pointer"
          >
            {herds.map((herd) => (
              <option key={herd} value={herd} className="bg-gray-800 text-gray-100">
                {herd}
              </option>
            ))}
          </select>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-3">
          <button className="w-full text-left px-4 py-3 rounded-xl bg-blue-600 text-white font-semibold shadow hover:bg-blue-500 transition border-2 border-blue-500">
            Animals
          </button>

          {/* Example placeholder animals */}
          <div className="mt-4 space-y-2">
            <button className="w-full text-left px-4 py-2 rounded-lg border border-gray-600 hover:bg-gray-700 transition">
              Bella
            </button>
            <button className="w-full text-left px-4 py-2 rounded-lg border border-gray-600 hover:bg-gray-700 transition">
              Duke
            </button>
            <button className="w-full text-left px-4 py-2 rounded-lg border border-gray-600 hover:bg-gray-700 transition">
              Spot
            </button>
          </div>
        </nav>
      </aside>

      {/* ---------------------- MAIN AREA ---------------------- */}
      <main className="flex-1 p-8">
        {/* ---------------------- HEADER ---------------------- */}
        <header className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-semibold">Welcome Back 👋</h2>
            <p className="text-gray-400">{dateTime}</p>
          </div>

          <button
            onClick={logout}
            className="px-5 py-2 bg-blue-600 text-white rounded-xl shadow hover:bg-blue-500 transition"
          >
            Logout
          </button>
        </header>

        {/* ---------------------- QUICK STATS ---------------------- */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
          <div className="bg-gray-800 shadow-md border border-gray-700 rounded-2xl p-6">
            <p className="text-gray-400 text-sm">Animals</p>
            <h3 className="text-3xl font-bold mt-2">12</h3>
          </div>

          <div className="bg-gray-800 shadow-md border border-gray-700 rounded-2xl p-6">
            <p className="text-gray-400 text-sm">Vaccinations Due</p>
            <h3 className="text-3xl font-bold mt-2">3</h3>
          </div>

          <div className="bg-gray-800 shadow-md border border-gray-700 rounded-2xl p-6">
            <p className="text-gray-400 text-sm">Upcoming Vet Visits</p>
            <h3 className="text-3xl font-bold mt-2">1</h3>
          </div>
        </section>

        {/* ---------------------- TABS ---------------------- */}
        <div className="bg-gray-800 rounded-2xl shadow-md border border-gray-700">
          <div className="border-b border-gray-700 flex">
            {["general", "health", "vet"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-4 text-sm font-medium transition rounded-t-2xl ${
                  activeTab === tab
                    ? "bg-blue-600 text-white shadow-inner"
                    : "text-gray-400 hover:bg-gray-700"
                }`}
              >
                {tab === "general" && "General Data"}
                {tab === "health" && "Health Records"}
                {tab === "vet" && "Vet Visits"}
              </button>
            ))}
          </div>

          {/* ---------------------- TAB CONTENT ---------------------- */}
          <div className="p-8 text-gray-300 min-h-[300px]">
            {activeTab === "general" && <AnimalGeneralData />}

            {activeTab === "health" && <HealthRecords />}

            {activeTab === "vet" && (
              <div>
                <h3 className="text-xl font-semibold mb-4">Vet Visits</h3>
                <p>Upcoming and past veterinary visits will be shown here.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
