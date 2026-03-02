// scripts/js/experts.js
// MODIFIED: Step 1 now uses the SAME "stepConfirmModal" style used by later steps + restores auto-scroll to Step 2.

import { showToast, scrollToId } from "./utils.js";

export function getSelectedExpert(expertRadios, expertMap) {
  const sel = expertRadios.find((r) => r.checked);
  if (!sel) return null;
  return { id: sel.id, ...expertMap[sel.id] };
}

export function initExperts({
  expertRadios,
  expertMap,
  confirmBtn,
  confirmModalEl, // legacy fallback (optional)
  modalNameEl,    // legacy fallback (optional)
  onConfirmed,
}) {
  let confirmed = false;

  // MODIFIED: use the shared step confirm modal (same style as Steps 2–4)
  const stepModalEl = document.getElementById("stepConfirmModal");
  const stepTitleEl = document.getElementById("stepConfirmTitle");
  const stepBodyEl = document.getElementById("stepConfirmBody");
  const stepModal =
    stepModalEl && window.bootstrap?.Modal
      ? bootstrap.Modal.getOrCreateInstance(stepModalEl)
      : null;

  function setConfirmEnabled() {
    const ex = getSelectedExpert(expertRadios, expertMap);
    confirmBtn.disabled = !ex;
  }

  function showMechanicConfirmed(ex) {
    if (stepModal && stepTitleEl && stepBodyEl) {
      // MODIFIED: same title/icon styling as later steps
      stepTitleEl.innerHTML = `<i class="bi bi-check2-circle text-success me-2"></i>Mechanic confirmed`;
      stepBodyEl.innerHTML = `
        <p class="mb-0">
          You selected: <span class="fw-semibold">${ex?.name || "—"}</span>.
          Services are now unlocked.
        </p>
      `;
      stepModal.show();
    } else if (confirmModalEl) {
      // Fallback to old modal if stepConfirmModal is missing
      if (modalNameEl) modalNameEl.textContent = ex?.name || "—";
      new bootstrap.Modal(confirmModalEl).show();
    }

    // Optional: toast for quick feedback (keeps behavior consistent across steps)
    showToast(`Mechanic confirmed: ${ex?.name || "—"}. Services are now unlocked.`);
  }

  // selection change
  expertRadios.forEach((r) =>
    r.addEventListener("change", () => {
      confirmed = false;
      setConfirmEnabled();
    }),
  );

  confirmBtn.addEventListener("click", () => {
    const ex = getSelectedExpert(expertRadios, expertMap);
    if (!ex) return;

    confirmed = true;

    // MODIFIED: show Step-1 confirmation in same style modal
    showMechanicConfirmed(ex);

    // unlock services, etc.
    onConfirmed?.(ex);

    // MODIFIED: restore auto-scroll to Step 2 after confirming mechanic
    // (scrolling behind the modal is fine; user closes the modal and sees Step 2)
    setTimeout(() => scrollToId("services"), 250);
  });

  setConfirmEnabled();

  return {
    isConfirmed: () => confirmed,
    getSelected: () => getSelectedExpert(expertRadios, expertMap),
    getSelectedId: () => getSelectedExpert(expertRadios, expertMap)?.id || null,
    getSelectedName: () => getSelectedExpert(expertRadios, expertMap)?.name || "",
    setConfirmed: (v) => (confirmed = !!v),
  };
}