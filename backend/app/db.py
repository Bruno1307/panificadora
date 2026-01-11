from __future__ import annotations
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
import os

project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
db_path = os.path.join(project_root, 'data.db')
DB_URL = os.getenv("DB_URL", f"sqlite:///{db_path}")
connect_args = {"check_same_thread": False} if DB_URL.startswith("sqlite") else {}
print('>>> CRIANDO TABELAS NO BANCO DE DADOS <<<', db_path)
engine = create_engine(DB_URL, echo=False, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class Base(DeclarativeBase):
    pass

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
