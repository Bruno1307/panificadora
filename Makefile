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

.PHONY: backend-start backend-stop backend-health frontend-install frontend-start frontend-stop status \
	frontend-build-docker frontend-prod-up frontend-release-docker

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

# -----------------------------
# Docker helpers (promover dev -> produção)
# -----------------------------

frontend-build-docker:
	@echo "Building frontend dist inside dev container (5173)"
	@docker compose exec frontend npm run build
	@ls -la $(FRONTEND)/dist || true

frontend-prod-up:
	@echo "Rebuilding and restarting frontend-prod (4173)"
	@cd $(FRONTEND) && docker compose build --no-cache frontend-prod
	@cd $(FRONTEND) && docker compose up -d --force-recreate frontend-prod
	@docker compose ps || true

frontend-release-docker: frontend-build-docker frontend-prod-up
	@echo "Release concluído: acesse http://$$(hostname -I | awk '{print $$1}'):4173/"
