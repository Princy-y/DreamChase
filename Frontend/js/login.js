import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCMOlDgUqwwbZmNQXDMTgm3RJ0g8w_aHOI",
  authDomain: "dreamchase-4ecd1.firebaseapp.com",
  projectId: "dreamchase-4ecd1",
  storageBucket: "dreamchase-4ecd1.firebasestorage.app",
  messagingSenderId: "340567768826",
  appId: "1:340567768826:web:a9dee29b883c9da56d9343"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

document.addEventListener('DOMContentLoaded', () => {

    const googleBtn = Array.from(document.querySelectorAll('button, a')).find(el => el.textContent.includes('Google'));

    if (googleBtn) {
        googleBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            
            const originalHTML = googleBtn.innerHTML;
            googleBtn.innerHTML = `Connecting... `;
            googleBtn.style.pointerEvents = 'none';

            try {
                const result = await signInWithPopup(auth, provider);
                const user = result.user;

                localStorage.setItem("userName", user.displayName);
                localStorage.setItem("userEmail", user.email);

                window.location.href = "dashboard.html";

            } catch (error) {
                console.error("Firebase Login Error:", error);
                alert("Oops! Google Sign-in failed: " + error.message);
                
                googleBtn.innerHTML = originalHTML;
                googleBtn.style.pointerEvents = 'auto';
            }
        });
    }



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
    
    loginBtn.innerHTML = `<span class="btn-text">Authenticating...</span>`;
    loginBtn.style.pointerEvents = 'none';

    try {
      const response = await fetch('http://127.0.0.1:5000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem("userName", data.name);
        localStorage.setItem("userEmail", data.email);
        
        window.location.href = "dashboard.html";
      } else {
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

});