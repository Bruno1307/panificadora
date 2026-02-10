#!/usr/bin/env bash
set -euo pipefail

# Capture current PDV window positions/sizes and save to a config file.
# Output file (env format) defaults to ${XDG_CONFIG_HOME:-$HOME/.config}/pdv/pdv-geometry.env
# Variables saved: LEFT_X LEFT_Y LEFT_W LEFT_H RIGHT_X RIGHT_Y RIGHT_W RIGHT_H
# Additionally saves LEFT_URL and RIGHT_URL when possible.

CONFIG_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/pdv"
CONFIG_FILE="${PDV_GEOMETRY_FILE:-$CONFIG_DIR/pdv-geometry.env}"
WINDOW_NAME_PATTERN="${WINDOW_NAME_PATTERN:-Panificadora Jardim}"

mkdir -p "$CONFIG_DIR"

resolve_win_by_class() {
  local cls="$1" pid="$2"
  local ids win max_area=0
  ids=$(xdotool search --class "$cls" 2>/dev/null || true)
  for id in $ids; do
    local geom w h area
    geom=$(xdotool getwindowgeometry "$id" 2>/dev/null | awk '/Geometry:/ {print $2}')
    w=${geom%x*}
    h=${geom#*x}
    [[ -z "$w" || -z "$h" ]] && continue
    area=$(( w * h ))
    if (( area > max_area )); then
      max_area=$area
      win=$id
    fi
  done
  echo "${win:-}"
}

resolve_left_right_by_name() {
  local pattern="$1"
  local wins left right leftmost_x=999999 rightmost_x=-1
  wins=$(xdotool search --name "$pattern" 2>/dev/null || true)
  for id in $wins; do
    local pos x
    pos=$(xdotool getwindowgeometry "$id" 2>/dev/null | awk '/Position:/ {print $2}')
    x=${pos%,*}
    [[ -z "$x" ]] && continue
    if (( x < leftmost_x )); then
      leftmost_x=$x
      left=$id
    fi
    if (( x > rightmost_x )); then
      rightmost_x=$x
      right=$id
    fi
  done
  echo "${left:-}" "${right:-}"
}

cache_root="${XDG_CACHE_HOME:-$HOME/.cache}"
left_pid=$(pgrep -f -- "--user-data-dir=${cache_root}/pdv-left-guest" | head -n1 || true)
right_pid=$(pgrep -f -- "--user-data-dir=${cache_root}/pdv-right" | head -n1 || true)

left_win=$(resolve_win_by_class pdv-left "${left_pid:-}")
right_win=$(resolve_win_by_class pdv-right "${right_pid:-}")

# Fallback: resolve windows by name pattern if classes not found
if [[ -z "${left_win:-}" || -z "${right_win:-}" ]]; then
  read -r left_win right_win <<<"$(resolve_left_right_by_name "$WINDOW_NAME_PATTERN")"
fi

if [[ -z "${left_win:-}" || -z "${right_win:-}" ]]; then
  echo "Não foi possível localizar janelas do PDV. Abra o PDV (duas janelas lado a lado) e tente novamente." >&2
  exit 1
fi

read_pos_geom() {
  local id="$1"; local pos geom x y w h
  pos=$(xdotool getwindowgeometry "$id" | awk '/Position:/ {print $2}')
  geom=$(xdotool getwindowgeometry "$id" | awk '/Geometry:/ {print $2}')
  x=${pos%,*}
  y=${pos#*,}
  w=${geom%x*}
  h=${geom#*x}
  echo "$x" "$y" "$w" "$h"
}

read -r LX LY LW LH < <(read_pos_geom "$left_win")
read -r RX RY RW RH < <(read_pos_geom "$right_win")

# Try to capture current URLs from running processes.
# 1) Prefer Chrome/Chromium processes identified by --user-data-dir
# 2) Fallback: Firefox profiles
# 3) Final fallback: get PID from window (_NET_WM_PID) then extract args
extract_url_from_pid() {
  local pid="$1"
  [[ -z "${pid:-}" ]] && return 1
  local args url
  args=$(ps -p "$pid" -o args= 2>/dev/null || true)
  url=$(echo "$args" | grep -oE "https?://[^[:space:]\"']+" | tail -n1 || true)
  if [[ -n "$url" ]]; then
    echo "$url"
    return 0
  fi
  return 1
}

get_pid_from_window() {
  local win_id="$1"
  local pid
  pid=$(xprop -id "$win_id" _NET_WM_PID 2>/dev/null | awk -F' = ' '{print $2}' || true)
  echo "${pid:-}"
}

LEFT_URL_CAPTURE=""
RIGHT_URL_CAPTURE=""

# Primary attempt: Chrome/Chromium processes
if [[ -n "${left_pid:-}" ]]; then
  LEFT_URL_CAPTURE=$(extract_url_from_pid "$left_pid" || true)
fi
if [[ -n "${right_pid:-}" ]]; then
  RIGHT_URL_CAPTURE=$(extract_url_from_pid "$right_pid" || true)
fi

# Fallback: Firefox profile processes
if [[ -z "$LEFT_URL_CAPTURE" || -z "$RIGHT_URL_CAPTURE" ]]; then
  left_ff_dir="${cache_root}/pdv-left-firefox"
  right_ff_dir="${cache_root}/pdv-right-firefox"
  ff_left_pid=$(pgrep -f -- "-profile ${left_ff_dir}" | head -n1 || true)
  ff_right_pid=$(pgrep -f -- "-profile ${right_ff_dir}" | head -n1 || true)
  if [[ -z "$LEFT_URL_CAPTURE" && -n "${ff_left_pid:-}" ]]; then
    LEFT_URL_CAPTURE=$(extract_url_from_pid "$ff_left_pid" || true)
  fi
  if [[ -z "$RIGHT_URL_CAPTURE" && -n "${ff_right_pid:-}" ]]; then
    RIGHT_URL_CAPTURE=$(extract_url_from_pid "$ff_right_pid" || true)
  fi
fi

# Final fallback: derive PID from window and parse args
if [[ -z "$LEFT_URL_CAPTURE" ]]; then
  lpid_fallback=$(get_pid_from_window "$left_win")
  [[ -n "${lpid_fallback:-}" ]] && LEFT_URL_CAPTURE=$(extract_url_from_pid "$lpid_fallback" || true)
fi
if [[ -z "$RIGHT_URL_CAPTURE" ]]; then
  rpid_fallback=$(get_pid_from_window "$right_win")
  [[ -n "${rpid_fallback:-}" ]] && RIGHT_URL_CAPTURE=$(extract_url_from_pid "$rpid_fallback" || true)
fi

# DevTools capture: if still empty, try reading from local DevTools endpoints
extract_url_via_devtools() {
  local port="$1"
  command -v curl >/dev/null 2>&1 || return 1
  local json url
  json=$(curl -s "http://127.0.0.1:${port}/json" 2>/dev/null || true)
  url=$(echo "$json" | grep -oE '"url":"https?://[^"}]+' | sed 's/"url":"//' | head -n1 || true)
  if [[ -n "$url" ]]; then
    echo "$url"
    return 0
  fi
  return 1
}

if [[ -z "$LEFT_URL_CAPTURE" ]]; then
  LEFT_URL_CAPTURE=$(extract_url_via_devtools 9223 || true)
fi
if [[ -z "$RIGHT_URL_CAPTURE" ]]; then
  RIGHT_URL_CAPTURE=$(extract_url_via_devtools 9224 || true)
fi

cat > "$CONFIG_FILE" <<EOF
# PDV window geometry (captured)
# Saved at: $(date +"%Y-%m-%d %H:%M:%S")
LEFT_URL=${LEFT_URL_CAPTURE}
RIGHT_URL=${RIGHT_URL_CAPTURE}
LEFT_X=$LX
LEFT_Y=$LY
LEFT_W=$LW
LEFT_H=$LH
RIGHT_X=$RX
RIGHT_Y=$RY
RIGHT_W=$RW
RIGHT_H=$RH
EOF

echo "Geometria salva em: $CONFIG_FILE"
cat "$CONFIG_FILE"
