from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
import os
import subprocess
from ..db import get_db
from ..models import Order, OrderItem, Product, OrderPayment
from ..deps_auth import require_role
from .. import schemas

router = APIRouter(prefix="/indicators", tags=["indicators"])


def _resolve_period_utc(start: str | None, end: str | None) -> tuple[datetime, datetime]:
    """Resolve o período de consulta em UTC usando base local UTC-3."""
    from datetime import timedelta as td

    local_offset = td(hours=-3)
    now_local = datetime.utcnow() + local_offset

    def to_utc(dt: datetime) -> datetime:
        return (dt - local_offset).replace(tzinfo=None)

    local_start = now_local.replace(hour=0, minute=0, second=0, microsecond=0)
    local_end = now_local.replace(hour=23, minute=59, second=59, microsecond=999999)

    if start:
        local_start = datetime.strptime(start, "%Y-%m-%d")
    if end:
        local_end = datetime.strptime(end, "%Y-%m-%d").replace(
            hour=23,
            minute=59,
            second=59,
            microsecond=999999,
        )

    return to_utc(local_start), to_utc(local_end)


def _format_currency_br(value: float) -> str:
    """Formata valor monetário em estilo brasileiro, ex: 12.5 -> '12,50'."""
    return f"{value:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def _normalize_payment_label(method: str | None) -> str:
    """Normaliza o nome da forma de pagamento para evitar problemas de acentuação no cupom."""
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


@router.get("/top-products")
def get_top_products(
    db: Session = Depends(get_db),
    user=Depends(require_role("balconista", "gerente", "caixa", "admin")),
    limit: int = 100,
):
    """Retorna os produtos mais vendidos (por quantidade), em ordem decrescente.

    Considera apenas pedidos pagos, somando a quantidade de cada item.
    """
    query = (
        db.query(
            OrderItem.product_id,
            func.sum(OrderItem.quantity).label("total_quantity"),
        )
        .join(Order, Order.id == OrderItem.order_id)
        .filter(Order.status == "paid")
        .group_by(OrderItem.product_id)
        .order_by(func.sum(OrderItem.quantity).desc())
        .limit(limit)
    )

    rows = query.all()
    return [
        {"product_id": product_id, "total_quantity": int(total or 0)}
        for product_id, total in rows
    ]


@router.get("/revenue")
def get_revenue(
    db: Session = Depends(get_db),
    user=Depends(require_role("gerente", "admin")),
    start: str = Query(None),
    end: str = Query(None),
):
    print(f"[DEBUG] Usuário autenticado: {getattr(user, 'username', user)} | Papel: {getattr(user, 'role', user)}")
    # Baseia cálculos no horário local (UTC-3) derivado de UTC
    from datetime import timezone, timedelta as td
    LOCAL_OFFSET = td(hours=-3)  # UTC-3
    now_utc = datetime.utcnow()
    now = now_utc + LOCAL_OFFSET
    # Se start/end informados, usa o período customizado
    custom_start = None
    custom_end = None
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
        q = (
            db.query(OrderPayment.method, func.sum(OrderPayment.amount))
            .join(Order, Order.id == OrderPayment.order_id)
            .filter(Order.status == "paid")
        )
        if start_date:
            q = q.filter(Order.paid_at >= start_date)
        if end_date:
            q = q.filter(Order.paid_at <= end_date)
        result = q.group_by(OrderPayment.method).all()
        return {method or "Indefinido": float(total or 0) for method, total in result}

    # Períodos padrão (converter do horário local para UTC para comparar com paid_at em UTC)
    local_start_day = now.replace(hour=0, minute=0, second=0, microsecond=0)
    local_end_day = now.replace(hour=23, minute=59, second=59, microsecond=999999)
    local_start_week = local_start_day - timedelta(days=local_start_day.weekday())
    local_start_month = local_start_day.replace(day=1)
    local_start_year = local_start_day.replace(month=1, day=1)

    start_day = to_utc(local_start_day)
    end_day = to_utc(local_end_day)
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
    # Usa intervalo fechado do dia local para evitar janela até 03:00 UTC
    daily = sum_period(start_day, end_day)
    # Para consistência, usa o fim do dia local como limite superior
    end_week = end_day
    end_month = end_day
    end_year = end_day
    weekly = sum_period(start_week, end_week)
    monthly = sum_period(start_month, end_month)
    yearly = sum_period(start_year, end_year)
    payment_totals_daily = payment_totals_for_period(start_day, end_day)
    payment_totals_weekly = payment_totals_for_period(start_week, end_week)
    payment_totals_monthly = payment_totals_for_period(start_month, end_month)
    payment_totals_yearly = payment_totals_for_period(start_year, end_year)
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


@router.post("/revenue/print")
def print_revenue_coupon(
    db: Session = Depends(get_db),
    user=Depends(require_role("gerente", "admin")),
    start: str = Query(None),
    end: str = Query(None),
):
    """Imprime no cupom o resumo de faturamento (período filtrado ou dia atual)."""
    from datetime import timezone, timedelta as td

    LOCAL_OFFSET = td(hours=-3)  # UTC-3, alinhado com get_revenue
    now_utc = datetime.utcnow()
    now_local = now_utc + LOCAL_OFFSET

    # Converte datas de filtro (YYYY-MM-DD) em UTC para consultas
    custom_start = None
    custom_end = None

    def to_utc(dt: datetime) -> datetime:
        return (dt - LOCAL_OFFSET).replace(tzinfo=None)

    if start:
        try:
            local_start = datetime.strptime(start, "%Y-%m-%d")
            custom_start = to_utc(local_start)
        except Exception as e:
            print(f"[DEBUG] Erro ao parsear start em /revenue/print: {start} - {e}")
            custom_start = None
    if end:
        try:
            local_end = datetime.strptime(end, "%Y-%m-%d").replace(hour=23, minute=59, second=59, microsecond=999999)
            custom_end = to_utc(local_end)
        except Exception as e:
            print(f"[DEBUG] Erro ao parsear end em /revenue/print: {end} - {e}")
            custom_end = None

    def sum_period(start_date, end_date=None):
        q = db.query(func.sum(OrderItem.unit_price * OrderItem.quantity)).join(Order).filter(Order.status == "paid")
        if start_date:
            q = q.filter(Order.paid_at >= start_date)
        if end_date:
            q = q.filter(Order.paid_at <= end_date)
        return q.scalar() or 0

    def payment_totals_for_period(start_date, end_date=None):
        q = (
            db.query(OrderPayment.method, func.sum(OrderPayment.amount))
            .join(Order, Order.id == OrderPayment.order_id)
            .filter(Order.status == "paid")
        )
        if start_date:
            q = q.filter(Order.paid_at >= start_date)
        if end_date:
            q = q.filter(Order.paid_at <= end_date)
        result = q.group_by(OrderPayment.method).all()
        return {method or "Indefinido": float(total or 0) for method, total in result}

    # Define o intervalo a ser usado
    if custom_start or custom_end:
        start_dt = custom_start
        end_dt = custom_end
        # Legenda do período baseada nos parâmetros originais
        if start and end:
            period_label = f"PERIODO: {start.split('-')[2]}/{start.split('-')[1]}/{start.split('-')[0]} - {end.split('-')[2]}/{end.split('-')[1]}/{end.split('-')[0]}"
        elif start:
            period_label = f"PERIODO A PARTIR DE: {start.split('-')[2]}/{start.split('-')[1]}/{start.split('-')[0]}"
        elif end:
            period_label = f"PERIODO ATE: {end.split('-')[2]}/{end.split('-')[1]}/{end.split('-')[0]}"
        else:
            period_label = now_local.strftime("DIA: %d/%m/%Y")
    else:
        # Sem filtro: usa o dia atual no fuso local
        local_start_day = now_local.replace(hour=0, minute=0, second=0, microsecond=0)
        local_end_day = now_local.replace(hour=23, minute=59, second=59, microsecond=999999)
        start_dt = to_utc(local_start_day)
        end_dt = to_utc(local_end_day)
        period_label = local_start_day.strftime("DIA: %d/%m/%Y")

    total_value = float(sum_period(start_dt, end_dt))
    payment_totals = payment_totals_for_period(start_dt, end_dt)

    # Monta texto ESC/POS
    width = 40
    lines: list[str] = []
    lines.append("PANIFICADORA JARDIM".center(width))
    lines.append("RESUMO FATURAMENTO".center(width))
    lines.append("-" * width)
    lines.append(period_label[:width])
    lines.append(now_local.strftime("EMITIDO: %d/%m/%Y %H:%M:%S"))
    lines.append("-" * width)
    lines.append(f"TOTAL DO PERIODO: R$ {_format_currency_br(total_value)}")
    lines.append("")
    lines.append("POR FORMA DE PAGAMENTO:"[:width])

    if payment_totals:
        for method, val in sorted(payment_totals.items()):
            label = _normalize_payment_label(method)
            lines.append(f"{label}: R$ {_format_currency_br(float(val))}"[:width])
    else:
        lines.append("Nenhum valor registrado."[:width])

    lines.append("")
    lines.append("NAO FISCAL - USO INTERNO".center(width))
    lines.append("")

    body = "\n".join(lines) + "\n\n\n"
    cut_cmd = b"\x1D\x56\x00"
    data = body.encode("latin-1", errors="ignore") + cut_cmd

    printer_name = os.getenv("TICKET_PRINTER_NAME", "Elgin_i9")
    try:
        subprocess.run(["lp", "-d", printer_name], input=data, check=True)
    except subprocess.CalledProcessError:
        raise HTTPException(status_code=500, detail="Erro ao enviar faturamento para a impressora")

    return {"status": "revenue_printed", "printer": printer_name, "total": total_value}

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


@router.get("/reconciliation", response_model=schemas.ReconciliationSummary)
def get_reconciliation(
    db: Session = Depends(get_db),
    user=Depends(require_role("gerente", "admin")),
    start: str = Query(default=None, description="Data inicial YYYY-MM-DD"),
    end: str = Query(default=None, description="Data final YYYY-MM-DD"),
    limit: int = Query(default=200, ge=1, le=1000),
):
    """Conciliação de pedidos pagos: total de itens x total de pagamentos."""
    try:
        start_utc, end_utc = _resolve_period_utc(start, end)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    paid_orders = (
        db.query(Order)
        .filter(Order.status == "paid")
        .filter(Order.paid_at >= start_utc)
        .filter(Order.paid_at <= end_utc)
        .order_by(Order.paid_at.desc())
        .all()
    )

    total_items_sum = 0.0
    total_payments_sum = 0.0
    divergences: list[schemas.ReconciliationDivergence] = []

    for order in paid_orders:
        total_items = round(sum(float(it.unit_price) * it.quantity for it in order.items), 2)
        total_payments = round(sum(float(p.amount) for p in order.payments), 2)
        diff = round(total_payments - total_items, 2)

        total_items_sum += total_items
        total_payments_sum += total_payments

        if abs(diff) > 0.01:
            divergences.append(
                schemas.ReconciliationDivergence(
                    order_id=order.id,
                    order_number=order.order_number,
                    paid_at=order.paid_at,
                    total_items=total_items,
                    total_payments=total_payments,
                    diff=diff,
                    payment_methods=[str(p.method) for p in order.payments],
                    override_reason=order.payment_override_reason,
                    override_by=order.payment_override_by,
                )
            )

    divergences.sort(key=lambda x: abs(x.diff), reverse=True)
    limited = divergences[:limit]

    return schemas.ReconciliationSummary(
        start=start_utc,
        end=end_utc,
        paid_orders=len(paid_orders),
        orders_with_divergence=len(divergences),
        total_items=round(total_items_sum, 2),
        total_payments=round(total_payments_sum, 2),
        total_difference=round(total_payments_sum - total_items_sum, 2),
        divergences=limited,
    )
