#!/usr/bin/env bash
set -euo pipefail

# Force PDV windows to tile side-by-side.
# Uses wmctrl to get workarea and xdotool to size/move,
# then optional desktop snap keys as a final fallback.
# Env:
# - MARGIN_X/MARGIN_Y: adjust for top bars/panels
# - USE_KEY_SNAP=0|1: use Super+Left/Right to snap

MARGIN_X=${MARGIN_X:-0}
MARGIN_Y=${MARGIN_Y:-0}
# Disable desktop snap keys by default to avoid visual oscillation
USE_KEY_SNAP=${USE_KEY_SNAP:-0}
# Tolerance (pixels) to consider window already aligned (prevents repeated resizes)
TOL=${TOL:-8}
WINDOW_NAME_PATTERN=${WINDOW_NAME_PATTERN:-Panificadora Jardim}
PDV_GEOMETRY_FILE=${PDV_GEOMETRY_FILE:-${XDG_CONFIG_HOME:-$HOME/.config}/pdv/pdv-geometry.env}

if ! command -v xdotool >/dev/null 2>&1; then
  echo "xdotool not found. Install with: sudo apt install xdotool" >&2
  exit 1
fi

# Workarea
WX=0; WY=0; WW=1920; HH=1080
if command -v wmctrl >/dev/null 2>&1; then
  wa=$(wmctrl -d | awk -F 'WA: ' 'NF>1{print $2; exit}')
  if [[ -n "${wa:-}" ]]; then
    WX=${wa%%,*}
    rest=${wa#*,}
    WY=${rest%% *}
    size=${wa##* }
    WW=${size%x*}
    HH=${size#*x}
  fi
fi
WX=$((WX+MARGIN_X))
WY=$((WY+MARGIN_Y))
HALF_LEFT=$(( WW/2 ))
HALF_RIGHT=$(( WW - HALF_LEFT ))

# Optional: load captured geometry to override defaults
if [[ -f "$PDV_GEOMETRY_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$PDV_GEOMETRY_FILE" || true
fi

# Resolve windows by class or pid
resolve_win() {
  local cls="$1" pid="$2"
  local ids win max_area=0
  # Prefer class-based identification, pick the largest window
  ids=$(xdotool search --class "$cls" 2>/dev/null || true)
  for id in $ids; do
    # Use xdotool to get geometry (Width x Height)
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
  # Fallback: use PID-based windows, pick largest
  if [[ -z "${win:-}" && -n "${pid:-}" ]]; then
    ids=$(xdotool search --pid "$pid" 2>/dev/null || true)
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
  fi
  echo "${win:-}"
}

# Fallback: resolve windows by name pattern (left/right heuristics)
resolve_by_name() {
  local side="$1" pattern="$2"
  local wins best leftmost_x=999999 rightmost_x=-1
  wins=$(xdotool search --name "$pattern" 2>/dev/null || true)
  if [[ -z "$wins" ]]; then
    echo ""
    return 0
  fi
  for id in $wins; do
    local pos x
    pos=$(xdotool getwindowgeometry "$id" 2>/dev/null | awk '/Position:/ {print $2}')
    x=${pos%,*}
    [[ -z "$x" ]] && continue
    if [[ "$side" == "left" ]]; then
      if (( x < leftmost_x )); then
        leftmost_x=$x
        best=$id
      fi
    else
      if (( x > rightmost_x )); then
        rightmost_x=$x
        best=$id
      fi
    fi
  done
  echo "${best:-}"
}

# Convert xdotool decimal window id to hex for wmctrl
to_hex() {
  printf '0x%X' "$1"
}

LPID=$(pgrep -f -- "--user-data-dir=${XDG_CACHE_HOME:-$HOME/.cache}/pdv-left-guest" | head -n1 || true)
RPID=$(pgrep -f -- "--user-data-dir=${XDG_CACHE_HOME:-$HOME/.cache}/pdv-right" | head -n1 || true)
LWIN=$(resolve_win pdv-left "${LPID:-}")
RWIN=$(resolve_win pdv-right "${RPID:-}")
[[ -z "${LWIN:-}" ]] && LWIN=$(resolve_by_name left "$WINDOW_NAME_PATTERN")
[[ -z "${RWIN:-}" ]] && RWIN=$(resolve_by_name right "$WINDOW_NAME_PATTERN")

# Apply move/size attempts with retries
attempts=3
while (( attempts > 0 )); do
  # Desired geometry for left/right (fallbacks if overrides not provided)
  DLEFT_W=${LEFT_W:-$HALF_LEFT}
  DLEFT_H=${LEFT_H:-$HH}
  DLEFT_X=${LEFT_X:-$WX}
  DLEFT_Y=${LEFT_Y:-$WY}
  DRIGHT_W=${RIGHT_W:-$HALF_RIGHT}
  DRIGHT_H=${RIGHT_H:-$HH}
  DRIGHT_X=${RIGHT_X:-$((WX+HALF_LEFT))}
  DRIGHT_Y=${RIGHT_Y:-$WY}

  # Check current geometry to avoid unnecessary resizes
  aligned_left=0
  aligned_right=0
  if [[ -n "${LWIN:-}" ]]; then
    cur_pos=$(xdotool getwindowgeometry "$LWIN" 2>/dev/null | awk '/Position:/ {print $2}')
    cur_geom=$(xdotool getwindowgeometry "$LWIN" 2>/dev/null | awk '/Geometry:/ {print $2}')
    cx=${cur_pos%,*}; cy=${cur_pos#*,}
    cw=${cur_geom%x*}; ch=${cur_geom#*x}
    if [[ -n "$cx" && -n "$cy" && -n "$cw" && -n "$ch" ]]; then
      if (( ${cx:-0} >= DLEFT_X-TOL && ${cx:-0} <= DLEFT_X+TOL \
            && ${cy:-0} >= DLEFT_Y-TOL && ${cy:-0} <= DLEFT_Y+TOL \
            && ${cw:-0} >= DLEFT_W-TOL && ${cw:-0} <= DLEFT_W+TOL \
            && ${ch:-0} >= DLEFT_H-TOL && ${ch:-0} <= DLEFT_H+TOL )); then
        aligned_left=1
      fi
    fi
  fi
  if [[ -n "${RWIN:-}" ]]; then
    cur_pos=$(xdotool getwindowgeometry "$RWIN" 2>/dev/null | awk '/Position:/ {print $2}')
    cur_geom=$(xdotool getwindowgeometry "$RWIN" 2>/dev/null | awk '/Geometry:/ {print $2}')
    cx=${cur_pos%,*}; cy=${cur_pos#*,}
    cw=${cur_geom%x*}; ch=${cur_geom#*x}
    if [[ -n "$cx" && -n "$cy" && -n "$cw" && -n "$ch" ]]; then
      if (( ${cx:-0} >= DRIGHT_X-TOL && ${cx:-0} <= DRIGHT_X+TOL \
            && ${cy:-0} >= DRIGHT_Y-TOL && ${cy:-0} <= DRIGHT_Y+TOL \
            && ${cw:-0} >= DRIGHT_W-TOL && ${cw:-0} <= DRIGHT_W+TOL \
            && ${ch:-0} >= DRIGHT_H-TOL && ${ch:-0} <= DRIGHT_H+TOL )); then
        aligned_right=1
      fi
    fi
  fi
  # If both already aligned, stop early
  if (( aligned_left == 1 && aligned_right == 1 )); then
    break
  fi
  # Ensure windows are not maximized/fullscreen so sizing works
  if command -v wmctrl >/dev/null 2>&1; then
    if [[ -n "${LWIN:-}" ]]; then
      wmctrl -ir "$(to_hex "$LWIN")" -b remove,shaded || true
      wmctrl -ir "$(to_hex "$LWIN")" -b remove,maximized_vert || true
      wmctrl -ir "$(to_hex "$LWIN")" -b remove,maximized_horz || true
      wmctrl -ir "$(to_hex "$LWIN")" -b remove,fullscreen || true
      # Use NW gravity (1) which is more consistent across WMs
      if [[ -n "${LEFT_W:-}" && -n "${LEFT_H:-}" ]]; then
        wmctrl -ir "$(to_hex "$LWIN")" -e "1,${LEFT_X:-$WX},${LEFT_Y:-$WY},$LEFT_W,$LEFT_H" || true
      else
        wmctrl -ir "$(to_hex "$LWIN")" -e "1,$WX,$WY,$HALF_LEFT,$HH" || true
      fi
    fi
    if [[ -n "${RWIN:-}" ]]; then
      wmctrl -ir "$(to_hex "$RWIN")" -b remove,shaded || true
      wmctrl -ir "$(to_hex "$RWIN")" -b remove,maximized_vert || true
      wmctrl -ir "$(to_hex "$RWIN")" -b remove,maximized_horz || true
      wmctrl -ir "$(to_hex "$RWIN")" -b remove,fullscreen || true
      if [[ -n "${RIGHT_W:-}" && -n "${RIGHT_H:-}" ]]; then
        wmctrl -ir "$(to_hex "$RWIN")" -e "1,${RIGHT_X:-$((WX+HALF_LEFT))},${RIGHT_Y:-$WY},$RIGHT_W,$RIGHT_H" || true
      else
        wmctrl -ir "$(to_hex "$RWIN")" -e "1,$((WX+HALF_LEFT)),$WY,$HALF_RIGHT,$HH" || true
      fi
    fi
  fi
  if [[ -n "${LWIN:-}" ]]; then
    # Evitar alterar o foco durante o posicionamento para não causar minimizações inesperadas
    if [[ -n "${LEFT_W:-}" && -n "${LEFT_H:-}" ]]; then
      xdotool windowsize --sync "$LWIN" "$LEFT_W" "$LEFT_H" 2>/dev/null || true
      xdotool windowmove "$LWIN" "${LEFT_X:-$WX}" "${LEFT_Y:-$WY}" 2>/dev/null || true
    else
      xdotool windowsize --sync "$LWIN" "$HALF_LEFT" "$HH" 2>/dev/null || true
      xdotool windowmove "$LWIN" "$WX" "$WY" 2>/dev/null || true
    fi
  fi
  if [[ -n "${RWIN:-}" ]]; then
    if [[ -n "${RIGHT_W:-}" && -n "${RIGHT_H:-}" ]]; then
      xdotool windowsize --sync "$RWIN" "$RIGHT_W" "$RIGHT_H" 2>/dev/null || true
      xdotool windowmove "$RWIN" "${RIGHT_X:-$((WX+HALF_LEFT))}" "${RIGHT_Y:-$WY}" 2>/dev/null || true
    else
      xdotool windowsize --sync "$RWIN" "$HALF_RIGHT" "$HH" 2>/dev/null || true
      xdotool windowmove "$RWIN" $((WX+HALF_LEFT)) "$WY" 2>/dev/null || true
    fi
  fi
  sleep 0.8
  attempts=$((attempts-1))
  # Refresh window ids in case they changed
  LWIN=$(resolve_win pdv-left "${LPID:-}")
  RWIN=$(resolve_win pdv-right "${RPID:-}")
  [[ -z "${LWIN:-}" ]] && LWIN=$(resolve_by_name left "$WINDOW_NAME_PATTERN")
  [[ -z "${RWIN:-}" ]] && RWIN=$(resolve_by_name right "$WINDOW_NAME_PATTERN")
  [[ -z "${LWIN:-}" && -z "${RWIN:-}" ]] && break
done

# Final fallback: desktop snapping keys
if [[ "$USE_KEY_SNAP" == "1" ]]; then
  if [[ -n "${LWIN:-}" ]]; then
    xdotool windowactivate "$LWIN" 2>/dev/null || true
    xdotool keydown Super_L 2>/dev/null || true; xdotool key Left 2>/dev/null || true; xdotool keyup Super_L 2>/dev/null || true
  fi
  if [[ -n "${RWIN:-}" ]]; then
    xdotool windowactivate "$RWIN" 2>/dev/null || true
    xdotool keydown Super_L 2>/dev/null || true; xdotool key Right 2>/dev/null || true; xdotool keyup Super_L 2>/dev/null || true
  fi
fi

# Show final geometry
[[ -n "${LWIN:-}" ]] && xdotool getwindowgeometry "$LWIN" || true
[[ -n "${RWIN:-}" ]] && xdotool getwindowgeometry "$RWIN" || true
