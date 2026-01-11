#!/bin/bash
# Script para backup automático do banco SQLite

BACKUP_DIR="$(dirname "$0")/backups"
DB_FILE="$(dirname "$0")/data.db"
DATE=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="$BACKUP_DIR/data.db.bak.$DATE"

mkdir -p "$BACKUP_DIR"

# Backup eficiente com integridade
if command -v sqlite3 >/dev/null 2>&1; then
	sqlite3 "$DB_FILE" ".backup '$BACKUP_FILE'"
	echo "Backup realizado com sucesso (sqlite3 .backup): $BACKUP_FILE"
else
	cp "$DB_FILE" "$BACKUP_FILE"
	echo "Backup realizado (cópia simples): $BACKUP_FILE"
fi