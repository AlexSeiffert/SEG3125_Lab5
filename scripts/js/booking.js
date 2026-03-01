import { loadBookings, saveBookings } from "./storage.js";
import {
  parseTimeToMinutes,
  minutesToTimeStr,
  isWithinHours,
  overlaps,
  isBusinessDayStr,
  scrollToId,
} from "./utils.js";

import { getSelectedService } from "./services.js";

export function initBookingFlow(ctx) {
  const {
    SERVICE_MAP,
    TIMES,
    expertApi,
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
    adminBody,
    renderBookings,
    // Payment section
    cardholderNameEl,
    cardNumberEl,
    expirationDateEl,
    cvcEl,
    paymentConfirmBtn,
    paymentFormAlert,
  } = ctx;

  const { OPEN_MIN, CLOSE_MIN, STEP_MIN } = TIMES;

  function setEnabledAnchor(a, enabled) {
    a.classList.toggle("disabled", !enabled);
    a.setAttribute("aria-disabled", enabled ? "false" : "true");
  }

  function showAlert(msg) {
    formAlert.textContent = msg;
    formAlert.classList.remove("d-none");
  }

  function clearAlert() {
    formAlert.classList.add("d-none");
    formAlert.textContent = "";
  }

  function buildTimeOptions(
    selectEl,
    startMin,
    endMin,
    stepMin,
    includeBlank,
    blankLabel,
  ) {
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
  }

  function isDateValid() {
    return (
      dateEl.value && dateEl.checkValidity() && isBusinessDayStr(dateEl.value)
    );
  }

  function isTimeValid() {
    const m = parseTimeToMinutes(timeEl.value);
    return timeEl.checkValidity() && isWithinHours(m, OPEN_MIN, CLOSE_MIN);
  }

  function computeEarliestPickupMinutes() {
    const svc = getSelectedService(serviceRadios, SERVICE_MAP);
    const startMin = parseTimeToMinutes(timeEl.value);
    if (!svc || startMin === null) return null;
    const endMin = startMin + svc.durationMinutes;
    if (endMin > CLOSE_MIN) return null;
    return endMin;
  }

  function updateEarliestPickupUI() {
    const earliest = computeEarliestPickupMinutes();
    if (earliest === null) {
      earliestPickupEl.textContent = "—";
      buildTimeOptions(
        pickupEl,
        OPEN_MIN,
        CLOSE_MIN,
        STEP_MIN,
        true,
        "Auto (earliest pickup)",
      );
      pickupHintEl.textContent = "";
      return;
    }
    const earliestStr = minutesToTimeStr(earliest);
    earliestPickupEl.textContent = earliestStr;
    buildTimeOptions(
      pickupEl,
      earliest,
      CLOSE_MIN,
      STEP_MIN,
      true,
      `Auto (${earliestStr})`,
    );
    pickupHintEl.textContent =
      "Pickup must be at/after earliest pickup and within 10:00–18:00 (15-min steps).";
  }

  function isPickupValidOrEmpty(earliestMin) {
    if (!pickupEl.value) return true;
    const p = parseTimeToMinutes(pickupEl.value);
    return p !== null && p >= earliestMin && p <= CLOSE_MIN;
  }

  function updateDateHelp() {
    if (!dateHelpEl) return;
    if (dateEl.value && !isBusinessDayStr(dateEl.value)) {
      dateHelpEl.classList.remove("text-secondary");
      dateHelpEl.classList.add("text-danger");
      dateHelpEl.innerHTML =
        '<i class="bi bi-exclamation-triangle me-1"></i>Sunday is not available. Please choose Mon–Sat.';
    } else {
      dateHelpEl.classList.remove("text-danger");
      dateHelpEl.classList.add("text-secondary");
      dateHelpEl.innerHTML =
        '<i class="bi bi-info-circle me-1"></i>Choose a future date. Sunday is not available.';
    }
  }

  function updateSummary() {
    const ex = expertApi.getSelected();
    summaryEls.expertLine.innerHTML = ex
      ? `<i class="bi bi-check2 me-1"></i>${ex.name}${expertApi.isConfirmed() ? "" : " <span class='text-secondary'>(not confirmed)</span>"}`
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
  }

  function wouldConflict(newDate, newStartMin, newEndMin) {
    const bookings = loadBookings();
    for (const b of bookings) {
      if (b.date !== newDate) continue;
      const bStart = parseTimeToMinutes(b.startTime);
      const bEnd = parseTimeToMinutes(b.endTime);
      if (bStart === null || bEnd === null) continue;
      if (overlaps(newStartMin, newEndMin, bStart, bEnd)) return b;
    }
    return null;
  }

  function createBookingOrError() {
    const ex = expertApi.getSelected();
    if (!ex || !expertApi.isConfirmed())
      return { error: "Please confirm a mechanic first." };

    const svc = getSelectedService(serviceRadios, SERVICE_MAP);
    if (!svc) return { error: "Please select a service." };

    if (dateEl.value && !isBusinessDayStr(dateEl.value)) {
      dateEl.value = "";
      updateDateHelp();
      return { error: "Sunday is not available. Please choose Mon–Sat." };
    }

    if (!isDateValid())
      return { error: "Please select a valid future date (Mon–Sat only)." };
    if (!isTimeValid())
      return { error: "Please select a start time within 10:00–18:00." };

    const startMin = parseTimeToMinutes(timeEl.value);
    const endMin = startMin + svc.durationMinutes;
    if (endMin > CLOSE_MIN)
      return {
        error:
          "This service would end after 18:00. Choose an earlier start time.",
      };

    const earliestPickupStr = minutesToTimeStr(endMin);
    let pickupStr = pickupEl.value || earliestPickupStr;

    const pickupMin = parseTimeToMinutes(pickupStr);
    if (pickupMin === null || pickupMin < endMin) {
      return {
        error: `Pickup must be at/after earliest pickup (${earliestPickupStr}).`,
      };
    }

    if (/\d/.test(nameEl.value))
      return { error: "Name cannot contain numbers." };
    if (
      !(
        nameEl.checkValidity() &&
        phoneEl.checkValidity() &&
        emailEl.checkValidity()
      )
    ) {
      return { error: "Please complete your contact info (name/phone/email)." };
    }

    const conflict = wouldConflict(dateEl.value, startMin, endMin);
    if (conflict)
      return {
        error: `Time conflict: another appointment overlaps (${conflict.startTime}–${conflict.endTime}).`,
      };

    return {
      booking: {
        id: String(Date.now()),
        expertId: ex.id,
        expertName: ex.name,
        serviceId: svc.id,
        serviceName: svc.name,
        servicePrice: svc.price,
        durationLabel: svc.durationLabel,
        durationMinutes: svc.durationMinutes,
        date: dateEl.value,
        startTime: timeEl.value,
        endTime: minutesToTimeStr(endMin),
        pickupTime: pickupStr,
        name: nameEl.value.trim(),
        phone: phoneEl.value.trim(),
        email: emailEl.value.trim(),
        notes: (notesEl.value || "").trim(),
        createdAt: new Date().toISOString(),
      },
    };
  }

  function rebuildStartTimes() {
    const svc = getSelectedService(serviceRadios, SERVICE_MAP);
    const maxStart = svc ? CLOSE_MIN - svc.durationMinutes : CLOSE_MIN;
    buildTimeOptions(
      timeEl,
      OPEN_MIN,
      maxStart,
      STEP_MIN,
      true,
      "Select a time",
    );
  }

  function updateControls() {
    clearAlert();

    const svc = getSelectedService(serviceRadios, SERVICE_MAP);
    setEnabledAnchor(btnNextService, expertApi.isConfirmed() && !!svc);

    updateDateHelp();
    rebuildStartTimes();
    updateEarliestPickupUI();

    const hasSchedule = isDateValid() && isTimeValid();
    setEnabledAnchor(
      btnNextSchedule,
      expertApi.isConfirmed() && !!svc && hasSchedule,
    );

    const earliest = computeEarliestPickupMinutes();
    const pickupOK = earliest === null ? true : isPickupValidOrEmpty(earliest);

    confirmBtn.disabled = !(
      expertApi.isConfirmed() &&
      !!svc &&
      hasSchedule &&
      pickupOK &&
      nameEl.checkValidity() &&
      phoneEl.checkValidity() &&
      emailEl.checkValidity() &&
      !/\d/.test(nameEl.value)
    );

    // Payment section validation
    let paymentValid = true;
    if (cardholderNameEl && cardNumberEl && expirationDateEl && cvcEl) {
      paymentValid =
        cardholderNameEl.value.trim().length > 0 &&
        cardNumberEl.value.replace(/\s+/g, "").length >= 13 &&
        /^\d{4} \d{4} \d{4} \d{4}$/.test(cardNumberEl.value) &&
        /^(0[1-9]|1[0-2])\/\d{2}$/.test(expirationDateEl.value) &&
        /^[0-9]{3,4}$/.test(cvcEl.value);
      paymentConfirmBtn.disabled = !paymentValid;
    }

    updateSummary();
  }

  // Events
  // Payment section events
  if (
    cardholderNameEl &&
    cardNumberEl &&
    expirationDateEl &&
    cvcEl &&
    paymentConfirmBtn
  ) {
    [cardholderNameEl, cardNumberEl, expirationDateEl, cvcEl].forEach((el) => {
      el.addEventListener("input", updateControls);
    });

    paymentConfirmBtn.addEventListener("click", () => {
      paymentFormAlert.classList.add("d-none");
      if (!cardholderNameEl.value.trim()) {
        paymentFormAlert.textContent = "Cardholder name required.";
        paymentFormAlert.classList.remove("d-none");
        return;
      }
      if (!/^\d{4} \d{4} \d{4} \d{4}$/.test(cardNumberEl.value)) {
        paymentFormAlert.textContent =
          "Card number must be 16 digits (format: 1234 5678 9012 3456).";
        paymentFormAlert.classList.remove("d-none");
        return;
      }
      if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(expirationDateEl.value)) {
        paymentFormAlert.textContent = "Expiration must be MM/YY.";
        paymentFormAlert.classList.remove("d-none");
        return;
      }
      if (!/^[0-9]{3,4}$/.test(cvcEl.value)) {
        paymentFormAlert.textContent = "CVC must be 3 or 4 digits.";
        paymentFormAlert.classList.remove("d-none");
        return;
      }
      // If all valid, show success and scroll to summary
      paymentFormAlert.classList.add("d-none");
      paymentFormAlert.textContent = "";
      setTimeout(() => scrollToId("summary"), 250);
    });
  }
  serviceRadios.forEach((r) =>
    r.addEventListener("change", () => {
      updateControls();
      if (expertApi.isConfirmed()) setTimeout(() => scrollToId("booking"), 200);
    }),
  );

  dateEl.addEventListener("change", () => {
    if (dateEl.value && !isBusinessDayStr(dateEl.value)) dateEl.value = "";
    updateControls();
  });

  [timeEl, pickupEl].forEach((el) =>
    el.addEventListener("change", updateControls),
  );
  [nameEl, phoneEl, emailEl, notesEl].forEach((el) =>
    el.addEventListener("input", updateControls),
  );

  confirmBtn.addEventListener("click", () => {
    clearAlert();
    updateControls();

    const res = createBookingOrError();
    if (res.error) return showAlert(res.error);

    const bookings = loadBookings();
    bookings.unshift(res.booking);
    saveBookings(bookings);

    renderBookings(adminBody);

    // modal fill
    confirmModalEls.modalExpert.textContent = res.booking.expertName;
    confirmModalEls.modalService.textContent = `${res.booking.serviceName} (${res.booking.servicePrice})`;
    confirmModalEls.modalDate.textContent = res.booking.date;
    confirmModalEls.modalTime.textContent = res.booking.startTime;
    confirmModalEls.modalPickup.textContent = res.booking.pickupTime;
    confirmModalEls.modalName.textContent = res.booking.name;

    new bootstrap.Modal(confirmModalEls.confirmModalEl).show();

    // smooth to summary (requested)
    setTimeout(() => scrollToId("summary"), 250);
  });

  // Init: no past dates
  dateEl.min = new Date().toISOString().slice(0, 10);
  buildTimeOptions(
    timeEl,
    OPEN_MIN,
    CLOSE_MIN,
    STEP_MIN,
    true,
    "Select a time",
  );
  buildTimeOptions(
    pickupEl,
    OPEN_MIN,
    CLOSE_MIN,
    STEP_MIN,
    true,
    "Auto (earliest pickup)",
  );
  updateControls();

  return { updateControls };
}
