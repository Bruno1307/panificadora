from __future__ import annotations
from typing import List, Any
from fastapi import WebSocket
import json


class ConnectionManager:
    def __init__(self) -> None:
        self.active: List[WebSocket] = []

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active.append(websocket)

    def disconnect(self, websocket: WebSocket) -> None:
        if websocket in self.active:
            self.active.remove(websocket)

    async def broadcast(self, message: Any) -> None:
        data = json.dumps(message, default=str)
        for ws in list(self.active):
            try:
                await ws.send_text(data)
            except Exception:
                # drop broken connection
                self.disconnect(ws)


manager = ConnectionManager()
