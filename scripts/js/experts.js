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
    confirmBtn.disabled = !getSelectedExpert(expertRadios, expertMap);
  }

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
    if (modalNameEl) modalNameEl.textContent = ex.name;

    if (confirmModalEl) new bootstrap.Modal(confirmModalEl).show();
    onConfirmed?.(ex);
  });

  setConfirmEnabled();

  return {
    isConfirmed: () => confirmed,
    getSelected: () => getSelectedExpert(expertRadios, expertMap),
    setConfirmed: (v) => (confirmed = !!v)
  };
}