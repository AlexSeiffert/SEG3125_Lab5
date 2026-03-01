// Main entry point for app
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

const $ = (id) => document.getElementById(id);

document.addEventListener("DOMContentLoaded", () => {
  // Initialize Bootstrap tooltips
  document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach((el) => {
    try {
      new bootstrap.Tooltip(el);
    } catch {}
  });

  // Get DOM elements for expert selection
  const expertRadios = Array.from(
    document.querySelectorAll('input[name="expert"]'),
  );
  const confirmExpertBtn = $("confirmExpertBtn");
  const expertConfirmModalEl = $("expertConfirmModal");
  const expertModalNameEl = $("expertModalName");

  // Get DOM elements for services
  const servicesGrid = $("servicesGrid");
  const servicesLockedMsg = $("servicesLockedMsg");
  const serviceRadios = Array.from(
    document.querySelectorAll('input[name="service"]'),
  );
  const btnNextService = $("btnNextService");

  // Get DOM elements for booking
  const dateEl = $("date");
  const timeEl = $("time");
  const pickupEl = $("pickup");
  const earliestPickupEl = $("earliestPickup");
  const pickupHintEl = $("pickupHint");
  const dateHelpEl = $("dateHelp");
  const btnNextSchedule = $("btnNextSchedule");

  // Get DOM elements for contact info
  const nameEl = $("name");
  const phoneEl = $("phone");
  const emailEl = $("email");
  const notesEl = $("notes");
  const btnNextContact = $("btnNextContact");
  const contactFormAlert = $("contactFormAlert");

  // Get DOM elements for payment
  const btnNextPayment = $("btnNextPayment");
  const paymentFormAlert = $("paymentFormAlert");

  // Get DOM elements for summary
  const summaryEls = {
    expertLine: $("summaryExpertLine"),
    serviceLine: $("summaryServiceLine"),
    dateLine: $("summaryDateLine"),
    timeLine: $("summaryTimeLine"),
    pickupLine: $("summaryPickupLine"),
  };

  // Get DOM elements for modals
  const confirmModalEls = {
    confirmModalEl: $("confirmModal"),
    modalExpert: $("modalExpert"),
    modalService: $("modalService"),
    modalDate: $("modalDate"),
    modalTime: $("modalTime"),
    modalPickup: $("modalPickup"),
    modalName: $("modalName"),
  };

  // Get DOM elements for admin
  const adminBody = $("adminBookingsBody");
  const clearAllBtn = $("clearAllBtn");

  // Validate required DOM elements
  const criticalMissing = [];
  if (!confirmExpertBtn) criticalMissing.push("#confirmExpertBtn");
  if (expertRadios.length === 0) criticalMissing.push('input[name="expert"]');
  if (!servicesGrid) criticalMissing.push("#servicesGrid");
  if (!servicesLockedMsg) criticalMissing.push("#servicesLockedMsg");
  if (serviceRadios.length === 0) criticalMissing.push('input[name="service"]');

  if (criticalMissing.length) {
    console.error(
      "Startup aborted. Missing critical DOM nodes:",
      criticalMissing,
    );
    return;
  }

  // Initialize admin table
  try {
    if (adminBody && clearAllBtn) initAdmin(adminBody, clearAllBtn);
  } catch (e) {
    console.warn("initAdmin failed (ignored):", e);
  }

  // Lock services until expert is confirmed
  try {
    setServicesEnabled({
      enabled: false,
      servicesGrid,
      lockedMsg: servicesLockedMsg,
      serviceRadios,
    });
  } catch (e) {
    console.warn("setServicesEnabled failed (ignored):", e);
  }

  // Enable/disable confirm mechanic button
  const updateConfirmMechanicBtn = () => {
    confirmExpertBtn.disabled = !expertRadios.some((r) => r.checked);
  };
  expertRadios.forEach((r) =>
    r.addEventListener("change", updateConfirmMechanicBtn),
  );
  updateConfirmMechanicBtn();

  // Initialize expert selection
  let expertApi = null;
  try {
    expertApi = initExperts({
      expertRadios,
      expertMap: EXPERT_MAP,
      confirmBtn: confirmExpertBtn,
      confirmModalEl: expertConfirmModalEl,
      modalNameEl: expertModalNameEl,
      onConfirmed: () => {
        setServicesEnabled({
          enabled: true,
          servicesGrid,
          lockedMsg: servicesLockedMsg,
          serviceRadios,
        });
        setTimeout(() => scrollToId("services"), 200);
      },
    });
  } catch (e) {
    console.error("initExperts failed:", e);
  }

  // Fallback expert API if init fails
  if (!expertApi) {
    expertApi = {
      isConfirmed: () => false,
      getSelected: () => null,
      getSelectedId: () => null,
      getSelectedName: () => "",
      setConfirmed: () => {},
    };
  }

  // Initialize booking flow logic
  try {
    initBookingFlow({
      SERVICE_MAP,
      TIMES,
      expertApi,
      expertMap: EXPERT_MAP,
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
      formAlert: contactFormAlert,
      summaryEls,
      confirmModalEls,
      adminBody,
      renderBookings,
      expertRadios,
    });
  } catch (e) {
    console.error("initBookingFlow failed:", e);
  }
});
