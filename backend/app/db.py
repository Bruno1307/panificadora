from __future__ import annotations
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
import os

DB_URL = os.getenv("DB_URL", "sqlite:///./data.db")
connect_args = {"check_same_thread": False} if DB_URL.startswith("sqlite") else {}
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
