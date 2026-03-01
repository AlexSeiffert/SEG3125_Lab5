// Phone number validation logic
// Validate phone number format and update UI
export function validatePhone() {
  console.log("Initializing validation...");
  const phoneValid = document.getElementById("phoneValid");
  const regex = /^(\+1[\s.\-]?)?\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4}$/;
  const phone = document.getElementById("phone");

  const isValid = regex.test(phone.value);

  if (isValid) {
    console.log("Phone number is valid.");
    phoneValid.classList.add("d-none");
  } else {
    console.log("Phone number is invalid.");
    phoneValid.classList.remove("d-none");
  }
}
