"""
GONZALES TAX PLATFORM - AI Deduction Optimizer
Agent Lliset - AI Tax Intelligence

AI-powered system to identify missed deductions and optimize tax returns.
Analyzes expenses, income patterns, and tax situations to maximize savings.
"""
from decimal import Decimal, ROUND_HALF_UP
from typing import List, Dict, Optional, Tuple, Any
from dataclasses import dataclass, field
from enum import Enum
from datetime import date
import re

from ..models.tax_return import TaxReturn, FilingStatus, gaap_round
from ..calculations.tax_engine import TaxEngine


# ===========================================
# DEDUCTION CATEGORIES
# ===========================================
class DeductionCategory(str, Enum):
    # Business Expenses
    HOME_OFFICE = "home_office"
    VEHICLE_MILEAGE = "vehicle_mileage"
    BUSINESS_TRAVEL = "business_travel"
    PROFESSIONAL_DEVELOPMENT = "professional_development"
    EQUIPMENT_DEPRECIATION = "equipment_depreciation"
    SOFTWARE_SUBSCRIPTIONS = "software_subscriptions"
    PROFESSIONAL_SERVICES = "professional_services"
    MARKETING_ADVERTISING = "marketing_advertising"
    SUPPLIES_MATERIALS = "supplies_materials"
    BUSINESS_INSURANCE = "business_insurance"
    BUSINESS_MEALS = "business_meals"

    # Above-the-Line Deductions
    HSA_CONTRIBUTION = "hsa_contribution"
    RETIREMENT_CONTRIBUTION = "retirement_contribution"
    STUDENT_LOAN_INTEREST = "student_loan_interest"
    EDUCATOR_EXPENSES = "educator_expenses"
    SELF_EMPLOYMENT_TAX = "self_employment_tax"
    HEALTH_INSURANCE = "health_insurance"

    # Itemized Deductions
    CHARITABLE_CASH = "charitable_cash"
    CHARITABLE_NONCASH = "charitable_noncash"
    CHARITABLE_MILEAGE = "charitable_mileage"
    MEDICAL_EXPENSES = "medical_expenses"
    MORTGAGE_INTEREST = "mortgage_interest"
    PROPERTY_TAXES = "property_taxes"
    STATE_INCOME_TAX = "state_income_tax"

    # Credits
    CHILD_TAX_CREDIT = "child_tax_credit"
    EARNED_INCOME_CREDIT = "earned_income_credit"
    EDUCATION_CREDITS = "education_credits"
    RETIREMENT_SAVINGS_CREDIT = "retirement_savings_credit"
    CHILD_CARE_CREDIT = "child_care_credit"
    ENERGY_CREDITS = "energy_credits"

    # OBBBA Provisions
    TIPS_DEDUCTION = "tips_deduction"
    OVERTIME_DEDUCTION = "overtime_deduction"
    AUTO_LOAN_INTEREST = "auto_loan_interest"
    SENIOR_DEDUCTION = "senior_deduction"


class ConfidenceLevel(str, Enum):
    HIGH = "high"      # >90% confident
    MEDIUM = "medium"  # 70-90% confident
    LOW = "low"        # <70% confident


@dataclass
class DeductionSuggestion:
    """A suggested deduction with details"""
    category: DeductionCategory
    description: str
    estimated_amount: Decimal
    tax_savings: Decimal
    confidence: ConfidenceLevel
    requirements: List[str]
    documentation_needed: List[str]
    irs_reference: str
    priority: int  # 1-10, higher = more important


@dataclass
class OptimizationResult:
    """Complete optimization analysis"""
    current_refund: Decimal
    optimized_refund: Decimal
    potential_savings: Decimal
    suggestions: List[DeductionSuggestion]
    warnings: List[str]
    compliance_notes: List[str]
    audit_risk_score: int  # 1-100


# ===========================================
# DEDUCTION KNOWLEDGE BASE
# ===========================================
DEDUCTION_RULES = {
    DeductionCategory.HOME_OFFICE: {
        "description": "Home Office Deduction",
        "eligibility": [
            "Regular and exclusive business use",
            "Principal place of business",
            "Self-employed or employer requires home office"
        ],
        "calculation_methods": {
            "simplified": {"rate_per_sqft": Decimal("5.00"), "max_sqft": 300},
            "actual": ["mortgage_interest", "utilities", "repairs", "insurance", "depreciation"]
        },
        "max_deduction": Decimal("1500.00"),  # Simplified method
        "irs_form": "Form 8829",
        "irs_reference": "Publication 587"
    },
    DeductionCategory.VEHICLE_MILEAGE: {
        "description": "Business Mileage Deduction",
        "rates_2025": {
            "business": Decimal("0.70"),  # per mile
            "medical": Decimal("0.22"),
            "charitable": Decimal("0.14")
        },
        "eligibility": ["Business purpose documentation", "Mileage log required"],
        "irs_reference": "Publication 463"
    },
    DeductionCategory.HSA_CONTRIBUTION: {
        "description": "Health Savings Account Contribution",
        "limits_2025": {
            "individual": Decimal("4300"),
            "family": Decimal("8550"),
            "catch_up_55": Decimal("1000")
        },
        "eligibility": ["High-deductible health plan (HDHP) coverage"],
        "irs_reference": "Publication 969"
    },
    DeductionCategory.RETIREMENT_CONTRIBUTION: {
        "description": "Retirement Account Contribution",
        "limits_2025": {
            "401k": Decimal("23500"),
            "401k_catch_up_50": Decimal("7500"),
            "ira": Decimal("7000"),
            "ira_catch_up_50": Decimal("1000"),
            "sep_ira": Decimal("69000"),
            "simple_ira": Decimal("16500")
        },
        "irs_reference": "Publication 590-A"
    },
    DeductionCategory.CHARITABLE_CASH: {
        "description": "Cash Charitable Contributions",
        "limit": "60% of AGI",
        "documentation": ["Written acknowledgment for $250+", "Bank record or receipt"],
        "irs_reference": "Publication 526"
    },
    DeductionCategory.TIPS_DEDUCTION: {
        "description": "No Tax on Tips (OBBBA)",
        "max_deduction": Decimal("25000"),
        "phaseout_single": Decimal("160000"),
        "phaseout_joint": Decimal("320000"),
        "eligibility": ["Tips received as employee", "Income under phaseout threshold"],
        "irs_reference": "OBBBA Section XXX"
    },
    DeductionCategory.OVERTIME_DEDUCTION: {
        "description": "No Tax on Overtime (OBBBA)",
        "max_deduction_hourly": Decimal("10000"),
        "max_deduction_salary": Decimal("25000"),
        "salary_threshold": Decimal("100000"),
        "eligibility": ["Overtime pay from employment", "Total salary under $100,000"],
        "irs_reference": "OBBBA Section XXX"
    },
}

# ===========================================
# EXPENSE PATTERN RECOGNITION
# ===========================================
EXPENSE_PATTERNS = {
    # Software & Technology
    r"(?i)(adobe|microsoft|google|zoom|slack|dropbox|canva|hubspot)": {
        "category": DeductionCategory.SOFTWARE_SUBSCRIPTIONS,
        "deductible_pct": Decimal("100") if "business" else Decimal("0")
    },
    r"(?i)(quickbooks|xero|freshbooks|wave)": {
        "category": DeductionCategory.SOFTWARE_SUBSCRIPTIONS,
        "deductible_pct": Decimal("100"),
        "confidence": ConfidenceLevel.HIGH
    },
    # Professional Services
    r"(?i)(attorney|lawyer|legal|accountant|cpa|bookkeeper)": {
        "category": DeductionCategory.PROFESSIONAL_SERVICES,
        "deductible_pct": Decimal("100")
    },
    # Business Travel
    r"(?i)(airline|delta|united|american|southwest|hotel|marriott|hilton|airbnb)": {
        "category": DeductionCategory.BUSINESS_TRAVEL,
        "deductible_pct": Decimal("100"),
        "requires_documentation": True
    },
    # Charitable
    r"(?i)(red cross|salvation army|united way|habitat|goodwill|church|synagogue|mosque|temple)": {
        "category": DeductionCategory.CHARITABLE_CASH,
        "deductible_pct": Decimal("100")
    },
    # Medical
    r"(?i)(pharmacy|cvs|walgreens|hospital|medical|doctor|dental|vision|optometry)": {
        "category": DeductionCategory.MEDICAL_EXPENSES,
        "deductible_pct": Decimal("100"),
        "note": "Subject to 7.5% AGI floor"
    },
    # Education
    r"(?i)(udemy|coursera|linkedin learning|skillshare|conference|seminar|workshop)": {
        "category": DeductionCategory.PROFESSIONAL_DEVELOPMENT,
        "deductible_pct": Decimal("100"),
        "requires_business_purpose": True
    },
}


# ===========================================
# AI DEDUCTION OPTIMIZER
# ===========================================
class DeductionOptimizer:
    """
    AI-powered deduction optimizer for maximizing tax savings.
    Analyzes tax returns and transactions to find missed deductions.
    """

    def __init__(self, tax_year: int = 2025):
        self.tax_year = tax_year
        self.tax_engine = TaxEngine(tax_year)

    def analyze_return(self, tax_return: TaxReturn) -> OptimizationResult:
        """
        Comprehensive analysis of tax return for optimization opportunities.
        """
        suggestions = []
        warnings = []
        compliance_notes = []

        # Calculate current tax position
        current_results = self.tax_engine.calculate_final_tax(tax_return)
        current_refund = current_results["refund_amount"]

        # Run all analyzers
        suggestions.extend(self._analyze_above_the_line(tax_return))
        suggestions.extend(self._analyze_business_deductions(tax_return))
        suggestions.extend(self._analyze_itemized_vs_standard(tax_return))
        suggestions.extend(self._analyze_credits(tax_return))
        suggestions.extend(self._analyze_obbba_provisions(tax_return))
        suggestions.extend(self._analyze_retirement_opportunities(tax_return))

        # Sort by potential savings
        suggestions.sort(key=lambda x: x.tax_savings, reverse=True)

        # Calculate potential optimized refund
        total_potential_savings = sum(s.tax_savings for s in suggestions)
        optimized_refund = current_refund + total_potential_savings

        # Calculate audit risk
        audit_risk = self._calculate_audit_risk(tax_return, suggestions)

        # Add compliance warnings
        warnings.extend(self._generate_warnings(tax_return, suggestions))
        compliance_notes.extend(self._generate_compliance_notes(suggestions))

        return OptimizationResult(
            current_refund=current_refund,
            optimized_refund=optimized_refund,
            potential_savings=total_potential_savings,
            suggestions=suggestions,
            warnings=warnings,
            compliance_notes=compliance_notes,
            audit_risk_score=audit_risk
        )

    # ===========================================
    # ANALYZERS
    # ===========================================
    def _analyze_above_the_line(self, tax_return: TaxReturn) -> List[DeductionSuggestion]:
        """Analyze above-the-line deduction opportunities"""
        suggestions = []
        agi = self.tax_engine.calculate_agi(tax_return)

        # HSA Contribution Check
        if tax_return.hsa_deduction < DEDUCTION_RULES[DeductionCategory.HSA_CONTRIBUTION]["limits_2025"]["family"]:
            potential = DEDUCTION_RULES[DeductionCategory.HSA_CONTRIBUTION]["limits_2025"]["family"] - tax_return.hsa_deduction

            if tax_return.taxpayer.age_at_year_end >= 55:
                potential += DEDUCTION_RULES[DeductionCategory.HSA_CONTRIBUTION]["limits_2025"]["catch_up_55"]

            tax_savings = self._estimate_tax_savings(potential, tax_return.filing_status, agi)

            suggestions.append(DeductionSuggestion(
                category=DeductionCategory.HSA_CONTRIBUTION,
                description="You may be able to contribute more to your HSA",
                estimated_amount=potential,
                tax_savings=tax_savings,
                confidence=ConfidenceLevel.MEDIUM,
                requirements=["Must have HDHP coverage", "Must not be on Medicare"],
                documentation_needed=["Form 5498-SA", "HDHP documentation"],
                irs_reference="Publication 969",
                priority=8
            ))

        # Student Loan Interest
        if tax_return.student_loan_interest < Decimal("2500") and agi < Decimal("90000"):
            suggestions.append(DeductionSuggestion(
                category=DeductionCategory.STUDENT_LOAN_INTEREST,
                description="Check if you have student loan interest to deduct (up to $2,500)",
                estimated_amount=Decimal("2500") - tax_return.student_loan_interest,
                tax_savings=self._estimate_tax_savings(
                    Decimal("2500") - tax_return.student_loan_interest,
                    tax_return.filing_status, agi
                ),
                confidence=ConfidenceLevel.LOW,
                requirements=["Legally obligated to pay interest", "Filing status not MFS"],
                documentation_needed=["Form 1098-E"],
                irs_reference="Publication 970",
                priority=5
            ))

        # Educator Expenses
        if any("teacher" in (tax_return.taxpayer.occupation or "").lower()
               for _ in [1]) and tax_return.educator_expenses < Decimal("300"):
            suggestions.append(DeductionSuggestion(
                category=DeductionCategory.EDUCATOR_EXPENSES,
                description="As an educator, you can deduct up to $300 for classroom supplies",
                estimated_amount=Decimal("300") - tax_return.educator_expenses,
                tax_savings=self._estimate_tax_savings(
                    Decimal("300") - tax_return.educator_expenses,
                    tax_return.filing_status, agi
                ),
                confidence=ConfidenceLevel.HIGH,
                requirements=["K-12 teacher, instructor, counselor, principal, or aide"],
                documentation_needed=["Receipts for supplies"],
                irs_reference="Publication 17",
                priority=4
            ))

        return suggestions

    def _analyze_business_deductions(self, tax_return: TaxReturn) -> List[DeductionSuggestion]:
        """Analyze business deduction opportunities for self-employed"""
        suggestions = []

        if not tax_return.self_employment:
            return suggestions

        agi = self.tax_engine.calculate_agi(tax_return)

        for se in tax_return.self_employment:
            # Home Office Deduction
            if se.home_office_deduction == Decimal("0"):
                simplified_max = DEDUCTION_RULES[DeductionCategory.HOME_OFFICE]["max_deduction"]
                suggestions.append(DeductionSuggestion(
                    category=DeductionCategory.HOME_OFFICE,
                    description="Consider the home office deduction if you work from home",
                    estimated_amount=simplified_max,
                    tax_savings=self._estimate_tax_savings(simplified_max, tax_return.filing_status, agi),
                    confidence=ConfidenceLevel.MEDIUM,
                    requirements=DEDUCTION_RULES[DeductionCategory.HOME_OFFICE]["eligibility"],
                    documentation_needed=["Square footage measurement", "Photo of dedicated workspace"],
                    irs_reference="Publication 587",
                    priority=7
                ))

            # Vehicle/Mileage Deduction
            if se.car_and_truck == Decimal("0"):
                # Estimate based on average business mileage
                estimated_miles = Decimal("5000")  # Conservative estimate
                mileage_rate = DEDUCTION_RULES[DeductionCategory.VEHICLE_MILEAGE]["rates_2025"]["business"]
                potential = estimated_miles * mileage_rate

                suggestions.append(DeductionSuggestion(
                    category=DeductionCategory.VEHICLE_MILEAGE,
                    description="Track business mileage for deduction",
                    estimated_amount=potential,
                    tax_savings=self._estimate_tax_savings(potential, tax_return.filing_status, agi),
                    confidence=ConfidenceLevel.LOW,
                    requirements=["Business purpose for travel", "Mileage log required"],
                    documentation_needed=["Mileage log with dates, destinations, business purpose"],
                    irs_reference="Publication 463",
                    priority=6
                ))

            # Health Insurance Deduction
            if tax_return.self_employment_health_insurance == Decimal("0"):
                # Average health insurance premium estimate
                estimated_premium = Decimal("7000")  # Reasonable estimate
                suggestions.append(DeductionSuggestion(
                    category=DeductionCategory.HEALTH_INSURANCE,
                    description="Self-employed health insurance premiums are deductible",
                    estimated_amount=estimated_premium,
                    tax_savings=self._estimate_tax_savings(estimated_premium, tax_return.filing_status, agi),
                    confidence=ConfidenceLevel.MEDIUM,
                    requirements=["Self-employed", "Not eligible for employer-sponsored plan"],
                    documentation_needed=["Health insurance premium statements"],
                    irs_reference="Publication 535",
                    priority=8
                ))

        return suggestions

    def _analyze_itemized_vs_standard(self, tax_return: TaxReturn) -> List[DeductionSuggestion]:
        """Compare itemized vs standard deduction"""
        suggestions = []

        standard_deduction = self.tax_engine._calculate_standard_deduction(tax_return)

        if tax_return.itemized_deductions:
            agi = self.tax_engine.calculate_agi(tax_return)
            itemized_total = self.tax_engine._calculate_itemized_deductions(
                tax_return.itemized_deductions, agi
            )

            # If close to standard, suggest potential itemized deductions
            if itemized_total < standard_deduction:
                gap = standard_deduction - itemized_total
                suggestions.append(DeductionSuggestion(
                    category=DeductionCategory.CHARITABLE_CASH,
                    description=f"You're ${gap:.2f} away from benefiting from itemizing. "
                               "Consider bunching charitable contributions.",
                    estimated_amount=gap,
                    tax_savings=self._estimate_tax_savings(gap, tax_return.filing_status, agi),
                    confidence=ConfidenceLevel.MEDIUM,
                    requirements=["Charitable contributions to qualified organizations"],
                    documentation_needed=["Donation receipts", "Written acknowledgment for $250+"],
                    irs_reference="Publication 526",
                    priority=6
                ))

        return suggestions

    def _analyze_credits(self, tax_return: TaxReturn) -> List[DeductionSuggestion]:
        """Analyze tax credit opportunities"""
        suggestions = []
        agi = self.tax_engine.calculate_agi(tax_return)

        # Retirement Savings Credit (Saver's Credit)
        if agi < Decimal("76500") and tax_return.credits.retirement_savings_credit == Decimal("0"):
            max_credit = Decimal("2000") if tax_return.filing_status == FilingStatus.MARRIED_FILING_JOINTLY else Decimal("1000")

            suggestions.append(DeductionSuggestion(
                category=DeductionCategory.RETIREMENT_SAVINGS_CREDIT,
                description="You may qualify for the Saver's Credit for retirement contributions",
                estimated_amount=max_credit,
                tax_savings=max_credit,  # Credits are dollar-for-dollar
                confidence=ConfidenceLevel.MEDIUM,
                requirements=["AGI under threshold", "Not a full-time student", "Not claimed as dependent"],
                documentation_needed=["401(k) or IRA contribution statements"],
                irs_reference="Form 8880",
                priority=9
            ))

        # Child and Dependent Care Credit
        if tax_return.qualifying_children_count > 0 and tax_return.credits.child_dependent_care_credit == Decimal("0"):
            max_expenses = Decimal("3000") if tax_return.qualifying_children_count == 1 else Decimal("6000")
            max_credit = max_expenses * Decimal("0.35")  # Max 35% credit rate

            suggestions.append(DeductionSuggestion(
                category=DeductionCategory.CHILD_CARE_CREDIT,
                description="You may qualify for the Child and Dependent Care Credit",
                estimated_amount=max_credit,
                tax_savings=max_credit,
                confidence=ConfidenceLevel.MEDIUM,
                requirements=["Work-related child care expenses", "Child under 13"],
                documentation_needed=["Care provider information", "Expenses paid"],
                irs_reference="Form 2441",
                priority=8
            ))

        # Energy Credits
        if tax_return.credits.residential_energy_credit == Decimal("0"):
            suggestions.append(DeductionSuggestion(
                category=DeductionCategory.ENERGY_CREDITS,
                description="Check if you made energy-efficient home improvements",
                estimated_amount=Decimal("3200"),  # Max credit
                tax_savings=Decimal("3200"),
                confidence=ConfidenceLevel.LOW,
                requirements=["Qualified energy property installed", "Primary residence"],
                documentation_needed=["Manufacturer certification", "Installation receipts"],
                irs_reference="Form 5695",
                priority=5
            ))

        return suggestions

    def _analyze_obbba_provisions(self, tax_return: TaxReturn) -> List[DeductionSuggestion]:
        """Analyze OBBBA-specific deduction opportunities"""
        suggestions = []
        agi = self.tax_engine.calculate_agi(tax_return)

        # Tips Deduction
        if tax_return.tip_income > 0:
            tips_deduction = self.tax_engine._calculate_tips_deduction(
                tax_return.tip_income, agi, tax_return.filing_status
            )
            if tips_deduction > 0:
                suggestions.append(DeductionSuggestion(
                    category=DeductionCategory.TIPS_DEDUCTION,
                    description=f"OBBBA No Tax on Tips: Deduct up to ${tips_deduction:.2f}",
                    estimated_amount=tips_deduction,
                    tax_savings=self._estimate_tax_savings(tips_deduction, tax_return.filing_status, agi),
                    confidence=ConfidenceLevel.HIGH,
                    requirements=["Tips received as employee", "Income under phaseout"],
                    documentation_needed=["Tip records", "W-2 showing tips"],
                    irs_reference="OBBBA - No Tax on Tips",
                    priority=10
                ))

        # Overtime Deduction
        if tax_return.overtime_income > 0:
            overtime_deduction = self.tax_engine._calculate_overtime_deduction(
                tax_return.overtime_income, tax_return.total_w2_wages, tax_return.filing_status
            )
            if overtime_deduction > 0:
                suggestions.append(DeductionSuggestion(
                    category=DeductionCategory.OVERTIME_DEDUCTION,
                    description=f"OBBBA No Tax on Overtime: Deduct up to ${overtime_deduction:.2f}",
                    estimated_amount=overtime_deduction,
                    tax_savings=self._estimate_tax_savings(overtime_deduction, tax_return.filing_status, agi),
                    confidence=ConfidenceLevel.HIGH,
                    requirements=["Overtime pay from employment", "Salary under $100,000"],
                    documentation_needed=["Pay stubs showing overtime"],
                    irs_reference="OBBBA - No Tax on Overtime",
                    priority=10
                ))

        # Senior Deduction
        if tax_return.is_senior and tax_return.deduction_type != DeductionType.ITEMIZED:
            suggestions.append(DeductionSuggestion(
                category=DeductionCategory.SENIOR_DEDUCTION,
                description="OBBBA Senior Deduction: Additional $6,000 for age 65+",
                estimated_amount=Decimal("6000"),
                tax_savings=self._estimate_tax_savings(Decimal("6000"), tax_return.filing_status, agi),
                confidence=ConfidenceLevel.HIGH,
                requirements=["Age 65 or older", "Taking standard deduction"],
                documentation_needed=["Date of birth verification"],
                irs_reference="OBBBA - Senior Deduction",
                priority=10
            ))

        # Auto Loan Interest
        if tax_return.itemized_deductions and tax_return.itemized_deductions.auto_loan_interest > 0:
            auto_interest = min(
                tax_return.itemized_deductions.auto_loan_interest,
                Decimal("10000")
            )
            suggestions.append(DeductionSuggestion(
                category=DeductionCategory.AUTO_LOAN_INTEREST,
                description=f"OBBBA Auto Loan Interest: Deduct up to ${auto_interest:.2f}",
                estimated_amount=auto_interest,
                tax_savings=self._estimate_tax_savings(auto_interest, tax_return.filing_status, agi),
                confidence=ConfidenceLevel.HIGH,
                requirements=["American-made vehicle", "Interest on auto loan"],
                documentation_needed=["Form 1098 or loan statement"],
                irs_reference="OBBBA - Auto Loan Interest Deduction",
                priority=9
            ))

        return suggestions

    def _analyze_retirement_opportunities(self, tax_return: TaxReturn) -> List[DeductionSuggestion]:
        """Analyze retirement contribution opportunities"""
        suggestions = []
        agi = self.tax_engine.calculate_agi(tax_return)

        # IRA Contribution
        ira_limit = DEDUCTION_RULES[DeductionCategory.RETIREMENT_CONTRIBUTION]["limits_2025"]["ira"]
        if tax_return.taxpayer.age_at_year_end >= 50:
            ira_limit += DEDUCTION_RULES[DeductionCategory.RETIREMENT_CONTRIBUTION]["limits_2025"]["ira_catch_up_50"]

        if tax_return.ira_deduction < ira_limit:
            remaining = ira_limit - tax_return.ira_deduction
            suggestions.append(DeductionSuggestion(
                category=DeductionCategory.RETIREMENT_CONTRIBUTION,
                description=f"You can contribute up to ${remaining:.2f} more to an IRA",
                estimated_amount=remaining,
                tax_savings=self._estimate_tax_savings(remaining, tax_return.filing_status, agi),
                confidence=ConfidenceLevel.MEDIUM,
                requirements=["Earned income", "Under age 70½ for traditional IRA"],
                documentation_needed=["Form 5498"],
                irs_reference="Publication 590-A",
                priority=8
            ))

        # SEP-IRA for self-employed
        if tax_return.self_employment:
            se_net = sum(se.net_profit for se in tax_return.self_employment)
            if se_net > 0:
                # SEP-IRA limit: 25% of net self-employment income (up to $69,000)
                sep_limit = min(
                    gaap_round(se_net * Decimal("0.25")),
                    DEDUCTION_RULES[DeductionCategory.RETIREMENT_CONTRIBUTION]["limits_2025"]["sep_ira"]
                )
                if tax_return.sep_simple_qualified < sep_limit:
                    remaining = sep_limit - tax_return.sep_simple_qualified
                    suggestions.append(DeductionSuggestion(
                        category=DeductionCategory.RETIREMENT_CONTRIBUTION,
                        description=f"SEP-IRA: Contribute up to ${remaining:.2f} more as self-employed",
                        estimated_amount=remaining,
                        tax_savings=self._estimate_tax_savings(remaining, tax_return.filing_status, agi),
                        confidence=ConfidenceLevel.HIGH,
                        requirements=["Self-employed", "Net self-employment income"],
                        documentation_needed=["SEP-IRA plan documents", "Contribution records"],
                        irs_reference="Publication 560",
                        priority=9
                    ))

        return suggestions

    # ===========================================
    # HELPER METHODS
    # ===========================================
    def _estimate_tax_savings(
        self,
        deduction_amount: Decimal,
        filing_status: FilingStatus,
        agi: Decimal
    ) -> Decimal:
        """Estimate tax savings based on marginal tax rate"""
        # Determine marginal rate based on AGI
        from ..core.config import TAX_BRACKETS_2025

        brackets = TAX_BRACKETS_2025.get(filing_status.value, TAX_BRACKETS_2025["single"])
        marginal_rate = Decimal("0.22")  # Default to 22%

        cumulative = Decimal("0")
        for threshold, rate in brackets:
            if agi <= Decimal(str(threshold)):
                marginal_rate = Decimal(str(rate))
                break
            cumulative = Decimal(str(threshold))

        return gaap_round(deduction_amount * marginal_rate)

    def _calculate_audit_risk(
        self,
        tax_return: TaxReturn,
        suggestions: List[DeductionSuggestion]
    ) -> int:
        """
        Calculate audit risk score (1-100)
        Based on IRS DIF (Discriminant Information Function) factors
        """
        risk_score = 10  # Base risk

        agi = self.tax_engine.calculate_agi(tax_return)

        # High income increases risk
        if agi > Decimal("500000"):
            risk_score += 20
        elif agi > Decimal("200000"):
            risk_score += 10

        # Self-employment increases risk
        if tax_return.self_employment:
            risk_score += 15
            # High deductions relative to income
            for se in tax_return.self_employment:
                if se.gross_receipts > 0:
                    expense_ratio = se.total_expenses / se.gross_receipts
                    if expense_ratio > Decimal("0.8"):
                        risk_score += 10

        # Large charitable deductions
        if tax_return.itemized_deductions:
            if tax_return.itemized_deductions.total_charitable > (agi * Decimal("0.20")):
                risk_score += 10

        # Home office deduction
        if any(se.home_office_deduction > 0 for se in tax_return.self_employment):
            risk_score += 5

        # Too many high-value suggestions may indicate aggressive positions
        high_value_suggestions = sum(1 for s in suggestions if s.tax_savings > Decimal("5000"))
        if high_value_suggestions > 3:
            risk_score += 10

        return min(risk_score, 100)

    def _generate_warnings(
        self,
        tax_return: TaxReturn,
        suggestions: List[DeductionSuggestion]
    ) -> List[str]:
        """Generate warnings about potential issues"""
        warnings = []

        # Check for unusually high deductions
        agi = self.tax_engine.calculate_agi(tax_return)
        total_suggested = sum(s.estimated_amount for s in suggestions)

        if total_suggested > agi * Decimal("0.30"):
            warnings.append(
                "The total suggested deductions are high relative to your income. "
                "Ensure you have documentation for all claims."
            )

        # Self-employment warnings
        if tax_return.self_employment:
            for se in tax_return.self_employment:
                if se.net_profit < 0:
                    warnings.append(
                        f"Business '{se.business_name or 'unnamed'}' shows a loss. "
                        "Consistent losses may trigger IRS scrutiny."
                    )

        return warnings

    def _generate_compliance_notes(
        self,
        suggestions: List[DeductionSuggestion]
    ) -> List[str]:
        """Generate compliance notes for suggested deductions"""
        notes = []

        for suggestion in suggestions:
            if suggestion.confidence == ConfidenceLevel.LOW:
                notes.append(
                    f"{suggestion.category.value}: This suggestion has lower confidence. "
                    f"Review requirements carefully: {', '.join(suggestion.requirements)}"
                )

        notes.append(
            "Keep all documentation for at least 7 years in case of IRS inquiry."
        )

        return notes

    # ===========================================
    # TRANSACTION ANALYSIS
    # ===========================================
    def analyze_transactions(
        self,
        transactions: List[Dict[str, Any]],
        tax_return: TaxReturn
    ) -> List[DeductionSuggestion]:
        """
        Analyze bank/credit card transactions for missed deductions.
        Uses pattern matching to identify potential business expenses.
        """
        suggestions = []
        categorized_expenses: Dict[DeductionCategory, Decimal] = {}

        for txn in transactions:
            description = txn.get("description", "")
            amount = Decimal(str(txn.get("amount", 0)))

            if amount >= 0:  # Only look at expenses (negative amounts)
                continue

            amount = abs(amount)

            # Pattern matching
            for pattern, rule in EXPENSE_PATTERNS.items():
                if re.search(pattern, description):
                    category = rule["category"]
                    if category not in categorized_expenses:
                        categorized_expenses[category] = Decimal("0")
                    categorized_expenses[category] += amount
                    break

        # Generate suggestions from categorized expenses
        agi = self.tax_engine.calculate_agi(tax_return)

        for category, total in categorized_expenses.items():
            if total > Decimal("100"):  # Minimum threshold
                suggestions.append(DeductionSuggestion(
                    category=category,
                    description=f"Found ${total:.2f} in potential {category.value} deductions",
                    estimated_amount=total,
                    tax_savings=self._estimate_tax_savings(total, tax_return.filing_status, agi),
                    confidence=ConfidenceLevel.MEDIUM,
                    requirements=["Verify business purpose for each expense"],
                    documentation_needed=["Receipts", "Business purpose documentation"],
                    irs_reference="Publication 535",
                    priority=6
                ))

        return suggestions
