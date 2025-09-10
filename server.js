// server.js
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: '/ws' });

// 静的ファイルを配布
app.use(express.static(path.join(__dirname, 'public')));

wss.on("connection", (ws) => {
  let currentRoom = null;

  ws.on("message", (data) => {
    let msg;
    try { msg = JSON.parse(data); } catch { return; }

    if (msg.type === "join") {
      currentRoom = msg.payload.room;
      if (!rooms.has(currentRoom)) rooms.set(currentRoom, new Set());
      rooms.get(currentRoom).add(ws);
      console.log(`${msg.payload.author} joined ${currentRoom}`);
    }

    else if (msg.type === "message" && currentRoom) {
      const out = JSON.stringify({ type: "message", payload: msg.payload });
      rooms.get(currentRoom).forEach(client => {
        if (client.readyState === WebSocket.OPEN) client.send(out);
      });
    }
  });

  ws.on("close", () => {
    if (currentRoom && rooms.has(currentRoom)) {
      rooms.get(currentRoom).delete(ws);
    }
  });
});

  