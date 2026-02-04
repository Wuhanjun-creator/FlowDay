// 共享工具函数和配置

// 用户认证
import { getSession, ensureGuestSession } from "../auth/auth.js";
import { getUserSettings, saveUserSettings } from "../storage/db.js";

const params = new URLSearchParams(window.location.search);
const isGuest = params.get("guest") === "1";
let session = getSession();
if (!session && isGuest) {
  session = ensureGuestSession();
}
if (!session && !isGuest) {
  window.location.href = "login.html";
}
export const currentUserId = session?.id || "guest";
export const userSession = session;

// DOM 选择器
export const $ = (selector) => document.querySelector(selector);
export const $$ = (selector) => document.querySelectorAll(selector);

// 日期工具
export const getTodayISO = () => {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

export const formatDate = (date, lang = 'zh') => {
  if (lang === 'zh') {
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// 主题预设
export const presets = {
  gold: {
    primary: "#8b5a2b",
    accent: "#e8b47c",
    background: "#f9f6f0"
  },
  linen: {
    primary: "#25374d",
    accent: "#d8b996",
    background: "#f1efe9"
  },
  sage: {
    primary: "#2e3b34",
    accent: "#9cc6b2",
    background: "#f1f4f2"
  },
  noir: {
    primary: "#e5e5e5",
    accent: "#8a8a8a",
    background: "#1a1a1a"
  },
  ember: {
    primary: "#5d2e2e",
    accent: "#d4856a",
    background: "#f5f0ee"
  },
  ocean: {
    primary: "#1e3a5f",
    accent: "#7eb8da",
    background: "#f0f4f8"
  }
};

// 加载用户设置
export const loadUserSettings = async () => {
  try {
    const settings = await getUserSettings(currentUserId);
    if (settings && settings.selectedTheme) {
      return settings.selectedTheme;
    }
    await saveUserSettings(currentUserId, { selectedTheme: presets.gold });
    return presets.gold;
  } catch (error) {
    console.error('Failed to load user settings:', error);
    return presets.gold;
  }
};

// 保存选中的主题
export const saveSelectedTheme = async (theme) => {
  try {
    await saveUserSettings(currentUserId, { selectedTheme: theme });
    return true;
  } catch (error) {
    console.error('Failed to save selected theme:', error);
    return false;
  }
};

// 应用主题
export const applyTheme = (theme) => {
  if (!theme) return;
  
  // 导入 deriveTheme 函数来计算所有派生颜色
  import('../utils/colors.js').then(({ deriveTheme }) => {
    const derived = deriveTheme(theme);
    const root = document.documentElement;
    
    // 设置所有 CSS 变量
    root.style.setProperty('--bg', derived.background);
    root.style.setProperty('--primary', derived.primary);
    root.style.setProperty('--accent', derived.accent);
    root.style.setProperty('--text', derived.text);
    root.style.setProperty('--muted', derived.muted);
    root.style.setProperty('--panel', derived.panel);
    root.style.setProperty('--panel-strong', derived.panelStrong);
    root.style.setProperty('--panel-deep', derived.panelDeep);
    root.style.setProperty('--border', derived.border);
    root.style.setProperty('--accent-soft', derived.accentSoft);
    root.style.setProperty('--glow', derived.glow);
    root.style.setProperty('--button-solid', derived.buttonSolid);
    root.style.colorScheme = derived.isDark ? 'dark' : 'light';
    
    // 同时保存到 localStorage 以实现跨页面同步
    localStorage.setItem('flowday-current-theme', JSON.stringify(theme));
  });
  
  // 更新颜色选择器
  const primaryColor = $('#primaryColor');
  const accentColor = $('#accentColor');
  const backgroundColor = $('#backgroundColor');
  
  if (primaryColor) primaryColor.value = theme.primary;
  if (accentColor) accentColor.value = theme.accent;
  if (backgroundColor) backgroundColor.value = theme.background;
};

// 更新预设按钮UI
export const updatePresetUI = (theme) => {
  if (!theme) return;
  document.querySelectorAll('.preset').forEach((btn) => {
    const presetKey = btn.dataset.preset;
    let isMatch = false;
    
    if (presets[presetKey]) {
      const preset = presets[presetKey];
      isMatch = (
        preset.primary === theme.primary &&
        preset.accent === theme.accent &&
        preset.background === theme.background
      );
    }
    
    btn.classList.toggle('active', isMatch);
  });
};

// 设置问候语
export const setGreeting = (lang = 'zh') => {
  const hour = new Date().getHours();
  const greetingEl = $('#greeting');
  if (!greetingEl) return;
  
  let text = '';
  if (lang === 'zh') {
    if (hour < 12) text = '上午好';
    else if (hour < 18) text = '下午好';
    else text = '晚上好';
    if (userSession?.name) {
      text += `，${userSession.name}`;
    }
  } else {
    if (hour < 12) text = 'Good morning';
    else if (hour < 18) text = 'Good afternoon';
    else text = 'Good evening';
    if (userSession?.name) {
      text += `, ${userSession.name}`;
    }
  }
  greetingEl.textContent = text;
};

// 设置日期标签
export const setDateLabel = (lang = 'zh') => {
  const dateLabel = $('#dateLabel');
  if (!dateLabel) return;
  
  const now = new Date();
  if (lang === 'zh') {
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    dateLabel.textContent = `${now.getMonth() + 1}月${now.getDate()}日 ${weekdays[now.getDay()]}`;
  } else {
    dateLabel.textContent = now.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      weekday: 'long' 
    });
  }
};

// 导航激活状态
export const setActiveNav = (pageName) => {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.nav === pageName);
  });
};

// 自定义选择框初始化
export const initCustomSelect = (containerId, optionsId, inputId, valueId, onChange) => {
  const container = $(containerId);
  const options = $(optionsId);
  const input = $(inputId);
  const value = $(valueId);
  
  if (!container || !options) return;
  
  container.addEventListener('click', (e) => {
    if (options.classList.contains('show')) {
      options.classList.remove('show');
      container.classList.remove('open');
    } else {
      // 关闭其他选择框
      document.querySelectorAll('.custom-select-options').forEach(el => {
        if (el !== options) el.classList.remove('show');
      });
      document.querySelectorAll('.custom-select').forEach(el => {
        if (el !== container) el.classList.remove('open');
      });
      
      options.classList.add('show');
      container.classList.add('open');
    }
  });
  
  options.addEventListener('click', (e) => {
    const option = e.target.closest('.custom-select-option');
    if (option) {
      const val = option.dataset.value;
      const text = option.textContent;
      if (input) input.value = val;
      if (value) value.textContent = text;
      options.classList.remove('show');
      container.classList.remove('open');
      if (onChange) onChange(val);
    }
  });
};

// 点击外部关闭选择框
export const initOutsideClick = () => {
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.custom-select')) {
      document.querySelectorAll('.custom-select-options').forEach(el => {
        el.classList.remove('show');
      });
      document.querySelectorAll('.custom-select').forEach(el => {
        el.classList.remove('open');
      });
    }
  });
};

// 初始化侧边栏导航
export const initSidebar = (currentPage) => {
  setActiveNav(currentPage);
  setGreeting();
  setDateLabel();

  // 应用主题 - 首先检查 localStorage 缓存（用于跨页面同步）
  const cachedTheme = localStorage.getItem('flowday-current-theme');
  if (cachedTheme) {
    try {
      const theme = JSON.parse(cachedTheme);
      applyTheme(theme);
      updatePresetUI(theme);
    } catch (error) {
      console.error('Failed to parse cached theme:', error);
    }
  }

  // 然后从数据库加载最新主题（确保同步）
  loadUserSettings().then(theme => {
    applyTheme(theme);
    updatePresetUI(theme);
  });

  // 监听其他页面的主题更改（storage 事件）
  window.addEventListener('storage', (e) => {
    if (e.key === 'flowday-current-theme' && e.newValue) {
      try {
        const theme = JSON.parse(e.newValue);
        applyTheme(theme);
        updatePresetUI(theme);
      } catch (error) {
        console.error('Failed to parse theme from storage event:', error);
      }
    }
  });
};
