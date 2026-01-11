from __future__ import annotations
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from datetime import datetime

class CategoryBase(BaseModel):
    name: str

class CategoryCreate(CategoryBase):
    pass

class Category(CategoryBase):
    id: int
    class Config:
        from_attributes = True

class ProductBase(BaseModel):
    name: str
    price: float = Field(ge=0)
    barcode: Optional[str] = None
    category_id: Optional[int] = None

class ProductCreate(ProductBase):
    pass

class Product(ProductBase):
    id: int
    class Config:
        from_attributes = True

class OrderItemCreate(BaseModel):
    product_id: int
    quantity: int = Field(gt=0)

class OrderItem(BaseModel):
    id: int
    product_id: int
    quantity: int
    unit_price: float
    class Config:
        from_attributes = True

class OrderCreate(BaseModel):
    items: List[OrderItemCreate]
    customer_name: Optional[str] = None
    table_ref: Optional[str] = None
    order_number: Optional[int] = None  # preenchido pelo backend


class Order(BaseModel):
    id: int
    order_number: int
    items: List[OrderItem]
    status: Literal['pending','paid','cancelled','comanda_aberta']
    created_at: Optional[datetime] = None
    customer_name: Optional[str] = None
    table_ref: Optional[str] = None
    paid_at: Optional[datetime] = None
    payment_method: Optional[str] = None
    class Config:
        from_attributes = True


# Schema para pagamento do pedido
class PayOrder(BaseModel):
    method: str
