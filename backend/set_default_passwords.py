from app.db import SessionLocal
from app.models import User
from app.auth_utils import get_password_hash

DEFAULT_PASSWORDS = {
    "admin": "admin123",
    "caixa": "caixa123",
    "balconista": "balcao123",
}

def run():
    db = SessionLocal()
    try:
        users = db.query(User).filter(User.username.in_(DEFAULT_PASSWORDS.keys())).all()
        for user in users:
            new_pw = DEFAULT_PASSWORDS.get(user.username)
            if not new_pw:
                continue
            user.password_hash = get_password_hash(new_pw)
            print(f"Senha redefinida para usuário: {user.username}")
        db.commit()
    finally:
        db.close()

if __name__ == "__main__":
    run()
