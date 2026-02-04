import { getAllTasks, putTask, deleteTask } from "../storage/db.js";
import { applyI18n, dictionary } from "../i18n.js";
import {
  $,
  $$,
  currentUserId,
  getTodayISO,
  initSidebar,
  initOutsideClick
} from "../shared/common.js";

// DOM 元素
const elements = {
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
  filters: $$(".filter[data-filter]")
};

// 状态
let tasks = [];
let editingId = null;
let currentFilter = "all";

// 规范化任务数据
const normalizeTask = (task) => ({
  ...task,
  priority: task.priority || "normal",
  repeat: task.repeat || "none",
  duration: task.duration || "",
  note: task.note || "",
  time: task.time || "",
  completed: task.completed || false
});

// 获取今天的任务
const getTodayTasks = () => {
  const today = getTodayISO();
  return tasks.filter((task) => task.date === today);
};

// 更新概览统计
const updateOverview = () => {
  const todayTasks = getTodayTasks();
  const total = todayTasks.length;
  const done = todayTasks.filter((t) => t.completed).length;
  const remain = total - done;
  const rate = total === 0 ? 0 : Math.round((done / total) * 100);

  elements.statTotal.textContent = total;
  elements.statDone.textContent = done;
  elements.statRemain.textContent = remain;
  elements.progressValue.textContent = `${rate}%`;
  elements.progressRing.style.setProperty("--progress", `${rate}%`);

  // 更新核心事项列表
  const coreTasks = todayTasks.filter((t) => t.priority === "core");
  elements.priorityList.innerHTML = coreTasks
    .map(
      (task) => `
      <li class="priority-item">
        <span class="priority-dot"></span>
        <span class="priority-text">${escapeHtml(task.title)}</span>
      </li>
    `
    )
    .join("");
  elements.priorityEmpty.hidden = coreTasks.length > 0;

  // 更新日程列表
  const plannedTasks = todayTasks
    .filter((t) => t.time)
    .sort((a, b) => a.time.localeCompare(b.time));
  elements.planningList.innerHTML = plannedTasks
    .map(
      (task) => `
      <li class="planning-item">
        <span class="planning-time">${task.time}</span>
        <span class="planning-title ${task.completed ? "done" : ""}">${escapeHtml(task.title)}</span>
      </li>
    `
    )
    .join("");
  elements.planningEmpty.hidden = plannedTasks.length > 0;

  // 更新日期标签
  const now = new Date();
  elements.selectedDateLabel.textContent = `${String(now.getMonth() + 1).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")}`;
};

// 渲染任务列表
const renderTasks = () => {
  const todayTasks = getTodayTasks();
  let filtered = todayTasks;

  if (currentFilter === "todo") {
    filtered = todayTasks.filter((t) => !t.completed);
  } else if (currentFilter === "done") {
    filtered = todayTasks.filter((t) => t.completed);
  }

  // 排序：未完成的在前，按优先级排序
  filtered.sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    const priorityOrder = { core: 0, important: 1, normal: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  elements.taskList.innerHTML = filtered
    .map(
      (task) => `
    <li class="task-item ${task.completed ? "done" : ""}" data-id="${task.id}">
      <label class="task-check">
        <input type="checkbox" ${task.completed ? "checked" : ""} />
      </label>
      <div class="task-main">
        <div class="task-title">${escapeHtml(task.title)}</div>
        <div class="task-meta">
          ${task.time ? `<span class="task-time">${task.time}</span>` : ""}
          ${task.duration ? `<span class="task-duration">${task.duration}分钟</span>` : ""}
          <span class="task-priority priority-${task.priority}">${getPriorityLabel(task.priority)}</span>
          ${task.repeat !== "none" ? `<span class="task-repeat">${getRepeatLabel(task.repeat)}</span>` : ""}
        </div>
      </div>
      <div class="task-actions">
        <button class="icon-btn edit" data-action="edit">编辑</button>
        <button class="icon-btn delete" data-action="delete">删除</button>
      </div>
    </li>
  `
    )
    .join("");

  elements.taskEmpty.hidden = filtered.length > 0;
  updateOverview();
};

// 获取优先级标签
const getPriorityLabel = (priority) => {
  const labels = {
    core: "核心",
    important: "重要",
    normal: "普通"
  };
  return labels[priority] || priority;
};

// 获取重复标签
const getRepeatLabel = (repeat) => {
  const labels = {
    daily: "每天",
    weekly: "每周",
    monthly: "每月"
  };
  return labels[repeat] || repeat;
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

// 处理表单提交
const handleFormSubmit = async (e) => {
  e.preventDefault();

  const taskData = {
    id: editingId || `${currentUserId}-${Date.now()}`,
    userId: currentUserId,
    title: elements.taskTitle.value.trim(),
    time: elements.taskTime.value,
    priority: elements.taskPriority.value,
    repeat: elements.taskRepeat.value,
    duration: elements.taskDuration.value,
    note: elements.taskNote.value.trim(),
    date: getTodayISO(),
    completed: false
  };

  if (editingId) {
    const existing = tasks.find((t) => t.id === editingId);
    if (existing) {
      taskData.completed = existing.completed;
    }
  }

  await putTask(taskData);
  tasks = tasks.filter((t) => t.id !== taskData.id);
  tasks.push(taskData);

  resetForm();
  renderTasks();
};

// 重置表单
const resetForm = () => {
  elements.taskForm.reset();
  editingId = null;
  elements.taskSubmit.textContent = "添加任务";
  elements.cancelEdit.hidden = true;
};

// 处理任务操作
const handleTaskAction = async (e) => {
  const button = e.target.closest("[data-action]");
  if (!button) return;

  const item = e.target.closest(".task-item");
  if (!item) return;

  const id = item.dataset.id;
  const action = button.dataset.action;

  if (action === "delete") {
    await deleteTask(id);
    tasks = tasks.filter((t) => t.id !== id);
    renderTasks();
  } else if (action === "edit") {
    const task = tasks.find((t) => t.id === id);
    if (task) {
      editingId = id;
      elements.taskTitle.value = task.title;
      elements.taskTime.value = task.time;
      elements.taskPriority.value = task.priority;
      elements.taskRepeat.value = task.repeat;
      elements.taskDuration.value = task.duration;
      elements.taskNote.value = task.note;
      elements.taskSubmit.textContent = "保存修改";
      elements.cancelEdit.hidden = false;
    }
  }
};

// 处理复选框点击
const handleCheckboxClick = async (e) => {
  const checkbox = e.target.closest('input[type="checkbox"]');
  if (!checkbox) return;

  const item = checkbox.closest(".task-item");
  if (!item) return;

  const id = item.dataset.id;
  const task = tasks.find((t) => t.id === id);
  if (task) {
    task.completed = checkbox.checked;
    await putTask(task);
    renderTasks();
  }
};

// 处理过滤器点击
const handleFilterClick = (e) => {
  const button = e.target.closest(".filter");
  if (!button) return;

  elements.filters.forEach((btn) => btn.classList.remove("active"));
  button.classList.add("active");
  currentFilter = button.dataset.filter;
  renderTasks();
};

// 初始化
const init = async () => {
  // 初始化侧边栏
  initSidebar("overview");
  initOutsideClick();

  // 加载任务
  const rawTasks = await getAllTasks();
  tasks = rawTasks.map(normalizeTask);

  // 设置事件监听
  elements.taskForm.addEventListener("submit", handleFormSubmit);
  elements.cancelEdit.addEventListener("click", resetForm);
  elements.taskList.addEventListener("click", handleTaskAction);
  elements.taskList.addEventListener("change", handleCheckboxClick);
  elements.filters.forEach((btn) => btn.addEventListener("click", handleFilterClick));

  // 渲染
  renderTasks();
  applyI18n();
};

init();
