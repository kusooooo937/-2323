const express = require("express");
const path = require("path");
const { WebSocketServer } = require("ws");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "public")));

const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

const wss = new WebSocketServer({ server });

// 各クライアントに部屋を持たせる
wss.on("connection", (ws) => {
  ws.room = "general"; // デフォルトは general
  console.log("🔌 Client connected (room=general)");

  ws.on("message", (data) => {
    try {
      const msg = JSON.parse(data.toString());

      if (msg.type === "join") {
        ws.room = msg.payload.room || "general";
        console.log(`👤 Moved to room: ${ws.room}`);
        return;
      }

      // 同じ部屋の人にだけ送信
      wss.clients.forEach((client) => {
        if (
          client.readyState === ws.OPEN &&
          client.room === ws.room
        ) {
          client.send(JSON.stringify(msg));
        }
      });
    } catch (e) {
      console.error("Invalid message:", e);
    }
  });

  ws.on("close", () =>
    console.log(`❌ Client disconnected (room=${ws.room})`)
  );
});
