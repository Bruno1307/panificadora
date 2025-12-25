from __future__ import annotations
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from dotenv import load_dotenv
import os
from fastapi.middleware.cors import CORSMiddleware
from .db import engine, Base
from .routers import products, orders
from .ws import manager

app = FastAPI(title="Panificadora Jardim API")
# Rota raiz
@app.get("/")
async def root():
    return {"message": "Backend carregado e rodando!"}

# CORS for local dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*", "X-Cashier-Token", "x-cashier-token"],
)

# Create tables on startup (for dev). Replace with Alembic in prod.
@app.on_event("startup")
async def startup():
    # Load .env from backend folder
    env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
    load_dotenv(env_path)
    Base.metadata.create_all(bind=engine)

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.get("/config")
async def get_config():
    return {
        "pix_key": os.getenv("PIX_KEY", ""),
        "pix_name": os.getenv("PIX_NAME", "Panificadora Jardim"),
        "pix_city": os.getenv("PIX_CITY", "SAO PAULO"),
    }

app.include_router(products.router)
app.include_router(orders.router)


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # keep connection alive; ignore incoming
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
