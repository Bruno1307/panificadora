from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from .auth_utils import SECRET_KEY, ALGORITHM
from sqlalchemy.orm import Session
from .db import get_db
from .models import User, UserRole
from typing import Annotated

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

# Dependência para obter usuário autenticado

def get_current_user(token: Annotated[str, Depends(oauth2_scheme)], db: Session = Depends(get_db)) -> User:
    import logging
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Não autenticado",
        headers={"WWW-Authenticate": "Bearer"},
    )
    logging.warning(f"[AUTH] Token recebido: {token}")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        logging.warning(f"[AUTH] Payload decodificado: {payload}")
        if username is None:
            logging.error("[AUTH] Username não encontrado no payload do token!")
            raise credentials_exception
    except JWTError as e:
        logging.error(f"[AUTH] Erro ao decodificar token JWT: {e}")
        raise credentials_exception
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        logging.error(f"[AUTH] Usuário '{username}' não encontrado no banco de dados!")
        raise credentials_exception
    logging.info(f"[AUTH] Usuário autenticado: {user.username} ({user.role})")
    return user

# Dependência para checar perfil

def require_role(*roles):
    def checker(user: Annotated[User, Depends(get_current_user)]):
        if user.role.value not in roles:
            raise HTTPException(status_code=403, detail="Acesso negado")
        return user
    return checker
