const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function isBlank(value) {
  return value === null || value === undefined || (typeof value === "string" && value.trim() === "");
}

function cleanText(value, fallback = "") {
  if (isBlank(value)) return fallback;
  return ["string", "number", "boolean"].includes(typeof value) ? String(value).trim() : fallback;
}

function normalizeDateOnly(value, { label = "Date", required = false } = {}) {
  if (isBlank(value)) {
    return required
      ? { error: `${label} is required.` }
      : { value: null };
  }

  if (typeof value !== "string") return { error: `${label} must be a valid date.` };

  const text = value.trim();
  const match = DATE_ONLY_PATTERN.exec(text);
  if (!match) return { error: `${label} must be a valid date.` };

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year
    || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day
  ) {
    return { error: `${label} must be a valid date.` };
  }

  return { value: text };
}

function normalizeNumber(value, {
  label = "Value",
  required = false,
  defaultValue = null,
  integer = false,
  min = null,
  max = null,
  exclusiveMin = false,
} = {}) {
  if (isBlank(value)) {
    return required
      ? { error: `${label} is required.` }
      : { value: defaultValue };
  }

  if (!["string", "number"].includes(typeof value)) {
    return { error: `${label} must be a valid${integer ? " whole" : ""} number.` };
  }

  const number = typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isFinite(number) || (integer && !Number.isInteger(number))) {
    return { error: `${label} must be a valid${integer ? " whole" : ""} number.` };
  }
  if (min !== null && (exclusiveMin ? number <= min : number < min)) {
    return { error: `${label} must be ${exclusiveMin ? "greater than" : "at least"} ${min}.` };
  }
  if (max !== null && number > max) {
    return { error: `${label} must be no more than ${max}.` };
  }

  return { value: number };
}

function normalizePositiveId(value, { label = "Selection", required = false } = {}) {
  const result = normalizeNumber(value, {
    label,
    required,
    defaultValue: null,
    integer: true,
    min: 0,
    exclusiveMin: true,
  });
  if (result.error) {
    return { error: required && isBlank(value) ? result.error : `${label} must be a valid selection.` };
  }
  return result;
}

function normalizeBoolean(value, fallback = false) {
  if (isBlank(value)) return fallback;
  if (value === true || value === 1 || value === "1") return true;
  if (value === false || value === 0 || value === "0") return false;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "yes", "on"].includes(normalized)) return true;
    if (["false", "no", "off"].includes(normalized)) return false;
  }
  return fallback;
}

module.exports = {
  cleanText,
  isBlank,
  normalizeBoolean,
  normalizeDateOnly,
  normalizeNumber,
  normalizePositiveId,
};
