// history-ui.js — 历史记录 UI 渲染与交互

const HistoryUI = {
  currentRange: "week", // "today" | "week" | "month"
  currentGroup: "date", // "date" | "domain"

  // 初始化事件监听
  init() {
    // 时间范围按钮
    document.querySelectorAll(".hist-range").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".hist-range").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        this.currentRange = btn.dataset.range;
        this.renderView();
      });
    });

    // 分组方式按钮
    document.querySelectorAll(".hist-group").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".hist-group").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        this.currentGroup = btn.dataset.group;
        this.renderView();
      });
    });

    // 清除按钮
    document.getElementById("clear-history-btn").addEventListener("click", () => {
      const range = this._getTimeRange();
      FavoritesUI.showModal(
        "确认清除",
        `确定要清除${this._rangeLabel()}的所有浏览记录吗？`,
        async () => {
          await History.deleteRange(range.startTime, range.endTime);
          FavoritesUI.showToast("已清除浏览记录");
          this.renderView();
        },
      );
      document.getElementById("modal-input").style.display = "none";
    });

    // 网格事件委托
    document.getElementById("history-grid").addEventListener("click", (e) => {
      const card = e.target.closest(".hist-item");
      if (!card) return;
      const url = card.dataset.url;

      if (e.target.closest(".hist-action-delete")) {
        this._deleteItem(url, card);
      } else {
        chrome.tabs.create({ url });
      }
    });
  },

  // 渲染历史记录视图
  async renderView() {
    const range = this._getTimeRange();
    const items = await History.getByRange(range.startTime, range.endTime);
    const grid = document.getElementById("history-grid");
    grid.innerHTML = "";

    if (items.length === 0) {
      grid.innerHTML = '<div class="empty-msg">没有浏览记录</div>';
      return;
    }

    if (this.currentGroup === "domain") {
      this._renderByDomain(items, grid);
    } else {
      this._renderByDate(items, grid);
    }
  },

  // 按日期分组渲染
  _renderByDate(items, grid) {
    const groups = this._groupByDate(items);
    for (const [label, groupItems] of groups) {
      const dateHeader = document.createElement("div");
      dateHeader.className = "hist-date-header";
      dateHeader.textContent = `${label}（${groupItems.length} 条）`;
      grid.appendChild(dateHeader);

      const list = document.createElement("div");
      list.className = "hist-date-list";
      for (const item of groupItems) {
        list.appendChild(this._createCard(item));
      }
      grid.appendChild(list);
    }
  },

  // 按域名分组渲染（复用 domain-card 样式）
  _renderByDomain(items, grid) {
    const groups = this._groupByDomain(items);
    // 按数量降序排列
    const sorted = [...groups.entries()].sort((a, b) => b[1].length - a[1].length);

    for (const [domain, domainItems] of sorted) {
      const card = document.createElement("article");
      card.className = "domain-card hist-domain-card";

      const faviconUrl = domain
        ? `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
        : "";

      // 头部
      const header = document.createElement("div");
      header.className = "card-header";
      header.innerHTML = `
        <img class="card-favicon" src="${faviconUrl}" alt="" onerror="this.style.display='none'">
        <span class="card-domain">${this._escapeHtml(domain)}</span>
        <span class="card-count">${domainItems.length}</span>
        <span class="card-arrow">▼</span>`;

      // 标签页列表
      const body = document.createElement("ul");
      body.className = "card-body";

      for (const item of domainItems) {
        const li = document.createElement("li");
        li.className = "hist-item hist-domain-item tab-item";
        li.dataset.url = item.url || "";

        const favicon = document.createElement("img");
        favicon.className = "tab-favicon";
        favicon.src = faviconUrl;
        favicon.onerror = () => { favicon.style.display = "none"; };

        const title = document.createElement("span");
        title.className = "tab-title";
        title.textContent = item.title || item.url || "未知页面";

        const time = item.lastVisitTime
          ? new Date(item.lastVisitTime).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
          : "";

        const timeSpan = document.createElement("span");
        timeSpan.className = "hist-time-inline";
        timeSpan.textContent = time;

        const deleteBtn = document.createElement("span");
        deleteBtn.className = "tab-close";
        deleteBtn.textContent = "✕";

        li.append(favicon, title, timeSpan, deleteBtn);
        body.appendChild(li);
      }

      // 折叠切换
      const arrow = header.querySelector(".card-arrow");
      header.addEventListener("click", (e) => {
        if (e.target.closest(".tab-close")) return;
        if (body.classList.contains("hidden")) {
          body.classList.remove("hidden");
          arrow.classList.remove("collapsed");
        } else {
          body.classList.add("hidden");
          arrow.classList.add("collapsed");
        }
      });

      card.append(header, body);
      grid.appendChild(card);
    }
  },

  // 创建单个历史记录卡片（按日期模式用）
  _createCard(item) {
    const card = document.createElement("div");
    card.className = "hist-item";
    card.dataset.url = item.url || "";

    let hostname = "";
    try {
      hostname = new URL(item.url).hostname;
    } catch {
      hostname = "";
    }
    const faviconUrl = hostname
      ? `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`
      : "";

    const time = item.lastVisitTime
      ? new Date(item.lastVisitTime).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })
      : "";

    card.innerHTML = `
      <img class="hist-favicon" src="${faviconUrl}" alt="" onerror="this.style.display='none'">
      <div class="hist-info">
        <span class="hist-title">${this._escapeHtml(item.title || item.url || "未知页面")}</span>
        <span class="hist-url">${this._escapeHtml(item.url || "")}</span>
      </div>
      <div class="hist-meta">
        ${item.visitCount > 1 ? `<span class="hist-visits">${item.visitCount} 次访问</span>` : ""}
        ${time ? `<span class="hist-time">${time}</span>` : ""}
      </div>
      <button class="hist-action-delete" title="删除">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
      </button>`;

    return card;
  },

  // 删除单条记录
  async _deleteItem(url, card) {
    await History.deleteUrl(url);
    card.style.transition = "opacity .2s, transform .2s";
    card.style.opacity = "0";
    card.style.transform = "translateX(12px)";
    setTimeout(() => {
      card.remove();
      // 检查父级容器是否为空
      const list = card.closest(".hist-date-list") || card.closest(".card-body");
      if (list && list.children.length === 0) {
        const wrapper = list.closest(".domain-card") || list;
        if (wrapper.classList.contains("domain-card")) {
          wrapper.remove();
        } else {
          const header = list.previousElementSibling;
          if (header && header.classList.contains("hist-date-header")) {
            header.remove();
          }
          list.remove();
        }
      }
      // 检查整个网格是否为空
      const grid = document.getElementById("history-grid");
      if (!grid.querySelector(".hist-item") && !grid.querySelector(".domain-card")) {
        grid.innerHTML = '<div class="empty-msg">没有浏览记录</div>';
      }
    }, 200);
  },

  // 按日期分组
  _groupByDate(items) {
    const groups = new Map();
    const todayStart = History.getTodayStart();
    const yesterdayStart = History.getYesterdayStart();

    for (const item of items) {
      const t = item.lastVisitTime || 0;
      let label;
      if (t >= todayStart) {
        label = "今天";
      } else if (t >= yesterdayStart) {
        label = "昨天";
      } else {
        const d = new Date(t);
        label = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      }
      if (!groups.has(label)) groups.set(label, []);
      groups.get(label).push(item);
    }

    return groups;
  },

  // 按域名分组
  _groupByDomain(items) {
    const groups = new Map();
    for (const item of items) {
      let domain;
      try {
        domain = new URL(item.url).hostname || "其他";
      } catch {
        domain = "其他";
      }
      if (!groups.has(domain)) groups.set(domain, []);
      groups.get(domain).push(item);
    }
    return groups;
  },

  // 获取当前时间范围
  _getTimeRange() {
    const endTime = Date.now();
    let startTime;
    switch (this.currentRange) {
      case "today":
        startTime = History.getTodayStart();
        break;
      case "month":
        startTime = History.getDaysAgo(30);
        break;
      case "week":
      default:
        startTime = History.getDaysAgo(7);
        break;
    }
    return { startTime, endTime };
  },

  // 范围标签
  _rangeLabel() {
    switch (this.currentRange) {
      case "today": return "今天";
      case "week": return "最近 7 天";
      case "month": return "最近 30 天";
      default: return "";
    }
  },

  // HTML 转义
  _escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str || "";
    return div.innerHTML;
  },
};
