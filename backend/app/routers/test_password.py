from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db import get_db
from app.models import User
from app.auth_utils import verify_password
from pydantic import BaseModel

router = APIRouter()

class PasswordTestRequest(BaseModel):
    username: str
    password: str

@router.post("/test_password")
def test_password(data: PasswordTestRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter_by(username=data.username).first()
    if not user:
        return {"ok": False, "reason": "Usuário não encontrado"}
    result = verify_password(data.password, user.password_hash)
    return {"ok": result, "username": data.username, "password": data.password}
