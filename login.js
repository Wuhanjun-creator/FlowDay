import { initAuth, loginUser } from "./src/auth/auth.js";

const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");
const loginButton = loginForm?.querySelector("button[type=\"submit\"]");
const passwordToggles = document.querySelectorAll(".password-toggle");

const setError = (message) => {
  if (!loginError) return;
  loginError.textContent = message;
  loginError.hidden = !message;
};

loginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  setError("");
  if (loginButton) loginButton.disabled = true;

  const email = document.getElementById("loginEmail")?.value || "";
  const password = document.getElementById("loginPassword")?.value || "";

  try {
    await initAuth();
    await loginUser({ email, password });
    window.location.href = "app.html";
  } catch (error) {
    setError(error?.message || "登录失败，请重试。");
  } finally {
    if (loginButton) loginButton.disabled = false;
  }
});

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
