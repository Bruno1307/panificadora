#!/usr/bin/env bash
set -euo pipefail

###############################################################
# setup_dnsmasq.sh
# Configura o servidor local como DNS para resolver um domínio LAN.
# Uso:
#   sudo ./setup_dnsmasq.sh [DOMINIO] [IP]
# - Se o IP não for informado, será autodetectado via rota padrão (IPv4).
# Exemplo:
#   sudo ./setup_dnsmasq.sh panificadora.jardim 10.90.115.251
# Para múltiplos domínios, edite manualmente /etc/dnsmasq.d/padaria.conf
###############################################################

DOMAIN="${1:-panificadora.jardim}"
USER_IP_OVERRIDE="${2:-}"


detect_ip() {
  # 1) Tenta pela rota padrão (interface de saída predominante)
  if command -v ip >/dev/null 2>&1; then
    dev=$(ip -4 route list default 2>/dev/null | awk '{for(i=1;i<=NF;i++) if($i=="dev") {print $(i+1); exit}}')
    if [[ -n "$dev" ]]; then
      ip4=$(ip -4 addr show dev "$dev" 2>/dev/null | awk '/inet /{print $2}' | cut -d/ -f1 | head -n1)
      if [[ -n "$ip4" && "$ip4" != 127.* ]]; then
        echo "$ip4"
        return 0
      fi
    fi
  fi
  # 2) Fallback: primeiro IPv4 não-loopback conhecido
  if command -v hostname >/dev/null 2>&1; then
    first=$(hostname -I 2>/dev/null | awk '{for(i=1;i<=NF;i++) if($i!~/^127\./ && $i!~/:\:/) {print $i; exit}}')
    if [[ -n "$first" ]]; then
      echo "$first"
      return 0
    fi
  fi
  # 3) Último recurso
  echo ""; return 1
}

if ! command -v dnsmasq >/dev/null 2>&1; then
  echo "[DNSMASQ] Instalando dnsmasq..."
  if command -v apt-get >/dev/null 2>&1; then
    apt-get update -y
    apt-get install -y dnsmasq
  else
    echo "[ERRO] apt-get não encontrado. Instale dnsmasq manualmente nesta distro." >&2
    exit 1
  fi
fi

if [[ -n "$USER_IP_OVERRIDE" ]]; then
  TARGET_IP="$USER_IP_OVERRIDE"
else
  TARGET_IP="$(detect_ip)"
fi

if [[ -z "$TARGET_IP" ]]; then
  echo "[ERRO] Não foi possível detectar o IP local. Informe manualmente." >&2
  exit 1
fi

echo "[DNSMASQ] Dominio: $DOMAIN -> $TARGET_IP"

CFG_DIR="/etc/dnsmasq.d"
CFG_FILE="$CFG_DIR/padaria.conf"
mkdir -p "$CFG_DIR"

# Backup do arquivo anterior
if [ -f "$CFG_FILE" ]; then
  cp "$CFG_FILE" "$CFG_FILE.bak.$(date +%Y%m%d-%H%M%S)"
fi

cat > "$CFG_FILE" <<EOF
address=/$DOMAIN/$TARGET_IP
listen-address=$TARGET_IP,127.0.0.1
bind-interfaces
EOF

echo "[DNSMASQ] Config escrito em $CFG_FILE:" && cat "$CFG_FILE"

# Checagem de sintaxe
if command -v dnsmasq >/dev/null 2>&1; then
  dnsmasq --test || { echo "[ERRO] Sintaxe inválida no arquivo de configuração." >&2; exit 1; }
fi

echo "[DNSMASQ] Reiniciando serviço..."
if ! systemctl restart dnsmasq; then
  echo "[ERRO] Falha ao reiniciar o serviço dnsmasq." >&2
  exit 1
fi
systemctl enable dnsmasq || true

# Abrir firewall se ufw estiver presente
if command -v ufw >/dev/null 2>&1; then
  ufw allow 53/udp || true
  ufw allow 53/tcp || true
fi

echo "[DNSMASQ] Verificando porta 53..."
if command -v ss >/dev/null 2>&1; then
  ss -u4ln | grep ':53' || echo "[ERRO] Porta 53 não está aberta." >&2
fi

echo "[DNSMASQ] Teste de resolução local (se dig ou nslookup estiverem disponíveis)"
if command -v dig >/dev/null 2>&1; then
  dig +short @127.0.0.1 "$DOMAIN" || echo "[ERRO] Falha na resolução DNS." >&2
elif command -v nslookup >/dev/null 2>&1; then
  nslookup "$DOMAIN" 127.0.0.1 || echo "[ERRO] Falha na resolução DNS." >&2
else
  echo "Instale 'dnsutils' (dig) ou 'nslookup' para testar a resolução."
fi

echo "[HTTP] Teste de health via domínio forçado (sem depender de DNS do host)"
curl -sS --resolve "$DOMAIN:80:$TARGET_IP" "http://$DOMAIN/api/health" || echo "[ERRO] Falha no teste HTTP." >&2

echo "\n[OK] dnsmasq configurado.\n"
echo "Clientes devem definir o DNS manualmente para $TARGET_IP na rede do hotspot."
echo "Ex.: Android/iOS/Windows/macOS → DNS: $TARGET_IP, depois abrir http://$DOMAIN/"
