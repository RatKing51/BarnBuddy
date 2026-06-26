import React, { useMemo, useState } from "react";
import { DashboardOverviewSkeleton } from "./LoadingSpinner";

const statusMeta = {
  red: {
    label: "Overdue",
    badge: "bg-red-500/15 text-red-200 ring-red-400/30",
    dot: "bg-red-400",
    row: "border-red-400/25 bg-red-500/5",
  },
  yellow: {
    label: "Due soon",
    badge: "bg-amber-400/15 text-amber-100 ring-amber-300/30",
    dot: "bg-amber-300",
    row: "border-amber-300/25 bg-amber-400/5",
  },
  green: {
    label: "Stable",
    badge: "bg-emerald-400/15 text-emerald-100 ring-emerald-300/30",
    dot: "bg-emerald-300",
    row: "border-gray-700 bg-gray-800/70",
  },
  deceased: {
    label: "Deceased",
    badge: "bg-gray-500/15 text-gray-200 ring-gray-400/30",
    dot: "bg-gray-400",
    row: "border-gray-600 bg-gray-800/40 opacity-80",
  },
  archived: {
    label: "Archived",
    badge: "bg-gray-500/15 text-gray-200 ring-gray-400/30",
    dot: "bg-gray-500",
    row: "border-gray-600 bg-gray-800/40 opacity-80",
  },
};

function isInactiveAnimalStatus(status) {
  return ["archived", "deceased"].includes(status);
}

function asNumber(value) {
  const number = Number.parseFloat(value);
  return Number.isFinite(number) ? number : null;
}

function formatWeight(value) {
  const weight = asNumber(value);
  if (weight === null || weight === 0) return "Not logged";
  return `${Math.round(weight).toLocaleString()} lb`;
}

function getAge(animal) {
  if (animal.birthdate) {
    const birthDate = new Date(animal.birthdate);
    if (!Number.isNaN(birthDate.getTime())) {
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      const dayDiff = today.getDate() - birthDate.getDate();
      if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) age -= 1;
      return Math.max(0, age);
    }
  }

  const age = Number.parseInt(animal.age, 10);
  return Number.isFinite(age) ? age : null;
}

function EmptyState({ title, copy }) {
  return (
    <div className="rounded-xl border border-dashed border-gray-700 bg-gray-900/60 p-6 text-center">
      <p className="font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm text-gray-400">{copy}</p>
    </div>
  );
}

function BarChart({ data, valueLabel = (value) => value }) {
  const max = Math.max(...data.map((item) => item.value), 1);

  return (
    <div className="space-y-4">
      {data.map((item) => {
        const width = Math.max(5, Math.round((item.value / max) * 100));
        return (
          <div key={item.label}>
            <div className="mb-2 flex items-center justify-between gap-3 text-sm">
              <span className="font-medium text-gray-200">{item.label}</span>
              <span className="text-gray-400">{valueLabel(item.value)}</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-gray-800">
              <div
                className="h-full rounded-full bg-blue-400 transition-all duration-500"
                style={{ width: `${width}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DonutChart({ redCount, yellowCount, stableCount, deceasedCount, archivedCount, totalAnimals }) {
  const redPct = totalAnimals ? (redCount / totalAnimals) * 100 : 0;
  const yellowPct = totalAnimals ? (yellowCount / totalAnimals) * 100 : 0;
  const stablePct = totalAnimals ? (stableCount / totalAnimals) * 100 : 0;
  const deceasedPct = totalAnimals ? (deceasedCount / totalAnimals) * 100 : 0;
  const background = totalAnimals
    ? `conic-gradient(#f87171 0 ${redPct}%, #fbbf24 ${redPct}% ${redPct + yellowPct}%, #34d399 ${redPct + yellowPct}% ${redPct + yellowPct + stablePct}%, #6b7280 ${redPct + yellowPct + stablePct}% ${redPct + yellowPct + stablePct + deceasedPct}%, #9ca3af ${redPct + yellowPct + stablePct + deceasedPct}% 100%)`
    : "conic-gradient(#374151 0 100%)";

  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:gap-5">
      <div
        className="grid h-32 w-32 shrink-0 place-items-center rounded-full sm:h-44 sm:w-44"
        style={{ background }}
        aria-label={`Status chart: ${redCount} overdue, ${yellowCount} due soon, ${stableCount} stable`}
      >
        <div className="grid h-20 w-20 place-items-center rounded-full bg-gray-900 text-center shadow-inner shadow-black/30 sm:h-28 sm:w-28">
          <div>
            <p className="text-2xl font-bold text-white sm:text-3xl">{totalAnimals}</p>
            <p className="text-[10px] uppercase tracking-[0.12em] text-gray-500 sm:text-xs sm:tracking-[0.18em]">Animals</p>
          </div>
        </div>
      </div>
      <div className="grid w-full gap-2 sm:gap-3">
        {[
          ["red", redCount],
          ["yellow", yellowCount],
          ["green", stableCount],
          ["deceased", deceasedCount],
          ["archived", archivedCount],
        ].map(([status, value]) => (
          <div key={status} className="flex items-center justify-between rounded-xl border border-gray-700 bg-gray-800 px-3 py-2.5 sm:px-4 sm:py-3">
            <span className="inline-flex items-center gap-2 text-sm font-medium text-gray-200">
              <span className={`h-2.5 w-2.5 rounded-full ${statusMeta[status].dot}`} />
              {statusMeta[status].label}
            </span>
            <span className="font-semibold text-white">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardOverview({
  animals = [],
  totalAnimals,
  totalActiveAnimals = totalAnimals,
  deceasedCount = 0,
  archivedCount = 0,
  vaccinationsDue,
  upcomingVetVisits,
  careDueCount,
  attentionAnimals = [],
  animalUrgencies = {},
  primaryAnimalIdentifier = "name",
  handleSelectAnimal,
  selectedHerd,
  isPremium = false,
  loading = false,
}) {
  const [tableFilter, setTableFilter] = useState("all");

  const analytics = useMemo(() => {
    const redCount = animals.filter((animal) => !isInactiveAnimalStatus(animal.status) && animalUrgencies[animal.id] === "red").length;
    const yellowCount = animals.filter((animal) => !isInactiveAnimalStatus(animal.status) && animalUrgencies[animal.id] === "yellow").length;
    const stableCount = Math.max(0, totalActiveAnimals - redCount - yellowCount);
    const stablePct = totalActiveAnimals ? Math.round((stableCount / totalActiveAnimals) * 100) : 0;

    const speciesCounts = animals.reduce((counts, animal) => {
      const species = animal.species || "Unknown";
      counts[species] = (counts[species] || 0) + 1;
      return counts;
    }, {});

    const speciesData = Object.entries(speciesCounts)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);

    const weights = animals.map((animal) => asNumber(animal.weight)).filter((weight) => weight && weight > 0);
    const averageWeight = weights.length
      ? Math.round(weights.reduce((sum, weight) => sum + weight, 0) / weights.length)
      : 0;

    const ageGroups = animals.reduce(
      (groups, animal) => {
        const age = getAge(animal);
        if (age === null) {
          groups.Unknown += 1;
        } else if (age < 1) {
          groups["Under 1"] += 1;
        } else if (age <= 3) {
          groups["1-3"] += 1;
        } else if (age <= 7) {
          groups["4-7"] += 1;
        } else {
          groups["8+"] += 1;
        }
        return groups;
      },
      { "Under 1": 0, "1-3": 0, "4-7": 0, "8+": 0, Unknown: 0 }
    );

    const ageData = Object.entries(ageGroups)
      .filter(([, value]) => value > 0)
      .map(([label, value]) => ({ label, value }));

    const tableRows = animals
      .map((animal) => {
        const status = isInactiveAnimalStatus(animal.status) ? animal.status : animalUrgencies[animal.id] || "green";
        return {
          ...animal,
          status,
          age: getAge(animal),
          weightLabel: formatWeight(animal.weight),
        };
      })
      .sort((a, b) => {
        const priority = { red: 0, yellow: 1, green: 2, deceased: 3, archived: 4 };
        return priority[a.status] - priority[b.status] || String(a.name || "").localeCompare(String(b.name || ""));
      });

    return {
      redCount,
      yellowCount,
      stableCount,
      stablePct,
      speciesData,
      averageWeight,
      ageData,
      tableRows,
    };
  }, [animalUrgencies, animals, totalActiveAnimals]);

  if (loading) return <DashboardOverviewSkeleton />;

  const filteredRows = analytics.tableRows.filter((animal) => tableFilter === "all" || animal.status === tableFilter);
  const visibleAttentionAnimals = attentionAnimals.length
    ? attentionAnimals
    : analytics.tableRows.filter((animal) => animal.status !== "green" && !isInactiveAnimalStatus(animal.status)).slice(0, 4);
  const getAnimalPrimaryLabel = (animal) => {
    if (primaryAnimalIdentifier === "tag") return animal.tag_id || animal.name || "Unnamed animal";
    return animal.name || animal.tag_id || "Unnamed animal";
  };
  const getAnimalSecondaryLabel = (animal) => {
    if (primaryAnimalIdentifier === "tag") return animal.name ? `Name ${animal.name}` : "Name not set";
    return animal.tag_id ? `Tag ${animal.tag_id}` : "Tag not set";
  };

  const kpis = [
    { label: "Total animals", value: totalAnimals, helper: selectedHerd?.name || "Current herd" },
    { label: "Stable rate", value: `${analytics.stablePct}%`, helper: `${analytics.stableCount} with no active flags` },
    { label: "Deceased", value: deceasedCount, helper: "Kept in records" },
    { label: "Archived", value: archivedCount, helper: "Sold or inactive" },
    { label: "Vaccine care", value: vaccinationsDue, helper: "Overdue or due soon" },
    { label: "Vet care", value: upcomingVetVisits, helper: "Upcoming visits and follow-ups" },
  ];

  return (
    <div className="space-y-3 bg-gray-950 p-3 sm:p-6 md:space-y-6">
      <section className="hidden md:block">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-blue-300">{selectedHerd?.name || "Herd"}</p>
            <h2 className="mt-1 text-2xl font-semibold text-white">Farm overview</h2>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
          {kpis.map((item) => (
            <div key={item.label} className="rounded-xl border border-gray-800 bg-gray-950 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.12em] text-gray-500">{item.label}</p>
              <p className="mt-2 text-2xl font-bold text-white">{item.value}</p>
              <p className="mt-1 truncate text-xs text-gray-400">{item.helper}</p>
            </div>
          ))}
        </div>
      </section>

      {!isPremium && (
        <section className="hidden rounded-2xl border border-amber-300/30 bg-amber-400/10 p-4 sm:p-5 md:block">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-200">Premium</p>
              <h3 className="mt-2 text-lg font-semibold text-white">Premium dashboard tools</h3>
              <p className="mt-2 max-w-3xl text-sm text-gray-300">
                Upgrade to unlock advanced exports, automatic reminders, and deeper herd planning views.
              </p>
            </div>
            <a
              href="/pricing"
              className="inline-flex items-center justify-center rounded-lg bg-amber-300 px-4 py-2 font-semibold text-gray-950 transition hover:bg-amber-200"
            >
              View Premium
            </a>
          </div>
        </section>
      )}

      <section className="grid grid-cols-1 gap-3 md:gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-3 sm:p-5">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">Care status</h3>
              <p className="hidden text-sm text-gray-400 sm:block">Overdue, upcoming, and stable animals in this herd.</p>
            </div>
            <span className="rounded-full bg-blue-500/15 px-3 py-1 text-sm font-semibold text-blue-100">
              {careDueCount} care items active
            </span>
          </div>
          <DonutChart
            redCount={analytics.redCount}
            yellowCount={analytics.yellowCount}
            stableCount={analytics.stableCount}
            deceasedCount={deceasedCount}
            archivedCount={archivedCount}
            totalAnimals={totalAnimals}
          />
        </div>

        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-3 sm:p-5">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-white">Priority queue</h3>
              <p className="text-sm text-gray-400">Click an animal to open its record.</p>
            </div>
          </div>

          <div className="space-y-3">
            {visibleAttentionAnimals.length > 0 ? (
              visibleAttentionAnimals.slice(0, 4).map((animal) => {
                const status = isInactiveAnimalStatus(animal.status) ? animal.status : animalUrgencies[animal.id] || "green";
                return (
                  <button
                    key={animal.id}
                    onClick={() => handleSelectAnimal(animal)}
                    className={`w-full rounded-xl border p-3 text-left transition hover:border-blue-400 hover:bg-gray-800 sm:p-4 ${statusMeta[status].row}`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-white">{getAnimalPrimaryLabel(animal)}</p>
                        <p className="mt-1 text-sm text-gray-400">
                          {animal.species || "Unknown species"} - {getAnimalSecondaryLabel(animal)}
                        </p>
                      </div>
                      <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${statusMeta[status].badge}`}>
                        {statusMeta[status].label}
                      </span>
                    </div>
                  </button>
                );
              })
            ) : (
              <EmptyState title="No active care flags" copy={totalAnimals ? "Everything in this herd looks current." : "Add animals to begin tracking care."} />
            )}
          </div>
        </div>
      </section>

      <section className="hidden grid-cols-1 gap-4 md:grid md:gap-6 xl:grid-cols-3">
        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-4 sm:p-5">
          <div className="mb-5">
            <h3 className="text-lg font-semibold text-white">Species mix</h3>
            <p className="text-sm text-gray-400">Distribution across the current herd.</p>
          </div>
          {analytics.speciesData.length ? (
            <BarChart data={analytics.speciesData} valueLabel={(value) => `${value} animals`} />
          ) : (
            <EmptyState title="No species data" copy="Species counts appear after animals are added." />
          )}
        </div>

        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-4 sm:p-5">
          <div className="mb-5">
            <h3 className="text-lg font-semibold text-white">Age profile</h3>
            <p className="text-sm text-gray-400">Age groups based on birth dates or saved age.</p>
          </div>
          {analytics.ageData.length ? (
            <BarChart data={analytics.ageData} valueLabel={(value) => `${value}`} />
          ) : (
            <EmptyState title="No age data" copy="Birth dates make this chart more useful." />
          )}
        </div>

        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-4 sm:p-5">
          <div className="mb-5">
            <h3 className="text-lg font-semibold text-white">Weight snapshot</h3>
            <p className="text-sm text-gray-400">Quick read on logged animal weights.</p>
          </div>
          <div className="rounded-xl border border-gray-800 bg-gray-950 p-5">
            <p className="text-xs uppercase tracking-[0.14em] text-gray-500">Average weight</p>
            <p className="mt-3 text-4xl font-bold text-white">
              {analytics.averageWeight ? `${analytics.averageWeight.toLocaleString()} lb` : "No data"}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-gray-900 p-3">
                <p className="text-xs text-gray-500">Logged</p>
                <p className="mt-1 font-semibold text-white">
                  {animals.filter((animal) => asNumber(animal.weight) > 0).length}
                </p>
              </div>
              <div className="rounded-lg bg-gray-900 p-3">
                <p className="text-xs text-gray-500">Missing</p>
                <p className="mt-1 font-semibold text-white">
                  {animals.filter((animal) => !asNumber(animal.weight) || asNumber(animal.weight) === 0).length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-800 bg-gray-900">
        <div className="flex flex-col gap-3 border-b border-gray-800 p-3 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">Animal roster</h3>
            <p className="hidden text-sm text-gray-400 sm:block">Readable records with status, species, tag, age, and weight.</p>
          </div>
          <div className="-mx-1 flex max-w-full gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
            {[
              ["all", "All"],
              ["red", "Overdue"],
              ["yellow", "Due soon"],
              ["green", "Stable"],
              ["deceased", "Deceased"],
              ["archived", "Archived"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setTableFilter(value)}
                className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold leading-none transition sm:rounded-lg ${
                  tableFilter === value
                    ? "bg-blue-500 text-white shadow-sm shadow-blue-950/30"
                    : "border border-gray-700 bg-gray-950 text-gray-300 hover:border-blue-400"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2 p-3 md:hidden">
          {filteredRows.length > 0 ? (
            filteredRows.map((animal) => (
              <button
                key={animal.id}
                type="button"
                onClick={() => handleSelectAnimal(animal)}
                className={`w-full rounded-xl border p-3 text-left transition ${statusMeta[animal.status].row}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-white">{getAnimalPrimaryLabel(animal)}</p>
                    <p className="mt-1 truncate text-sm text-gray-400">
                      {animal.species || "Unknown"} - {primaryAnimalIdentifier === "tag" ? animal.name || "Name not set" : animal.tag_id || "Tag not set"}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${statusMeta[animal.status].badge}`}>
                    {statusMeta[animal.status].label}
                  </span>
                </div>
                <div className="mt-2 flex min-w-0 gap-2 overflow-hidden text-xs">
                  <span className="rounded-lg bg-gray-950 px-2 py-1.5 text-gray-300">Age {animal.age === null ? "-" : animal.age}</span>
                  <span className="rounded-lg bg-gray-950 px-2 py-1.5 text-gray-300">{animal.weightLabel}</span>
                  <span className="min-w-0 truncate rounded-lg bg-gray-950 px-2 py-1.5 text-gray-300">{animal.behavior || "No behavior"}</span>
                </div>
              </button>
            ))
          ) : (
            <EmptyState title="No animals match this filter" copy="Try another status filter or add records to this herd." />
          )}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-gray-800 bg-gray-950 text-xs uppercase tracking-[0.12em] text-gray-500">
              <tr>
                <th className="px-5 py-3 font-semibold">{primaryAnimalIdentifier === "tag" ? "Tag ID" : "Animal"}</th>
                <th className="px-5 py-3 font-semibold">{primaryAnimalIdentifier === "tag" ? "Name" : "Tag"}</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Species</th>
                <th className="px-5 py-3 font-semibold">Age</th>
                <th className="px-5 py-3 font-semibold">Weight</th>
                <th className="px-5 py-3 font-semibold">Temperament</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filteredRows.length > 0 ? (
                filteredRows.map((animal) => (
                  <tr
                    key={animal.id}
                    onClick={() => handleSelectAnimal(animal)}
                    className="cursor-pointer transition hover:bg-gray-800/80"
                  >
                    <td className="px-5 py-4">
                      <p className="font-semibold text-white">{getAnimalPrimaryLabel(animal)}</p>
                    </td>
                    <td className="px-5 py-4 text-gray-300">
                      {primaryAnimalIdentifier === "tag" ? animal.name || "Not set" : animal.tag_id || "Not set"}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${statusMeta[animal.status].badge}`}>
                        <span className={`h-2 w-2 rounded-full ${statusMeta[animal.status].dot}`} />
                        {statusMeta[animal.status].label}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-gray-300">{animal.species || "Unknown"}</td>
                    <td className="px-5 py-4 text-gray-300">{animal.age === null ? "Not set" : animal.age}</td>
                    <td className="px-5 py-4 text-gray-300">{animal.weightLabel}</td>
                    <td className="px-5 py-4 text-gray-300">{animal.behavior || "Not logged"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="px-5 py-8">
                    <EmptyState title="No animals match this filter" copy="Try another status filter or add records to this herd." />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
