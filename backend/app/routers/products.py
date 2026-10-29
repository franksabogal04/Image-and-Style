# backend/app/routers/products.py

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Response,
)
from sqlalchemy.orm import Session

from ..database import get_db
from .. import models, schemas, deps


router = APIRouter()

OwnerOnly = deps.require_roles("owner")


@router.get(
    "/",
    response_model=list[schemas.ProductOut],
)
def list_products(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        deps.get_current_user
    ),
):
    """
    All authenticated salon employees can VIEW
    the product catalog.

    Only the owner can modify it.
    """

    return (
        db.query(models.Product)
        .order_by(models.Product.name.asc())
        .all()
    )


@router.post(
    "/",
    response_model=schemas.ProductOut,
)
def create_product(
    payload: schemas.ProductCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        OwnerOnly
    ),
):
    name = payload.name.strip()

    existing = (
        db.query(models.Product)
        .filter(
            models.Product.name == name
        )
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Product name already exists",
        )

    obj = models.Product(
        name=name,
        price=float(payload.price),
        description=(
            payload.description.strip()
            if payload.description
            else None
        ),
        image_url=(
            payload.image_url.strip()
            if payload.image_url
            else None
        ),
        active=payload.active,
        stock_quantity=payload.stock_quantity,
        low_stock_threshold=payload.low_stock_threshold,
        track_inventory=payload.track_inventory,
    )

    db.add(obj)
    db.commit()
    db.refresh(obj)

    return obj


@router.put(
    "/{product_id}",
    response_model=schemas.ProductOut,
)
def update_product(
    product_id: int,
    payload: schemas.ProductUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        OwnerOnly
    ),
):
    obj = (
        db.query(models.Product)
        .filter(
            models.Product.id
            == product_id
        )
        .first()
    )

    if not obj:
        raise HTTPException(
            status_code=404,
            detail="Product not found",
        )

    data = payload.model_dump(
        exclude_unset=True
    )

    if "description" in data:
        data["description"] = (
        data["description"].strip()
        if data["description"]
        else None
    )

    if "image_url" in data:
        data["image_url"] = (
        data["image_url"].strip()
        if data["image_url"]
        else None
    )

    if "name" in data:
        new_name = data["name"].strip()

        other = (
            db.query(models.Product)
            .filter(
                models.Product.name
                == new_name,
                models.Product.id
                != product_id,
            )
            .first()
        )

        if other:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Product name already exists"
                ),
            )

        data["name"] = new_name

    for key, value in data.items():
        setattr(obj, key, value)

    db.commit()
    db.refresh(obj)

    return obj


@router.delete(
    "/{product_id}",
    status_code=204,
)
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        OwnerOnly
    ),
):
    obj = (
        db.query(models.Product)
        .filter(
            models.Product.id
            == product_id
        )
        .first()
    )

    if not obj:
        raise HTTPException(
            status_code=404,
            detail="Product not found",
        )

    db.delete(obj)
    db.commit()

    return Response(status_code=204)