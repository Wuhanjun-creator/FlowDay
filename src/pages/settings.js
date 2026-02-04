import { applyI18n } from "../i18n.js";
import { getAllThemes, putTheme, deleteTheme } from "../storage/db.js";
import {
  $,
  $$,
  currentUserId,
  presets,
  initSidebar,
  initOutsideClick,
  initCustomSelect,
  applyTheme,
  updatePresetUI,
  saveSelectedTheme
} from "../shared/common.js";

// DOM 元素
const elements = {
  primaryColor: $("#primaryColor"),
  accentColor: $("#accentColor"),
  backgroundColor: $("#backgroundColor"),
  saveTheme: $("#saveTheme"),
  presetButtons: $$(".preset"),
  langSelect: $("#langSelect"),
  langSelectContainer: $("#langSelectContainer"),
  langSelectValue: $("#langSelectValue"),
  langSelectOptions: $("#langSelectOptions"),
  timezoneSelect: $("#timezoneSelect"),
  timezoneSelectContainer: $("#timezoneSelectContainer"),
  timezoneSelectValue: $("#timezoneSelectValue"),
  timezoneSelectOptions: $("#timezoneSelectOptions")
};

// 当前主题
let currentTheme = null;

// 从数据库加载自定义主题
const loadCustomThemes = async () => {
  try {
    const themes = await getAllThemes(currentUserId);
    const customThemes = {};
    themes.forEach(theme => {
      customThemes[theme.name] = theme.colors;
    });
    return customThemes;
  } catch (error) {
    console.error('Failed to load custom themes:', error);
    return {};
  }
};

// 保存自定义主题到数据库
const saveCustomTheme = async (name, colors) => {
  try {
    const theme = {
      id: `${currentUserId}-${name}`,
      userId: currentUserId,
      name: name,
      colors: colors,
      createdAt: new Date().toISOString()
    };
    await putTheme(theme);
    return true;
  } catch (error) {
    console.error('Failed to save custom theme:', error);
    return false;
  }
};

// 删除自定义主题从数据库
const deleteCustomTheme = async (name) => {
  try {
    const themeId = `${currentUserId}-${name}`;
    await deleteTheme(themeId);
    return true;
  } catch (error) {
    console.error('Failed to delete custom theme:', error);
    return false;
  }
};

// 处理保存主题
const handleSaveTheme = async () => {
  if (!currentTheme) return;
  
  const name = prompt('请输入配色名称：');
  if (!name || name.trim() === '') return;
  
  const success = await saveCustomTheme(name.trim(), currentTheme);
  if (success) {
    alert('配色保存成功！');
    updatePresetButtons();
  } else {
    alert('配色保存失败，请重试。');
  }
};

// 更新预设按钮
const updatePresetButtons = async () => {
  const customThemes = await loadCustomThemes();
  const presetGrid = document.querySelector('.preset-grid');
  if (!presetGrid) return;
  
  // 保留默认预设按钮
  const defaultPresets = ['gold', 'linen', 'sage', 'noir', 'ember', 'ocean'];
  const defaultButtons = Array.from(presetGrid.children).filter(button => {
    const preset = button.dataset.preset;
    return defaultPresets.includes(preset);
  });
  
  // 清空预设网格
  presetGrid.innerHTML = '';
  
  // 添加默认的预设按钮
  defaultButtons.forEach(button => {
    presetGrid.appendChild(button);
  });
  
  // 添加自定义的预设按钮
  for (const [name, theme] of Object.entries(customThemes)) {
    const button = document.createElement('button');
    button.className = 'preset';
    button.type = 'button';
    button.dataset.preset = `custom-${name}`;
    button.innerHTML = `
      <span style="background: ${theme.primary};"></span>
      <span style="background: ${theme.accent};"></span>
      <span style="background: ${theme.background};"></span>
      <strong>${name}</strong>
      <button class="icon-btn delete-theme" data-theme="${name}">×</button>
    `;
    presetGrid.appendChild(button);
  }
  
  // 重新添加事件监听器
  document.querySelectorAll('.preset').forEach((button) => {
    button.addEventListener('click', handlePresetChange);
  });
  
  // 添加删除自定义主题的事件监听器
  document.querySelectorAll('.delete-theme').forEach(button => {
    button.addEventListener('click', async (e) => {
      e.stopPropagation();
      const themeName = button.dataset.theme;
      const success = await deleteCustomTheme(themeName);
      if (success) {
        updatePresetButtons();
      } else {
        alert('删除失败，请重试。');
      }
    });
  });
  
  // 更新预设按钮的选中状态
  updatePresetUI(currentTheme);
};

// 处理预设变更
const handlePresetChange = async (event) => {
  const button = event.target.closest(".preset");
  if (!button) return;
  
  const presetKey = button.dataset.preset;
  let theme;
  
  if (presets[presetKey]) {
    theme = presets[presetKey];
  } else if (presetKey.startsWith('custom-')) {
    const themeName = presetKey.replace('custom-', '');
    const customThemes = await loadCustomThemes();
    theme = customThemes[themeName];
  }
  
  if (!theme) return;
  
  currentTheme = theme;
  applyTheme(theme);
  updatePresetUI(theme);
  await saveSelectedTheme(theme);
};

// 处理颜色变更
const handleColorChange = async () => {
  const theme = {
    primary: elements.primaryColor.value,
    accent: elements.accentColor.value,
    background: elements.backgroundColor.value
  };
  
  currentTheme = theme;
  applyTheme(theme);
  updatePresetUI(theme);
  await saveSelectedTheme(theme);
};

// 处理语言变更
const handleLanguageChange = (value) => {
  localStorage.setItem("flowday-lang", value);
  applyI18n();
};

// 处理时区变更
const handleTimezoneChange = (value) => {
  localStorage.setItem("flowday-timezone", value);
};

// 初始化
const init = async () => {
  // 初始化侧边栏
  initSidebar("settings");
  initOutsideClick();
  
  // 初始化自定义选择框
  initCustomSelect(
    "#langSelectContainer",
    "#langSelectOptions",
    "#langSelect",
    "#langSelectValue",
    handleLanguageChange
  );
  
  initCustomSelect(
    "#timezoneSelectContainer",
    "#timezoneSelectOptions",
    "#timezoneSelect",
    "#timezoneSelectValue",
    handleTimezoneChange
  );
  
  // 加载保存的设置
  const savedLang = localStorage.getItem("flowday-lang") || "zh";
  const savedTimezone = localStorage.getItem("flowday-timezone") || "Asia/Shanghai";
  
  if (elements.langSelect) elements.langSelect.value = savedLang;
  if (elements.timezoneSelect) elements.timezoneSelect.value = savedTimezone;
  
  // 设置事件监听
  elements.presetButtons.forEach((btn) => btn.addEventListener("click", handlePresetChange));
  elements.primaryColor.addEventListener("input", handleColorChange);
  elements.accentColor.addEventListener("input", handleColorChange);
  elements.backgroundColor.addEventListener("input", handleColorChange);
  elements.saveTheme.addEventListener("click", handleSaveTheme);
  
  // 加载自定义主题
  await updatePresetButtons();
  
  applyI18n();
};

init();
