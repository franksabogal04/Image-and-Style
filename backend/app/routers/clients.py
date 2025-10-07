# app/routers/clients.py
from fastapi import APIRouter, Depends, HTTPException, Response, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from ..database import get_db
from .. import models, schemas, deps

router = APIRouter()

# --- Everyone logged-in can search/list/create/update clients ---

@router.get("/search", response_model=List[schemas.ClientOut])
def search_clients(
    q: Optional[str] = Query(None, description="Search first/last/phone/email"),
    limit: int = Query(25, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user),
):
    query = db.query(models.Client)
    if q:
        like = f"%{q.strip()}%"
        query = query.filter(
            (models.Client.first_name.ilike(like)) |
            (models.Client.last_name.ilike(like))  |
            (models.Client.phone.ilike(like))      |
            (models.Client.email.ilike(like))
        )
    return query.order_by(models.Client.last_name.asc(), models.Client.first_name.asc()).limit(limit).all()

@router.get("/", response_model=List[schemas.ClientOut])
def list_clients(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user),   # <- was Owner/Reception only
):
    return db.query(models.Client)\
             .order_by(models.Client.last_name.asc(), models.Client.first_name.asc())\
             .all()

@router.post("/", response_model=schemas.ClientOut)
def create_client(
    client: schemas.ClientCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user),   # everyone logged-in
):
    db_client = models.Client(**client.model_dump())
    db.add(db_client)
    db.commit()
    db.refresh(db_client)
    return db_client

@router.put("/{client_id}", response_model=schemas.ClientOut)
def update_client(
    client_id: int,
    payload: schemas.ClientUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user),   # <- allow staff too
):
    obj = db.query(models.Client).filter(models.Client.id == client_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Client not found")
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj

# Optional: keep delete restricted (owner-only or owner+receptionist)
OwnerOrReception = deps.require_roles("owner", "receptionist")

@router.delete("/{client_id}", status_code=204)
def delete_client(
    client_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(OwnerOrReception),
):
    obj = db.query(models.Client).filter(models.Client.id == client_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Client not found")
    db.delete(obj)
    db.commit()
    return Response(status_code=204)