// history.js — 浏览历史数据操作层

const History = {
  // 搜索历史记录
  async search(query, { startTime, endTime, maxResults = 200 } = {}) {
    const params = {
      text: query || "",
      maxResults,
    };
    if (startTime) params.startTime = startTime;
    if (endTime) params.endTime = endTime;

    return new Promise((resolve) => {
      chrome.history.search(params, (results) => {
        resolve(results || []);
      });
    });
  },

  // 获取最近的历史记录
  async getRecent(maxResults = 200) {
    const endTime = Date.now();
    // 默认最近 30 天
    const startTime = endTime - 30 * 24 * 60 * 60 * 1000;
    return this.search("", { startTime, endTime, maxResults });
  },

  // 按时间范围获取
  async getByRange(startTime, endTime, maxResults = 500) {
    return this.search("", { startTime, endTime, maxResults });
  },

  // 删除单条 URL 的所有访问记录
  async deleteUrl(url) {
    return new Promise((resolve) => {
      chrome.history.deleteUrl({ url }, resolve);
    });
  },

  // 删除时间范围内的记录
  async deleteRange(startTime, endTime) {
    return new Promise((resolve) => {
      chrome.history.deleteRange({ startTime, endTime }, resolve);
    });
  },

  // 获取今天开始的时间戳
  getTodayStart() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  },

  // 获取昨天开始的时间戳
  getYesterdayStart() {
    const today = this.getTodayStart();
    return today - 24 * 60 * 60 * 1000;
  },

  // 获取 N 天前的时间戳
  getDaysAgo(n) {
    return Date.now() - n * 24 * 60 * 60 * 1000;
  },
};
