import { getAllTasks } from "../storage/db.js";
import { applyI18n } from "../i18n.js";
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
  rangeStart: $("#rangeStart"),
  rangeEnd: $("#rangeEnd"),
  rangeButtons: $$("[data-range]"),
  rangeLabel: $("#rangeLabel"),
  rangeTotal: $("#rangeTotal"),
  rangeDone: $("#rangeDone"),
  rangeRate: $("#rangeRate"),
  rangeChart: $("#rangeChart"),
  insightsRing: $("#insightsRing"),
  insightsRingValue: $("#insightsRingValue"),
  rangeEmpty: $("#rangeEmpty")
};

// 状态
let tasks = [];
let currentRange = { start: "", end: "" };

// 规范化任务数据
const normalizeTask = (task) => ({
  ...task,
  priority: task.priority || "normal",
  completed: task.completed || false,
  date: task.date || getTodayISO()
});

// 获取日期范围内的任务
const getTasksInRange = (start, end) => {
  return tasks.filter((task) => {
    const taskDate = task.date;
    return taskDate >= start && taskDate <= end;
  });
};

// 生成堆叠柱状图
const renderStackedBarChart = (tasksInRange, start, end) => {
  const chartContainer = elements.rangeChart;
  if (!chartContainer) return;

  // 按日期分组统计
  const dateMap = new Map();
  const startDate = new Date(start);
  const endDate = new Date(end);
  
  // 初始化所有日期
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().slice(0, 10);
    dateMap.set(dateStr, { core: 0, important: 0, normal: 0, total: 0 });
  }

  // 统计任务
  tasksInRange.forEach((task) => {
    const stats = dateMap.get(task.date);
    if (stats) {
      stats[task.priority]++;
      stats.total++;
    }
  });

  // 找出最大值用于缩放
  let maxValue = 0;
  dateMap.forEach((stats) => {
    maxValue = Math.max(maxValue, stats.total);
  });
  maxValue = Math.max(maxValue, 1); // 避免除以0

  // 生成HTML
  const dates = Array.from(dateMap.keys()).sort();
  const bars = dates.map((date) => {
    const stats = dateMap.get(date);
    const height = maxValue > 0 ? (stats.total / maxValue) * 100 : 0;
    const day = new Date(date).getDate();
    
    return `
      <div class="chart-bar-wrapper">
        <div class="chart-bar" style="height: ${Math.max(height, 5)}%">
          <div class="chart-segment core" style="height: ${stats.total > 0 ? (stats.core / stats.total) * 100 : 0}%"></div>
          <div class="chart-segment important" style="height: ${stats.total > 0 ? (stats.important / stats.total) * 100 : 0}%"></div>
          <div class="chart-segment normal" style="height: ${stats.total > 0 ? (stats.normal / stats.total) * 100 : 0}%"></div>
        </div>
        <div class="chart-label">${day}</div>
      </div>
    `;
  }).join("");

  chartContainer.innerHTML = `
    <div class="chart-container">
      <div class="chart-bars">${bars}</div>
    </div>
    <div class="chart-legend">
      <div class="legend-item">
        <span class="legend-color core"></span>
        <span>核心</span>
      </div>
      <div class="legend-item">
        <span class="legend-color important"></span>
        <span>重要</span>
      </div>
      <div class="legend-item">
        <span class="legend-color normal"></span>
        <span>普通</span>
      </div>
    </div>
  `;
};

// 更新洞察数据
const updateInsights = () => {
  const { start, end } = currentRange;
  if (!start || !end) return;

  const tasksInRange = getTasksInRange(start, end);
  const total = tasksInRange.length;
  const done = tasksInRange.filter((t) => t.completed).length;
  const rate = total === 0 ? 0 : Math.round((done / total) * 100);

  elements.rangeTotal.textContent = total;
  elements.rangeDone.textContent = done;
  elements.rangeRate.textContent = `${rate}%`;
  elements.insightsRingValue.textContent = `${rate}%`;
  elements.insightsRing.style.setProperty("--progress", `${rate}%`);

  // 更新图表
  if (total > 0) {
    renderStackedBarChart(tasksInRange, start, end);
    elements.rangeChart.hidden = false;
    elements.rangeEmpty.hidden = true;
  } else {
    elements.rangeChart.hidden = true;
    elements.rangeEmpty.hidden = false;
  }

  // 更新日期标签
  const lang = localStorage.getItem("flowday-lang") || "zh";
  if (lang === "zh") {
    elements.rangeLabel.textContent = `${start.slice(5)} 至 ${end.slice(5)}`;
  } else {
    const startDate = new Date(start);
    const endDate = new Date(end);
    elements.rangeLabel.textContent = `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
  }
};

// 设置日期范围
const setRange = (start, end) => {
  currentRange = { start, end };
  if (elements.rangeStart) elements.rangeStart.value = start;
  if (elements.rangeEnd) elements.rangeEnd.value = end;
  updateInsights();
};

// 设置最近N天
const setRangeDays = (days) => {
  const end = getTodayISO();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days + 1);
  const start = startDate.toISOString().slice(0, 10);
  setRange(start, end);
};

// 处理日期变更
const handleRangeChange = () => {
  const start = elements.rangeStart.value;
  const end = elements.rangeEnd.value;
  if (!start || !end) return;
  if (start > end) return;
  setRange(start, end);
};

// 处理快速范围选择
const handleRangeQuick = (event) => {
  const button = event.target.closest("[data-range]");
  if (!button) return;

  elements.rangeButtons.forEach((btn) => btn.classList.remove("active"));
  button.classList.add("active");
  
  const days = Number(button.dataset.range);
  setRangeDays(days);
};

// 初始化
const init = async () => {
  // 初始化侧边栏
  initSidebar("insights");
  initOutsideClick();

  // 加载任务
  const rawTasks = await getAllTasks();
  tasks = rawTasks.map(normalizeTask);

  // 设置事件监听
  elements.rangeStart.addEventListener("change", handleRangeChange);
  elements.rangeEnd.addEventListener("change", handleRangeChange);
  elements.rangeButtons.forEach((btn) => btn.addEventListener("click", handleRangeQuick));

  // 默认显示最近7天
  setRangeDays(7);

  applyI18n();
};

init();
