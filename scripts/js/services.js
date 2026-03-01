// Service selection and enable/disable logic

// Get the selected service from radio buttons
export function getSelectedService(serviceRadios, serviceMap) {
  const sel = serviceRadios.find((r) => r.checked);
  if (!sel) return null;
  return { id: sel.id, ...serviceMap[sel.id] };
}

// Enable or disable service selection controls
export function setServicesEnabled({
  enabled,
  servicesGrid,
  lockedMsg,
  serviceRadios,
}) {
  servicesGrid.setAttribute("aria-disabled", enabled ? "false" : "true");
  lockedMsg.classList.toggle("d-none", enabled);

  serviceRadios.forEach((r) => (r.disabled = !enabled));

  if (!enabled) {
    serviceRadios.forEach((r) => (r.checked = false));
  }
}
