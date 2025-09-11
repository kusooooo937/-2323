document.addEventListener("DOMContentLoaded", () => {
  const messagesEl = document.getElementById("messages");
  const input = document.getElementById("messageInput");
  const sendBtn = document.getElementById("sendBtn");
  const usernameInput = document.getElementById("username");
  const setNameBtn = document.getElementById("setNameBtn");
  const roomsEl = document.querySelector(".rooms");
  const createRoomBtn = document.getElementById("createRoomBtn");

  let name = "名無し";
  let currentRoom = "general";
  let ws;

  const WS_URL = "wss://2323.onrender.com";
    (location.protocol === "https:" ? "wss" : "ws") + "://" + location.host;

  function connectWS() {
    ws = new WebSocket(WS_URL);

    ws.addEventListener("open", () => {
      console.log("✅ Connected to server");
      joinRoom(currentRoom);
    });

    ws.addEventListener("message", (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === "message") {
          if (msg.payload.room !== currentRoom) return; // 他ルームは無視
          addMessage({ ...msg.payload, self: msg.payload.author === name });
        }
      } catch (e) {
        console.error("Invalid message:", e);
      }
    });

    ws.addEventListener("close", () => {
      console.log("❌ Disconnected. Reconnecting...");
      setTimeout(connectWS, 2000);
    });
  }
  connectWS();

  // =======================
  // メッセージ表示
  // =======================
  function addMessage(msg) {
    const div = document.createElement("div");
    div.className = "msg " + (msg.self ? "self" : "other");
    div.innerHTML = `<strong>${msg.author}</strong>: ${msg.text}`;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  // =======================
// メッセージ送信
// =======================
function sendMessage() {
  const text = input.value.trim();
  if (!text) return;
  const msg = {
    id: "m" + Date.now(),
    author: name,
    text,
    ts: Date.now(),
    room: currentRoom,
  };

  // ここでは表示しない！ サーバーから返ってきてから表示する
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "message", payload: msg }));
  }

  input.value = "";
}

  // =======================
  // ルーム切り替え
  // =======================
  function joinRoom(room) {
    currentRoom = room;
    messagesEl.innerHTML = "";
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "join", payload: { room } }));
    }
    document.querySelectorAll(".room-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.room === room);
    });
  }

  // =======================
  // イベント
  // =======================
  sendBtn.addEventListener("click", sendMessage);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendMessage();
    }
  });

  setNameBtn.addEventListener("click", () => {
    const val = usernameInput.value.trim();
    if (val) name = val;
    alert("ユーザー名を設定しました: " + name);
  });

  // 新しいルーム作成
  createRoomBtn.addEventListener("click", () => {
    const roomName = prompt("新しいルーム名を入力してください:");
    if (roomName && roomName.trim()) {
      const btn = document.createElement("button");
      btn.className = "room-btn";
      btn.dataset.room = roomName;
      btn.textContent = roomName;
      btn.addEventListener("click", () => joinRoom(roomName));
      roomsEl.appendChild(btn);
      joinRoom(roomName);
    }
  });

  // 既存の General ボタンにイベント付与
  document.querySelectorAll(".room-btn").forEach((btn) => {
    btn.addEventListener("click", () => joinRoom(btn.dataset.room));
  });
});
