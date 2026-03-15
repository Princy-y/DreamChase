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

  async function handleLogin(email, password) {
    const loginBtn = document.getElementById("loginBtn");
    const originalText = loginBtn.innerHTML;
    
    // Show a loading state
    loginBtn.innerHTML = `<span class="btn-text">Authenticating...</span>`;
    loginBtn.style.pointerEvents = 'none';

    try {
      // 🚀 Send the data to your real Python Backend!
      const response = await fetch('http://127.0.0.1:5000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (data.success) {
        // Successful Login! Save the REAL data from the backend
        localStorage.setItem("userName", data.name);
        localStorage.setItem("userEmail", data.email);
        
        // Teleport to dashboard
        window.location.href = "dashboard.html";
      } else {
        // Show the error from Python (like "Incorrect Password")
        alert(data.error);
        loginBtn.innerHTML = originalText;
        loginBtn.style.pointerEvents = 'auto';
      }
      
    } catch (err) {
      console.error("Backend connection failed:", err);
      alert("Backend server is disconnected! Is server.py running?");
      loginBtn.innerHTML = originalText;
      loginBtn.style.pointerEvents = 'auto';
    }
  }
})();