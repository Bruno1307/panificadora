# Script para verificar se o usuário admin existe no banco
from app.db import SessionLocal
from app.models import User

def main():
    db = SessionLocal()
    user = db.query(User).filter_by(username="admin").first()
    if user:
        print(f"Usuário encontrado: {user.username}, id: {user.id}")
    else:
        print("Usuário 'admin' não encontrado.")
    db.close()

if __name__ == "__main__":
    main()
