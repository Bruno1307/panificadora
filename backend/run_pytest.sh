#!/bin/bash
# Executa pytest usando o Python do ambiente virtual e define PYTHONPATH=backend
DIR="$(dirname \"$0\")"
VENV_PY="$DIR/.venv/bin/python"
if [ ! -x "$VENV_PY" ]; then
  echo "Ambiente virtual não encontrado em $VENV_PY"
  exit 1
fi
PYTHONPATH=backend "$VENV_PY" -m pytest "$@"
