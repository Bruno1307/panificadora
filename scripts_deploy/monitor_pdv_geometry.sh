#!/usr/bin/env bash
set -euo pipefail

# Monitora geometria (posição e tamanho) das janelas PDV por um período.
# Usa classes definidas pelo launcher: pdv-left e pdv-right.
# Parâmetros:
#   DURATION=segundos (padrão 20)
#   INTERVAL=segundos entre amostras (padrão 1)
#   TOL=tolerância em pixels para variação (padrão 8)

DURATION=${DURATION:-20}
INTERVAL=${INTERVAL:-1}
TOL=${TOL:-8}

if ! command -v xdotool >/dev/null 2>&1; then
  echo "xdotool não encontrado. Instale com: sudo apt install xdotool" >&2
  exit 1
fi

resolve_win() {
  local cls="$1"; local pid="$2"; local ids win max_area=0
  ids=$(xdotool search --class "$cls" 2>/dev/null || true)
  for id in $ids; do
    local geom w h area
    geom=$(xdotool getwindowgeometry "$id" 2>/dev/null | awk '/Geometry:/ {print $2}')
    w=${geom%x*}; h=${geom#*x}
    [[ -z "$w" || -z "$h" ]] && continue
    area=$(( w * h ))
    if (( area > max_area )); then
      max_area=$area; win=$id
    fi
  done
  echo "${win:-}"
}

get_geom() {
  local id="$1" pos geom
  pos=$(xdotool getwindowgeometry "$id" 2>/dev/null | awk '/Position:/ {print $2}')
  geom=$(xdotool getwindowgeometry "$id" 2>/dev/null | awk '/Geometry:/ {print $2}')
  echo "$pos $geom"
}

LEFT_WIN=$(resolve_win pdv-left "")
RIGHT_WIN=$(resolve_win pdv-right "")
if [[ -z "${LEFT_WIN:-}" || -z "${RIGHT_WIN:-}" ]]; then
  echo "Não encontrei janelas pdv-left/pdv-right. Abra o PDV e tente novamente." >&2
  exit 1
fi

read -r LPOS LGEOM <<<"$(get_geom "$LEFT_WIN")"
read -r RPOS RGEOM <<<"$(get_geom "$RIGHT_WIN")"
echo "Inicial: LEFT($LPOS $LGEOM) RIGHT($RPOS $RGEOM)"

parse_xy() { echo "$1" | awk -F',' '{print $1" "$2}'; }
parse_wh() { echo "$1" | awk -Fx '{print $1" "$2}'; }

read -r Lx Ly <<<"$(parse_xy "$LPOS")"
read -r Lw Lh <<<"$(parse_wh "$LGEOM")"
read -r Rx Ry <<<"$(parse_xy "$RPOS")"
read -r Rw Rh <<<"$(parse_wh "$RGEOM")"

end_time=$(( $(date +%s) + DURATION ))
changed=0
while (( $(date +%s) < end_time )); do
  sleep "$INTERVAL"
  read -r LPOS2 LGEOM2 <<<"$(get_geom "$LEFT_WIN")"
  read -r RPOS2 RGEOM2 <<<"$(get_geom "$RIGHT_WIN")"
  read -r Lx2 Ly2 <<<"$(parse_xy "$LPOS2")"
  read -r Lw2 Lh2 <<<"$(parse_wh "$LGEOM2")"
  read -r Rx2 Ry2 <<<"$(parse_xy "$RPOS2")"
  read -r Rw2 Rh2 <<<"$(parse_wh "$RGEOM2")"

  dlx=$(( Lx2 - Lx )); dly=$(( Ly2 - Ly )); dlw=$(( Lw2 - Lw )); dlh=$(( Lh2 - Lh ))
  drx=$(( Rx2 - Rx )); dry=$(( Ry2 - Ry )); drw=$(( Rw2 - Rw )); drh=$(( Rh2 - Rh ))

  out="[tick] LEFT pos($Lx2,$Ly2) geom(${Lw2}x${Lh2}) Δpos(${dlx},${dly}) Δgeo(${dlw},${dlh}) | RIGHT pos($Rx2,$Ry2) geom(${Rw2}x${Rh2}) Δpos(${drx},${dry}) Δgeo(${drw},${drh})"
  echo "$out"

  if (( dlx > TOL || dlx < -TOL || dly > TOL || dly < -TOL || dlw > TOL || dlw < -TOL || dlh > TOL || dlh < -TOL \
        || drx > TOL || drx < -TOL || dry > TOL || dry < -TOL || drw > TOL || drw < -TOL || drh > TOL || drh < -TOL )); then
    changed=$((changed+1))
    echo "ALERTA: variação acima da tolerância (TOL=${TOL}) detectada." >&2
  fi
done

if (( changed == 0 )); then
  echo "Estável: nenhuma variação acima de ${TOL}px no período de ${DURATION}s."
else
  echo "Variações detectadas (${changed}) no período. Recomenda-se ajustar TOL/MARGIN_Y ou investigar o WM/painéis."
fi
