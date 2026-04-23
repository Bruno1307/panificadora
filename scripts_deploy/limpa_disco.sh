#!/bin/bash
# Limpa backups antigos e logs para proteger o disco

# Mantém apenas os 7 backups mais recentes
dir_bkp="/home/bruno/panificadora/backend/backups"
ls -1t "$dir_bkp"/data.db.bak.* | tail -n +8 | xargs -r rm -f

# Remove logs antigos
rm -f /home/bruno/panificadora/backend_uvicorn_8080.log
rm -f /home/bruno/panificadora/backend_uvicorn.log
rm -f /home/bruno/panificadora/vite_preview.log

# Opcional: Limpa arquivos temporários
find /home/bruno/panificadora -type f -name '*.tmp' -delete

echo "Limpeza concluída."
