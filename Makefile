# Simple dev Makefile for Panificadora Jardim PDV
# Usage examples:
#   make backend-start CASHIER_TOKEN=caixa123
#   make backend-stop
#   make backend-health
#   make frontend-install && make frontend-start
#   make frontend-stop

UVICORN := .venv/bin/uvicorn
BACKEND := backend
FRONTEND := frontend
HOST := 0.0.0.0
PORT := 8000
CASHIER_TOKEN ?= caixa123

.PHONY: backend-start backend-stop backend-health frontend-install frontend-start frontend-stop status

backend-start:
	@pkill -f "uvicorn app.main:app" || true
	@echo "Starting backend on $(HOST):$(PORT) with token: $${CASHIER_TOKEN}"
	@CASHIER_TOKEN=$(CASHIER_TOKEN) nohup $(UVICORN) app.main:app --app-dir $(BACKEND) --host $(HOST) --port $(PORT) > backend_uvicorn.log 2>&1 &
	@sleep 1
	@$(MAKE) backend-health

backend-stop:
	@pkill -f "uvicorn app.main:app" || true
	@echo "Backend stopped"

backend-health:
	@curl -sS http://localhost:$(PORT)/health || true

frontend-install:
	@cd $(FRONTEND) && npm install


frontend-start:
	@echo "Starting frontend (Vite) on port 5173 (LAN access)"
	@cd $(FRONTEND) && nohup npm run dev:5173 > ../vite_dev.log 2>&1 &
	@sleep 2
	@tail -n 50 vite_dev.log || true

frontend-preview:
	@echo "Starting frontend preview (build) on port 4173 (LAN access)"
	@cd $(FRONTEND) && nohup npm run preview > ../vite_preview.log 2>&1 &
	@sleep 2
	@tail -n 50 vite_preview.log || true

frontend-stop:
	@pkill -f "vite --host" || pkill -f "vite" || true
	@echo "Frontend stopped"

status:
	@echo "Backend health:" && curl -sS http://localhost:$(PORT)/health || true
	@echo "Vite URLs:" && tail -n 50 vite_dev.log || true
