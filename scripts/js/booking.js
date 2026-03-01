// Booking flow logic
import { loadBookings, saveBookings } from "./storage.js";
import { scrollToId, showToast } from "./utils.js";
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
  btnNextContact,
  btnNextPayment,
  formAlert,
  summaryEls,
  confirmModalEls,
  adminBody,
  renderBookings,
  expertRadios,
}) {
  const { OPEN_MIN, CLOSE_MIN, STEP_MIN } = TIMES;

  pickupEl.required = false;
  let lastEarliestPickup = null;

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

  const isBusinessDayStr = (yyyyMmDd) => {
    if (!yyyyMmDd) return false;
    const d = new Date(yyyyMmDd + "T00:00:00");
    const day = d.getDay();
    return day >= 1 && day <= 6; // Mon-Sat
  };

  // Validation functions
  const isDateValid = () =>
    dateEl?.value && dateEl.checkValidity() && isBusinessDayStr(dateEl.value);

  const isTimeValid = () => {
    const m = parseTimeToMinutes(timeEl.value);
    return timeEl.checkValidity() && isWithinHours(m);
  };

  const isContactValid = () =>
    nameEl.checkValidity() &&
    phoneEl.checkValidity() &&
    emailEl.checkValidity() &&
    !/\d/.test(nameEl.value);

  const isPaymentValid = () => {
    const cardholderName = document.getElementById("cardholderName");
    const cardNumber = document.getElementById("cardNumber");
    const expirationDate = document.getElementById("expirationDate");
    const cvc = document.getElementById("cvc");

    return (
      cardholderName?.checkValidity() &&
      cardNumber?.checkValidity() &&
      expirationDate?.checkValidity() &&
      cvc?.checkValidity()
    );
  };

  // UI alert helpers
  const showAlert = (msg) => {
    if (!formAlert) return;
    formAlert.textContent = msg;
    formAlert.classList.remove("d-none");
  };

  const clearAlert = () => {
    if (!formAlert) return;
    formAlert.classList.add("d-none");
    formAlert.textContent = "";
  };

  // Build time select options
  const buildTimeOptions = (
    selectEl,
    startMin,
    endMin,
    stepMin,
    includeBlank,
    blankLabel,
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
    buildTimeOptions(
      timeEl,
      OPEN_MIN,
      maxStart,
      STEP_MIN,
      true,
      "Select a start time",
    );
  };

  // Pickup time calculation
  const computeEarliestPickupMinutes = () => {
    const svc = getSelectedService(serviceRadios, SERVICE_MAP);
    const startMin = parseTimeToMinutes(timeEl.value);
    if (!svc || startMin === null) return null;
    const endMin = startMin + svc.durationMinutes;
    if (endMin > CLOSE_MIN) return null;
    return endMin;
  };

  const updateEarliestPickupUI = () => {
    const earliest = computeEarliestPickupMinutes();

    pickupEl.disabled = earliest === null;
    earliestPickupEl.textContent =
      earliest === null ? "—" : minutesToTimeStr(earliest);

    if (earliest === null) {
      lastEarliestPickup = null;
      pickupEl.innerHTML = "";
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "Auto (earliest pickup)";
      pickupEl.appendChild(opt);
      return;
    }

    if (lastEarliestPickup === earliest && pickupEl.options.length > 0) return;

    const prev = pickupEl.value;

    buildTimeOptions(
      pickupEl,
      earliest,
      CLOSE_MIN,
      STEP_MIN,
      true,
      `Auto (${minutesToTimeStr(earliest)})`,
    );

    if (prev && parseTimeToMinutes(prev) >= earliest) {
      pickupEl.value = prev;
    } else {
      pickupEl.value = "";
    }

    pickupHintEl.textContent =
      "Pickup must be at/after earliest pickup and within 10:00–18:00 (15-min steps).";

    lastEarliestPickup = earliest;
  };

  // Update UI elements
  const updateDateHelp = () => {
    if (!dateHelpEl) return;
    if (dateEl.value && !isBusinessDayStr(dateEl.value)) {
      dateHelpEl.classList.remove("text-secondary");
      dateHelpEl.classList.add("text-danger");
      dateHelpEl.innerHTML =
        '<i class="bi bi-exclamation-triangle me-1"></i>Sunday is not available. Choose Mon–Sat.';
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

  // Booking creation and conflict check
  const overlaps = (aStart, aEnd, bStart, bEnd) =>
    aStart < bEnd && bStart < aEnd;

  const wouldConflict = (expertName, newDate, newStartMin, newEndMin) => {
    const bookings = loadBookings();
    for (const b of bookings) {
      if (b.date !== newDate || b.expertName !== expertName) continue;
      const bStart = parseTimeToMinutes(b.startTime);
      const bEnd = parseTimeToMinutes(b.endTime);
      if (bStart === null || bEnd === null) continue;
      if (overlaps(newStartMin, newEndMin, bStart, bEnd)) return b;
    }
    return null;
  };

  const createBookingOrError = () => {
    const expertName = expertApi.getSelectedName?.();
    if (!expertApi.isConfirmed?.() || !expertName)
      return { error: "Please confirm a mechanic first." };

    const svc = getSelectedService(serviceRadios, SERVICE_MAP);
    if (!svc) return { error: "Please select a service." };

    if (!isDateValid())
      return { error: "Please select a valid date (Mon–Sat only)." };
    if (!isTimeValid())
      return { error: "Please select a start time within 10:00–18:00." };

    const startMin = parseTimeToMinutes(timeEl.value);
    const endMin = startMin + svc.durationMinutes;
    if (endMin > CLOSE_MIN)
      return {
        error: "This service would end after 18:00. Choose an earlier time.",
      };

    if (!isContactValid())
      return { error: "Please complete your contact info (name/phone/email)." };

    if (!isPaymentValid())
      return { error: "Please complete your payment info." };

    const conflict = wouldConflict(expertName, dateEl.value, startMin, endMin);
    if (conflict) {
      return {
        error: `Time conflict: overlaps ${conflict.startTime}–${conflict.endTime}.`,
      };
    }

    const earliestPickupMin = endMin;
    const earliestPickupStr = minutesToTimeStr(earliestPickupMin);
    let pickupStr = pickupEl.value || earliestPickupStr;

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
        pickupTime: pickupStr,
        name: nameEl.value.trim(),
        phone: phoneEl.value.trim(),
        email: emailEl.value.trim(),
        notes: (notesEl.value || "").trim(),
        createdAt: new Date().toISOString(),
      },
    };
  };

  // Main control logic
  const updateControls = () => {
    clearAlert();

    const expertOk = !!expertApi.isConfirmed?.();
    const svc = getSelectedService(serviceRadios, SERVICE_MAP);
    const hasSvc = !!svc;
    const hasSchedule = isDateValid() && isTimeValid();
    const contactOk = isContactValid();
    const paymentOk = isPaymentValid();

    // Enable Next step buttons
    if (btnNextService) {
      btnNextService.classList.toggle("disabled", !(expertOk && hasSvc));
      btnNextService.setAttribute(
        "aria-disabled",
        expertOk && hasSvc ? "false" : "true",
      );
    }

    if (btnNextSchedule) {
      btnNextSchedule.classList.toggle("disabled", !hasSchedule);
      btnNextSchedule.setAttribute(
        "aria-disabled",
        hasSchedule ? "false" : "true",
      );
    }

    if (btnNextContact) {
      const ready = expertOk && hasSvc && hasSchedule && contactOk;
      btnNextContact.classList.toggle("disabled", !ready);
      btnNextContact.setAttribute("aria-disabled", ready ? "false" : "true");
    }

    if (btnNextPayment) {
      const ready = expertOk && hasSvc && hasSchedule && contactOk && paymentOk;
      btnNextPayment.classList.toggle("disabled", !ready);
      btnNextPayment.setAttribute("aria-disabled", ready ? "false" : "true");
    }

    // Enable confirm button only when all info complete
    const confirmBtn = document.getElementById("confirmBtn");
    if (confirmBtn) {
      const allComplete =
        expertOk && hasSvc && hasSchedule && contactOk && paymentOk;
      confirmBtn.disabled = !allComplete;
    }

    updateDateHelp();
    updateEarliestPickupUI();
    updateSummary();
  };

  // Event listeners
  // Service selection change
  serviceRadios.forEach((r) =>
    r.addEventListener("change", () => {
      rebuildStartTimes();
      timeEl.value = "";
      pickupEl.value = "";
      lastEarliestPickup = null;
      updateControls();
      showToast?.("Service selected. Next: pick a date & time.");
      if (expertApi.isConfirmed?.())
        setTimeout(() => scrollToId("booking"), 200);
    }),
  );

  // Date change handler
  dateEl.addEventListener("change", () => {
    if (dateEl.value && !isBusinessDayStr(dateEl.value)) {
      dateEl.value = "";
      showToast?.("Sunday not available. Choose Mon–Sat.");
    }
    updateControls();
  });

  // Time change handler
  timeEl.addEventListener("change", () => {
    lastEarliestPickup = null;
    updateControls();
  });

  // Pickup and contact change
  pickupEl.addEventListener("change", updateControls);
  [nameEl, phoneEl, emailEl, notesEl].forEach((el) =>
    el.addEventListener("input", updateControls),
  );

  // Payment field change
  ["cardholderName", "cardNumber", "expirationDate", "cvc"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("input", updateControls);
  });

  // Next button click handlers
  if (btnNextContact) {
    btnNextContact.addEventListener("click", (e) => {
      if (btnNextContact.classList.contains("disabled")) {
        e.preventDefault();
      }
    });
  }

  if (btnNextPayment) {
    btnNextPayment.addEventListener("click", (e) => {
      if (btnNextPayment.classList.contains("disabled")) {
        e.preventDefault();
      }
    });
  }

  // Confirm button click handler
  const confirmBtn = document.getElementById("confirmBtn");
  if (confirmBtn) {
    confirmBtn.addEventListener("click", (e) => {
      e.preventDefault();

      if (confirmBtn.disabled) {
        showAlert("Please complete all required information.");
        return;
      }

      clearAlert();

      // Validate and create booking
      const res = createBookingOrError();
      if (res.error) {
        showAlert(res.error);
        return;
      }

      try {
        // Save booking
        const bookings = loadBookings();
        bookings.unshift(res.booking);
        saveBookings(bookings);

        // Update admin table
        if (adminBody && renderBookings) {
          renderBookings(adminBody);
        }

        showToast?.(`Booking confirmed for ${res.booking.expertName}!`);

        // Show confirmation modal
        if (confirmModalEls.confirmModalEl && window.bootstrap?.Modal) {
          if (confirmModalEls.modalExpert)
            confirmModalEls.modalExpert.textContent = res.booking.expertName;
          if (confirmModalEls.modalService)
            confirmModalEls.modalService.textContent = `${res.booking.serviceName} (${res.booking.servicePrice})`;
          if (confirmModalEls.modalDate)
            confirmModalEls.modalDate.textContent = res.booking.date;
          if (confirmModalEls.modalTime)
            confirmModalEls.modalTime.textContent = res.booking.startTime;
          if (confirmModalEls.modalPickup)
            confirmModalEls.modalPickup.textContent = res.booking.pickupTime;
          if (confirmModalEls.modalName)
            confirmModalEls.modalName.textContent = res.booking.name;

          const modal = new bootstrap.Modal(confirmModalEls.confirmModalEl);
          modal.show();
        }

        // Reset form after 2 seconds
        setTimeout(() => {
          dateEl.value = "";
          timeEl.value = "";
          pickupEl.value = "";
          nameEl.value = "";
          phoneEl.value = "";
          emailEl.value = "";
          notesEl.value = "";

          document.getElementById("cardholderName").value = "";
          document.getElementById("cardNumber").value = "";
          document.getElementById("expirationDate").value = "";
          document.getElementById("cvc").value = "";

          expertRadios.forEach((r) => (r.checked = false));
          serviceRadios.forEach((r) => (r.checked = false));

          updateControls();
          scrollToId("top");
          showToast?.("Ready for your next booking!");
        }, 2000);
      } catch (error) {
        console.error("Booking error:", error);
        showAlert("Error saving booking. Please try again.");
      }
    });
  }

  // Initialize booking form
  dateEl.min = new Date().toISOString().slice(0, 10);
  rebuildStartTimes();
  updateEarliestPickupUI();
  updateControls();
}
