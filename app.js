// シンプルなチャットクライアント（WebSocket対応）
// サーバ接続先は同一ホスト: ポートは server.js 側と合わせる。
// WebSocketが無ければローカルオンリーで動作（localStorageに保持）

(() => {
  const messagesEl = document.getElementById('messages');
  const input = document.getElementById('messageInput');
  const sendBtn = document.getElementById('sendBtn');
  const usernameInput = document.getElementById('username');
  const setNameBtn = document.getElementById('setNameBtn');
  const typingIndicator = document.getElementById('typingIndicator');

  const STORAGE_KEY = 'simple_chat_history_v1';
  const NAME_KEY = 'simple_chat_name_v1';

  let name = localStorage.getItem(NAME_KEY) || '';
  if (name) usernameInput.value = name;

  // WebSocket 接続（ある場合）
  let ws;
  const WS_ENABLED = true; // 必要なら falseにしてローカルモードに
 const WS_URL = "wss://2323.onrender.com/ws";


  const state = {
    typingTimeout: null,
    remoteTyping: false
  };

  function addMessage({id, author, text, ts, self=false}) {
    const li = document.createElement('li');
    li.className = 'message ' + (self ? 'me' : 'other');
    li.dataset.id = id || '';
    const body = document.createElement('div');
    body.className = 'body';
    body.textContent = text;
    const meta = document.createElement('div');
    meta.className = 'meta';
    const authorSpan = document.createElement('span');
    authorSpan.textContent = author || '名無し';
    authorSpan.style.fontWeight = '600';
    const timeSpan = document.createElement('time');
    timeSpan.textContent = new Date(ts).toLocaleTimeString();
    meta.appendChild(authorSpan);
    meta.appendChild(timeSpan);

    li.appendChild(body);
    li.appendChild(meta);
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

  // 初期表示：ローカル履歴
  const history = loadLocalHistory();
  history.forEach(msg => addMessage({...msg, self: msg.author === name}));

  // メッセージ送信
  function sendMessage() {
    const text = input.value.trim();
    if (!text) return;
    const msg = {
      id: 'm' + Date.now() + Math.random().toString(36).slice(2,7),
      author: name || '名無し',
      text,
      ts: Date.now()
    };

    // 表示 & 保存
    addMessage({...msg, self:true});
    history.push(msg);
    saveLocalHistory(history);

    // WebSocketで送信（ある場合）
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({type:'message', payload:msg}));
    }

    input.value = '';
    input.focus();
    sendTyping(false);
  }

  // タイピング通知（相手に自分が打っていることを知らせる）
  function sendTyping(isTyping){
    if (!(ws && ws.readyState === WebSocket.OPEN)) return;
    ws.send(JSON.stringify({type:'typing', payload:{typing:isTyping, author:name || '名無し'}}));
  }

  // イベント
  sendBtn.addEventListener('click', sendMessage);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    } else {
      // typing true
      sendTyping(true);
      if (state.typingTimeout) clearTimeout(state.typingTimeout);
      state.typingTimeout = setTimeout(()=> {
        sendTyping(false);
      }, 900);
    }
  });

  setNameBtn.addEventListener('click', () => {
    name = usernameInput.value.trim();
    if (!name) name = '';
    localStorage.setItem(NAME_KEY, name);
    alert('ユーザー名を保存しました: ' + (name || '名無し'));
  });

  // WebSocket 接続処理（利用可能なら）
  function setupWebSocket() {
    if (!WS_ENABLED) return;
    try {
      ws = new WebSocket(WS_URL);
    } catch (e) {
      console.warn('WebSocket not available', e);
      ws = null;
      return;
    }
    ws.addEventListener('open', () => {
      console.log('ws open');
      // ローカル履歴をサーバに投げる（任意）
      if (history.length) {
        ws.send(JSON.stringify({type:'history_sync', payload:history}));
      }
    });

    ws.addEventListener('message', (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === 'message') {
          const payload = msg.payload;
          // 既知のメッセージならスキップする簡易チェック
          if (!history.find(h=>h.id === payload.id)) {
            history.push(payload);
            saveLocalHistory(history);
            addMessage({...payload, self: payload.author === name});
          }
        } else if (msg.type === 'typing') {
          const p = msg.payload;
          if (p.author === name) return; // 自分の通知は無視
          typingIndicator.textContent = p.typing ? `${p.author} が入力中…` : '';
          typingIndicator.setAttribute('aria-hidden', !p.typing);
        }
      } catch (e) {
        console.error('invalid ws message', e);
      }
    });

    ws.addEventListener('close', () => {
      console.log('ws closed');
      // 再接続を試みる（指数バックオフは入れていない簡易実装）
      setTimeout(setupWebSocket, 1500);
    });

    ws.addEventListener('error', (e) => {
      console.warn('ws error', e);
    });
  }

  // 自動リサイズテキストエリア（シンプル）
  function autoResize() {
    input.style.height = 'auto';
    input.style.height = Math.min(120, input.scrollHeight) + 'px';
  }
  input.addEventListener('input', autoResize);

  // 初期化
  autoResize();
  setupWebSocket();
})();
