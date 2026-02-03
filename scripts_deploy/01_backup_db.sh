#!/bin/bash
# Script para backup do banco de dados antes da atualização
# Ajuste o caminho do banco conforme necessário

DB_PATH="/home/bruno/Panificadora Jardim/padaria-pdv/backend/data.db"
BACKUP_DIR="/home/bruno/Panificadora Jardim/padaria-pdv/backend/backups"
DATE=$(date +"%Y%m%d-%H%M%S")
BACKUP_FILE="$BACKUP_DIR/data.db.bak.$DATE"

mkdir -p "$BACKUP_DIR"
cp "$DB_PATH" "$BACKUP_FILE"

if [ $? -eq 0 ]; then
  echo "Backup realizado com sucesso: $BACKUP_FILE"
else
  echo "Erro ao realizar backup!"
  exit 1
fi
