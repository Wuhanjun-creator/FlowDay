const DB_NAME = "flowday_auth";
const DB_VERSION = 1;
const SESSION_KEY = "flowday-session";
const AUTH_KEY_STORAGE = "flowday-auth-key";
const GUEST_KEY = "flowday-guest-id";
const PASSWORD_ITERATIONS = 120000;
export const USER_STORE = "users";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const normalizeEmail = (email) => email.trim().toLowerCase();

const bytesToBase64 = (bytes) => {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
};

const base64ToBytes = (b64) => {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

const ensureAuthKey = () => {
  let stored = localStorage.getItem(AUTH_KEY_STORAGE);
  if (!stored) {
    const raw = crypto.getRandomValues(new Uint8Array(32));
    stored = bytesToBase64(raw);
    localStorage.setItem(AUTH_KEY_STORAGE, stored);
  }
  return base64ToBytes(stored);
};

const ensureCrypto = () => {
  if (!crypto?.subtle) {
    throw new Error("当前环境不支持本地加密模块。请使用支持 WebCrypto 的 WebView。");
  }
};

const getCryptoKey = async () => {
  ensureCrypto();
  const raw = ensureAuthKey();
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
};

export const encryptPayload = async (payload) => {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await getCryptoKey();
  const encoded = encoder.encode(JSON.stringify(payload));
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
  return `${bytesToBase64(iv)}.${bytesToBase64(new Uint8Array(cipher))}`;
};

export const decryptPayload = async (payload) => {
  const [ivPart, dataPart] = payload.split(".");
  if (!ivPart || !dataPart) {
    throw new Error("账户数据已损坏。请重新注册或清空本地数据。");
  }
  const iv = base64ToBytes(ivPart);
  const data = base64ToBytes(dataPart);
  const key = await getCryptoKey();
  try {
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
    return JSON.parse(decoder.decode(plain));
  } catch (error) {
    throw new Error("账户数据已损坏。请重新注册或清空本地数据。");
  }
};

export const derivePasswordHash = async (password, saltB64, iterations = PASSWORD_ITERATIONS) => {
  const salt = base64ToBytes(saltB64);
  const baseKey = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, [
    "deriveBits"
  ]);
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations,
      hash: "SHA-256"
    },
    baseKey,
    256
  );
  return bytesToBase64(new Uint8Array(bits));
};

export const createPasswordHash = async (password) => {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltB64 = bytesToBase64(salt);
  const hash = await derivePasswordHash(password, saltB64, PASSWORD_ITERATIONS);
  return { salt: saltB64, hash, iterations: PASSWORD_ITERATIONS };
};

const hashEmail = async (email) => {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(email));
  return bytesToBase64(new Uint8Array(digest));
};

let dbPromise;

export const openDb = () => {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(USER_STORE)) {
        const store = db.createObjectStore(USER_STORE, { keyPath: "id" });
        store.createIndex("email_hash", "email_hash", { unique: true });
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
    const tx = db.transaction(USER_STORE, mode);
    const store = tx.objectStore(USER_STORE);
    const request = callback(store);

    tx.oncomplete = () => resolve(request?.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
};

export const initAuth = async () => {
  ensureCrypto();
  await openDb();
};

export const getSession = () => {
  try {
    const value = localStorage.getItem(SESSION_KEY);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    return null;
  }
};

export const setSession = (session) => {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
};

export const clearSession = () => {
  localStorage.removeItem(SESSION_KEY);
};

export const ensureGuestSession = () => {
  const existing = getSession();
  if (existing) return existing;
  let guestId = localStorage.getItem(GUEST_KEY);
  if (!guestId) {
    guestId = crypto?.randomUUID ? `guest-${crypto.randomUUID()}` : `guest-${Date.now()}`;
    localStorage.setItem(GUEST_KEY, guestId);
  }
  const guest = { id: guestId, mode: "guest" };
  setSession(guest);
  return guest;
};

export const registerUser = async ({ email, password, profile }) => {
  const normalizedEmail = normalizeEmail(email);
  const emailHash = await hashEmail(normalizedEmail);
  const now = Date.now();

  const existing = await withStore("readonly", (store) => store.index("email_hash").get(emailHash));
  if (existing) {
    throw new Error("该邮箱已注册，请直接登录。");
  }

  const userId = crypto?.randomUUID ? crypto.randomUUID() : `user-${now}`;
  const pw = await createPasswordHash(password);

  const safeProfile = profile || {};
  const payload = {
    email: normalizedEmail,
    pw,
    profile: {
      name: safeProfile.name?.trim() || "",
      gender: safeProfile.gender || "",
      age: safeProfile.age || "",
      birthday: safeProfile.birthday || ""
    },
    createdAt: now,
    updatedAt: now
  };

  const encryptedPayload = await encryptPayload(payload);

  await withStore("readwrite", (store) =>
    store.put({
      id: userId,
      email_hash: emailHash,
      payload: encryptedPayload,
      created_at: now,
      updated_at: now
    })
  );

  const session = {
    id: userId,
    email: normalizedEmail,
    name: payload.profile.name,
    gender: payload.profile.gender,
    age: payload.profile.age,
    birthday: payload.profile.birthday,
    mode: "user"
  };
  setSession(session);
  return session;
};

export const loginUser = async ({ email, password }) => {
  const normalizedEmail = normalizeEmail(email);
  const emailHash = await hashEmail(normalizedEmail);

  const row = await withStore("readonly", (store) => store.index("email_hash").get(emailHash));
  if (!row) {
    throw new Error("邮箱或密码不正确。");
  }

  const data = await decryptPayload(row.payload);
  const expected = data?.pw?.hash;
  const salt = data?.pw?.salt;
  const iterations = data?.pw?.iterations || PASSWORD_ITERATIONS;
  if (!expected || !salt) {
    throw new Error("账户数据已损坏。请重新注册或清空本地数据。");
  }

  const candidate = await derivePasswordHash(password, salt, iterations);
  if (candidate !== expected) {
    throw new Error("邮箱或密码不正确。");
  }

  const session = {
    id: row.id,
    email: data.email || normalizedEmail,
    name: data.profile?.name || "",
    gender: data.profile?.gender || "",
    age: data.profile?.age || "",
    birthday: data.profile?.birthday || "",
    mode: "user"
  };
  setSession(session);
  return session;
};