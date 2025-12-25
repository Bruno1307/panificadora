import { api } from './api'

export function getWsUrl() {
  const base = new URL(api.defaults.baseURL)
  const proto = base.protocol === 'https:' ? 'wss' : 'ws'
  return `${proto}://${base.host}/ws`
}

export function connectOrdersWS(onMessage: (ev: MessageEvent) => void) {
  const url = getWsUrl()
  const ws = new WebSocket(url)
  ws.onmessage = onMessage
  return ws
}
