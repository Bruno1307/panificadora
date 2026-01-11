# Script para criar usuários iniciais no banco
from app.models import User, UserRole
from app.db import SessionLocal
from app.auth_utils import get_password_hash

# Edite aqui os usuários que deseja criar
usuarios = [
    {"username": "balcao", "password": "balcao123", "role": UserRole.balconista},
    {"username": "caixa", "password": "caixa123", "role": UserRole.caixa},
    {"username": "gerente", "password": "gerente123", "role": UserRole.gerente},
]

db = SessionLocal()
for u in usuarios:
    if db.query(User).filter_by(username=u["username"]).first():
        print(f"Usuário {u['username']} já existe.")
        continue
    print("Criando usuário:", u["username"], "Senha:", repr(u["password"]), "Tipo:", type(u["password"]))
    user = User(
        username=u["username"],
        password_hash=get_password_hash(str(u["password"])),
        role=u["role"]
    )
    db.add(user)
    print(f"Usuário {u['username']} criado com sucesso!")
db.commit()
db.close()
print("Finalizado.")
