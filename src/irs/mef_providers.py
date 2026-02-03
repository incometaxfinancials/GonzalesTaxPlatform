"""
IRS Modernized e-File (MeF) Provider Configuration
Supports all IRS-approved MeF form types and provider categories

MeF Internet Filing Categories:
- Corporate returns
- Employment returns
- Estates & Trusts
- Exempt Organizations
- Excise returns
- Individual returns
- Partnerships

SSA Integration for W-2 submissions
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Set
from enum import Enum
from datetime import date


class MeFFormCategory(Enum):
    """MeF Form Categories with IRS provider pages"""
    FORM_720 = "720"           # Quarterly Federal Excise Tax Return
    FORM_94X = "94x"           # Employment Tax Returns (940, 941, 943, 944, 945)
    FORM_990 = "990x"          # Exempt Organization Returns
    FORM_1041 = "1041"         # Estates & Trusts
    FORM_1042 = "1042"         # Foreign Persons' U.S. Source Income
    FORM_1065 = "1065"         # Partnership Returns
    FORM_1120 = "1120x"        # Corporate Returns
    FORM_2290 = "2290"         # Heavy Highway Vehicle Use Tax
    FORM_7004 = "7004"         # Extensions
    FORM_8849 = "8849"         # Claim for Refund of Excise Taxes
    FORM_1040 = "1040"         # Individual Returns


@dataclass
class MeFFormType:
    """Definition of a MeF-supported form type"""
    form_number: str
    form_name: str
    category: MeFFormCategory
    description: str
    mef_supported: bool = True
    schema_version: str = "2025v1.0"
    filing_deadline: Optional[str] = None
    extension_form: Optional[str] = None
    related_forms: List[str] = field(default_factory=list)
    state_piggyback: bool = False  # Can state returns attach


# Complete MeF Form Type Definitions
MEF_FORM_TYPES: Dict[str, MeFFormType] = {
    # ============================================
    # INDIVIDUAL RETURNS (1040 Series)
    # ============================================
    "1040": MeFFormType(
        form_number="1040",
        form_name="U.S. Individual Income Tax Return",
        category=MeFFormCategory.FORM_1040,
        description="Primary individual income tax return",
        filing_deadline="April 15",
        extension_form="4868",
        related_forms=["W-2", "1099", "Schedule A-SE"],
        state_piggyback=True
    ),
    "1040-SR": MeFFormType(
        form_number="1040-SR",
        form_name="U.S. Tax Return for Seniors",
        category=MeFFormCategory.FORM_1040,
        description="Individual return for taxpayers 65 and older",
        filing_deadline="April 15",
        extension_form="4868",
        state_piggyback=True
    ),
    "1040-NR": MeFFormType(
        form_number="1040-NR",
        form_name="U.S. Nonresident Alien Income Tax Return",
        category=MeFFormCategory.FORM_1040,
        description="Return for nonresident aliens",
        filing_deadline="April 15",
        extension_form="4868"
    ),
    "1040-X": MeFFormType(
        form_number="1040-X",
        form_name="Amended U.S. Individual Income Tax Return",
        category=MeFFormCategory.FORM_1040,
        description="Amended individual return",
        filing_deadline="3 years from original due date"
    ),

    # ============================================
    # EMPLOYMENT RETURNS (94x Series)
    # ============================================
    "940": MeFFormType(
        form_number="940",
        form_name="Employer's Annual Federal Unemployment (FUTA) Tax Return",
        category=MeFFormCategory.FORM_94X,
        description="Annual FUTA tax return",
        filing_deadline="January 31",
        extension_form="8809"
    ),
    "941": MeFFormType(
        form_number="941",
        form_name="Employer's Quarterly Federal Tax Return",
        category=MeFFormCategory.FORM_94X,
        description="Quarterly employment taxes (income tax, social security, Medicare)",
        filing_deadline="Last day of month following quarter end",
        related_forms=["941-X"]
    ),
    "941-X": MeFFormType(
        form_number="941-X",
        form_name="Adjusted Employer's Quarterly Federal Tax Return",
        category=MeFFormCategory.FORM_94X,
        description="Corrected quarterly employment tax return"
    ),
    "943": MeFFormType(
        form_number="943",
        form_name="Employer's Annual Federal Tax Return for Agricultural Employees",
        category=MeFFormCategory.FORM_94X,
        description="Annual return for agricultural employers",
        filing_deadline="January 31"
    ),
    "944": MeFFormType(
        form_number="944",
        form_name="Employer's Annual Federal Tax Return",
        category=MeFFormCategory.FORM_94X,
        description="Annual return for small employers ($1,000 or less annual liability)",
        filing_deadline="January 31"
    ),
    "945": MeFFormType(
        form_number="945",
        form_name="Annual Return of Withheld Federal Income Tax",
        category=MeFFormCategory.FORM_94X,
        description="Annual return for non-payroll withholding",
        filing_deadline="January 31"
    ),

    # ============================================
    # EXEMPT ORGANIZATION RETURNS (990 Series)
    # ============================================
    "990": MeFFormType(
        form_number="990",
        form_name="Return of Organization Exempt From Income Tax",
        category=MeFFormCategory.FORM_990,
        description="Information return for exempt organizations",
        filing_deadline="15th day of 5th month after year end",
        extension_form="8868",
        related_forms=["Schedule A-R", "Schedule O"]
    ),
    "990-EZ": MeFFormType(
        form_number="990-EZ",
        form_name="Short Form Return of Organization Exempt From Income Tax",
        category=MeFFormCategory.FORM_990,
        description="Short form for smaller exempt organizations",
        filing_deadline="15th day of 5th month after year end",
        extension_form="8868"
    ),
    "990-N": MeFFormType(
        form_number="990-N",
        form_name="Electronic Notice (e-Postcard)",
        category=MeFFormCategory.FORM_990,
        description="E-Postcard for small exempt organizations (gross receipts ≤$50,000)",
        filing_deadline="15th day of 5th month after year end"
    ),
    "990-PF": MeFFormType(
        form_number="990-PF",
        form_name="Return of Private Foundation",
        category=MeFFormCategory.FORM_990,
        description="Return for private foundations",
        filing_deadline="15th day of 5th month after year end",
        extension_form="8868"
    ),
    "990-T": MeFFormType(
        form_number="990-T",
        form_name="Exempt Organization Business Income Tax Return",
        category=MeFFormCategory.FORM_990,
        description="Unrelated business income tax return",
        filing_deadline="15th day of 5th month after year end",
        extension_form="8868"
    ),
    "1120-POL": MeFFormType(
        form_number="1120-POL",
        form_name="U.S. Income Tax Return for Political Organizations",
        category=MeFFormCategory.FORM_990,
        description="Return for political organizations under section 527",
        filing_deadline="15th day of 3rd month after year end"
    ),

    # ============================================
    # ESTATES & TRUSTS (1041)
    # ============================================
    "1041": MeFFormType(
        form_number="1041",
        form_name="U.S. Income Tax Return for Estates and Trusts",
        category=MeFFormCategory.FORM_1041,
        description="Income tax return for estates and trusts",
        filing_deadline="15th day of 4th month after year end",
        extension_form="7004",
        related_forms=["Schedule K-1 (1041)"]
    ),
    "1041-ES": MeFFormType(
        form_number="1041-ES",
        form_name="Estimated Income Tax for Estates and Trusts",
        category=MeFFormCategory.FORM_1041,
        description="Estimated tax payments for estates and trusts"
    ),

    # ============================================
    # FOREIGN PERSONS (1042)
    # ============================================
    "1042": MeFFormType(
        form_number="1042",
        form_name="Annual Withholding Tax Return for U.S. Source Income of Foreign Persons",
        category=MeFFormCategory.FORM_1042,
        description="Withholding on payments to foreign persons",
        filing_deadline="March 15",
        extension_form="7004",
        related_forms=["1042-S"]
    ),
    "1042-S": MeFFormType(
        form_number="1042-S",
        form_name="Foreign Person's U.S. Source Income Subject to Withholding",
        category=MeFFormCategory.FORM_1042,
        description="Information return for payments to foreign persons",
        filing_deadline="March 15"
    ),

    # ============================================
    # PARTNERSHIPS (1065)
    # ============================================
    "1065": MeFFormType(
        form_number="1065",
        form_name="U.S. Return of Partnership Income",
        category=MeFFormCategory.FORM_1065,
        description="Partnership income tax return",
        filing_deadline="15th day of 3rd month after year end",
        extension_form="7004",
        related_forms=["Schedule K-1 (1065)"],
        state_piggyback=True
    ),
    "1065-X": MeFFormType(
        form_number="1065-X",
        form_name="Amended Return or Administrative Adjustment Request (AAR)",
        category=MeFFormCategory.FORM_1065,
        description="Amended partnership return"
    ),

    # ============================================
    # CORPORATIONS (1120 Series)
    # ============================================
    "1120": MeFFormType(
        form_number="1120",
        form_name="U.S. Corporation Income Tax Return",
        category=MeFFormCategory.FORM_1120,
        description="C Corporation income tax return",
        filing_deadline="15th day of 4th month after year end",
        extension_form="7004",
        state_piggyback=True
    ),
    "1120-S": MeFFormType(
        form_number="1120-S",
        form_name="U.S. Income Tax Return for an S Corporation",
        category=MeFFormCategory.FORM_1120,
        description="S Corporation income tax return",
        filing_deadline="15th day of 3rd month after year end",
        extension_form="7004",
        related_forms=["Schedule K-1 (1120-S)"],
        state_piggyback=True
    ),
    "1120-F": MeFFormType(
        form_number="1120-F",
        form_name="U.S. Income Tax Return of a Foreign Corporation",
        category=MeFFormCategory.FORM_1120,
        description="Foreign corporation income tax return",
        filing_deadline="15th day of 6th month after year end",
        extension_form="7004"
    ),
    "1120-H": MeFFormType(
        form_number="1120-H",
        form_name="U.S. Income Tax Return for Homeowners Associations",
        category=MeFFormCategory.FORM_1120,
        description="HOA income tax return",
        filing_deadline="15th day of 4th month after year end"
    ),
    "1120-X": MeFFormType(
        form_number="1120-X",
        form_name="Amended U.S. Corporation Income Tax Return",
        category=MeFFormCategory.FORM_1120,
        description="Amended corporate return"
    ),

    # ============================================
    # EXCISE TAX RETURNS (720)
    # ============================================
    "720": MeFFormType(
        form_number="720",
        form_name="Quarterly Federal Excise Tax Return",
        category=MeFFormCategory.FORM_720,
        description="Quarterly excise taxes on fuel, air transport, etc.",
        filing_deadline="Last day of month following quarter"
    ),

    # ============================================
    # HEAVY HIGHWAY VEHICLE (2290)
    # ============================================
    "2290": MeFFormType(
        form_number="2290",
        form_name="Heavy Highway Vehicle Use Tax Return",
        category=MeFFormCategory.FORM_2290,
        description="Annual highway vehicle use tax",
        filing_deadline="Last day of month following first use"
    ),

    # ============================================
    # EXTENSIONS (7004)
    # ============================================
    "7004": MeFFormType(
        form_number="7004",
        form_name="Application for Automatic Extension of Time",
        category=MeFFormCategory.FORM_7004,
        description="Extension for business returns",
        filing_deadline="Original return due date"
    ),
    "4868": MeFFormType(
        form_number="4868",
        form_name="Application for Automatic Extension of Time to File",
        category=MeFFormCategory.FORM_7004,
        description="Extension for individual returns",
        filing_deadline="April 15"
    ),
    "8868": MeFFormType(
        form_number="8868",
        form_name="Application for Extension of Time To File an Exempt Organization Return",
        category=MeFFormCategory.FORM_7004,
        description="Extension for exempt organization returns",
        filing_deadline="Original return due date"
    ),

    # ============================================
    # EXCISE REFUNDS (8849)
    # ============================================
    "8849": MeFFormType(
        form_number="8849",
        form_name="Claim for Refund of Excise Taxes",
        category=MeFFormCategory.FORM_8849,
        description="Claim for excise tax refunds"
    ),
}


@dataclass
class MeFProviderCredentials:
    """
    Provider credentials for MeF filing

    Required credentials:
    - EFIN: Electronic Filing Identification Number (6 digits)
    - ETIN: Electronic Transmitter Identification Number (5 digits)
    - Software ID: Assigned after ATS certification
    - PTIN: Preparer Tax Identification Number (for preparers)
    """
    efin: str
    etin: str
    software_id: str
    ptin: Optional[str] = None
    firm_ein: Optional[str] = None
    application_date: Optional[date] = None
    certification_date: Optional[date] = None
    authorized_forms: List[str] = field(default_factory=list)

    def is_authorized_for_form(self, form_number: str) -> bool:
        """Check if provider is authorized to file this form"""
        return form_number in self.authorized_forms or "ALL" in self.authorized_forms


@dataclass
class SSAConfiguration:
    """
    Social Security Administration (SSA) Configuration
    For electronic W-2 submission via Business Services Online (BSO)

    SSA BSO: https://www.ssa.gov/bso/
    """
    user_id: str
    employer_ein: str
    submitter_ein: str  # May differ from employer
    contact_name: str
    contact_phone: str
    contact_email: str
    pin: Optional[str] = None

    # Filing options
    use_accuwage: bool = True  # SSA's free AccuWage software
    file_format: str = "EFW2"  # Electronic Filing of W-2

    @staticmethod
    def get_ssa_deadlines() -> Dict[str, str]:
        """Get SSA W-2 filing deadlines"""
        return {
            "employee_copies": "January 31",
            "electronic_filing": "January 31",
            "paper_filing": "January 31",
            "w2c_corrections": "As soon as possible after error discovered"
        }


class SSAFormats:
    """SSA Electronic Filing Formats"""

    EFW2_RECORD_TYPES = {
        "RA": "Submitter Record",
        "RE": "Employer Record",
        "RW": "Employee Wage Record",
        "RO": "Employee Wage Record (continuation)",
        "RS": "State Wage Record",
        "RT": "Total Record",
        "RU": "Total Record (continuation)",
        "RF": "Final Record"
    }

    EFW2_FIELDS = {
        "RA": [
            ("submitter_ein", 9),
            ("user_id", 8),
            ("software_code", 4),
            ("company_name", 57),
            ("company_address", 22),
            ("city", 22),
            ("state", 2),
            ("zip", 5),
            ("contact_name", 27),
            ("contact_phone", 15),
            ("contact_email", 40),
        ],
        "RE": [
            ("tax_year", 4),
            ("agent_indicator", 1),
            ("employer_ein", 9),
            ("employer_name", 57),
            ("employer_address", 22),
            ("city", 22),
            ("state", 2),
            ("zip", 5),
            ("employment_code", 1),
        ],
        "RW": [
            ("ssn", 9),
            ("employee_name", 27),
            ("wages", 11),
            ("federal_withholding", 11),
            ("social_security_wages", 11),
            ("social_security_tax", 11),
            ("medicare_wages", 11),
            ("medicare_tax", 11),
            ("social_security_tips", 11),
            ("advance_eic", 11),
            ("dependent_care", 11),
            ("401k_contributions", 11),
        ]
    }


class MeFProviderManager:
    """Manages MeF provider registration and form authorization"""

    PROVIDER_TYPES = {
        "ERO": "Electronic Return Originator",
        "TRANSMITTER": "Transmitter",
        "SOFTWARE_DEVELOPER": "Software Developer",
        "ISRP": "Intermediate Service Provider",
        "REPORTING_AGENT": "Reporting Agent"
    }

    @staticmethod
    def get_forms_by_category(category: MeFFormCategory) -> List[MeFFormType]:
        """Get all forms in a category"""
        return [f for f in MEF_FORM_TYPES.values() if f.category == category]

    @staticmethod
    def get_provider_url(category: MeFFormCategory) -> str:
        """Get IRS provider listing URL for category"""
        base_url = "https://www.irs.gov/e-file-providers/approved-irs-modernized-e-file-mef"
        category_paths = {
            MeFFormCategory.FORM_720: "-720-providers",
            MeFFormCategory.FORM_94X: "-94x-providers",
            MeFFormCategory.FORM_990: "-990x-and-1120-pol-providers",
            MeFFormCategory.FORM_1041: "-1041-providers",
            MeFFormCategory.FORM_1042: "-1042-providers",
            MeFFormCategory.FORM_1065: "-1065-providers",
            MeFFormCategory.FORM_1120: "-1120x-providers",
            MeFFormCategory.FORM_2290: "-2290-providers",
            MeFFormCategory.FORM_7004: "-7004-providers",
            MeFFormCategory.FORM_8849: "-8849-providers"
        }
        return f"{base_url}{category_paths.get(category, '')}"

    @staticmethod
    def get_certification_requirements(form_category: MeFFormCategory) -> Dict:
        """Get certification requirements for form category"""
        base_requirements = {
            "ats_testing": True,
            "background_check": True,
            "suitability_check": True,
            "efin_required": True,
            "etin_required": True,
            "annual_renewal": True
        }

        category_specific = {
            MeFFormCategory.FORM_1040: {
                **base_requirements,
                "publication_1345": True,
                "caf_number": "Optional",
                "fingerprinting": True
            },
            MeFFormCategory.FORM_1120: {
                **base_requirements,
                "publication_4163": True
            },
            MeFFormCategory.FORM_990: {
                **base_requirements,
                "publication_4163": True
            }
        }

        return category_specific.get(form_category, base_requirements)

    @staticmethod
    def validate_efin(efin: str) -> bool:
        """Validate EFIN format (6 digits)"""
        return efin.isdigit() and len(efin) == 6

    @staticmethod
    def validate_etin(etin: str) -> bool:
        """Validate ETIN format (5 digits)"""
        return etin.isdigit() and len(etin) == 5

    @staticmethod
    def validate_ptin(ptin: str) -> bool:
        """Validate PTIN format (P followed by 8 digits)"""
        return ptin.startswith("P") and ptin[1:].isdigit() and len(ptin) == 9


class InformationReturnManager:
    """
    Manages Information Returns (1099 series)
    Filed through IRS FIRE (Filing Information Returns Electronically)

    Publication 1220 specifications
    """

    INFORMATION_RETURNS = {
        "1097-BTC": "Bond Tax Credit",
        "1098": "Mortgage Interest Statement",
        "1098-C": "Contributions of Motor Vehicles, Boats, and Airplanes",
        "1098-E": "Student Loan Interest Statement",
        "1098-F": "Fines, Penalties, and Other Amounts",
        "1098-Q": "Qualifying Longevity Annuity Contract Information",
        "1098-T": "Tuition Statement",
        "1099-A": "Acquisition or Abandonment of Secured Property",
        "1099-B": "Proceeds From Broker and Barter Exchange Transactions",
        "1099-C": "Cancellation of Debt",
        "1099-CAP": "Changes in Corporate Control and Capital Structure",
        "1099-DIV": "Dividends and Distributions",
        "1099-G": "Government Payments",
        "1099-H": "Health Coverage Tax Credit Advance Payments",
        "1099-INT": "Interest Income",
        "1099-K": "Payment Card and Third Party Network Transactions",
        "1099-LS": "Reportable Life Insurance Sale",
        "1099-LTC": "Long-Term Care and Accelerated Death Benefits",
        "1099-MISC": "Miscellaneous Income",
        "1099-NEC": "Nonemployee Compensation",
        "1099-OID": "Original Issue Discount",
        "1099-PATR": "Taxable Distributions From Cooperatives",
        "1099-Q": "Payments From Qualified Education Programs",
        "1099-QA": "Distributions From ABLE Accounts",
        "1099-R": "Distributions From Pensions, Annuities, IRAs, etc.",
        "1099-S": "Proceeds From Real Estate Transactions",
        "1099-SA": "Distributions From an HSA, Archer MSA, or Medicare Advantage MSA",
        "1099-SB": "Seller's Investment in Life Insurance Contract",
        "3921": "Exercise of an Incentive Stock Option",
        "3922": "Transfer of Stock Acquired Through an ESPP",
        "5498": "IRA Contribution Information",
        "5498-ESA": "Coverdell ESA Contribution Information",
        "5498-SA": "HSA, Archer MSA, or Medicare Advantage MSA Information",
        "W-2G": "Certain Gambling Winnings"
    }

    FIRE_SYSTEM_URL = "https://fire.irs.gov"
    FIRE_TEST_URL = "https://fire.test.irs.gov"

    @classmethod
    def get_filing_deadline(cls, form: str, tax_year: int) -> str:
        """Get filing deadline for information return"""
        deadlines = {
            "1099-NEC": f"January 31, {tax_year + 1}",  # Non-employee comp - firm deadline
            "1099-MISC": f"February 28, {tax_year + 1} (paper) / March 31, {tax_year + 1} (electronic)",
            "W-2G": f"February 28, {tax_year + 1} (paper) / March 31, {tax_year + 1} (electronic)"
        }
        return deadlines.get(form, f"February 28, {tax_year + 1} (paper) / March 31, {tax_year + 1} (electronic)")

    @classmethod
    def get_recipient_deadline(cls, tax_year: int) -> str:
        """Deadline to furnish copies to recipients"""
        return f"January 31, {tax_year + 1}"
