#!/usr/bin/env bash
set -euo pipefail

# Uso: ./atualiza_ip.sh NOVO_IP
# Exemplo: ./atualiza_ip.sh 10.90.115.251


# Função para detectar IP local principal (não loopback)


# Atualiza frontend/public/config.json
CONFIG_JSON="frontend/public/config.json"
if [ -f "$CONFIG_JSON" ]; then
  jq --arg ip "http://$1:8000/" '.BACKEND_URL = $ip' "$CONFIG_JSON" > "$CONFIG_JSON.tmp" && mv "$CONFIG_JSON.tmp" "$CONFIG_JSON"
fi

# Atualiza frontend/public/config-domain.json
CONFIG_DOMAIN_JSON="frontend/public/config-domain.json"
if [ -f "$CONFIG_DOMAIN_JSON" ]; then
  jq --arg ip "http://$1:8000/" '.DOMAIN_URL = $ip' "$CONFIG_DOMAIN_JSON" > "$CONFIG_DOMAIN_JSON.tmp" && mv "$CONFIG_DOMAIN_JSON.tmp" "$CONFIG_DOMAIN_JSON"
fi

# Atualiza scripts_deploy/test_split_payment.py
if [ -f scripts_deploy/test_split_payment.py ]; then
  sed -i "s|BASE=\"http.*\"|BASE=\"http://$1:8000\"|" scripts_deploy/test_split_payment.py
fi

# Atualiza scripts_deploy/setup_dnsmasq.sh
if [ -f scripts_deploy/setup_dnsmasq.sh ]; then
  sed -i "s|^TARGET_IP=\".*\"|TARGET_IP=\"$1\"|" scripts_deploy/setup_dnsmasq.sh
fi

echo "IP atualizado para $1 em todos os arquivos principais."

# Reiniciar serviços docker (se estiverem rodando)
if command -v docker-compose >/dev/null 2>&1; then
  docker-compose down || true
  docker-compose up -d --build
fi

echo "[OK] IP atualizado para $NOVO_IP nos principais arquivos e serviços reiniciados."
