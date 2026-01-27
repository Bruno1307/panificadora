#!/bin/bash
# Script para criar e atualizar o ambiente virtual Python
# Uso: sh setup_env.sh

set -e

# Caminho do ambiente virtual
dir_venv=".venv"

# Cria o ambiente virtual se não existir
if [ ! -d "$dir_venv" ]; then
    echo "Criando ambiente virtual em $dir_venv..."
    python3 -m venv $dir_venv
fi

# Ativa o ambiente virtual
echo "Ativando ambiente virtual..."
source $dir_venv/bin/activate

# Instala as dependências
if [ -f "requirements.txt" ]; then
    echo "Instalando dependências do requirements.txt..."
    pip install --upgrade pip
    pip install -r requirements.txt
else
    echo "Arquivo requirements.txt não encontrado!"
    exit 1
fi

echo "Ambiente virtual pronto e atualizado!"
