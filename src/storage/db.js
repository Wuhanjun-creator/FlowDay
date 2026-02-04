const DB_NAME = "flowday";
const DB_VERSION = 3;
const TASK_STORE = "tasks";
const THEME_STORE = "themes";
const USER_SETTINGS_STORE = "userSettings";

let dbPromise;

const openDb = () => {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(TASK_STORE)) {
        db.createObjectStore(TASK_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(THEME_STORE)) {
        const themeStore = db.createObjectStore(THEME_STORE, { keyPath: "id" });
        themeStore.createIndex("userId", "userId", { unique: false });
      }
      if (!db.objectStoreNames.contains(USER_SETTINGS_STORE)) {
        const userSettingsStore = db.createObjectStore(USER_SETTINGS_STORE, { keyPath: "userId" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
};

const withStore = async (mode, callback, storeName = TASK_STORE) => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const request = callback(store);

    tx.oncomplete = () => resolve(request?.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
};

export const getAllTasks = () =>
  withStore("readonly", (store) => store.getAll()).catch(() => []);

export const putTask = (task) => withStore("readwrite", (store) => store.put(task));

export const deleteTask = (id) => withStore("readwrite", (store) => store.delete(id));

export const clearTasks = () => withStore("readwrite", (store) => store.clear());

// Theme related functions
export const getAllThemes = (userId) =>
  withStore("readonly", (store) => store.index("userId").getAll(userId), THEME_STORE).catch(() => []);

export const putTheme = (theme) => withStore("readwrite", (store) => store.put(theme), THEME_STORE);

export const deleteTheme = (id) => withStore("readwrite", (store) => store.delete(id), THEME_STORE);

export const clearThemes = () => withStore("readwrite", (store) => store.clear(), THEME_STORE);

// User settings related functions
export const getUserSettings = (userId) =>
  withStore("readonly", (store) => store.get(userId), USER_SETTINGS_STORE).catch(() => null);

export const saveUserSettings = (userId, settings) => 
  withStore("readwrite", (store) => store.put({ userId, ...settings }), USER_SETTINGS_STORE);
