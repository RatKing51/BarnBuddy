import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { DashboardOverviewSkeleton } from "./LoadingSpinner";
import { animalStatusLabels, getAnimalCareStatus, getAnimalIdentifiers } from "../utils/animalCare";
import { formatAnimalAge } from "../utils/age";
import { MobileIcon } from "./MobileDashboard";

export default function AnimalDirectory({
  animals, careState, urgencies, primaryIdentifier, profilePath, returnTo, loading, error, herdPicker,
}) {
  const [params, setParams] = useSearchParams();
  const query = params.get("q") || "";
  const species = params.get("species") || "";
  const requestedStatus = params.get("status");
  const status = Object.hasOwn(animalStatusLabels, requestedStatus) ? requestedStatus : "all";
  const [showFilters, setShowFilters] = useState(Boolean(species || status !== "all"));
  const speciesOptions = [...new Set(animals.map(animal => animal.species).filter(Boolean))].sort();
  const needle = query.trim().toLowerCase();
  const careReady = careState === "ready";
  const unavailableStatus = !careReady && ["red", "yellow", "green"].includes(status);
  const rows = animals.map(animal => ({
    animal,
    status: careReady || animal.status === "archived" || animal.status === "deceased"
      ? getAnimalCareStatus(animal, urgencies)
      : null,
  })).filter(row => (
    (status === "all" || row.status === status) &&
    (!species || row.animal.species === species) &&
    (!needle || [row.animal.name, row.animal.tag_id, row.animal.species].some(value => value?.toLowerCase().includes(needle)))
  ));
  const hasFilteredSpecies = Boolean(species && !speciesOptions.includes(species));

  function updateFilter(name, value) {
    const next = new URLSearchParams(params);
    if (value) next.set(name, value);
    else next.delete(name);
    setParams(next, { replace: true });
  }

  if (loading) return <DashboardOverviewSkeleton />;

  return (
    <section aria-label="Animal directory" className="bb-record-panel bb-directory" data-tour="animal-list" data-filters-open={showFilters || undefined}>
      <div className="bb-directory-controls">
        <label>
          <span>Search animals</span>
          <input className="bb-field" type="search" value={query} placeholder="Name, tag, species" onChange={event => updateFilter("q", event.target.value)} />
        </label>
        <div className="bb-mobile-directory-controls bb-mobile-only">
          {herdPicker}
          <button className="bb-mobile-pill" type="button" aria-expanded={showFilters} aria-controls="animal-status-filter animal-species-filter"
            onClick={() => setShowFilters(value => !value)}>Filters{species || status !== "all" ? " · On" : ""}</button>
        </div>
        <label className="bb-directory-filter" id="animal-status-filter">
          <span>Status</span>
          <select className="bb-field" value={status} onChange={event => updateFilter("status", event.target.value === "all" ? "" : event.target.value)}>
            <option value="all">All statuses</option>
            {Object.entries(animalStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className={`bb-directory-filter ${species ? "" : "bb-mobile-only"}`} id="animal-species-filter">
          <span>Species</span>
          <select className="bb-field" value={species} onChange={event => updateFilter("species", event.target.value)}>
            <option value="">All species</option>
            {hasFilteredSpecies && <option value={species}>{species}</option>}
            {speciesOptions.map(value => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
        <p role="status" className="bb-work-muted">
          {error ? "Animals unavailable" : unavailableStatus ? "Care status unavailable" : `${rows.length} of ${animals.length} ${animals.length === 1 ? "animal" : "animals"}`}
        </p>
      </div>
      {unavailableStatus && !error ? (
        <div className="bb-directory-empty">
          <p>{careState === "loading" ? "Checking care records…" : "Care records couldn’t load. Clear the status filter to see all animals."}</p>
        </div>
      ) : rows.length ? (
        <>
          <div className="bb-directory-columns" aria-hidden="true">
            <span>{primaryIdentifier === "tag" ? "Tag ID" : "Animal"}</span><span>Species</span><span>Age</span><span>Weight</span><span>Temperament</span><span>Status</span>
          </div>
          <ul className="bb-directory-list">
            {rows.map(({ animal, status: careStatus }) => {
              const { primary, secondary } = getAnimalIdentifiers(animal, primaryIdentifier);
              const weight = Number(animal.weight);
              const age = formatAnimalAge(animal);
              return (
                <li key={animal.id}>
                  <Link className="bb-directory-row" to={profilePath(animal)} state={{ returnTo }}>
                    <span className="bb-mobile-row-icon bb-mobile-only"><MobileIcon name="tag" /></span>
                    <span className="bb-directory-name"><strong>{primary}</strong>{secondary && <span>{secondary}</span>}</span>
                    <span className="bb-directory-meta">
                      <span>{animal.species || "Unknown species"}</span>
                      <span data-empty={!age}><span className="sr-only">Age </span>{age || "—"}</span>
                      <span data-empty={!(weight > 0)}><span className="sr-only">Weight </span>{weight > 0 ? `${Math.round(weight).toLocaleString()} ${animal.weight_unit || "lb"}` : "—"}</span>
                      <span data-empty={!animal.behavior}><span className="sr-only">Temperament </span>{animal.behavior || "—"}</span>
                    </span>
                    <span className="bb-care-label" data-status={careStatus}>{animalStatusLabels[careStatus] || (careState === "loading" ? "Checking care…" : "Care unavailable")}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        <div className="bb-directory-empty">
          <h2>{error ? "Animals couldn’t load" : animals.length ? "No animals match" : "No animals in this herd"}</h2>
          <p>{error ? "Refresh to try again." : animals.length ? "Try a different search or clear a filter." : "Use Add animal to start tracking records."}</p>
        </div>
      )}
    </section>
  );
}
