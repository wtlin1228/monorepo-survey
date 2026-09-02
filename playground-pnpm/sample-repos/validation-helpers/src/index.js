export function isSku(value) {
  return typeof value === "string" && /^[A-Z]{3}-\d{6}$/.test(value);
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
