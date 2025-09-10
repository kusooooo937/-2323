// ==========================
// 設定
// ==========================
const serverUrl = "wss://YOUR-RENDER-URL.onrender.com"; // ← RenderのWS URLに置き換えてね
let ws;
let name = "";
let currentRoom = "general";

// 履歴保存用（roomName -> [messages]）
const history = {};

// ==========================
// DOM 取得
// ==========================
const messagesEl = document.getElementById("messages");
const input = document.getElementById("input");
const sendBtn = document.getElementById("sendBtn");

// ==========================
// WebSocket 接続
// ==========================
function connect() {
  ws = new WebSocket(serverUrl);

  ws.addEventListener("open", () => {
    console.log("✅ Connected to server");
    joinRoom(currentRoom); // デフォルトルームに参加
  });

  ws.addEventListener("message", (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.type === "message") {
        addMessage(msg.payload);
      }
    } catch (e) {
      console.error("Parse error:", e);
    }
  });

  ws.addEventListener("close", () => {
    console.log("❌ Disconnected. Reconnecting in 3s...");
    setTimeout(connect, 3000);
  });
}

connect();

// ==========================
// ルーム参加処理
// ==========================
function joinRoom(room) {
  if (room === currentRoom) return;

  // 履歴保存
  history[currentRoom] = messagesEl.innerHTML;

  currentRoom = room;
  messagesEl.innerHTML = "";

  // 履歴があれば再表示
  if (history[currentRoom]) {
    messagesEl.innerHTML = history[currentRoom];
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  // UI更新
  document.querySelectorAll(".room-btn").forEach(b => b.classList.remove("active"));
  let existingBtn = document.querySelector(`.room-btn[data-room="${room}"]`);
  if (!existingBtn) {
    // 新しいルームボタンを追加
    const newBtn = document.createElement("button");
    newBtn.className = "room-btn active";
    newBtn.dataset.room = room;
    newBtn.textContent = room;
    document.querySelector(".rooms").insertBefore(newBtn, document.getElementById("createRoomBtn"));
    newBtn.addEventListener("click", () => joinRoom(room));
  } else {
    existingBtn.classList.add("active");
  }

  // サーバーに参加通知
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: "join",
      payload: { room: currentRoom, author: name || "名無し" }
    }));
  }
}

// ==========================
// メッセージ送信
// ==========================
function sendMessage() {
  const text = input.value.trim();
  if (!text) return;
  const msg = {
    id: "m" + Date.now(),
    author: name || "名無し",
    text,
    ts: Date.now(),
    room: currentRoom
  };

  // 自分の画面に追加
  addMessage({ ...msg, self: true });

  // サーバーに送信
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "message", payload: msg }));
  }

  input.value = "";
}

// ==========================
// メッセージ表示
// ==========================
function addMessage(msg) {
  const div = document.createElement("div");
  div.className = "msg" + (msg.self ? " self" : "");
  div.innerHTML = `<strong>${msg.author}</strong>: ${msg.text}`;
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;

  // 履歴に保存
  if (!history[msg.room]) history[msg.room] = "";
  history[msg.room] = messagesEl.innerHTML;
}

// ==========================
// イベント登録
// ==========================
sendBtn.addEventListener("click", sendMessage);
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendMessage();
});

document.getElementById("setNameBtn").addEventListener("click", () => {
  const inputName = document.getElementById("username").value.trim();
  if (inputName) {
    name = inputName;
    alert("ユーザー名を設定しました: " + name);
  }
});

// ルーム切替ボタン
document.querySelectorAll(".room-btn").forEach(btn => {
  btn.addEventListener("click", () => joinRoom(btn.dataset.room));
});

// 新しいルーム作成
document.getElementById("createRoomBtn").addEventListener("click", () => {
  const roomName = prompt("新しいルーム名を入力してください:");
  if (roomName && roomName.trim()) {
    joinRoom(roomName.trim());
  }
});