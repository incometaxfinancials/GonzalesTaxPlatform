"""
GONZALES TAX PLATFORM - Tax Returns Router
Agent Valentina - Backend/API Master

API endpoints for tax return CRUD operations.
"""
from fastapi import APIRouter, HTTPException, Depends, Query, Path
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field

from ...models.tax_return import (
    TaxReturn, ReturnStatus, ReturnType, FilingStatus,
    TaxpayerInfo, Dependent, W2Income, Form1099,
    SelfEmploymentIncome, ItemizedDeductions, TaxCredits
)
from ...calculations.tax_engine import TaxEngine


router = APIRouter()


# ===========================================
# REQUEST/RESPONSE SCHEMAS
# ===========================================
class CreateReturnRequest(BaseModel):
    """Request to create a new tax return"""
    tax_year: int = Field(..., ge=2020, le=2030)
    filing_status: FilingStatus
    return_type: ReturnType = ReturnType.FORM_1040


class UpdateReturnRequest(BaseModel):
    """Request to update a tax return"""
    filing_status: Optional[FilingStatus] = None
    taxpayer: Optional[TaxpayerInfo] = None
    spouse: Optional[TaxpayerInfo] = None
    dependents: Optional[List[Dependent]] = None


class ReturnSummary(BaseModel):
    """Summary view of a tax return"""
    id: UUID
    tax_year: int
    return_type: ReturnType
    filing_status: FilingStatus
    status: ReturnStatus
    taxpayer_name: str
    gross_income: Decimal
    refund_amount: Decimal
    amount_owed: Decimal
    created_at: datetime
    updated_at: datetime


class ReturnListResponse(BaseModel):
    """Response for listing returns"""
    returns: List[ReturnSummary]
    total: int
    page: int
    page_size: int


class CalculationSummary(BaseModel):
    """Tax calculation summary"""
    gross_income: Decimal
    adjusted_gross_income: Decimal
    taxable_income: Decimal
    tax_liability: Decimal
    total_credits: Decimal
    total_payments: Decimal
    refund_amount: Decimal
    amount_owed: Decimal


# ===========================================
# MOCK DATABASE (Replace with real DB)
# ===========================================
# In production, this would be replaced with actual database operations
_returns_db: dict = {}


def get_current_user_id() -> UUID:
    """Mock function to get current user ID from auth token"""
    # In production, this would extract user ID from JWT token
    from uuid import uuid4
    return uuid4()


# ===========================================
# ENDPOINTS
# ===========================================
@router.get("", response_model=ReturnListResponse)
async def list_returns(
    tax_year: Optional[int] = Query(None, description="Filter by tax year"),
    status: Optional[ReturnStatus] = Query(None, description="Filter by status"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    user_id: UUID = Depends(get_current_user_id)
):
    """
    List all tax returns for the current user.

    Returns paginated list of tax return summaries.
    """
    # Filter returns for user
    user_returns = [r for r in _returns_db.values() if r.user_id == user_id]

    # Apply filters
    if tax_year:
        user_returns = [r for r in user_returns if r.tax_year == tax_year]
    if status:
        user_returns = [r for r in user_returns if r.status == status]

    # Sort by updated_at descending
    user_returns.sort(key=lambda x: x.updated_at, reverse=True)

    # Paginate
    total = len(user_returns)
    start = (page - 1) * page_size
    end = start + page_size
    page_returns = user_returns[start:end]

    # Convert to summaries
    summaries = [
        ReturnSummary(
            id=r.id,
            tax_year=r.tax_year,
            return_type=r.return_type,
            filing_status=r.filing_status,
            status=r.status,
            taxpayer_name=r.taxpayer.full_name if r.taxpayer else "Unknown",
            gross_income=r.gross_income,
            refund_amount=r.refund_amount,
            amount_owed=r.amount_owed,
            created_at=r.created_at,
            updated_at=r.updated_at
        )
        for r in page_returns
    ]

    return ReturnListResponse(
        returns=summaries,
        total=total,
        page=page,
        page_size=page_size
    )


@router.post("", response_model=TaxReturn, status_code=201)
async def create_return(
    request: CreateReturnRequest,
    user_id: UUID = Depends(get_current_user_id)
):
    """
    Create a new tax return.

    Initializes a new tax return in draft status.
    """
    from uuid import uuid4
    from datetime import date

    # Create default taxpayer info (to be filled in)
    default_taxpayer = TaxpayerInfo(
        first_name="",
        last_name="",
        date_of_birth=date(1990, 1, 1),
        street_address="",
        city="",
        state="CA",
        zip_code="00000"
    )

    # Create the return
    tax_return = TaxReturn(
        id=uuid4(),
        user_id=user_id,
        tax_year=request.tax_year,
        return_type=request.return_type,
        filing_status=request.filing_status,
        status=ReturnStatus.DRAFT,
        taxpayer=default_taxpayer
    )

    # Save to database
    _returns_db[tax_return.id] = tax_return

    return tax_return


@router.get("/{return_id}", response_model=TaxReturn)
async def get_return(
    return_id: UUID = Path(..., description="Tax return ID"),
    user_id: UUID = Depends(get_current_user_id)
):
    """
    Get a specific tax return by ID.

    Returns the complete tax return with all details.
    """
    tax_return = _returns_db.get(return_id)

    if not tax_return:
        raise HTTPException(status_code=404, detail="Tax return not found")

    if tax_return.user_id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    return tax_return


@router.put("/{return_id}", response_model=TaxReturn)
async def update_return(
    return_id: UUID,
    request: UpdateReturnRequest,
    user_id: UUID = Depends(get_current_user_id)
):
    """
    Update a tax return.

    Only draft and in_progress returns can be updated.
    """
    tax_return = _returns_db.get(return_id)

    if not tax_return:
        raise HTTPException(status_code=404, detail="Tax return not found")

    if tax_return.user_id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    if tax_return.status not in (ReturnStatus.DRAFT, ReturnStatus.IN_PROGRESS):
        raise HTTPException(
            status_code=400,
            detail="Cannot update a submitted or accepted return"
        )

    # Update fields
    if request.filing_status:
        tax_return.filing_status = request.filing_status
    if request.taxpayer:
        tax_return.taxpayer = request.taxpayer
    if request.spouse:
        tax_return.spouse = request.spouse
    if request.dependents is not None:
        tax_return.dependents = request.dependents

    # Update timestamp
    tax_return.updated_at = datetime.utcnow()

    # Update status to in_progress if was draft
    if tax_return.status == ReturnStatus.DRAFT:
        tax_return.status = ReturnStatus.IN_PROGRESS

    # Recalculate tax
    engine = TaxEngine(tax_return.tax_year)
    results = engine.calculate_final_tax(tax_return)

    # Update calculated fields
    tax_return.gross_income = results["gross_income"]
    tax_return.adjusted_gross_income = results["adjusted_gross_income"]
    tax_return.taxable_income = results["taxable_income"]
    tax_return.tax_liability = results["tax_liability"]
    tax_return.total_credits = results["total_nonrefundable_credits"] + results["total_refundable_credits"]
    tax_return.total_payments = results["total_payments"]
    tax_return.refund_amount = results["refund_amount"]
    tax_return.amount_owed = results["amount_owed"]

    # Save
    _returns_db[return_id] = tax_return

    return tax_return


@router.delete("/{return_id}", status_code=204)
async def delete_return(
    return_id: UUID,
    user_id: UUID = Depends(get_current_user_id)
):
    """
    Delete a tax return.

    Only draft returns can be deleted. Submitted returns are archived.
    """
    tax_return = _returns_db.get(return_id)

    if not tax_return:
        raise HTTPException(status_code=404, detail="Tax return not found")

    if tax_return.user_id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    if tax_return.status not in (ReturnStatus.DRAFT, ReturnStatus.IN_PROGRESS):
        raise HTTPException(
            status_code=400,
            detail="Cannot delete a submitted or accepted return"
        )

    # Delete (soft delete in production)
    del _returns_db[return_id]


@router.post("/{return_id}/calculate", response_model=CalculationSummary)
async def calculate_return(
    return_id: UUID,
    user_id: UUID = Depends(get_current_user_id)
):
    """
    Calculate/recalculate tax for a return.

    Returns detailed calculation summary.
    """
    tax_return = _returns_db.get(return_id)

    if not tax_return:
        raise HTTPException(status_code=404, detail="Tax return not found")

    if tax_return.user_id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Calculate
    engine = TaxEngine(tax_return.tax_year)
    results = engine.calculate_final_tax(tax_return)

    # Update return with calculated values
    tax_return.gross_income = results["gross_income"]
    tax_return.adjusted_gross_income = results["adjusted_gross_income"]
    tax_return.taxable_income = results["taxable_income"]
    tax_return.tax_liability = results["tax_liability"]
    tax_return.total_credits = results["total_nonrefundable_credits"] + results["total_refundable_credits"]
    tax_return.total_payments = results["total_payments"]
    tax_return.refund_amount = results["refund_amount"]
    tax_return.amount_owed = results["amount_owed"]
    tax_return.updated_at = datetime.utcnow()

    _returns_db[return_id] = tax_return

    return CalculationSummary(
        gross_income=results["gross_income"],
        adjusted_gross_income=results["adjusted_gross_income"],
        taxable_income=results["taxable_income"],
        tax_liability=results["tax_liability"],
        total_credits=results["total_nonrefundable_credits"] + results["total_refundable_credits"],
        total_payments=results["total_payments"],
        refund_amount=results["refund_amount"],
        amount_owed=results["amount_owed"]
    )


@router.post("/{return_id}/w2")
async def add_w2(
    return_id: UUID,
    w2: W2Income,
    user_id: UUID = Depends(get_current_user_id)
):
    """Add a W-2 to the tax return"""
    tax_return = _returns_db.get(return_id)

    if not tax_return:
        raise HTTPException(status_code=404, detail="Tax return not found")

    if tax_return.user_id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    tax_return.w2_income.append(w2)
    tax_return.updated_at = datetime.utcnow()

    # Recalculate federal withheld
    tax_return.federal_withheld = tax_return.total_federal_withheld

    _returns_db[return_id] = tax_return

    return {"message": "W-2 added successfully", "w2_id": str(w2.id)}


@router.post("/{return_id}/1099")
async def add_1099(
    return_id: UUID,
    form_1099: Form1099,
    user_id: UUID = Depends(get_current_user_id)
):
    """Add a 1099 to the tax return"""
    tax_return = _returns_db.get(return_id)

    if not tax_return:
        raise HTTPException(status_code=404, detail="Tax return not found")

    if tax_return.user_id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    tax_return.form_1099s.append(form_1099)
    tax_return.updated_at = datetime.utcnow()

    _returns_db[return_id] = tax_return

    return {"message": "1099 added successfully", "form_id": str(form_1099.id)}


@router.post("/{return_id}/dependent")
async def add_dependent(
    return_id: UUID,
    dependent: Dependent,
    user_id: UUID = Depends(get_current_user_id)
):
    """Add a dependent to the tax return"""
    tax_return = _returns_db.get(return_id)

    if not tax_return:
        raise HTTPException(status_code=404, detail="Tax return not found")

    if tax_return.user_id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    tax_return.dependents.append(dependent)
    tax_return.updated_at = datetime.utcnow()

    _returns_db[return_id] = tax_return

    return {"message": "Dependent added successfully", "dependent_id": str(dependent.id)}


@router.post("/{return_id}/ready-to-file")
async def mark_ready_to_file(
    return_id: UUID,
    user_id: UUID = Depends(get_current_user_id)
):
    """
    Mark a return as ready to file.

    Validates the return and marks it ready for e-filing.
    """
    tax_return = _returns_db.get(return_id)

    if not tax_return:
        raise HTTPException(status_code=404, detail="Tax return not found")

    if tax_return.user_id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Validate return
    errors = validate_return(tax_return)
    if errors:
        raise HTTPException(status_code=400, detail={"errors": errors})

    tax_return.status = ReturnStatus.READY_TO_FILE
    tax_return.updated_at = datetime.utcnow()

    _returns_db[return_id] = tax_return

    return {"message": "Return marked as ready to file", "status": "ready_to_file"}


def validate_return(tax_return: TaxReturn) -> List[str]:
    """Validate a tax return before filing"""
    errors = []

    # Check taxpayer info
    if not tax_return.taxpayer.first_name:
        errors.append("Taxpayer first name is required")
    if not tax_return.taxpayer.last_name:
        errors.append("Taxpayer last name is required")
    if not tax_return.taxpayer.ssn_encrypted and not tax_return.taxpayer.ssn_last_four:
        errors.append("Taxpayer SSN is required")
    if tax_return.taxpayer.street_address == "":
        errors.append("Taxpayer address is required")

    # Check spouse if MFJ
    if tax_return.filing_status == FilingStatus.MARRIED_FILING_JOINTLY:
        if not tax_return.spouse:
            errors.append("Spouse information required for Married Filing Jointly")

    # Check income sources
    if not tax_return.w2_income and not tax_return.self_employment and not tax_return.form_1099s:
        errors.append("At least one income source is required")

    # Check for zero income (warning, not error)
    if tax_return.gross_income == 0:
        errors.append("Warning: Gross income is $0")

    return errors
