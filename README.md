# Panificadora Jardim PDV

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
- Use o IP da sua máquina na rede: http://SEU_IP:5173/ (ou :4173 no preview)
- Descubra seu IP:
```bash
hostname -I | awk '{print $1}'
```

---

- PIX CNPJ: 61.629.638/0001-80
- Para dúvidas, consulte o código ou peça ajuda!
