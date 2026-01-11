from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from ..db import get_db
from .. import models, schemas
from ..deps_auth import require_role, get_current_user
from datetime import datetime

router = APIRouter(prefix="/comandas", tags=["comandas"])

@router.post("/abrir", response_model=schemas.Order)
def abrir_comanda(
    order: schemas.OrderCreate,
    db: Session = Depends(get_db),
    user=Depends(require_role(models.UserRole.balconista.value, models.UserRole.gerente.value))
):
    # Geração sequencial do número do pedido diário (NUNCA usar timestamp)
    hoje = datetime.now().date()
    ultimo = db.query(models.Order).filter(
        models.Order.created_at >= datetime.combine(hoje, datetime.min.time()),
        models.Order.created_at <= datetime.combine(hoje, datetime.max.time())
    ).order_by(models.Order.order_number.desc()).first()
    novo_numero = (ultimo.order_number + 1) if ultimo and ultimo.order_number else 1
    db_order = models.Order(
        status="comanda_aberta",
        customer_name=order.customer_name,
        table_ref=order.table_ref,
        order_number=novo_numero,
    )
    db.add(db_order)
    db.commit()
    db.refresh(db_order)
    return db_order

@router.get("/abertas", response_model=List[schemas.Order])
def listar_comandas_abertas(
    db: Session = Depends(get_db),
    user=Depends(require_role(models.UserRole.balconista.value, models.UserRole.gerente.value))
):
    return db.query(models.Order).filter(models.Order.status == "comanda_aberta").all()

@router.post("/{comanda_id}/adicionar_item", response_model=schemas.Order)
def adicionar_item_comanda(
    comanda_id: int,
    item: schemas.OrderItemCreate,
    db: Session = Depends(get_db),
    user=Depends(require_role(models.UserRole.balconista.value, models.UserRole.gerente.value))
):
    comanda = db.query(models.Order).filter_by(id=comanda_id, status="comanda_aberta").first()
    if not comanda:
        raise HTTPException(status_code=404, detail="Comanda não encontrada ou já fechada.")
    produto = db.query(models.Product).filter_by(id=item.product_id).first()
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado.")
    order_item = models.OrderItem(
        order_id=comanda.id,
        product_id=produto.id,
        quantity=item.quantity,
        unit_price=produto.price
    )
    db.add(order_item)
    db.commit()
    db.refresh(comanda)
    return comanda

@router.post("/{comanda_id}/fechar", response_model=schemas.Order)
def fechar_comanda(
    comanda_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_role(models.UserRole.balconista.value, models.UserRole.gerente.value))
):
    comanda = db.query(models.Order).filter_by(id=comanda_id, status="comanda_aberta").first()
    if not comanda:
        raise HTTPException(status_code=404, detail="Comanda não encontrada ou já fechada.")
    # Garante que order_number está correto (sequencial do dia)
    hoje = comanda.created_at.date() if comanda.created_at else datetime.now().date()
    ultimo = db.query(models.Order).filter(
        models.Order.created_at >= datetime.combine(hoje, datetime.min.time()),
        models.Order.created_at <= datetime.combine(hoje, datetime.max.time()),
        models.Order.status.in_(["pending", "paid", "cancelled"])
    ).order_by(models.Order.order_number.desc()).first()
    novo_numero = (ultimo.order_number + 1) if ultimo and ultimo.order_number else 1
    comanda.order_number = novo_numero
    comanda.status = "pending"
    comanda.paid_at = None
    db.commit()
    db.refresh(comanda)
    return comanda
