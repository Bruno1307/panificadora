# Padaria PDV – Backend (FastAPI)

## Requisitos
- Python 3.11+

## Instalação e execução
```bash
cd backend
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

- API docs: http://localhost:8000/docs
- Banco padrão: SQLite `data.db` no diretório do backend. Para Postgres, defina `DB_URL` no ambiente (ex.: `postgresql+psycopg2://user:pass@localhost:5432/padaria`).

## Estrutura
- `app/db.py`: engine, sessão e base.
- `app/models.py`: models `Category`, `Product`, `Order`, `OrderItem`.
- `app/schemas.py`: Pydantic schemas.
- `app/routers/`: rotas de `products` e `orders`.
- `app/main.py`: app FastAPI com CORS e `/health`.

## Fluxo de pedidos (mobile + caixa)
- `POST /orders/`: cria pedido com status `pending` (enviado do dispositivo móvel).
- `GET /orders/pending`: lista apenas pedidos pendentes (para o caixa).
- `POST /orders/{id}/pay`: marca o pedido como `paid`.
- `POST /orders/{id}/cancel`: marca o pedido como `cancelled`.
- `PUT /orders/{id}`: substitui os itens de um pedido pendente.

Campos do pedido no retorno: `id`, `status`, `created_at`, `items` (cada item contém `unit_price` capturado no momento da criação).

> Nota sobre migração: adicionamos a coluna `status` em `orders`. Em desenvolvimento com SQLite, se você já tem um `data.db`, a criação automática de tabelas não altera esquemas existentes. Para um reset rápido:
```bash
rm backend/data.db  # cuidado: remove todos os dados
```
Em produção, use Alembic para migrações.
