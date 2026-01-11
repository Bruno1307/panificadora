from app.db import SessionLocal
from app.models import User
from app.auth_utils import verify_password

def test_balconista_password():
    db = SessionLocal()
    user = db.query(User).filter(User.username == "balconista").first()
    if not user:
        print("Usuário 'balconista' não encontrado.")
        return
    result = verify_password("padaria123", user.password_hash)
    print(f"Senha confere: {result}")
    db.close()

test_balconista_password()
