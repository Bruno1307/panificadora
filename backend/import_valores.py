# Script para importar produtos do valores.txt para o banco
from app.db import SessionLocal
from app.models import Product
import os

VALORES_PATH = os.path.join(os.path.dirname(__file__), 'valores.txt')

def parse_line(line):
    parts = line.strip().split(',')
    if len(parts) != 2:
        name = ','.join(parts[:-1])
        price = parts[-1]
    else:
        name, price = parts
    return name.strip(), float(price.replace('.', '').replace(',', '.'))

def main():
    db = SessionLocal()
    with open(VALORES_PATH, encoding='utf-8') as f:
        for line in f:
            if not line.strip():
                continue
            name, price = parse_line(line)
            if db.query(Product).filter_by(name=name).first():
                print(f"Produto '{name}' já existe.")
                continue
            prod = Product(name=name, price=price)
            db.add(prod)
            print(f"Produto '{name}' inserido.")
        db.commit()
    db.close()
    print("Importação concluída.")

if __name__ == "__main__":
    main()
