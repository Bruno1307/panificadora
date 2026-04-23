
from app.db import SessionLocal
from app.models import Order, User, Product, OrderItem
from datetime import datetime

def create_order():
    db = SessionLocal()
    user = db.query(User).filter(User.username == "caixa").first()
    if not user:
        print("Usuário 'caixa' não encontrado.")
        db.close()
        return
    product = db.query(Product).first()
    if not product:
        print("Nenhum produto encontrado. Cadastre produtos antes.")
        db.close()
        return
    order = Order(
        order_number=1,
        created_at=datetime.now(),
        status="pending",
        customer_name="Teste",
        table_ref="Mesa 1"
    )
    item = OrderItem(product_id=product.id, quantity=1, unit_price=float(product.price))
    order.items.append(item)
    db.add(order)
    db.commit()
    print(f"Pedido criado com sucesso para o caixa! (id={order.id})")
    db.close()

if __name__ == "__main__":
    create_order()
