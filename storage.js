// storage.js — chrome.storage.local Promise 化封装

const STORAGE_KEY = "favorites-data";

const Storage = {
  // 生成唯一 ID
  generateId() {
    return "fav-" + crypto.randomUUID();
  },

  // 加载或初始化数据
  async init() {
    const data = await this.getAll();
    if (!data) {
      const defaultData = { version: 1, items: {}, rootOrder: [] };
      await this.save(defaultData);
      return defaultData;
    }
    return data;
  },

  // 获取全部数据
  async getAll() {
    return new Promise((resolve) => {
      chrome.storage.local.get(STORAGE_KEY, (result) => {
        resolve(result[STORAGE_KEY] || null);
      });
    });
  },

  // 保存全部数据
  async save(data) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [STORAGE_KEY]: data }, resolve);
    });
  },
};
