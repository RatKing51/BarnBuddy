import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { getAnimalIdentifiers } from "../utils/animalCare";

const icons = {
  home: "m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1Z",
  animals: "M3 7v5a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3V8l-3 2H6m0 5v4m12-4v4m-5-4v4",
  add: "M12 5v14M5 12h14",
  care: "M20.8 5.9a4.9 4.9 0 0 0-6.9 0L12 7.8l-1.9-1.9a4.9 4.9 0 0 0-6.9 6.9L12 22l8.8-9.2a4.9 4.9 0 0 0 0-6.9Z",
  more: "M4 12h.1m7.9 0h.1m7.9 0h.1",
  tag: "M6 21h12a2 2 0 0 0 2-2V9l-5-6H9L4 9v10a2 2 0 0 0 2 2Zm6-14h.01",
  weight: "M6 4h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm2 7a4 4 0 0 1 8 0m-4 0 2-2",
  health: "M4 7h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1Zm5 0V4h6v3m-3 4v5m-2.5-2.5h5",
  vaccination: "m15 4 5 5m-1-6 3 3M3 21l5-5m-2-2 4 4 9-9-4-4Zm3-3 2 2m1-5 2 2",
  vet: "M5 3H3v6a5 5 0 0 0 10 0V3h-2m-3 11v2a5 5 0 0 0 10 0v-2m2-4a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z",
  clock: "M12 7v5l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  bulk: "M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01",
  chart: "M4 4v16h16M8 15l4-4 3 2 4-6",
  back: "m11 6-6 6 6 6m-6-6h14",
  close: "m6 6 12 12M18 6 6 18",
  next: "m9 7 5 5-5 5",
  check: "m4 12 5 5L20 6",
};

export function MobileIcon({ name }) {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={name === "more" ? 2.8 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d={icons[name]} />
    </svg>
  );
}

export function MobileRow({ to, routeState, onClick, pressed, icon, title, subtitle, end, due, children }) {
  const content = (
    <>
      <span className="bb-mobile-row-icon"><MobileIcon name={icon} /></span>
      <span className="bb-mobile-row-copy">
        <strong>{title}</strong>
        {subtitle && <small>{subtitle}</small>}
        {children}
      </span>
      <span className={due ? "bb-mobile-due" : "bb-mobile-row-end"}>{end || <MobileIcon name="next" />}</span>
    </>
  );
  return (
    <li className="bb-mobile-row" data-due={due || undefined}>
      {to ? <Link to={to} state={routeState} onClick={onClick}>{content}</Link>
        : <button type="button" onClick={onClick} aria-pressed={pressed}>{content}</button>}
    </li>
  );
}

export function MobileSheet({ title, onClose, children, footer, parentTitle, busy = false }) {
  const dialogRef = useRef(null);
  const titleId = useId();
  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    const opener = document.activeElement;
    dialog.showModal();
    return () => {
      dialog.close();
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);

  return (
    <dialog className="bb-mobile-sheet" data-full={parentTitle ? true : undefined} ref={dialogRef} aria-labelledby={titleId}
      onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}>
      {parentTitle && (
        <div className="bb-mobile-sheet-parent">
          <button type="button" className="bb-mobile-icon-button" aria-label={`Back to ${parentTitle.toLowerCase()}`}
            onClick={onClose} disabled={busy}><MobileIcon name="back" /></button>
          <span>{parentTitle}</span>
        </div>
      )}
      <header className="bb-mobile-sheet-heading">
        <h2 id={titleId}>{title}</h2>
        {!parentTitle && <button type="button" className="bb-mobile-icon-button" aria-label="Close" onClick={onClose} disabled={busy}>
          <MobileIcon name="close" />
        </button>}
      </header>
      <div className="bb-mobile-sheet-content">{children}</div>
      {footer && <footer className="bb-mobile-sheet-footer">{footer}</footer>}
    </dialog>
  );
}

export function MobileNav({ home, directory, active, onAdd, onCare, onMore }) {
  return (
    <nav className="bb-bottom-nav bb-mobile-only" aria-label="Farm navigation">
      <div className="bb-mobile-tabs">
        <Link to={home} aria-current={active === "home" ? "page" : undefined} data-tour="farm-overview">
          <span><MobileIcon name="home" /></span>Home
        </Link>
        <Link to={directory} aria-current={active === "animals" ? "page" : undefined} data-tour="animals-navigation">
          <span><MobileIcon name="animals" /></span>Animals
        </Link>
        <button type="button" data-add onClick={onAdd} aria-haspopup="dialog"><span><MobileIcon name="add" /></span>Add</button>
        <button type="button" onClick={onCare} aria-current={active === "care" ? "page" : undefined}><span><MobileIcon name="care" /></span>Care</button>
        <button type="button" onClick={onMore} aria-haspopup="dialog"><span><MobileIcon name="more" /></span>More</button>
      </div>
    </nav>
  );
}

const quickActions = [
  { id: "weight", icon: "weight", title: "Weight", subtitle: "Enter a weigh-in" },
  { id: "health", icon: "health", title: "Health record", subtitle: "Log an event or treatment" },
  { id: "vaccination", icon: "vaccination", title: "Vaccination", subtitle: "Log a dose" },
  { id: "vet", icon: "vet", title: "Vet visit", subtitle: "Log or schedule a visit" },
  { id: "animal", icon: "animals", title: "Animal", subtitle: "Create an animal profile" },
  { id: "bulk-entry", icon: "bulk", title: "Bulk entry", subtitle: "Apply one record to several animals" },
];

export function QuickAdd({ onChoose, onClose, herdPicker, herdId, herdName, animals, loading, error, primaryIdentifier }) {
  const [record, setRecord] = useState(null);
  const [selection, setSelection] = useState(null);
  const [query, setQuery] = useState("");
  const pickerHeading = useRef(null);
  useEffect(() => {
    if (record) pickerHeading.current?.focus();
  }, [record]);
  const animal = !loading && !error && selection?.herdId === herdId
    ? animals.find(item => item.id === selection.animalId)
    : null;
  const needle = query.trim().toLowerCase();
  const matches = animals.filter(item => [item.name, item.tag_id, item.species].some(value => value?.toLowerCase().includes(needle)));
  return (
    <MobileSheet title={record ? "Choose an animal" : "Quick log"} onClose={onClose}
      footer={record && <button className="bb-mobile-primary" type="button" disabled={!animal}
        onClick={() => onChoose(record.id, animal)}>Continue to {record.title.toLowerCase()}</button>}>
      {record ? (
        <>
          <label className="bb-mobile-field-label">
            Search animals
            <input className="bb-field" type="search" placeholder="Name or ear tag" value={query} onChange={event => setQuery(event.target.value)} />
          </label>
          <div className="bb-mobile-picker-tools">
            {herdPicker}
            <button ref={pickerHeading} type="button" className="bb-mobile-pill" onClick={() => setRecord(null)}>Change record type</button>
          </div>
          {loading || error || !matches.length ? (
            <p role="status" className="bb-work-muted">{loading ? "Loading animals…" : error ? "Animals couldn’t load." : "No matching animals in this herd."}</p>
          ) : (
            <ul className="bb-mobile-rows">
              {matches.map(item => {
                const { primary, secondary } = getAnimalIdentifiers(item, primaryIdentifier);
                const selected = animal?.id === item.id;
                return <MobileRow key={item.id} title={primary} subtitle={[herdName, secondary].filter(Boolean).join(" · ")}
                  icon="tag" pressed={selected} end={selected && <MobileIcon name="check" />}
                  onClick={() => setSelection({ animalId: item.id, herdId })} />;
              })}
            </ul>
          )}
        </>
      ) : (
        <ul className="bb-mobile-rows">
          {quickActions.map(action => (
            <MobileRow key={action.id} {...action} onClick={() => {
              if (onChoose(action.id) === false) setRecord(action);
            }} />
          ))}
        </ul>
      )}
    </MobileSheet>
  );
}

const careLabels = {
  vaccination: ["Vaccination due", "vaccination", "health"],
  visit: ["Vet visit", "vet", "vet"],
  "follow-up": ["Follow-up", "clock", "vet"],
};

function CareRows({ events, profilePath, returnTo }) {
  return (
    <ul className="bb-mobile-rows">
      {events.map(event => {
        const [title, icon, record] = careLabels[event.type];
        return <MobileRow key={`${event.type}:${event.id}`} title={title} subtitle={event.label} icon={icon}
          to={profilePath(event.animal, record)} routeState={{ returnTo, careTarget: event.type, careRecordId: event.id }}
          end={event.status === "today" ? "Today" : event.status === "overdue" ? "Overdue" : new Date(`${event.date}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          due={event.status !== "upcoming"} />;
      })}
    </ul>
  );
}

export function MobileCare({ events, animals, careState, careWindow, primaryIdentifier, profilePath, returnTo, preview = false }) {
  const [filter, setFilter] = useState("upcoming");
  const byId = new Map(animals.map(animal => [String(animal.id), animal]));
  const rows = events.flatMap(event => {
    const animal = byId.get(String(event.animalId));
    if (!animal || !Object.hasOwn(careLabels, event.type)) return [];
    const { primary, secondary } = getAnimalIdentifiers(animal, primaryIdentifier);
    return [{ ...event, animal, label: [primary, secondary].filter(Boolean).join(" · ") }];
  }).sort((a, b) => a.date.localeCompare(b.date));
  const groups = [
    { title: "Overdue", events: rows.filter(row => row.status === "overdue"), show: filter !== "upcoming" },
    { title: "Today", events: rows.filter(row => row.status === "today"), show: filter !== "overdue" },
    { title: "Coming up", events: rows.filter(row => row.status === "upcoming"), show: filter !== "overdue" },
  ].filter(group => group.show && group.events.length);
  const visible = preview ? rows.slice(0, 3) : groups.flatMap(group => group.events);
  return (
    <section className="bb-mobile-care" aria-label={preview ? "Needs attention" : "Care schedule"} data-tour={preview ? "herd-attention" : undefined}>
      {preview ? <h2>Needs attention</h2> : (
        <>
          <div className="bb-mobile-pills" role="group" aria-label="Filter care reminders">
            {["upcoming", "overdue", "all"].map(option => (
              <button type="button" className="bb-mobile-pill" key={option} aria-pressed={filter === option}
                onClick={() => setFilter(option)}>{option[0].toUpperCase() + option.slice(1)}</button>
            ))}
          </div>
          <p className="bb-work-muted">Vaccinations · {careWindow} days <span aria-hidden="true">/</span> Vet care · 30 days</p>
        </>
      )}
      {careState !== "ready" || !visible.length ? (
        <p role="status" className="bb-mobile-empty">{careState === "loading" ? "Checking care records…" : careState === "error"
          ? "Care records couldn’t load. Refresh to try again." : preview ? "No upcoming or overdue care in this herd." : "No care reminders match this filter."}</p>
      ) : preview ? <CareRows events={visible} profilePath={profilePath} returnTo={returnTo} /> : groups.map(group => (
        <section key={group.title}>
          <h2>{group.title}</h2>
          <CareRows events={group.events} profilePath={profilePath} returnTo={returnTo} />
        </section>
      ))}
    </section>
  );
}
