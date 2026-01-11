from __future__ import annotations
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from dotenv import load_dotenv
import os
from fastapi.middleware.cors import CORSMiddleware

from .db import engine, Base
from .routers import products, orders, auth
from .ws import manager
from contextlib import asynccontextmanager


# Lifespan handler substituindo on_event("startup")
print('>>> CRIANDO TABELAS NO BANCO DE DADOS <<<')
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load .env from backend folder
    env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
    load_dotenv(env_path)
    Base.metadata.create_all(bind=engine)
    yield

app = FastAPI(title="Panificadora Jardim API", lifespan=lifespan)

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



from .routers import indicators, comandas, test_password
app.include_router(products.router)
app.include_router(orders.router)
app.include_router(auth.router)
app.include_router(indicators.router)
app.include_router(comandas.router)
app.include_router(test_password.router)


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # keep connection alive; ignore incoming
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
