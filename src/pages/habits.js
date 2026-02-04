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
  habitInput: $("#habitInput"),
  addHabit: $("#addHabit"),
  habitsList: $("#habitsList"),
  habitsEmpty: $("#habitsEmpty"),
  streaksList: $("#streaksList"),
  streaksEmpty: $("#streaksEmpty")
};

// 存储键
const HABITS_KEY = `flowday-habits-${currentUserId}`;
const HABIT_LOGS_KEY = `flowday-habit-logs-${currentUserId}`;

// 获取所有习惯
const getHabits = () => {
  try {
    const data = localStorage.getItem(HABITS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to load habits:', error);
    return [];
  }
};

// 保存习惯
const saveHabits = (habits) => {
  try {
    localStorage.setItem(HABITS_KEY, JSON.stringify(habits));
  } catch (error) {
    console.error('Failed to save habits:', error);
  }
};

// 获取习惯记录
const getHabitLogs = () => {
  try {
    const data = localStorage.getItem(HABIT_LOGS_KEY);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error('Failed to load habit logs:', error);
    return {};
  }
};

// 保存习惯记录
const saveHabitLogs = (logs) => {
  try {
    localStorage.setItem(HABIT_LOGS_KEY, JSON.stringify(logs));
  } catch (error) {
    console.error('Failed to save habit logs:', error);
  }
};

// 添加习惯
const addHabit = async () => {
  const name = elements.habitInput.value.trim();
  if (!name) {
    await showAlert('请输入习惯名称');
    return;
  }

  const habits = getHabits();
  
  // 检查是否已存在
  if (habits.some(h => h.name === name)) {
    await showAlert('该习惯已存在');
    return;
  }

  habits.push({
    id: `${currentUserId}-habit-${Date.now()}`,
    name: name,
    createdAt: new Date().toISOString()
  });

  saveHabits(habits);
  elements.habitInput.value = '';
  renderHabits();
  renderStreaks();
};

// 删除习惯
const deleteHabit = async (id) => {
  if (!await showConfirm('确定要删除这个习惯吗？')) return;
  
  const habits = getHabits();
  const filtered = habits.filter(h => h.id !== id);
  saveHabits(filtered);
  
  // 同时删除相关记录
  const logs = getHabitLogs();
  delete logs[id];
  saveHabitLogs(logs);
  
  renderHabits();
  renderStreaks();
};

// 切换习惯完成状态
const toggleHabit = (id) => {
  const today = getTodayISO();
  const logs = getHabitLogs();
  
  if (!logs[id]) {
    logs[id] = [];
  }
  
  const index = logs[id].indexOf(today);
  if (index >= 0) {
    logs[id].splice(index, 1);
  } else {
    logs[id].push(today);
  }
  
  saveHabitLogs(logs);
  renderHabits();
  renderStreaks();
};

// 计算连续天数
const calculateStreak = (dates) => {
  if (!dates || dates.length === 0) return 0;
  
  const sorted = [...dates].sort().reverse();
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  for (let i = 0; i < sorted.length; i++) {
    const date = new Date(sorted[i]);
    date.setHours(0, 0, 0, 0);
    
    const diffDays = Math.floor((today - date) / (1000 * 60 * 60 * 24));
    
    if (diffDays === i || (i === 0 && diffDays === 1)) {
      streak++;
    } else {
      break;
    }
  }
  
  return streak;
};

// 渲染习惯列表
const renderHabits = () => {
  const habits = getHabits();
  const logs = getHabitLogs();
  const today = getTodayISO();
  
  if (habits.length === 0) {
    elements.habitsList.innerHTML = '';
    elements.habitsEmpty.hidden = false;
    return;
  }

  elements.habitsEmpty.hidden = true;
  
  elements.habitsList.innerHTML = habits.map(habit => {
    const isCompleted = logs[habit.id]?.includes(today);
    
    return `
      <li class="habit-item ${isCompleted ? 'completed' : ''}" data-id="${habit.id}">
        <label class="habit-check">
          <input type="checkbox" ${isCompleted ? 'checked' : ''} />
          <span class="habit-name">${escapeHtml(habit.name)}</span>
        </label>
        <button class="icon-btn delete" data-action="delete">删除</button>
      </li>
    `;
  }).join('');

  // 添加事件监听
  elements.habitsList.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      const item = e.target.closest('.habit-item');
      const id = item.dataset.id;
      toggleHabit(id);
    });
  });

  elements.habitsList.querySelectorAll('[data-action="delete"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const item = e.target.closest('.habit-item');
      const id = item.dataset.id;
      deleteHabit(id);
    });
  });
};

// 渲染连续天数
const renderStreaks = () => {
  const habits = getHabits();
  const logs = getHabitLogs();
  
  if (habits.length === 0) {
    elements.streaksList.innerHTML = '';
    elements.streaksEmpty.hidden = false;
    return;
  }

  const habitsWithStreaks = habits.map(habit => ({
    ...habit,
    streak: calculateStreak(logs[habit.id] || [])
  })).sort((a, b) => b.streak - a.streak);

  if (habitsWithStreaks.every(h => h.streak === 0)) {
    elements.streaksList.innerHTML = '';
    elements.streaksEmpty.hidden = false;
    return;
  }

  elements.streaksEmpty.hidden = true;
  
  elements.streaksList.innerHTML = habitsWithStreaks.map(habit => {
    if (habit.streak === 0) return '';
    
    return `
      <div class="streak-item">
        <span class="streak-name">${escapeHtml(habit.name)}</span>
        <span class="streak-count">${habit.streak} 天</span>
        <div class="streak-fire">${'🔥'.repeat(Math.min(habit.streak, 5))}</div>
      </div>
    `;
  }).join('');
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
  initSidebar("habits");
  initOutsideClick();

  // 设置事件监听
  elements.addHabit.addEventListener("click", addHabit);
  elements.habitInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") addHabit();
  });

  // 渲染
  renderHabits();
  renderStreaks();
  applyI18n();
};

init();
