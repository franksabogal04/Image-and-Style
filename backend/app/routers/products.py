# app/routers/products.py
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models, schemas, deps

router = APIRouter()
OwnerOnly = deps.require_roles("owner")

@router.post("/", response_model=schemas.ProductOut)
def create_product(
    payload: schemas.ProductCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(OwnerOnly),
):
    existing = db.query(models.Product).filter(models.Product.name == payload.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Product name already exists")
    obj = models.Product(name=payload.name, price=payload.price)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

@router.get("/", response_model=list[schemas.ProductOut])
def list_products(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(OwnerOnly),
):
    return db.query(models.Product).order_by(models.Product.name.asc()).all()

@router.put("/{product_id}", response_model=schemas.ProductOut)
def update_product(
    product_id: int,
    payload: schemas.ProductUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(OwnerOnly),
):
    obj = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Product not found")
    data = payload.model_dump(exclude_unset=True)
    if "name" in data:
        other = db.query(models.Product).filter(models.Product.name == data["name"], models.Product.id != product_id).first()
        if other:
            raise HTTPException(status_code=400, detail="Product name already exists")
    for k, v in data.items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj

@router.delete("/{product_id}", status_code=204)
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(OwnerOnly),
):
    obj = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Product not found")
    db.delete(obj)
    db.commit()
    return Response(status_code=204)