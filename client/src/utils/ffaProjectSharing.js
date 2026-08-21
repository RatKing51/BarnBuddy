function firstDefined(...values) {
  return values.find((value) => value !== undefined && value !== null);
}

export function normalizeProjectSharing(value) {
  const source = value?.sharing || value?.advisorSharing || value?.advisor_sharing
    || value?.project?.sharing || value?.project?.advisorSharing || {};

  const explicitAvailable = firstDefined(source.available, source.effectiveAvailable, source.effective_available);
  const eligible = firstDefined(source.eligible, true) === true;
  const chapterEnabled = firstDefined(source.chapterEnabled, source.chapter_enabled);
  const available = typeof explicitAvailable === "boolean"
    ? explicitAvailable
    : typeof chapterEnabled === "boolean"
      ? eligible && chapterEnabled
      : firstDefined(source.eligible, false) === true;
  const optedIn = firstDefined(
    source.optedIn,
    source.opted_in,
    source.shared,
    false
  ) === true;

  return {
    available,
    optedIn,
    effective: firstDefined(source.effective, source.active, available && optedIn) === true,
    chapterName: String(firstDefined(source.chapterName, source.chapter_name, "")).trim(),
    sharedAt: String(firstDefined(source.sharedAt, source.shared_at, "")).trim(),
  };
}
