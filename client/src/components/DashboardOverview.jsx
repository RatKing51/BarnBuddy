import React from "react";

export default function DashboardOverview({
  totalAnimals,
  vaccinationsDue,
  upcomingVetVisits,
  careDueCount,
  attentionAnimals,
  animalUrgencies,
  handleSelectAnimal,
}) {
  const redCount = Object.values(animalUrgencies).filter((status) => status === "red").length;
  const yellowCount = Object.values(animalUrgencies).filter((status) => status === "yellow").length;
  const stableCount = Math.max(0, totalAnimals - redCount - yellowCount);
  const stablePct = totalAnimals ? Math.round((stableCount / totalAnimals) * 100) : 0;
  const hasAnimals = totalAnimals > 0;

  const statusCards = [
    {
      title: "Needs attention",
      value: redCount,
      tone: "red",
      copy: "Animals with overdue vaccine care, vet visits, or follow-ups.",
    },
    {
      title: "Care due soon",
      value: careDueCount,
      tone: "amber",
      copy: "Upcoming vaccine dates plus vet visits and follow-ups in the next window.",
    },
    {
      title: "Stable",
      value: stableCount,
      tone: "green",
      copy: "Animals with no overdue or soon care flags right now.",
    },
  ];

  const toneStyles = {
    amber: {
      card: "border-amber-400/20 bg-amber-400/10",
      dot: "bg-amber-300",
      text: "text-amber-100",
      button: "bg-amber-400 text-gray-950",
    },
    green: {
      card: "border-emerald-400/20 bg-emerald-400/10",
      dot: "bg-emerald-300",
      text: "text-emerald-100",
      button: "bg-emerald-400 text-gray-950",
    },
    red: {
      card: "border-red-400/20 bg-red-400/10",
      dot: "bg-red-300",
      text: "text-red-100",
      button: "bg-red-500 text-white",
    },
  };

  return (
    <div className="p-5 sm:p-6 space-y-6">
      <section className="rounded-3xl border border-gray-700 bg-gray-900 p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-400">Herd overview</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">What needs work today?</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-400">
              Red means something is overdue. Yellow means care is coming up soon. Green means there is nothing urgent in the current records.
            </p>
          </div>
          <div className="rounded-2xl border border-gray-700 bg-gray-800 px-5 py-4">
            <p className="text-xs uppercase tracking-[0.18em] text-gray-500">Stable share</p>
            <p className="mt-1 text-3xl font-bold text-white">{stablePct}%</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {statusCards.map((card) => {
            const styles = toneStyles[card.tone];
            return (
              <div key={card.title} className={`rounded-2xl border p-5 ${styles.card}`}>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className={`text-sm font-semibold ${styles.text}`}>{card.title}</p>
                    <p className="mt-2 text-4xl font-bold text-white">{card.value}</p>
                  </div>
                  <span className={`h-4 w-4 rounded-full ${styles.dot}`} />
                </div>
                <p className="mt-4 text-sm leading-relaxed text-gray-300">{card.copy}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(280px,420px)_1fr]">
        <div className="rounded-3xl border border-gray-700 bg-gray-900 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-400">Next animals</p>
              <h3 className="mt-2 text-xl font-semibold text-white">Open these first</h3>
            </div>
            <span className="text-xs text-gray-500">Tap to edit</span>
          </div>

          <div className="mt-5 space-y-3">
            {attentionAnimals.length > 0 ? (
              attentionAnimals.map((animal) => {
                const urgency = animalUrgencies[animal.id] || "green";
                const urgent = urgency === "red";
                return (
                  <button
                    key={animal.id}
                    onClick={() => handleSelectAnimal(animal)}
                    className="w-full rounded-2xl border border-gray-700 bg-gray-800 p-4 text-left transition hover:border-blue-400 hover:bg-gray-700"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-semibold text-white">{animal.name}</p>
                        <p className="mt-1 text-sm text-gray-400">
                          {urgent ? "Overdue care needs review" : "Care due soon"}
                        </p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${urgent ? toneStyles.red.button : toneStyles.amber.button}`}>
                        {urgent ? "Overdue" : "Soon"}
                      </span>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="rounded-2xl border border-gray-700 bg-gray-800 p-5 text-gray-300">
                {hasAnimals ? "Nothing needs attention right now." : "Add an animal to start seeing care priorities."}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-gray-700 bg-gray-900 p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-400">Care breakdown</p>
          <h3 className="mt-2 text-xl font-semibold text-white">What the numbers include</h3>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-gray-700 bg-gray-800 p-5">
              <p className="text-sm font-semibold text-white">Vaccine care</p>
              <p className="mt-3 text-3xl font-bold text-white">{vaccinationsDue}</p>
              <p className="mt-2 text-sm leading-relaxed text-gray-400">
                Vaccinations that are overdue or due soon based on each animal's health records.
              </p>
            </div>

            <div className="rounded-2xl border border-gray-700 bg-gray-800 p-5">
              <p className="text-sm font-semibold text-white">Vet care</p>
              <p className="mt-3 text-3xl font-bold text-white">{upcomingVetVisits}</p>
              <p className="mt-2 text-sm leading-relaxed text-gray-400">
                Upcoming vet appointments and follow-ups that are not marked done.
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-gray-700 bg-gray-800 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-white">Recommended workflow</p>
                <p className="mt-1 text-sm text-gray-400">
                  Open red animals first, mark completed vet tasks done, then review yellow animals.
                </p>
              </div>
              <span className="rounded-full bg-blue-500/15 px-3 py-1 text-sm font-semibold text-blue-100">
                {totalAnimals} animals
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
