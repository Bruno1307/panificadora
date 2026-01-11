from app.db import SessionLocal
from app.models import Order, User
from datetime import datetime

def create_order():
    db = SessionLocal()
    # Busca o usuário caixa
    user = db.query(User).filter(User.username == "caixa").first()
    if not user:
        print("Usuário 'caixa' não encontrado.")
        db.close()
        return
    # Cria pedido simples
    order = Order(
        created_at=datetime.now(),
        user_id=user.id,
        status="aberto"
    )
    db.add(order)
    db.commit()
    print(f"Pedido criado com sucesso para o caixa! (id={order.id})")
    db.close()

if __name__ == "__main__":
    create_order()
