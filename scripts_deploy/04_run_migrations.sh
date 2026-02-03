#!/bin/bash
# Script para executar migrações do banco de dados
# Ajuste o comando conforme sua ferramenta de migração

cd /home/bruno/Panificadora\ Jardim/padaria-pdv/backend
alembic upgrade head

if [ $? -eq 0 ]; then
  echo "Migrações executadas com sucesso."
else
  echo "Erro ao executar migrações!"
  exit 1
fi
