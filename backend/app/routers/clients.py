# app/routers/clients.py

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Response,
    Query,
)

from sqlalchemy.orm import Session

from typing import (
    List,
    Optional,
)

import os
import html
import resend

from ..database import get_db
from .. import models, schemas, deps


router = APIRouter()


# =========================================================
# PERMISSIONS
# =========================================================

OwnerOrReception = deps.require_roles(
    "owner",
    "receptionist",
)

OwnerOnly = deps.require_roles(
    "owner",
)


# =========================================================
# SEARCH CLIENTS
# Everyone logged in can search
# =========================================================

@router.get(
    "/search",
    response_model=List[
        schemas.ClientOut
    ],
)
def search_clients(
    q: Optional[str] = Query(
        None,
        description=(
            "Search first/last/phone/email"
        ),
    ),
    limit: int = Query(
        25,
        ge=1,
        le=200,
    ),
    db: Session = Depends(
        get_db
    ),
    current_user: models.User = Depends(
        deps.get_current_user
    ),
):
    query = db.query(
        models.Client
    )

    if q:
        like = (
            f"%{q.strip()}%"
        )

        query = query.filter(
            (
                models.Client.first_name.ilike(
                    like
                )
            )
            |
            (
                models.Client.last_name.ilike(
                    like
                )
            )
            |
            (
                models.Client.phone.ilike(
                    like
                )
            )
            |
            (
                models.Client.email.ilike(
                    like
                )
            )
        )

    return (
        query
        .order_by(
            models.Client.last_name.asc(),
            models.Client.first_name.asc(),
        )
        .limit(
            limit
        )
        .all()
    )


# =========================================================
# LIST CLIENTS
# Everyone logged in can view
# =========================================================

@router.get(
    "/",
    response_model=List[
        schemas.ClientOut
    ],
)
def list_clients(
    db: Session = Depends(
        get_db
    ),
    current_user: models.User = Depends(
        deps.get_current_user
    ),
):
    return (
        db.query(
            models.Client
        )
        .order_by(
            models.Client.last_name.asc(),
            models.Client.first_name.asc(),
        )
        .all()
    )


# =========================================================
# CREATE CLIENT
# Everyone logged in can create
# =========================================================

@router.post(
    "/",
    response_model=
        schemas.ClientOut,
)
def create_client(
    client:
        schemas.ClientCreate,
    db: Session = Depends(
        get_db
    ),
    current_user: models.User = Depends(
        deps.get_current_user
    ),
):
    db_client = models.Client(
        **client.model_dump()
    )

    db.add(
        db_client
    )

    db.commit()

    db.refresh(
        db_client
    )

    return db_client


# =========================================================
# MASS EMAIL
# OWNER ONLY
# IMPORTANT:
# This route MUST stay before /{client_id}
# =========================================================

@router.post(
    "/broadcast/email"
)
def broadcast_email(
    payload:
        schemas.ClientBroadcastEmail,
    db: Session = Depends(
        get_db
    ),
    current_user: models.User = Depends(
        OwnerOnly
    ),
):
    subject = (
        payload.subject
        .strip()
    )

    message = (
        payload.message
        .strip()
    )


    if not subject:
        raise HTTPException(
            status_code=400,
            detail=(
                "Subject is required"
            ),
        )


    if not message:
        raise HTTPException(
            status_code=400,
            detail=(
                "Message is required"
            ),
        )


    api_key = os.getenv(
        "RESEND_API_KEY"
    )


    if not api_key:
        raise HTTPException(
            status_code=500,
            detail=(
                "RESEND_API_KEY is not configured"
            ),
        )


    resend.api_key = (
        api_key
    )


    clients = (
        db.query(
            models.Client
        )
        .filter(
            models.Client.email.isnot(
                None
            )
        )
        .all()
    )


    recipients = []


    for client in clients:
        email_address = (
            client.email
            or ""
        ).strip().lower()

        if email_address:
            recipients.append(
                email_address
            )


    # Remove duplicates while
    # preserving original order.
    recipients = list(
        dict.fromkeys(
            recipients
        )
    )


    if not recipients:
        raise HTTPException(
            status_code=400,
            detail=(
                "No clients have email addresses"
            ),
        )


    safe_message = (
        html.escape(
            message
        )
        .replace(
            "\n",
            "<br>"
        )
    )


    sent = 0

    failures = []


    for recipient in recipients:
        try:
            resend.Emails.send(
                {
                    "from":
                        (
                            "Image & Style "
                            "<onboarding@resend.dev>"
                        ),

                    "to": [
                        recipient
                    ],

                    "subject":
                        subject,

                    "html":
                        f"""
                        <div
                            style="
                                font-family:
                                    Arial,
                                    sans-serif;

                                max-width:
                                    600px;

                                margin:
                                    0 auto;

                                padding:
                                    24px;

                                color:
                                    #222222;
                            "
                        >
                            <h2
                                style="
                                    margin-bottom:
                                        20px;
                                "
                            >
                                Image & Style
                            </h2>

                            <div
                                style="
                                    font-size:
                                        16px;

                                    line-height:
                                        1.6;
                                "
                            >
                                {safe_message}
                            </div>

                            <div
                                style="
                                    margin-top:
                                        30px;

                                    padding-top:
                                        18px;

                                    border-top:
                                        1px solid
                                        #eeeeee;

                                    font-size:
                                        12px;

                                    color:
                                        #777777;
                                "
                            >
                                You are receiving this
                                message because your email
                                address is on file with
                                Image & Style.
                            </div>
                        </div>
                        """,
                }
            )

            sent += 1

        except Exception as error:
            failures.append(
                {
                    "email":
                        recipient,

                    "error":
                        str(
                            error
                        ),
                }
            )


    return {
        "ok":
            True,

        "sent":
            sent,

        "failed":
            len(
                failures
            ),

        "total":
            len(
                recipients
            ),

        "failures":
            failures,
    }


# =========================================================
# UPDATE CLIENT
# Everyone logged in can update
# =========================================================

@router.put(
    "/{client_id}",
    response_model=
        schemas.ClientOut,
)
def update_client(
    client_id: int,
    payload:
        schemas.ClientUpdate,
    db: Session = Depends(
        get_db
    ),
    current_user: models.User = Depends(
        deps.get_current_user
    ),
):
    obj = (
        db.query(
            models.Client
        )
        .filter(
            models.Client.id
            == client_id
        )
        .first()
    )


    if not obj:
        raise HTTPException(
            status_code=404,
            detail=(
                "Client not found"
            ),
        )


    data = payload.model_dump(
        exclude_unset=True
    )


    for key, value in data.items():
        setattr(
            obj,
            key,
            value,
        )


    db.commit()

    db.refresh(
        obj
    )

    return obj


# =========================================================
# DELETE CLIENT
# OWNER OR RECEPTIONIST ONLY
# =========================================================

@router.delete(
    "/{client_id}",
    status_code=204,
)
def delete_client(
    client_id: int,
    db: Session = Depends(
        get_db
    ),
    current_user: models.User = Depends(
        OwnerOrReception
    ),
):
    obj = (
        db.query(
            models.Client
        )
        .filter(
            models.Client.id
            == client_id
        )
        .first()
    )


    if not obj:
        raise HTTPException(
            status_code=404,
            detail=(
                "Client not found"
            ),
        )


    db.delete(
        obj
    )

    db.commit()


    return Response(
        status_code=204
    )