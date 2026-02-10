#!/usr/bin/env bash
set -euo pipefail

# Install an autostart entry to open PDV at user login.
# Optional env: PDV_URL, KIOSK=1, GUEST=1, EXTRA_ARGS

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
starter="${script_dir}/start_pdv_browser.sh"

if [[ ! -x "$starter" ]]; then
  chmod +x "$starter"
fi

autostart_dir="${HOME}/.config/autostart"
mkdir -p "$autostart_dir"

desktop_file="${autostart_dir}/pdv-kiosk.desktop"

# Default to the requested IP URL unless PDV_URL is provided (no /login)
default_url="http://10.62.212.251:4173/"
url_env="${PDV_URL:-$default_url}"
# Dual window by default per request: right in guest
dual_env="${DUAL:-1}"
kiosk_env="${KIOSK:-0}"
# Requested: left guest, right normal
guest_right_env="${GUEST_RIGHT:-0}"
guest_left_env="${GUEST_LEFT:-1}"
extra_env="${EXTRA_ARGS:-}"

cat > "$desktop_file" <<EOF
[Desktop Entry]
Type=Application
Name=PDV Panificadora (Kiosk)
Comment=Abre o PDV na tela de login ao iniciar a sessão
Exec=env PDV_URL=${url_env} DUAL=${dual_env} KIOSK=${kiosk_env} GUEST_RIGHT=${guest_right_env} GUEST_LEFT=${guest_left_env} EXTRA_ARGS="${extra_env}" ${starter}
Terminal=false
X-GNOME-Autostart-enabled=true
EOF

echo "Autostart instalado: ${desktop_file}"
echo "Abrirá: ${url_env} em duas janelas (kiosk=${kiosk_env}, direita normal, esquerda guest=${guest_left_env})"
echo "Para alterar a URL/mode: exporte variáveis e reexecute este script."
