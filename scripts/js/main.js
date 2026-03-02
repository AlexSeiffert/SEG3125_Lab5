// scripts/js/main.js
import { initAdmin, renderBookings } from "./admin.js";
import { initExperts } from "./experts.js";
import { setServicesEnabled } from "./services.js";
import { initBookingFlow } from "./booking.js";
import { scrollToId, showToast } from "./utils.js";

const SERVICE_MAP = {
  "svc-basic": {
    name: "Basic Tune-Up",
    price: "$79",
    durationLabel: "~60 min",
    durationMinutes: 60,
  },
  "svc-full": {
    name: "Full Tune-Up",
    price: "$149",
    durationLabel: "~120 min",
    durationMinutes: 120,
  },
  "svc-flat": {
    name: "Flat Repair",
    price: "$25+",
    durationLabel: "~30 min",
    durationMinutes: 30,
  },
  "svc-brakes": {
    name: "Brake Service",
    price: "$35+",
    durationLabel: "~30–45 min",
    durationMinutes: 45,
  },
};

const EXPERT_MAP = {
  "exp-alex": {
    name: "Alex Nguyen",
    offDays: [0, 2], // Sunday, Tuesday
  },
  "exp-maya": {
    name: "Maya Patel",
    offDays: [0, 1], // Sunday, Monday
  },
  "exp-jordan": {
    name: "Jordan Lee",
    offDays: [0, 4], // Sunday, Thursday
  },
  "exp-sofia": {
    name: "Sofia Romero",
    offDays: [0, 6], // Sunday, Saturday
  },
};

const TIMES = { OPEN_MIN: 10 * 60, CLOSE_MIN: 18 * 60, STEP_MIN: 15 };

const $ = (id) => document.getElementById(id);

document.addEventListener("DOMContentLoaded", () => {
  // tooltips
  document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach((el) => {
    try {
      new bootstrap.Tooltip(el);
    } catch {}
  });

  // Admin
  const adminBody = $("adminBookingsBody");
  const clearAllBtn = $("clearAllBtn");
  initAdmin(adminBody, clearAllBtn);

  // Services lock
  const servicesGrid = $("servicesGrid");
  const servicesLockedMsg = $("servicesLockedMsg");
  const serviceRadios = Array.from(
    document.querySelectorAll('input[name="service"]'),
  );
  setServicesEnabled({
    enabled: false,
    servicesGrid,
    lockedMsg: servicesLockedMsg,
    serviceRadios,
  });

  // Experts
  const expertRadios = Array.from(
    document.querySelectorAll('input[name="expert"]'),
  );
  const confirmExpertBtn = $("confirmExpertBtn");

  const expertApi = initExperts({
    expertRadios,
    expertMap: EXPERT_MAP,
    confirmBtn: confirmExpertBtn,
    confirmModalEl: $("expertConfirmModal"),
    modalNameEl: $("expertModalName"),
    onConfirmed: () => {
      setServicesEnabled({
        enabled: true,
        servicesGrid,
        lockedMsg: servicesLockedMsg,
        serviceRadios,
      });
      showToast("Mechanic confirmed. Services unlocked.");
      setTimeout(() => scrollToId("services"), 250);
    },
  });

  // Booking flow
  initBookingFlow({
    SERVICE_MAP,
    TIMES,
    expertApi,
    expertMap: EXPERT_MAP,
    serviceRadios,

    // step buttons
    btnNextService: $("btnNextService"),
    btnNextSchedule: $("btnNextSchedule"),
    btnNextContact: $("btnNextContact"),
    btnNextPayment: $("btnNextPayment"),

    // schedule
    dateEl: $("date"),
    timeEl: $("time"),
    pickupEl: $("pickup"),
    earliestPickupEl: $("earliestPickup"),
    pickupHintEl: $("pickupHint"),
    dateHelpEl: $("dateHelp"),

    // contact
    nameEl: $("name"),
    phoneEl: $("phone"),
    emailEl: $("email"),
    notesEl: $("notes"),
    phoneValidEl: $("phoneValid"),
    contactFormAlertEl: $("contactFormAlert"),

    // payment
    cardholderNameEl: $("cardholderName"),
    cardNumberEl: $("cardNumber"),
    expirationDateEl: $("expirationDate"),
    cvcEl: $("cvc"),
    cardholderNameFeedbackEl: $("cardholderNameFeedback"),
    cardNumberFeedbackEl: $("cardNumberFeedback"),
    expirationDateFeedbackEl: $("expirationDateFeedback"),
    cvcFeedbackEl: $("cvcFeedback"),
    paymentFormAlertEl: $("paymentFormAlert"),

    // summary + confirm
    confirmBtn: $("confirmBtn"),
    summaryEls: {
      expertLine: $("summaryExpertLine"),
      serviceLine: $("summaryServiceLine"),
      dateLine: $("summaryDateLine"),
      timeLine: $("summaryTimeLine"),
      pickupLine: $("summaryPickupLine"),
    },
    confirmModalEls: {
      confirmModalEl: $("confirmModal"),
      modalExpert: $("modalExpert"),
      modalService: $("modalService"),
      modalDate: $("modalDate"),
      modalTime: $("modalTime"),
      modalPickup: $("modalPickup"),
      modalName: $("modalName"),
    },

    adminBody,
    renderBookings,
  });
});
