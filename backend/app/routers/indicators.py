from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from ..db import get_db
from ..models import Order, OrderItem, Product, OrderPayment
from ..deps_auth import require_role

router = APIRouter(prefix="/indicators", tags=["indicators"])

@router.get("/revenue")
def get_revenue(
    db: Session = Depends(get_db),
    user=Depends(require_role("gerente", "admin")),
    start: str = Query(None),
    end: str = Query(None),
):
    print(f"[DEBUG] Usuário autenticado: {getattr(user, 'username', user)} | Papel: {getattr(user, 'role', user)}")
    now = datetime.now()
    # Se start/end informados, usa o período customizado
    custom_start = None
    custom_end = None
    from datetime import timezone, timedelta as td
    LOCAL_OFFSET = td(hours=-3)  # UTC-3
    def to_utc(dt):
        return (dt - LOCAL_OFFSET).replace(tzinfo=None)
    if start:
        try:
            local_start = datetime.strptime(start, "%Y-%m-%d")
            custom_start = to_utc(local_start)
        except Exception as e:
            print(f"[DEBUG] Erro ao parsear start: {start} - {e}")
            custom_start = None
    if end:
        try:
            local_end = datetime.strptime(end, "%Y-%m-%d").replace(hour=23, minute=59, second=59, microsecond=999999)
            custom_end = to_utc(local_end)
        except Exception as e:
            print(f"[DEBUG] Erro ao parsear end: {end} - {e}")
            custom_end = None
    print(f"[DEBUG] Params recebidos: start={start}, end={end}, custom_start={custom_start}, custom_end={custom_end}")

    def sum_period(start_date, end_date=None):
        q = db.query(func.sum(OrderItem.unit_price * OrderItem.quantity)).join(Order).filter(Order.status == "paid")
        if start_date:
            q = q.filter(Order.paid_at >= start_date)
        if end_date:
            q = q.filter(Order.paid_at <= end_date)
        return q.scalar() or 0

    def payment_totals_for_period(start_date, end_date=None):
        # Soma por método com base nos pagamentos registrados
        q = db.query(OrderPayment.method, func.sum(OrderPayment.amount))\
            .join(Order, Order.id == OrderPayment.order_id)\
            .filter(Order.status == "paid")
        if start_date:
            q = q.filter(Order.paid_at >= start_date)
        if end_date:
            q = q.filter(Order.paid_at <= end_date)
        result = q.group_by(OrderPayment.method).all()
        return {method or "Indefinido": float(total or 0) for method, total in result}

    # Períodos padrão (converter do horário local para UTC para comparar com paid_at em UTC)
    local_start_day = now.replace(hour=0, minute=0, second=0, microsecond=0)
    local_start_week = local_start_day - timedelta(days=local_start_day.weekday())
    local_start_month = local_start_day.replace(day=1)
    local_start_year = local_start_day.replace(month=1, day=1)

    start_day = to_utc(local_start_day)
    start_week = to_utc(local_start_week)
    start_month = to_utc(local_start_month)
    start_year = to_utc(local_start_year)

    # Se custom_start/end, calcula apenas para o período customizado
    if custom_start or custom_end:
        daily = sum_period(custom_start, custom_end)
        payment_totals_daily = payment_totals_for_period(custom_start, custom_end)
        print(f"[DEBUG] Resultado filtro: daily={daily}, payment_totals_daily={payment_totals_daily}")
        return {
            "daily": float(daily),
            "weekly": 0,
            "monthly": 0,
            "yearly": 0,
            "payment_totals_daily": payment_totals_daily,
            "payment_totals_weekly": {},
            "payment_totals_monthly": {},
            "payment_totals_yearly": {},
        }
    # Caso padrão (sem filtro)
    daily = sum_period(start_day)
    weekly = sum_period(start_week)
    monthly = sum_period(start_month)
    yearly = sum_period(start_year)
    payment_totals_daily = payment_totals_for_period(start_day)
    payment_totals_weekly = payment_totals_for_period(start_week)
    payment_totals_monthly = payment_totals_for_period(start_month)
    payment_totals_yearly = payment_totals_for_period(start_year)
    return {
        "daily": float(daily),
        "weekly": float(weekly),
        "monthly": float(monthly),
        "yearly": float(yearly),
        "payment_totals_daily": payment_totals_daily,
        "payment_totals_weekly": payment_totals_weekly,
        "payment_totals_monthly": payment_totals_monthly,
        "payment_totals_yearly": payment_totals_yearly,
    }

@router.get("/sold_count")
def get_sold_count(
    name: str = Query(..., description="Nome do produto (trecho) para filtrar, ex: 'careca'"),
    db: Session = Depends(get_db),
    user=Depends(require_role("gerente", "admin")),
):
    """Retorna a quantidade vendida hoje (status 'paid') do produto cujo nome contém o trecho informado.

    - Considera o dia atual no fuso local (UTC-3) e compara com `paid_at` (UTC) dos pedidos.
    - Usa filtro por nome com `ilike` (case-insensitive).
    """
    from datetime import timezone, timedelta as td
    LOCAL_OFFSET = td(hours=-3)  # UTC-3
    def to_utc(dt):
        return (dt - LOCAL_OFFSET).replace(tzinfo=None)

    now = datetime.now()
    local_start_day = now.replace(hour=0, minute=0, second=0, microsecond=0)
    start_day = to_utc(local_start_day)

    q = (
        db.query(func.sum(OrderItem.quantity))
        .join(Order, Order.id == OrderItem.order_id)
        .join(Product, Product.id == OrderItem.product_id)
        .filter(Order.status == "paid")
        .filter(Order.paid_at >= start_day)
        .filter(Product.name.ilike(f"%{name}%"))
    )
    total_qty = int(q.scalar() or 0)
    return {"name_filter": name, "sold_today": total_qty}
