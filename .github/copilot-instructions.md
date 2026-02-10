# Copilot Instructions for Padaria PDV

## Overview
This monorepo powers a bakery Point-of-Sale (PDV) system. It uses a FastAPI backend and a React/Vite frontend, with SQLite as the default database (Postgres optional). Docker Compose and Makefile scripts automate builds, tests, and deployment. Nginx is used for reverse proxying in production.

## Architecture
### Backend (`backend/app/`)
- FastAPI app with routers for each domain (`auth`, `products`, `orders`, etc.) in `routers/`
- Models in `models.py`, schemas in `schemas.py`
- Database migrations via Alembic (`alembic/`)
- Data stored in `data.db` (SQLite); Postgres supported via `DB_URL` env var
- Key endpoints: `/orders/`, `/orders/pending`, `/orders/{id}/pay`, `/orders/{id}/cancel`, `/orders/{id}`

### Frontend (`frontend/src/`)
- React app, entry point `App.tsx`
- Communicates with backend via REST (`api.ts`) and WebSocket (`ws.ts`)

### Deployment & Ops
- Docker Compose files for backend, frontend, nginx
- Scripts in `scripts_deploy/` automate update, backup, migration, and service management
- Systemd service example: `padaria-pdv.service`

## Developer Workflows

### Backend Setup
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
make backend-start CASHIER_TOKEN=caixa123
# Docs: http://localhost:8000/docs
```

### Frontend Setup
```bash
make frontend-install
make frontend-start        # dev: http://localhost:5173/
make frontend-preview      # prod preview: http://localhost:4173/
```

### Stopping Servers
```bash
make backend-stop
make frontend-stop
```

### Status & LAN Access
```bash
make status
hostname -I | awk '{print $1}'   # get LAN IP
# Access: http://SEU_IP:5173/ (dev) or :4173 (preview)
```

### Backend Testing
```bash
cd backend && pytest
backend/run_pytest.sh
```

### Database Management
- SQLite file: `backend/data.db`
- Migrations: Alembic (`alembic.ini`, `alembic/versions/`)
- Backup: `backend/backup_db.sh` or manual copy
- Restore: `backend/restore_db.sh`
- For schema changes: use Alembic, never delete `data.db` manually

### Deployment
- Use scripts in `scripts_deploy/` for update, backup, migration, and service control

## Conventions & Patterns

- Each backend domain has its own router in `backend/app/routers/`
- Models and schemas in `backend/app/models.py` and `backend/app/schemas.py`
- Use `.env` or Makefile/script args for environment variables
- For Postgres, set `DB_URL` in environment
- User/password management scripts in `backend/` (e.g., `reset_all_passwords.py`)
- Frontend consumes backend via `frontend/src/api.ts` (REST) and `frontend/src/ws.ts` (WebSocket)
- Database migrations: always use Alembic, never manual deletes

#### Example: Add a New API Route
1. Create a new router in `backend/app/routers/`
2. Register it in `backend/app/main.py`
3. Add models/schemas as needed
4. Update frontend API calls in `frontend/src/api.ts`

## Integration Points

- Nginx config: `nginx.conf`, used with Docker Compose for reverse proxy
- Multiple Docker Compose files for different environments (`docker-compose.yml`, `backend/docker-compose.yml`, etc.)
- Systemd service example: `padaria-pdv.service`

## Key Files & Directories

- `backend/app/main.py`: FastAPI entrypoint
- `backend/app/routers/`: API route modules
- `backend/app/models.py`, `schemas.py`: Data models and schemas
- `frontend/src/`: React app source
- `Makefile`: Common dev commands
- `scripts_deploy/`: Deployment automation scripts
- `backend/requirements.txt`: Python dependencies
- `frontend/package.json`: JS dependencies

---
For questions or unclear conventions, check the relevant README files or ask for clarification.

## Example: Add a New API Route
1. Create a new router in `backend/app/routers/`.
2. Register it in `backend/app/main.py`.
3. Add models/schemas as needed.
4. Update frontend API calls in `frontend/src/api.ts`.

---
For questions or unclear conventions, check the relevant README files or ask for clarification.
