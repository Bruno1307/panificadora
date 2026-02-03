#!/bin/bash
# Script para atualizar o sistema do cliente via Git

# 1. Backup do banco de dados
bash /home/bruno/Panificadora\ Jardim/padaria-pdv/scripts_deploy/01_backup_db.sh || exit 1

# 2. Parar serviço
bash /home/bruno/Panificadora\ Jardim/padaria-pdv/scripts_deploy/02_stop_services.sh || exit 1

# 3. Atualizar código via Git
cd /home/bruno/Panificadora\ Jardim/padaria-pdv || exit 1
git pull || exit 1

# 4. Executar migrações
bash /home/bruno/Panificadora\ Jardim/padaria-pdv/scripts_deploy/04_run_migrations.sh || exit 1

# 5. Iniciar serviço
bash /home/bruno/Panificadora\ Jardim/padaria-pdv/scripts_deploy/05_start_services.sh || exit 1

# 6. Checar status
bash /home/bruno/Panificadora\ Jardim/padaria-pdv/scripts_deploy/06_check_status.sh

echo "Atualização via Git concluída!"
