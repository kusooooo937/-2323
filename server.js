// ==========================
// WebSocket + Express サーバー
// ==========================
const express = require("express");
const path = require("path");
const { WebSocketServer } = require("ws");

const app = express();
const PORT = process.env.PORT || 3000;

// 静的ファイルを配信
app.use(express.static(path.join(__dirname, "public")));

const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

// ==========================
// WebSocket
// ==========================
const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  console.log("🔌 Client connected");

  ws.on("message", (data) => {
    try {
      const msg = JSON.parse(data.toString());
      // 全クライアントにブロードキャスト
      wss.clients.forEach((client) => {
        if (client.readyState === ws.OPEN) {
          client.send(JSON.stringify(msg));
        }
      });
    } catch (e) {
      console.error("Invalid message:", e);
    }
  });

  ws.on("close", () => console.log("❌ Client disconnected"));
});
