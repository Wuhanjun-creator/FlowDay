import { initAuth, registerUser } from "./src/auth/auth.js";

const registerForm = document.getElementById("registerForm");
const registerNext = document.getElementById("registerNext");
const registerBack = document.getElementById("registerBackBtn");
const stepBars = document.querySelectorAll(".step-bar");
const registerError = document.getElementById("registerError");
const passwordToggles = document.querySelectorAll(".password-toggle");
const genderOptions = document.querySelectorAll(".gender-option");
const genderInput = document.getElementById("registerGender");
let currentStep = 1;

const setError = (message) => {
  if (!registerError) return;
  registerError.textContent = message;
  registerError.hidden = !message;
};

const isStepValid = (step) => {
  const section = registerForm.querySelector(`.form-step[data-step="${step}"]`);
  if (!section) return true;
  setError("");
  const fields = Array.from(section.querySelectorAll("input[required], select[required]"));
  const isValid = fields.every((field) => field.reportValidity());
  if (!isValid) return false;
  if (step === 1) {
    const password = document.getElementById("registerPassword")?.value || "";
    const confirm = document.getElementById("registerConfirm")?.value || "";
    if (password !== confirm) {
      setError("两次输入的密码不一致。");
      return false;
    }
  }
  if (step === 2) {
    if (!genderInput?.value) {
      setError("请选择性别。");
      return false;
    }
  }
  return true;
};

const showStep = (step) => {
  currentStep = step;
  setError("");
  registerForm.dataset.step = String(step);
  stepBars.forEach((bar) => {
    bar.classList.toggle("active", Number(bar.dataset.step) === step);
  });
};

registerNext?.addEventListener("click", () => {
  setError("");
  if (isStepValid(1)) {
    showStep(2);
  }
});

registerBack?.addEventListener("click", () => showStep(1));

registerForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  setError("");
  if (currentStep !== 2) {
    if (isStepValid(1)) {
      showStep(2);
    }
    return;
  }
  if (!isStepValid(2)) return;

  const email = document.getElementById("registerEmail")?.value || "";
  const password = document.getElementById("registerPassword")?.value || "";
  const name = document.getElementById("registerName")?.value || "";
  const gender = document.getElementById("registerGender")?.value || "";
  const submitButton = registerForm.querySelector("button[type=\"submit\"]");

  if (submitButton) submitButton.disabled = true;
  try {
    await initAuth();
    await registerUser({
      email,
      password,
      profile: {
        name,
        gender,
        birthday: ""
      }
    });
    window.location.href = "app.html";
  } catch (error) {
    setError(error?.message || "注册失败，请重试。");
  } finally {
    if (submitButton) submitButton.disabled = false;
  }
});

showStep(1);

passwordToggles.forEach((toggle) => {
  toggle.addEventListener("click", () => {
    const targetId = toggle.dataset.target;
    const input = document.getElementById(targetId);
    if (!input) return;
    const isHidden = input.type === "password";
    input.type = isHidden ? "text" : "password";
    toggle.classList.toggle("is-visible", isHidden);
    toggle.setAttribute("aria-label", isHidden ? "隐藏密码" : "显示密码");
  });
});

genderOptions.forEach((option) => {
  option.addEventListener("click", () => {
    genderOptions.forEach((btn) => btn.classList.remove("active"));
    option.classList.add("active");
    genderInput.value = option.dataset.value;
    setError("");
  });
});
