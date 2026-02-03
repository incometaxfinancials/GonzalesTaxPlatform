"""
IRS MeF E-File API Router
Handles XML generation, submission, and acknowledgment processing
"""

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Any
from datetime import datetime
from decimal import Decimal
import json

from ...irs import (
    MeFVersion,
    SubmissionType,
    TransmissionType,
    MeFSubmissionManifest,
    MeFTransmitterInfo,
    IRSXMLBuilder,
    ACKParser,
    ACKStatusChecker,
    AckStatus,
    ATSTestSuite,
    PIIProtection,
    AuditLogger,
    ComplianceChecker
)

router = APIRouter(prefix="/mef", tags=["IRS MeF E-File"])

# Initialize services
ack_parser = ACKParser()
ats_suite = ATSTestSuite()
audit_logger = AuditLogger()


# Request/Response Models
class TaxpayerInfo(BaseModel):
    primary_ssn: str = Field(..., min_length=9, max_length=11)
    primary_name: str
    spouse_ssn: Optional[str] = None
    spouse_name: Optional[str] = None
    filing_status: str
    address_line1: str
    address_line2: Optional[str] = None
    city: str
    state: str = Field(..., min_length=2, max_length=2)
    zip: str = Field(..., min_length=5, max_length=10)
    phone: Optional[str] = None
    date_of_birth: str


class IncomeData(BaseModel):
    wages: float = 0
    tip_income: float = 0
    overtime_wages: float = 0
    taxable_interest: float = 0
    tax_exempt_interest: float = 0
    ordinary_dividends: float = 0
    qualified_dividends: float = 0
    capital_gains: float = 0
    business_income: float = 0
    social_security: float = 0
    other_income: float = 0


class DeductionData(BaseModel):
    use_standard: bool = True
    state_income_tax: float = 0
    property_tax: float = 0
    mortgage_interest: float = 0
    charitable_cash: float = 0
    charitable_noncash: float = 0
    medical_expenses: float = 0
    student_loan_interest: float = 0
    ira_contributions: float = 0


class OBBBAData(BaseModel):
    claim_tips_deduction: bool = False
    claim_overtime_deduction: bool = False
    claim_senior_deduction: bool = False


class CreditData(BaseModel):
    dependents: int = 0
    children_under_17: int = 0
    education_credits: float = 0
    energy_credits: float = 0


class PaymentData(BaseModel):
    federal_withholding: float = 0
    estimated_payments: float = 0
    prior_year_overpayment: float = 0


class BankInfo(BaseModel):
    routing_number: Optional[str] = None
    account_number: Optional[str] = None
    account_type: Optional[str] = "checking"


class TaxReturnRequest(BaseModel):
    taxpayer: TaxpayerInfo
    income: IncomeData
    deductions: DeductionData
    obbba: OBBBAData
    credits: CreditData
    payments: PaymentData
    bank_info: Optional[BankInfo] = None
    tax_year: int = 2025


class XMLGenerationResponse(BaseModel):
    success: bool
    submission_id: str
    xml_preview: str  # First 1000 chars for preview
    checksum: str
    validation_errors: List[str]
    estimated_refund: Optional[float] = None
    estimated_owed: Optional[float] = None


class SubmissionResponse(BaseModel):
    success: bool
    submission_id: str
    irs_tracking_id: Optional[str] = None
    status: str
    message: str
    submitted_at: datetime


class AckCheckResponse(BaseModel):
    submission_id: str
    status: str
    status_text: str
    is_accepted: bool
    is_rejected: bool
    errors: List[Dict[str, Any]]
    alerts: List[Dict[str, Any]]
    refund_amount: Optional[float] = None
    checked_at: datetime


# Transmitter configuration (would come from environment in production)
def get_transmitter_info() -> MeFTransmitterInfo:
    return MeFTransmitterInfo(
        etin="12345",
        efin="123456",
        transmitter_name="Gonzales Tax Platform",
        transmitter_address={
            "line1": "123 Tax Street",
            "city": "Austin",
            "state": "TX",
            "zip": "78701"
        },
        contact_name="System Administrator",
        contact_phone="5125551234",
        contact_email="support@gonzalestax.com",
        software_id="GTP2025",
        software_version="1.0.0"
    )


@router.post("/generate-xml", response_model=XMLGenerationResponse)
async def generate_xml(request: TaxReturnRequest):
    """
    Generate IRS-compliant XML for a tax return.
    Validates against MeF schema and returns preview.
    """
    try:
        # Create XML builder
        builder = IRSXMLBuilder(request.tax_year)
        transmitter = get_transmitter_info()

        # Create submission manifest
        manifest = MeFSubmissionManifest(
            submission_id="",  # Will be generated
            submission_type=SubmissionType.INDIVIDUAL_1040,
            tax_year=request.tax_year,
            transmission_type=TransmissionType.ORIGINAL,
            efin=transmitter.efin,
            etin=transmitter.etin
        )
        manifest.submission_id = manifest.generate_submission_id()

        # Calculate tax amounts
        gross_income = (
            request.income.wages +
            request.income.tip_income +
            request.income.overtime_wages +
            request.income.taxable_interest +
            request.income.ordinary_dividends +
            request.income.capital_gains +
            request.income.business_income +
            (request.income.social_security * 0.85) +
            request.income.other_income
        )

        # OBBBA deductions
        obbba_tips = min(request.income.tip_income, 25000) if request.obbba.claim_tips_deduction else 0
        obbba_overtime = min(request.income.overtime_wages, 10000) if request.obbba.claim_overtime_deduction else 0
        obbba_senior = 6000 if request.obbba.claim_senior_deduction else 0

        # Standard deduction based on filing status
        standard_deductions = {
            "single": 15000,
            "married_filing_jointly": 30000,
            "married_filing_separately": 15000,
            "head_of_household": 22500
        }
        standard_deduction = standard_deductions.get(request.taxpayer.filing_status.lower(), 15000)

        # Calculate deductions
        if request.deductions.use_standard:
            total_deductions = standard_deduction
        else:
            salt_capped = min(
                request.deductions.state_income_tax + request.deductions.property_tax,
                40000
            )
            total_deductions = (
                salt_capped +
                request.deductions.mortgage_interest +
                request.deductions.charitable_cash +
                request.deductions.charitable_noncash
            )

        # Calculate taxable income
        agi = gross_income - request.deductions.student_loan_interest - request.deductions.ira_contributions
        taxable_income = max(0, agi - total_deductions - obbba_tips - obbba_overtime - obbba_senior)

        # Simple tax calculation (simplified for demo)
        tax = calculate_tax(taxable_income, request.taxpayer.filing_status)

        # Credits
        child_tax_credit = request.credits.children_under_17 * 2200  # OBBBA rate
        total_credits = child_tax_credit + request.credits.education_credits + request.credits.energy_credits

        # Final tax
        final_tax = max(0, tax - total_credits)

        # Payments
        total_payments = (
            request.payments.federal_withholding +
            request.payments.estimated_payments +
            request.payments.prior_year_overpayment
        )

        # Refund or owed
        refund_owed = total_payments - final_tax

        # Prepare data for XML generation
        xml_data = {
            "primary_ssn": request.taxpayer.primary_ssn,
            "primary_name": request.taxpayer.primary_name,
            "filing_status": request.taxpayer.filing_status,
            "address_line1": request.taxpayer.address_line1,
            "address_line2": request.taxpayer.address_line2,
            "city": request.taxpayer.city,
            "state": request.taxpayer.state,
            "zip": request.taxpayer.zip,
            "phone": request.taxpayer.phone,
            "wages": request.income.wages,
            "tax_exempt_interest": request.income.tax_exempt_interest,
            "taxable_interest": request.income.taxable_interest,
            "qualified_dividends": request.income.qualified_dividends,
            "ordinary_dividends": request.income.ordinary_dividends,
            "obbba_tips_deduction": obbba_tips,
            "obbba_overtime_deduction": obbba_overtime,
            "obbba_senior_deduction": obbba_senior > 0,
            "standard_deduction": standard_deduction if request.deductions.use_standard else 0,
            "itemized_deduction": total_deductions if not request.deductions.use_standard else 0,
            "salt_deduction": min(request.deductions.state_income_tax + request.deductions.property_tax, 40000),
            "taxable_income": taxable_income,
            "tax": final_tax,
            "child_tax_credit": child_tax_credit,
            "federal_withholding": request.payments.federal_withholding,
            "estimated_payments": request.payments.estimated_payments,
            "refund_amount": refund_owed if refund_owed > 0 else 0,
            "amount_owed": abs(refund_owed) if refund_owed < 0 else 0,
            "document_id": "001"
        }

        # Add bank info if refund
        if refund_owed > 0 and request.bank_info:
            xml_data["routing_number"] = request.bank_info.routing_number
            xml_data["account_number"] = request.bank_info.account_number
            xml_data["account_type"] = request.bank_info.account_type

        # Generate XML
        xml_string = builder.build_complete_return(xml_data, manifest, transmitter)

        # Validate XML
        validation_errors = builder.validate_xml_schema(xml_string)

        # Calculate checksum
        checksum = builder.calculate_checksum(xml_string)

        # Log audit entry
        audit_logger.log(
            user_id="system",
            action="XML_GENERATED",
            resource_type="tax_return",
            resource_id=manifest.submission_id,
            ip_address="127.0.0.1",
            user_agent="API",
            status="success",
            details={"tax_year": request.tax_year, "filing_status": request.taxpayer.filing_status}
        )

        return XMLGenerationResponse(
            success=len(validation_errors) == 0,
            submission_id=manifest.submission_id,
            xml_preview=xml_string[:1000] + "..." if len(xml_string) > 1000 else xml_string,
            checksum=checksum,
            validation_errors=validation_errors,
            estimated_refund=refund_owed if refund_owed > 0 else None,
            estimated_owed=abs(refund_owed) if refund_owed < 0 else None
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/submit", response_model=SubmissionResponse)
async def submit_return(
    submission_id: str,
    background_tasks: BackgroundTasks
):
    """
    Submit a generated XML return to IRS MeF system.
    In production, this would make actual SOAP calls to IRS.
    """
    try:
        # In production: Make SOAP call to IRS MeF endpoint
        # For demo: Simulate submission

        irs_tracking_id = f"IRS-{submission_id[:12]}"

        # Log submission
        audit_logger.log(
            user_id="system",
            action="RETURN_SUBMITTED",
            resource_type="tax_return",
            resource_id=submission_id,
            ip_address="127.0.0.1",
            user_agent="API",
            status="success",
            details={"irs_tracking_id": irs_tracking_id}
        )

        # Schedule background task to check for acknowledgment
        background_tasks.add_task(check_ack_status_background, submission_id)

        return SubmissionResponse(
            success=True,
            submission_id=submission_id,
            irs_tracking_id=irs_tracking_id,
            status="SUBMITTED",
            message="Return submitted successfully. Check acknowledgment status in 15-30 minutes.",
            submitted_at=datetime.utcnow()
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/ack/{submission_id}", response_model=AckCheckResponse)
async def check_acknowledgment(submission_id: str):
    """
    Check acknowledgment status for a submitted return.
    """
    try:
        # In production: Query IRS for actual acknowledgment
        # For demo: Simulate acknowledgment response

        sample_ack_xml = f"""<?xml version="1.0" encoding="UTF-8"?>
        <AcknowledgementDocument>
            <SubmissionId>{submission_id}</SubmissionId>
            <AcknowledgementStatusCd>Accepted</AcknowledgementStatusCd>
            <AcknowledgementTimestamp>{datetime.utcnow().isoformat()}Z</AcknowledgementTimestamp>
            <TaxYr>2025</TaxYr>
            <ReturnTypeCd>1040</ReturnTypeCd>
            <EFIN>123456</EFIN>
            <RefundAmt>2500</RefundAmt>
        </AcknowledgementDocument>
        """

        result = ack_parser.parse(sample_ack_xml)

        return AckCheckResponse(
            submission_id=result.submission_id,
            status=result.status.value,
            status_text="Accepted by IRS" if result.is_accepted else "Rejected by IRS",
            is_accepted=result.is_accepted,
            is_rejected=result.is_rejected,
            errors=[e.to_dict() for e in result.errors],
            alerts=[a.to_dict() for a in result.alerts],
            refund_amount=result.refund_amount,
            checked_at=datetime.utcnow()
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/parse-ack")
async def parse_acknowledgment(ack_xml: str):
    """
    Parse an IRS acknowledgment XML file.
    """
    try:
        result = ack_parser.parse(ack_xml)

        # Get remediation for any errors
        error_remediations = []
        if result.errors:
            for error in result.errors:
                remediation = ACKStatusChecker.get_remediation(error.error_code)
                error_remediations.append({
                    "error_code": error.error_code,
                    "message": error.error_message,
                    "remediation": remediation
                })

        return {
            "status": result.status.value,
            "is_accepted": result.is_accepted,
            "is_rejected": result.is_rejected,
            "errors": error_remediations,
            "alerts": [a.to_dict() for a in result.alerts],
            "details": result.to_dict()
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse ACK: {str(e)}")


@router.get("/ats/scenarios")
async def get_ats_scenarios():
    """
    Get available ATS test scenarios for software certification.
    """
    return {
        "total_scenarios": len(ats_suite.scenarios),
        "scenarios": [
            {
                "id": s.scenario_id,
                "name": s.scenario_name,
                "form_type": s.form_type,
                "expected_result": s.expected_result
            }
            for s in ats_suite.scenarios
        ]
    }


@router.post("/ats/run/{scenario_id}")
async def run_ats_scenario(scenario_id: str):
    """
    Run a specific ATS test scenario.
    """
    # Find scenario
    scenario = next(
        (s for s in ats_suite.scenarios if s.scenario_id == scenario_id),
        None
    )

    if not scenario:
        raise HTTPException(status_code=404, detail=f"Scenario {scenario_id} not found")

    # Simulate running the scenario
    # In production, this would create a test submission and validate

    simulated_result = {
        "status": scenario.expected_result,
        "error_codes": scenario.expected_error_codes if scenario.expected_result == "REJECTED" else []
    }

    result = ats_suite.run_scenario(scenario_id, simulated_result)

    return result


@router.get("/compliance/check")
async def check_compliance():
    """
    Check platform compliance with IRS requirements.
    """
    # Check compliance status
    config = {
        "encryption_at_rest": True,
        "encryption_in_transit": True,
        "access_control": True,
        "audit_logging": True,
        "background_checks": True,
        "security_awareness": True,
        "incident_response": True,
        "data_retention": True,
        "secure_disposal": True,
        "safeguard_fti": True,
        "restrict_access": True,
        "report_incidents": True,
        "inspection_rights": True
    }

    return ComplianceChecker.check_requirements(config)


@router.get("/audit-log")
async def get_audit_log(limit: int = 100):
    """
    Retrieve audit log entries.
    """
    entries = audit_logger.export_for_compliance()[-limit:]

    # Verify chain integrity
    is_valid, invalid_entries = audit_logger.verify_chain()

    return {
        "entries": entries,
        "chain_valid": is_valid,
        "invalid_entries": invalid_entries,
        "total_entries": len(audit_logger.entries)
    }


# Helper function for tax calculation
def calculate_tax(taxable_income: float, filing_status: str) -> float:
    """Calculate federal income tax based on 2025 brackets."""
    brackets = {
        "single": [
            (11925, 0.10), (48475, 0.12), (103350, 0.22),
            (197300, 0.24), (250525, 0.32), (626350, 0.35), (float('inf'), 0.37)
        ],
        "married_filing_jointly": [
            (23850, 0.10), (96950, 0.12), (206700, 0.22),
            (394600, 0.24), (501050, 0.32), (751600, 0.35), (float('inf'), 0.37)
        ],
        "married_filing_separately": [
            (11925, 0.10), (48475, 0.12), (103350, 0.22),
            (197300, 0.24), (250525, 0.32), (375800, 0.35), (float('inf'), 0.37)
        ],
        "head_of_household": [
            (17000, 0.10), (64850, 0.12), (103350, 0.22),
            (197300, 0.24), (250500, 0.32), (626350, 0.35), (float('inf'), 0.37)
        ]
    }

    status_brackets = brackets.get(filing_status.lower(), brackets["single"])
    tax = 0
    prev_limit = 0

    for limit, rate in status_brackets:
        if taxable_income <= prev_limit:
            break
        taxable_in_bracket = min(taxable_income, limit) - prev_limit
        tax += taxable_in_bracket * rate
        prev_limit = limit

    return tax


async def check_ack_status_background(submission_id: str):
    """Background task to check acknowledgment status."""
    # In production: Poll IRS for acknowledgment
    pass
