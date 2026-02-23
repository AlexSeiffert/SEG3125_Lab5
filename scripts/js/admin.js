// Admin logic
import { loadBookings, saveBookings } from "./storage.js";
import { parseTimeToMinutes, overlaps } from "./utils.js";

const adminBody = document.getElementById("adminBookingsBody");
const clearAllBtn = document.getElementById("clearAllBtn");

function renderBookings() {
  const bookings = loadBookings();
  adminBody.innerHTML = "";
  if (bookings.length === 0) {
    adminBody.innerHTML = `<tr><td colspan="8" class="text-secondary">No appointments yet.</td></tr>`;
    return;
  }
  for (const b of bookings) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>
        <div class="fw-semibold">${b.serviceName}</div>
        <div class="text-secondary small">${b.servicePrice} • ${b.durationLabel}</div>
      </td>
      <td>${b.date}</td>
      <td>${b.startTime}</td>
      <td>${b.earliestPickupTime}</td>
      <td>${b.pickupTime}</td>
      <td>
        <div class="fw-semibold">${b.name}</div>
        <div class="text-secondary small">${b.phone} • ${b.email}</div>
      </td>
      <td class="text-secondary small">${b.notes ? b.notes : "—"}</td>
      <td class="text-end">
        <button type="button" class="btn btn-outline-danger btn-sm" data-del="${b.id}">
          <i class="bi bi-x-circle me-1"></i>Delete
        </button>
      </td>
    `;
    adminBody.appendChild(tr);
  }
}

adminBody.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-del]");
  if (!btn) return;
  const id = btn.getAttribute("data-del");
  const bookings = loadBookings().filter((b) => b.id !== id);
  saveBookings(bookings);
  renderBookings();
});

clearAllBtn.addEventListener("click", () => {
  saveBookings([]);
  renderBookings();
});

renderBookings();
