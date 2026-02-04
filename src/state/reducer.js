export const getTodayISO = () => {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

export const defaultSettings = {
  lang: "zh",
  timezone: "Asia/Shanghai",
  // 主题将在应用初始化时从数据库加载
  theme: null,
  selectedDate: getTodayISO()
};

export const initialState = {
  settings: defaultSettings,
  tasks: [],
  ui: {
    filter: "all",
    editingId: null
  }
};

export const reducer = (state, action) => {
  switch (action.type) {
    case "INIT":
      return {
        ...state,
        ...action.payload,
        settings: {
          ...state.settings,
          ...action.payload.settings
        }
      };
    case "SET_LANG":
      return {
        ...state,
        settings: {
          ...state.settings,
          lang: action.payload
        }
      };
    case "SET_TIMEZONE":
      return {
        ...state,
        settings: {
          ...state.settings,
          timezone: action.payload
        }
      };
    case "SET_THEME":
      return {
        ...state,
        settings: {
          ...state.settings,
          theme: {
            ...state.settings.theme,
            ...action.payload
          }
        }
      };
    case "SET_SELECTED_DATE":
      return {
        ...state,
        settings: {
          ...state.settings,
          selectedDate: action.payload
        }
      };
    case "SET_FILTER":
      return {
        ...state,
        ui: {
          ...state.ui,
          filter: action.payload
        }
      };
    case "SET_EDITING":
      return {
        ...state,
        ui: {
          ...state.ui,
          editingId: action.payload
        }
      };
    case "ADD_TASK":
      return {
        ...state,
        tasks: [action.payload, ...state.tasks]
      };
    case "UPDATE_TASK":
      return {
        ...state,
        tasks: state.tasks.map((task) => (task.id === action.payload.id ? action.payload : task))
      };
    case "DELETE_TASK":
      return {
        ...state,
        tasks: state.tasks.filter((task) => task.id !== action.payload)
      };
    case "TOGGLE_TASK":
      return {
        ...state,
        tasks: state.tasks.map((task) =>
          task.id === action.payload ? { ...task, status: task.status === "done" ? "todo" : "done" } : task
        )
      };
    default:
      return state;
  }
};
