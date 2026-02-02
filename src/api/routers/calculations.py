"""
GONZALES TAX PLATFORM - Tax Calculations Router
Agent Lliset - Tax Law Authority

Tax calculation endpoints with real-time calculations.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from decimal import Decimal
from typing import Optional, Dict, Any

from ...models.tax_return import FilingStatus, gaap_round
from ...calculations.tax_engine import TaxEngine, OBBBAProvisions

router = APIRouter()


# ===========================================
# SCHEMAS
# ===========================================
class QuickCalcRequest(BaseModel):
    """Quick calculation request for estimates"""
    filing_status: FilingStatus
    w2_wages: Decimal = Field(default=Decimal("0"))
    federal_withheld: Decimal = Field(default=Decimal("0"))
    other_income: Decimal = Field(default=Decimal("0"))
    tip_income: Decimal = Field(default=Decimal("0"))
    overtime_income: Decimal = Field(default=Decimal("0"))
    self_employment_income: Decimal = Field(default=Decimal("0"))
    num_dependents: int = Field(default=0, ge=0)
    num_children_ctc: int = Field(default=0, ge=0)
    itemized_deductions: Decimal = Field(default=Decimal("0"))
    is_senior: bool = False


class QuickCalcResponse(BaseModel):
    """Quick calculation response"""
    gross_income: Decimal
    adjusted_gross_income: Decimal
    deduction_amount: Decimal
    deduction_type: str
    taxable_income: Decimal
    tax_liability: Decimal
    child_tax_credit: Decimal
    tips_deduction: Decimal
    overtime_deduction: Decimal
    senior_deduction: Decimal
    total_credits: Decimal
    total_payments: Decimal
    estimated_refund: Decimal
    estimated_owed: Decimal
    effective_tax_rate: Decimal
    marginal_tax_rate: Decimal


class TaxBracketInfo(BaseModel):
    """Tax bracket information"""
    bracket_start: Decimal
    bracket_end: Decimal
    rate: Decimal
    tax_in_bracket: Decimal


class TaxBreakdownResponse(BaseModel):
    """Detailed tax breakdown"""
    brackets: list[TaxBracketInfo]
    total_tax: Decimal
    effective_rate: Decimal


# ===========================================
# ENDPOINTS
# ===========================================
@router.post("/quick", response_model=QuickCalcResponse)
async def quick_calculate(request: QuickCalcRequest):
    """
    Quick tax estimate calculation.

    Provides a fast estimate without creating a full return.
    Includes OBBBA provisions (tips, overtime, senior deduction).
    """
    engine = TaxEngine(2025)
    obbba = OBBBAProvisions()

    # Calculate gross income
    gross_income = (
        request.w2_wages +
        request.other_income +
        request.tip_income +
        request.overtime_income +
        request.self_employment_income
    )

    # OBBBA Adjustments
    tips_deduction = min(request.tip_income, obbba.TIPS_DEDUCTION_MAX)
    overtime_deduction = min(request.overtime_income, obbba.OVERTIME_DEDUCTION_MAX_HOURLY)
    senior_deduction = obbba.SENIOR_DEDUCTION if request.is_senior else Decimal("0")

    # SE tax deduction (50% of SE tax)
    se_tax = Decimal("0")
    if request.self_employment_income > 0:
        net_se = request.self_employment_income * Decimal("0.9235")
        se_tax = net_se * Decimal("0.153")

    total_adjustments = tips_deduction + overtime_deduction + (se_tax * Decimal("0.5"))

    # AGI
    agi = gross_income - total_adjustments

    # Deduction (standard vs itemized)
    from ...core.config import STANDARD_DEDUCTIONS_2025
    standard_deduction = Decimal(str(STANDARD_DEDUCTIONS_2025.get(request.filing_status.value, 14600)))
    standard_deduction += senior_deduction

    if request.itemized_deductions > standard_deduction:
        deduction_amount = request.itemized_deductions
        deduction_type = "itemized"
    else:
        deduction_amount = standard_deduction
        deduction_type = "standard"

    # Taxable income
    taxable_income = max(agi - deduction_amount, Decimal("0"))

    # Tax liability
    tax_liability = engine._calculate_bracket_tax(taxable_income, request.filing_status)

    # Add SE tax
    tax_liability += se_tax

    # Child Tax Credit (OBBBA)
    ctc = request.num_children_ctc * obbba.CTC_AMOUNT

    # Total credits
    total_credits = ctc

    # Effective and marginal rates
    effective_rate = (tax_liability / gross_income * 100) if gross_income > 0 else Decimal("0")

    # Find marginal rate
    from ...core.config import TAX_BRACKETS_2025
    brackets = TAX_BRACKETS_2025.get(request.filing_status.value, TAX_BRACKETS_2025["single"])
    marginal_rate = Decimal("10")
    for threshold, rate in brackets:
        if taxable_income <= Decimal(str(threshold)):
            marginal_rate = Decimal(str(rate)) * 100
            break

    # Tax after credits
    tax_after_credits = max(tax_liability - total_credits, Decimal("0"))

    # Refund or owed
    total_payments = request.federal_withheld
    if total_payments >= tax_after_credits:
        estimated_refund = total_payments - tax_after_credits
        estimated_owed = Decimal("0")
    else:
        estimated_refund = Decimal("0")
        estimated_owed = tax_after_credits - total_payments

    return QuickCalcResponse(
        gross_income=gaap_round(gross_income),
        adjusted_gross_income=gaap_round(agi),
        deduction_amount=gaap_round(deduction_amount),
        deduction_type=deduction_type,
        taxable_income=gaap_round(taxable_income),
        tax_liability=gaap_round(tax_liability),
        child_tax_credit=gaap_round(ctc),
        tips_deduction=gaap_round(tips_deduction),
        overtime_deduction=gaap_round(overtime_deduction),
        senior_deduction=gaap_round(senior_deduction),
        total_credits=gaap_round(total_credits),
        total_payments=gaap_round(total_payments),
        estimated_refund=gaap_round(estimated_refund),
        estimated_owed=gaap_round(estimated_owed),
        effective_tax_rate=gaap_round(effective_rate),
        marginal_tax_rate=gaap_round(marginal_rate)
    )


@router.get("/brackets/{filing_status}")
async def get_tax_brackets(filing_status: FilingStatus):
    """
    Get tax brackets for a filing status.

    Returns 2025 tax brackets with rates.
    """
    from ...core.config import TAX_BRACKETS_2025

    brackets = TAX_BRACKETS_2025.get(filing_status.value, TAX_BRACKETS_2025["single"])

    result = []
    prev_threshold = Decimal("0")

    for threshold, rate in brackets:
        result.append({
            "bracket_start": prev_threshold,
            "bracket_end": Decimal(str(threshold)) if threshold != float("inf") else None,
            "rate": Decimal(str(rate)) * 100,
            "rate_display": f"{float(rate) * 100:.0f}%"
        })
        prev_threshold = Decimal(str(threshold))

    return {"filing_status": filing_status.value, "tax_year": 2025, "brackets": result}


@router.get("/standard-deductions")
async def get_standard_deductions():
    """
    Get standard deduction amounts for all filing statuses.
    """
    from ...core.config import STANDARD_DEDUCTIONS_2025, ADDITIONAL_STANDARD_DEDUCTION_2025

    obbba = OBBBAProvisions()

    return {
        "tax_year": 2025,
        "standard_deductions": STANDARD_DEDUCTIONS_2025,
        "additional_65_blind": ADDITIONAL_STANDARD_DEDUCTION_2025,
        "obbba_senior_deduction": float(obbba.SENIOR_DEDUCTION)
    }


@router.get("/obbba-provisions")
async def get_obbba_provisions():
    """
    Get all OBBBA (One Big Beautiful Bill Act) provisions.
    """
    obbba = OBBBAProvisions()

    return {
        "child_tax_credit": {
            "amount_per_child": float(obbba.CTC_AMOUNT),
            "refundable_portion": float(obbba.CTC_REFUNDABLE),
            "phaseout_single": float(obbba.CTC_PHASEOUT_SINGLE),
            "phaseout_joint": float(obbba.CTC_PHASEOUT_JOINT)
        },
        "no_tax_on_tips": {
            "max_deduction": float(obbba.TIPS_DEDUCTION_MAX),
            "phaseout_single": float(obbba.TIPS_PHASEOUT_SINGLE),
            "phaseout_joint": float(obbba.TIPS_PHASEOUT_JOINT)
        },
        "no_tax_on_overtime": {
            "max_deduction_hourly": float(obbba.OVERTIME_DEDUCTION_MAX_HOURLY),
            "max_deduction_salary": float(obbba.OVERTIME_DEDUCTION_MAX_SALARY),
            "salary_threshold": float(obbba.OVERTIME_SALARY_THRESHOLD)
        },
        "auto_loan_interest": {
            "max_deduction": float(obbba.AUTO_LOAN_INTEREST_MAX),
            "american_made_only": obbba.AUTO_LOAN_AMERICAN_MADE_ONLY
        },
        "senior_deduction": {
            "amount": float(obbba.SENIOR_DEDUCTION),
            "age_threshold": obbba.SENIOR_AGE_THRESHOLD
        },
        "salt_cap": {
            "amount": float(obbba.SALT_CAP),
            "revert_year": obbba.SALT_REVERT_YEAR
        },
        "trump_accounts": {
            "seed_amount": float(obbba.TRUMP_ACCOUNT_SEED),
            "annual_limit": float(obbba.TRUMP_ACCOUNT_ANNUAL_LIMIT)
        },
        "social_security_tax_exempt": obbba.SS_TAX_EXEMPT,
        "estate_tax_exemption": float(obbba.ESTATE_TAX_EXEMPTION)
    }


@router.post("/withholding-estimator")
async def estimate_withholding(
    filing_status: FilingStatus,
    annual_income: Decimal,
    pay_frequency: str = "biweekly",  # weekly, biweekly, semimonthly, monthly
    additional_withholding: Decimal = Decimal("0"),
    pre_tax_deductions: Decimal = Decimal("0")
):
    """
    Estimate recommended W-4 withholding.

    Helps users adjust their W-4 for accurate withholding.
    """
    engine = TaxEngine(2025)

    # Calculate annual tax
    from ...core.config import STANDARD_DEDUCTIONS_2025
    standard_deduction = Decimal(str(STANDARD_DEDUCTIONS_2025.get(filing_status.value, 14600)))
    taxable_income = max(annual_income - pre_tax_deductions - standard_deduction, Decimal("0"))
    annual_tax = engine._calculate_bracket_tax(taxable_income, filing_status)

    # Pay periods per year
    pay_periods = {
        "weekly": 52,
        "biweekly": 26,
        "semimonthly": 24,
        "monthly": 12
    }.get(pay_frequency, 26)

    # Recommended per-period withholding
    recommended_per_period = gaap_round(annual_tax / pay_periods)

    return {
        "annual_income": float(annual_income),
        "estimated_annual_tax": float(annual_tax),
        "pay_frequency": pay_frequency,
        "pay_periods": pay_periods,
        "recommended_per_period": float(recommended_per_period),
        "additional_withholding": float(additional_withholding),
        "total_per_period": float(recommended_per_period + additional_withholding)
    }
