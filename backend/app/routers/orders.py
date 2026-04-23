from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException, Request
from ..deps_auth import require_role
from ..models import UserRole
import os
import subprocess
from sqlalchemy.orm import Session
from sqlalchemy import select, or_
import re
from datetime import datetime, timedelta
from typing import Optional
from ..db import get_db
from .. import models, schemas
from ..ws import manager
from ..deps_auth import get_current_user

router = APIRouter(prefix="/orders", tags=["orders"])


def _format_currency_br(value: float) -> str:
    """Formata valor monetário em estilo brasileiro, ex: 12.5 -> '12,50'."""
    return f"{value:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def _normalize_payment_label(method: str | None) -> str:
    """Normaliza o nome da forma de pagamento para evitar problemas de acentuação no cupom.

    Mantém o valor no banco com acento, mas imprime sem acentos (DEBITO, CREDITO, etc.).
    """
    if not method:
        return "INDEFINIDO"
    m = method.strip().lower()
    if m == "dinheiro":
        return "DINHEIRO"
    if m == "pix":
        return "PIX"
    if m in {"debito", "débito"}:
        return "DEBITO"
    if m in {"credito", "crédito"}:
        return "CREDITO"
    return method.upper()


def build_escpos_receipt(order: models.Order) -> bytes:
    """Gera texto ESC/POS simples para a Elgin i9 com corte automático."""
    width = 40
    lines: list[str] = []

    lines.append("PANIFICADORA JARDIM".center(width))
    lines.append("CUPOM NAO FISCAL".center(width))
    lines.append("-" * width)

    ref = order.order_number or order.id
    lines.append(f"PEDIDO: {ref}")
    if order.table_ref:
        lines.append(f"MESA/REF: {order.table_ref}")
    if order.customer_name:
        lines.append(f"CLIENTE: {order.customer_name}")

    status_label = {
        "pending": "A PAGAR",
        "paid": "PAGO",
        "cancelled": "CANCELADO",
    }.get((order.status or "").lower(), (order.status or "-").upper())
    lines.append(f"STATUS: {status_label}"[:width])

    # Ajusta horário local (container está em UTC) usando offset configurável
    try:
        offset_h = int(os.getenv("LOCAL_TIME_OFFSET_HOURS", "-3"))
    except Exception:
        offset_h = -3
    local_now = datetime.utcnow() + timedelta(hours=offset_h)
    lines.append(local_now.strftime("DATA: %d/%m/%Y %H:%M:%S"))

    lines.append("-" * width)
    lines.append("ITEM                        ")
    lines.append(" QTD  VL.UN   TOTAL".rjust(width))
    lines.append("-" * width)

    total = 0.0
    for it in order.items:
        name = it.product.name if getattr(it, "product", None) else f"ID {it.product_id}"
        name = name[:width]  # evita quebrar demais
        qty = it.quantity
        unit = float(it.unit_price)
        line_total = qty * unit
        total += line_total

        lines.append(name)
        price_line = f"{qty:>3} x {_format_currency_br(unit):>7} = {_format_currency_br(line_total):>8}"
        lines.append(price_line.rjust(width))

    lines.append("-" * width)
    lines.append(f"TOTAL: R$ {_format_currency_br(total)}".rjust(width))

    if order.payment_method:
        label = _normalize_payment_label(order.payment_method)
        lines.append(f"PGTO: {label}"[:width])
    if order.payments:
        for p in order.payments:
            label = _normalize_payment_label(p.method)
            lines.append(f"{label}: R$ {_format_currency_br(float(p.amount))}"[:width])

    lines.append("")
    lines.append("OBRIGADO PELA PREFERENCIA!".center(width))
    lines.append("")

    text = "\n".join(lines) + "\n\n\n"
    cut_cmd = b"\x1D\x56\x00"  # ESC/POS corte total
    return text.encode("latin-1", errors="ignore") + cut_cmd

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
    # Ajuste de datas: tratar `start`/`end` como horário local e converter para UTC
    # Considera fuso UTC-3 (Brasil) como padrão
    if start or end:
        LOCAL_OFFSET = timedelta(hours=-3)  # UTC-3
        def to_utc(dt: datetime) -> datetime:
            return (dt - LOCAL_OFFSET).replace(tzinfo=None)
        if start:
            local_start = start.replace(hour=0, minute=0, second=0, microsecond=0)
            start_utc = to_utc(local_start)
            query = query.filter(models.Order.created_at >= start_utc)
        if end:
            # Torna `end` inclusivo até o fim do dia local
            local_end = end.replace(hour=23, minute=59, second=59, microsecond=999999)
            end_utc = to_utc(local_end)
            query = query.filter(models.Order.created_at <= end_utc)
    if q:
        like = f"%{q}%"
        # Sempre permite buscar por nome ou mesa/comanda
        filters = [
            models.Order.customer_name.ilike(like),
            models.Order.table_ref.ilike(like),
        ]
        # Se a busca contiver dígitos, também tenta por número/id do pedido
        digits = re.sub(r"\D", "", q or "")
        if digits:
            try:
                num = int(digits)
                filters.append(models.Order.order_number == num)
                filters.append(models.Order.id == num)
            except Exception:
                pass
        query = query.filter(or_(*filters))
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
    # Calcula total do pedido a partir dos itens
    total_value = sum(float(it.unit_price) * it.quantity for it in order.items)

    # Se veio lista de pagamentos, registra partes
    methods_join = None
    if data.payments and len(data.payments) > 0:
        # Validar e somar
        parts_sum = 0.0
        for part in data.payments:
            if not part.method:
                raise HTTPException(status_code=400, detail="Payment part must include method")
            if part.amount is None or float(part.amount) < 0:
                raise HTTPException(status_code=400, detail="Payment part amount must be >= 0")
            parts_sum += float(part.amount)
        # Tolerância de centavos
        if round(parts_sum, 2) < round(total_value, 2):
            raise HTTPException(status_code=400, detail="Total payment parts are less than order total")
        # Remove pagamentos anteriores, se houver, para idempotência
        order.payments.clear()
        # Registrar pagamentos
        for part in data.payments:
            db.add(models.OrderPayment(order_id=order.id, method=part.method, amount=float(part.amount)))
        methods_join = " + ".join(sorted(set(p.method for p in data.payments)))
    else:
        # Caso simples: único método informado
        if not data.method:
            raise HTTPException(status_code=400, detail="Payment method required")
        # Registrar um pagamento com valor total
        db.add(models.OrderPayment(order_id=order.id, method=data.method, amount=round(total_value, 2)))
        methods_join = data.method

    # Atualizar status e metadados do pedido
    order.status = "paid"
    order.payment_method = methods_join
    order.paid_at = datetime.utcnow()
    db.commit()
    db.refresh(order)
    import anyio
    anyio.from_thread.run(manager.broadcast, {"type": "order_paid", "id": order.id, "status": order.status})
    return order


@router.post("/{order_id}/print")
def print_order(order_id: int, db: Session = Depends(get_db)):
    """Imprime cupom nao fiscal do pedido (pendente ou pago) na Elgin i9 via CUPS.

    OBS: rota sem autenticacao, pensada para uso interno no servidor do PDV.
    Proteja com firewall/rede se necessario.
    """
    order = db.query(models.Order).get(order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status not in {"pending", "paid"}:
        raise HTTPException(status_code=400, detail="Only pending or paid orders can be printed")

    data = build_escpos_receipt(order)
    printer_name = os.getenv("TICKET_PRINTER_NAME", "Elgin_i9")
    try:
        subprocess.run(["lp", "-d", printer_name], input=data, check=True)
    except subprocess.CalledProcessError:
        raise HTTPException(status_code=500, detail="Erro ao enviar cupom para a impressora")

    return {"status": "printed", "printer": printer_name}


@router.post("/print-test")
def print_test_ticket():
    """Imprime um cupom de teste curto na impressora de cupom."""
    printer_name = os.getenv("TICKET_PRINTER_NAME", "Elgin_i9")
    body = (
        "TESTE PDV OK\n"
        "PANIFICADORA JARDIM\n"
        "------------------------------\n"
        "Este eh apenas um teste curto.\n\n\n"
    )
    cut_cmd = b"\x1D\x56\x00"
    data = body.encode("latin-1", errors="ignore") + cut_cmd
    try:
        subprocess.run(["lp", "-d", printer_name], input=data, check=True)
    except subprocess.CalledProcessError:
        raise HTTPException(status_code=500, detail="Erro ao enviar cupom de teste para a impressora")
    return {"status": "test_printed", "printer": printer_name}

@router.post("/{order_id}/cancel", response_model=schemas.Order)
def cancel_order(order_id: int, request: Request, db: Session = Depends(get_db), user=Depends(get_current_user)):
    token = os.getenv("CASHIER_TOKEN")
    # Permite cancelar sem token para usuários autenticados com papel 'gerente' ou 'caixa'
    # Robustez: aceita comparar tanto Enum quanto string
    require_token = True
    try:
        role_obj = getattr(user, "role", None)
        role_name = None
        if role_obj is not None:
            # Se Enum, usa .value; se string, mantém
            role_name = getattr(role_obj, "value", role_obj)
        if isinstance(role_name, str):
            if role_name.lower() in {"gerente", "caixa"}:
                require_token = False
        elif role_obj in {UserRole.gerente, UserRole.caixa}:
            require_token = False
    except Exception:
        require_token = True
    if token and require_token:
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
