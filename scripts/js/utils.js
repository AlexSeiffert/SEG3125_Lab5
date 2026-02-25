export function scrollToId(id, behavior = "smooth") {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior, block: "start" });
}

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

export function isWithinHours(mins, openMin, closeMin) {
  return mins !== null && mins >= openMin && mins <= closeMin;
}

export function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

// Mon–Sat only
export function isBusinessDayStr(yyyyMmDd) {
  if (!yyyyMmDd) return false;
  const d = new Date(yyyyMmDd + "T00:00:00");
  const day = d.getDay(); // 0=Sun ... 6=Sat
  return day >= 1 && day <= 6;
}