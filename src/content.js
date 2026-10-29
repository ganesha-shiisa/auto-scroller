let isScrolling = false;
let scrollInterval = null;
let speed = 20; // 初期速度 (px/sec)

// 保存されている speed を読み込む
chrome.storage.local.get(["savedSpeed", "autoScrollActive"], (result) => {
  if (result.savedSpeed) {
    speed = result.savedSpeed;
    // パネルの表示テキストも保存された速度に更新
    const speedEl = document.getElementById("asc-speed");
    if (speedEl) {
      speedEl.innerText = `Speed: ${speed}`;
    }
  }

  if (result.autoScrollActive) {
    startScroll();
  }
});

// パネル要素の生成
let panel = document.createElement("div");
panel.id = "auto-scroll-custom-panel";
panel.innerHTML = `
  <div class="asc-title">Auto Scroll</div>
  <div class="asc-controls">
    <button id="asc-slower">-</button>
    <span id="asc-speed">Speed: ${speed}</span>
    <button id="asc-faster">+</button>
  </div>
  <button id="asc-stop">STOP</button>
`;
document.body.appendChild(panel);

// イベントリスナーの登録
document.getElementById("asc-slower").onclick = () => changeSpeed(-1);
document.getElementById("asc-faster").onclick = () => changeSpeed(1);
document.getElementById("asc-stop").onclick = () => stopScroll();

// ショートカット受信（background.jsからのメッセージ）
chrome.runtime.onMessage.addListener((request) => {
  if (request.action === "toggle") {
    toggleScroll();
  }
});

// キーボードによる直感操作
window.addEventListener("keydown", (e) => {
  if (!isScrolling) return;
  if (e.key === "ArrowUp") {
    changeSpeed(1);
    e.preventDefault();
  } else if (e.key === "ArrowDown") {
    changeSpeed(-1);
    e.preventDefault();
  } else if (e.key === "Escape") {
    stopScroll();
  }
});

// 画面クリックでスクロールを停止するイベント処理
window.addEventListener("click", (e) => {
  // スクロール中でないなら何もしない
  if (!isScrolling) return;

  // クリックされた要素が「操作パネル（panel）」の内部にある場合は無視する
  if (panel.contains(e.target)) return;

  // クリックされた要素（またはその親要素）がリンク（<a>タグ）なら無視
  if (e.target.closest("a")) return;

  // パネル外のページ本文をクリックした場合はスクロール停止！
  stopScroll();
});

function toggleScroll() {
  if (isScrolling) {
    stopScroll();
  } else {
    startScroll();
  }
}

function applyScrollSettings() {
  // すでに動いているタイマーがあれば一旦クリア（停止）
  if (scrollInterval) {
    clearInterval(scrollInterval);
    scrollInterval = null;
  }

  if (!isScrolling) return;

  // --- coord と intervalMs の自動計算 ---
  let targetInterval = 16;
  let coord = (speed * targetInterval) / 1000;

  // 0.5px未満なら coord を0.5に固定し、タイマー側を広げる
  if (coord < 0.5) {
    coord = 0.5;
    targetInterval = (coord / speed) * 1000;
  }

  // 新しい設定でタイマーを再起動！
  scrollInterval = setInterval(() => {
    window.scrollBy(0, coord);
  }, targetInterval);
}

// 画面スリープ防止メッセージ送信関数
function updateKeepAwake(state) {
  chrome.runtime.sendMessage({ action: "setKeepAwake", state }).catch(() => {
    // Service Workerが停止している場合などのエラーを静かに無視
  });
}

// 起動関数
function startScroll() {
  if (isScrolling) return;
  isScrolling = true;

  // 起動状態を保存
  chrome.storage.local.set({ autoScrollActive: true });

  // スリープ防止をリクエスト
  updateKeepAwake(true);

  panel.style.display = "block";
  applyScrollSettings();
}

// 停止関数
function stopScroll() {
  isScrolling = false;
  panel.style.display = "none";

  // 停止状態を保存
  chrome.storage.local.set({ autoScrollActive: false });

  // スリープ防止を解除
  updateKeepAwake(false);

  if (scrollInterval) {
    clearInterval(scrollInterval);
    scrollInterval = null;
  }
}

// タブ移動やページ遷移時にスクロール中だった場合はスリープ防止を解除
window.addEventListener("beforeunload", () => {
  if (isScrolling) {
    updateKeepAwake(false);
  }
});

// 速度変更関数（ここから applyScrollSettings を呼ぶことでリアルタイム反映！）
function changeSpeed(delta) {
  speed = Math.max(1, speed + delta);
  document.getElementById("asc-speed").innerText = `Speed: ${speed}`;

  // 変更したSpeedを保存
  chrome.storage.local.set({ savedSpeed: speed });

  // スクロール中なら、新しい速度でタイマーをリアルタイム更新！
  if (isScrolling) {
    applyScrollSettings();
  }
}
