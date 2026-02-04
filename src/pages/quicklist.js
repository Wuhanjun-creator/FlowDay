import { applyI18n } from "../i18n.js";
import {
  $,
  currentUserId,
  initSidebar,
  initOutsideClick
} from "../shared/common.js";
import { showAlert } from "../shared/modal.js";

// DOM 元素
const elements = {
  quicklistInput: $("#quicklistInput"),
  addQuicklist: $("#addQuicklist"),
  quicklistList: $("#quicklistList"),
  quicklistEmpty: $("#quicklistEmpty"),
  quicklistCount: $("#quicklistCount")
};

// 存储键
const QUICKLIST_KEY = `flowday-quicklist-${currentUserId}`;

// 获取所有快速任务
const getQuicklist = () => {
  try {
    const data = localStorage.getItem(QUICKLIST_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to load quicklist:', error);
    return [];
  }
};

// 保存快速任务
const saveQuicklist = (items) => {
  try {
    localStorage.setItem(QUICKLIST_KEY, JSON.stringify(items));
  } catch (error) {
    console.error('Failed to save quicklist:', error);
  }
};

// 添加快速任务
const addQuicklistItem = async () => {
  const text = elements.quicklistInput.value.trim();
  if (!text) {
    await showAlert('请输入任务内容');
    return;
  }

  const items = getQuicklist();
  items.push({
    id: `${currentUserId}-quick-${Date.now()}`,
    text: text,
    completed: false,
    createdAt: new Date().toISOString()
  });

  saveQuicklist(items);
  elements.quicklistInput.value = '';
  renderQuicklist();
};

// 删除快速任务
const deleteQuicklistItem = (id) => {
  const items = getQuicklist();
  const filtered = items.filter(item => item.id !== id);
  saveQuicklist(filtered);
  renderQuicklist();
};

// 切换完成状态
const toggleQuicklistItem = (id) => {
  const items = getQuicklist();
  const item = items.find(i => i.id === id);
  if (item) {
    item.completed = !item.completed;
    saveQuicklist(items);
    renderQuicklist();
  }
};

// 渲染快速任务列表
const renderQuicklist = () => {
  const items = getQuicklist();
  const pendingCount = items.filter(item => !item.completed).length;
  
  // 更新计数
  elements.quicklistCount.textContent = pendingCount;
  
  if (items.length === 0) {
    elements.quicklistList.innerHTML = '';
    elements.quicklistEmpty.hidden = false;
    return;
  }

  elements.quicklistEmpty.hidden = true;
  
  // 排序：未完成的在前
  const sorted = [...items].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
  
  elements.quicklistList.innerHTML = sorted.map(item => `
    <li class="quicklist-item ${item.completed ? 'completed' : ''}" data-id="${item.id}">
      <label class="quicklist-check">
        <input type="checkbox" ${item.completed ? 'checked' : ''} />
        <span class="quicklist-text">${escapeHtml(item.text)}</span>
      </label>
      <button class="icon-btn delete" data-action="delete">删除</button>
    </li>
  `).join('');

  // 添加事件监听
  elements.quicklistList.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      const item = e.target.closest('.quicklist-item');
      const id = item.dataset.id;
      toggleQuicklistItem(id);
    });
  });

  elements.quicklistList.querySelectorAll('[data-action="delete"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const item = e.target.closest('.quicklist-item');
      const id = item.dataset.id;
      deleteQuicklistItem(id);
    });
  });
};

// HTML转义
const escapeHtml = (text) => {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

// 初始化
const init = async () => {
  // 初始化侧边栏
  initSidebar("quicklist");
  initOutsideClick();

  // 设置事件监听
  elements.addQuicklist.addEventListener("click", addQuicklistItem);
  elements.quicklistInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") addQuicklistItem();
  });

  // 渲染
  renderQuicklist();
  applyI18n();
};

init();
