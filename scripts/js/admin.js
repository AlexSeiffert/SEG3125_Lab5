import { loadBookings, saveBookings } from "./storage.js";

export function renderBookings(adminBody) {
  const bookings = loadBookings();
  adminBody.innerHTML = "";

  if (bookings.length === 0) {
    adminBody.innerHTML = `<tr><td colspan="8" class="text-secondary">No appointments yet.</td></tr>`;
    return;
  }

  for (const b of bookings) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${b.expertName}</td>
      <td>
        <div class="fw-semibold">${b.serviceName}</div>
        <div class="text-secondary small">${b.servicePrice} • ${b.durationLabel}</div>
      </td>
      <td>${b.date}</td>
      <td>${b.startTime}</td>
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

export function initAdmin(adminBody, clearAllBtn) {
  adminBody.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-del]");
    if (!btn) return;
    const id = btn.getAttribute("data-del");
    const next = loadBookings().filter((b) => b.id !== id);
    saveBookings(next);
    renderBookings(adminBody);
  });

  clearAllBtn.addEventListener("click", () => {
    saveBookings([]);
    renderBookings(adminBody);
  });

  renderBookings(adminBody);
}