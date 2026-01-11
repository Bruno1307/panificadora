from app.db import SessionLocal
from app.models import User
from app.auth_utils import get_password_hash

def reset_password(username: str, new_password: str):
    db = SessionLocal()
    user = db.query(User).filter(User.username == username).first()
    if not user:
        print(f"Usuário '{username}' não encontrado.")
        return
    user.password_hash = get_password_hash(new_password)
    db.commit()
    print(f"Senha do usuário '{username}' redefinida com sucesso!")
    db.close()

if __name__ == "__main__":
    reset_password("caixa", "1234")
