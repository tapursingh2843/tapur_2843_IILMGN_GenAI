document.addEventListener("DOMContentLoaded", () => {
  const snowContainer = document.getElementById("snow-container");
  const authCard = document.getElementById("auth-card");
  
  const viewLogin = document.getElementById("view-login");
  const viewPhone = document.getElementById("view-phone");
  const viewSuccess = document.getElementById("view-success");
  
  const btnPhoneToggle = document.getElementById("btn-phone-toggle");
  const btnBackToLogin = document.getElementById("btn-back-to-login");
  const btnSendOtp = document.getElementById("btn-send-otp");
  const otpGroup = document.getElementById("otp-group");
  
  const emailForm = document.getElementById("email-form");
  const phoneForm = document.getElementById("phone-form");
  const googleBtn = document.querySelector(".btn-google");

  // --- Snowfall Particles ---
  function createSnow() {
    const count = 40;
    for (let i = 0; i < count; i++) {
      const flake = document.createElement("div");
      flake.className = "snow-flake";
      
      const size = Math.random() * 4 + 2;
      const left = Math.random() * 100;
      const duration = Math.random() * 5 + 5;
      const delay = Math.random() * 10;
      
      flake.style.width = `${size}px`;
      flake.style.height = `${size}px`;
      flake.style.left = `${left}%`;
      flake.style.top = `-10px`;
      flake.style.animationDuration = `${duration}s`;
      flake.style.animationDelay = `${delay}s`;
      
      snowContainer.appendChild(flake);
    }
  }
  createSnow();

  // --- View Toggles ---
  btnPhoneToggle.addEventListener("click", () => {
    viewLogin.style.display = "none";
    viewPhone.style.display = "block";
  });

  btnBackToLogin.addEventListener("click", () => {
    viewPhone.style.display = "none";
    viewLogin.style.display = "block";
  });

  btnSendOtp.addEventListener("click", (e) => {
    e.target.textContent = "Sending...";
    e.target.disabled = true;
    setTimeout(() => {
      e.target.style.display = "none";
      otpGroup.style.display = "block";
    }, 1200);
  });

  // --- OTP Input Auto-focus ---
  const otpInputs = document.querySelectorAll(".otp-input");
  otpInputs.forEach((input, idx) => {
    input.addEventListener("input", (e) => {
      if (e.target.value && idx < otpInputs.length - 1) {
        otpInputs[idx + 1].focus();
      }
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Backspace" && !e.target.value && idx > 0) {
        otpInputs[idx - 1].focus();
      }
    });
  });

  // --- Mock Authentication Logic ---
  function handleAuthSuccess() {
    viewLogin.style.display = "none";
    viewPhone.style.display = "none";
    viewSuccess.style.display = "block";
    
    // Smooth redirect after animation
    setTimeout(() => {
      window.location.href = "/home";
    }, 2000);
  }

  emailForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const btn = e.target.querySelector("button");
    btn.textContent = "Authenticating...";
    btn.disabled = true;
    setTimeout(handleAuthSuccess, 1500);
  });

  phoneForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const btn = e.target.querySelector("button[type='submit']");
    btn.textContent = "Verifying...";
    btn.disabled = true;
    setTimeout(handleAuthSuccess, 1500);
  });

  googleBtn.addEventListener("click", () => {
    googleBtn.textContent = "Connecting to Google...";
    googleBtn.disabled = true;
    setTimeout(handleAuthSuccess, 1500);
  });
});
