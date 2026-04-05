import React, { useState, useEffect } from "react";
import AnimalGeneralData from "../components/AnimalGeneralData";
import HealthRecords from "../components/HealthRecords";
import VetVisits from "../components/VetVisits";
import Reproductions from "../components/Reproductions";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  createAnimal,
  getAnimalsForHerd,
  getAnimalsUnassigned,
} from "../api/animal";
import { getHerdsForUser } from "../api/herd";
import * as vaccinationsAPI from "../api/vaccinations";
import * as vetVisitsAPI from "../api/vetVisits";
import { toast } from "react-toastify";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("general");
  const [dateTime, setDateTime] = useState("");
  const [selectedHerd, setSelectedHerd] = useState(null);
  const [herds, setHerds] = useState([]);
  const [animals, setAnimals] = useState([]);
  const [selectedAnimal, setSelectedAnimal] = useState(null);
  const [refreshFlag, setRefreshFlag] = useState(false);
  const [vaccinationsDue, setVaccinationsDue] = useState(0);
  const [vaccinationRefresh, setVaccinationRefresh] = useState(0);
  const [animalUrgencies, setAnimalUrgencies] = useState({});
  const [upcomingVetVisits, setUpcomingVetVisits] = useState(0);

  const handleAnimalsMenuClick = () => {
    setActiveTab("general");

    if (!animals.length) {
      setSelectedAnimal(null);
      toast.info("No animals yet. Add one to get started.");
      return;
    }

    setSelectedAnimal((current) => {
      if (current?.id) return current;
      return animals[0];
    });
  };

  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
    toast.success("Logged out!");
  };

  // Update clock every second
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

  // Load herds once on mount
  useEffect(() => {
    async function loadHerds() {
      try {
        const res = await getHerdsForUser();
        setHerds(res.data);

        // Default herd selection
        setSelectedHerd((prev) => {
          if (prev) return prev;
          return res.data.length > 0
            ? res.data[0]
            : { id: "unassigned", name: "Unassigned" };
        });
      } catch (err) {
        console.error(err);
        toast.error("Failed to load herds");
      }
    }

    loadHerds();
  }, []);

  // Load animals whenever herd changes or refreshFlag toggles
  useEffect(() => {
    async function loadAnimals() {
      if (!selectedHerd) return;

      try {
        let animalsData = [];
        if (selectedHerd.id === "unassigned") {
          const res = await getAnimalsUnassigned(); // always use dedicated unassigned endpoint
          animalsData = res.data;
        } else {
          const res = await getAnimalsForHerd(selectedHerd.id);
          animalsData = res.data;
        }
        setAnimals(animalsData);
      } catch (err) {
        console.error(err.response?.data || err.message);
        toast.error("Animals failed to load");
      }
    }

    loadAnimals();
  }, [selectedHerd, refreshFlag]);

  useEffect(() => {
    setSelectedAnimal("")
  }, [selectedHerd])

  // Fetch and calculate herd-wide vaccination dues and urgency per animal
  useEffect(() => {
    const computeHerdStatus = async () => {
      if (!animals || animals.length === 0) {
        setVaccinationsDue(0);
        setAnimalUrgencies({});
        setUpcomingVetVisits(0);
        return;
      }

      let herdDueCount = 0;
      let vetVisitsCount = 0;
      const urgencies = {};
      const now = new Date();
      const soonThreshold = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      await Promise.all(
        animals.map(async (animal) => {
          let hasOverdue = false;
          let hasSoon = false;

          // Check vaccinations
          try {
            const res = await vaccinationsAPI.getVaccinations(animal.id);
            const vaccinations = res.data || [];

            vaccinations.forEach((vac) => {
              if (vac.next_due_date) {
                const dueDate = new Date(vac.next_due_date);
                if (dueDate < now) {
                  hasOverdue = true;
                  herdDueCount += 1;
                } else if (dueDate <= soonThreshold) {
                  hasSoon = true;
                  herdDueCount += 1;
                }
              }
            });
          } catch (err) {
            console.error(`Error fetching vaccinations for animal ${animal.id}:`, err);
          }

          // Check vet visits
          try {
            const res = await vetVisitsAPI.getVetVisitsForAnimal(animal.id);
            const vetVisits = res.data || [];

            vetVisits.forEach((visit) => {
              const visitDate = new Date(visit.visit_date);
              const followUpDate = visit.follow_up_date ? new Date(visit.follow_up_date) : null;

              if (visitDate >= now && visitDate <= new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)) {
                vetVisitsCount += 1;
                if (visitDate <= soonThreshold) {
                  hasSoon = true;
                }
              }

              if (followUpDate && followUpDate >= now && followUpDate <= new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)) {
                vetVisitsCount += 1;
                if (followUpDate <= soonThreshold) {
                  hasSoon = true;
                }
              }
            });
          } catch (err) {
            console.error(`Error fetching vet visits for animal ${animal.id}:`, err);
          }

          urgencies[animal.id] = hasOverdue ? "red" : hasSoon ? "yellow" : "green";
        })
      );

      setAnimalUrgencies(urgencies);
      setVaccinationsDue(herdDueCount);
      setUpcomingVetVisits(vetVisitsCount);
    };

    computeHerdStatus();
  }, [animals, refreshFlag, vaccinationRefresh]);

  // Add new animal
  const handleAddAnimal = async () => {
    if (!selectedHerd) return;

    try {
      const filler = {
        herd_id: selectedHerd.id === "unassigned" ? null : selectedHerd.id,
        name: "NewAnimal",
        species: "Cow",
        sex: "Male",
        birthdate: "2009-10-29",
        age: 1,
        comments: "None",
        weight: "0.00",
        behavior: "None",
        tag_id: "0000",
      };

      await createAnimal(filler);
      toast.success("Created new animal!");
      setRefreshFlag((prev) => !prev);
    } catch (err) {
      console.error(err);
      toast.error("Failed to create new animal!");
    }
  };

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        setSelectedAnimal(null);
      }
    };

    window.addEventListener("keydown", handleEsc);

    return () => {
      window.removeEventListener("keydown", handleEsc);
    };
  }, []);


  return (
    <div className="flex flex-col md:flex-row max-h-screen bg-gray-900 text-gray-100">
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
            value={selectedHerd ? selectedHerd.id : ""}
            onChange={(e) => {
              const value = e.target.value;
              if (value === "unassigned") {
                setSelectedHerd({ id: "unassigned", name: "Unassigned" });
              } else {
                const herd = herds.find((h) => String(h.id) === value);
                setSelectedHerd(herd);
              }
            }}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-gray-100 outline-none cursor-pointer"
          >
            <option value="" disabled>
              Select Herd
            </option>
            <option value="unassigned">Unassigned Animals</option>
            {herds.map((herd) => (
              <option key={herd.id} value={String(herd.id)}>
                {herd.name}
              </option>
            ))}
          </select>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-3 overflow-y-auto">
          <button
            type="button"
            onClick={handleAnimalsMenuClick}
            className="w-full text-left px-4 py-3 rounded-xl bg-blue-600 text-white font-semibold shad transition border-2 border-blue-500 hover:bg-blue-500 cursor-pointer"
          >
            Animals
          </button>

          <div className="mt-4 space-y-2">
            {animals.map((animal) => {
              const urgency = animalUrgencies[animal.id] || "green";
              return (
                <button
                  key={animal.id}
                  onClick={() => setSelectedAnimal(animal)}
                  className={`w-full text-left px-4 py-2 rounded-lg transition border cursor-pointer ${
                    selectedAnimal?.id === animal.id
                      ? "bg-blue-600 border-blue-500 text-white shadow"
                      : "border-gray-600 hover:bg-gray-700 text-gray-200"
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    <span
                      className={`inline-block w-2 h-2 rounded-full ${
                        urgency === "red"
                          ? "bg-red-400"
                          : urgency === "yellow"
                          ? "bg-yellow-400"
                          : "bg-emerald-400"
                      }`}
                    ></span>
                    {animal.name}
                  </span>
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
      <main className="flex-1 p-6 md:p-8 overflow-y-scroll">
        {/* HEADER */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6">
          <div className="mb-4 sm:mb-0">
            <h2 className="text-2xl font-semibold">Welcome Back 👋</h2>
            <p className="text-gray-400">{dateTime}</p>
          </div>
          <div>
            <button
              className="px-5 py-2 bg-blue-600 text-white rounded-xl shadow hover:bg-blue-500 transition mr-3"
              onClick={() => navigate("/settings/herd")}
            >
              Herd Settings
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
            { title: "Vaccinations Due", value: vaccinationsDue },
            { title: "Upcoming Vet Visits", value: upcomingVetVisits },
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

        {/* ANIMAL DATA */}
        <div className="bg-gray-800 rounded-2xl shadow-md border border-gray-700 flex flex-col min-h-screen">
          {!selectedAnimal ? (
            <div className="flex flex-1 items-center justify-center text-gray-400 text-lg">
              No animal selected
            </div>
          ) : (
            <>
              {/* TABS */}
              <div className="border-b border-gray-700 flex flex-wrap">
                {["general", "health", "vet", "reproduction"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-3 text-sm font-medium transition rounded-t-2xl ${
                      activeTab === tab
                        ? "bg-blue-600 text-white shadow-inner"
                        : "text-gray-400 hover:bg-gray-700"
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
              <div className="p-4 sm:p-6 text-gray-300 overflow-auto">
                {activeTab === "general" && (
                  <AnimalGeneralData
                    animal={selectedAnimal}
                    setRefreshFlag={setRefreshFlag}
                    setSelectedAnimal={setSelectedAnimal}
                    setActiveTab={setActiveTab}
                    herds={herds}
                    selectedHerd={selectedHerd}
                  />
                )}
                {activeTab === "health" && <HealthRecords animal={selectedAnimal} onVaccinationUpdate={() => setVaccinationRefresh(prev => prev + 1)} />}
                {activeTab === "vet" && <VetVisits animal={selectedAnimal} onVetVisitUpdate={() => setVaccinationRefresh(prev => prev + 1)} />}
                {activeTab === "reproduction" && (
                  <Reproductions animal={selectedAnimal} />
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
