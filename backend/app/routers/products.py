from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_
from ..db import get_db
from .. import models, schemas

router = APIRouter(prefix="/products", tags=["products"])

@router.get("/", response_model=list[schemas.Product])
def list_products(
    db: Session = Depends(get_db),
    q: str | None = None,
    barcode: str | None = None,
):
    query = db.query(models.Product)
    if barcode:
        query = query.filter(models.Product.barcode == barcode)
    if q:
        like = f"%{q}%"
        query = query.filter(
            or_(models.Product.name.ilike(like), models.Product.barcode.ilike(like))
        )
    return query.all()

@router.get("/by-barcode/{barcode}", response_model=schemas.Product)
def get_by_barcode(barcode: str, db: Session = Depends(get_db)):
    prod = db.query(models.Product).filter(models.Product.barcode == barcode).first()
    if not prod:
        raise HTTPException(status_code=404, detail="Product not found")
    return prod

@router.post("/", response_model=schemas.Product, status_code=201)
def create_product(data: schemas.ProductCreate, db: Session = Depends(get_db)):
    # optional uniqueness check for barcode
    if data.barcode:
        existing = db.query(models.Product).filter(models.Product.barcode == data.barcode).first()
        if existing:
            raise HTTPException(status_code=400, detail="Barcode already in use")
    prod = models.Product(name=data.name, price=data.price, barcode=data.barcode, category_id=data.category_id)
    db.add(prod)
    db.commit()
    db.refresh(prod)
    return prod

@router.get("/{product_id}", response_model=schemas.Product)
def get_product(product_id: int, db: Session = Depends(get_db)):
    prod = db.query(models.Product).get(product_id)
    if not prod:
        raise HTTPException(status_code=404, detail="Product not found")
    return prod

@router.put("/{product_id}", response_model=schemas.Product)
def update_product(product_id: int, data: schemas.ProductCreate, db: Session = Depends(get_db)):
    prod = db.query(models.Product).get(product_id)
    if not prod:
        raise HTTPException(status_code=404, detail="Product not found")
    if data.barcode and data.barcode != prod.barcode:
        existing = db.query(models.Product).filter(models.Product.barcode == data.barcode).first()
        if existing:
            raise HTTPException(status_code=400, detail="Barcode already in use")
    prod.name = data.name
    prod.price = data.price
    prod.barcode = data.barcode
    prod.category_id = data.category_id
    db.commit()
    db.refresh(prod)
    return prod

@router.delete("/{product_id}", status_code=204)
def delete_product(product_id: int, db: Session = Depends(get_db)):
    prod = db.query(models.Product).get(product_id)
    if not prod:
        raise HTTPException(status_code=404, detail="Product not found")
    db.delete(prod)
    db.commit()
    return None
