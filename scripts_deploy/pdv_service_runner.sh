#!/usr/bin/env bash
set -euo pipefail

# PDV service runner: keeps PDV browser windows alive and relaunches if needed.
# Env vars (same as start_pdv_browser.sh):
# - PDV_URL, DUAL=1, KIOSK=0, GUEST_LEFT=1, GUEST_RIGHT=0, EXTRA_ARGS
# - WINDOW_NAME_PATTERN optional (fallback for tiling)

# Global disable guard: if set, keep service alive but do not launch
if [[ "${DISABLE_PDV_BROWSER:-}" == "1" ]] || [[ -f "${HOME}/.config/pdv/disable_browser" ]]; then
  echo "[pdv_service_runner] Navegador desativado (DISABLE_PDV_BROWSER/flag) — não iniciar/reiniciar PDV."
  # Keep the unit active without launching or relaunch loops
  sleep infinity
fi

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
starter="${script_dir}/start_pdv_browser.sh"
tiler="${script_dir}/position_pdv_windows.sh"
DUAL_MODE="${DUAL:-0}"

detect_browser() {
  local candidates=(google-chrome chromium-browser chromium firefox)
  for b in "${candidates[@]}"; do
    if command -v "$b" >/dev/null 2>&1; then
      echo "$b"
      return 0
    fi
  done
  echo ""
  return 1
}

# Returns 0 if both left and right PDV windows are alive, 1 otherwise
pdv_windows_alive() {
  local cache_root
  cache_root="${XDG_CACHE_HOME:-$HOME/.cache}"

  # Chrome/Chromium profiles used by starter
  local left_chrome_dir="${cache_root}/pdv-left-guest"
  local right_chrome_dir="${cache_root}/pdv-right"
  local chrome_left_p chrome_right_p
  # Detect Chrome/Chromium windows purely by unique --user-data-dir flags
  # Use ps/awk for broader compatibility (avoids pgrep option parsing issues)
  chrome_left_p=$(ps -eo pid,args | awk -v pat="--user-data-dir=${left_chrome_dir}" '$0 ~ pat {print $1; exit}' || true)
  chrome_right_p=$(ps -eo pid,args | awk -v pat="--user-data-dir=${right_chrome_dir}" '$0 ~ pat {print $1; exit}' || true)

  # Firefox profiles used by starter
  local left_ff_dir="${cache_root}/pdv-left-firefox"
  local right_ff_dir="${cache_root}/pdv-right-firefox"
  local ff_left_p ff_right_p
  # Detect Firefox windows by -profile flags (binary name may vary)
  ff_left_p=$(ps -eo pid,args | awk -v pat="-profile ${left_ff_dir}" '$0 ~ pat {print $1; exit}' || true)
  ff_right_p=$(ps -eo pid,args | awk -v pat="-profile ${right_ff_dir}" '$0 ~ pat {print $1; exit}' || true)

  if { [[ -n "${chrome_left_p}" && -n "${chrome_right_p}" ]]; } || { [[ -n "${ff_left_p}" && -n "${ff_right_p}" ]]; }; then
    return 0
  fi
  return 1
}

echo "[pdv_service_runner] Iniciando PDV. Modo DUAL=${DUAL_MODE}."

# In single-window mode, start once and keep service alive (no tiling, no relaunch loop)
if [[ "${DUAL_MODE}" != "1" ]]; then
  "${starter}" || true
  echo "[pdv_service_runner] Modo simples: nenhuma restrição aplicada."
  # Keep the service active without relaunch loops
  sleep infinity
fi

# DUAL mode: keep previous behavior (tiling + monitoring)
"${starter}" || true
if command -v wmctrl >/dev/null 2>&1 || command -v xdotool >/dev/null 2>&1; then
  tries=15
  while (( tries > 0 )); do
    if pdv_windows_alive; then
      break
    fi
    sleep 1
    tries=$((tries-1))
  done
  if [[ -x "${tiler}" ]]; then
    "${tiler}" || true
  fi
fi

while true; do
  if ! pdv_windows_alive; then
    echo "[pdv_service_runner] Janelas não encontradas — relançando PDV..."
    "${starter}" || true
    if command -v wmctrl >/dev/null 2>&1 || command -v xdotool >/dev/null 2>&1; then
      tries=15
      while (( tries > 0 )); do
        if pdv_windows_alive; then
          break
        fi
        sleep 1
        tries=$((tries-1))
      done
      if [[ -x "${tiler}" ]]; then
        "${tiler}" || true
      fi
    fi
  fi
  sleep 8
done
