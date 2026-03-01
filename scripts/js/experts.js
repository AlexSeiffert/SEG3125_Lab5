// Expert selection logic

// Get the selected expert from radio buttons
export function getSelectedExpert(expertRadios, expertMap) {
  const sel = expertRadios.find((r) => r.checked);
  if (!sel) return null;
  return { id: sel.id, ...expertMap[sel.id] };
}

// Initialize expert selection controls
export function initExperts({
  expertRadios,
  expertMap,
  confirmBtn,
  confirmModalEl,
  modalNameEl,
  onConfirmed,
}) {
  let confirmed = false;

  function setConfirmEnabled() {
    const ex = getSelectedExpert(expertRadios, expertMap);
    confirmBtn.disabled = !ex; // Enable/disable confirm button
  }

  // Update confirm button when selection changes
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

    if (modalNameEl) modalNameEl.textContent = ex.name || "—";
    if (confirmModalEl) new bootstrap.Modal(confirmModalEl).show();

    onConfirmed?.(ex);
  });

  // Set initial confirm button state
  setConfirmEnabled();

  return {
    isConfirmed: () => confirmed,
    getSelected: () => getSelectedExpert(expertRadios, expertMap),

    // Compatibility for booking.js
    getSelectedId: () => getSelectedExpert(expertRadios, expertMap)?.id || null,
    getSelectedName: () =>
      getSelectedExpert(expertRadios, expertMap)?.name || "",

    setConfirmed: (v) => (confirmed = !!v),
  };
}
