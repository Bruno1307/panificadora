from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from ..db import get_db
from ..models import Order, OrderItem
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
        q = db.query(Order.payment_method, func.sum(OrderItem.unit_price * OrderItem.quantity))\
            .join(OrderItem, Order.id == OrderItem.order_id)\
            .filter(Order.status == "paid")
        if start_date:
            q = q.filter(Order.paid_at >= start_date)
        if end_date:
            q = q.filter(Order.paid_at <= end_date)
        result = q.group_by(Order.payment_method).all()
        return {method or "Indefinido": float(total or 0) for method, total in result}

    # Períodos padrão
    start_day = now.replace(hour=0, minute=0, second=0, microsecond=0)
    start_week = start_day - timedelta(days=start_day.weekday())
    start_month = start_day.replace(day=1)
    start_year = start_day.replace(month=1, day=1)

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
