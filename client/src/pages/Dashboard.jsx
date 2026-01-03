import React, { useState, useEffect } from "react";
import AnimalGeneralData from "../components/AnimalGeneralData";
import HealthRecords from "../components/HealthRecords";
import VetVisits from "../components/VetVisits";
import Reproductions from "../components/Reproductions";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { getAnimalsForUser, createAnimal } from "../api/animal";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("general");
  const [dateTime, setDateTime] = useState("");
  const [selectedHerd, setSelectedHerd] = useState("");
  const [herds, setHerds] = useState([]);
  const [animals, setAnimals] = useState([]);
  const [newAnimalName, setNewAnimalName] = useState("NewAnimal");
  const [selectedAnimal, setSelectedAnimal] = useState("");

  const [refreshFlag, setRefreshFlag] = useState(false);

  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  }

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

  async function handleAddAnimal() {
    if (newAnimalName.trim() === "") return;
    setNewAnimalName("NewAnimal");

    try {
      const filler = {
        herd_id: null,
        name: "NewAnimal",
        species: "Cow",
        sex: "Male",
        birthdate: "2025-10-29",
        age: "0",
        comments: "None",
        weight: "0.00",
        behavior: "None",
        tag_id: "0000"
      };

      await createAnimal(filler)
      console.log("created animal");

      setAnimals(prev => [...prev, filler]);
      setSelectedAnimal(filler);
    } catch (err) {
      console.error(err);
    }

  }

  useEffect(() => {
    async function load() {
      try {
        const res = await getAnimalsForUser();
        setAnimals(res.data);
      } catch (err) {
        console.error(err.response?.data || err.message);
      }
    }

    load();
  }, [refreshFlag])

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-900 text-gray-100">
      {/* SIDEBAR */}
      <aside className="w-full md:w-64 bg-gray-800 shadow-lg border-b md:border-b-0 md:border-r border-gray-700 flex flex-col flex-shrink-0">
        <div className="px-6 py-6 border-b border-gray-700">
          <h1 className="text-2xl font-bold tracking-tight">
            <span className="text-blue-500">Barn</span>Buddy
          </h1>
          <p className="text-sm text-gray-400 mt-1">Dashboard</p>
        </div>

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

        <nav className="flex-1 px-4 py-6 space-y-3 overflow-y-auto">
          <button className="w-full text-left px-4 py-3 rounded-xl bg-blue-600 text-white font-semibold shadow hover:bg-blue-500 transition border-2 border-blue-500">
            Animals
          </button>

          <div className="mt-4 space-y-2">
            {animals.map((animal) => {
              const isSelected = selectedAnimal?.id === animal.id
              
              return(
                <button
                  key={animal.id}
                  onClick={() => setSelectedAnimal(animal)}
                  className={`w-full text-left px-4 py-2 rounded-lg transition border
                    ${
                      isSelected
                        ? "bg-blue-600 border-blue-500 text-white shadow"
                        : "border-gray-600 hover:bg-gray-700 text-gray-200"
                      }
                    `}
                >
                  {animal.name}
                </button>
              );
            })}
          </div>
          <div className="mt-4 flex flex-col gap-2 px-4">
            <button
              onClick={handleAddAnimal}
              className="w-full px-3 py-2 bg-blue-600 rounded-lg text-white font-semibold hover:bg-blue-500"
            >
              Add
            </button>
          </div>
        </nav>
      </aside>

      {/* MAIN AREA */}
      <main className="flex-1 p-6 md:p-8 overflow-auto">
        {/* HEADER */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6">
          <div className="mb-4 sm:mb-0">
            <h2 className="text-2xl font-semibold">Welcome Back 👋</h2>
            <p className="text-gray-400">{dateTime}</p>
          </div>
          <div>
            <button
            className="px-5 py-2 bg-blue-600 text-white rounded-xl shadow hover:bg-blue-500 transition mr-3"
            
          >
            Settings
          </button>
          <button
            className="px-5 py-2 bg-blue-600 text-white rounded-xl shadow hover:bg-blue-500 transition"
            onClick={handleLogout}
          >
            Logout
          </button>
          </div>
        </header>

        {/* QUICK STATS */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {[
            { title: "Animals", value: animals.length },
            { title: "Vaccinations Due", value: null },
            { title: "Upcoming Vet Visits", value: null },
          ].map((stat) => (
            <div
              key={stat.title}
              className="bg-gray-800 shadow-md border border-gray-700 rounded-2xl p-4 sm:p-6 flex flex-col items-start"
            >
              <p className="text-gray-400 text-sm">{stat.title}</p>
              <h3 className="text-2xl sm:text-3xl font-bold mt-1">{stat.value}</h3>
            </div>
          ))}
        </section>

        {/* TABS */}
        <div className="bg-gray-800 rounded-2xl shadow-md border border-gray-700 flex flex-col">
          <div className="border-b border-gray-700 flex flex-wrap">
            {["general", "health", "vet", "reproduction"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3 text-sm font-medium transition rounded-t-2xl ${
                  activeTab === tab ? "bg-blue-600 text-white shadow-inner" : "text-gray-400 hover:bg-gray-700"
                }`}
              >
                {tab === "general" && "General Data"}
                {tab === "health" && "Health Records"}
                {tab === "vet" && "Vet Visits"}
                {tab === "reproduction" && "Reproduction"}
              </button>
            ))}
          </div>

          {/* TAB CONTENT */}
          <div className="p-4 sm:p-6 text-gray-300 min-h-[400px] overflow-auto">
            {activeTab === "general" && <AnimalGeneralData animal={selectedAnimal} setRefreshFlag={setRefreshFlag} />}
            {activeTab === "health" && <HealthRecords animal={selectedAnimal} />}
            {activeTab === "vet" && <VetVisits animal={selectedAnimal} />}
            {activeTab === "reproduction" && <Reproductions animal={selectedAnimal} />}
          </div>
        </div>
      </main>
    </div>
  );
}
