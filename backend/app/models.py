
from __future__ import annotations
from .db import Base
from sqlalchemy import Enum as SqlEnum
import enum


# Perfis de usuário
class UserRole(enum.Enum):
    balconista = "balconista"
    caixa = "caixa"
    gerente = "gerente"

from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Integer, String, ForeignKey, Numeric, DateTime, func

class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(128))
    role: Mapped[UserRole] = mapped_column(SqlEnum(UserRole), default=UserRole.balconista)

class Category(Base):
    __tablename__ = "categories"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), unique=True)
    products: Mapped[list[Product]] = relationship("Product", back_populates="category")

class Product(Base):
    __tablename__ = "products"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(150), index=True)
    price: Mapped[float] = mapped_column(Numeric(10,2))
    barcode: Mapped[str | None] = mapped_column(String(50), unique=True, index=True, nullable=True)
    category_id: Mapped[int | None] = mapped_column(ForeignKey("categories.id"), nullable=True)
    category: Mapped[Category | None] = relationship("Category", back_populates="products")

class Order(Base):
    __tablename__ = "orders"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now())
    status: Mapped[str] = mapped_column(String(20), index=True, default="pending")
    customer_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    table_ref: Mapped[str | None] = mapped_column(String(30), nullable=True)
    paid_at: Mapped[DateTime | None] = mapped_column(DateTime, nullable=True)
    payment_method: Mapped[str | None] = mapped_column(String(30), nullable=True)
    items: Mapped[list[OrderItem]] = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")

class OrderItem(Base):
    __tablename__ = "order_items"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id"))
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"))
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    unit_price: Mapped[float] = mapped_column(Numeric(10,2))

    order: Mapped[Order] = relationship("Order", back_populates="items")
    product: Mapped[Product] = relationship("Product")
