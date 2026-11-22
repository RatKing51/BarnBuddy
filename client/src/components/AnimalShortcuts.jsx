import { Link } from "react-router";
import { animalStatusLabels, getAnimalCareStatus, getAnimalIdentifiers } from "../utils/animalCare";

export default function AnimalShortcuts({
  animals, careState, urgencies, primaryIdentifier, profilePath, returnTo, selectedAnimalId, directoryPath,
  compact = false, canGoBack, showDirectoryLink = true,
}) {
  const visibleAnimals = compact ? animals.slice(0, 4) : animals;
  if (visibleAnimals.length === 0) return null;

  return (
    <nav aria-label="Animal shortcuts" className="bb-animal-shortcuts">
      <div className="bb-shortcut-heading">
        <span>Herd animals</span>
        {showDirectoryLink && <Link to={directoryPath} className="bb-text-link">View all <span className="sr-only">animals</span></Link>}
      </div>
      <ul className="bb-shortcut-list">
        {visibleAnimals.map(animal => {
          const { primary, secondary } = getAnimalIdentifiers(animal, primaryIdentifier);
          const status = getAnimalCareStatus(animal, urgencies);
          const showCare = careState === "ready" || status === "archived" || status === "deceased";
          const isCurrent = String(animal.id) === selectedAnimalId;
          return (
            <li key={animal.id}>
              <Link to={profilePath(animal)} replace={Boolean(selectedAnimalId)}
                state={{ returnTo, canGoBack }} aria-current={isCurrent ? "page" : undefined}>
                <span className="bb-shortcut-name">
                  <span className="bb-care-dot" data-status={showCare ? status : undefined} aria-hidden="true" />
                  <strong>{primary}</strong>
                </span>
                <span className="bb-shortcut-details">{[compact ? "" : animal.species, secondary].filter(Boolean).join(" · ")}</span>
                {showCare && <span className="sr-only">{animalStatusLabels[status]}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
