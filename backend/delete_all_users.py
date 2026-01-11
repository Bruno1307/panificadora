# Script para apagar todos os usuários do banco de dados
# Use apenas em ambiente de desenvolvimento!

from app.db import SessionLocal
from app.models import User

if __name__ == "__main__":
    db = SessionLocal()
    deleted = db.query(User).delete()
    db.commit()
    db.close()
    print(f"Todos os usuários foram apagados do banco de dados ({deleted} removidos)")
