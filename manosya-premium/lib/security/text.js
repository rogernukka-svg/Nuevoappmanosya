export function cleanText(value, { maxLength = 1000 } = {}) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

export function assertHumanText(value, { minLength = 1, maxLength = 1000, label = "Texto" } = {}) {
  const clean = cleanText(value, { maxLength });
  if (clean.length < minLength) {
    throw new Error(`${label} es demasiado corto.`);
  }
  return clean;
}
