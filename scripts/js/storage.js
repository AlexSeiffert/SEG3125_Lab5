export const KEY = "acs_bookings_v5";

export function loadBookings() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveBookings(bookings) {
  localStorage.setItem(KEY, JSON.stringify(bookings));
}