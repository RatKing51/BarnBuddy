import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import {
  createHerd as createHerdRequest,
  deleteHerd as deleteHerdRequest,
  getHerdsForUser,
  updateHerd as updateHerdRequest,
} from "../api/herd";
import SettingsHeader from "../components/SettingsHeader";

const FIELD_LIMITS = {
  name: 160,
  location: 300,
  description: 2000,
};

const emptyForm = () => ({ name: "", location: "", description: "" });

function formFromHerd(herd) {
  return {
    name: herd?.name || "",
    location: herd?.location || "",
    description: herd?.description || "",
  };
}

function cleanForm(form) {
  return {
    name: form.name.trim(),
    location: form.location.trim(),
    description: form.description.trim(),
  };
}

function validateForm(form) {
  const cleaned = cleanForm(form);
  const errors = {};

  if (!cleaned.name) errors.name = "Enter a herd name.";
  if (cleaned.name.length > FIELD_LIMITS.name) errors.name = `Use ${FIELD_LIMITS.name} characters or fewer.`;
  if (cleaned.location.length > FIELD_LIMITS.location) errors.location = `Use ${FIELD_LIMITS.location} characters or fewer.`;
  if (cleaned.description.length > FIELD_LIMITS.description) errors.description = `Use ${FIELD_LIMITS.description} characters or fewer.`;

  return errors;
}

function sortHerds(herds) {
  return [...herds].sort((a, b) => {
    const byName = String(a.name || "").localeCompare(String(b.name || ""), undefined, { sensitivity: "base" });
    return byName || Number(a.id) - Number(b.id);
  });
}

function getErrorMessage(error, fallback) {
  return error?.response?.data?.error || fallback;
}

function ModalDialog({ open, onClose, labelledBy, describedBy, initialFocusRef, children }) {
  const dialogRef = useRef(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return undefined;

    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusFrame = window.requestAnimationFrame(() => {
      const focusTarget = initialFocusRef?.current || dialogRef.current?.querySelector("button, input, textarea, [href], [tabindex]:not([tabindex='-1'])");
      focusTarget?.focus();
    });

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current?.();
        return;
      }

      if (event.key !== "Tab") return;
      const focusable = Array.from(
        dialogRef.current?.querySelectorAll("button:not(:disabled), input:not(:disabled), textarea:not(:disabled), [href], [tabindex]:not([tabindex='-1'])") || [],
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, [initialFocusRef, open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 backdrop-blur-sm sm:items-center sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCloseRef.current?.();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        className="max-h-[calc(100dvh-1.5rem)] w-full max-w-lg overflow-y-auto rounded-3xl border border-gray-700 bg-gray-900 p-5 text-gray-100 shadow-2xl shadow-black/40 sm:p-6"
      >
        {children}
      </div>
    </div>
  );
}

function EmptyStateIcon({ type = "herd" }) {
  if (type === "error") {
    return (
      <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.3 3.7 2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.7a2 2 0 0 0-3.4 0Z" />
      </svg>
    );
  }

  return (
    <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 20V9l8-5 8 5v11M8 20v-6h8v6M9 10h.01M15 10h.01" />
    </svg>
  );
}

export default function HerdSettings() {
  const [herds, setHerds] = useState([]);
  const [selectedHerdId, setSelectedHerdId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [fieldErrors, setFieldErrors] = useState({});
  const [loadingHerds, setLoadingHerds] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saveNotice, setSaveNotice] = useState("");
  const [mutation, setMutation] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(emptyForm);
  const [createErrors, setCreateErrors] = useState({});
  const [createSubmitError, setCreateSubmitError] = useState("");

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [discardRequest, setDiscardRequest] = useState(null);

  const selectedHerdIdRef = useRef(null);
  const loadRequestRef = useRef(0);
  const createNameRef = useRef(null);
  const createButtonRef = useRef(null);
  const deleteCancelRef = useRef(null);
  const discardCancelRef = useRef(null);

  const selectedHerd = useMemo(
    () => herds.find((herd) => String(herd.id) === String(selectedHerdId)) || null,
    [herds, selectedHerdId],
  );
  const isBusy = Boolean(mutation);
  const isDirty = Boolean(
    selectedHerd &&
      (form.name !== (selectedHerd.name || "") ||
        form.location !== (selectedHerd.location || "") ||
        form.description !== (selectedHerd.description || "")),
  );

  const chooseHerd = useCallback((herd) => {
    const nextId = herd?.id ?? null;
    selectedHerdIdRef.current = nextId;
    setSelectedHerdId(nextId);
    setForm(formFromHerd(herd));
    setFieldErrors({});
    setSaveError("");
    setSaveNotice("");
  }, []);

  const loadHerds = useCallback(async () => {
    const requestId = loadRequestRef.current + 1;
    loadRequestRef.current = requestId;

    try {
      setLoadingHerds(true);
      setLoadError("");
      const response = await getHerdsForUser();
      if (requestId !== loadRequestRef.current) return;
      const nextHerds = sortHerds(Array.isArray(response.data) ? response.data : []);
      const preferredHerd = nextHerds.find((herd) => String(herd.id) === String(selectedHerdIdRef.current));
      const nextSelection = preferredHerd || nextHerds[0] || null;
      setHerds(nextHerds);
      chooseHerd(nextSelection);
    } catch (error) {
      if (requestId !== loadRequestRef.current) return;
      console.error(error);
      setLoadError(getErrorMessage(error, "We couldn’t load your herds. Check your connection and try again."));
    } finally {
      if (requestId === loadRequestRef.current) setLoadingHerds(false);
    }
  }, [chooseHerd]);

  useEffect(() => {
    loadHerds();
    return () => {
      loadRequestRef.current += 1;
    };
  }, [loadHerds]);

  useEffect(() => {
    if (!isDirty) return undefined;

    function handleBeforeUnload(event) {
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const handleFieldChange = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: "" }));
    setSaveError("");
    setSaveNotice("");
  };

  const handleSelectHerd = (herd) => {
    if (isBusy || String(herd.id) === String(selectedHerdId)) return;
    if (isDirty) {
      setDiscardRequest({ type: "select", herd });
      return;
    }
    chooseHerd(herd);
  };

  const resetForm = () => {
    if (!selectedHerd || isBusy) return;
    setForm(formFromHerd(selectedHerd));
    setFieldErrors({});
    setSaveError("");
    setSaveNotice("Changes reset.");
  };

  const saveHerd = async (event) => {
    event.preventDefault();
    if (!selectedHerd || isBusy || !isDirty) return;

    const errors = validateForm(form);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      document.getElementById(errors.name ? "herd-name" : errors.location ? "herd-location" : "herd-description")?.focus();
      return;
    }

    try {
      setMutation("save");
      setSaveError("");
      setSaveNotice("");
      const response = await updateHerdRequest(selectedHerd.id, cleanForm(form));
      const savedHerd = response.data;
      setHerds((current) => sortHerds(current.map((herd) => (String(herd.id) === String(savedHerd.id) ? savedHerd : herd))));
      chooseHerd(savedHerd);
      setSaveNotice("All changes saved.");
      toast.success(`${savedHerd.name} updated.`);
    } catch (error) {
      console.error(error);
      setSaveError(getErrorMessage(error, "We couldn’t save this herd. Try again."));
    } finally {
      setMutation("");
    }
  };

  const showCreateDialog = () => {
    setCreateForm(emptyForm());
    setCreateErrors({});
    setCreateSubmitError("");
    setCreateOpen(true);
  };

  const openCreateDialog = () => {
    if (isBusy) return;
    if (isDirty) {
      setDiscardRequest({ type: "create" });
      return;
    }
    showCreateDialog();
  };

  const closeCreateDialog = useCallback(() => {
    if (mutation) return;
    setCreateOpen(false);
    setCreateErrors({});
    setCreateSubmitError("");
  }, [mutation]);

  const handleCreateFieldChange = (field, value) => {
    setCreateForm((current) => ({ ...current, [field]: value }));
    setCreateErrors((current) => ({ ...current, [field]: "" }));
    setCreateSubmitError("");
  };

  const createHerd = async (event) => {
    event.preventDefault();
    if (isBusy) return;

    const errors = validateForm(createForm);
    if (Object.keys(errors).length > 0) {
      setCreateErrors(errors);
      document.getElementById(errors.name ? "new-herd-name" : errors.location ? "new-herd-location" : "new-herd-description")?.focus();
      return;
    }

    try {
      setMutation("create");
      setCreateSubmitError("");
      const response = await createHerdRequest(cleanForm(createForm));
      const newHerd = response.data;
      setHerds((current) => sortHerds([...current, newHerd]));
      chooseHerd(newHerd);
      setCreateOpen(false);
      setCreateForm(emptyForm());
      toast.success(`${newHerd.name} created.`);
    } catch (error) {
      console.error(error);
      setCreateSubmitError(getErrorMessage(error, "We couldn’t create this herd. Try again."));
    } finally {
      setMutation("");
    }
  };

  const openDeleteDialog = () => {
    if (!selectedHerd || isBusy) return;
    setDeleteError("");
    setDeleteOpen(true);
  };

  const closeDeleteDialog = useCallback(() => {
    if (mutation) return;
    setDeleteOpen(false);
    setDeleteError("");
  }, [mutation]);

  const deleteHerd = async () => {
    if (!selectedHerd || isBusy) return;

    const herdToDelete = selectedHerd;
    const currentIndex = herds.findIndex((herd) => String(herd.id) === String(herdToDelete.id));

    try {
      setMutation("delete");
      setDeleteError("");
      const response = await deleteHerdRequest(herdToDelete.id);
      const remainingHerds = herds.filter((herd) => String(herd.id) !== String(herdToDelete.id));
      const nextHerd = remainingHerds[Math.min(Math.max(currentIndex, 0), remainingHerds.length - 1)] || null;
      const movedAnimals = Number(response.data?.unassignedAnimals) || 0;

      setHerds(remainingHerds);
      chooseHerd(nextHerd);
      setDeleteOpen(false);
      toast.success(
        movedAnimals === 1
          ? `${herdToDelete.name} deleted. 1 animal moved to Unassigned.`
          : `${herdToDelete.name} deleted. ${movedAnimals} animals moved to Unassigned.`,
      );
    } catch (error) {
      console.error(error);
      setDeleteError(getErrorMessage(error, "We couldn’t delete this herd. Try again."));
    } finally {
      setMutation("");
    }
  };

  const closeDiscardDialog = useCallback(() => {
    setDiscardRequest(null);
  }, []);

  const discardAndContinue = () => {
    if (!discardRequest) return;
    if (discardRequest.type === "select") {
      chooseHerd(discardRequest.herd);
    } else {
      chooseHerd(selectedHerd);
      showCreateDialog();
    }
    setDiscardRequest(null);
  };

  const herdCountLabel = loadingHerds ? "Loading" : `${herds.length} ${herds.length === 1 ? "herd" : "herds"}`;

  return (
    <div className="min-h-dvh bg-gray-950 text-gray-100">
      <SettingsHeader />

      <main className="dashboard-page min-h-[calc(100dvh-9rem)] bg-gray-950 px-4 py-7 sm:px-6 sm:py-9 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-blue-400">Herd workspace</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Manage your herds</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400 sm:text-base">
                Keep herd names and details organized so animals and records stay easy to find across BarnBuddy.
              </p>
            </div>
            <span className="w-fit rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1.5 text-sm font-semibold text-blue-200" aria-live="polite">
              {herdCountLabel}
            </span>
          </div>

          {loadError && (
            <div role="alert" className="mb-5 flex flex-col gap-3 rounded-2xl border border-red-400/30 bg-red-500/10 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-3">
                <span className="mt-0.5 text-red-300"><EmptyStateIcon type="error" /></span>
                <div>
                  <p className="font-semibold text-white">Herds could not be loaded</p>
                  <p className="mt-1 text-sm text-red-100/80">{loadError}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={loadHerds}
                disabled={loadingHerds || isBusy}
                className="min-h-11 shrink-0 rounded-xl border border-red-300/30 bg-red-400/10 px-4 text-sm font-semibold text-red-100 transition hover:bg-red-400/20 disabled:cursor-wait disabled:opacity-60"
              >
                {loadingHerds ? "Retrying…" : "Try again"}
              </button>
            </div>
          )}

          <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-[minmax(260px,330px)_minmax(0,1fr)] lg:gap-6">
            <aside className="h-fit min-w-0 overflow-hidden rounded-3xl border border-gray-800 bg-gray-900/80 shadow-xl shadow-black/10 lg:sticky lg:top-6" aria-labelledby="herd-list-title">
              <div className="flex items-center justify-between gap-3 border-b border-gray-800 p-4 sm:p-5">
                <div className="min-w-0">
                  <h2 id="herd-list-title" className="font-semibold text-white">Your herds</h2>
                  <p className="mt-0.5 text-xs text-gray-500">Select one to edit its details.</p>
                </div>
                <button
                  ref={createButtonRef}
                  type="button"
                  onClick={openCreateDialog}
                  disabled={loadingHerds || isBusy || Boolean(loadError && herds.length === 0)}
                  className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-wait disabled:opacity-60"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                    <path strokeLinecap="round" d="M12 5v14M5 12h14" />
                  </svg>
                  Add herd
                </button>
              </div>

              <div className="max-h-80 overflow-y-auto p-3 lg:max-h-[calc(100dvh-20rem)]" aria-busy={loadingHerds}>
                {loadingHerds ? (
                  <div role="status" className="space-y-2">
                    <span className="sr-only">Loading herds…</span>
                    {[0, 1, 2].map((item) => (
                      <div key={item} className="bb-skeleton h-[4.5rem] animate-pulse rounded-2xl bg-gray-800" />
                    ))}
                  </div>
                ) : loadError && herds.length === 0 ? (
                  <div className="px-3 py-8 text-center text-sm text-gray-400">
                    Your herd list will appear here once the connection is restored.
                  </div>
                ) : herds.length === 0 ? (
                  <div className="px-3 py-8 text-center">
                    <p className="text-sm font-semibold text-white">No herds yet</p>
                    <p className="mt-1 text-sm leading-5 text-gray-400">Add your first herd to start organizing animals.</p>
                  </div>
                ) : (
                  <nav aria-label="Your herds">
                    <ul className="space-y-2">
                      {herds.map((herd) => {
                        const isSelected = String(selectedHerdId) === String(herd.id);
                        return (
                          <li key={herd.id}>
                            <button
                              type="button"
                              onClick={() => handleSelectHerd(herd)}
                              disabled={isBusy}
                              aria-pressed={isSelected}
                              className={`group flex min-h-16 w-full min-w-0 items-center gap-3 rounded-2xl border px-3 py-3 text-left transition disabled:cursor-wait disabled:opacity-60 ${
                                isSelected
                                  ? "border-blue-400/40 bg-blue-500/15 shadow-sm shadow-blue-950/20"
                                  : "border-transparent hover:border-gray-700 hover:bg-gray-800"
                              }`}
                            >
                              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${isSelected ? "bg-blue-500 text-white" : "bg-gray-800 text-gray-400 group-hover:bg-gray-700 group-hover:text-gray-200"}`}>
                                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 20V9l8-5 8 5v11M8 20v-6h8v6" />
                                </svg>
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className={`block truncate text-sm font-semibold ${isSelected ? "text-white" : "text-gray-200"}`}>{herd.name}</span>
                                <span className={`mt-0.5 block truncate text-xs ${isSelected ? "text-blue-100/70" : "text-gray-500"}`}>
                                  {herd.location || "Location not added"}
                                </span>
                              </span>
                              <svg className={`h-4 w-4 shrink-0 ${isSelected ? "text-blue-300" : "text-gray-600"}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
                              </svg>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </nav>
                )}
              </div>
            </aside>

            <div className="min-w-0 space-y-5">
              {loadingHerds ? (
                <section className="rounded-3xl border border-gray-800 bg-gray-900/80 p-5 sm:p-7" aria-label="Loading herd details" aria-busy="true">
                  <div className="bb-skeleton h-7 w-48 animate-pulse rounded-lg bg-gray-800" />
                  <div className="mt-3 bb-skeleton h-4 w-full max-w-lg animate-pulse rounded bg-gray-800" />
                  <div className="mt-8 grid gap-5 sm:grid-cols-2">
                    <div className="bb-skeleton h-20 animate-pulse rounded-2xl bg-gray-800" />
                    <div className="bb-skeleton h-20 animate-pulse rounded-2xl bg-gray-800" />
                    <div className="bb-skeleton h-36 animate-pulse rounded-2xl bg-gray-800 sm:col-span-2" />
                  </div>
                </section>
              ) : herds.length === 0 && !loadError ? (
                <section className="grid min-h-[25rem] place-items-center rounded-3xl border border-dashed border-gray-700 bg-gray-900/60 p-6 text-center">
                  <div className="max-w-md">
                    <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-blue-400/20 bg-blue-500/10 text-blue-300">
                      <EmptyStateIcon />
                    </span>
                    <h2 className="mt-5 text-2xl font-semibold text-white">Create your first herd</h2>
                    <p className="mt-2 text-sm leading-6 text-gray-400">Herds keep animals and records organized. You can update these details anytime.</p>
                    <button
                      type="button"
                      onClick={openCreateDialog}
                      className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-500"
                    >
                      Add your first herd
                    </button>
                  </div>
                </section>
              ) : !selectedHerd ? (
                <section className="grid min-h-[25rem] place-items-center rounded-3xl border border-dashed border-gray-700 bg-gray-900/60 p-6 text-center">
                  <div className="max-w-md">
                    <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gray-800 text-blue-300"><EmptyStateIcon /></span>
                    <h2 className="mt-5 text-2xl font-semibold text-white">Choose a herd</h2>
                    <p className="mt-2 text-sm leading-6 text-gray-400">Select a herd from the list to update its name, location, and description.</p>
                  </div>
                </section>
              ) : (
                <>
                  <section className="overflow-hidden rounded-3xl border border-gray-800 bg-gray-900/80 shadow-xl shadow-black/10" aria-labelledby="herd-details-title">
                    <div className="flex flex-col gap-3 border-b border-gray-800 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-7">
                      <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-400">Herd details</p>
                        <h2 id="herd-details-title" className="mt-2 truncate text-2xl font-semibold text-white">{selectedHerd.name}</h2>
                        <p className="mt-2 text-sm leading-6 text-gray-400">These details help you recognize this herd throughout your dashboard and records.</p>
                      </div>
                      <div className="min-h-7 shrink-0" aria-live="polite">
                        {isDirty ? (
                          <span className="inline-flex rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-xs font-semibold text-amber-200">Unsaved changes</span>
                        ) : saveNotice ? (
                          <span className="inline-flex rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs font-semibold text-emerald-200">{saveNotice}</span>
                        ) : (
                          <span className="inline-flex rounded-full border border-gray-700 bg-gray-800 px-3 py-1 text-xs font-semibold text-gray-400">Up to date</span>
                        )}
                      </div>
                    </div>

                    <form onSubmit={saveHerd} noValidate className="p-5 sm:p-7">
                      <div className="grid gap-5 sm:grid-cols-2">
                        <div>
                          <div className="flex items-center justify-between gap-3">
                            <label htmlFor="herd-name" className="text-sm font-semibold text-gray-200">Herd name <span className="text-blue-300">*</span></label>
                            <span className="text-xs text-gray-500">{form.name.length}/{FIELD_LIMITS.name}</span>
                          </div>
                          <input
                            id="herd-name"
                            value={form.name}
                            maxLength={FIELD_LIMITS.name}
                            disabled={isBusy}
                            aria-invalid={Boolean(fieldErrors.name)}
                            aria-describedby={fieldErrors.name ? "herd-name-error" : "herd-name-help"}
                            onChange={(event) => handleFieldChange("name", event.target.value)}
                            className={`mt-2 min-h-12 w-full rounded-xl border bg-gray-800 px-3.5 text-white outline-none transition placeholder:text-gray-600 disabled:cursor-wait disabled:opacity-60 ${fieldErrors.name ? "border-red-400 focus:border-red-300" : "border-gray-700 focus:border-blue-400"}`}
                            placeholder="Example: North Pasture"
                          />
                          {fieldErrors.name ? <p id="herd-name-error" className="mt-2 text-sm text-red-300">{fieldErrors.name}</p> : <p id="herd-name-help" className="mt-2 text-xs text-gray-500">Required. Use a name your team will recognize.</p>}
                        </div>

                        <div>
                          <div className="flex items-center justify-between gap-3">
                            <label htmlFor="herd-location" className="text-sm font-semibold text-gray-200">Location <span className="font-normal text-gray-500">(optional)</span></label>
                            <span className="text-xs text-gray-500">{form.location.length}/{FIELD_LIMITS.location}</span>
                          </div>
                          <input
                            id="herd-location"
                            value={form.location}
                            maxLength={FIELD_LIMITS.location}
                            disabled={isBusy}
                            aria-invalid={Boolean(fieldErrors.location)}
                            aria-describedby={fieldErrors.location ? "herd-location-error" : "herd-location-help"}
                            onChange={(event) => handleFieldChange("location", event.target.value)}
                            className={`mt-2 min-h-12 w-full rounded-xl border bg-gray-800 px-3.5 text-white outline-none transition placeholder:text-gray-600 disabled:cursor-wait disabled:opacity-60 ${fieldErrors.location ? "border-red-400 focus:border-red-300" : "border-gray-700 focus:border-blue-400"}`}
                            placeholder="Example: North barn"
                          />
                          {fieldErrors.location ? <p id="herd-location-error" className="mt-2 text-sm text-red-300">{fieldErrors.location}</p> : <p id="herd-location-help" className="mt-2 text-xs text-gray-500">A pasture, barn, pen, or other familiar place.</p>}
                        </div>

                        <div className="sm:col-span-2">
                          <div className="flex items-center justify-between gap-3">
                            <label htmlFor="herd-description" className="text-sm font-semibold text-gray-200">Description <span className="font-normal text-gray-500">(optional)</span></label>
                            <span className="text-xs text-gray-500">{form.description.length}/{FIELD_LIMITS.description}</span>
                          </div>
                          <textarea
                            id="herd-description"
                            value={form.description}
                            maxLength={FIELD_LIMITS.description}
                            disabled={isBusy}
                            aria-invalid={Boolean(fieldErrors.description)}
                            aria-describedby={fieldErrors.description ? "herd-description-error" : "herd-description-help"}
                            onChange={(event) => handleFieldChange("description", event.target.value)}
                            rows={5}
                            className={`mt-2 w-full resize-y rounded-xl border bg-gray-800 px-3.5 py-3 text-white outline-none transition placeholder:text-gray-600 disabled:cursor-wait disabled:opacity-60 ${fieldErrors.description ? "border-red-400 focus:border-red-300" : "border-gray-700 focus:border-blue-400"}`}
                            placeholder="Add notes about this herd’s purpose, group, or routine."
                          />
                          {fieldErrors.description ? <p id="herd-description-error" className="mt-2 text-sm text-red-300">{fieldErrors.description}</p> : <p id="herd-description-help" className="mt-2 text-xs text-gray-500">Keep this short and useful for anyone managing records.</p>}
                        </div>
                      </div>

                      {saveError && <p role="alert" className="mt-5 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{saveError}</p>}

                      <div className="mt-6 flex flex-col-reverse gap-3 border-t border-gray-800 pt-5 sm:flex-row sm:items-center sm:justify-end">
                        <button
                          type="button"
                          onClick={resetForm}
                          disabled={!isDirty || isBusy}
                          className="min-h-11 rounded-xl border border-gray-700 px-4 text-sm font-semibold text-gray-200 transition hover:border-gray-600 hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          Reset changes
                        </button>
                        <button
                          type="submit"
                          disabled={!isDirty || isBusy}
                          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {mutation === "save" && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden="true" />}
                          {mutation === "save" ? "Saving…" : "Save changes"}
                        </button>
                      </div>
                    </form>
                  </section>

                  <section className="rounded-3xl border border-red-500/25 bg-red-500/[0.07] p-5 sm:p-6" aria-labelledby="danger-zone-title">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="max-w-2xl">
                        <h2 id="danger-zone-title" className="font-semibold text-white">Delete this herd</h2>
                        <p className="mt-2 text-sm leading-6 text-gray-400">Deleting this herd won’t delete its animals or records. They’ll move to Unassigned, where you can place them in another herd.</p>
                      </div>
                      <button
                        type="button"
                        onClick={openDeleteDialog}
                        disabled={isBusy}
                        className="min-h-11 shrink-0 rounded-xl border border-red-400/35 bg-red-500/10 px-4 text-sm font-semibold text-red-200 transition hover:bg-red-500/20 disabled:cursor-wait disabled:opacity-60"
                      >
                        Delete herd
                      </button>
                    </div>
                  </section>
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      <ModalDialog open={createOpen} onClose={closeCreateDialog} labelledBy="create-herd-title" describedBy="create-herd-description" initialFocusRef={createNameRef}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-400">New herd</p>
            <h2 id="create-herd-title" className="mt-2 text-2xl font-semibold text-white">Add a herd</h2>
            <p id="create-herd-description" className="mt-2 text-sm leading-6 text-gray-400">Give this herd a clear name. You can add more details now or later.</p>
          </div>
          <button type="button" onClick={closeCreateDialog} disabled={isBusy} aria-label="Close add herd dialog" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-gray-400 transition hover:bg-gray-800 hover:text-white disabled:opacity-50">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path strokeLinecap="round" d="m6 6 12 12M18 6 6 18" /></svg>
          </button>
        </div>

        <form onSubmit={createHerd} noValidate className="mt-6 space-y-5">
          <div>
            <label htmlFor="new-herd-name" className="text-sm font-semibold text-gray-200">Herd name <span className="text-blue-300">*</span></label>
            <input ref={createNameRef} id="new-herd-name" value={createForm.name} maxLength={FIELD_LIMITS.name} disabled={isBusy} aria-invalid={Boolean(createErrors.name)} aria-describedby={createErrors.name ? "new-herd-name-error" : undefined} onChange={(event) => handleCreateFieldChange("name", event.target.value)} className={`mt-2 min-h-12 w-full rounded-xl border bg-gray-800 px-3.5 text-white outline-none placeholder:text-gray-600 ${createErrors.name ? "border-red-400" : "border-gray-700 focus:border-blue-400"}`} placeholder="Example: North Pasture" />
            {createErrors.name && <p id="new-herd-name-error" className="mt-2 text-sm text-red-300">{createErrors.name}</p>}
          </div>

          <div>
            <label htmlFor="new-herd-location" className="text-sm font-semibold text-gray-200">Location <span className="font-normal text-gray-500">(optional)</span></label>
            <input id="new-herd-location" value={createForm.location} maxLength={FIELD_LIMITS.location} disabled={isBusy} aria-invalid={Boolean(createErrors.location)} aria-describedby={createErrors.location ? "new-herd-location-error" : undefined} onChange={(event) => handleCreateFieldChange("location", event.target.value)} className={`mt-2 min-h-12 w-full rounded-xl border bg-gray-800 px-3.5 text-white outline-none placeholder:text-gray-600 ${createErrors.location ? "border-red-400" : "border-gray-700 focus:border-blue-400"}`} placeholder="Example: North barn" />
            {createErrors.location && <p id="new-herd-location-error" className="mt-2 text-sm text-red-300">{createErrors.location}</p>}
          </div>

          <div>
            <label htmlFor="new-herd-description" className="text-sm font-semibold text-gray-200">Description <span className="font-normal text-gray-500">(optional)</span></label>
            <textarea id="new-herd-description" value={createForm.description} maxLength={FIELD_LIMITS.description} disabled={isBusy} aria-invalid={Boolean(createErrors.description)} aria-describedby={createErrors.description ? "new-herd-description-error" : undefined} onChange={(event) => handleCreateFieldChange("description", event.target.value)} rows={4} className={`mt-2 w-full resize-y rounded-xl border bg-gray-800 px-3.5 py-3 text-white outline-none placeholder:text-gray-600 ${createErrors.description ? "border-red-400" : "border-gray-700 focus:border-blue-400"}`} placeholder="What should your team know about this herd?" />
            {createErrors.description && <p id="new-herd-description-error" className="mt-2 text-sm text-red-300">{createErrors.description}</p>}
          </div>

          {createSubmitError && <p role="alert" className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{createSubmitError}</p>}

          <div className="flex flex-col-reverse gap-3 border-t border-gray-800 pt-5 sm:flex-row sm:justify-end">
            <button type="button" onClick={closeCreateDialog} disabled={isBusy} className="min-h-11 rounded-xl border border-gray-700 px-4 text-sm font-semibold text-gray-200 hover:bg-gray-800 disabled:opacity-50">Cancel</button>
            <button type="submit" disabled={isBusy} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-wait disabled:opacity-60">
              {mutation === "create" && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden="true" />}
              {mutation === "create" ? "Creating…" : "Create herd"}
            </button>
          </div>
        </form>
      </ModalDialog>

      <ModalDialog open={deleteOpen} onClose={closeDeleteDialog} labelledBy="delete-herd-title" describedBy="delete-herd-description" initialFocusRef={deleteCancelRef}>
        <span className="grid h-12 w-12 place-items-center rounded-2xl border border-red-400/25 bg-red-500/10 text-red-300">
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16m-10 4v5m4-5v5M9 7l1-2h4l1 2m-9 0 1 13h10l1-13" /></svg>
        </span>
        <h2 id="delete-herd-title" className="mt-5 text-2xl font-semibold text-white">Delete {selectedHerd?.name || "this herd"}?</h2>
        <p id="delete-herd-description" className="mt-2 text-sm leading-6 text-gray-400">The herd will be removed, but its animals and records will stay safe in Unassigned. This action cannot be undone.</p>
        <div className="mt-4 rounded-2xl border border-gray-700 bg-gray-800/70 p-4 text-sm text-gray-300">
          <span className="font-semibold text-white">What happens next:</span> You can move those animals from Unassigned into any remaining herd from the dashboard.
        </div>
        {deleteError && <p role="alert" className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{deleteError}</p>}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button ref={deleteCancelRef} type="button" onClick={closeDeleteDialog} disabled={isBusy} className="min-h-11 rounded-xl border border-gray-700 px-4 text-sm font-semibold text-gray-200 hover:bg-gray-800 disabled:opacity-50">Keep herd</button>
          <button type="button" onClick={deleteHerd} disabled={isBusy} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-red-600 px-5 text-sm font-semibold text-white hover:bg-red-500 disabled:cursor-wait disabled:opacity-60">
            {mutation === "delete" && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden="true" />}
            {mutation === "delete" ? "Deleting…" : "Delete herd"}
          </button>
        </div>
      </ModalDialog>

      <ModalDialog open={Boolean(discardRequest)} onClose={closeDiscardDialog} labelledBy="discard-changes-title" describedBy="discard-changes-description" initialFocusRef={discardCancelRef}>
        <span className="grid h-12 w-12 place-items-center rounded-2xl border border-amber-300/20 bg-amber-300/10 text-amber-200">
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.3 3.7 2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.7a2 2 0 0 0-3.4 0Z" /></svg>
        </span>
        <h2 id="discard-changes-title" className="mt-5 text-2xl font-semibold text-white">Discard unsaved changes?</h2>
        <p id="discard-changes-description" className="mt-2 text-sm leading-6 text-gray-400">
          Your edits to {selectedHerd?.name || "this herd"} haven’t been saved. Discard them to {discardRequest?.type === "create" ? "add another herd" : `switch to ${discardRequest?.herd?.name || "the selected herd"}`}.
        </p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button ref={discardCancelRef} type="button" onClick={closeDiscardDialog} className="min-h-11 rounded-xl border border-gray-700 px-4 text-sm font-semibold text-gray-200 hover:bg-gray-800">Keep editing</button>
          <button type="button" onClick={discardAndContinue} className="min-h-11 rounded-xl bg-amber-500 px-5 text-sm font-semibold text-gray-950 hover:bg-amber-400">{discardRequest?.type === "create" ? "Discard and continue" : "Discard and switch"}</button>
        </div>
      </ModalDialog>

    </div>
  );
}
