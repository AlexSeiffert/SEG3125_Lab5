// scripts/js/experts.js
export function getSelectedExpert(expertRadios, expertMap) {
  const sel = expertRadios.find((r) => r.checked);
  if (!sel) return null;
  return { id: sel.id, ...expertMap[sel.id] };
}

export function initExperts({
  expertRadios,
  expertMap,
  confirmBtn,
  confirmModalEl,
  modalNameEl,
  onConfirmed
}) {
  let confirmed = false;

  function setConfirmEnabled() {
    const ex = getSelectedExpert(expertRadios, expertMap);
    confirmBtn.disabled = !ex; // FIX: button becomes clickable immediately after selecting a radio
  }

  // FIX: ensure enabling logic runs whenever selection changes
  expertRadios.forEach((r) =>
    r.addEventListener("change", () => {
      confirmed = false;
      setConfirmEnabled();
    })
  );

  confirmBtn.addEventListener("click", () => {
    const ex = getSelectedExpert(expertRadios, expertMap);
    if (!ex) return;

    confirmed = true;

    if (modalNameEl) modalNameEl.textContent = ex.name || "—";
    if (confirmModalEl) new bootstrap.Modal(confirmModalEl).show();

    onConfirmed?.(ex);
  });

  // FIX: initial state
  setConfirmEnabled();

  return {
    isConfirmed: () => confirmed,
    getSelected: () => getSelectedExpert(expertRadios, expertMap),

    // Compatibility for booking.js versions that expect these:
    getSelectedId: () => getSelectedExpert(expertRadios, expertMap)?.id || null,
    getSelectedName: () => getSelectedExpert(expertRadios, expertMap)?.name || "",

    setConfirmed: (v) => (confirmed = !!v)
  };
}