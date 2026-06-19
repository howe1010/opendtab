document.addEventListener("DOMContentLoaded", async () => {
  const searchInput = document.getElementById("search");
  const grid = document.getElementById("card-grid");
  const statsEl = document.getElementById("stats");
  const themeBtn = document.getElementById("theme-toggle");
  const refreshBtn = document.getElementById("refresh-btn");
  const favView = document.getElementById("favorites-view");
  const histView = document.getElementById("history-view");
  const navTabs = document.querySelectorAll(".nav-tab");

  let allTabs = [];
  let collapsedDomains = new Set();
  let currentView = "tabs"; // "tabs" | "favorites" | "history"

  // ── 初始化收藏夹和历史记录 ──
  try {
    await Favorites.init();
    FavoritesUI.init();
  } catch (e) {
    console.error("收藏夹初始化失败:", e);
  }
  HistoryUI.init();

  // ── 隐藏所有视图 ──
  function hideAllViews() {
    grid.classList.add("hidden");
    favView.classList.add("hidden");
    histView.classList.add("hidden");
  }

  // ── 视图切换 ──
  navTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const view = tab.dataset.view;
      if (view === currentView) return;
      currentView = view;

      navTabs.forEach((t) => t.classList.toggle("active", t.dataset.view === view));
      hideAllViews();

      if (view === "tabs") {
        grid.classList.remove("hidden");
        searchInput.placeholder = "搜索标签页...";
        render(allTabs);
      } else if (view === "favorites") {
        favView.classList.remove("hidden");
        searchInput.placeholder = "搜索收藏...";
        FavoritesUI.renderView();
      } else if (view === "history") {
        histView.classList.remove("hidden");
        searchInput.placeholder = "搜索历史记录...";
        HistoryUI.renderView();
      }

      searchInput.value = "";
    });
  });

  // ── Theme ──
  const savedTheme = localStorage.getItem("openedtabs-theme");
  if (savedTheme) {
    document.documentElement.setAttribute("data-theme", savedTheme);
  }

  themeBtn.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme");
    const next = current === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("openedtabs-theme", next);
  });

  // ── Refresh ──
  function loadTabs() {
    chrome.tabs.query({}, (tabs) => {
      allTabs = tabs.filter((t) => t.url !== location.href);
      updateStats();
      render(allTabs);
    });
  }

  refreshBtn.addEventListener("click", () => {
    refreshBtn.classList.add("spinning");
    searchInput.value = "";
    if (currentView === "tabs") {
      loadTabs();
    } else if (currentView === "favorites") {
      FavoritesUI.renderView();
    } else if (currentView === "history") {
      HistoryUI.renderView();
    }
    setTimeout(() => refreshBtn.classList.remove("spinning"), 600);
  });

  loadTabs();

  // ── Search ──
  searchInput.addEventListener("input", () => {
    const kw = searchInput.value.trim().toLowerCase();
    if (currentView === "tabs") {
      if (!kw) {
        render(allTabs);
        return;
      }
      const filtered = allTabs.filter(
        (t) =>
          t.title.toLowerCase().includes(kw) ||
          t.url.toLowerCase().includes(kw),
      );
      render(filtered);
    } else if (currentView === "favorites") {
      // 搜索收藏夹
      const favGrid = document.getElementById("fav-grid");
      if (!kw) {
        FavoritesUI.renderView();
        return;
      }
      Favorites.search(kw).then((results) => {
        favGrid.innerHTML = "";
        if (results.length === 0) {
          favGrid.innerHTML = '<div class="empty-msg">没有找到匹配的收藏</div>';
          return;
        }
        results.forEach(async (node) => {
          const card = await FavoritesUI._createCard(node);
          favGrid.appendChild(card);
        });
      });
    } else if (currentView === "history") {
      // 搜索历史记录
      const histGrid = document.getElementById("history-grid");
      if (!kw) {
        HistoryUI.renderView();
        return;
      }
      History.search(kw).then((results) => {
        histGrid.innerHTML = "";
        if (results.length === 0) {
          histGrid.innerHTML = '<div class="empty-msg">没有找到匹配的历史记录</div>';
          return;
        }
        const groups = HistoryUI._groupByDate(results);
        for (const [label, groupItems] of groups) {
          const dateHeader = document.createElement("div");
          dateHeader.className = "hist-date-header";
          dateHeader.textContent = `${label}（${groupItems.length} 条）`;
          histGrid.appendChild(dateHeader);
          const list = document.createElement("div");
          list.className = "hist-date-list";
          for (const item of groupItems) {
            list.appendChild(HistoryUI._createCard(item));
          }
          histGrid.appendChild(list);
        }
      });
    }
  });

  function updateStats() {
    statsEl.textContent = `${allTabs.length} 个标签页`;
  }

  function render(tabs) {
    grid.innerHTML = "";
    const groups = groupByDomain(tabs);
    const domains = Object.keys(groups).sort(
      (a, b) => groups[b].length - groups[a].length,
    );

    if (domains.length === 0) {
      grid.innerHTML = '<div class="empty-msg">没有找到匹配的标签页</div>';
      return;
    }

    domains.forEach((domain) => {
      grid.appendChild(createCard(domain, groups[domain]));
    });
  }

  function groupByDomain(tabs) {
    const groups = {};
    tabs.forEach((tab) => {
      let domain;
      try {
        domain = new URL(tab.url).hostname || "其他";
      } catch {
        domain = "其他";
      }
      if (!groups[domain]) groups[domain] = [];
      groups[domain].push(tab);
    });
    return groups;
  }

  function createCard(domain, tabs) {
    const card = document.createElement("article");
    card.className = "domain-card";

    const isCollapsed = collapsedDomains.has(domain);

    // header
    const header = document.createElement("div");
    header.className = "card-header";

    const favicon = document.createElement("img");
    favicon.className = "card-favicon";
    favicon.src = getFaviconUrl(domain);
    favicon.onerror = () => { favicon.style.display = "none"; };

    const name = document.createElement("span");
    name.className = "card-domain";
    name.textContent = domain;

    const count = document.createElement("span");
    count.className = "card-count";
    count.textContent = tabs.length;

    // 收藏整个域名组的按钮
    const starBtn = document.createElement("span");
    starBtn.className = "card-star";
    starBtn.textContent = "☆";
    starBtn.title = "收藏此域名的所有标签页";

    // 异步检查是否已收藏
    Favorites.isDomainGrouped(domain).then((starred) => {
      if (starred) starBtn.classList.add("starred");
    });

    starBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (starBtn.classList.contains("starred")) {
        FavoritesUI.showToast("该域名已在收藏夹中");
        return;
      }
      Favorites.addDomainGroup({
        title: domain,
        domain,
        urls: tabs.map((t) => ({
          url: t.url,
          title: t.title || t.url,
          favicon: domain,
        })),
      }).then((id) => {
        if (id) {
          starBtn.classList.add("starred");
          FavoritesUI.showToast("已添加到收藏夹");
        } else {
          FavoritesUI.showToast("该域名已在收藏夹中");
        }
      });
    });

    const arrow = document.createElement("span");
    arrow.className = "card-arrow" + (isCollapsed ? " collapsed" : "");
    arrow.textContent = "▼";

    header.append(favicon, name, count, starBtn, arrow);

    // body
    const body = document.createElement("ul");
    body.className = "card-body" + (isCollapsed ? " hidden" : "");

    tabs.forEach((tab) => {
      const li = document.createElement("li");
      li.className = "tab-item" + (tab.active ? " active" : "");

      const tabFavicon = document.createElement("img");
      tabFavicon.className = "tab-favicon";
      tabFavicon.src = getFaviconUrl(domain);
      tabFavicon.onerror = () => { tabFavicon.style.display = "none"; };

      const title = document.createElement("span");
      title.className = "tab-title";
      title.textContent = tab.title || tab.url;

      // 收藏单个标签页的按钮
      const starTab = document.createElement("span");
      starTab.className = "tab-star";
      starTab.textContent = "☆";

      // 异步检查是否已收藏
      Favorites.isBookmarked(tab.url).then((starred) => {
        if (starred) starTab.classList.add("starred");
      });

      starTab.addEventListener("click", (e) => {
        e.stopPropagation();
        if (starTab.classList.contains("starred")) {
          FavoritesUI.showToast("该网址已在收藏夹中");
          return;
        }
        Favorites.addBookmark({
          title: tab.title || tab.url,
          url: tab.url,
          favicon: domain,
        }).then((id) => {
          if (id) {
            starTab.classList.add("starred");
            FavoritesUI.showToast("已添加到收藏夹");
          } else {
            FavoritesUI.showToast("该网址已在收藏夹中");
          }
        });
      });

      const closeBtn = document.createElement("span");
      closeBtn.className = "tab-close";
      closeBtn.textContent = "✕";

      // click tab -> switch
      li.addEventListener("click", (e) => {
        if (e.target === closeBtn || e.target === starTab) return;
        chrome.tabs.update(tab.id, { active: true });
        chrome.windows.update(tab.windowId, { focused: true });
      });

      // click close -> close tab
      closeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        chrome.tabs.remove(tab.id, () => {
          li.style.transition = "opacity .2s, transform .2s";
          li.style.opacity = "0";
          li.style.transform = "translateX(12px)";
          setTimeout(() => {
            li.remove();
            allTabs = allTabs.filter((t) => t.id !== tab.id);
            const remaining = body.querySelectorAll(".tab-item").length;
            if (remaining === 0) {
              card.style.transition = "opacity .25s, transform .25s";
              card.style.opacity = "0";
              card.style.transform = "scale(.96)";
              setTimeout(() => card.remove(), 250);
            } else {
              count.textContent = remaining;
            }
            updateStats();
          }, 200);
        });
      });

      li.append(tabFavicon, title, starTab, closeBtn);
      body.appendChild(li);
    });

    // toggle collapse
    header.addEventListener("click", (e) => {
      // 不要在点击收藏按钮时折叠
      if (e.target === starBtn) return;
      if (collapsedDomains.has(domain)) {
        collapsedDomains.delete(domain);
        body.classList.remove("hidden");
        arrow.classList.remove("collapsed");
      } else {
        collapsedDomains.add(domain);
        body.classList.add("hidden");
        arrow.classList.add("collapsed");
      }
    });

    card.append(header, body);
    return card;
  }

  function getFaviconUrl(domainOrUrl) {
    let hostname = domainOrUrl;
    try {
      hostname = new URL("https://" + domainOrUrl).hostname;
    } catch {
      try {
        hostname = new URL(domainOrUrl).hostname;
      } catch {
        // keep as-is
      }
    }
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;
  }
});
