#!/bin/bash
# Executa pytest usando o Python do ambiente virtual e define PYTHONPATH=backend
set -e

DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$DIR/.." && pwd)"

if [ -x "$ROOT_DIR/.venv/bin/python" ]; then
  VENV_PY="$ROOT_DIR/.venv/bin/python"
elif [ -x "$DIR/.venv/bin/python" ]; then
  VENV_PY="$DIR/.venv/bin/python"
else
  echo "Ambiente virtual não encontrado em $DIR/.venv/bin/python nem $ROOT_DIR/.venv/bin/python"
  exit 1
fi

PYTHONPATH="$DIR" "$VENV_PY" -m pytest "$DIR/tests" "$@"
