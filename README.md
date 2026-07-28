# Panificadora Jardim PDV
## Produto comercializável
Este projeto já ganhou uma camada de apresentação comercial para ser mostrado a clientes potenciais:
- landing page pública em /produto
- páginas de privacidade e termos em /privacidade e /termos
- documentação básica para venda e implantação
- licença aberta para facilitar a distribuição

Arquivos relevantes:
- docs/PRIVACY_POLICY.md
- docs/TERMOS_DE_USO.md
- LICENSE
## Como rodar o sistema

### Backend (API)
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
make backend-start CASHIER_TOKEN=caixa123
# Docs: http://localhost:8000/docs
```

### Frontend (dev)
```bash
make frontend-install
make frontend-start
# App: http://localhost:5173/
```

### Frontend (preview produção)
```bash
make frontend-install
cd frontend && npm run build
make frontend-preview
# App: http://localhost:4173/
```

### Parar servidores
```bash
make backend-stop
make frontend-stop
```

### Status rápido
```bash
make status
```

### Acesso LAN
 Use o IP da sua máquina na rede: http://10.90.115.251:5173/ (ou :4173 no preview)
```bash
hostname -I | awk '{print $1}'
```

### Manutencao automatica (recomendado para cliente)
Este projeto possui rotina de limpeza segura para evitar crescimento de disco e lentidao por falta de espaco.

- Script: `scripts_deploy/limpa_disco_auto.sh`
- Agenda padrao: limpeza diaria as 03:15
- Backup diario: 12:00 (mantido via `backend/backup_db.sh`)

Para aplicar a agenda de limpeza em uma nova instalacao:
```bash
(crontab -l 2>/dev/null; cat scripts_deploy/limpa_disco_auto.cron) | crontab -
```

Para executar limpeza manual:
```bash
bash scripts_deploy/limpa_disco_auto.sh
```

## Replicar em outra máquina

1. Clone o repositório:
```bash
git clone <seu-repositorio> panificadora
cd panificadora
```
2. Execute o script de setup:
```bash
sh setup.sh
```
3. Inicie o backend:
```bash
make backend-start CASHIER_TOKEN=caixa123
```
4. Inicie o frontend:
```bash
make frontend-start
```

Observações:
- O ambiente virtual (`.venv`) e o banco de dados local (`backend/data.db`) não fazem parte do Git.
- Para um novo banco de dados vazio, basta iniciar o backend e o arquivo `backend/data.db` será criado automaticamente.
- Caso queira usar PostgreSQL, defina `DB_URL` no ambiente antes de iniciar o backend.

---

- PIX CNPJ: 61.629.638/0001-80
- Para dúvidas, consulte o código ou peça ajuda!
