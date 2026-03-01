import { initAdmin, renderBookings } from "./admin.js";
import { initExperts } from "./experts.js";
import { setServicesEnabled } from "./services.js";
import { initBookingFlow } from "./booking.js";
import { scrollToId } from "./utils.js";

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
  "exp-alex": { name: "Alex Nguyen" },
  "exp-maya": { name: "Maya Patel" },
  "exp-jordan": { name: "Jordan Lee" },
  "exp-sofia": { name: "Sofia Romero" },
};

const TIMES = { OPEN_MIN: 10 * 60, CLOSE_MIN: 18 * 60, STEP_MIN: 15 };

function $(id) {
  return document.getElementById(id);
}

document.addEventListener("DOMContentLoaded", () => {
  // Tooltips
  document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach((el) => {
    try {
      new bootstrap.Tooltip(el);
    } catch {}
  });

  // DOM
  const expertRadios = Array.from(
    document.querySelectorAll('input[name="expert"]'),
  );
  const confirmExpertBtn = $("confirmExpertBtn");

  const servicesGrid = $("servicesGrid");
  const servicesLockedMsg = $("servicesLockedMsg");
  const serviceRadios = Array.from(
    document.querySelectorAll('input[name="service"]'),
  );

  const adminBody = $("adminBookingsBody");
  const clearAllBtn = $("clearAllBtn");

  // Admin
  initAdmin(adminBody, clearAllBtn);

  // Lock services initially
  setServicesEnabled({
    enabled: false,
    servicesGrid,
    lockedMsg: servicesLockedMsg,
    serviceRadios,
  });

  // Experts
  const expertApi = initExperts({
    expertRadios,
    expertMap: EXPERT_MAP,
    confirmBtn: confirmExpertBtn,
    confirmModalEl: $("expertConfirmModal"),
    modalNameEl: $("expertModalName"),
    onConfirmed: () => {
      // unlock services on confirm
      setServicesEnabled({
        enabled: true,
        servicesGrid,
        lockedMsg: servicesLockedMsg,
        serviceRadios,
      });
      setTimeout(() => scrollToId("services"), 250);
    },
  });

  // Booking flow
  initBookingFlow({
    SERVICE_MAP,
    TIMES,
    expertApi,
    serviceRadios,
    btnNextService: $("btnNextService"),
    btnNextSchedule: $("btnNextSchedule"),
    dateEl: $("date"),
    timeEl: $("time"),
    pickupEl: $("pickup"),
    earliestPickupEl: $("earliestPickup"),
    pickupHintEl: $("pickupHint"),
    dateHelpEl: $("dateHelp"),
    nameEl: $("name"),
    phoneEl: $("phone"),
    emailEl: $("email"),
    notesEl: $("notes"),
    confirmBtn: $("confirmBtn"),
    formAlert: $("formAlert"),
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
    // Payment section
    cardholderNameEl: $("cardholderName"),
    cardNumberEl: $("cardNumber"),
    expirationDateEl: $("expirationDate"),
    cvcEl: $("cvc"),
    paymentConfirmBtn: $("paymentConfirmBtn"),
    paymentFormAlert: $("paymentFormAlert"),
  });
});
