// scripts/js/booking.js
import { loadBookings, saveBookings } from "./storage.js";
import { scrollToId, setEnabledAnchor, showToast } from "./utils.js";
import { getSelectedService } from "./services.js";

export function initBookingFlow({
  SERVICE_MAP,
  TIMES,
  expertApi,
  expertMap, // optional (for offDays)
  serviceRadios,

  btnNextService,
  btnNextSchedule,
  btnNextContact,
  btnNextPayment,

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
  phoneValidEl,
  contactFormAlertEl,

  cardholderNameEl,
  cardNumberEl,
  expirationDateEl,
  cvcEl,
  cardholderNameFeedbackEl,
  cardNumberFeedbackEl,
  expirationDateFeedbackEl,
  cvcFeedbackEl,
  paymentFormAlertEl,

  confirmBtn,
  summaryEls,
  confirmModalEls,
  adminBody,
  renderBookings,
}) {
  const { OPEN_MIN, CLOSE_MIN, STEP_MIN } = TIMES;

  // pickup is optional (must never block progressing)
  if (pickupEl) pickupEl.required = false;

  let lastEarliestPickup = null;

  // Step-confirm modal (shared)
  const stepModalEl = document.getElementById("stepConfirmModal");
  const stepTitleEl = document.getElementById("stepConfirmTitle");
  const stepBodyEl = document.getElementById("stepConfirmBody");
  const stepModal =
    stepModalEl && window.bootstrap?.Modal
      ? bootstrap.Modal.getOrCreateInstance(stepModalEl)
      : null;

  const showStepConfirm = ({ title, bodyHtml }) => {
    if (stepModal && stepTitleEl && stepBodyEl) {
      stepTitleEl.innerHTML = `<i class="bi bi-check2-circle text-success me-2"></i>${title}`;
      stepBodyEl.innerHTML = bodyHtml || "—";
      stepModal.show();
      return true;
    }
    return false;
  };

  // helpers
  // Helper: get disabled days for selected expert
  function getDisabledDays(expertId) {
    const weekends = [0]; // Sunday
    const expertOff = expertMap?.[expertId]?.offDays || [];
    return Array.from(new Set([...weekends, ...expertOff]));
  }

  // Flatpickr integration
  // Adapted from flatpickr docs and customized to disable days based on expert selection
  let fpInstance = null;

  function setupFlatpickr() {
    if (!dateEl) return;

    if (fpInstance) {
      fpInstance.destroy();
      fpInstance = null;
    }

    const expertId = expertApi?.getSelectedId?.();
    const disabledDays = getDisabledDays(expertId);

    fpInstance = flatpickr(dateEl, {
      dateFormat: "Y-m-d",
      minDate: "today",

      disable: [
        function (date) {
          return disabledDays.includes(date.getDay());
        },
      ],

      onDayCreate: function (dObj, dStr, fp, dayElem) {
        const day = dayElem.dateObj.getDay();

        if (disabledDays.includes(day)) {
          dayElem.classList.add("flatpickr-disabled");
        }
      },

      onChange: function () {
        updateDateHelp();
        updateControls();
      },
    });
  }
  // Helper: get disabled days for selected expert
  function getDisabledDays(expertId) {
    // 0: Sunday, 1: Monday, ..., 6: Saturday
    // Only Sunday (0) is always disabled
    const weekends = [0];
    const expertOff = expertMap?.[expertId]?.offDays || [];
    // Merge Sunday and expert off-days, remove duplicates
    return Array.from(new Set([...weekends, ...expertOff]));
  }

  // Helper: update calendar UI to disable days
  function updateCalendarDisabledDays() {
    if (!dateEl) return;
    const expertId = expertApi?.getSelectedId?.();
    const disabledDays = getDisabledDays(expertId);

    // If using <input type="date">, can't disable days natively, so use feedback and styling
    // Add a class to the input if the selected day is disabled
    if (dateEl.value) {
      const d = new Date(dateEl.value + "T00:00:00");
      if (disabledDays.includes(d.getDay())) {
        dateEl.classList.add("disabled-day");
        dateEl.title = "This day is unavailable for booking.";
      } else {
        dateEl.classList.remove("disabled-day");
        dateEl.title = "";
      }
    }
  }

  // Add CSS for disabled-day
  if (typeof window !== "undefined") {
    const style = document.createElement("style");
    style.innerHTML = `.disabled-day { background: #eee !important; color: #888 !important; border-color: #ccc !important; }`;
    document.head.appendChild(style);
  }
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

  const phoneRegex = /^(\+1[\s.\-]?)?\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4}$/;

  const clearAlert = (el) => {
    if (!el) return;
    el.textContent = "";
    el.classList.add("d-none");
  };

  const showAlert = (el, msg) => {
    if (!el) return;
    el.textContent = msg;
    el.classList.remove("d-none");
  };

  const isBusinessDayStr = (yyyyMmDd, expertId) => {
    if (!yyyyMmDd) return false;
    const d = new Date(yyyyMmDd + "T00:00:00");
    const day = d.getDay();
    // Weekends always disabled, plus expert off-days
    const disabledDays = getDisabledDays(expertId);
    return !disabledDays.includes(day);
  };

  const isDateValid = () => {
    const expertId = expertApi?.getSelectedId?.();
    return !!(
      dateEl?.value &&
      dateEl.checkValidity() &&
      isBusinessDayStr(dateEl.value, expertId)
    );
  };

  const isTimeValid = () => {
    const m = parseTimeToMinutes(timeEl?.value);
    return !!(timeEl && timeEl.checkValidity() && isWithinHours(m));
  };

  const getSvc = () => getSelectedService(serviceRadios, SERVICE_MAP);

  const computeEarliestPickupMinutes = () => {
    const svc = getSvc();
    const startMin = parseTimeToMinutes(timeEl?.value);
    if (!svc || startMin === null) return null;
    const endMin = startMin + svc.durationMinutes;
    if (endMin > CLOSE_MIN) return null;
    return endMin;
  };

  const isPickupValidOrEmpty = (earliestPickupMin) => {
    if (!pickupEl) return true;
    if (!pickupEl.value) return true;
    const p = parseTimeToMinutes(pickupEl.value);
    return (
      isWithinHours(p) &&
      earliestPickupMin !== null &&
      p >= earliestPickupMin &&
      p <= CLOSE_MIN
    );
  };

  const isContactValid = () => {
    const base =
      !!nameEl?.value &&
      nameEl.checkValidity() &&
      !!phoneEl?.value &&
      phoneEl.checkValidity() &&
      !!emailEl?.value &&
      emailEl.checkValidity();

    const phoneOK = !!phoneEl?.value && phoneRegex.test(phoneEl.value);
    if (phoneValidEl) phoneValidEl.classList.toggle("d-none", phoneOK);

    return base && phoneOK;
  };

  const isPaymentValid = () => {
    if (!cardholderNameEl || !cardNumberEl || !expirationDateEl || !cvcEl)
      return false;

    const nameOK = cardholderNameEl.checkValidity();

    const digits = (cardNumberEl.value || "").replace(/[^\d]/g, "");
    const cardOK = /^\d{16}$/.test(digits);

    const expOK = expirationDateEl.checkValidity();
    const cvcOK = cvcEl.checkValidity();

    if (cardholderNameFeedbackEl)
      cardholderNameFeedbackEl.classList.toggle("d-none", nameOK);
    if (cardNumberFeedbackEl)
      cardNumberFeedbackEl.classList.toggle("d-none", cardOK);
    if (expirationDateFeedbackEl)
      expirationDateFeedbackEl.classList.toggle("d-none", expOK);
    if (cvcFeedbackEl) cvcFeedbackEl.classList.toggle("d-none", cvcOK);

    return nameOK && cardOK && expOK && cvcOK;
  };

  const buildTimeOptions = (
    selectEl,
    startMin,
    endMin,
    stepMin,
    includeBlank,
    blankLabel,
  ) => {
    if (!selectEl) return;
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
    const svc = getSvc();
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

  function updateEarliestPickupUI() {
    if (!pickupEl || !earliestPickupEl) return;

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
      if (pickupHintEl) pickupHintEl.textContent = "";
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

    if (prev && parseTimeToMinutes(prev) >= earliest) pickupEl.value = prev;
    else pickupEl.value = "";

    if (pickupHintEl) {
      pickupHintEl.textContent =
        "Pickup must be at/after earliest pickup and within 10:00–18:00 (15-min steps).";
    }

    lastEarliestPickup = earliest;
  }

  const updateDateHelp = () => {
    if (!dateHelpEl || !dateEl) return;
    const expertId = expertApi?.getSelectedId?.();
    const weekends = [0, 6];
    const disabledDays = getDisabledDays(expertId);
    if (dateEl.value) {
      const d = new Date(dateEl.value + "T00:00:00");
      if (disabledDays.includes(d.getDay())) {
        dateHelpEl.classList.remove("text-secondary");
        dateHelpEl.classList.add("text-danger");
        let dayName = d.toLocaleDateString(undefined, { weekday: "long" });
        let expertName = expertApi?.getSelectedName?.() || "this expert";
        let offMsg = weekends.includes(d.getDay())
          ? `${dayName} is a weekend and unavailable for booking.`
          : `${expertName} is not available on ${dayName}.`;
        dateHelpEl.innerHTML = `<i class="bi bi-exclamation-triangle me-1"></i>${offMsg} Please choose another date.`;
      } else {
        dateHelpEl.classList.remove("text-danger");
        dateHelpEl.classList.add("text-secondary");
        dateHelpEl.innerHTML = `<i class="bi bi-info-circle me-1"></i>Choose an available day. Weekends and expert off-days are disabled.`;
      }
    } else {
      dateHelpEl.classList.remove("text-danger");
      dateHelpEl.classList.add("text-secondary");
      dateHelpEl.innerHTML = `<i class="bi bi-info-circle me-1"></i>Select a date to see availability.`;
    }
  };

  const updateSummary = () => {
    if (!summaryEls) return;

    const expertName = expertApi?.getSelectedName?.() || "";
    summaryEls.expertLine.innerHTML = expertName
      ? `<i class="bi bi-check2 me-1"></i>${expertName}`
      : `<i class="bi bi-dash me-1"></i>Select a mechanic`;

    const svc = getSvc();
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
    if (pickupEl && pickupEl.value) {
      summaryEls.pickupLine.innerHTML = `<i class="bi bi-box-arrow-up-right me-1"></i>${pickupEl.value}`;
    } else if (earliest !== null) {
      summaryEls.pickupLine.innerHTML = `<i class="bi bi-box-arrow-up-right me-1"></i>(auto) ${minutesToTimeStr(earliest)}`;
    } else {
      summaryEls.pickupLine.innerHTML = `<i class="bi bi-dash me-1"></i>Pickup time will appear here`;
    }
  };

  const overlaps = (aStart, aEnd, bStart, bEnd) =>
    aStart < bEnd && bStart < aEnd;

  const wouldConflict = (expertName, newDate, newStartMin, newEndMin) => {
    const bookings = loadBookings();
    for (const b of bookings) {
      if (b.date !== newDate) continue;
      if (b.expertName !== expertName) continue;
      const bStart = parseTimeToMinutes(b.startTime);
      const bEnd = parseTimeToMinutes(b.endTime);
      if (bStart === null || bEnd === null) continue;
      if (overlaps(newStartMin, newEndMin, bStart, bEnd)) return b;
    }
    return null;
  };

  const createBookingOrError = () => {
    const expertName = expertApi?.getSelectedName?.();
    if (!expertApi?.isConfirmed?.() || !expertName)
      return { error: "Please confirm a mechanic first." };

    const svc = getSvc();
    if (!svc) return { error: "Please select a service." };

    if (!isDateValid())
      return {
        error: "Please select a valid date for this mechanic (Mon–Sat only).",
      };
    if (!isTimeValid())
      return { error: "Please select a start time within 10:00–18:00." };

    const startMin = parseTimeToMinutes(timeEl.value);
    const endMin = startMin + svc.durationMinutes;
    if (endMin > CLOSE_MIN)
      return {
        error: "This service would end after 18:00. Choose an earlier time.",
      };

    const earliestPickupMin = endMin;
    const earliestPickupStr = minutesToTimeStr(earliestPickupMin);

    let pickupStr = pickupEl?.value || "";
    if (!pickupStr) pickupStr = earliestPickupStr;

    const pickupMin = parseTimeToMinutes(pickupStr);
    if (pickupMin === null || pickupMin < earliestPickupMin) {
      return {
        error: `Pickup must be at/after earliest pickup (${earliestPickupStr}).`,
      };
    }

    if (!isContactValid())
      return {
        error: "Please complete your contact info (valid phone required).",
      };
    if (!isPaymentValid())
      return { error: "Please complete valid payment info." };

    const conflict = wouldConflict(expertName, dateEl.value, startMin, endMin);
    if (conflict) {
      return {
        error: `Time conflict for ${expertName}: overlaps ${conflict.startTime}–${conflict.endTime}.`,
      };
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
        createdAt: new Date().toISOString(),
      },
    };
  };

  const isAnchorEnabled = (a) =>
    !!a &&
    !a.classList.contains("disabled") &&
    a.getAttribute("aria-disabled") !== "true";

  // controller
  const updateControls = () => {
    clearAlert(contactFormAlertEl);
    clearAlert(paymentFormAlertEl);

    const expertOk = !!expertApi?.isConfirmed?.();
    const hasSvc = !!getSvc();

    setEnabledAnchor(btnNextService, expertOk && hasSvc);

    updateDateHelp();
    updateEarliestPickupUI();

    const hasSchedule = expertOk && hasSvc && isDateValid() && isTimeValid();
    setEnabledAnchor(btnNextSchedule, hasSchedule);

    const contactOk = hasSchedule && isContactValid();
    setEnabledAnchor(btnNextContact, contactOk);

    const paymentOk = contactOk && isPaymentValid();
    setEnabledAnchor(btnNextPayment, paymentOk);

    const earliest = computeEarliestPickupMinutes();
    const pickupOk = isPickupValidOrEmpty(earliest);
    if (confirmBtn) confirmBtn.disabled = !(paymentOk && pickupOk);

    updateSummary();

    // Disable date/time/pickup until mechanic and service are selected
    if (dateEl) dateEl.disabled = !(expertOk && hasSvc);
    if (timeEl) timeEl.disabled = !(expertOk && hasSvc);
    if (pickupEl) pickupEl.disabled = !(expertOk && hasSvc);

    // Disable contact info until schedule is valid
    if (nameEl) nameEl.disabled = !hasSchedule;
    if (phoneEl) phoneEl.disabled = !hasSchedule;
    if (emailEl) emailEl.disabled = !hasSchedule;
    if (notesEl) notesEl.disabled = !hasSchedule;

    // Disable payment info until contact info is valid
    if (cardholderNameEl) cardholderNameEl.disabled = !contactOk;
    if (cardNumberEl) cardNumberEl.disabled = !contactOk;
    if (expirationDateEl) expirationDateEl.disabled = !contactOk;
    if (cvcEl) cvcEl.disabled = !contactOk;
  };

  //  EVENTS
  // Listen for expert change to update flatpickr
  if (expertApi?.onChange) {
    expertApi.onChange(() => {
      if (dateEl) dateEl.value = ""; // Clears old date
      setupFlatpickr();
      updateDateHelp();
      updateControls();
    });
  }
  // Initial setup
  setupFlatpickr();
  // Listen for expert change and date change to update calendar UI
  if (expertApi?.onChange) {
    expertApi.onChange(() => {
      updateCalendarDisabledDays();
      updateDateHelp();
      updateControls();
    });
  }
  if (dateEl) {
    dateEl.addEventListener("input", () => {
      updateCalendarDisabledDays();
      updateDateHelp();
      updateControls();
    });
    // Initial update
    updateCalendarDisabledDays();
    updateDateHelp();
    updateControls();
  }
  // Service selection should NOT auto-scroll; only update state
  serviceRadios.forEach((r) => {
    r.addEventListener("change", () => {
      rebuildStartTimes();
      if (
        timeEl?.value &&
        !Array.from(timeEl.options).some((o) => o.value === timeEl.value)
      ) {
        timeEl.value = "";
      }
      updateControls();
    });
  });

  if (timeEl) timeEl.addEventListener("change", updateControls);
  if (pickupEl) pickupEl.addEventListener("change", updateControls);

  [nameEl, phoneEl, emailEl, notesEl].forEach(
    (el) => el && el.addEventListener("input", updateControls),
  );
  [cardholderNameEl, cardNumberEl, expirationDateEl, cvcEl].forEach(
    (el) => el && el.addEventListener("input", updateControls),
  );

  if (btnNextService) {
    btnNextService.addEventListener("click", (e) => {
      if (!isAnchorEnabled(btnNextService)) return e.preventDefault();
      e.preventDefault();

      const svc = getSvc();
      const expertName = expertApi?.getSelectedName?.() || "—";

      const shown = showStepConfirm({
        title: "Service confirmed",
        bodyHtml: `<p class="mb-0">You selected: <span class="fw-semibold">${svc?.name || "—"}</span>. Next: pick date & time.</p>`,
      });

      if (!shown) showToast(`Service confirmed: ${svc?.name || "—"}.`);
      scrollToId("booking");
    });
  }

  if (btnNextSchedule) {
    btnNextSchedule.addEventListener("click", (e) => {
      if (!isAnchorEnabled(btnNextSchedule)) return e.preventDefault();
      e.preventDefault();

      const earliest = computeEarliestPickupMinutes();
      const pickupStr =
        pickupEl?.value ||
        (earliest !== null ? minutesToTimeStr(earliest) : "—");

      const shown = showStepConfirm({
        title: "Schedule confirmed",
        bodyHtml: `
          <ul class="mb-0">
            <li><span class="fw-semibold">Date:</span> ${dateEl?.value || "—"}</li>
            <li><span class="fw-semibold">Start:</span> ${timeEl?.value || "—"}</li>
            <li><span class="fw-semibold">Pickup:</span> ${pickupStr}</li>
          </ul>
        `,
      });

      if (!shown) showToast("Schedule confirmed.");
      scrollToId("contact");
    });
  }

  if (btnNextContact) {
    btnNextContact.addEventListener("click", (e) => {
      if (!isAnchorEnabled(btnNextContact)) return e.preventDefault();
      e.preventDefault();

      const shown = showStepConfirm({
        title: "Contact confirmed",
        bodyHtml: `<p class="mb-0">Contact info recorded for <span class="fw-semibold">${nameEl?.value?.trim() || "—"}</span>. Next: payment info.</p>`,
      });

      if (!shown) showToast("Contact confirmed.");
      scrollToId("payment");
    });
  }

  if (btnNextPayment) {
    btnNextPayment.addEventListener("click", (e) => {
      if (!isAnchorEnabled(btnNextPayment)) return e.preventDefault();
      e.preventDefault();

      const digits = (cardNumberEl?.value || "").replace(/[^\d]/g, "");
      const last4 = digits.length >= 4 ? digits.slice(-4) : "—";

      const shown = showStepConfirm({
        title: "Payment validated",
        bodyHtml: `<p class="mb-0">Card ending <span class="fw-semibold">${last4}</span> looks valid. Review summary next.</p>`,
      });

      if (!shown) showToast("Payment validated.");
      scrollToId("summary");
    });
  }

  // Final confirm booking
  if (confirmBtn) {
    confirmBtn.addEventListener("click", () => {
      clearAlert(contactFormAlertEl);
      clearAlert(paymentFormAlertEl);
      updateControls();

      const res = createBookingOrError();
      if (res.error) {
        if (!isContactValid()) showAlert(contactFormAlertEl, res.error);
        else if (!isPaymentValid()) showAlert(paymentFormAlertEl, res.error);
        showToast(res.error);
        return;
      }

      const bookings = loadBookings();
      bookings.unshift(res.booking);
      saveBookings(bookings);

      if (typeof renderBookings === "function" && adminBody)
        renderBookings(adminBody);

      if (confirmModalEls?.modalExpert)
        confirmModalEls.modalExpert.textContent = res.booking.expertName;
      if (confirmModalEls?.modalService)
        confirmModalEls.modalService.textContent = `${res.booking.serviceName} (${res.booking.servicePrice})`;
      if (confirmModalEls?.modalDate)
        confirmModalEls.modalDate.textContent = res.booking.date;
      if (confirmModalEls?.modalTime)
        confirmModalEls.modalTime.textContent = res.booking.startTime;
      if (confirmModalEls?.modalPickup)
        confirmModalEls.modalPickup.textContent = res.booking.pickupTime;
      if (confirmModalEls?.modalName)
        confirmModalEls.modalName.textContent = res.booking.name;

      if (confirmModalEls?.confirmModalEl)
        new bootstrap.Modal(confirmModalEls.confirmModalEl).show();
      showToast("Booking saved.");
    });
  }

  // INIT
  if (dateEl) {
    const today = new Date();
    dateEl.min = today.toISOString().slice(0, 10);
  }

  rebuildStartTimes();
  updateEarliestPickupUI();
  updateControls();
}
