// 通用メッセージ送信関数
function sendToggleMessage(tab) {
  if (tab?.id && tab.url && !tab.url.startsWith("chrome://") && !tab.url.startsWith("edge://")) {
    chrome.tabs.sendMessage(tab.id, { action: "toggle" })
      .catch((err) => {
        // ページが未リロードの場合などのエラーを静かに無視
        console.log("content.jsがまだ準備できていませんにゃ");
      });
  }
}

// 1. ショートカットキー（Alt+S等）が押された時
chrome.commands.onCommand.addListener((command) => {
  if (command === "toggle-scroll") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      sendToggleMessage(tabs[0]);
    });
  }
});

// 2. ツールバーのアイコンがクリックされた時（★ここを追加！）
chrome.action.onClicked.addListener((tab) => {
  sendToggleMessage(tab);
});