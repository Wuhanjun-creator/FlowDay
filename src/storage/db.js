const DB_NAME = "flowday";
const DB_VERSION = 1;
const TASK_STORE = "tasks";

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
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
};

const withStore = async (mode, callback) => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(TASK_STORE, mode);
    const store = tx.objectStore(TASK_STORE);
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
