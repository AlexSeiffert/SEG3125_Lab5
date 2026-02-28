// scripts/js/utils.js
export function scrollToId(id, behavior = "smooth") {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior, block: "start" });
}

export function setEnabledAnchor(a, enabled) {
  if (!a) return;
  a.classList.toggle("disabled", !enabled);
  a.setAttribute("aria-disabled", enabled ? "false" : "true");
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

/* Optional: sidebar follow (only runs if DOM exists) */
export function sidebarFollow() {
  const LG_MIN = 992;
  const margin = 16;
  const sidebar = document.getElementById("sidebar");
  const col = document.getElementById("sidebarCol");
  const spacer = document.getElementById("sidebarSpacer");
  const nav = document.querySelector(".navbar.sticky-top");
  if (!sidebar || !col || !spacer) return;

  function reset() {
    sidebar.style.position = "";
    sidebar.style.left = "";
    sidebar.style.width = "";
    sidebar.style.bottom = "";
    sidebar.style.top = "";
    sidebar.style.zIndex = "";
    spacer.style.height = "0px";
  }

  function place() {
    if (window.innerWidth < LG_MIN) return reset();

    const navH = nav ? nav.getBoundingClientRect().height : 0;
    const sidebarH = sidebar.offsetHeight;
    spacer.style.height = sidebarH + "px";

    const colRect = col.getBoundingClientRect();
    const colTop = colRect.top + window.scrollY;
    const colLeft = colRect.left + window.scrollX;
    const colWidth = colRect.width;
    const colBottom = colTop + col.offsetHeight;

    const viewportTop = window.scrollY + navH + margin;
    if (viewportTop < colTop) return reset();

    const desiredTop = window.scrollY + window.innerHeight - margin - sidebarH;
    const maxTop = colBottom - margin - sidebarH;

    if (desiredTop >= maxTop) {
      sidebar.style.position = "absolute";
      sidebar.style.left = "0";
      sidebar.style.width = "100%";
      sidebar.style.top = (maxTop - colTop) + "px";
      sidebar.style.bottom = "";
      sidebar.style.zIndex = "";
      return;
    }

    sidebar.style.position = "fixed";
    sidebar.style.left = colLeft + "px";
    sidebar.style.width = colWidth + "px";
    sidebar.style.bottom = margin + "px";
    sidebar.style.top = "";
    sidebar.style.zIndex = "1010";
  }

  

  window.addEventListener("scroll", place, { passive: true });
  window.addEventListener("resize", place);
  window.addEventListener("load", place);
  place();
}
export function showToast(message) {
    const toastEl = document.getElementById("acsToast");
    const bodyEl = document.getElementById("acsToastBody");
    if (!toastEl || !bodyEl || !window.bootstrap?.Toast) return;

    bodyEl.textContent = message;
    const t = bootstrap.Toast.getOrCreateInstance(toastEl, { delay: 1800 });
    t.show();
  }