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
    payment_override_reason: Optional[str] = None
    payment_override_by: Optional[str] = None
    payment_override_diff: Optional[float] = None
    payment_override_at: Optional[datetime] = None
    payments: Optional[List[OrderPayment]] = None
    class Config:
        from_attributes = True


class PaymentPart(BaseModel):
    method: str
    amount: float = Field(ge=0)

class OrderPayment(PaymentPart):
    id: int
    created_at: Optional[datetime] = None
    class Config:
        from_attributes = True

# Schema para pagamento do pedido: permite único método ou lista de partes
class PayOrder(BaseModel):
    method: Optional[str] = None
    payments: Optional[List[PaymentPart]] = None
    override_reason: Optional[str] = Field(default=None, max_length=255)


class ReconciliationDivergence(BaseModel):
    order_id: int
    order_number: Optional[int] = None
    paid_at: Optional[datetime] = None
    total_items: float
    total_payments: float
    diff: float
    payment_methods: List[str] = []
    override_reason: Optional[str] = None
    override_by: Optional[str] = None


class ReconciliationSummary(BaseModel):
    start: datetime
    end: datetime
    paid_orders: int
    orders_with_divergence: int
    total_items: float
    total_payments: float
    total_difference: float
    divergences: List[ReconciliationDivergence]
