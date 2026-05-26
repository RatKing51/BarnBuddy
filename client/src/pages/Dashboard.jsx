import React, { useState, useEffect } from "react";
import AnimalGeneralData from "../components/AnimalGeneralData";
import DashboardOverview from "../components/DashboardOverview";
import HealthRecords from "../components/HealthRecords";
import VetVisits from "../components/VetVisits";
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
import { UserButton, useUser } from "@clerk/clerk-react";
import { LoadingPanel, LoadingSpinner } from "../components/LoadingSpinner";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("general");
  const [dateTime, setDateTime] = useState("");
  const [selectedHerd, setSelectedHerd] = useState(null);
  const [herds, setHerds] = useState([]);
  const [animals, setAnimals] = useState([]);
  const [hasUnassignedAnimals, setHasUnassignedAnimals] = useState(false);
  const [selectedAnimal, setSelectedAnimal] = useState(null);
  const [refreshFlag, setRefreshFlag] = useState(false);
  const [vaccinationsDue, setVaccinationsDue] = useState(0);
  const [vaccinationsDueSoon, setVaccinationsDueSoon] = useState(0);
  const [vaccinationRefresh, setVaccinationRefresh] = useState(0);
  const [animalUrgencies, setAnimalUrgencies] = useState({});
  const [upcomingVetVisits, setUpcomingVetVisits] = useState(0);
  const [loadingHerds, setLoadingHerds] = useState(true);
  const [loadingAnimals, setLoadingAnimals] = useState(false);
  const [addingAnimal, setAddingAnimal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

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
  const { user } = useUser();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await logout();
      navigate("/");
      toast.success("Logged out!");
    } finally {
      setLoggingOut(false);
    }
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
        setLoadingHerds(true);
        const [herdsRes, unassignedRes] = await Promise.all([
          getHerdsForUser(),
          getAnimalsUnassigned(),
        ]);
        const loadedHerds = herdsRes.data || [];
        const unassignedAnimals = unassignedRes.data || [];
        setHerds(loadedHerds);
        setHasUnassignedAnimals(unassignedAnimals.length > 0);

        // Default herd selection
        setSelectedHerd((prev) => {
          if (prev) {
            if (prev.id === "unassigned" && unassignedAnimals.length === 0 && loadedHerds.length > 0) {
              return loadedHerds[0];
            }
            return prev;
          }

          if (loadedHerds.length > 0) return loadedHerds[0];
          if (unassignedAnimals.length > 0) return { id: "unassigned", name: "Unassigned" };
          return null;
        });
      } catch (err) {
        console.error(err);
        toast.error("Failed to load herds");
      } finally {
        setLoadingHerds(false);
      }
    }

    loadHerds();
  }, []);

  // Load animals whenever herd changes or refreshFlag toggles
  useEffect(() => {
    async function loadAnimals() {
      if (!selectedHerd) return;

      try {
        setLoadingAnimals(true);
        let animalsData = [];
        if (selectedHerd.id === "unassigned") {
          const res = await getAnimalsUnassigned(); // always use dedicated unassigned endpoint
          animalsData = res.data;
          setHasUnassignedAnimals(animalsData.length > 0);

          if (animalsData.length === 0 && herds.length > 0) {
            setSelectedHerd(herds[0]);
            return;
          }
        } else {
          const res = await getAnimalsForHerd(selectedHerd.id);
          animalsData = res.data;
        }
        setAnimals(animalsData);
      } catch (err) {
        console.error(err.response?.data || err.message);
        toast.error("Animals failed to load");
      } finally {
        setLoadingAnimals(false);
      }
    }

    loadAnimals();
  }, [selectedHerd, refreshFlag, herds]);

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
      let herdDueSoonCount = 0;
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
                  herdDueSoonCount += 1;
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
              const visitDone = visit.completed || visit.visit_completed;
              const followUpDone = visit.completed || visit.follow_up_completed;
              const isVisitOverdue = visitDate < now && !visitDone;
              const isFollowUpOverdue = followUpDate && followUpDate < now && !followUpDone;

              if (isVisitOverdue || isFollowUpOverdue) {
                hasOverdue = true;
              }

              if (!visitDone && visitDate >= now && visitDate <= new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)) {
                vetVisitsCount += 1;
                if (visitDate <= soonThreshold) {
                  hasSoon = true;
                }
              }

              if (!followUpDone && followUpDate && followUpDate >= now && followUpDate <= new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)) {
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
      setVaccinationsDueSoon(herdDueSoonCount);
      setUpcomingVetVisits(vetVisitsCount);
    };

    computeHerdStatus();
  }, [animals, refreshFlag, vaccinationRefresh]);

  const urgencyCounts = Object.values(animalUrgencies).reduce(
    (totals, status) => {
      totals[status] = (totals[status] || 0) + 1;
      return totals;
    },
    { red: 0, yellow: 0, green: 0 }
  );

  const totalHerds = herds.length;
  const totalAnimals = animals.length;
  const careDueCount = vaccinationsDueSoon + upcomingVetVisits;
  const attentionAnimals = animals
    .filter((animal) => animalUrgencies[animal.id] !== "green")
    .sort((a, b) => {
      const priority = { red: 0, yellow: 1, green: 2 };
      return (
        priority[animalUrgencies[a.id] || "green"] -
        priority[animalUrgencies[b.id] || "green"]
      );
    })
    .slice(0, 3);
  const issueCount = attentionAnimals.length;
  const animalsStable = totalAnimals - issueCount;

  // Add new animal
  const handleAddAnimal = async () => {
    if (!selectedHerd) return;

    try {
      setAddingAnimal(true);
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
    } finally {
      setAddingAnimal(false);
    }
  };

  const handleSelectAnimal = (animal) => {
    setSelectedAnimal((current) =>
      current?.id === animal.id ? null : animal
    );
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
          <button
            type="button"
            onClick={() => navigate("/")}
            className="text-left text-2xl font-bold tracking-tight cursor-pointer hover:opacity-85 transition"
            aria-label="Go to BarnBuddy home"
          >
            <span className="text-blue-500">Barn</span>Buddy
          </button>
          <p className="text-sm text-gray-400 mt-1">Dashboard</p>
        </div>

        <div className="px-4 py-3 border-b border-gray-700">
          <select
            value={selectedHerd ? selectedHerd.id : ""}
            disabled={loadingHerds}
            onChange={(e) => {
              const value = e.target.value;
              if (value === "unassigned") {
                setSelectedHerd({ id: "unassigned", name: "Unassigned" });
              } else {
                const herd = herds.find((h) => String(h.id) === value);
                setSelectedHerd(herd);
              }
            }}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-gray-100 outline-none cursor-pointer disabled:cursor-wait disabled:opacity-70"
          >
            <option value="" disabled>
              {loadingHerds ? "Loading herds..." : "Select Herd"}
            </option>
            {hasUnassignedAnimals && (
              <option value="unassigned">Unassigned Animals</option>
            )}
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
            {loadingAnimals ? (
              <div className="px-4 py-3">
                <LoadingSpinner label="Loading animals..." />
              </div>
            ) : animals.map((animal) => {
              const urgency = animalUrgencies[animal.id] || "green";
              return (
                <button
                  key={animal.id}
                  onClick={() => handleSelectAnimal(animal)}
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
              disabled={!selectedHerd || addingAnimal}
              className="w-full px-3 py-2 bg-blue-600 rounded-lg text-white font-semibold hover:bg-blue-500 disabled:cursor-wait disabled:opacity-70"
            >
              {addingAnimal ? "Adding..." : "Add"}
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
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm font-semibold text-gray-100">
                {user?.firstName || user?.primaryEmailAddress?.emailAddress || "Profile"}
              </span>
              <span className="text-xs text-gray-400">Farm account</span>
            </div>
            <div className="rounded-full border border-gray-700 bg-gray-800 p-1">
              <UserButton afterSignOutUrl="/" />
            </div>
            <button
              className="px-5 py-2 bg-blue-600 text-white rounded-xl shadow hover:bg-blue-500 transition"
              onClick={() => navigate("/settings/account")}
            >
              Settings
            </button>
            <button
              className="px-5 py-2 bg-blue-600 text-white rounded-xl shadow hover:bg-blue-500 transition disabled:cursor-wait disabled:opacity-70"
              onClick={handleLogout}
              disabled={loggingOut}
            >
              {loggingOut ? "Logging out..." : "Logout"}
            </button>
          </div>
        </header>

        {/* QUICK STATS */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {[
            { title: "Animals", value: animals.length },
            { title: "Vaccine Care", value: vaccinationsDue },
            { title: "Vet Care Upcoming", value: upcomingVetVisits },
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
            loadingHerds || loadingAnimals ? (
              <div className="p-6">
                <LoadingPanel label={loadingHerds ? "Loading your herds..." : "Loading animals..."} />
              </div>
            ) : (
            <DashboardOverview
              totalAnimals={totalAnimals}
              vaccinationsDue={vaccinationsDue}
              upcomingVetVisits={upcomingVetVisits}
              careDueCount={careDueCount}
              attentionAnimals={attentionAnimals}
              issueCount={issueCount}
              animalsStable={animalsStable}
              animalUrgencies={animalUrgencies}
              handleSelectAnimal={handleSelectAnimal}
            />
            )
          ) : (
            <>
              {/* TABS */}
              <div className="border-b border-gray-700 flex flex-wrap">
                {["general", "health", "vet"].map((tab) => (
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
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
