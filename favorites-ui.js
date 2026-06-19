// favorites-ui.js — 收藏夹 UI 渲染与交互（基于浏览器书签 API）

const FavoritesUI = {
  currentFolderId: null, // null = 根目录 (id "0")
  modalCallback: null,
  expandSubfolders: false,

  // 初始化事件监听
  init() {
    // 展开/折叠子文件夹按钮
    document.getElementById("fav-expand-btn").addEventListener("click", () => {
      this.expandSubfolders = !this.expandSubfolders;
      const label = document.getElementById("fav-expand-label");
      label.textContent = this.expandSubfolders ? "折叠子文件夹" : "展开子文件夹";
      const btn = document.getElementById("fav-expand-btn");
      btn.classList.toggle("active", this.expandSubfolders);
      this.renderView();
    });

    // 新建文件夹按钮
    document.getElementById("new-folder-btn").addEventListener("click", () => {
      this.showModal("新建文件夹", "", async (name) => {
        if (!name.trim()) return;
        await Favorites.createFolder(name.trim(), this.currentFolderId);
        this.renderView();
      });
    });

    // 模态框操作
    document.getElementById("modal-cancel").addEventListener("click", () => this.hideModal());
    document.getElementById("modal-confirm").addEventListener("click", () => this.confirmModal());
    document.getElementById("modal-input").addEventListener("keydown", (e) => {
      if (e.key === "Enter") this.confirmModal();
      if (e.key === "Escape") this.hideModal();
    });
    document.getElementById("modal").addEventListener("click", (e) => {
      if (e.target === e.currentTarget) this.hideModal();
    });

    // 收藏夹网格事件委托
    document.getElementById("fav-grid").addEventListener("click", (e) => {
      // 子文件夹书签行
      const subItem = e.target.closest(".fav-sub-item");
      if (subItem) {
        const id = subItem.dataset.id;
        if (e.target.closest(".fav-action-delete")) {
          this._deleteItem(id);
        } else {
          this._openItem(id);
        }
        return;
      }

      const card = e.target.closest(".fav-item");
      if (!card) return;
      const id = card.dataset.id;

      if (e.target.closest(".fav-action-open")) {
        this._openItem(id);
      } else if (e.target.closest(".fav-action-delete")) {
        this._deleteItem(id);
      } else if (e.target.closest(".fav-action-rename")) {
        this._renameItem(id);
      } else {
        const isFolder = card.dataset.type === "folder";
        if (isFolder) {
          this.navigateTo(id);
        } else if (card.dataset.type === "bookmark") {
          this._openItem(id);
        }
      }
    });
  },

  // 渲染当前文件夹视图
  async renderView() {
    const items = await Favorites.getChildren(this.currentFolderId);
    const grid = document.getElementById("fav-grid");
    grid.innerHTML = "";
    grid.classList.remove("expanded");

    if (items.length === 0) {
      grid.innerHTML = '<div class="empty-msg">此文件夹为空</div>';
      await this.renderBreadcrumb();
      return;
    }

    // 文件夹在前，书签在后
    const folders = items.filter((n) => Favorites.isFolder(n));
    const bookmarks = items.filter((n) => !Favorites.isFolder(n));

    for (const item of [...folders, ...bookmarks]) {
      const card = await this._createCard(item);
      grid.appendChild(card);
    }

    // 展开子文件夹时，在文件夹卡片内部追加子项内容
    if (this.expandSubfolders) {
      grid.classList.add("expanded");
      for (const folder of folders) {
        const children = await this._collectAllBookmarks(folder.id);
        if (children.length > 0) {
          const body = document.createElement("ul");
          body.className = "fav-subfolder-body";
          for (const child of children) {
            body.appendChild(await this._createSubItem(child));
          }
          const folderCard = grid.querySelector(`[data-id="${folder.id}"]`);
          if (folderCard) {
            folderCard.appendChild(body);
          }
        }
      }
    }

    await this.renderBreadcrumb();
  },

  // 递归收集文件夹下所有书签（含子文件夹中的）
  async _collectAllBookmarks(folderId) {
    const children = await Favorites.getChildren(folderId);
    const result = [];
    for (const child of children) {
      if (Favorites.isFolder(child)) {
        const subItems = await this._collectAllBookmarks(child.id);
        result.push(...subItems);
      } else {
        result.push(child);
      }
    }
    return result;
  },

  // 创建子文件夹中的书签行
  async _createSubItem(node) {
    const li = document.createElement("li");
    li.className = "fav-sub-item";
    li.dataset.id = node.id;
    li.dataset.type = "bookmark";
    li.dataset.url = node.url || "";

    let hostname = "";
    try {
      hostname = new URL(node.url).hostname;
    } catch {
      hostname = "";
    }
    const faviconUrl = hostname
      ? `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`
      : "";

    li.innerHTML = `
      <img class="fav-favicon fav-favicon-sm" src="${faviconUrl}" alt="" onerror="this.style.display='none'">
      <span class="fav-sub-title">${this._escapeHtml(node.title || node.url || "未命名")}</span>
      <span class="fav-sub-url">${this._escapeHtml(hostname)}</span>
      <button class="fav-action-open" title="打开">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
      </button>
      <button class="fav-action-delete" title="删除">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
      </button>`;

    return li;
  },

  // 导航到文件夹
  navigateTo(folderId) {
    this.currentFolderId = folderId || null;
    this.renderView();
  },

  // 渲染面包屑
  async renderBreadcrumb() {
    const bc = document.getElementById("fav-breadcrumb");
    const path = this.currentFolderId
      ? await Favorites.getBreadcrumb(this.currentFolderId)
      : [];

    let html = '<span class="crumb" data-id="">根目录</span>';
    for (const p of path) {
      html += '<span class="crumb-sep">/</span>';
      html += `<span class="crumb" data-id="${this._escapeAttr(p.id)}">${this._escapeHtml(p.title)}</span>`;
    }
    bc.innerHTML = html;

    // 面包屑点击
    bc.querySelectorAll(".crumb").forEach((el) => {
      el.addEventListener("click", () => {
        const id = el.dataset.id;
        this.navigateTo(id || null);
      });
    });
  },

  // 创建卡片元素
  async _createCard(node) {
    const card = document.createElement("article");
    const isFolder = Favorites.isFolder(node);
    card.className = `fav-item fav-item--${isFolder ? "folder" : "bookmark"}`;
    card.dataset.id = node.id;
    card.dataset.type = isFolder ? "folder" : "bookmark";

    if (isFolder) {
      card.innerHTML = await this._folderCardHtml(node);
    } else {
      card.innerHTML = this._bookmarkCardHtml(node);
    }

    return card;
  },

  async _folderCardHtml(node) {
    const children = await Favorites.getChildren(node.id);
    const childCount = children.length;
    return `
      <div class="fav-card-header">
        <svg class="fav-icon fav-icon-folder" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
        </svg>
        <span class="fav-title">${this._escapeHtml(node.title || "未命名文件夹")}</span>
        <span class="fav-count">${childCount} 个项目</span>
        <div class="fav-actions">
          <button class="fav-action-rename" title="重命名">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="fav-action-delete" title="删除">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </div>`;
  },

  _bookmarkCardHtml(node) {
    let hostname = "";
    try {
      hostname = new URL(node.url).hostname;
    } catch {
      hostname = "";
    }
    const faviconUrl = hostname
      ? `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`
      : "";
    return `
      <div class="fav-card-header">
        ${faviconUrl ? `<img class="fav-favicon" src="${faviconUrl}" alt="" onerror="this.style.display='none'">` : '<span class="fav-favicon-placeholder"></span>'}
        <span class="fav-title">${this._escapeHtml(node.title || node.url || "未命名")}</span>
        <div class="fav-actions">
          <button class="fav-action-open" title="打开">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          </button>
          <button class="fav-action-rename" title="重命名">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="fav-action-delete" title="删除">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </div>
      <div class="fav-url">${this._escapeHtml(node.url || "")}</div>`;
  },

  // 打开收藏项
  async _openItem(id) {
    const node = await Favorites.getItem(id);
    if (!node) return;
    if (node.url) {
      await Favorites.openBookmark(id);
    } else if (Favorites.isFolder(node)) {
      const count = await Favorites.openDomainGroup(id);
      if (count) this.showToast(`已打开 ${count} 个标签页`);
    }
  },

  // 删除收藏项
  async _deleteItem(id) {
    await Favorites.deleteItem(id);
    this.renderView();
    this.showToast("已删除");
  },

  // 重命名收藏项
  _renameItem(id) {
    Favorites.getItem(id).then((node) => {
      if (!node) return;
      this.showModal("重命名", node.title || "", async (newName) => {
        if (!newName.trim()) return;
        await Favorites.renameItem(id, newName.trim());
        this.renderView();
      });
    });
  },

  // 显示模态框
  showModal(title, defaultValue, callback) {
    document.getElementById("modal-title").textContent = title;
    const input = document.getElementById("modal-input");
    input.value = defaultValue || "";
    this.modalCallback = callback;
    document.getElementById("modal").classList.remove("hidden");
    setTimeout(() => input.focus(), 50);
  },

  // 确认模态框
  async confirmModal() {
    const value = document.getElementById("modal-input").value;
    const callback = this.modalCallback;
    this.hideModal();
    if (callback) {
      await callback(value);
    }
  },

  // 隐藏模态框
  hideModal() {
    document.getElementById("modal").classList.add("hidden");
    this.modalCallback = null;
  },

  // 显示 Toast
  showToast(msg) {
    const el = document.getElementById("toast");
    el.textContent = msg;
    el.classList.remove("hidden");
    clearTimeout(el._timer);
    el._timer = setTimeout(() => el.classList.add("hidden"), 2000);
  },

  // HTML 转义
  _escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str || "";
    return div.innerHTML;
  },

  // 属性值转义
  _escapeAttr(str) {
    return (str || "").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  },
};
