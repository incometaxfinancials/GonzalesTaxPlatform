"""
GONZALES TAX PLATFORM - Tax Return Models
Agent Valentina - Backend/API Master

Core data models for tax returns with GAAP compliance and audit trails.
"""
from datetime import datetime, date
from decimal import Decimal, ROUND_HALF_UP
from typing import Optional, List, Dict, Any
from enum import Enum
from uuid import UUID, uuid4
from pydantic import BaseModel, Field, field_validator, model_validator


# ===========================================
# ENUMERATIONS
# ===========================================
class FilingStatus(str, Enum):
    SINGLE = "single"
    MARRIED_FILING_JOINTLY = "married_filing_jointly"
    MARRIED_FILING_SEPARATELY = "married_filing_separately"
    HEAD_OF_HOUSEHOLD = "head_of_household"
    QUALIFYING_WIDOW = "qualifying_widow"


class ReturnStatus(str, Enum):
    DRAFT = "draft"
    IN_PROGRESS = "in_progress"
    READY_TO_FILE = "ready_to_file"
    SUBMITTED = "submitted"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    AMENDED = "amended"


class ReturnType(str, Enum):
    FORM_1040 = "1040"
    FORM_1040_SR = "1040-SR"
    FORM_1040_NR = "1040-NR"
    FORM_1065 = "1065"
    FORM_1120 = "1120"
    FORM_1120_S = "1120-S"
    FORM_1041 = "1041"


class IncomeType(str, Enum):
    W2_WAGES = "w2_wages"
    SELF_EMPLOYMENT = "self_employment"
    INTEREST = "interest"
    DIVIDENDS = "dividends"
    CAPITAL_GAINS = "capital_gains"
    RENTAL = "rental"
    ROYALTIES = "royalties"
    TIPS = "tips"
    OVERTIME = "overtime"
    SOCIAL_SECURITY = "social_security"
    PENSION = "pension"
    UNEMPLOYMENT = "unemployment"
    OTHER = "other"


class DeductionType(str, Enum):
    STANDARD = "standard"
    ITEMIZED = "itemized"


# ===========================================
# GAAP-COMPLIANT DECIMAL HANDLING
# ===========================================
def gaap_round(amount: Decimal, precision: int = 2) -> Decimal:
    """GAAP-compliant rounding (banker's rounding / half-up)"""
    if amount is None:
        return Decimal("0.00")
    quantize_str = "0." + "0" * precision
    return amount.quantize(Decimal(quantize_str), rounding=ROUND_HALF_UP)


# ===========================================
# TAXPAYER INFORMATION
# ===========================================
class TaxpayerInfo(BaseModel):
    """Taxpayer personal information"""
    id: UUID = Field(default_factory=uuid4)
    first_name: str = Field(..., min_length=1, max_length=50)
    middle_name: Optional[str] = Field(None, max_length=50)
    last_name: str = Field(..., min_length=1, max_length=50)
    suffix: Optional[str] = Field(None, max_length=10)

    # SSN stored encrypted - only last 4 for display
    ssn_encrypted: Optional[bytes] = None
    ssn_last_four: Optional[str] = Field(None, pattern=r"^\d{4}$")

    date_of_birth: date
    phone: Optional[str] = Field(None, pattern=r"^\+?[\d\s\-\(\)]{10,20}$")
    email: Optional[str] = Field(None)

    # Address
    street_address: str = Field(..., max_length=100)
    apartment: Optional[str] = Field(None, max_length=20)
    city: str = Field(..., max_length=50)
    state: str = Field(..., min_length=2, max_length=2)
    zip_code: str = Field(..., pattern=r"^\d{5}(-\d{4})?$")

    # Additional info
    occupation: Optional[str] = Field(None, max_length=50)
    is_blind: bool = False
    is_deceased: bool = False
    deceased_date: Optional[date] = None

    @field_validator("state")
    @classmethod
    def validate_state(cls, v):
        valid_states = [
            "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
            "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
            "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
            "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
            "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
            "DC", "PR", "VI", "GU", "AS", "MP"
        ]
        if v.upper() not in valid_states:
            raise ValueError(f"Invalid state code: {v}")
        return v.upper()

    @property
    def full_name(self) -> str:
        parts = [self.first_name]
        if self.middle_name:
            parts.append(self.middle_name)
        parts.append(self.last_name)
        if self.suffix:
            parts.append(self.suffix)
        return " ".join(parts)

    @property
    def age_at_year_end(self) -> int:
        """Calculate age at end of tax year"""
        # Assuming current tax year - would be passed in actual implementation
        tax_year = 2025
        year_end = date(tax_year, 12, 31)
        age = year_end.year - self.date_of_birth.year
        if (year_end.month, year_end.day) < (self.date_of_birth.month, self.date_of_birth.day):
            age -= 1
        return age


# ===========================================
# DEPENDENT INFORMATION
# ===========================================
class Dependent(BaseModel):
    """Dependent information for tax return"""
    id: UUID = Field(default_factory=uuid4)
    first_name: str = Field(..., min_length=1, max_length=50)
    last_name: str = Field(..., min_length=1, max_length=50)
    ssn_encrypted: Optional[bytes] = None
    ssn_last_four: Optional[str] = Field(None, pattern=r"^\d{4}$")
    date_of_birth: date
    relationship: str = Field(..., max_length=30)
    months_lived_with_taxpayer: int = Field(..., ge=0, le=12)

    # Qualifying child/relative flags
    is_qualifying_child: bool = False
    is_qualifying_relative: bool = False
    qualifies_for_ctc: bool = False  # Child Tax Credit
    qualifies_for_odc: bool = False  # Other Dependent Credit
    has_itin: bool = False

    # Support information
    taxpayer_provided_support_percentage: Decimal = Field(default=Decimal("100.00"))

    @property
    def age_at_year_end(self) -> int:
        tax_year = 2025
        year_end = date(tax_year, 12, 31)
        age = year_end.year - self.date_of_birth.year
        if (year_end.month, year_end.day) < (self.date_of_birth.month, self.date_of_birth.day):
            age -= 1
        return age


# ===========================================
# INCOME MODELS
# ===========================================
class W2Income(BaseModel):
    """Form W-2 Wage and Tax Statement"""
    id: UUID = Field(default_factory=uuid4)
    employer_name: str = Field(..., max_length=100)
    employer_ein: str = Field(..., pattern=r"^\d{2}-\d{7}$")
    employer_address: Optional[str] = None

    # Box amounts (all GAAP-rounded)
    box_1_wages: Decimal = Field(default=Decimal("0.00"))
    box_2_federal_withheld: Decimal = Field(default=Decimal("0.00"))
    box_3_social_security_wages: Decimal = Field(default=Decimal("0.00"))
    box_4_social_security_withheld: Decimal = Field(default=Decimal("0.00"))
    box_5_medicare_wages: Decimal = Field(default=Decimal("0.00"))
    box_6_medicare_withheld: Decimal = Field(default=Decimal("0.00"))
    box_7_social_security_tips: Decimal = Field(default=Decimal("0.00"))
    box_8_allocated_tips: Decimal = Field(default=Decimal("0.00"))
    box_10_dependent_care_benefits: Decimal = Field(default=Decimal("0.00"))
    box_11_nonqualified_plans: Decimal = Field(default=Decimal("0.00"))
    box_12_codes: Dict[str, Decimal] = Field(default_factory=dict)
    box_13_statutory_employee: bool = False
    box_13_retirement_plan: bool = False
    box_13_third_party_sick_pay: bool = False

    # State information
    state_wages: Dict[str, Decimal] = Field(default_factory=dict)
    state_withheld: Dict[str, Decimal] = Field(default_factory=dict)
    local_wages: Dict[str, Decimal] = Field(default_factory=dict)
    local_withheld: Dict[str, Decimal] = Field(default_factory=dict)

    @field_validator("box_1_wages", "box_2_federal_withheld", "box_3_social_security_wages",
               "box_4_social_security_withheld", "box_5_medicare_wages", "box_6_medicare_withheld",
               mode="before")
    @classmethod
    def round_amounts(cls, v):
        if v is None:
            return Decimal("0.00")
        return gaap_round(Decimal(str(v)))


class Form1099(BaseModel):
    """Generic 1099 form model"""
    id: UUID = Field(default_factory=uuid4)
    form_type: str = Field(...)  # 1099-INT, 1099-DIV, 1099-NEC, etc.
    payer_name: str = Field(..., max_length=100)
    payer_tin: Optional[str] = None

    # Common amounts
    amount: Decimal = Field(default=Decimal("0.00"))
    federal_withheld: Decimal = Field(default=Decimal("0.00"))
    state_withheld: Decimal = Field(default=Decimal("0.00"))

    # Additional fields stored as JSON
    additional_fields: Dict[str, Any] = Field(default_factory=dict)

    @field_validator("amount", "federal_withheld", "state_withheld", mode="before")
    @classmethod
    def round_form1099_amounts(cls, v):
        return gaap_round(Decimal(str(v or 0)))


class SelfEmploymentIncome(BaseModel):
    """Schedule C Self-Employment Income"""
    id: UUID = Field(default_factory=uuid4)
    business_name: Optional[str] = None
    business_ein: Optional[str] = None
    principal_business_code: str = Field(...)  # NAICS code
    business_address: Optional[str] = None
    accounting_method: str = Field(default="cash")  # cash or accrual

    # Income
    gross_receipts: Decimal = Field(default=Decimal("0.00"))
    returns_and_allowances: Decimal = Field(default=Decimal("0.00"))
    other_income: Decimal = Field(default=Decimal("0.00"))
    cost_of_goods_sold: Decimal = Field(default=Decimal("0.00"))

    # Expenses (common categories)
    advertising: Decimal = Field(default=Decimal("0.00"))
    car_and_truck: Decimal = Field(default=Decimal("0.00"))
    commissions: Decimal = Field(default=Decimal("0.00"))
    contract_labor: Decimal = Field(default=Decimal("0.00"))
    depreciation: Decimal = Field(default=Decimal("0.00"))
    insurance: Decimal = Field(default=Decimal("0.00"))
    interest_mortgage: Decimal = Field(default=Decimal("0.00"))
    interest_other: Decimal = Field(default=Decimal("0.00"))
    legal_professional: Decimal = Field(default=Decimal("0.00"))
    office_expense: Decimal = Field(default=Decimal("0.00"))
    pension_profit_sharing: Decimal = Field(default=Decimal("0.00"))
    rent_lease_vehicles: Decimal = Field(default=Decimal("0.00"))
    rent_lease_equipment: Decimal = Field(default=Decimal("0.00"))
    repairs_maintenance: Decimal = Field(default=Decimal("0.00"))
    supplies: Decimal = Field(default=Decimal("0.00"))
    taxes_licenses: Decimal = Field(default=Decimal("0.00"))
    travel: Decimal = Field(default=Decimal("0.00"))
    meals: Decimal = Field(default=Decimal("0.00"))  # 50% deductible
    utilities: Decimal = Field(default=Decimal("0.00"))
    wages: Decimal = Field(default=Decimal("0.00"))
    other_expenses: Decimal = Field(default=Decimal("0.00"))

    # Home office
    home_office_deduction: Decimal = Field(default=Decimal("0.00"))
    home_office_square_footage: int = Field(default=0)

    @property
    def gross_income(self) -> Decimal:
        return gaap_round(
            self.gross_receipts - self.returns_and_allowances +
            self.other_income - self.cost_of_goods_sold
        )

    @property
    def total_expenses(self) -> Decimal:
        return gaap_round(
            self.advertising + self.car_and_truck + self.commissions +
            self.contract_labor + self.depreciation + self.insurance +
            self.interest_mortgage + self.interest_other + self.legal_professional +
            self.office_expense + self.pension_profit_sharing +
            self.rent_lease_vehicles + self.rent_lease_equipment +
            self.repairs_maintenance + self.supplies + self.taxes_licenses +
            self.travel + (self.meals * Decimal("0.50")) + self.utilities +
            self.wages + self.other_expenses + self.home_office_deduction
        )

    @property
    def net_profit(self) -> Decimal:
        return gaap_round(self.gross_income - self.total_expenses)


# ===========================================
# DEDUCTIONS
# ===========================================
class ItemizedDeductions(BaseModel):
    """Schedule A Itemized Deductions"""
    id: UUID = Field(default_factory=uuid4)

    # Medical and Dental (subject to 7.5% AGI floor)
    medical_dental_expenses: Decimal = Field(default=Decimal("0.00"))

    # Taxes Paid (SALT - capped at $40,000 under OBBBA)
    state_local_income_tax: Decimal = Field(default=Decimal("0.00"))
    state_local_sales_tax: Decimal = Field(default=Decimal("0.00"))
    real_estate_taxes: Decimal = Field(default=Decimal("0.00"))
    personal_property_taxes: Decimal = Field(default=Decimal("0.00"))
    other_taxes: Decimal = Field(default=Decimal("0.00"))

    # Interest Paid
    mortgage_interest: Decimal = Field(default=Decimal("0.00"))
    mortgage_points: Decimal = Field(default=Decimal("0.00"))
    investment_interest: Decimal = Field(default=Decimal("0.00"))
    auto_loan_interest: Decimal = Field(default=Decimal("0.00"))  # OBBBA provision

    # Gifts to Charity
    cash_contributions: Decimal = Field(default=Decimal("0.00"))
    noncash_contributions: Decimal = Field(default=Decimal("0.00"))
    carryover_contributions: Decimal = Field(default=Decimal("0.00"))

    # Casualty and Theft Losses (federally declared disasters only)
    casualty_theft_losses: Decimal = Field(default=Decimal("0.00"))

    # Other Itemized Deductions
    gambling_losses: Decimal = Field(default=Decimal("0.00"))
    other_deductions: Decimal = Field(default=Decimal("0.00"))

    @property
    def total_salt(self) -> Decimal:
        """Total state and local taxes (subject to cap)"""
        total = (
            self.state_local_income_tax + self.state_local_sales_tax +
            self.real_estate_taxes + self.personal_property_taxes
        )
        # OBBBA SALT cap of $40,000
        return min(gaap_round(total), Decimal("40000.00"))

    @property
    def total_interest(self) -> Decimal:
        return gaap_round(
            self.mortgage_interest + self.mortgage_points +
            self.investment_interest +
            min(self.auto_loan_interest, Decimal("10000.00"))  # OBBBA cap
        )

    @property
    def total_charitable(self) -> Decimal:
        return gaap_round(
            self.cash_contributions + self.noncash_contributions +
            self.carryover_contributions
        )


# ===========================================
# CREDITS
# ===========================================
class TaxCredits(BaseModel):
    """Tax credits with OBBBA provisions"""
    id: UUID = Field(default_factory=uuid4)

    # Child Tax Credit (OBBBA: $2,200 per child, $1,700 refundable)
    child_tax_credit: Decimal = Field(default=Decimal("0.00"))
    child_tax_credit_refundable: Decimal = Field(default=Decimal("0.00"))

    # Other Dependent Credit ($500 per dependent)
    other_dependent_credit: Decimal = Field(default=Decimal("0.00"))

    # Earned Income Credit
    earned_income_credit: Decimal = Field(default=Decimal("0.00"))

    # Education Credits
    american_opportunity_credit: Decimal = Field(default=Decimal("0.00"))
    lifetime_learning_credit: Decimal = Field(default=Decimal("0.00"))

    # Retirement Savings Credit
    retirement_savings_credit: Decimal = Field(default=Decimal("0.00"))

    # Child and Dependent Care Credit
    child_dependent_care_credit: Decimal = Field(default=Decimal("0.00"))

    # Other Credits
    foreign_tax_credit: Decimal = Field(default=Decimal("0.00"))
    residential_energy_credit: Decimal = Field(default=Decimal("0.00"))
    electric_vehicle_credit: Decimal = Field(default=Decimal("0.00"))
    other_credits: Decimal = Field(default=Decimal("0.00"))

    @property
    def total_nonrefundable(self) -> Decimal:
        return gaap_round(
            self.child_tax_credit + self.other_dependent_credit +
            self.american_opportunity_credit + self.lifetime_learning_credit +
            self.retirement_savings_credit + self.child_dependent_care_credit +
            self.foreign_tax_credit + self.residential_energy_credit +
            self.electric_vehicle_credit + self.other_credits
        )

    @property
    def total_refundable(self) -> Decimal:
        return gaap_round(
            self.child_tax_credit_refundable + self.earned_income_credit +
            (self.american_opportunity_credit * Decimal("0.40"))  # 40% refundable
        )


# ===========================================
# MAIN TAX RETURN MODEL
# ===========================================
class TaxReturn(BaseModel):
    """Complete tax return with all components"""
    id: UUID = Field(default_factory=uuid4)
    user_id: UUID = Field(...)
    tax_year: int = Field(..., ge=2020, le=2030)
    return_type: ReturnType = ReturnType.FORM_1040
    status: ReturnStatus = ReturnStatus.DRAFT

    # Filing Information
    filing_status: FilingStatus = FilingStatus.SINGLE

    # Taxpayer Information
    taxpayer: TaxpayerInfo
    spouse: Optional[TaxpayerInfo] = None
    dependents: List[Dependent] = Field(default_factory=list)

    # Income Sources
    w2_income: List[W2Income] = Field(default_factory=list)
    form_1099s: List[Form1099] = Field(default_factory=list)
    self_employment: List[SelfEmploymentIncome] = Field(default_factory=list)

    # Other income
    tip_income: Decimal = Field(default=Decimal("0.00"))  # OBBBA: No Tax on Tips
    overtime_income: Decimal = Field(default=Decimal("0.00"))  # OBBBA: No Tax on Overtime
    social_security_income: Decimal = Field(default=Decimal("0.00"))
    capital_gains_short: Decimal = Field(default=Decimal("0.00"))
    capital_gains_long: Decimal = Field(default=Decimal("0.00"))
    rental_income: Decimal = Field(default=Decimal("0.00"))
    other_income: Decimal = Field(default=Decimal("0.00"))

    # Adjustments to Income
    educator_expenses: Decimal = Field(default=Decimal("0.00"))
    hsa_deduction: Decimal = Field(default=Decimal("0.00"))
    self_employment_tax_deduction: Decimal = Field(default=Decimal("0.00"))
    self_employment_health_insurance: Decimal = Field(default=Decimal("0.00"))
    sep_simple_qualified: Decimal = Field(default=Decimal("0.00"))
    student_loan_interest: Decimal = Field(default=Decimal("0.00"))
    ira_deduction: Decimal = Field(default=Decimal("0.00"))

    # Deductions
    deduction_type: DeductionType = DeductionType.STANDARD
    itemized_deductions: Optional[ItemizedDeductions] = None

    # Credits
    credits: TaxCredits = Field(default_factory=TaxCredits)

    # Payments and Withholding
    federal_withheld: Decimal = Field(default=Decimal("0.00"))
    estimated_payments: Decimal = Field(default=Decimal("0.00"))
    amount_paid_with_extension: Decimal = Field(default=Decimal("0.00"))

    # Calculated Fields (populated by tax engine)
    gross_income: Decimal = Field(default=Decimal("0.00"))
    adjusted_gross_income: Decimal = Field(default=Decimal("0.00"))
    taxable_income: Decimal = Field(default=Decimal("0.00"))
    tax_liability: Decimal = Field(default=Decimal("0.00"))
    total_credits: Decimal = Field(default=Decimal("0.00"))
    total_payments: Decimal = Field(default=Decimal("0.00"))
    amount_owed: Decimal = Field(default=Decimal("0.00"))
    refund_amount: Decimal = Field(default=Decimal("0.00"))

    # Refund/Payment Options
    refund_direct_deposit: bool = True
    bank_routing_number: Optional[str] = None
    bank_account_number_encrypted: Optional[bytes] = None
    bank_account_type: Optional[str] = None  # checking or savings

    # E-file Information
    efile_submission_id: Optional[str] = None
    efile_timestamp: Optional[datetime] = None
    efile_status: Optional[str] = None
    efile_acknowledgement: Optional[str] = None

    # Audit Trail
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    submitted_at: Optional[datetime] = None
    completed_by: Optional[str] = None  # User or preparer ID

    class Config:
        json_encoders = {
            Decimal: lambda v: str(v),
            datetime: lambda v: v.isoformat(),
            UUID: lambda v: str(v),
        }

    @property
    def qualifying_children_count(self) -> int:
        """Count of children qualifying for CTC"""
        return sum(1 for d in self.dependents if d.qualifies_for_ctc)

    @property
    def other_dependents_count(self) -> int:
        """Count of dependents qualifying for ODC"""
        return sum(1 for d in self.dependents if d.qualifies_for_odc)

    @property
    def is_senior(self) -> bool:
        """Check if taxpayer qualifies for senior deduction (65+)"""
        return self.taxpayer.age_at_year_end >= 65

    @property
    def total_w2_wages(self) -> Decimal:
        """Sum of all W-2 wages"""
        return gaap_round(sum(w2.box_1_wages for w2 in self.w2_income))

    @property
    def total_federal_withheld(self) -> Decimal:
        """Sum of all federal withholding"""
        w2_withheld = sum(w2.box_2_federal_withheld for w2 in self.w2_income)
        f1099_withheld = sum(f.federal_withheld for f in self.form_1099s)
        return gaap_round(w2_withheld + f1099_withheld)
