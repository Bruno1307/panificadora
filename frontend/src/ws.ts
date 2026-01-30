import { getApi } from './api'


export async function getWsUrl() {
  const api = await getApi();
  const base = new URL(api.defaults.baseURL);
  const proto = base.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${base.host}/ws`;
}


export async function connectOrdersWS(onMessage: (ev: MessageEvent) => void) {
  const url = await getWsUrl();
  const ws = new WebSocket(url);
  ws.onmessage = onMessage;
  return ws;
}
