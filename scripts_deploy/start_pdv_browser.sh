#!/usr/bin/env bash
set -euo pipefail

# Start the PDV URL in a browser. Supports kiosk, guest, and dual-window.
# Global disable guard: set DISABLE_PDV_BROWSER=1 or create ~/.config/pdv/disable_browser
if [[ "${DISABLE_PDV_BROWSER:-}" == "1" ]]; then
  echo "PDV browser launch disabled by DISABLE_PDV_BROWSER=1"
  exit 0
fi
if [[ -f "${HOME}/.config/pdv/disable_browser" ]]; then
  echo "PDV browser launch disabled by flag file: ~/.config/pdv/disable_browser"
  exit 0
fi
# Config via env vars:
# - PDV_URL: full URL to open (default: from frontend/public/config-domain.json or http://panificadora.jardim/login)
# - KIOSK=1: open in kiosk mode (fullscreen)
# - GUEST=1: open in guest session (single-window mode)
# - DUAL=1: open two windows side-by-side (left normal, right configurable)
# - LEFT_URL/RIGHT_URL: override per window; default PDV_URL
# - GUEST_LEFT=0|1 and GUEST_RIGHT=0|1: guest per window (DUAL mode)
# - PROFILE_DIR=/path: use a custom browser profile directory (single-window mode)
# - EXTRA_ARGS: extra args to pass to the browser

# Sensible defaults: single window, no kiosk, no guest
DUAL="${DUAL:-0}"
KIOSK="${KIOSK:-0}"
GUEST_LEFT="${GUEST_LEFT:-0}"
GUEST_RIGHT="${GUEST_RIGHT:-${RIGHT_GUEST:-0}}"
  # Optional: use desktop key snapping (Super+Left/Right) as a last resort
  USE_KEY_SNAP="${USE_KEY_SNAP:-0}"

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "${script_dir}/.." && pwd)"

detect_url() {
  local url
  if [[ -n "${PDV_URL:-}" ]]; then
    url="$PDV_URL"
  else
    local cfg="${repo_root}/frontend/public/config-domain.json"
    if [[ -f "$cfg" ]]; then
      # naive JSON parse without jq
      local domain
      domain=$(grep -oP '(?<=\"DOMAIN_URL\":\s\")[^\"]+' "$cfg" || true)
      if [[ -n "$domain" ]]; then
        # ensure no trailing slash before appending /login
        domain="${domain%/}"
        url="${domain}/login"
      fi
    fi
  fi
  echo "${url:-http://panificadora.jardim/login}"
}

pick_browser() {
  local candidates=(google-chrome chromium-browser chromium firefox)
  for b in "${candidates[@]}"; do
    if command -v "$b" >/dev/null 2>&1; then
      echo "$b"
      return 0
    fi
  done
  return 1
}

build_args_chrome() {
  local args=()
  # Prefer default browser behavior; only apply explicit requests
  if [[ "${KIOSK:-0}" == "1" ]]; then
    args+=("--kiosk")
  fi
  if [[ "${GUEST:-0}" == "1" ]]; then
    args+=("--guest")
  fi
  # Force UI language to pt-BR
  args+=("--lang=pt-BR")
  # Add any extra flags
  if [[ -n "${EXTRA_ARGS:-}" ]]; then
    # shellcheck disable=SC2206
    extra_arr=( ${EXTRA_ARGS} )
    args+=("${extra_arr[@]}")
  fi
  printf '%s\n' "${args[@]}"
}

build_args_firefox() {
  local args=()
  if [[ "${KIOSK:-0}" == "1" ]]; then
    args+=("--kiosk")
  fi
  if [[ -n "${EXTRA_ARGS:-}" ]]; then
    # shellcheck disable=SC2206
    extra_arr=( ${EXTRA_ARGS} )
    args+=("${extra_arr[@]}")
  fi
  printf '%s\n' "${args[@]}"
}

# Get primary screen resolution WxH
get_screen_geometry() {
  local res
  if command -v xrandr >/dev/null 2>&1; then
    # Active mode is marked with a single '*'
    res=$(xrandr | awk '/\*/{print $1; exit}')
  elif command -v xdpyinfo >/dev/null 2>&1; then
    res=$(xdpyinfo | awk '/dimensions:/ {print $2; exit}')
  fi
  echo "${res:-1920x1080}"
}

# Chrome/Chromium positioning for side-by-side
build_side_args_chrome() {
  local side="$1" width="$2" height="$3" kiosk="$4" guest="$5"
  local x=0
  if [[ "$side" == "right" ]]; then
    x="$((width/2))"
  fi
  local w="$((width/2))"
  local args=("--new-window" "--window-position=${x},0" "--window-size=${w},${height}")
  # Set distinct WM_CLASS to reliably identify windows later (Chrome/Chromium supports --class)
  if [[ "$side" == "left" ]]; then
    args+=("--class=pdv-left")
  else
    args+=("--class=pdv-right")
  fi
  if [[ "$kiosk" == "1" ]]; then
    # kiosk conflicts with sizing; prefer non-kiosk for dual
    :
  fi
  if [[ "$guest" == "1" ]]; then
    args+=("--guest")
  fi
  # Force UI language to pt-BR
  args+=("--lang=pt-BR")
  if [[ -n "${EXTRA_ARGS:-}" ]]; then
    # shellcheck disable=SC2206
    extra_arr=( ${EXTRA_ARGS} )
    args+=("${extra_arr[@]}")
  fi
  printf '%s\n' "${args[@]}"
}

# Firefox lacks reliable CLI positioning; open two new windows
build_side_args_firefox() {
  local kiosk="$1" guest="$2"
  local args=("--new-window")
  if [[ "$kiosk" == "1" ]]; then
    args+=("--kiosk")
  fi
  if [[ -n "${EXTRA_ARGS:-}" ]]; then
    # shellcheck disable=SC2206
    extra_arr=( ${EXTRA_ARGS} )
    args+=("${extra_arr[@]}")
  fi
  printf '%s\n' "${args[@]}"
}

main() {
  # Prevent concurrent launches: acquire a non-blocking lock.
  # This avoids race conditions when multiple services/autostarts trigger simultaneously.
  local lock_file
  lock_file="${XDG_CACHE_HOME:-$HOME/.cache}/pdv-starter.lock"
  mkdir -p "$(dirname "$lock_file")"
  exec 9>"$lock_file"
  if ! flock -n 9; then
    echo "Outro processo de inicialização do PDV está em execução — abortando para evitar janelas duplicadas."
    exit 0
  fi

  local url browser
  url="$(detect_url)"
  if ! browser="$(pick_browser)"; then
    echo "Nenhum navegador encontrado (google-chrome, chromium, firefox)." >&2
    exit 1
  fi

  # Load persisted PDV state (URLs/geometry) if available.
  # This allows restoring the last captured LEFT_URL/RIGHT_URL on startup.
  local pdv_state_file
  pdv_state_file="${PDV_STATE_FILE:-${XDG_CONFIG_HOME:-$HOME/.config}/pdv/pdv-geometry.env}"
  if [[ -f "$pdv_state_file" ]]; then
    # shellcheck disable=SC1090
    source "$pdv_state_file" || true
  fi

  # Prevent duplicate launches: if PDV windows already exist, exit.
  # Detect by profiles created by this script.
  if [[ "${DUAL}" == "1" ]]; then
    local cache_root
    cache_root="${XDG_CACHE_HOME:-$HOME/.cache}"
    local left_chrome_dir="${cache_root}/pdv-left-guest"
    local right_chrome_dir="${cache_root}/pdv-right"
    local left_ff_dir="${cache_root}/pdv-left-firefox"
    local right_ff_dir="${cache_root}/pdv-right-firefox"

    # Try to find existing windows for Chrome/Chromium
    local chrome_left_p chrome_right_p ff_left_p ff_right_p
    chrome_left_p=$(pgrep -f -- "--user-data-dir=${left_chrome_dir}" | head -n1 || true)
    chrome_right_p=$(pgrep -f -- "--user-data-dir=${right_chrome_dir}" | head -n1 || true)
    # Try to find existing windows for Firefox
    ff_left_p=$(pgrep -f -- "-profile ${left_ff_dir}" | head -n1 || true)
    ff_right_p=$(pgrep -f -- "-profile ${right_ff_dir}" | head -n1 || true)

    if { [[ -n "${chrome_left_p}" && -n "${chrome_right_p}" ]]; } || { [[ -n "${ff_left_p}" && -n "${ff_right_p}" ]]; }; then
      echo "PDV já está aberto. Abortando novo lançamento para evitar duplicidade."
      exit 0
    fi
  fi

  # DUAL mode: open two windows (left normal, right configurable)
  if [[ "${DUAL}" == "1" ]]; then
    # Force non-kiosk to allow side-by-side
    local kiosk="0"
    local right_guest="${GUEST_RIGHT}"
    local left_guest="${GUEST_LEFT}"
    # If URLs were captured/persisted, they will be available as LEFT_URL/RIGHT_URL
    local left_url="${LEFT_URL:-$url}"
    local right_url="${RIGHT_URL:-$url}"
    # Persist the URLs being usadas para próximo boot (não altera geometria)
    if [[ -n "${left_url:-}" || -n "${right_url:-}" ]]; then
      local _state_file_dir
      _state_file_dir="$(dirname "$pdv_state_file")"
      mkdir -p "$_state_file_dir"
      # Se existir, remove linhas anteriores de LEFT_URL/RIGHT_URL e regrava
      if [[ -f "$pdv_state_file" ]]; then
        sed -i '/^LEFT_URL=/d' "$pdv_state_file" || true
        sed -i '/^RIGHT_URL=/d' "$pdv_state_file" || true
      fi
      {
        [[ -n "${left_url:-}" ]] && echo "LEFT_URL=${left_url}"
        [[ -n "${right_url:-}" ]] && echo "RIGHT_URL=${right_url}"
      } >> "$pdv_state_file"
    fi
    local geom width height
    geom="$(get_screen_geometry)"
    width="${geom%x*}"
    height="${geom#*x}"

    echo "Abrindo PDV (duplo): left=${left_url} guest=${left_guest}; right=${right_url} guest=${right_guest} (browser: $browser)"

    if [[ "$browser" == "google-chrome" || "$browser" == "chromium" || "$browser" == "chromium-browser" ]]; then
      # Ensure separate instances by using distinct user-data-dir
      local cache_root
      cache_root="${XDG_CACHE_HOME:-$HOME/.cache}"
      local left_dir="${cache_root}/pdv-left-guest"
      local right_dir="${cache_root}/pdv-right"
      mkdir -p "$left_dir" "$right_dir"

      # Launch windows with separate profiles
      # Left
      # shellcheck disable=SC2207
      largs=( $(build_side_args_chrome left "$width" "$height" "$kiosk" "$left_guest") )
      largs+=("--user-data-dir=${left_dir}")
      # Enable DevTools for reliable URL capture
      if [[ "${EXTRA_ARGS:-}" != *"remote-debugging-port"* ]]; then
        largs+=("--remote-debugging-port=9223")
      fi
      setsid "$browser" "${largs[@]}" "$left_url" >/dev/null 2>&1 &
      sleep 1.2
      # Right
      # shellcheck disable=SC2207
      rargs=( $(build_side_args_chrome right "$width" "$height" "$kiosk" "$right_guest") )
      rargs+=("--user-data-dir=${right_dir}")
      if [[ "${EXTRA_ARGS:-}" != *"remote-debugging-port"* ]]; then
        rargs+=("--remote-debugging-port=9224")
      fi
      setsid "$browser" "${rargs[@]}" "$right_url" >/dev/null 2>&1 &

      # Precise tiling using PIDs with wmctrl (preferred) or xdotool
      # Find process IDs by unique user-data-dir flags
      local left_pid right_pid
      local find_timeout=15
      while (( find_timeout > 0 )) && { [[ -z "${left_pid:-}" ]] || [[ -z "${right_pid:-}" ]]; }; do
        left_pid=$(pgrep -f "${browser} .*--user-data-dir=${left_dir}" | head -n1 || true)
        right_pid=$(pgrep -f "${browser} .*--user-data-dir=${right_dir}" | head -n1 || true)
        if [[ -n "$left_pid" && -n "$right_pid" ]]; then
          break
        fi
        sleep 1
        find_timeout=$((find_timeout-1))
      done
      # Give the WM a moment to map the windows fully
      sleep 2

      # Workarea (ignores panels)
      local wx=0 wy=0 ww hh
      if command -v wmctrl >/dev/null 2>&1; then
        local wa
        wa=$(wmctrl -d | awk -F 'WA: ' 'NF>1{print $2; exit}')
        if [[ -n "$wa" ]]; then
          wx=${wa%%,*}
          local rest=${wa#*,}
          wy=${rest%% *}
          local size=${wa##* }
          ww=${size%x*}
          hh=${size#*x}
        fi
      fi
      ww=${ww:-$width}
      hh=${hh:-$height}
      local margin_x=${MARGIN_X:-0}
      local margin_y=${MARGIN_Y:-0}
      wx=$((wx+margin_x))
      wy=$((wy+margin_y))
      local half_left=$(( ww/2 ))
      local half_right=$(( ww - half_left ))

      if command -v wmctrl >/dev/null 2>&1; then
        # Resolve wmctrl window IDs by PID
        local left_wmid right_wmid
        local wmid_timeout=15
        while (( wmid_timeout > 0 )) && { [[ -z "${left_wmid:-}" ]] || [[ -z "${right_wmid:-}" ]]; }; do
          left_wmid=$(wmctrl -lp | awk -v p="$left_pid" 'NF && $3==p {print $1; exit}' || true)
          right_wmid=$(wmctrl -lp | awk -v p="$right_pid" 'NF && $3==p {print $1; exit}' || true)
          if [[ -n "${left_wmid-}" && -n "${right_wmid-}" ]]; then
            break
          fi
          sleep 1
          wmid_timeout=$((wmid_timeout-1))
        done
        # Small delay before applying geometry to ensure the windows are ready
        sleep 1
        # Fallback: identify by WM_CLASS set via --class (pdv-left / pdv-right)
        if [[ -z "${left_wmid-}" ]]; then
          left_wmid=$(wmctrl -lx | awk '$3 ~ /\.pdv-left$/ {print $1; exit}' || true)
        fi
        if [[ -z "${right_wmid-}" ]]; then
          right_wmid=$(wmctrl -lx | awk '$3 ~ /\.pdv-right$/ {print $1; exit}' || true)
        fi
        if [[ -n "${left_wmid-}" ]]; then
          # Ensure window is not shaded or maximized; some WMs roll-up windows to titlebar
          wmctrl -ir "$left_wmid" -b remove,shaded || true
          wmctrl -ir "$left_wmid" -b remove,maximized_vert || true
          wmctrl -ir "$left_wmid" -b remove,maximized_horz || true
          wmctrl -ir "$left_wmid" -b remove,fullscreen || true
          wmctrl -ir "$left_wmid" -e "0,$wx,$wy,$half_left,$hh" || true
        fi
        if [[ -n "${right_wmid-}" ]]; then
          wmctrl -ir "$right_wmid" -b remove,shaded || true
          wmctrl -ir "$right_wmid" -b remove,maximized_vert || true
          wmctrl -ir "$right_wmid" -b remove,maximized_horz || true
          wmctrl -ir "$right_wmid" -b remove,fullscreen || true
          wmctrl -ir "$right_wmid" -e "0,$((wx+half_left)),$wy,$half_right,$hh" || true
        fi
        # Fallback by window name pattern if PID mapping failed
        if [[ -z "${left_wmid-}" || -z "${right_wmid-}" ]]; then
          if command -v xdotool >/dev/null 2>&1; then
            local pattern
            pattern="${WINDOW_NAME_PATTERN:-Panificadora Jardim}"
            local wins
            wins=$(xdotool search --name "$pattern" 2>/dev/null || true)
            if [[ -n "$wins" ]]; then
              local first second
              first=$(echo "$wins" | head -n1)
              second=$(echo "$wins" | tail -n1)
              [[ -n "$first" ]] && xdotool windowsize "$first" "$half_left" "$hh" 2>/dev/null || true
              [[ -n "$first" ]] && xdotool windowmove "$first" "$wx" "$wy" 2>/dev/null || true
              [[ -n "$second" ]] && xdotool windowsize "$second" "$half_right" "$hh" 2>/dev/null || true
              [[ -n "$second" ]] && xdotool windowmove "$second" "$((wx+half_left))" "$wy" 2>/dev/null || true
            fi
          fi
        fi
        # Final enforcement with xdotool if available (handles WMs that ignore wmctrl sizing)
        if command -v xdotool >/dev/null 2>&1; then
          # Resolve windows by class first, then by PID
          local lwin rwin
          lwin=$(xdotool search --class pdv-left 2>/dev/null | tail -n1 || true)
          rwin=$(xdotool search --class pdv-right 2>/dev/null | tail -n1 || true)
          if [[ -z "${lwin:-}" && -n "${left_pid:-}" ]]; then
            lwin=$(xdotool search --pid "$left_pid" 2>/dev/null | tail -n1 || true)
          fi
          if [[ -z "${rwin:-}" && -n "${right_pid:-}" ]]; then
            rwin=$(xdotool search --pid "$right_pid" 2>/dev/null | tail -n1 || true)
          fi
          if [[ -n "${lwin:-}" ]]; then
            # Evitar alterar o foco ao posicionar para não causar minimizações
            xdotool windowsize --sync "$lwin" "$half_left" "$hh" 2>/dev/null || true
            xdotool windowmove "$lwin" "$wx" "$wy" 2>/dev/null || true
          fi
          if [[ -n "${rwin:-}" ]]; then
            xdotool windowsize --sync "$rwin" "$half_right" "$hh" 2>/dev/null || true
            xdotool windowmove "$rwin" "$((wx+half_left))" "$wy" 2>/dev/null || true
          fi
          # As a final fallback, use desktop snap keys if requested
          if [[ "${USE_KEY_SNAP}" == "1" ]]; then
            if [[ -n "${lwin:-}" ]]; then
              xdotool windowactivate "$lwin" 2>/dev/null || true
              xdotool keydown Super_L 2>/dev/null || true; xdotool key Left 2>/dev/null || true; xdotool keyup Super_L 2>/dev/null || true
            fi
            if [[ -n "${rwin:-}" ]]; then
              xdotool windowactivate "$rwin" 2>/dev/null || true
              xdotool keydown Super_L 2>/dev/null || true; xdotool key Right 2>/dev/null || true; xdotool keyup Super_L 2>/dev/null || true
            fi
          fi
        fi
      elif command -v xdotool >/dev/null 2>&1; then
        # Fallback to xdotool if wmctrl unavailable
        local left_win right_win
        local win_timeout=15
        while (( win_timeout > 0 )) && { [[ -z "${left_win:-}" ]] || [[ -z "${right_win:-}" ]]; }; do
          [[ -n "$left_pid" ]] && left_win=$(xdotool search --pid "$left_pid" 2>/dev/null | tail -n1 || true)
          [[ -n "$right_pid" ]] && right_win=$(xdotool search --pid "$right_pid" 2>/dev/null | tail -n1 || true)
          if [[ -n "${left_win-}" && -n "${right_win-}" ]]; then
            break
          fi
          sleep 1
          win_timeout=$((win_timeout-1))
        done
        # Ensure windows are fully mapped before sizing
        sleep 1
        # If PID-based lookup failed, try WM_CLASS-based search (pdv-left/pdv-right)
        if [[ -z "${left_win-}" ]]; then
          left_win=$(xdotool search --class pdv-left 2>/dev/null | tail -n1 || true)
        fi
        if [[ -z "${right_win-}" ]]; then
          right_win=$(xdotool search --class pdv-right 2>/dev/null | tail -n1 || true)
        fi
        if [[ -n "${left_win-}" ]]; then
          xdotool windowsize "$left_win" "$half_left" "$hh" 2>/dev/null || true
          xdotool windowmove "$left_win" "$wx" "$wy" 2>/dev/null || true
        fi
        if [[ -n "${right_win-}" ]]; then
          xdotool windowsize "$right_win" "$half_right" "$hh" 2>/dev/null || true
          xdotool windowmove "$right_win" "$((wx+half_left))" "$wy" 2>/dev/null || true
        fi
        # If PID-based lookup failed, try name pattern
        if [[ -z "${left_win-}" || -z "${right_win-}" ]]; then
          local pattern
          pattern="${WINDOW_NAME_PATTERN:-Panificadora Jardim}"
          local wins
          wins=$(xdotool search --name "$pattern" 2>/dev/null || true)
          if [[ -n "$wins" ]]; then
            local first second
            first=$(echo "$wins" | head -n1)
            second=$(echo "$wins" | tail -n1)
            [[ -n "$first" ]] && xdotool windowsize "$first" "$half_left" "$hh" 2>/dev/null || true
            [[ -n "$first" ]] && xdotool windowmove "$first" "$wx" "$wy" 2>/dev/null || true
            [[ -n "$second" ]] && xdotool windowsize "$second" "$half_right" "$hh" 2>/dev/null || true
            [[ -n "$second" ]] && xdotool windowmove "$second" "$((wx+half_left))" "$wy" 2>/dev/null || true
          fi
        fi
      fi

      disown || true
      # Final reposition helper removed to avoid duplicate tiling calls
      exit 0

    else
      # Firefox fallback: open two windows with distinct profiles for reliable tiling
      local cache_root
      cache_root="${XDG_CACHE_HOME:-$HOME/.cache}"
      local left_dir="${cache_root}/pdv-left-firefox"
      local right_dir="${cache_root}/pdv-right-firefox"
      mkdir -p "$left_dir" "$right_dir"

      # Left
      # shellcheck disable=SC2207
      largs=( $(build_side_args_firefox "$kiosk" "$left_guest") )
      # Force X11 on Wayland for better control
      if [[ "${XDG_SESSION_TYPE:-}" == "wayland" ]]; then
        setsid env MOZ_ENABLE_WAYLAND=0 "$browser" "${largs[@]}" -no-remote -profile "$left_dir" "$left_url" >/dev/null 2>&1 &
      else
        setsid "$browser" "${largs[@]}" -no-remote -profile "$left_dir" "$left_url" >/dev/null 2>&1 &
      fi
      left_pid=$!
      sleep 1
      # Right
      # shellcheck disable=SC2207
      rargs=( $(build_side_args_firefox "$kiosk" "$right_guest") )
      if [[ "${XDG_SESSION_TYPE:-}" == "wayland" ]]; then
        setsid env MOZ_ENABLE_WAYLAND=0 "$browser" "${rargs[@]}" -no-remote -profile "$right_dir" "$right_url" >/dev/null 2>&1 &
      else
        setsid "$browser" "${rargs[@]}" -no-remote -profile "$right_dir" "$right_url" >/dev/null 2>&1 &
      fi
      right_pid=$!

      # If PIDs collapse (rare), resolve via commandline match
      if [[ -z "${left_pid:-}" || -z "${right_pid:-}" || "$left_pid" == "$right_pid" ]]; then
        left_pid=$(pgrep -f "${browser} .* -profile ${left_dir}" | head -n1 || true)
        right_pid=$(pgrep -f "${browser} .* -profile ${right_dir}" | head -n1 || true)
      fi

      # Attempt precise tiling using wmctrl or xdotool (similar to Chrome path)
      local wx=0 wy=0 ww hh
      if command -v wmctrl >/dev/null 2>&1; then
        local wa
        wa=$(wmctrl -d | awk -F 'WA: ' 'NF>1{print $2; exit}')
        if [[ -n "$wa" ]]; then
          wx=${wa%%,*}
          local rest=${wa#*,}
          wy=${rest%% *}
          local size=${wa##* }
          ww=${size%x*}
          hh=${size#*x}
        fi
      fi
      ww=${ww:-$width}
      hh=${hh:-$height}
      local margin_x=${MARGIN_X:-0}
      local margin_y=${MARGIN_Y:-0}
      wx=$((wx+margin_x))
      wy=$((wy+margin_y))
      local half_left=$(( ww/2 ))
      local half_right=$(( ww - half_left ))

      if command -v wmctrl >/dev/null 2>&1; then
        # Resolve wmctrl window IDs by PID
        local left_wmid right_wmid
        local wmid_timeout=15
        while (( wmid_timeout > 0 )) && { [[ -z "${left_wmid:-}" ]] || [[ -z "${right_wmid:-}" ]]; }; do
          left_wmid=$(wmctrl -lp | awk -v p="$left_pid" 'NF && $3==p {print $1; exit}' || true)
          right_wmid=$(wmctrl -lp | awk -v p="$right_pid" 'NF && $3==p {print $1; exit}' || true)
          if [[ -n "${left_wmid-}" && -n "${right_wmid-}" ]]; then
            break
          fi
          sleep 1
          wmid_timeout=$((wmid_timeout-1))
        done
        if [[ -n "${left_wmid-}" ]]; then
          wmctrl -ir "$left_wmid" -e "0,$wx,$wy,$half_left,$hh" || true
        fi
        if [[ -n "${right_wmid-}" ]]; then
          wmctrl -ir "$right_wmid" -e "0,$((wx+half_left)),$wy,$half_right,$hh" || true
        fi
      elif command -v xdotool >/dev/null 2>&1; then
        # Fallback to xdotool if wmctrl unavailable
        local left_win right_win
        local win_timeout=15
        while (( win_timeout > 0 )) && { [[ -z "${left_win:-}" ]] || [[ -z "${right_win:-}" ]]; }; do
          [[ -n "$left_pid" ]] && left_win=$(xdotool search --pid "$left_pid" 2>/dev/null | tail -n1 || true)
          [[ -n "$right_pid" ]] && right_win=$(xdotool search --pid "$right_pid" 2>/dev/null | tail -n1 || true)
          if [[ -n "${left_win-}" && -n "${right_win-}" ]]; then
            break
          fi
          sleep 1
          win_timeout=$((win_timeout-1))
        done
        if [[ -n "${left_win-}" ]]; then
          xdotool windowsize "$left_win" "$half_left" "$hh" 2>/dev/null || true
          xdotool windowmove "$left_win" "$wx" "$wy" 2>/dev/null || true
        fi
        if [[ -n "${right_win-}" ]]; then
          xdotool windowsize "$right_win" "$half_right" "$hh" 2>/dev/null || true
          xdotool windowmove "$right_win" "$((wx+half_left))" "$wy" 2>/dev/null || true
        fi
      fi

      disown || true
      exit 0
    fi
    return
  fi

  echo "Abrindo PDV em: $url (browser: $browser)"

  if [[ "$browser" == "google-chrome" || "$browser" == "chromium" || "$browser" == "chromium-browser" ]]; then
    # shellcheck disable=SC2207
    args=( $(build_args_chrome) )
    # Ensure pt-BR locale in environment
    export LANG=${LANG:-pt_BR.UTF-8}
    export LC_ALL=${LC_ALL:-pt_BR.UTF-8}
    export LANGUAGE=${LANGUAGE:-pt_BR.UTF-8}
    if [[ -n "${PROFILE_DIR:-}" ]]; then
      exec "$browser" --user-data-dir="${PROFILE_DIR}" "${args[@]}" "$url"
    else
      exec "$browser" "${args[@]}" "$url"
    fi
  else
    # Firefox
    # shellcheck disable=SC2207
    args=( $(build_args_firefox) )
    # Ensure pt-BR locale in environment
    export LANG=${LANG:-pt_BR.UTF-8}
    export LC_ALL=${LC_ALL:-pt_BR.UTF-8}
    export LANGUAGE=${LANGUAGE:-pt_BR.UTF-8}
    if [[ -n "${PROFILE_DIR:-}" ]]; then
      exec "$browser" -no-remote -profile "${PROFILE_DIR}" "${args[@]}" "$url"
    else
      exec "$browser" "${args[@]}" "$url"
    fi
  fi
}

main "$@"
