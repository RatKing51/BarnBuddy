function parseDate(value) {
  if (!value) return null;
  const datePart = String(value).slice(0, 10);
  const [year, month, day] = datePart.split("-").map(Number);
  if (!year || !month || !day) return null;

  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

function plural(value, unit) {
  return `${value} ${unit}${value === 1 ? "" : "s"}`;
}

export function getAgeYears(birthdate, today = new Date()) {
  const birthDate = parseDate(birthdate);
  if (!birthDate) return null;

  let years = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  const dayDiff = today.getDate() - birthDate.getDate();

  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    years--;
  }

  return Math.max(0, years);
}

export function formatAgeFromBirthdate(birthdate, today = new Date()) {
  const birthDate = parseDate(birthdate);
  if (!birthDate) return "";

  if (birthDate > today) return "";

  let years = today.getFullYear() - birthDate.getFullYear();
  let months = today.getMonth() - birthDate.getMonth();
  let days = today.getDate() - birthDate.getDate();

  if (days < 0) {
    months--;
    const previousMonthLastDay = new Date(today.getFullYear(), today.getMonth(), 0).getDate();
    days += previousMonthLastDay;
  }

  if (months < 0) {
    years--;
    months += 12;
  }

  if (years > 0) {
    return months > 0
      ? `${plural(years, "year")}, ${plural(months, "month")}`
      : plural(years, "year");
  }

  if (months > 0) {
    return days > 0
      ? `${plural(months, "month")}, ${plural(days, "day")}`
      : plural(months, "month");
  }

  return plural(days, "day");
}

export function formatAnimalAge(animal) {
  const birthdateAge = formatAgeFromBirthdate(animal?.birthdate);
  if (birthdateAge) return birthdateAge;

  const years = Number.parseInt(animal?.age, 10);
  return Number.isFinite(years) ? plural(Math.max(0, years), "year") : "";
}
