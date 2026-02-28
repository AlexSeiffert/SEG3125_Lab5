// scripts/js/booking.js
import { loadBookings, saveBookings } from "./storage.js";
import { scrollToId, setEnabledAnchor, showToast } from "./utils.js"; // MODIFIED: import showToast (toast feedback)
import { getSelectedService } from "./services.js";

export function initBookingFlow({
  SERVICE_MAP,
  TIMES,
  expertApi,
  expertMap,
  serviceRadios,
  btnNextService,
  btnNextSchedule,
  dateEl,
  timeEl,
  pickupEl,
  earliestPickupEl,
  pickupHintEl,
  dateHelpEl,
  nameEl,
  phoneEl,
  emailEl,
  notesEl,
  confirmBtn,
  formAlert,
  summaryEls,
  confirmModalEls,
  adminBody
}) {
  const { OPEN_MIN, CLOSE_MIN, STEP_MIN } = TIMES;

  // pickup should be optional (never block Step 3)
  pickupEl.required = false; // (already correct)

  let lastEarliestPickup = null; // used to avoid unnecessary rebuilds

  // MODIFIED: toast flags to avoid spamming
  let didToastService = false;
  let didToastSchedule = false;

  // ===== helpers =====
  const parseTimeToMinutes = (t) => {
    if (!t || !/^\d{2}:\d{2}$/.test(t)) return null;
    const [hh, mm] = t.split(":").map(Number);
    return hh * 60 + mm;
  };

  const minutesToTimeStr = (min) => {
    const hh = Math.floor(min / 60);
    const mm = min % 60;
    return String(hh).padStart(2, "0") + ":" + String(mm).padStart(2, "0");
  };

  const isWithinHours = (mins) =>
    mins !== null && mins >= OPEN_MIN && mins <= CLOSE_MIN;

  const showAlert = (msg) => {
    if (!formAlert) return;
    formAlert.textContent = msg;
    formAlert.classList.remove("d-none");
  };

  const clearAlert = () => {
    if (!formAlert) return;
    formAlert.textContent = "";
    formAlert.classList.add("d-none");
  };

  const isBusinessDayStr = (yyyyMmDd, expertId) => {
    if (!yyyyMmDd) return false;
    const d = new Date(yyyyMmDd + "T00:00:00");
    const day = d.getDay(); // 0=Sun
    const off = expertMap?.[expertId]?.offDays || [0]; // default: Sunday off
    return !off.includes(day);
  };

  const isDateValid = () => {
    const expertId = expertApi.getSelectedId?.();
    return (
      dateEl?.value &&
      dateEl.checkValidity() &&
      isBusinessDayStr(dateEl.value, expertId)
    );
  };

  const isTimeValid = () => {
    const m = parseTimeToMinutes(timeEl.value);
    return timeEl.checkValidity() && isWithinHours(m);
  };

  const computeEarliestPickupMinutes = () => {
    const svc = getSelectedService(serviceRadios, SERVICE_MAP);
    const startMin = parseTimeToMinutes(timeEl.value);
    if (!svc || startMin === null) return null;
    const endMin = startMin + svc.durationMinutes;
    if (endMin > CLOSE_MIN) return null;
    return endMin;
  };

  const isPickupValidOrEmpty = (earliestPickupMin) => {
    if (!pickupEl.value) return true; // blank = auto
    const p = parseTimeToMinutes(pickupEl.value);
    return (
      isWithinHours(p) &&
      earliestPickupMin !== null &&
      p >= earliestPickupMin &&
      p <= CLOSE_MIN
    );
  };

  const isContactValid = () =>
    nameEl.checkValidity() && phoneEl.checkValidity() && emailEl.checkValidity();

  const buildTimeOptions = (
    selectEl,
    startMin,
    endMin,
    stepMin,
    includeBlank,
    blankLabel
  ) => {
    selectEl.innerHTML = "";
    if (includeBlank) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = blankLabel || "Select";
      selectEl.appendChild(opt);
    }
    for (let m = startMin; m <= endMin; m += stepMin) {
      const t = minutesToTimeStr(m);
      const opt = document.createElement("option");
      opt.value = t;
      opt.textContent = t;
      selectEl.appendChild(opt);
    }
  };

  const rebuildStartTimes = () => {
    const svc = getSelectedService(serviceRadios, SERVICE_MAP);
    const maxStart = svc ? CLOSE_MIN - svc.durationMinutes : CLOSE_MIN;
    buildTimeOptions(timeEl, OPEN_MIN, maxStart, STEP_MIN, true, "Select a start time"); // unchanged
  };

  function updateEarliestPickupUI() {
    const earliest = computeEarliestPickupMinutes();

    // enable pickup only when we have enough info (service + start time)
    pickupEl.disabled = earliest === null;

    // show earliest pickup label
    earliestPickupEl.textContent = earliest === null ? "—" : minutesToTimeStr(earliest);

    // If nothing to compute yet, keep a simple list (auto only)
    if (earliest === null) {
      lastEarliestPickup = null;
      pickupEl.innerHTML = "";
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "Auto (earliest pickup)";
      pickupEl.appendChild(opt);
      return;
    }

    // If earliest didn't change, don't rebuild options (prevents iOS “selection snaps back”)
    if (lastEarliestPickup === earliest && pickupEl.options.length > 0) return;

    const prev = pickupEl.value; // preserve user selection

    // rebuild options: blank(auto) + times from earliest..close
    buildTimeOptions(
      pickupEl,
      earliest,
      CLOSE_MIN,
      STEP_MIN,
      true,
      `Auto (${minutesToTimeStr(earliest)})`
    );

    // restore previous selection if still valid, otherwise keep auto
    if (prev && parseTimeToMinutes(prev) >= earliest) {
      pickupEl.value = prev;
    } else {
      pickupEl.value = "";
    }

    pickupHintEl.textContent =
      "Pickup must be at/after earliest pickup and within 10:00–18:00 (15-min steps).";

    lastEarliestPickup = earliest;
  }

  const updateDateHelp = () => {
    if (!dateHelpEl) return;
    const expertId = expertApi.getSelectedId?.();
    if (dateEl.value && !isBusinessDayStr(dateEl.value, expertId)) {
      dateHelpEl.classList.remove("text-secondary");
      dateHelpEl.classList.add("text-danger");
      dateHelpEl.innerHTML =
        '<i class="bi bi-exclamation-triangle me-1"></i>This mechanic is not available that day. Please choose another date.';
    } else {
      dateHelpEl.classList.remove("text-danger");
      dateHelpEl.classList.add("text-secondary");
      dateHelpEl.innerHTML =
        '<i class="bi bi-info-circle me-1"></i>Choose a future date. Sunday is not available.';
    }
  };

  const updateSummary = () => {
    if (!summaryEls) return;

    const expertName = expertApi.getSelectedName?.() || "";
    summaryEls.expertLine.innerHTML = expertName
      ? `<i class="bi bi-check2 me-1"></i>${expertName}`
      : `<i class="bi bi-dash me-1"></i>Select a mechanic`;

    const svc = getSelectedService(serviceRadios, SERVICE_MAP);
    summaryEls.serviceLine.innerHTML = svc
      ? `<i class="bi bi-check2 me-1"></i>${svc.name} — ${svc.price} <span class="text-secondary">(${svc.durationLabel})</span>`
      : `<i class="bi bi-dash me-1"></i>Select a service`;

    summaryEls.dateLine.innerHTML = isDateValid()
      ? `<i class="bi bi-calendar3 me-1"></i>${dateEl.value}`
      : `<i class="bi bi-dash me-1"></i>Selected date will appear here`;

    summaryEls.timeLine.innerHTML = isTimeValid()
      ? `<i class="bi bi-clock me-1"></i>${timeEl.value}`
      : `<i class="bi bi-dash me-1"></i>Selected time will appear here`;

    const earliest = computeEarliestPickupMinutes();
    if (pickupEl.value) {
      summaryEls.pickupLine.innerHTML = `<i class="bi bi-box-arrow-up-right me-1"></i>${pickupEl.value}`;
    } else if (earliest !== null) {
      summaryEls.pickupLine.innerHTML = `<i class="bi bi-box-arrow-up-right me-1"></i>(auto) ${minutesToTimeStr(earliest)}`;
    } else {
      summaryEls.pickupLine.innerHTML = `<i class="bi bi-dash me-1"></i>Pickup time will appear here`;
    }
  };

  const overlaps = (aStart, aEnd, bStart, bEnd) => aStart < bEnd && bStart < aEnd;

  const wouldConflict = (expertName, newDate, newStartMin, newEndMin) => {
    const bookings = loadBookings();
    for (const b of bookings) {
      if (b.date !== newDate) continue;
      if (b.expertName !== expertName) continue; // conflict only within same mechanic
      const bStart = parseTimeToMinutes(b.startTime);
      const bEnd = parseTimeToMinutes(b.endTime);
      if (bStart === null || bEnd === null) continue;
      if (overlaps(newStartMin, newEndMin, bStart, bEnd)) return b;
    }
    return null;
  };

  const createBookingOrError = () => {
    const expertName = expertApi.getSelectedName?.();
    if (!expertApi.isConfirmed?.() || !expertName) return { error: "Please confirm a mechanic first." };

    const svc = getSelectedService(serviceRadios, SERVICE_MAP);
    if (!svc) return { error: "Please select a service." };

    if (!isDateValid()) return { error: "Please select a valid date for this mechanic (Mon–Sat only)." };
    if (!isTimeValid()) return { error: "Please select a start time within 10:00–18:00." };

    const startMin = parseTimeToMinutes(timeEl.value);
    const endMin = startMin + svc.durationMinutes;
    if (endMin > CLOSE_MIN) return { error: "This service would end after 18:00. Choose an earlier time." };

    const earliestPickupMin = endMin;
    const earliestPickupStr = minutesToTimeStr(earliestPickupMin);

    let pickupStr = pickupEl.value;
    if (!pickupStr) pickupStr = earliestPickupStr;
    const pickupMin = parseTimeToMinutes(pickupStr);
    if (pickupMin === null || pickupMin < earliestPickupMin) {
      return { error: `Pickup must be at/after earliest pickup (${earliestPickupStr}).` };
    }

    if (!isContactValid()) return { error: "Please complete your contact info (name/phone/email)." };

    const conflict = wouldConflict(expertName, dateEl.value, startMin, endMin);
    if (conflict) {
      return { error: `Time conflict for ${expertName}: overlaps ${conflict.startTime}–${conflict.endTime}.` };
    }

    return {
      booking: {
        id: String(Date.now()),
        expertName,
        serviceId: svc.id,
        serviceName: svc.name,
        servicePrice: svc.price,
        durationMinutes: svc.durationMinutes,
        durationLabel: svc.durationLabel,
        date: dateEl.value,
        startTime: timeEl.value,
        endTime: minutesToTimeStr(endMin),
        earliestPickupTime: earliestPickupStr,
        pickupTime: pickupStr,
        name: nameEl.value.trim(),
        phone: phoneEl.value.trim(),
        email: emailEl.value.trim(),
        notes: (notesEl.value || "").trim(),
        createdAt: new Date().toISOString()
      }
    };
  };

  // ===== core controller =====
  const updateControls = () => {
    clearAlert();

    // Step2 button: enable when mechanic confirmed + service chosen
    const svc = getSelectedService(serviceRadios, SERVICE_MAP);
    const hasSvc = !!svc;
    const expertOk = !!expertApi.isConfirmed?.();
    setEnabledAnchor(btnNextService, expertOk && hasSvc);

    // Booking section
    updateDateHelp();

    // IMPORTANT: only rebuild start times when service changes (handled by service change handler)
    updateEarliestPickupUI();

    const hasSchedule = isDateValid() && isTimeValid();
    setEnabledAnchor(btnNextSchedule, hasSchedule);

    const earliest = computeEarliestPickupMinutes();
    const pickupOK = isPickupValidOrEmpty(earliest);

    // MODIFIED: auto-fix invalid pickup so Step 3 never gets stuck
    if (pickupEl.value && !pickupOK) {
      pickupEl.value = ""; // back to Auto
      showToast?.("Pickup adjusted to Auto (earliest pickup)."); // MODIFIED: toast feedback
    }

    const ready = expertOk && hasSvc && hasSchedule && isContactValid(); // MODIFIED: pickup never blocks confirm
    confirmBtn.disabled = !ready;

    // MODIFIED: schedule toast
    if (hasSchedule && !didToastSchedule) {
      didToastSchedule = true;
      showToast?.("Schedule selected. Next: enter your details."); // MODIFIED
    }
    if (!hasSchedule) didToastSchedule = false;

    updateSummary();
  };

  // ===== EVENTS =====
  // Service selection must rebuild time options (because duration changes)
  serviceRadios.forEach((r) =>
    r.addEventListener("change", () => {
      rebuildStartTimes();

      // MODIFIED: reset schedule + pickup when service changes
      timeEl.value = "";
      pickupEl.value = "";
      lastEarliestPickup = null;

      didToastService = true;
      didToastSchedule = false;

      updateControls();
      showToast?.("Service selected. Next: pick a date & time."); // MODIFIED: notice

      if (expertApi.isConfirmed?.()) setTimeout(() => scrollToId("booking"), 200);
    })
  );

  // MODIFIED: Date selection — listen to both change + input (iOS)
  const onDateChanged = () => {
    const expertId = expertApi.getSelectedId?.();
    if (dateEl.value && !isBusinessDayStr(dateEl.value, expertId)) {
      dateEl.value = "";
      showToast?.("That mechanic is off that day. Choose another date."); // MODIFIED: notice
    }
    updateControls();
  };
  dateEl.addEventListener("change", onDateChanged); // MODIFIED
  dateEl.addEventListener("input", onDateChanged);  // MODIFIED (iOS)

  // MODIFIED: Time selection — force pickup rebuild once when start time changes
  const onTimeChanged = () => {
    lastEarliestPickup = null; // MODIFIED: force pickup options rebuild once
    updateControls();
  };
  timeEl.addEventListener("change", onTimeChanged); // MODIFIED
  timeEl.addEventListener("input", onTimeChanged);  // MODIFIED (iOS)

  // MODIFIED: Pickup selection — listen to change + input (iOS)
  pickupEl.addEventListener("change", updateControls); // MODIFIED
  pickupEl.addEventListener("input", updateControls);  // MODIFIED (iOS)

  // Contact
  [nameEl, phoneEl, emailEl, notesEl].forEach((el) =>
    el.addEventListener("input", updateControls)
  );

  // Confirm booking
  confirmBtn.addEventListener("click", () => {
    clearAlert();
    updateControls();

    const res = createBookingOrError();
    if (res.error) return showAlert(res.error);

    const bookings = loadBookings();
    bookings.unshift(res.booking);
    saveBookings(bookings);

    // Update admin table
    if (adminBody) {
      adminBody.dispatchEvent(new CustomEvent("acs:refresh-admin"));
    }

    // modal fill
    confirmModalEls.modalExpert.textContent = res.booking.expertName;
    confirmModalEls.modalService.textContent = `${res.booking.serviceName} (${res.booking.servicePrice})`;
    confirmModalEls.modalDate.textContent = res.booking.date;
    confirmModalEls.modalTime.textContent = res.booking.startTime;
    confirmModalEls.modalPickup.textContent = res.booking.pickupTime;
    confirmModalEls.modalName.textContent = res.booking.name;

    new bootstrap.Modal(confirmModalEls.confirmModalEl).show();

    setTimeout(() => scrollToId("summary"), 250);
  });

  // ===== INIT =====
  // future dates only
  const today = new Date();
  dateEl.min = today.toISOString().slice(0, 10);

  // initial build
  rebuildStartTimes();
  updateEarliestPickupUI();
  updateControls();
}