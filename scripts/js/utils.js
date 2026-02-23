// Utility functions
export function parseTimeToMinutes(t) {
  if (!t || !/^\d{2}:\d{2}$/.test(t)) return null;
  const [hh, mm] = t.split(":").map(Number);
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return hh * 60 + mm;
}
export function minutesToTimeStr(min) {
  const hh = Math.floor(min / 60);
  const mm = min % 60;
  return String(hh).padStart(2, "0") + ":" + String(mm).padStart(2, "0");
}
export function isWithinHours(mins, OPEN_MIN, CLOSE_MIN) {
  return mins !== null && mins >= OPEN_MIN && mins <= CLOSE_MIN;
}
export function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}
