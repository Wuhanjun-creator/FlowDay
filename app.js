const langSelect = document.getElementById("langSelect");
const themeSelect = document.getElementById("themeSelect");
const dateValue = document.getElementById("dateValue");
const taskForm = document.getElementById("taskForm");
const taskText = document.getElementById("taskText");
const taskList = document.getElementById("taskList");
const progressRing = document.querySelector("[data-progress-ring]");
const progressValue = document.querySelector("[data-progress-value]");

const dictionary = {
  zh: {
    tagline: "让高效成为默认设置",
    today: "今天",
    language: "语言",
    theme: "主题",
    langZh: "中文",
    langEn: "English",
    themeMist: "雾白",
    themeNight: "夜色",
    themeDawn: "日光",
    overview: "今日概览",
    focusMode: "专注模式",
    completion: "完成率",
    tasksDone: "已完成任务",
    tasksTotal: "今日任务",
    focusTime: "专注时间",
    energyCurve: "能量曲线",
    energyTip: "上午能量高，安排深度工作",
    timeline: "时间轴",
    optimize: "智能优化",
    slotFocus: "深度工作：产品策略",
    slotFocusMeta: "2 小时 · 高专注",
    slotReview: "团队同步 & 复盘",
    slotReviewMeta: "45 分钟 · 协作",
    slotCreative: "灵感设计 & 写作",
    slotCreativeMeta: "90 分钟 · 创造力",
    slotAdmin: "碎片清单处理",
    slotAdminMeta: "30 分钟 · 维护",
    tagHigh: "高优先",
    tagTeam: "团队",
    tagCreate: "创意",
    tagLight: "轻量",
    tasks: "今日要做",
    taskHint: "轻点完成 · 回车添加",
    taskPlaceholder: "写下今天最重要的三件事...",
    add: "添加",
    newTag: "新增",
    task1: "更新路线图 v2",
    task1Meta: "09:00 - 10:00 · 高优先",
    tagStrategy: "策略",
    task2: "访谈纪要整理",
    task2Meta: "11:30 - 12:00 · 协作",
    tagResearch: "研究",
    task3: "设计 Sprint 方案",
    task3Meta: "14:00 - 15:30 · 创意",
    tagDesign: "设计",
    task4: "回顾邮件与跟进",
    task4Meta: "16:30 - 17:00 · 轻量",
    tagOps: "运营",
    focus: "专注时段",
    focusHint: "智能分配 3 段",
    focus1: "深度工作",
    focus1Meta: "关闭通知 · 深度专注",
    focus2: "创造时刻",
    focus2Meta: "灵感板 · 写作",
    focus3: "轻量收尾",
    focus3Meta: "复盘 · 规划明日",
    startFocus: "开始专注",
    habits: "习惯追踪",
    habitHint: "连续 12 天",
    habit1: "清晨阅读 20 分钟",
    habit2: "站立办公 45 分钟",
    habit3: "运动 30 分钟",
    habitNote: "保持节奏，让高效成为习惯"
  },
  en: {
    tagline: "Make efficiency the default",
    today: "Today",
    language: "Language",
    theme: "Theme",
    langZh: "Chinese",
    langEn: "English",
    themeMist: "Mist",
    themeNight: "Night",
    themeDawn: "Dawn",
    overview: "Daily Overview",
    focusMode: "Focus Mode",
    completion: "Completion",
    tasksDone: "Completed",
    tasksTotal: "Total Tasks",
    focusTime: "Focus Time",
    energyCurve: "Energy Curve",
    energyTip: "High energy in the morning, schedule deep work",
    timeline: "Timeline",
    optimize: "Optimize",
    slotFocus: "Deep Work: Product Strategy",
    slotFocusMeta: "2 hours · High focus",
    slotReview: "Team Sync & Review",
    slotReviewMeta: "45 mins · Collaboration",
    slotCreative: "Creative Design & Writing",
    slotCreativeMeta: "90 mins · Creativity",
    slotAdmin: "Admin Tasks",
    slotAdminMeta: "30 mins · Maintenance",
    tagHigh: "High",
    tagTeam: "Team",
    tagCreate: "Creative",
    tagLight: "Light",
    tasks: "Today's Tasks",
    taskHint: "Tap to complete · Enter to add",
    taskPlaceholder: "Write your top 3 priorities today...",
    add: "Add",
    newTag: "New",
    task1: "Update roadmap v2",
    task1Meta: "09:00 - 10:00 · High priority",
    tagStrategy: "Strategy",
    task2: "Organize interview notes",
    task2Meta: "11:30 - 12:00 · Collaboration",
    tagResearch: "Research",
    task3: "Design sprint plan",
    task3Meta: "14:00 - 15:30 · Creative",
    tagDesign: "Design",
    task4: "Email review & follow-ups",
    task4Meta: "16:30 - 17:00 · Light",
    tagOps: "Ops",
    focus: "Focus Sessions",
    focusHint: "Auto schedule 3 blocks",
    focus1: "Deep Work",
    focus1Meta: "Silence notifications · Deep focus",
    focus2: "Creative Window",
    focus2Meta: "Moodboard · Writing",
    focus3: "Wrap-up",
    focus3Meta: "Review · Plan tomorrow",
    startFocus: "Start Focus",
    habits: "Habits",
    habitHint: "12-day streak",
    habit1: "Morning reading 20 mins",
    habit2: "Standing desk 45 mins",
    habit3: "Workout 30 mins",
    habitNote: "Keep the rhythm, make efficiency a habit"
  }
};

const getLocale = () => (langSelect.value === "en" ? "en-US" : "zh-CN");

const applyLanguage = (lang) => {
  const locale = lang === "en" ? "en-US" : "zh-CN";
  document.documentElement.lang = lang === "en" ? "en" : "zh";

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.dataset.i18n;
    const value = dictionary[lang][key];
    if (value) {
      el.textContent = value;
    }
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.dataset.i18nPlaceholder;
    const value = dictionary[lang][key];
    if (value) {
      el.setAttribute("placeholder", value);
    }
  });

  updateDate(locale);
};

const updateDate = (locale) => {
  const now = new Date();
  const formatted = new Intl.DateTimeFormat(locale, {
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(now);
  dateValue.textContent = formatted;
};

const updateProgress = () => {
  const tasks = taskList.querySelectorAll(".task");
  const done = taskList.querySelectorAll('.task[data-status="done"]').length;
  const total = tasks.length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);

  const doneEl = document.querySelector('[data-metric="done"]');
  const totalEl = document.querySelector('[data-metric="total"]');

  doneEl.textContent = done;
  totalEl.textContent = total;
  progressValue.textContent = `${percent}%`;
  progressRing.style.setProperty("--progress", `${percent}%`);
};

const addTask = (text) => {
  const item = document.createElement("li");
  item.className = "task";
  item.dataset.status = "todo";

  item.innerHTML = `
    <button class="check" type="button" aria-pressed="false"></button>
    <div class="task-body">
      <div class="task-title"></div>
      <div class="task-meta">${new Intl.DateTimeFormat(getLocale(), {
        hour: "2-digit",
        minute: "2-digit"
      }).format(new Date())} · ${dictionary[langSelect.value].newTag}</div>
    </div>
    <span class="tag">${dictionary[langSelect.value].newTag}</span>
  `;

  item.querySelector(".task-title").textContent = text;
  taskList.prepend(item);
};

const toggleTask = (item) => {
  const isDone = item.dataset.status === "done";
  item.dataset.status = isDone ? "todo" : "done";
  const btn = item.querySelector(".check");
  btn.setAttribute("aria-pressed", String(!isDone));
};

const toggleHabit = (btn) => {
  const pressed = btn.getAttribute("aria-pressed") === "true";
  btn.setAttribute("aria-pressed", String(!pressed));
};

langSelect.addEventListener("change", (event) => {
  const lang = event.target.value;
  localStorage.setItem("flowday-lang", lang);
  applyLanguage(lang);
});

themeSelect.addEventListener("change", (event) => {
  const theme = event.target.value;
  document.body.dataset.theme = theme;
  localStorage.setItem("flowday-theme", theme);
});

taskForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = taskText.value.trim();
  if (!text) return;
  addTask(text);
  taskText.value = "";
  updateProgress();
});

taskList.addEventListener("click", (event) => {
  const btn = event.target.closest(".check");
  if (!btn) return;
  const item = btn.closest(".task");
  toggleTask(item);
  updateProgress();
});

document.querySelectorAll(".toggle").forEach((btn) => {
  btn.addEventListener("click", () => toggleHabit(btn));
});

const savedLang = localStorage.getItem("flowday-lang") || "zh";
const savedTheme = localStorage.getItem("flowday-theme") || "mist";
langSelect.value = savedLang;
themeSelect.value = savedTheme;
document.body.dataset.theme = savedTheme;

applyLanguage(savedLang);
updateProgress();
