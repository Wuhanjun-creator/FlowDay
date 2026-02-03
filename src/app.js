import { createStore } from "./state/store.js";
import { reducer, initialState, defaultSettings, getTodayISO } from "./state/reducer.js";
import { getAllTasks, putTask, deleteTask } from "./storage/db.js";
import { applyI18n, dictionary } from "./i18n.js";
import { getSession, ensureGuestSession } from "./auth/auth.js";
import { deriveTheme } from "./utils/colors.js";

const $ = (selector) => document.querySelector(selector);

const params = new URLSearchParams(window.location.search);
const isGuest = params.get("guest") === "1";
let session = getSession();
if (!session && isGuest) {
  session = ensureGuestSession();
}
if (!session && !isGuest) {
  window.location.href = "login.html";
}
const currentUserId = session?.id || "guest";

const elements = {
  pages: document.querySelectorAll(".page"),
  greeting: $("#greeting"),
  dateLabel: $("#dateLabel"),
  selectedDateLabel: $("#selectedDateLabel"),
  progressRing: $("#progressRing"),
  progressValue: $("#progressValue"),
  statTotal: $("#statTotal"),
  statDone: $("#statDone"),
  statRemain: $("#statRemain"),
  priorityList: $("#priorityList"),
  priorityEmpty: $("#priorityEmpty"),
  planningList: $("#planningList"),
  planningEmpty: $("#planningEmpty"),
  taskForm: $("#taskForm"),
  taskTitle: $("#taskTitle"),
  taskTime: $("#taskTime"),
  taskPriority: $("#taskPriority"),
  taskRepeat: $("#taskRepeat"),
  taskDuration: $("#taskDuration"),
  taskNote: $("#taskNote"),
  taskSubmit: $("#taskSubmit"),
  cancelEdit: $("#cancelEdit"),
  taskList: $("#taskList"),
  taskEmpty: $("#taskEmpty"),
  filters: document.querySelectorAll(".filter[data-filter]"),
  navItems: document.querySelectorAll(".nav-item"),
  storageStatus: $("#storageStatus"),
  langSelect: $("#langSelect"),
  primaryColor: $("#primaryColor"),
  accentColor: $("#accentColor"),
  backgroundColor: $("#backgroundColor"),
  resetTheme: $("#resetTheme"),
  presetButtons: document.querySelectorAll(".preset"),
  rangeStart: $("#rangeStart"),
  rangeEnd: $("#rangeEnd"),
  rangeButtons: document.querySelectorAll("[data-range]"),
  rangeLabel: $("#rangeLabel"),
  rangeTotal: $("#rangeTotal"),
  rangeDone: $("#rangeDone"),
  rangeRate: $("#rangeRate"),
  rangeChart: $("#rangeChart"),
  insightsRing: $("#insightsRing"),
  insightsRingValue: $("#insightsRingValue"),
  rangeEmpty: $("#rangeEmpty")
};

const presets = {
  linen: {
    primary: "#25374d",
    accent: "#d8b996",
    background: "#f1efe9"
  },
  sage: {
    primary: "#2e3b34",
    accent: "#9cc6b2",
    background: "#eef2ed"
  },
  noir: {
    primary: "#d6e1ff",
    accent: "#6f8cff",
    background: "#10131b"
  },
  ember: {
    primary: "#f4e3d0",
    accent: "#ffb07a",
    background: "#141010"
  }
};

let storageStatusKey = "saved";
let insightsRange = { start: "", end: "" };

const loadSettings = () => {
  try {
    const saved = JSON.parse(localStorage.getItem("flowday-settings"));
    return {
      ...defaultSettings,
      ...saved,
      theme: {
        ...defaultSettings.theme,
        ...(saved?.theme || {})
      }
    };
  } catch (error) {
    return { ...defaultSettings };
  }
};

const saveSettings = (settings) => {
  localStorage.setItem("flowday-settings", JSON.stringify(settings));
};

const setStorageStatus = (key) => {
  storageStatusKey = key;
  const lang = store.getState().settings.lang;
  const label = dictionary[lang]?.[key] || dictionary[lang]?.saved;
  elements.storageStatus.textContent = label;
};

const applyTheme = (theme) => {
  const derived = deriveTheme(theme);
  const root = document.documentElement;
  root.style.setProperty("--bg", derived.background);
  root.style.setProperty("--primary", derived.primary);
  root.style.setProperty("--accent", derived.accent);
  root.style.setProperty("--text", derived.text);
  root.style.setProperty("--muted", derived.muted);
  root.style.setProperty("--panel", derived.panel);
  root.style.setProperty("--panel-strong", derived.panelStrong);
  root.style.setProperty("--panel-deep", derived.panelDeep);
  root.style.setProperty("--border", derived.border);
  root.style.setProperty("--accent-soft", derived.accentSoft);
  root.style.setProperty("--glow", derived.glow);
  root.style.setProperty("--button-solid", derived.buttonSolid);
  root.style.colorScheme = derived.isDark ? "dark" : "light";
};

const toLocalDate = (dateString) => new Date(`${dateString}T12:00:00`);

const formatDateLabel = (dateString, lang) => {
  const locale = lang === "en" ? "en-US" : "zh-CN";
  const date = toLocalDate(dateString);
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short"
  }).format(date);
};

const formatShortDate = (dateString, lang) => {
  const locale = lang === "en" ? "en-US" : "zh-CN";
  const date = toLocalDate(dateString);
  return new Intl.DateTimeFormat(locale, {
    month: "2-digit",
    day: "2-digit"
  }).format(date);
};

const formatTime = (time, lang) => {
  if (!time) return dictionary[lang]?.taskMetaNoTime || "";
  return time;
};

const formatDuration = (duration, lang) => {
  if (!duration) return "";
  return `${duration} ${dictionary[lang]?.taskMetaDuration}`;
};

const formatRepeat = (repeat, lang) => {
  if (!repeat || repeat === "none") return "";
  const key = `repeat${repeat.charAt(0).toUpperCase()}${repeat.slice(1)}`;
  return dictionary[lang]?.[key] || "";
};

const priorityLabel = (priority, lang) => {
  const key = `priority${priority.charAt(0).toUpperCase()}${priority.slice(1)}`;
  return dictionary[lang]?.[key] || priority;
};

const renderOverview = (tasks, lang) => {
  const total = tasks.length;
  const done = tasks.filter((task) => task.status === "done").length;
  const remain = total - done;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);

  elements.progressValue.textContent = `${percent}%`;
  elements.progressRing.style.setProperty("--progress", `${percent}%`);
  elements.statTotal.textContent = total;
  elements.statDone.textContent = done;
  elements.statRemain.textContent = remain;

  const priorities = tasks.filter((task) => task.priority === "core" && task.status !== "done");
  if (priorities.length === 0) {
    elements.priorityList.innerHTML = "";
    elements.priorityEmpty.hidden = false;
  } else {
    elements.priorityEmpty.hidden = true;
    elements.priorityList.innerHTML = priorities
      .slice(0, 3)
      .map(
        (task) => `
        <li class="priority-item">
          <strong>${task.title}</strong>
          <span class="planning-meta">${formatTime(task.time, lang)}</span>
        </li>
      `
      )
      .join("");
  }
};

const renderPlanning = (tasks, lang) => {
  const planned = tasks
    .filter((task) => task.time)
    .sort((a, b) => a.time.localeCompare(b.time));

  if (planned.length === 0) {
    elements.planningList.innerHTML = "";
    elements.planningEmpty.hidden = false;
    return;
  }

  elements.planningEmpty.hidden = true;
  elements.planningList.innerHTML = planned
    .map((task) => {
      const metaParts = [formatDuration(task.duration, lang), formatRepeat(task.repeat, lang), task.note].filter(Boolean);
      return `
        <li class="planning-item">
          <div class="planning-time">${task.time}</div>
          <div>
            <div class="task-title">${task.title}</div>
            <div class="planning-meta">${metaParts.join(" · ")}</div>
          </div>
          <span class="tag ${task.priority}">${priorityLabel(task.priority, lang)}</span>
        </li>
      `;
    })
    .join("");
};

const renderTasks = (tasks, lang, filter) => {
  const filtered = tasks.filter((task) => {
    if (filter === "todo") return task.status === "todo";
    if (filter === "done") return task.status === "done";
    return true;
  });

  if (filtered.length === 0) {
    elements.taskList.innerHTML = "";
    elements.taskEmpty.hidden = false;
    return;
  }

  elements.taskEmpty.hidden = true;
  elements.taskList.innerHTML = filtered
    .map((task) => {
      const metaParts = [formatDuration(task.duration, lang), formatRepeat(task.repeat, lang), task.note].filter(Boolean);
      return `
        <li class="task-item ${task.status === "done" ? "done" : ""}" data-id="${task.id}">
          <button class="check-btn" data-action="toggle" aria-label="${
            task.status === "done" ? dictionary[lang].todo : dictionary[lang].done
          }" aria-pressed="${task.status === "done"}"></button>
          <div class="task-time">${formatTime(task.time, lang)}</div>
          <div>
            <div class="task-title">${task.title}</div>
            <div class="task-meta">${metaParts.join(" · ")}</div>
          </div>
          <div class="task-actions">
            <span class="tag ${task.priority}">${priorityLabel(task.priority, lang)}</span>
            <button class="icon-btn" data-action="edit" title="${dictionary[lang].edit}" aria-label="${
        dictionary[lang].edit
      }">✎</button>
            <button class="icon-btn" data-action="delete" title="${dictionary[lang].remove}" aria-label="${
        dictionary[lang].remove
      }">×</button>
          </div>
        </li>
      `;
    })
    .join("");
};

const renderInsights = (tasks, lang) => {
  if (!insightsRange.start || !insightsRange.end) return;
  const start = insightsRange.start;
  const end = insightsRange.end;
  const rangeTasks = tasks.filter(
    (task) => task.userId === currentUserId && task.date >= start && task.date <= end
  );

  if (rangeTasks.length === 0) {
    elements.rangeChart.innerHTML = "";
    elements.rangeEmpty.hidden = false;
    elements.rangeTotal.textContent = 0;
    elements.rangeDone.textContent = 0;
    elements.rangeRate.textContent = "0%";
    if (elements.insightsRingValue) elements.insightsRingValue.textContent = "0%";
    if (elements.insightsRing) elements.insightsRing.style.setProperty("--progress", "0%");
    return;
  }

  elements.rangeEmpty.hidden = true;
  const doneCount = rangeTasks.filter((task) => task.status === "done").length;
  const rate = Math.round((doneCount / rangeTasks.length) * 100);

  elements.rangeTotal.textContent = rangeTasks.length;
  elements.rangeDone.textContent = doneCount;
  elements.rangeRate.textContent = `${rate}%`;
  if (elements.insightsRingValue) elements.insightsRingValue.textContent = `${rate}%`;
  if (elements.insightsRing) elements.insightsRing.style.setProperty("--progress", `${rate}%`);

  const dates = buildDateRange(start, end);
  elements.rangeChart.innerHTML = dates
    .map((date) => {
      const dayTasks = rangeTasks.filter((task) => task.date === date);
      const dayDone = dayTasks.filter((task) => task.status === "done").length;
      const ratio = dayTasks.length ? dayDone / dayTasks.length : 0;
      const label = formatShortDate(date, lang);
      return `
        <div class="chart-bar" style="--ratio:${ratio}">
          <span></span>
          <small>${label}</small>
        </div>
      `;
    })
    .join("");
};

const renderGreeting = (lang) => {
  if (!elements.greeting) return;
  const name = session?.name || (lang === "zh" ? "用户" : "Guest");
  const greetingText = lang === "zh" ? `你好，${name}` : `Hello, ${name}`;
  elements.greeting.textContent = greetingText;
};

const updateDateDisplay = (selectedDate, lang) => {
  elements.dateLabel.textContent = formatDateLabel(selectedDate, lang);
  elements.selectedDateLabel.textContent = formatShortDate(selectedDate, lang);
};

const updateFilterUI = (filter) => {
  elements.filters.forEach((button) => {
    button.classList.toggle("active", button.dataset.filter === filter);
  });
};

const updatePresetUI = (theme) => {
  elements.presetButtons.forEach((button) => {
    const preset = presets[button.dataset.preset];
    const matches =
      preset &&
      preset.primary.toLowerCase() === theme.primary.toLowerCase() &&
      preset.accent.toLowerCase() === theme.accent.toLowerCase() &&
      preset.background.toLowerCase() === theme.background.toLowerCase();
    button.classList.toggle("active", Boolean(matches));
  });
};

const setEditMode = (task) => {
  elements.taskTitle.value = task.title || "";
  elements.taskTime.value = task.time || "";
  elements.taskPriority.value = task.priority || "normal";
  elements.taskRepeat.value = task.repeat || "none";
  elements.taskDuration.value = task.duration || "";
  elements.taskNote.value = task.note || "";
  elements.taskSubmit.textContent = dictionary[store.getState().settings.lang].taskUpdate;
  elements.cancelEdit.hidden = false;
};

const clearForm = () => {
  elements.taskForm.reset();
  elements.taskPriority.value = "normal";
  elements.taskRepeat.value = "none";
  elements.taskSubmit.textContent = dictionary[store.getState().settings.lang].taskAdd;
  elements.cancelEdit.hidden = true;
  store.dispatch({ type: "SET_EDITING", payload: null });
};

const generateId = () => {
  if (crypto?.randomUUID) return crypto.randomUUID();
  return `task-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const localISO = (date) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

const buildDateRange = (start, end) => {
  const dates = [];
  const cursor = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T00:00:00`);
  while (cursor <= endDate) {
    dates.push(localISO(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
};

const setRange = (start, end) => {
  insightsRange = { start, end };
  elements.rangeStart.value = start;
  elements.rangeEnd.value = end;
  const rangeDays = buildDateRange(start, end).length;
  const lang = store.getState().settings.lang;
  elements.rangeLabel.textContent =
    rangeDays === 7
      ? dictionary[lang].rangeWeek
      : rangeDays === 30
        ? dictionary[lang].rangeMonth
        : `${rangeDays} ${dictionary[lang].rangeDays}`;
  renderInsights(store.getState().tasks, lang);
  updateRangeButtonUI(rangeDays);
};

const setRangeDays = (days) => {
  const today = new Date();
  const end = localISO(today);
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - (days - 1));
  setRange(localISO(startDate), end);
};

const updateRangeButtonUI = (days) => {
  elements.rangeButtons.forEach((button) => {
    button.classList.toggle("active", Number(button.dataset.range) === days);
  });
};

const normalizePriority = (priority = "normal") => {
  const map = {
    high: "core",
    medium: "important",
    low: "normal"
  };
  const normalized = map[priority] || priority;
  return ["core", "important", "normal"].includes(normalized) ? normalized : "normal";
};

const normalizeRepeat = (repeat = "none") => {
  return ["none", "daily", "weekly", "monthly"].includes(repeat) ? repeat : "none";
};

const normalizeTask = (task) => ({
  ...task,
  priority: normalizePriority(task.priority),
  repeat: normalizeRepeat(task.repeat)
});

const showPage = (page) => {
  elements.pages.forEach((section) => {
    section.classList.toggle("active", section.dataset.page === page);
  });
  elements.navItems.forEach((item) => {
    item.classList.toggle("active", item.dataset.nav === page);
  });
};

const store = createStore(reducer, initialState);

store.subscribe((state, action) => {
  const { settings, tasks, ui } = state;

  applyI18n(settings.lang);
  applyTheme(settings.theme);
  updatePresetUI(settings.theme);
  renderGreeting(settings.lang);
  updateDateDisplay(settings.selectedDate, settings.lang);
  updateFilterUI(ui.filter);
  elements.langSelect.value = settings.lang;
  elements.primaryColor.value = settings.theme.primary;
  elements.accentColor.value = settings.theme.accent;
  elements.backgroundColor.value = settings.theme.background;
  const isEditing = Boolean(ui.editingId);
  elements.taskSubmit.textContent = dictionary[settings.lang][isEditing ? "taskUpdate" : "taskAdd"];
  elements.cancelEdit.hidden = !isEditing;

  const tasksForDate = tasks.filter(
    (task) => task.userId === currentUserId && task.date === settings.selectedDate
  );
  renderOverview(tasksForDate, settings.lang);
  renderPlanning(tasksForDate, settings.lang);
  renderTasks(tasksForDate, settings.lang, ui.filter);
  renderInsights(tasks, settings.lang);

  if (action?.type === "SET_LANG" || action?.type === "INIT") {
    setStorageStatus(storageStatusKey);
    if (insightsRange.start && insightsRange.end) {
      setRange(insightsRange.start, insightsRange.end);
    }
  }
});

const persistTask = async (task) => {
  try {
    setStorageStatus("saving");
    await putTask(task);
    setStorageStatus("saved");
  } catch (error) {
    setStorageStatus("saveError");
  }
};

const removeTask = async (id) => {
  try {
    setStorageStatus("saving");
    await deleteTask(id);
    setStorageStatus("saved");
  } catch (error) {
    setStorageStatus("saveError");
  }
};

const attachUserToTasks = async (tasks) => {
  const missing = tasks.filter((task) => !task.userId);
  if (missing.length === 0) return tasks;

  const updated = tasks.map((task) => (task.userId ? task : { ...task, userId: currentUserId }));
  try {
    setStorageStatus("saving");
    await Promise.all(missing.map((task) => putTask({ ...task, userId: currentUserId })));
    setStorageStatus("saved");
  } catch (error) {
    setStorageStatus("saveError");
  }
  return updated;
};

const hydrate = async () => {
  const settings = loadSettings();
  const rawTasks = (await getAllTasks()).map(normalizeTask);
  const tasks = await attachUserToTasks(rawTasks);
  const today = getTodayISO();
  store.dispatch({
    type: "INIT",
    payload: {
      settings: {
        ...settings,
        selectedDate: today
      },
      tasks
    }
  });
  saveSettings({ ...settings, selectedDate: today });
  setRangeDays(7);
};

const handleFormSubmit = (event) => {
  event.preventDefault();
  const title = elements.taskTitle.value.trim();
  const time = elements.taskTime.value;
  if (!title) return;
  if (!time) {
    window.alert(dictionary[store.getState().settings.lang].taskTimeRequired);
    return;
  }

  const state = store.getState();
  const editingId = state.ui.editingId;
  const baseTask = editingId ? state.tasks.find((task) => task.id === editingId) : null;
  const now = Date.now();

  const durationValue = Number(elements.taskDuration.value);
  const task = {
    id: editingId || generateId(),
    title,
    time,
    duration: Number.isFinite(durationValue) && durationValue > 0 ? durationValue : null,
    priority: elements.taskPriority.value,
    repeat: elements.taskRepeat.value,
    note: elements.taskNote.value.trim(),
    userId: currentUserId,
    date: state.settings.selectedDate,
    status: baseTask?.status || "todo",
    createdAt: baseTask?.createdAt || now,
    updatedAt: now
  };

  if (editingId) {
    store.dispatch({ type: "UPDATE_TASK", payload: task });
  } else {
    store.dispatch({ type: "ADD_TASK", payload: task });
  }

  persistTask(task);
  clearForm();
};

const handleTaskAction = (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  const action = button.dataset.action;
  if (!action) return;

  const item = button.closest(".task-item");
  if (!item) return;
  const id = item.dataset.id;
  const state = store.getState();
  const task = state.tasks.find((entry) => entry.id === id);
  if (!task) return;

  if (action === "toggle") {
    const updated = { ...task, status: task.status === "done" ? "todo" : "done", updatedAt: Date.now() };
    store.dispatch({ type: "UPDATE_TASK", payload: updated });
    persistTask(updated);
    return;
  }

  if (action === "edit") {
    store.dispatch({ type: "SET_EDITING", payload: task.id });
    setEditMode(task);
    elements.taskTitle.focus();
    return;
  }

  if (action === "delete") {
    const confirmText = state.settings.lang === "en" ? "Delete this task?" : "确认删除该任务？";
    if (!window.confirm(confirmText)) return;
    store.dispatch({ type: "DELETE_TASK", payload: id });
    removeTask(id);
    if (state.ui.editingId === id) {
      clearForm();
    }
  }
};

const handleFilter = (event) => {
  const target = event.target.closest(".filter[data-filter]");
  if (!target) return;
  store.dispatch({ type: "SET_FILTER", payload: target.dataset.filter });
};

const handleThemeChange = () => {
  const theme = {
    primary: elements.primaryColor.value,
    accent: elements.accentColor.value,
    background: elements.backgroundColor.value
  };
  store.dispatch({ type: "SET_THEME", payload: theme });
  saveSettings(store.getState().settings);
};

const handleResetTheme = () => {
  store.dispatch({ type: "SET_THEME", payload: defaultSettings.theme });
  saveSettings(store.getState().settings);
};

const handleLanguageChange = (event) => {
  store.dispatch({ type: "SET_LANG", payload: event.target.value });
  saveSettings(store.getState().settings);
};

const handlePresetChange = (event) => {
  const button = event.target.closest(".preset");
  if (!button) return;
  const preset = presets[button.dataset.preset];
  if (!preset) return;
  store.dispatch({ type: "SET_THEME", payload: preset });
  saveSettings(store.getState().settings);
};

const handleRangeChange = () => {
  const start = elements.rangeStart.value;
  const end = elements.rangeEnd.value;
  if (!start || !end) return;
  if (start > end) return;
  setRange(start, end);
};

const handleRangeQuick = (event) => {
  const button = event.target.closest("[data-range]");
  if (!button) return;
  setRangeDays(Number(button.dataset.range));
};

const handleNavClick = (event) => {
  const button = event.target.closest(".nav-item");
  if (!button) return;
  showPage(button.dataset.nav);
};

const setupListeners = () => {
  elements.taskForm.addEventListener("submit", handleFormSubmit);
  elements.taskList.addEventListener("click", handleTaskAction);
  elements.filters.forEach((button) => button.addEventListener("click", handleFilter));

  elements.langSelect.addEventListener("change", handleLanguageChange);
  elements.primaryColor.addEventListener("input", handleThemeChange);
  elements.accentColor.addEventListener("input", handleThemeChange);
  elements.backgroundColor.addEventListener("input", handleThemeChange);
  elements.resetTheme.addEventListener("click", handleResetTheme);
  elements.cancelEdit.addEventListener("click", clearForm);

  elements.presetButtons.forEach((button) => button.addEventListener("click", handlePresetChange));

  elements.rangeStart.addEventListener("change", handleRangeChange);
  elements.rangeEnd.addEventListener("change", handleRangeChange);
  elements.rangeButtons.forEach((button) => button.addEventListener("click", handleRangeQuick));

  elements.navItems.forEach((item) => item.addEventListener("click", handleNavClick));
};

setupListeners();
setStorageStatus("saved");
showPage("overview");
hydrate();
