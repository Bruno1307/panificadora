import { getBackendUrl } from './api'

let reconnectTimer: number | null = null;
let heartbeatTimer: number | null = null;

export async function getWsUrl() {
  const backendUrl = (await getBackendUrl()) || '/api/';
  let origin = '';
  let pathPrefix = '';
  try {
    const abs = new URL(backendUrl);
    const proto = abs.protocol === 'https:' ? 'wss' : 'ws';
    origin = `${proto}://${abs.host}`;
    pathPrefix = abs.pathname || '/';
  } catch {
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    origin = `${proto}://${window.location.host}`;
    pathPrefix = backendUrl || '/';
  }
  if (!pathPrefix.endsWith('/')) pathPrefix += '/';
  return `${origin}${pathPrefix}ws`;
}

export async function connectOrdersWS(onMessage: (ev: MessageEvent) => void) {
  const url = await getWsUrl();
  let ws: WebSocket | null = null;
  const start = () => {
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;
    try {
      ws = new WebSocket(url);
      ws.onopen = () => {
        // Heartbeat a cada 30s para manter conexão viva
        if (heartbeatTimer) window.clearInterval(heartbeatTimer);
        heartbeatTimer = window.setInterval(() => {
          try { ws && ws.readyState === WebSocket.OPEN && ws.send('ping'); } catch {}
        }, 30000);
      };
      ws.onmessage = onMessage;
      const scheduleReconnect = () => {
        if (heartbeatTimer) { window.clearInterval(heartbeatTimer); heartbeatTimer = null; }
        if (reconnectTimer) return;
        reconnectTimer = window.setTimeout(() => {
          reconnectTimer = null;
          start();
        }, 2000);
      };
      ws.onerror = scheduleReconnect;
      ws.onclose = scheduleReconnect;
    } catch {
      // tentativa de reconexão em caso de erro de criação
      if (!reconnectTimer) reconnectTimer = window.setTimeout(() => { reconnectTimer = null; start(); }, 2000);
    }
  };
  start();
  // Retorna a instância atual (pode ser atualizada internamente ao reconectar)
  return ws as WebSocket;
}
