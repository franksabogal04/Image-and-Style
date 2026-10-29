from fastapi import (
    APIRouter,
    Depends,
    Query,
    HTTPException,
)

from sqlalchemy.orm import Session
from sqlalchemy import (
    func,
    and_,
)

from datetime import datetime
from typing import Optional

from ..database import get_db
from .. import (
    models,
    schemas,
    deps,
)


router = APIRouter()


# =========================================================
# COMMISSION SETTINGS
# =========================================================

STAFF_SERVICE_RATE = 0.60
OWNER_SERVICE_RATE = 0.40

STAFF_PRODUCT_RATE = 0.20
SALON_PRODUCT_RATE = 0.80


# =========================================================
# HELPERS
# =========================================================

def _sum_or_zero(
    query,
    column,
):
    return float(
        query.with_entities(
            func.coalesce(
                func.sum(column),
                0.0,
            )
        ).scalar()
        or 0.0
    )


def _service_split(
    services_total: float,
):
    """
    Split gross service revenue:

    Staff receives 60%.
    Salon/owner receives 40%.
    """

    staff_amount = round(
        float(services_total or 0.0)
        * STAFF_SERVICE_RATE,
        2,
    )

    owner_amount = round(
        float(services_total or 0.0)
        * OWNER_SERVICE_RATE,
        2,
    )

    return (
        staff_amount,
        owner_amount,
    )


def _product_split(
    sales_total: float,
):
    """
    Split gross product revenue:

    Actual seller receives 20%.
    Salon receives 80%.
    """

    seller_amount = round(
        float(sales_total or 0.0)
        * STAFF_PRODUCT_RATE,
        2,
    )

    salon_amount = round(
        float(sales_total or 0.0)
        * SALON_PRODUCT_RATE,
        2,
    )

    return (
        seller_amount,
        salon_amount,
    )



# =========================================================
# REFUND ACCOUNTING HELPERS
# =========================================================

def _refunded_subtotal(
    db: Session,
    kind: Optional[str] = None,
    staff_id: Optional[int] = None,
    start: Optional[datetime] = None,
    end: Optional[datetime] = None,
):
    """
    Return successful refunded PRE-TAX revenue.

    RefundLine.subtotal is used because commissions are
    calculated from the original pre-tax service/product
    amounts.

    kind:
        service
        product
        tip

    staff_id uses the employee snapshot stored on the
    RefundLine so the correct person's earnings are reversed.
    """

    q = (
        db.query(
            func.coalesce(
                func.sum(
                    models.RefundLine.subtotal
                ),
                0.0,
            )
        )
        .join(
            models.Refund,
            models.RefundLine.refund_id
            == models.Refund.id,
        )
        .join(
            models.Appointment,
            models.Refund.appointment_id
            == models.Appointment.id,
        )
        .filter(
            models.Refund.status
            == "succeeded"
        )
    )


    if kind:
        q = q.filter(
            models.RefundLine.kind
            == kind
        )


    if staff_id is not None:
        q = q.filter(
            models.RefundLine.staff_id
            == staff_id
        )


    if start:
        q = q.filter(
            models.Appointment.start_time
            >= start
        )


    if end:
        q = q.filter(
            models.Appointment.end_time
            <= end
        )


    return float(
        q.scalar()
        or 0.0
    )


# =========================================================
# EARNINGS SUMMARY
# =========================================================

@router.get(
    "/",
    response_model=schemas.EarningsSummary,
)
def earnings(
    start: Optional[datetime] = Query(None),
    end: Optional[datetime] = Query(None),

    db: Session = Depends(
        get_db
    ),

    current_user: models.User = Depends(
        deps.get_current_user
    ),
):
    """
    Staff:
        Service revenue/tips come only from the logged-in
        employee's appointments.

        Retail comes only from products actually sold by
        the logged-in employee using Sale.staff_id.

    Owner/receptionist:
        Returns salon-wide totals.

    services_total remains gross service revenue.

    staff_service_earnings is the 60% employee share.

    owner_service_share is the 40% salon share.

    sales_total remains gross retail revenue. The 20%
    seller commission is calculated in the detailed
    by-staff and tax endpoints and will be exposed in
    EarningsSummary once its schema is expanded.
    """

    # -----------------------------------------------------
    # APPOINTMENTS
    # -----------------------------------------------------

    q_appt = db.query(
        models.Appointment
    )

    if current_user.role == "staff":
        q_appt = q_appt.filter(
            models.Appointment.staff_id
            == current_user.id
        )

    elif current_user.role not in (
        "owner",
        "receptionist",
    ):
        raise HTTPException(
            status_code=403,
            detail="Forbidden",
        )

    if start:
        q_appt = q_appt.filter(
            models.Appointment.start_time
            >= start
        )

    if end:
        q_appt = q_appt.filter(
            models.Appointment.end_time
            <= end
        )

    services_total = _sum_or_zero(
        q_appt,
        models.Appointment.price,
    )

    tips_total = _sum_or_zero(
        q_appt,
        models.Appointment.tip,
    )

    # -----------------------------------------------------
    # REFUND REVERSALS - MAIN SUMMARY
    # -----------------------------------------------------

    refund_staff_id = (
        current_user.id
        if current_user.role == "staff"
        else None
    )

    refunded_services = _refunded_subtotal(
        db,
        kind="service",
        staff_id=refund_staff_id,
        start=start,
        end=end,
    )

    refunded_tips = _refunded_subtotal(
        db,
        kind="tip",
        staff_id=refund_staff_id,
        start=start,
        end=end,
    )

    services_total = round(
        max(
            0.0,
            services_total
            - refunded_services,
        ),
        2,
    )

    tips_total = round(
        max(
            0.0,
            tips_total
            - refunded_tips,
        ),
        2,
    )

    # -----------------------------------------------------
    # 60 / 40 SERVICE SPLIT
    # -----------------------------------------------------

    (
        staff_service_earnings,
        owner_service_share,
    ) = _service_split(
        services_total
    )

    # -----------------------------------------------------
    # RETAIL SALES
    # -----------------------------------------------------

    sales_q = (
        db.query(
            func.coalesce(
                func.sum(
                    models.Sale.total_price
                ),
                0.0,
            )
        )
        .join(
            models.Appointment,
            models.Sale.appointment_id
            == models.Appointment.id,
        )
    )

    if current_user.role == "staff":
        sales_q = sales_q.filter(
            models.Sale.staff_id
            == current_user.id
        )

    if start:
        sales_q = sales_q.filter(
            models.Appointment.start_time
            >= start
        )

    if end:
        sales_q = sales_q.filter(
            models.Appointment.end_time
            <= end
        )

    sales_total = float(
        sales_q.scalar()
        or 0.0
    )

    refunded_products = _refunded_subtotal(
        db,
        kind="product",
        staff_id=refund_staff_id,
        start=start,
        end=end,
    )

    sales_total = round(
        max(
            0.0,
            sales_total
            - refunded_products,
        ),
        2,
    )

    (
        _product_commission,
        _salon_retail_share,
    ) = _product_split(
        sales_total
    )

    # -----------------------------------------------------
    # RESPONSE
    # -----------------------------------------------------

    return schemas.EarningsSummary(
        services_total=
            services_total,

        staff_service_earnings=
            staff_service_earnings,

        owner_service_share=
            owner_service_share,

        tips_total=
            tips_total,

        sales_total=
    sales_total,

product_commission=
    _product_commission,

salon_retail_share=
    _salon_retail_share,

grand_total=float(
            services_total
            + tips_total
            + sales_total
        ),
    )


# =========================================================
# EARNINGS BY STAFF
# =========================================================

@router.get(
    "/by-staff"
)
def earnings_by_staff(
    start: Optional[datetime] = Query(None),
    end: Optional[datetime] = Query(None),

    db: Session = Depends(
        get_db
    ),

    current_user: models.User = Depends(
        deps.get_current_user
    ),
):
    """
    Owner/receptionist only.

    Service split:
        Employee 60%.
        Salon 40%.

    Retail split:
        Actual seller 20%.
        Salon 80%.

    staff_earnings_total:
        60% service revenue
        + 100% tips
        + 20% product commission.
    """

    if current_user.role not in (
        "owner",
        "receptionist",
    ):
        raise HTTPException(
            status_code=403,
            detail="Forbidden",
        )

    # -----------------------------------------------------
    # SALON-WIDE APPOINTMENTS
    # -----------------------------------------------------

    q_appt = db.query(
        models.Appointment
    )

    if start:
        q_appt = q_appt.filter(
            models.Appointment.start_time
            >= start
        )

    if end:
        q_appt = q_appt.filter(
            models.Appointment.end_time
            <= end
        )

    services_total = _sum_or_zero(
        q_appt,
        models.Appointment.price,
    )

    tips_total = _sum_or_zero(
        q_appt,
        models.Appointment.tip,
    )

    # -----------------------------------------------------
    # REFUND REVERSALS - BY STAFF SALON TOTALS
    # -----------------------------------------------------

    refunded_services = _refunded_subtotal(
        db,
        kind="service",
        start=start,
        end=end,
    )

    refunded_tips = _refunded_subtotal(
        db,
        kind="tip",
        start=start,
        end=end,
    )

    services_total = round(
        max(
            0.0,
            services_total
            - refunded_services,
        ),
        2,
    )

    tips_total = round(
        max(
            0.0,
            tips_total
            - refunded_tips,
        ),
        2,
    )

    (
        total_staff_service_earnings,
        total_owner_service_share,
    ) = _service_split(
        services_total
    )

    # -----------------------------------------------------
    # SALON-WIDE RETAIL
    # -----------------------------------------------------

    sales_total_q = (
        db.query(
            func.coalesce(
                func.sum(
                    models.Sale.total_price
                ),
                0.0,
            )
        )
        .join(
            models.Appointment,
            models.Sale.appointment_id
            == models.Appointment.id,
        )
    )

    if start:
        sales_total_q = (
            sales_total_q.filter(
                models.Appointment.start_time
                >= start
            )
        )

    if end:
        sales_total_q = (
            sales_total_q.filter(
                models.Appointment.end_time
                <= end
            )
        )

    sales_total = float(
        sales_total_q.scalar()
        or 0.0
    )

    refunded_products = _refunded_subtotal(
        db,
        kind="product",
        start=start,
        end=end,
    )

    sales_total = round(
        max(
            0.0,
            sales_total
            - refunded_products,
        ),
        2,
    )

    (
        total_product_commission,
        total_salon_retail_share,
    ) = _product_split(
        sales_total
    )

    totals = {
        "services_total":
            services_total,

        "staff_service_earnings":
            total_staff_service_earnings,

        "owner_service_share":
            total_owner_service_share,

        "tips_total":
            tips_total,

        "sales_total":
            sales_total,

        "product_commission":
            total_product_commission,

        "salon_retail_share":
            total_salon_retail_share,

        "staff_earnings_total":
            float(
                total_staff_service_earnings
                + tips_total
                + total_product_commission
            ),

        "grand_total":
            float(
                services_total
                + tips_total
                + sales_total
            ),
    }

    # -----------------------------------------------------
    # SERVICES + TIPS BY APPOINTMENT STAFF
    # -----------------------------------------------------

    appt_rows = db.query(
        models.Appointment.staff_id,

        func.coalesce(
            func.sum(
                models.Appointment.price
            ),
            0.0,
        ),

        func.coalesce(
            func.sum(
                models.Appointment.tip
            ),
            0.0,
        ),
    )

    if start:
        appt_rows = appt_rows.filter(
            models.Appointment.start_time
            >= start
        )

    if end:
        appt_rows = appt_rows.filter(
            models.Appointment.end_time
            <= end
        )

    appt_rows = (
        appt_rows
        .group_by(
            models.Appointment.staff_id
        )
        .all()
    )

    # -----------------------------------------------------
    # RETAIL BY ACTUAL SELLER
    # -----------------------------------------------------

    sales_rows = (
        db.query(
            models.Sale.staff_id,

            func.coalesce(
                func.sum(
                    models.Sale.total_price
                ),
                0.0,
            ),
        )
        .join(
            models.Appointment,
            models.Sale.appointment_id
            == models.Appointment.id,
        )
    )

    if start:
        sales_rows = sales_rows.filter(
            models.Appointment.start_time
            >= start
        )

    if end:
        sales_rows = sales_rows.filter(
            models.Appointment.end_time
            <= end
        )

    sales_rows = (
        sales_rows
        .group_by(
            models.Sale.staff_id
        )
        .all()
    )

    # -----------------------------------------------------
    # BUILD STAFF MAP
    # -----------------------------------------------------

    appt_map = {
        sid: {
            "services_total":
                float(
                    service_sum
                    or 0.0
                ),

            "tips_total":
                float(
                    tip_sum
                    or 0.0
                ),

            "sales_total":
                0.0,
        }

        for (
            sid,
            service_sum,
            tip_sum,
        )
        in appt_rows
    }

    for (
        sid,
        sales_sum,
    ) in sales_rows:

        appt_map.setdefault(
            sid,
            {
                "services_total":
                    0.0,

                "tips_total":
                    0.0,

                "sales_total":
                    0.0,
            },
        )

        appt_map[
            sid
        ][
            "sales_total"
        ] = float(
            sales_sum
            or 0.0
        )

    # -----------------------------------------------------
    # INCLUDE ALL CURRENT STAFF, EVEN WITH ZERO EARNINGS
    # -----------------------------------------------------

    all_staff_users = (
        db.query(
            models.User
        )
        .filter(
            models.User.role
            == "staff"
        )
        .all()
    )

    for staff_user in all_staff_users:
        appt_map.setdefault(
            staff_user.id,
            {
                "services_total":
                    0.0,

                "tips_total":
                    0.0,

                "sales_total":
                    0.0,
            },
        )

    # -----------------------------------------------------
    # STAFF NAMES
    # -----------------------------------------------------

    staff_ids = list(
        appt_map.keys()
    )

    users = []

    if staff_ids:
        users = (
            db.query(
                models.User
            )
            .filter(
                models.User.id.in_(
                    staff_ids
                )
            )
            .all()
        )

    name_by_id = {
        user.id:
            user.name

        for user in users
    }

    # -----------------------------------------------------
    # BUILD RESPONSE
    # -----------------------------------------------------

    out = []

    for sid in sorted(
        staff_ids,

        key=lambda staff_id:
            name_by_id.get(
                staff_id,
                "",
            ),
    ):
        service_revenue = float(
            appt_map[
                sid
            ].get(
                "services_total",
                0.0,
            )
        )

        tips = float(
            appt_map[
                sid
            ].get(
                "tips_total",
                0.0,
            )
        )

        sales = float(
            appt_map[
                sid
            ].get(
                "sales_total",
                0.0,
            )
        )

        # ---------------------------------------------
        # Successful refunds belonging to THIS person
        # ---------------------------------------------

        service_refunds = _refunded_subtotal(
            db,
            kind="service",
            staff_id=sid,
            start=start,
            end=end,
        )

        tip_refunds = _refunded_subtotal(
            db,
            kind="tip",
            staff_id=sid,
            start=start,
            end=end,
        )

        product_refunds = _refunded_subtotal(
            db,
            kind="product",
            staff_id=sid,
            start=start,
            end=end,
        )

        service_revenue = round(
            max(
                0.0,
                service_revenue
                - service_refunds,
            ),
            2,
        )

        tips = round(
            max(
                0.0,
                tips
                - tip_refunds,
            ),
            2,
        )

        sales = round(
            max(
                0.0,
                sales
                - product_refunds,
            ),
            2,
        )

        (
            staff_service_earnings,
            owner_service_share,
        ) = _service_split(
            service_revenue
        )

        (
            product_commission,
            salon_retail_share,
        ) = _product_split(
            sales
        )

        staff_earnings_total = round(
            staff_service_earnings
            + tips
            + product_commission,
            2,
        )

        out.append({
            "staff_id":
                sid,

            "staff_name":
                name_by_id.get(
                    sid,
                    f"Staff #{sid}",
                ),

            "services_total":
                service_revenue,

            "staff_service_earnings":
                staff_service_earnings,

            "owner_service_share":
                owner_service_share,

            "tips_total":
                tips,

            "sales_total":
                sales,

            "product_commission":
                product_commission,

            "salon_retail_share":
                salon_retail_share,

            "staff_earnings_total":
                staff_earnings_total,

            "grand_total":
                float(
                    service_revenue
                    + tips
                    + sales
                ),
        })

    return {
        "staff":
            out,

        "totals":
            totals,
    }


# =========================================================
# TAX SETTINGS
# =========================================================

_DEFAULT_OWNER_INCOME_RATE = 0.25
_DEFAULT_STAFF_INCOME_RATE = 0.22
_DEFAULT_SERVICE_TAX_RATE = 0.00
_DEFAULT_RETAIL_TAX_RATE = 0.07


def _active_tax_rule(
    db: Session,
    when: Optional[datetime] = None,
):
    """
    Return active TaxRule.

    Falls back to default estimates when no
    active rule exists.
    """

    TaxRule = getattr(
        models,
        "TaxRule",
        None,
    )

    if TaxRule is None:

        class _Defaults:
            owner_income_rate = (
                _DEFAULT_OWNER_INCOME_RATE
            )

            staff_income_rate = (
                _DEFAULT_STAFF_INCOME_RATE
            )

            service_rate = (
                _DEFAULT_SERVICE_TAX_RATE
            )

            retail_rate = (
                _DEFAULT_RETAIL_TAX_RATE
            )

        return _Defaults()

    when = (
        when
        or datetime.utcnow()
    )

    q = (
        db.query(
            TaxRule
        )
        .filter(
            TaxRule.active == True
        )
        .filter(
            and_(
                (
                    TaxRule.effective_from
                    == None
                )
                |
                (
                    TaxRule.effective_from
                    <= when
                ),

                (
                    TaxRule.effective_to
                    == None
                )
                |
                (
                    TaxRule.effective_to
                    >= when
                ),
            )
        )
        .order_by(
            TaxRule
            .effective_from
            .desc()
            .nullslast()
        )
    )

    row = q.first()

    if row:
        return row

    class _Defaults:
        owner_income_rate = (
            _DEFAULT_OWNER_INCOME_RATE
        )

        staff_income_rate = (
            _DEFAULT_STAFF_INCOME_RATE
        )

        service_rate = (
            _DEFAULT_SERVICE_TAX_RATE
        )

        retail_rate = (
            _DEFAULT_RETAIL_TAX_RATE
        )

    return _Defaults()


# =========================================================
# TAX SUMMARY
# =========================================================

@router.get(
    "/taxes"
)
def taxes_summary(
    start: Optional[datetime] = Query(None),
    end: Optional[datetime] = Query(None),

    db: Session = Depends(
        get_db
    ),

    current_user: models.User = Depends(
        deps.get_current_user
    ),
):
    """
    Staff:
        Personal estimated income-tax reserve.

        Compensation used:
            60% service share
            + 100% tips
            + 20% product commission.

    Owner/receptionist:
        Salon transaction-tax totals,
        owner tax estimate,
        and per-person income-tax estimates.
    """

    # =====================================================
    # STAFF
    # =====================================================

    if current_user.role == "staff":

        q_appt = (
            db.query(
                models.Appointment
            )
            .filter(
                models.Appointment.staff_id
                == current_user.id
            )
        )

        if start:
            q_appt = q_appt.filter(
                models.Appointment.start_time
                >= start
            )

        if end:
            q_appt = q_appt.filter(
                models.Appointment.end_time
                <= end
            )

        services_total = _sum_or_zero(
            q_appt,
            models.Appointment.price,
        )

        tips_total = _sum_or_zero(
            q_appt,
            models.Appointment.tip,
        )

        # -------------------------------------------------
        # REFUND REVERSALS - STAFF TAX SUMMARY
        # -------------------------------------------------

        refunded_services = _refunded_subtotal(
            db,
            kind="service",
            staff_id=current_user.id,
            start=start,
            end=end,
        )

        refunded_tips = _refunded_subtotal(
            db,
            kind="tip",
            staff_id=current_user.id,
            start=start,
            end=end,
        )

        services_total = round(
            max(
                0.0,
                services_total
                - refunded_services,
            ),
            2,
        )

        tips_total = round(
            max(
                0.0,
                tips_total
                - refunded_tips,
            ),
            2,
        )

        sales_q = (
            db.query(
                func.coalesce(
                    func.sum(
                        models.Sale.total_price
                    ),
                    0.0,
                )
            )
            .join(
                models.Appointment,
                models.Sale.appointment_id
                == models.Appointment.id,
            )
            .filter(
                models.Sale.staff_id
                == current_user.id
            )
        )

        if start:
            sales_q = sales_q.filter(
                models.Appointment.start_time
                >= start
            )

        if end:
            sales_q = sales_q.filter(
                models.Appointment.end_time
                <= end
            )

        sales_total = float(
            sales_q.scalar()
            or 0.0
        )

        refunded_products = _refunded_subtotal(
            db,
            kind="product",
            staff_id=current_user.id,
            start=start,
            end=end,
        )

        sales_total = round(
            max(
                0.0,
                sales_total
                - refunded_products,
            ),
            2,
        )

        (
            product_commission,
            salon_retail_share,
        ) = _product_split(
            sales_total
        )

        (
            staff_service_earnings,
            _,
        ) = _service_split(
            services_total
        )

        total_comp = round(
            staff_service_earnings
            + tips_total
            + product_commission,
            2,
        )

        rule = _active_tax_rule(
            db
        )

        staff_income_rate = float(
            getattr(
                rule,
                "staff_income_rate",
                _DEFAULT_STAFF_INCOME_RATE,
            )
        )

        est_personal_income_tax = round(
            total_comp
            * staff_income_rate,
            2,
        )

        return {
            "scope":
                "staff",

            "staff_id":
                current_user.id,

            "period": {
                "start":
                    start,

                "end":
                    end,
            },

            "totals": {
                "service_revenue":
                    services_total,

                "service_earnings":
                    staff_service_earnings,

                "tips":
                    tips_total,

                "sales":
                    sales_total,

                "product_commission":
                    product_commission,

                "salon_retail_share":
                    salon_retail_share,

                "gross_comp":
                    total_comp,
            },

            "estimates": {
                "personal_income_tax":
                    est_personal_income_tax,

                "applied_rate":
                    staff_income_rate,
            },
        }

    # =====================================================
    # OWNER / RECEPTIONIST
    # =====================================================

    if current_user.role not in (
        "owner",
        "receptionist",
    ):
        raise HTTPException(
            status_code=403,
            detail="Forbidden",
        )

    q_appt = db.query(
        models.Appointment
    )

    if start:
        q_appt = q_appt.filter(
            models.Appointment.start_time
            >= start
        )

    if end:
        q_appt = q_appt.filter(
            models.Appointment.end_time
            <= end
        )

    services_total = _sum_or_zero(
        q_appt,
        models.Appointment.price,
    )

    tips_total = _sum_or_zero(
        q_appt,
        models.Appointment.tip,
    )

    # -----------------------------------------------------
    # REFUND REVERSALS - OWNER TAX SUMMARY
    # -----------------------------------------------------

    refunded_services = _refunded_subtotal(
        db,
        kind="service",
        start=start,
        end=end,
    )

    refunded_tips = _refunded_subtotal(
        db,
        kind="tip",
        start=start,
        end=end,
    )

    services_total = round(
        max(
            0.0,
            services_total
            - refunded_services,
        ),
        2,
    )

    tips_total = round(
        max(
            0.0,
            tips_total
            - refunded_tips,
        ),
        2,
    )

    sales_total_q = (
        db.query(
            func.coalesce(
                func.sum(
                    models.Sale.total_price
                ),
                0.0,
            )
        )
        .join(
            models.Appointment,
            models.Sale.appointment_id
            == models.Appointment.id,
        )
    )

    if start:
        sales_total_q = (
            sales_total_q.filter(
                models.Appointment.start_time
                >= start
            )
        )

    if end:
        sales_total_q = (
            sales_total_q.filter(
                models.Appointment.end_time
                <= end
            )
        )

    sales_total = float(
        sales_total_q.scalar()
        or 0.0
    )

    refunded_products = _refunded_subtotal(
        db,
        kind="product",
        start=start,
        end=end,
    )

    sales_total = round(
        max(
            0.0,
            sales_total
            - refunded_products,
        ),
        2,
    )

    grand = (
        services_total
        + tips_total
        + sales_total
    )

    (
        total_staff_service_earnings,
        total_owner_service_share,
    ) = _service_split(
        services_total
    )

    (
        total_product_commission,
        total_salon_retail_share,
    ) = _product_split(
        sales_total
    )

    rule = _active_tax_rule(
        db
    )

    service_rate = float(
        getattr(
            rule,
            "service_rate",
            _DEFAULT_SERVICE_TAX_RATE,
        )
    )

    retail_rate = float(
        getattr(
            rule,
            "retail_rate",
            _DEFAULT_RETAIL_TAX_RATE,
        )
    )

    service_tax_collected = round(
        services_total
        * service_rate,
        2,
    )

    retail_tax_collected = round(
        sales_total
        * retail_rate,
        2,
    )

    owner_income_rate = float(
        getattr(
            rule,
            "owner_income_rate",
            _DEFAULT_OWNER_INCOME_RATE,
        )
    )

    est_owner_income_tax = round(
        grand
        * owner_income_rate,
        2,
    )

    # -----------------------------------------------------
    # SERVICE + TIP TOTALS
    # -----------------------------------------------------

    appt_rows = db.query(
        models.Appointment.staff_id,

        func.coalesce(
            func.sum(
                models.Appointment.price
            ),
            0.0,
        ),

        func.coalesce(
            func.sum(
                models.Appointment.tip
            ),
            0.0,
        ),
    )

    if start:
        appt_rows = appt_rows.filter(
            models.Appointment.start_time
            >= start
        )

    if end:
        appt_rows = appt_rows.filter(
            models.Appointment.end_time
            <= end
        )

    appt_rows = (
        appt_rows
        .group_by(
            models.Appointment.staff_id
        )
        .all()
    )

    # -----------------------------------------------------
    # RETAIL BY ACTUAL SELLER
    # -----------------------------------------------------

    sales_rows = (
        db.query(
            models.Sale.staff_id,

            func.coalesce(
                func.sum(
                    models.Sale.total_price
                ),
                0.0,
            ),
        )
        .join(
            models.Appointment,
            models.Sale.appointment_id
            == models.Appointment.id,
        )
    )

    if start:
        sales_rows = sales_rows.filter(
            models.Appointment.start_time
            >= start
        )

    if end:
        sales_rows = sales_rows.filter(
            models.Appointment.end_time
            <= end
        )

    sales_rows = (
        sales_rows
        .group_by(
            models.Sale.staff_id
        )
        .all()
    )

    # -----------------------------------------------------
    # BUILD STAFF MAP
    # -----------------------------------------------------

    per_staff_map = {
        sid: {
            "services":
                float(
                    service_sum
                    or 0.0
                ),

            "tips":
                float(
                    tip_sum
                    or 0.0
                ),

            "sales":
                0.0,
        }

        for (
            sid,
            service_sum,
            tip_sum,
        )
        in appt_rows
    }

    for (
        sid,
        sales_sum,
    ) in sales_rows:

        per_staff_map.setdefault(
            sid,
            {
                "services":
                    0.0,

                "tips":
                    0.0,

                "sales":
                    0.0,
            },
        )

        per_staff_map[
            sid
        ][
            "sales"
        ] = float(
            sales_sum
            or 0.0
        )

    ids = list(
        per_staff_map.keys()
    )

    users = []

    if ids:
        users = (
            db.query(
                models.User
            )
            .filter(
                models.User.id.in_(
                    ids
                )
            )
            .all()
        )

    name_by_id = {
        user.id:
            user.name

        for user in users
    }

    staff_income_rate = float(
        getattr(
            rule,
            "staff_income_rate",
            _DEFAULT_STAFF_INCOME_RATE,
        )
    )

    staff_estimates = []

    for sid in sorted(
        ids,

        key=lambda staff_id:
            name_by_id.get(
                staff_id,
                "",
            ),
    ):
        bases = per_staff_map[
            sid
        ]

        # ---------------------------------------------
        # Reverse successful refunds for THIS person.
        #
        # Product refunds use RefundLine.staff_id,
        # which snapshots the actual product seller.
        # ---------------------------------------------

        service_refunds = _refunded_subtotal(
            db,
            kind="service",
            staff_id=sid,
            start=start,
            end=end,
        )

        tip_refunds = _refunded_subtotal(
            db,
            kind="tip",
            staff_id=sid,
            start=start,
            end=end,
        )

        product_refunds = _refunded_subtotal(
            db,
            kind="product",
            staff_id=sid,
            start=start,
            end=end,
        )

        bases["services"] = round(
            max(
                0.0,
                float(
                    bases.get(
                        "services",
                        0.0,
                    )
                )
                - service_refunds,
            ),
            2,
        )

        bases["tips"] = round(
            max(
                0.0,
                float(
                    bases.get(
                        "tips",
                        0.0,
                    )
                )
                - tip_refunds,
            ),
            2,
        )

        bases["sales"] = round(
            max(
                0.0,
                float(
                    bases.get(
                        "sales",
                        0.0,
                    )
                )
                - product_refunds,
            ),
            2,
        )

        (
            staff_service_earnings,
            owner_service_share,
        ) = _service_split(
            bases[
                "services"
            ]
        )

        (
            product_commission,
            salon_retail_share,
        ) = _product_split(
            bases[
                "sales"
            ]
        )

        gross_comp = round(
            staff_service_earnings
            + bases[
                "tips"
            ]
            + product_commission,
            2,
        )

        staff_estimates.append({
            "staff_id":
                sid,

            "staff_name":
                name_by_id.get(
                    sid,
                    f"Staff #{sid}",
                ),

            "gross_comp":
                gross_comp,

            "estimated_personal_income_tax":
                round(
                    gross_comp
                    * staff_income_rate,
                    2,
                ),

            "applied_rate":
                staff_income_rate,

            "breakdown": {
                "service_revenue":
                    bases[
                        "services"
                    ],

                "service_earnings":
                    staff_service_earnings,

                "owner_service_share":
                    owner_service_share,

                "tips":
                    bases[
                        "tips"
                    ],

                "sales":
                    bases[
                        "sales"
                    ],

                "product_commission":
                    product_commission,

                "salon_retail_share":
                    salon_retail_share,
            },
        })

    return {
        "scope":
            "salon",

        "period": {
            "start":
                start,

            "end":
                end,
        },

        "totals": {
            "services":
                round(
                    services_total,
                    2,
                ),

            "staff_service_earnings":
                round(
                    total_staff_service_earnings,
                    2,
                ),

            "owner_service_share":
                round(
                    total_owner_service_share,
                    2,
                ),

            "tips":
                round(
                    tips_total,
                    2,
                ),

            "sales":
                round(
                    sales_total,
                    2,
                ),

            "product_commission":
                round(
                    total_product_commission,
                    2,
                ),

            "salon_retail_share":
                round(
                    total_salon_retail_share,
                    2,
                ),

            "grand_total":
                round(
                    grand,
                    2,
                ),
        },

        "collected_transaction_taxes": {
            "service_tax": {
                "rate":
                    service_rate,

                "amount":
                    service_tax_collected,
            },

            "retail_tax": {
                "rate":
                    retail_rate,

                "amount":
                    retail_tax_collected,
            },
        },

        "owner_income_tax_estimate": {
            "rate":
                owner_income_rate,

            "amount":
                est_owner_income_tax,
        },

        "per_staff_income_tax_estimates":
            staff_estimates,
    }