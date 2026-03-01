// Local storage for bookings
export const KEY = "acs_bookings_v5";

// Load bookings from localStorage
export function loadBookings() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

// Save bookings to localStorage
export function saveBookings(bookings) {
  localStorage.setItem(KEY, JSON.stringify(bookings));
}
