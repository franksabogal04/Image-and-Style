# app/routers/sales.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from ..database import get_db
from .. import models, schemas, deps

router = APIRouter()

@router.post("/", response_model=schemas.SaleOut)
def create_sale(payload: schemas.SaleCreate, db: Session = Depends(get_db), current_user: models.User = Depends(deps.get_current_user)):
    # validate product & staff & optional client
    product = db.query(models.Product).filter(models.Product.id == payload.product_id).first()
    if not product:
        raise HTTPException(status_code=400, detail="Invalid product_id")
    staff = db.query(models.User).filter(models.User.id == payload.staff_id).first()
    if not staff:
        raise HTTPException(status_code=400, detail="Invalid staff_id")
    if payload.client_id is not None:
        client = db.query(models.Client).filter(models.Client.id == payload.client_id).first()
        if not client:
            raise HTTPException(status_code=400, detail="Invalid client_id")

    qty = max(1, payload.quantity or 1)
    total = payload.total_price if payload.total_price is not None else (product.price * qty)
    created_at = payload.created_at or datetime.utcnow()

    sale = models.Sale(
        product_id=product.id,
        staff_id=staff.id,
        client_id=payload.client_id,
        quantity=qty,
        total_price=total,
        created_at=created_at,
    )
    db.add(sale)
    db.commit()
    db.refresh(sale)
    return sale

@router.get("/", response_model=list[schemas.SaleOut])
def list_sales(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user),
):
    return db.query(models.Sale).order_by(models.Sale.created_at.desc()).all()