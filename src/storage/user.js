// 用户数据管理模块

import { 
  openDb, 
  USER_STORE, 
  encryptPayload, 
  decryptPayload,
  derivePasswordHash,
  createPasswordHash
} from '../auth/auth.js';

// 获取用户数据
export const getUserData = async (userId) => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(USER_STORE, 'readonly');
    const store = tx.objectStore(USER_STORE);
    const request = store.get(userId);

    request.onsuccess = async () => {
      const row = request.result;
      if (!row) {
        reject(new Error('用户不存在'));
        return;
      }

      try {
        const data = await decryptPayload(row.payload);
        resolve({
          id: row.id,
          email: data.email,
          profile: data.profile,
          createdAt: row.created_at,
          updatedAt: row.updated_at
        });
      } catch (error) {
        reject(error);
      }
    };

    request.onerror = () => reject(request.error);
  });
};

// 更新用户资料
export const updateUserProfile = async (userId, profile) => {
  const db = await openDb();
  return new Promise(async (resolve, reject) => {
    const tx = db.transaction(USER_STORE, 'readwrite');
    const store = tx.objectStore(USER_STORE);
    const request = store.get(userId);

    request.onsuccess = async () => {
      const row = request.result;
      if (!row) {
        reject(new Error('用户不存在'));
        return;
      }

      try {
        const data = await decryptPayload(row.payload);
        
        // 更新资料
        data.profile = {
          ...data.profile,
          ...profile
        };
        data.updatedAt = Date.now();

        // 重新加密
        const encryptedPayload = await encryptPayload(data);

        // 保存
        const updateRequest = store.put({
          id: userId,
          email_hash: row.email_hash,
          payload: encryptedPayload,
          created_at: row.created_at,
          updated_at: Date.now()
        });

        updateRequest.onsuccess = () => resolve(true);
        updateRequest.onerror = () => reject(updateRequest.error);
      } catch (error) {
        reject(error);
      }
    };

    request.onerror = () => reject(request.error);
  });
};

// 更新用户密码
export const updateUserPassword = async (userId, currentPassword, newPassword) => {
  const db = await openDb();
  return new Promise(async (resolve, reject) => {
    const tx = db.transaction(USER_STORE, 'readwrite');
    const store = tx.objectStore(USER_STORE);
    const request = store.get(userId);

    request.onsuccess = async () => {
      const row = request.result;
      if (!row) {
        reject(new Error('用户不存在'));
        return;
      }

      try {
        const data = await decryptPayload(row.payload);
        
        // 验证当前密码
        const expected = data?.pw?.hash;
        const salt = data?.pw?.salt;
        const iterations = data?.pw?.iterations || 120000;
        
        if (!expected || !salt) {
          reject(new Error('账户数据已损坏'));
          return;
        }

        const candidate = await derivePasswordHash(currentPassword, salt, iterations);
        if (candidate !== expected) {
          reject(new Error('当前密码不正确'));
          return;
        }

        // 创建新密码哈希
        const newPw = await createPasswordHash(newPassword);
        data.pw = newPw;
        data.updatedAt = Date.now();

        // 重新加密
        const encryptedPayload = await encryptPayload(data);

        // 保存
        const updateRequest = store.put({
          id: userId,
          email_hash: row.email_hash,
          payload: encryptedPayload,
          created_at: row.created_at,
          updated_at: Date.now()
        });

        updateRequest.onsuccess = () => resolve(true);
        updateRequest.onerror = () => reject(updateRequest.error);
      } catch (error) {
        reject(error);
      }
    };

    request.onerror = () => reject(request.error);
  });
};

// 删除用户账户
export const deleteUserAccount = async (userId) => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(USER_STORE, 'readwrite');
    const store = tx.objectStore(USER_STORE);
    const request = store.delete(userId);

    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
};
