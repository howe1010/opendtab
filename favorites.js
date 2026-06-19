// favorites.js — 收藏夹数据操作层（基于浏览器原生书签 API）

const Favorites = {
  // 根节点 ID
  ROOT_ID: "0",
  // 书签栏 ID
  BAR_ID: "1",

  // 初始化（浏览器书签不需要额外初始化）
  async init() {
    return new Promise((resolve) => {
      chrome.bookmarks.getTree(resolve);
    });
  },

  // 刷新（无操作，每次 getChildren 都实时读取）
  async reload() {},

  // 判断是否是文件夹
  isFolder(node) {
    return node && !node.url;
  },

  // 获取某个父级下的子项
  async getChildren(parentId) {
    const id = parentId || this.ROOT_ID;
    return new Promise((resolve) => {
      chrome.bookmarks.getChildren(id, (children) => {
        resolve(children || []);
      });
    });
  },

  // 获取单个节点
  async getItem(id) {
    return new Promise((resolve) => {
      chrome.bookmarks.get(id, (nodes) => {
        resolve(nodes && nodes.length > 0 ? nodes[0] : null);
      });
    });
  },

  // 添加书签
  async addBookmark({ title, url, parentId }) {
    // 去重
    const exists = await this._findByUrl(url);
    if (exists) return false;

    return new Promise((resolve) => {
      chrome.bookmarks.create(
        {
          parentId: parentId || this.BAR_ID,
          title: title || url,
          url: url,
        },
        (result) => resolve(result ? result.id : false),
      );
    });
  },

  // 添加域名组（创建文件夹 + 逐个添加书签）
  async addDomainGroup({ title, domain, urls, parentId }) {
    const folderTitle = title || domain;
    const targetParent = parentId || this.BAR_ID;

    // 去重：检查是否已有同名文件夹
    const children = await this.getChildren(targetParent);
    const exists = children.some(
      (c) => !c.url && c.title === folderTitle,
    );
    if (exists) return false;

    return new Promise((resolve) => {
      chrome.bookmarks.create(
        { parentId: targetParent, title: folderTitle },
        async (folder) => {
          for (const u of urls) {
            await new Promise((res) => {
              chrome.bookmarks.create(
                {
                  parentId: folder.id,
                  title: u.title || u.url,
                  url: u.url,
                },
                res,
              );
            });
          }
          resolve(folder.id);
        },
      );
    });
  },

  // 创建文件夹
  async createFolder(title, parentId) {
    return new Promise((resolve) => {
      chrome.bookmarks.create(
        { parentId: parentId || this.BAR_ID, title: title },
        (result) => resolve(result ? result.id : null),
      );
    });
  },

  // 删除项
  async deleteItem(id) {
    const node = await this.getItem(id);
    if (!node) return;

    return new Promise((resolve) => {
      if (this.isFolder(node)) {
        chrome.bookmarks.removeTree(id, resolve);
      } else {
        chrome.bookmarks.remove(id, resolve);
      }
    });
  },

  // 重命名
  async renameItem(id, newTitle) {
    return new Promise((resolve) => {
      chrome.bookmarks.update(id, { title: newTitle }, resolve);
    });
  },

  // 搜索
  async search(query) {
    return new Promise((resolve) => {
      chrome.bookmarks.search(query, (results) => {
        // 只返回有 URL 的书签节点
        resolve(results.filter((r) => r.url));
      });
    });
  },

  // 打开书签
  async openBookmark(id) {
    const node = await this.getItem(id);
    if (!node || !node.url) return;
    await chrome.tabs.create({ url: node.url });
  },

  // 打开文件夹下的所有书签
  async openDomainGroup(id) {
    const children = await this.getChildren(id);
    const bookmarks = children.filter((c) => c.url);
    for (const b of bookmarks) {
      await chrome.tabs.create({ url: b.url });
    }
    return bookmarks.length;
  },

  // 获取面包屑路径
  async getBreadcrumb(folderId) {
    const path = [];
    let current = folderId;
    while (current && current !== this.ROOT_ID) {
      const node = await this.getItem(current);
      if (!node) break;
      path.unshift({ id: node.id, title: node.title });
      current = node.parentId;
    }
    return path;
  },

  // 检查 URL 是否已被收藏
  async isBookmarked(url) {
    return this._findByUrl(url);
  },

  // 检查域名组是否已存在
  async isDomainGrouped(domain) {
    const children = await this.getChildren(this.BAR_ID);
    return children.some((c) => !c.url && c.title === domain);
  },

  // 内部：查找同 URL 的书签
  async _findByUrl(url) {
    return new Promise((resolve) => {
      chrome.bookmarks.search({ url }, (results) => {
        resolve(results.some((r) => r.url === url));
      });
    });
  },
};
