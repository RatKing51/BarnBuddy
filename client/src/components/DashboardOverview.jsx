import { Link } from "react-router";
import { DashboardOverviewSkeleton } from "./LoadingSpinner";
import { animalStatusLabels, getAnimalCareStatus, getAnimalIdentifiers } from "../utils/animalCare";
import { getAgeYears } from "../utils/age";

function RecordCounts({ counts }) {
  return (
    <dl className="bb-record-counts">
      {Object.entries(counts).map(([label, count]) => (
        <div key={label}><dt>{label}</dt><dd>{count}</dd></div>
      ))}
    </dl>
  );
}

function HerdSummary({ animals }) {
  const species = Object.create(null);
  const ages = { "Under 1 year": 0, "1–3 years": 0, "4–7 years": 0, "8+ years": 0, Unknown: 0 };
  const weights = [];
  animals.forEach(animal => {
    const name = animal.species || "Unknown";
    species[name] = (species[name] || 0) + 1;
    const recordedAge = Number.parseInt(animal.age, 10);
    const age = getAgeYears(animal.birthdate) ?? recordedAge;
    const range = !Number.isFinite(age) ? "Unknown" : age < 1 ? "Under 1 year" : age < 4 ? "1–3 years" : age < 8 ? "4–7 years" : "8+ years";
    ages[range] += 1;
    if (Number(animal.weight) > 0) weights.push(Number(animal.weight) / (animal.weight_unit === "kg" ? 0.45359237 : 1));
  });
  const averageWeight = weights.length && Math.round(weights.reduce((sum, weight) => sum + weight, 0) / weights.length);

  return (
    <section aria-label="Herd breakdown" className="bb-herd-breakdown">
      <div className="bb-record-panel bb-panel-inset"><h2>Species mix</h2><RecordCounts counts={species} /></div>
      <div className="bb-record-panel bb-panel-inset"><h2>Age profile</h2><RecordCounts counts={ages} /></div>
      <div className="bb-record-panel bb-panel-inset">
        <h2>Weight snapshot</h2>
        <RecordCounts counts={{ "Average weight": averageWeight ? `${averageWeight.toLocaleString()} lb` : "—", Logged: weights.length, Missing: animals.length - weights.length }} />
      </div>
    </section>
  );
}

function CareStatus({ animals, urgencies }) {
  const counts = { red: 0, yellow: 0, green: 0, deceased: 0, archived: 0 };
  animals.forEach(animal => { counts[getAnimalCareStatus(animal, urgencies)] += 1; });
  let current = 0;
  const stops = Object.entries(counts).map(([status, count]) => {
    const start = current;
    current += count;
    return `var(--care-${status}) ${start / animals.length * 100}% ${current / animals.length * 100}%`;
  });

  return (
    <section className="bb-record-panel bb-panel-inset">
      <h2>Care status</h2>
      <div className="bb-care-chart">
        <div className="bb-care-ring" aria-hidden="true" style={{ background: `conic-gradient(${stops.join(", ")})` }}>
          <div><strong>{animals.length}</strong><span>Animals</span></div>
        </div>
        <dl className="bb-record-counts bb-care-counts">
          {Object.entries(counts).map(([status, count]) => (
            <div key={status}><dt><span className="bb-care-dot" data-status={status} />{animalStatusLabels[status]}</dt><dd>{count}</dd></div>
          ))}
        </dl>
      </div>
    </section>
  );
}

export default function DashboardOverview({
  animals, loading, error, careState, attentionAnimals, urgencies, animalCare,
  primaryIdentifier, profilePath, directoryPath, returnTo,
}) {
  if (loading) return <DashboardOverviewSkeleton />;

  return (
    <div id="herd-snapshot">
      <div className="bb-overview-grid">
        {!!animals.length && careState === "ready" && <CareStatus animals={animals} urgencies={urgencies} />}
        <section id="herd-care" aria-labelledby="attention-heading" className="bb-record-panel bb-panel-inset" data-tour="herd-attention">
          <div className="bb-panel-heading">
            <h2 id="attention-heading">Needs attention</h2>
            <Link className="bb-text-link" to={directoryPath}>View animals <span aria-hidden="true">→</span></Link>
          </div>
          {error && <p role="status" className="bb-work-muted">Animal records couldn’t load. Refresh to try again.</p>}
          {!error && !animals.length && <p className="bb-work-muted">Use Add animal to start tracking care for this herd.</p>}
          {!!animals.length && careState === "loading" && <p role="status" className="bb-work-muted">Checking care records…</p>}
          {!!animals.length && careState === "error" && <p role="status" className="bb-work-muted">Care records couldn’t load. Refresh to try again.</p>}
          {!!animals.length && careState === "ready" && (attentionAnimals.length ? (
            <ul className="bb-attention-list">
              {attentionAnimals.map(animal => {
                const { primary, secondary } = getAnimalIdentifiers(animal, primaryIdentifier);
                const care = animalCare[animal.id] || {};
                const record = care.vaccinations && !care.vet ? "health" : care.vet && !care.vaccinations ? "vet" : "general";
                const reason = [care.vaccinations && "Vaccination", care.vet && "Vet care"].filter(Boolean).join(" · ");
                return (
                  <li key={animal.id} data-status={urgencies[animal.id]}>
                    <Link to={profilePath(animal, record)} state={{ returnTo }}>
                      <span className="bb-directory-name"><strong>{primary}</strong><span>{[secondary, reason].filter(Boolean).join(" · ")}</span></span>
                      <span className="bb-care-label">{animalStatusLabels[urgencies[animal.id]]}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : <p className="bb-work-muted">No animals are overdue or due soon.</p>)}
        </section>

      </div>
      {!!animals.length && <HerdSummary animals={animals} />}
    </div>
  );
}
