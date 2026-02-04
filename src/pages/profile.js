import { applyI18n } from "../i18n.js";
import {
  $,
  currentUserId,
  initSidebar,
  initOutsideClick
} from "../shared/common.js";
import { showAlert, showConfirm } from "../shared/modal.js";
import { getSession, setSession, clearSession } from "../auth/auth.js";
import { getUserData, updateUserProfile, updateUserPassword, deleteUserAccount } from "../storage/user.js";

// DOM 元素
const elements = {
  profileAvatar: $("#profileAvatar"),
  avatarInitial: $("#avatarInitial"),
  profileName: $("#profileName"),
  profileEmail: $("#profileEmail"),
  profileMode: $("#profileMode"),
  profileForm: $("#profileForm"),
  editName: $("#editName"),
  editEmail: $("#editEmail"),
  editGender: $("#editGender"),
  editAge: $("#editAge"),
  editBirthday: $("#editBirthday"),
  passwordForm: $("#passwordForm"),
  currentPassword: $("#currentPassword"),
  newPassword: $("#newPassword"),
  confirmPassword: $("#confirmPassword"),
  logoutBtn: $("#logoutBtn"),
  deleteAccountBtn: $("#deleteAccountBtn")
};

// 当前用户数据
let currentUserData = null;

// 加载用户资料
const loadProfile = async () => {
  const session = getSession();
  if (!session) {
    window.location.href = "login.html";
    return;
  }

  // 显示头像首字母
  const initial = session.name ? session.name.charAt(0).toUpperCase() : 
                  session.email ? session.email.charAt(0).toUpperCase() : "U";
  elements.avatarInitial.textContent = initial;

  // 显示基本信息
  elements.profileName.textContent = session.name || "用户";
  elements.profileEmail.textContent = session.email || "user@example.com";
  elements.profileMode.textContent = session.mode === "guest" ? "游客模式" : "注册用户";

  // 填充表单
  elements.editName.value = session.name || "";
  elements.editEmail.value = session.email || "";
  elements.editGender.value = session.gender || "";
  elements.editAge.value = session.age || "";
  elements.editBirthday.value = session.birthday || "";

  // 游客模式禁用某些功能
  if (session.mode === "guest") {
    elements.editName.disabled = true;
    elements.editGender.disabled = true;
    elements.editAge.disabled = true;
    elements.editBirthday.disabled = true;
    elements.profileForm.querySelector('button[type="submit"]').disabled = true;
    elements.passwordForm.querySelectorAll('input').forEach(input => input.disabled = true);
    elements.passwordForm.querySelector('button[type="submit"]').disabled = true;
    elements.deleteAccountBtn.disabled = true;
  }

  // 从数据库加载完整数据
  if (session.mode === "user" && session.id) {
    try {
      currentUserData = await getUserData(session.id);
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  }
};

// 保存个人资料
const saveProfile = async (e) => {
  e.preventDefault();

  const session = getSession();
  if (!session || session.mode === "guest") {
    await showAlert("游客模式无法修改资料");
    return;
  }

  const profile = {
    name: elements.editName.value.trim(),
    gender: elements.editGender.value,
    age: elements.editAge.value ? parseInt(elements.editAge.value) : "",
    birthday: elements.editBirthday.value
  };

  try {
    await updateUserProfile(session.id, profile);
    
    // 更新 session
    const updatedSession = {
      ...session,
      name: profile.name,
      gender: profile.gender,
      age: profile.age,
      birthday: profile.birthday
    };
    setSession(updatedSession);

    // 更新显示
    elements.profileName.textContent = profile.name || "用户";
    elements.avatarInitial.textContent = profile.name ? profile.name.charAt(0).toUpperCase() : "U";

    await showAlert("个人资料已更新");
  } catch (error) {
    console.error('Failed to update profile:', error);
    await showAlert("更新失败，请重试");
  }
};

// 更新密码
const updatePassword = async (e) => {
  e.preventDefault();

  const session = getSession();
  if (!session || session.mode === "guest") {
    await showAlert("游客模式无法修改密码");
    return;
  }

  const currentPw = elements.currentPassword.value;
  const newPw = elements.newPassword.value;
  const confirmPw = elements.confirmPassword.value;

  if (!currentPw || !newPw || !confirmPw) {
    await showAlert("请填写所有密码字段");
    return;
  }

  if (newPw.length < 6) {
    await showAlert("新密码至少需要6位");
    return;
  }

  if (newPw !== confirmPw) {
    await showAlert("两次输入的新密码不一致");
    return;
  }

  try {
    await updateUserPassword(session.id, currentPw, newPw);
    
    // 清空表单
    elements.currentPassword.value = "";
    elements.newPassword.value = "";
    elements.confirmPassword.value = "";

    await showAlert("密码已更新");
  } catch (error) {
    console.error('Failed to update password:', error);
    await showAlert(error.message || "密码更新失败，请重试");
  }
};

// 退出登录
const logout = async () => {
  const confirmed = await showConfirm("确定要退出登录吗？");
  if (!confirmed) return;

  clearSession();
  window.location.href = "login.html";
};

// 注销账户
const deleteAccount = async () => {
  const session = getSession();
  if (!session || session.mode === "guest") {
    await showAlert("游客模式无需注销");
    return;
  }

  const confirmed = await showConfirm(
    "警告：注销账户将永久删除您的所有数据，此操作不可恢复。确定要继续吗？"
  );
  if (!confirmed) return;

  // 二次确认
  const doubleConfirmed = await showConfirm("最后确认：您真的要永久注销账户吗？");
  if (!doubleConfirmed) return;

  try {
    await deleteUserAccount(session.id);
    clearSession();
    await showAlert("账户已注销");
    window.location.href = "index.html";
  } catch (error) {
    console.error('Failed to delete account:', error);
    await showAlert("注销失败，请重试");
  }
};

// 初始化
const init = async () => {
  // 初始化侧边栏
  initSidebar("profile");
  initOutsideClick();

  // 加载用户资料
  await loadProfile();

  // 绑定事件
  elements.profileForm.addEventListener("submit", saveProfile);
  elements.passwordForm.addEventListener("submit", updatePassword);
  elements.logoutBtn.addEventListener("click", logout);
  elements.deleteAccountBtn.addEventListener("click", deleteAccount);

  applyI18n();
};

init();
