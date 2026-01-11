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

## Como evoluir o banco de dados sem perder dados (usando Alembic)

1. **Crie uma nova migração sempre que mudar models.py**
   ```bash
   cd backend
   source ../.venv/bin/activate
   alembic revision --autogenerate -m "Descreva a mudança"
   ```
2. **Revise o arquivo gerado em `backend/alembic/versions/`**
   - Confirme se as alterações refletem o que você espera.
3. **Aplique a migração ao banco**
   ```bash
   alembic upgrade head
   ```
4. **Nunca apague ou sobrescreva o arquivo `data.db` manualmente.**
   - Use sempre as migrações para alterar o schema.
5. **Faça backup do banco antes de grandes mudanças.**
   ```bash
   cp backend/data.db backend/backups/data.db.bak.$(date +%Y%m%d-%H%M%S)
   ```

Assim, você pode evoluir o sistema sem perder dados importantes.

## Exemplo prático: adicionando uma coluna com Alembic

Suponha que você queira adicionar a coluna `descricao` em `Product`:

1. Edite `backend/app/models.py` e adicione:
   ```python
   class Product(Base):
       # ...existing code...
       descricao: Mapped[str | None] = mapped_column(String(255), nullable=True)
   ```
2. Gere a migração:
   ```bash
   cd backend
   alembic revision --autogenerate -m "Adiciona coluna descricao em Product"
   ```
3. Revise o arquivo gerado em `backend/alembic/versions/` (deve conter algo como `op.add_column('products', sa.Column('descricao', sa.String(length=255), nullable=True))`).
4. Aplique a migração:
   ```bash
   alembic upgrade head
   ```
5. Pronto! A coluna foi adicionada sem perder nenhum dado existente.
