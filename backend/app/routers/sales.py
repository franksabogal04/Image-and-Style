# app/routers/sales.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import and_
from datetime import datetime
from typing import Optional  # <-- added
from ..database import get_db
from .. import models, schemas, deps

router = APIRouter()

# -------- Helpers (match appointments logic) --------
def _pick_active_tax_rule(db: Session, when: Optional[datetime] = None) -> Optional[models.TaxRule]:
    """
    Choose the active TaxRule for the given time.
    Prefers the most recent effective_from that is <= when (and <= effective_to if set).
    """
    when = when or datetime.utcnow()
    q = (
        db.query(models.TaxRule)
        .filter(models.TaxRule.active == True)
        .filter(
            and_(
                (models.TaxRule.effective_from == None) | (models.TaxRule.effective_from <= when),
                (models.TaxRule.effective_to == None) | (models.TaxRule.effective_to >= when),
            )
        )
        .order_by(models.TaxRule.effective_from.desc().nullslast())
    )
    return q.first()

def _apply_tax_snapshot_to_sale(sale: models.Sale, rule: Optional[models.TaxRule]):
    """
    Mutates `sale` in-place with retail tax snapshot fields.
    """
    total = float(sale.total_price or 0.0)
    if not rule:
        sale.tax_rule_id = None
        sale.retail_tax_rate = None
        sale.retail_tax_amount = None
        sale.total_with_tax = total if total else None
        return

    sale.tax_rule_id = rule.id
    rate = float(rule.retail_rate or 0.0)
    sale.retail_tax_rate = rate
    tax = round(total * rate, 2)
    sale.retail_tax_amount = tax
    sale.total_with_tax = round(total + tax, 2)

@router.post("/", response_model=schemas.SaleOut)
def create_sale(
    payload: schemas.SaleCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user),
):
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

    if product.track_inventory:
        current_stock = int(product.stock_quantity or 0)

        if current_stock < qty:
            raise HTTPException(
                status_code=409,
                detail=(
                    f"Not enough stock for {product.name}. "
                    f"Available: {current_stock}"
                ),
            )

        product.stock_quantity = current_stock - qty

    unit_price = float(product.price or 0.0)
    total = (
        float(payload.total_price)
        if payload.total_price is not None
        else unit_price * qty
    )
    created_at = payload.created_at or datetime.utcnow()

    sale = models.Sale(
        product_id=product.id,
        staff_id=staff.id,
        client_id=payload.client_id,
        quantity=qty,
        total_price=total,
        created_at=created_at,
    )

    # Snapshot retail tax: pick active rule at sale time
    rule = _pick_active_tax_rule(db, created_at)
    _apply_tax_snapshot_to_sale(sale, rule)

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
