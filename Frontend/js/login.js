(function () {
  "use strict";

  const navbar = document.getElementById("navbar");
  window.addEventListener(
    "scroll",
    () => navbar.classList.toggle("scrolled", window.scrollY > 20),
    { passive: true }
  );

  const toggleBtn = document.getElementById("togglePassword");
  const pwdInput = document.getElementById("loginPassword");

  if (toggleBtn && pwdInput) {
    toggleBtn.addEventListener("click", () => {
      const isHidden = pwdInput.type === "password";
      pwdInput.type = isHidden ? "text" : "password";
      toggleBtn.querySelector(".eye-open").style.display = isHidden
        ? "none"
        : "block";
      toggleBtn.querySelector(".eye-closed").style.display = isHidden
        ? "block"
        : "none";
      toggleBtn.setAttribute(
        "aria-label",
        isHidden ? "Hide password" : "Show password"
      );
    });
  }

  const form = document.getElementById("loginForm");
  const emailInput = document.getElementById("loginEmail");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    let valid = true;

    [emailInput, pwdInput].forEach((input) => {
      const field = input.closest(".login-field");
      if (!input.value.trim()) {
        valid = false;
        field.classList.add("shake");
        field.addEventListener(
          "animationend",
          () => field.classList.remove("shake"),
          { once: true }
        );
      }
    });

    if (!valid) return;

    handleLogin(emailInput.value.trim(), pwdInput.value);
  });

  function handleLogin(email, password) {
    //  fetch('/api/login', { method: 'POST', body: JSON.stringify({ email, password }) })
    console.log("[DreamChase] Login submitted:", { email });
  }
})();
