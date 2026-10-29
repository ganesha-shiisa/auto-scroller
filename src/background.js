// 通用メッセージ送信関数
function sendToggleMessage(tab) {
  if (
    tab?.id &&
    tab.url &&
    !tab.url.startsWith("chrome://") &&
    !tab.url.startsWith("edge://")
  ) {
    chrome.tabs.sendMessage(tab.id, { action: "toggle" }).catch((err) => {
      // ページが未リロードの場合などのエラーを静かに無視
      console.log("content.jsがまだ準備できていませんにゃ");
    });
  }
}

// ショートカットキー（Alt+S等）が押された時
chrome.commands.onCommand.addListener((command) => {
  if (command === "toggle-scroll") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      sendToggleMessage(tabs[0]);
    });
  }
});

// ツールバーのアイコンがクリックされた時
chrome.action.onClicked.addListener((tab) => {
  sendToggleMessage(tab);
});

// スクロール中のタブを管理
const activeScrollingTabs = new Set();

// スリープ制御メッセージの受信
chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.action === "setKeepAwake" && sender.tab?.id) {
    const tabId = sender.tab.id;
    if (message.state) {
      activeScrollingTabs.add(tabId);
      chrome.power.requestKeepAwake("display");
    } else {
      activeScrollingTabs.delete(tabId);
      if (activeScrollingTabs.size === 0) {
        chrome.power.releaseKeepAwake();
      }
    }
  }
});

// スクロール中のタブが閉じられた時のクリーンアップ
chrome.tabs.onRemoved.addListener((tabId) => {
  if (activeScrollingTabs.has(tabId)) {
    activeScrollingTabs.delete(tabId);
    if (activeScrollingTabs.size === 0) {
      chrome.power.releaseKeepAwake();
    }
  }
});

