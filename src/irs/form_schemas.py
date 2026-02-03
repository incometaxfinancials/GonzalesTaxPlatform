"""
IRS Form Schemas and Specifications
Based on Publication 5446 MeF Submission Composition Guide

Supports:
- Form 1040 Series (Individual)
- Form 1065 (Partnership)
- Form 1120 Series (Corporation)
- Form 990 Series (Exempt Organizations)
- Information Returns (1099 series)
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Set
from enum import Enum


class FormCategory(Enum):
    """IRS Form Categories"""
    INDIVIDUAL = "individual"
    BUSINESS = "business"
    PARTNERSHIP = "partnership"
    CORPORATION = "corporation"
    EXEMPT_ORG = "exempt_organization"
    ESTATE_TRUST = "estate_trust"
    EMPLOYMENT = "employment"
    INFORMATION = "information"
    EXTENSION = "extension"


@dataclass
class FormSchema:
    """Schema definition for an IRS form"""
    form_number: str
    form_name: str
    category: FormCategory
    tax_year: int
    schema_version: str
    mef_document_id: str
    required_schedules: List[str] = field(default_factory=list)
    optional_schedules: List[str] = field(default_factory=list)
    required_attachments: List[str] = field(default_factory=list)
    max_binary_attachments: int = 0
    supports_efile: bool = True
    supports_paper: bool = True


# Form 1040 Series Definitions
FORM_1040_SCHEMAS = {
    "1040": FormSchema(
        form_number="1040",
        form_name="U.S. Individual Income Tax Return",
        category=FormCategory.INDIVIDUAL,
        tax_year=2025,
        schema_version="2025v1.0",
        mef_document_id="IRS1040",
        required_schedules=[],
        optional_schedules=[
            "Schedule1", "Schedule2", "Schedule3",
            "ScheduleA", "ScheduleB", "ScheduleC",
            "ScheduleD", "ScheduleE", "ScheduleF",
            "ScheduleSE", "Schedule8812"
        ],
        max_binary_attachments=100
    ),
    "1040-SR": FormSchema(
        form_number="1040-SR",
        form_name="U.S. Tax Return for Seniors",
        category=FormCategory.INDIVIDUAL,
        tax_year=2025,
        schema_version="2025v1.0",
        mef_document_id="IRS1040SR",
        required_schedules=[],
        optional_schedules=[
            "Schedule1", "Schedule2", "Schedule3",
            "ScheduleA", "ScheduleB"
        ],
        max_binary_attachments=100
    ),
    "1040-NR": FormSchema(
        form_number="1040-NR",
        form_name="U.S. Nonresident Alien Income Tax Return",
        category=FormCategory.INDIVIDUAL,
        tax_year=2025,
        schema_version="2025v1.0",
        mef_document_id="IRS1040NR",
        required_schedules=["ScheduleOI"],
        optional_schedules=["ScheduleA", "ScheduleNEC"],
        max_binary_attachments=100
    ),
    "1040-X": FormSchema(
        form_number="1040-X",
        form_name="Amended U.S. Individual Income Tax Return",
        category=FormCategory.INDIVIDUAL,
        tax_year=2025,
        schema_version="2025v1.0",
        mef_document_id="IRS1040X",
        required_schedules=[],
        optional_schedules=["All schedules from original return"],
        max_binary_attachments=100
    ),
}

# Schedule Definitions
SCHEDULE_SCHEMAS = {
    "Schedule1": FormSchema(
        form_number="Schedule 1",
        form_name="Additional Income and Adjustments to Income",
        category=FormCategory.INDIVIDUAL,
        tax_year=2025,
        schema_version="2025v1.0",
        mef_document_id="IRS1040Schedule1",
        required_schedules=[],
        optional_schedules=[]
    ),
    "Schedule2": FormSchema(
        form_number="Schedule 2",
        form_name="Additional Taxes",
        category=FormCategory.INDIVIDUAL,
        tax_year=2025,
        schema_version="2025v1.0",
        mef_document_id="IRS1040Schedule2",
        required_schedules=[],
        optional_schedules=["Form8959", "Form8960"]
    ),
    "Schedule3": FormSchema(
        form_number="Schedule 3",
        form_name="Additional Credits and Payments",
        category=FormCategory.INDIVIDUAL,
        tax_year=2025,
        schema_version="2025v1.0",
        mef_document_id="IRS1040Schedule3",
        required_schedules=[],
        optional_schedules=[]
    ),
    "ScheduleA": FormSchema(
        form_number="Schedule A",
        form_name="Itemized Deductions",
        category=FormCategory.INDIVIDUAL,
        tax_year=2025,
        schema_version="2025v1.0",
        mef_document_id="IRS1040ScheduleA",
        required_schedules=[],
        optional_schedules=[]
    ),
    "ScheduleB": FormSchema(
        form_number="Schedule B",
        form_name="Interest and Ordinary Dividends",
        category=FormCategory.INDIVIDUAL,
        tax_year=2025,
        schema_version="2025v1.0",
        mef_document_id="IRS1040ScheduleB",
        required_schedules=[],
        optional_schedules=[]
    ),
    "ScheduleC": FormSchema(
        form_number="Schedule C",
        form_name="Profit or Loss From Business",
        category=FormCategory.INDIVIDUAL,
        tax_year=2025,
        schema_version="2025v1.0",
        mef_document_id="IRS1040ScheduleC",
        required_schedules=[],
        optional_schedules=["Form4562", "Form8829"]
    ),
    "ScheduleD": FormSchema(
        form_number="Schedule D",
        form_name="Capital Gains and Losses",
        category=FormCategory.INDIVIDUAL,
        tax_year=2025,
        schema_version="2025v1.0",
        mef_document_id="IRS1040ScheduleD",
        required_schedules=[],
        optional_schedules=["Form8949"]
    ),
    "ScheduleE": FormSchema(
        form_number="Schedule E",
        form_name="Supplemental Income and Loss",
        category=FormCategory.INDIVIDUAL,
        tax_year=2025,
        schema_version="2025v1.0",
        mef_document_id="IRS1040ScheduleE",
        required_schedules=[],
        optional_schedules=[]
    ),
    "ScheduleSE": FormSchema(
        form_number="Schedule SE",
        form_name="Self-Employment Tax",
        category=FormCategory.INDIVIDUAL,
        tax_year=2025,
        schema_version="2025v1.0",
        mef_document_id="IRS1040ScheduleSE",
        required_schedules=[],
        optional_schedules=[]
    ),
    "Schedule8812": FormSchema(
        form_number="Schedule 8812",
        form_name="Credits for Qualifying Children and Other Dependents",
        category=FormCategory.INDIVIDUAL,
        tax_year=2025,
        schema_version="2025v1.0",
        mef_document_id="IRS1040Schedule8812",
        required_schedules=[],
        optional_schedules=[]
    ),
}

# Business Form Schemas
BUSINESS_FORM_SCHEMAS = {
    "1065": FormSchema(
        form_number="1065",
        form_name="U.S. Return of Partnership Income",
        category=FormCategory.PARTNERSHIP,
        tax_year=2025,
        schema_version="2025v1.0",
        mef_document_id="IRS1065",
        required_schedules=["ScheduleK1"],
        optional_schedules=["ScheduleB", "ScheduleK", "ScheduleL", "ScheduleM1", "ScheduleM2"],
        max_binary_attachments=100
    ),
    "1120": FormSchema(
        form_number="1120",
        form_name="U.S. Corporation Income Tax Return",
        category=FormCategory.CORPORATION,
        tax_year=2025,
        schema_version="2025v1.0",
        mef_document_id="IRS1120",
        required_schedules=[],
        optional_schedules=["ScheduleC", "ScheduleJ", "ScheduleK", "ScheduleL", "ScheduleM1", "ScheduleM2"],
        max_binary_attachments=100
    ),
    "1120-S": FormSchema(
        form_number="1120-S",
        form_name="U.S. Income Tax Return for an S Corporation",
        category=FormCategory.CORPORATION,
        tax_year=2025,
        schema_version="2025v1.0",
        mef_document_id="IRS1120S",
        required_schedules=["ScheduleK1"],
        optional_schedules=["ScheduleB", "ScheduleK", "ScheduleL", "ScheduleM1", "ScheduleM2"],
        max_binary_attachments=100
    ),
    "990": FormSchema(
        form_number="990",
        form_name="Return of Organization Exempt From Income Tax",
        category=FormCategory.EXEMPT_ORG,
        tax_year=2025,
        schema_version="2025v1.0",
        mef_document_id="IRS990",
        required_schedules=["ScheduleO"],
        optional_schedules=["ScheduleA", "ScheduleB", "ScheduleC", "ScheduleD", "ScheduleF", "ScheduleG", "ScheduleI", "ScheduleJ", "ScheduleK", "ScheduleL", "ScheduleM", "ScheduleN", "ScheduleR"],
        max_binary_attachments=100
    ),
}


# Valid US State and Territory Codes (per Publication 5594)
US_STATE_CODES: Dict[str, str] = {
    # States
    "AL": "Alabama",
    "AK": "Alaska",
    "AZ": "Arizona",
    "AR": "Arkansas",
    "CA": "California",
    "CO": "Colorado",
    "CT": "Connecticut",
    "DE": "Delaware",
    "FL": "Florida",
    "GA": "Georgia",
    "HI": "Hawaii",
    "ID": "Idaho",
    "IL": "Illinois",
    "IN": "Indiana",
    "IA": "Iowa",
    "KS": "Kansas",
    "KY": "Kentucky",
    "LA": "Louisiana",
    "ME": "Maine",
    "MD": "Maryland",
    "MA": "Massachusetts",
    "MI": "Michigan",
    "MN": "Minnesota",
    "MS": "Mississippi",
    "MO": "Missouri",
    "MT": "Montana",
    "NE": "Nebraska",
    "NV": "Nevada",
    "NH": "New Hampshire",
    "NJ": "New Jersey",
    "NM": "New Mexico",
    "NY": "New York",
    "NC": "North Carolina",
    "ND": "North Dakota",
    "OH": "Ohio",
    "OK": "Oklahoma",
    "OR": "Oregon",
    "PA": "Pennsylvania",
    "RI": "Rhode Island",
    "SC": "South Carolina",
    "SD": "South Dakota",
    "TN": "Tennessee",
    "TX": "Texas",
    "UT": "Utah",
    "VT": "Vermont",
    "VA": "Virginia",
    "WA": "Washington",
    "WV": "West Virginia",
    "WI": "Wisconsin",
    "WY": "Wyoming",

    # District
    "DC": "District of Columbia",

    # Territories
    "AS": "American Samoa",
    "GU": "Guam",
    "MP": "Northern Mariana Islands",
    "PR": "Puerto Rico",
    "VI": "U.S. Virgin Islands",

    # Armed Forces
    "AA": "Armed Forces Americas",
    "AE": "Armed Forces Europe/Middle East/Africa/Canada",
    "AP": "Armed Forces Pacific",
}

# States with income tax (for state return requirements)
STATES_WITH_INCOME_TAX: Set[str] = {
    "AL", "AZ", "AR", "CA", "CO", "CT", "DE", "GA", "HI", "ID",
    "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI",
    "MN", "MS", "MO", "MT", "NE", "NJ", "NM", "NY", "NC", "ND",
    "OH", "OK", "OR", "PA", "RI", "SC", "UT", "VT", "VA", "WV",
    "WI", "DC"
}

# States with NO income tax
STATES_NO_INCOME_TAX: Set[str] = {
    "AK", "FL", "NV", "NH", "SD", "TN", "TX", "WA", "WY"
}


# Binary Attachment Types (per Publication 5446)
@dataclass
class BinaryAttachmentSpec:
    """Specification for binary attachments in MeF submissions"""
    document_type: str
    description: str
    max_size_kb: int
    allowed_formats: List[str]
    document_id_prefix: str


BINARY_ATTACHMENT_TYPES: Dict[str, BinaryAttachmentSpec] = {
    "W2": BinaryAttachmentSpec(
        document_type="W2",
        description="Form W-2, Wage and Tax Statement",
        max_size_kb=1024,
        allowed_formats=["PDF"],
        document_id_prefix="W2"
    ),
    "1099": BinaryAttachmentSpec(
        document_type="1099",
        description="Form 1099 Series",
        max_size_kb=1024,
        allowed_formats=["PDF"],
        document_id_prefix="1099"
    ),
    "K1": BinaryAttachmentSpec(
        document_type="K1",
        description="Schedule K-1",
        max_size_kb=1024,
        allowed_formats=["PDF"],
        document_id_prefix="K1"
    ),
    "SUPPORTING": BinaryAttachmentSpec(
        document_type="SupportingDocument",
        description="Supporting Documentation",
        max_size_kb=15360,  # 15MB max
        allowed_formats=["PDF"],
        document_id_prefix="SUPP"
    ),
    "STATEMENT": BinaryAttachmentSpec(
        document_type="Statement",
        description="Required Statements",
        max_size_kb=1024,
        allowed_formats=["PDF"],
        document_id_prefix="STMT"
    ),
}


# PDF Attachment Naming Convention (per IRS recommendations)
PDF_NAMING_CONVENTIONS = {
    "W2_Employer": "W2_{EIN}_{SSN_Last4}.pdf",
    "1099_INT": "1099INT_{PayerEIN}_{SSN_Last4}.pdf",
    "1099_DIV": "1099DIV_{PayerEIN}_{SSN_Last4}.pdf",
    "1099_MISC": "1099MISC_{PayerEIN}_{SSN_Last4}.pdf",
    "1099_NEC": "1099NEC_{PayerEIN}_{SSN_Last4}.pdf",
    "K1_1065": "K1_1065_{EIN}_{SSN_Last4}.pdf",
    "K1_1120S": "K1_1120S_{EIN}_{SSN_Last4}.pdf",
    "Supporting": "Supporting_{Description}_{Date}.pdf",
}


class FormSchemaManager:
    """Manages form schemas and validation"""

    @classmethod
    def get_form_schema(cls, form_number: str) -> Optional[FormSchema]:
        """Get schema for a specific form"""
        # Check all schema dictionaries
        if form_number in FORM_1040_SCHEMAS:
            return FORM_1040_SCHEMAS[form_number]
        if form_number in SCHEDULE_SCHEMAS:
            return SCHEDULE_SCHEMAS[form_number]
        if form_number in BUSINESS_FORM_SCHEMAS:
            return BUSINESS_FORM_SCHEMAS[form_number]
        return None

    @classmethod
    def get_forms_by_category(cls, category: FormCategory) -> List[FormSchema]:
        """Get all forms in a category"""
        all_forms = {
            **FORM_1040_SCHEMAS,
            **SCHEDULE_SCHEMAS,
            **BUSINESS_FORM_SCHEMAS
        }
        return [f for f in all_forms.values() if f.category == category]

    @classmethod
    def validate_state_code(cls, code: str) -> bool:
        """Validate a state/territory code"""
        return code.upper() in US_STATE_CODES

    @classmethod
    def requires_state_return(cls, state_code: str) -> bool:
        """Check if state requires income tax return"""
        return state_code.upper() in STATES_WITH_INCOME_TAX

    @classmethod
    def get_required_schedules(cls, form_number: str,
                                income_data: Dict) -> List[str]:
        """Determine required schedules based on income data"""
        required = []
        schema = cls.get_form_schema(form_number)

        if not schema:
            return required

        # Start with form's required schedules
        required.extend(schema.required_schedules)

        # Determine additional schedules based on income
        if income_data.get("self_employment_income", 0) > 0:
            if "ScheduleC" not in required:
                required.append("ScheduleC")
            if "ScheduleSE" not in required:
                required.append("ScheduleSE")

        if income_data.get("itemized_deductions", False):
            if "ScheduleA" not in required:
                required.append("ScheduleA")

        if income_data.get("interest_income", 0) > 1500 or \
           income_data.get("dividend_income", 0) > 1500:
            if "ScheduleB" not in required:
                required.append("ScheduleB")

        if income_data.get("capital_gains", 0) != 0:
            if "ScheduleD" not in required:
                required.append("ScheduleD")

        if income_data.get("rental_income", 0) != 0:
            if "ScheduleE" not in required:
                required.append("ScheduleE")

        if income_data.get("children_under_17", 0) > 0:
            if "Schedule8812" not in required:
                required.append("Schedule8812")

        return required
