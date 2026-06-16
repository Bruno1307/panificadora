#!/usr/bin/env bash
set -e

# Script de setup para replicar o projeto em outra máquina.
# Uso: sh setup.sh

if [ ! -x "$(command -v python3)" ]; then
  echo "Python 3 não encontrado. Instale Python 3 antes de continuar."
  exit 1
fi

if [ ! -x "$(command -v npm)" ]; then
  echo "npm não encontrado. Instale Node.js e npm antes de continuar."
  exit 1
fi

if [ ! -d ".venv" ]; then
  python3 -m venv .venv
fi

source .venv/bin/activate
pip install --upgrade pip
pip install -r backend/requirements.txt

cd frontend
npm install
cd ..

echo "Setup concluído."
echo "Para iniciar backend: make backend-start CASHIER_TOKEN=caixa123"
echo "Para iniciar frontend: make frontend-start"
