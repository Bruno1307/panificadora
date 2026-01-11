#!/bin/bash
# Backup do banco de dados SQLite antes de rodar o script de correção
# Caminho do banco de dados
DB_PATH="backend/data.db"
BACKUP_PATH="backend/backups/data.db.bak.$(date +%Y%m%d-%H%M%S)"

if [ ! -f "$DB_PATH" ]; then
  echo "Banco de dados não encontrado em $DB_PATH"
  exit 1
fi

cp "$DB_PATH" "$BACKUP_PATH"
echo "Backup criado em $BACKUP_PATH"
