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

export function validateCard() {
  const cardValid = document.getElementById("cardNumberFeedback");
  const regex = /^\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{4}$/;
  const cardNumber = document.getElementById("cardNumber");
  const isValid = regex.test(cardNumber.value);

  if (isValid) {
    cardValid.classList.add("d-none");
  } else {
    cardValid.classList.remove("d-none");
  }
}

export function validatecvc() {
  const cvcValid = document.getElementById("cvcFeedback");
  const regex = /^\d{3}$/;
  const cvc = document.getElementById("cvc");
  const isValid = regex.test(cvc.value);

  if (isValid) {
    cvcValid.classList.add("d-none");
  } else {
    cvcValid.classList.remove("d-none");
  }
}

export function validateExpiration() {
  const expValid = document.getElementById("expirationDateFeedback");
  const regex = /^(0[1-9]|1[0-2])\/?([0-9]{2})$/;
  const exp = document.getElementById("expirationDate");
  const isValid = regex.test(exp.value);
  if (isValid) {
    expValid.classList.add("d-none");
  } else {
    expValid.classList.remove("d-none");
  }
}
