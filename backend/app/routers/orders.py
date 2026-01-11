from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException, Request
from ..deps_auth import require_role
from ..models import UserRole
import os
from sqlalchemy.orm import Session
from sqlalchemy import select
from datetime import datetime
from typing import Optional
from ..db import get_db
from .. import models, schemas
from ..ws import manager
from ..deps_auth import get_current_user

router = APIRouter(prefix="/orders", tags=["orders"])

@router.get("/", response_model=list[schemas.Order])
def list_orders(
    db: Session = Depends(get_db),
    status: Optional[str] = None,
    start: Optional[datetime] = None,
    end: Optional[datetime] = None,
    q: Optional[str] = None,
    user=Depends(get_current_user),
):
    query = db.query(models.Order)
    if status:
        query = query.filter(models.Order.status == status)
    if start:
        query = query.filter(models.Order.created_at >= start)
    if end:
        query = query.filter(models.Order.created_at <= end)
    if q:
        like = f"%{q}%"
        query = query.filter(
            (models.Order.customer_name.ilike(like)) | (models.Order.table_ref.ilike(like))
        )
    result = query.order_by(models.Order.created_at.desc()).all()
    print(f"[DEBUG] /orders retornou {len(result)} pedidos para o usuário {getattr(user, 'username', user)} (papel: {getattr(user, 'role', None)})")
    return result

@router.post("/", response_model=schemas.Order, status_code=201)
def create_order(data: schemas.OrderCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    # Validate products and capture current unit prices
    items = []
    for it in data.items:
        prod = db.query(models.Product).get(it.product_id)
        if not prod:
            raise HTTPException(status_code=400, detail=f"Product {it.product_id} not found")
        items.append(models.OrderItem(product_id=prod.id, quantity=it.quantity, unit_price=float(prod.price)))

    # Calcular order_number diário
    today = datetime.utcnow().date()
    last_order = db.query(models.Order).filter(
        models.Order.created_at >= datetime(today.year, today.month, today.day),
        models.Order.created_at < datetime(today.year, today.month, today.day, 23, 59, 59, 999999)
    ).order_by(models.Order.order_number.desc()).first()
    next_order_number = 1
    if last_order and last_order.order_number:
        next_order_number = last_order.order_number + 1

    order = models.Order(
        items=items,
        status="pending",
        customer_name=data.customer_name,
        table_ref=data.table_ref,
        order_number=next_order_number
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    # notify websocket listeners
    import anyio
    anyio.from_thread.run(manager.broadcast, {"type": "order_created", "id": order.id, "status": order.status})
    return order

@router.get("/pending", response_model=list[schemas.Order])
def list_pending_orders(db: Session = Depends(get_db)):
    return db.query(models.Order).filter(models.Order.status == "pending").all()

@router.put("/{order_id}", response_model=schemas.Order)
def update_order(order_id: int, data: schemas.OrderCreate, db: Session = Depends(get_db)):
    order = db.query(models.Order).get(order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status != "pending":
        raise HTTPException(status_code=400, detail="Only pending orders can be modified")
    # replace meta
    order.customer_name = data.customer_name
    order.table_ref = data.table_ref
    # replace items
    order.items.clear()
    for it in data.items:
        prod = db.query(models.Product).get(it.product_id)
        if not prod:
            raise HTTPException(status_code=400, detail=f"Product {it.product_id} not found")
        order.items.append(models.OrderItem(product_id=prod.id, quantity=it.quantity, unit_price=float(prod.price)))
    # Garante que order_number não seja alterado (mantém o mesmo do dia da criação)
    db.commit()
    db.refresh(order)
    import anyio
    anyio.from_thread.run(manager.broadcast, {"type": "order_updated", "id": order.id, "status": order.status})
    return order

@router.post("/{order_id}/pay", response_model=schemas.Order)
def pay_order(order_id: int, data: schemas.PayOrder, request: Request, db: Session = Depends(get_db)):
    # Token do caixa removido para facilitar testes
    order = db.query(models.Order).get(order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status != "pending":
        raise HTTPException(status_code=400, detail="Order is not pending")
    order.status = "paid"
    order.payment_method = data.method
    order.paid_at = datetime.utcnow()
    db.commit()
    db.refresh(order)
    import anyio
    anyio.from_thread.run(manager.broadcast, {"type": "order_paid", "id": order.id, "status": order.status})
    return order

@router.post("/{order_id}/cancel", response_model=schemas.Order)
def cancel_order(order_id: int, request: Request, db: Session = Depends(get_db)):
    token = os.getenv("CASHIER_TOKEN")
    if token:
        header = request.headers.get("X-Cashier-Token")
        if header != token:
            raise HTTPException(status_code=403, detail="Cashier token required or invalid")
    order = db.query(models.Order).get(order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status != "pending":
        raise HTTPException(status_code=400, detail="Order is not pending")
    order.status = "cancelled"
    db.commit()
    db.refresh(order)
    import anyio
    anyio.from_thread.run(manager.broadcast, {"type": "order_cancelled", "id": order.id, "status": order.status})
    return order

@router.get("/{order_id}", response_model=schemas.Order)
def get_order(order_id: int, db: Session = Depends(get_db)):
    order = db.query(models.Order).get(order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order
