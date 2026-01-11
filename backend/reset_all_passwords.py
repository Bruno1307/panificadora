# Script para redefinir todas as senhas dos usuários para uma senha padrão
# Use apenas em ambiente de desenvolvimento!

from app.db import SessionLocal
from app.models import User
from app.auth_utils import get_password_hash

NOVA_SENHA = "padaria123"  # Altere para a senha desejada (máx 72 caracteres)

if __name__ == "__main__":
    db = SessionLocal()
    users = db.query(User).all()
    for user in users:
        user.password_hash = get_password_hash(NOVA_SENHA)
        print(f"Senha redefinida para usuário: {user.username}")
    db.commit()
    db.close()
    print("Todas as senhas foram redefinidas!")
