# Corrige os valores dos produtos no banco (divide por 10)
from app.db import SessionLocal
from app.models import Product

def main():
    db = SessionLocal()
    produtos = db.query(Product).all()
    for p in produtos:
        valor_antigo = p.price
        p.price = float(p.price) / 10
        print(f"Corrigido: {p.name} de R$ {valor_antigo} para R$ {p.price}")
    db.commit()
    db.close()
    print("Correção concluída.")

if __name__ == "__main__":
    main()
