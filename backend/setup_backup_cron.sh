#!/bin/bash
set -euo pipefail
# Script para configurar o backup automático diário às 12h (meio-dia) no crontab do usuário atual
# Detecta o caminho do repositório a partir deste arquivo (está em backend/)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
CRONLINE="0 12 * * * cd $REPO_ROOT && bash backend/backup_db.sh >> backend/backups/backup_cron.log 2>&1"

TMP=$(mktemp)
crontab -l 2>/dev/null | grep -Fv "backend/backup_db.sh" | grep -Fv "$CRONLINE" > "$TMP" || true
echo "$CRONLINE" >> "$TMP"
crontab "$TMP"
rm -f "$TMP"
echo "Backup automático agendado para todo dia às 12h (meio-dia). Caminho: $REPO_ROOT"
