#!/usr/bin/env bash
set -euo pipefail

# Auditoria diaria de conciliacao:
# 1) Faz login na API
# 2) Consulta /indicators/reconciliation
# 3) Imprime resumo textual pronto para conferencia do caixa

usage() {
  cat <<'EOF'
Uso:
  ./backend/scripts/auditoria_diaria.sh [YYYY-MM-DD] [YYYY-MM-DD]

Parametros:
  data_inicio  Opcional. Default: hoje.
  data_fim     Opcional. Default: data_inicio.

Variaveis de ambiente:
  API_URL         Default: http://localhost:8000/api
  AUDIT_USER      Default: gerente
  AUDIT_PASSWORD  Obrigatoria (senha do usuario)

Exemplo:
  AUDIT_PASSWORD='sua_senha' ./backend/scripts/auditoria_diaria.sh
  AUDIT_USER='admin' AUDIT_PASSWORD='sua_senha' ./backend/scripts/auditoria_diaria.sh 2026-07-14
  AUDIT_PASSWORD='sua_senha' ./backend/scripts/auditoria_diaria.sh 2026-07-01 2026-07-14
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

API_URL="${API_URL:-http://localhost:8000/api}"
AUDIT_USER="${AUDIT_USER:-gerente}"
AUDIT_PASSWORD="${AUDIT_PASSWORD:-}"

if [[ -z "$AUDIT_PASSWORD" ]]; then
  echo "ERRO: defina AUDIT_PASSWORD com a senha do usuario de auditoria." >&2
  echo "Exemplo: AUDIT_PASSWORD='sua_senha' ./backend/scripts/auditoria_diaria.sh" >&2
  exit 1
fi

TODAY="$(date +%F)"
START_DATE="${1:-$TODAY}"
END_DATE="${2:-$START_DATE}"

login_tmp="$(mktemp)"
recon_tmp="$(mktemp)"
trap 'rm -f "$login_tmp" "$recon_tmp"' EXIT

# 1) Login
login_status="$(
  curl -sS \
    -o "$login_tmp" \
    -w "%{http_code}" \
    -X POST "$API_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$AUDIT_USER\",\"password\":\"$AUDIT_PASSWORD\"}"
)"

if [[ "$login_status" != "200" ]]; then
  echo "ERRO: falha no login (HTTP $login_status)." >&2
  echo "Resposta da API:" >&2
  cat "$login_tmp" >&2
  exit 1
fi

TOKEN="$(python3 - <<'PY' "$login_tmp"
import json, sys
with open(sys.argv[1], 'r', encoding='utf-8') as f:
    data = json.load(f)
print(data.get('access_token', ''))
PY
)"

ROLE="$(python3 - <<'PY' "$login_tmp"
import json, sys
with open(sys.argv[1], 'r', encoding='utf-8') as f:
    data = json.load(f)
print(data.get('role', ''))
PY
)"

if [[ -z "$TOKEN" ]]; then
  echo "ERRO: token nao recebido no login." >&2
  cat "$login_tmp" >&2
  exit 1
fi

# 2) Consulta reconciliacao
recon_status="$(
  curl -sS \
    -o "$recon_tmp" \
    -w "%{http_code}" \
    -H "Authorization: Bearer $TOKEN" \
    "$API_URL/indicators/reconciliation?start=$START_DATE&end=$END_DATE"
)"

if [[ "$recon_status" != "200" ]]; then
  echo "ERRO: falha na consulta de reconciliacao (HTTP $recon_status)." >&2
  echo "Resposta da API:" >&2
  cat "$recon_tmp" >&2
  exit 1
fi

# 3) Resumo textual para conferencia de caixa
python3 - <<'PY' "$recon_tmp" "$API_URL" "$AUDIT_USER" "$ROLE" "$START_DATE" "$END_DATE"
import json
import sys
from datetime import datetime

path, api_url, audit_user, role, start, end = sys.argv[1:]

with open(path, 'r', encoding='utf-8') as f:
    data = json.load(f)

def br_money(value):
    try:
        v = float(value)
    except Exception:
        v = 0.0
    s = f"{v:,.2f}"
    return "R$ " + s.replace(",", "X").replace(".", ",").replace("X", ".")

def fmt_dt(value):
    if not value:
        return "-"
    text = str(value).replace("Z", "")
    try:
        dt = datetime.fromisoformat(text)
        return dt.strftime("%d/%m/%Y %H:%M:%S")
    except Exception:
        return text

paid_orders = int(data.get("paid_orders", 0) or 0)
diff_orders = int(data.get("orders_with_divergence", 0) or 0)
total_items = float(data.get("total_items", 0) or 0)
total_payments = float(data.get("total_payments", 0) or 0)
total_difference = float(data.get("total_difference", 0) or 0)
divergences = data.get("divergences", []) or []

status_line = "OK - SEM DIVERGENCIAS" if abs(total_difference) <= 0.01 and diff_orders == 0 else "ATENCAO - HA DIVERGENCIAS"

print("=" * 72)
print("RELATORIO DE AUDITORIA DIARIA - CONCILIACAO")
print("=" * 72)
print(f"Periodo: {start} a {end}")
print(f"API: {api_url}")
print(f"Usuario de auditoria: {audit_user} (perfil: {role})")
print("-" * 72)
print(f"Pedidos pagos no periodo: {paid_orders}")
print(f"Pedidos com divergencia:  {diff_orders}")
print(f"Total itens (venda):      {br_money(total_items)}")
print(f"Total pagamentos:         {br_money(total_payments)}")
print(f"Diferenca total:          {br_money(total_difference)}")
print(f"Status conferencia caixa: {status_line}")
print("-" * 72)

if not divergences:
    print("Nenhuma divergencia encontrada no periodo.")
else:
    print("DIVERGENCIAS (ordem por maior impacto):")
    for d in divergences:
        order_id = d.get("order_id")
        order_number = d.get("order_number")
        paid_at = fmt_dt(d.get("paid_at"))
        total_i = br_money(d.get("total_items", 0))
        total_p = br_money(d.get("total_payments", 0))
        diff = br_money(d.get("diff", 0))
        methods = ", ".join(d.get("payment_methods", []) or []) or "-"
        reason = (d.get("override_reason") or "").strip() or "(sem override)"
        by = (d.get("override_by") or "").strip() or "-"

        print("")
        print(f"Pedido #{order_number} (id={order_id})")
        print(f"  Pago em:            {paid_at}")
        print(f"  Total itens:        {total_i}")
        print(f"  Total pagamentos:   {total_p}")
        print(f"  Diferenca:          {diff}")
        print(f"  Metodos:            {methods}")
        print(f"  Override por:       {by}")
        print(f"  Motivo override:    {reason}")

print("=" * 72)
print("FIM DO RELATORIO")
print("=" * 72)
PY
