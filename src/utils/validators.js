export function isValidUrl(value) {
  if (typeof value !== "string" || value.trim() === "") {
    return false;
  }

  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function parseBoolean(value, defaultValue = false) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value === 1;
  }

  if (typeof value === "string") {
    const lower = value.toLowerCase();
    if (lower === "true") {
      return true;
    }
    if (lower === "false") {
      return false;
    }
  }

  return defaultValue;
}

export function parsePositiveInt(value, defaultValue = null) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return defaultValue;
  }

  return parsed;
}

export function parseDateInput(value, mode = "start") {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  if (typeof value === "string" && value.length <= 10) {
    if (mode === "start") {
      date.setHours(0, 0, 0, 0);
    }
    if (mode === "end") {
      date.setHours(23, 59, 59, 999);
    }
  }

  return date.toISOString();
}
