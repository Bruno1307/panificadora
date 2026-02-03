#!/bin/bash
# Script para atualizar arquivos do backend e frontend
# Ajuste os caminhos de origem e destino conforme necessário

# Exemplo usando rsync para backend
rsync -av --delete /caminho/novo_backend/ /home/bruno/Panificadora\ Jardim/padaria-pdv/backend/

# Exemplo usando rsync para frontend
rsync -av --delete /caminho/novo_frontend/ /home/bruno/Panificadora\ Jardim/padaria-pdv/frontend/

echo "Arquivos do backend e frontend atualizados."
