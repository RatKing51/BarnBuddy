import React from "react";

export default function DashboardOverview({
  totalAnimals,
  vaccinationsDue,
  upcomingVetVisits,
  careDueCount,
  attentionAnimals,
  issueCount,
  animalsStable,
  animalUrgencies,
  handleSelectAnimal,
}) {
  const redCount = Object.values(animalUrgencies).filter((status) => status === "red").length;
  const yellowCount = Object.values(animalUrgencies).filter((status) => status === "yellow").length;
  const greenCount = totalAnimals - redCount - yellowCount;
  const redPct = totalAnimals ? Math.round((redCount / totalAnimals) * 100) : 0;
  const yellowPct = totalAnimals ? Math.round((yellowCount / totalAnimals) * 100) : 0;
  const greenPct = totalAnimals ? Math.max(0, 100 - redPct - yellowPct) : 0;
  const urgentCount = redCount;
  const dueSoonCount = yellowCount;

  return (
    <div className="p-6 space-y-6">
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-3xl border border-gray-700 bg-gray-900 p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.3em] text-blue-400 font-semibold">Top care priorities</p>
            <span className="text-xs text-gray-500">Tap to open</span>
          </div>
          <div className="mt-5 space-y-3">
            {attentionAnimals.length > 0 ? (
              attentionAnimals.map((animal) => {
                const urgency = animalUrgencies[animal.id] || "green";
                return (
                  <button
                    key={animal.id}
                    onClick={() => handleSelectAnimal(animal)}
                    className="w-full text-left rounded-3xl bg-gray-800 p-4 border border-gray-700 hover:bg-gray-700 transition flex items-center justify-between gap-4"
                  >
                    <div>
                      <p className="font-semibold text-white">{animal.name}</p>
                      <p className="text-sm text-gray-400">{urgency === "red" ? "Overdue care" : "Due soon"}</p>
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                        urgency === "red"
                          ? "bg-red-500 text-white"
                          : "bg-yellow-400 text-gray-900"
                      }`}
                    >
                      {urgency === "red" ? "Fix now" : "Watch"}
                    </span>
                  </button>
                );
              })
            ) : (
              <div className="rounded-3xl bg-gray-800 p-4 border border-gray-700 text-gray-400">
                No animals currently needing urgent attention.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-gray-700 bg-gray-900 p-5 xl:col-span-2">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.3em] text-blue-400 font-semibold">Immediate herd signal</p>
            <span className="text-xs text-gray-500">Focus on next steps</span>
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <button
              className="rounded-3xl bg-gray-800 border border-gray-700 p-5 hover:bg-gray-700 transition text-left"
              type="button"
            >
              <p className="text-xs uppercase tracking-[0.3em] text-red-400 font-semibold">Urgent</p>
              <p className="text-4xl font-bold text-white mt-4">{urgentCount}</p>
              <p className="text-sm text-gray-400 mt-2">Animals overdue for care first.</p>
            </button>
            <button
              className="rounded-3xl bg-gray-800 border border-gray-700 p-5 hover:bg-gray-700 transition text-left"
              type="button"
            >
              <p className="text-xs uppercase tracking-[0.3em] text-teal-400 font-semibold">Care due</p>
              <p className="text-4xl font-bold text-white mt-4">{careDueCount}</p>
              <p className="text-sm text-gray-400 mt-2">Upcoming vaccines and vet visits, excluding overdue urgent cases.</p>
            </button>
          </div>

          <div className="mt-6 rounded-3xl bg-gray-800 border border-gray-700 p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.3em] text-blue-400 font-semibold">Herd risk</p>
              <span className="text-xs text-gray-500">Stable share</span>
            </div>
            <div className="mt-5 grid gap-4 lg:grid-cols-[auto_1fr] items-center">
              <div className="relative w-36 h-36">
                <svg viewBox="0 0 36 36" className="w-full h-full">
                  <circle cx="18" cy="18" r="15.9155" className="fill-transparent stroke-gray-700 stroke-3" />
                  <circle
                    cx="18"
                    cy="18"
                    r="15.9155"
                    className="fill-transparent stroke-red-500 stroke-3"
                    strokeDasharray={`${redPct} ${100 - redPct}`}
                    strokeDashoffset="25"
                    transform="rotate(-90 18 18)"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    r="15.9155"
                    className="fill-transparent stroke-yellow-400 stroke-3"
                    strokeDasharray={`${yellowPct} ${100 - yellowPct}`}
                    strokeDashoffset={`${25 - redPct}`}
                    transform="rotate(-90 18 18)"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    r="15.9155"
                    className="fill-transparent stroke-emerald-400 stroke-3"
                    strokeDasharray={`${greenPct} ${100 - greenPct}`}
                    strokeDashoffset={`${25 - redPct - yellowPct}`}
                    transform="rotate(-90 18 18)"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <p className="text-xs uppercase tracking-[0.3em] text-gray-400">Stable</p>
                  <p className="text-2xl font-semibold text-white">{greenPct}%</p>
                  <p className="text-xs text-gray-400 mt-1">{greenCount} of {totalAnimals}</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="rounded-2xl bg-gray-900 p-4 border border-gray-700 flex items-center gap-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                  <div>
                    <p className="text-sm font-semibold text-white">Stable</p>
                    <p className="text-xs text-gray-400">{greenPct}% of herd</p>
                  </div>
                </div>
                <div className="rounded-2xl bg-gray-900 p-4 border border-gray-700 flex items-center gap-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
                  <div>
                    <p className="text-sm font-semibold text-white">Due soon</p>
                    <p className="text-xs text-gray-400">{yellowPct}% of herd</p>
                  </div>
                </div>
                <div className="rounded-2xl bg-gray-900 p-4 border border-gray-700 flex items-center gap-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                  <div>
                    <p className="text-sm font-semibold text-white">Overdue</p>
                    <p className="text-xs text-gray-400">{redPct}% of herd</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-gray-700 bg-gray-900 p-6 hover:border-blue-400 transition">
          <p className="text-xs uppercase tracking-[0.3em] text-blue-400 font-semibold">Action summary</p>
          <div className="mt-5 space-y-4 text-gray-200">
            <div className="rounded-2xl bg-gray-800 p-4 border border-gray-700">
              <p className="font-semibold text-white">High priority animals</p>
              <p className="text-sm text-gray-400 mt-1">Tap any animal above to jump into its record.</p>
            </div>
            <div className="rounded-2xl bg-gray-800 p-4 border border-gray-700">
              <p className="font-semibold text-white">Clear detail view</p>
              <p className="text-sm text-gray-400 mt-1">Click the selected animal again to deselect.</p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-700 bg-gray-900 p-6 hover:border-blue-400 transition">
          <p className="text-xs uppercase tracking-[0.3em] text-blue-400 font-semibold">Quick notes</p>
          <div className="mt-5 space-y-3 text-gray-200">
            <div className="rounded-2xl bg-gray-800 p-4 border border-gray-700">
              <p>Use the side list to center on busy animals.</p>
            </div>
            <div className="rounded-2xl bg-gray-800 p-4 border border-gray-700">
              <p>Press Escape to clear selection and return to this overview.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
