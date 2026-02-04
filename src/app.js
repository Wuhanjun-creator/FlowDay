// app.js - 已迁移到独立页面
// 此文件保留用于兼容性，所有功能已迁移到 src/pages/ 目录下的独立页面

import { getSession, ensureGuestSession } from "./auth/auth.js";

// 用户认证检查
const params = new URLSearchParams(window.location.search);
const isGuest = params.get("guest") === "1";
let session = getSession();

if (!session && isGuest) {
  session = ensureGuestSession();
}

if (!session && !isGuest) {
  window.location.href = "login.html";
}

// 重定向到新的独立页面
// 如果用户访问的是旧的单页应用，自动重定向到今日概览页面
if (window.location.pathname.endsWith('app.html') || window.location.pathname.endsWith('index.html')) {
  window.location.href = 'overview.html' + window.location.search;
}
