chrome.action.onClicked.addListener(async () => {
  const url = chrome.runtime.getURL("tabs.html");
  // 查找是否已有打开的标签页
  const tabs = await chrome.tabs.query({ url });
  if (tabs.length > 0) {
    // 切换到已有标签页并激活其窗口
    const tab = tabs[0];
    await chrome.tabs.update(tab.id, { active: true });
    await chrome.windows.update(tab.windowId, { focused: true });
  } else {
    // 没有已打开的页面，新建一个
    chrome.tabs.create({ url });
  }
});
