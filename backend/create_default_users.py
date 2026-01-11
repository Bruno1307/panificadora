# Script para criar usuários padrão: admin, caixa e balconista
# Use apenas em ambiente de desenvolvimento!

from app.db import SessionLocal
from app.models import User, UserRole
from app.auth_utils import get_password_hash

USERS = [
    {"username": "admin", "password": "admin123", "role": UserRole.gerente},
    {"username": "caixa", "password": "caixa123", "role": UserRole.caixa},
    {"username": "balconista", "password": "balcao123", "role": UserRole.balconista},
]

if __name__ == "__main__":
    db = SessionLocal()
    for u in USERS:
        if db.query(User).filter_by(username=u["username"]).first():
            print(f"Usuário '{u['username']}' já existe.")
        else:
            user = User(username=u["username"], password_hash=get_password_hash(u["password"]), role=u["role"])
            db.add(user)
            print(f"Usuário '{u['username']}' criado com sucesso!")
    db.commit()
    db.close()
    print("Processo concluído.")
