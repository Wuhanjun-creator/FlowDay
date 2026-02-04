import { applyI18n } from "../i18n.js";
import {
  $,
  currentUserId,
  getTodayISO,
  initSidebar,
  initOutsideClick,
  formatDate
} from "../shared/common.js";
import { showAlert, showConfirm } from "../shared/modal.js";

// DOM 元素
const elements = {
  journalDateLabel: $("#journalDateLabel"),
  journalContent: $("#journalContent"),
  saveJournal: $("#saveJournal"),
  journalList: $("#journalList"),
  journalEmpty: $("#journalEmpty")
};

// 日记存储键
const JOURNAL_KEY = `flowday-journals-${currentUserId}`;

// 获取所有日记
const getJournals = () => {
  try {
    const data = localStorage.getItem(JOURNAL_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to load journals:', error);
    return [];
  }
};

// 保存日记
const saveJournals = (journals) => {
  try {
    localStorage.setItem(JOURNAL_KEY, JSON.stringify(journals));
  } catch (error) {
    console.error('Failed to save journals:', error);
  }
};

// 保存日记条目
const saveJournalEntry = async () => {
  const content = elements.journalContent.value.trim();
  if (!content) {
    await showAlert('请输入日记内容');
    return;
  }

  const journals = getJournals();
  const today = getTodayISO();
  
  // 检查今天是否已有日记
  const existingIndex = journals.findIndex(j => j.date === today);
  
  if (existingIndex >= 0) {
    // 更新现有日记
    journals[existingIndex].content = content;
    journals[existingIndex].updatedAt = new Date().toISOString();
  } else {
    // 添加新日记
    journals.push({
      id: `${currentUserId}-journal-${Date.now()}`,
      date: today,
      content: content,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  saveJournals(journals);
  elements.journalContent.value = '';
  renderJournals();
  updateDateLabel();
  await showAlert('日记保存成功！');
};

// 删除日记
const deleteJournal = async (id) => {
  if (!await showConfirm('确定要删除这条日记吗？')) return;
  
  const journals = getJournals();
  const filtered = journals.filter(j => j.id !== id);
  saveJournals(filtered);
  renderJournals();
};

// 编辑日记
const editJournal = (id) => {
  const journals = getJournals();
  const journal = journals.find(j => j.id === id);
  if (journal) {
    elements.journalContent.value = journal.content;
    elements.journalContent.focus();
  }
};

// 渲染日记列表
const renderJournals = () => {
  const journals = getJournals();
  const lang = localStorage.getItem("flowday-lang") || "zh";
  
  if (journals.length === 0) {
    elements.journalList.innerHTML = '';
    elements.journalEmpty.hidden = false;
    return;
  }

  elements.journalEmpty.hidden = true;
  
  // 按日期降序排序
  const sorted = journals.sort((a, b) => new Date(b.date) - new Date(a.date));
  
  elements.journalList.innerHTML = sorted.map(journal => {
    const date = new Date(journal.date);
    const dateStr = formatDate(date, lang);
    const preview = journal.content.slice(0, 100) + (journal.content.length > 100 ? '...' : '');
    
    return `
      <li class="journal-item" data-id="${journal.id}">
        <div class="journal-item-header">
          <span class="journal-date">${dateStr}</span>
          <div class="journal-actions">
            <button class="icon-btn edit" data-action="edit">编辑</button>
            <button class="icon-btn delete" data-action="delete">删除</button>
          </div>
        </div>
        <div class="journal-preview">${escapeHtml(preview)}</div>
      </li>
    `;
  }).join('');

  // 添加事件监听
  elements.journalList.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const item = e.target.closest('.journal-item');
      const id = item.dataset.id;
      const action = e.target.dataset.action;
      
      if (action === 'edit') {
        editJournal(id);
      } else if (action === 'delete') {
        deleteJournal(id);
      }
    });
  });
};

// 更新日期标签
const updateDateLabel = () => {
  const lang = localStorage.getItem("flowday-lang") || "zh";
  const today = new Date();
  
  if (lang === 'zh') {
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    elements.journalDateLabel.textContent = `${today.getMonth() + 1}月${today.getDate()}日 ${weekdays[today.getDay()]}`;
  } else {
    elements.journalDateLabel.textContent = today.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      weekday: 'long' 
    });
  }
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
  initSidebar("journal");
  initOutsideClick();

  // 设置事件监听
  elements.saveJournal.addEventListener("click", saveJournalEntry);

  // 渲染
  updateDateLabel();
  renderJournals();
  applyI18n();
};

init();
