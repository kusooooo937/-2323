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

wss.on('connection', (ws, req) => {
  console.log('client connected');

  ws.on('message', (data) => {
    let msg;
    try { msg = JSON.parse(data); } catch { return; }

    if (msg.type === 'message') {
      // 受信したメッセージを全クライアントへブロードキャスト
      const out = JSON.stringify({type:'message', payload: msg.payload});
      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) client.send(out);
      });
    } else if (msg.type === 'typing') {
      const out = JSON.stringify({type:'typing', payload: msg.payload});
      // 自分含め全員に送る（クライアント側で自分の通知は無視している）
      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) client.send(out);
      });
    } else if (msg.type === 'history_sync') {
      // 簡易：受け取った履歴をそのまま他クライアントへ配布（実運用ではDBや整合性を考えること）
      const out = JSON.stringify({type:'history_sync', payload: msg.payload});
      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) client.send(out);
      });
    }
  });

  ws.on('close', () => {
    console.log('client disconnected');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Server started on http://localhost:' + PORT));
