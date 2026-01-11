import sys
import os
import csv
from app.db import get_db
from app.models import Product
from app.db import SessionLocal

def parse_price(price_str):
    # Troca vírgula por ponto e remove espaços
    return float(price_str.replace(',', '.').replace(' ', ''))

def import_products(filename):
    db = SessionLocal()
    with open(filename, encoding='utf-8') as f:
        reader = csv.reader(f)
        for row in reader:
            if len(row) < 2:
                continue
            name = row[0].strip()
            price = parse_price(row[1])
            # Verifica se já existe
            exists = db.query(Product).filter_by(name=name).first()
            if not exists:
                product = Product(name=name, price=price)
                db.add(product)
        db.commit()
    db.close()

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print('Uso: python import_products.py produtos.txt')
        sys.exit(1)
    filename = sys.argv[1]
    if not os.path.exists(filename):
        print(f'Arquivo não encontrado: {filename}')
        sys.exit(1)
    import_products(filename)
    print('Importação concluída.')
