
  // ==========================
// 必要モジュール
// ==========================
const express = require("express");
const { WebSocketServer } = require("ws");
const path = require("path");

// ==========================
// Express HTTP サーバー
// ==========================
const app = express();
const PORT = process.env.PORT || 3000;

// 静的ファイル提供
app.use(express.static(path.join(__dirname, "/public")));

// ルートアクセス時に index.html を返す
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "/public/index.html"));
});

// ==========================
// WebSocket サーバー
// ==========================
const server = app.listen(PORT, () => {
  console.log(`✅ HTTP & WS Server running on port ${PORT}`);
});

const wss = new WebSocketServer({ server });

// ルーム管理 (roomName -> Set of ws clients)
const rooms = new Map();

wss.on("connection", (ws) => {
  let currentRoom = null;

  console.log("🔌 Client connected");

  ws.on("message", (data) => {
    let msg;
    try {
      msg = JSON.parse(data);
    } catch {
      return;
    }

    // ルーム参加
    if (msg.type === "join") {
      currentRoom = msg.payload.room;
      if (!rooms.has(currentRoom)) rooms.set(currentRoom, new Set());
      rooms.get(currentRoom).add(ws);
      console.log(`${msg.payload.author} joined ${currentRoom}`);
    }

    // メッセージ送信
    if (msg.type === "message" && currentRoom) {
      const out = JSON.stringify({ type: "message", payload: msg.payload });
      rooms.get(currentRoom).forEach(client => {
        if (client.readyState === ws.OPEN) client.send(out);
      });
    }
  });

  ws.on("close", () => {
    if (currentRoom && rooms.has(currentRoom)) {
      rooms.get(currentRoom).delete(ws);
    }
    console.log("❌ Client disconnected");
  });
});
