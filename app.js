document.addEventListener("DOMContentLoaded", () => {
  const messagesEl = document.getElementById("messages");
  const input = document.getElementById("messageInput");
  const sendBtn = document.getElementById("sendBtn");
  const usernameInput = document.getElementById("username");
  const setNameBtn = document.getElementById("setNameBtn");
  const typingIndicator = document.getElementById("typingIndicator");

  const STORAGE_KEY = "simple_chat_history_v1";
  const NAME_KEY = "simple_chat_name_v1";

  let name = localStorage.getItem(NAME_KEY) || "";
  if (name) usernameInput.value = name;

  let ws;
  const WS_URL =
    (location.protocol === "https:" ? "wss" : "ws") + "://" + location.host;
  const state = { typingTimeout: null };
  const history = loadLocalHistory();

  history.forEach((msg) =>
    addMessage({ ...msg, self: msg.author === name })
  );

  // ==========================
  // メッセージ表示・履歴
  // ==========================
  function addMessage({ id, author, text, ts, self = false }) {
    const li = document.createElement("li");
    li.className = "message " + (self ? "me" : "other");
    li.dataset.id = id || "";
    li.innerHTML = `
      <div class="body">${text}</div>
      <div class="meta">
        <span style="font-weight:600">${author || "名無し"}</span>
        <time>${new Date(ts).toLocaleTimeString()}</time>
      </div>
    `;
    messagesEl.appendChild(li);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function saveLocalHistory(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }
  function loadLocalHistory() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  // ==========================
  // 送信処理
  // ==========================
  function sendMessage() {
    const text = input.value.trim();
    if (!text) return;
    const msg = {
      id: "m" + Date.now() + Math.random().toString(36).slice(2, 7),
      author: name || "名無し",
      text,
      ts: Date.now(),
    };
    addMessage({ ...msg, self: true });
    history.push(msg);
    saveLocalHistory(history);

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "message", payload: msg }));
    }

    input.value = "";
    input.focus();
    sendTyping(false);
  }

  function sendTyping(isTyping) {
    if (!(ws && ws.readyState === WebSocket.OPEN)) return;
    ws.send(
      JSON.stringify({
        type: "typing",
        payload: { typing: isTyping, author: name || "名無し" },
      })
    );
  }

  // ==========================
  // イベント登録
  // ==========================
  sendBtn.addEventListener("click", sendMessage);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    } else {
      sendTyping(true);
      if (state.typingTimeout) clearTimeout(state.typingTimeout);
      state.typingTimeout = setTimeout(() => sendTyping(false), 900);
    }
  });

  setNameBtn.addEventListener("click", () => {
    name = usernameInput.value.trim() || "";
    localStorage.setItem(NAME_KEY, name);
    alert("ユーザー名を保存しました: " + (name || "名無し"));
  });

  // ==========================
  // WebSocket 接続
  // ==========================
  function setupWebSocket() {
    try {
      ws = new WebSocket(WS_URL);
    } catch (e) {
      console.warn("WebSocket unavailable", e);
      ws = null;
      return;
    }

    ws.addEventListener("open", () => console.log("ws connected"));

    ws.addEventListener("message", (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === "message") {
          const payload = msg.payload;
          if (!history.find((h) => h.id === payload.id)) {
            history.push(payload);
            saveLocalHistory(history);
            addMessage({ ...payload, self: payload.author === name });
          }
        } else if (msg.type === "typing") {
          const p = msg.payload;
          if (p.author === name) return;
          typingIndicator.textContent = p.typing
            ? `${p.author} が入力中…`
            : "";
          typingIndicator.setAttribute("aria-hidden", !p.typing);
        }
      } catch (e) {
        console.error("invalid ws message", e);
      }
    });

    ws.addEventListener("close", () => {
      console.log("ws closed");
      setTimeout(setupWebSocket, 1500);
    });
    ws.addEventListener("error", (e) => console.warn("ws error", e));
  }

  setupWebSocket();
});
