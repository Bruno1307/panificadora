#!/bin/bash
# Script para configurar o backup automático diário às 12h (meio-dia) no crontab do usuário atual
CRONLINE="0 12 * * * cd /home/bruno/Panificadora\ Jardim/padaria-pdv && bash backend/backup_db.sh >> backend/backups/backup_cron.log 2>&1"
# Adiciona a linha ao crontab se ainda não existir
(crontab -l 2>/dev/null | grep -Fv "$CRONLINE"; echo "$CRONLINE") | crontab -
echo "Backup automático agendado para todo dia às 12h (meio-dia)."
