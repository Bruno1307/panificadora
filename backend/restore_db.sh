#!/bin/bash
# Script para restaurar o banco de dados SQLite do app com total integridade
# Uso: ./restore_db.sh caminho/do/backup

BACKUP_FILE="$1"
DB_FILE="$(dirname "$0")/data.db"

if [ -z "$BACKUP_FILE" ]; then
  echo "Uso: $0 caminho/do/backup"
  exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Arquivo de backup não encontrado: $BACKUP_FILE"
  exit 2
fi

# Para container Docker
CONTAINER="padaria-backend"

# Para o backend local, descomente a linha abaixo:
# cp "$BACKUP_FILE" "$DB_FILE"

# Para Docker:
echo "Parando o backend..."
docker stop "$CONTAINER"

echo "Restaurando o banco de dados..."
docker cp "$BACKUP_FILE" "$CONTAINER":/app/data.db

echo "Iniciando o backend..."
docker start "$CONTAINER"

echo "Restauração concluída!"
