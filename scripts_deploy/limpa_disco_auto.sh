#!/usr/bin/env bash
# Limpeza segura e previsivel para reduzir lentidao por falta de disco.

set -euo pipefail

BASE_DIR="/home/bruno/panificadora"
BACKUP_DIR="$BASE_DIR/backend/backups"
KEEP_BACKUPS="${KEEP_BACKUPS:-14}"
DISK_TRIGGER_PERCENT="${DISK_TRIGGER_PERCENT:-75}"

echo "[limpeza] inicio: $(date '+%Y-%m-%d %H:%M:%S')"

if [[ ! -d "$BASE_DIR" ]]; then
	echo "[limpeza] diretorio base nao encontrado: $BASE_DIR"
	exit 1
fi

# 1) Retencao de backups SQLite (mantem os mais recentes)
if compgen -G "$BACKUP_DIR/data.db.bak.*" >/dev/null 2>&1; then
	ls -1t "$BACKUP_DIR"/data.db.bak.* | tail -n +$((KEEP_BACKUPS + 1)) | xargs -r rm -f
	echo "[limpeza] backups antigos removidos (mantidos: $KEEP_BACKUPS)"
else
	echo "[limpeza] nenhum backup para rotacionar"
fi

# 2) Limpeza de logs locais conhecidos
rm -f "$BASE_DIR/backend_uvicorn_8080.log" "$BASE_DIR/backend_uvicorn.log" "$BASE_DIR/vite_preview.log"

# Limita crescimento do log de cron de backup
if [[ -f "$BACKUP_DIR/backup_cron.log" ]]; then
	log_size_bytes=$(stat -c%s "$BACKUP_DIR/backup_cron.log" 2>/dev/null || echo 0)
	if [[ "$log_size_bytes" -gt 20971520 ]]; then
		tail -n 5000 "$BACKUP_DIR/backup_cron.log" > "$BACKUP_DIR/backup_cron.log.tmp" && mv "$BACKUP_DIR/backup_cron.log.tmp" "$BACKUP_DIR/backup_cron.log"
		echo "[limpeza] backup_cron.log truncado para ultimas 5000 linhas"
	fi
fi

# 3) Remove temporarios somente dentro do projeto
find "$BASE_DIR" -type f -name '*.tmp' -delete

# 4) Limpeza docker segura somente quando o uso de disco estiver alto
if command -v docker >/dev/null 2>&1; then
	disk_used_percent=$(df -P / | awk 'NR==2 {gsub("%","",$5); print $5}')
	if [[ "$disk_used_percent" -ge "$DISK_TRIGGER_PERCENT" ]]; then
		echo "[limpeza] uso de disco em ${disk_used_percent}%, executando prune seguro do Docker"
		docker builder prune -f >/dev/null 2>&1 || true
		docker image prune -f >/dev/null 2>&1 || true
	else
		echo "[limpeza] uso de disco em ${disk_used_percent}%, sem prune Docker"
	fi
fi

echo "[limpeza] fim: $(date '+%Y-%m-%d %H:%M:%S')"
