#!/usr/bin/env bash
set -euo pipefail

# Setup a user-level systemd service to keep PDV running and auto-restart on failures.
# Respects env: PDV_URL, DUAL, KIOSK, GUEST, PROFILE_DIR, GUEST_LEFT, GUEST_RIGHT, EXTRA_ARGS, WINDOW_NAME_PATTERN

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
runner="${script_dir}/pdv_service_runner.sh"
tiler="${script_dir}/position_pdv_windows.sh"

if [[ ! -x "$runner" ]]; then
  chmod +x "$runner"
fi
if [[ -f "$tiler" && ! -x "$tiler" ]]; then
  chmod +x "$tiler"
fi

unit_dir="${HOME}/.config/systemd/user"
mkdir -p "$unit_dir"

unit_file="${unit_dir}/pdv-browser.service"

# Defaults (no /login)
default_url="http://10.62.212.251:4173/"
url_env="${PDV_URL:-$default_url}"
dual_env="${DUAL:-0}"
kiosk_env="${KIOSK:-0}"
guest_env="${GUEST:-0}"
profile_env="${PROFILE_DIR:-}"
guest_right_env="${GUEST_RIGHT:-0}"
guest_left_env="${GUEST_LEFT:-0}"
extra_env="${EXTRA_ARGS:-}"
name_pattern_env="${WINDOW_NAME_PATTERN:-Panificadora Jardim}"
use_key_snap_env="${USE_KEY_SNAP:-0}"
margin_x_env="${MARGIN_X:-0}"
margin_y_env="${MARGIN_Y:-0}"
display_env="${DISPLAY:-:0}"
session_type_env="${XDG_SESSION_TYPE:-x11}"
lang_env="${LANG:-pt_BR.UTF-8}"
lc_all_env="${LC_ALL:-pt_BR.UTF-8}"
language_env="${LANGUAGE:-pt_BR.UTF-8}"

cat > "$unit_file" <<EOF
[Unit]
Description=PDV Panificadora - Browser Split Screen
After=default.target

[Service]
Type=simple
Environment=PDV_URL=${url_env}
Environment=DUAL=${dual_env}
Environment=KIOSK=${kiosk_env}
Environment=GUEST=${guest_env}
Environment=GUEST_RIGHT=${guest_right_env}
Environment=GUEST_LEFT=${guest_left_env}
# Quote values that may contain spaces
Environment="EXTRA_ARGS=${extra_env}"
Environment="WINDOW_NAME_PATTERN=${name_pattern_env}"
 Environment=USE_KEY_SNAP=${use_key_snap_env}
 Environment=MARGIN_X=${margin_x_env}
 Environment=MARGIN_Y=${margin_y_env}
 Environment=DISPLAY=${display_env}
 Environment=XDG_SESSION_TYPE=${session_type_env}
 Environment=LANG=${lang_env}
 Environment=LC_ALL=${lc_all_env}
 Environment=LANGUAGE=${language_env}
 Environment="PROFILE_DIR=${profile_env}"
ExecStart=${runner}
# ExecStartPost removido para evitar reposicionamento duplicado e trocas de foco
# ExecStartPost=${tiler}
Restart=always
RestartSec=5

[Install]
WantedBy=default.target
EOF

echo "Instalando serviço user systemd: $unit_file"
systemctl --user daemon-reload
systemctl --user enable --now pdv-browser.service

# Disable desktop autostart to prevent duplicate launches
desktop_file="${HOME}/.config/autostart/pdv-kiosk.desktop"
if [[ -f "$desktop_file" ]]; then
  sed -i 's/^X-GNOME-Autostart-enabled=.*/X-GNOME-Autostart-enabled=false/' "$desktop_file" || true
  echo "Desabilitei o autostart desktop para evitar duplicidade: $desktop_file"
fi

echo "Serviço ativo. Para status: systemctl --user status pdv-browser.service"
echo "Para logs: journalctl --user -u pdv-browser.service -f"
