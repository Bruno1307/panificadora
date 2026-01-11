# Script para criar um usuário administrador
# Use apenas em ambiente de desenvolvimento!

from app.db import SessionLocal
from app.models import User, UserRole
from app.auth_utils import get_password_hash

USERNAME = "admin"
PASSWORD = "admin123"  # Altere para uma senha forte (máx 72 caracteres)
ROLE = UserRole.gerente

if __name__ == "__main__":
    db = SessionLocal()
    if db.query(User).filter_by(username=USERNAME).first():
        print(f"Usuário '{USERNAME}' já existe.")
    else:
        user = User(username=USERNAME, password_hash=get_password_hash(PASSWORD), role=ROLE)
        db.add(user)
        db.commit()
        print(f"Usuário administrador '{USERNAME}' criado com sucesso!")
    db.close()
